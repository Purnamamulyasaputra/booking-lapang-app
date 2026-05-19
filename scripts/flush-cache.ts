import { Redis } from "@upstash/redis";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const redis = new Redis({
  url: process.env.a_KV_REST_API_URL!,
  token: process.env.a_KV_REST_API_TOKEN!,
});

async function flushFieldsCache() {
  console.log("Flushing fields cache...");
  await redis.del("fields:public");
  await redis.del("fields:all");
  // Also flush all admin caches
  const keys = await redis.keys("fields:admin:*");
  if (keys.length > 0) {
    for (const key of keys) {
      await redis.del(key);
    }
    console.log(`Deleted ${keys.length} admin cache keys`);
  }
  console.log("Done! All fields cache cleared.");
}

flushFieldsCache().catch(console.error);
