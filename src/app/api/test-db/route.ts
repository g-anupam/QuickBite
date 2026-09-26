import { NextResponse } from "next/server";
import { db } from "@/lib/db"; // <- use the db export that exists

export async function GET() {
  try {
    // simple test query — adjust as needed for your DB library
    const { rows }: any = await db.query("SELECT 1 AS ok");
    return NextResponse.json({ ok: true, rows });
  } catch (err) {
    console.error("Test DB error:", err);
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 },
    );
  }
}
