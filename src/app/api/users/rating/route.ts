import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { db } from "@/lib/db";

const JWT_SECRET = process.env.JWT_SECRET!;

export async function POST(req: Request) {
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

    if (!decoded || decoded.role !== "customer") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { orderId, rating } = body;

    if (!orderId || !rating) {
      return NextResponse.json(
        { error: "Missing rating or orderId" },
        { status: 400 },
      );
    }

    // 1. Get Customer_ID from Users.userId
    const { rows: custRows }: any = await db.query(
      `SELECT "Customer_ID" FROM "Customer" WHERE "userId" = $1`,
      [decoded.userId],
    );

    if (!custRows || custRows.length === 0) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 },
      );
    }

    const customerId = custRows[0].Customer_ID;

    // 2. Verify the order belongs to this customer
    const { rows: orderRows }: any = await db.query(
      `SELECT "Restaurant_ID" FROM "Customer_Order"
       WHERE "Order_ID" = $1 AND "Customer_ID" = $2`,
      [orderId, customerId],
    );

    if (!orderRows || orderRows.length === 0) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const restaurantId = orderRows[0].Restaurant_ID;

    // 3. Insert the rating (NOW INCLUDING Customer_ID)
    await db.query(
      `INSERT INTO "Rating" ("Rating", "Restaurant_ID", "Order_ID", "Customer_ID")
       VALUES ($1, $2, $3, $4)`,
      [rating, restaurantId, orderId, customerId],
    );

    return NextResponse.json({ message: "Rating submitted" });
  } catch (err) {
    console.error("Rating POST error:", err);
    return NextResponse.json(
      { error: "Failed to submit rating" },
      { status: 500 },
    );
  }
}
