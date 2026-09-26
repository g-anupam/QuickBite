import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

export async function GET(
  _req: Request,
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

    if (!decoded?.userId || decoded.role !== "restaurant") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Find restaurant id for this user
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

    // Fetch the order and verify it belongs to this restaurant
    const { rows: orderRows } = await db.query(
      `SELECT
         co.*,
         p."Amount",
         p."Payment_Method",
         p."Status" AS "Payment_Status",
         da."Address_First_Line" AS "Address_First_line",
         da."Address_Second_Line" AS "Address_Second_line",
         da."City",
         da."Pincode",
         u."name" AS "Customer_Name",
         u."email" AS "Customer_Email"
       FROM "Customer_Order" co
       JOIN "Customer" c ON co."Customer_ID" = c."Customer_ID"
       JOIN "Users" u ON c."userId" = u."id"
       LEFT JOIN "Payment" p ON co."Payment_ID" = p."Payment_ID"
       LEFT JOIN "Delivery_Address" da ON co."Address_ID" = da."Address_ID"
       WHERE co."Order_ID" = $1 AND co."Restaurant_ID" = $2`,
      [orderId, restaurantId],
    );

    if (!Array.isArray(orderRows) || orderRows.length === 0) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const order = orderRows[0];

    // Fetch items
    const { rows: itemRows } = await db.query(
      `SELECT
         m."Menu_ID",
         m."Item_Name",
         m."Price",
         oc."Quantity"
       FROM "Order_Contains" oc
       JOIN "Menu" m ON oc."Menu_ID" = m."Menu_ID"
       WHERE oc."Order_ID" = $1`,
      [orderId],
    );

    const items = Array.isArray(itemRows) ? itemRows : [];

    return NextResponse.json({
      order,
      items,
    });
  } catch (err) {
    console.error("Error fetching restaurant order detail:", err);
    return NextResponse.json(
      { error: "Failed to fetch order" },
      { status: 500 },
    );
  }
}
