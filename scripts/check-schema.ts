import { Pool } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkSchema() {
  const r = await pool.query(
    `SELECT column_name, data_type FROM information_schema.columns WHERE table_name='bookings' ORDER BY ordinal_position`
  );
  console.log("Bookings columns:");
  r.rows.forEach(row => console.log(` - ${row.column_name} (${row.data_type})`));
  await pool.end();
}

checkSchema().catch(console.error);
