import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { sendWhatsAppNotification } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { bookingCode } = body;

    if (!bookingCode) {
      return NextResponse.json({ error: "Missing bookingCode" }, { status: 400 });
    }

    // 1. Fetch booking details
    const bookingRes = await pool.query(
      "SELECT id, booking_code, xendit_id, total_price, customer_id FROM bookings WHERE booking_code = $1 LIMIT 1",
      [bookingCode]
    );

    if (bookingRes.rows.length === 0) {
      return NextResponse.json({ error: "Booking tidak ditemukan" }, { status: 404 });
    }

    const booking = bookingRes.rows[0];
    const xenditId = booking.xendit_id;

    if (!xenditId) {
      // If no Xendit ID (maybe manual booking?), we can still simulate by forcing it to PAID
      await pool.query(
        "UPDATE bookings SET status = 'PAID', updated_at = NOW() WHERE id = $1",
        [booking.id]
      );
      
      // Trigger success notification
      sendWhatsAppNotification(
        booking.customer_id,
        booking.booking_code,
        booking.total_price,
        "PAYMENT_SUCCESS"
      ).catch(err => console.error("Simulated payment success notification failed:", err));

      return NextResponse.json({ success: true, message: "Manual simulation success" });
    }

    const xenditApiKey = process.env.XENDIT_API_KEY;
    if (!xenditApiKey) {
      return NextResponse.json({ error: "Xendit API Key not configured" }, { status: 500 });
    }

    const xenditAuth = Buffer.from(xenditApiKey + ":").toString("base64");
    
    // Simulate payment request
    const simulateUrl = `https://api.xendit.co/payment_requests/${xenditId}/payments/simulate`;
    const simulateRes = await fetch(simulateUrl, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${xenditAuth}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        amount: Math.round(Number(booking.total_price))
      })
    });

    if (!simulateRes.ok) {
      const errText = await simulateRes.text();
      console.error("Xendit simulation error details:", errText);
      
      // Fallback: If Xendit simulator returns error (e.g. payment already paid or expired), 
      // but we are in dev/sandbox, let's still force the status update so the user can test.
      await pool.query(
        "UPDATE bookings SET status = 'PAID', updated_at = NOW() WHERE id = $1",
        [booking.id]
      );

      // Trigger success notification in fallback path
      sendWhatsAppNotification(
        booking.customer_id,
        booking.booking_code,
        booking.total_price,
        "PAYMENT_SUCCESS"
      ).catch(err => console.error("Simulated payment success notification failed:", err));

      return NextResponse.json({ success: true, warning: "Simulasi berhasil dengan paksa (status lunas)" });
    }

    // Explicitly update booking status to PAID in our database
    await pool.query(
      "UPDATE bookings SET status = 'PAID', updated_at = NOW() WHERE id = $1",
      [booking.id]
    );

    // Insert payment log
    const logCheck = await pool.query(
      "SELECT id FROM payment_logs WHERE booking_id = $1 AND status = 'SUCCESS' LIMIT 1",
      [booking.id]
    );

    if (logCheck.rows.length === 0) {
      await pool.query(
        "INSERT INTO payment_logs (booking_id, invoice_code, amount, status, log_message) VALUES ($1, $2, $3, $4, $5)",
        [
          booking.id,
          booking.booking_code,
          booking.total_price,
          "SUCCESS",
          "Pembayaran sukses dikonfirmasi via Simulasi Otomatis (Xendit POST /simulate)"
        ]
      );
    }

    // Trigger success notification
    sendWhatsAppNotification(
      booking.customer_id,
      booking.booking_code,
      booking.total_price,
      "PAYMENT_SUCCESS"
    ).catch(err => console.error("Simulated payment success notification failed:", err));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in simulate-payment route:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
