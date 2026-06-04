import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const payload = await req.json();

    // 1. Filter Event: Abaikan jika event adalah payment_method.activated
    if (payload.event === 'payment_method.activated') {
      return NextResponse.json({ message: 'Ignored' }, { status: 200 });
    }

    // Hanya proses jika payment.succeeded
    if (payload.event === 'payment.succeeded') {
      // 2. Ekstrak ID: reference_id adalah booking_code
      const referenceId = payload.data.reference_id; 
      
      // Ambil booking_id terlebih dahulu untuk dimasukkan ke payment_logs
      const bookingRes = await pool.query('SELECT id FROM bookings WHERE booking_code = $1', [referenceId]);
      
      if (bookingRes.rows.length > 0) {
        const bookingId = bookingRes.rows[0].id;

        // 3. Database Query: Update status ke 'DIKONFIRMASI'
        await pool.query(
          "UPDATE bookings SET status = 'DIKONFIRMASI' WHERE booking_code = $1", 
          [referenceId]
        );

        // 4. Catat Log
        await pool.query(
          "INSERT INTO payment_logs (booking_id, invoice_code, status, log_message) VALUES ($1, $2, 'SUCCESS', 'Payment succeeded via Xendit Webhook')",
          [bookingId, referenceId]
        );
      }

      // 5. Return HTTP Status 200
      return NextResponse.json({ message: 'Success' }, { status: 200 });
    }

    // Selalu kembalikan 200 OK untuk event lain agar Xendit tidak terus melakukan retry
    return NextResponse.json({ message: 'Event not handled' }, { status: 200 });
  } catch (error: any) {
    console.error("Webhook Xendit error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
