// src/app/api/restaurants/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const { rows }: any = await db.query(
      `
      SELECT
        "Restaurant_ID",
        "Restaurant_Name",
        "City",
        "Pincode",
        "Email",
        "Phone",
        fn_avg_rating("Restaurant_ID") AS "avgRating"
      FROM "Restaurant"
      ORDER BY "Restaurant_Name" ASC
      `,
    );

    return NextResponse.json(rows);
  } catch (err) {
    console.error("Error fetching restaurants with avgRating:", err);
    return NextResponse.json(
      { error: "Failed to fetch restaurants" },
      { status: 500 },
    );
  }
}
