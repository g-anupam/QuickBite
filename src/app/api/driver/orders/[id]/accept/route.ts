import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { db } from "@/lib/db";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const orderId = Number(id);

    if (!orderId) {
      return NextResponse.json({ error: "Invalid order id" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: number;
      role?: string;
    };

    if (!decoded || decoded.role !== "driver") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch driver details
    const { rows: driverRows } = await db.query(
      `SELECT "Driver_ID" FROM "Driver" WHERE "userId" = $1`,
      [decoded.userId],
    );

    if (!Array.isArray(driverRows) || driverRows.length === 0) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }

    const driverId = driverRows[0].Driver_ID;

    // Verify order exists & is available
    const { rows: orderRows } = await db.query(
      `SELECT "Status", "Driver_ID" FROM "Customer_Order" WHERE "Order_ID" = $1`,
      [orderId],
    );

    if (!Array.isArray(orderRows) || orderRows.length === 0) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const order = orderRows[0];

    if (order.Status !== "Ready for Pickup" || order.Driver_ID !== null) {
      return NextResponse.json(
        { error: "Order is no longer available" },
        { status: 400 },
      );
    }

    // Assign driver + update status
    await db.query(
      `UPDATE "Customer_Order"
       SET "Driver_ID" = $1, "Status" = 'Out for Delivery'
       WHERE "Order_ID" = $2`,
      [driverId, orderId],
    );

    return NextResponse.json({ message: "Order accepted", orderId });
  } catch (err) {
    console.error("Driver accept error:", err);
    return NextResponse.json(
      { error: "Failed to accept order" },
      { status: 500 },
    );
  }
}
