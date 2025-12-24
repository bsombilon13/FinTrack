
import { GoogleGenAI } from "@google/genai";
import { DashboardData } from "../types";

export type InsightView = 'overview' | 'prediction';

export const getFinancialInsights = async (data: DashboardData, view: InsightView = 'overview'): Promise<string> => {
  // Always create a fresh instance to ensure we use the latest API key from the environment/dialog
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY_MISSING");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const overviewPrompt = `
    Analyze this financial state: ${JSON.stringify(data)}
    Provide a concise 3-sentence executive summary:
    1. Overall health (Liquid cash vs Total Debt).
    2. Most urgent expense or saving opportunity.
    3. One quick win for this week.
    Keep it snappy and encouraging.
  `;

  const predictionPrompt = `
    You are a Financial Forecasting Expert. Analyze this data: ${JSON.stringify(data)}
    Provide a detailed 90-day trajectory analysis.
    Assume monthly recurring costs repeat. 
    
    Required structure in Markdown:
    ### 90-Day Trajectory
    How much cash is projected to remain?
    
    ### Risk Assessment
    What is the biggest threat to this forecast?
    
    ### Strategic Moves
    Two specific actions to improve the quarter-end balance.
    
    Be direct, analytical, and professional.
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
        systemInstruction: "You are an elite financial strategist. You provide high-signal, low-noise advice based on cash flow patterns."
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
