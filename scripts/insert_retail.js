const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://neondb_owner:npg_Oi04VjrEYPCu@ep-muddy-wind-aobn4lc0-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require",
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    await pool.query(`
      INSERT INTO payment_methods (id, code, name, type, logo_url, status)
      VALUES 
      (101, 'ALFAMART', 'Alfamart', 'OVER_THE_COUNTER', 'https://assets.xendit.co/payment-session/logos/ALFAMART.svg', 'ACTIVE'),
      (102, 'INDOMARET', 'Indomaret', 'OVER_THE_COUNTER', 'https://assets.xendit.co/payment-session/logos/INDOMARET.svg', 'ACTIVE')
      ON CONFLICT (code) DO UPDATE 
      SET logo_url = EXCLUDED.logo_url;
    `);
    console.log("Success inserting ALFAMART and INDOMARET into payment_methods table.");
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}

main();
