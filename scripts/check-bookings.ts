import { Pool } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkBookings() {
  const r = await pool.query(`
    SELECT b.id, b.booking_code, b.customer_id, b.status, c.name as customer_name, c.email as customer_email
    FROM bookings b
    LEFT JOIN customers c ON b.customer_id = c.id
  `);
  console.log("All bookings in DB:");
  r.rows.forEach(row => console.log(JSON.stringify(row)));
  await pool.end();
}

checkBookings().catch(console.error);
