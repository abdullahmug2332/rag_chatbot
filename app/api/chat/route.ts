import OpenAI from "openai";
import { NextResponse } from "next/server";

const ollama = new OpenAI({
  baseURL: process.env.OLLAMA_BASE_URL,
  apiKey: process.env.OLLAMA_API_KEY || "ollama",
});

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const messages = body.messages as ChatMessage[];

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "At least one message is required." },
        { status: 400 },
      );
    }

    const validMessages = messages.every(
      (msg) =>
        msg &&
        ["user", "assistant"].includes(msg.role) &&
        typeof msg.content === "string" &&
        msg.content.trim().length > 0,
    );

    if (!validMessages) {
      return NextResponse.json(
        { error: "Invalid messages format." },
        { status: 400 },
      );
    }

    // Keep the system prompt plus at most 19 conversation messages.
    const recentMessages = messages.slice(-19);

    const response = await ollama.chat.completions.create({
      model: process.env.OLLAMA_MODEL || "llama3.2:3b",
      messages: [
        {
          role: "system",
          content: `You are a helpful, intelligent, and reliable AI assistant.
            Instructions:
            - Answer the user's questions clearly, accurately, and naturally.
            - Use the conversation history to understand context and maintain continuity.
            - Remember relevant details the user shares within the provided conversation.
            - Follow the user's instructions and adapt your responses to their needs.
            - Explain complex topics in simple terms when appropriate.
            - Use Markdown formatting for headings, lists, code, and emphasis when helpful.
            - If a question is ambiguous, ask for clarification when necessary.
            - If you do not know something, be honest rather than inventing information.
            - Correct misunderstandings politely and provide accurate information.
            - Keep responses concise by default, but provide more detail when needed.
            - Never claim to have performed actions you have not performed.
            - Respect the user's privacy and do not infer personal details without evidence.

            Use the available conversation history as context, but do not assume you remember information that was not provided.`,
        },
        ...recentMessages,
      ],
    });

    return NextResponse.json({
      reply: response.choices[0]?.message.content ?? "",
    });
  } catch (error) {
    console.error("Ollama request failed:", error);

    return NextResponse.json(
      { error: "Failed to generate response." },
      { status: 500 },
    );
  }
}
