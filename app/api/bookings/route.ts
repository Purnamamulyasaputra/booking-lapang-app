import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const customerId = searchParams.get("customerId");
  const adminId = searchParams.get("adminId");

  try {
    let resolvedCustomerId = customerId;
    if (customerId) {
      // Check if this ID is in customers
      const custCheck = await pool.query("SELECT id FROM customers WHERE id = $1", [customerId]);
      if (custCheck.rows.length === 0) {
        // Not a customer ID. Is it an admin ID?
        const adminCheck = await pool.query("SELECT email FROM admins WHERE id = $1", [customerId]);
        if (adminCheck.rows.length > 0) {
          const adminEmail = adminCheck.rows[0].email;
          const custEmailCheck = await pool.query("SELECT id FROM customers WHERE email = $1", [adminEmail]);
          if (custEmailCheck.rows.length > 0) {
            resolvedCustomerId = custEmailCheck.rows[0].id.toString();
          }
        }
      }
    }

    let query = `
      SELECT b.*, f.name as field_name, f.images as field_images, c.name as customer_name, c.phone as customer_phone
      FROM bookings b
      JOIN fields f ON b.field_id = f.id
      JOIN customers c ON b.customer_id = c.id
    `;
    const values: any[] = [];

    if (resolvedCustomerId) {
      query += ` WHERE b.customer_id = $${values.length + 1}`;
      values.push(resolvedCustomerId);
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

async function sendWhatsAppNotification(
  customerId: string | number,
  bookingCode: string,
  totalPrice: number,
  triggerEvent: string,
  paymentMethodCode?: string
) {
  try {
    // 1. Fetch template
    const templateRes = await pool.query(
      "SELECT * FROM notif_templates WHERE trigger_event = $1 AND is_active = true LIMIT 1",
      [triggerEvent]
    );
    if (templateRes.rows.length === 0) {
      console.log(`No active template found for trigger: ${triggerEvent}`);
      return;
    }
    const template = templateRes.rows[0];

    // 2. Fetch customer details
    const custRes = await pool.query(
      "SELECT name, phone FROM customers WHERE id = $1",
      [customerId]
    );
    if (custRes.rows.length === 0) {
      console.log(`Customer not found for ID: ${customerId}`);
      return;
    }
    const customer = custRes.rows[0];
    const recipient = customer.phone;

    // Do not send if phone number is a placeholder
    if (!recipient || recipient.startsWith('G-') || recipient.includes('belum')) {
      console.log(`Skipping WA notification for ${customer.name}: phone number is placeholder/invalid (${recipient})`);
      return;
    }

    // 3. Get field details
    let fieldName = "Lapangan Futsal";
    let adminBankName = "";
    let adminBankAccount = "";
    let adminBankOwner = "";
    let paymentMethodsJson = [];
    const fieldRes = await pool.query(
      `SELECT f.name as field_name, f.bank_name, f.bank_account, f.bank_owner, f.payment_methods FROM bookings b 
       JOIN fields f ON b.field_id = f.id 
       WHERE b.booking_code = $1 LIMIT 1`,
      [bookingCode]
    );
    if (fieldRes.rows.length > 0) {
      fieldName = fieldRes.rows[0].field_name;
      adminBankName = fieldRes.rows[0].bank_name;
      adminBankAccount = fieldRes.rows[0].bank_account;
      adminBankOwner = fieldRes.rows[0].bank_owner;
      if (fieldRes.rows[0].payment_methods && Array.isArray(fieldRes.rows[0].payment_methods)) {
        paymentMethodsJson = fieldRes.rows[0].payment_methods;
      }
    }

    // 4. Resolve payment method display details
    let paymentMethodName = "Transfer Bank";
    let paymentMethodDetail = "-";
    let paymentOwner = adminBankOwner || "Yayasan Peduli Sesama";

    if (paymentMethodCode?.startsWith('custom_admin_')) {
      const idxStr = paymentMethodCode.replace('custom_admin_', '');
      const idx = parseInt(idxStr, 10);
      if (!isNaN(idx) && paymentMethodsJson[idx]) {
        const pm = paymentMethodsJson[idx];
        paymentMethodName = pm.bankName || "Transfer Manual";
        paymentMethodDetail = pm.bankAccount || "-";
        paymentOwner = pm.bankOwner || paymentOwner;
      } else {
        paymentMethodName = adminBankName || "Transfer Manual";
        paymentMethodDetail = adminBankAccount || "-";
      }
    } else if (paymentMethodCode) {
      const codeLower = paymentMethodCode.toLowerCase();
      if (codeLower === 'bca') {
        paymentMethodName = "Bank BCA";
        paymentMethodDetail = "1234567890";
      } else if (codeLower === 'bri') {
        paymentMethodName = "Bank BRI";
        paymentMethodDetail = "9876543210";
      } else if (codeLower === 'dana') {
        paymentMethodName = "DANA";
        paymentMethodDetail = "081234567890";
      }
    }

    // 5. Replace placeholders in content
    let message = template.content
      .replace(/\{\{name\}\}/g, customer.name)
      .replace(/\{\{booking_code\}\}/g, bookingCode)
      .replace(/\{\{total_price\}\}/g, Number(totalPrice).toLocaleString('id-ID'))
      .replace(/\{\{field_name\}\}/g, fieldName)
      .replace(/\{\{payment_method\}\}/g, paymentMethodName)
      .replace(/\{\{payment_destination\}\}/g, paymentMethodDetail)
      .replace(/\{\{payment_detail\}\}/g, paymentMethodDetail)
      .replace(/\{\{payment_owner\}\}/g, paymentOwner);

    // 6. Call Fonnte API
    const fonnteToken = process.env.FONNTE_TOKEN || "e9xsJ4RcFFj2Lk1MuCfp";
    const data = new URLSearchParams();
    data.append("target", recipient);
    data.append("message", message);
    data.append("countryCode", "62");

    const reqPayload = JSON.stringify({ target: recipient, message, countryCode: "62" });
    let resPayload = "";
    let status = "FAILED";

    try {
      const response = await fetch("https://api.fonnte.com/send", {
        method: "POST",
        headers: {
          "Authorization": fonnteToken,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: data
      });
      const result = await response.json();
      resPayload = JSON.stringify(result);
      if (result.status === true || result.status === 'true') {
        status = "SUCCESS";
      }
    } catch (apiErr: any) {
      console.error("Fonnte API fetch error:", apiErr);
      resPayload = JSON.stringify({ error: apiErr.message });
    }

    // 7. Log notification
    await pool.query(
      `INSERT INTO notif_logs (customer_id, template_id, recipient, request_payload, response_payload, status, type)
       VALUES ($1, $2, $3, $4, $5, $6, 'WHATSAPP')`,
      [customerId, template.id, recipient, reqPayload, resPayload, status]
    );

    console.log(`WhatsApp Notification sent to ${recipient} via Fonnte. Status: ${status}`);
  } catch (err) {
    console.error("Error in sendWhatsAppNotification:", err);
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
      receiptImg,
      customerPhone,
      paymentMethodCode
    } = body;

    let resolvedCustomerId = customerId;
    if (customerId) {
      // Check if this ID is in customers
      const custCheck = await pool.query("SELECT id FROM customers WHERE id = $1", [customerId]);
      if (custCheck.rows.length === 0) {
        // Not a customer ID. Is it an admin ID?
        const adminCheck = await pool.query("SELECT email, name FROM admins WHERE id = $1", [customerId]);
        if (adminCheck.rows.length > 0) {
          const adminEmail = adminCheck.rows[0].email;
          const adminName = adminCheck.rows[0].name;
          const custEmailCheck = await pool.query("SELECT id FROM customers WHERE email = $1", [adminEmail]);
          if (custEmailCheck.rows.length > 0) {
            resolvedCustomerId = custEmailCheck.rows[0].id.toString();
          } else {
            // Create a new customer for this admin email
            const uniquePhone = '08' + Math.floor(1000000000 + Math.random() * 9000000000).toString();
            const insertCust = await pool.query(
              "INSERT INTO customers (name, email, phone, password_hash, tier) VALUES ($1, $2, $3, $4, $5) RETURNING id",
              [adminName, adminEmail, uniquePhone, 'google-sso', 'BRONZE']
            );
            resolvedCustomerId = insertCust.rows[0].id.toString();
          }
        }
      }
    }

    if (customerPhone && resolvedCustomerId) {
      // Check if phone number is already used by another customer
      const phoneCheck = await pool.query(
        "SELECT id FROM customers WHERE phone = $1 AND id != $2",
        [customerPhone, resolvedCustomerId]
      );
      if (phoneCheck.rows.length === 0) {
        await pool.query(
          "UPDATE customers SET phone = $1 WHERE id = $2",
          [customerPhone, resolvedCustomerId]
        );
      }
    }

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
      [bookingCode, resolvedCustomerId, fieldId, bookingDate, startHour, endHour, totalPrice, receiptImg || null]
    );

    const booking = result.rows[0];

    // Trigger WhatsApp notification for BOOKING_CREATED in the background with dynamic paymentMethodCode
    sendWhatsAppNotification(resolvedCustomerId, bookingCode, totalPrice, 'BOOKING_CREATED', paymentMethodCode).catch(err => {
      console.error("Failed to send WhatsApp alert for booking created:", err);
    });

    return NextResponse.json(booking, { status: 201 });
  } catch (error: any) {
    console.error("Error creating booking:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { id, status, receiptImg } = await req.json();
    let result;
    if (receiptImg) {
      result = await pool.query(
        `UPDATE bookings SET receipt_img = $1, status = $2 WHERE id = $3 RETURNING *`,
        [receiptImg, status || 'MENUNGGU', id]
      );
    } else {
      result = await pool.query(
        `UPDATE bookings SET status = $1 WHERE id = $2 RETURNING *`,
        [status, id]
      );
    }

    const updatedBooking = result.rows[0];

    if (updatedBooking && updatedBooking.status.toLowerCase() === 'dikonfirmasi') {
      sendWhatsAppNotification(
        updatedBooking.customer_id,
        updatedBooking.booking_code,
        updatedBooking.total_price,
        'PAYMENT_SUCCESS'
      ).catch(err => {
        console.error("Failed to send WhatsApp alert for payment success:", err);
      });
    }

    return NextResponse.json(updatedBooking);
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
