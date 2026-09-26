import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

export async function POST(req: Request) {
  try {
    const { orderId } = await req.json();
    if (!orderId) {
      return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: number;
      role: string;
    };

    if (decoded.role !== "driver") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get Driver_ID
    const { rows: driverRows }: any = await db.query(
      `SELECT "Driver_ID" FROM "Driver" WHERE "userId" = $1`,
      [decoded.userId],
    );

    if (!driverRows.length) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }

    const driverId = driverRows[0].Driver_ID;

    // Confirm order ownership
    const { rows: orderRows }: any = await db.query(
      `SELECT "Order_ID", "Driver_ID" FROM "Customer_Order" WHERE "Order_ID" = $1`,
      [orderId],
    );

    if (!orderRows.length) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (orderRows[0].Driver_ID !== driverId) {
      return NextResponse.json(
        { error: "Order not assigned to this driver" },
        { status: 403 },
      );
    }

    // FINAL FIX — clean SQL update (no stray syntax!)
    await db.query(
      `UPDATE "Customer_Order"
       SET "Status" = 'Delivered'
       WHERE "Order_ID" = $1`,
      [orderId],
    );

    return NextResponse.json({ message: "Order delivered" });
  } catch (err) {
    console.error("Deliver order error:", err);
    return NextResponse.json(
      { error: "Failed to deliver order" },
      { status: 500 },
    );
  }
}
