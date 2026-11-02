import { NextRequest, NextResponse } from "next/server";
import { unlink } from "fs/promises";
import path from "path";
import {
  createDocument,
  deleteDocument,
  getDocuments,
getDocumentById,
} from "@/lib/queries/documents";
import {
  createDocumentSchema,
  deleteDocumentSchema,
} from "@/lib/validations/document";


export async function GET() {
  try {
    const documents = await getDocuments();

    return NextResponse.json(
      {
        message: "Documents fetched successfully",
        documents,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Fetch documents error:", error);

    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const validation = createDocumentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          message: "Validation failed",
          errors: validation.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { filename, fileType, fileSize } = validation.data;

    const document = await createDocument(filename, fileType, fileSize, null);

    return NextResponse.json(
      {
        message: "Document created successfully",
        document,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Create document error:", error);

    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();

    const validation = deleteDocumentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          message: "Validation failed",
          errors: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { id } = validation.data;

    // Find document from database
    const document = await getDocumentById(id);

    if (!document) {
      return NextResponse.json(
        { message: "Document not found" },
        { status: 404 }
      );
    }

    // Delete document from database
    const deleted = await deleteDocument(id);

    if (!deleted) {
      return NextResponse.json(
        { message: "Document could not be deleted" },
        { status: 500 }
      );
    }

    // Delete physical file
    if (document.stored_filename) {
      const filePath = path.join(
        process.cwd(),
        "public",
        "uploads",
        document.stored_filename
      );

      await unlink(filePath).catch((error) => {
        if (error.code !== "ENOENT") {
          throw error;
        }
      });
    }

    return NextResponse.json(
      {
        message: "Document and physical file deleted successfully",
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("Delete document error:", error);

    return NextResponse.json(
      { message: "Document deletion failed" },
      { status: 500 }
    );
  }
}
