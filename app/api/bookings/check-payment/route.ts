import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const bookingCode = searchParams.get("bookingCode");

  if (!bookingCode) {
    return NextResponse.json({ error: "Missing bookingCode" }, { status: 400 });
  }

  try {
    // 1. Fetch booking details
    const bookingRes = await pool.query(
      "SELECT id, booking_code, status, xendit_id, total_price FROM bookings WHERE booking_code = $1 LIMIT 1",
      [bookingCode]
    );

    if (bookingRes.rows.length === 0) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const booking = bookingRes.rows[0];
    const rawStatus = (booking.status || "").toLowerCase();

    // If already paid, return success directly
    if (rawStatus === "paid" || rawStatus === "dikonfirmasi" || rawStatus === "lunas") {
      return NextResponse.json({ success: true, status: "PAID", alreadyPaid: true });
    }

    // 2. Check Xendit status if xendit_id is available
    let isPaidOnXendit = false;
    const xenditId = booking.xendit_id;

    if (xenditId && process.env.XENDIT_API_KEY) {
      try {
        const xenditAuth = Buffer.from(process.env.XENDIT_API_KEY + ":").toString("base64");
        const xRes = await fetch(`https://api.xendit.co/payment_requests/${xenditId}`, {
          method: "GET",
          headers: {
            "Authorization": `Basic ${xenditAuth}`,
          },
        });

        if (xRes.ok) {
          const xData = await xRes.json();
          console.log(`Xendit Payment Request status for ${bookingCode}:`, xData.status);
          if (xData.status === "SUCCEEDED" || xData.status === "COMPLETED") {
            isPaidOnXendit = true;
          }
        }
      } catch (xErr) {
        console.error("Error fetching payment request from Xendit:", xErr);
      }
    }

    // 3. Fallback for Sandbox / Localhost:
    // If we are in development/sandbox environment, force it to paid when they land on success page.
    const isSandboxKey = process.env.XENDIT_API_KEY?.startsWith("xnd_sandbox_");
    const isDev = process.env.NODE_ENV === "development" || isSandboxKey;
    
    if (isPaidOnXendit || isDev) {
      // Update status to PAID
      await pool.query(
        "UPDATE bookings SET status = 'PAID', updated_at = NOW() WHERE id = $1",
        [booking.id]
      );

      // Insert payment log if not already created as success
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
            isPaidOnXendit
              ? "Pembayaran sukses dikonfirmasi via Xendit API Check"
              : "Pembayaran sukses dikonfirmasi via Local Sandbox Fallback",
          ]
        );
      }

      return NextResponse.json({ success: true, status: "PAID", updated: true });
    }

    return NextResponse.json({ success: false, status: booking.status });
  } catch (error: any) {
    console.error("Error checking payment status:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
