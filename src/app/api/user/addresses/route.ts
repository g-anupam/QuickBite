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

    // Get the customer ID
    const { rows: customerData }: any = await db.query(
      `SELECT "Customer_ID" FROM "Customer" WHERE "userId" = $1`,
      [decoded.userId],
    );
    if (!customerData.length) return NextResponse.json({ addresses: [] });

    const customerId = customerData[0].Customer_ID;

    // Get all addresses linked to this customer
    const { rows }: any = await db.query(
      `SELECT da."Address_ID", da."Address_First_Line", da."Address_Second_Line", da."City", da."Pincode"
       FROM "Delivery_Address" da
       JOIN "Customer_Address" ca ON da."Address_ID" = ca."Address_ID"
       WHERE ca."Customer_ID" = $1`,
      [customerId],
    );

    return NextResponse.json(rows);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to fetch addresses" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    const body = await req.json();
    const { address1, address2, city, pincode } = body;

    if (!address1 || !city || !pincode)
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    // Get customer ID
    const { rows: customerData }: any = await db.query(
      `SELECT "Customer_ID" FROM "Customer" WHERE "userId" = $1`,
      [decoded.userId],
    );
    if (!customerData.length)
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 },
      );

    const customerId = customerData[0].Customer_ID;

    // Insert into Delivery_Address
    const { rows: addrRows }: any = await db.query(
      `INSERT INTO "Delivery_Address"
       ("Address_First_Line", "Address_Second_Line", "City", "Pincode")
       VALUES ($1, $2, $3, $4)
       RETURNING "Address_ID"`,
      [address1, address2 || null, city, pincode],
    );

    const newAddressId = addrRows[0].Address_ID;

    // Link to Customer_Address
    await db.query(
      `INSERT INTO "Customer_Address" ("Customer_ID", "Address_ID")
       VALUES ($1, $2)`,
      [customerId, newAddressId],
    );

    return NextResponse.json({
      message: "Address added",
      addressId: newAddressId,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to add address" },
      { status: 500 },
    );
  }
}
