import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: number;
      role?: string;
      email?: string;
    };

    if (!decoded?.userId || decoded.role !== "restaurant") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Find this restaurant by userId
    const { rows: restaurantRows } = await db.query(
      `SELECT "Restaurant_ID" FROM "Restaurant" WHERE "userId" = $1`,
      [decoded.userId],
    );

    if (!Array.isArray(restaurantRows) || restaurantRows.length === 0) {
      return NextResponse.json(
        { error: "Restaurant not found for this user" },
        { status: 404 },
      );
    }

    const restaurantId = (restaurantRows[0] as { Restaurant_ID: number })
      .Restaurant_ID;

    // Fetch all orders for this restaurant
    const { rows: orderRows } = await db.query(
      `SELECT
         co."Order_ID",
         co."Status",
         co."Customer_ID",
         co."Address_ID",
         co."Payment_ID",
         p."Amount",
         p."Status" AS "Payment_Status",
         p."Payment_Method",
         da."Address_First_Line" AS "Address_First_line",
         da."Address_Second_Line" AS "Address_Second_line",
         da."City",
         da."Pincode",
         u."name" AS "Customer_Name"
       FROM "Customer_Order" co
       JOIN "Customer" c ON co."Customer_ID" = c."Customer_ID"
       JOIN "Users" u ON c."userId" = u."id"
       LEFT JOIN "Payment" p ON co."Payment_ID" = p."Payment_ID"
       LEFT JOIN "Delivery_Address" da ON co."Address_ID" = da."Address_ID"
       WHERE co."Restaurant_ID" = $1
       ORDER BY co."Order_ID" DESC`,
      [restaurantId],
    );

    const orders = Array.isArray(orderRows) ? orderRows : [];

    return NextResponse.json({ orders });
  } catch (err) {
    console.error("Error fetching restaurant orders:", err);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 },
    );
  }
}
