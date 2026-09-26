import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  context: { params: Promise<{ orderId: string }> },
) {
  try {
    const { orderId } = await context.params;

    const { rows }: any = await db.query(
      `SELECT "Rating" FROM "Rating" WHERE "Order_ID" = $1`,
      [orderId],
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json({ rating: null });
    }

    return NextResponse.json({ rating: rows[0].Rating });
  } catch (err) {
    console.error("Rating GET error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
