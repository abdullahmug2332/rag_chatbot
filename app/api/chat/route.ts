import OpenAI from "openai";
import { NextResponse } from "next/server";
import { searchDocumentChunks } from "@/lib/queries/search-document-chunks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ollama = new OpenAI({
  baseURL: process.env.OLLAMA_BASE_URL,
  apiKey: process.env.OLLAMA_API_KEY || "ollama",
});

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

function isGeneralConversation(message: string): boolean {
  const normalized = message.toLowerCase().trim();

  const patterns = [
    /^hi$/,
    /^hello$/,
    /^hey$/,
    /^how are you\??$/,
    /^who are you\??$/,
    /^what are you\??$/,
    /^what can you do\??$/,
    /^who created you\??$/,
    /^what is your name\??$/,
    /^good morning$/,
    /^good afternoon$/,
    /^good evening$/,
    /^thanks$/,
    /^thank you$/,
    /^bye$/,
    /^goodbye$/,
  ];

  return patterns.some((pattern) => pattern.test(normalized));
}

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

    const latestUserMessage = [...messages]
      .reverse()
      .find((msg) => msg.role === "user");

    if (!latestUserMessage) {
      return NextResponse.json(
        { error: "A user message is required." },
        { status: 400 },
      );
    }

    // Retrieve relevant document chunks.
    const isGeneral = isGeneralConversation(latestUserMessage.content);

    const searchResults = isGeneral
      ? []
      : await searchDocumentChunks(latestUserMessage.content);

    // Prepare document context.
    const documentContext = searchResults
      .map(
        (result, index) => `
[Source ${index + 1}]
Filename: ${result.filename}
Page: ${result.page_number ?? "N/A"}
Content:
${result.content}
`,
      )
      .join("\n");

    // Only pass role + content to the model.
    const recentMessages = messages
      .slice(-19)
      .map(({ role, content }) => ({ role, content }));

    const systemPrompt = `You are a friendly, intelligent AI assistant having a natural conversation with the user.

You have access to uploaded documents through retrieved document context.

IMPORTANT RULES:

GENERAL CONVERSATION:
- Respond naturally like a human conversational assistant.
- Answer greetings, introductions, general knowledge questions, and casual questions normally.
- Do not force every question to be related to uploaded documents.
- Never respond with the same generic refusal repeatedly.
- Understand short follow-up messages using conversation history.
- If you do not understand something, ask a natural clarification question.

DOCUMENT QUESTIONS:
- When the question relates to uploaded documents, use the provided document context.
- Only state facts supported by the document context.
- Never invent company policies, dates, amounts, names, or other document details.
- If relevant information is missing, explain naturally that the uploaded documents do not contain that information.
- Never mention source numbers, source labels, or citation references.
- Do not write [Source 1], [Source 2], or similar labels.

RESPONSE STYLE:
- Keep answers concise and clear.
- Avoid repetitive phrases.
- Do not start every answer with "According to the document".
- Maintain a friendly and natural conversational tone.

DOCUMENT CONTEXT:
${documentContext || "No document context is available."}
`;

    // Cancel the Ollama request if the browser disconnects / user hits Stop.
    const abortController = new AbortController();

    req.signal.addEventListener("abort", () => abortController.abort(), {
      once: true,
    });

    const response = await ollama.chat.completions.create(
      {
        model: process.env.OLLAMA_MODEL || "llama3.2:3b",
        stream: true,
        messages: [{ role: "system", content: systemPrompt }, ...recentMessages],
      },
      { signal: abortController.signal },
    );

    const encoder = new TextEncoder();

    const sources = searchResults.map((result, index) => ({
      source: `Source ${index + 1}`,
      documentId: result.document_id,
      filename: result.filename,
      pageNumber: result.page_number,
      chunkIndex: result.chunk_index,
      similarity: result.similarity,
    }));

    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: unknown) => {
          try {
            controller.enqueue(encoder.encode(JSON.stringify(data) + "\n"));
          } catch {
            // Stream already closed (client disconnected).
          }
        };

        const close = () => {
          try {
            controller.close();
          } catch {
            // Already closed.
          }
        };

        try {
          for await (const chunk of response) {
            if (abortController.signal.aborted) break;

            const content = chunk.choices[0]?.delta?.content;

            if (content) {
              send({ type: "chunk", content });
            }
          }

          if (!abortController.signal.aborted) {
            send({ type: "sources", sources });
            send({ type: "done" });
          }
        } catch (error) {
          if (!abortController.signal.aborted) {
            console.error("LLM streaming error:", error);
            send({ type: "error", error: "Failed to generate response." });
          }
        } finally {
          close();
        }
      },

      cancel() {
        abortController.abort();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        // Stops proxies (e.g. Nginx) from buffering the stream.
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    console.error("RAG chat request failed:", error);

    return NextResponse.json(
      { error: "Failed to generate response." },
      { status: 500 },
    );
  }
}