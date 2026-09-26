import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: number;
      role: string;
    };

    if (decoded.role !== "restaurant") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get restaurantId from user
    const { rows }: any = await db.query(
      `SELECT "Restaurant_ID" FROM "Restaurant" WHERE "userId" = $1`,
      [decoded.userId],
    );

    if (!rows?.length) {
      return NextResponse.json(
        { error: "Restaurant not found" },
        { status: 404 },
      );
    }

    const restaurantId = rows[0].Restaurant_ID;

    // Lifetime earnings
    const {
      rows: [{ total_lifetime }],
    }: any = await db.query(
      `
      SELECT SUM(fn_restaurant_earning(p."Amount")) AS total_lifetime
      FROM "Customer_Order" co
      JOIN "Payment" p ON co."Payment_ID" = p."Payment_ID"
      WHERE co."Restaurant_ID" = $1
      `,
      [restaurantId],
    );

    // Today's earnings
    const {
      rows: [{ today_earnings }],
    }: any = await db.query(
      `
      SELECT SUM(fn_restaurant_earning(p."Amount")) AS today_earnings
      FROM "Customer_Order" co
      JOIN "Payment" p ON co."Payment_ID" = p."Payment_ID"
      WHERE co."Restaurant_ID" = $1
      AND co."Created_At"::date = CURRENT_DATE
      `,
      [restaurantId],
    );

    // Monthly earnings
    const {
      rows: [{ month_earnings }],
    }: any = await db.query(
      `
      SELECT SUM(fn_restaurant_earning(p."Amount")) AS month_earnings
      FROM "Customer_Order" co
      JOIN "Payment" p ON co."Payment_ID" = p."Payment_ID"
      WHERE co."Restaurant_ID" = $1
      AND date_trunc('month', co."Created_At") = date_trunc('month', CURRENT_TIMESTAMP)
      `,
      [restaurantId],
    );

    return NextResponse.json({
      lifetime: total_lifetime || 0,
      today: today_earnings || 0,
      month: month_earnings || 0,
    });
  } catch (err) {
    console.error("Restaurant earnings API error:", err);
    return NextResponse.json(
      { error: "Failed to fetch earnings" },
      { status: 500 },
    );
  }
}
