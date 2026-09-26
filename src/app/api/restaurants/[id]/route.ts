import { NextResponse } from "next/server";
import { db } from "@/lib/db";

//  Correct for Next.js 15 — uses await for params
export async function GET(
  _: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;

    const { rows } = await db.query(
      `SELECT * FROM "Restaurant" WHERE "Restaurant_ID" = $1`,
      [id],
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { error: "Restaurant not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(rows[0]);
  } catch (err) {
    console.error("Error fetching restaurant by ID:", err);
    return NextResponse.json(
      { error: "Failed to fetch restaurant" },
      { status: 500 },
    );
  }
}
