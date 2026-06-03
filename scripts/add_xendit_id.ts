import { Pool } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    await pool.query("ALTER TABLE bookings ADD COLUMN xendit_id VARCHAR(255) NULL;");
    console.log("Successfully added xendit_id column to bookings table.");
  } catch (error: any) {
    if (error.code === '42701') {
       console.log("Column xendit_id already exists.");
    } else {
       console.error("Error adding column:", error);
    }
  } finally {
    await pool.end();
  }
}
run();
