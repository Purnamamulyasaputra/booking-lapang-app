import { Redis } from "@upstash/redis";

export const redis = new Redis({
  url: process.env.a_KV_REST_API_URL || process.env.KV_REST_API_URL!,
  token: process.env.a_KV_REST_API_TOKEN || process.env.KV_REST_API_TOKEN!,
});
