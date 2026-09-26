import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };

    const body = await req.json();
    const { orderId, restaurantId, rating } = body;

    if (!orderId || !restaurantId || !rating)
      return NextResponse.json({ error: "Missing data" }, { status: 400 });

    if (rating < 1 || rating > 5)
      return NextResponse.json({ error: "Invalid rating" }, { status: 400 });

    // Get Customer_ID from userId
    const { rows: custRows }: any = await db.query(
      `SELECT "Customer_ID" FROM "Customer" WHERE "userId" = $1`,
      [decoded.userId],
    );

    if (!custRows || custRows.length === 0)
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 },
      );

    const customerId = custRows[0].Customer_ID;

    // Prevent submitting again for the same order
    const { rows: exists }: any = await db.query(
      `SELECT * FROM "Rating" WHERE "Order_ID" = $1 AND "Customer_ID" = $2`,
      [orderId, customerId],
    );

    if (exists.length > 0) {
      return NextResponse.json(
        { error: "Rating already submitted" },
        { status: 400 },
      );
    }

    await db.query(
      `INSERT INTO "Rating" ("Rating", "Restaurant_ID", "Order_ID", "Customer_ID") VALUES ($1, $2, $3, $4)`,
      [rating, restaurantId, orderId, customerId],
    );

    return NextResponse.json({ message: "Rating submitted" });
  } catch (err) {
    console.error("Rating error:", err);
    return NextResponse.json(
      { error: "Failed to submit rating" },
      { status: 500 },
    );
  }
}
