import type { AIAnalysisResult, Profile } from '../types';

export const analyzeFoodImage = async (
  base64Image: string,
  profile?: Profile,
  clarificationAnswer?: string,
  previousContext?: string
): Promise<AIAnalysisResult> => {
  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: base64Image,
        profile,
        clarificationAnswer,
        previousContext
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const serverMessage =
        errorData && typeof errorData.error === 'string' ? errorData.error.trim() : '';
      if (!serverMessage) {
        // Non-JSON or malformed error body — log it for debugging,
        // but never surface raw payloads to the user.
        console.warn('AI analysis failed:', response.status, errorData);
      }
      throw new Error(serverMessage || 'The AI service hit a problem. Please try again.');
    }

    return await response.json();
  } catch (err) {
    console.error("AI Analysis failed:", err);
    throw new Error(err instanceof Error ? err.message : "Failed to analyze image. Please check your internet connection.");
  }
};
