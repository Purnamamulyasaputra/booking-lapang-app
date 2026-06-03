import { pool } from "./db";

export async function sendWhatsAppNotification(
  customerId: string | number,
  bookingCode: string,
  totalPrice: number,
  triggerEvent: string,
  paymentMethodCode?: string,
  paymentDetailsOverride?: string
) {
  try {
    // 0. Double-sending prevention check
    const bookingCheck = await pool.query(
      "SELECT id, iswacheckout, iswapaid FROM bookings WHERE booking_code = $1 LIMIT 1",
      [bookingCode]
    );

    const isCheckoutEvent = triggerEvent.startsWith("BOOKING_CREATED");
    const isPaidEvent = triggerEvent === "PAYMENT_SUCCESS";

    if (bookingCheck.rows.length > 0) {
      const b = bookingCheck.rows[0];
      if (isCheckoutEvent && b.iswacheckout) {
        console.log(`Skipping notification: BOOKING_CREATED already sent for booking ${bookingCode}`);
        return;
      }
      if (isPaidEvent && b.iswapaid) {
        console.log(`Skipping notification: PAYMENT_SUCCESS already sent for booking ${bookingCode}`);
        return;
      }
    }

    // 1. Adjust triggerEvent for specific BOOKING_CREATED templates
    let actualTrigger = triggerEvent;
    if (triggerEvent === "BOOKING_CREATED" && paymentMethodCode) {
      const codeLower = paymentMethodCode.toLowerCase();
      if (codeLower.includes("qris")) {
        actualTrigger = "BOOKING_CREATED_QRIS";
      } else if (["dana", "ovo", "gopay", "shopeepay", "linkaja", "shopee"].includes(codeLower)) {
        actualTrigger = "BOOKING_CREATED_EWALLET";
      } else if (["bca", "bri", "bni", "mandiri", "bjb", "bsi", "permata", "bnc"].includes(codeLower)) {
        actualTrigger = "BOOKING_CREATED_VA";
      }
    }

    // 2. Fetch template
    const templateRes = await pool.query(
      "SELECT * FROM notif_templates WHERE trigger_event = $1 AND is_active = true LIMIT 1",
      [actualTrigger]
    );
    if (templateRes.rows.length === 0) {
      console.log(`No active template found for trigger: ${actualTrigger}`);
      return;
    }
    const template = templateRes.rows[0];

    // 3. Fetch customer details
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
    if (!recipient || recipient.startsWith("G-") || recipient.includes("belum")) {
      console.log(`Skipping WA notification for ${customer.name}: phone number is placeholder/invalid (${recipient})`);
      return;
    }

    // 4. Get field details
    let fieldName = "Lapangan Futsal";
    let adminBankName = "";
    let adminBankAccount = "";
    let adminBankOwner = "";
    let paymentMethodsJson = [];
    let bookingDateStr = "";
    let startHourStr = "";
    let endHourStr = "";
    const fieldRes = await pool.query(
      `SELECT f.name as field_name, f.bank_name, f.bank_account, f.bank_owner, f.payment_methods,
              b.booking_date, b.start_hour, b.end_hour 
       FROM bookings b 
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
      if (fieldRes.rows[0].booking_date) {
        bookingDateStr = new Date(fieldRes.rows[0].booking_date).toLocaleDateString("id-ID", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      }
      startHourStr = fieldRes.rows[0].start_hour ? fieldRes.rows[0].start_hour.toString().padStart(2, "0") : "";
      endHourStr = fieldRes.rows[0].end_hour ? fieldRes.rows[0].end_hour.toString().padStart(2, "0") : "";
    }

    // 5. Resolve payment method display details
    let paymentMethodName = "Transfer Bank";
    let paymentMethodDetail = "-";
    let paymentOwner = adminBankOwner || "Yayasan Peduli Sesama";

    if (paymentMethodCode?.startsWith("custom_admin_")) {
      const idxStr = paymentMethodCode.replace("custom_admin_", "");
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
    } else if (paymentMethodCode?.toLowerCase().includes("qris")) {
      paymentMethodName = "QRIS (Xendit)";
      paymentMethodDetail = "Silakan klik link pembayaran yang dikirimkan.";
    } else if (paymentMethodCode) {
      const codeLower = paymentMethodCode.toLowerCase();
      if (codeLower === "bca") {
        paymentMethodName = "Bank BCA";
        paymentMethodDetail = "1234567890";
      } else if (codeLower === "bri") {
        paymentMethodName = "Bank BRI";
        paymentMethodDetail = "9876543210";
      } else if (codeLower === "dana") {
        paymentMethodName = "DANA";
        paymentMethodDetail = "081234567890";
      }
    }

    if (paymentDetailsOverride) {
      paymentMethodDetail = paymentDetailsOverride;
    }

    // 6. Replace placeholders in content
    let message = template.content
      .replace(/\{\{name\}\}/g, customer.name)
      .replace(/\{\{booking_code\}\}/g, bookingCode)
      .replace(/\{\{total_price\}\}/g, Number(totalPrice).toLocaleString("id-ID"))
      .replace(/\{\{field_name\}\}/g, fieldName)
      .replace(/\{\{payment_method\}\}/g, paymentMethodName)
      .replace(/\{\{payment_destination\}\}/g, paymentMethodDetail)
      .replace(/\{\{payment_detail\}\}/g, paymentMethodDetail)
      .replace(/\{\{payment_owner\}\}/g, paymentOwner)
      .replace(/\{\{booking_date\}\}/g, bookingDateStr)
      .replace(/\{\{start_hour\}\}/g, startHourStr)
      .replace(/\{\{end_hour\}\}/g, endHourStr);

    // 7. Call Fonnte API
    const fonnteToken = process.env.FONNTE_TOKEN || "";

    const formData = new FormData();
    formData.append("target", recipient);
    formData.append("message", message);
    formData.append("countryCode", "62");

    let resPayload = "";
    let status = "FAILED";

    try {
      const response = await fetch("https://api.fonnte.com/send", {
        method: "POST",
        headers: {
          Authorization: fonnteToken,
        },
        body: formData,
      });
      const result = await response.json();
      resPayload = JSON.stringify(result);
      if (result.status === true || result.status === "true") {
        status = "SUCCESS";

        // 8. Update database flags on success
        if (isCheckoutEvent) {
          await pool.query("UPDATE bookings SET iswacheckout = true WHERE booking_code = $1", [bookingCode]);
        } else if (isPaidEvent) {
          await pool.query("UPDATE bookings SET iswapaid = true WHERE booking_code = $1", [bookingCode]);
        }
      }
    } catch (apiErr: any) {
      console.error("Fonnte API fetch error:", apiErr);
      resPayload = JSON.stringify({ error: apiErr.message });
    }

    // 9. Log notification
    await pool.query(
      `INSERT INTO notif_logs (customer_id, template_id, recipient, request_payload, response_payload, status, type)
       VALUES ($1, $2, $3, $4, $5, $6, 'WHATSAPP')`,
      [customerId, template.id, recipient, JSON.stringify({ target: recipient, message, countryCode: "62" }), resPayload, status]
    );

    console.log(`WhatsApp Notification sent to ${recipient} via Fonnte. Status: ${status}`);
  } catch (err) {
    console.error("Error in sendWhatsAppNotification:", err);
  }
}
