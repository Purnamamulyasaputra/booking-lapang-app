import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const customerId = searchParams.get("customerId");

  try {
    let query = `
      SELECT b.*, f.name as field_name, f.images as field_images, c.name as customer_name, c.phone as customer_phone
      FROM bookings b
      JOIN fields f ON b.field_id = f.id
      JOIN customers c ON b.customer_id = c.id
    `;
    const values: any[] = [];

    if (customerId) {
      query += ` WHERE b.customer_id = $1`;
      values.push(customerId);
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

    // Check overlap
    const checkResult = await pool.query(
      `SELECT id FROM bookings 
       WHERE field_id = $1 AND booking_date = $2 
       AND status != 'DIBATALKAN' AND status != 'DITOLAK'
       AND (
         (start_hour < $4 AND end_hour > $3)
       )`,
      [fieldId, bookingDate, startHour, endHour]
    );

    if (checkResult.rows.length > 0) {
      return NextResponse.json(
        { error: "Waktu tersebut sudah di-booking." },
        { status: 400 }
      );
    }

    const bookingCode = `BKG-${Math.floor(Math.random() * 1000000)}`;

    const result = await pool.query(
      `INSERT INTO bookings (booking_code, customer_id, field_id, booking_date, start_hour, end_hour, total_price, status, receipt_img) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'MENUNGGU', $8) RETURNING *`,
      [bookingCode, customerId, fieldId, bookingDate, startHour, endHour, totalPrice, receiptImg || null]
    );

    // Simulated auth: Add to payment_logs too for mock flow
    await pool.query(
      `INSERT INTO payment_logs (booking_id, invoice_code, amount, status, log_message) 
       VALUES ($1, $2, $3, 'PENDING', 'Menunggu pembayaran via ' || $4)`,
      [result.rows[0].id, `INV-${bookingCode}`, totalPrice, paymentMethod]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error: any) {
    console.error("Error creating booking:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, status } = body;

    const result = await pool.query(
      `UPDATE bookings SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
      [status, id]
    );

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error("Error updating booking:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
