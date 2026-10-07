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
      throw new Error(errorData.error || `Server error: ${response.status}`);
    }

    return await response.json();
  } catch (err) {
    console.error("AI Analysis failed:", err);
    throw new Error(err instanceof Error ? err.message : "Failed to analyze image. Please check your internet connection.");
  }
};
