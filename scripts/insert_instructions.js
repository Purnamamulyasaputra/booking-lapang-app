const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://neondb_owner:npg_Oi04VjrEYPCu@ep-muddy-wind-aobn4lc0-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require",
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    await pool.query(`
      INSERT INTO payment_instructions (payment_method_id, title, content, sort_order)
      VALUES 
      (101, 'Panduan Pembayaran', '<ol><li>Datangi gerai Alfamart terdekat.</li><li>Sampaikan ke kasir untuk membayar merchant Xendit / Alfamart.</li><li>Tunjukkan barcode atau kode pembayaran kepada kasir.</li><li>Atas Nama: <strong>{{user_name}}</strong>.</li><li>Bayar sesuai dengan nominal tagihan yang disebutkan oleh kasir dan simpan struk sebagai bukti pembayaran.</li></ol>', 1),
      (102, 'Panduan Pembayaran', '<ol><li>Datangi gerai Indomaret terdekat.</li><li>Sampaikan ke kasir untuk membayar merchant Xendit / Indomaret.</li><li>Tunjukkan barcode atau kode pembayaran kepada kasir.</li><li>Atas Nama: <strong>{{user_name}}</strong>.</li><li>Bayar sesuai dengan nominal tagihan yang disebutkan oleh kasir dan simpan struk sebagai bukti pembayaran.</li></ol>', 1)
      ON CONFLICT DO NOTHING;
    `);
    console.log("Success inserting ALFAMART and INDOMARET instructions into payment_instructions table.");
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}

main();
