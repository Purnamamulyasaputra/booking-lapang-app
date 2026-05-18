# AI Agent Instruction Context

As an AI Developer Agent (Cursor, Windsurf, etc.), you are tasked with building the Futsal Field Booking System based on a very specific architecture. STRICTLY FOLLOW THESE RULES.

## HARD CONSTRAINTS:
1. **Raw SQL ONLY**: It is strictly forbidden to use Prisma, TypeORM, or Drizzle for operational queries inside the application source code. You MUST write Raw SQL using `@neondatabase/serverless` (or `pg`). Drizzle is ONLY allowed in the `scripts/` folder for `db push/migrate/seed`.
2. **API Isolation**: No database connection functions can be called directly from within React Components. All DB connections must be in `app/api/.../route.ts`. The frontend calls the backend purely via REST APIs (`fetch` or SWR/React Query).
3. **Mandatory Tech Stack**: 
   - Framework: Next.js App Router
   - Hosting: Vercel
   - DB: Neon Postgre
   - Cache: Upstash Redis
   - Storage: Vercel Blob
   - Payment: Xendit
   - UI: Tailwind, `lucide-react`, `recharts`.
4. **UX Performance**: Ensure the UI renders instantly. Use loading states (skeletons) during API fetching. Transitions must be designed to be super fast (0 delay feel).

## WORKFLOW:
1. Setup Env & Dependencies (Next.js, Neon Serverless, Redis, Vercel Blob, Xendit).
2. Write Drizzle Migration Files ONLY to create table structures (according to schema V3).
3. Create API Routes (`api/fields/route.ts`, `api/bookings/route.ts`, etc.) with Raw SQL.
4. Implement Upstash Redis cache inside GET API endpoints for `fields`.
5. Build UI Components and consume those APIs.
