import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "ID wajib diisi" }, { status: 400 });
  }

  try {
    const { rows } = await pool.query("SELECT id, name, email, phone, tier FROM customers WHERE id = $1", [id]);
    if (rows.length === 0) {
      const { rows: adminRows } = await pool.query("SELECT id, name, email, '' as phone, 'GOLD' as tier FROM admins WHERE id = $1", [id]);
      if (adminRows.length > 0) {
        return NextResponse.json(adminRows[0]);
      }
      return NextResponse.json({ error: "Customer tidak ditemukan" }, { status: 404 });
    }
    return NextResponse.json(rows[0]);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
