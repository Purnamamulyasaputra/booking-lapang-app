import { Pool } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkCustomers() {
  const r = await pool.query("SELECT * FROM customers");
  console.log("Customers:");
  r.rows.forEach(row => console.log(JSON.stringify(row)));
  
  const a = await pool.query("SELECT * FROM admins");
  console.log("Admins:");
  a.rows.forEach(row => console.log(JSON.stringify(row)));
  
  await pool.end();
}

checkCustomers().catch(console.error);
