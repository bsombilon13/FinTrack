
import { GoogleGenAI, Type } from "@google/genai";
import { DashboardData } from "../types";

export const getFinancialInsights = async (data: DashboardData): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    Analyze the following financial dashboard data and provide a 3-month predictive forecast.
    Assume recurring monthly expenses stay constant.
    
    Structure the response with:
    1. **Trajectory Summary**: What is the most likely financial state in 90 days?
    2. **Critical Risk Factor**: Identify one specific vulnerability (e.g. "Debt to Income ratio is high" or "Low liquid emergency buffer").
    3. **Actionable Growth Path**: Two steps to optimize the surplus by the end of the quarter.
    
    Data: ${JSON.stringify(data, null, 2)}
    
    Format the response as clear Markdown with headers. Keep the tone sharp, professional, and predictive.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: "You are a professional financial forecaster and wealth growth strategist. You specialize in predicting trajectories based on current cash flow patterns."
      }
    });

    return response.text || "Unable to generate prediction at this time.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "The AI Forecaster is currently offline. Please check your data or try again later.";
  }
};
