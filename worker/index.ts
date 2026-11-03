interface Env {
  GEMINI_API_KEY: string;
  ASSETS: { fetch(request: Request): Promise<Response> };
}

const MODEL = "gemini-3.5-flash-lite";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
const TIMEOUT = 30000;

const schema = {
  type: "OBJECT",
  properties: {
    name: { type: "STRING" },
    portion: { type: "STRING" },
    ingredients: { type: "ARRAY", items: { type: "STRING" } },
    calories: { type: "NUMBER" },
    protein: { type: "NUMBER" },
    carbs: { type: "NUMBER" },
    fat: { type: "NUMBER" },
    fiber: { type: "NUMBER" },
    sugar: { type: "NUMBER" },
    confidence: { type: "STRING" },
    needsClarification: { type: "BOOLEAN" },
    clarificationQuestion: { type: "STRING" }
  },
  required: [
    "name", "portion", "ingredients", "calories", "protein",
    "carbs", "fat", "fiber", "sugar", "needsClarification",
    "confidence"
  ]
};

const json = (data: unknown, status = 200) =>
  Response.json(data, { status });

async function gemini(env: Env, body: object): Promise<Response> {
  const deadline = Date.now() + TIMEOUT;

  for (let attempt = 0; attempt < 2; attempt++) {
    const remaining = deadline - Date.now();

    if (remaining <= 0) throw new Error("TIMEOUT");

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": env.GEMINI_API_KEY
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(remaining)
    });

    if (response.status !== 503 || attempt === 1) return response;

    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  throw new Error("GEMINI_FAILED");
}

function errorResponse(status: number) {
  if (status === 429)
    return json({ error: "The AI usage limit has been reached for now. Please try again a little later." }, 429);

  if (status === 503)
    return json({ error: "The AI service is busy right now. Please try again in a moment." }, 503);

  if (status === 401 || status === 403)
    return json({ error: "The AI service rejected the request. Please check the server API key." }, 502);

  return json({ error: "The AI service had a problem. Please try again." }, 502);
}

async function callAI(env: Env, body: object, analyze: boolean) {
  try {
    const response = await gemini(env, body);

    if (!response.ok) return errorResponse(response.status);

    const result: any = await response.json();
    const text = result.candidates?.[0]?.content?.parts
      ?.map((part: any) => part.text || "")
      .join("");

    if (!text) {
      return json({ error: "The AI sent an unexpected response. Please try again." }, 502);
    }

    if (analyze) {
      try {
        return json(JSON.parse(text));
      } catch {
        return json({ error: "The AI sent an unexpected response. Please try again." }, 502);
      }
    }

    return json({ reply: text });
  } catch (error: any) {
    if (error?.name === "TimeoutError" || error?.message === "TIMEOUT") {
      return json({ error: "The AI took too long to respond. Please try again." }, 504);
    }

    return json({
      error: "Could not reach the AI service. Please check your connection and try again."
    }, 502);
  }
}

async function handleAPI(request: Request, env: Env) {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  if (!env.GEMINI_API_KEY) {
    return json({ error: "Gemini API key is not configured." }, 500);
  }

  let input: any;

  try {
    input = await request.json();
  } catch {
    return json({ error: "Invalid JSON request." }, 400);
  }

  const path = new URL(request.url).pathname;

  if (path === "/api/analyze") {
    const { image, profile, clarificationAnswer, previousContext } = input;

    if (!image) return json({ error: "Image is required" }, 400);

    const match = image.match(/^data:(image\/\w+);base64,/);
    const mimeType = match ? match[1] : "image/jpeg";
    const cleanBase64 = image.replace(/^data:image\/\w+;base64,/, "");

    const prompt = `You are an expert AI nutritionist. Analyze the food image.
Your goal is to identify the food, portion size, ingredients, and provide nutritional estimates.
If there are ambiguities or important information cannot be reliably determined (e.g. unknown sauce, obscured ingredients), do not invent them. Instead, set "needsClarification": true and ask a concise question in "clarificationQuestion".
Otherwise, provide the estimates. They are just estimates, not medical-grade. Include a confidence level (e.g. "High", "Medium", "Low").

User Profile context (use for portion estimates if helpful): ${JSON.stringify(profile || {})}
${clarificationAnswer ? `User answered clarification: "${clarificationAnswer}"` : ""}
${previousContext ? `Previous context: ${previousContext}` : ""}`;

    return callAI(env, {
      contents: [{
        role: "user",
        parts: [
          { text: prompt },
          { inlineData: { mimeType, data: cleanBase64 } }
        ]
      }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: schema
      }
    }, true);
  }

  if (path === "/api/coach") {
    const { prompt, profile, history } = input;

    if (typeof prompt !== "string" || !prompt.trim()) {
      return json({ error: "A prompt is required" }, 400);
    }

    const safeProfile =
      profile && typeof profile === "object" && !Array.isArray(profile)
        ? profile : {};

    const historyLines = Array.isArray(history)
      ? history.slice(-6)
          .filter((m: any) =>
            m && typeof m.content === "string" &&
            (m.role === "user" || m.role === "assistant")
          )
          .map((m: any) =>
            `${m.role === "assistant" ? "Coach" : "User"}: ${m.content.slice(0, 600)}`
          )
      : [];

    const coachPrompt = `You are the personal nutrition coach inside NutriSnap AI. Reply in a warm, conversational tone in under about 120 words. Plain text only.

About the user (from their own onboarding answers):
${JSON.stringify(safeProfile, null, 2)}

Rules:
- Be practical and specific to the food, schedule, budget and environment they actually described.
- Never recommend restrictive eating, extreme calorie targets, crash diets or aggressive weight loss. No guilt, no shame.
- If the user seems to be under 18, keep advice focused on healthy growth, adequate nutrition, regular meals, activity and sustainable habits — never calorie restriction.
- If they already follow a diet or meal plan, help them follow it instead of replacing it.
- No medical claims or diagnoses; suggest a qualified professional when it matters.
- Respect their food likes, dislikes, dietary restrictions and allergies.

${historyLines.length ? `Conversation so far:\n${historyLines.join("\n")}\n\n` : ""}User's message: ${prompt.trim()}`;

    return callAI(env, {
      contents: [{ role: "user", parts: [{ text: coachPrompt }] }]
    }, false);
  }
  return json({ error: "Not found" }, 404);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const path = new URL(request.url).pathname;

    if (path.startsWith("/api/")) {
      return handleAPI(request, env);
    }

    return env.ASSETS.fetch(request);
  }
};