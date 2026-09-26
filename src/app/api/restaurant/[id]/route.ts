import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params; // ✅ unwrap async params
    const restaurantId = parseInt(id);

    if (isNaN(restaurantId)) {
      return NextResponse.json(
        { error: "Invalid restaurant ID" },
        { status: 400 },
      );
    }

    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Only allow restaurants to edit their own info
    if (decoded.role !== "restaurant") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const {
      Restaurant_Name,
      Address_First_line,
      Address_Second_line,
      City,
      Pincode,
      Phone,
      Email,
    } = body;

    await db.query(
      `UPDATE "Restaurant"
       SET "Restaurant_Name"=$1, "Address_First_line"=$2, "Address_Second_line"=$3, "City"=$4, "Pincode"=$5, "Phone"=$6, "Email"=$7
       WHERE "Restaurant_ID"=$8 AND "userId"=$9`,
      [
        Restaurant_Name,
        Address_First_line,
        Address_Second_line || null,
        City,
        Pincode,
        Phone,
        Email,
        restaurantId,
        decoded.userId,
      ],
    );

    return NextResponse.json({ message: "Restaurant updated successfully" });
  } catch (err) {
    console.error("Error updating restaurant:", err);
    return NextResponse.json(
      { error: "Failed to update restaurant" },
      { status: 500 },
    );
  }
}
