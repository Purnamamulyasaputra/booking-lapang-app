import { Redis } from "@upstash/redis";

let redisInstance: Redis | null = null;

function createRedis() {
  try {
    const url = process.env.a_KV_REST_API_URL || process.env.KV_REST_API_URL;
    const token = process.env.a_KV_REST_API_TOKEN || process.env.KV_REST_API_TOKEN;
    if (!url || !token) return null;
    return new Redis({ url, token });
  } catch {
    return null;
  }
}

// Noop redis fallback ketika Redis tidak tersedia
const noopRedis = {
  get: async (_key: string) => null,
  set: async (..._args: any[]) => null,
  setex: async (..._args: any[]) => null,
  del: async (..._args: any[]) => null,
};

export const redis = new Proxy(noopRedis as any, {
  get(_target, prop) {
    if (!redisInstance) {
      redisInstance = createRedis();
    }
    if (!redisInstance) {
      return noopRedis[prop as keyof typeof noopRedis];
    }
    const val = (redisInstance as any)[prop];
    if (typeof val === 'function') {
      return async (...args: any[]) => {
        try {
          return await val.apply(redisInstance, args);
        } catch {
          return null;
        }
      };
    }
    return val;
  }
});
