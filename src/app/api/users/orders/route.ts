import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };

    if (!decoded?.userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Get Customer_ID for this logged in user
    const { rows: custRows }: any = await db.query(
      `SELECT "Customer_ID" FROM "Customer" WHERE "userId" = $1`,
      [decoded.userId],
    );

    if (!Array.isArray(custRows) || custRows.length === 0)
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 },
      );

    const customerId = custRows[0].Customer_ID;

    // Fetch all orders + join restaurant + sum amounts
    const { rows }: any = await db.query(
      `SELECT
         co."Order_ID",
         co."Status",
         r."Restaurant_Name",
         p."Amount"
       FROM "Customer_Order" co
       JOIN "Restaurant" r ON co."Restaurant_ID" = r."Restaurant_ID"
       JOIN "Payment" p ON co."Payment_ID" = p."Payment_ID"
       WHERE co."Customer_ID" = $1
       ORDER BY co."Order_ID" DESC`,
      [customerId],
    );

    return NextResponse.json({ orders: rows });
  } catch (err) {
    console.error("Fetch user orders error:", err);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 },
    );
  }
}
