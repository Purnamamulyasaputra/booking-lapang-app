"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Mail, Lock, ArrowRight } from "lucide-react";

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") === "NotAdmin") {
      setError("Akun Google Anda tidak terdaftar sebagai Admin!");
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await signIn("admin-login", {
      redirect: false,
      email,
      password,
    });

    if (res?.error) {
      setError("Email atau password admin salah");
    } else {
      router.push("/panel");
      router.refresh();
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f172a] p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500"></div>
        <div className="p-8">
          <div className="flex justify-center mb-6">
            <div className="bg-[#0f172a] p-3 rounded-2xl flex items-center justify-center">
              <ShieldCheck className="w-10 h-10 text-emerald-400" />
            </div>
          </div>
          <h2 className="text-2xl font-extrabold text-center text-gray-900 mb-1">
            Admin Panel
          </h2>
          <p className="text-center text-gray-500 mb-8 text-sm font-medium">
            Masuk untuk mengelola sistem Booking Lapang
          </p>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm font-bold p-3 rounded-xl mb-6 text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                required
                placeholder="Email Admin"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all font-medium bg-gray-50 focus:bg-white text-black"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                required
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all font-medium bg-gray-50 focus:bg-white text-black"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0f172a] hover:bg-slate-800 text-white font-bold py-4 rounded-xl transition-colors flex items-center justify-center disabled:opacity-70 mt-4 cursor-pointer"
            >
              {loading ? "Memverifikasi..." : "Login ke Dashboard"}
              {!loading && <ArrowRight className="w-5 h-5 ml-2 text-emerald-400" />}
            </button>
          </form>

          <div className="relative flex py-5 items-center">
            <div className="flex-grow border-t border-gray-200"></div>
            <span className="flex-shrink mx-4 text-gray-400 font-bold text-xs uppercase">atau</span>
            <div className="flex-grow border-t border-gray-200"></div>
          </div>

          <button
            onClick={() => signIn("google", { callbackUrl: "/panel" })}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-700 font-bold py-3.5 px-4 rounded-xl border border-gray-200 shadow-sm transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.435 0-6.223-2.77-6.223-6.199 0-3.428 2.788-6.199 6.223-6.199 1.492 0 2.856.525 3.931 1.393l3.053-3.03C19.043 2.115 15.82 1 12.24 1 6.033 1 1 5.998 1 12.174c0 6.177 5.033 11.174 11.24 11.174 5.86 0 10.843-4.148 10.843-11.174 0-.742-.075-1.423-.21-1.888H12.24Z"
              />
            </svg>
            Lanjutkan dengan Google
          </button>

          {/* <div className="mt-8 text-center">
            <button onClick={() => router.push('/')} className="text-sm font-bold text-gray-400 hover:text-emerald-600 transition-colors">
              &larr; Kembali ke Website
            </button>
          </div> */}
        </div>
      </div>
    </div>
  );
}
