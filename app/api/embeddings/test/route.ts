import { NextRequest, NextResponse } from "next/server";
import { generateEmbedding } from "@/lib/embeddings/generate-embedding";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const text =
      typeof body.text === "string" && body.text.trim()
        ? body.text.trim()
        : "How many annual leaves do employees get?";

    const embedding = await generateEmbedding(text);

    return NextResponse.json({
      message: "Embedding generated successfully",
      dimensions: embedding.length,
      embeddingPreview: embedding.slice(0, 5),
    });
  } catch (error) {
    console.error("Embedding generation error:", error);

    return NextResponse.json(
      {
        message: "Embedding generation failed",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}