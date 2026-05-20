import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET: Ambil nomor WA admin tertentu by adminId (publik), atau semua admin
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const adminId = searchParams.get("adminId");

  try {
    if (adminId) {
      const result = await pool.query(
        "SELECT id, name, phone FROM admins WHERE id = $1 LIMIT 1",
        [adminId]
      );
      if (result.rows.length === 0) {
        return NextResponse.json({ phone: null });
      }
      return NextResponse.json(result.rows[0]);
    } else {
      // Return first admin with a phone number (public contact)
      const result = await pool.query(
        "SELECT id, name, phone FROM admins WHERE phone IS NOT NULL LIMIT 1"
      );
      return NextResponse.json(result.rows[0] || { phone: null });
    }
  } catch (error: any) {
    console.error("Error fetching admin contact:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT: Admin update nomor WA sendiri (hanya admin yang login)
export async function PUT(req: Request) {
  try {
    const { adminId, phone } = await req.json();

    if (!adminId || !phone) {
      return NextResponse.json({ error: "adminId dan phone wajib diisi" }, { status: 400 });
    }

    const result = await pool.query(
      "UPDATE admins SET phone = $1 WHERE id = $2 RETURNING id, name, phone",
      [phone, adminId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Admin tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error("Error updating admin phone:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
