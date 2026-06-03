import { Pool } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const res = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'payment_logs'");
  console.log('Payment logs columns:');
  res.rows.forEach(r => console.log(' - ' + r.column_name + ' (' + r.data_type + ')'));
  await pool.end();
}
run();
