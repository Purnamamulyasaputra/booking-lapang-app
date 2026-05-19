import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { redis } from "@/lib/redis";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const adminId = searchParams.get("adminId");
  const isPublic = searchParams.get("public");

  try {
    if (adminId) {
      // Admin panel: filter by admin_id
      const cacheKey = `fields:admin:${adminId}`;
      const cached = await redis.get(cacheKey);
      if (cached) return NextResponse.json(cached);

      const result = await pool.query(
        `SELECT * FROM fields WHERE admin_id = $1 ORDER BY id ASC`,
        [adminId]
      );
      await redis.setex(cacheKey, 300, result.rows);
      return NextResponse.json(result.rows);
    } else {
      // Public (user-facing): show ALL active fields from all admins
      const cacheKey = "fields:public";
      const cached = await redis.get(cacheKey);
      if (cached) return NextResponse.json(cached);

      const result = await pool.query(
        `SELECT * FROM fields WHERE UPPER(status) = 'AKTIF' ORDER BY id ASC`
      );
      await redis.setex(cacheKey, 60, result.rows);
      return NextResponse.json(result.rows);
    }
  } catch (error: any) {
    console.error("Error fetching fields:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, type, facilities, location, mapUrl, pricePerHour, status, images, adminId } = body;

    if (!adminId) {
      return NextResponse.json({ error: "adminId wajib diisi" }, { status: 400 });
    }

    const result = await pool.query(
      `INSERT INTO fields (name, type, facilities, location, map_url, price_per_hour, status, images, admin_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [name, type, facilities || [], location, mapUrl, pricePerHour, status || "AKTIF", images || [], adminId]
    );

    // Invalidate both caches
    await redis.del(`fields:admin:${adminId}`);
    await redis.del("fields:public");

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error: any) {
    console.error("Error adding field:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, name, type, facilities, location, mapUrl, pricePerHour, status, images, adminId } = body;

    const result = await pool.query(
      `UPDATE fields SET name=$1, type=$2, facilities=$3, location=$4, map_url=$5, price_per_hour=$6, status=$7, images=$8, updated_at=NOW() WHERE id=$9 RETURNING *`,
      [name, type, facilities || [], location, mapUrl, pricePerHour, status, images || [], id]
    );

    if (adminId) await redis.del(`fields:admin:${adminId}`);
    await redis.del("fields:public");
    return NextResponse.json(result.rows[0], { status: 200 });
  } catch (error: any) {
    console.error("Error updating field:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const { id, adminId } = body;

    if (!id) {
      return NextResponse.json({ error: "ID lapangan wajib diisi" }, { status: 400 });
    }

    const result = await pool.query(
      `DELETE FROM fields WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Data lapangan tidak ditemukan" }, { status: 404 });
    }

    if (adminId) await redis.del(`fields:admin:${adminId}`);
    await redis.del("fields:public");

    return NextResponse.json({ success: true, deleted: result.rows[0] }, { status: 200 });
  } catch (error: any) {
    console.error("Error deleting field:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
