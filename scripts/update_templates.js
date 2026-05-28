const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function updateTemplates() {
  const templates = [
    {
      name: 'Pesanan Dibuat (VA)',
      type: 'WHATSAPP',
      triggerEvent: 'BOOKING_CREATED_VA',
      content: `Halo {{name}}, pesanan {{field_name}} Anda dengan ID: {{booking_code}} sedang menunggu pembayaran.

Detail Jadwal:
- Tanggal: {{booking_date}}
- Waktu: {{start_hour}}:00 - {{end_hour}}:00

Detail Tagihan:
- Total: Rp {{total_price}}
- Metode: {{payment_method}} Virtual Account
- Nomor VA: {{payment_details}}

Mohon segera lakukan pembayaran sebelum 5 jam kedepan agar jadwal Anda tidak otomatis dibatalkan oleh sistem.`
    },
    {
      name: 'Pesanan Dibuat (E-Wallet)',
      type: 'WHATSAPP',
      triggerEvent: 'BOOKING_CREATED_EWALLET',
      content: `Halo {{name}}, pesanan {{field_name}} Anda dengan ID: {{booking_code}} sedang menunggu pembayaran.

Detail Jadwal:
- Tanggal: {{booking_date}}
- Waktu: {{start_hour}}:00 - {{end_hour}}:00

Detail Tagihan:
- Total: Rp {{total_price}}
- Metode: {{payment_method}}

Silakan buka aplikasi {{payment_method}} Anda atau cek website kami atau scan di website nya untuk menyelesaikan pembayaran secara langsung. Mohon selesaikan sebelum 5 jam ke depan.`
    },
    {
      name: 'Pesanan Dibuat (QRIS)',
      type: 'WHATSAPP',
      triggerEvent: 'BOOKING_CREATED_QRIS',
      content: `Halo {{name}}, pesanan {{field_name}} Anda dengan ID: {{booking_code}} sedang menunggu pembayaran.

Detail Jadwal:
- Tanggal: {{booking_date}}
- Waktu: {{start_hour}}:00 - {{end_hour}}:00

Detail Tagihan:
- Total: Rp {{total_price}}
- Metode: QRIS

Silakan scan kode QRIS yang tampil di halaman website/aplikasi kami menggunakan aplikasi m-Banking atau E-Wallet Anda. Mohon lakukan pembayaran sebelum 5 jam kedepan.`
    },
    {
      name: 'Pembayaran Sukses',
      type: 'WHATSAPP',
      triggerEvent: 'PAYMENT_SUCCESS',
      content: `Halo {{name}},

Terima kasih! Pembayaran sebesar Rp {{total_price}} untuk pesanan dengan ID: {{booking_code}} telah BERHASIL kami terima.

Detail Jadwal Anda:
- Lapangan: {{field_name}}
- Tanggal: {{booking_date}}
- Waktu: {{start_hour}}:00 - {{end_hour}}:00

Tunjukkan pesan ini kepada petugas kami saat Anda tiba di lokasi. Selamat bermain dan jaga sportivitas!`
    }
  ];

  for (const t of templates) {
    // Delete existing
    await pool.query('DELETE FROM notif_templates WHERE trigger_event = $1', [t.triggerEvent]);
    // Insert new
    await pool.query(
      'INSERT INTO notif_templates (name, type, trigger_event, content, is_active) VALUES ($1, $2, $3, $4, true)',
      [t.name, t.type, t.triggerEvent, t.content]
    );
    console.log(`Updated template: ${t.triggerEvent}`);
  }
  
  await pool.end();
}

updateTemplates().catch(console.error);
