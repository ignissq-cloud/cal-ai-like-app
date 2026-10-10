import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// --- Gemini request reliability ------------------------------------------------
// Free tier: NO aggressive retries. Exactly one retry, only for a transient 503.
const GEMINI_TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS) || 60000;
const GEMINI_503_RETRY_DELAY_MS = 1500;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const apiStatus = (err) => {
  const status = Number(err?.status);
  return Number.isFinite(status) ? status : undefined;
};

// Runs one request with a hard timeout. Cleanup lives in `finally` so the timer
// is always cleared, and the SDK promise always keeps a rejection handler (even
// if it settles after the timeout won the race) — no unhandled rejections.
const withTimeout = async (makeRequest, timeoutMs) => {
  let timeoutId;
  let apiPromise;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      const err = new Error('Gemini request timed out');
      err.code = 'ETIMEDOUT';
      reject(err);
    }, timeoutMs);
  });

  try {
    apiPromise = makeRequest();
    return await Promise.race([apiPromise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId);
    // A rejection landing after the timeout won the race must stay handled,
    // otherwise Node treats it as an unhandled rejection and can exit the process.
    apiPromise?.catch(() => {});
  }
};

// Food analysis request — JSON response schema (unchanged behavior).
const callGemini = (prompt, mimeType, cleanBase64, timeoutMs) =>
  withTimeout(
    () =>
      ai.models.generateContent({
        model: 'gemini-3.5-flash-lite',
        contents: [
          { role: 'user', parts: [
            { text: prompt },
            { inlineData: { mimeType: mimeType, data: cleanBase64 } }
          ]}
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: 'e.g. Grilled Chicken Salad' },
              portion: { type: Type.STRING, description: 'e.g. 1 bowl, ~300g' },
              ingredients: { type: Type.ARRAY, items: { type: Type.STRING } },
              calories: { type: Type.NUMBER },
              protein: { type: Type.NUMBER },
              carbs: { type: Type.NUMBER },
              fat: { type: Type.NUMBER },
              fiber: { type: Type.NUMBER },
              sugar: { type: Type.NUMBER },
              confidence: { type: Type.STRING, description: 'High, Medium, or Low' },
              needsClarification: { type: Type.BOOLEAN },
              clarificationQuestion: { type: Type.STRING, description: 'Only if needsClarification is true' }
            },
            required: ['name', 'portion', 'ingredients', 'calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'needsClarification', 'confidence']
          }
        }
      }),
    timeoutMs,
  );

// Onboarding coach request — plain text reply, no image, no schema.
const callCoachGemini = (prompt, timeoutMs) =>
  withTimeout(
    () =>
      ai.models.generateContent({
        model: 'gemini-3.5-flash-lite',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      }),
    timeoutMs,
  );

// First attempt and the optional single 503 retry share one overall deadline,
// so a user never waits longer than GEMINI_TIMEOUT_MS in total.
// `attempt(timeoutMs)` is one call (food analysis or coach).
const withRetry = async (attempt) => {
  const deadline = Date.now() + GEMINI_TIMEOUT_MS;
  const remaining = () => deadline - Date.now();
  try {
    return await attempt(remaining());
  } catch (err) {
    if (apiStatus(err) !== 503) throw err;
    console.warn('Gemini overloaded (503) — retrying once...');
    await sleep(GEMINI_503_RETRY_DELAY_MS);
    if (remaining() <= 0) throw err;
    return attempt(remaining());
  }
};

// Turn SDK/network/timeout failures into short, user-facing messages.
// Raw API payloads are only ever written to the server log.
const describeGeminiError = (err) => {
  if (err?.code === 'ETIMEDOUT') {
    return { status: 504, message: 'The AI took too long to respond. Please try again.' };
  }
  if (err?.code === 'EEMPTY' || err?.code === 'EBADJSON') {
    return { status: 502, message: 'The AI sent an unexpected response. Please try again.' };
  }
  const status = apiStatus(err);
  if (status === 429) {
    return { status: 429, message: 'The AI usage limit has been reached for now. Please try again a little later.' };
  }
  if (status === 503) {
    return { status: 503, message: 'The AI service is busy right now. Please try again in a moment.' };
  }
  if (status === 401 || status === 403) {
    return { status: 502, message: 'The AI service rejected the request. Please check the server API key.' };
  }
  if (status === undefined) {
    return { status: 502, message: 'Could not reach the AI service. Please check your connection and try again.' };
  }
  return { status: 502, message: 'The AI service had a problem. Please try again.' };
};

app.post('/api/analyze', async (req, res) => {
  const { image, profile, clarificationAnswer, previousContext } = req.body;

  if (!image) {
    return res.status(400).json({ error: 'Image is required' });
  }

  const prompt = `You are an expert AI nutritionist. Analyze the food image.
Your goal is to identify the food, portion size, ingredients, and provide nutritional estimates.
If there are ambiguities or important information cannot be reliably determined (e.g. unknown sauce, obscured ingredients), do not invent them. Instead, set "needsClarification": true and ask a concise question in "clarificationQuestion".
Otherwise, provide the estimates. They are just estimates, not medical-grade. Include a confidence level (e.g. "High", "Medium", "Low").

User Profile context (use for portion estimates if helpful): ${JSON.stringify(profile || {})}
${clarificationAnswer ? `User answered clarification: "${clarificationAnswer}"` : ''}
${previousContext ? `Previous context: ${previousContext}` : ''}
`;

  const mimeTypeMatch = image.match(/^data:(image\/\w+);base64,/);
  const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/jpeg';
  const cleanBase64 = image.replace(/^data:image\/\w+;base64,/, '');

  try {
    console.log("Sending request to Gemini SDK...");

    const response = await withRetry((timeoutMs) => callGemini(prompt, mimeType, cleanBase64, timeoutMs));
    console.log("Received response from Gemini SDK");

    const text = response?.text;
    if (!text) {
      const err = new Error("Empty response from AI");
      err.code = "EEMPTY";
      throw err;
    }

    let result;
    try {
      result = JSON.parse(text);
    } catch {
      const err = new Error("Non-JSON response from AI");
      err.code = "EBADJSON";
      throw err;
    }
    res.json(result);
  } catch (err) {
    // Full error (status, raw API payload) goes to the server log only.
    console.error("AI Analysis failed:", err);
    const { status, message } = describeGeminiError(err);
    res.status(status).json({ error: message });
  }
});

// --- Onboarding AI coach (separate from /api/analyze) ------------------------
// Grounds the coach in the user's onboarding answers. Safety rules keep advice
// non-restrictive, age-appropriate and free of medical claims.
const buildCoachPrompt = (profile, history, message) => {
  const safeProfile =
    profile && typeof profile === 'object' && !Array.isArray(profile) ? profile : {};
  const historyLines = Array.isArray(history)
    ? history
        .slice(-6)
        .filter(
          (m) =>
            m &&
            typeof m === 'object' &&
            typeof m.content === 'string' &&
            (m.role === 'user' || m.role === 'assistant'),
        )
        .map((m) => `${m.role === 'assistant' ? 'Coach' : 'User'}: ${m.content.slice(0, 600)}`)
    : [];

  return `You are the personal nutrition coach inside NutriSnap AI. Reply in a warm, conversational tone in under about 120 words. Plain text only.

About the user (from their own onboarding answers):
${JSON.stringify(safeProfile, null, 2)}

Rules:
- Be practical and specific to the food, schedule, budget and environment they actually described.
- Never recommend restrictive eating, extreme calorie targets, crash diets or aggressive weight loss. No guilt, no shame.
- If the user seems to be under 18, keep advice focused on healthy growth, adequate nutrition, regular meals, activity and sustainable habits — never calorie restriction.
- If they already follow a diet or meal plan, help them follow it instead of replacing it.
- No medical claims or diagnoses; suggest a qualified professional when it matters.
- Respect their food likes, dislikes, dietary restrictions and allergies.

${historyLines.length ? `Conversation so far:\n${historyLines.join('\n')}\n\n` : ''}User's message: ${message}`;
};

app.post('/api/coach', async (req, res) => {
  const { prompt, profile, history } = req.body || {};

  if (typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ error: 'A prompt is required' });
  }

  const coachPrompt = buildCoachPrompt(profile, history, prompt.trim());

  try {
    console.log('Sending coach request to Gemini SDK...');
    const response = await withRetry((timeoutMs) => callCoachGemini(coachPrompt, timeoutMs));
    console.log('Received coach response from Gemini SDK');

    const text = response?.text;
    if (!text) {
      const err = new Error('Empty response from AI');
      err.code = 'EEMPTY';
      throw err;
    }
    res.json({ reply: text });
  } catch (err) {
    console.error('AI Coach failed:', err);
    const { status, message } = describeGeminiError(err);
    res.status(status).json({ error: message });
  }
});

// Unknown API routes return JSON instead of falling through to the SPA.
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Serve the built frontend (production). In dev, Vite serves the UI and proxies /api here.
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(path.join(distPath, 'index.html'))) {
  app.use(
    express.static(distPath, {
      setHeaders: (res, filePath) => {
        // Hashed build output can be cached forever.
        if (filePath.includes(`${path.sep}assets${path.sep}`)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        } else if (filePath.endsWith('.html') || filePath.endsWith('sw.js') || filePath.endsWith('.webmanifest')) {
          // HTML/SW/manifest must revalidate so new deploys are picked up promptly.
          res.setHeader('Cache-Control', 'no-cache');
        }
      },
    })
  );

  // SPA fallback for client-side routes (/history, /settings, /camera, ...)
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
