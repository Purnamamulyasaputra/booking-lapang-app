import { Pool } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  console.log("Running migration: remove unique constraint from customers.phone...");
  try {
    // Drop unique constraint
    await pool.query(`
      ALTER TABLE customers 
      DROP CONSTRAINT IF EXISTS customers_phone_unique;
    `);
    // Drop index if exists (safety fallback)
    await pool.query(`
      DROP INDEX IF EXISTS customers_phone_unique;
    `);
    console.log("Migration complete: customers.phone unique constraint removed successfully.");
  } catch (error) {
    console.error("Migration error:", error);
  } finally {
    await pool.end();
  }
}

migrate();
