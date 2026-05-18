// @ts-nocheck
"use client";
import React, { useState, useRef, useEffect } from 'react';
import {
  LayoutDashboard, ClipboardList, CheckCircle, XCircle,
  Menu, X, LogOut, FileImage, DollarSign, Calendar as CalendarIcon,
  Clock, ShieldCheck, MapPin, User, Search, Filter,
  Edit, Trash2, Plus, AlertTriangle, Save, Upload, FileText, TrendingUp
} from 'lucide-react';



export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, bookings, fields, reports
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [filterStatus, setFilterStatus] = useState('semua');
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Toast State
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  useEffect(() => {
    window.alert = (msg) => showToast(msg, 'error');
  }, []);

  // Fields State
  const [fieldsData, setFieldsData] = useState([]);

  const fetchData = () => {
    fetch('/api/bookings')
      .then(res => res.json())
      .then(data => {
        const adapted = data.map((b: any) => {
          const dateObj = new Date(b.booking_date);
          const localRawDate = dateObj.getFullYear() + '-' + String(dateObj.getMonth() + 1).padStart(2, '0') + '-' + String(dateObj.getDate()).padStart(2, '0');
          return {
            id: b.id,
            bookingCode: b.booking_code,
            userName: b.customer_name,
            userPhone: b.customer_phone,
            fieldName: b.field_name,
            date: dateObj.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
            rawDate: localRawDate,
            fieldId: b.field_id,
            startHour: b.start_hour,
            endHour: b.end_hour,
            time: `${b.start_hour}:00 - ${b.end_hour}:00`,
            duration: b.end_hour - b.start_hour,
            price: Number(b.total_price),
            status: b.status.toLowerCase(),
            paymentMethod: 'Transfer',
            receiptImg: b.receipt_img || 'https://via.placeholder.com/400',
            submitTime: new Date(b.created_at).toLocaleString()
          };
        });
        setBookings(adapted);
      });

    fetch('/api/fields')
      .then(res => res.json())
      .then(data => {
        const adapted = data.map((f: any) => ({
          id: f.id,
          name: f.name,
          type: f.type,
          price: Number(f.price_per_hour),
          status: f.status.toLowerCase(),
          location: f.location || '',
          mapUrl: f.map_url || '',
          facilities: f.facilities || [],
          images: f.images || []
        }));
        setFieldsData(adapted);
      });
  };

  useEffect(() => {
    fetchData();
  }, []);

  // State Edit Lapangan
  const [isEditFieldOpen, setIsEditFieldOpen] = useState(false);
  const [currentEditField, setCurrentEditField] = useState(null);

  // State Hapus Lapangan
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [fieldToDelete, setFieldToDelete] = useState(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  // State Jadwal Lapangan
  const [scheduleModalField, setScheduleModalField] = useState(null);
  const [scheduleDate, setScheduleDate] = useState(new Date().toISOString().split('T')[0]);

  // State Laporan
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);

  // State Tambah Lapangan
  const [isAddFieldOpen, setIsAddFieldOpen] = useState(false);
  const [newField, setNewField] = useState({
    name: '',
    type: 'Futsal',
    price: '',
    status: 'aktif',
    location: '',
    mapUrl: '',
    facilities: [''],
    images: [] // Array untuk lebih dari 1 gambar
  });

  const fileInputAddRef = useRef(null);
  const fileInputEditRef = useRef(null);

  // --- HANDLERS UNTUK BOOKING ---
  const handleApprove = (id) => {
    fetch('/api/bookings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: 'DIKONFIRMASI' })
    }).then(() => {
      fetchData();
      setSelectedReceipt(null);
    });
  };

  const handleReject = (id) => {
    fetch('/api/bookings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: 'DITOLAK' })
    }).then(() => {
      fetchData();
      setSelectedReceipt(null);
    });
  };

  const closeSidebarMobile = () => {
    if (window.innerWidth < 1024) setIsSidebarOpen(false);
  };

  // --- HANDLERS UNTUK LAPANGAN ---

  // Upload Gambar (Base64 Konversi dari Perangkat)
  const handleImageUpload = async (e, isEdit = false) => {
    const files = Array.from(e.target.files);
    const currentImages = isEdit ? currentEditField.images : newField.images;

    if (currentImages.length + files.length > 5) {
      alert('Maksimal hanya boleh 5 foto lapangan!');
      e.target.value = null;
      return;
    }

    const promises = files.map(async (file: any) => {
      const ext = file.name.split('.').pop();
      const hashName = Math.random().toString(36).substring(2, 10) + '.' + ext;
      const res = await fetch(`/api/upload?filename=${hashName}`, {
        method: 'POST',
        body: file,
      });
      const data = await res.json();
      return data.url;
    });

    const uploadedImages = await Promise.all(promises);

    if (isEdit) {
      setCurrentEditField(prev => ({ ...prev, images: [...prev.images, ...uploadedImages] }));
    } else {
      setNewField(prev => ({ ...prev, images: [...prev.images, ...uploadedImages] }));
    }

    // Reset file input agar bisa upload file yang sama jika sebelumnya dihapus
    e.target.value = null;
  };

  const removeImage = (index, isEdit = false) => {
    if (isEdit) {
      setCurrentEditField(prev => ({
        ...prev,
        images: prev.images.filter((_, i) => i !== index)
      }));
    } else {
      setNewField(prev => ({
        ...prev,
        images: prev.images.filter((_, i) => i !== index)
      }));
    }
  };

  // Modal Tambah Lapangan
  const openAddModal = () => {
    setNewField({ name: '', type: 'Futsal', price: '', status: 'aktif', location: '', mapUrl: '', facilities: [''], images: [] });
    setIsAddFieldOpen(true);
  };

  const handleFacilityChange = (index, value, isEdit = false) => {
    if (isEdit) {
      const updated = [...currentEditField.facilities];
      updated[index] = value;
      setCurrentEditField({ ...currentEditField, facilities: updated });
    } else {
      const updated = [...newField.facilities];
      updated[index] = value;
      setNewField({ ...newField, facilities: updated });
    }
  };

  const addFacility = (isEdit = false) => {
    if (isEdit && currentEditField.facilities.length < 5) {
      setCurrentEditField({ ...currentEditField, facilities: [...currentEditField.facilities, ''] });
    } else if (!isEdit && newField.facilities.length < 5) {
      setNewField({ ...newField, facilities: [...newField.facilities, ''] });
    }
  };

  const removeFacility = (index, isEdit = false) => {
    if (isEdit) {
      setCurrentEditField({ ...currentEditField, facilities: currentEditField.facilities.filter((_, i) => i !== index) });
    } else {
      setNewField({ ...newField, facilities: newField.facilities.filter((_, i) => i !== index) });
    }
  };

  const saveNewField = () => {
    if (!newField.name || !newField.price) {
      alert("Nama Lapangan dan Harga tidak boleh kosong!");
      return;
    }
    if (newField.images.length < 1 || newField.images.length > 5) {
      alert("Wajib mengunggah minimal 1 foto dan maksimal 5 foto lapangan!");
      return;
    }

    const fieldToAdd = {
      ...newField,
      pricePerHour: Number(String(newField.price).replace(/\D/g, '')),
    };

    fetch('/api/fields', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fieldToAdd)
    }).then(() => {
      fetchData();
      setIsAddFieldOpen(false);
    });
  };

  // Modal Edit Lapangan
  const openEditModal = (field) => {
    setCurrentEditField({ ...field, images: [...field.images], facilities: field.facilities?.length > 0 ? [...field.facilities] : [''] }); // Copy agar tidak merubah array asli secara langsung
    setIsEditFieldOpen(true);
  };

  const saveEditedField = () => {
    if (!currentEditField.name || !currentEditField.price) {
      alert("Nama Lapangan dan Harga tidak boleh kosong!");
      return;
    }
    if (currentEditField.images.length < 1 || currentEditField.images.length > 5) {
      alert("Wajib mengunggah minimal 1 foto dan maksimal 5 foto lapangan!");
      return;
    }

    const fieldToEdit = {
      ...currentEditField,
      pricePerHour: Number(String(currentEditField.price).replace(/\D/g, '')),
    };

    fetch('/api/fields', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fieldToEdit)
    }).then(() => {
      fetchData();
      setIsEditFieldOpen(false);
      setCurrentEditField(null);
    });
  };

  // Konfirmasi Hapus
  const openDeleteConfirm = (id) => {
    setFieldToDelete(id);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDeleteField = () => {
    fetch('/api/fields', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: fieldToDelete })
    }).then(res => {
      if (res.ok) {
        fetchData();
        showToast('Lapangan berhasil dihapus', 'success');
      } else {
        showToast('Gagal menghapus lapangan', 'error');
      }
      setIsDeleteConfirmOpen(false);
      setFieldToDelete(null);
    }).catch(err => {
      console.error(err);
      showToast('Gagal menghapus lapangan', 'error');
      setIsDeleteConfirmOpen(false);
      setFieldToDelete(null);
    });
  };

  // --- DATA CALCULATIONS ---
  const todayDateStr = currentTime.getFullYear() + '-' + String(currentTime.getMonth() + 1).padStart(2, '0') + '-' + String(currentTime.getDate()).padStart(2, '0');
  const todaysBookings = bookings.filter(b => b.rawDate === todayDateStr);

  const dashboardPendingCount = todaysBookings.filter(b => b.status === 'menunggu').length;
  const dashboardApprovedCount = todaysBookings.filter(b => b.status === 'dikonfirmasi').length;
  const dashboardTotalRevenue = todaysBookings
    .filter(b => b.status === 'dikonfirmasi')
    .reduce((acc, curr) => acc + curr.price, 0);

  const totalPendingCount = bookings.filter(b => b.status === 'menunggu').length;

  const filteredBookings = bookings.filter(b => {
    if (filterStatus === 'semua') return true;
    return b.status === filterStatus;
  });

  // --- RENDERERS ---
  const renderSidebar = () => (
    <>
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside className={`fixed top-0 left-0 h-full bg-[#0f172a] w-64 text-gray-300 flex flex-col z-50 transition-transform duration-300 ease-in-out transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:static'}`}>
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center">
            <div className="bg-emerald-500 p-1.5 rounded-lg mr-2">
              <ShieldCheck className="h-6 w-6 text-white" />
            </div>
            <span className="font-extrabold text-xl text-white">Admin<span className="text-emerald-400">Panel</span></span>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-gray-400 hover:text-white">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-3">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 px-3">Menu Utama</p>
          <ul className="space-y-1">
            <li>
              <button
                onClick={() => { setActiveTab('dashboard'); closeSidebarMobile(); }}
                className={`w-full flex items-center px-3 py-3 rounded-xl font-medium transition-colors ${activeTab === 'dashboard' ? 'bg-emerald-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}
              >
                <LayoutDashboard className="h-5 w-5 mr-3" /> Dashboard
              </button>
            </li>
            <li>
              <button
                onClick={() => { setActiveTab('bookings'); closeSidebarMobile(); }}
                className={`w-full flex items-center px-3 py-3 rounded-xl font-medium transition-colors ${activeTab === 'bookings' ? 'bg-emerald-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}
              >
                <ClipboardList className="h-5 w-5 mr-3" />
                Kelola Pesanan
                {totalPendingCount > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {totalPendingCount}
                  </span>
                )}
              </button>
            </li>
            <li>
              <button
                onClick={() => { setActiveTab('fields'); closeSidebarMobile(); }}
                className={`w-full flex items-center px-3 py-3 rounded-xl font-medium transition-colors ${activeTab === 'fields' ? 'bg-emerald-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}
              >
                <MapPin className="h-5 w-5 mr-3" /> Daftar Lapangan
              </button>
            </li>
            <li>
              <button
                onClick={() => { setActiveTab('reports'); closeSidebarMobile(); }}
                className={`w-full flex items-center px-3 py-3 rounded-xl font-medium transition-colors ${activeTab === 'reports' ? 'bg-emerald-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}
              >
                <FileText className="h-5 w-5 mr-3" /> Laporan Harian
              </button>
            </li>
          </ul>
        </div>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center mb-4 px-2">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold mr-3">
              AD
            </div>
            <div>
              <p className="text-sm font-bold text-white">Admin Utama</p>
              <p className="text-xs text-slate-400">admin@bookinglapang.com</p>
            </div>
          </div>
          <button onClick={() => window.location.href = '/'} className="w-full flex items-center justify-center px-4 py-2 text-sm font-bold text-gray-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors">
            <LogOut className="h-4 w-4 mr-2" /> Kembali ke Home
          </button>
        </div>
      </aside>
    </>
  );

  const renderDashboard = () => (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-extrabold text-gray-900 mb-6">Ringkasan Hari Ini</h1>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex items-center">
          <div className="w-14 h-14 rounded-2xl bg-orange-50 flex items-center justify-center mr-4">
            <ClipboardList className="h-7 w-7 text-orange-500" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-500 mb-1">Pesanan Menunggu</p>
            <p className="text-2xl font-extrabold text-gray-900">{dashboardPendingCount}</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex items-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mr-4">
            <CheckCircle className="h-7 w-7 text-emerald-500" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-500 mb-1">Pesanan Selesai</p>
            <p className="text-2xl font-extrabold text-gray-900">{dashboardApprovedCount}</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex items-center">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mr-4">
            <DollarSign className="h-7 w-7 text-blue-500" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-500 mb-1">Total Pendapatan</p>
            <p className="text-2xl font-extrabold text-gray-900">Rp {dashboardTotalRevenue.toLocaleString('id-ID')}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-gray-900">Pesanan Perlu Konfirmasi</h2>
          <button onClick={() => setActiveTab('bookings')} className="text-sm font-bold text-emerald-600 hover:text-emerald-700">Lihat Semua</button>
        </div>

        <div className="space-y-4">
          {bookings.filter(b => b.status === 'menunggu').length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">Tidak ada pesanan baru yang perlu dikonfirmasi.</div>
          ) : (
            bookings.filter(b => b.status === 'menunggu').slice(0, 3).map(bkg => (
              <div key={bkg.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <div className="mb-3 sm:mb-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-gray-500">{bkg.id}</span>
                    <span className="text-[10px] font-bold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">{bkg.submitTime}</span>
                  </div>
                  <p className="font-bold text-gray-900">{bkg.userName} <span className="text-gray-400 font-normal">({bkg.fieldName})</span></p>
                </div>
                <button
                  onClick={() => setSelectedReceipt(bkg)}
                  className="w-full sm:w-auto px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-sm"
                >
                  Cek Pembayaran
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  const renderBookingsList = () => (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-2xl font-extrabold text-gray-900">Kelola Pesanan</h1>

        {/* Filter */}
        <div className="flex items-center bg-white border border-gray-200 rounded-xl p-1 shadow-sm w-full sm:w-auto">
          <button onClick={() => setFilterStatus('semua')} className={`flex-1 sm:flex-none px-4 py-1.5 text-sm font-bold rounded-lg transition-colors ${filterStatus === 'semua' ? 'bg-slate-100 text-slate-800' : 'text-gray-500 hover:text-gray-700'}`}>Semua</button>
          <button onClick={() => setFilterStatus('menunggu')} className={`flex-1 sm:flex-none px-4 py-1.5 text-sm font-bold rounded-lg transition-colors ${filterStatus === 'menunggu' ? 'bg-orange-100 text-orange-800' : 'text-gray-500 hover:text-gray-700'}`}>Menunggu</button>
          <button onClick={() => setFilterStatus('dikonfirmasi')} className={`flex-1 sm:flex-none px-4 py-1.5 text-sm font-bold rounded-lg transition-colors ${filterStatus === 'dikonfirmasi' ? 'bg-emerald-100 text-emerald-800' : 'text-gray-500 hover:text-gray-700'}`}>Selesai</button>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Desktop Table Header */}
        <div className="hidden md:grid grid-cols-12 gap-4 p-4 bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
          <div className="col-span-3">ID & Pelanggan</div>
          <div className="col-span-3">Jadwal Lapangan</div>
          <div className="col-span-2">Total Biaya</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2 text-center">Aksi</div>
        </div>

        {/* List Body */}
        <div className="divide-y divide-gray-100">
          {filteredBookings.length === 0 ? (
            <div className="p-8 text-center text-gray-500">Tidak ada pesanan ditemukan.</div>
          ) : (
            filteredBookings.map(bkg => {
              let statusColor = "bg-orange-100 text-orange-700 border-orange-200";
              let StatusIcon = Clock;
              if (bkg.status === 'dikonfirmasi') { statusColor = "bg-emerald-100 text-emerald-700 border-emerald-200"; StatusIcon = CheckCircle; }
              if (bkg.status === 'ditolak') { statusColor = "bg-red-100 text-red-700 border-red-200"; StatusIcon = XCircle; }

              return (
                <div key={bkg.id} className="p-4 md:p-0 md:grid grid-cols-12 gap-4 items-center md:px-4 md:py-4 hover:bg-gray-50/50 transition-colors">

                  {/* Info Pelanggan */}
                  <div className="col-span-3 mb-3 md:mb-0">
                    <div className="flex justify-between md:block mb-1">
                      <span className="text-xs font-bold text-gray-400">{bkg.id}</span>
                      <div className={`md:hidden flex items-center px-2 py-0.5 rounded-md border text-[10px] font-bold ${statusColor}`}>
                        <StatusIcon className="w-3 h-3 mr-1" /> {bkg.status.toUpperCase()}
                      </div>
                    </div>
                    <p className="font-bold text-gray-900 text-sm">{bkg.userName}</p>
                    <p className="text-xs text-gray-500 flex items-center mt-0.5"><User className="w-3 h-3 mr-1" /> {bkg.userPhone}</p>
                  </div>

                  {/* Info Lapangan */}
                  <div className="col-span-3 mb-3 md:mb-0 bg-gray-50 md:bg-transparent p-3 md:p-0 rounded-xl">
                    <p className="font-bold text-gray-800 text-sm leading-tight mb-1">{bkg.fieldName}</p>
                    <div className="text-xs text-gray-600 font-medium flex flex-wrap items-center gap-2">
                      <span className="flex items-center"><CalendarIcon className="w-3 h-3 mr-1 text-emerald-600" /> {bkg.date}</span>
                      <span className="flex items-center"><Clock className="w-3 h-3 mr-1 text-emerald-600" /> {bkg.time}</span>
                    </div>
                  </div>

                  {/* Biaya */}
                  <div className="col-span-2 mb-3 md:mb-0 flex justify-between md:block items-center border-t border-gray-100 pt-2 md:border-0 md:pt-0">
                    <span className="md:hidden text-xs font-medium text-gray-500">Total:</span>
                    <p className="font-extrabold text-emerald-600">Rp {bkg.price.toLocaleString('id-ID')}</p>
                  </div>

                  {/* Status (Desktop) */}
                  <div className="col-span-2 hidden md:flex">
                    <div className={`inline-flex items-center px-2.5 py-1 rounded-lg border text-xs font-bold ${statusColor}`}>
                      <StatusIcon className="w-3.5 h-3.5 mr-1.5" />
                      {bkg.status.charAt(0).toUpperCase() + bkg.status.slice(1)}
                    </div>
                  </div>

                  {/* Action */}
                  <div className="col-span-2 md:text-center mt-2 md:mt-0">
                    {bkg.status === 'menunggu' ? (
                      <button
                        onClick={() => setSelectedReceipt(bkg)}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-xl text-xs font-bold shadow-sm flex items-center justify-center transition-colors"
                      >
                        <FileImage className="w-4 h-4 mr-1.5" /> Validasi Pembayaran
                      </button>
                    ) : (
                      <button
                        onClick={() => setSelectedReceipt(bkg)}
                        className="w-full bg-white border-2 border-gray-200 hover:border-emerald-300 text-gray-700 hover:text-emerald-700 px-3 py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center"
                      >
                        <Search className="w-4 h-4 mr-1.5" /> Lihat Detail
                      </button>
                    )}
                  </div>

                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );

  const renderFieldsList = () => (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-2xl font-extrabold text-gray-900">Daftar Lapangan</h1>
        <button
          onClick={openAddModal}
          className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-colors flex items-center justify-center"
        >
          <Plus className="w-5 h-5 mr-1.5" /> Tambah Lapangan
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Desktop Table Header */}
        <div className="hidden md:grid grid-cols-12 gap-4 p-4 bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
          <div className="col-span-5">Info Lapangan</div>
          <div className="col-span-3">Tarif / Jam</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2 text-center">Aksi</div>
        </div>

        {/* List Body */}
        <div className="divide-y divide-gray-100">
          {fieldsData.map(field => (
            <div key={field.id} className="p-4 md:p-0 md:grid grid-cols-12 gap-4 items-center md:px-4 md:py-4 hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => { setScheduleModalField(field); setScheduleDate(new Date().toISOString().split('T')[0]); }}>

              {/* Info Lapangan */}
              <div className="col-span-5 mb-3 md:mb-0 flex items-center">
                <div className="relative">
                  {/* Gunakan gambar pertama sebagai thumbnail */}
                  <img src={field.images[0]} alt={field.name} className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover mr-4 border border-gray-200 flex-shrink-0" />
                  <div className="absolute -top-1 -right-1 bg-gray-800 text-white text-[9px] font-bold px-1.5 rounded-full border border-white">
                    {field.images.length}
                  </div>
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm leading-tight mb-1">{field.name}</p>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">{field.type}</span>
                </div>
              </div>

              {/* Tarif */}
              <div className="col-span-3 mb-3 md:mb-0 flex justify-between md:block items-center border-t border-gray-100 pt-3 md:border-0 md:pt-0">
                <span className="md:hidden text-xs font-medium text-gray-500">Tarif / Jam:</span>
                <p className="font-extrabold text-emerald-600">Rp {field.price.toLocaleString('id-ID')}</p>
              </div>

              {/* Status dengan Label BUKA/TUTUP */}
              <div className="col-span-2 mb-3 md:mb-0 flex justify-between md:block items-center">
                <span className="md:hidden text-xs font-medium text-gray-500">Status:</span>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-lg border text-xs font-bold ${field.status === 'aktif' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                  {field.status === 'aktif' ? <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> : <XCircle className="w-3.5 h-3.5 mr-1.5" />}
                  {field.status === 'aktif' ? 'Buka (Aktif)' : 'Tutup (Perawatan)'}
                </span>
              </div>

              {/* Aksi (Edit & Delete) */}
              <div className="col-span-2 flex justify-center gap-2 mt-4 md:mt-0">
                <button
                  onClick={(e) => { e.stopPropagation(); openEditModal(field); }}
                  className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                  title="Edit Lapangan"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); openDeleteConfirm(field.id); }}
                  className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors"
                  title="Hapus Lapangan"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

            </div>
          ))}
          {fieldsData.length === 0 && (
            <div className="p-8 text-center text-gray-500">Belum ada data lapangan.</div>
          )}
        </div>
      </div>
    </div>
  );

  // Modal Verifikasi Bukti Transfer
  const renderReceiptModal = () => {
    if (!selectedReceipt) return null;

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
        <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">

          {/* Header */}
          <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50">
            <div>
              <h3 className="font-extrabold text-lg text-gray-900">Validasi Bukti Pembayaran</h3>
              <p className="text-xs font-medium text-gray-500">ID Pesanan: {selectedReceipt.id}</p>
            </div>
            <button onClick={() => setSelectedReceipt(null)} className="p-2 bg-white rounded-full text-gray-400 hover:text-gray-700 border border-gray-200">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 flex-1 overflow-y-auto flex flex-col md:flex-row gap-6">
            {/* Kolom Kiri: Gambar */}
            <div className="w-full md:w-1/2 flex flex-col">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Gambar Bukti Transfer</p>
              <div 
                className="bg-gray-100 rounded-2xl p-2 border border-gray-200 flex-1 h-[300px] md:h-[400px] flex items-center justify-center relative group overflow-hidden cursor-pointer"
                onClick={() => setIsPreviewModalOpen(true)}
              >
                <img src={selectedReceipt.receiptImg} alt="Bukti Transfer" className="w-full h-full object-contain rounded-xl group-hover:scale-105 transition-transform" />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 rounded-2xl">
                   <Search className="w-8 h-8 text-white" />
                </div>
              </div>
            </div>

            {/* Kolom Kanan: Rincian Pesanan */}
            <div className="w-full md:w-1/2 space-y-4">
              <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl">
                <p className="text-xs font-bold text-emerald-800 uppercase mb-1">Total Yang Harus Dibayar</p>
                <p className="text-3xl font-extrabold text-emerald-600">Rp {selectedReceipt.price.toLocaleString('id-ID')}</p>

                {/* Asal Pembayaran (BCA, DANA, OVO, dll) */}
                <div className="mt-3 pt-3 border-t border-emerald-200 flex justify-between items-center">
                  <span className="text-xs font-bold text-emerald-700">Metode Pembayaran</span>
                  <span className="text-xs font-extrabold bg-emerald-600 text-white px-2 py-1 rounded shadow-sm">
                    {selectedReceipt.paymentMethod}
                  </span>
                </div>
              </div>

              <div className="bg-white border border-gray-200 p-4 rounded-2xl space-y-3">
                <p className="text-sm font-extrabold text-gray-900 border-b border-gray-100 pb-2">Data Pemesan</p>
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500 font-medium">Nama</span>
                  <span className="text-xs font-bold text-gray-900">{selectedReceipt.userName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500 font-medium">No. HP</span>
                  <span className="text-xs font-bold text-gray-900">{selectedReceipt.userPhone}</span>
                </div>
              </div>

              <div className="bg-white border border-gray-200 p-4 rounded-2xl space-y-3">
                <p className="text-sm font-extrabold text-gray-900 border-b border-gray-100 pb-2">Jadwal Lapangan</p>
                <div>
                  <span className="text-xs text-gray-500 font-medium block mb-0.5">Lapangan</span>
                  <span className="text-xs font-bold text-gray-900 leading-tight block">{selectedReceipt.fieldName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500 font-medium">Tanggal</span>
                  <span className="text-xs font-bold text-gray-900">{selectedReceipt.date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500 font-medium">Jam</span>
                  <span className="text-xs font-bold text-gray-900">{selectedReceipt.time} ({selectedReceipt.duration} Jam)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-5 border-t border-gray-100 bg-gray-50 flex flex-col sm:flex-row gap-3">
            {selectedReceipt.status === 'menunggu' ? (
              <>
                <button
                  onClick={() => handleReject(selectedReceipt.id)}
                  className="flex-1 px-4 py-3 border-2 border-red-200 text-red-600 bg-white hover:bg-red-50 rounded-xl font-bold transition-colors flex items-center justify-center"
                >
                  <XCircle className="w-5 h-5 mr-2" /> Tolak Pesanan
                </button>
                <button
                  onClick={() => handleApprove(selectedReceipt.id)}
                  className="flex-[2] px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center"
                >
                  <CheckCircle className="w-5 h-5 mr-2" /> Konfirmasi Pembayaran
                </button>
              </>
            ) : (
              <button
                onClick={() => setSelectedReceipt(null)}
                className="w-full px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-bold transition-colors"
              >
                Tutup
              </button>
            )}
          </div>

          {/* Image Preview Modal Full Size */}
          {isPreviewModalOpen && (
            <div 
              className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in"
              onClick={() => setIsPreviewModalOpen(false)}
            >
              <div className="relative inline-flex flex-col items-center max-w-full">
                <button 
                  className="absolute -top-4 -right-4 sm:-top-5 sm:-right-5 z-10 bg-white hover:bg-gray-200 text-gray-900 rounded-full p-1.5 shadow-lg transition-colors"
                  onClick={() => setIsPreviewModalOpen(false)}
                >
                  <X className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
                <img 
                  src={selectedReceipt.receiptImg} 
                  alt="Bukti Transfer Penuh" 
                  className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border-2 border-white/20" 
                  onClick={(e) => e.stopPropagation()} 
                />
              </div>
            </div>
          )}

        </div>
      </div>
    );
  };

  // Modal Form Tambah Lapangan
  const renderAddFieldModal = () => {
    if (!isAddFieldOpen) return null;

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
        <div className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
          <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50">
            <h3 className="font-extrabold text-lg text-gray-900">Tambah Lapangan Baru</h3>
            <button onClick={() => setIsAddFieldOpen(false)} className="p-2 bg-white rounded-full text-gray-400 hover:text-gray-700 border border-gray-200">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto flex-1 space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Nama Lapangan <span className="text-red-500">*</span></label>
              <input
                type="text"
                placeholder="Contoh: Garuda Futsal - Lapangan C"
                value={newField.name}
                onChange={(e) => setNewField({ ...newField, name: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-emerald-500 font-medium text-sm text-gray-900 placeholder-gray-400"
              />
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-xs font-bold text-gray-700 mb-1">Tipe Lapangan</label>
                <select
                  value={newField.type}
                  onChange={(e) => setNewField({ ...newField, type: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-emerald-500 font-medium text-sm text-gray-900"
                >
                  <option value="Futsal">Futsal</option>
                  <option value="Mini Soccer">Mini Soccer</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-xs font-bold text-gray-700 mb-1">Harga / Jam (Rp) <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder="100.000"
                  value={newField.price ? Number(String(newField.price).replace(/\D/g, '')).toLocaleString('id-ID') : ''}
                  onChange={(e) => setNewField({ ...newField, price: e.target.value.replace(/\D/g, '') })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-emerald-500 font-medium text-sm text-gray-900 placeholder-gray-400"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Status Lapangan</label>
              <select
                value={newField.status}
                onChange={(e) => setNewField({ ...newField, status: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-emerald-500 font-bold text-sm text-gray-900"
              >
                <option value="aktif">🟢 Buka (Aktif)</option>
                <option value="perawatan">🔴 Tutup (Perawatan)</option>
              </select>
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-xs font-bold text-gray-700 mb-1">Alamat Lengkap</label>
                <textarea
                  rows={2}
                  placeholder="Contoh: Jl. Sudirman No.1"
                  value={newField.location}
                  onChange={(e) => setNewField({ ...newField, location: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-emerald-500 font-medium text-sm text-gray-900"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-bold text-gray-700 mb-1">Link Google Maps</label>
                <textarea
                  rows={2}
                  placeholder="https://maps.app.goo.gl/..."
                  value={newField.mapUrl}
                  onChange={(e) => setNewField({ ...newField, mapUrl: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-emerald-500 font-medium text-sm text-gray-900"
                />
              </div>
            </div>

            {/* List Fasilitas */}
            <div className="pt-2">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-bold text-gray-700">Fasilitas (Maks. 5)</label>
                {newField.facilities.length < 5 && (
                  <button type="button" onClick={() => addFacility(false)} className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md font-bold hover:bg-emerald-200">
                    + Tambah
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {newField.facilities.map((fac, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input
                      type="text"
                      placeholder="Cth: Rumput Sintetis"
                      value={fac}
                      onChange={(e) => handleFacilityChange(idx, e.target.value, false)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-xl focus:ring-emerald-500 font-medium text-sm text-gray-900"
                    />
                    {newField.facilities.length > 1 && (
                      <button type="button" onClick={() => removeFacility(idx, false)} className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-100">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Upload Banyak Foto dari Perangkat */}
            <div className="pt-2 border-t border-gray-100">
              <label className="block text-xs font-bold text-gray-700 mb-2">Upload Foto (Min. 1, Maks. 5) <span className="text-red-500">*</span></label>
              <input
                type="file"
                multiple
                accept="image/*"
                ref={fileInputAddRef}
                onChange={(e) => handleImageUpload(e, false)}
                className="hidden"
              />

              <div
                onClick={() => newField.images.length < 5 && fileInputAddRef.current.click()}
                className={`border-2 border-dashed rounded-xl p-4 text-center transition-colors ${newField.images.length >= 5 ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60' : 'border-emerald-300 bg-emerald-50 cursor-pointer hover:bg-emerald-100'}`}
              >
                <div className="flex flex-col items-center">
                  <Upload className={`h-6 w-6 mb-2 ${newField.images.length >= 5 ? 'text-gray-400' : 'text-emerald-500'}`} />
                  <p className="font-bold text-gray-700 text-xs">Pilih Foto dari Perangkat</p>
                  <p className="text-[10px] text-gray-500 mt-1">{newField.images.length} / 5 Foto Terpilih</p>
                </div>
              </div>

              {/* Tampilkan Preview Foto */}
              {newField.images.length > 0 && (
                <div className="flex overflow-x-auto gap-2 mt-3 pb-2 scrollbar-hide">
                  {newField.images.map((img, idx) => (
                    <div key={idx} className="relative w-20 h-20 flex-shrink-0 rounded-lg border border-gray-200 overflow-hidden group">
                      <img src={img} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        onClick={() => removeImage(idx, false)}
                        className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          <div className="p-5 border-t border-gray-100 bg-gray-50 flex gap-3">
            <button onClick={() => setIsAddFieldOpen(false)} className="flex-1 py-3 bg-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-300">
              Batal
            </button>
            <button onClick={saveNewField} className="flex-[2] py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 flex items-center justify-center">
              <Plus className="w-4 h-4 mr-2" /> Tambahkan Lapangan
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Modal Form Edit Lapangan
  const renderEditFieldModal = () => {
    if (!isEditFieldOpen || !currentEditField) return null;

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
        <div className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
          <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50">
            <h3 className="font-extrabold text-lg text-gray-900">Edit Lapangan</h3>
            <button onClick={() => setIsEditFieldOpen(false)} className="p-2 bg-white rounded-full text-gray-400 hover:text-gray-700 border border-gray-200">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto flex-1 space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Nama Lapangan</label>
              <input
                type="text"
                value={currentEditField.name}
                onChange={(e) => setCurrentEditField({ ...currentEditField, name: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-emerald-500 font-medium text-sm text-gray-900"
              />
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-xs font-bold text-gray-700 mb-1">Tipe Lapangan</label>
                <select
                  value={currentEditField.type}
                  onChange={(e) => setCurrentEditField({ ...currentEditField, type: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-emerald-500 font-medium text-sm text-gray-900"
                >
                  <option value="Futsal">Futsal</option>
                  <option value="Mini Soccer">Mini Soccer</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-xs font-bold text-gray-700 mb-1">Harga / Jam (Rp)</label>
                <input
                  type="text"
                  value={currentEditField.price ? Number(String(currentEditField.price).replace(/\D/g, '')).toLocaleString('id-ID') : ''}
                  onChange={(e) => setCurrentEditField({ ...currentEditField, price: e.target.value.replace(/\D/g, '') })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-emerald-500 font-medium text-sm text-gray-900"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Status Lapangan</label>
              <select
                value={currentEditField.status}
                onChange={(e) => setCurrentEditField({ ...currentEditField, status: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-emerald-500 font-bold text-sm text-gray-900"
              >
                <option value="aktif">🟢 Buka (Aktif)</option>
                <option value="perawatan">🔴 Tutup (Perawatan)</option>
              </select>
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-xs font-bold text-gray-700 mb-1">Alamat Lengkap</label>
                <textarea
                  rows={2}
                  placeholder="Contoh: Jl. Sudirman No.1"
                  value={currentEditField.location || ''}
                  onChange={(e) => setCurrentEditField({ ...currentEditField, location: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-emerald-500 font-medium text-sm text-gray-900"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-bold text-gray-700 mb-1">Link Google Maps</label>
                <textarea
                  rows={2}
                  placeholder="https://maps.app.goo.gl/..."
                  value={currentEditField.mapUrl || ''}
                  onChange={(e) => setCurrentEditField({ ...currentEditField, mapUrl: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-emerald-500 font-medium text-sm text-gray-900"
                />
              </div>
            </div>

            {/* List Fasilitas Edit */}
            <div className="pt-2">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-bold text-gray-700">Fasilitas (Maks. 5)</label>
                {currentEditField.facilities.length < 5 && (
                  <button type="button" onClick={() => addFacility(true)} className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md font-bold hover:bg-emerald-200">
                    + Tambah
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {currentEditField.facilities.map((fac, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input
                      type="text"
                      placeholder="Cth: Rumput Sintetis"
                      value={fac}
                      onChange={(e) => handleFacilityChange(idx, e.target.value, true)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-xl focus:ring-emerald-500 font-medium text-sm text-gray-900"
                    />
                    {currentEditField.facilities.length > 1 && (
                      <button type="button" onClick={() => removeFacility(idx, true)} className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-100">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Upload dan Edit Foto dari Perangkat */}
            <div className="pt-2 border-t border-gray-100">
              <label className="block text-xs font-bold text-gray-700 mb-2">Edit Foto (Min. 1, Maks. 5) <span className="text-red-500">*</span></label>
              <input
                type="file"
                multiple
                accept="image/*"
                ref={fileInputEditRef}
                onChange={(e) => handleImageUpload(e, true)}
                className="hidden"
              />

              <div
                onClick={() => currentEditField.images.length < 5 && fileInputEditRef.current.click()}
                className={`border-2 border-dashed rounded-xl p-4 text-center transition-colors ${currentEditField.images.length >= 5 ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60' : 'border-emerald-300 bg-emerald-50 cursor-pointer hover:bg-emerald-100'}`}
              >
                <div className="flex flex-col items-center">
                  <Upload className={`h-6 w-6 mb-2 ${currentEditField.images.length >= 5 ? 'text-gray-400' : 'text-emerald-500'}`} />
                  <p className="font-bold text-gray-700 text-xs">Tambahkan Foto dari Perangkat</p>
                  <p className="text-[10px] text-gray-500 mt-1">{currentEditField.images.length} / 5 Foto Terpilih</p>
                </div>
              </div>

              {/* Tampilkan Preview Foto yang ada & bisa dihapus */}
              {currentEditField.images.length > 0 && (
                <div className="flex overflow-x-auto gap-2 mt-3 pb-2 scrollbar-hide">
                  {currentEditField.images.map((img, idx) => (
                    <div key={idx} className="relative w-20 h-20 flex-shrink-0 rounded-lg border border-gray-200 overflow-hidden group">
                      <img src={img} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        onClick={() => removeImage(idx, true)}
                        className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          <div className="p-5 border-t border-gray-100 bg-gray-50 flex gap-3">
            <button onClick={() => setIsEditFieldOpen(false)} className="flex-1 py-3 bg-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-300">
              Batal
            </button>
            <button onClick={saveEditedField} className="flex-[2] py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 flex items-center justify-center">
              <Save className="w-4 h-4 mr-2" /> Simpan Perubahan
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Modal Konfirmasi Hapus Lapangan
  const renderDeleteConfirmModal = () => {
    if (!isDeleteConfirmOpen) return null;

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
        <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl">
          <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-extrabold text-gray-900 mb-2">Hapus Lapangan?</h3>
          <p className="text-sm text-gray-500 mb-8">Apakah Anda yakin ingin menghapus data lapangan ini dari sistem? Tindakan ini tidak bisa dikembalikan.</p>
          <div className="flex gap-3">
            <button onClick={() => setIsDeleteConfirmOpen(false)} className="flex-1 py-3 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
              Tidak, Batal
            </button>
            <button onClick={confirmDeleteField} className="flex-1 py-3 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 transition-colors shadow-md shadow-red-600/20">
              Ya, Hapus
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Modal Jadwal Lapangan
  const renderScheduleModal = () => {
    if (!scheduleModalField) return null;
    const fieldBookings = bookings.filter(b => 
      b.fieldId === scheduleModalField.id && 
      b.rawDate.startsWith(scheduleDate) && 
      b.status !== 'dibatalkan' && b.status !== 'ditolak'
    );
    
    // Generate hours 08:00 - 22:00
    const hours = [];
    for(let i=8; i<22; i++) {
       const booking = fieldBookings.find(b => b.startHour <= i && b.endHour > i);
       hours.push({ hour: i, booking });
    }

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setScheduleModalField(null)}>
        <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
          <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50">
            <h3 className="font-extrabold text-lg text-gray-900">Jadwal Lapangan: {scheduleModalField.name}</h3>
            <button onClick={() => setScheduleModalField(null)} className="p-2 bg-white rounded-full text-gray-400 hover:text-gray-700 border border-gray-200">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="p-5 border-b border-gray-100">
            <label className="block text-xs font-bold text-gray-700 mb-2">Pilih Tanggal</label>
            <input 
              type="date" 
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-emerald-500 font-bold text-gray-900 cursor-pointer"
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
            />
          </div>
          <div className="p-5 overflow-y-auto flex-1 space-y-3">
             {hours.map(slot => (
                <div key={slot.hour} className={`p-4 rounded-xl border flex justify-between items-center ${slot.booking ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-gray-200'}`}>
                   <div className="font-bold text-gray-700 w-16">{String(slot.hour).padStart(2, '0')}:00</div>
                   <div className="flex-1 px-4">
                     {slot.booking ? (
                        <div>
                          <p className="text-sm font-extrabold text-emerald-800">{slot.booking.userName} <span className="font-medium text-emerald-600 ml-2">({slot.booking.userPhone})</span></p>
                          <div className={`mt-1 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${slot.booking.status === 'dikonfirmasi' ? 'bg-emerald-600 text-white' : 'bg-yellow-400 text-yellow-900'}`}>
                            {slot.booking.status.toUpperCase()}
                          </div>
                        </div>
                     ) : (
                        <p className="text-sm font-medium text-gray-400">Kosong</p>
                     )}
                   </div>
                </div>
             ))}
          </div>
        </div>
      </div>
    );
  };

  const renderReports = () => {
    // Filter by selected report date
    const reportBookings = bookings.filter(b => b.rawDate === reportDate);
    
    // Calculate metrics
    const confirmedBookings = reportBookings.filter(b => b.status === 'dikonfirmasi');
    const lostBookings = reportBookings.filter(b => b.status === 'dibatalkan' || b.status === 'ditolak');

    const totalRevenue = confirmedBookings.reduce((sum, b) => sum + b.price, 0);
    const lostRevenue = lostBookings.reduce((sum, b) => sum + b.price, 0);
    const totalHours = confirmedBookings.reduce((sum, b) => sum + b.duration, 0);
    const totalTransactions = confirmedBookings.length;

    // Breakdown per field
    const fieldBreakdown = fieldsData.map(field => {
      const fieldBkgs = confirmedBookings.filter(b => b.fieldId === field.id);
      const revenue = fieldBkgs.reduce((sum, b) => sum + b.price, 0);
      const hours = fieldBkgs.reduce((sum, b) => sum + b.duration, 0);
      return { name: field.name, revenue, hours, count: fieldBkgs.length };
    });

    return (
      <div className="animate-fade-in">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h1 className="text-2xl font-extrabold text-gray-900">Laporan Harian</h1>
          <div className="flex bg-white items-center px-4 py-2 rounded-xl shadow-sm border border-gray-100">
            <CalendarIcon className="w-5 h-5 text-emerald-600 mr-2" />
            <input 
              type="date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
              className="font-bold text-gray-900 focus:outline-none cursor-pointer bg-transparent"
            />
          </div>
        </div>

        {/* Financial Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-[100px] -z-0"></div>
            <p className="text-sm font-bold text-gray-500 mb-2 relative z-10">Total Pendapatan</p>
            <p className="text-2xl font-extrabold text-emerald-600 relative z-10">Rp {totalRevenue.toLocaleString('id-ID')}</p>
            <div className="mt-4 flex items-center text-xs font-bold text-emerald-600 bg-emerald-50 w-fit px-2 py-1 rounded-lg">
              <TrendingUp className="w-3 h-3 mr-1" /> Sukses
            </div>
          </div>
          
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-[100px] -z-0"></div>
            <p className="text-sm font-bold text-gray-500 mb-2 relative z-10">Total Jam Terjual</p>
            <p className="text-2xl font-extrabold text-gray-900 relative z-10">{totalHours} Jam</p>
            <div className="mt-4 flex items-center text-xs font-bold text-gray-500">
              Dari {totalTransactions} Pesanan
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-red-50 rounded-bl-[100px] -z-0"></div>
            <p className="text-sm font-bold text-gray-500 mb-2 relative z-10">Potensi Kehilangan (Dibatalkan)</p>
            <p className="text-2xl font-extrabold text-red-600 relative z-10">Rp {lostRevenue.toLocaleString('id-ID')}</p>
            <div className="mt-4 flex items-center text-xs font-bold text-red-500 bg-red-50 w-fit px-2 py-1 rounded-lg">
              {lostBookings.length} Pesanan Batal/Tolak
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Field Breakdown */}
          <div className="lg:col-span-1 bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Rincian Per-Lapangan</h2>
            <div className="space-y-4">
              {fieldBreakdown.map((f, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-gray-100 bg-gray-50">
                  <p className="font-bold text-gray-900 mb-1">{f.name}</p>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">{f.hours} Jam Disewa</span>
                    <span className="font-bold text-emerald-600">Rp {f.revenue.toLocaleString('id-ID')}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Transaction Log */}
          <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
             <div className="flex justify-between items-center mb-4">
               <h2 className="text-lg font-bold text-gray-900">Log Transaksi (Dikonfirmasi)</h2>
               <button onClick={() => window.print()} className="text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg transition-colors flex items-center">
                 <FileText className="w-3.5 h-3.5 mr-1" /> Cetak Laporan
               </button>
             </div>
             
             {confirmedBookings.length === 0 ? (
               <div className="text-center py-12 text-gray-400">
                 <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-20" />
                 <p className="font-bold">Tidak ada transaksi terkonfirmasi di tanggal ini.</p>
               </div>
             ) : (
               <div className="overflow-x-auto">
                 <table className="w-full text-left text-sm">
                   <thead>
                     <tr className="border-b border-gray-100 text-gray-500">
                       <th className="pb-3 font-bold">ID / Pelanggan</th>
                       <th className="pb-3 font-bold">Lapangan</th>
                       <th className="pb-3 font-bold">Waktu</th>
                       <th className="pb-3 font-bold text-right">Nominal</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-50">
                     {confirmedBookings.map(b => (
                       <tr key={b.id}>
                         <td className="py-3">
                           <p className="font-bold text-gray-900">{b.bookingCode}</p>
                           <p className="text-xs text-gray-500">{b.userName}</p>
                         </td>
                         <td className="py-3 font-medium text-gray-700">{b.fieldName}</td>
                         <td className="py-3">
                           <p className="font-medium text-gray-700">{b.time}</p>
                           <p className="text-xs text-gray-500">{b.duration} Jam</p>
                         </td>
                         <td className="py-3 font-bold text-emerald-600 text-right">Rp {b.price.toLocaleString('id-ID')}</td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
             )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-[#f8fafc] font-sans selection:bg-emerald-200">
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        button:not(:disabled) { cursor: pointer !important; }
        button:disabled { cursor: not-allowed !important; }
      `}} />

      {/* Sidebar */}
      {renderSidebar()}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">

        {/* Top Header Mobile */}
        <header className="lg:hidden flex items-center justify-between p-4 bg-white border-b border-gray-200 shadow-sm z-30">
          <div className="flex items-center">
            <div className="bg-emerald-500 p-1 rounded-md mr-2">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <span className="font-extrabold text-lg text-slate-800">Admin<span className="text-emerald-500">Panel</span></span>
          </div>
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-gray-100 rounded-lg text-gray-600 hover:bg-gray-200">
            <Menu className="h-5 w-5" />
          </button>
        </header>

        {/* Top Header Desktop */}
        <header className="hidden lg:flex items-center justify-between p-6 bg-white border-b border-gray-200 z-10">
          <h2 className="text-xl font-extrabold text-gray-800 capitalize">
            {activeTab === 'dashboard' ? 'Dashboard Overview' : activeTab === 'bookings' ? 'Manajemen Pesanan' : 'Daftar Lapangan'}
          </h2>
          <div className="flex items-center text-sm font-bold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200">
            <CalendarIcon className="w-4 h-4 mr-2" />
            {currentTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            <span className="mx-2">|</span>
            <Clock className="w-4 h-4 mr-1.5" />
            {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'bookings' && renderBookingsList()}
          {activeTab === 'fields' && renderFieldsList()}
          {activeTab === 'reports' && renderReports()}
        </main>
      </div>

      {/* Rendering All Modals */}
      {renderReceiptModal()}
      {renderEditFieldModal()}
      {renderAddFieldModal()}
      {renderDeleteConfirmModal()}
      {renderScheduleModal()}

      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed top-5 right-5 z-[200] animate-fade-in">
          <div className={`px-4 py-3 rounded-xl shadow-lg border flex items-center ${toast.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
            {toast.type === 'error' ? <AlertTriangle className="w-5 h-5 mr-2" /> : <CheckCircle className="w-5 h-5 mr-2" />}
            <span className="font-bold text-sm">{toast.message}</span>
          </div>
        </div>
      )}

    </div>
  );
}