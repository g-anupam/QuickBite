// src/app/api/users/order/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

type ItemPayload = { id: number; quantity: number };

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: number;
      role?: string;
    };

    if (!decoded?.userId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const body = await req.json();
    const items = body.items as ItemPayload[];
    const addressId = Number(body.addressId);
    const paymentMethod = body.paymentMethod as string;
    const couponId = body.couponId ? Number(body.couponId) : null;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "No items provided" }, { status: 400 });
    }
    if (!addressId || !paymentMethod) {
      return NextResponse.json(
        { error: "Missing address or payment method" },
        { status: 400 },
      );
    }

    // 1) Get Customer_ID for this user
    const { rows: customerRows } = await db.query(
      `SELECT "Customer_ID" FROM "Customer" WHERE "userId" = $1`,
      [decoded.userId],
    );
    const typedCustomerRows = customerRows as { Customer_ID: number }[];
    if (!typedCustomerRows || typedCustomerRows.length === 0) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 },
      );
    }
    const customerId = typedCustomerRows[0].Customer_ID;

    // 2) Validate items: fetch menu entries and ensure all from same restaurant
    const menuIds = items.map((it) => it.id);
    const { rows: menuRows } = await db.query(
      `SELECT "Menu_ID", "Price", "Restaurant_ID"
       FROM "Menu"
       WHERE "Menu_ID" = ANY($1::int[])`,
      [menuIds],
    );
    const typedMenuRows = menuRows as {
      Menu_ID: number;
      Price: string | number;
      Restaurant_ID: number;
    }[];

    if (!typedMenuRows || typedMenuRows.length !== menuIds.length) {
      return NextResponse.json(
        { error: "Some menu items are invalid" },
        { status: 400 },
      );
    }

    const restaurantIds = Array.from(
      new Set(typedMenuRows.map((r) => r.Restaurant_ID)),
    );
    if (restaurantIds.length !== 1) {
      return NextResponse.json(
        { error: "All items must belong to a single restaurant" },
        { status: 400 },
      );
    }
    const restaurantId = restaurantIds[0];

    // 3) Calculate subtotal server-side
    let subtotal = 0;
    const menuById = new Map<number, { Price: string | number }>();
    for (const r of typedMenuRows) {
      menuById.set(r.Menu_ID, { Price: r.Price });
    }

    for (const it of items) {
      const menu = menuById.get(it.id);
      if (!menu) {
        return NextResponse.json(
          { error: `Menu item ${it.id} not found` },
          { status: 400 },
        );
      }
      const price = Number(menu.Price);
      const qty = Number(it.quantity || 0);
      subtotal += price * qty;
    }

    // 4) Optional coupon validation and discount
    let usedCouponId: number | null = null;
    let discountAmount = 0;

    if (couponId) {
      const { rows: couponRows } = await db.query(
        `SELECT "Coupon_ID", "Discount", "Expiry"
         FROM "Coupon"
         WHERE "Coupon_ID" = $1
           AND "Restaurant_ID" = $2
           AND ("Expiry" IS NULL OR "Expiry" >= CURRENT_DATE)`,
        [couponId, restaurantId],
      );
      const typedCouponRows = couponRows as {
        Coupon_ID: number;
        Discount: string | number;
        Expiry: string | null;
      }[];

      if (!typedCouponRows || typedCouponRows.length === 0) {
        return NextResponse.json(
          { error: "Invalid or expired coupon" },
          { status: 400 },
        );
      }

      const coupon = typedCouponRows[0];
      const rate = Number(coupon.Discount) || 0;
      if (rate > 0) {
        discountAmount = (subtotal * rate) / 100;
        usedCouponId = coupon.Coupon_ID;
      }
    }

    const totalAfterDiscount = Math.max(subtotal - discountAmount, 0);

    // 5) Create Payment row (mocked, status 'Paid' for Card/UPI, 'Pending' for COD)
    const paymentStatus = paymentMethod === "COD" ? "Pending" : "Paid";
    const { rows: paymentRows } = await db.query(
      `INSERT INTO "Payment" ("Amount", "Payment_Method", "Date", "Status")
       VALUES ($1, $2, CURRENT_DATE, $3)
       RETURNING "Payment_ID"`,
      [totalAfterDiscount.toFixed(2), paymentMethod, paymentStatus],
    );
    const paymentId = (paymentRows[0] as { Payment_ID: number }).Payment_ID;

    // 6) Create Customer_Order row (Status = Placed)
    const { rows: orderRows } = await db.query(
      `INSERT INTO "Customer_Order"
         ("Status", "Customer_ID", "Address_ID", "Restaurant_ID", "Payment_ID", "Coupon_ID")
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING "Order_ID"`,
      ["Placed", customerId, addressId, restaurantId, paymentId, usedCouponId],
    );
    const orderId = (orderRows[0] as { Order_ID: number }).Order_ID;

    // 7) Insert rows into Order_Contains WITH quantity
    const insertPromises = items.map((it) =>
      db.query(
        `INSERT INTO "Order_Contains" ("Order_ID", "Menu_ID", "Quantity")
         VALUES ($1, $2, $3)`,
        [orderId, it.id, it.quantity],
      ),
    );
    await Promise.all(insertPromises);

    return NextResponse.json({
      message: "Order placed",
      orderId,
      subtotal,
      discount: discountAmount,
      total: totalAfterDiscount,
    });
  } catch (err) {
    console.error("Order creation error:", err);
    return NextResponse.json(
      { error: "Failed to place order" },
      { status: 500 },
    );
  }
}
