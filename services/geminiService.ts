import { GoogleGenAI } from "@google/genai";
import { DashboardData } from "../types";

export type InsightView = 'overview' | 'prediction';

export const getFinancialInsights = async (data: DashboardData, view: InsightView = 'overview'): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
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
      contents: view === 'prediction' ? predictionPrompt : overviewPrompt,
      config: {
        systemInstruction: "You are an elite financial strategist. You provide high-signal, low-noise advice based on cash flow patterns."
      }
    });

    return response.text || "Insight generation failed. Please check your data inputs.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "The AI Strategist is currently unavailable. Please try again in a moment.";
  }
};