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

  let timeoutId;
  try {
    console.log("Sending request to Gemini SDK...");
    
    const timeoutPromise = new Promise((_, reject) => { 
      timeoutId = setTimeout(() => reject(new Error("Gemini API request timed out after 30 seconds")), 30000);
    });
    
    const apiPromise = ai.models.generateContent({
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
    });

    // If the timeout wins the race, apiPromise can reject later; attach a
    // handler so Node doesn't raise an unhandled rejection (which crashes the process).
    apiPromise.catch(() => {});

    const response = await Promise.race([apiPromise, timeoutPromise]);
    clearTimeout(timeoutId);
    console.log("Received response from Gemini SDK");

    const text = response.text;
    if (!text) throw new Error("Empty response from AI");
    
    const result = JSON.parse(text);
    res.json(result);
  } catch (err) {
    clearTimeout(timeoutId);
    console.error("AI Analysis failed:", err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: errorMessage });
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
