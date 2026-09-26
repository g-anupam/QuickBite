import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: number;
      role: string;
    };

    if (decoded.role !== "driver") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch Driver_ID
    const { rows }: any = await db.query(
      `SELECT "Driver_ID" FROM "Driver" WHERE "userId" = $1`,
      [decoded.userId],
    );

    if (!rows?.length)
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });

    const driverId = rows[0].Driver_ID;

    // Lifetime earnings
    const {
      rows: [{ lifetime }],
    }: any = await db.query(
      `
      SELECT SUM(fn_driver_earning(p."Amount")) AS lifetime
      FROM "Customer_Order" co
      JOIN "Payment" p ON co."Payment_ID" = p."Payment_ID"
      WHERE co."Driver_ID" = $1
      AND co."Status" = 'Delivered'
      `,
      [driverId],
    );

    // Today's earnings
    const {
      rows: [{ today }],
    }: any = await db.query(
      `
      SELECT SUM(fn_driver_earning(p."Amount")) AS today
      FROM "Customer_Order" co
      JOIN "Payment" p ON co."Payment_ID" = p."Payment_ID"
      WHERE co."Driver_ID" = $1
      AND co."Status" = 'Delivered'
      AND co."Created_At"::date = CURRENT_DATE
      `,
      [driverId],
    );

    return NextResponse.json({
      lifetime: lifetime || 0,
      today: today || 0,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to get driver earnings" },
      { status: 500 },
    );
  }
}
