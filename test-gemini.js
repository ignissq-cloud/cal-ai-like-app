import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function testModel(modelName) {
  console.log(`Testing model ${modelName}...`);
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    const res = await ai.models.generateContent({
      model: modelName,
      contents: [{ role: 'user', parts: [{ text: 'Hello, return JSON {"ok":true}' }] }],
      config: {
        httpOptions: { signal: controller.signal },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: { ok: { type: Type.BOOLEAN } }
        }
      }
    });
    clearTimeout(timeoutId);
    console.log(`[${modelName}] Success: `, res.text);
    return true;
  } catch (err) {
    console.error(`[${modelName}] Error:`, err.message);
    return false;
  }
}

async function main() {
  await testModel('gemini-3.8-flash');
  await testModel('gemini-1.5-flash');
}
main();
