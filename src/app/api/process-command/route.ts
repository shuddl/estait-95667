import { NextRequest, NextResponse } from "next/server";
import { VertexAI } from "@google-cloud/vertexai";

// Initialize Vertex AI
const vertex = new VertexAI({
  project: process.env.GOOGLE_CLOUD_PROJECT || "estait-95667",
  location: process.env.VERTEX_LOCATION || "us-central1",
});

const model = vertex.getGenerativeModel({
  model: process.env.GENKIT_MODEL || "gemini-1.5-pro",
});

export async function POST(req: NextRequest) {
  try {
    const { command } = await req.json();
    
    if (!command) {
      return NextResponse.json({ error: "No command provided" }, { status: 400 });
    }

    // Process with Vertex AI
    const prompt = `You are Estait, an AI assistant for real estate agents.
    
    User command: "${command}"
    
    Analyze this command and provide a helpful response. If they're searching for properties, describe what you would search for.
    If they're managing contacts or tasks, acknowledge the action you would take.
    Be concise and professional.`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || "I couldn't generate a response.";

    // Detect if this is a property search
    const isPropertySearch = command.toLowerCase().includes("bed") || 
                           command.toLowerCase().includes("bath") || 
                           command.toLowerCase().includes("property") ||
                           command.toLowerCase().includes("home") ||
                           command.toLowerCase().includes("under") ||
                           command.toLowerCase().includes("austin");

    return NextResponse.json({
      success: true,
      response: text,
      isPropertySearch,
      originalCommand: command
    });
  } catch (error) {
    console.error("Error processing command:", error);
    return NextResponse.json(
      { 
        error: "Failed to process command",
        response: "I apologize, but I'm having trouble processing your request right now. Please try again."
      },
      { status: 500 }
    );
  }
}