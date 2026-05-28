import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { redis } from "@/lib/redis";

export async function GET() {
  try {
    const cacheKey = "payment_instructions:all";
    const cached = await redis.get(cacheKey);
    if (cached) return NextResponse.json(cached);

    const query = `
      SELECT pi.*, pm.code as pm_code, pm.name as pm_name
      FROM payment_instructions pi
      JOIN payment_methods pm ON pi.payment_method_id = pm.id
      ORDER BY pi.sort_order ASC;
    `;
    const result = await pool.query(query);
    
    await redis.setex(cacheKey, 300, result.rows);
    return NextResponse.json(result.rows);
  } catch (error: any) {
    console.error("Error fetching payment instructions:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
