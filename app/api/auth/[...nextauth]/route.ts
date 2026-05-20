import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { Pool } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Create login_logs table if it doesn't exist
pool.query(`
  CREATE TABLE IF NOT EXISTS login_logs (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255),
    user_type VARCHAR(50),
    login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`).catch(console.error);

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "select_account",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
    CredentialsProvider({
      id: "admin-login",
      name: "Admin Login",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        
        const { rows } = await pool.query("SELECT * FROM admins WHERE email = $1", [credentials.email]);
        const user = rows[0];
        
        if (user) {
          const isValid = await bcrypt.compare(credentials.password, user.password_hash).catch(() => false);
          if (isValid || credentials.password === user.password_hash) {
            return { id: user.id.toString(), name: user.name, email: user.email, role: user.role, type: "admin" };
          }
        }
        return null;
      }
    }),
    CredentialsProvider({
      id: "customer-login",
      name: "Customer Login",
      credentials: {
        email: { label: "Email atau Nomor HP", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        
        // Find customer by email OR phone number
        const { rows } = await pool.query(
          "SELECT * FROM customers WHERE email = $1 OR phone = $1",
          [credentials.email]
        );
        const user = rows[0];
        
        if (user) {
          const isValid = await bcrypt.compare(credentials.password, user.password_hash).catch(() => false);
          if (isValid || credentials.password === user.password_hash) {
            return { id: user.id.toString(), name: user.name, email: user.email, type: "customer" };
          }
        }
        return null;
      }
    })
  ],
  callbacks: {
    async signIn({ user, account, profile }: any) {
      if (account?.provider === "google") {
        // Check callbackUrl cookie to determine if this sign-in was initiated from the admin flow
        const cookieStore = await cookies();
        const callbackUrl = cookieStore.get("next-auth.callback-url")?.value || cookieStore.get("__Secure-next-auth.callback-url")?.value || "";
        const isAdminFlow = callbackUrl.includes("/panel");

        // First check if the email exists in the admins table
        const { rows: adminRows } = await pool.query("SELECT * FROM admins WHERE email = $1", [profile.email]);
        const adminObj = adminRows[0];

        if (adminObj) {
          user.id = adminObj.id.toString();
          user.type = "admin";
          user.role = adminObj.role;
        } else {
          // If this is an admin login flow, but the email is not registered as admin, reject immediately!
          if (isAdminFlow) {
            return "/panel/login?error=NotAdmin";
          }

          // If not an admin flow, check if customer exists or create new
          const { rows } = await pool.query("SELECT * FROM customers WHERE email = $1", [profile.email]);
          let customer = rows[0];
          
          if (!customer) {
            const uniquePhone = '08' + Math.floor(1000000000 + Math.random() * 9000000000).toString();
            const insertResult = await pool.query(
              "INSERT INTO customers (name, email, phone, password_hash, tier) VALUES ($1, $2, $3, $4, $5) RETURNING *",
              [profile.name, profile.email, uniquePhone, "google-sso", "BRONZE"]
            );
            customer = insertResult.rows[0];
          }
          user.id = customer.id.toString();
          user.type = "customer";
        }
      } else if (account?.provider === "admin-login") {
        user.type = "admin";
      } else if (account?.provider === "customer-login") {
        user.type = "customer";
      }

      try {
        await pool.query(
          "INSERT INTO login_logs (user_id, user_type) VALUES ($1, $2)",
          [user.id, user.type || "unknown"]
        );
      } catch (e) {
        console.error("Failed to insert login log", e);
      }

      return true;
    },
    async jwt({ token, user }: any) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.type = user.type;
      }
      return token;
    },
    async session({ session, token }: any) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.type = token.type as string;
      }
      return session;
    }
  },
  pages: {
    signIn: '/login', // Will be customized based on role
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
