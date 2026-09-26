// src/app/api/restaurants/[id]/coupons/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const restaurantId = Number(id);

    if (!restaurantId) {
      return NextResponse.json(
        { error: "Invalid restaurant id" },
        { status: 400 },
      );
    }

    const { rows } = await db.query(
      `SELECT "Coupon_ID", "Discount", "Expiry"
       FROM "Coupon"
       WHERE "Restaurant_ID" = $1
         AND ("Expiry" IS NULL OR "Expiry" >= CURRENT_DATE)
       ORDER BY "Discount" DESC`,
      [restaurantId],
    );

    return NextResponse.json(rows);
  } catch (err) {
    console.error("GET /api/restaurants/[id]/coupons error:", err);
    return NextResponse.json(
      { error: "Failed to fetch coupons" },
      { status: 500 },
    );
  }
}
