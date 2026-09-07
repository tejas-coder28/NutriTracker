/**
 * On-Device AI Service — uses @google/genai SDK
 * Works with EXPO_PUBLIC_GEMINI_API_KEY from Google AI Studio.
 * Set EXPO_PUBLIC_GEMINI_API_KEY in mobile/.env
 */
import { GoogleGenAI } from '@google/genai';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
const MODEL_PRIORITY_LIST = [
  'gemini-3.1-flash-lite', // 500 RPD — try first (most quota)
  'gemini-3.5-flash-lite', // 500 RPD
  'gemini-3-flash',        //  20 RPD
  'gemini-3.5-flash',      //  20 RPD — partially used
  'gemini-3.7-flash',      //  20 RPD — partially used
  'gemini-3.6-flash',      //  20 RPD — currently maxed out, last resort
];

function is429Error(err) {
  const status = err?.status || err?.statusCode || err?.response?.status || err?.error?.code;
  const msg = (err?.message || String(err) || '').toLowerCase();
  return status === 429 || msg.includes('429') || msg.includes('resource_exhausted') || msg.includes('quota');
}

function is503Error(err) {
  const status = err?.status || err?.statusCode || err?.response?.status || err?.error?.code;
  const msg = (err?.message || String(err) || '').toLowerCase();
  return status === 503 || msg.includes('503') || msg.includes('unavailable') || msg.includes('high demand') || msg.includes('overloaded');
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function callGeminiWithFallback(client, contents) {
  let lastError = null;

  for (const model of MODEL_PRIORITY_LIST) {
    let attempts = 0;
    const maxAttempts = 2; // For 503: retry once (up to 2 total attempts). For 429: skip immediately.

    while (attempts < maxAttempts) {
      attempts++;
      try {
        const response = await client.models.generateContent({
          model,
          contents,
        });
        const rawText = response?.text || '';
        if (rawText) {
          console.log(`[Gemini API] Request successfully served by model: ${model}`);
          return { rawText, model };
        }
      } catch (err) {
        lastError = err;
        const errStr = err?.message || String(err);
        console.warn(`[Gemini API] Model ${model} (attempt ${attempts}) failed: ${errStr}`);

        if (is429Error(err)) {
          console.warn(`[Gemini API] 429 Quota Exhausted on ${model}. Skipping to next model immediately.`);
          break; // Exit attempt loop, fallback to next model
        } else if (is503Error(err)) {
          if (attempts < maxAttempts) {
            console.warn(`[Gemini API] 503 Service Unavailable on ${model}. Retrying once after 1s delay...`);
            await delay(1000);
            continue; // Retry same model once
          } else {
            console.warn(`[Gemini API] 503 Service Unavailable on ${model} after retry. Falling back to next model.`);
            break; // Exit attempt loop, fallback to next model
          }
        } else {
          // Any other error, fallback to next model
          break;
        }
      }
    }
  }

  const detailedErrMsg = lastError?.message || String(lastError) || 'Unknown error';
  console.error('[Gemini API] All models failed in fallback chain:', detailedErrMsg);
  throw new Error(`AI service currently unavailable. Details: ${detailedErrMsg}`);
}

const SYSTEM_PROMPT = `You are NutriTrack AI, an expert nutritionist assistant.
Analyze the input food (image and/or text description) and estimate the macro breakdown accurately based on standard USDA / Indian / global nutrient databases.
If multiple food items are present (e.g. "2 Rotis with 300g Chicken Breast"), break down EACH food item into the "items" array with its OWN individual portion weight in grams and macro breakdown.

For each item, also determine:
- unit_type: "piece" if this food is naturally counted in discrete pieces (e.g. idli, roti, egg, cake slice, biscuit, fruit, dosa). "weight" for everything measured by mass (meat, rice, dal, cooked vegetables, liquids, mixed dishes).
- grams_per_piece: only when unit_type is "piece" — the estimated weight in grams of ONE piece (e.g. 1 roti ≈ 40g, 1 idli ≈ 60g, 1 egg ≈ 60g, 1 cake slice ≈ 80g). Omit or set to null when unit_type is "weight".
- quantity: only when unit_type is "piece" — the number of pieces. Omit or set to null when unit_type is "weight".
- estimated_grams must ALWAYS equal quantity × grams_per_piece for piece items, or the actual gram weight for weight items.

Respond ONLY with a valid JSON object in this exact structure (no markdown, no extra text):
{
  "name": "Short overall meal title (e.g., 2 Rotis with Chicken Breast)",
  "estimated_grams": 380,
  "assumed_serving_size": "2 rotis (80g) and cooked chicken breast (300g)",
  "calories": 715,
  "protein": 100,
  "carbs": 36,
  "fat": 16,
  "fiber": 4,
  "confidence": "high",
  "breakdown": "Individual item breakdown summary",
  "items": [
    {
      "name": "Whole Wheat Roti",
      "unit_type": "piece",
      "quantity": 2,
      "grams_per_piece": 40,
      "estimated_grams": 80,
      "calories": 220,
      "protein": 7,
      "carbs": 36,
      "fat": 5,
      "fiber": 4
    },
    {
      "name": "Cooked Chicken Breast",
      "unit_type": "weight",
      "quantity": null,
      "grams_per_piece": null,
      "estimated_grams": 300,
      "calories": 495,
      "protein": 93,
      "carbs": 0,
      "fat": 11,
      "fiber": 0
    }
  ]
}`;

function getClient() {
  if (!GEMINI_API_KEY) return null;
  return new GoogleGenAI({ apiKey: GEMINI_API_KEY });
}

function parseGeminiResponse(rawText, fallbackName) {
  try {
    let cleaned = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) cleaned = jsonMatch[0];
    const parsed = JSON.parse(cleaned);

    let items = [];
    if (Array.isArray(parsed.items) && parsed.items.length > 0) {
      items = parsed.items.map(it => {
        const unitType = it.unit_type === 'piece' ? 'piece' : 'weight';
        const qty = unitType === 'piece' ? Math.max(1, Math.round(Number(it.quantity) || 1)) : null;
        const gpp = unitType === 'piece' ? Math.max(1, Math.round(Number(it.grams_per_piece) || 50)) : null;
        const grams = unitType === 'piece' ? qty * gpp : Math.max(5, Math.round(Number(it.estimated_grams) || 100));
        return {
          name: it.name || 'Food Item',
          unit_type: unitType,
          quantity: qty,
          grams_per_piece: gpp,
          estimated_grams: grams,
          calories: Math.round(Number(it.calories) || 0),
          protein: Math.round(Number(it.protein) || 0),
          carbs: Math.round(Number(it.carbs) || 0),
          fat: Math.round(Number(it.fat) || 0),
          fiber: Math.round(Number(it.fiber) || 0),
        };
      });
    }

    if (items.length === 0) {
      items = [{
        name: parsed.name || fallbackName || 'Logged Meal',
        unit_type: 'weight',
        quantity: null,
        grams_per_piece: null,
        estimated_grams: Math.max(10, Math.round(Number(parsed.estimated_grams) || 200)),
        calories: Math.round(Number(parsed.calories) || 0),
        protein: Math.round(Number(parsed.protein) || 0),
        carbs: Math.round(Number(parsed.carbs) || 0),
        fat: Math.round(Number(parsed.fat) || 0),
        fiber: Math.round(Number(parsed.fiber) || 0),
      }];
    }

    const totalGrams = items.reduce((acc, i) => acc + i.estimated_grams, 0);
    const totalCals = items.reduce((acc, i) => acc + i.calories, 0);
    const totalProtein = items.reduce((acc, i) => acc + i.protein, 0);
    const totalCarbs = items.reduce((acc, i) => acc + i.carbs, 0);
    const totalFat = items.reduce((acc, i) => acc + i.fat, 0);
    const totalFiber = items.reduce((acc, i) => acc + i.fiber, 0);

    return {
      name: parsed.name || fallbackName || 'Logged Meal',
      estimated_grams: Math.max(10, Math.round(Number(parsed.estimated_grams) || totalGrams)),
      assumed_serving_size: parsed.assumed_serving_size || items.map(i => `${i.name} (${i.estimated_grams}g)`).join(', '),
      calories: Math.round(Number(parsed.calories) || totalCals),
      protein: Math.round(Number(parsed.protein) || totalProtein),
      carbs: Math.round(Number(parsed.carbs) || totalCarbs),
      fat: Math.round(Number(parsed.fat) || totalFat),
      fiber: Math.round(Number(parsed.fiber) || totalFiber),
      confidence: parsed.confidence || 'high',
      breakdown: parsed.breakdown || items.map(i => `${i.name}: ${i.estimated_grams}g (${i.calories} kcal)`).join(' • '),
      items
    };
  } catch (e) {
    console.error('Failed to parse Gemini JSON. Raw:', rawText);
    return fallbackEstimate(fallbackName);
  }
}

function fallbackEstimate(text = '') {
  const lower = (text || '').toLowerCase();
  let items = [];
  let name = text.length > 0 ? text : 'Meal';
  let assumed_serving_size = 'Estimated 1 typical portion (~250g)';

  if (lower.includes('roti') || lower.includes('dal') || lower.includes('curd')) {
    items = [
      { name: 'Whole Wheat Roti', unit_type: 'piece', quantity: 2, grams_per_piece: 40, estimated_grams: 80, calories: 220, protein: 7, carbs: 36, fat: 5, fiber: 4 },
      { name: 'Yellow Dal', unit_type: 'weight', quantity: null, grams_per_piece: null, estimated_grams: 150, calories: 150, protein: 9, carbs: 20, fat: 4, fiber: 3 },
      { name: 'Fresh Curd', unit_type: 'weight', quantity: null, grams_per_piece: null, estimated_grams: 70, calories: 50, protein: 2, carbs: 2, fat: 3, fiber: 0 },
    ];
    assumed_serving_size = '2 rotis (80g), 1 bowl dal (150g), curd (70g)';
  } else if (lower.includes('egg') || lower.includes('omelet')) {
    items = [
      { name: 'Cooked Egg', unit_type: 'piece', quantity: 2, grams_per_piece: 60, estimated_grams: 120, calories: 180, protein: 14, carbs: 2, fat: 12, fiber: 0 },
      { name: 'Cooking Oil / Toast', unit_type: 'weight', quantity: null, grams_per_piece: null, estimated_grams: 30, calories: 60, protein: 4, carbs: 2, fat: 4, fiber: 0 },
    ];
    assumed_serving_size = '2 large eggs (~120g) cooked';
  } else if (lower.includes('chicken')) {
    items = [
      { name: 'Cooked Chicken Breast', unit_type: 'weight', quantity: null, grams_per_piece: null, estimated_grams: 200, calories: 330, protein: 40, carbs: 0, fat: 8, fiber: 0 },
    ];
    assumed_serving_size = '1 grilled chicken breast (~200g)';
  } else {
    items = [
      { name: text || 'Custom Meal', unit_type: 'weight', quantity: null, grams_per_piece: null, estimated_grams: 250, calories: 350, protein: 25, carbs: 35, fat: 12, fiber: 5 }
    ];
  }

  const totalGrams = items.reduce((acc, i) => acc + i.estimated_grams, 0);
  const totalCals = items.reduce((acc, i) => acc + i.calories, 0);
  const totalProtein = items.reduce((acc, i) => acc + i.protein, 0);
  const totalCarbs = items.reduce((acc, i) => acc + i.carbs, 0);
  const totalFat = items.reduce((acc, i) => acc + i.fat, 0);
  const totalFiber = items.reduce((acc, i) => acc + i.fiber, 0);

  return {
    name,
    estimated_grams: totalGrams,
    assumed_serving_size,
    calories: totalCals, protein: totalProtein, carbs: totalCarbs, fat: totalFat, fiber: totalFiber,
    confidence: 'medium',
    breakdown: items.map(i => `${i.name}: ${i.estimated_grams}g (${i.calories} kcal)`).join(' • '),
    items
  };
}

async function getImageBase64(imageUri) {
  if (Platform.OS === 'web') {
    if (imageUri.startsWith('data:')) {
      return imageUri.split(',')[1];
    }
    const response = await fetch(imageUri);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result;
        resolve(dataUrl.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } else {
    return await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
  }
}

export async function analyzeTextWithGemini(description) {
  const client = getClient();
  if (!client) {
    console.warn('EXPO_PUBLIC_GEMINI_API_KEY not set — using fallback estimate.');
    return fallbackEstimate(description);
  }

  const { rawText } = await callGeminiWithFallback(client, `${SYSTEM_PROMPT}\n\nUser food description: "${description}"`);
  return parseGeminiResponse(rawText, description);
}

export async function analyzeImageWithGemini(localImageUri, note = '') {
  const client = getClient();
  if (!client) {
    console.warn('EXPO_PUBLIC_GEMINI_API_KEY not set — using fallback estimate.');
    return fallbackEstimate(note || 'Scanned Plate');
  }

  const base64 = await getImageBase64(localImageUri);
  const ext = (localImageUri.split('.').pop() || 'jpg').toLowerCase();
  const mimeMap = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
  const mimeType = mimeMap[ext] || 'image/jpeg';

  const contents = [
    { text: `${SYSTEM_PROMPT}\n\nAnalyze the food in this image. Additional notes: "${note}"` },
    { inlineData: { mimeType, data: base64 } },
  ];

  const { rawText } = await callGeminiWithFallback(client, contents);
  return parseGeminiResponse(rawText, note || 'Scanned Meal');
}

/**
 * Generates an AI smart suggestion (nudge) for the user's dashboard based on current health context.
 */
export async function generateSmartSuggestion(params) {
  const {
    netCalories = 0,
    targetCalories = 2000,
    workoutCount = 0,
    burnedCalories = 0,
    waterGlasses = 0,
    waterGoal = 8,
    hourOfDay = new Date().getHours(),
    goalType = 'fat_loss',
  } = params || {};

  // Rule-based fallback generator
  const getFallbackSuggestion = () => {
    if (workoutCount > 0) {
      return goalType === 'muscle_gain'
        ? `Great workout session today! Fuel your muscle growth with a protein-packed snack or recovery shake.`
        : `Awesome workout session today! Support muscle recovery with a protein-packed snack like Greek yogurt, eggs, or a whey shake.`;
    }
    if (waterGlasses < Math.ceil(waterGoal / 2) && hourOfDay >= 14) {
      return `You're at ${waterGlasses}/${waterGoal} water glasses today — take a quick break to hydrate and boost your energy!`;
    }
    if (goalType === 'muscle_gain') {
      if (netCalories < targetCalories - 300 && hourOfDay >= 18) {
        return `You're ${targetCalories - netCalories} kcal under your bulking surplus target tonight — consider a nutrient-rich snack or smoothie!`;
      }
      if (netCalories >= targetCalories - 100) {
        return `Great job hitting your calorie surplus target today to support lean muscle mass gains!`;
      }
    } else if (goalType === 'fat_loss') {
      if (netCalories < targetCalories - 350 && hourOfDay >= 18) {
        return `You're ${targetCalories - netCalories} kcal under your target tonight — consider a light, nutrient-dense snack before bed.`;
      }
      if (netCalories > targetCalories + 200) {
        return `You've exceeded your daily target slightly — balance it out with a refreshing evening walk or a lighter meal tomorrow.`;
      }
    }
    return `Great job maintaining your nutrition & activity consistency today — keep pushing towards your fitness goals!`;
  };

  const client = getClient();
  if (!client) {
    return getFallbackSuggestion();
  }

  const goalLabel =
    goalType === 'muscle_gain'
      ? 'Muscle Gain / Bulking (Calorie Surplus)'
      : goalType === 'maintenance'
      ? 'Weight Maintenance'
      : 'Fat Loss (Calorie Deficit)';

  const prompt = `You are NutriTrack AI health coach. Write ONE single, actionable, friendly 1-sentence nudge (maximum 20 words) for the user based on their current status:
- User Fitness Goal: ${goalLabel}
- Hour of day: ${hourOfDay}:00 (${hourOfDay < 12 ? 'Morning' : hourOfDay < 17 ? 'Afternoon' : 'Evening'})
- Net calories: ${netCalories} / ${targetCalories} kcal (Target)
- Workouts logged today: ${workoutCount} (${burnedCalories} kcal burned)
- Water glasses consumed: ${waterGlasses} / ${waterGoal}

Focus instructions:
- If Goal is Muscle Gain / Bulking: Focus on hitting calorie surplus and post-workout protein recovery for muscle building.
- If a workout was logged -> suggest a post-workout protein-rich food/snack for recovery.
- If net calories are under goal in evening for bulking -> suggest a calorie & protein-dense snack or shake.
- If water intake is low in afternoon/evening -> give a gentle hydration reminder.
- Otherwise -> encouraging nutrition or activity tip tailored to their ${goalType} goal.

Respond ONLY with the single sentence text. No quotes, no bullet points, no markdown formatting.`;

  try {
    const { rawText } = await callGeminiWithFallback(client, prompt);
    const cleaned = rawText.replace(/["'\n\r]/g, '').trim();
    return cleaned || getFallbackSuggestion();
  } catch (err) {
    console.warn('[Smart Nudge] Gemini API call failed, using rule-based suggestion:', err?.message);
    return getFallbackSuggestion();
  }
}


