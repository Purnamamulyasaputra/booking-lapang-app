"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

function SimulateCheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const bookingCode = searchParams.get("booking");
  const type = searchParams.get("type");
  const channel = searchParams.get("channel");
  const value = searchParams.get("va") || searchParams.get("value") || "";
  const amount = searchParams.get("amount") || "0";

  const [isPaying, setIsPaying] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handlePayment = async () => {
    if (!bookingCode) return;
    setIsPaying(true);
    setErrorMessage("");
    try {
      const res = await fetch("/api/bookings/simulate-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingCode }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        // Redirect to success page
        router.push(`/payment-success?booking=${bookingCode}`);
      } else {
        setErrorMessage(data.error || "Gagal memproses simulasi pembayaran.");
      }
    } catch (err) {
      console.error(err);
      setErrorMessage("Terjadi kesalahan jaringan.");
    } finally {
      setIsPaying(false);
    }
  };

  if (!bookingCode) {
    return (
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
        <h1 className="text-xl font-bold text-red-600 mb-2">Error</h1>
        <p className="text-gray-600 mb-4">Data pembayaran tidak lengkap.</p>
        <button
          onClick={() => router.push("/")}
          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
        >
          Kembali
        </button>
      </div>
    );
  }

  // Determine method label
  let methodLabel = "Virtual Account Test Payment";
  if (type === "QR_CODE") methodLabel = "QRIS Test Payment";
  if (type === "OVER_THE_COUNTER") methodLabel = "Retail Outlet Test Payment";
  if (type === "EWALLET") methodLabel = "eWallet Test Payment";

  return (
    <div className="w-full max-w-2xl bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
      {/* Header Banner */}
      <div className="bg-[#eef2f5] py-12 px-6 flex flex-col items-center justify-center border-b border-gray-200">
        <div className="h-12 flex items-center justify-center mb-6">
          <svg className="h-8 text-gray-800" viewBox="0 0 200 50" fill="currentColor">
            <text x="10" y="38" fontFamily="sans-serif" fontSize="30" fontWeight="bold" fill="#0f62fe">xendit</text>
            <circle cx="120" cy="18" r="4" fill="#0f62fe" />
            <circle cx="132" cy="28" r="4" fill="#000" />
            <circle cx="144" cy="18" r="4" fill="#0f62fe" />
          </svg>
        </div>
        <h1 className="text-3xl sm:text-4xl font-normal text-gray-800 tracking-tight text-center">
          {methodLabel}
        </h1>
      </div>

      {/* Details Container */}
      <div className="p-8 sm:p-10 flex flex-col items-center">
        <div className="w-full max-w-md space-y-4 mb-8 bg-gray-50 p-6 rounded-xl border border-gray-200/60">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 font-medium">Merchant</span>
            <span className="text-gray-900 font-bold">Booking Lapang</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 font-medium">Booking Code</span>
            <span className="text-gray-900 font-mono font-bold">{bookingCode}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 font-medium">Payment Method</span>
            <span className="text-gray-900 font-bold">{channel || type}</span>
          </div>
          {value && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 font-medium">Account / Pay Code</span>
              <span className="text-gray-900 font-mono font-bold tracking-wider">{value}</span>
            </div>
          )}
          <div className="border-t border-gray-200 pt-3 flex justify-between text-base font-bold">
            <span className="text-gray-700">Amount</span>
            <span className="text-[#0f62fe]">
              Rp {Number(amount).toLocaleString("id-ID")}
            </span>
          </div>
        </div>

        {errorMessage && (
          <div className="w-full max-w-md mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 text-center font-medium">
            {errorMessage}
          </div>
        )}

        {/* Proceed to Pay Button */}
        <button
          onClick={handlePayment}
          disabled={isPaying}
          className="w-full max-w-md py-3.5 bg-[#0f62fe] hover:bg-[#0353e9] disabled:bg-[#0f62fe]/60 text-white font-medium rounded-lg transition-all shadow-md active:scale-95 flex items-center justify-center text-base gap-2 cursor-pointer font-sans"
        >
          {isPaying ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Processing Payment...
            </>
          ) : (
            "Proceed to Pay"
          )}
        </button>

        <button
          onClick={() => router.back()}
          disabled={isPaying}
          className="mt-4 text-sm text-gray-500 hover:text-gray-800 transition-colors font-medium"
        >
          Cancel and return
        </button>
      </div>
    </div>
  );
}

export default function SimulateCheckoutPage() {
  return (
    <div className="min-h-screen bg-[#f3f4f6] flex flex-col items-center justify-center p-4 font-sans">
      <Suspense fallback={
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center flex flex-col items-center">
          <Loader2 className="w-10 h-10 text-[#0f62fe] animate-spin mb-4" />
          <p className="text-gray-600 font-medium">Loading checkout details...</p>
        </div>
      }>
        <SimulateCheckoutContent />
      </Suspense>
    </div>
  );
}
