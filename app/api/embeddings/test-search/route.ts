import { NextRequest, NextResponse } from "next/server";
import { searchDocumentChunks } from "@/lib/queries/search-document-chunks";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const question = body.question;

    if (typeof question !== "string" || !question.trim()) {
      return NextResponse.json(
        { message: "A valid question is required" },
        { status: 400 },
      );
    }

    const results = await searchDocumentChunks(
  question,
  5,
  0.25
);
    return NextResponse.json({
      message: "Semantic search completed successfully",
      totalResults: results.length,
      results,
    });
  } catch (error) {
    console.error("Semantic search error:", error);

    return NextResponse.json(
      {
        message: "Semantic search failed",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}