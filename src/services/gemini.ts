import { GoogleGenAI, Type } from "@google/genai";

// Initialize Gemini
// In this environment, GEMINI_API_KEY is available via process.env.GEMINI_API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export interface AdaptedHabit {
  name: string;
  description: string;
  reason: string;
}

/**
 * Service for intelligent habit adaptation using Gemini.
 */
export const geminiService = {
  /**
   * Suggests a "micro-habit" version or adjustment if a user is feeling overwhelmed or missed a day.
   */
  async adaptHabit(habitName: string, habitDescription: string, data: { missReason?: string, mood?: string, completionRate?: number }): Promise<AdaptedHabit> {
    const prompt = `
      The user is trying to form the habit: "${habitName}" (${habitDescription}).
      
      Context:
      - Miss reason: ${data.missReason || 'Not specified'}
      - Current mood: ${data.mood || 'Not specified'}
      - Recent completion rate: ${data.completionRate ? (data.completionRate * 100).toFixed(0) + '%' : 'Unknown'}
      
      Act as a supportive, gentle psychological coach.
      
      If their completion rate is low, suggest a "Micro-version" that takes less than 2 minutes.
      If their mood is low, suggest something more restorative.
      If they are doing well but feeling overwhelmed, suggest a slight simplification to prevent burnout.
      
      The goal is to maintain the streak without the pressure of the full task.
      
      Respond in JSON format:
      {
        "name": "The adjusted habit name",
        "description": "Short description of what to do",
        "reason": "A supportive message in Russian explaining why this helps based on their mood/performance"
      }
    `;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              description: { type: Type.STRING },
              reason: { type: Type.STRING },
            },
            required: ["name", "description", "reason"]
          }
        }
      });

      const data = JSON.parse(response.text || '{}');
      return {
        name: data.name || habitName,
        description: data.description || habitDescription,
        reason: data.reason || "保持节奏，即使是很小的一步也很重要。"
      };
    } catch (error) {
      console.error("Gemini adaptation error:", error);
      return {
        name: habitName,
        description: habitDescription,
        reason: "Даже небольшое усилие сегодня поможет завтра."
      };
    }
  },

  /**
   * Helps breakdown a big goal into a sustainable initial habit.
   */
  async breakdownGoal(goal: string): Promise<AdaptedHabit[]> {
    const prompt = `
      User goal: "${goal}".
      Break this into 3 levels of habits:
      1. Level 1: Micro-habit (takes 2 minutes)
      2. Level 2: Regular habit (takes 15-30 minutes)
      3. Level 3: Advanced habit (full practice)
      
      Respond in JSON format as an array of objects with 'name', 'description', and 'reason'.
    `;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                description: { type: Type.STRING },
                reason: { type: Type.STRING },
              },
              required: ["name", "description", "reason"]
            }
          }
        }
      });

      return JSON.parse(response.text || '[]');
    } catch (error) {
      console.error("Gemini breakdown error:", error);
      return [];
    }
  }
};
