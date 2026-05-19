import { Pool } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  console.log("Running migration: add admin_id to fields...");
  try {
    await pool.query(`
      ALTER TABLE fields 
      ADD COLUMN IF NOT EXISTS admin_id INTEGER REFERENCES admins(id) ON DELETE SET NULL;
    `);
    console.log("Migration complete: admin_id column added to fields.");
  } catch (error) {
    console.error("Migration error:", error);
  } finally {
    await pool.end();
  }
}

migrate();
