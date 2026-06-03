import { Pool } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  console.log("Running migration: add wa notification columns to bookings...");
  try {
    await pool.query(`
      ALTER TABLE bookings 
      ADD COLUMN IF NOT EXISTS iswacheckout BOOLEAN DEFAULT false NOT NULL,
      ADD COLUMN IF NOT EXISTS iswapaid BOOLEAN DEFAULT false NOT NULL;
    `);
    console.log("Migration complete: iswacheckout and iswapaid columns added successfully.");
  } catch (error) {
    console.error("Migration error:", error);
  } finally {
    await pool.end();
  }
}

migrate();
