import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { redis } from "@/lib/redis";

export async function GET() {
  try {
    // Check cache
    const cachedFields = await redis.get("fields:all");
    if (cachedFields) {
      return NextResponse.json(cachedFields);
    }

    // Fetch from Neon using raw SQL
    const result = await pool.query(`SELECT * FROM fields ORDER BY id ASC`);
    const fields = result.rows;

    // Cache for 5 minutes
    await redis.setex("fields:all", 300, JSON.stringify(fields));

    return NextResponse.json(fields);
  } catch (error: any) {
    console.error("Error fetching fields:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, type, facilities, location, mapUrl, pricePerHour, status, images } = body;

    // Raw SQL Insert
    const result = await pool.query(
      `INSERT INTO fields (name, type, facilities, location, map_url, price_per_hour, status, images) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [name, type, facilities || [], location, mapUrl, pricePerHour, status || "AKTIF", images || []]
    );

    // Invalidate cache
    await redis.del("fields:all");

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error: any) {
    console.error("Error adding field:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, name, type, facilities, location, mapUrl, pricePerHour, status, images } = body;

    const result = await pool.query(
      `UPDATE fields SET name=$1, type=$2, facilities=$3, location=$4, map_url=$5, price_per_hour=$6, status=$7, images=$8, updated_at=NOW() WHERE id=$9 RETURNING *`,
      [name, type, facilities || [], location, mapUrl, pricePerHour, status, images || [], id]
    );

    await redis.del("fields:all");
    return NextResponse.json(result.rows[0], { status: 200 });
  } catch (error: any) {
    console.error("Error updating field:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "ID lapangan wajib diisi" }, { status: 400 });
    }

    const result = await pool.query(
      `DELETE FROM fields WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Data lapangan tidak ditemukan" }, { status: 404 });
    }

    // Invalidate cache immediately
    await redis.del("fields:all");

    return NextResponse.json({ success: true, deleted: result.rows[0] }, { status: 200 });
  } catch (error: any) {
    console.error("Error deleting field:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
