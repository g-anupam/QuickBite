import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  let connection;

  try {
    const data = await req.json();
    const { email, password, role, extraData } = data;

    if (!email || !password || !role) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 },
      );
    }

    // Combine name fields based on role
    let name = "";
    if (role === "customer" || role === "driver") {
      const { firstName, middleName, lastName } = extraData || {};
      name = [firstName, middleName, lastName].filter(Boolean).join(" ");
    } else if (role === "restaurant") {
      name = extraData?.restaurantName || "";
    }

    if (!name) {
      return NextResponse.json(
        { message: "Name information missing for the selected role" },
        { status: 400 },
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    connection = await db.connect();
    await connection.query("BEGIN");

    let userId;

    // Step 1: Insert into Users table
    try {
      const { rows: userRows }: any = await connection.query(
        `INSERT INTO "Users" ("name", "email", "password", "role") VALUES ($1, $2, $3, $4) RETURNING "id"`,
        [name, email, hashedPassword, role],
      );
      userId = userRows[0].id;
      console.log(` [Users Table] Inserted userId = ${userId}`);
    } catch (err: any) {
      console.error(
        "❌ [Users Table] Insertion failed:",
        err.sqlMessage || err.message,
      );
      await connection.query("ROLLBACK");
      return NextResponse.json(
        {
          message: "User creation failed",
          error: err.sqlMessage || err.message,
        },
        { status: 500 },
      );
    }

    // Step 2: Insert into respective table
    try {
      if (role === "customer") {
        const { firstName, middleName, lastName, phone } = extraData;

        await connection.query(
          `INSERT INTO "Customer" ("Email", "Phone_Num", "First_Name", "Middle_Name", "Last_Name", "userId")
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [email, phone, firstName, middleName || null, lastName, userId],
        );
        console.log(" [Customer Table] Insertion successful");
      } else if (role === "restaurant") {
        const { restaurantName, phone, address1, address2, city, pincode } =
          extraData;

        await connection.query(
          `INSERT INTO "Restaurant" ("Restaurant_Name", "Email", "Phone", "Address_First_line", "Address_Second_line", "City", "Pincode", "userId")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            restaurantName,
            email,
            phone,
            address1,
            address2 || null,
            city,
            pincode,
            userId,
          ],
        );
        console.log(" [Restaurant Table] Insertion successful");
      } else if (role === "driver") {
        const {
          firstName,
          middleName,
          lastName,
          phone,
          vehicleName,
          vehicleNumber,
        } = extraData;

        const driverFullName = [firstName, middleName, lastName]
          .filter(Boolean)
          .join(" ");

        await connection.query(
          `INSERT INTO "Driver" ("Name", "Vehicle_Name", "Vehicle_Number", "Email", "userId")
           VALUES ($1, $2, $3, $4, $5)`,
          [driverFullName, vehicleName, vehicleNumber, email, userId],
        );
        console.log(" [Driver Table] Insertion successful");
      }
    } catch (err: any) {
      console.error(
        `❌ [${role.toUpperCase()} Table] Insertion failed:`,
        err.sqlMessage || err.message,
      );
      await connection.query("ROLLBACK");
      return NextResponse.json(
        {
          message: `${role.charAt(0).toUpperCase() + role.slice(1)} data insertion failed`,
          error: err.sqlMessage || err.message,
        },
        { status: 500 },
      );
    }

    // Commit transaction
    await connection.query("COMMIT");
    console.log(" Signup transaction committed successfully");

    return NextResponse.json(
      { message: "Signup successful", userId },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("❌ [Server Error]:", error.message || error);
    return NextResponse.json(
      { message: "Unexpected server error", error: error.message || error },
      { status: 500 },
    );
  } finally {
    if (connection) connection.release();
  }
}
