
import { GoogleGenAI, Type } from "@google/genai";
import { DashboardData } from "../types";

export const getFinancialInsights = async (data: DashboardData): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  const prompt = `
    Analyze the following financial dashboard data and provide 3-4 concise, professional bullet points of actionable advice or observations. 
    Focus on:
    1. Cash flow (Remaining Balance).
    2. Savings vs. Debt ratio.
    3. Potential areas to cut back (Subscriptions, Other Expenses).
    4. Managing unpaid items.

    Data: ${JSON.stringify(data, null, 2)}
    
    Format the response as clear Markdown.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: "You are a professional financial advisor with a sharp, encouraging, and analytical tone."
      }
    });

    return response.text || "Unable to generate insights at this time.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Error connecting to AI advisor. Please try again later.";
  }
};
