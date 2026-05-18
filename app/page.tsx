// @ts-nocheck
"use client";
import React, { useState, useEffect, useRef } from 'react';
import {
  Search, Calendar, Clock, Star, MapPin, Upload,
  User, LogOut, ArrowLeft, CheckCircle2, XCircle, ShieldCheck,
  Image as ImageIcon, Home, FileText, CheckCircle, Clock3, XOctagon, AlertTriangle
} from 'lucide-react';



// Helper to generate mock time slots
const generateTimeSlots = (dateString, fieldId) => {
  const slots = [];
  const startHour = 8;
  const endHour = 22;
  const seed = (dateString?.length || 0) + fieldId;

  for (let i = startHour; i < endHour; i++) {
    const isBooked = (i + seed) % 4 === 0;
    slots.push({ hour: i, status: isBooked ? 'booked' : 'available' });
  }
  return slots;
};

export default function App() {
  // --- APP STATE ---
  const [currentView, setCurrentView] = useState('home');
  const [user, setUser] = useState(null);

  // Home / Search State
  const [fields, setFields] = useState([]);
  const [allFields, setAllFields] = useState([]);
  const [isLoadingFields, setIsLoadingFields] = useState(true);
  const [searchName, setSearchName] = useState(''); // Diperbaiki: Variabel ini sebelumnya terhapus
  const [searchDate, setSearchDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTime, setSearchTime] = useState('');

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
  
  // Copy States
  const [copiedBCA, setCopiedBCA] = useState(false);
  const [copiedEwallet, setCopiedEwallet] = useState(false);

  const handleCopy = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === 'bca') {
      setCopiedBCA(true);
      setTimeout(() => setCopiedBCA(false), 2000);
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

  // Mock Data History Pesanan 
  const [myBookings, setMyBookings] = useState([]);

  // Toast State
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = (message: string, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  useEffect(() => {
    window.alert = (msg) => showToast(msg, 'error');
  }, []);

  useEffect(() => {
    fetch('/api/fields')
      .then(res => res.json())
      .then(data => {
        // Adapt fields to match component's expected data structure if needed
        const adaptedData = data.map((f: any) => ({
          id: f.id,
          name: f.name,
          type: f.type,
          facilities: f.facilities || [],
          price: Number(f.price_per_hour || f.pricePerHour || 100000), // Handle DB snake_case or JSON camelCase
          rating: 4.5, // Mock rating
          reviews: 50,
          images: f.images || [],
          location: f.location,
          mapUrl: f.map_url,
          status: f.status
        }));
        setFields(adaptedData);
        setAllFields(adaptedData);
        setIsLoadingFields(false);
      })
      .catch(err => {
        console.error("Error fetching fields", err);
        setIsLoadingFields(false);
      });
  }, []);

  const fetchMyBookings = () => {
    if (user) {
      fetch(`/api/bookings?customerId=${user.id}`)
        .then(res => res.json())
        .then(data => {
          const adapted = data.map((b: any) => ({
            id: b.id,
            bookingCode: b.booking_code || b.bookingCode,
            fieldName: b.field_name,
            date: new Date(b.booking_date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
            time: `${b.start_hour}:00 - ${b.end_hour}:00`,
            price: Number(b.total_price),
            status: b.status.toLowerCase(),
            rated: false
          }));
          setMyBookings(adapted);
        })
        .catch(err => console.error("Error fetching bookings", err));
    }
  };

  useEffect(() => {
    fetchMyBookings();
  }, [user]);

  // --- HANDLERS ---
  const handleSearchName = (e) => {
    const val = e.target.value;
    setSearchName(val);
    let filtered = allFields.filter((f: any) => f.name.toLowerCase().includes(val.toLowerCase()));

    // Pertahankan filter jam jika sedang aktif
    if (searchTime) {
      filtered = [...filtered].sort(() => Math.random() - 0.5);
    }
    setFields(filtered);
  };

  const handleSearch = () => {
    let filtered = allFields;
    if (searchName) {
      filtered = filtered.filter(f => f.name.toLowerCase().includes(searchName.toLowerCase()));
    }
    // Logika Filter Jam (Bisa disesuaikan dengan koneksi database sungguhan)
    // Disini kita acak saja urutannya sebagai simulasi filter pencarian
    if (searchTime) {
      filtered = [...filtered].sort(() => Math.random() - 0.5);
    }
    setFields(filtered);
  };

  const handleResetSearch = () => {
    setSearchName('');
    setSearchDate(new Date().toISOString().split('T')[0]);
    setSearchTime('');
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
      setTimeSlots(generateTimeSlots(bookingDate, selectedField.id));
      if (!searchTime) {
        setStartHour('');
        setEndHour('');
      }
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
      setCurrentView('login');
      window.scrollTo(0, 0);
    } else {
      setCurrentView('checkout');
      window.scrollTo(0, 0);
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    setUser({ id: 1, name: 'Budi Santoso', email: 'budi@example.com' });
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

  const submitCheckout = async () => {
    const duration = Number(endHour) - Number(startHour);
    const total = (duration * selectedField.price) + 5000;

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

    fetch('/api/bookings', {
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
        receiptImg: receiptUrl
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          alert(data.error);
          return;
        }
        fetchMyBookings();
        setCurrentView('success');
        setUploadedReceipt(false);
        setUploadedFileName('');
        setReceiptFile(null);
        setReceiptPreviewUrl('');
        setIsPreviewModalOpen(false);
        window.scrollTo(0, 0);
      })
      .catch(err => console.error("Error creating booking", err));
  };

  const confirmCancel = (id) => {
    fetch('/api/bookings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: 'DIBATALKAN' })
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
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center cursor-pointer group" onClick={() => setCurrentView('home')}>
            <div className="bg-gradient-to-br from-emerald-400 to-emerald-600 p-1.5 rounded-lg mr-2 sm:mr-2.5 shadow-lg">
              <ShieldCheck className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            {/* Nama Logo Tampil di HP dan Desktop */}
            <span className="font-extrabold text-lg sm:text-xl tracking-tight">
              Booking<span className="text-emerald-400">Lapang</span>
            </span>
          </div>

          <div className="hidden sm:flex items-center space-x-8">
            <button onClick={() => setCurrentView('home')} className={`font-bold transition-colors ${currentView === 'home' ? 'text-emerald-400' : 'text-gray-300 hover:text-white'}`}>
              Sewa Lapang
            </button>
            <button onClick={() => { if (!user) { setCurrentView('login'); } else { setCurrentView('my_bookings'); } }} className={`font-bold transition-colors ${currentView === 'my_bookings' ? 'text-emerald-400' : 'text-gray-300 hover:text-white'}`}>
              Booking Lapang
            </button>
          </div>

          <div className="flex items-center">
            {user ? (
              <div className="flex items-center space-x-3">
                <span className="text-sm font-medium text-gray-200 hidden sm:block">Hai, {user.name.split(' ')[0]}</span>
                <button onClick={() => { setUser(null); setCurrentView('home'); }} className="p-2 bg-slate-800 rounded-full hover:bg-slate-700" title="Keluar">
                  <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
              </div>
            ) : (
              <button onClick={() => setCurrentView('login')} className="flex items-center bg-emerald-500 text-white px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-bold hover:bg-emerald-400 shadow-sm">
                <User className="h-4 w-4 sm:mr-1.5" /> <span className="hidden sm:inline">Masuk</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );

  const renderHomeView = () => (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-6 animate-fade-in">
      {/* Hero Section */}
      <div className="bg-emerald-600 rounded-3xl p-6 sm:p-10 mb-8 shadow-lg bg-gradient-to-br from-emerald-600 to-emerald-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-8 -mt-8 opacity-10">
          <ShieldCheck className="w-48 h-48 text-white" />
        </div>

        {/* Grup Pencarian Tanggal & Jam */}
        <div className="max-w-3xl mx-auto relative z-10 bg-white/10 backdrop-blur-md p-4 sm:p-6 rounded-3xl border border-white/20">
          <h2 className="text-white font-extrabold text-xl sm:text-2xl mb-4 text-center">Cari Jadwal Lapangan Kosong</h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <label className="block text-emerald-100 text-[10px] sm:text-xs font-bold uppercase mb-1 px-1">Pilih Tanggal</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 transform -translate-y-1/2 text-emerald-600 h-5 w-5 z-10" />
                <input
                  type="date"
                  className="w-full pl-12 pr-4 py-3.5 text-sm sm:text-base border-0 rounded-2xl shadow-inner focus:ring-4 focus:ring-emerald-400/50 font-bold text-gray-800 bg-white"
                  value={searchDate} onChange={(e) => setSearchDate(e.target.value)}
                />
              </div>
            </div>

            <div className="relative flex-1">
              <label className="block text-emerald-100 text-[10px] sm:text-xs font-bold uppercase mb-1 px-1">Jam Main</label>
              <div className="relative">
                <Clock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-emerald-600 h-5 w-5 z-10" />
                <select
                  className="w-full pl-12 pr-4 py-3.5 text-sm sm:text-base border-0 rounded-2xl shadow-inner focus:ring-4 focus:ring-emerald-400/50 font-bold text-gray-800 bg-white appearance-none"
                  value={searchTime} onChange={(e) => setSearchTime(e.target.value)}
                >
                  <option value="">Semua Jam</option>
                  {[...Array(14)].map((_, i) => {
                    const hour = i + 8;
                    return <option key={hour} value={hour}>{String(hour).padStart(2, '0')}:00</option>
                  })}
                </select>
              </div>
            </div>

            <div className="flex items-end mt-2 sm:mt-0 gap-2 w-full sm:w-auto">
              <button onClick={handleResetSearch} className="flex-1 sm:flex-none bg-emerald-700/50 text-white border border-emerald-500/50 hover:bg-emerald-700 px-4 py-3.5 rounded-2xl font-bold text-sm sm:text-base shadow-lg active:scale-95 transition-all flex justify-center items-center h-[52px]">
                Reset
              </button>
              <button onClick={handleSearch} className="flex-[2] sm:flex-none bg-emerald-400 text-emerald-900 hover:bg-emerald-300 px-6 sm:px-8 py-3.5 rounded-2xl font-extrabold text-sm sm:text-base shadow-lg active:scale-95 transition-all flex justify-center items-center h-[52px]">
                <Search className="h-5 w-5 sm:mr-1.5" />
                <span className="sm:inline">Cari</span>
              </button>
            </div>
          </div>

          {/* Tambahan Kolom Pencarian Nama Lapangan di bawah grup */}
          <div className="mt-4 relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 z-10" />
            <input
              type="text"
              placeholder="Ketik nama lapangan (Cth: Garuda, Champion)..."
              className="w-full pl-12 pr-4 py-3.5 text-sm sm:text-base border-0 rounded-2xl shadow-inner focus:ring-4 focus:ring-emerald-400/50 font-bold text-gray-800 bg-white"
              value={searchName}
              onChange={handleSearchName}
            />
          </div>
        </div>
      </div>

      <h2 className="text-lg sm:text-2xl font-extrabold text-gray-900 mb-4 sm:mb-6 flex items-center">
        <MapPin className="mr-2 text-emerald-500 w-5 h-5 sm:w-6 sm:h-6" /> Katalog Lapangan
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-8">
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

  const renderMyBookingsView = () => (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 animate-fade-in">
      <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-6">Booking Lapang (Pesanan Saya)</h1>

      {myBookings.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 text-center shadow-sm border border-gray-100">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-gray-800">Belum Ada Transaksi</h2>
          <p className="text-sm text-gray-500 mt-2">Anda belum melakukan pemesanan lapangan.</p>
          <button onClick={() => setCurrentView('home')} className="mt-6 bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold shadow-md">
            Cari Lapangan Sekarang
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {myBookings.map((bkg, index) => {
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
              <div key={index} className={`bg-white rounded-2xl shadow-sm border p-4 sm:p-5 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center ${bkg.status === 'dibatalkan' ? 'border-gray-200 opacity-60' : 'border-gray-100'}`}>
                <div className="w-full sm:w-auto flex-1">
                  <div className="flex justify-between items-start mb-2 sm:mb-1">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{bkg.bookingCode}</p>
                    <div className={`sm:hidden flex items-center px-2 py-1 rounded-full border text-[10px] font-bold ${statusColor}`}>
                      <StatusIcon className="w-3 h-3 mr-1" /> {statusText}
                    </div>
                  </div>
                  <h3 className="font-extrabold text-gray-900 text-base sm:text-lg mb-1 leading-tight">{bkg.fieldName}</h3>
                  <div className="flex items-center text-xs sm:text-sm text-gray-600 font-medium">
                    <Calendar className="w-3.5 h-3.5 mr-1.5" />
                    {bkg.date}
                    <span className="mx-2 text-gray-300">|</span>
                    <Clock className="w-3.5 h-3.5 mr-1.5" />
                    {bkg.time}
                  </div>

                  {/* Tombol Cancel (Khusus untuk status Menunggu) */}
                  {bkg.status === 'menunggu' && (
                    <button
                      onClick={() => setConfirmCancelId(bkg.id)}
                      className="mt-4 inline-flex items-center justify-center px-4 py-2 border-2 border-red-200 text-red-600 hover:bg-red-50 rounded-xl text-xs sm:text-sm font-bold transition-colors w-full sm:w-auto"
                    >
                      <XOctagon className="w-4 h-4 mr-1.5" /> Batalkan Pesanan
                    </button>
                  )}

                  {/* Tombol Beri Ulasan (Khusus untuk status Dikonfirmasi yang belum di-rate) */}
                  {bkg.status === 'dikonfirmasi' && !bkg.rated && (
                    <button
                      onClick={() => setRatingBooking(bkg)}
                      className="mt-4 inline-flex items-center justify-center px-4 py-2 border-2 border-yellow-300 text-yellow-700 bg-yellow-50 hover:bg-yellow-100 rounded-xl text-xs sm:text-sm font-bold transition-colors w-full sm:w-auto shadow-sm"
                    >
                      <Star className="w-4 h-4 mr-1.5 fill-current" /> Beri Ulasan
                    </button>
                  )}

                  {/* Jika sudah diulas */}
                  {bkg.status === 'dikonfirmasi' && bkg.rated && (
                    <div className="mt-4 inline-flex items-center px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-600">
                      Ulasan Anda: <Star className="w-3.5 h-3.5 ml-1.5 text-yellow-500 fill-current" /> {bkg.rating}/5
                    </div>
                  )}
                </div>

                <div className="flex flex-row sm:flex-col justify-between items-center sm:items-end w-full sm:w-auto mt-2 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-0 border-gray-100">
                  <div className="text-left sm:text-right">
                    <p className="text-[10px] text-gray-500 font-medium hidden sm:block mb-0.5">Total Biaya</p>
                    <p className="font-extrabold text-emerald-600 text-base sm:text-lg">Rp {bkg.price.toLocaleString('id-ID')}</p>
                  </div>
                  <div className={`hidden sm:flex items-center mt-2 px-3 py-1.5 rounded-lg border text-xs font-bold ${statusColor}`}>
                    <StatusIcon className="w-4 h-4 mr-1.5" /> {statusText}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  );

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

              <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/90 to-transparent p-5 sm:p-8 pointer-events-none">
                <div className="flex gap-2 mb-2">
                  <span className="bg-emerald-500 text-white px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold inline-block">{selectedField.type}</span>
                  {selectedField.status?.toLowerCase() === 'aktif' ? (
                    <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold inline-block flex items-center">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1.5"></div>Buka
                    </span>
                  ) : (
                    <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold inline-block flex items-center">
                      <div className="w-1.5 h-1.5 bg-red-500 rounded-full mr-1.5"></div>Tutup
                    </span>
                  )}
                </div>
                <h1 className="text-xl sm:text-3xl font-extrabold text-white leading-tight">{selectedField.name}</h1>
              </div>
            </div>

            {/* Thumbnail Navigation */}
            <div className="flex overflow-x-auto gap-2 p-3 sm:p-4 bg-gray-50 border-b border-gray-100 scrollbar-hide">
              {selectedField.images.map((img, idx) => (
                <div key={idx} onClick={() => scrollToImage(idx)} className={`relative flex-shrink-0 w-20 h-16 sm:w-28 sm:h-20 rounded-lg overflow-hidden cursor-pointer transition-all duration-200 border-2 ${currentImageIndex === idx ? 'border-emerald-500 shadow-md ring-2 ring-emerald-200' : 'border-transparent opacity-70 hover:opacity-100'}`}>
                  <img src={img} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>

            <div className="p-4 sm:p-8 flex flex-col lg:flex-row gap-6 lg:gap-10">
              <div className="flex-1">
                <div className="flex gap-4 mb-6 pb-6 border-b border-gray-100">
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

                <h3 className="font-extrabold text-gray-900 mb-3 text-base sm:text-xl">Fasilitas Utama</h3>
                <ul className="space-y-3 mb-8">
                  {selectedField.facilities && selectedField.facilities.map((fac, idx) => (
                    <li key={idx} className="flex items-center text-gray-700 bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500 mr-3" />
                      <span className="text-sm font-bold">{fac}</span>
                    </li>
                  ))}
                  <li className="flex items-center text-gray-700 bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <MapPin className="h-5 w-5 text-emerald-500 mr-3" />
                    <span className="text-sm font-bold">{selectedField.location}</span>
                  </li>
                </ul>

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

              {/* Kolom Kanan: Pilih Jadwal (Start - End) */}
              <div className="flex-1 lg:max-w-[420px]">
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
                        <label className="block text-xs font-bold text-gray-600 uppercase mb-1.5">1. Tanggal Main</label>
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
                          <label className="block text-xs font-bold text-gray-600 uppercase mb-1.5">2. Jam Mulai</label>
                          <select
                            className="w-full px-3 py-3 border-2 border-gray-200 rounded-xl bg-white font-bold text-gray-900 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                            value={startHour}
                            onChange={(e) => setStartHour(e.target.value)}
                          >
                            <option value="" disabled>Pilih</option>
                            {[...Array(14)].map((_, i) => {
                              const hour = i + 8;
                              return <option key={hour} value={hour}>{String(hour).padStart(2, '0')}:00</option>
                            })}
                          </select>
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs font-bold text-gray-600 uppercase mb-1.5">3. Jam Selesai</label>
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
    const serviceFee = 5000;
    const finalTotal = totalFieldPrice + serviceFee;
    const timeString = `${String(startHour).padStart(2, '0')}:00 - ${String(endHour).padStart(2, '0')}:00`;

    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 animate-fade-in">
        <div className="flex items-center mb-6 justify-center relative">
          <button onClick={() => setCurrentView('detail')} className="absolute left-0 p-2 bg-white rounded-full shadow-sm border border-gray-200 text-gray-600">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900">Pembayaran</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-3xl shadow-sm p-5 border border-gray-100 self-start">
            <h2 className="text-lg font-bold text-gray-800 mb-4 pb-3 border-b border-gray-100">Rincian Sewa</h2>
            <div className="flex items-center mb-5">
              <img src={selectedField?.images[0]} alt="Thumb" className="w-16 h-16 rounded-xl object-cover mr-4" />
              <div>
                <p className="font-bold text-gray-900 text-sm leading-tight mb-1">{selectedField?.name}</p>
                <div className="text-xs font-bold text-gray-600">
                  <span className="text-emerald-600">{new Date(bookingDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span> | {timeString}
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-3 border-t border-gray-100">
              <div className="flex justify-between text-sm font-medium text-gray-600">
                <span>Sewa Lapang ({duration} Jam)</span>
                <span className="font-bold text-gray-800">Rp {totalFieldPrice.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-sm font-medium text-gray-600">
                <span>Biaya Layanan</span>
                <span className="font-bold text-gray-800">Rp {serviceFee.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between items-center pt-3 mt-1 bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                <span className="font-bold text-emerald-900">Total Tagihan</span>
                <span className="font-extrabold text-xl text-emerald-600">Rp {finalTotal.toLocaleString('id-ID')}</span>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="bg-white rounded-3xl shadow-sm p-5 border border-gray-100">
              <h2 className="text-base font-bold text-gray-800 mb-4">Metode Pembayaran (Transfer)</h2>

              {/* Opsi E-Wallets dan Bank */}
              <div className="space-y-3">
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 flex justify-between items-center">
                  <div>
                    <p className="text-[10px] text-blue-600 font-bold uppercase mb-1">Bank BCA</p>
                    <p className="font-mono text-lg font-extrabold text-blue-900 tracking-tight">123 456 7890</p>
                    <p className="text-xs font-medium text-blue-800 mt-1">PT Booking Lapang</p>
                  </div>
                  <button onClick={() => handleCopy('1234567890', 'bca')} className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center transition-colors ${copiedBCA ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700 hover:bg-blue-200 active:scale-95'}`}>
                    {copiedBCA ? <><CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Tersalin</> : 'Salin'}
                  </button>
                </div>

                <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100 flex justify-between items-center">
                  <div>
                    <p className="text-[10px] text-emerald-600 font-bold uppercase mb-1">GoPay / DANA / OVO</p>
                    <p className="font-mono text-lg font-extrabold text-emerald-900 tracking-tight">0812 3456 7890</p>
                    <p className="text-xs font-medium text-emerald-800 mt-1">Admin Lapangan</p>
                  </div>
                  <button onClick={() => handleCopy('081234567890', 'ewallet')} className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center transition-colors ${copiedEwallet ? 'bg-emerald-200 text-emerald-800' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 active:scale-95'}`}>
                    {copiedEwallet ? <><CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Tersalin</> : 'Salin'}
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl shadow-sm p-5 border border-gray-100">
              <h2 className="text-base font-bold text-gray-800 mb-3">Upload Bukti Transfer</h2>
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />

              <div onClick={() => !uploadedReceipt && fileInputRef.current.click()} className={`border-2 border-dashed rounded-2xl p-6 text-center transition-colors ${uploadedReceipt ? 'border-emerald-500 bg-emerald-50' : 'border-gray-300 bg-gray-50 cursor-pointer hover:bg-gray-100'}`}>
                {uploadedReceipt ? (
                  <div className="flex flex-col items-center">
                    {receiptPreviewUrl ? (
                      <div className="relative mb-3 cursor-pointer group rounded-xl shadow-sm border border-emerald-200 overflow-hidden" onClick={(e) => { e.stopPropagation(); setIsPreviewModalOpen(true); }}>
                        <img src={receiptPreviewUrl} alt="Preview" className="h-24 w-24 object-cover group-hover:scale-105 transition-transform" />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                          <Search className="w-6 h-6 text-white" />
                        </div>
                      </div>
                    ) : (
                      <CheckCircle2 className="h-10 w-10 text-emerald-500 mb-2" />
                    )}
                    <p className="font-bold text-emerald-900 text-sm">Bukti Terupload</p>
                    <p className="text-xs text-emerald-700 mt-1 truncate max-w-[200px]">{uploadedFileName}</p>
                    <button onClick={(e) => { e.stopPropagation(); setUploadedReceipt(false); setReceiptPreviewUrl(''); }} className="mt-3 text-xs text-red-500 font-bold bg-red-50 px-3 py-1.5 rounded-full hover:bg-red-100">Ganti File</button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <Upload className="h-8 w-8 text-emerald-500 mb-3" />
                    <p className="font-bold text-gray-700 text-sm">Ketuk untuk upload</p>
                    <p className="text-[10px] text-gray-400 font-medium mt-1">Format: JPG, PNG</p>
                  </div>
                )}
              </div>

              <button onClick={submitCheckout} disabled={!uploadedReceipt}
                className={`w-full mt-5 py-4 rounded-xl font-extrabold text-white text-base transition-all shadow-md ${uploadedReceipt ? 'bg-emerald-600 active:scale-95' : 'bg-gray-300'
                  }`}
              >
                Kirim Bukti Pembayaran
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
        <a href="https://wa.me/6281234567890" target="_blank" rel="noopener noreferrer" className="inline-flex items-center font-bold text-white bg-green-600 px-5 py-2.5 rounded-xl hover:bg-green-500 transition-colors shadow-lg shadow-green-900/20 active:scale-95">
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
    <div className="min-h-screen bg-[#f8fafc] font-sans flex flex-col selection:bg-emerald-200 flex-grow">
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
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
            onClick={() => { if (!user) { setCurrentView('login'); } else { setCurrentView('my_bookings'); } }}
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

    </div>
  );
}