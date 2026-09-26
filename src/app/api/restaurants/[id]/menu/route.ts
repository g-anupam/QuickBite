import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET!;

export async function GET(
  _: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    // ✅ Await params
    const { id } = await context.params;
    const restaurantId = parseInt(id);

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

    if (!["customer", "restaurant"].includes(decoded.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { rows }: any = await db.query(
      `SELECT "Menu_ID", "Item_Name", "Item_Description", "Price" FROM "Menu" WHERE "Restaurant_ID" = $1 ORDER BY "Menu_ID" DESC`,
      [restaurantId],
    );

    const formatted = rows.map((item: any) => ({
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
