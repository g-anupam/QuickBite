import { NextResponse } from "next/server";
import { db } from "@/lib/db"; // <- use the db export that exists

export async function GET() {
  try {
    const { rows }: any = await db.query(
      `SELECT "id", "name", "email", "role" FROM "Users" LIMIT 100`,
    );
    return NextResponse.json(rows);
  } catch (err) {
    console.error("Error fetching users:", err);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 },
    );
  }
}
