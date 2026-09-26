import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

// Allowed transitions for restaurant
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  Placed: ["Accepted"],
  Accepted: ["Preparing"],
  Preparing: ["Ready for Pickup"],
};

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

    const body = await req.json();
    const newStatus = body?.status as string | undefined;

    if (!newStatus) {
      return NextResponse.json(
        { error: "New status is required" },
        { status: 400 },
      );
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

    if (!decoded?.userId || decoded.role !== "restaurant") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get this restaurant id
    const { rows: restaurantRows } = await db.query(
      `SELECT "Restaurant_ID" FROM "Restaurant" WHERE "userId" = $1`,
      [decoded.userId],
    );

    if (!Array.isArray(restaurantRows) || restaurantRows.length === 0) {
      return NextResponse.json(
        { error: "Restaurant not found" },
        { status: 404 },
      );
    }

    const restaurantId = (restaurantRows[0] as { Restaurant_ID: number })
      .Restaurant_ID;

    // Fetch current order status & ensure it belongs to this restaurant
    const { rows: orderRows } = await db.query(
      `SELECT "Status", "Restaurant_ID" FROM "Customer_Order" WHERE "Order_ID" = $1`,
      [orderId],
    );

    if (!Array.isArray(orderRows) || orderRows.length === 0) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const currentOrder = orderRows[0] as {
      Status: string;
      Restaurant_ID: number;
    };

    if (currentOrder.Restaurant_ID !== restaurantId) {
      return NextResponse.json(
        { error: "Order does not belong to this restaurant" },
        { status: 403 },
      );
    }

    const currentStatus = currentOrder.Status;

    const allowedNext = ALLOWED_TRANSITIONS[currentStatus] || [];
    if (!allowedNext.includes(newStatus)) {
      return NextResponse.json(
        {
          error: `Invalid status transition from ${currentStatus} to ${newStatus}`,
        },
        { status: 400 },
      );
    }

    // Update status
    await db.query(
      `UPDATE "Customer_Order" SET "Status" = $1 WHERE "Order_ID" = $2`,
      [newStatus, orderId],
    );

    return NextResponse.json({
      message: "Status updated",
      orderId,
      from: currentStatus,
      to: newStatus,
    });
  } catch (err) {
    console.error("Error updating order status:", err);
    return NextResponse.json(
      { error: "Failed to update status" },
      { status: 500 },
    );
  }
}
