/**
 * Backend AI Service — Google Generative AI (Node.js)
 * Uses @google/generative-ai SDK with a prioritized model fallback chain.
 *
 * Fallback order: gemini-3.6-flash → gemini-3.7-flash → gemini-3.5-flash
 *   - 429 RESOURCE_EXHAUSTED → skip immediately to next model
 *   - 503 UNAVAILABLE       → retry same model once after 1 s, then fallback
 *   - Any other error       → fallback to next model immediately
 *
 * If every model fails, throws a descriptive error that callers can surface
 * to the end user instead of silently degrading to heuristics.
 */
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const config = require('../config');

// ── Model priority list ──────────────────────────────────────────────────────
// Gemini 3.x Flash / Flash-Lite only — ordered by quota availability.
// Lite models have 500 RPD; standard models have 20 RPD.
// The maxed-out model is placed last so it is only reached when everything else fails.
const MODEL_PRIORITY_LIST = [
  'gemini-3.1-flash-lite', // 500 RPD — try first (most quota)
  'gemini-3.5-flash-lite', // 500 RPD
  'gemini-3-flash',        //  20 RPD
  'gemini-3.5-flash',      //  20 RPD — partially used
  'gemini-3.7-flash',      //  20 RPD — partially used
  'gemini-3.6-flash',      //  20 RPD — currently maxed out, last resort
];

// Allow override via config / env (e.g. for local dev or custom deployments)
const EFFECTIVE_MODEL_LIST = (() => {
  const override = config.GEMINI_MODEL;
  if (override && override !== 'gemini-3.1-flash-lite') {
    // Put the configured model first, keep the rest as fallbacks
    return [override, ...MODEL_PRIORITY_LIST.filter(m => m !== override)];
  }
  return MODEL_PRIORITY_LIST;
})();

// ── Error-type helpers ───────────────────────────────────────────────────────
function is429Error(err) {
  const status = err?.status || err?.statusCode || err?.response?.status;
  const msg = (err?.message || String(err) || '').toLowerCase();
  return (
    status === 429 ||
    msg.includes('429') ||
    msg.includes('resource_exhausted') ||
    msg.includes('quota')
  );
}

function is503Error(err) {
  const status = err?.status || err?.statusCode || err?.response?.status;
  const msg = (err?.message || String(err) || '').toLowerCase();
  return (
    status === 503 ||
    msg.includes('503') ||
    msg.includes('unavailable') ||
    msg.includes('high demand') ||
    msg.includes('overloaded')
  );
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ── Core fallback engine ─────────────────────────────────────────────────────
/**
 * Attempts to call the Generative AI API across the model priority list,
 * applying 429/503-specific retry/skip logic.
 *
 * @param {string|Array} contentParts  - Prompt string or array of content parts
 * @returns {{ rawText: string, model: string }}
 * @throws {Error} if all models in the chain fail
 */
async function callGeminiWithFallback(contentParts) {
  if (!config.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured.');
  }

  const genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);
  let lastError = null;

  for (const modelName of EFFECTIVE_MODEL_LIST) {
    let attempts = 0;
    const maxAttempts = 2; // 503: up to 2 tries; 429: break immediately

    while (attempts < maxAttempts) {
      attempts++;
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(contentParts);
        const rawText = result.response.text();

        if (rawText) {
          console.log(`[Gemini API] ✓ Served by model: ${modelName} (attempt ${attempts})`);
          return { rawText, model: modelName };
        }
        // Empty response — treat like a generic error and fall through
        throw new Error('Empty response from model.');
      } catch (err) {
        lastError = err;
        const errStr = err?.message || String(err);
        console.warn(`[Gemini API] Model ${modelName} (attempt ${attempts}) failed: ${errStr}`);

        if (is429Error(err)) {
          console.warn(
            `[Gemini API] 429 Quota Exhausted on ${modelName}. Skipping to next model immediately.`
          );
          break; // Don't retry — quota won't reset in time
        } else if (is503Error(err)) {
          if (attempts < maxAttempts) {
            console.warn(
              `[Gemini API] 503 Unavailable on ${modelName}. Retrying once after 1 s…`
            );
            await delay(1000);
            continue; // Retry same model once
          } else {
            console.warn(
              `[Gemini API] 503 Unavailable on ${modelName} after retry. Falling back to next model.`
            );
            break;
          }
        } else {
          // Any other error (400 Bad Request, network error, etc.) — skip immediately
          break;
        }
      }
    }
  }

  const detailedErrMsg = lastError?.message || String(lastError) || 'Unknown error';
  console.error('[Gemini API] ✗ All models failed in fallback chain:', detailedErrMsg);
  throw new Error(
    `Gemini AI service unavailable. Tried models: [${EFFECTIVE_MODEL_LIST.join(', ')}]. ` +
    `Last error: ${detailedErrMsg}`
  );
}

// ── System prompt ────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are NutriTrack AI, an expert nutritionist assistant.
Analyze the input food (image and/or text description) and estimate the macro breakdown accurately based on standard USDA / Indian / global nutrient databases.
If an exact weight is provided in text (e.g., "150g chicken"), use that weight. If NO weight is explicitly stated, estimate a standard typical portion size in grams, state your portion assumptions clearly in "assumed_serving_size", and estimate total grams in "estimated_grams".

Respond ONLY with a valid JSON object matching this exact structure:
{
  "name": "Short descriptive food name",
  "estimated_grams": 250,
  "assumed_serving_size": "1 medium bowl of dal (150g) and 2 rotis (80g)",
  "calories": 420,
  "protein": 22,
  "carbs": 55,
  "fat": 12,
  "fiber": 7,
  "confidence": "high",
  "breakdown": "Detailed portion breakdown used for calculation"
}
Ensure all numbers are realistic (integers). Do not include markdown codeblocks or extra text.`;

// ── Helper to convert image file → inline data part ─────────────────────────
function fileToGenerativePart(filePath, mimeType) {
  return {
    inlineData: {
      data: Buffer.from(fs.readFileSync(filePath)).toString('base64'),
      mimeType,
    },
  };
}

// ── JSON response parser ─────────────────────────────────────────────────────
function parseGeminiJsonResponse(rawText, fallbackName) {
  try {
    const cleanedText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
    const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : cleanedText);

    return {
      name: parsed.name || fallbackName || 'Logged Meal',
      estimated_grams: Math.max(10, Math.round(Number(parsed.estimated_grams) || 200)),
      assumed_serving_size: parsed.assumed_serving_size || '1 standard portion (~200g)',
      calories: Math.round(Number(parsed.calories) || 0),
      protein: Math.round(Number(parsed.protein) || 0),
      carbs: Math.round(Number(parsed.carbs) || 0),
      fat: Math.round(Number(parsed.fat) || 0),
      fiber: Math.round(Number(parsed.fiber) || 0),
      confidence: parsed.confidence || 'high',
      breakdown: parsed.breakdown || 'Estimated by Gemini AI',
      raw: rawText,
    };
  } catch (e) {
    console.error('[Gemini API] Failed to parse response JSON. Raw text:', rawText);
    return fallbackAnalyzeText(fallbackName);
  }
}

// ── Public API functions ─────────────────────────────────────────────────────

/**
 * Analyzes a text food description using Gemini with the fallback chain.
 * Falls back to heuristic estimates ONLY when the API key is not set.
 * Throws (with clear message) when all models fail — callers should surface this to the user.
 */
async function analyzeFoodText(textDescription) {
  if (!config.GEMINI_API_KEY) {
    console.warn('[Gemini API] GEMINI_API_KEY not set — using heuristic analyzer.');
    return fallbackAnalyzeText(textDescription);
  }

  const prompt = `${SYSTEM_PROMPT}\n\nUser food description: "${textDescription}"`;
  const { rawText, model } = await callGeminiWithFallback(prompt);

  const result = parseGeminiJsonResponse(rawText, textDescription);
  result._servedByModel = model; // attach metadata for logging/debugging
  return result;
}

/**
 * Analyzes a food image using Gemini Vision with the fallback chain.
 * Falls back to heuristic estimates ONLY when the API key is not set.
 * Throws (with clear message) when all models fail.
 */
async function analyzeFoodImage(imagePath, mimeType, optionalNote = '') {
  if (!config.GEMINI_API_KEY) {
    console.warn('[Gemini API] GEMINI_API_KEY not set — using heuristic analyzer.');
    return fallbackAnalyzeImage(optionalNote);
  }

  const imagePart = fileToGenerativePart(imagePath, mimeType);
  const prompt = `${SYSTEM_PROMPT}\n\nAnalyze the food in this image. Additional user notes: "${optionalNote}"`;

  const { rawText, model } = await callGeminiWithFallback([prompt, imagePart]);

  const result = parseGeminiJsonResponse(rawText, optionalNote || 'Scanned Meal');
  result._servedByModel = model;
  return result;
}

// ── Offline heuristic fallbacks ──────────────────────────────────────────────
// These are used ONLY when GEMINI_API_KEY is absent.
// When the API key is present and all models fail, we throw instead.

function fallbackAnalyzeText(text = '') {
  const lower = text.toLowerCase();
  let calories = 350, protein = 25, carbs = 35, fat = 12, fiber = 5;
  let estimated_grams = 250;
  let assumed_serving_size = 'Estimated 1 typical plate portion (~250g)';

  if (lower.includes('roti') || lower.includes('dal') || lower.includes('curd')) {
    calories = 420; protein = 18; carbs = 58; fat = 12; fiber = 7;
    estimated_grams = 300;
    assumed_serving_size = '2 medium rotis (80g), 1 bowl dal (150g), 1 cup curd (70g)';
  } else if (lower.includes('egg') || lower.includes('omelet')) {
    calories = 240; protein = 18; carbs = 4; fat = 16; fiber = 0;
    estimated_grams = 150;
    assumed_serving_size = '2 large eggs (~120g) cooked with butter';
  } else if (lower.includes('chicken')) {
    calories = 380; protein = 42; carbs = 10; fat = 12; fiber = 2;
    estimated_grams = 200;
    assumed_serving_size = '1 grilled chicken breast portion (~200g)';
  }

  return {
    name: text.length > 0 ? text : 'Healthy Meal',
    estimated_grams,
    assumed_serving_size,
    calories, protein, carbs, fat, fiber,
    confidence: 'medium',
    breakdown: 'Estimated via offline nutrient database',
    raw: JSON.stringify({ note: 'fallback heuristic used — no API key' }),
  };
}

function fallbackAnalyzeImage(note = '') {
  return {
    name: note.length > 0 ? note : 'Scanned Plate Meal',
    estimated_grams: 300,
    assumed_serving_size: 'Visual plate scan portion (~300g)',
    calories: 420, protein: 30, carbs: 40, fat: 14, fiber: 6,
    confidence: 'medium',
    breakdown: 'Estimated from visual dish composition',
    raw: JSON.stringify({ note: 'fallback image estimation used — no API key' }),
  };
}

// ── Exports ──────────────────────────────────────────────────────────────────
module.exports = {
  analyzeFoodText,
  analyzeFoodImage,
  callGeminiWithFallback,  // exported for unit testing
  EFFECTIVE_MODEL_LIST,    // exported for unit testing
};
