import { NextResponse } from 'next/server';
import { Pool } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function POST(req: Request) {
  try {
    const { name, email, password, phone } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    const { rows } = await pool.query("SELECT * FROM customers WHERE email = $1", [email]);
    if (rows.length > 0) {
      return NextResponse.json({ message: 'Email sudah terdaftar' }, { status: 400 });
    }

    if (phone) {
      const { rows: phoneRows } = await pool.query("SELECT * FROM customers WHERE phone = $1", [phone]);
      if (phoneRows.length > 0) {
        return NextResponse.json({ message: 'Nomor telepon sudah terdaftar' }, { status: 400 });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const insertResult = await pool.query(
      "INSERT INTO customers (name, email, phone, password_hash, tier) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email",
      [name, email, phone || '', hashedPassword, 'BRONZE']
    );

    return NextResponse.json({ user: insertResult.rows[0], message: 'Registration successful' }, { status: 201 });
  } catch (error: any) {
    console.error("Registration error:", error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
