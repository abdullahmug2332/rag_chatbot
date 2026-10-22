import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET() {
  try {
    const result = await pool.query(
      "SELECT * FROM public.documents ORDER BY id ASC "
    );

    return NextResponse.json({
      success: true,
      data:result.rows,
      message: "PostgreSQL connected successfully!",
      databaseTime: result.rows[0].current_time,
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