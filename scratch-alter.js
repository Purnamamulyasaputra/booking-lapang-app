const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL);

async function run() {
  try {
    await sql`ALTER TABLE fields RENAME COLUMN material TO facilities`;
    console.log("Column renamed successfully!");
    // but wait, its type is varchar(100), let's change to text[]
    await sql`ALTER TABLE fields ALTER COLUMN facilities TYPE text[] USING string_to_array(facilities, ',')`;
    console.log("Column type changed to text array!");
  } catch(e) {
    console.error(e);
  }
}
run();
