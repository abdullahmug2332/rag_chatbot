
import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";


const apiKey = process.env.GEMINI_API_KEY;

const ai = apiKey
  ? new GoogleGenAI({ apiKey })
  : null;

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export async function POST(request: Request) {
  try {
    if (!ai) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured." },
        { status: 500 }
      );
    }

    const body = await request.json();
    const messages = body.messages;

    if (
      !Array.isArray(messages) ||
      messages.length === 0 ||
      messages.length > 20
    ) {
      return NextResponse.json(
        { error: "Send between 1 and 20 messages." },
        { status: 400 }
      );
    }

    const validMessages = messages.every(
      (message: unknown) => {
        if (
          typeof message !== "object" ||
          message === null
        ) {
          return false;
        }

        const item = message as Record<string, unknown>;

        return (
          (item.role === "user" ||
            item.role === "assistant") &&
          typeof item.content === "string" &&
          item.content.trim().length > 0 &&
          item.content.length <= 5000
        );
      }
    );

    if (!validMessages) {
      return NextResponse.json(
        { error: "Invalid message format." },
        { status: 400 }
      );
    }

    const history = messages as ChatMessage[];

    const contents = history.map((message) => ({
      role: message.role === "assistant"
        ? "model" as const
        : "user" as const,
      parts: [{ text: message.content }],
    }));

      const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || "gemini-flash-latest",
      contents,
      config: {
        systemInstruction:
          "You are a helpful AI assistant for a developer learning RAG. " +
          "Explain concepts clearly, provide practical examples, and " +
          "admit when you do not know something.",
        maxOutputTokens: 1200,
      },
    });

    const answer = response.text?.trim();

    if (!answer) {
      return NextResponse.json(
        { error: "The model returned an empty response." },
        { status: 502 }
      );
    }

    return NextResponse.json({ answer });
  } catch (error) {
    console.error("Chat API error:", error);

    return NextResponse.json(
      {
        error:
          "Unable to generate a response. Check your API limits and try again.",
      },
      { status: 502 }
    );
  }
}
