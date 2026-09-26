import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { db } from "@/lib/db";

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

    if (!decoded || decoded.role !== "driver") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // STEP 1: Get Driver_ID using JWT userId
    const { rows: driverRows }: any = await db.query(
      `SELECT "Driver_ID" FROM "Driver" WHERE "userId" = $1`,
      [decoded.userId],
    );

    if (!driverRows || driverRows.length === 0) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }

    const driverId = driverRows[0].Driver_ID;

    // STEP 2: Count delivered orders for this Driver_ID today
    const { rows }: any = await db.query(
      `
      SELECT COUNT(*)::int AS "deliveriesToday"
      FROM "Customer_Order"
      WHERE "Driver_ID" = $1
        AND "Status" = 'Delivered'
        AND "Created_At"::date = CURRENT_DATE
      `,
      [driverId],
    );

    const deliveriesToday = rows?.[0]?.deliveriesToday ?? 0;
    //console.log(deliveriesToday);

    return NextResponse.json({ deliveriesToday });
  } catch (err) {
    console.error("Error in /api/driver/deliveries-today:", err);
    return NextResponse.json(
      { error: "Failed to fetch deliveries for driver" },
      { status: 500 },
    );
  }
}
