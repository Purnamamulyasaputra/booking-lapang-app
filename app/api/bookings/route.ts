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
      SELECT b.*, f.name as field_name, f.images as field_images, c.name as customer_name, COALESCE(b.customer_phone, c.phone) as customer_phone
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
  paymentMethodCode?: string,
  paymentDetailsOverride?: string
) {
  try {
    // 0. Adjust triggerEvent for specific BOOKING_CREATED templates
    let actualTrigger = triggerEvent;
    if (triggerEvent === 'BOOKING_CREATED' && paymentMethodCode) {
      const codeLower = paymentMethodCode.toLowerCase();
      if (codeLower.includes('qris')) {
        actualTrigger = 'BOOKING_CREATED_QRIS';
      } else if (['dana', 'ovo', 'gopay', 'shopeepay', 'linkaja', 'shopee'].includes(codeLower)) {
        actualTrigger = 'BOOKING_CREATED_EWALLET';
      } else if (['bca', 'bri', 'bni', 'mandiri', 'bjb', 'bsi', 'permata', 'bnc'].includes(codeLower)) {
        actualTrigger = 'BOOKING_CREATED_VA';
      }
    }

    // 1. Fetch template
    const templateRes = await pool.query(
      "SELECT * FROM notif_templates WHERE trigger_event = $1 AND is_active = true LIMIT 1",
      [actualTrigger]
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
        bookingDateStr = new Date(fieldRes.rows[0].booking_date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      }
      startHourStr = fieldRes.rows[0].start_hour ? fieldRes.rows[0].start_hour.toString().padStart(2, '0') : "";
      endHourStr = fieldRes.rows[0].end_hour ? fieldRes.rows[0].end_hour.toString().padStart(2, '0') : "";
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
    } else if (paymentMethodCode?.toLowerCase().includes('qris')) {
      // XENDIT INTEGRATION
      paymentMethodName = "QRIS (Xendit)";
      paymentMethodDetail = "Silakan klik link pembayaran yang dikirimkan.";
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

    if (paymentDetailsOverride) {
      paymentMethodDetail = paymentDetailsOverride;
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
      .replace(/\{\{payment_owner\}\}/g, paymentOwner)
      .replace(/\{\{booking_date\}\}/g, bookingDateStr)
      .replace(/\{\{start_hour\}\}/g, startHourStr)
      .replace(/\{\{end_hour\}\}/g, endHourStr);

    // 6. Call Fonnte API
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
          "Authorization": fonnteToken
        },
        body: formData
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
      [customerId, template.id, recipient, JSON.stringify({ target: recipient, message, countryCode: "62" }), resPayload, status]
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
      `INSERT INTO bookings (booking_code, customer_id, field_id, booking_date, start_hour, end_hour, total_price, receipt_img, status, customer_phone)
       VALUES ($1, $2, $3, $4::date, $5, $6, $7, $8, 'MENUNGGU', $9) RETURNING *`,
      [bookingCode, resolvedCustomerId, fieldId, bookingDate, startHour, endHour, totalPrice, receiptImg || null, customerPhone || null]
    );

    const booking = result.rows[0];

    // XENDIT INTEGRATION
    let xenditResponseData = null;
    let paymentMethodName = paymentMethodCode?.toLowerCase() || '';
    let paymentDetailsOverride = "";
    const paymentMethodId = body.paymentMethodId;

    try {
      const xenditApiKey = process.env.XENDIT_API_KEY || '';
      if (xenditApiKey && (paymentMethodName || paymentMethodId)) {
        const xenditAuth = Buffer.from(xenditApiKey + ':').toString('base64');

        let isQRIS = paymentMethodName.toLowerCase().includes('qris');
        let isEwallet = !isQRIS && /dana|gopay|ovo|shopee|linkaja|ewallet/i.test(paymentMethodName);
        let isOTC = !isQRIS && !isEwallet && /alfamart|indomaret|gerai retail|retail/i.test(paymentMethodName);
        let isVA = !isQRIS && !isEwallet && !isOTC;
        let channel = "BRI";

        // Use DB Payment Method if paymentMethodId is provided
        if (paymentMethodId) {
          const pmCheck = await pool.query("SELECT * FROM payment_methods WHERE id = $1", [paymentMethodId]);
          if (pmCheck.rows.length > 0) {
            const dbPm = pmCheck.rows[0];
            if (dbPm.type === 'VIRTUAL_ACCOUNT' || dbPm.type === 'Virtual Account' || dbPm.type === 'Bank Transfer') {
              isVA = true;
              isEwallet = false;
              isQRIS = false;
              isOTC = false;
              channel = dbPm.code.replace('_VA', '');
            } else if (dbPm.type === 'EWALLET' || dbPm.type === 'E_WALLET' || dbPm.type === 'E-Wallet') {
              isEwallet = true;
              isVA = false;
              isQRIS = false;
              isOTC = false;
              channel = dbPm.code.replace('_EWALLET', '').replace('EWALLET_', '').replace('_E_WALLET', '').replace('E_WALLET_', '');
            } else if (dbPm.type === 'QR_CODE' || dbPm.type === 'QRIS') {
              isQRIS = true;
              isVA = false;
              isEwallet = false;
              isOTC = false;
              channel = "DANA"; // default QRIS channel in Xendit
            } else if (dbPm.type === 'OVER_THE_COUNTER' || dbPm.type === 'Gerai Retail' || dbPm.type === 'RETAIL') {
              isOTC = true;
              isVA = false;
              isEwallet = false;
              isQRIS = false;
              channel = dbPm.name.toUpperCase();
              if (channel.includes('ALFA')) channel = 'ALFAMART';
              else if (channel.includes('INDO')) channel = 'INDOMARET';
            }
          }
        } else {
          // Fallback heuristic if no ID provided
          if (paymentMethodName.includes('bca')) channel = "BCA";
          else if (paymentMethodName.includes('mandiri')) channel = "MANDIRI";
          else if (paymentMethodName.includes('bni')) channel = "BNI";
          else if (paymentMethodName.includes('bsi')) channel = "BSI";
          else if (paymentMethodName.includes('bjb')) channel = "BJB";
          else if (paymentMethodName.includes('bnc') || paymentMethodName.includes('neo')) channel = "BNC";
          else if (paymentMethodName.includes('muamalat')) channel = "MUAMALAT";
          else if (paymentMethodName.includes('sahabat_sampoerna')) channel = "SAHABAT_SAMPOERNA";
          else if (paymentMethodName.includes('permata')) channel = "PERMATA";
          else if (isOTC) {
            if (paymentMethodName.toLowerCase().includes('indo')) channel = "INDOMARET";
            else channel = "ALFAMART";
          }
        }

        let xenditPayload: any = {
          currency: "IDR",
          amount: totalPrice,
          reference_id: bookingCode,
          metadata: {
            booking_id: booking.id,
            customer_id: resolvedCustomerId,
            payment_method_id: paymentMethodId || null
          }
        };

        if (isQRIS) {
          xenditPayload.payment_method = {
            type: "QR_CODE",
            reusability: "ONE_TIME_USE",
            qr_code: { channel_code: channel || "DANA" }
          };
          xenditPayload.description = `Pembayaran Lapangan ${bookingCode}`;
        } else if (isEwallet) {
          if (!paymentMethodId) {
            channel = "DANA";
            if (paymentMethodName.includes('ovo')) channel = "OVO";
            else if (paymentMethodName.includes('gopay')) channel = "GOPAY";
            else if (paymentMethodName.includes('shopee')) channel = "SHOPEEPAY";
            else if (paymentMethodName.includes('linkaja')) channel = "LINKAJA";
          }

          // Format phone number to E.164 format (+628...) for Xendit e-wallet triggers
          let formattedPhone = customerPhone || "";
          if (formattedPhone.startsWith('0')) {
            formattedPhone = '+62' + formattedPhone.slice(1);
          } else if (formattedPhone && !formattedPhone.startsWith('+')) {
            formattedPhone = '+' + formattedPhone;
          }

          const channelProps: any = {
            success_return_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/payment-success?booking=${bookingCode}`
          };

          // OVO and Gopay work best when mobile_number is passed in channel_properties
          if (formattedPhone) {
            channelProps.mobile_number = formattedPhone;
          }

          xenditPayload.country = "ID";
          xenditPayload.payment_method = {
            type: "EWALLET",
            reusability: "ONE_TIME_USE",
            ewallet: {
              channel_code: channel,
              channel_properties: channelProps
            }
          };
        } else if (isVA) {
          // Get customer name for VA
          const custCheck = await pool.query("SELECT name FROM customers WHERE id = $1", [resolvedCustomerId]);
          const custName = custCheck.rows.length > 0 ? custCheck.rows[0].name : "Booking Customer";

          xenditPayload.payment_method = {
            type: "VIRTUAL_ACCOUNT",
            reusability: "ONE_TIME_USE",
            reference_id: `pm-level-${bookingCode}-${Date.now()}`,
            virtual_account: {
              channel_code: channel,
              channel_properties: {
                customer_name: custName
              }
            }
          };
        } else if (isOTC) {
          // Get customer name for OTC
          const custCheck = await pool.query("SELECT name FROM customers WHERE id = $1", [resolvedCustomerId]);
          const custName = custCheck.rows.length > 0 ? custCheck.rows[0].name : "Booking Customer";

          xenditPayload.payment_method = {
            type: "OVER_THE_COUNTER",
            reusability: "ONE_TIME_USE",
            reference_id: `pm-otc-${bookingCode}-${Date.now()}`,
            over_the_counter: {
              channel_code: channel,
              channel_properties: {
                customer_name: custName
              }
            }
          };
        }

        const xenditRes = await fetch("https://api.xendit.co/payment_requests", {
          method: "POST",
          headers: {
            "Authorization": `Basic ${xenditAuth}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(xenditPayload)
        });

        if (xenditRes.ok) {
          xenditResponseData = await xenditRes.json();

          let qrStringOrUrl = "";
          let receiptImgToSave = "";

          // For eWallet (GOPAY, OVO, DANA etc) - get checkout URL or QR from actions
          if (xenditResponseData.actions && xenditResponseData.actions.length > 0) {
            // Priority: QR checkout string > mobile deeplink > web checkout
            const qrAction = xenditResponseData.actions.find((a: any) =>
              a.action === 'QR_CHECKOUT_STRING' || a.url_type === 'QR_CODE'
            );
            const deeplinkAction = xenditResponseData.actions.find((a: any) =>
              a.action === 'MOBILE_DEEPLINK_CHECKOUT_URL' || a.url_type === 'DEEPLINK'
            );
            const webAction = xenditResponseData.actions.find((a: any) =>
              a.action === 'MOBILE_WEB_CHECKOUT_URL' || a.action === 'DESKTOP_WEB_CHECKOUT_URL' ||
              a.action === 'BROWSER_CHECKOUT_URL' || a.url_type === 'WEB'
            );

            if (qrAction) qrStringOrUrl = qrAction.url || qrAction.qr_code || "";
            else if (deeplinkAction) qrStringOrUrl = deeplinkAction.url || "";
            else if (webAction) qrStringOrUrl = webAction.url || "";
            else qrStringOrUrl = xenditResponseData.actions[0]?.url || "";
          }

          // Also check nested ewallet channel_properties for QR
          const ewalletProps = xenditResponseData.payment_method?.ewallet?.channel_properties || {};
          if (!qrStringOrUrl && ewalletProps.qr_checkout_string) {
            qrStringOrUrl = ewalletProps.qr_checkout_string;
          }
          if (!qrStringOrUrl && (ewalletProps.mobile_deeplink_checkout_url || ewalletProps.desktop_web_checkout_url)) {
            qrStringOrUrl = ewalletProps.mobile_deeplink_checkout_url || ewalletProps.desktop_web_checkout_url;
          }

          // For QRIS QR_CODE type
          if (!qrStringOrUrl && xenditResponseData.payment_method?.qr_code?.channel_properties?.qr_string) {
            qrStringOrUrl = xenditResponseData.payment_method.qr_code.channel_properties.qr_string;
          }

          const channelCodeUpper = (channel || "").toUpperCase();

          if (isVA && xenditResponseData.payment_method?.virtual_account?.channel_properties?.virtual_account_number) {
            paymentDetailsOverride = xenditResponseData.payment_method.virtual_account.channel_properties.virtual_account_number;
            receiptImgToSave = `VA_NUMBER:${paymentMethodName}:${paymentDetailsOverride}`;
          } else if (isOTC && xenditResponseData.payment_method?.over_the_counter?.channel_properties?.payment_code) {
            paymentDetailsOverride = xenditResponseData.payment_method.over_the_counter.channel_properties.payment_code;
            receiptImgToSave = `RETAIL_OUTLET:${channelCodeUpper}:${paymentDetailsOverride}`;
          } else if (isEwallet && qrStringOrUrl) {
            paymentDetailsOverride = `Silakan selesaikan pembayaran melalui link berikut: ${qrStringOrUrl}`;
            receiptImgToSave = `CHECKOUT_URL:${qrStringOrUrl}`;
          } else if (isEwallet && channelCodeUpper === 'OVO') {
            paymentDetailsOverride = `Silakan selesaikan pembayaran melalui aplikasi OVO Anda (Notifikasi Push).`;
            receiptImgToSave = `CHECKOUT_URL:OVO_PUSH`;
          } else if (isEwallet) {
            // Fallback checkout URL for other e-wallets if URL couldn't be parsed
            const fallbackUrl = xenditResponseData.actions?.[0]?.url || "";
            paymentDetailsOverride = fallbackUrl ? `Silakan selesaikan pembayaran melalui link berikut: ${fallbackUrl}` : `Silakan selesaikan pembayaran melalui aplikasi E-Wallet Anda.`;
            receiptImgToSave = `CHECKOUT_URL:${fallbackUrl || 'EWALLET_PUSH'}`;
          } else if (isQRIS && qrStringOrUrl) {
            paymentDetailsOverride = `Silakan scan QRIS untuk pembayaran. Kode QR telah dikirim ke aplikasi.`;
            receiptImgToSave = `QR_STRING:${qrStringOrUrl}`;
          }

          const xenditId = xenditResponseData?.id || null;
          if (receiptImgToSave) {
            await pool.query("UPDATE bookings SET status = 'MENUNGGU PEMBAYARAN', receipt_img = $1, xendit_id = $2 WHERE id = $3", [receiptImgToSave, xenditId, booking.id]);
            booking.receipt_img = receiptImgToSave;
          } else {
            await pool.query("UPDATE bookings SET status = 'MENUNGGU PEMBAYARAN', xendit_id = $1 WHERE id = $2", [xenditId, booking.id]);
          }
          booking.status = 'MENUNGGU PEMBAYARAN';

          // Log payment
          await pool.query(
            "INSERT INTO payment_logs (booking_id, invoice_code, amount, status, log_message) VALUES ($1, $2, $3, $4, $5)",
            [booking.id, xenditResponseData.id || bookingCode, totalPrice, 'PENDING', `Payment request created via ${paymentMethodName}`]
          );

        } else {
          console.error("Xendit API Error:", await xenditRes.text());
        }
      }
    } catch (xErr) {
      console.error("Error calling Xendit:", xErr);
    }

    // Attach xendit response to the returned booking object
    booking.xendit = xenditResponseData;


    // Trigger WhatsApp notification for BOOKING_CREATED in the background with dynamic paymentMethodCode
    sendWhatsAppNotification(resolvedCustomerId, bookingCode, totalPrice, 'BOOKING_CREATED', paymentMethodCode, paymentDetailsOverride).catch(err => {
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
    const { id, status, receiptImg, customerPhone } = await req.json();
    let result;

    if (customerPhone) {
      result = await pool.query(
        `UPDATE bookings SET customer_phone = $1 WHERE id = $2 RETURNING *`,
        [customerPhone, id]
      );
    } else if (receiptImg) {
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

    if (updatedBooking) {
      const lowerStatus = updatedBooking.status.toLowerCase();
      if (lowerStatus === 'dikonfirmasi') {
        await pool.query("UPDATE payment_logs SET status = 'SUCCESS', log_message = 'Pembayaran berhasil dikonfirmasi' WHERE booking_id = $1", [id]);
      } else if (lowerStatus === 'ditolak') {
        await pool.query("UPDATE payment_logs SET status = 'FAILED', log_message = 'Booking ditolak oleh admin' WHERE booking_id = $1", [id]);
      }
    }

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

    // Fetch booking details first
    const bookingRes = await pool.query(`SELECT booking_code, status FROM bookings WHERE id = $1`, [id]);
    if (bookingRes.rows.length === 0) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const bookingCode = bookingRes.rows[0].booking_code;

    // Attempt to cancel Xendit Payment Request
    if (process.env.XENDIT_API_KEY) {
      try {
        const xenditAuth = Buffer.from(process.env.XENDIT_API_KEY + ":").toString('base64');

        // 1. Find the payment request by reference_id
        const listRes = await fetch(`https://api.xendit.co/payment_requests?reference_id=${bookingCode}`, {
          method: "GET",
          headers: {
            "Authorization": `Basic ${xenditAuth}`
          }
        });

        if (listRes.ok) {
          const listData = await listRes.json();
          if (listData && listData.data && listData.data.length > 0) {
            // Find the active/pending one
            const pr = listData.data.find((p: any) => p.status === 'PENDING' || p.status === 'REQUIRES_ACTION' || p.status === 'ACTIVE');
            if (pr) {
              // 2. Void/Cancel the payment request
              const cancelRes = await fetch(`https://api.xendit.co/payment_requests/${pr.id}/cancel`, {
                method: "POST",
                headers: {
                  "Authorization": `Basic ${xenditAuth}`,
                  "Content-Type": "application/json"
                }
              });

              if (!cancelRes.ok) {
                console.error(`Failed to cancel Xendit PR ${pr.id}:`, await cancelRes.text());
              } else {
                console.log(`Successfully cancelled Xendit PR ${pr.id}`);
              }
            }
          }
        } else {
          console.error("Failed to list Xendit payment requests:", await listRes.text());
        }
      } catch (xErr) {
        console.error("Error connecting to Xendit during cancellation:", xErr);
        // Continue to cancel booking in database even if Xendit void fails
      }
    }

    const result = await pool.query(
      `UPDATE bookings SET status = 'DIBATALKAN' WHERE id = $1 RETURNING *`,
      [id]
    );

    // Update payment log if exists
    await pool.query(
      "UPDATE payment_logs SET status = 'FAILED', log_message = 'Booking dibatalkan' WHERE booking_id = $1",
      [id]
    );

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error("Error cancelling booking:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
