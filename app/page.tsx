// @ts-nocheck
"use client";
import React, { useState, useEffect, useRef } from 'react';
import {
  Search, Calendar, Clock, Star, MapPin, Upload,
  User, LogOut, ArrowLeft, CheckCircle2, XCircle, ShieldCheck,
  Image as ImageIcon, Home, FileText, CheckCircle, Clock3, XOctagon, AlertTriangle, ChevronRight, ChevronUp, ChevronDown, X, Download, QrCode, Wallet, CreditCard, Copy
} from 'lucide-react';
import { useSession, signIn, signOut } from 'next-auth/react';


import QRCode from 'react-qr-code';

export default function App() {
  const { data: session } = useSession();
  const user = session?.user;

  // --- APP STATE ---
  const [currentView, setCurrentView] = useState('home');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Home / Search State
  const [fields, setFields] = useState([]);
  const [allFields, setAllFields] = useState([]);
  const [isLoadingFields, setIsLoadingFields] = useState(true);
  const [searchName, setSearchName] = useState(''); // Diperbaiki: Variabel ini sebelumnya terhapus
  const [searchDate, setSearchDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTime, setSearchTime] = useState('');
  const [bookedFieldIds, setBookedFieldIds] = useState([]);


  // Detail / Booking State
  const [selectedField, setSelectedField] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [bookingDate, setBookingDate] = useState(new Date().toISOString().split('T')[0]);
  const [timeSlots, setTimeSlots] = useState([]);
  const sliderRef = useRef(null);

  // Pilih Jam
  const [startHour, setStartHour] = useState('');
  const [endHour, setEndHour] = useState('');

  // Checkout & History State
  const [uploadedReceipt, setUploadedReceipt] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState('');
  const fileInputRef = useRef(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [expandedPaymentGroups, setExpandedPaymentGroups] = useState({
    'Transfer Manual': false,
    'E-Wallet': false,
    'Lainnya': false
  });

  const togglePaymentGroup = (group) => {
    setExpandedPaymentGroups(prev => ({
      ...prev,
      [group]: !prev[group]
    }));
  };

  const [checkoutStep, setCheckoutStep] = useState('select_method');
  const [userPhoneInput, setUserPhoneInput] = useState('');
  const [createdBooking, setCreatedBooking] = useState<any>(null);
  const [isSubmittingMethod, setIsSubmittingMethod] = useState(false);
  const [isSubmittingReceipt, setIsSubmittingReceipt] = useState(false);

  // E-Wallet Specific States
  const [ovoNumber, setOvoNumber] = useState('');
  const [isSubmittingOvo, setIsSubmittingOvo] = useState(false);

  const handleSubmitOvo = async () => {
    if (!ovoNumber || ovoNumber.length < 9) {
      showToast("Nomor OVO tidak valid", "error");
      return;
    }
    setIsSubmittingOvo(true);
    try {
      const res = await fetch('/api/bookings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: createdBooking?.id, customerPhone: `0${ovoNumber}` })
      });
      if (res.ok) {
        showToast("Permintaan pembayaran dikirim ke aplikasi OVO Anda", "success");
      } else {
        throw new Error("Gagal mengirim");
      }
    } catch (err) {
      showToast("Gagal mengirim permintaan OVO", "error");
    } finally {
      setIsSubmittingOvo(false);
    }
  };

  // Copy States
  const [copiedBCA, setCopiedBCA] = useState(false);
  const [copiedNominal, setCopiedNominal] = useState(false);
  const [copiedEwallet, setCopiedEwallet] = useState(false);

  const handleCopy = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === 'bca') {
      setCopiedBCA(true);
      setTimeout(() => setCopiedBCA(false), 2000);
    } else if (type === 'nominal') {
      setCopiedNominal(true);
      setTimeout(() => setCopiedNominal(false), 2000);
    } else {
      setCopiedEwallet(true);
      setTimeout(() => setCopiedEwallet(false), 2000);
    }
  };

  // Modal States
  const [confirmCancelId, setConfirmCancelId] = useState(null);
  const [ratingBooking, setRatingBooking] = useState(null);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [selectedStar, setSelectedStar] = useState(0);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [paymentPopup, setPaymentPopup] = useState<{ isOpen: boolean, type: string, value: string, title: string, booking: any }>({ isOpen: false, type: '', value: '', title: '', booking: null });
  const [myBookings, setMyBookings] = useState([]);
  const [myBookingsPage, setMyBookingsPage] = useState(1);

  // Toast State
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = (message: string, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  useEffect(() => {
    window.alert = (msg) => showToast(msg, 'error');
  }, []);

  // Load session from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('bookingSession');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.createdBooking && data.createdBooking.status === 'MENUNGGU') {
          setCreatedBooking(data.createdBooking);
          setSelectedField(data.selectedField);
          setBookingDate(new Date(data.bookingDate));
          setStartHour(data.startHour);
          setEndHour(data.endHour);
          setUserPhoneInput(data.userPhoneInput);
          setSelectedPaymentMethod(data.selectedPaymentMethod);
          setCheckoutStep(data.checkoutStep);
          setCurrentView(data.currentView);
        } else {
          localStorage.removeItem('bookingSession');
        }
      } catch (e) {
        localStorage.removeItem('bookingSession');
      }
    }
  }, []);

  // Save session to localStorage when it changes
  useEffect(() => {
    if (currentView === 'checkout' && checkoutStep === 'finish' && createdBooking) {
      localStorage.setItem('bookingSession', JSON.stringify({
        createdBooking,
        selectedField,
        bookingDate,
        startHour,
        endHour,
        userPhoneInput,
        selectedPaymentMethod,
        checkoutStep,
        currentView
      }));
    } else if (currentView === 'home' || currentView === 'detail' || (currentView === 'checkout' && checkoutStep === 'select_method' && !createdBooking)) {
      localStorage.removeItem('bookingSession');
    }
  }, [currentView, checkoutStep, createdBooking, selectedField, bookingDate, startHour, endHour, userPhoneInput, selectedPaymentMethod]);

  // Handle mobile phone native back button (popstate)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.history.replaceState({ view: 'home' }, '');
    }

    const handlePopState = (event) => {
      if (event.state && event.state.view) {
        setCurrentView(event.state.view);
      } else {
        setCurrentView('home');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const currentState = window.history.state;
      if (!currentState || currentState.view !== currentView) {
        window.history.pushState({ view: currentView }, '');
      }
    }
  }, [currentView]);

  const [paymentInstructions, setPaymentInstructions] = useState([]);
  const [dbPaymentMethods, setDbPaymentMethods] = useState([]);
  const [instructionTab, setInstructionTab] = useState(0);
  const [openDropdownGroup, setOpenDropdownGroup] = useState(null);
  const [searchBankQuery, setSearchBankQuery] = useState('');

  useEffect(() => {
    fetch('/api/fields?public=1')
      .then(res => res.json())
      .then(data => {
        const adaptedData = data.map((f: any) => ({
          id: f.id,
          name: f.name,
          type: f.type,
          facilities: f.facilities || [],
          price: Number(f.price_per_hour || f.pricePerHour || 100000),
          rating: 4.5,
          reviews: 50,
          images: f.images || [],
          location: f.location,
          mapUrl: f.map_url,
          status: f.status,
          bankName: f.bank_name,
          bankAccount: f.bank_account,
          bankOwner: f.bank_owner,
          paymentMethods: (f.payment_methods && Array.isArray(f.payment_methods) && f.payment_methods.length > 0) ? f.payment_methods : []
        }));
        setFields(adaptedData);
        setAllFields(adaptedData);
        setIsLoadingFields(false);
      })
      .catch(err => {
        console.error("Error fetching fields", err);
        setIsLoadingFields(false);
      });

    // Fetch Payment Instructions
    fetch('/api/payment-instructions')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setPaymentInstructions(data);
        }
      })
      .catch(err => console.error("Error fetching payment instructions", err));

    // Fetch DB Payment Methods
    fetch('/api/payment-methods')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setDbPaymentMethods(data);
        }
      })
      .catch(err => console.error("Error fetching payment methods", err));
  }, []);


  const fetchMyBookings = () => {
    if (user?.id) {
      fetch(`/api/bookings?customerId=${user.id}`)
        .then(res => res.json())
        .then(data => {
          if (!Array.isArray(data)) return;
          const adapted = data.map((b: any) => ({
            id: b.id,
            bookingCode: b.booking_code || b.bookingCode,
            fieldName: b.field_name,
            date: new Date(b.booking_date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
            time: `${b.start_hour}:00 - ${b.end_hour}:00`,
            price: Number(b.total_price),
            status: b.status.toLowerCase(),
            receiptImg: b.receipt_img,
            rated: false
          }));
          setMyBookings(adapted);
        })
        .catch(err => console.error("Error fetching bookings", err));
    }
  };

  useEffect(() => {
    fetchMyBookings();
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      fetch(`/api/customers?id=${user.id}`)
        .then(res => res.json())
        .then(data => {
          // Automatic phone prefill removed to force manual input and double-check
        })
        .catch(err => console.error("Error fetching customer phone:", err));
    }
  }, [user?.id]);

  // --- HANDLERS ---
  const handleSearchName = (e) => {
    const val = e.target.value;
    setSearchName(val);
    let filtered = allFields.filter((f: any) => f.name.toLowerCase().includes(val.toLowerCase()));

    // Pertahankan filter jam jika sedang aktif
    if (searchTime && bookedFieldIds.length > 0) {
      filtered = filtered.filter(f => !bookedFieldIds.includes(String(f.id)));
    }
    setFields(filtered);
  };

  const handleSearch = async () => {
    let filtered = allFields;
    if (searchName) {
      filtered = filtered.filter(f => f.name.toLowerCase().includes(searchName.toLowerCase()));
    }

    if (searchTime && searchDate) {
      try {
        const res = await fetch(`/api/bookings?date=${searchDate}`);
        const bookings = await res.json();

        if (Array.isArray(bookings)) {
          const targetHour = Number(searchTime);
          const bookedIds = bookings
            .filter((b: any) => {
              if (!b) return false;
              const statusUpper = (b.status || '').toUpperCase();
              return (
                statusUpper !== 'DIBATALKAN' &&
                statusUpper !== 'DITOLAK' &&
                Number(b.start_hour) <= targetHour &&
                Number(b.end_hour) > targetHour
              );
            })
            .map((b: any) => String(b.field_id));

          setBookedFieldIds(bookedIds);
          filtered = filtered.filter(f => !bookedIds.includes(String(f.id)));
        }
      } catch (err) {
        console.error("Error filtering fields by time:", err);
      }
    } else {
      setBookedFieldIds([]);
    }
    setFields(filtered);
  };

  const handleResetSearch = () => {
    setSearchName('');
    setSearchDate(new Date().toISOString().split('T')[0]);
    setSearchTime('');
    setBookedFieldIds([]);
    setFields(allFields);
  };

  const openFieldDetail = (field) => {
    setSelectedField(field);
    setCurrentImageIndex(0);
    setBookingDate(searchDate || new Date().toISOString().split('T')[0]);
    // Jika user set searchTime di home, auto set startHour
    if (searchTime) {
      setStartHour(searchTime);
      setEndHour('');
    } else {
      setStartHour('');
      setEndHour('');
    }
    setSelectedPaymentMethod('');
    setUserPhoneInput('');
    setCurrentView('detail');
    window.scrollTo(0, 0);
  };

  const handleScroll = () => {
    if (sliderRef.current) {
      const index = Math.round(sliderRef.current.scrollLeft / sliderRef.current.clientWidth);
      setCurrentImageIndex(index);
    }
  };

  const scrollToImage = (index) => {
    if (sliderRef.current) {
      sliderRef.current.scrollTo({ left: index * sliderRef.current.clientWidth, behavior: 'smooth' });
    }
    setCurrentImageIndex(index);
  };

  useEffect(() => {
    if (selectedField && bookingDate) {
      fetch(`/api/bookings?fieldId=${selectedField.id}&date=${bookingDate}`)
        .then(res => res.json())
        .then(bookings => {
          const slots = [];
          const startHour = 8;
          const endHour = 22;
          for (let i = startHour; i < endHour; i++) {
            const isBooked = bookings.some(b =>
              b.status?.toUpperCase() !== 'DIBATALKAN' &&
              b.status?.toUpperCase() !== 'DITOLAK' &&
              b.start_hour <= i && b.end_hour > i
            );
            slots.push({ hour: i, status: isBooked ? 'booked' : 'available' });
          }
          setTimeSlots(slots);
          if (!searchTime) {
            setStartHour('');
            setEndHour('');
          }
        })
        .catch(err => console.error(err));
    }
  }, [selectedField, bookingDate]);

  useEffect(() => {
    if (startHour !== '') {
      const validEnds = getValidEndHours(Number(startHour));
      if (!validEnds.includes(Number(endHour))) {
        setEndHour(validEnds[0]);
      }
    }
  }, [startHour]);

  const getValidEndHours = (start) => {
    if (start === '') return [];
    let maxHour = 22;
    for (let i = start; i < 22; i++) {
      const slot = timeSlots.find(s => s.hour === i);
      if (slot && slot.status === 'booked') {
        maxHour = i;
        break;
      }
    }
    const ends = [];
    for (let i = start + 1; i <= maxHour; i++) {
      ends.push(i);
    }
    return ends;
  };

  const handleProceedToCheckout = () => {
    if (!user) {
      signIn();
    } else {
      setCurrentView('checkout');
      window.scrollTo(0, 0);
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (selectedField && startHour && endHour) {
      setCurrentView('checkout');
    } else {
      setCurrentView('home');
    }
    window.scrollTo(0, 0);
  };

  const handleFileUpload = (e: any) => {
    const file = e.target.files[0];
    if (file) {
      setUploadedReceipt(true);
      setUploadedFileName(file.name);
      setReceiptFile(file);
      setReceiptPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleProceedToPayment = async () => {
    setIsSubmittingMethod(true);
    const duration = Number(endHour) - Number(startHour);
    const total = duration * selectedField.price;

    let actualPaymentMethodName = selectedPaymentMethod;
    if (selectedPaymentMethod.startsWith('custom_admin_')) {
      const idx = parseInt(selectedPaymentMethod.replace('custom_admin_', ''));
      const pms = selectedField?.paymentMethods || [];
      if (pms[idx] && pms[idx].bankName) {
        actualPaymentMethodName = pms[idx].bankName;
      }
    } else if (selectedPaymentMethod === 'qris') {
      actualPaymentMethodName = 'qris';
    } else if (selectedPaymentMethod.startsWith('ewallet_auto_')) {
      actualPaymentMethodName = selectedPaymentMethod.replace('ewallet_auto_', '');
    } else if (selectedPaymentMethod.startsWith('va_auto_')) {
      actualPaymentMethodName = selectedPaymentMethod.replace('va_auto_', '');
    }

    let paymentMethodId = null;
    if (dbPaymentMethods && dbPaymentMethods.length > 0) {
      const n = actualPaymentMethodName.toLowerCase();
      const matched = dbPaymentMethods.find((dbpm: any) => {
        const dbName = (dbpm.name || '').toLowerCase();
        const dbCode = (dbpm.code || '').toLowerCase();
        return n === dbName || n.includes(dbName.replace(' virtual account', '')) || n.includes(dbCode.replace('_va', ''));
      });
      if (matched) {
        paymentMethodId = matched.id;
      }
    }

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: user.id,
          fieldId: selectedField.id,
          bookingDate: bookingDate,
          startHour: Number(startHour),
          endHour: Number(endHour),
          totalPrice: total,
          paymentMethod: 'Transfer',
          receiptImg: null,
          customerPhone: userPhoneInput,
          paymentMethodCode: actualPaymentMethodName,
          paymentMethodId: paymentMethodId
        })
      });
      const data = await response.json();
      if (response.ok) {
        setCreatedBooking(data);
        setCheckoutStep('details');
        window.scrollTo(0, 0);
      } else {
        showToast(data.error || "Gagal membuat pesanan", "error");
      }
    } catch (err) {
      console.error("Error creating booking:", err);
      showToast("Terjadi kesalahan jaringan", "error");
    } finally {
      setIsSubmittingMethod(false);
    }
  };

  const handleDownloadQR = async () => {
    if (!createdBooking?.qr_string) return;
    try {
      const url = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(createdBooking.qr_string)}`;
      const response = await fetch(url);
      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `QRIS-${createdBooking.booking_code || 'Payment'}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(objectUrl);
    } catch (err) {
      console.error("Gagal mendownload QR:", err);
      // Fallback
      window.open(`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(createdBooking.qr_string)}`, '_blank');
    }
  };

  const submitCheckout = async () => {
    if (!createdBooking) {
      showToast("Pesanan tidak ditemukan, silakan buat ulang", "error");
      return;
    }
    if (isSubmittingReceipt) return;

    setIsSubmittingReceipt(true);
    try {
      let receiptUrl = '';
      if (receiptFile) {
        const ext = receiptFile.name.split('.').pop();
        const hashName = Math.random().toString(36).substring(2, 10) + '.' + ext;
        const res = await fetch(`/api/upload?filename=${hashName}`, {
          method: 'POST',
          body: receiptFile,
        });
        const data = await res.json();
        receiptUrl = data.url;
      }

      const res = await fetch('/api/bookings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: createdBooking.id,
          receiptImg: receiptUrl,
          status: 'MENUNGGU'
        })
      });
      const data = await res.json();

      if (!user) {
        signIn();
        return;
      }
      await fetchMyBookings();
      setCurrentView('success');
      setUploadedReceipt(false);
      setUploadedFileName('');
      setReceiptFile(null);
      setReceiptPreviewUrl('');
      setIsPreviewModalOpen(false);
      setCreatedBooking(null);
      window.scrollTo(0, 0);
    } catch (err) {
      console.error("Error updating booking receipt", err);
      showToast("Terjadi kesalahan saat mengirim bukti pembayaran", "error");
    } finally {
      setIsSubmittingReceipt(false);
    }
  };

  const confirmCancel = (id) => {
    fetch('/api/bookings', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    }).then(() => {
      fetchMyBookings();
      setConfirmCancelId(null);
    }).catch(err => console.error("Error cancelling booking", err));
  };

  const submitRating = () => {
    setMyBookings(myBookings.map(bkg =>
      bkg.id === ratingBooking.id ? { ...bkg, rated: true, rating: selectedStar } : bkg
    ));
    setRatingBooking(null);
    setSelectedStar(0);
    setHoveredStar(0);
  };

  // --- RENDERERS ---
  const renderNavbar = () => (
    <nav className="bg-[#0f172a] text-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-14 sm:h-16 items-center">
          <div className="flex items-center cursor-pointer group" onClick={() => setCurrentView('home')}>
            <div className="bg-gradient-to-br from-emerald-400 to-emerald-600 p-1 sm:p-1.5 rounded-lg mr-2 shadow-sm">
              <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </div>
            {/* Nama Logo Tampil di HP dan Desktop */}
            <span className="font-extrabold text-base sm:text-lg tracking-tight">
              Booking<span className="text-emerald-400">Lapang</span>
            </span>
          </div>

          <div className="hidden sm:flex items-center space-x-6 sm:space-x-8 text-sm sm:text-base">
            <button onClick={() => setCurrentView('home')} className={`font-bold transition-colors ${currentView === 'home' ? 'text-emerald-400' : 'text-gray-300 hover:text-white'}`}>
              Sewa Lapang
            </button>
            <button onClick={() => { if (!user) { signIn(); } else { setCurrentView('my_bookings'); } }} className={`font-bold transition-colors ${currentView === 'my_bookings' ? 'text-emerald-400' : 'text-gray-300 hover:text-white'}`}>
              Booking Lapang
            </button>
          </div>

          <div className="flex items-center">
            {user ? (
              <div className="flex items-center space-x-3">
                <span className="text-xs sm:text-sm font-medium text-gray-200 hidden sm:block">Hai, {user.name.split(' ')[0]}</span>
                <button onClick={() => setShowLogoutConfirm(true)} className="bg-red-500/20 text-red-100 hover:bg-red-500 hover:text-white p-1.5 sm:p-2 rounded-lg sm:rounded-xl transition-colors cursor-pointer">
                  <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
              </div>
            ) : (
              <button onClick={() => signIn()} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-bold transition-colors flex items-center shadow-lg shadow-emerald-500/30 cursor-pointer text-xs sm:text-sm">
                <User className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" /> Masuk
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );

  const renderHomeView = () => (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6 animate-fade-in">
      {/* Hero Section */}
      <div className="bg-emerald-600 rounded-2xl sm:rounded-3xl p-5 sm:p-8 mb-6 shadow-md bg-gradient-to-br from-emerald-600 to-emerald-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-6 -mt-6 opacity-10">
          <ShieldCheck className="w-32 h-32 sm:w-40 sm:h-40 text-white" />
        </div>

        {/* Grup Pencarian Tanggal & Jam */}
        <div className="max-w-3xl mx-auto relative z-10 bg-white/10 backdrop-blur-md p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-white/20">
          <h2 className="text-white font-extrabold text-lg sm:text-xl mb-3 text-center">Cari Jadwal Lapangan Kosong</h2>
          <div className="flex flex-col md:flex-row gap-2 md:gap-3">
            {/* Input Wrapper: Date & Time side-by-side on both mobile & desktop */}
            <div className="flex flex-row gap-2 flex-[2] w-full">
              <div className="relative flex-1">
                <label className="block text-emerald-100 text-[9px] sm:text-[10px] font-bold uppercase mb-1 px-1">Pilih Tanggal</label>
                <div className="relative">
                  <Calendar className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-emerald-600 h-4 w-4 z-10" />
                  <input
                    type="date"
                    className="w-full pl-10 pr-2 py-2.5 sm:py-3 text-xs sm:text-sm border-0 rounded-xl shadow-inner focus:ring-4 focus:ring-emerald-400/50 font-bold text-gray-800 bg-white cursor-pointer outline-none"
                    value={searchDate} onChange={(e) => setSearchDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="relative flex-1">
                <label className="block text-emerald-100 text-[9px] sm:text-[10px] font-bold uppercase mb-1 px-1">Jam Main</label>
                <div className="relative">
                  <Clock className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-emerald-600 h-4 w-4 z-10" />
                  <select
                    className="w-full pl-10 pr-2 py-2.5 sm:py-3 text-xs sm:text-sm border-0 rounded-xl shadow-inner focus:ring-4 focus:ring-emerald-400/50 font-bold text-gray-800 bg-white appearance-none outline-none cursor-pointer"
                    value={searchTime} onChange={(e) => setSearchTime(e.target.value)}
                  >
                    <option value="">Jam</option>
                    {[...Array(14)].map((_, i) => {
                      const hour = i + 8;
                      return <option key={hour} value={hour}>{String(hour).padStart(2, '0')}:00</option>
                    })}
                  </select>
                </div>
              </div>
            </div>

            {/* Buttons Wrapper: side-by-side on mobile, aligned on desktop */}
            <div className="flex flex-row items-end gap-2 w-full md:w-auto">
              <button onClick={handleResetSearch} className="flex-1 md:flex-none bg-emerald-700/50 text-white border border-emerald-500/50 hover:bg-emerald-700 px-3 py-2.5 sm:py-3 rounded-xl font-bold text-xs sm:text-sm shadow-md active:scale-95 transition-all flex justify-center items-center h-[38px] sm:h-[46px] md:h-[46px]">
                Reset
              </button>
              <button onClick={handleSearch} className="flex-[2] md:flex-none bg-emerald-400 text-emerald-900 hover:bg-emerald-300 px-5 py-2.5 sm:py-3 rounded-xl font-extrabold text-xs sm:text-sm shadow-md active:scale-95 transition-all flex justify-center items-center h-[38px] sm:h-[46px] md:h-[46px]">
                <Search className="h-4 w-4 md:mr-1.5" />
                <span className="inline">Cari</span>
              </button>
            </div>
          </div>

          {/* Tambahan Kolom Pencarian Nama Lapangan di bawah grup */}
          <div className="mt-3 relative">
            <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 z-10" />
            <input
              type="text"
              placeholder="Ketik nama lapangan ..."
              className="w-full pl-10 pr-3 py-2.5 sm:py-3 text-xs sm:text-sm border-0 rounded-xl shadow-inner focus:ring-4 focus:ring-emerald-400/50 font-bold text-gray-800 bg-white outline-none"
              value={searchName}
              onChange={handleSearchName}
            />
          </div>
        </div>
      </div>

      <h2 className="text-base sm:text-xl font-extrabold text-gray-900 mb-3 sm:mb-5 flex items-center">
        <MapPin className="mr-1.5 text-emerald-500 w-4 h-4 sm:w-5 sm:h-5" /> Katalog Lapangan
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {isLoadingFields ? (
          <div className="col-span-full py-12 flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mb-4"></div>
            <p className="text-gray-500 font-bold">Memuat data lapangan...</p>
          </div>
        ) : fields.length === 0 ? (
          <div className="col-span-full py-12 text-center text-gray-500 font-bold">Tidak ada lapangan yang sesuai dengan pencarian.</div>
        ) : fields.map(field => (
          <div key={field.id} className="bg-white rounded-3xl shadow-sm overflow-hidden group flex flex-col border border-gray-100 hover:shadow-xl transition-all duration-300">
            <div className="relative h-48 sm:h-52 overflow-hidden cursor-pointer" onClick={() => openFieldDetail(field)}>
              <img src={field.images[0]} alt={field.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold text-emerald-800 shadow">
                {field.type}
              </div>
              <div className={`absolute top-3 right-3 bg-white/95 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold shadow flex items-center ${field.status?.toLowerCase() === 'aktif' ? 'text-emerald-800' : 'text-red-800'}`}>
                <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${field.status?.toLowerCase() === 'aktif' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                {field.status?.toLowerCase() === 'aktif' ? 'Buka' : 'Tutup'}
              </div>
            </div>
            <div className="p-4 sm:p-5 flex flex-col flex-grow">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-extrabold text-base sm:text-lg text-gray-900 leading-tight pr-2 line-clamp-2">{field.name}</h3>
                <div className="flex items-center text-yellow-500 bg-yellow-50 px-1.5 py-1 rounded-md text-xs font-bold whitespace-nowrap">
                  <Star className="h-3 w-3 fill-current mr-1" /> {field.rating}
                </div>
              </div>
              <div className="text-xs text-gray-500 flex items-start mb-3">
                <MapPin className="h-3 w-3 mr-1 text-gray-400 mt-0.5 flex-shrink-0" />
                <span className="line-clamp-1">{field.location}</span>
              </div>
              <div className="mt-auto flex items-center justify-between pt-4 border-t border-gray-100">
                <div>
                  <p className="text-[10px] text-gray-500 font-medium">Tarif / Jam</p>
                  <p className="font-extrabold text-emerald-600 text-sm sm:text-base">Rp {field.price.toLocaleString('id-ID')}</p>
                </div>
                <button
                  onClick={() => openFieldDetail(field)}
                  disabled={field.status?.toLowerCase() !== 'aktif'}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-md transition-transform ${field.status?.toLowerCase() === 'aktif' ? 'bg-emerald-600 text-white active:scale-95 hover:bg-emerald-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none'}`}
                >
                  {field.status?.toLowerCase() === 'aktif' ? 'Pesan' : 'Tutup'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderMyBookingsView = () => {
    const ITEMS_PER_PAGE = 10;
    const totalMyBookingsPages = Math.ceil(myBookings.length / ITEMS_PER_PAGE);
    const activeMyBookingsPage = myBookingsPage > totalMyBookingsPages ? 1 : myBookingsPage;
    const paginatedMyBookings = myBookings.slice((activeMyBookingsPage - 1) * ITEMS_PER_PAGE, activeMyBookingsPage * ITEMS_PER_PAGE);

    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6 animate-fade-in">
        <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 mb-5">Booking Lapang (Pesanan Saya)</h1>

        {myBookings.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h2 className="text-base font-bold text-gray-800">Belum Ada Transaksi</h2>
            <p className="text-xs text-gray-500 mt-1.5">Anda belum melakukan pemesanan lapangan.</p>
            <button onClick={() => setCurrentView('home')} className="mt-5 bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md">
              Cari Lapangan Sekarang
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {paginatedMyBookings.map((bkg, index) => {
                let statusColor = "bg-yellow-100 text-yellow-800 border-yellow-200";
                let StatusIcon = Clock3;
                let statusText = "Menunggu Konfirmasi";

                if (bkg.status === 'dikonfirmasi') {
                  statusColor = "bg-emerald-100 text-emerald-800 border-emerald-200";
                  StatusIcon = CheckCircle;
                  statusText = "Pesanan Dikonfirmasi";
                } else if (bkg.status === 'ditolak' || bkg.status === 'dibatalkan') {
                  statusColor = "bg-red-100 text-red-800 border-red-200";
                  StatusIcon = XOctagon;
                  statusText = bkg.status === 'dibatalkan' ? "Pesanan Dibatalkan" : "Pesanan Ditolak";
                }

                return (
                  <div key={index} className={`bg-white rounded-2xl shadow-sm border p-3.5 sm:p-4 flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center ${bkg.status === 'dibatalkan' ? 'border-gray-200 opacity-60' : 'border-gray-100'}`}>
                    <div className="w-full sm:w-auto flex-1">
                      <div className="flex justify-between items-start mb-1.5 sm:mb-1">
                        <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">{bkg.bookingCode}</p>
                        <div className={`sm:hidden flex items-center px-1.5 py-0.5 rounded-md border text-[9px] font-bold ${statusColor}`}>
                          <StatusIcon className="w-2.5 h-2.5 mr-1" /> {statusText}
                        </div>
                      </div>
                      <h3 className="font-extrabold text-gray-900 text-sm sm:text-base mb-1 leading-tight">{bkg.fieldName}</h3>
                      <div className="flex items-center text-[11px] sm:text-xs text-gray-600 font-medium">
                        <Calendar className="w-3 h-3 mr-1" />
                        {bkg.date}
                        <span className="mx-1.5 text-gray-300">|</span>
                        <Clock className="w-3 h-3 mr-1" />
                        {bkg.time}
                      </div>

                      {/* Action Buttons Container */}
                      <div className="mt-3 flex flex-wrap gap-2">
                        {/* Tombol Lihat Kode Pembayaran */}
                        {bkg.receiptImg && (bkg.receiptImg.startsWith('QR_STRING:') || bkg.receiptImg.startsWith('CHECKOUT_URL:') || bkg.receiptImg.startsWith('VA_NUMBER:')) && (bkg.status === 'menunggu pembayaran' || bkg.status === 'menunggu') && (
                          <button
                            onClick={() => {
                              if (bkg.receiptImg.startsWith('QR_STRING:')) {
                                setPaymentPopup({ isOpen: true, type: 'qris', value: bkg.receiptImg.replace('QR_STRING:', ''), title: 'Scan QRIS', booking: bkg });
                              } else if (bkg.receiptImg.startsWith('CHECKOUT_URL:')) {
                                setPaymentPopup({ isOpen: true, type: 'url', value: bkg.receiptImg.replace('CHECKOUT_URL:', ''), title: 'Link Pembayaran E-Wallet', booking: bkg });
                              } else if (bkg.receiptImg.startsWith('VA_NUMBER:')) {
                                const parts = bkg.receiptImg.split(':');
                                setPaymentPopup({ isOpen: true, type: 'va', value: parts[2], title: `Virtual Account ${parts[1]?.toUpperCase() || ''}`, booking: bkg });
                              }
                            }}
                            className="inline-flex items-center justify-center px-3 py-1.5 border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg text-[10px] sm:text-xs font-bold transition-colors shadow-sm w-full sm:w-auto"
                          >
                            <QrCode className="w-3 h-3 mr-1" /> Kode Pembayaran
                          </button>
                        )}

                        {/* Tombol Cancel (Khusus untuk status Menunggu) */}
                        {(bkg.status === 'menunggu' || bkg.status === 'menunggu pembayaran') && (
                          <button
                            onClick={() => setConfirmCancelId(bkg.id)}
                            className="inline-flex items-center justify-center px-3 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-[10px] sm:text-xs font-bold transition-colors w-full sm:w-auto"
                          >
                            <XOctagon className="w-3 h-3 mr-1" /> Batalkan Pesanan
                          </button>
                        )}

                        {/* Tombol Beri Ulasan (Khusus untuk status Dikonfirmasi yang belum di-rate) */}
                        {bkg.status === 'dikonfirmasi' && !bkg.rated && (
                          <button
                            onClick={() => setRatingBooking(bkg)}
                            className="inline-flex items-center justify-center px-3 py-1.5 border border-yellow-300 text-yellow-700 bg-yellow-50 hover:bg-yellow-100 rounded-lg text-[10px] sm:text-xs font-bold transition-colors shadow-sm w-full sm:w-auto"
                          >
                            <Star className="w-3 h-3 mr-1 fill-current" /> Beri Ulasan
                          </button>
                        )}
                      </div>

                      {/* Jika sudah diulas */}
                      {bkg.status === 'dikonfirmasi' && bkg.rated && (
                        <div className="mt-3 inline-flex items-center px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-md text-[10px] font-bold text-gray-600">
                          Ulasan Anda: <Star className="w-2.5 h-2.5 ml-1 text-yellow-500 fill-current" /> {bkg.rating}/5
                        </div>
                      )}
                    </div>

                    <div className="flex flex-row sm:flex-col justify-between items-center sm:items-end w-full sm:w-auto mt-1 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-0 border-gray-100">
                      <div className="text-left sm:text-right">
                        <p className="text-[9px] text-gray-500 font-medium hidden sm:block mb-0.5">Total Biaya</p>
                        <p className="font-extrabold text-emerald-600 text-sm sm:text-base">Rp {bkg.price.toLocaleString('id-ID')}</p>
                      </div>
                      <div className={`hidden sm:flex items-center mt-1.5 px-2 py-1 rounded-md border text-[10px] font-bold ${statusColor}`}>
                        <StatusIcon className="w-3 h-3 mr-1" /> {statusText}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls for User Bookings */}
            {totalMyBookingsPages > 1 && (
              <div className="flex justify-center items-center mt-6 gap-2 border-t border-gray-100 pt-4">
                <button
                  onClick={() => { setMyBookingsPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  disabled={activeMyBookingsPage === 1}
                  className="p-2 rounded-xl border border-gray-200 text-gray-600 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm flex items-center justify-center active:scale-95"
                  title="Halaman Sebelumnya"
                >
                  <ChevronRight className="w-4 h-4 rotate-180" />
                </button>
                <div className="flex gap-1.5">
                  {Array.from({ length: totalMyBookingsPages }).map((_, i) => {
                    const pageNum = i + 1;
                    const isActive = activeMyBookingsPage === pageNum;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => { setMyBookingsPage(pageNum); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                        className={`w-9 h-9 rounded-xl font-bold text-xs flex items-center justify-center transition-all ${isActive ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'}`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => { setMyBookingsPage(p => Math.min(totalMyBookingsPages, p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  disabled={activeMyBookingsPage === totalMyBookingsPages}
                  className="p-2 rounded-xl border border-gray-200 text-gray-600 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm flex items-center justify-center active:scale-95"
                  title="Halaman Selanjutnya"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  const renderDetailView = () => {
    if (!selectedField) return null;

    const availableStarts = timeSlots.filter(s => s.status === 'available');
    const validEnds = getValidEndHours(startHour !== '' ? Number(startHour) : '');
    const duration = (startHour !== '' && endHour !== '') ? (Number(endHour) - Number(startHour)) : 0;
    const totalFieldPrice = duration * selectedField.price;

    return (
      <div className="pb-32 lg:pb-12 bg-white sm:bg-[#f8fafc]">
        <div className="max-w-5xl mx-auto px-0 sm:px-6 lg:px-8 sm:py-6 animate-fade-in">

          <div className="hidden sm:flex mb-4">
            <button onClick={() => setCurrentView('home')} className="flex items-center text-gray-600 hover:text-emerald-700 font-bold bg-white border border-gray-200 px-4 py-2 rounded-xl text-sm shadow-sm transition-colors">
              <ArrowLeft className="h-4 w-4 mr-2" /> Kembali
            </button>
          </div>

          <div className="bg-white sm:rounded-3xl sm:shadow-xl overflow-hidden sm:border border-gray-100">
            {/* Header / Image Gallery dengan Swipe/Scroll Snap */}
            <div className="relative h-[250px] sm:h-[400px] bg-gray-900 group">
              <button onClick={() => setCurrentView('home')} className="sm:hidden absolute top-4 left-4 z-20 bg-black/40 backdrop-blur-md text-white p-2 rounded-full border border-white/30">
                <ArrowLeft className="h-5 w-5" />
              </button>

              <div
                ref={sliderRef}
                onScroll={handleScroll}
                className="flex w-full h-full overflow-x-auto snap-x snap-mandatory scrollbar-hide scroll-smooth"
              >
                {selectedField.images.map((img, idx) => (
                  <img key={idx} src={img} alt="Lapang" className="w-full h-full object-cover flex-shrink-0 snap-center" />
                ))}
              </div>

              <div className="absolute top-4 right-4 z-10 bg-black/60 text-white px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm pointer-events-none">
                {currentImageIndex + 1} / {selectedField.images.length}
              </div>

              <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/95 via-black/60 to-transparent p-5 sm:p-8 pointer-events-none flex flex-col gap-2.5">
                <h1 className="text-xl sm:text-3xl font-extrabold text-white leading-tight">{selectedField.name}</h1>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="bg-emerald-500 text-white px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-bold inline-flex items-center justify-center h-7 sm:h-8">
                    {selectedField.type}
                  </span>

                  {selectedField.status?.toLowerCase() === 'aktif' ? (
                    <span className="bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-bold inline-flex items-center justify-center gap-1.5 h-7 sm:h-8">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>Buka
                    </span>
                  ) : (
                    <span className="bg-red-100 text-red-800 px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-bold inline-flex items-center justify-center gap-1.5 h-7 sm:h-8">
                      <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>Tutup
                    </span>
                  )}

                  <div className="inline-flex items-center space-x-2 text-white text-[10px] sm:text-xs font-bold bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 h-7 sm:h-8">
                    <div className="flex items-center text-yellow-400">
                      <Star className="h-3 w-3 sm:h-3.5 sm:w-3.5 fill-current mr-1 animate-pulse" /> {selectedField.rating}
                    </div>
                    <span className="text-white/20">|</span>
                    <span className="text-emerald-400">Rp {selectedField.price.toLocaleString('id-ID')}/Jam</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Thumbnail Navigation - HIDDEN ON MOBILE */}
            <div className="hidden sm:flex overflow-x-auto gap-2 p-3 sm:p-4 bg-gray-50 border-b border-gray-100 scrollbar-hide">
              {selectedField.images.map((img, idx) => (
                <div key={idx} onClick={() => scrollToImage(idx)} className={`relative flex-shrink-0 w-20 h-16 sm:w-28 sm:h-20 rounded-lg overflow-hidden cursor-pointer transition-all duration-200 border-2 ${currentImageIndex === idx ? 'border-emerald-500 shadow-md ring-2 ring-emerald-200' : 'border-transparent opacity-70 hover:opacity-100'}`}>
                  <img src={img} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>

            <div className="p-4 sm:p-8 flex flex-col lg:flex-row gap-6 lg:gap-10">

              {/* Kolom Kanan: Pilih Jadwal (Start - End) - ORDERED FIRST ON MOBILE */}
              <div className="flex-1 lg:max-w-[420px] order-1 lg:order-2">
                <div className="bg-gray-50 sm:bg-white p-5 sm:p-6 rounded-3xl border border-gray-200 lg:sticky lg:top-24 shadow-sm">
                  {selectedField.status?.toLowerCase() !== 'aktif' ? (
                    <div className="text-center py-8">
                      <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle className="w-10 h-10 text-red-500" />
                      </div>
                      <h3 className="text-xl font-extrabold text-gray-900 mb-2">Lapangan Tutup</h3>
                      <p className="text-sm text-gray-500 font-medium">Mohon maaf, lapangan ini sedang dalam perawatan atau ditutup sementara. Silakan pilih lapangan lain.</p>
                      <button onClick={() => setCurrentView('home')} className="mt-6 bg-gray-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-gray-800 transition-colors">
                        Kembali ke Beranda
                      </button>
                    </div>
                  ) : (
                    <>
                      <h3 className="font-extrabold text-lg sm:text-xl text-gray-900 mb-4 flex items-center">
                        <Clock className="w-5 h-5 text-emerald-600 mr-2" /> Booking Jadwal
                      </h3>

                      <div className="mb-4">
                        <label className="block text-xs font-bold text-gray-600 mb-1.5">Tanggal main</label>
                        <div className="relative">
                          <Calendar className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-emerald-600 h-5 w-5" />
                          <input
                            type="date"
                            className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-emerald-500 focus:border-emerald-500 bg-white font-bold text-gray-900 text-sm cursor-pointer"
                            value={bookingDate} min={new Date().toISOString().split('T')[0]}
                            onChange={(e) => setBookingDate(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="mb-6 flex gap-3">
                        <div className="flex-1">
                          <label className="block text-xs font-bold text-gray-600 mb-1.5">Jam mulai</label>
                          <select
                            className="w-full px-3 py-3 border-2 border-gray-200 rounded-xl bg-white font-bold text-gray-900 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                            value={startHour}
                            onChange={(e) => setStartHour(e.target.value)}
                          >
                            <option value="" disabled>Pilih</option>
                            {[...Array(14)].map((_, i) => {
                              const hour = i + 8;
                              const isBooked = timeSlots.find(s => s.hour === hour)?.status === 'booked';
                              return (
                                <option
                                  key={hour}
                                  value={hour}
                                  disabled={isBooked}
                                  className={isBooked ? "text-red-500 font-bold" : "text-gray-900 font-medium"}
                                >
                                  {String(hour).padStart(2, '0')}:00{isBooked ? " (Booked)" : ""}
                                </option>
                              );
                            })}
                          </select>
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs font-bold text-gray-600 mb-1.5">Jam selesai</label>
                          <select
                            className="w-full px-3 py-3 border-2 border-gray-200 rounded-xl bg-white font-bold text-gray-900 text-sm focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-gray-100"
                            value={endHour}
                            onChange={(e) => setEndHour(e.target.value)}
                            disabled={startHour === ''}
                          >
                            <option value="" disabled>Pilih</option>
                            {validEnds.map(hour => (
                              <option key={hour} value={hour}>{String(hour).padStart(2, '0')}:00</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="hidden lg:block">
                        {duration > 0 && (
                          <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 mb-4">
                            <div className="flex justify-between items-center text-sm font-bold text-emerald-800 mb-1">
                              <span>Durasi Sewa:</span>
                              <span>{duration} Jam</span>
                            </div>
                            <div className="flex justify-between items-center mt-2 pt-2 border-t border-emerald-200">
                              <span className="font-bold text-gray-700">Total Biaya</span>
                              <span className="text-xl font-extrabold text-emerald-600">Rp {totalFieldPrice.toLocaleString('id-ID')}</span>
                            </div>
                          </div>
                        )}
                        <button onClick={handleProceedToCheckout} disabled={duration <= 0}
                          className={`w-full py-4 rounded-xl font-extrabold text-white text-base transition-all shadow-lg ${duration > 0 ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-gray-300 cursor-not-allowed shadow-none'
                            }`}
                        >
                          Lanjut Pembayaran
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Kolom Kiri: Detail / Fasilitas / Lokasi - ORDERED SECOND ON MOBILE */}
              <div className="flex-1 order-2 lg:order-1">
                {/* Sewa/Jam & Rating hidden on mobile, visible on desktop */}
                <div className="hidden sm:flex gap-4 mb-6 pb-6 border-b border-gray-100">
                  <div className="flex-1 bg-emerald-50 p-3 sm:p-4 rounded-2xl border border-emerald-100">
                    <p className="text-[10px] sm:text-xs text-emerald-800 font-bold uppercase mb-0.5">Sewa / Jam</p>
                    <p className="text-lg sm:text-2xl font-extrabold text-emerald-600">Rp {selectedField.price.toLocaleString('id-ID')}</p>
                  </div>
                  <div className="flex-1 bg-yellow-50 p-3 sm:p-4 rounded-2xl border border-yellow-100">
                    <p className="text-[10px] sm:text-xs text-yellow-800 font-bold uppercase mb-0.5">Rating</p>
                    <div className="flex items-center text-yellow-500 text-lg sm:text-2xl font-extrabold">
                      <Star className="h-5 w-5 sm:h-6 sm:w-6 fill-current mr-1" /> {selectedField.rating}
                    </div>
                  </div>
                </div>

                {/* Fasilitas Utama - Only show if there are valid facilities */}
                {selectedField.facilities && selectedField.facilities.filter(fac => fac && fac.trim() !== '').length > 0 && (
                  <>
                    <h3 className="font-extrabold text-gray-900 mb-3 text-base sm:text-xl">Fasilitas Utama</h3>
                    <ul className="space-y-3 mb-6">
                      {selectedField.facilities
                        .filter(fac => fac && fac.trim() !== '')
                        .map((fac, idx) => (
                          <li key={idx} className="flex items-center text-gray-700 bg-gray-50 p-3 rounded-xl border border-gray-100">
                            <CheckCircle2 className="h-5 w-5 text-emerald-500 mr-3 flex-shrink-0" />
                            <span className="text-sm font-bold">{fac}</span>
                          </li>
                        ))}
                    </ul>
                  </>
                )}

                {/* Alamat Lapangan */}
                <h3 className="font-extrabold text-gray-900 mb-3 text-base sm:text-xl">Alamat Lapangan</h3>
                <div className="flex items-center text-gray-700 bg-gray-50 p-3 rounded-xl border border-gray-100 mb-8">
                  <MapPin className="h-5 w-5 text-emerald-500 mr-3 flex-shrink-0" />
                  <span className="text-sm font-bold">{selectedField.location}</span>
                </div>

                {selectedField.mapUrl && (
                  <div className="mt-6">
                    <h3 className="font-extrabold text-gray-900 mb-3 text-base sm:text-xl">Lokasi Lapangan</h3>
                    <div className="w-full p-6 bg-gray-50 rounded-2xl border border-gray-200 text-center flex flex-col items-center justify-center">
                      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                        <MapPin className="h-8 w-8 text-blue-600" />
                      </div>
                      <p className="text-sm font-bold text-gray-700 mb-4 text-center">Buka Google Maps untuk melihat rute perjalanan ke lapangan ini.</p>
                      <a href={selectedField.mapUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center bg-blue-600 text-white px-6 py-3 rounded-xl font-bold shadow-md hover:bg-blue-700 transition-colors">
                        Buka di Google Maps
                      </a>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>

        {/* MOBILE STICKY BOTTOM BAR */}
        {selectedField.status?.toLowerCase() === 'aktif' ? (
          <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 pb-6 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] z-40">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs text-gray-500 font-bold mb-0.5">Total Bayar</p>
                <p className="text-lg font-extrabold text-emerald-600">Rp {totalFieldPrice.toLocaleString('id-ID')}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 font-bold mb-0.5">Durasi</p>
                <p className="text-sm font-extrabold text-gray-900">{duration > 0 ? `${duration} Jam` : '-'}</p>
              </div>
            </div>
            <button onClick={handleProceedToCheckout} disabled={duration <= 0}
              className={`w-full py-3.5 rounded-xl font-extrabold text-white text-sm transition-all shadow-lg ${duration > 0 ? 'bg-emerald-600 active:bg-emerald-700' : 'bg-gray-300 cursor-not-allowed shadow-none'
                }`}
            >
              Lanjut Pembayaran
            </button>
          </div>
        ) : (
          <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-red-50 border-t border-red-100 p-4 pb-6 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] z-40">
            <p className="text-center font-bold text-red-600 text-sm">Lapangan sedang ditutup, tidak bisa dipesan.</p>
          </div>
        )}
      </div>
    );
  };

  const renderLoginView = () => (
    <div className="max-w-md mx-auto px-4 py-16 animate-fade-in">
      <div className="bg-white rounded-3xl shadow-xl p-6 sm:p-8 border border-gray-100">
        <div className="text-center mb-6 pt-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 mb-4">
            <User className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900">Masuk Akun</h2>
          <p className="text-gray-500 text-sm mt-2">Masuk untuk menyimpan riwayat pesananmu.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Email / No. HP</label>
            <input type="email" required className="w-full px-4 py-3.5 bg-gray-50 border border-gray-300 rounded-xl focus:ring-emerald-500 font-medium text-gray-900" defaultValue="user@example.com" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Kata Sandi</label>
            <input type="password" required className="w-full px-4 py-3.5 bg-gray-50 border border-gray-300 rounded-xl focus:ring-emerald-500 font-medium text-gray-900" defaultValue="pass123" />
          </div>
          <button type="submit" className="w-full bg-emerald-600 text-white font-extrabold text-base py-4 rounded-xl mt-4 shadow-md active:scale-95 transition-transform">
            Masuk Sekarang
          </button>
        </form>
        <button onClick={() => setCurrentView(selectedField ? 'detail' : 'home')} className="w-full mt-4 bg-gray-100 text-gray-600 font-bold py-3 rounded-xl text-sm transition-colors">
          Batal dan Kembali
        </button>
      </div>
    </div>
  );

  const renderCheckoutView = () => {
    const duration = Number(endHour) - Number(startHour);
    const totalFieldPrice = duration * (selectedField?.price || 0);
    const finalTotal = totalFieldPrice;
    const timeString = `${String(startHour).padStart(2, '0')}:00 - ${String(endHour).padStart(2, '0')}:00`;

    const customOwner = selectedField?.bankOwner || 'Yayasan Peduli Sesama';

    const accountMap = {
      bca: {
        badge: 'BCA',
        title: 'BCA (Transfer Manual)',
        number: '1234567890',
        name: customOwner,
        instructionTitle: 'Instruksi Transfer Manual BCA',
        instructions: [
          'Transfer sesuai nominal (hingga 3 digit terakhir) ke rekening berikut:',
          'Bank BCA: 1234567890',
          `Atas Nama: ${customOwner}`,
          'Simpan bukti transfer Anda.',
          'Konfirmasi pembayaran melalui WhatsApp atau unggah bukti di halaman status.'
        ]
      },
      bri: {
        badge: 'BRI',
        title: 'BRI (Transfer Manual)',
        number: '9876543210',
        name: customOwner,
        instructionTitle: 'Instruksi Transfer Manual BRI',
        instructions: [
          'Transfer sesuai nominal (hingga 3 digit terakhir) ke rekening berikut:',
          'Bank BRI: 9876543210',
          `Atas Nama: ${customOwner}`,
          'Simpan bukti transfer Anda.',
          'Konfirmasi pembayaran melalui WhatsApp atau unggah bukti di halaman status.'
        ]
      },
      dana: {
        badge: 'DANA',
        title: 'DANA (E-Wallet)',
        number: '081234567890',
        name: customOwner,
        instructionTitle: 'Instruksi Transfer DANA',
        instructions: [
          'Transfer/Kirim sesuai nominal (hingga 3 digit terakhir) ke akun DANA berikut:',
          'No DANA: 081234567890',
          `Atas Nama: ${customOwner}`,
          'Simpan bukti transfer/transaksi Anda.',
          'Konfirmasi pembayaran melalui WhatsApp atau unggah bukti di halaman status.'
        ]
      }
    };

    const bankToIdMap: Record<string, number> = {
      'qris': 1,
      'bca': 2,
      'mandiri': 3,
      'bri': 4,
      'bni': 5,
      'bjb': 6,
      'bjb syariah': 6,
      'bnc': 7,
      'bsi': 8,
      'bss': 9,
      'cimb': 10,
      'octo': 10,
      'muamalat': 11,
      'permata': 12,
      'gopay': 13,
      'ovo': 14,
      'dana': 15,
      'linkaja': 16,
      'shopee': 17,
      'shopeepay': 17,
      'alfamart': 99
    };

    if (selectedField?.paymentMethods && selectedField.paymentMethods.length > 0) {
      // Create a copy of payment methods and automatically inject QRIS
      const fieldPMs = [...selectedField.paymentMethods];
      // Check if QRIS is already there to avoid duplicates
      if (!fieldPMs.some(pm => (pm.bankName || '').toLowerCase().includes('qris'))) {
        fieldPMs.push({
          bankName: 'QRIS CODE',
          bankAccount: 'Otomatis (Semua E-Wallet/M-Banking)',
          bankOwner: 'Pembayaran Instan',
          isQris: true
        });
      }

      const dummyAccounts: Record<string, string> = {
        'bca': '3816523906568',
        'mandiri': '8860863623046',
        'bri': '1328216932121',
        'bni': '880849021633',
        'bjb': '1234999968795947',
        'bjb syariah': '1234999968795948',
        'bnc': '9010001050411994',
        'bsi': '934733371937',
        'permata': '729361827494',
        'muamalat': '9010001112341234234'
      };

      const dummyEwallets: Record<string, string> = {
        'dana': '081234567890',
        'ovo': '081234567891',
        'gopay': '081234567892',
        'shopeepay': '081234567893',
        'linkaja': '081234567894'
      };

      fieldPMs.forEach((pm, idx) => {
        const pmOwner = pm.bankOwner;
        const pmKey = pm.isQris ? 'qris' : `custom_admin_${idx}`;

        let badgeText = (pm.bankName || '').toUpperCase();
        if (badgeText.includes('BCA')) badgeText = 'BCA';
        else if (badgeText.includes('BRI')) badgeText = 'BRI';
        else if (badgeText.includes('DANA')) badgeText = 'DANA';
        else if (badgeText.includes('MANDIRI')) badgeText = 'MANDIRI';
        else if (badgeText.includes('BSI')) badgeText = 'BSI';
        else if (badgeText.includes('QRIS')) badgeText = 'QRIS';
        else badgeText = badgeText.split(' ')[0] || 'TRANSFER';

        const isEwallet = /dana|gopay|ovo|shopee|linkaja|qris/i.test(pm.bankName);
        const methodType = isEwallet ? 'E-WALLET' : 'TRANSFER MANUAL';
        const instructionPrefix = isEwallet ? (badgeText === 'QRIS' ? 'Pembayaran' : 'Transfer DANA/E-Wallet') : 'Transfer Manual';

        let dbInstructions = [];
        if (paymentInstructions && paymentInstructions.length > 0) {
          const matchedInstructions = paymentInstructions.filter((inst: any) => {
            const lowerBadge = badgeText.toLowerCase();
            const targetId = bankToIdMap[lowerBadge];
            if (targetId && Number(inst.payment_method_id) === targetId) return true;
            return (inst.pm_name || '').toLowerCase().includes(lowerBadge) ||
              (inst.pm_code || '').toLowerCase().includes(lowerBadge) ||
              (inst.title || '').toLowerCase().includes(lowerBadge);
          });
          dbInstructions = matchedInstructions;
        }

        const lowerBadgeForDummy = badgeText.toLowerCase();
        let assignedNumber = pm.isQris ? pm.bankAccount : (isEwallet ? dummyEwallets[lowerBadgeForDummy] : dummyAccounts[lowerBadgeForDummy]);
        if (!assignedNumber) assignedNumber = pm.bankAccount || (isEwallet ? '081234567890' : '1234567890');

        const forcedOwnerName = pm.isQris ? 'Pembayaran Instan' : 'Yayasan Budi Mandiri';

        accountMap[pmKey] = {
          badge: badgeText,
          methodType: methodType,
          title: (pm.bankName || 'Bank Transfer') + (methodType === 'TRANSFER MANUAL' ? ' (Transfer Manual)' : ''),
          number: assignedNumber,
          name: forcedOwnerName,
          instructionTitle: `Instruksi ${instructionPrefix} ${badgeText}`,
          dbInstructions: dbInstructions,
          instructions: [
            'Transfer sesuai nominal (hingga 3 digit terakhir) ke rekening berikut:',
            `${pm.bankName || 'Bank'}: ${pm.bankAccount || '-'}`,
            `Atas Nama: ${pmOwner}`,
            'Simpan bukti transfer Anda.',
            'Konfirmasi pembayaran melalui WhatsApp atau unggah bukti di halaman status.'
          ]
        };
      });

      // Dinonaktifkan: Kita tidak lagi meng-inject default VAs atau E-Wallets secara dinamis
      // Semua akan mengacu secara mutlak pada apa yang dikonfigurasi admin
    }

    const currentAccount = accountMap[selectedPaymentMethod] || accountMap['bca'] || Object.values(accountMap)[0];

    if (checkoutStep === 'select_method') {
      return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between mb-4 sm:mb-6 bg-white p-3 sm:p-4 rounded-2xl border border-gray-100 shadow-sm gap-2">
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <button onClick={() => setCurrentView('detail')} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-full border border-gray-200 text-gray-600 transition-colors flex-shrink-0">
                <ArrowLeft className="w-4 h-4 sm:w-5 h-5" />
              </button>
              <h1 className="text-sm sm:text-xl font-extrabold text-gray-900 truncate">Pilih Metode Pembayaran</h1>
            </div>
            <span className="bg-amber-50 text-amber-600 border border-amber-200 px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-bold inline-flex items-center gap-1 sm:gap-1.5 shadow-sm flex-shrink-0">
              <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 animate-spin" /> Menunggu
            </span>
          </div>

          {/* Rincian Sewa - PLACED AT THE VERY TOP */}
          <div className="bg-white rounded-3xl shadow-sm p-5 sm:p-6 border border-gray-100 mb-6">
            <h2 className="text-sm sm:text-base font-extrabold text-gray-800 mb-4 pb-3 border-b border-gray-100 flex items-center gap-2">
              <FileText className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-emerald-500" /> Rincian Sewa
            </h2>
            <div className="flex items-center mb-4 sm:mb-5">
              <img src={selectedField?.images[0]} alt="Thumb" className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover mr-4 shadow-sm" />
              <div>
                <p className="font-extrabold text-gray-900 text-xs sm:text-sm leading-tight mb-1">{selectedField?.name}</p>
                <div className="text-[10px] sm:text-xs font-bold text-gray-500">
                  <span className="text-emerald-600">{new Date(bookingDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span> | {timeString}
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-3 border-t border-gray-100">
              <div className="flex justify-between text-[11px] sm:text-sm font-medium text-gray-600">
                <span>Sewa Lapang ({duration} Jam)</span>
                <span className="font-bold text-gray-800">Rp {totalFieldPrice.toLocaleString('id-ID')}</span>
              </div>

              <div className="flex justify-between items-center pt-3 mt-1 bg-emerald-50/50 p-3 rounded-xl border border-emerald-100">
                <span className="font-bold text-emerald-900 text-xs sm:text-sm">Total Tagihan</span>
                <span className="font-extrabold text-base sm:text-xl text-emerald-600">Rp {finalTotal.toLocaleString('id-ID')}</span>
              </div>
            </div>
          </div>

          {/* WhatsApp Input */}
          <div className="bg-white rounded-3xl shadow-sm p-6 border border-gray-100 mb-6">
            <label className="block text-xs sm:text-sm font-extrabold text-gray-700 mb-2 uppercase tracking-wider">
              Nomor WhatsApp
            </label>
            <p className="text-[11px] sm:text-xs text-gray-500 mb-4 font-medium leading-relaxed">
              Kami akan mengirimkan notifikasi konfirmasi pesanan dan instruksi pembayaran ke nomor ini.
            </p>
            <input
              type="tel"
              value={userPhoneInput}
              onChange={(e) => setUserPhoneInput(e.target.value)}
              placeholder="Contoh: 081234567890"
              className="w-full border-2 border-gray-100 bg-slate-50 hover:border-emerald-200 hover:bg-white focus:bg-white rounded-2xl px-4 py-3.5 font-bold text-sm text-gray-800 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all placeholder:text-gray-400 placeholder:font-medium"
            />
          </div>

          {/* Payment Method Selector Styled Like a Premium Input Dropdown */}
          <div className="bg-white rounded-3xl shadow-sm p-6 border border-gray-100 mb-6">
            <label className="block text-xs sm:text-sm font-extrabold text-gray-700 mb-3 uppercase tracking-wider">
              Pilih Metode Pembayaran
            </label>
            <div className="space-y-4">
              {(() => {
                if (!selectedField?.paymentMethods || selectedField.paymentMethods.length === 0) {
                  return (
                    <div className="p-4 text-center border-2 border-dashed border-gray-200 rounded-xl text-gray-500 bg-gray-50/50">
                      <p className="font-bold text-sm mb-1">Metode Pembayaran Belum Tersedia</p>
                      <p className="text-xs">Admin belum mengatur rekening untuk lapangan ini.</p>
                    </div>
                  );
                }

                const vaMethods = [];
                const ewalletMethods = [];
                const qrisMethods = [];

                let renderFieldPMs = (selectedField.paymentMethods || []).filter((pm: any) => pm.isActive !== false);

                // Fallback: If admin hasn't configured ANY active payment methods, generate QRIS as fallback
                if (renderFieldPMs.length === 0) {
                  renderFieldPMs.push({
                    bankName: 'QRIS CODE',
                    bankAccount: 'Otomatis',
                    bankOwner: 'Pembayaran Instan',
                    isQris: true,
                    isActive: true
                  });
                }

                renderFieldPMs.forEach((pm: any, originalIdx: number) => {
                  const n = (pm.bankName || '').toLowerCase();
                  const pmKey = pm.isQris ? 'qris' : `custom_admin_${originalIdx}`;
                  const item = { ...pm, key: pmKey };

                  if (pm.isQris || n.includes('qris')) {
                    qrisMethods.push(item);
                  } else if (n.includes('dana') || n.includes('gopay') || n.includes('ovo') || n.includes('shopee') || n.includes('linkaja') || n.includes('e-wallet')) {
                    ewalletMethods.push(item);
                  } else {
                    // Semua yang tidak teridentifikasi sebagai QRIS atau E-Wallet dianggap sebagai Bank Transfer / Virtual Account
                    vaMethods.push(item);
                  }
                });

                const handleGroupClick = (title, items) => {
                  if (items.length === 0) return;

                  const isCurrentlyExpanded = expandedPaymentGroups[title] === true;

                  if (isCurrentlyExpanded) {
                    // Collapse and deselect
                    setExpandedPaymentGroups({ 'Bank Transfer': false, 'E-Wallet': false, 'QR Code': false });
                    if (items.some(pm => pm.key === selectedPaymentMethod)) {
                      setSelectedPaymentMethod(''); // Deselect if an item in this group was selected
                    }
                    setOpenDropdownGroup(null);
                    setSearchBankQuery('');
                  } else {
                    // Expand
                    const newExpanded = { 'Bank Transfer': false, 'E-Wallet': false, 'QR Code': false };
                    newExpanded[title] = true;
                    setExpandedPaymentGroups(newExpanded);
                    setSearchBankQuery(''); // Reset search

                    if (title === 'QR Code' && items.length === 1) {
                      setSelectedPaymentMethod(items[0].key);
                    }
                  }
                };

                const renderGroup = (title, items) => {
                  if (items.length === 0) return null;

                  const isExpanded = expandedPaymentGroups[title] === true;
                  const isCategorySelected = isExpanded;

                  const displayLogos = items.slice(0, 2);
                  const extraCount = items.length - 2;

                  return (
                    <div className="border-b border-gray-100 last:border-b-0 bg-white transition-all">
                      <div
                        className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                        onClick={() => handleGroupClick(title, items)}
                      >
                        <div className="flex items-center gap-3 sm:gap-4 shrink-0 mr-2">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${isCategorySelected ? 'border-blue-600' : 'border-gray-300'}`}>
                            {isCategorySelected && <div className="w-2.5 h-2.5 bg-blue-600 rounded-full"></div>}
                          </div>
                          <span className="font-medium text-sm sm:text-[15px] text-gray-800 whitespace-nowrap">{title}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {displayLogos.map((pm, i) => {
                            const n = (pm.bankName || '').toLowerCase();
                            let logo = null;

                            // 1. Coba ambil logo dari database
                            if (dbPaymentMethods && dbPaymentMethods.length > 0) {
                              const matched = dbPaymentMethods.find((dbpm: any) => {
                                const dbName = (dbpm.name || '').toLowerCase();
                                const dbCode = (dbpm.code || '').toLowerCase();
                                return n === dbName || n.includes(dbName.replace(' virtual account', '')) || n.includes(dbCode.replace('_va', ''));
                              });
                              if (matched && matched.logo_url) {
                                logo = matched.logo_url;
                              }
                            }

                            return (
                              <div key={i} className="w-10 h-6 border border-gray-200 rounded flex items-center justify-center p-1 bg-white">
                                {logo ? <img src={logo} className="max-w-full max-h-full object-contain" /> : <span className="text-[6px] font-bold text-gray-400">BANK</span>}
                              </div>
                            );
                          })}
                          {extraCount > 0 && (
                            <div className="w-8 h-6 border border-gray-200 rounded flex items-center justify-center bg-white">
                              <span className="text-[10px] font-medium text-gray-600">+{extraCount}</span>
                            </div>
                          )}
                        </div>
                      </div>


                      {/* Sub-items (Dropdown UI) */}
                      {isExpanded && !(title === 'QR Code' && items.length === 1) && (
                        <div className="px-4 pb-4 pt-1 bg-white">
                          <div className="relative">
                            <div
                              className="w-full bg-white border border-gray-200 hover:border-blue-500 rounded-lg p-3 flex justify-between items-center cursor-pointer shadow-sm transition-colors"
                              onClick={() => setOpenDropdownGroup(openDropdownGroup === title ? null : title)}
                            >
                              <span className={selectedPaymentMethod && items.some(pm => pm.key === selectedPaymentMethod) ? 'text-gray-800 font-bold text-sm' : 'text-gray-400 text-sm'}>
                                {selectedPaymentMethod && items.some(pm => pm.key === selectedPaymentMethod)
                                  ? items.find(pm => pm.key === selectedPaymentMethod)?.bankName
                                  : `Select ${title}`}
                              </span>
                              {openDropdownGroup === title ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                            </div>

                            {openDropdownGroup === title && (
                              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                                <div className="p-3 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
                                  <div className="flex items-center text-gray-400 w-full mr-2">
                                    <Search className="w-4 h-4 mr-2 shrink-0" />
                                    <input
                                      type="text"
                                      placeholder="Cari bank..."
                                      className="text-xs font-medium w-full focus:outline-none text-gray-700 bg-transparent placeholder-gray-400"
                                      value={searchBankQuery}
                                      onChange={(e) => setSearchBankQuery(e.target.value)}
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                  </div>
                                  <button onClick={(e) => { e.stopPropagation(); setOpenDropdownGroup(null); setSearchBankQuery(''); }}>
                                    <X className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-pointer" />
                                  </button>
                                </div>
                                <div className="py-1">
                                  {items.filter(pm => (pm.bankName || '').toLowerCase().includes(searchBankQuery.toLowerCase())).map((pm) => {
                                    const n = (pm.bankName || '').toLowerCase();
                                    let logo = null;

                                    // 1. Coba ambil logo dari database
                                    if (dbPaymentMethods && dbPaymentMethods.length > 0) {
                                      const matched = dbPaymentMethods.find((dbpm: any) => {
                                        const dbName = (dbpm.name || '').toLowerCase();
                                        const dbCode = (dbpm.code || '').toLowerCase();
                                        return n === dbName || n.includes(dbName.replace(' virtual account', '')) || n.includes(dbCode.replace('_va', ''));
                                      });
                                      if (matched && matched.logo_url) {
                                        logo = matched.logo_url;
                                      }
                                    }

                                    // 2. Fallback jika tidak ada di database
                                    if (!logo) {
                                      if (n.includes('bca')) logo = 'https://upload.wikimedia.org/wikipedia/commons/5/5c/Bank_Central_Asia.svg';
                                      else if (n.includes('bri')) logo = 'https://upload.wikimedia.org/wikipedia/commons/2/2e/BRI_2020.svg';
                                      else if (n.includes('dana')) logo = 'https://upload.wikimedia.org/wikipedia/commons/7/72/Logo_dana_blue.svg';
                                      else if (n.includes('mandiri')) logo = 'https://upload.wikimedia.org/wikipedia/commons/a/ad/Bank_Mandiri_logo_2016.svg';
                                      else if (n.includes('bni')) logo = 'https://upload.wikimedia.org/wikipedia/id/5/55/BNI_logo.svg';
                                      else if (n.includes('ovo')) logo = 'https://branditechture.agency/brand-logos/wp-content/uploads/wpdm-cache/OVO-900x0.png';
                                      else if (n.includes('gopay')) logo = 'https://upload.wikimedia.org/wikipedia/commons/8/86/Gopay_logo.svg';
                                      else if (n.includes('shopee')) logo = 'https://upload.wikimedia.org/wikipedia/commons/f/fe/Shopee.svg';
                                      else if (n.includes('bsi')) logo = 'https://upload.wikimedia.org/wikipedia/commons/a/a0/Bank_Syariah_Indonesia.svg';
                                      else if (n.includes('qris')) logo = 'https://upload.wikimedia.org/wikipedia/commons/a/a2/Logo_QRIS.svg';
                                    }

                                    return (
                                      <div
                                        key={pm.key}
                                        className={`flex items-center px-4 py-3 hover:bg-slate-50 cursor-pointer transition-colors ${selectedPaymentMethod === pm.key ? 'bg-blue-50/30' : ''}`}
                                        onClick={() => {
                                          setSelectedPaymentMethod(pm.key);
                                          setInstructionTab(0);
                                          setOpenDropdownGroup(null);
                                        }}
                                      >
                                        <div className="w-10 h-7 bg-white border border-gray-100 shadow-sm rounded flex items-center justify-center mr-3 p-1 shrink-0">
                                          {logo ? (
                                            <img src={logo} alt="Logo" className="max-w-full max-h-full object-contain" />
                                          ) : (
                                            <span className="font-extrabold text-slate-300 text-[7px]">BANK</span>
                                          )}
                                        </div>
                                        <span className="font-bold text-gray-700 text-sm">{pm.bankName}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                };

                return (
                  <div className="border border-gray-200 rounded-2xl bg-white shadow-sm">
                    {renderGroup("Bank Transfer", vaMethods)}
                    {renderGroup("E-Wallet", ewalletMethods)}
                    {renderGroup("QR Code", qrisMethods)}
                  </div>
                );
              })()}
            </div>

            {/* Premium Button to Proceed to Step 2 */}
            <button
              onClick={handleProceedToPayment}
              disabled={!selectedPaymentMethod || !userPhoneInput || isSubmittingMethod}
              className={`w-full py-4 mt-5 rounded-2xl font-extrabold text-white text-base transition-all shadow-md flex items-center justify-center gap-2 ${selectedPaymentMethod && userPhoneInput && !isSubmittingMethod
                ? 'bg-emerald-600 hover:bg-emerald-700 active:scale-95 cursor-pointer shadow-emerald-600/20'
                : 'bg-gray-200 shadow-none cursor-not-allowed text-gray-400'
                }`}
            >
              {isSubmittingMethod ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  Lanjutkan Pembayaran
                  <ChevronRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 animate-fade-in">
        {/* Header - Back button returns to Method Selection */}
        <div className="flex items-center justify-between mb-4 sm:mb-6 bg-white p-3 sm:p-4 rounded-2xl border border-gray-100 shadow-sm gap-2">
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            <button
              onClick={() => {
                if (!uploadedReceipt) {
                  showToast('Anda harus upload bukti pembayaran dulu!', 'error');
                } else {
                  setCheckoutStep('select_method');
                }
              }}
              className="p-2 bg-slate-50 hover:bg-slate-100 rounded-full border border-gray-200 text-gray-600 transition-colors flex-shrink-0"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 h-5" />
            </button>
            <div className="flex flex-col">
              <h1 className="text-sm sm:text-xl font-extrabold text-gray-900 truncate">Selesaikan Pembayaran</h1>
              <div className="flex items-center text-[10px] sm:text-xs text-amber-600 mt-0.5 font-semibold">
                <AlertTriangle className="w-3 h-3 mr-1 flex-shrink-0" />
                <span className="truncate">Batas waktu <span className="font-extrabold">5 jam</span> (Pukul {createdBooking?.created_at ? new Date(new Date(createdBooking.created_at).getTime() + 5 * 60 * 60 * 1000).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace(/\./g, ':') : new Date(new Date().getTime() + 5 * 60 * 60 * 1000).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace(/\./g, ':')} WIB)</span>
              </div>
            </div>
          </div>
          <span className="bg-amber-50 text-amber-600 border border-amber-200 px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-bold inline-flex items-center gap-1 sm:gap-1.5 shadow-sm flex-shrink-0">
            <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 animate-spin" />
          </span>
        </div>

        {/* NOTICE: The Rincian Sewa component is COMPLETELY REMOVED from this screen as requested. */}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Main Payment Details - Green / Emerald themed */}
          <div className="bg-white rounded-3xl shadow-sm p-4 sm:p-6 border border-gray-100 flex flex-col items-center self-start">

            {/* Account Card Details - Single Box Layout */}
            <div className="w-full flex flex-col items-center relative mb-5">
              <div className="flex items-center justify-center gap-3 mb-5 w-full">
                <div className="text-center flex items-center justify-center gap-3">
                  {(() => {
                    const type = createdBooking?.xendit?.payment_method?.type;
                    const channelCode = createdBooking?.xendit?.payment_method?.virtual_account?.channel_code || createdBooking?.xendit?.payment_method?.ewallet?.channel_code;

                    let n = '';
                    if (type === 'QR_CODE') n = 'qris';
                    else if (channelCode) n = channelCode.toLowerCase();

                    let logo = null;
                    if (dbPaymentMethods && dbPaymentMethods.length > 0) {
                      const matched = dbPaymentMethods.find((dbpm: any) => {
                        const dbName = (dbpm.name || '').toLowerCase();
                        const dbCode = (dbpm.code || '').toLowerCase();
                        return n === dbName || n.includes(dbName.replace(' virtual account', '')) || n.includes(dbCode.replace('_va', ''));
                      });
                      if (matched && matched.logo_url) logo = matched.logo_url;
                    }
                    if (!logo) {
                      if (n.includes('bca')) logo = 'https://upload.wikimedia.org/wikipedia/commons/5/5c/Bank_Central_Asia.svg';
                      else if (n.includes('bri')) logo = 'https://upload.wikimedia.org/wikipedia/commons/2/2e/BRI_2020.svg';
                      else if (n.includes('dana')) logo = 'https://upload.wikimedia.org/wikipedia/commons/7/72/Logo_dana_blue.svg';
                      else if (n.includes('mandiri')) logo = 'https://upload.wikimedia.org/wikipedia/commons/a/ad/Bank_Mandiri_logo_2016.svg';
                      else if (n.includes('bni')) logo = 'https://upload.wikimedia.org/wikipedia/id/5/55/BNI_logo.svg';
                      else if (n.includes('ovo')) logo = 'https://branditechture.agency/brand-logos/wp-content/uploads/wpdm-cache/OVO-900x0.png';
                      else if (n.includes('gopay')) logo = 'https://upload.wikimedia.org/wikipedia/commons/8/86/Gopay_logo.svg';
                      else if (n.includes('shopee')) logo = 'https://upload.wikimedia.org/wikipedia/commons/f/fe/Shopee.svg';
                      else if (n.includes('bsi')) logo = 'https://upload.wikimedia.org/wikipedia/commons/a/a0/Bank_Syariah_Indonesia.svg';
                      else if (n.includes('qris')) logo = 'https://upload.wikimedia.org/wikipedia/commons/a/a2/Logo_QRIS.svg';
                    }

                    return logo ? (
                      <div className="h-8 bg-white flex items-center justify-center p-1 shrink-0">
                        <img src={logo} alt="Bank Logo" className="max-w-full max-h-full object-contain" />
                      </div>
                    ) : null;
                  })()}
                  <span className="block text-base sm:text-lg text-emerald-600 font-extrabold tracking-wider uppercase leading-none">
                    {createdBooking?.xendit?.payment_method?.type?.replace('_', ' ')}
                    {createdBooking?.xendit?.payment_method?.virtual_account?.channel_code && ` - ${createdBooking.xendit.payment_method.virtual_account.channel_code}`}
                    {createdBooking?.xendit?.payment_method?.ewallet?.channel_code && ` - ${createdBooking.xendit.payment_method.ewallet.channel_code}`}
                  </span>
                </div>
              </div>

              {createdBooking?.xendit?.payment_method?.type === 'QR_CODE' && (
                <div className="w-full border-2 border-emerald-100 bg-emerald-50/20 rounded-2xl p-4 flex flex-col items-center">
                  <div className="w-full flex items-center justify-between bg-white border border-emerald-100 rounded-xl py-3 px-4 shadow-sm mb-4">
                    <div className="flex-1 flex justify-between items-center">
                      <div>
                        <p className="text-[10px] sm:text-xs text-gray-400 font-extrabold tracking-wider uppercase mb-0.5">Nominal Yang Harus Dibayar</p>
                        <span className="text-lg sm:text-xl font-extrabold text-emerald-600">Rp {Number(createdBooking.total_price).toLocaleString('id-ID')}</span>
                      </div>
                      <button onClick={() => handleCopy(createdBooking.total_price.toString(), 'nominal')} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition-all active:scale-95 flex-shrink-0 ${copiedNominal ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}>
                        {copiedNominal ? <CheckCircle2 className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                        {copiedNominal ? 'Tersalin' : 'Salin'}
                      </button>
                    </div>
                  </div>
                  <div className="w-full bg-white border border-emerald-100 rounded-xl p-6 shadow-sm mb-4 flex items-center justify-center">
                    <QRCode value={createdBooking.xendit.payment_method.qr_code.channel_properties.qr_string} size={220} />
                  </div>
                  <p className="text-xs text-gray-500 font-bold text-center bg-white py-2 px-4 rounded-xl border border-gray-100">Scan QR Code di atas menggunakan aplikasi E-Wallet atau M-Banking Anda.</p>
                </div>
              )}

              {createdBooking?.xendit?.payment_method?.type === 'EWALLET' && (
                <div className="w-full border-2 border-emerald-100 bg-emerald-50/20 rounded-2xl p-4 flex flex-col items-center">
                  <div className="w-full flex items-center justify-between bg-white border border-emerald-100 rounded-xl py-3 px-4 shadow-sm mb-6">
                    <div className="flex-1 flex justify-between items-center">
                      <div>
                        <p className="text-[10px] sm:text-xs text-gray-400 font-extrabold tracking-wider uppercase mb-0.5">Nominal Yang Harus Dibayar</p>
                        <span className="text-lg sm:text-xl font-extrabold text-emerald-600">Rp {Number(createdBooking.total_price).toLocaleString('id-ID')}</span>
                      </div>
                      <button onClick={() => handleCopy(createdBooking.total_price.toString(), 'nominal')} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition-all active:scale-95 flex-shrink-0 ${copiedNominal ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}>
                        {copiedNominal ? <CheckCircle2 className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                        {copiedNominal ? 'Tersalin' : 'Salin'}
                      </button>
                    </div>
                  </div>

                  {(() => {
                    const xenditData = createdBooking.xendit || {};
                    const actions = xenditData.actions || xenditData.payment_method?.ewallet?.channel_properties?.actions || [];
                    const redirectAction = actions.find((a: any) => a.action === 'MOBILE_DEEPLINK_CHECKOUT_URL' || a.action === 'MOBILE_WEB_CHECKOUT_URL' || a.action === 'DESKTOP_WEB_CHECKOUT_URL' || a.action === 'BROWSER_CHECKOUT_URL' || a.url_type === 'DEEPLINK' || a.url_type === 'WEB');
                    const qrAction = actions.find((a: any) => a.action === 'QR_CHECKOUT_STRING' || a.url_type === 'QR_CODE');

                    const ewalletProps = xenditData.payment_method?.ewallet?.channel_properties || {};
                    const directQrStr = ewalletProps.qr_checkout_string;
                    const directRedirect = ewalletProps.mobile_deeplink_checkout_url || ewalletProps.desktop_web_checkout_url;

                    const finalQrVal = qrAction?.url || qrAction?.qr_code || directQrStr || redirectAction?.url || directRedirect;
                    const finalRedirectUrl = redirectAction?.url || directRedirect;

                    const ewalletChannel = xenditData.payment_method?.ewallet?.channel_code;
                    const isOvo = ewalletChannel === 'OVO';

                    return (
                      <div className="w-full flex flex-col items-center">
                        {isOvo ? (
                          <div className="w-full bg-white border border-emerald-100 rounded-xl p-6 shadow-sm mb-4 flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-3">
                              <span className="text-purple-600 font-extrabold text-xl">OVO</span>
                            </div>
                            <h4 className="font-extrabold text-gray-800 mb-2">Cek Aplikasi OVO Anda</h4>
                            <p className="text-xs text-gray-500 font-medium">Kami telah mengirimkan notifikasi pembayaran ke aplikasi OVO yang terhubung dengan nomor telepon Anda. Silakan buka aplikasi OVO untuk menyelesaikan pembayaran.</p>
                          </div>
                        ) : finalQrVal ? (
                          <>
                            <div className="w-full bg-white border border-emerald-100 rounded-xl p-6 shadow-sm mb-4 flex items-center justify-center">
                              <QRCode value={finalQrVal} size={220} />
                            </div>
                            <p className="text-xs text-gray-500 font-bold text-center bg-white py-2 px-4 rounded-xl border border-gray-100 mb-4 w-full">Scan QR Code di atas menggunakan aplikasi E-Wallet Anda atau kamera HP.</p>
                          </>
                        ) : null}

                        {finalRedirectUrl && !isOvo && (
                          <button
                            onClick={() => window.open(finalRedirectUrl, '_blank')}
                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-4 rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center text-sm"
                          >
                            Buka Aplikasi
                          </button>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              {createdBooking?.xendit?.payment_method?.type === 'VIRTUAL_ACCOUNT' && (
                <div className="w-full border-2 border-emerald-100 bg-emerald-50/20 rounded-2xl p-3 sm:p-4 flex flex-col gap-3">
                  <div className="w-full flex items-center justify-between bg-white border border-emerald-100 rounded-xl py-3 px-3 sm:px-4 shadow-sm">
                    <div className="flex flex-col">
                      <p className="text-[9px] sm:text-[10px] text-gray-400 font-extrabold tracking-wider uppercase mb-0.5">Nominal Transfer</p>
                      <span className="text-sm sm:text-lg font-extrabold text-emerald-600">Rp {Number(createdBooking.total_price).toLocaleString('id-ID')}</span>
                    </div>
                    <button
                      onClick={() => handleCopy(createdBooking.total_price.toString(), 'nominal')}
                      className={`flex items-center justify-center gap-1 px-2.5 py-2 sm:px-4 sm:py-2 rounded-xl font-extrabold text-[9px] sm:text-xs transition-all active:scale-95 shadow-sm border border-transparent flex-shrink-0 ${copiedNominal ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 cursor-pointer'}`}
                    >
                      {copiedNominal ? <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> : <FileText className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
                      {copiedNominal ? 'Tersalin' : 'Salin'}
                    </button>
                  </div>

                  <div className="w-full flex items-center justify-between bg-white border border-emerald-100 rounded-xl py-3 px-3 sm:px-4 shadow-sm">
                    <div className="flex flex-col min-w-0 mr-2">
                      <p className="text-[9px] sm:text-[10px] text-gray-400 font-extrabold tracking-wider uppercase mb-0.5">Nomor Virtual Account</p>
                      <span className="font-mono text-sm sm:text-lg font-extrabold tracking-widest text-emerald-600 truncate">{createdBooking.xendit.payment_method.virtual_account.channel_properties.virtual_account_number}</span>
                    </div>
                    <button
                      onClick={() => handleCopy(createdBooking.xendit.payment_method.virtual_account.channel_properties.virtual_account_number, 'va')}
                      className={`flex items-center justify-center gap-1 px-2.5 py-2 sm:px-4 sm:py-2 rounded-xl font-extrabold text-[9px] sm:text-xs transition-all active:scale-95 shadow-sm border border-transparent flex-shrink-0 ${copiedBCA ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'}`}
                    >
                      {copiedBCA ? <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> : <FileText className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
                      {copiedBCA ? 'Tersalin' : 'Salin'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Konfirmasi Pembayaran Section */}
            <div className="w-full border-t border-gray-100 pt-4">
              <h3 className="font-extrabold text-gray-800 text-sm sm:text-base mb-1 flex items-center gap-2">
                <Upload className="w-4 h-4 text-emerald-500" /> Konfirmasi Pembayaran
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed mb-3">
                Silakan unggah foto bukti transfer ATM, Mobile Banking, atau Internet Banking Anda di bawah ini:
              </p>

              <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
              <div
                onClick={() => !uploadedReceipt && fileInputRef.current.click()}
                className={`border-2 border-dashed rounded-2xl p-4 sm:p-5 text-center transition-all ${uploadedReceipt
                  ? 'border-emerald-500 bg-emerald-50/50'
                  : 'border-emerald-100 bg-slate-50 hover:bg-emerald-50/20 cursor-pointer'
                  }`}
              >
                {uploadedReceipt ? (
                  <div className="flex flex-col items-center">
                    {receiptPreviewUrl ? (
                      <div className="relative mb-2 cursor-pointer group rounded-xl shadow-sm border border-emerald-200 overflow-hidden" onClick={(e) => { e.stopPropagation(); setIsPreviewModalOpen(true); }}>
                        <img src={receiptPreviewUrl} alt="Preview" className="h-20 w-20 object-cover group-hover:scale-105 transition-transform" />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                          <Search className="w-5 h-5 text-white" />
                        </div>
                      </div>
                    ) : (
                      <CheckCircle2 className="h-8 w-8 text-emerald-500 mb-1.5" />
                    )}
                    <p className="font-bold text-emerald-900 text-xs sm:text-sm">Bukti Terupload</p>
                    <p className="text-[10px] sm:text-xs text-emerald-700 mt-0.5 truncate max-w-[200px]">{uploadedFileName}</p>
                    <button onClick={(e) => { e.stopPropagation(); setUploadedReceipt(false); setReceiptPreviewUrl(''); }} className="mt-2 text-[10px] text-red-500 font-bold bg-red-50 px-2.5 py-1 rounded-full hover:bg-red-100 cursor-pointer">Ganti File</button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-1">
                    <ImageIcon className="h-8 w-8 text-slate-400 mb-2" />
                    <p className="font-bold text-gray-700 text-xs sm:text-sm">Pilih Foto Bukti</p>
                    <p className="text-[9px] text-gray-400 font-medium mt-0.5">JPG, PNG, atau WEBP</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Instruksi Card - Emerald themed */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl shadow-sm p-5 sm:p-6 border border-gray-100">
              <h2 className="text-sm sm:text-base font-extrabold text-gray-800 mb-4 pb-3 border-b border-gray-100 flex items-center gap-2">
                <FileText className="w-4.5 h-4.5 text-emerald-600" /> Instruksi Pembayaran
              </h2>

              <div className="border border-gray-200 bg-white rounded-2xl overflow-hidden">
                <div className="px-4 pt-4 border-b border-gray-100 flex flex-wrap gap-2">
                  {currentAccount?.dbInstructions && currentAccount.dbInstructions.length > 0 ? (
                    currentAccount.dbInstructions.map((inst: any, idx: number) => (
                      <button
                        key={idx}
                        onClick={() => setInstructionTab(idx)}
                        className={`px-3 py-2 text-xs font-bold transition-colors border-b-2 ${instructionTab === idx ? 'text-emerald-600 border-emerald-600' : 'text-gray-500 border-transparent hover:text-gray-700'}`}
                      >
                        {inst.title.replace('Pembayaran via ', '')}
                      </button>
                    ))
                  ) : (
                    <button className="px-3 py-2 text-xs font-bold text-emerald-600 border-b-2 border-emerald-600">Panduan Pembayaran</button>
                  )}
                </div>

                <div className="p-4 sm:p-5">
                  {currentAccount?.dbInstructions && currentAccount.dbInstructions.length > 0 ? (
                    <div dangerouslySetInnerHTML={{
                      __html: (currentAccount.dbInstructions[instructionTab]?.content || '')
                        .replace(/contoh:\s*\d+/gi, createdBooking?.xendit?.payment_method?.virtual_account?.channel_properties?.virtual_account_number ? `contoh: <span class="font-mono font-extrabold text-emerald-600">${createdBooking.xendit.payment_method.virtual_account.channel_properties.virtual_account_number}</span>` : '$&')
                        .replace(/<ol>/g, '<ol class="list-decimal pl-5 space-y-3 text-[13px] sm:text-sm text-gray-700 font-medium leading-relaxed">')
                        .replace(/<ul>/g, '<ul class="list-disc pl-5 space-y-3 text-[13px] sm:text-sm text-gray-700 font-medium leading-relaxed">')
                        .replace(/<li>/g, '<li class="pl-1">')
                        .replace(/<strong>/g, '<strong class="font-extrabold text-gray-900">')
                    }} />
                  ) : (
                    <ol className="space-y-3.5 text-xs text-gray-600 font-bold list-decimal pl-4 leading-relaxed">
                      {currentAccount?.instructions?.map((ins: any, i: number) => {
                        if (ins.includes('Atas Nama:')) {
                          const parts = ins.split(': ');
                          return (
                            <li key={i}>
                              {parts[0]}: <span className="font-bold text-slate-800">{parts.slice(1).join(': ')}</span>
                            </li>
                          );
                        }
                        if (ins.includes(': ') && !ins.includes('WhatsApp')) {
                          const parts = ins.split(': ');
                          return (
                            <li key={i}>
                              {parts[0]}: <span className="font-bold text-slate-800 font-mono">{parts.slice(1).join(': ')}</span>
                            </li>
                          );
                        }
                        if (ins.includes('nominal')) {
                          return (
                            <li key={i}>
                              Transfer sesuai nominal <span className="text-blue-600 font-extrabold">(hingga 3 digit terakhir)</span> ke rekening berikut:
                            </li>
                          );
                        }
                        return <li key={i}>{ins}</li>;
                      })}
                    </ol>
                  )}
                </div>
              </div>

              {/* Kirim Bukti Pembayaran Button */}
              <button
                onClick={submitCheckout}
                disabled={!uploadedReceipt || isSubmittingReceipt}
                className={`w-full mt-6 py-4 rounded-xl font-extrabold text-white text-base transition-all shadow-md flex items-center justify-center gap-2 ${uploadedReceipt && !isSubmittingReceipt
                  ? 'bg-emerald-600 hover:bg-emerald-700 active:scale-95 cursor-pointer shadow-emerald-600/20'
                  : 'bg-gray-300 shadow-none cursor-not-allowed text-gray-400'
                  }`}
              >
                {isSubmittingReceipt ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Mengirim Bukti...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    Kirim Bukti Pembayaran
                  </>
                )}
              </button>

              {/* Kembali ke Beranda Button */}
              <button
                onClick={() => {
                  if (!uploadedReceipt) {
                    showToast('Anda harus upload bukti pembayaran dulu!', 'error');
                  } else {
                    setCurrentView('home');
                  }
                }}
                className="w-full mt-3 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold py-3.5 rounded-xl text-sm transition-colors border border-slate-200 cursor-pointer"
              >
                Kembali ke Beranda
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderSuccessView = () => (
    <div className="max-w-sm mx-auto px-4 py-20 text-center animate-fade-in">
      <div className="bg-white rounded-3xl shadow-xl p-8 border-t-[8px] border-emerald-500">
        <Clock3 className="h-16 w-16 text-emerald-500 mx-auto mb-4 animate-pulse" />
        <h2 className="text-2xl font-extrabold text-gray-900 mb-2">Sedang Diproses</h2>
        <p className="text-gray-500 text-sm mb-6 leading-relaxed">
          Bukti pembayaran berhasil dikirim. Admin akan segera memvalidasi pesanan Anda.
        </p>
        <button onClick={() => setCurrentView('my_bookings')} className="w-full bg-emerald-600 text-white font-extrabold py-3.5 rounded-xl shadow-md active:scale-95 mb-3">
          Cek Status Booking
        </button>
        <button onClick={() => setCurrentView('home')} className="w-full bg-gray-100 text-gray-600 font-bold py-3.5 rounded-xl">
          Kembali ke Beranda
        </button>
      </div>
    </div>
  );

  const renderFooter = () => (
    <footer className="bg-[#0f172a] text-gray-400 py-10 mt-auto pb-24 sm:pb-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center">
        <div className="flex items-center text-white mb-3">
          <ShieldCheck className="h-6 w-6 mr-2 text-emerald-400" />
          <span className="font-extrabold text-xl">Booking<span className="text-emerald-400">Lapang</span></span>
        </div>
        <p className="text-sm mb-6 max-w-sm">Platform penyewaan lapangan futsal & mini soccer terbaik.</p>

        {/* Tombol Tautan WhatsApp */}
        <a href="https://wa.me/6282219882449" target="_blank" rel="noopener noreferrer" className="inline-flex items-center font-bold text-white bg-green-600 px-5 py-2.5 rounded-xl hover:bg-green-500 transition-colors shadow-lg shadow-green-900/20 active:scale-95">
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 21.974c-1.332 0-2.617-.354-3.76-.985l-4.185 1.1 1.12-4.08A9.974 9.974 0 0 1 2.05 12C2.05 6.486 6.536 2 12.031 2s9.98 4.486 9.98 9.98-4.485 10.015-9.98 10.015l-.01.004-.01-.025Zm-3.415-3.084c1.03.62 2.196.953 3.415.953 4.382 0 7.95-3.568 7.95-7.95s-3.568-7.95-7.95-7.95-7.95 3.568-7.95 7.95c0 1.346.335 2.59 1.004 3.654l-.696 2.535 2.607-.69-.005-.006c-.19-.084-.38-.173-.574-.265v.006Zm8.04-5.344c-.426-.214-2.52-1.246-2.91-1.388-.39-.144-.676-.214-.96.214-.285.428-1.1 1.388-1.348 1.674-.25.285-.498.32-.924.107-.426-.214-1.8-.665-3.43-2.12-.125-.107-.24-.225-.34-.356-1.157-1.464-1.28-1.928-1.28-2.677 0-1.035.785-1.5 1.07-1.785.285-.285.57-.285.76-.285.19 0 .38.035.57.07.19.036.427.07.665.607.238.536 1.046 2.535 1.14 2.713.095.18.143.393.048.607-.095.214-.143.357-.285.57-.143.215-.31.465-.428.57-.142.108-.295.23-.13.515.165.285.736 1.214 1.578 1.963.155.138.318.267.488.384.896.657 1.637.89 1.922 1.035.285.143.45.107.618-.07.166-.18 1.14-1.14 1.425-1.534.285-.393.57-.32.96-.18.39.144 2.47 1.178 2.896 1.393.427.214.712.32 1.004.814v.005c.002-.132.002-.32-.084-.666Z" /></svg>
          Hubungi Admin (WhatsApp)
        </a>


        <div className="w-full mt-8 pt-4 border-t border-slate-800/50 text-[10px] sm:text-xs">
          &copy; {new Date().getFullYear()} Booking Lapang. All rights reserved.
        </div>
      </div>
    </footer>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans flex flex-col selection:bg-emerald-200 flex-grow" style={{ overflowX: 'hidden', maxWidth: '100vw' }}>
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes scaleUp { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
        .animate-scale-up { animation: scaleUp 0.15s ease-out forwards; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        * { box-sizing: border-box; }
        html, body, #__next { overflow-x: hidden !important; max-width: 100vw !important; }
        .pb-safe { padding-bottom: env(safe-area-inset-bottom); }
        button:not(:disabled) { cursor: pointer !important; }
        button:disabled { cursor: not-allowed !important; }
      `}} />

      {renderNavbar()}

      <main className="flex-grow relative">
        {currentView === 'home' && renderHomeView()}
        {currentView === 'my_bookings' && renderMyBookingsView()}
        {currentView === 'detail' && renderDetailView()}
        {currentView === 'login' && renderLoginView()}
        {currentView === 'checkout' && renderCheckoutView()}
        {currentView === 'success' && renderSuccessView()}
      </main>

      {/* FOOTER */}
      {currentView !== 'detail' && renderFooter()}

      {/* MODAL: Konfirmasi Batalkan Pesanan */}
      {confirmCancelId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl">
            <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-extrabold text-gray-900 mb-2">Batalkan Pesanan?</h3>
            <p className="text-sm text-gray-500 mb-8">Apakah Anda yakin ingin membatalkan booking lapangan ini? Tindakan ini tidak bisa dibatalkan.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmCancelId(null)} className="flex-1 py-3 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
                Kembali
              </button>
              <button onClick={() => confirmCancel(confirmCancelId)} className="flex-1 py-3 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 transition-colors shadow-md shadow-red-600/20">
                Ya, Batalkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Payment Info Popup */}
      {paymentPopup.isOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: '12px', boxSizing: 'border-box' }} className="animate-fade-in">
          <div style={{ backgroundColor: 'white', borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '1px solid #f3f4f6', display: 'flex', flexDirection: 'column', width: '100%', maxWidth: '360px', maxHeight: '90vh', overflow: 'hidden', boxSizing: 'border-box' }} className="animate-scale-up">

            {/* Scrollable Content */}
            <div style={{ overflowY: 'auto', overflowX: 'hidden', flex: 1, padding: '20px 16px 16px', boxSizing: 'border-box', wordBreak: 'break-word' }}>
              {/* Icon */}
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
                {paymentPopup.type === 'qris' && <QrCode className="w-6 h-6" />}
                {paymentPopup.type === 'url' && <Wallet className="w-6 h-6" />}
                {paymentPopup.type === 'va' && <CreditCard className="w-6 h-6" />}
              </div>

              <h3 className="text-sm font-extrabold text-gray-900 mb-0.5 leading-tight text-center break-words">{paymentPopup.title}</h3>
              <p className="text-[11px] text-gray-400 mb-4 text-center">Metode Pembayaran Otomatis</p>

              {/* Detail Pesanan */}
              {paymentPopup.booking && (
                <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 text-xs space-y-2 mb-4 text-left w-full">
                  <p className="text-gray-500 font-bold pb-1.5 border-b border-gray-200 text-[10px] uppercase tracking-wider">Detail Pesanan</p>
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-gray-400 font-medium shrink-0">Lapangan</span>
                    <span className="text-gray-900 font-extrabold text-right break-words min-w-0">{paymentPopup.booking.fieldName}</span>
                  </div>
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-gray-400 font-medium shrink-0">Tanggal</span>
                    <span className="text-gray-900 font-bold text-right break-words min-w-0">{paymentPopup.booking.date}</span>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-gray-400 font-medium shrink-0">Jam</span>
                    <span className="text-gray-900 font-bold text-right">{paymentPopup.booking.time}</span>
                  </div>
                  <div className="flex justify-between items-center gap-2 pt-2 border-t border-slate-200">
                    <span className="text-gray-900 font-extrabold shrink-0">Total</span>
                    <span className="text-emerald-600 font-black text-sm">Rp {paymentPopup.booking.price.toLocaleString('id-ID')}</span>
                  </div>
                </div>
              )}

              {/* QR / VA Section */}
              {(paymentPopup.type === 'qris' || paymentPopup.type === 'url') ? (
                <div className="flex flex-col items-center w-full">
                  <p className="text-[10px] text-gray-400 mb-3 leading-relaxed text-center">
                    Scan QRIS ini di aplikasi E-Wallet (GOPAY, OVO, DANA, LinkAja) atau m-Banking.
                  </p>
                  <div style={{ backgroundColor: 'white', padding: '12px', border: '2px solid #f1f5f9', borderRadius: '16px', marginBottom: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', boxSizing: 'border-box' }}>
                    <QRCode value={paymentPopup.value} style={{ width: '100%', maxWidth: '160px', height: 'auto' }} id="qris-canvas" />
                  </div>
                  <div className="flex flex-col gap-2 w-full">
                    <button
                      onClick={() => {
                        const svg = document.getElementById('qris-canvas');
                        if (svg) {
                          const svgData = new XMLSerializer().serializeToString(svg);
                          const canvas = document.createElement('canvas');
                          const ctx = canvas.getContext('2d');
                          const img = new Image();
                          img.onload = () => {
                            canvas.width = img.width;
                            canvas.height = img.height;
                            ctx?.drawImage(img, 0, 0);
                            const pngFile = canvas.toDataURL('image/png');
                            const downloadLink = document.createElement('a');
                            downloadLink.download = `QRIS-${paymentPopup.booking?.bookingCode || 'PAYMENT'}.png`;
                            downloadLink.href = pngFile;
                            downloadLink.click();
                            showToast('Barcode QRIS berhasil diunduh');
                          };
                          img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
                        }
                      }}
                      className="inline-flex items-center justify-center w-full py-2.5 bg-slate-100 text-slate-700 rounded-xl font-extrabold text-xs hover:bg-slate-200 transition-colors active:scale-95"
                    >
                      <Download className="w-3.5 h-3.5 mr-1.5" /> Unduh Barcode
                    </button>
                    {paymentPopup.type === 'url' ? (
                      <a
                        href={paymentPopup.value}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center w-full py-2.5 bg-emerald-600 text-white rounded-xl font-extrabold text-xs shadow-md hover:bg-emerald-700 transition-colors active:scale-95"
                      >
                        <Wallet className="w-3.5 h-3.5 mr-1.5" /> Buka Aplikasi E-Wallet
                      </a>
                    ) : (
                      <button
                        onClick={() => showToast('Silakan buka aplikasi E-Wallet dari HP Anda dan unggah QRIS yang baru diunduh.')}
                        className="inline-flex items-center justify-center w-full py-2.5 bg-emerald-600 text-white rounded-xl font-extrabold text-xs shadow-md hover:bg-emerald-700 transition-colors active:scale-95"
                      >
                        <Wallet className="w-3.5 h-3.5 mr-1.5" /> Buka Aplikasi E-Wallet
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100 text-center w-full">
                  <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider mb-2">Nomor Virtual Account</p>
                  <div className="flex items-center justify-center gap-2 mb-2 min-w-0">
                    <p className="text-base font-black tracking-wider text-emerald-800 break-all min-w-0">{paymentPopup.value}</p>
                    <button
                      onClick={() => { navigator.clipboard.writeText(paymentPopup.value); showToast('Nomor VA disalin ke clipboard'); }}
                      className="p-1.5 bg-white border border-emerald-100 rounded-lg hover:bg-emerald-50 active:scale-95 transition-all text-emerald-600 shrink-0"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-[10px] text-emerald-500 leading-relaxed">
                    Pembayaran terdeteksi otomatis setelah transfer.
                  </p>
                </div>
              )}
            </div>

            {/* Fixed Bottom Button */}
            <div className="px-5 py-3 border-t border-slate-100 bg-white shrink-0">
              <button
                onClick={() => setPaymentPopup({ isOpen: false, type: '', value: '', title: '', booking: null })}
                className="w-full py-3 rounded-xl font-extrabold text-xs text-gray-500 bg-gray-50 hover:bg-gray-100 transition-colors border border-gray-200 active:scale-95"
              >
                Tutup Halaman
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Berikan Ulasan (Rating) */}
      {ratingBooking && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl">
            <h3 className="text-xl font-extrabold text-gray-900 mb-2">Berikan Ulasan</h3>
            <p className="text-sm text-gray-500 mb-6">Bagaimana pengalaman Anda bermain di <br /><strong className="text-gray-800">{ratingBooking.fieldName}</strong>?</p>

            <div className="flex justify-center gap-2 mb-8">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onMouseEnter={() => setHoveredStar(star)}
                  onMouseLeave={() => setHoveredStar(0)}
                  onClick={() => setSelectedStar(star)}
                  className="p-1 focus:outline-none transform transition-transform hover:scale-110 active:scale-95"
                >
                  <Star className={`w-10 h-10 transition-colors ${star <= (hoveredStar || selectedStar) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`} />
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button onClick={() => { setRatingBooking(null); setSelectedStar(0); }} className="flex-1 py-3 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
                Nanti Saja
              </button>
              <button onClick={submitRating} disabled={selectedStar === 0} className={`flex-1 py-3 rounded-xl font-bold text-white transition-colors shadow-md ${selectedStar > 0 ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20' : 'bg-gray-300 cursor-not-allowed'}`}>
                Kirim Ulasan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MOBILE BOTTOM NAVIGATION (Khusus Tampilan Menu Utama & History) */}
      {(currentView === 'home' || currentView === 'my_bookings') && (
        <div className="sm:hidden fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 flex justify-around items-center pb-safe z-50 px-2 py-2 shadow-[0_-5px_15px_rgba(0,0,0,0.05)]">
          <button
            onClick={() => setCurrentView('home')}
            className={`flex flex-col items-center p-2 w-full transition-colors ${currentView === 'home' ? 'text-emerald-600' : 'text-gray-400'}`}
          >
            <Home className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-extrabold">Sewa Lapang</span>
          </button>

          <button
            onClick={() => { if (!user) { signIn(); } else { setCurrentView('my_bookings'); } }}
            className={`flex flex-col items-center p-2 w-full transition-colors ${currentView === 'my_bookings' ? 'text-emerald-600' : 'text-gray-400'}`}
          >
            <FileText className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-extrabold">Booking Lapang</span>
          </button>
        </div>
      )}
      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed top-5 right-5 z-[200] animate-fade-in">
          <div className={`px-4 py-3 rounded-xl shadow-lg border flex items-center ${toast.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
            {toast.type === 'error' ? <AlertTriangle className="w-5 h-5 mr-2" /> : <CheckCircle className="w-5 h-5 mr-2" />}
            <span className="font-bold text-sm">{toast.message}</span>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {isPreviewModalOpen && receiptPreviewUrl && (
        <div
          className="fixed inset-0 z-[250] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in"
          onClick={() => setIsPreviewModalOpen(false)}
        >
          <div className="relative inline-flex flex-col items-center max-w-full">
            <button
              className="absolute -top-4 -right-4 sm:-top-5 sm:-right-5 z-10 bg-white hover:bg-gray-200 text-gray-900 rounded-full p-1.5 shadow-lg transition-colors"
              onClick={() => setIsPreviewModalOpen(false)}
            >
              <XCircle className="w-6 h-6 sm:w-7 sm:h-7" />
            </button>
            <img
              src={receiptPreviewUrl}
              alt="Bukti Transfer Penuh"
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white border border-gray-100 rounded-3xl max-w-sm w-full p-6 shadow-2xl animate-scale-up text-center">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100 text-red-500">
              <LogOut className="h-8 w-8 animate-pulse" />
            </div>
            <h3 className="text-xl font-extrabold text-gray-900 mb-2">Konfirmasi Keluar</h3>
            <p className="text-sm text-gray-500 mb-6 font-medium">Apakah Anda yakin ingin keluar dari akun Anda?</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-xl transition-colors cursor-pointer text-sm"
              >
                Batal
              </button>
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-colors cursor-pointer text-sm"
              >
                Ya, Keluar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}