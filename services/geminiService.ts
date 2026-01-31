
import { GoogleGenAI } from "@google/genai";
import { DashboardData } from "../types";

export type InsightView = 'overview' | 'prediction';

export const getFinancialInsights = async (data: DashboardData, view: InsightView = 'overview'): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY_MISSING");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const overviewPrompt = `
    Analyze this financial state: ${JSON.stringify(data)}
    Provide a concise executive summary formatted for high readability:
    - Use bullet points.
    - Bold the most important figures or actions.
    - Mention: 1) Overall health 2) Urgent priorities 3) A quick win for today.
    Keep it professional, direct, and under 100 words.
  `;

  const predictionPrompt = `
    You are an Elite Financial Analyst. Analyze this data: ${JSON.stringify(data)}
    Provide a detailed 90-day trajectory. Format strictly in Markdown with these headers:
    
    ### Projected Runway
    Bullet points on cash remaining and balance health. Use bold for numbers.
    
    ### Risk Vectors
    What is the primary threat? (e.g., debt interest, spending spikes).
    
    ### Strategic Imperatives
    Three specific, actionable actions to double resilience by quarter-end.
    
    Ensure maximum readability with short sentences and clear structures.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ 
        parts: [{ 
          text: view === 'prediction' ? predictionPrompt : overviewPrompt 
        }] 
      }],
      config: {
        systemInstruction: "You are an elite financial strategist. Your goal is to provide high-signal, low-noise advice. Format your output with clear headers, bullet points, and bold text for scanning."
      }
    });

    if (!response.text) {
      return "The strategist analyzed your data but didn't provide a written response. Try adjusting your entries.";
    }

    return response.text;
  } catch (error: any) {
    console.error("Gemini Service Error:", error);
    
    const errorMessage = error?.message || "";
    if (errorMessage.includes("Requested entity was not found")) {
      throw new Error("MODEL_NOT_FOUND");
    }
    
    return `AI Analysis paused: ${errorMessage || "Unknown connection error"}`;
  }
};
