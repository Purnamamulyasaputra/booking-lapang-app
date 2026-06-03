import { NextResponse } from 'next/server';
import { Pool } from '@neondatabase/serverless';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    console.log('Received Xendit Webhook:', JSON.stringify(payload, null, 2));

    const event = payload.event || '';
    
    // We want to handle payment success events.
    // Xendit has different events depending on the product (E-Wallet, VA, Payment Request, Payment Method).
    // The user specifically mentioned "payment_method.activated" for their E-Wallet simulation, 
    // and "payment.succeeded" or "payment_request.succeeded" is also common.
    const successEvents = [
      'payment_method.activated', 
      'payment.succeeded', 
      'payment_request.succeeded',
      'v2.invoice.paid',
      'virtual_account.paid',
      'ewallet.payment' // Older e-wallet API
    ];

    if (!successEvents.includes(event) && payload.status !== 'PAID' && payload.status !== 'COMPLETED' && payload.status !== 'SUCCESS') {
        // If it's not a success event, we just acknowledge receipt
        return NextResponse.json({ message: 'Event ignored' }, { status: 200 });
    }

    // Extract identifiers
    const data = payload.data || payload; // V2 uses payload.data, V1 often just puts it in payload
    const xenditId = data.id || payload.id;
    const referenceId = data.reference_id || data.external_id || payload.external_id || payload.reference_id;

    if (!xenditId && !referenceId) {
       return NextResponse.json({ error: 'Missing identifiers in payload' }, { status: 400 });
    }

    // Try to find the booking
    let bookingQuery = "";
    let queryParams: any[] = [];

    if (xenditId && referenceId) {
        bookingQuery = "SELECT id, booking_code, total_price FROM bookings WHERE xendit_id = $1 OR booking_code = $2 LIMIT 1";
        queryParams = [xenditId, referenceId];
    } else if (xenditId) {
        bookingQuery = "SELECT id, booking_code, total_price FROM bookings WHERE xendit_id = $1 LIMIT 1";
        queryParams = [xenditId];
    } else {
        bookingQuery = "SELECT id, booking_code, total_price FROM bookings WHERE booking_code = $1 LIMIT 1";
        queryParams = [referenceId];
    }

    const { rows } = await pool.query(bookingQuery, queryParams);

    if (rows.length === 0) {
        console.warn('Booking not found for webhook:', { xenditId, referenceId });
        return NextResponse.json({ message: 'Booking not found' }, { status: 404 });
    }

    const booking = rows[0];

    // Update booking status
    await pool.query(
        "UPDATE bookings SET status = 'PAID', updated_at = NOW() WHERE id = $1",
        [booking.id]
    );

    // Insert payment log
    await pool.query(
        "INSERT INTO payment_logs (booking_id, invoice_code, amount, status, log_message) VALUES ($1, $2, $3, $4, $5)",
        [booking.id, booking.booking_code, booking.total_price, 'SUCCESS', `Pembayaran berhasil dikonfirmasi via Webhook (Event: ${event})`]
    );

    console.log(`Successfully processed webhook for booking ${booking.booking_code}`);
    return NextResponse.json({ message: 'Success' }, { status: 200 });

  } catch (error: any) {
    console.error('Error processing Xendit webhook:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
