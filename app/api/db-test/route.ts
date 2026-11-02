import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET() {
  try {
    const result = await pool.query(
      "SELECT * FROM public.documents ORDER BY id ASC"
    );

    // Log to console if the table is empty
    if (result.rows.length === 0) {
      console.log("Database connected successfully, but the 'documents' table is empty.");
    } else {
      console.log(`Database connected successfully. Found ${result.rows.length} rows.`);
    }

    return NextResponse.json({
      success: true,
      data: result.rows,
      message: "PostgreSQL connected successfully!",
      // Added ?. to prevent a crash when rows[0] is undefined
      databaseTime: result.rows[0]?.current_time || null, 
    });
  } catch (error) {
    console.error("Database connection failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Could not connect to the database.",
      },
      { status: 500 }
    );
  }
}