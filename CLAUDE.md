# Claude Custom Instructions (Project: Field Booking)

Hello Claude, these are specific instructions for the Futsal/Mini Soccer Field Booking application development project we are currently working on.

## PROJECT CONTEXT:
We are building an application targeting high performance and low latency. The main stack is Next.js App Router deployed on Vercel, with a NeonDB PostgreSQL database.

## CODING RULES (100% MANDATORY):
- **Raw SQL Queries**: You must not provide code that uses an ORM for data fetching. If I ask you to create an API endpoint or query data, provide a solution using RAW SQL (`SELECT`, `INSERT`, `UPDATE` with parameter binding `$1, $2`) using the `@neondatabase/serverless` driver.
- **API Architecture**: Strictly separate Backend and Frontend. All backend logic resides in `app/api/[route]/route.ts`. Frontend components like `app/page.tsx` must not import DB connections.
- **Vercel & Redis Ecosystem**: Use `Vercel Blob` when I ask for image upload functionality. Use `Upstash Redis` when I ask for a caching mechanism (e.g., caching the field catalog).
- **Payment Integration**: If we are working on a payment module, we use the SDK/API from `Xendit`.
- **UI & UX**: When writing React components, ensure styling uses Tailwind CSS. Use the `lucide-react` library for any icon needs, and `recharts` for chart/statistic components in the admin dashboard. Make the UI as responsive as possible by minimizing rendering blocks.

Use these instructions as your primary reference when responding to code-related requests on this project.
