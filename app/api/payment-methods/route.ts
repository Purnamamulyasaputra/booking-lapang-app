import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET() {
  try {
    const result = await pool.query('SELECT * FROM payment_methods ORDER BY id ASC');
    return NextResponse.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching payment methods:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
