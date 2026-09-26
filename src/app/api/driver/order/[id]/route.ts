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

    if (!orderId)
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

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

    // Order core
    const { rows: orderRows }: any = await db.query(
      `SELECT * FROM "Customer_Order" WHERE "Order_ID" = $1`,
      [orderId],
    );

    if (!orderRows.length)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    const order = orderRows[0];

    // Restaurant
    const { rows: restaurantRows }: any = await db.query(
      `SELECT * FROM "Restaurant" WHERE "Restaurant_ID" = $1`,
      [order.Restaurant_ID],
    );

    // Address
    const { rows: addressRows }: any = await db.query(
      `SELECT * FROM "Delivery_Address" WHERE "Address_ID" = $1`,
      [order.Address_ID],
    );

    // Payment
    const { rows: paymentRows }: any = await db.query(
      `SELECT * FROM "Payment" WHERE "Payment_ID" = $1`,
      [order.Payment_ID],
    );

    // Items
    const { rows: items }: any = await db.query(
      `
      SELECT m."Menu_ID", m."Item_Name", m."Price", oc."Quantity"
      FROM "Order_Contains" oc
      JOIN "Menu" m ON oc."Menu_ID" = m."Menu_ID"
      WHERE oc."Order_ID" = $1
      `,
      [orderId],
    );

    return NextResponse.json({
      order,
      restaurant: restaurantRows[0],
      address: addressRows[0],
      payment: paymentRows[0],
      items,
    });
  } catch (err) {
    console.error("Driver order details fetch error:", err);
    return NextResponse.json(
      { error: "Failed to fetch order details" },
      { status: 500 },
    );
  }
}
