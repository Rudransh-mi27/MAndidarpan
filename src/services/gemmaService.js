const { getGemmaStatus, apiKey, baseUrl, modelId } = require('../config/gemmaConfig');

const ALLOWED_OPERATIONS = ['latest_price', 'price_trend', 'compare_mandis'];

// Common Hindi/Hinglish crop names mapped to standard Agmarknet English names
const HINDI_COMMODITY_MAP = {
  gehun: 'Wheat',
  gehu: 'Wheat',
  kanak: 'Wheat',
  pyaz: 'Onion',
  pyaaz: 'Onion',
  kanda: 'Onion',
  tamatar: 'Tomato',
  aloo: 'Potato',
  alu: 'Potato',
  chawal: 'Rice',
  dhan: 'Paddy(Dhan)',
  sarson: 'Mustard',
  chana: 'Gram',
  makka: 'Maize',
  makki: 'Maize',
  lahsun: 'Garlic',
  adrak: 'Ginger',
  mirch: 'Chilli'
};

/**
 * Executes an HTTP inference call to the Gemma 4 provider.
 * Protects credentials and never leaks them in error responses.
 */
async function callGemmaInference(messages, temperature = 0.1) {
  const status = getGemmaStatus();
  if (!status.isConfigured) {
    return {
      success: false,
      unconfigured: true,
      missing: status.missing,
      error: `Gemma 4 provider is not configured. Missing in .env: ${status.missing.join(', ')}`
    };
  }

  let endpoint = baseUrl.trim();
  if (!endpoint.endsWith('/chat/completions')) {
    endpoint = endpoint.replace(/\/+$/, '') + '/chat/completions';
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey.trim()}`
      },
      body: JSON.stringify({
        model: modelId.trim(),
        messages,
        temperature
      })
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      return {
        success: false,
        status: response.status,
        error: `Gemma provider returned status ${response.status}. ${errText ? 'Provider message: ' + errText.slice(0, 200) : ''}`
      };
    }

    const data = await response.json();
    const content =
      data.choices && data.choices[0] && data.choices[0].message
        ? data.choices[0].message.content
        : null;

    if (!content) {
      return {
        success: false,
        error: 'Gemma provider returned an empty response or unexpected structure.'
      };
    }

    return {
      success: true,
      content: content.trim()
    };
  } catch (err) {
    return {
      success: false,
      error: `Network error connecting to Gemma provider: ${err.message}`
    };
  }
}

/**
 * Fallback intent parser when running offline or validating Gemma output.
 * Ensures query parsing works even when external AI is unconfigured or returns noisy JSON.
 */
function heuristicExtractIntent(question) {
  const lower = question.toLowerCase();

  // 1. Detect Operation
  let operation = 'latest_price';
  if (
    lower.includes('trend') ||
    lower.includes('badha') ||
    lower.includes('ghata') ||
    lower.includes('bhav gira') ||
    lower.includes('bhav chadha') ||
    lower.includes('rate badha') ||
    lower.includes('rate gira') ||
    lower.includes('gira ya chadha') ||
    lower.includes('badha ya ghata') ||
    lower.includes('price trend')
  ) {
    operation = 'price_trend';
  } else if (
    lower.includes('compare') ||
    lower.includes('kahan bechu') ||
    lower.includes('kisme bechu') ||
    lower.includes('kaunsi mandi') ||
    lower.includes('paas ki mandi') ||
    lower.includes('best mandi') ||
    lower.includes('aas paas')
  ) {
    operation = 'compare_mandis';
  }

  // 2. Detect Commodity
  let commodity = null;
  for (const [hindi, english] of Object.entries(HINDI_COMMODITY_MAP)) {
    const regex = new RegExp(`\\b${hindi}\\b`, 'i');
    if (regex.test(lower)) {
      commodity = english;
      break;
    }
  }

  if (!commodity) {
    const commonEnglish = ['Wheat', 'Onion', 'Tomato', 'Potato', 'Rice', 'Mustard', 'Gram', 'Maize', 'Garlic'];
    for (const crop of commonEnglish) {
      if (lower.includes(crop.toLowerCase())) {
        commodity = crop;
        break;
      }
    }
  }

  // 3. Detect District / City
  let district = null;
  const commonDistricts = [
    'Lucknow', 'Kanpur', 'Agra', 'Varanasi', 'Prayagraj', 'Meerut',
    'Bareilly', 'Aligarh', 'Moradabad', 'Gorakhpur', 'Faizabad', 'Ayodhya',
    'Indore', 'Bhopal', 'Jaipur', 'Patna', 'Nashik', 'Pune', 'Nagpur'
  ];
  for (const dist of commonDistricts) {
    if (lower.includes(dist.toLowerCase())) {
      district = dist;
      break;
    }
  }

  // 4. Detect Days
  let days = 7;
  const daysMatch = lower.match(/(\d+)\s*(din|days?)/);
  if (daysMatch) {
    days = parseInt(daysMatch[1], 10);
  }

  const isMissingRequiredInfo = !commodity;
  const clarificationNeeded = isMissingRequiredInfo
    ? 'Aap kis fasal ya commodity (jaise gehun, pyaz, tamatar) ke baare mein janna chahte hain? Kripya fasal ka naam batayein.'
    : null;

  return {
    operation,
    commodity,
    district,
    state: null,
    days,
    isMissingRequiredInfo,
    clarificationNeeded
  };
}

/**
 * Validates and sanitizes model-generated intent.
 * Treats all AI output as untrusted input.
 */
function validateAndSanitizeIntent(rawIntent, fallbackIntent) {
  if (!rawIntent || typeof rawIntent !== 'object') {
    return fallbackIntent;
  }

  let operation = rawIntent.operation;
  if (!ALLOWED_OPERATIONS.includes(operation)) {
    operation = fallbackIntent.operation || 'latest_price';
  }

  const commodity =
    typeof rawIntent.commodity === 'string' && rawIntent.commodity.trim() !== ''
      ? rawIntent.commodity.trim()
      : fallbackIntent.commodity;

  const district =
    typeof rawIntent.district === 'string' && rawIntent.district.trim() !== ''
      ? rawIntent.district.trim()
      : fallbackIntent.district;

  const state =
    typeof rawIntent.state === 'string' && rawIntent.state.trim() !== ''
      ? rawIntent.state.trim()
      : fallbackIntent.state;

  let days = parseInt(rawIntent.days, 10);
  if (isNaN(days) || days <= 0 || days > 365) {
    days = fallbackIntent.days || 7;
  }

  const isMissingRequiredInfo = !commodity;
  let clarificationNeeded = null;
  if (isMissingRequiredInfo) {
    clarificationNeeded =
      rawIntent.clarificationNeeded ||
      'Aap kis fasal ya commodity (jaise gehun, pyaz, tamatar) ke baare mein janna chahte hain? Kripya fasal ka naam batayein.';
  }

  return {
    operation,
    commodity,
    district,
    state,
    days,
    isMissingRequiredInfo,
    clarificationNeeded
  };
}

/**
 * Extracts structured intent from the user query using Gemma 4.
 */
async function extractIntent(question) {
  const fallback = heuristicExtractIntent(question);
  const status = getGemmaStatus();

  if (!status.isConfigured) {
    return {
      usedAi: false,
      unconfigured: true,
      missing: status.missing,
      intent: fallback
    };
  }

  const systemPrompt = `You are an intent extraction engine for MandiMitra, an Indian agricultural mandi assistant.
Extract the user's intent into STRICT JSON format with these exact keys:
{
  "operation": "latest_price" | "price_trend" | "compare_mandis",
  "commodity": "English commodity name (e.g. Wheat, Onion, Tomato, Potato, Rice) or null",
  "district": "District/City name or null",
  "state": "State name or null",
  "days": number or 7,
  "isMissingRequiredInfo": boolean,
  "clarificationNeeded": "Hindi/Hinglish question asking for missing info if commodity is null, else null"
}

Important Rules:
- Hindi crop names: 'gehun'->'Wheat', 'pyaz'->'Onion', 'tamatar'->'Tomato', 'aloo'->'Potato', 'chawal'->'Rice', 'sarson'->'Mustard', 'chana'->'Gram', 'lahsun'->'Garlic'.
- If the question asks if price went up or down ("badha ya ghata", "trend"), operation is "price_trend".
- If the question asks where to sell or compares mandis, operation is "compare_mandis".
- If no crop/commodity is specified, set isMissingRequiredInfo to true and ask for the crop name.
- Return ONLY RAW JSON. No markdown code blocks, no explanation.`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: question }
  ];

  const aiResult = await callGemmaInference(messages, 0.0);
  if (!aiResult.success) {
    return {
      usedAi: false,
      aiError: aiResult.error,
      intent: fallback
    };
  }

  try {
    const cleaned = aiResult.content.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    const sanitized = validateAndSanitizeIntent(parsed, fallback);
    return {
      usedAi: true,
      intent: sanitized
    };
  } catch (parseErr) {
    // If model didn't return valid JSON, safely fallback to validated heuristic
    return {
      usedAi: false,
      aiError: 'Failed to parse AI JSON response; safely fell back to deterministic parser.',
      intent: fallback
    };
  }
}

/**
 * Generates an empathetic explanation in Hindi, Hinglish, or English.
 * Strictly grounded in real verified numerical calculations and dates.
 */
async function generateExplanation({ question, intent, calculatedData }) {
  const status = getGemmaStatus();
  if (!status.isConfigured) {
    return {
      success: false,
      unconfigured: true,
      missing: status.missing,
      error: `Gemma 4 provider credentials are not configured in .env. Missing: ${status.missing.join(', ')}`
    };
  }

  const systemPrompt = `You are MandiMitra, an honest, friendly AI agricultural mandi advisor for Indian farmers.
Explain the verified calculation results to the farmer in simple, clear Hindi/Hinglish or English (matching the user's language).

STRICT APPLICATION GROUNDING RULES:
1. ONLY state facts and numbers explicitly present in the provided VERIFIED DATA.
2. NEVER fabricate or invent prices, percentage changes, dates, mandi names, or distances.
3. If data is marked as insufficient or missing, clearly tell the farmer that recent data is not reported yet.
4. Keep the answer concise, actionable, and encouraging (1-3 short paragraphs).
5. Do NOT include markdown tables or complex math jargon. Speak naturally like a knowledgeable local advisor.`;

  const contextData = {
    userQuestion: question,
    operation: intent.operation,
    commodity: intent.commodity,
    district: intent.district,
    verifiedCalculations: calculatedData
  };

  const messages = [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: `Farmer Question: "${question}"\n\nVERIFIED DATA:\n${JSON.stringify(contextData, null, 2)}\n\nPlease provide a helpful, grounded explanation.`
    }
  ];

  const result = await callGemmaInference(messages, 0.2);
  if (!result.success) {
    return {
      success: false,
      error: result.error
    };
  }

  return {
    success: true,
    explanation: result.content
  };
}

module.exports = {
  getGemmaStatus,
  extractIntent,
  generateExplanation,
  heuristicExtractIntent,
  validateAndSanitizeIntent
};
