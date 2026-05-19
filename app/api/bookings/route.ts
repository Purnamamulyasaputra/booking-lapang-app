import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const customerId = searchParams.get("customerId");
  const adminId = searchParams.get("adminId");

  try {
    let query = `
      SELECT b.*, f.name as field_name, f.images as field_images, c.name as customer_name, c.phone as customer_phone
      FROM bookings b
      JOIN fields f ON b.field_id = f.id
      JOIN customers c ON b.customer_id = c.id
    `;
    const values: any[] = [];

    if (customerId) {
      query += ` WHERE b.customer_id = $${values.length + 1}`;
      values.push(customerId);
    }

    // Filter bookings by admin's fields only
    if (adminId) {
      if (values.length > 0) query += ` AND`;
      else query += ` WHERE`;
      query += ` f.admin_id = $${values.length + 1}`;
      values.push(adminId);
    }

    const fieldId = searchParams.get("fieldId");
    const date = searchParams.get("date");

    if (fieldId) {
      if (values.length > 0) query += ` AND`;
      else query += ` WHERE`;
      values.push(fieldId);
      query += ` b.field_id = $${values.length}`;
    }

    if (date) {
      if (values.length > 0) query += ` AND`;
      else query += ` WHERE`;
      values.push(date);
      query += ` b.booking_date = $${values.length}`;
    }

    query += ` ORDER BY b.created_at DESC`;

    const result = await pool.query(query, values);
    return NextResponse.json(result.rows);
  } catch (error: any) {
    console.error("Error fetching bookings:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      customerId,
      fieldId,
      bookingDate,
      startHour,
      endHour,
      totalPrice,
      paymentMethod,
      receiptImg
    } = body;

    // Check for overlapping bookings
    const overlapCheck = await pool.query(
      `SELECT id FROM bookings 
       WHERE field_id = $1 
         AND DATE(booking_date) = DATE($2::date)
         AND status NOT IN ('DIBATALKAN', 'DITOLAK')
         AND (
           (start_hour < $4 AND end_hour > $3)
         )`,
      [fieldId, bookingDate, startHour, endHour]
    );

    if (overlapCheck.rows.length > 0) {
      return NextResponse.json({ error: "Waktu tersebut sudah di-booking oleh orang lain." }, { status: 409 });
    }

    const bookingCode = `BK-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;

    const result = await pool.query(
      `INSERT INTO bookings (booking_code, customer_id, field_id, booking_date, start_hour, end_hour, total_price, receipt_img, status)
       VALUES ($1, $2, $3, $4::date, $5, $6, $7, $8, 'MENUNGGU') RETURNING *`,
      [bookingCode, customerId, fieldId, bookingDate, startHour, endHour, totalPrice, receiptImg || null]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error: any) {
    console.error("Error creating booking:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { id, status } = await req.json();
    const result = await pool.query(
      `UPDATE bookings SET status = $1 WHERE id = $2 RETURNING *`,
      [status, id]
    );
    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error("Error updating booking:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();
    const result = await pool.query(
      `UPDATE bookings SET status = 'DIBATALKAN' WHERE id = $1 RETURNING *`,
      [id]
    );
    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error("Error cancelling booking:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
