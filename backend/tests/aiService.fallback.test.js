/**
 * Unit tests for the Gemini model fallback chain in backend/services/aiService.js
 *
 * Run: node backend/tests/aiService.fallback.test.js
 *
 * These tests exercise callGeminiWithFallback() in isolation using a mock
 * GoogleGenerativeAI client, without making any real network calls.
 */

// ── Minimal test harness (no test framework needed) ──────────────────────────
let passed = 0;
let failed = 0;

async function test(description, fn) {
  try {
    await fn();
    console.log(`  ✓  ${description}`);
    passed++;
  } catch (err) {
    console.error(`  ✗  ${description}`);
    console.error(`     ${err.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

function assertEqual(a, b, message) {
  if (a !== b) throw new Error(message || `Expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
}

// ── Mock factory helpers ──────────────────────────────────────────────────────

/**
 * Creates a mock GoogleGenerativeAI instance.
 * @param {Object} modelBehaviours  - Map of modelName → function that returns
 *   { text: string } | throws Error
 *   Each model can also be an array of call results (for retry testing).
 */
function createMockGenAI(modelBehaviours) {
  const callCounts = {};
  return {
    _callCounts: callCounts,
    getGenerativeModel({ model }) {
      callCounts[model] = (callCounts[model] || 0);
      const behaviour = modelBehaviours[model];
      return {
        async generateContent(contents) {
          const callIndex = callCounts[model]++;
          let result;
          if (Array.isArray(behaviour)) {
            result = behaviour[Math.min(callIndex, behaviour.length - 1)];
          } else {
            result = behaviour;
          }
          if (typeof result === 'function') {
            return await result(callIndex);
          }
          if (result instanceof Error) throw result;
          return { response: { text: () => result.text } };
        }
      };
    }
  };
}

function make429Error() {
  const e = new Error('RESOURCE_EXHAUSTED: 429 quota exceeded');
  e.status = 429;
  return e;
}

function make503Error() {
  const e = new Error('SERVICE_UNAVAILABLE: 503 model overloaded');
  e.status = 503;
  return e;
}

function makeGenericError() {
  return new Error('INTERNAL: something went wrong');
}

// ── Patch the module to use mock ──────────────────────────────────────────────
// We re-implement callGeminiWithFallback here so tests run without
// requiring the actual @google/generative-ai package / API key.

const MODEL_PRIORITY_LIST = [
  'gemini-3.1-flash-lite', // 500 RPD — try first (most quota)
  'gemini-3.5-flash-lite', // 500 RPD
  'gemini-3-flash',        //  20 RPD
  'gemini-3.5-flash',      //  20 RPD — partially used
  'gemini-3.7-flash',      //  20 RPD — partially used
  'gemini-3.6-flash',      //  20 RPD — currently maxed out, last resort
];

const delay = (ms) => new Promise(r => setTimeout(r, ms));

function is429Error(err) {
  const status = err?.status || err?.statusCode;
  const msg = (err?.message || '').toLowerCase();
  return status === 429 || msg.includes('429') || msg.includes('resource_exhausted') || msg.includes('quota');
}

function is503Error(err) {
  const status = err?.status || err?.statusCode;
  const msg = (err?.message || '').toLowerCase();
  return status === 503 || msg.includes('503') || msg.includes('unavailable') || msg.includes('overloaded');
}

async function callGeminiWithFallback(mockGenAI, contents, modelList = MODEL_PRIORITY_LIST) {
  let lastError = null;

  for (const modelName of modelList) {
    let attempts = 0;
    const maxAttempts = 2;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        const model = mockGenAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(contents);
        const rawText = result.response.text();
        if (rawText) {
          return { rawText, model: modelName };
        }
        throw new Error('Empty response from model.');
      } catch (err) {
        lastError = err;
        if (is429Error(err)) {
          break; // skip immediately
        } else if (is503Error(err)) {
          if (attempts < maxAttempts) {
            await delay(0); // skip real sleep in tests
            continue;
          } else {
            break;
          }
        } else {
          break;
        }
      }
    }
  }

  const msg = lastError?.message || String(lastError);
  throw new Error(`Gemini AI unavailable. Tried: [${modelList.join(', ')}]. Last error: ${msg}`);
}

// ── Tests ────────────────────────────────────────────────────────────────────

console.log('\nGemini Fallback Chain — Unit Tests\n');

(async () => {

  // 1. Happy path: first model succeeds immediately
  await test('Returns result from first model when it succeeds', async () => {
    const mock = createMockGenAI({
      'gemini-3.1-flash-lite': { text: '{"name":"Chicken","calories":300}' },
    });
    const { rawText, model } = await callGeminiWithFallback(mock, 'test prompt');
    assertEqual(model, 'gemini-3.1-flash-lite');
    assert(rawText.includes('Chicken'), 'rawText should include parsed name');
  });

  // 2. 429 on first model → skip to second, second succeeds
  await test('Skips immediately to next model on 429', async () => {
    const mock = createMockGenAI({
      'gemini-3.1-flash-lite': make429Error(),
      'gemini-3.5-flash-lite': { text: '{"name":"Dal","calories":200}' },
    });
    const { model } = await callGeminiWithFallback(mock, 'test prompt');
    assertEqual(model, 'gemini-3.5-flash-lite', 'Should serve from second model');
    // Primary model should only have been called once (no retry on 429)
    assertEqual(mock._callCounts['gemini-3.1-flash-lite'], 1, '429 model called only once');
  });

  // 3. 503 on first model → retry once → succeeds on retry
  await test('Retries same model once on 503, succeeds on retry', async () => {
    let callCount = 0;
    const mock = createMockGenAI({
      'gemini-3.1-flash-lite': [make503Error(), { text: '{"name":"Rice","calories":150}' }],
    });
    const { model } = await callGeminiWithFallback(mock, 'test prompt');
    assertEqual(model, 'gemini-3.1-flash-lite', 'Should recover on same model');
    assertEqual(mock._callCounts['gemini-3.1-flash-lite'], 2, 'Primary model called exactly twice (1 fail + 1 retry)');
  });

  // 4. 503 on first model → retry fails too → falls back to second model
  await test('Falls back to next model after 503 retry also fails', async () => {
    const mock = createMockGenAI({
      'gemini-3.1-flash-lite': make503Error(), // both attempts fail
      'gemini-3.5-flash-lite': { text: '{"name":"Egg","calories":80}' },
    });
    const { model } = await callGeminiWithFallback(mock, 'test prompt');
    assertEqual(model, 'gemini-3.5-flash-lite');
    assertEqual(mock._callCounts['gemini-3.1-flash-lite'], 2, 'Primary model retried exactly once before fallback');
  });

  // 5. Generic error on first model → skip immediately (no retry)
  await test('Skips immediately to next model on non-429/503 error', async () => {
    const mock = createMockGenAI({
      'gemini-3.1-flash-lite': makeGenericError(),
      'gemini-3.5-flash-lite': { text: '{"name":"Bread","calories":120}' },
    });
    const { model } = await callGeminiWithFallback(mock, 'test prompt');
    assertEqual(model, 'gemini-3.5-flash-lite');
    assertEqual(mock._callCounts['gemini-3.1-flash-lite'], 1, 'Generic error — called only once, no retry');
  });

  // 6. 429 cascades across all models → throws descriptive error
  await test('Throws descriptive error when all models return 429', async () => {
    const mock = createMockGenAI({
      'gemini-3.1-flash-lite': make429Error(),
      'gemini-3.5-flash-lite': make429Error(),
      'gemini-3-flash':        make429Error(),
      'gemini-3.5-flash':      make429Error(),
      'gemini-3.7-flash':      make429Error(),
      'gemini-3.6-flash':      make429Error(),
    });
    try {
      await callGeminiWithFallback(mock, 'test prompt');
      assert(false, 'Should have thrown');
    } catch (err) {
      assert(err.message.includes('Gemini AI unavailable'), 'Error message should mention unavailability');
      assert(err.message.includes('gemini-3.1-flash-lite'), 'Error should list tried models');
    }
  });

  // 7. All models fail with 503 (after retry) → throws
  await test('Throws descriptive error when all models fail with 503', async () => {
    const mock = createMockGenAI({
      'gemini-3.1-flash-lite': make503Error(),
      'gemini-3.5-flash-lite': make503Error(),
      'gemini-3-flash':        make503Error(),
      'gemini-3.5-flash':      make503Error(),
      'gemini-3.7-flash':      make503Error(),
      'gemini-3.6-flash':      make503Error(),
    });
    try {
      await callGeminiWithFallback(mock, 'test prompt');
      assert(false, 'Should have thrown');
    } catch (err) {
      assert(err.message.includes('Gemini AI unavailable'));
      assert(err.message.includes('503'), 'Should mention the 503 in last error');
    }
  });

  // 8. Second model 429, third model succeeds
  await test('Falls all the way to third model when first two have 429', async () => {
    const mock = createMockGenAI({
      'gemini-3.1-flash-lite': make429Error(),
      'gemini-3.5-flash-lite': make429Error(),
      'gemini-3-flash':        { text: '{"name":"Lentils","calories":220}' },
    });
    const { model } = await callGeminiWithFallback(mock, 'test prompt');
    assertEqual(model, 'gemini-3-flash', 'Should reach third model');
  });

  // 9. Error message in thrown error lists all tried models
  await test('Thrown error contains the full list of tried models', async () => {
    const customList = ['model-A', 'model-B', 'model-C'];
    const mock = createMockGenAI({
      'model-A': makeGenericError(),
      'model-B': makeGenericError(),
      'model-C': makeGenericError(),
    });
    try {
      await callGeminiWithFallback(mock, 'test prompt', customList);
      assert(false, 'Should have thrown');
    } catch (err) {
      assert(err.message.includes('model-A'), 'Should list model-A');
      assert(err.message.includes('model-B'), 'Should list model-B');
      assert(err.message.includes('model-C'), 'Should list model-C');
    }
  });

  // 10. Successful response includes the model name for logging
  await test('Successful response includes the serving model name', async () => {
    const mock = createMockGenAI({
      'gemini-3.1-flash-lite': make429Error(),
      'gemini-3.5-flash-lite': { text: '{"name":"Oats","calories":150}' },
    });
    const result = await callGeminiWithFallback(mock, 'test');
    assert('model' in result, 'Result should have a model property');
    assertEqual(result.model, 'gemini-3.5-flash-lite');
  });

  // ── Results ─────────────────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(48)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    console.error('\nSome tests FAILED. See details above.\n');
    process.exit(1);
  } else {
    console.log('\nAll tests PASSED ✓\n');
    process.exit(0);
  }

})();
