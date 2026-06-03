"use client";

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const bookingCode = searchParams.get('booking');
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'success' | 'failed' | 'checking'>('checking');

  useEffect(() => {
    if (!bookingCode) {
      setLoading(false);
      setStatus('failed');
      return;
    }

    const checkPayment = async () => {
      try {
        const res = await fetch(`/api/bookings/check-payment?bookingCode=${bookingCode}`);
        const data = await res.json();
        if (data.success) {
          setStatus('success');
        } else {
          setStatus('failed');
        }
      } catch (err) {
        console.error("Failed to check payment status:", err);
        setStatus('failed');
      } finally {
        setLoading(false);
      }
    };

    checkPayment();
  }, [bookingCode]);

  const handleRetry = async () => {
    setLoading(true);
    setStatus('checking');
    try {
      const res = await fetch(`/api/bookings/check-payment?bookingCode=${bookingCode}`);
      const data = await res.json();
      if (data.success) {
        setStatus('success');
      } else {
        setStatus('failed');
      }
    } catch (err) {
      console.error("Failed to retry check payment:", err);
      setStatus('failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center border border-gray-100">
      {loading ? (
        <div className="flex flex-col items-center justify-center py-6">
          <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mb-4" />
          <h1 className="text-xl font-extrabold text-gray-900 mb-2">Memverifikasi Pembayaran...</h1>
          <p className="text-gray-500 text-sm">Mohon tunggu sebentar selagi kami mengonfirmasi transaksi Anda.</p>
        </div>
      ) : status === 'success' ? (
        <>
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
          </div>
          
          <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Pembayaran Berhasil!</h1>
          <p className="text-gray-500 mb-6 text-sm">
            Terima kasih, pembayaran untuk pesanan <span className="font-bold text-emerald-600">{bookingCode}</span> telah kami terima.
          </p>

          <Link 
            href="/"
            className="block w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl transition-all shadow-md active:scale-95 text-center"
          >
            Kembali ke Beranda
          </Link>
        </>
      ) : (
        <>
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-10 h-10 text-red-600" />
          </div>
          
          <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Gagal Memverifikasi</h1>
          <p className="text-gray-500 mb-6 text-sm">
            Pembayaran untuk pesanan <span className="font-bold text-red-600">{bookingCode || 'Anda'}</span> belum berhasil dikonfirmasi. Silakan hubungi admin atau coba beberapa saat lagi.
          </p>

          <div className="space-y-3">
            <button 
              onClick={handleRetry}
              className="block w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl transition-all shadow-md text-center"
            >
              Coba Lagi
            </button>
            <Link 
              href="/"
              className="block w-full py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-extrabold rounded-xl transition-all text-center"
            >
              Kembali ke Beranda
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <Suspense fallback={
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center border border-gray-100 flex flex-col items-center justify-center py-6">
          <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mb-4" />
          <h1 className="text-xl font-extrabold text-gray-900 mb-2">Loading...</h1>
        </div>
      }>
        <PaymentSuccessContent />
      </Suspense>
    </div>
  );
}
