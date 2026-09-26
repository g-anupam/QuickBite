import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: number;
      role: string;
    };
    if (!decoded || decoded.role !== "driver")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { orderId } = await req.json();
    if (!orderId) {
      return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
    }

    const { rows: driverRows }: any = await db.query(
      `SELECT "Driver_ID" FROM "Driver" WHERE "userId" = $1`,
      [decoded.userId],
    );

    if (!driverRows.length)
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });

    const driverId = driverRows[0].Driver_ID;

    await db.query(
      `
      UPDATE "Customer_Order"
      SET "Driver_ID" = $1, "Status" = 'Out for Delivery'
      WHERE "Order_ID" = $2 AND "Driver_ID" IS NULL
      `,
      [driverId, orderId],
    );

    return NextResponse.json({ message: "Order accepted", orderId });
  } catch (err) {
    console.error("Accept order error:", err);
    return NextResponse.json(
      { error: "Failed to accept order" },
      { status: 500 },
    );
  }
}
