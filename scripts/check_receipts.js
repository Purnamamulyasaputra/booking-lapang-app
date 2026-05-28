const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function check() {
  const res = await pool.query(
    "SELECT id, booking_code, status, receipt_img FROM bookings ORDER BY created_at DESC LIMIT 10"
  );
  console.table(res.rows.map(r => ({
    id: r.id,
    code: r.booking_code,
    status: r.status,
    receipt: r.receipt_img ? r.receipt_img.substring(0, 50) + '...' : 'NULL'
  })));
  await pool.end();
}

check().catch(console.error);
