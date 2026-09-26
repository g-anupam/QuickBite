// src/app/api/restaurant/coupons/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { db } from "@/lib/db";

const JWT_SECRET = process.env.JWT_SECRET!;

type DecodedToken = {
  userId: number;
  role: string;
};

async function getRestaurantIdFromToken(): Promise<number> {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) {
    throw new Error("Unauthorized");
  }

  const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken;

  if (!decoded || decoded.role !== "restaurant") {
    throw new Error("Forbidden");
  }

  // Map Users.id -> Restaurant.Restaurant_ID
  const { rows } = await db.query(
    `SELECT "Restaurant_ID" FROM "Restaurant" WHERE "userId" = $1`,
    [decoded.userId],
  );

  const typedRows = rows as { Restaurant_ID: number }[];

  if (!typedRows || typedRows.length === 0) {
    throw new Error("Restaurant not found");
  }

  return typedRows[0].Restaurant_ID;
}

// GET: list coupons for this restaurant
export async function GET() {
  try {
    const restaurantId = await getRestaurantIdFromToken();

    const { rows } = await db.query(
      `SELECT "Coupon_ID", "Discount", "Expiry"
       FROM "Coupon"
       WHERE "Restaurant_ID" = $1
       ORDER BY "Expiry" ASC`,
      [restaurantId],
    );

    return NextResponse.json(rows);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";

    if (message === "Unauthorized") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    if (message === "Forbidden" || message === "Restaurant not found") {
      return NextResponse.json({ error: message }, { status: 403 });
    }

    console.error("GET /api/restaurant/coupons error:", err);
    return NextResponse.json(
      { error: "Failed to fetch coupons" },
      { status: 500 },
    );
  }
}

// POST: create coupon
export async function POST(req: Request) {
  try {
    const restaurantId = await getRestaurantIdFromToken();
    const body = await req.json();

    const discount = Number(body.discount);
    const expiry = body.expiry as string | undefined;

    if (!discount || isNaN(discount)) {
      return NextResponse.json(
        { error: "Invalid discount value" },
        { status: 400 },
      );
    }

    // expiry should be YYYY-MM-DD or null
    if (!expiry) {
      return NextResponse.json(
        { error: "Expiry date is required" },
        { status: 400 },
      );
    }

    await db.query(
      `INSERT INTO "Coupon" ("Discount", "Expiry", "Restaurant_ID")
       VALUES ($1, $2, $3)`,
      [discount.toFixed(2), expiry, restaurantId],
    );

    return NextResponse.json({ message: "Coupon created" }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";

    if (message === "Unauthorized") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    if (message === "Forbidden" || message === "Restaurant not found") {
      return NextResponse.json({ error: message }, { status: 403 });
    }

    console.error("POST /api/restaurant/coupons error:", err);
    return NextResponse.json(
      { error: "Failed to create coupon" },
      { status: 500 },
    );
  }
}

// DELETE: delete coupon by id (in body)
export async function DELETE(req: Request) {
  try {
    const restaurantId = await getRestaurantIdFromToken();
    const body = await req.json();
    const couponId = Number(body.couponId);

    if (!couponId || isNaN(couponId)) {
      return NextResponse.json({ error: "Invalid couponId" }, { status: 400 });
    }

    const result = await db.query(
      `DELETE FROM "Coupon"
       WHERE "Coupon_ID" = $1 AND "Restaurant_ID" = $2`,
      [couponId, restaurantId],
    );

    if (!result.rowCount) {
      return NextResponse.json(
        { error: "Coupon not found or not owned by restaurant" },
        { status: 404 },
      );
    }

    return NextResponse.json({ message: "Coupon deleted" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";

    if (message === "Unauthorized") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    if (message === "Forbidden" || message === "Restaurant not found") {
      return NextResponse.json({ error: message }, { status: 403 });
    }

    console.error("DELETE /api/restaurant/coupons error:", err);
    return NextResponse.json(
      { error: "Failed to delete coupon" },
      { status: 500 },
    );
  }
}
