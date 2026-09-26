import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET!;

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      console.error("JWT verification failed:", err);
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 },
      );
    }

    if (decoded.role !== "restaurant") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // ✅ Fetch restaurant ID
    const { rows: restRows }: any = await db.query(
      `SELECT "Restaurant_ID" FROM "Restaurant" WHERE "userId" = $1`,
      [decoded.userId],
    );

    if (!Array.isArray(restRows) || restRows.length === 0) {
      return NextResponse.json(
        { error: "Restaurant not found" },
        { status: 404 },
      );
    }

    const restaurantId = restRows[0].Restaurant_ID;

    // ✅ Fetch menu items
    const { rows: menuRows }: any = await db.query(
      `SELECT * FROM "Menu" WHERE "Restaurant_ID" = $1 ORDER BY "Menu_ID" DESC`,
      [restaurantId],
    );

    // ✅ Convert Price to number
    const formatted = menuRows.map((item: any) => ({
      ...item,
      Price: Number(item.Price),
    }));

    return NextResponse.json(formatted);
  } catch (err) {
    console.error("Error fetching menu:", err);
    return NextResponse.json(
      { error: "Failed to fetch menu" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      console.error("JWT verification failed:", err);
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 },
      );
    }

    if (decoded.role !== "restaurant") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { name, description, price } = body;

    if (!name || !price) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const { rows: restRows }: any = await db.query(
      `SELECT "Restaurant_ID" FROM "Restaurant" WHERE "userId" = $1`,
      [decoded.userId],
    );

    const restaurantId = restRows[0].Restaurant_ID;

    await db.query(
      `INSERT INTO "Menu" ("Item_Name", "Item_Description", "Price", "Restaurant_ID") VALUES ($1, $2, $3, $4)`,
      [name, description || null, price, restaurantId],
    );

    return NextResponse.json({ message: "Menu item added successfully" });
  } catch (err) {
    console.error("Error adding menu item:", err);
    return NextResponse.json({ error: "Failed to add item" }, { status: 500 });
  }
}
