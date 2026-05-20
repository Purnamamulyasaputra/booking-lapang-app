"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { UserPlus } from "lucide-react";

export default function Register() {
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") === "AlreadyRegistered") {
      setError("Akun Google ini sudah terdaftar. Silakan login.");
    } else if (params.get("error")) {
      setError("Terjadi kesalahan saat mendaftar dengan Google. Silakan coba lagi.");
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden">
        <div className="p-8">
          <div className="flex justify-center mb-8">
            <div className="bg-emerald-100 p-3 rounded-2xl">
              <UserPlus className="w-8 h-8 text-emerald-600" />
            </div>
          </div>
          <h2 className="text-2xl font-extrabold text-center text-gray-900 mb-2">
            Daftar Akun Baru
          </h2>
          <p className="text-center text-gray-500 mb-8 text-sm font-medium">
            Buat akun untuk mempermudah proses pemesanan lapangan Anda
          </p>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm font-bold p-3 rounded-xl mb-6 text-center">
              {error}
            </div>
          )}

          <button
            onClick={() => signIn("google", { callbackUrl: "/?action=register" })}
            className="w-full flex items-center justify-center px-4 py-4 border-2 border-gray-200 rounded-xl hover:bg-gray-50 active:scale-95 transition-all font-bold text-gray-700 cursor-pointer shadow-sm hover:border-gray-300"
          >
            <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 24c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 21.53 7.7 24 12 24z" />
              <path fill="#FBBC05" d="M5.84 15.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V8.06H2.18C1.43 9.55 1 11.22 1 13s.43 3.45 1.18 4.94l3.66-2.84z" />
              <path fill="#EA4335" d="M12 4.64c1.61 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.19 14.97 0 12 0 7.7 0 3.99 2.47 2.18 6.06l3.66 2.84c.87-2.6 3.3-4.26 6.16-4.26z" />
            </svg>
            Daftar dengan Google
          </button>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500 font-medium">
              Sudah punya akun?{' '}
              <a href="/login" className="text-emerald-600 font-bold hover:underline">
                Masuk di sini
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
