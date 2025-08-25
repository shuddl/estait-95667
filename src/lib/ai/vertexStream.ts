import { VertexAI } from "@google-cloud/vertexai";

// Initialize Vertex AI
const vertex = new VertexAI({
  project: process.env.GOOGLE_CLOUD_PROJECT || "estait-95667",
  location: process.env.VERTEX_LOCATION || "us-central1",
});

const model = vertex.getGenerativeModel({
  model: process.env.GENKIT_MODEL || "gemini-1.5-pro",
});

export async function* streamVertexResponse(
  messages: { role: string; content: string }[]
) {
  try {
    // Build conversation history
    const contents = messages.map(msg => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }]
    }));

    // Start streaming
    const streamingResult = await model.generateContentStream({
      contents,
      generationConfig: {
        temperature: 0.7,
        topP: 0.9,
        maxOutputTokens: 2048,
      },
    });

    // Stream chunks
    for await (const chunk of streamingResult.stream) {
      const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        yield text;
      }
    }
  } catch (error) {
    console.error("Vertex streaming error:", error);
    yield "I apologize, but I'm having trouble processing your request right now.";
  }
}