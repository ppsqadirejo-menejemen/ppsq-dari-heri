import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  UserPlus, 
  BookOpen, 
  Wallet, 
  History, 
  LogOut, 
  Menu, 
  X, 
  Bell, 
  Clock, 
  Calendar,
  Image as ImageIcon,
  GraduationCap,
  ChevronRight,
  ChevronDown,
  Search,
  Plus,
  Trash2,
  Edit,
  Settings,
  ExternalLink,
  Eye,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  LayoutDashboard,
  FileText,
  Camera,
  Filter,
  Download,
  Printer,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  Save,
  Plane,
  MessageCircle,
  Send,
  HelpCircle,
  Shield,
  User,
  AlertCircle,
  FileCheck,
  Zap,
  BellRing,
  Globe,
  Database,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation, useParams, Navigate } from 'react-router-dom';
import axios from 'axios';
import { fetchWithCache, postWithOfflineQueue, getOfflineQueue } from './lib/offlineSync';
import { ReloadPrompt } from './components/ReloadPrompt';
import * as XLSX from 'xlsx';
import QRCode from 'qrcode';
import { jsPDF } from "jspdf";
import "jspdf-autotable";

import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid,
  AreaChart,
  Area,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend
} from 'recharts';

// --- Constants ---

const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

const parseIDR = (val: string | number | undefined | null): number => {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  const strVal = String(val);
  const isNegative = strVal.startsWith('-');
  const num = parseInt(strVal.replace(/\D/g, ''), 10) || 0;
  return isNegative ? -num : num;
};

const printAllowanceReceipt = (transaction: any, santriName: string) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [80, 120]
  });

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('BUKTI TRANSAKSI', 40, 10, { align: 'center' });
  doc.text('UANG SAKU SANTRI', 40, 16, { align: 'center' });

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('------------------------------------------------', 40, 22, { align: 'center' });

  doc.text(`Tanggal : ${transaction[0].split('T')[0]}`, 5, 28);
  doc.text(`Nama    : ${santriName}`, 5, 34);
  doc.text(`ID      : ${transaction[1]}`, 5, 40);
  
  // Handle both old and new structure
  const tipe = transaction.length > 6 ? transaction[6] : transaction[3];
  const jumlah = transaction.length > 6 ? transaction[5] : transaction[2];
  const keterangan = transaction.length > 6 ? transaction[7] : transaction[4];
  const admin = transaction.length > 6 ? transaction[8] : transaction[5];

  doc.text(`Tipe    : ${tipe}`, 5, 46);
  
  doc.text('------------------------------------------------', 40, 52, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('NOMINAL:', 5, 60);
  doc.text(`Rp ${parseIDR(jumlah).toLocaleString('id-ID')}`, 75, 60, { align: 'right' });

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('------------------------------------------------', 40, 68, { align: 'center' });
  
  doc.text('Keterangan:', 5, 74);
  const splitKeterangan = doc.splitTextToSize(keterangan || '-', 70);
  doc.text(splitKeterangan, 5, 80);

  doc.text(`Petugas: ${admin || 'System'}`, 5, 90);

  doc.text('------------------------------------------------', 40, 95, { align: 'center' });
  doc.text('Terima Kasih', 40, 102, { align: 'center' });

  doc.save(`Struk_${transaction[1]}_${transaction[0].split('T')[0]}.pdf`);
};

const Logo = ({ className = "w-12 h-12", url }: { className?: string; url?: string }) => (
  <div className={`bg-emerald-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg overflow-hidden ${className}`}>
    {url ? (
      <img src={url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
    ) : (
      "PPSQ"
    )}
  </div>
);

const RealTimeClock = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center gap-4 text-sm font-medium text-slate-600">
      <div className="flex items-center gap-1.5">
        <Calendar className="w-4 h-4 text-emerald-600" />
        {time.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </div>
      <div className="flex items-center gap-1.5">
        <Clock className="w-4 h-4 text-emerald-600" />
        {time.toLocaleTimeString('id-ID')}
      </div>
    </div>
  );
};

const Marquee = ({ text }: { text: string }) => (
  <div className="bg-emerald-900 text-emerald-50 py-3 marquee text-sm font-bold tracking-wide">
    <div className="marquee-content">
      {text} • {text} • {text} • {text}
    </div>
  </div>
);

// --- Pages ---

const Login = ({ onLogin }: { onLogin: (user: any) => void }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<any>({});
  const [setupStatus, setSetupStatus] = useState<{ loading: boolean; message: string; type: 'success' | 'error' | 'idle' }>({
    loading: false,
    message: '',
    type: 'idle'
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetchWithCache('/api/settings');
        setSettings(res.data);
      } catch (err) {
        console.error("Failed to fetch settings:", err);
      }
    };
    fetchSettings();
  }, []);

  const handleSetup = async () => {
    setSetupStatus({ loading: true, message: 'Sedang menyiapkan database...', type: 'idle' });
    try {
      const res = await postWithOfflineQueue('/api/setup-database', {});
      setSetupStatus({ 
        loading: false, 
        message: 'Berhasil! Akun admin: admin / ppsq123', 
        type: 'success' 
      });
    } catch (err: any) {
      const errorData = err.response?.data?.error || err.message;
      const errorMessage = typeof errorData === 'object' ? JSON.stringify(errorData) : errorData;
      setSetupStatus({ 
        loading: false, 
        message: "Gagal: " + errorMessage, 
        type: 'error' 
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await postWithOfflineQueue('/api/login', { username, password });
      onLogin(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Username atau Password salah');
    } finally {
      setLoading(false);
    }
  };

  const appName = settings.app_name || "PPSQ";
  const appSlogan = settings.app_slogan || "Syafaatul Qur'an & Formal School";

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="p-8 text-center bg-emerald-600 text-white">
          <Logo className="w-20 h-20 mx-auto mb-4 bg-white text-emerald-600" url={settings.logo_url} />
          <h1 className="text-2xl font-bold font-display">{appName} Management</h1>
          <p className="text-emerald-100 mt-2">{appSlogan}</p>
        </div>
        <form onSubmit={handleSubmit} className="p-8 space-y-4">
          {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center font-bold">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
              placeholder="Masukkan username"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password Akses</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
              placeholder="••••••"
              required
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-emerald-200 transition-all disabled:opacity-50"
          >
            {loading ? 'Memproses...' : 'Masuk ke Sistem'}
          </button>
        </form>
        
        <div className="p-8 pt-0 border-t border-slate-50 mt-2">
          {setupStatus.message ? (
            <div className={`p-4 rounded-xl text-sm text-center font-medium mb-4 ${
              setupStatus.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 
              setupStatus.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'
            }`}>
              {setupStatus.message}
              {setupStatus.type !== 'idle' && (
                <button 
                  onClick={() => setSetupStatus({ loading: false, message: '', type: 'idle' })}
                  className="block w-full mt-2 text-[10px] underline uppercase tracking-widest"
                >
                  Tutup
                </button>
              )}
            </div>
          ) : (
            <button 
              onClick={handleSetup}
              disabled={setupStatus.loading}
              className="w-full border-2 border-emerald-100 text-emerald-600 font-bold py-2 rounded-xl hover:bg-emerald-50 transition-all text-sm disabled:opacity-50"
            >
              {setupStatus.loading ? 'Menyiapkan...' : 'Setup Database (First Time)'}
            </button>
          )}
          <p className="text-[10px] text-slate-400 text-center mt-4">
            Default Admin: admin / ppsq123
          </p>
        </div>
      </motion.div>
    </div>
  );
};

const Dashboard = ({ user }: { user: any }) => {
  const [santriCount, setSantriCount] = useState(0);
  const [financeStats, setFinanceStats] = useState({ lunas: 0, total: 0 });
  const [allowanceTotal, setAllowanceTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [spreadsheetUrl, setSpreadsheetUrl] = useState<string | null>(null);
  const [offlineQueueCount, setOfflineQueueCount] = useState(0);

  useEffect(() => {
    const updateQueueCount = () => {
      const queue = getOfflineQueue();
      setOfflineQueueCount(queue.length);
    };
    
    updateQueueCount();
    window.addEventListener('offlineQueueUpdated', updateQueueCount);
    return () => window.removeEventListener('offlineQueueUpdated', updateQueueCount);
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [santriRes, financeRes, allowanceRes, urlRes] = await Promise.all([
          fetchWithCache('/api/data/Santri'),
          fetchWithCache('/api/data/Finance'),
          fetchWithCache('/api/data/Allowance'),
          fetchWithCache('/api/spreadsheet-url').catch(() => ({ data: { url: null } }))
        ]);
        
        const santriData = Array.isArray(santriRes.data) ? santriRes.data : [];
        const financeData = Array.isArray(financeRes.data) ? financeRes.data : [];
        const allowanceData = Array.isArray(allowanceRes.data) ? allowanceRes.data : [];
        
        setSantriCount(santriData.length);
        const lunasCount = financeData.filter((f: any) => f && f[9] !== undefined && parseIDR(f[9]) <= 0).length;
        setFinanceStats({ lunas: lunasCount, total: financeData.length });
        
        const totalAllowance = allowanceData.reduce((acc: number, curr: any) => {
          const amount = parseIDR(curr[2]);
          return curr[3] === 'Masuk' ? acc + amount : acc - amount;
        }, 0);
        setAllowanceTotal(totalAllowance);
        
        setSpreadsheetUrl(urlRes.data.url);
      } catch (err) {
        console.error("Failed to fetch stats:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const handleSetupDatabase = async () => {
    setLoading(true);
    try {
      const res = await postWithOfflineQueue('/api/setup-database', {});
      alert(res.data.message || 'Database initialized successfully!');
    } catch (err: any) {
      alert(`Setup failed: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const stats = [
    { label: 'Total Santri', value: santriCount.toString(), icon: Users, color: 'bg-blue-500' },
    { label: 'Lunas Syahriyah', value: financeStats.total > 0 ? `${Math.round((financeStats.lunas / financeStats.total) * 100)}%` : '0%', icon: Wallet, color: 'bg-emerald-500' },
    { label: 'Total Uang Saku', value: `Rp ${allowanceTotal.toLocaleString('id-ID')}`, icon: Clock, color: 'bg-amber-500' },
    { label: 'Pendaftar Baru', value: '0', icon: UserPlus, color: 'bg-purple-500' },
  ];

  const menus = [
    { title: 'Data Santri', desc: 'Manajemen tingkat & status santri', icon: Users, path: '/santri', color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { title: 'Keuangan', desc: 'Syahriyah & Titipan Harian', icon: Wallet, path: '/syahriah', color: 'text-amber-600', bg: 'bg-amber-50' },
    { title: 'Tabungan', desc: 'Manajemen Tabungan Santri', icon: Wallet, path: '/syahriah/tabungan', color: 'text-blue-600', bg: 'bg-blue-50' },
    { title: 'Akademik', desc: 'Progress Tahfidz & Yanbu\'a', icon: BookOpen, path: '/academic', color: 'text-purple-600', bg: 'bg-purple-50' },
    { title: 'Galeri Foto', desc: 'Dokumentasi kegiatan pondok', icon: ImageIcon, path: '/gallery', color: 'text-pink-600', bg: 'bg-pink-50' },
    { title: 'Log Aktivitas', desc: 'Riwayat perubahan data', icon: History, path: '/logs', color: 'text-slate-600', bg: 'bg-slate-50' },
  ];

  if (user.role === 'admin' || user.role === 'superadmin') {
    menus.unshift({ title: 'Pendaftaran', desc: 'Input santri baru & upload berkas', icon: UserPlus, path: '/register', color: 'text-blue-600', bg: 'bg-blue-50' });
    menus.push({ title: 'Pengaturan', desc: 'Logo, Nama Aplikasi & User', icon: Settings, path: '/settings', color: 'text-emerald-600', bg: 'bg-emerald-50' });
  }

  return (
    <div className="space-y-8">
      {/* Header with Setup Button */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">Dashboard Utama</h1>
        <div className="flex gap-2">
          {offlineQueueCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-100 text-amber-700 rounded-xl text-sm font-bold">
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
              {offlineQueueCount} Data Mengantre (Offline)
            </div>
          )}
          {(user.role === 'admin' || user.role === 'superadmin') && (
            <button 
              onClick={handleSetupDatabase}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-xl text-sm font-bold hover:bg-slate-700 transition-colors disabled:opacity-50"
            >
              <Settings className="w-4 h-4" />
              {loading ? 'Initializing...' : 'Setup Database'}
            </button>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4"
          >
            <div className={`${stat.color} p-3 rounded-xl text-white`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">{stat.label}</p>
              <p className="text-xl font-bold text-slate-800">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Menu Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {menus.map((menu, i) => (
          <Link key={i} to={menu.path}>
            <motion.div 
              whileHover={{ y: -5 }}
              className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-xl hover:shadow-emerald-100 transition-all group"
            >
              <div className={`${menu.bg} ${menu.color} w-14 h-14 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <menu.icon className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-1">{menu.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{menu.desc}</p>
              <div className="mt-4 flex items-center text-emerald-600 text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                Buka Menu <ChevronRight className="w-4 h-4 ml-1" />
              </div>
            </motion.div>
          </Link>
        ))}
      </div>
    </div>
  );
};

// --- Main App Component ---

const VerifyPayment = () => {
  const { id } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetchWithCache(`/api/public/verify/${encodeURIComponent(id || '')}`);
        setData(res.data);
      } catch (err: any) {
        console.error(err);
        setData({ error: true, debug: err.response?.data?.debug });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-600 font-medium">Memverifikasi Nota...</p>
      </div>
    </div>
  );

  if (!data || data.error) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center border-t-8 border-red-500">
        <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <X className="w-12 h-12" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Nota Tidak Valid!</h1>
        <p className="text-slate-600">Maaf, data pembayaran tidak ditemukan atau nota ini palsu.</p>
        
        {data?.debug && (
          <div className="mt-4 p-3 bg-slate-100 rounded-lg text-left text-xs text-slate-500 overflow-auto">
            <p><strong>Debug Info:</strong></p>
            <pre>{JSON.stringify(data.debug, null, 2)}</pre>
          </div>
        )}

        <button 
          onClick={() => window.location.href = '/'}
          className="mt-8 w-full bg-slate-800 text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-900 transition-all"
        >
          Kembali ke Beranda
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center border-t-8 border-emerald-600">
        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-12 h-12" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Nota Ini Sah</h1>
        <p className="text-slate-600 leading-relaxed">
          Dikeluarkan oleh <span className="font-bold text-emerald-700">PPSQ Syafaatul Qur'an</span> untuk Ananda <span className="font-bold text-slate-800">{data.namaSantri}</span> pada <span className="font-bold text-slate-800">{data.tanggal}</span>.
        </p>
        
        <div className="mt-6 bg-slate-50 rounded-xl p-4 text-left">
          <div className="flex justify-between mb-2">
            <span className="text-slate-500">Jenis Transaksi:</span>
            <span className="font-bold text-slate-800">{data.jenis || 'Pembayaran'}</span>
          </div>
          {data.bulan !== '-' && (
            <div className="flex justify-between mb-2">
              <span className="text-slate-500">Periode:</span>
              <span className="font-bold text-slate-800">{data.bulan} {data.tahun}</span>
            </div>
          )}
          {data.keterangan && (
            <div className="flex justify-between mb-2">
              <span className="text-slate-500">Keterangan:</span>
              <span className="font-bold text-slate-800 text-right max-w-[60%]">{data.keterangan}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-slate-200 pt-2 mt-2">
            <span className="text-slate-500 font-medium">Nominal:</span>
            <span className="font-bold text-emerald-600 text-lg">Rp {parseIDR(data.nominal).toLocaleString('id-ID')}</span>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100">
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Sistem Informasi Manajemen PPSQ</p>
        </div>
      </div>
    </div>
  );
};

const CekKeuanganPublik = () => {
  const { id_santri } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetchWithCache(`/api/public/keuangan/${encodeURIComponent(id_santri || '')}`);
        setData(res.data);
      } catch (err: any) {
        console.error(err);
        setData({ error: true });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id_santri]);

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-600 font-medium">Memuat info keuangan...</p>
      </div>
    </div>
  );

  if (!data || data.error) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center border-t-8 border-red-500">
        <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <X className="w-12 h-12" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Data Tidak Ditemukan!</h1>
        <p className="text-slate-600">Pastikan Link/ID Santri yang Anda kunjungi sudah benar.</p>
      </div>
    </div>
  );

  const currentMonthName = new Intl.DateTimeFormat('id-ID', { month: 'long' }).format(new Date());
  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 py-8 md:py-12">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 flex flex-col">
        <div className="bg-gradient-to-r from-blue-600 to-emerald-600 p-8 text-center text-white">
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <User className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold mb-1 tracking-tight">{data.namaSantri}</h1>
          <p className="text-blue-100 font-medium text-sm">{data.kelasFormal} • {data.kategori}</p>
        </div>
        
        <div className="p-6 space-y-5">
          {/* Summary Cards */}
          <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-100 flex items-start gap-4 transition-transform hover:scale-[1.02]">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0 text-emerald-600 shadow-sm">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-emerald-800 uppercase tracking-wider mb-0.5">Saldo Titipan (Uang Saku)</p>
              <h2 className="text-2xl font-black text-emerald-600">Rp {parseIDR(data.saldoTitipan).toLocaleString('id-ID')}</h2>
            </div>
          </div>

          <div className="bg-blue-50 rounded-2xl p-5 border border-blue-100 flex items-start gap-4 transition-transform hover:scale-[1.02]">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0 text-blue-600 shadow-sm">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-blue-800 uppercase tracking-wider mb-0.5">Biaya Syahriah Bulanan</p>
              <h2 className="text-xl font-black text-blue-600">Rp {parseIDR(data.tagihanBulanIni).toLocaleString('id-ID')}</h2>
            </div>
          </div>

          <div className={`rounded-2xl p-5 border flex items-start gap-4 transition-transform hover:scale-[1.02] ${data.tunggakan > 0 ? 'bg-orange-50 border-orange-100' : 'bg-emerald-50 border-emerald-100'}`}>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${data.tunggakan > 0 ? 'bg-orange-100 text-orange-600' : 'bg-emerald-100 text-emerald-600'}`}>
              <FileCheck className="w-6 h-6" />
            </div>
            <div>
              <p className={`text-[10px] font-black uppercase tracking-wider mb-0.5 ${data.tunggakan > 0 ? 'text-orange-800' : 'text-emerald-800'}`}>
                Saldo Syahriah Hari Ini ({new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })})
              </p>
              <h2 className={`text-xl font-black ${data.tunggakan > 0 ? 'text-orange-600' : 'text-emerald-600'}`}>
                {data.tunggakan > 0 ? `Tunggakan: Rp ${parseIDR(data.tunggakan).toLocaleString('id-ID')}` : `Titipan: Rp ${Math.abs(parseIDR(data.tunggakan)).toLocaleString('id-ID')}`}
              </h2>
            </div>
          </div>

          {/* Conditional Red Alarm for heavy arrears if any, or just keep it simple as above */}
          
          {/* Transaction History Section */}
          <div className="pt-2">
            <div className="flex items-center gap-2 mb-3 px-1">
              <Clock className="w-4 h-4 text-slate-400" />
              <h3 className="text-sm font-bold text-slate-800 tracking-tight">Riwayat Transaksi Terakhir</h3>
            </div>
            
            <div className="space-y-3">
              {data.history && data.history.length > 0 ? (
                data.history.map((record: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-100 group hover:bg-white hover:shadow-md transition-all">
                    <div className="flex gap-3 items-center">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${record.type === 'Masuk' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                        {record.type === 'Masuk' ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800 line-clamp-1">{record.description}</p>
                        <p className="text-[10px] text-slate-400 font-medium">{new Date(record.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-black ${record.type === 'Masuk' ? 'text-emerald-600' : 'text-red-600'}`}>
                        {record.type === 'Masuk' ? '+' : '-'} Rp {parseIDR(record.amount).toLocaleString('id-ID')}
                      </p>
                      <p className="text-[9px] font-bold text-slate-300 uppercase tracking-tighter">{record.type}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-10 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                  <p className="text-xs text-slate-400">Belum ada riwayat transaksi</p>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="mt-auto bg-slate-50 p-6 text-center border-t border-slate-100">
          <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
            Data ini sinkron langsung dengan catatan bendahara pondok.<br/>
            <span className="text-slate-400 italic">Terakhir diperbarui pada: {data.lastSync ? new Date(data.lastSync).toLocaleString('id-ID') : '-'}</span>
          </p>
          <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mt-4"></div>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [settings, setSettings] = useState<any>({});
  const [financeSettings, setFinanceSettings] = useState<any>({});

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const [resSettings, resFinance] = await Promise.all([
          fetchWithCache('/api/settings'),
          fetchWithCache('/api/settings/finance')
        ]);
        setSettings(resSettings.data);
        setFinanceSettings(resFinance.data);
      } catch (err) {
        console.error("Failed to fetch settings:", err);
      }
    };
    fetchSettings();
  }, [user]);

  return (
    <Router>
      <Routes>
        <Route path="/verify/:id" element={<VerifyPayment />} />
        <Route path="/cek-keuangan/:id_santri" element={<CekKeuanganPublik />} />
        <Route path="*" element={
          !user ? (
            <Login onLogin={setUser} />
          ) : (
            <MainApp 
              user={user} 
              setUser={setUser} 
              isSidebarOpen={isSidebarOpen} 
              setIsSidebarOpen={setIsSidebarOpen} 
              settings={settings} 
              financeSettings={financeSettings}
            />
          )
        } />
      </Routes>
      <ReloadPrompt />
    </Router>
  );
}

function MainApp({ user, setUser, isSidebarOpen, setIsSidebarOpen, settings, financeSettings }: any) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const location = useLocation();

  useEffect(() => {
    if (location.pathname.startsWith('/syahriah')) setOpenGroup('finance');
    else if (location.pathname.startsWith('/settings') || location.pathname.startsWith('/tarif') || location.pathname.startsWith('/pengaturan')) setOpenGroup('settings');
  }, [location.pathname]);

  const appName = settings.app_name || "PPSQ";
  const appSlogan = settings.app_slogan || "Management System";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 hover:bg-slate-100 rounded-lg"
            >
              <Menu className="w-6 h-6 text-slate-600" />
            </button>
            <button 
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="hidden lg:block p-2 hover:bg-slate-100 rounded-lg"
              title={isSidebarCollapsed ? "Tampilkan Menu" : "Sembunyikan Menu"}
            >
              <Menu className="w-6 h-6 text-slate-600" />
            </button>
            <Logo className="w-10 h-10" url={settings.logo_url} />
            <div className="hidden sm:block">
              <h1 className="font-bold text-slate-800 leading-none">{appName}</h1>
              <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">{appSlogan}</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden lg:block">
              <RealTimeClock />
            </div>
            <div className="flex items-center gap-3 pl-6 border-l border-slate-200">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-slate-800">{user.username}</p>
                <p className="text-[10px] text-emerald-600 font-bold uppercase">{user.role}</p>
              </div>
              <button 
                onClick={() => setUser(null)}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
        <Marquee text={settings.marquee_text || `Selamat Datang di Sistem Informasi ${appName} - Mari Wujudkan Generasi Qur'ani yang Berakhlakul Karimah`} />
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Navigation */}
        <AnimatePresence>
          {(isSidebarOpen || (window.innerWidth >= 1024 && !isSidebarCollapsed)) && (
            <motion.aside 
              initial={{ x: -300, width: 0, opacity: 0 }}
              animate={{ x: 0, width: 288, opacity: 1 }}
              exit={{ x: -300, width: 0, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className={`fixed lg:static inset-y-0 left-0 bg-white border-r border-slate-200 z-40 lg:z-0 overflow-hidden ${isSidebarOpen ? 'block' : 'hidden lg:block'}`}
            >
              <div className="w-72 p-6 flex flex-col h-full">
                <div className="lg:hidden flex justify-between items-center mb-8">
                  <Logo className="w-10 h-10" url={settings.logo_url} />
                  <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <nav className="space-y-1 flex-1">
                  <SidebarLink to="/" icon={BookOpen} label="Dashboard" onClick={() => setIsSidebarOpen(false)} />
                  {(user.role === 'admin' || user.role === 'superadmin') && (
                    <SidebarLink to="/register" icon={UserPlus} label="Pendaftaran" onClick={() => setIsSidebarOpen(false)} />
                  )}
                  <SidebarLink to="/santri" icon={Users} label="Data Santri" onClick={() => setIsSidebarOpen(false)} />
                  
                  {(user.role === 'admin' || user.role === 'superadmin') && (
                    <SidebarLink to="/broadcast" icon={MessageCircle} label="Pesan Masal WA" onClick={() => setIsSidebarOpen(false)} />
                  )}

                  <SidebarGroup 
                    label="KEUANGAN" 
                    icon={Wallet} 
                    activePaths={['/syahriah']}
                    isOpen={openGroup === 'finance'}
                    onToggle={() => setOpenGroup(openGroup === 'finance' ? null : 'finance')}
                  >
                    <SidebarLink to="/syahriah/bulanan" label="Input Syahriyah Bulanan" isSubmenu onClick={() => setIsSidebarOpen(false)} />
                    <SidebarLink to="/syahriah/harian" label="Titipan Harian" isSubmenu onClick={() => setIsSidebarOpen(false)} />
                    <SidebarLink to="/syahriah/tabungan" label="Tabungan" isSubmenu onClick={() => setIsSidebarOpen(false)} />
                    <SidebarLink to="/syahriah/riwayat" label="Riwayat & Cetak" isSubmenu onClick={() => setIsSidebarOpen(false)} />
                    <SidebarLink to="/syahriah/laporan" label="Laporan Keuangan" isSubmenu onClick={() => setIsSidebarOpen(false)} />
                  </SidebarGroup>

                  <SidebarLink to="/kedisiplinan" icon={Shield} label="Kedisiplinan & Tahfidz" onClick={() => setIsSidebarOpen(false)} />
                  <SidebarLink to="/academic" icon={GraduationCap} label="Akademik" onClick={() => setIsSidebarOpen(false)} />
                  <SidebarLink to="/gallery" icon={ImageIcon} label="Galeri Foto" onClick={() => setIsSidebarOpen(false)} />
                  <SidebarLink to="/logs" icon={History} label="Log Aktivitas" onClick={() => setIsSidebarOpen(false)} />
                  
                  {user.role === 'admin' || user.role === 'superadmin' ? (
                    <SidebarGroup 
                      label="Pengaturan" 
                      icon={Settings} 
                      activePaths={['/settings', '/tarif', '/pengaturan']}
                      isOpen={openGroup === 'settings'}
                      onToggle={() => setOpenGroup(openGroup === 'settings' ? null : 'settings')}
                    >
                      <SidebarLink to="/settings/profile" icon={Globe} label="Profil & Identitas" isSubmenu onClick={() => setIsSidebarOpen(false)} />
                      <SidebarLink to="/tarif" icon={Layers} label="Tarif & Jenjang" isSubmenu onClick={() => setIsSidebarOpen(false)} />
                      <SidebarLink to="/settings/automation" icon={Zap} label="Otomasi Tagihan" isSubmenu onClick={() => setIsSidebarOpen(false)} />
                      <SidebarLink to="/settings/users" icon={Users} label="Manajemen Akses" isSubmenu onClick={() => setIsSidebarOpen(false)} />
                      <SidebarLink to="/settings/setup" icon={Database} label="Setup Database" isSubmenu onClick={() => setIsSidebarOpen(false)} />
                    </SidebarGroup>
                  ) : null}
                  
                  <div className="my-4 border-t border-slate-100"></div>
                  <SidebarLink to="/panduan" icon={HelpCircle} label="Panduan Penggunaan" onClick={() => setIsSidebarOpen(false)} />
                </nav>

                <div className="pt-6 border-t border-slate-100">
                  <div className="bg-emerald-50 p-4 rounded-2xl">
                    <p className="text-xs font-bold text-emerald-700 mb-1">Butuh Bantuan?</p>
                    <p className="text-[10px] text-emerald-600 leading-relaxed">Hubungi admin IT {appName} jika mengalami kendala sistem.</p>
                  </div>
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <Routes>
              <Route path="/" element={<Dashboard user={user} />} />
              <Route path="/register" element={<RegistrationForm user={user} />} />
              <Route path="/santri" element={<SantriList user={user} isAdmin={user.role?.toLowerCase().trim() === 'admin' || user.role?.toLowerCase().trim() === 'superadmin'} />} />
              <Route path="/syahriah" element={<FinanceManagement user={user} isAdmin={user.role?.toLowerCase().trim() === 'admin' || user.role?.toLowerCase().trim() === 'superadmin'} financeSettings={financeSettings} />} />
              <Route path="/syahriah/bulanan" element={<FinanceManagement user={user} isAdmin={user.role?.toLowerCase().trim() === 'admin' || user.role?.toLowerCase().trim() === 'superadmin'} financeSettings={financeSettings} />} />
              <Route path="/syahriah/harian" element={<DailyAllowanceManagement user={user} isAdmin={user.role?.toLowerCase().trim() === 'admin' || user.role?.toLowerCase().trim() === 'superadmin'} />} />
              <Route path="/syahriah/tabungan" element={<SavingsManagement user={user} isAdmin={user.role?.toLowerCase().trim() === 'admin' || user.role?.toLowerCase().trim() === 'superadmin'} />} />
              <Route path="/syahriah/riwayat" element={<FinanceManagement user={user} isAdmin={user.role?.toLowerCase().trim() === 'admin' || user.role?.toLowerCase().trim() === 'superadmin'} financeSettings={financeSettings} />} />
              <Route path="/syahriah/laporan" element={<FinanceManagement user={user} isAdmin={user.role?.toLowerCase().trim() === 'admin' || user.role?.toLowerCase().trim() === 'superadmin'} financeSettings={financeSettings} />} />
              <Route path="/kedisiplinan" element={<KedisiplinanTahfidz user={user} isAdmin={user.role?.toLowerCase().trim() === 'admin' || user.role?.toLowerCase().trim() === 'superadmin'} />} />
              <Route path="/academic" element={<AcademicProgress />} />
              <Route path="/gallery" element={<PhotoGallery user={user} isAdmin={user.role?.toLowerCase().trim() === 'admin' || user.role?.toLowerCase().trim() === 'superadmin'} />} />
              <Route path="/logs" element={<ActivityLogs />} />
              <Route path="/panduan" element={<HelpGuide />} />
              {(user.role?.toLowerCase().trim() === 'admin' || user.role?.toLowerCase().trim() === 'superadmin') ? (
                <>
                  <Route path="/broadcast" element={<BulkWhatsApp user={user} />} />
                  <Route path="/tarif" element={<ManajemenTarif user={user} />} />
                  <Route path="/settings" element={<SettingsManagement user={user} />} />
                  <Route path="/settings/:subtab" element={<SettingsManagement user={user} />} />
                  <Route path="/pengaturan/:subtab" element={<SettingsManagement user={user} />} />
                </>
              ) : (
                <>
                  <Route path="/broadcast" element={<Navigate to="/" replace />} />
                  <Route path="/tarif" element={<Navigate to="/" replace />} />
                </>
              )}
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}

const SidebarLink = ({ to, icon: Icon, label, onClick, isSubmenu }: any) => {
  const location = useLocation();
  const isActive = location.pathname === to || (to === '/settings/profile' && location.pathname === '/settings');

  return (
    <Link 
      to={to} 
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium transition-all ${
        isActive 
          ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100' 
          : 'text-slate-600 hover:bg-slate-50 hover:text-emerald-600'
      } ${isSubmenu ? 'ml-6 text-xs py-2' : ''}`}
    >
      <div className="flex items-center gap-3 w-full">
        {Icon && <Icon className={`${isSubmenu ? 'w-4 h-4' : 'w-5 h-5'} ${isActive ? 'text-white' : 'text-emerald-500/70'}`} />}
        <span className="truncate">{label}</span>
      </div>
    </Link>
  );
};

const SidebarGroup = ({ label, icon: Icon, children, activePaths, isOpen, onToggle }: any) => {
  const location = useLocation();
  const isCurrentlyActive = activePaths.some(path => location.pathname.startsWith(path));

  return (
    <div className="space-y-1">
      <button 
        onClick={onToggle}
        className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
          isCurrentlyActive
            ? 'text-emerald-700 bg-emerald-50' 
            : 'text-slate-600 hover:bg-slate-50 hover:text-emerald-600'
        }`}
      >
        <div className="flex items-center gap-3">
          <Icon className={`w-5 h-5 ${isCurrentlyActive ? 'text-emerald-600' : 'text-slate-400'}`} />
          <span className="text-sm font-bold truncate">{label}</span>
        </div>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''} ${isCurrentlyActive ? 'text-emerald-600' : 'text-slate-400'}`} />
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden space-y-1"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Feature Components (Placeholders for now) ---

const RegistrationForm = ({ user }: { user?: any }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    noKK: '',
    nama: '',
    nik: '',
    jenisKelamin: '',
    tempatLahir: '',
    tanggalLahir: '',
    agama: '',
    pendidikan: '',
    pekerjaan: '',
    statusPerkawinan: '',
    statusHubungan: '',
    kewarganegaraan: '',
    namaAyah: '',
    namaIbu: '',
    dusun: '',
    rt: '',
    rw: '',
    desa: '',
    kecamatan: '',
    kabupaten: '',
    propinsi: '',
    kelasFormal: '',
    tingkatPondok: '',
    noHP: '',
    tanggalPendaftaran: '',
    kategoriSantri: 'Santri Biasa',
  });
  const [kk, setKk] = useState<File | null>(null);
  const [wajah, setWajah] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [santriList, setSantriList] = useState<any[]>([]);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);

  const resetForm = () => {
    setStep(1);
    setFormData({
      noKK: '', nama: '', nik: '', jenisKelamin: '', tempatLahir: '', tanggalLahir: '',
      agama: '', pendidikan: '', pekerjaan: '', statusPerkawinan: '', statusHubungan: '',
      kewarganegaraan: '', namaAyah: '', namaIbu: '', dusun: '', rt: '', rw: '',
      desa: '', kecamatan: '', kabupaten: '', propinsi: '', kelasFormal: '', tingkatPondok: '', noHP: '',
      tanggalPendaftaran: '', kategoriSantri: 'Santri Biasa',
    });
    setKk(null);
    setWajah(null);
    setError(null);
  };

  useEffect(() => {
    const fetchSantri = async () => {
      try {
        const res = await fetchWithCache('/api/data/Santri');
        if (Array.isArray(res.data)) {
          setSantriList(res.data);
        }
      } catch (err) {
        console.error("Failed to fetch santri list for validation:", err);
      }
    };
    fetchSantri();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Validation for NIK and No KK: Only allow numbers and max 16 digits
    if (name === 'nik' || name === 'noKK') {
      const sanitizedValue = value.replace(/[^0-9]/g, '').slice(0, 16);
      
      // Real-time duplicate check for NIK
      if (name === 'nik' && sanitizedValue.length === 16) {
        const isDuplicate = santriList.some(s => s[3] === sanitizedValue);
        if (isDuplicate) {
          setShowDuplicateModal(true);
          // We don't return here, we let it set the value so they can see what they typed
        }
      }
      
      setFormData(prev => ({ ...prev, [name]: sanitizedValue }));
      return;
    }
    
    setFormData(prev => ({ ...prev, [name]: value }));
  };

    const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Length Validation
    if (formData.nik.length !== 16) {
      setError('NIK harus 16 digit');
      return;
    }
    if (formData.noKK.length !== 16) {
      setError('Nomor KK harus 16 digit');
      return;
    }

    // Duplicate NIK check
    const isDuplicate = santriList.some(s => s[3] === formData.nik);
    if (isDuplicate) {
      setError('NIK sudah terdaftar di sistem. Silakan gunakan NIK lain.');
      return;
    }

    setLoading(true);
    const data = new FormData();
    data.append('nama', formData.nama);
    data.append('data', JSON.stringify({
      ...formData,
      adminName: user?.username || 'System'
    }));
    if (kk) data.append('kk', kk);
    if (wajah) data.append('wajah', wajah);

    try {
      await postWithOfflineQueue('/api/santri/register', data);
      setShowSuccess(true);
      setError(null);
      resetForm();
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message;
      console.error("Registration error:", errorMsg);
      setError(`Gagal mendaftar: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const AGAMA_OPTIONS = ["Islam", "Kristen", "Katolik", "Hindu", "Buddha", "Khonghucu"];
  const JENIS_KELAMIN_OPTIONS = ["Laki-laki", "Perempuan"];
  const PENDIDIKAN_OPTIONS = [
    "Tidak/Belum Sekolah", "SD/Sederajat", "SMP/Sederajat", "SMA/Sederajat", 
    "Diploma I/II", "Akademi/Diploma III/S. Muda", "Diploma IV/Strata I", "Strata II", "Strata III"
  ];
  const PEKERJAAN_OPTIONS = [
    "Belum/Tidak Bekerja", "Mengurus Rumah Tangga", "Pelajar/Mahasiswa", "Pensiunan", 
    "Pegawai Negeri Sipil", "TNI", "POLRI", "Karyawan Swasta", "Karyawan BUMN", 
    "Wiraswasta", "Petani/Pekebun", "Nelayan", "Buruh", "Lainnya"
  ];
  const STATUS_PERKAWINAN_OPTIONS = ["Belum Kawin", "Kawin", "Cerai Hidup", "Cerai Mati"];
  const STATUS_HUBUNGAN_OPTIONS = [
    "Kepala Keluarga", "Suami", "Istri", "Anak", "Menantu", "Cucu", 
    "Orang Tua", "Mertua", "Famili Lain", "Pembantu", "Lainnya"
  ];
  const KEWARGANEGARAAN_OPTIONS = ["WNI", "WNA"];
  const KELAS_FORMAL_OPTIONS = [
    "1 MI", "2 MI", "3 MI", "4 MI", "5 MI", "6 MI",
    "1 MTS", "2 MTS", "3 MTS",
    "1 MA", "2 MA", "3 MA",
    "Lulus Sekolah Formal",
    "Yatim / Beasiswa",
    "Pengurus"
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
      <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
        <UserPlus className="text-emerald-600" /> Pendaftaran Santri Baru (Data Lengkap KK)
      </h2>
      
      {/* Stepper Header */}
      <div className="flex items-center justify-between mb-8">
        <div className={`flex flex-col items-center flex-1 ${step >= 1 ? 'text-emerald-600' : 'text-slate-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold mb-1 ${step >= 1 ? 'bg-emerald-100' : 'bg-slate-100'}`}>1</div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-center">Identitas</span>
        </div>
        <div className={`flex-1 h-1 rounded-full -mt-4 ${step >= 2 ? 'bg-emerald-500' : 'bg-slate-100'}`}></div>
        <div className={`flex flex-col items-center flex-1 ${step >= 2 ? 'text-emerald-600' : 'text-slate-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold mb-1 ${step >= 2 ? 'bg-emerald-100' : 'bg-slate-100'}`}>2</div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-center">Data Keluarga & Alamat</span>
        </div>
        <div className={`flex-1 h-1 rounded-full -mt-4 ${step >= 3 ? 'bg-emerald-500' : 'bg-slate-100'}`}></div>
        <div className={`flex flex-col items-center flex-1 ${step >= 3 ? 'text-emerald-600' : 'text-slate-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold mb-1 ${step >= 3 ? 'bg-emerald-100' : 'bg-slate-100'}`}>3</div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-center">Pondok & Berkas</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-2xl flex items-center gap-3 font-medium">
            <XCircle className="w-5 h-5" />
            {error}
          </div>
        )}
        {showSuccess && (
          <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 p-4 rounded-2xl flex items-center gap-3 font-medium">
            <CheckCircle className="w-5 h-5" />
            Pendaftaran Berhasil! Data santri telah tersimpan di sistem.
          </div>
        )}
        
        {step === 1 && (
          <>
          {/* Data Identitas */}
          <div className="space-y-4">
          <h3 className="text-sm font-bold text-emerald-600 uppercase tracking-wider border-b border-emerald-100 pb-2">Data Identitas (Sesuai KK)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nomor KK</label>
              <input 
                type="text" 
                name="noKK" 
                value={formData.noKK} 
                onChange={handleChange} 
                className={`w-full px-4 py-2 rounded-xl border outline-none focus:ring-2 focus:ring-emerald-500 ${formData.noKK.length > 0 && formData.noKK.length < 16 ? 'border-red-500 text-red-600' : 'border-slate-200'}`} 
                placeholder="16 Digit Nomor KK" 
                required 
              />
              {formData.noKK.length > 0 && formData.noKK.length < 16 && (
                <p className="text-[10px] text-red-500 mt-1">Harus 16 digit (saat ini: {formData.noKK.length})</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">NIK</label>
              <input 
                type="text" 
                name="nik" 
                value={formData.nik} 
                onChange={handleChange} 
                className={`w-full px-4 py-2 rounded-xl border outline-none focus:ring-2 focus:ring-emerald-500 ${formData.nik.length > 0 && formData.nik.length < 16 ? 'border-red-500 text-red-600' : 'border-slate-200'}`} 
                placeholder="16 Digit NIK" 
                required 
              />
              {formData.nik.length > 0 && formData.nik.length < 16 && (
                <p className="text-[10px] text-red-500 mt-1">Harus 16 digit (saat ini: {formData.nik.length})</p>
              )}
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Nama Lengkap</label>
              <input type="text" name="nama" value={formData.nama} onChange={handleChange} className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Nama Lengkap Sesuai Dokumen" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tempat Lahir</label>
                <input type="text" name="tempatLahir" value={formData.tempatLahir} onChange={handleChange} className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tanggal Lahir</label>
                <input type="date" name="tanggalLahir" value={formData.tanggalLahir} onChange={handleChange} className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500" required />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Jenis Kelamin</label>
              <select name="jenisKelamin" value={formData.jenisKelamin} onChange={handleChange} className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500" required>
                <option value="">Pilih Jenis Kelamin</option>
                {JENIS_KELAMIN_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Agama</label>
              <select name="agama" value={formData.agama} onChange={handleChange} className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500" required>
                <option value="">Pilih Agama</option>
                {AGAMA_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Pendidikan</label>
              <select name="pendidikan" value={formData.pendidikan} onChange={handleChange} className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500" required>
                <option value="">Pilih Pendidikan</option>
                {PENDIDIKAN_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Jenis Pekerjaan</label>
              <select name="pekerjaan" value={formData.pekerjaan} onChange={handleChange} className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500" required>
                <option value="">Pilih Pekerjaan</option>
                {PEKERJAAN_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status Perkawinan</label>
              <select name="statusPerkawinan" value={formData.statusPerkawinan} onChange={handleChange} className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500" required>
                <option value="">Pilih Status</option>
                {STATUS_PERKAWINAN_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status Hubungan Keluarga</label>
              <select name="statusHubungan" value={formData.statusHubungan} onChange={handleChange} className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500" required>
                <option value="">Pilih Hubungan</option>
                {STATUS_HUBUNGAN_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Kewarganegaraan</label>
              <select name="kewarganegaraan" value={formData.kewarganegaraan} onChange={handleChange} className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500" required>
                <option value="">Pilih Kewarganegaraan</option>
                {KEWARGANEGARAAN_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
          </div>
        </div>
        </>
        )}

        {step === 2 && (
          <>
        {/* Data Orang Tua */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-emerald-600 uppercase tracking-wider border-b border-emerald-100 pb-2">Data Orang Tua</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nama Ayah</label>
              <input type="text" name="namaAyah" value={formData.namaAyah} onChange={handleChange} className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nama Ibu</label>
              <input type="text" name="namaIbu" value={formData.namaIbu} onChange={handleChange} className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500" required />
            </div>
          </div>
        </div>

        {/* Data Alamat */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-emerald-600 uppercase tracking-wider border-b border-emerald-100 pb-2">Alamat Domisili</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Dusun</label>
              <input type="text" name="dusun" value={formData.dusun} onChange={handleChange} className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">RT</label>
              <input type="text" name="rt" value={formData.rt} onChange={handleChange} className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500" placeholder="000" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">RW</label>
              <input type="text" name="rw" value={formData.rw} onChange={handleChange} className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500" placeholder="000" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Desa/Kelurahan</label>
              <input type="text" name="desa" value={formData.desa} onChange={handleChange} className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Kecamatan</label>
              <input type="text" name="kecamatan" value={formData.kecamatan} onChange={handleChange} className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Kabupaten/Kota</label>
              <input type="text" name="kabupaten" value={formData.kabupaten} onChange={handleChange} className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500" required />
            </div>
            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-slate-700 mb-1">Provinsi</label>
              <input type="text" name="propinsi" value={formData.propinsi} onChange={handleChange} className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500" required />
            </div>
          </div>
        </div>
        </>
        )}

        {step === 3 && (
          <>
        {/* Data Akademik */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-emerald-600 uppercase tracking-wider border-b border-emerald-100 pb-2">Data Akademik Pondok</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Kelas Sekolah Formal</label>
              <select 
                name="kelasFormal" 
                value={formData.kelasFormal} 
                onChange={handleChange} 
                className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500" 
                required
              >
                <option value="">Pilih Kelas</option>
                {KELAS_FORMAL_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Kategori Santri</label>
              <select name="kategoriSantri" value={formData.kategoriSantri} onChange={handleChange} className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500" required>
                <option value="Santri Biasa">Santri Biasa</option>
                <option value="Santri Ndalem">Santri Ndalem</option>
              </select>
              <p className="text-[10px] text-slate-400 mt-1">Status ini akan mempengaruhi perhitungan tarif tagihan syahriyah.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tingkat Pondok</label>
              <select name="tingkatPondok" value={formData.tingkatPondok} onChange={handleChange} className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500" required>
                <option value="">Pilih Tingkat</option>
                <option value="Yanbu'a 1">Yanbu'a 1</option>
                <option value="Yanbu'a 2">Yanbu'a 2</option>
                <option value="Yanbu'a 3">Yanbu'a 3</option>
                <option value="Yanbu'a 4">Yanbu'a 4</option>
                <option value="Yanbu'a 5">Yanbu'a 5</option>
                <option value="Yanbu'a 6">Yanbu'a 6</option>
                <option value="Yanbu'a 7">Yanbu'a 7</option>
                <option value="Tahfidz Juz 1-5">Tahfidz Juz 1-5</option>
                <option value="Tahfidz Juz 6-10">Tahfidz Juz 6-10</option>
                <option value="Tahfidz Juz 11-20">Tahfidz Juz 11-20</option>
                <option value="Tahfidz Juz 21-30">Tahfidz Juz 21-30</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nomor HP (WhatsApp)</label>
              <input type="text" name="noHP" value={formData.noHP} onChange={handleChange} className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Contoh: 08123456789" required />
              <p className="text-[10px] text-slate-400 mt-1">Digunakan untuk mengirim notifikasi pendaftaran & info pondok.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tanggal Pendaftaran (Tgl/Bln/Thn)</label>
              <input 
                type="date" 
                name="tanggalPendaftaran" 
                value={formData.tanggalPendaftaran} 
                onChange={handleChange} 
                className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500" 
                placeholder="hh/bb/tttt"
                required 
              />
              <p className="text-[10px] text-slate-400 mt-1">Wajib diisi. Tanggal santri mulai menetap di pondok.</p>
            </div>
          </div>
        </div>

        {/* Berkas */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-emerald-600 uppercase tracking-wider border-b border-emerald-100 pb-2">Upload Berkas</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Upload Foto KK</label>
              <input type="file" onChange={e => setKk(e.target.files?.[0] || null)} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Upload Foto Wajah</label>
              <input type="file" onChange={e => setWajah(e.target.files?.[0] || null)} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100" />
            </div>
          </div>
        </div>
        </>
        )}

        <div className="pt-6 flex items-center justify-between gap-4">
          {step > 1 && (
            <button type="button" onClick={() => setStep(step - 1)} className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-bold hover:bg-slate-200 transition-all">
              Sebelumnya
            </button>
          )}
          {step < 3 && (
            <button type="button" onClick={() => {
              // Basic validation before going to next step
              if (step === 1 && (!formData.nik || !formData.noKK || !formData.nama || formData.nik.length < 16 || formData.noKK.length < 16)) {
                setError('Mohon lengkapi NIK (16 digit), No KK (16 digit), dan Nama pada langkah ini');
                return;
              }
              setError(null);
              setStep(step + 1);
            }} className="flex-1 bg-emerald-600 text-white py-4 rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-xl">
              Selanjutnya
            </button>
          )}
          {step === 3 && (
            <button type="submit" disabled={loading} className="flex-1 bg-emerald-600 text-white py-4 rounded-2xl font-bold shadow-xl hover:bg-emerald-700 transition-all flex items-center justify-center gap-2">
              {loading ? 'Mengunggah Data...' : <><Plus className="w-5 h-5" /> Simpan Pendaftaran Santri</>}
            </button>
          )}
        </div>
      </form>

      {/* Success Modal */}
      <AnimatePresence>
        {showSuccess && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl"
            >
              <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <UserPlus className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-2">Pendaftaran Berhasil!</h3>
              <p className="text-slate-500 mb-8">Data santri telah berhasil disimpan ke sistem dan database pusat.</p>
              <button 
                onClick={() => setShowSuccess(false)}
                className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-700 transition-all"
              >
                Selesai
              </button>
            </motion.div>
          </div>
        )}

        {showDuplicateModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 text-center"
            >
              <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <XCircle className="w-12 h-12 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">NIK Terinput Ganda!</h3>
              <p className="text-slate-500 mb-8">
                Tolong periksa kembali. NIK <span className="font-bold text-red-600">{formData.nik}</span> sudah terdaftar di sistem.
              </p>
              <div className="flex flex-col gap-3">
                <button 
                  type="button"
                  onClick={() => setShowDuplicateModal(false)}
                  className="w-full py-3 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200"
                >
                  Koreksi NIK
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    setShowDuplicateModal(false);
                    resetForm();
                  }}
                  className="w-full py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-colors"
                >
                  Batal & Kosongkan Formulir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const calculateLamaMenetap = (startDateStr: string) => {
  if (!startDateStr) return "0";
  
  const start = new Date(startDateStr);
  if (isNaN(start.getTime())) return "0";
  
  const now = new Date();
  
  // Reset time to midnight for accurate day calculation
  const startDate = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const diffTime = today.getTime() - startDate.getTime();
  const diffDaysTotal = Math.round(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDaysTotal < 0) return "Akan Datang";
  if (diffDaysTotal === 0) return "Baru Masuk";
  
  let years = today.getFullYear() - startDate.getFullYear();
  let months = today.getMonth() - startDate.getMonth();
  let days = today.getDate() - startDate.getDate();
  
  if (days < 0) {
    months--;
    const lastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
    days += lastMonth.getDate();
  }
  
  if (months < 0) {
    years--;
    months += 12;
  }
  
  let result = [];
  if (years > 0) result.push(`${years} Tahun`);
  if (months > 0) result.push(`${months} Bulan`);
  if (days > 0) result.push(`${days} Hari`);
  
  return result.join(' ') || "0";
};

const EditSantriModal = ({ santri, allSantri, onClose, onUpdate, user }: { santri: any, allSantri: any[], onClose: () => void, onUpdate: () => void, user?: any }) => {
  const [formData, setFormData] = useState({
    noKK: santri[1] || '',
    nama: santri[2] || '',
    nik: santri[3] || '',
    jenisKelamin: santri[4] || '',
    tempatLahir: santri[5] || '',
    tanggalLahir: santri[6] || '',
    agama: santri[7] || '',
    pendidikan: santri[8] || '',
    pekerjaan: santri[9] || '',
    statusPerkawinan: santri[10] || '',
    statusHubungan: santri[11] || '',
    kewarganegaraan: santri[12] || '',
    namaAyah: santri[13] || '',
    namaIbu: santri[14] || '',
    dusun: santri[15] || '',
    rt: santri[16] || '',
    rw: santri[17] || '',
    desa: santri[18] || '',
    kecamatan: santri[19] || '',
    kabupaten: santri[20] || '',
    propinsi: santri[21] || '',
    kelasFormal: santri[22] || '',
    tingkatPondok: santri[23] || '',
    status: santri[26] || 'Aktif',
    noHP: santri[27] || '',
    tanggalPendaftaran: santri[28] || '',
    kategoriSantri: santri[31] || 'Santri Biasa',
  });
  const [kk, setKk] = useState<File | null>(null);
  const [wajah, setWajah] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const AGAMA_OPTIONS = ["Islam", "Kristen", "Katolik", "Hindu", "Buddha", "Khonghucu"];
  const JENIS_KELAMIN_OPTIONS = ["Laki-laki", "Perempuan"];
  const PENDIDIKAN_OPTIONS = [
    "Tidak/Belum Sekolah", "SD/Sederajat", "SMP/Sederajat", "SMA/Sederajat", 
    "Diploma I/II", "Akademi/Diploma III/S. Muda", "Diploma IV/Strata I", "Strata II", "Strata III"
  ];
  const PEKERJAAN_OPTIONS = [
    "Belum/Tidak Bekerja", "Mengurus Rumah Tangga", "Pelajar/Mahasiswa", "Pensiunan", 
    "Pegawai Negeri Sipil", "TNI", "POLRI", "Karyawan Swasta", "Karyawan BUMN", 
    "Wiraswasta", "Petani/Pekebun", "Nelayan", "Buruh", "Lainnya"
  ];
  const STATUS_PERKAWINAN_OPTIONS = ["Belum Kawin", "Kawin", "Cerai Hidup", "Cerai Mati"];
  const STATUS_HUBUNGAN_OPTIONS = [
    "Kepala Keluarga", "Suami", "Istri", "Anak", "Menantu", "Cucu", 
    "Orang Tua", "Mertua", "Famili Lain", "Pembantu", "Lainnya"
  ];
  const KEWARGANEGARAAN_OPTIONS = ["WNI", "WNA"];
  const TINGKAT_PONDOK_OPTIONS = [
    "Yanbu'a 1", "Yanbu'a 2", "Yanbu'a 3", "Yanbu'a 4", "Yanbu'a 5", "Yanbu'a 6", "Yanbu'a 7",
    "Tahfidz Juz 1-5", "Tahfidz Juz 6-10", "Tahfidz Juz 11-20", "Tahfidz Juz 21-30"
  ];
  const KELAS_FORMAL_OPTIONS = [
    "1 MI", "2 MI", "3 MI", "4 MI", "5 MI", "6 MI",
    "1 MTS", "2 MTS", "3 MTS",
    "1 MA", "2 MA", "3 MA",
    "Lulus Sekolah Formal",
    "Yatim / Beasiswa",
    "Pengurus"
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Validation for NIK and No KK: Only allow numbers and max 16 digits
    if (name === 'nik' || name === 'noKK') {
      const sanitizedValue = value.replace(/[^0-9]/g, '').slice(0, 16);
      setFormData(prev => ({ ...prev, [name]: sanitizedValue }));
      return;
    }
    
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Length Validation
    if (formData.nik.length !== 16) {
      setError('NIK harus 16 digit');
      return;
    }
    if (formData.noKK.length !== 16) {
      setError('Nomor KK harus 16 digit');
      return;
    }

    // Duplicate NIK check (excluding current santri)
    const isDuplicate = allSantri.some(s => s[3] === formData.nik && s[0] !== santri[0]);
    if (isDuplicate) {
      setError('NIK sudah terdaftar di sistem. Silakan gunakan NIK lain.');
      return;
    }

    setLoading(true);
    try {
      const data = new FormData();
      data.append('id', santri[0]);
      
      const updatedData = {
        ...formData,
        kkUrl: santri[24],
        wajahUrl: santri[25],
        adminName: user?.username || 'System',
        saldoTabunganZiarah: santri[30] || "0"
      };
      
      data.append('data', JSON.stringify(updatedData));
      if (kk) data.append('kk', kk);
      if (wajah) data.append('wajah', wajah);

      await postWithOfflineQueue('/api/santri/update', data);
      onUpdate();
      onClose();
    } catch (err: any) {
      console.error("Failed to update santri:", err);
      setError(err.response?.data?.error || err.message || "Gagal memperbarui data santri.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-3xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
      >
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-blue-600 text-white">
          <div>
            <h3 className="text-xl font-bold">Edit Data Santri</h3>
            <p className="text-blue-100 text-xs">Perbarui informasi kependudukan & akademik</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-blue-700 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-2xl flex items-center gap-3 font-medium">
                <XCircle className="w-5 h-5" />
                {error}
              </div>
            )}
            {/* Identitas */}
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-blue-600 uppercase tracking-widest border-b border-blue-50 pb-2">Identitas Diri</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Nomor KK</label>
                  <input 
                    type="text" 
                    name="noKK" 
                    value={formData.noKK} 
                    onChange={handleChange} 
                    className={`w-full px-4 py-2 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 ${formData.noKK.length > 0 && formData.noKK.length < 16 ? 'border-red-500 text-red-600' : 'border-slate-200'}`} 
                  />
                  {formData.noKK.length > 0 && formData.noKK.length < 16 && (
                    <p className="text-[10px] text-red-500 mt-1">Harus 16 digit (saat ini: {formData.noKK.length})</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">NIK</label>
                  <input 
                    type="text" 
                    name="nik" 
                    value={formData.nik} 
                    onChange={handleChange} 
                    className={`w-full px-4 py-2 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 ${formData.nik.length > 0 && formData.nik.length < 16 ? 'border-red-500 text-red-600' : 'border-slate-200'}`} 
                  />
                  {formData.nik.length > 0 && formData.nik.length < 16 && (
                    <p className="text-[10px] text-red-500 mt-1">Harus 16 digit (saat ini: {formData.nik.length})</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Nama Lengkap</label>
                  <input type="text" name="nama" value={formData.nama} onChange={handleChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Tempat Lahir</label>
                  <input type="text" name="tempatLahir" value={formData.tempatLahir} onChange={handleChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Tanggal Lahir</label>
                  <input type="date" name="tanggalLahir" value={formData.tanggalLahir} onChange={handleChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Jenis Kelamin</label>
                  <select name="jenisKelamin" value={formData.jenisKelamin} onChange={handleChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Pilih</option>
                    {JENIS_KELAMIN_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Agama</label>
                  <select name="agama" value={formData.agama} onChange={handleChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Pilih</option>
                    {AGAMA_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Pendidikan</label>
                  <select name="pendidikan" value={formData.pendidikan} onChange={handleChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Pilih</option>
                    {PENDIDIKAN_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Pekerjaan</label>
                  <select name="pekerjaan" value={formData.pekerjaan} onChange={handleChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Pilih</option>
                    {PEKERJAAN_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Status Perkawinan</label>
                  <select name="statusPerkawinan" value={formData.statusPerkawinan} onChange={handleChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Pilih</option>
                    {STATUS_PERKAWINAN_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Status Hubungan</label>
                  <select name="statusHubungan" value={formData.statusHubungan} onChange={handleChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Pilih</option>
                    {STATUS_HUBUNGAN_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Kewarganegaraan</label>
                  <select name="kewarganegaraan" value={formData.kewarganegaraan} onChange={handleChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Pilih</option>
                    {KEWARGANEGARAAN_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Orang Tua & Alamat */}
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-blue-600 uppercase tracking-widest border-b border-blue-50 pb-2">Orang Tua & Alamat</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Nama Ayah</label>
                  <input type="text" name="namaAyah" value={formData.namaAyah} onChange={handleChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Nama Ibu</label>
                  <input type="text" name="namaIbu" value={formData.namaIbu} onChange={handleChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Dusun</label>
                  <input type="text" name="dusun" value={formData.dusun} onChange={handleChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">RT</label>
                    <input type="text" name="rt" value={formData.rt} onChange={handleChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">RW</label>
                    <input type="text" name="rw" value={formData.rw} onChange={handleChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Desa</label>
                  <input type="text" name="desa" value={formData.desa} onChange={handleChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Kecamatan</label>
                  <input type="text" name="kecamatan" value={formData.kecamatan} onChange={handleChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Kabupaten</label>
                  <input type="text" name="kabupaten" value={formData.kabupaten} onChange={handleChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Provinsi</label>
                  <input type="text" name="propinsi" value={formData.propinsi} onChange={handleChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
            </div>

            {/* Akademik */}
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-blue-600 uppercase tracking-widest border-b border-blue-50 pb-2">Akademik & Status</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Kelas Formal</label>
                  <select 
                    name="kelasFormal" 
                    value={formData.kelasFormal} 
                    onChange={handleChange} 
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Pilih Kelas</option>
                    {KELAS_FORMAL_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Kategori Santri</label>
                  <select name="kategoriSantri" value={formData.kategoriSantri} onChange={handleChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" required>
                    <option value="Santri Biasa">Santri Biasa</option>
                    <option value="Santri Ndalem">Santri Ndalem</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Tingkat Pondok</label>
                  <select name="tingkatPondok" value={formData.tingkatPondok} onChange={handleChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Pilih</option>
                    {TINGKAT_PONDOK_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">No. HP / WA</label>
                  <input type="text" name="noHP" value={formData.noHP} onChange={handleChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Status Santri</label>
                  <select name="status" value={formData.status} onChange={handleChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="Aktif">Aktif</option>
                    <option value="Alumni">Alumni</option>
                    <option value="Keluar">Keluar</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Tanggal Pendaftaran</label>
                  <input type="date" name="tanggalPendaftaran" value={formData.tanggalPendaftaran} onChange={handleChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
            </div>

            {/* Upload Berkas */}
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-blue-600 uppercase tracking-widest border-b border-blue-50 pb-2">Upload Berkas (Opsional)</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Ganti Foto KK</label>
                  <input type="file" onChange={e => setKk(e.target.files?.[0] || null)} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                  {santri[24] && <p className="text-[10px] text-slate-400 mt-1">Biarkan kosong jika tidak ingin mengganti.</p>}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Ganti Foto Wajah</label>
                  <input type="file" onChange={e => setWajah(e.target.files?.[0] || null)} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                  {santri[25] && <p className="text-[10px] text-slate-400 mt-1">Biarkan kosong jika tidak ingin mengganti.</p>}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
              <button type="button" onClick={onClose} className="px-6 py-2 text-slate-600 font-bold hover:bg-slate-50 rounded-xl transition-all">Batal</button>
              <button type="submit" disabled={loading} className="px-8 py-2 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all disabled:opacity-50">
                {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

const SantriStats = ({ santri }: { santri: any[] }) => {
  const [selectedCategory, setSelectedCategory] = useState<{title: string, data: any[]} | null>(null);

  const total = santri;
  const laki = santri.filter(s => s[4] === 'Laki-laki');
  const perempuan = santri.filter(s => s[4] === 'Perempuan');
  const aktif = santri.filter(s => s[26] === 'Aktif' || !s[26]);
  const keluar = santri.filter(s => s[26] === 'Keluar');
  const alumni = santri.filter(s => s[26] === 'Alumni');
  
  const mi = santri.filter(s => (s[22] || '').toUpperCase().includes('MI'));
  const mts = santri.filter(s => (s[22] || '').toUpperCase().includes('MTS') || (s[22] || '').includes('MTs'));
  const ma = santri.filter(s => (s[22] || '').toUpperCase().includes('MA') && !(s[22] || '').toUpperCase().includes('FORMAL')); // Make sure MA doesn't overlap with LULUS FORMAL if they type "LULUS MA"
  const lulusFormal = santri.filter(s => (s[22] || '').toUpperCase().includes('LULUS'));
  const beasiswa = santri.filter(s => (s[22] || '').toUpperCase().includes('YATIM') || (s[2] || '').toLowerCase().includes('yatim'));
  const pengurus = santri.filter(s => (s[22] || '').toUpperCase().includes('PENGURUS'));
  const ndalem = santri.filter(s => (s[31] || '').toUpperCase().includes('NDALEM'));

  const summaryCards = [
    { title: "Total Santri", count: total.length, data: total, color: "bg-slate-800 text-white" },
    { title: "Laki-laki", count: laki.length, data: laki, color: "bg-blue-600 text-white" },
    { title: "Perempuan", count: perempuan.length, data: perempuan, color: "bg-pink-600 text-white" },
    { title: "Aktif", count: aktif.length, data: aktif, color: "bg-emerald-600 text-white" },
    { title: "Keluar", count: keluar.length, data: keluar, color: "bg-red-500 text-white" },
    { title: "Alumni", count: alumni.length, data: alumni, color: "bg-slate-500 text-white" },
    { title: "MI", count: mi.length, data: mi, color: "bg-indigo-500 text-white" },
    { title: "MTS", count: mts.length, data: mts, color: "bg-violet-500 text-white" },
    { title: "MA", count: ma.length, data: ma, color: "bg-purple-500 text-white" },
    { title: "Lulus Formal", count: lulusFormal.length, data: lulusFormal, color: "bg-fuchsia-500 text-white" },
    { title: "Beasiswa / Yatim", count: beasiswa.length, data: beasiswa, color: "bg-amber-500 text-white" },
    { title: "Pengurus", count: pengurus.length, data: pengurus, color: "bg-teal-600 text-white" },
    { title: "Santri Ndalem", count: ndalem.length, data: ndalem, color: "bg-rose-600 text-white" },
  ];

  // Logic for Umur
  const calculateAge = (birthDate: string) => {
    if (!birthDate) return 0;
    const today = new Date();
    const birthDateObj = new Date(birthDate);
    let age = today.getFullYear() - birthDateObj.getFullYear();
    const m = today.getMonth() - birthDateObj.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDateObj.getDate())) {
      age--;
    }
    return age;
  };
  const santriWithAge = santri.map(s => ({ ...s, original: s, calculatedAge: calculateAge(s[6]) })).filter(s => !isNaN(s.calculatedAge) && s.calculatedAge > 0);
  
  const ageGroups = santriWithAge.reduce((acc, s) => {
    const age = s.calculatedAge;
    let group = "";
    if (age < 10) group = "< 10 Tahun";
    else if (age <= 12) group = "10 - 12 Tahun";
    else if (age <= 15) group = "13 - 15 Tahun";
    else if (age <= 18) group = "16 - 18 Tahun";
    else group = "> 18 Tahun";
    
    acc[group] = (acc[group] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const ageData = ["< 10 Tahun", "10 - 12 Tahun", "13 - 15 Tahun", "16 - 18 Tahun", "> 18 Tahun"]
    .map(name => ({ name, value: ageGroups[name] || 0 }))
    .filter(d => d.value > 0);

  // Existing charts
  const genderData = [
    { name: 'Laki-laki', value: laki.length, color: '#3b82f6' },
    { name: 'Perempuan', value: perempuan.length, color: '#ec4899' }
  ];

  const statusData = [
    { name: 'Aktif', value: aktif.length, color: '#10b981' },
    { name: 'Alumni', value: alumni.length, color: '#64748b' },
    { name: 'Keluar', value: keluar.length, color: '#ef4444' }
  ];

  const kelasMap = santri.reduce((acc, s) => {
    const k = s[22] || 'Tidak Diketahui';
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const kelasData = Object.entries(kelasMap).map(([name, value]) => ({ name, value: Number(value) })).sort((a, b) => b.value - a.value);

  const tingkatMap = santri.reduce((acc, s) => {
    const t = s[23] || 'Tidak Diketahui';
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const tingkatData = Object.entries(tingkatMap).map(([name, value]) => ({ name, value: Number(value) })).sort((a, b) => b.value - a.value);

  const sortedByAge = [...santriWithAge].sort((a, b) => new Date(b.original[6]).getTime() - new Date(a.original[6]).getTime());
  const termuda = sortedByAge.slice(0, 5);
  const tertua = [...sortedByAge].reverse().slice(0, 5);

  const sortedByDate = [...santri].filter(s => s[28] && !isNaN(new Date(s[28]).getTime())).sort((a, b) => new Date(a[28]).getTime() - new Date(b[28]).getTime());
  const terlama = sortedByDate.slice(0, 5);
  const terbaru = [...sortedByDate].reverse().slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Summary Clickable Cards */}
      <div>
        <h3 className="text-lg font-bold text-slate-800 mb-4">Total & Kategori Santri <span className="text-sm font-normal text-slate-500">(Klik untuk melihat daftar nama)</span></h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {summaryCards.map((card, i) => (
            <button 
              key={i} 
              onClick={() => setSelectedCategory({ title: card.title, data: card.data })}
              className={`${card.color} p-4 rounded-2xl shadow-sm hover:scale-105 transition-transform flex flex-col justify-center items-center text-center`}
            >
              <p className="text-3xl font-black mb-1">{card.count}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider opacity-90">{card.title}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-sm font-bold text-slate-800 mb-4">Distribusi Kelamin</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={genderData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {genderData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-sm font-bold text-slate-800 mb-4">Distribusi Status</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center justify-between">
            <span>5 Santri Termuda</span>
            <button onClick={() => setSelectedCategory({ title: "Berdasarkan Umur (Termuda)", data: sortedByAge.map(s => s.original) })} className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-md hover:bg-amber-100">Lihat Semua</button>
          </h3>
          <div className="space-y-3">
            {termuda.map((s, i) => (
              <div key={i} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                <div>
                  <p className="font-bold text-slate-800 text-sm">{s.original[2]}</p>
                  <p className="text-xs text-slate-500">{s.original[22]} • {s.original[23]}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-amber-600">{s.calculatedAge} Tahun</p>
                  <p className="text-[10px] text-slate-400">Lahir: {s.original[6] ? new Date(s.original[6]).toLocaleDateString('id-ID') : '-'}</p>
                </div>
              </div>
            ))}
            {termuda.length === 0 && <p className="text-sm text-slate-500 text-center py-4">Belum ada data</p>}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center justify-between">
            <span>5 Santri Tertua</span>
            <button onClick={() => setSelectedCategory({ title: "Berdasarkan Umur (Tertua)", data: [...sortedByAge].reverse().map(s => s.original) })} className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-md hover:bg-amber-100">Lihat Semua</button>
          </h3>
          <div className="space-y-3">
            {tertua.map((s, i) => (
              <div key={i} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                <div>
                  <p className="font-bold text-slate-800 text-sm">{s.original[2]}</p>
                  <p className="text-xs text-slate-500">{s.original[22]} • {s.original[23]}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-amber-600">{s.calculatedAge} Tahun</p>
                  <p className="text-[10px] text-slate-400">Lahir: {s.original[6] ? new Date(s.original[6]).toLocaleDateString('id-ID') : '-'}</p>
                </div>
              </div>
            ))}
            {tertua.length === 0 && <p className="text-sm text-slate-500 text-center py-4">Belum ada data</p>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center justify-between">
            <span>Santri Berdasarkan Kelas Formal</span>
            <button onClick={() => setSelectedCategory({ title: "Semua Berdasarkan Kelas Formal", data: santri })} className="text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md hover:bg-emerald-100">Lihat Daftar Lengkap</button>
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={kelasData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center justify-between">
            <span>Santri Berdasarkan Tingkat Pondok</span>
            <button onClick={() => setSelectedCategory({ title: "Semua Berdasarkan Tingkat Pondok", data: santri })} className="text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md hover:bg-emerald-100">Lihat Daftar Lengkap</button>
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tingkatData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center justify-between">
            <span>5 Santri Terlama Menetap (Lama Mondok)</span>
            <button onClick={() => setSelectedCategory({ title: "Berdasarkan Lama Menetap", data: sortedByDate })} className="text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md hover:bg-emerald-100">Lihat Semua</button>
          </h3>
          <div className="space-y-3">
            {terlama.map((s, i) => (
              <div key={i} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                <div>
                  <p className="font-bold text-slate-800 text-sm">{s[2]}</p>
                  <p className="text-xs text-slate-500">{s[22]} • {s[23]}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-emerald-600">{calculateLamaMenetap(s[28])}</p>
                  <p className="text-[10px] text-slate-400">Masuk: {s[28] ? new Date(s[28]).toLocaleDateString('id-ID') : '-'}</p>
                </div>
              </div>
            ))}
            {terlama.length === 0 && <p className="text-sm text-slate-500 text-center py-4">Belum ada data</p>}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center justify-between">
            <span>5 Santri Terbaru Masuk</span>
            <button onClick={() => setSelectedCategory({ title: "Santri Baru Masuk (Terbalik)", data: [...sortedByDate].reverse() })} className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-md hover:bg-blue-100">Lihat Semua</button>
          </h3>
          <div className="space-y-3">
            {terbaru.map((s, i) => (
              <div key={i} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                <div>
                  <p className="font-bold text-slate-800 text-sm">{s[2]}</p>
                  <p className="text-xs text-slate-500">{s[22]} • {s[23]}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-blue-600">{calculateLamaMenetap(s[28])}</p>
                  <p className="text-[10px] text-slate-400">Masuk: {s[28] ? new Date(s[28]).toLocaleDateString('id-ID') : '-'}</p>
                </div>
              </div>
            ))}
            {terbaru.length === 0 && <p className="text-sm text-slate-500 text-center py-4">Belum ada data</p>}
          </div>
        </div>
      </div>

      {/* List Modal */}
      <AnimatePresence>
        {selectedCategory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">Daftar {selectedCategory.title}</h3>
                  <p className="text-sm text-slate-500">Menampilkan {selectedCategory.data.length} santri</p>
                </div>
                <button onClick={() => setSelectedCategory(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>
              <div className="p-0 overflow-y-auto flex-1">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wider sticky top-0 z-10">
                    <tr>
                      <th className="px-6 py-4">Nama & NIK</th>
                      <th className="px-6 py-4">Kategori / Kelas</th>
                      <th className="px-6 py-4">Tingkat Pondok</th>
                      <th className="px-6 py-4">Masuk / Lama Menetap</th>
                      <th className="px-6 py-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedCategory.data.length === 0 ? (
                      <tr><td colSpan={5} className="p-8 text-center text-slate-500">Tidak ada data ditemukan.</td></tr>
                    ) : selectedCategory.data.map((s, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-3">
                          <p className="font-bold text-slate-800 text-sm">{s[2]}</p>
                          <p className="text-[10px] text-slate-500 font-mono">{s[3]}</p>
                        </td>
                        <td className="px-6 py-3">
                          <p className="text-sm text-slate-700">{s[22] || '-'}</p>
                          <p className="text-[10px] text-emerald-600 font-bold">{s[31] || 'Santri Biasa'}</p>
                        </td>
                        <td className="px-6 py-3">
                          <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-bold inline-block">
                            {s[23] || '-'}
                          </span>
                        </td>
                        <td className="px-6 py-3">
                          <p className="text-xs text-slate-700">{s[28] ? new Date(s[28]).toLocaleDateString('id-ID') : '-'}</p>
                          <p className="text-[10px] text-blue-600 font-bold">{calculateLamaMenetap(s[28])}</p>
                        </td>
                        <td className="px-6 py-3 text-center">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            s[26] === 'Aktif' || !s[26] ? 'bg-emerald-100 text-emerald-700' : 
                            s[26] === 'Alumni' ? 'bg-slate-100 text-slate-600' : 
                            'bg-red-100 text-red-700'
                          }`}>
                            {s[26] || 'Aktif'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const SantriList = ({ isAdmin, user }: { isAdmin: boolean, user?: any }) => {
  const [santri, setSantri] = useState<any[]>([]);
  const [pelanggaran, setPelanggaran] = useState<any[]>([]);
  const [tahfidz, setTahfidz] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSantri, setSelectedSantri] = useState<any | null>(null);
  const [editingSantri, setEditingSantri] = useState<any | null>(null);
  const [deletingSantri, setDeletingSantri] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'list' | 'stats'>('list');
  const [detailTab, setDetailTab] = useState<'data' | 'pelanggaran' | 'tahfidz'>('data');
  const [newPelanggaran, setNewPelanggaran] = useState({ tanggal: '', jenis: '', tindakan: '' });
  const [newTahfidz, setNewTahfidz] = useState({ tanggal: '', surah: '', keterangan: '' });
  const [savingRecord, setSavingRecord] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any | null>(null);

  const fetchSantri = async () => {
    setLoading(true);
    try {
      const [resSantri, resPelanggaran, resTahfidz] = await Promise.all([
        fetchWithCache('/api/data/Santri'),
        fetchWithCache('/api/data/Pelanggaran'),
        fetchWithCache('/api/data/Tahfidz')
      ]);
      setSantri(Array.isArray(resSantri.data) ? resSantri.data : []);
      setPelanggaran(Array.isArray(resPelanggaran.data) ? resPelanggaran.data : []);
      setTahfidz(Array.isArray(resTahfidz.data) ? resTahfidz.data : []);
    } catch (err) {
      console.error("Failed to fetch santri data:", err);
      if (santri.length === 0) {
          setSantri([]);
          setPelanggaran([]);
          setTahfidz([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSantri();
  }, []);

  const handleSavePelanggaran = async (e: any) => {
    e.preventDefault();
    if (!newPelanggaran.tanggal || !newPelanggaran.jenis) return;
    setSavingRecord(true);
    try {
      if (editingRecord) {
        const updatedRow = [
          editingRecord[0],
          selectedSantri[0],
          selectedSantri[2],
          newPelanggaran.tanggal,
          newPelanggaran.jenis,
          newPelanggaran.tindakan,
          user?.username || editingRecord[6]
        ];
        await postWithOfflineQueue('/api/data/Pelanggaran/update', { id: editingRecord[0], data: updatedRow });
        setEditingRecord(null);
      } else {
        const rowData = [
          new Date().toISOString(),
          selectedSantri[0],
          selectedSantri[2],
          newPelanggaran.tanggal,
          newPelanggaran.jenis,
          newPelanggaran.tindakan,
          user?.username || 'Admin'
        ];
        await postWithOfflineQueue('/api/data/Pelanggaran/add', { data: rowData });
      }
      setNewPelanggaran({ tanggal: '', jenis: '', tindakan: '' });
      await fetchSantri();
    } catch (err) {
      alert('Gagal menyimpan record pelanggaran.');
    } finally {
      setSavingRecord(false);
    }
  };

  const handleSaveTahfidz = async (e: any) => {
    e.preventDefault();
    if (!newTahfidz.tanggal || !newTahfidz.surah) return;
    setSavingRecord(true);
    try {
      if (editingRecord) {
        const updatedRow = [
          editingRecord[0],
          selectedSantri[0],
          selectedSantri[2],
          newTahfidz.tanggal,
          newTahfidz.surah,
          newTahfidz.keterangan,
          user?.username || editingRecord[6]
        ];
        await postWithOfflineQueue('/api/data/Tahfidz/update', { id: editingRecord[0], data: updatedRow });
        setEditingRecord(null);
      } else {
        const rowData = [
          new Date().toISOString(),
          selectedSantri[0],
          selectedSantri[2],
          newTahfidz.tanggal,
          newTahfidz.surah,
          newTahfidz.keterangan,
          user?.username || 'Admin'
        ];
        await postWithOfflineQueue('/api/data/Tahfidz/add', { data: rowData });
      }
      setNewTahfidz({ tanggal: '', surah: '', keterangan: '' });
      await fetchSantri();
    } catch (err) {
      alert('Gagal menyimpan record tahfidz.');
    } finally {
      setSavingRecord(false);
    }
  };

  const handleDeleteRecord = async (sheetName: string, id: string) => {
    if (!window.confirm('Hapus catatan ini?')) return;
    setLoading(true);
    try {
      await postWithOfflineQueue(`/api/data/${sheetName}/delete`, { id, adminName: user?.username || 'System' });
      await fetchSantri();
    } catch (err) {
      console.error("Delete record error:", err);
      alert('Gagal menghapus catatan.');
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingSantri) return;
    setLoading(true);
    try {
      console.log("Deleting santri with ID:", deletingSantri[0]);
      await postWithOfflineQueue('/api/data/Santri/delete', { id: deletingSantri[0], adminName: user?.username || 'System' });
      setDeletingSantri(null);
      await fetchSantri();
    } catch (err: any) {
      console.error("Failed to delete santri:", err);
      // We can use a local alert state here if needed, but for now let's just log
    } finally {
      setLoading(false);
    }
  };

  const filteredSantri = santri.filter(s => 
    s[2]?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s[3]?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const exportSantriPdf = () => {
    try {
      const doc = new jsPDF('landscape');
      
      // Kop Surat
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('PONDOK PESANTREN SALAFIYAH QOUMIYAH', doc.internal.pageSize.width / 2, 15, { align: 'center' });
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Laporan Data Kependudukan Santri', doc.internal.pageSize.width / 2, 22, { align: 'center' });
      doc.text(`Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}`, doc.internal.pageSize.width / 2, 28, { align: 'center' });
      
      doc.setLineWidth(0.5);
      doc.line(14, 32, doc.internal.pageSize.width - 14, 32);

      const tableData = filteredSantri.map((s, index) => [
        index + 1,
        s[2] || '-', // Nama
        s[3] || '-', // NIK
        s[4] || '-', // L/P
        s[22] || '-', // Kelas Formal
        s[23] || '-', // Tingkat Pondok
        s[31] || 'S. Biasa', // Kategori Santri
        s[28] ? new Date(s[28]).toLocaleDateString('id-ID') : '-' // Pendaftaran
      ]);

      (doc as any).autoTable({
        startY: 38,
        head: [['No', 'Nama Lengkap', 'NIK', 'L/P', 'Kelas Formal', 'Tingkat Pondok', 'Kategori', 'Tgl Masuk']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [5, 150, 105], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 8 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { top: 38 }
      });

      doc.save(`Data_Santri_PPSQ_${new Date().getTime()}.pdf`);
    } catch (err) {
      console.error("Failed to generate PDF:", err);
      alert("Gagal mencetak dokumen PDF.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-4 border-b border-slate-200 pb-4">
        <button 
          onClick={() => setActiveTab('list')}
          className={`px-6 py-2 rounded-xl font-bold transition-all ${activeTab === 'list' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-100'}`}
        >
          Daftar Santri
        </button>
        <button 
          onClick={() => setActiveTab('stats')}
          className={`px-6 py-2 rounded-xl font-bold transition-all ${activeTab === 'stats' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-100'}`}
        >
          Statistik & Informasi
        </button>
      </div>

      {activeTab === 'stats' ? (
        <SantriStats santri={santri} />
      ) : (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row gap-4 justify-between items-center">
            <h2 className="text-xl font-bold text-slate-800">Data Santri PPSQ</h2>
            <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
              <div className="relative w-full md:w-auto">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Cari nama atau NIK..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none w-full md:w-64" 
                />
              </div>
              <button 
                onClick={exportSantriPdf}
                className="px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-sm rounded-xl flex items-center justify-center gap-2 border border-emerald-100 transition-all"
              >
                <FileText className="w-4 h-4" /> Cetak PDF
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">Nama</th>
              <th className="px-6 py-4">Kelas Formal</th>
              <th className="px-6 py-4">Tingkat Pondok</th>
              <th className="px-6 py-4">Lama Menetap</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400">Memuat data...</td></tr>
            ) : filteredSantri.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400">Belum ada data santri.</td></tr>
            ) : filteredSantri.map((s, i) => (
              <tr key={i} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-medium text-slate-800">{s[2]}</td>
                <td className="px-6 py-4 text-slate-600">{s[22]}</td>
                <td className="px-6 py-4 text-slate-600">{s[23]}</td>
                <td className="px-6 py-4 text-slate-600 text-xs">
                  {calculateLamaMenetap(s[28])}
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full uppercase">{s[26] || 'Aktif'}</span>
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button 
                    onClick={() => setSelectedSantri(s)}
                    className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg"
                    title="Lihat Detail"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  {isAdmin && (
                    <>
                      <button 
                        onClick={() => setEditingSantri(s)}
                        className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"
                        title="Edit Data"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setDeletingSantri(s)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                        title="Hapus Data"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deletingSantri && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl"
            >
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Hapus Data Santri?</h3>
              <p className="text-slate-500 text-sm mb-6">
                Apakah Anda yakin ingin menghapus data <strong>{deletingSantri[2]}</strong>? Tindakan ini tidak dapat dibatalkan.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setDeletingSantri(null)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all"
                >
                  Batal
                </button>
                <button 
                  onClick={confirmDelete}
                  disabled={loading}
                  className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-lg shadow-red-100 transition-all disabled:opacity-50"
                >
                  {loading ? 'Menghapus...' : 'Ya, Hapus'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingSantri && (
          <EditSantriModal 
            santri={editingSantri} 
            allSantri={santri}
            onClose={() => setEditingSantri(null)} 
            onUpdate={fetchSantri} 
            user={user}
          />
        )}
      </AnimatePresence>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedSantri && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-emerald-600 text-white">
                <div>
                  <h3 className="text-xl font-bold">Detail Santri</h3>
                  <p className="text-emerald-100 text-xs">Informasi lengkap data kependudukan & akademik</p>
                </div>
                <button onClick={() => setSelectedSantri(null)} className="p-2 hover:bg-emerald-700 rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="bg-slate-50 border-b border-slate-200 flex px-8 pt-4 gap-6">
                <button onClick={() => setDetailTab('data')} className={`pb-3 text-sm font-bold border-b-4 transition-colors ${detailTab === 'data' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>Data Diri & Akademik</button>
                <button onClick={() => setDetailTab('pelanggaran')} className={`pb-3 text-sm font-bold border-b-4 transition-colors flex items-center gap-2 ${detailTab === 'pelanggaran' ? 'border-red-600 text-red-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
                  Catatan Pelanggaran
                  {pelanggaran.filter(p => p[1] === selectedSantri[0]).length > 0 && (
                    <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-[10px]">{pelanggaran.filter(p => p[1] === selectedSantri[0]).length}</span>
                  )}
                </button>
                <button onClick={() => setDetailTab('tahfidz')} className={`pb-3 text-sm font-bold border-b-4 transition-colors flex items-center gap-2 ${detailTab === 'tahfidz' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
                  Catatan Hafalan
                  {tahfidz.filter(t => t[1] === selectedSantri[0]).length > 0 && (
                    <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-[10px]">{tahfidz.filter(t => t[1] === selectedSantri[0]).length}</span>
                  )}
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-8 bg-white min-h-[400px]">
                {detailTab === 'data' && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Foto Section */}
                  <div className="space-y-6">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-widest">Foto Wajah</label>
                      <div className="aspect-[3/4] bg-slate-100 rounded-2xl overflow-hidden border-2 border-slate-50 shadow-inner">
                        {selectedSantri[25] ? (
                          <img src={formatImageUrl(selectedSantri[25])} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300">
                            <ImageIcon className="w-12 h-12" />
                          </div>
                        )}
                      </div>
                      {selectedSantri[25] && (
                        <a 
                          href={formatImageUrl(selectedSantri[25])} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="mt-2 flex items-center justify-center gap-2 text-xs font-bold text-emerald-600 hover:underline"
                        >
                          <ExternalLink className="w-3 h-3" /> Lihat Ukuran Penuh
                        </a>
                      )}
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-widest">Scan Kartu Keluarga</label>
                      <div className="aspect-video bg-slate-100 rounded-2xl overflow-hidden border-2 border-slate-50 shadow-inner">
                        {selectedSantri[24] ? (
                          <img src={formatImageUrl(selectedSantri[24])} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300">
                            <ImageIcon className="w-12 h-12" />
                          </div>
                        )}
                      </div>
                      {selectedSantri[24] && (
                        <a 
                          href={formatImageUrl(selectedSantri[24])} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="mt-2 flex items-center justify-center gap-2 text-xs font-bold text-emerald-600 hover:underline"
                        >
                          <ExternalLink className="w-3 h-3" /> Lihat Ukuran Penuh
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Data Section */}
                  <div className="md:col-span-2 space-y-8">
                    <section>
                      <h4 className="text-xs font-bold text-emerald-600 uppercase tracking-widest border-b border-emerald-50 pb-2 mb-4">Informasi Pribadi</h4>
                      <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                        <DetailItem label="Nama Lengkap" value={selectedSantri[2]} />
                        <DetailItem label="NIK" value={selectedSantri[3]} />
                        <DetailItem label="No. KK" value={selectedSantri[1]} />
                        <DetailItem label="Jenis Kelamin" value={selectedSantri[4]} />
                        <DetailItem label="Tempat, Tgl Lahir" value={`${selectedSantri[5]}, ${selectedSantri[6]}`} />
                        <DetailItem label="Agama" value={selectedSantri[7]} />
                        <DetailItem label="Pendidikan" value={selectedSantri[8]} />
                        <DetailItem label="Pekerjaan" value={selectedSantri[9]} />
                        <DetailItem label="Status Kawin" value={selectedSantri[10]} />
                        <DetailItem label="Hubungan Keluarga" value={selectedSantri[11]} />
                      </div>
                    </section>

                    <section>
                      <h4 className="text-xs font-bold text-emerald-600 uppercase tracking-widest border-b border-emerald-50 pb-2 mb-4">Orang Tua & Alamat</h4>
                      <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                        <DetailItem label="Nama Ayah" value={selectedSantri[13]} />
                        <DetailItem label="Nama Ibu" value={selectedSantri[14]} />
                        <DetailItem label="Alamat" value={`${selectedSantri[15]} RT ${selectedSantri[16]} RW ${selectedSantri[17]}`} />
                        <DetailItem label="Desa/Kec" value={`${selectedSantri[18]} / ${selectedSantri[19]}`} />
                        <DetailItem label="Kab/Prov" value={`${selectedSantri[20]} / ${selectedSantri[21]}`} />
                      </div>
                    </section>

                    <section>
                      <h4 className="text-xs font-bold text-emerald-600 uppercase tracking-widest border-b border-emerald-50 pb-2 mb-4">Akademik Pondok</h4>
                      <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                        <DetailItem label="Kelas Formal" value={selectedSantri[22]} />
                        <DetailItem label="Tingkat Pondok" value={selectedSantri[23]} />
                        <DetailItem label="Kategori Santri" value={selectedSantri[31] || 'Santri Biasa'} />
                        <DetailItem label="No. HP / WA" value={selectedSantri[27]} />
                        <DetailItem label="Status" value={selectedSantri[26] || 'Aktif'} />
                        <DetailItem 
                          label="Tgl Daftar" 
                          value={selectedSantri[28] ? new Date(selectedSantri[28]).toLocaleDateString('id-ID') : "-"} 
                        />
                        <DetailItem 
                          label="Lama Menetap" 
                          value={calculateLamaMenetap(selectedSantri[28])} 
                        />
                      </div>
                    </section>
                  </div>
                 </div>
                )}

                {detailTab === 'pelanggaran' && (
                  <div className="space-y-6">
                    {isAdmin && (
                      <div className="bg-red-50 p-6 rounded-2xl border border-red-100">
                        <div className="flex justify-between items-center mb-4">
                          <h4 className="text-sm font-bold text-red-800">{editingRecord ? 'Edit Catatan Pelanggaran' : 'Tambah Catatan Pelanggaran Baru'}</h4>
                          {editingRecord && (
                            <button 
                              onClick={() => {
                                setEditingRecord(null);
                                setNewPelanggaran({ tanggal: '', jenis: '', tindakan: '' });
                              }}
                              className="text-xs font-bold text-red-600 hover:underline"
                            >
                              Batal Edit
                            </button>
                          )}
                        </div>
                        <form onSubmit={handleSavePelanggaran} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <label className="block text-[10px] font-bold text-red-600 uppercase mb-1">Tanggal</label>
                            <input type="date" required value={newPelanggaran.tanggal} onChange={e => setNewPelanggaran({...newPelanggaran, tanggal: e.target.value})} className="w-full px-3 py-2 rounded-xl text-sm border-none focus:ring-2 focus:ring-red-500" />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-[10px] font-bold text-red-600 uppercase mb-1">Jenis Pelanggaran</label>
                            <input type="text" placeholder="Cth: Keluar pondok tanpa izin" required value={newPelanggaran.jenis} onChange={e => setNewPelanggaran({...newPelanggaran, jenis: e.target.value})} className="w-full px-3 py-2 rounded-xl text-sm border-none focus:ring-2 focus:ring-red-500" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-red-600 uppercase mb-1">Tindakan / Ta'zir</label>
                            <input type="text" placeholder="Cth: Mengabdi 3 hari" required value={newPelanggaran.tindakan} onChange={e => setNewPelanggaran({...newPelanggaran, tindakan: e.target.value})} className="w-full px-3 py-2 rounded-xl text-sm border-none focus:ring-2 focus:ring-red-500" />
                          </div>
                          <div className="md:col-span-4 flex justify-end mt-2">
                            <button disabled={savingRecord} type="submit" className="px-6 py-2 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-colors disabled:opacity-50">
                              {savingRecord ? 'Menyimpan...' : editingRecord ? 'Simpan Perubahan' : 'Simpan Catatan'}
                            </button>
                          </div>
                        </form>
                      </div>
                    )}

                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                          <tr>
                            <th className="px-4 py-3">Tanggal</th>
                            <th className="px-4 py-3">Jenis Pelanggaran</th>
                            <th className="px-4 py-3">Tindakan / Ta'zir</th>
                            <th className="px-4 py-3">Pencatat</th>
                            {isAdmin && <th className="px-4 py-3 text-right">Aksi</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {pelanggaran.filter(p => p[1] === selectedSantri[0]).length === 0 ? (
                            <tr><td colSpan={isAdmin ? 5 : 4} className="px-4 py-8 text-center text-slate-400 text-sm">Belum ada catatan pelanggaran.</td></tr>
                          ) : (
                            pelanggaran.filter(p => p[1] === selectedSantri[0]).sort((a,b) => new Date(b[3]).getTime() - new Date(a[3]).getTime()).map((p, i) => (
                              <tr key={i} className="hover:bg-slate-50">
                                <td className="px-4 py-3 text-sm font-medium text-slate-800">{new Date(p[3]).toLocaleDateString('id-ID')}</td>
                                <td className="px-4 py-3 text-sm text-red-600 font-bold">{p[4]}</td>
                                <td className="px-4 py-3 text-sm text-slate-600">{p[5]}</td>
                                <td className="px-4 py-3 text-xs text-slate-400">{p[6]}</td>
                                {isAdmin && (
                                  <td className="px-4 py-3 text-right space-x-2">
                                    <button 
                                      onClick={() => {
                                        setEditingRecord(p);
                                        setNewPelanggaran({
                                          tanggal: p[3],
                                          jenis: p[4],
                                          tindakan: p[5]
                                        });
                                      }}
                                      className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg"
                                      title="Edit"
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                    </button>
                                    <button 
                                      onClick={() => handleDeleteRecord('Pelanggaran', p[0])}
                                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                                      title="Hapus"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                )}
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {detailTab === 'tahfidz' && (
                  <div className="space-y-6">
                    {isAdmin && (
                      <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
                        <div className="flex justify-between items-center mb-4">
                          <h4 className="text-sm font-bold text-blue-800">{editingRecord ? 'Edit Catatan Hafalan' : 'Tambah Capaian Hafalan (Tahfidz)'}</h4>
                          {editingRecord && (
                            <button 
                              onClick={() => {
                                setEditingRecord(null);
                                setNewTahfidz({ tanggal: '', surah: '', keterangan: '' });
                              }}
                              className="text-xs font-bold text-blue-600 hover:underline"
                            >
                              Batal Edit
                            </button>
                          )}
                        </div>
                        <form onSubmit={handleSaveTahfidz} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <label className="block text-[10px] font-bold text-blue-600 uppercase mb-1">Tanggal</label>
                            <input type="date" required value={newTahfidz.tanggal} onChange={e => setNewTahfidz({...newTahfidz, tanggal: e.target.value})} className="w-full px-3 py-2 rounded-xl text-sm border-none focus:ring-2 focus:ring-blue-500" />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-[10px] font-bold text-blue-600 uppercase mb-1">Surah / Juz</label>
                            <input type="text" placeholder="Cth: Juz 30 / Al-Mulk" required value={newTahfidz.surah} onChange={e => setNewTahfidz({...newTahfidz, surah: e.target.value})} className="w-full px-3 py-2 rounded-xl text-sm border-none focus:ring-2 focus:ring-blue-500" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-blue-600 uppercase mb-1">Nilai / Predikat</label>
                            <input type="text" placeholder="Cth: Mumtaz / Lancar" required value={newTahfidz.keterangan} onChange={e => setNewTahfidz({...newTahfidz, keterangan: e.target.value})} className="w-full px-3 py-2 rounded-xl text-sm border-none focus:ring-2 focus:ring-blue-500" />
                          </div>
                          <div className="md:col-span-4 flex justify-end mt-2">
                            <button disabled={savingRecord} type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-50">
                              {savingRecord ? 'Menyimpan...' : editingRecord ? 'Simpan Perubahan' : 'Simpan Hafalan'}
                            </button>
                          </div>
                        </form>
                      </div>
                    )}

                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                          <tr>
                            <th className="px-4 py-3">Tanggal</th>
                            <th className="px-4 py-3">Surah / Juz</th>
                            <th className="px-4 py-3">Nilai / Predikat</th>
                            <th className="px-4 py-3">Penyimak / Ustadz</th>
                            {isAdmin && <th className="px-4 py-3 text-right">Aksi</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {tahfidz.filter(t => t[1] === selectedSantri[0]).length === 0 ? (
                            <tr><td colSpan={isAdmin ? 5 : 4} className="px-4 py-8 text-center text-slate-400 text-sm">Belum ada catatan hafalan.</td></tr>
                          ) : (
                            tahfidz.filter(t => t[1] === selectedSantri[0]).sort((a,b) => new Date(b[3]).getTime() - new Date(a[3]).getTime()).map((t, i) => (
                              <tr key={i} className="hover:bg-slate-50">
                                <td className="px-4 py-3 text-sm font-medium text-slate-800">{new Date(t[3]).toLocaleDateString('id-ID')}</td>
                                <td className="px-4 py-3 text-sm text-blue-600 font-bold">{t[4]}</td>
                                <td className="px-4 py-3 text-sm text-emerald-600 font-bold">{t[5]}</td>
                                <td className="px-4 py-3 text-xs text-slate-400">{t[6]}</td>
                                {isAdmin && (
                                  <td className="px-4 py-3 text-right space-x-2">
                                    <button 
                                      onClick={() => {
                                        setEditingRecord(t);
                                        setNewTahfidz({
                                          tanggal: t[3],
                                          surah: t[4],
                                          keterangan: t[5]
                                        });
                                      }}
                                      className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg"
                                      title="Edit"
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                    </button>
                                    <button 
                                      onClick={() => handleDeleteRecord('Tahfidz', t[0])}
                                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                                      title="Hapus"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                )}
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end">
                <button 
                  onClick={() => setSelectedSantri(null)}
                  className="px-8 py-2 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700 transition-all"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      </div>
      )}
    </div>
  );
};

const formatImageUrl = (url: string) => {
  if (!url) return "";
  // If it's already a relative path starting with /uploads, return as is
  if (url.startsWith('/uploads/')) return url;
  // If it's an absolute URL from this app, convert to relative
  if (url.includes('/uploads/')) {
    const parts = url.split('/uploads/');
    return '/uploads/' + parts[1];
  }
  // Fallback for other URLs
  return url;
};

const DetailItem = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
    <p className="text-sm font-bold text-slate-700">{value || '-'}</p>
  </div>
);

const ManajemenTarif = ({ user }: { user: any }) => {
  const [tarifs, setTarifs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [showKenaikanModal, setShowKenaikanModal] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [santriCount, setSantriCount] = useState(0);

  const fetchTarif = async () => {
    setLoading(true);
    try {
      const [resTarif, resSantri] = await Promise.all([
        fetchWithCache('/api/data/master_tarif'),
        fetchWithCache('/api/data/Santri')
      ]);
      
      if (Array.isArray(resTarif.data)) {
        setTarifs(resTarif.data);
      }
      
      if (Array.isArray(resSantri.data)) {
        // Count santri who can be promoted (not LULUS_FORMAL)
        const canPromote = resSantri.data.filter(s => {
          const grade = (s[22] || '').toUpperCase().trim();
          return grade && grade !== 'LULUS_FORMAL';
        }).length;
        setSantriCount(canPromote);
      }
    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTarif();
  }, []);

  const handleEdit = (tarif: any) => {
    setEditingId(tarif[0]);
    setEditValue(tarif[2]);
  };

  const handleSave = async (tarif: any) => {
    setSaving(true);
    try {
      // Data structure for update: [kategori_id, nama_jenjang, nominal, keterangan]
      const updatedRow = [tarif[0], tarif[1], editValue, tarif[3]];
      await postWithOfflineQueue('/api/data/master_tarif/update', {
        id: tarif[0],
        data: updatedRow
      });
      
      // Log Activity to log_aktivitas
      await postWithOfflineQueue('/api/finance/add', {
        sheetName: 'log_aktivitas',
        data: [
          new Date().toLocaleString('id-ID'),
          user?.username || 'Admin',
          'Update Tarif',
          `Mengubah tarif ${tarif[1]} menjadi Rp ${parseInt(editValue).toLocaleString('id-ID')}`
        ]
      }).catch(() => {}); // Ignore log errors

      setAlert({ message: 'Tarif berhasil diperbarui!', type: 'success' });
      setEditingId(null);
      fetchTarif();
    } catch (err) {
      console.error("Failed to save tarif:", err);
      setAlert({ message: 'Gagal menyimpan tarif.', type: 'error' });
    } finally {
      setSaving(false);
      setTimeout(() => setAlert(null), 3000);
    }
  };

  const handleKenaikanKelas = async () => {
    // Validation: Check if any nominal is zero (except YATIM_BEASISWA, PENGURUS)
    const zeroTarifs = tarifs.filter(t => 
      t[0] !== 'YATIM_BEASISWA' && 
      t[0] !== 'PENGURUS' && 
      (parseInt(t[2] || '0') === 0)
    );

    if (zeroTarifs.length > 0) {
      setAlert({ 
        message: `Gagal: Tarif untuk ${zeroTarifs.map(t => t[1]).join(', ')} masih Rp 0. Mohon lengkapi tarif terlebih dahulu.`, 
        type: 'error' 
      });
      setShowKenaikanModal(false);
      return;
    }

    setExecuting(true);
    try {
      const res = await postWithOfflineQueue('/api/kenaikan-kelas', { adminName: user?.username });
      setAlert({ message: `Berhasil menaikkan kelas untuk ${res.data.updatedCount} santri!`, type: 'success' });
      setShowKenaikanModal(false);
      fetchTarif(); // Refresh counts
    } catch (err) {
      console.error("Failed to execute kenaikan kelas:", err);
      setAlert({ message: 'Gagal mengeksekusi kenaikan kelas.', type: 'error' });
    } finally {
      setExecuting(false);
      setTimeout(() => setAlert(null), 5000);
    }
  };

  const renderTarifTable = (tarifList: any[], title: string, subtitle?: string) => (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden mb-6">
      <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-slate-800">{title}</h3>
          {subtitle && <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100">
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Kategori ID</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Nama Jenjang</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Nominal (Rp)</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Keterangan</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-400">Memuat data tarif...</td>
              </tr>
            ) : tarifList.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-400">Belum ada data tarif di kategori ini.</td>
              </tr>
            ) : tarifList.map((tarif, i) => (
              <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                    {tarif[0]}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm font-bold text-slate-800">{tarif[1]}</td>
                <td className="px-6 py-4">
                  {editingId === tarif[0] ? (
                    <input 
                      type="number" 
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="w-32 px-3 py-1.5 rounded-xl border-2 border-emerald-500 outline-none font-bold text-emerald-700"
                      autoFocus
                    />
                  ) : (
                    <span className="text-sm font-black text-emerald-600">
                      Rp {parseInt(tarif[2] || '0').toLocaleString('id-ID')}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-xs text-slate-500">{tarif[3]}</td>
                <td className="px-6 py-4">
                  <div className="flex justify-center gap-2">
                    {editingId === tarif[0] ? (
                      <>
                        <button 
                          onClick={() => handleSave(tarif)}
                          disabled={saving}
                          className="p-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 disabled:opacity-50"
                          title="Simpan"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => setEditingId(null)}
                          className="p-2 bg-slate-100 text-slate-400 rounded-xl hover:bg-slate-200 transition-all"
                          title="Batal"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <button 
                        onClick={() => handleEdit(tarif)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                        title="Edit Nominal"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Manajemen Tarif & Jenjang</h2>
          <p className="text-slate-500 text-sm">Atur nominal iuran bulanan (Syahriyah) berdasarkan jenjang pendidikan.</p>
        </div>
        <div className="bg-emerald-100 p-3 rounded-2xl">
          <Layers className="w-6 h-6 text-emerald-600" />
        </div>
      </div>

      {alert && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-2xl flex items-center gap-3 font-bold ${
            alert.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'
          }`}
        >
          {alert.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
          {alert.message}
        </motion.div>
      )}

      {renderTarifTable(tarifs.filter(t => !(t[0] || '').includes('NDALEM')), "Tarif Santri Biasa (Reguler)", "Tarif default yang dikenakan pada santri pondok pada umumnya.")}
      {renderTarifTable(tarifs.filter(t => (t[0] || '').includes('NDALEM')), "Tarif Santri Ndalem", "Tarif khusus yang dikenakan pada santri abdi dalem yang mengabdi.")}

      {/* Aturan Kenaikan Kelas Section */}
      <div className="bg-red-50/50 rounded-3xl p-8 border-2 border-red-100 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-xl">
            <h3 className="text-xl font-bold text-red-800 flex items-center gap-2 mb-2">
              <TrendingUp className="w-6 h-6" /> Aturan Kenaikan Kelas Massal
            </h3>
            <p className="text-red-700/70 text-sm leading-relaxed">
              Fitur ini akan menaikkan jenjang/kelas seluruh santri secara otomatis (misal: MI 1 ke MI 2). 
              Pastikan seluruh tarif di atas sudah benar sebelum melakukan eksekusi.
            </p>
          </div>
          <div className="flex flex-col items-center gap-3">
            <button 
              onClick={() => setShowKenaikanModal(true)}
              className="w-full md:w-auto px-8 py-4 bg-red-600 text-white font-bold rounded-2xl hover:bg-red-700 transition-all shadow-lg shadow-red-200 flex items-center justify-center gap-2"
            >
              <TrendingUp className="w-5 h-5" /> Eksekusi Kenaikan Kelas
            </button>
            <p className="text-[10px] text-red-500 font-bold text-center max-w-[200px]">
              PENTING: Disarankan untuk mendownload/copy Google Sheets sebagai cadangan sebelum melakukan proses kenaikan kelas massal.
            </p>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Kenaikan Kelas */}
      <AnimatePresence>
        {showKenaikanModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-100"
            >
              <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                <TrendingUp className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 text-center mb-2">Konfirmasi Kenaikan Kelas</h3>
              <p className="text-slate-500 text-center mb-6">
                Anda akan menaikkan kelas untuk <span className="font-bold text-red-600">{santriCount}</span> santri. 
                Tindakan ini akan mengubah data <span className="font-bold">Kelas Formal</span> secara massal.
              </p>
              
              <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 mb-8">
                <p className="text-xs text-amber-700 font-medium leading-relaxed">
                  <strong>Peringatan:</strong> Proses ini tidak dapat dibatalkan secara otomatis. Pastikan Anda telah memiliki cadangan data.
                </p>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setShowKenaikanModal(false)}
                  className="flex-1 px-6 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
                <button 
                  onClick={handleKenaikanKelas}
                  disabled={executing}
                  className="flex-1 px-6 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-200 disabled:opacity-50"
                >
                  {executing ? 'Memproses...' : 'Lanjutkan'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const SettingsManagement = ({ user }: { user: any }) => {
  const { subtab } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [settings, setSettings] = useState<any>({});
  const [localSettings, setLocalSettings] = useState<any>({});
  const [users, setUsers] = useState<any[]>([]);
  const [financeSettings, setFinanceSettings] = useState<any>({});
  const [localFinanceSettings, setLocalFinanceSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'users' | 'finance' | 'automation' | 'setup'>('general');

  useEffect(() => {
    if (subtab === 'profile' || subtab === 'general') setActiveTab('general');
    else if (subtab === 'automation') setActiveTab('automation');
    else if (subtab === 'users') setActiveTab('users');
    else if (subtab === 'setup') setActiveTab('setup');
    else if (subtab === 'finance') setActiveTab('finance');
  }, [subtab]);
  const [newUser, setNewUser] = useState({ name: '', username: '', password: '', role: 'user' });
  const [deletingUser, setDeletingUser] = useState<string | null>(null);
  const [alertInfo, setAlertInfo] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [spreadsheetUrl, setSpreadsheetUrl] = useState<string | null>(null);
  const [setupLoading, setSetupLoading] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);
  const [santris, setSantris] = useState<any[]>([]);
  const [showBillingConfirm, setShowBillingConfirm] = useState(false);
  const [billingFilter, setBillingFilter] = useState({ category: 'All', santriId: 'All' });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resSettings, resUsers, resFinance, resUrl, resSantri] = await Promise.all([
        fetchWithCache('/api/settings'),
        fetchWithCache('/api/data/Users'),
        fetchWithCache('/api/settings/finance'),
        fetchWithCache('/api/spreadsheet-url').catch(() => ({ data: { url: null } })),
        fetchWithCache('/api/data/Santri')
      ]);
      const settingsData = resSettings.data;
      setSettings(settingsData);
      setLocalSettings(settingsData);
      setUsers(resUsers.data || []);
      setFinanceSettings(resFinance.data || {});
      setLocalFinanceSettings(resFinance.data || {});
      setSpreadsheetUrl(resUrl.data?.url || null);
      setSantris(resSantri.data || []);
    } catch (err) {
      console.error("Failed to fetch settings/users/finance:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatNumber = (num: string | number) => {
    if (!num) return '';
    const clean = num.toString().replace(/\D/g, '');
    return clean ? parseInt(clean).toLocaleString('id-ID') : '';
  };

  const parseNumber = (str: string) => {
    return str.replace(/\D/g, '');
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      // Define the keys we want to save to ensure consistency
      const keysToSave = ['app_name', 'app_slogan', 'marquee_text', 'logo_url', 'monthly_syahriah_fee', 'production_url'];
      let changed = false;

      for (const key of keysToSave) {
        const newValue = localSettings[key] || '';
        const oldValue = settings[key] || '';

        if (newValue !== oldValue) {
          await postWithOfflineQueue('/api/settings/update', { key, value: newValue });
          changed = true;
        }
      }

      if (changed) {
        setSettings({ ...localSettings });
        setAlertInfo({ message: 'Pengaturan berhasil disimpan!', type: 'success' });
      } else {
        setAlertInfo({ message: 'Tidak ada perubahan untuk disimpan.', type: 'error' });
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || 'Gagal menyimpan pengaturan';
      setAlertInfo({ message: `Gagal menyimpan pengaturan: ${errorMsg}`, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const addUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await postWithOfflineQueue('/api/users/add', newUser);
      setAlertInfo({ message: 'User berhasil ditambahkan!', type: 'success' });
      setNewUser({ name: '', username: '', password: '', role: 'user' });
      fetchData();
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || 'Gagal menambahkan user';
      setAlertInfo({ message: `Gagal menambahkan user: ${errorMsg}`, type: 'error' });
    }
  };

  const deleteUser = async (username: string) => {
    setDeletingUser(null);
    try {
      await postWithOfflineQueue('/api/users/delete', { username });
      setAlertInfo({ message: 'User berhasil dihapus!', type: 'success' });
      fetchData();
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || 'Gagal menghapus user';
      setAlertInfo({ message: `Gagal menghapus user: ${errorMsg}`, type: 'error' });
    }
  };

  const saveFinanceSettings = async () => {
    setSaving(true);
    try {
      const keysToSave = [
        'nominal_tabungan_ziarah', 
        'estimasi_biaya_ziarah', 
        'billing_day', 
        'billing_hour', 
        'billing_minute', 
        'billing_status'
      ];
      let changed = false;

      for (const key of keysToSave) {
        const newValue = localFinanceSettings[key] || '';
        const oldValue = financeSettings[key] || '';

        if (newValue !== oldValue) {
          await postWithOfflineQueue('/api/settings/finance/update', { key, value: newValue });
          changed = true;
        }
      }

      if (changed) {
        setFinanceSettings({ ...localFinanceSettings });
        setAlertInfo({ message: 'Konfigurasi berhasil disimpan!', type: 'success' });
      } else {
        setAlertInfo({ message: 'Tidak ada perubahan untuk disimpan.', type: 'error' });
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || 'Gagal menyimpan konfigurasi';
      setAlertInfo({ message: `Gagal menyimpan konfigurasi: ${errorMsg}`, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const triggerManualBilling = async () => {
    setBillingLoading(true);
    setShowBillingConfirm(false);
    try {
      const filter: any = {};
      if (billingFilter.category !== 'All') filter.category = billingFilter.category;
      if (billingFilter.santriId !== 'All') filter.santriId = billingFilter.santriId;

      const res = await axios.post('/api/admin/trigger-billing', { 
        adminName: user?.name || 'Admin',
        filter 
      });
      if (res.data.success) {
        setAlertInfo({ message: `Berhasil! ${res.data.totalSent} notifikasi telah dikirim.`, type: 'success' });
      } else {
        setAlertInfo({ message: res.data.message || "Gagal mengirim notifikasi.", type: 'error' });
      }
    } catch (err: any) {
      setAlertInfo({ message: "Kesalahan sistem: " + (err.response?.data?.error || err.message), type: 'error' });
    } finally {
      setBillingLoading(false);
    }
  };

  const billingFilterText = useMemo(() => {
    if (billingFilter.santriId !== 'All') {
      const s = santris.find(s => s[3] === billingFilter.santriId);
      return `untuk santri: ${s ? s[2] : billingFilter.santriId}`;
    }
    if (billingFilter.category !== 'All') return `untuk kategori: ${billingFilter.category}`;
    return "ke seluruh wali santri aktif";
  }, [billingFilter, santris]);

  const runSetup = async () => {
    setSetupLoading(true);
    try {
      await axios.post('/api/setup-database');
      setAlertInfo({ message: 'Database Setup Berhasil!', type: 'success' });
    } catch (err: any) {
      setAlertInfo({ message: `Gagal Setup: ${err.message}`, type: 'error' });
    } finally {
      setSetupLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-400">Memuat pengaturan...</div>;

  // Redirect to profile if on base /settings or /pengaturan path
  if (!subtab && (location.pathname === '/settings' || location.pathname === '/pengaturan')) {
    return <Navigate to="/settings/profile" replace />;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Dynamic Header */}
      <div className="flex items-center justify-between bg-white px-8 py-6 rounded-3xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-emerald-100 rounded-2xl">
            {activeTab === 'general' && <Globe className="w-6 h-6 text-emerald-600" />}
            {activeTab === 'automation' && <Zap className="w-6 h-6 text-emerald-600" />}
            {activeTab === 'users' && <Users className="w-6 h-6 text-emerald-600" />}
            {activeTab === 'setup' && <Database className="w-6 h-6 text-emerald-600" />}
            {activeTab === 'finance' && <Wallet className="w-6 h-6 text-emerald-600" />}
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">
              {activeTab === 'general' && 'Profil & Identitas'}
              {activeTab === 'automation' && 'Otomasi Tagihan'}
              {activeTab === 'users' && 'Manajemen Akses'}
              {activeTab === 'setup' && 'Setup Database'}
              {activeTab === 'finance' && 'Tarif & Keuangan'}
            </h1>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-400 mt-0.5">
              <span>Pengaturan</span>
              <ChevronRight className="w-3 h-3" />
              <span className="text-emerald-500">
                {activeTab === 'general' && 'Profil'}
                {activeTab === 'automation' && 'Otomasi'}
                {activeTab === 'users' && 'Akses'}
                {activeTab === 'setup' && 'Database'}
                {activeTab === 'finance' && 'Keuangan'}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="hidden md:block text-right">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Status Sistem</p>
            <p className="text-xs font-bold text-emerald-600 mt-1 flex items-center justify-end gap-1.5">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              Online & Terhubung
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-8">
        {/* Content Area */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {activeTab === 'general' ? (
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 space-y-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-800">Profil & Identitas</h2>
                      <p className="text-sm text-slate-500">Sesuaikan logo, nama, dan identitas visual aplikasi.</p>
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row items-center gap-8 py-4 px-6 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                    <Logo className="w-32 h-32" url={localSettings.logo_url} />
                    <div className="flex-1 space-y-4 w-full">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">URL Logo Pondok</label>
                        <input 
                          type="text" 
                          value={localSettings.logo_url || ''}
                          onChange={(e) => setLocalSettings({ ...localSettings, logo_url: e.target.value })}
                          placeholder="https://example.com/logo.png"
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <p className="text-[10px] text-slate-400 mt-2 italic">* Disarankan menggunakan gambar dengan latar transparan (PNG).</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Nama Pesantren / Lembaga</label>
                        <input 
                          type="text" 
                          value={localSettings.app_name || ''}
                          onChange={(e) => setLocalSettings({ ...localSettings, app_name: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">URL Domain Utama</label>
                        <input 
                          type="text" 
                          value={localSettings.production_url || ''}
                          onChange={(e) => setLocalSettings({ ...localSettings, production_url: e.target.value })}
                          placeholder="https://ppsq.vercel.app"
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Slogan Aplikasi</label>
                        <input 
                          type="text" 
                          value={localSettings.app_slogan || ''}
                          onChange={(e) => setLocalSettings({ ...localSettings, app_slogan: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Nominal Standar Syahriah</label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">Rp</span>
                          <input 
                            type="text" 
                            value={formatNumber(localSettings.monthly_syahriah_fee || '')}
                            onChange={(e) => setLocalSettings({ ...localSettings, monthly_syahriah_fee: parseNumber(e.target.value) })}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Pengumuman Berjalan (Marquee)</label>
                    <textarea 
                      value={localSettings.marquee_text || ''}
                      onChange={(e) => setLocalSettings({ ...localSettings, marquee_text: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-3 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Masukkan pengumuman penting di sini..."
                    />
                  </div>

                  <div className="pt-6 border-t border-slate-100 flex justify-end">
                    <button 
                      onClick={saveSettings}
                      disabled={saving}
                      className="bg-emerald-600 text-white px-8 py-3 rounded-2xl font-bold shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all disabled:opacity-50"
                    >
                      {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                    </button>
                  </div>
                </div>
              ) : activeTab === 'finance' ? (
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 space-y-8">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800">Tarif & Keuangan</h2>
                    <p className="text-sm text-slate-500">Atur parameter pemotongan otomatis Syahriyah untuk tabungan ziarah.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-4">
                      <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider text-center">Nominal Tabungan Ziarah</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">Rp</span>
                        <input 
                          type="text" 
                          value={formatNumber(localFinanceSettings.nominal_tabungan_ziarah || '')}
                          onChange={(e) => setLocalFinanceSettings({ ...localFinanceSettings, nominal_tabungan_ziarah: parseNumber(e.target.value) })}
                          className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-xl text-emerald-700 text-center"
                        />
                      </div>
                    </div>

                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-4">
                      <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider text-center">Estimasi Total Biaya Ziarah</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">Rp</span>
                        <input 
                          type="text" 
                          value={formatNumber(localFinanceSettings.estimasi_biaya_ziarah || '')}
                          onChange={(e) => setLocalFinanceSettings({ ...localFinanceSettings, estimasi_biaya_ziarah: parseNumber(e.target.value) })}
                          className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-xl text-slate-700 text-center"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-6 bg-blue-50/50 rounded-3xl border border-blue-100 flex gap-4">
                    <div className="p-3 bg-blue-100 rounded-2xl h-fit">
                      <Info className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-blue-800">Kalkulasi Waktu Target</h4>
                      <p className="text-sm text-blue-700/80 mt-1 leading-relaxed">
                        Dengan menabung <span className="font-bold">Rp {formatNumber(localFinanceSettings.nominal_tabungan_ziarah || '0')}</span> per bulan, santri akan melunasi biaya ziarah 
                        <span className="font-bold"> Rp {formatNumber(localFinanceSettings.estimasi_biaya_ziarah || '0')}</span> hanya dalam waktu 
                        <span className="px-2 py-0.5 bg-blue-200 text-blue-800 rounded-lg mx-1 font-bold">
                          {Math.ceil(parseInt(localFinanceSettings.estimasi_biaya_ziarah || '0') / (parseInt(localFinanceSettings.nominal_tabungan_ziarah || '1') || 1))} Bulan
                        </span>.
                      </p>
                    </div>
                  </div>

                  <div className="pt-6 flex justify-end">
                    <button 
                      onClick={saveFinanceSettings}
                      disabled={saving}
                      className="bg-emerald-600 text-white px-10 py-4 rounded-2xl font-bold shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      {saving ? 'Menyimpan...' : <><Save className="w-5 h-5" /> Simpan Konfigurasi</>}
                    </button>
                  </div>
                </div>
              ) : activeTab === 'automation' ? (
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 space-y-8">
                   <div>
                    <h2 className="text-2xl font-bold text-slate-800">Kirim Tagihan WA</h2>
                    <p className="text-sm text-slate-500">Kirim notifikasi tagihan syahriah bulanan ke wali santri secara manual.</p>
                  </div>

                  <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-3">Filter Kategori</label>
                        <select 
                          value={billingFilter.category}
                          onChange={(e) => setBillingFilter({...billingFilter, category: e.target.value, santriId: 'All'})}
                          className="w-full px-5 py-4 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 font-bold bg-white"
                        >
                          <option value="All">Semua Kategori</option>
                          <option value="Santri Biasa">Santri Biasa</option>
                          <option value="Santri Ndalem">Santri Ndalem</option>
                        </select>
                        <p className="mt-2 text-xs text-slate-500 italic">* Pilih kategori tertentu jika ingin mengirim per kelompok.</p>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-3">Pilih Spesifik Santri</label>
                        <select 
                          value={billingFilter.santriId}
                          onChange={(e) => setBillingFilter({...billingFilter, santriId: e.target.value, category: 'All'})}
                          className="w-full px-5 py-4 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 font-bold bg-white"
                        >
                          <option value="All">Kirim ke Banyak (Berdasarkan Kategori)</option>
                          {santris
                            .filter(s => s[26] === 'Aktif')
                            .sort((a, b) => a[2].localeCompare(b[2]))
                            .map(s => (
                              <option key={s[3]} value={s[3]}>{s[2]} ({s[3]})</option>
                            ))
                          }
                        </select>
                        <p className="mt-2 text-xs text-slate-500 italic">* Pilih santri tertentu untuk mengirim tagihan ke satu orang saja.</p>
                      </div>
                    </div>

                    <div className="p-5 bg-blue-50 rounded-2xl flex gap-4 text-blue-800 border border-blue-100">
                      <Info className="w-6 h-6 flex-shrink-0" />
                      <div className="space-y-1">
                        <p className="text-sm font-bold">Informasi Pengiriman</p>
                        <p className="text-xs leading-relaxed opacity-90">
                          Pesan akan berisi rincian tagihan bulan berjalan {MONTHS[new Date().getMonth()]} {new Date().getFullYear()}, saldo tunggakan (jika ada), dan total yang harus dibayar. Pastikan HP admin Fonnte aktif.
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-center pt-4">
                      <button 
                        onClick={() => setShowBillingConfirm(true)}
                        disabled={billingLoading}
                        className="w-full md:w-auto px-12 py-5 bg-emerald-600 text-white rounded-3xl font-bold shadow-2xl shadow-emerald-200 hover:bg-emerald-700 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                      >
                        {billingLoading ? (
                          <>
                            <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                            Sedang Memproses...
                          </>
                        ) : (
                          <>
                            <BellRing className="w-6 h-6" />
                            Kirim Tagihan Sekarang
                          </>
                        )}
                      </button>
                    </div>

                    {/* Manual Billing Confirm Modal */}
                    <AnimatePresence>
                      {showBillingConfirm && (
                        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                          <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-100"
                          >
                            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                              <BellRing className="w-8 h-8 text-blue-600" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 text-center mb-2">Konfirmasi Pengiriman</h3>
                            <p className="text-slate-500 text-center mb-8">
                              Kirim notifikasi tagihan syahriah <span className="font-bold text-blue-600">{billingFilterText}</span>? 
                              Pastikan data pembayaran sudah terupdate.
                            </p>
                            
                            <div className="flex gap-4">
                              <button 
                                onClick={() => setShowBillingConfirm(false)}
                                className="flex-1 px-6 py-4 rounded-2xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all"
                              >
                                Batal
                              </button>
                              <button 
                                onClick={triggerManualBilling}
                                className="flex-1 px-6 py-4 rounded-2xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
                              >
                                Ya, Kirim
                              </button>
                            </div>
                          </motion.div>
                        </div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              ) : activeTab === 'setup' ? (
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 space-y-8">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800">Setup Database</h2>
                    <p className="text-sm text-slate-500">Inisialisasi atau perbaiki struktur Google Sheets secara otomatis.</p>
                  </div>

                  <div className="p-8 bg-amber-50 rounded-3xl border border-amber-100 space-y-4">
                    <div className="flex gap-4">
                      <div className="p-3 bg-amber-100 rounded-2xl h-fit">
                        <AlertCircle className="w-6 h-6 text-amber-600" />
                      </div>
                      <div>
                        <h4 className="font-bold text-amber-800">Peringatan Penting</h4>
                        <p className="text-sm text-amber-700/80 mt-1 leading-relaxed">
                          Fitur ini akan menambahkan sheet baru yang diperlukan jika belum ada. Data yang sudah ada tidak akan dihapus, namun header kolom akan distandarisasi.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-8 bg-emerald-50 rounded-3xl border border-emerald-100 flex flex-col items-center text-center space-y-4">
                    <Database className="w-12 h-12 text-emerald-600 mb-2" />
                    <h3 className="text-xl font-bold text-emerald-900">Konfigurasi Lembar Kerja</h3>
                    <p className="text-sm text-emerald-700 max-w-md">Klik tombol di bawah untuk menyinkronkan struktur database Google Sheets Anda dengan sistem terbaru.</p>
                    
                    <button 
                      onClick={runSetup}
                      disabled={setupLoading}
                      className="mt-4 bg-emerald-600 text-white px-8 py-3 rounded-2xl font-bold shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      {setupLoading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          Memproses Setup...
                        </>
                      ) : (
                        <>
                          <Database className="w-5 h-5" />
                          Jalankan Inisialisasi Database
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                    <div className="flex items-center justify-between mb-8">
                      <div>
                        <h2 className="text-2xl font-bold text-slate-800">Manajemen Akses</h2>
                        <p className="text-sm text-slate-500">Kelola daftar pengguna dan hak akses aplikasi.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      <div className="lg:col-span-1 p-6 bg-slate-50 rounded-3xl border border-slate-100 h-fit">
                        <h3 className="text-md font-bold text-slate-800 mb-4">Tambah User Baru</h3>
                        <form onSubmit={addUser} className="space-y-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Nama Lengkap</label>
                            <input 
                              type="text" 
                              value={newUser.name}
                              onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Username</label>
                            <input 
                              type="text" 
                              value={newUser.username}
                              onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Password</label>
                            <input 
                              type="password" 
                              value={newUser.password}
                              onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Peran Akses</label>
                            <select 
                              value={newUser.role}
                              onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                            >
                              <option value="user">User (Hanya Lihat)</option>
                              <option value="admin">Admin (Input Data)</option>
                              <option value="superadmin">Superadmin (Pengaturan)</option>
                            </select>
                          </div>
                          <button className="w-full bg-emerald-600 text-white py-3 rounded-2xl font-bold shadow-lg shadow-emerald-100 mt-2">
                            Buat Akun
                          </button>
                        </form>
                      </div>

                      <div className="lg:col-span-2 space-y-4">
                        <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white">
                          <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-slate-100">
                              <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                <th className="px-6 py-4">Informasi User</th>
                                <th className="px-6 py-4">Role</th>
                                <th className="px-6 py-4 text-right">Aksi</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {users.map((u, i) => (
                                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="px-6 py-4">
                                    <div className="font-bold text-slate-700">{u[0]}</div>
                                    <div className="text-xs text-slate-400">@{u[1]}</div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${
                                      u[3] === 'superadmin' ? 'bg-purple-100 text-purple-700' : 
                                      u[3] === 'admin' ? 'bg-emerald-100 text-emerald-700' : 
                                      'bg-slate-100 text-slate-600'
                                    }`}>
                                      {u[3].toUpperCase()}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                    <button 
                                      onClick={() => {
                                        if (u[3] === 'superadmin') {
                                          setAlertInfo({ message: 'Akun Superadmin utama tidak dapat dihapus.', type: 'error' });
                                        } else {
                                          setDeletingUser(u[1]);
                                        }
                                      }}
                                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>

                  {spreadsheetUrl && (
                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6 overflow-hidden relative group">
                      <div className="absolute top-0 right-0 p-8 text-emerald-50 group-hover:scale-110 transition-transform">
                        <Database className="w-32 h-32" />
                      </div>
                      <div className="relative z-10 text-center md:text-left">
                        <h3 className="text-xl font-bold text-slate-800 mb-1">Basis Data (Google Sheets)</h3>
                        <p className="text-sm text-slate-500">Seluruh data tersimpan aman di akun Google Anda.</p>
                      </div>
                      <a 
                        href={spreadsheetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relative z-10 flex items-center gap-2 px-8 py-3 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 whitespace-nowrap"
                      >
                        <ExternalLink className="w-5 h-5" />
                        Akses Spreadsheet
                      </a>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Custom Modals for Settings */}
        <AnimatePresence>
          {deletingUser && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl"
              >
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Trash2 className="text-red-600 w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 text-center mb-2">Hapus User</h3>
                <p className="text-slate-500 text-center mb-8">Apakah Anda yakin ingin menghapus user <strong>{deletingUser}</strong>?</p>
                <div className="flex gap-4">
                  <button 
                    onClick={() => setDeletingUser(null)}
                    className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all"
                  >
                    Batal
                  </button>
                  <button 
                    onClick={() => deleteUser(deletingUser)}
                    className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-lg shadow-red-100 transition-all"
                  >
                    Ya, Hapus
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {alertInfo && (
            <div className="fixed bottom-8 right-8 z-50">
              <motion.div 
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 50, opacity: 0 }}
                className={`px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3 font-bold text-white ${alertInfo.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}
              >
                {alertInfo.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                {alertInfo.message}
                <button onClick={() => setAlertInfo(null)} className="ml-4 hover:opacity-70">
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// --- Daily Allowance Management (Titipan Harian / Uang Saku) ---

const DailyAllowanceManagement = ({ isAdmin, user }: { isAdmin: boolean, user?: any }) => {
  const location = useLocation();
  const [allowances, setAllowances] = useState<any[]>([]);
  const [santri, setSantri] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [santriSearch, setSantriSearch] = useState('');
  const [showSantriResults, setShowSantriResults] = useState(false);
  const [selectedSantri, setSelectedSantri] = useState<any>(null);
  const [alertInfo, setAlertInfo] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [showPrintModal, setShowPrintModal] = useState<{ transaction: any, santriName: string } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  
  const [formData, setFormData] = useState({
    jumlah: '',
    tipe: '' as 'Masuk' | 'Keluar' | '',
    keterangan: '',
    tanggal: new Date().toISOString().split('T')[0]
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [allowanceRes, santriRes] = await Promise.all([
        fetchWithCache('/api/data/Allowance'),
        fetchWithCache('/api/data/Santri')
      ]);
      const allowanceData = Array.isArray(allowanceRes.data) ? allowanceRes.data : [];
      const santriData = Array.isArray(santriRes.data) ? santriRes.data : [];
      setAllowances(allowanceData);
      setSantri(santriData);

      // Handle edit from navigation state
      if (location.state?.editRecord) {
        const record = location.state.editRecord;
        const s = santriData.find(st => st[3] === record[1]);
        if (s) {
          setSelectedSantri(s);
          setSantriSearch(s[2]);
          setIsEditing(true);
          setSelectedRecord(record);
          
          // record indices: [timestamp, santriId, jumlah, tipe, keterangan, admin]
          // or new structure: [timestamp, santriId, nama, ayah, kelas, jumlah, tipe, keterangan, admin]
          const isNew = record.length > 6;
          setFormData({
            jumlah: isNew ? record[5].toString() : record[2].toString(),
            tipe: (isNew ? record[6] : record[3]) as 'Masuk' | 'Keluar',
            keterangan: isNew ? record[7] : record[4],
            tanggal: record[0].split('T')[0]
          });
        }
      }
    } catch (err) {
      console.error("Failed to fetch allowance data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const calculateBalance = (santriId: string) => {
    return allowances
      .filter(a => a[1] === santriId)
      .reduce((acc, curr) => {
        // Handle both old and new structure
        const amount = curr.length > 6 ? parseIDR(curr[5]) : parseIDR(curr[2]);
        const tipe = curr.length > 6 ? curr[6] : curr[3];
        return tipe === 'Masuk' ? acc + amount : acc - amount;
      }, 0);
  };

  const getSantriHistory = (santriId: string) => {
    return allowances
      .filter(a => a[1] === santriId)
      .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSantri) return setAlertInfo({ message: 'Pilih santri terlebih dahulu', type: 'error' });
    if (!formData.jumlah || parseIDR(formData.jumlah) <= 0) return setAlertInfo({ message: 'Jumlah harus lebih dari 0', type: 'error' });
    setShowConfirmModal(true);
  };

  const executeSubmit = async () => {
    setShowConfirmModal(false);
    setSubmitting(true);
    try {
      const keterangan = formData.keterangan || (formData.tipe === 'Masuk' ? 'Titipan Masuk' : 'Pengambilan Uang Saku');
      
      if (isEditing && selectedRecord) {
        await postWithOfflineQueue('/api/data/Allowance/update', {
          id: selectedRecord[0],
          data: [
            selectedRecord[0],
            selectedSantri[3],
            selectedSantri[2],
            selectedSantri[13],
            selectedSantri[22],
            formData.jumlah,
            formData.tipe,
            keterangan,
            user?.username || 'System'
          ],
          adminName: user?.username || 'System'
        });
        setAlertInfo({ message: 'Data berhasil diperbarui!', type: 'success' });
        setIsEditing(false);
        setSelectedRecord(null);
      } else {
        const prevBalance = calculateBalance(selectedSantri[3]);
        const amount = parseIDR(formData.jumlah);
        const saldoSaatIni = formData.tipe === 'Masuk' ? prevBalance + amount : prevBalance - amount;

        const res = await postWithOfflineQueue('/api/allowance', {
          data: {
            santriId: selectedSantri[3],
            namaSantri: selectedSantri[2],
            namaAyah: selectedSantri[13],
            kelasFormal: selectedSantri[22],
            jumlah: formData.jumlah,
            tipe: formData.tipe,
            keterangan: keterangan,
            tanggal: formData.tanggal,
            adminName: user?.username || 'System',
            phone: selectedSantri[27], // No HP
            saldoSaatIni: saldoSaatIni // Adding current balance
          }
        });
        setAlertInfo({ message: res.data?.message || `Transaksi ${formData.tipe} berhasil!`, type: 'success' });
      }
      
      const newTransaction = [
        isEditing ? selectedRecord[0] : new Date().toISOString(),
        selectedSantri[3],
        selectedSantri[2],
        selectedSantri[13],
        selectedSantri[22],
        formData.jumlah,
        formData.tipe,
        keterangan,
        user?.username || 'System'
      ];

      if (!isEditing) setShowPrintModal({ transaction: newTransaction, santriName: selectedSantri[2] });
      setFormData({ ...formData, jumlah: '', keterangan: '', tipe: '' });
      fetchData();
    } catch (err: any) {
      setAlertInfo({ message: 'Gagal menyimpan: ' + (err.response?.data?.error || err.message), type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (record: any) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus transaksi ini?')) return;
    try {
      await postWithOfflineQueue('/api/data/Allowance/delete', { id: record[0], adminName: user?.username || 'System' });
      setAlertInfo({ message: 'Transaksi berhasil dihapus!', type: 'success' });
      fetchData();
    } catch (err) {
      setAlertInfo({ message: 'Gagal menghapus transaksi', type: 'error' });
    }
  };

  const filteredSantri = santri.filter(s => 
    s[2]?.toLowerCase().includes(santriSearch.toLowerCase()) || 
    s[3]?.toLowerCase().includes(santriSearch.toLowerCase()) ||
    s[13]?.toLowerCase().includes(santriSearch.toLowerCase())
  ).slice(0, 10);

  const formatIDR = (val: string | number) => {
    const num = typeof val === 'string' ? parseInt(val.replace(/\D/g, '')) || 0 : val;
    return num.toLocaleString('id-ID');
  };

  return (
    <div className="space-y-6">
      {/* Sub Menu Tabs (Shared with Finance) */}
      <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-slate-100 max-w-3xl mx-auto">
        {[
          { id: 'bulanan', name: 'Syahriyah Bulanan', icon: Calendar, path: '/syahriah/bulanan' },
          { id: 'harian', name: 'Titipan Harian', icon: Clock, path: '/syahriah/harian' },
          { id: 'riwayat', name: 'Riwayat & Cetak', icon: History, path: '/syahriah/riwayat' },
          { id: 'laporan', name: 'Laporan Keuangan', icon: Wallet, path: '/syahriah/laporan' }
        ].filter(tab => isAdmin || (tab.id !== 'bulanan' && tab.id !== 'harian')).map((tab) => (
          <Link
            key={tab.id}
            to={tab.path}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all ${
              tab.id === 'harian' 
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100' 
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.name}</span>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Form & Selection */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Clock className="text-amber-600" /> Kelola Uang Saku
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Cari Santri</label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text"
                    placeholder="Nama santri..."
                    value={santriSearch}
                    onChange={(e) => {
                      setSantriSearch(e.target.value);
                      setShowSantriResults(true);
                    }}
                    onFocus={() => setShowSantriResults(true)}
                    onBlur={() => setTimeout(() => setShowSantriResults(false), 200)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-sm"
                  />
                </div>
                
                {showSantriResults && santriSearch.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                    {filteredSantri.map((s) => (
                      <button
                        key={s[3]}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setSelectedSantri(s);
                          setSantriSearch(s[2]);
                          setShowSantriResults(false);
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-0 flex flex-col"
                      >
                        <span className="font-bold text-slate-800 text-sm">{s[2]}</span>
                        <span className="text-[10px] text-slate-500">Ayah: {s[13]} | Kelas: {s[22]}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedSantri && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-xs font-bold text-emerald-800">{selectedSantri[2]}</p>
                      <p className="text-[10px] text-emerald-600">ID: {selectedSantri[3]}</p>
                    </div>
                    <button onClick={() => setSelectedSantri(null)} className="text-emerald-400 hover:text-emerald-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="pt-2 border-t border-emerald-100">
                    <p className="text-[10px] text-emerald-600 uppercase font-bold tracking-wider">Saldo Saat Ini</p>
                    <p className="text-xl font-black text-emerald-700">Rp {formatIDR(calculateBalance(selectedSantri[3]))}</p>
                  </div>
                </motion.div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, tipe: 'Masuk' })}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                    formData.tipe === 'Masuk' 
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-100' 
                      : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-500'
                  }`}
                >
                  <TrendingUp className="w-3 h-3 inline mr-1" /> Masuk
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, tipe: 'Keluar' })}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                    formData.tipe === 'Keluar' 
                      ? 'bg-red-600 text-white border-red-600 shadow-lg shadow-red-100' 
                      : 'bg-white text-slate-600 border-slate-200 hover:border-red-500'
                  }`}
                >
                  <TrendingDown className="w-3 h-3 inline mr-1" /> Keluar
                </button>
              </div>

              {formData.tipe && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-4 overflow-hidden"
                >
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Jumlah (Rp)</label>
                    <input 
                      type="text"
                      value={formatIDR(formData.jumlah)}
                      onChange={(e) => setFormData({ ...formData, jumlah: e.target.value.replace(/\D/g, '') })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-slate-700"
                      placeholder="0"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Keterangan</label>
                    <input 
                      type="text"
                      value={formData.keterangan}
                      onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                      placeholder="Contoh: Uang saku mingguan"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || !selectedSantri}
                    className={`w-full py-3 rounded-xl font-bold text-white shadow-lg transition-all disabled:opacity-50 ${
                      formData.tipe === 'Masuk' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100' : 'bg-red-600 hover:bg-red-700 shadow-red-100'
                    }`}
                  >
                    {submitting ? 'Memproses...' : `Simpan Transaksi ${formData.tipe}`}
                  </button>
                </motion.div>
              )}
            </form>
          </div>
        </div>

        <AnimatePresence>
          {showConfirmModal && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl"
              >
                <h3 className="text-xl font-bold text-slate-800 text-center mb-2">Konfirmasi Transaksi</h3>
                <p className="text-slate-500 text-center mb-8">Apakah Anda yakin data transaksi ini sudah benar dan ingin menyimpannya?</p>
                <div className="flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setShowConfirmModal(false)}
                    className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all"
                  >
                    Batal
                  </button>
                  <button 
                    type="button"
                    onClick={executeSubmit}
                    disabled={submitting}
                    className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all disabled:opacity-50"
                  >
                    {submitting ? 'Menyimpan...' : 'Ya, Simpan'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Right: History & Summary */}
        <div className="lg:col-span-2 space-y-6">
          {selectedSantri ? (
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                <History className="text-emerald-600" /> Riwayat Transaksi: {selectedSantri[2]}
              </h3>
              <div className="space-y-3">
                {getSantriHistory(selectedSantri[3]).length === 0 ? (
                  <p className="text-center py-8 text-slate-400 italic">Belum ada riwayat transaksi</p>
                ) : (
                  getSantriHistory(selectedSantri[3]).map((h, i) => {
                    const tipe = h.length > 6 ? h[6] : h[3];
                    const jumlah = h.length > 6 ? h[5] : h[2];
                    const keterangan = h.length > 6 ? h[7] : h[4];
                    
                    return (
                      <div key={i} className="flex items-center justify-between p-4 rounded-2xl border border-slate-50 hover:bg-slate-50 transition-colors group">
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-xl ${tipe === 'Masuk' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                            {tipe === 'Masuk' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800">{keterangan}</p>
                            <p className="text-[10px] text-slate-400">{new Date(h[0]).toLocaleString('id-ID')}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <p className={`font-bold ${tipe === 'Masuk' ? 'text-emerald-600' : 'text-red-600'}`}>
                            {tipe === 'Masuk' ? '+' : '-'} Rp {formatIDR(jumlah)}
                          </p>
                          {isAdmin && (
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => {
                                  setIsEditing(true);
                                  setSelectedRecord(h);
                                  setFormData({
                                    jumlah: jumlah.toString(),
                                    tipe: tipe as 'Masuk' | 'Keluar',
                                    keterangan: keterangan,
                                    tanggal: h[0].split('T')[0]
                                  });
                                }}
                                className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={() => handleDelete(h)}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                <Users className="text-emerald-600" /> Ringkasan Saldo Santri
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                      <th className="px-4 py-3">Nama Santri</th>
                      <th className="px-4 py-3">Kelas</th>
                      <th className="px-4 py-3 text-right">Saldo Uang Saku</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {santri.length === 0 ? (
                      <tr><td colSpan={3} className="text-center py-8 text-slate-400">Memuat data santri...</td></tr>
                    ) : santri.map((s, i) => {
                      const balance = calculateBalance(s[3]);
                      if (balance === 0 && santriSearch === '') return null;
                      return (
                        <tr key={i} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => {
                          setSelectedSantri(s);
                          setSantriSearch(s[2]);
                        }}>
                          <td className="px-4 py-3">
                            <p className="text-sm font-bold text-slate-800">{s[2]}</p>
                            <p className="text-[10px] text-slate-400">Ayah: {s[13]}</p>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500">{s[22]}</td>
                          <td className="px-4 py-3 text-right">
                            <p className={`text-sm font-bold ${balance > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                              Rp {formatIDR(balance)}
                            </p>
                          </td>
                        </tr>
                      );
                    })}
                    {santri.filter(s => calculateBalance(s[3]) > 0).length === 0 && (
                      <tr><td colSpan={3} className="text-center py-8 text-slate-400 italic">Tidak ada saldo aktif</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Print Modal */}
      <AnimatePresence>
        {showPrintModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
              onClick={() => setShowPrintModal(null)}
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden"
            >
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Printer className="w-8 h-8 text-emerald-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Cetak Bukti Transaksi?</h3>
                <p className="text-sm text-slate-500 mb-6">Apakah Anda ingin mencetak bukti transaksi untuk {showPrintModal.santriName}?</p>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setShowPrintModal(null)}
                    className="flex-1 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                  >
                    Tidak
                  </button>
                  <button 
                    onClick={() => {
                      printAllowanceReceipt(showPrintModal.transaction, showPrintModal.santriName);
                      setShowPrintModal(null);
                    }}
                    className="flex-1 py-3 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all"
                  >
                    Ya, Cetak
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Alert Notification */}
      <AnimatePresence>
        {alertInfo && (
          <div className="fixed bottom-8 right-8 z-50">
            <motion.div 
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className={`px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3 font-bold text-white ${alertInfo.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}
            >
              {alertInfo.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
              {alertInfo.message}
              <button onClick={() => setAlertInfo(null)} className="ml-4 hover:opacity-70">
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Savings Management (Tabungan) ---

const SavingsManagement = ({ isAdmin, user }: { isAdmin: boolean, user?: any }) => {
  const location = useLocation();
  const [savings, setSavings] = useState<any[]>([]);
  const [santri, setSantri] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [santriSearch, setSantriSearch] = useState('');
  const [showSantriResults, setShowSantriResults] = useState(false);
  const [selectedSantri, setSelectedSantri] = useState<any>(null);
  const [alertInfo, setAlertInfo] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [showPrintModal, setShowPrintModal] = useState<{ transaction: any, santriName: string } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  
  const [formData, setFormData] = useState({
    jumlah: '',
    tipe: '' as 'Masuk' | 'Keluar' | '',
    keterangan: '',
    tanggal: new Date().toISOString().split('T')[0]
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [savingsRes, santriRes] = await Promise.all([
        fetchWithCache('/api/data/Tabungan'),
        fetchWithCache('/api/data/Santri')
      ]);
      const savingsData = Array.isArray(savingsRes.data) ? savingsRes.data : [];
      const santriData = Array.isArray(santriRes.data) ? santriRes.data : [];
      setSavings(savingsData);
      setSantri(santriData);

      // Handle edit from navigation state
      if (location.state?.editRecord) {
        const record = location.state.editRecord;
        const s = santriData.find(st => st[3] === record[1]);
        if (s) {
          setSelectedSantri(s);
          setSantriSearch(s[2]);
          setIsEditing(true);
          setSelectedRecord(record);
          
          const isNew = record.length > 6;
          setFormData({
            jumlah: isNew ? record[5].toString() : record[2].toString(),
            tipe: (isNew ? record[6] : record[3]) as 'Masuk' | 'Keluar',
            keterangan: isNew ? record[7] : record[4],
            tanggal: record[0].split('T')[0]
          });
        }
      }
    } catch (err) {
      console.error("Failed to fetch savings data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const calculateBalance = (santriId: string) => {
    return savings
      .filter(a => a[1] === santriId)
      .reduce((acc, curr) => {
        const amount = curr.length > 6 ? parseIDR(curr[5]) : parseIDR(curr[2]);
        const tipe = curr.length > 6 ? curr[6] : curr[3];
        return tipe === 'Masuk' ? acc + amount : acc - amount;
      }, 0);
  };

  const getSantriHistory = (santriId: string) => {
    return savings
      .filter(a => a[1] === santriId)
      .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSantri) return setAlertInfo({ message: 'Pilih santri terlebih dahulu', type: 'error' });
    if (!formData.jumlah || parseIDR(formData.jumlah) <= 0) return setAlertInfo({ message: 'Jumlah harus lebih dari 0', type: 'error' });
    setShowConfirmModal(true);
  };

  const executeSubmit = async () => {
    setShowConfirmModal(false);
    setSubmitting(true);
    try {
      const keterangan = formData.keterangan || (formData.tipe === 'Masuk' ? 'Tabungan Masuk' : 'Penarikan Tabungan');
      
      if (isEditing && selectedRecord) {
        await postWithOfflineQueue('/api/data/Tabungan/update', {
          id: selectedRecord[0],
          data: [
            selectedRecord[0],
            selectedSantri[3],
            selectedSantri[2],
            selectedSantri[13],
            selectedSantri[22],
            formData.jumlah,
            formData.tipe,
            keterangan,
            user?.username || 'System'
          ],
          adminName: user?.username || 'System'
        });
        setAlertInfo({ message: 'Data tabungan berhasil diperbarui!', type: 'success' });
        setIsEditing(false);
        setSelectedRecord(null);
      } else {
        await postWithOfflineQueue('/api/savings', {
          data: {
            santriId: selectedSantri[3],
            namaSantri: selectedSantri[2],
            namaAyah: selectedSantri[13],
            kelasFormal: selectedSantri[22],
            jumlah: formData.jumlah,
            tipe: formData.tipe,
            keterangan: keterangan,
            tanggal: formData.tanggal,
            adminName: user?.username || 'System'
          }
        });
        setAlertInfo({ message: `Transaksi tabungan ${formData.tipe} berhasil!`, type: 'success' });
      }
      
      const newTransaction = [
        isEditing ? selectedRecord[0] : new Date().toISOString(),
        selectedSantri[3],
        selectedSantri[2],
        selectedSantri[13],
        selectedSantri[22],
        formData.jumlah,
        formData.tipe,
        keterangan,
        user?.username || 'System'
      ];

      if (!isEditing) setShowPrintModal({ transaction: newTransaction, santriName: selectedSantri[2] });
      setFormData({ ...formData, jumlah: '', keterangan: '', tipe: '' });
      fetchData();
    } catch (err: any) {
      setAlertInfo({ message: 'Gagal menyimpan: ' + (err.response?.data?.error || err.message), type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (record: any) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus transaksi tabungan ini?')) return;
    try {
      await postWithOfflineQueue('/api/data/Tabungan/delete', { id: record[0], adminName: user?.username || 'System' });
      setAlertInfo({ message: 'Transaksi tabungan berhasil dihapus!', type: 'success' });
      fetchData();
    } catch (err) {
      setAlertInfo({ message: 'Gagal menghapus transaksi', type: 'error' });
    }
  };

  const filteredSantri = santri.filter(s => 
    s[2]?.toLowerCase().includes(santriSearch.toLowerCase()) || 
    s[3]?.toLowerCase().includes(santriSearch.toLowerCase()) ||
    s[13]?.toLowerCase().includes(santriSearch.toLowerCase())
  ).slice(0, 10);

  const formatIDR = (val: string | number) => {
    const num = typeof val === 'string' ? parseInt(val.replace(/\D/g, '')) || 0 : val;
    return num.toLocaleString('id-ID');
  };

  const printSavingsReceipt = async (f: any, santriName: string) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(18);
    doc.text("BUKTI TRANSAKSI TABUNGAN", 110, 20, { align: "center" });
    doc.setFontSize(14);
    doc.text("PONDOK PESANTREN SALAFIYAH QUR'ANIYYAH", 110, 30, { align: "center" });
    
    doc.setLineWidth(0.5);
    doc.line(20, 35, 190, 35);
 
    // QR Code
    try {
      const santriData = santri.find(s => s[3] === f[1]);
      const namaAyah = santriData ? santriData[13] : (f[3] || '-');
      const nominal = parseIDR(f[5]).toLocaleString('id-ID');
      const tanggal = f[0].split('T')[0];
      
      const qrText = `-------------------------------------------
NOTA TABUNGAN PPSQ SAYFA'ATUL QUR'AN
-------------------------------------------
ID TRANS : ${f[0]}
SANTRI   : ${santriName} binti ${namaAyah}
TANGGAL  : ${tanggal}
TOTAL    : Rp ${nominal} (${f[6]})
STATUS   : SAH & TERCATAT DI SISTEM
-------------------------------------------`;

      const qrDataUrl = await QRCode.toDataURL(qrText, { margin: 1, width: 200 });
      doc.addImage(qrDataUrl, 'PNG', 160, 40, 30, 30);
    } catch (e) {
      console.error("Failed to generate QR Code:", e);
    }

    // Content
    doc.setFontSize(12);
    let y = 50;
    const items = [
      ["No. Transaksi", f[0]],
      ["Nama Santri", santriName],
      ["ID Santri (NIK)", f[1]],
      ["Tipe Transaksi", f[6]],
      ["Jumlah", `Rp ${parseIDR(f[5]).toLocaleString('id-ID')}`],
      ["Keterangan", f[7] || "-"],
      ["Petugas", f[8] || "System"],
      ["Tanggal Cetak", new Date().toLocaleString('id-ID')],
    ];
 
    items.forEach(([label, value]) => {
      doc.setFont("helvetica", "bold");
      doc.text(`${label}:`, 30, y);
      doc.setFont("helvetica", "normal");
      doc.text(`${value}`, 80, y);
      y += 10;
    });
 
    // Footer
    y += 20;
    doc.text("Bendahara,", 150, y, { align: "center" });
    y += 25;
    doc.text(`( ${f[8] || "System"} )`, 150, y, { align: "center" });
 
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Sub Menu Tabs */}
      <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-slate-100 max-w-4xl mx-auto">
        {[
          { id: 'bulanan', name: 'Syahriyah Bulanan', icon: Calendar, path: '/syahriah/bulanan' },
          { id: 'harian', name: 'Titipan Harian', icon: Clock, path: '/syahriah/harian' },
          { id: 'tabungan', name: 'Tabungan', icon: Wallet, path: '/syahriah/tabungan' },
          { id: 'riwayat', name: 'Riwayat & Cetak', icon: History, path: '/syahriah/riwayat' },
          { id: 'laporan', name: 'Laporan Keuangan', icon: Wallet, path: '/syahriah/laporan' }
        ].filter(tab => isAdmin || (tab.id !== 'bulanan' && tab.id !== 'harian' && tab.id !== 'tabungan')).map((tab) => (
          <Link
            key={tab.id}
            to={tab.path}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all ${
              tab.id === 'tabungan' 
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100' 
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.name}</span>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Wallet className="text-blue-600" /> Kelola Tabungan
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Cari Santri</label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text"
                    placeholder="Nama santri..."
                    value={santriSearch}
                    onChange={(e) => {
                      setSantriSearch(e.target.value);
                      setShowSantriResults(true);
                    }}
                    onFocus={() => setShowSantriResults(true)}
                    onBlur={() => setTimeout(() => setShowSantriResults(false), 200)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-sm"
                  />
                </div>
                
                {showSantriResults && santriSearch.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                    {filteredSantri.map((s) => (
                      <button
                        key={s[3]}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setSelectedSantri(s);
                          setSantriSearch(s[2]);
                          setShowSantriResults(false);
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-0 flex flex-col"
                      >
                        <span className="font-bold text-slate-800 text-sm">{s[2]}</span>
                        <span className="text-[10px] text-slate-500">Ayah: {s[13]} | Kelas: {s[22]}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedSantri && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-blue-50 rounded-2xl border border-blue-100"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-xs font-bold text-blue-800">{selectedSantri[2]}</p>
                      <p className="text-[10px] text-blue-600">ID: {selectedSantri[3]}</p>
                    </div>
                    <button onClick={() => setSelectedSantri(null)} className="text-blue-400 hover:text-blue-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="pt-2 border-t border-blue-100">
                    <p className="text-[10px] text-blue-600 uppercase font-bold tracking-wider">Saldo Tabungan</p>
                    <p className="text-xl font-black text-blue-700">Rp {formatIDR(calculateBalance(selectedSantri[3]))}</p>
                  </div>
                </motion.div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, tipe: 'Masuk' })}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                    formData.tipe === 'Masuk' 
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-100' 
                      : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-500'
                  }`}
                >
                  <TrendingUp className="w-3 h-3 inline mr-1" /> Masuk
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, tipe: 'Keluar' })}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                    formData.tipe === 'Keluar' 
                      ? 'bg-red-600 text-white border-red-600 shadow-lg shadow-red-100' 
                      : 'bg-white text-slate-600 border-slate-200 hover:border-red-500'
                  }`}
                >
                  <TrendingDown className="w-3 h-3 inline mr-1" /> Keluar
                </button>
              </div>

              {formData.tipe && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-4 overflow-hidden"
                >
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Jumlah (Rp)</label>
                    <input 
                      type="text"
                      value={formatIDR(formData.jumlah)}
                      onChange={(e) => setFormData({ ...formData, jumlah: e.target.value.replace(/\D/g, '') })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700"
                      placeholder="0"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Keterangan</label>
                    <input 
                      type="text"
                      value={formData.keterangan}
                      onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      placeholder="Contoh: Tabungan bulanan"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || !selectedSantri}
                    className={`w-full py-3 rounded-xl font-bold text-white shadow-lg transition-all disabled:opacity-50 ${
                      formData.tipe === 'Masuk' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100' : 'bg-red-600 hover:bg-red-700 shadow-red-100'
                    }`}
                  >
                    {submitting ? 'Memproses...' : `Simpan Tabungan ${formData.tipe}`}
                  </button>
                </motion.div>
              )}
            </form>
          </div>
        </div>

        <AnimatePresence>
          {showConfirmModal && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl"
              >
                <h3 className="text-xl font-bold text-slate-800 text-center mb-2">Konfirmasi Tabungan</h3>
                <p className="text-slate-500 text-center mb-8">Apakah Anda yakin data tabungan ini sudah benar dan ingin menyimpannya?</p>
                <div className="flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setShowConfirmModal(false)}
                    className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all"
                  >
                    Batal
                  </button>
                  <button 
                    type="button"
                    onClick={executeSubmit}
                    disabled={submitting}
                    className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all disabled:opacity-50"
                  >
                    {submitting ? 'Menyimpan...' : 'Ya, Simpan'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <div className="lg:col-span-2 space-y-6">
          {selectedSantri ? (
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                <History className="text-blue-600" /> Riwayat Tabungan: {selectedSantri[2]}
              </h3>
              <div className="space-y-3">
                {getSantriHistory(selectedSantri[3]).length === 0 ? (
                  <p className="text-center py-8 text-slate-400 italic">Belum ada riwayat tabungan</p>
                ) : (
                  getSantriHistory(selectedSantri[3]).map((h, i) => {
                    const tipe = h.length > 6 ? h[6] : h[3];
                    const jumlah = h.length > 6 ? h[5] : h[2];
                    const keterangan = h.length > 6 ? h[7] : h[4];
                    
                    return (
                      <div key={i} className="flex items-center justify-between p-4 rounded-2xl border border-slate-50 hover:bg-slate-50 transition-colors group">
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-xl ${tipe === 'Masuk' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                            {tipe === 'Masuk' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800">{keterangan}</p>
                            <p className="text-[10px] text-slate-400">{new Date(h[0]).toLocaleString('id-ID')}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <p className={`font-bold ${tipe === 'Masuk' ? 'text-emerald-600' : 'text-red-600'}`}>
                            {tipe === 'Masuk' ? '+' : '-'} Rp {formatIDR(jumlah)}
                          </p>
                          {isAdmin && (
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => {
                                  setIsEditing(true);
                                  setSelectedRecord(h);
                                  setFormData({
                                    jumlah: jumlah.toString(),
                                    tipe: tipe as 'Masuk' | 'Keluar',
                                    keterangan: keterangan,
                                    tanggal: h[0].split('T')[0]
                                  });
                                }}
                                className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={() => handleDelete(h)}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                <Users className="text-blue-600" /> Ringkasan Saldo Tabungan
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                      <th className="px-4 py-3">Nama Santri</th>
                      <th className="px-4 py-3">Kelas</th>
                      <th className="px-4 py-3 text-right">Saldo Tabungan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {santri.length === 0 ? (
                      <tr><td colSpan={3} className="text-center py-8 text-slate-400">Memuat data santri...</td></tr>
                    ) : santri.map((s, i) => {
                      const balance = calculateBalance(s[3]);
                      if (balance === 0 && santriSearch === '') return null;
                      return (
                        <tr key={i} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => {
                          setSelectedSantri(s);
                          setSantriSearch(s[2]);
                        }}>
                          <td className="px-4 py-3">
                            <p className="text-sm font-bold text-slate-800">{s[2]}</p>
                            <p className="text-[10px] text-slate-400">Ayah: {s[13]}</p>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500">{s[22]}</td>
                          <td className="px-4 py-3 text-right">
                            <p className={`text-sm font-bold ${balance > 0 ? 'text-blue-600' : 'text-slate-400'}`}>
                              Rp {formatIDR(balance)}
                            </p>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Print Modal */}
      <AnimatePresence>
        {showPrintModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
              onClick={() => setShowPrintModal(null)}
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden"
            >
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Printer className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Cetak Bukti Tabungan?</h3>
                <p className="text-sm text-slate-500 mb-6">Apakah Anda ingin mencetak bukti transaksi tabungan untuk {showPrintModal.santriName}?</p>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setShowPrintModal(null)}
                    className="flex-1 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                  >
                    Tidak
                  </button>
                  <button 
                    onClick={() => {
                      printSavingsReceipt(showPrintModal.transaction, showPrintModal.santriName);
                      setShowPrintModal(null);
                    }}
                    className="flex-1 py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all"
                  >
                    Ya, Cetak
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Alert Notification */}
      <AnimatePresence>
        {alertInfo && (
          <div className="fixed bottom-8 right-8 z-50">
            <motion.div 
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className={`px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3 font-bold text-white ${alertInfo.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}
            >
              {alertInfo.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
              {alertInfo.message}
              <button onClick={() => setAlertInfo(null)} className="ml-4 hover:opacity-70">
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const FinanceManagement = ({ isAdmin, user, financeSettings }: { isAdmin: boolean, user?: any, financeSettings?: any }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [finance, setFinance] = useState<any[]>([]);
  const [santri, setSantri] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [santriSearch, setSantriSearch] = useState('');
  const [showSantriResults, setShowSantriResults] = useState(false);
  const [showSettingsAlert, setShowSettingsAlert] = useState(false);
  
  // Determine active tab from URL
  const activeSubMenu = useMemo(() => {
    if (location.pathname.includes('/riwayat')) return 'riwayat';
    if (location.pathname.includes('/laporan')) return 'laporan';
    return 'bulanan';
  }, [location.pathname]);

  const [monthlyFee, setMonthlyFee] = useState(200000);
  const [masterTarif, setMasterTarif] = useState<any[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [settings, setSettings] = useState<any>({});
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const [formData, setFormData] = useState({
    santriIndex: '',
    namaSantri: '',
    santriId: '',
    bulan: new Date().toLocaleString('id-ID', { month: 'long' }),
    tahun: new Date().getFullYear().toString(),
    tagihan: '200000',
    bayar: '',
    titipan: '0',
    keterangan: '',
    tanggal: new Date().toISOString().split('T')[0],
    selectedMonths: [] as string[]
  });

  const getPaidMonths = (santriId: string, year: string) => {
    const paidStrings = finance
      .filter(f => f[1] === santriId && f[5] === year && f[4] !== 'Harian')
      .map(f => f[4]);
    
    const allPaid: string[] = [];
    paidStrings.forEach(s => {
      if (typeof s === 'string' && s.includes(',')) {
        s.split(',').forEach(m => {
          const trimmed = m.trim();
          if (trimmed) allPaid.push(trimmed);
        });
      } else if (s) {
        allPaid.push(s);
      }
    });
    return allPaid;
  };

  const formatIDR = (val: string | number) => {
    if (!val && val !== 0) return '';
    let num: number;
    if (typeof val === 'string') {
      const isNegative = val.trim().startsWith('-');
      const clean = val.replace(/\D/g, '');
      num = (parseInt(clean) || 0) * (isNegative ? -1 : 1);
    } else {
      num = val;
    }
    if (isNaN(num)) return '';
    const formatted = Math.abs(num).toLocaleString('id-ID');
    return num < 0 ? `-${formatted}` : formatted;
  };

  const fetchFinance = async () => {
    try {
      const [syahriahRes, titipanRes, financeRes, allowanceRes, savingsRes] = await Promise.all([
        fetchWithCache('/api/data/Syahriah'),
        fetchWithCache('/api/data/TitipanHarian'),
        fetchWithCache('/api/data/Finance'),
        fetchWithCache('/api/data/Allowance'),
        fetchWithCache('/api/data/Tabungan')
      ]);
      
      const combined = [
        ...(Array.isArray(syahriahRes.data) ? syahriahRes.data.map((r: any) => {
          const newR = [...r];
          newR[15] = 'Syahriah';
          return newR;
        }) : []),
        ...(Array.isArray(titipanRes.data) ? titipanRes.data.map((r: any) => {
          const newR = [...r];
          newR[15] = 'TitipanHarian';
          return newR;
        }) : []),
        ...(Array.isArray(financeRes.data) ? financeRes.data.map((r: any) => {
          const newR = [...r];
          newR[15] = 'Finance';
          return newR;
        }) : []),
        ...(Array.isArray(allowanceRes.data) ? allowanceRes.data.map((r: any) => {
          const isNew = r.length > 6;
          const timestamp = r[0];
          const idSantri = r[1];
          const nama = isNew ? r[2] : 'Santri';
          const ayah = isNew ? r[3] : '';
          const jumlah = isNew ? r[5] : r[2];
          const tipe = isNew ? r[6] : r[3];
          const ket = isNew ? r[7] : r[4];
          const admin = isNew ? r[8] : r[5];
          
          const normalized = [
            timestamp, idSantri, nama, ayah, 'Harian', new Date(timestamp).getFullYear().toString(), '0', '0', 
            tipe === 'Masuk' ? jumlah : `-${jumlah}`, '0', ket, timestamp.split('T')[0], admin
          ];
          normalized[15] = 'Allowance';
          return normalized;
        }) : []),
        ...(Array.isArray(savingsRes.data) ? savingsRes.data.map((r: any) => {
          const isNew = r.length > 6;
          const timestamp = r[0];
          const idSantri = r[1];
          const nama = isNew ? r[2] : 'Santri';
          const ayah = isNew ? r[3] : '';
          const jumlah = isNew ? r[5] : r[2];
          const tipe = isNew ? r[6] : r[3];
          const ket = isNew ? r[7] : r[4];
          const admin = isNew ? r[8] : r[5];
          
          const normalized = [
            timestamp, idSantri, nama, ayah, 'Tabungan', new Date(timestamp).getFullYear().toString(), '0', '0', 
            tipe === 'Masuk' ? jumlah : `-${jumlah}`, '0', ket, timestamp.split('T')[0], admin
          ];
          normalized[15] = 'Tabungan';
          return normalized;
        }) : [])
      ];
      
      // Sort by timestamp descending
      combined.sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());
      
      setFinance(combined);
    } catch (err) {
      console.error("Failed to fetch finance data:", err);
      setFinance([]);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetchWithCache('/api/settings');
      setSettings(res.data);
      if (res.data.monthly_syahriah_fee) {
        const fee = parseIDR(res.data.monthly_syahriah_fee);
        setMonthlyFee(fee);
        // setFormData(prev => ({ ...prev, tagihan: fee.toString() })); // Remove this to avoid overwriting during edit
      }
    } catch (err) {
      console.error("Failed to fetch settings:", err);
    }
  };

  const fetchMasterTarif = async () => {
    try {
      const res = await fetchWithCache('/api/data/master_tarif');
      if (Array.isArray(res.data)) {
        setMasterTarif(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch master tarif:", err);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        await Promise.all([fetchFinance(), fetchSettings(), fetchMasterTarif()]);
        const resSantri = await fetchWithCache('/api/data/Santri');
        if (Array.isArray(resSantri.data)) {
          setSantri(resSantri.data);
        }
      } catch (err) {
        console.error("Failed to fetch data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getSantriTarif = (s: any) => {
    if (!s) return monthlyFee;
    
    const kelasFormal = (s[22] || '').toUpperCase();
    const isNdalem = (s[31] || '').toUpperCase() === 'SANTRI NDALEM';
    const ndalemSuffix = isNdalem ? ' NDALEM' : '';
    
    // Determine the base category from Kelas Formal
    let baseCategory = null;
    if (kelasFormal.includes('YATIM') || (s[2] || '').toLowerCase().includes('yatim')) {
       baseCategory = 'YATIM_BEASISWA'; // Assumed no 'ndalem' for Yatim, but logic below will safely fallback
    } else if (kelasFormal.includes('PENGURUS')) {
       baseCategory = 'PENGURUS';
    } else if (kelasFormal.includes('LULUS')) {
       baseCategory = 'LULUS_FORMAL';
    } else if (kelasFormal.includes('MI')) {
       baseCategory = 'MI';
    } else if (kelasFormal.includes('MTS') || kelasFormal.includes('MTs')) {
       baseCategory = 'MTS';
    } else if (kelasFormal.includes('MA')) {
       baseCategory = 'MA';
    }
    
    // Attempt 1: Try base category WITH ndalem suffix (e.g. "MI NDALEM")
    let searchKey = baseCategory ? (baseCategory + ndalemSuffix).trim() : null;
    let tarif = searchKey ? masterTarif.find(t => t[0] === searchKey) : null;
    
    // Attempt 2: If not found (or if not ndalem), try just the base category (e.g. "MI")
    if (!tarif && baseCategory) {
       tarif = masterTarif.find(t => t[0] === baseCategory);
    }
    
    // Attempt 3: Legacy/Fallback matching by words
    if (!tarif) {
       const kelasWords = kelasFormal.split(/[ \-]/);
       const tingkatPondok = (s[23] || '').toUpperCase();
       const tingkatWords = tingkatPondok.split(/[ \-]/);
       
       tarif = masterTarif.find(t => 
         kelasWords.includes(t[0]) || 
         tingkatWords.includes(t[0])
       );
    }

    return tarif ? parseIDR(tarif[2]) : monthlyFee;
  };

  const calculateTunggakan = (santriId: string) => {
    // Get all records for this santri, sorted by timestamp descending
    const santriRecords = finance
      .filter(f => f[1] === santriId && f[4] !== 'Harian')
      .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());
    
    if (santriRecords.length === 0) return 0;
    
    // The latest record contains the current balance (Kekurangan - Titipan)
    const latest = santriRecords[0];
    return parseIDR(latest[9]) - parseIDR(latest[8]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.santriIndex) return setAlertInfo({ message: 'Pilih santri terlebih dahulu', type: 'error' });
    
    if (activeSubMenu === 'bulanan' && !isEditing) {
      if (formData.selectedMonths.length === 0) {
        return setAlertInfo({ message: 'Pilih minimal satu bulan', type: 'error' });
      }

      if (!financeSettings?.nominal_tabungan_ziarah || !financeSettings?.estimasi_biaya_ziarah) {
        setShowSettingsAlert(true);
        return;
      }
    }
    setShowConfirmModal(true);
  };

  const executeSubmit = async () => {
    setShowConfirmModal(false);
    setSubmitting(true);
    try {
      const selectedSantri = santri[parseInt(formData.santriIndex)];
      
      // Get previous balance data for WA notification
      const santriRecords = finance
        .filter(f => f[1] === selectedSantri[3] && f[4] !== 'Harian')
        .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());
      const latestRecord = santriRecords.length > 0 ? santriRecords[0] : null;
      const saldoLalu = latestRecord ? (parseIDR(latestRecord[9]) - parseIDR(latestRecord[8])) : 0;
      const tanggalTerakhir = latestRecord ? (latestRecord[11] || latestRecord[0].split('T')[0]) : '-';
      const kewajibanBulanan = getSantriTarif(selectedSantri);

      if (activeSubMenu === 'bulanan' && !isEditing) {
        // Handle multiple months as a single record
        const payload = {
          santriId: selectedSantri[3],
          namaSantri: selectedSantri[2],
          namaAyah: selectedSantri[13], // Nama Ayah is at index 13 in Santri sheet
          bulan: formData.selectedMonths.join(', '),
          tahun: formData.tahun,
          tagihan: formData.tagihan,
          bayar: formData.bayar,
          titipan: '0',
          keterangan: formData.keterangan || `Syahriyah ${formData.selectedMonths.join(', ')} ${formData.tahun}`,
          tanggal: formData.tanggal,
          adminName: user?.username || 'System',
          phone: selectedSantri[27], // No HP
          kewajibanBulanan,
          saldoLalu,
          tanggalTerakhir
        };
        const res = await postWithOfflineQueue('/api/finance/add', { ...payload, sheetName: 'Syahriah' });
        setAlertInfo({ message: res.data?.message || `Pembayaran ${formData.selectedMonths.length} bulan berhasil disimpan!`, type: 'success' });
      } else {
        // Original single record logic (for Harian or Editing)
        const payload = {
          santriId: selectedSantri[3],
          namaSantri: selectedSantri[2],
          namaAyah: selectedSantri[13],
          bulan: activeSubMenu === 'bulanan' ? formData.bulan : 'Harian',
          tahun: formData.tahun,
          tagihan: activeSubMenu === 'bulanan' ? formData.tagihan : '0',
          bayar: formData.bayar,
          titipan: activeSubMenu === 'bulanan' ? '0' : formData.titipan,
          keterangan: formData.keterangan || (activeSubMenu === 'harian' ? 'Titipan Harian' : ''),
          tanggal: formData.tanggal,
          adminName: user?.username || 'System',
          sheetName: activeSubMenu === 'bulanan' ? 'Syahriah' : 'TitipanHarian',
          phone: selectedSantri[27], // No HP
          kewajibanBulanan,
          saldoLalu,
          tanggalTerakhir
        };
        
        if (isEditing && selectedRecord) {
          const tagihanNum = parseIDR(payload.tagihan);
          const bayarNum = parseIDR(payload.bayar);
          let kekuranganNum = 0;
          let titipanNum = parseIDR(payload.titipan);

          if (payload.bulan !== 'Harian') {
            if (bayarNum > tagihanNum) {
              titipanNum += (bayarNum - tagihanNum);
              kekuranganNum = 0;
            } else {
              kekuranganNum = tagihanNum - bayarNum;
            }
          } else {
            kekuranganNum = tagihanNum - bayarNum;
          }

          const sheetToUpdate = selectedRecord[15] || (selectedRecord[4] === 'Harian' ? 'TitipanHarian' : 'Syahriah');
          await postWithOfflineQueue(`/api/data/${sheetToUpdate}/update`, { 
            id: selectedRecord[0], 
            data: [
              selectedRecord[0], 
              payload.santriId, 
              payload.namaSantri, 
              payload.namaAyah,
              payload.bulan, 
              payload.tahun, 
              payload.tagihan, 
              payload.bayar, 
              titipanNum.toString(), 
              kekuranganNum.toString(), 
              payload.keterangan,
              payload.tanggal,
              payload.adminName
            ],
            adminName: user?.username || 'System'
          });
          setAlertInfo({ message: 'Data berhasil diperbarui!', type: 'success' });
          setIsEditing(false);
          setSelectedRecord(null);
        } else {
          const res = await postWithOfflineQueue('/api/finance/add', payload);
          setAlertInfo({ message: res.data?.message || 'Pembayaran berhasil disimpan!', type: 'success' });
        }
      }

      setFormData({ 
        ...formData, 
        santriIndex: '', 
        namaSantri: '', 
        santriId: '',
        bayar: '', 
        titipan: '0',
        keterangan: '',
        selectedMonths: []
      });
      setSantriSearch('');
      fetchFinance();
    } catch (err: any) {
      setAlertInfo({ message: 'Gagal menyimpan: ' + (err.response?.data?.error || err.message), type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const [deletingRecord, setDeletingRecord] = useState<any>(null);
  const [alertInfo, setAlertInfo] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [riwayatTab, setRiwayatTab] = useState<'bulanan' | 'harian'>('bulanan');
  const [riwayatFilters, setRiwayatFilters] = useState({
    santri: '',
    periode: '',
    status: ''
  });

  const handleDelete = async (record: any) => {
    setDeletingRecord(null);
    try {
      const sheetToDelete = record[15] || (record[4] === 'Harian' ? 'TitipanHarian' : 'Syahriah');
      await postWithOfflineQueue(`/api/data/${sheetToDelete}/delete`, { id: record[0], adminName: user?.username || 'System' });
      setAlertInfo({ message: 'Data berhasil dihapus!', type: 'success' });
      fetchFinance();
    } catch (err) {
      setAlertInfo({ message: 'Gagal menghapus data', type: 'error' });
    }
  };

  const generatePDF = async (f: any) => {
    const doc = new jsPDF() as any;
    const isHarian = f[4] === 'Harian';
    
    // Logo
    if (settings.logo_url) {
      try {
        doc.addImage(settings.logo_url, 'PNG', 20, 10, 20, 20);
      } catch (e) {
        console.warn("Could not add logo to PDF:", e);
      }
    }

    // Header
    doc.setFontSize(18);
    doc.text(isHarian ? "BUKTI TITIPAN HARIAN" : "BUKTI PEMBAYARAN SYAHRIYAH", 110, 20, { align: "center" });
    doc.setFontSize(14);
    doc.text("PONDOK PESANTREN SALAFIYAH QUR'ANIYYAH", 110, 30, { align: "center" });
    
    doc.setLineWidth(0.5);
    doc.line(20, 35, 190, 35);
 
    // QR Code
    try {
      const santriData = santri.find(s => s[3] === f[1]); // f[1] is santriId (NIK)
      const namaAyah = santriData ? santriData[13] : (f[3] || '-');
      const nominal = parseIDR(f[7]).toLocaleString('id-ID');
      const tanggal = f[11] || f[0].split('T')[0];
      
      const qrText = `-------------------------------------------
NOTA RESMI PPSQ SAYFA'ATUL QUR'AN
-------------------------------------------
ID TRANS : ${f[0]}
SANTRI   : ${f[2]} binti ${namaAyah}
TANGGAL  : ${tanggal}
TOTAL    : Rp ${nominal}
STATUS   : SAH & TERCATAT DI SISTEM
-------------------------------------------
Simpan nota ini sebagai bukti pembayaran.
-------------------------------------------`;

      const qrDataUrl = await QRCode.toDataURL(qrText, {
        margin: 1,
        width: 200,
        errorCorrectionLevel: 'H',
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });
      doc.addImage(qrDataUrl, 'PNG', 160, 40, 30, 30);
      doc.setFontSize(8);
      doc.text("Scan untuk Verifikasi", 175, 72, { align: "center" });
    } catch (e) {
      console.error("Failed to generate QR Code:", e);
    }

    // Content
    doc.setFontSize(12);
    let y = 50;
    const items = [
      ["No. Transaksi", f[0]],
      ["Nama Santri", f[2]],
      ["ID Santri (NIK)", f[1]],
      ["Tanggal Bayar", f[11] || "-"],
      ["Periode", isHarian ? "Harian" : `${f[4]} ${f[5]}`],
    ];

    if (!isHarian) {
      items.push(["Tagihan", `Rp ${parseIDR(f[6]).toLocaleString('id-ID')}`]);
      items.push(["Jumlah Bayar", `Rp ${parseIDR(f[7]).toLocaleString('id-ID')}`]);
      items.push(["Sisa Tagihan", `Rp ${parseIDR(f[9]).toLocaleString('id-ID')}`]);
    } else {
      items.push(["Jumlah Titipan", `Rp ${parseIDR(f[8]).toLocaleString('id-ID')}`]);
    }

    items.push(["Keterangan", f[10] || "-"]);
    items.push(["Petugas", f[12] || "System"]);
    items.push(["Tanggal Cetak", new Date().toLocaleString('id-ID')]);
 
    items.forEach(([label, value]) => {
      doc.setFont("helvetica", "bold");
      doc.text(`${label}:`, 30, y);
      doc.setFont("helvetica", "normal");
      doc.text(`${value}`, 80, y);
      y += 10;
    });
 
    // Footer
    y += 20;
    doc.text("Bendahara,", 150, y, { align: "center" });
    y += 25;
    const adminName = f[12] || "System";
    doc.text(`( ${adminName} )`, 150, y, { align: "center" });
 
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  const filteredSantri = santri.filter(s => 
    s[2]?.toLowerCase().includes(santriSearch.toLowerCase()) || 
    s[3]?.toLowerCase().includes(santriSearch.toLowerCase()) ||
    s[13]?.toLowerCase().includes(santriSearch.toLowerCase())
  ).slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Sub Menu Tabs */}
      <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-slate-100 max-w-3xl mx-auto">
        {[
          { id: 'bulanan', name: 'Syahriyah Bulanan', icon: Calendar, path: '/syahriah/bulanan' },
          { id: 'harian', name: 'Titipan Harian', icon: Clock, path: '/syahriah/harian' },
          { id: 'riwayat', name: 'Riwayat & Cetak', icon: History, path: '/syahriah/riwayat' },
          { id: 'laporan', name: 'Laporan Keuangan', icon: Wallet, path: '/syahriah/laporan' }
        ].filter(tab => isAdmin || (tab.id !== 'bulanan' && tab.id !== 'harian')).map((tab) => (
          <Link
            key={tab.id}
            to={tab.path}
            onClick={() => {
              setIsEditing(false);
              setSelectedRecord(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all ${
              activeSubMenu === tab.id 
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100' 
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.name}</span>
          </Link>
        ))}
      </div>

      {activeSubMenu === 'laporan' ? (
        <FinancialReports 
          user={user}
          onPrint={(f) => generatePDF(f)}
          onEdit={(type, record) => {
            if (type === 'Finance') {
              setIsEditing(true);
              setSelectedRecord(record);
              navigate('/syahriah/bulanan');
              setFormData({
                santriIndex: santri.findIndex(s => s[3] === record[1]).toString(),
                namaSantri: record[2],
                santriId: record[1],
                bulan: record[4],
                tahun: record[5],
                tagihan: record[6],
                bayar: record[7],
                titipan: record[8],
                keterangan: record[10] || '',
                tanggal: record[11] || record[0].split('T')[0],
                selectedMonths: record[4].includes(',') ? record[4].split(',').map((m: string) => m.trim()) : [record[4]]
              });
              setSantriSearch(record[2]);
            } else if (type === 'Allowance') {
              navigate('/syahriah/harian', { state: { editRecord: record } });
            } else if (type === 'Tabungan') {
              navigate('/syahriah/tabungan', { state: { editRecord: record } });
            }
          }}
        />
      ) : activeSubMenu === 'riwayat' ? (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <History className="text-emerald-600" /> Riwayat Pembayaran
            </h3>
            <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
              <button 
                onClick={() => setRiwayatTab('bulanan')}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all ${riwayatTab === 'bulanan' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Bulanan
              </button>
              <button 
                onClick={() => setRiwayatTab('harian')}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all ${riwayatTab === 'harian' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Harian
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  <th className="px-4 py-3 min-w-[200px]">
                    <div className="space-y-2">
                      <span>Santri</span>
                      <div className="relative">
                        <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                          type="text" 
                          placeholder="Cari nama..."
                          value={riwayatFilters.santri}
                          onChange={(e) => setRiwayatFilters({...riwayatFilters, santri: e.target.value})}
                          className="w-full pl-7 pr-2 py-1 rounded-lg border border-slate-200 text-[10px] focus:ring-1 focus:ring-emerald-500 outline-none"
                        />
                      </div>
                    </div>
                  </th>
                  <th className="px-4 py-3">
                    <div className="space-y-2">
                      <span>Periode</span>
                      <div className="relative">
                        <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                          type="text" 
                          placeholder="Cari periode..."
                          value={riwayatFilters.periode}
                          onChange={(e) => setRiwayatFilters({...riwayatFilters, periode: e.target.value})}
                          className="w-full pl-7 pr-2 py-1 rounded-lg border border-slate-200 text-[10px] focus:ring-1 focus:ring-emerald-500 outline-none"
                        />
                      </div>
                    </div>
                  </th>
                  <th className="px-4 py-3">Bayar</th>
                  <th className="px-4 py-3">
                    <div className="space-y-2">
                      <span>Status</span>
                      <select 
                        value={riwayatFilters.status}
                        onChange={(e) => setRiwayatFilters({...riwayatFilters, status: e.target.value})}
                        className="w-full px-2 py-1 rounded-lg border border-slate-200 text-[10px] focus:ring-1 focus:ring-emerald-500 outline-none bg-white"
                      >
                        <option value="">Semua</option>
                        <option value="LUNAS">Lunas</option>
                        <option value="TUNGGAKAN">Tunggakan</option>
                      </select>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr><td colSpan={5} className="text-center py-8 text-slate-400">Memuat data...</td></tr>
                ) : finance.filter(f => {
                  const isHarian = f[4] === 'Harian';
                  if (riwayatTab === 'bulanan' && isHarian) return false;
                  if (riwayatTab === 'harian' && !isHarian) return false;
                  
                  const santriMatch = f[2]?.toLowerCase().includes(riwayatFilters.santri.toLowerCase()) || f[1]?.toLowerCase().includes(riwayatFilters.santri.toLowerCase());
                  const periodeStr = isHarian ? 'Harian' : `${f[4]} ${f[5]}`;
                  const periodeMatch = periodeStr.toLowerCase().includes(riwayatFilters.periode.toLowerCase());
                  const statusStr = parseIDR(f[9]) <= 0 ? 'LUNAS' : 'TUNGGAKAN';
                  const statusMatch = !riwayatFilters.status || statusStr === riwayatFilters.status;
                  
                  return santriMatch && periodeMatch && statusMatch;
                }).length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-8 text-slate-400">Belum ada data.</td></tr>
                ) : finance.filter(f => {
                  const isHarian = f[4] === 'Harian';
                  if (riwayatTab === 'bulanan' && isHarian) return false;
                  if (riwayatTab === 'harian' && !isHarian) return false;
                  
                  const santriMatch = f[2]?.toLowerCase().includes(riwayatFilters.santri.toLowerCase()) || f[1]?.toLowerCase().includes(riwayatFilters.santri.toLowerCase());
                  const periodeStr = isHarian ? 'Harian' : `${f[4]} ${f[5]}`;
                  const periodeMatch = periodeStr.toLowerCase().includes(riwayatFilters.periode.toLowerCase());
                  const statusStr = parseIDR(f[9]) <= 0 ? 'LUNAS' : 'TUNGGAKAN';
                  const statusMatch = !riwayatFilters.status || statusStr === riwayatFilters.status;
                  
                  return santriMatch && periodeMatch && statusMatch;
                }).map((f, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-4">
                      <p className="font-bold text-slate-800 text-sm">{f[2]}</p>
                      <p className="text-[10px] text-slate-400">ID: {f[1]} • Ayah: {f[3] || '-'}</p>
                      <p className="text-[10px] text-emerald-600 font-medium">{f[11] || '-'}</p>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600">
                      {f[4] === 'Harian' ? 'Harian' : `${f[4]} ${f[5]}`}
                    </td>
                    <td className="px-4 py-4">
                      {f[4] === 'Harian' ? (
                        <p className={`font-bold text-sm ${parseIDR(f[8]) < 0 ? 'text-red-600' : 'text-blue-600'}`}>
                          Rp {Math.abs(parseIDR(f[8])).toLocaleString('id-ID')}
                          {parseIDR(f[8]) < 0 ? ' (Keluar)' : ' (Masuk)'}
                        </p>
                      ) : (
                        <>
                          <p className="font-bold text-emerald-600 text-sm">Rp {parseIDR(f[7]).toLocaleString('id-ID')}</p>
                          {parseIDR(f[8]) > 0 && <p className="text-[10px] text-amber-600">Titipan: Rp {parseIDR(f[8]).toLocaleString('id-ID')}</p>}
                        </>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${parseIDR(f[9]) <= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {parseIDR(f[9]) <= 0 ? 'LUNAS' : 'TUNGGAKAN'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right space-x-2">
                      <button onClick={() => {
                        if (f[15] === 'Allowance') {
                          // Map back to Allowance format for printing
                          const isNew = f[2] !== 'Santri';
                          const amount = Math.abs(parseIDR(f[8])).toString();
                          const tipe = parseIDR(f[8]) < 0 ? 'Keluar' : 'Masuk';
                          const printData = isNew ? [f[0], f[1], f[2], f[3], '', amount, tipe, f[10], f[12]] : [f[0], f[1], amount, tipe, f[10], f[12]];
                          printAllowanceReceipt(printData, f[2]);
                        } else {
                          generatePDF(f);
                        }
                      }} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg" title="Cetak PDF">
                        <ImageIcon className="w-4 h-4" />
                      </button>
                      {isAdmin && (
                        <>
                          <button onClick={() => {
                            setIsEditing(true);
                            setSelectedRecord(f);
                            if (f[15] === 'Allowance') {
                              navigate('/syahriah/harian', { state: { editRecord: f } });
                            } else if (f[4] === 'Harian') {
                              setFormData({
                                santriIndex: santri.findIndex(s => s[3] === f[1]).toString(),
                                namaSantri: f[2],
                                santriId: f[1],
                                bulan: 'Harian',
                                tahun: f[5],
                                tagihan: '0',
                                bayar: '0',
                                titipan: f[8],
                                keterangan: f[10] || '',
                                tanggal: f[11] || f[0].split('T')[0],
                                selectedMonths: []
                              });
                              navigate('/syahriah/bulanan');
                            } else {
                              setFormData({
                                santriIndex: santri.findIndex(s => s[3] === f[1]).toString(),
                                namaSantri: f[2],
                                santriId: f[1],
                                bulan: f[4],
                                tahun: f[5],
                                tagihan: f[6],
                                bayar: f[7],
                                titipan: f[8],
                                keterangan: f[10] || '',
                                tanggal: f[11] || f[0].split('T')[0],
                                selectedMonths: f[4].includes(',') ? f[4].split(',').map((m: string) => m.trim()) : [f[4]]
                              });
                              navigate('/syahriah/bulanan');
                            }
                            setSantriSearch(f[2]);
                          }} className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg" title="Edit">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => setDeletingRecord(f)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Hapus">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Custom Confirmation Modal */}
          <AnimatePresence>
            {deletingRecord && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl"
                >
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Trash2 className="text-red-600 w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 text-center mb-2">Konfirmasi Hapus</h3>
                  <p className="text-slate-500 text-center mb-8">Apakah Anda yakin ingin menghapus riwayat pembayaran ini? Tindakan ini tidak bisa dibatalkan.</p>
                  <div className="flex gap-4">
                    <button 
                      onClick={() => setDeletingRecord(null)}
                      className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all"
                    >
                      Batal
                    </button>
                    <button 
                      onClick={() => handleDelete(deletingRecord)}
                      className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-lg shadow-red-100 transition-all"
                    >
                      Ya, Hapus
                    </button>
                  </div>
                </motion.div>
              </div>
            )}

            {alertInfo && (
              <div className="fixed bottom-8 right-8 z-50">
                <motion.div 
                  initial={{ y: 50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 50, opacity: 0 }}
                  className={`px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3 font-bold text-white ${alertInfo.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}
                >
                  {alertInfo.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                  {alertInfo.message}
                  <button onClick={() => setAlertInfo(null)} className="ml-4 hover:opacity-70">
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              </div>
            )}

            {showSettingsAlert && (
              <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border-2 border-amber-100"
                >
                  <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Settings className="text-amber-600 w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 text-center mb-2">Konfigurasi Belum Lengkap</h3>
                  <p className="text-slate-500 text-center mb-8">Kebijakan nominal tabungan belum diatur di Menu Pengaturan! Mohon hubungi admin untuk melengkapi konfigurasi.</p>
                  <button 
                    onClick={() => setShowSettingsAlert(false)}
                    className="w-full py-3 bg-amber-600 text-white font-bold rounded-xl hover:bg-amber-700 shadow-lg shadow-amber-100 transition-all"
                  >
                    Mengerti
                  </button>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        <div className="max-w-2xl mx-auto bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            {activeSubMenu === 'bulanan' ? <Calendar className="text-emerald-600" /> : <Clock className="text-amber-600" />}
            {isEditing ? 'Edit Data Pembayaran' : 'Input Syahriyah Bulanan'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="relative">
              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Cari & Pilih Santri</label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text"
                  placeholder="Ketik nama santri atau nama ayah..."
                  value={santriSearch}
                  onChange={(e) => {
                    setSantriSearch(e.target.value);
                    setShowSantriResults(true);
                  }}
                  onFocus={() => setShowSantriResults(true)}
                  onBlur={() => setTimeout(() => setShowSantriResults(false), 200)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                />
              </div>
              
              {showSantriResults && santriSearch.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                  {filteredSantri.length === 0 ? (
                    <p className="p-4 text-sm text-slate-500 text-center">Santri tidak ditemukan</p>
                  ) : (
                    filteredSantri.map((s) => {
                      const originalIndex = santri.indexOf(s);
                      return (
                        <button
                          key={originalIndex}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            const saldo = calculateTunggakan(s[3]);
                            const tarif = getSantriTarif(s);
                            setFormData({
                              ...formData,
                              santriIndex: originalIndex.toString(),
                              namaSantri: s[2],
                              santriId: s[3],
                              tagihan: saldo.toString(),
                              selectedMonths: []
                            });
                            setSantriSearch(`${s[2]} (Bpk. ${s[13]})`);
                            setShowSantriResults(false);
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-0 flex flex-col"
                        >
                          <span className="font-bold text-slate-800 text-sm">{s[2]}</span>
                          <span className="text-[10px] text-slate-500">Ayah: {s[13]} | Kelas: {s[22]}</span>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
              
              {formData.namaSantri && (
                <div className="mt-3 p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-emerald-700">Terpilih: {formData.namaSantri}</p>
                    {activeSubMenu === 'bulanan' && (() => {
                      const saldo = calculateTunggakan(formData.santriId);
                      return (
                        <p className={`text-[10px] font-bold ${saldo >= 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                          Saldo Santri: {saldo >= 0 ? 'Tunggakan' : 'Titipan'} Rp {Math.abs(saldo).toLocaleString('id-ID')}
                        </p>
                      );
                    })()}
                  </div>
                  <button 
                    type="button" 
                    onClick={() => {
                      setFormData({...formData, santriIndex: '', namaSantri: '', santriId: ''});
                      setSantriSearch('');
                    }}
                    className="text-emerald-600 hover:text-emerald-800 p-1"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Tanggal Pembayaran</label>
                <input 
                  type="date" 
                  value={formData.tanggal}
                  onChange={(e) => setFormData({...formData, tanggal: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Tahun</label>
                <input 
                  type="number" 
                  value={formData.tahun}
                  onChange={(e) => {
                    const saldo = calculateTunggakan(formData.santriId);
                    setFormData({...formData, tahun: e.target.value, selectedMonths: [], tagihan: saldo.toString()});
                  }}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {activeSubMenu === 'bulanan' && (
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Pilih Bulan Syahriyah</label>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100">
                      Nominal: Rp {getSantriTarif(santri[parseInt(formData.santriIndex)]).toLocaleString('id-ID')} / Bulan
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {MONTHS.map(m => {
                      const isPaid = getPaidMonths(formData.santriId, formData.tahun).includes(m);
                      const isSelected = formData.selectedMonths.includes(m);
                      const currentSantri = santri[parseInt(formData.santriIndex)];
                      const tarif = getSantriTarif(currentSantri);
                      
                      return (
                        <button
                          key={m}
                          type="button"
                          disabled={isPaid || isEditing}
                          onClick={() => {
                            const newSelected = isSelected 
                              ? formData.selectedMonths.filter(sm => sm !== m)
                              : [...formData.selectedMonths, m];
                            const saldo = calculateTunggakan(formData.santriId);
                            setFormData({
                              ...formData, 
                              selectedMonths: newSelected,
                              tagihan: (newSelected.length * tarif + saldo).toString()
                            });
                          }}
                          className={`py-2 px-1 rounded-xl text-[10px] font-bold border transition-all flex flex-col items-center justify-center gap-1 ${
                            isPaid 
                              ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' 
                              : isSelected
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-100'
                                : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-500 hover:text-emerald-600'
                          }`}
                        >
                          <span>{m}</span>
                          {isPaid && <span className="text-[8px] opacity-70">LUNAS</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {activeSubMenu === 'bulanan' ? (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Total Tagihan (Rp)</label>
                    <div className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-700">
                      Rp {formatIDR(formData.tagihan)}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {(() => {
                        const saldo = calculateTunggakan(formData.santriId);
                        const currentSantri = santri[parseInt(formData.santriIndex)];
                        const tarif = getSantriTarif(currentSantri);
                        let text = `*(${formData.selectedMonths.length} bln x Rp ${tarif.toLocaleString('id-ID')})`;
                        if (saldo !== 0) {
                          text += ` ${saldo > 0 ? '+' : '-'} Saldo Rp ${Math.abs(saldo).toLocaleString('id-ID')}`;
                        }
                        return text;
                      })()}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Jumlah Bayar (Rp)</label>
                    <input 
                      type="text" 
                      value={formatIDR(formData.bayar)}
                      onChange={(e) => setFormData({...formData, bayar: parseIDR(e.target.value)})}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-emerald-600"
                      placeholder="0"
                      required
                    />
                  </div>
                  <div>
                    {(() => {
                      const diff = parseIDR(formData.tagihan) - parseIDR(formData.bayar);
                      return (
                        <>
                          <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">
                            {diff >= 0 ? 'Kekurangan' : 'Titipan'} (Rp)
                          </label>
                          <div className={`w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 font-bold ${diff >= 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                            Rp {formatIDR(Math.abs(diff))}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Jumlah Titipan (Rp)</label>
                  <input 
                    type="text" 
                    value={formatIDR(formData.titipan)}
                    onChange={(e) => setFormData({...formData, titipan: parseIDR(e.target.value)})}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-blue-600"
                    placeholder="0"
                    required
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Keterangan</label>
              <textarea 
                value={formData.keterangan}
                onChange={(e) => setFormData({...formData, keterangan: e.target.value})}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
                rows={2}
                placeholder="Catatan tambahan..."
              />
            </div>

            <div className="flex gap-4">
              {isEditing && (
                <button 
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setSelectedRecord(null);
                    setFormData({...formData, santriIndex: '', namaSantri: '', bayar: '', titipan: '0'});
                    setSantriSearch('');
                  }}
                  className="flex-1 bg-slate-200 text-slate-700 py-4 rounded-2xl font-bold hover:bg-slate-300 transition-all"
                >
                  Batal
                </button>
              )}
              <button 
                type="submit"
                disabled={submitting}
                className="flex-[2] bg-emerald-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? 'Memproses...' : (isEditing ? 'Update Data' : 'Simpan Pembayaran')}
              </button>
            </div>
          </form>
        </div>
      )}

      <AnimatePresence>
        {showConfirmModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl"
            >
              <h3 className="text-xl font-bold text-slate-800 text-center mb-2">Konfirmasi Pembayaran</h3>
              <p className="text-slate-500 text-center mb-8">Apakah Anda yakin data pembayaran ini sudah benar dan ingin menyimpannya?</p>
              <div className="flex gap-3">
                <button 
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all"
                >
                  Batal
                </button>
                <button 
                  type="button"
                  onClick={executeSubmit}
                  disabled={submitting}
                  className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all disabled:opacity-50"
                >
                  {submitting ? 'Menyimpan...' : 'Ya, Simpan'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const FinancialReports = ({ onEdit, onPrint, user }: { 
  onEdit?: (type: 'Finance' | 'Allowance' | 'Tabungan', record: any) => void, 
  onPrint?: (record: any) => void,
  user?: any 
}) => {
  const [finance, setFinance] = useState<any[]>([]);
  const [allowances, setAllowances] = useState<any[]>([]);
  const [savings, setSavings] = useState<any[]>([]);
  const [santri, setSantri] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportTab, setReportTab] = useState<'syahriyah' | 'harian' | 'tabungan' | 'tabungan_ziarah'>('syahriyah');
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth());
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [colFilters, setColFilters] = useState<Record<string, string>>({});
  const [alertInfo, setAlertInfo] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [deletingRecord, setDeletingRecord] = useState<{sheet: string, id: string} | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [syahriahRes, titipanRes, financeRes, santriRes, allowanceRes, savingsRes] = await Promise.all([
        fetchWithCache('/api/data/Syahriah'),
        fetchWithCache('/api/data/TitipanHarian'),
        fetchWithCache('/api/data/Finance'),
        fetchWithCache('/api/data/Santri'),
        fetchWithCache('/api/data/Allowance'),
        fetchWithCache('/api/data/Tabungan')
      ]);
      
      const combined = [
        ...(Array.isArray(syahriahRes.data) ? syahriahRes.data.map((r: any) => {
          const newR = [...r];
          newR[15] = 'Syahriah';
          return newR;
        }) : []),
        ...(Array.isArray(titipanRes.data) ? titipanRes.data.map((r: any) => {
          const newR = [...r];
          newR[15] = 'TitipanHarian';
          return newR;
        }) : []),
        ...(Array.isArray(financeRes.data) ? financeRes.data.map((r: any) => {
          const newR = [...r];
          newR[15] = 'Finance';
          return newR;
        }) : [])
      ];
      
      // Sort by timestamp descending
      combined.sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());
      
      setFinance(combined);
      setSantri(Array.isArray(santriRes.data) ? santriRes.data : []);
      setAllowances(Array.isArray(allowanceRes.data) ? allowanceRes.data : []);
      setSavings(Array.isArray(savingsRes.data) ? savingsRes.data : []);
    } catch (err) {
      console.error("Failed to fetch report data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async () => {
    if (!deletingRecord) return;
    const { sheet, id } = deletingRecord;
    setDeletingRecord(null);
    try {
      await postWithOfflineQueue(`/api/data/${sheet}/delete`, { id, adminName: user?.username || 'System' });
      setAlertInfo({ message: 'Data berhasil dihapus!', type: 'success' });
      fetchData();
    } catch (err) {
      setAlertInfo({ message: 'Gagal menghapus data', type: 'error' });
    }
  };

  const syahriyahData = useMemo(() => {
    return finance.filter(f => {
      if (f[4] === 'Harian') return false;
      
      const monthName = filterMonth === -1 ? null : MONTHS[filterMonth];
      // Filter by Bulan (f[4]) and Tahun (f[5]) columns
      const dateMatch = (!monthName || f[4]?.includes(monthName)) && (!filterYear || f[5]?.toString() === filterYear.toString());
      
      const colMatch = Object.entries(colFilters).every(([col, val]) => {
        if (!val) return true;
        const index = parseInt(col);
        return String(f[index] || '').toLowerCase().includes(String(val).toLowerCase());
      });

      return dateMatch && colMatch;
    });
  }, [finance, filterYear, filterMonth, colFilters]);

  const allowanceData = useMemo(() => {
    const combined = [
      ...allowances.map(a => ({
        timestamp: a[0],
        santriId: a[1],
        jumlah: a.length > 6 ? a[5] : a[2],
        tipe: a.length > 6 ? a[6] : a[3],
        keterangan: a.length > 6 ? a[7] : a[4],
        admin: a.length > 6 ? a[8] : a[5],
        source: 'Allowance'
      })),
      ...finance.filter(f => f[4] === 'Harian').map(f => ({
        timestamp: f[0],
        santriId: f[1],
        jumlah: f[8], // Titipan column
        tipe: 'Masuk',
        keterangan: f[10] || 'Titipan Harian',
        admin: f[12],
        source: f[15] || 'Finance'
      }))
    ];

    return combined.filter(a => {
      const date = new Date(a.timestamp);
      return date.getFullYear() === filterYear && (filterMonth === -1 || date.getMonth() === filterMonth);
    }).filter(a => {
      return Object.entries(colFilters).every(([col, val]) => {
        if (!val) return true;
        if (col === 'santri') {
          const s = santri.find(st => st[3] === a.santriId);
          return (s?.[2] || '').toLowerCase().includes(String(val).toLowerCase());
        }
        // Map col index to property name for combined data
        const propMap: Record<string, string> = { '0': 'timestamp', '1': 'santriId', '2': 'jumlah', '3': 'tipe', '4': 'keterangan', '5': 'admin' };
        const prop = propMap[col];
        if (!prop) return true;
        return String((a as any)[prop] || '').toLowerCase().includes(String(val).toLowerCase());
      });
    });
  }, [allowances, finance, santri, filterYear, filterMonth, colFilters]);

  const tabunganData = useMemo(() => {
    const combined = [
      ...savings.map(a => ({
        timestamp: a[0],
        santriId: a[1],
        jumlah: a.length > 6 ? a[5] : a[2],
        tipe: a.length > 6 ? a[6] : a[3],
        keterangan: a.length > 6 ? a[7] : a[4],
        admin: a.length > 6 ? a[8] : a[5],
        source: 'Tabungan'
      })),
      ...finance.filter(f => f[4] === 'Tabungan').map(f => ({
        timestamp: f[0],
        santriId: f[1],
        jumlah: f[8], // Titipan column
        tipe: 'Masuk',
        keterangan: f[10] || 'Tabungan',
        admin: f[12],
        source: f[15] || 'Finance'
      }))
    ];

    return combined.filter(a => {
      const date = new Date(a.timestamp);
      return date.getFullYear() === filterYear && (filterMonth === -1 || date.getMonth() === filterMonth);
    }).filter(a => {
      return Object.entries(colFilters).every(([col, val]) => {
        if (!val) return true;
        if (col === 'santri') {
          const s = santri.find(st => st[3] === a.santriId);
          return (s?.[2] || '').toLowerCase().includes(String(val).toLowerCase());
        }
        const propMap: Record<string, string> = { '0': 'timestamp', '1': 'santriId', '2': 'jumlah', '3': 'tipe', '4': 'keterangan', '5': 'admin' };
        const prop = propMap[col];
        if (!prop) return true;
        return String((a as any)[prop] || '').toLowerCase().includes(String(val).toLowerCase());
      });
    });
  }, [savings, finance, santri, filterYear, filterMonth, colFilters]);

  const syahriyahBalances = useMemo(() => {
    const balances: Record<string, { id: string, nama: string, sisa: number, hutang: number }> = {};
    
    santri.forEach(s => {
      balances[s[3]] = { id: s[3], nama: s[2], sisa: 0, hutang: 0 };
    });

    // For Syahriyah, only the LATEST record for each santri matters
    const processedSantri = new Set();
    const sortedFinance = [...finance]
      .filter(f => f[4] !== 'Harian')
      .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());

    sortedFinance.forEach(f => {
      const santriId = f[1];
      if (processedSantri.has(santriId)) return;

      if (!balances[santriId]) balances[santriId] = { id: santriId, nama: f[2] || 'Unknown', sisa: 0, hutang: 0 };
      
      const tunggakan = parseIDR(f[9]);
      const titipan = parseIDR(f[8]);
      
      if (tunggakan < 0) {
        balances[santriId].sisa += Math.abs(tunggakan);
      } else {
        balances[santriId].hutang += tunggakan;
      }
      
      balances[santriId].sisa += titipan;
      processedSantri.add(santriId);
    });

    return Object.values(balances);
  }, [santri, finance]);

  const harianBalances = useMemo(() => {
    const balances: Record<string, { id: string, nama: string, sisa: number, boros: number }> = {};
    
    santri.forEach(s => {
      balances[s[3]] = { id: s[3], nama: s[2], sisa: 0, boros: 0 };
    });

    allowances.forEach(a => {
      const santriId = a[1];
      if (!balances[santriId]) balances[santriId] = { id: santriId, nama: 'Unknown', sisa: 0, boros: 0 };
      
      const amount = a.length > 6 ? parseIDR(a[5]) : parseIDR(a[2]);
      const tipe = a.length > 6 ? a[6] : a[3];
      if (tipe === 'Masuk') {
        balances[santriId].sisa += amount;
      } else if (tipe === 'Keluar') {
        balances[santriId].sisa -= amount;
        balances[santriId].boros += amount;
      }
    });

    // Also include Harian Titipan from finance sheet
    const sortedHarianFinance = [...finance]
      .filter(f => f[4] === 'Harian')
      .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());

    const processedHarianSantri = new Set();
    sortedHarianFinance.forEach(f => {
      const santriId = f[1];
      if (processedHarianSantri.has(santriId)) return;

      if (!balances[santriId]) balances[santriId] = { id: santriId, nama: f[2] || 'Unknown', sisa: 0, boros: 0 };
      
      const titipan = parseIDR(f[8]);
      balances[santriId].sisa += titipan;
      processedHarianSantri.add(santriId);
    });

    return Object.values(balances);
  }, [santri, allowances, finance]);

  const tabunganBalances = useMemo(() => {
    const balances: Record<string, { id: string, nama: string, sisa: number, boros: number }> = {};
    
    santri.forEach(s => {
      balances[s[3]] = { id: s[3], nama: s[2], sisa: 0, boros: 0 };
    });

    savings.forEach(a => {
      const santriId = a[1];
      if (!balances[santriId]) balances[santriId] = { id: santriId, nama: 'Unknown', sisa: 0, boros: 0 };
      
      const amount = a.length > 6 ? parseIDR(a[5]) : parseIDR(a[2]);
      const tipe = a.length > 6 ? a[6] : a[3];
      if (tipe === 'Masuk') {
        balances[santriId].sisa += amount;
      } else if (tipe === 'Keluar') {
        balances[santriId].sisa -= amount;
        balances[santriId].boros += amount;
      }
    });

    // Also include Tabungan from finance sheet
    const sortedTabunganFinance = [...finance]
      .filter(f => f[4] === 'Tabungan')
      .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());

    const processedTabunganSantri = new Set();
    sortedTabunganFinance.forEach(f => {
      const santriId = f[1];
      if (processedTabunganSantri.has(santriId)) return;

      if (!balances[santriId]) balances[santriId] = { id: santriId, nama: f[2] || 'Unknown', sisa: 0, boros: 0 };
      
      const titipan = parseIDR(f[8]);
      balances[santriId].sisa += titipan;
      processedTabunganSantri.add(santriId);
    });

    return Object.values(balances);
  }, [santri, savings, finance]);

  const syahriyahStats = useMemo(() => {
    const total = syahriyahData.reduce((acc, f) => acc + parseIDR(f[7]), 0);
    const count = syahriyahData.length;
    const tunggakan = syahriyahBalances.reduce((acc, s) => acc + Math.max(0, s.hutang), 0);
    const titipan = syahriyahBalances.reduce((acc, s) => acc + Math.max(0, s.sisa), 0);
    return { total, count, tunggakan, titipan };
  }, [syahriyahData, syahriyahBalances]);

  const allowanceStats = useMemo(() => {
    const masuk = allowanceData.filter(a => a.tipe === 'Masuk').reduce((acc, a) => acc + parseIDR(a.jumlah), 0);
    const keluar = allowanceData.filter(a => a.tipe === 'Keluar').reduce((acc, a) => acc + parseIDR(a.jumlah), 0);
    const totalSisa = harianBalances.reduce((acc, s) => acc + s.sisa, 0);
    return { masuk, keluar, saldo: totalSisa, count: allowanceData.length };
  }, [allowanceData, harianBalances]);

  const tabunganStats = useMemo(() => {
    const masuk = tabunganData.filter(a => a.tipe === 'Masuk').reduce((acc, a) => acc + parseIDR(a.jumlah), 0);
    const keluar = tabunganData.filter(a => a.tipe === 'Keluar').reduce((acc, a) => acc + parseIDR(a.jumlah), 0);
    const totalSisa = tabunganBalances.reduce((acc, s) => acc + s.sisa, 0);
    return { masuk, keluar, saldo: totalSisa, count: tabunganData.length };
  }, [tabunganData, tabunganBalances]);

  const tabunganZiarahData = useMemo(() => {
    return santri.map(s => ({
      id: s[3],
      nama: s[2],
      kelas: s[22],
      saldo: parseIDR(s[30] || '0')
    })).filter(s => {
      if (s.saldo === 0) return false;
      const colMatch = Object.entries(colFilters).every(([col, val]) => {
        if (!val) return true;
        const searchVal = String(val).toLowerCase();
        if (col === 'nama') return String(s.nama || '').toLowerCase().includes(searchVal);
        if (col === 'kelas') return String(s.kelas || '').toLowerCase().includes(searchVal);
        return true;
      });
      return colMatch;
    });
  }, [santri, colFilters]);

  const totalTabunganZiarah = useMemo(() => {
    return santri.reduce((acc, s) => acc + parseIDR(s[30] || '0'), 0);
  }, [santri]);

  const [modalData, setModalData] = useState<{ title: string, data: any[], type: 'sisa' | 'hutang' | 'boros' | 'irit' } | null>(null);
  const [ziarahResult, setZiarahResult] = useState<{ totalSantri: number, biayaPerSantri: number, totalRealized: number, totalDebt: number } | null>(null);
  const [isProcessingZiarah, setIsProcessingZiarah] = useState(false);
  const [showZiarahConfirm, setShowZiarahConfirm] = useState(false);

  const handleProcessZiarah = async () => {
    try {
      setIsProcessingZiarah(true);
      const res = await postWithOfflineQueue('/api/finance/process-ziarah', { adminName: user.name });
      setZiarahResult(res.data.summary);
      setShowZiarahConfirm(false);
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.error || "Gagal memproses ziarah");
    } finally {
      setIsProcessingZiarah(false);
    }
  };

  const exportReportPdf = () => {
    try {
      const doc = new jsPDF('portrait');
      
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('PONDOK PESANTREN SALAFIYAH QOUMIYAH', doc.internal.pageSize.width / 2, 15, { align: 'center' });
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      let title = '';
      let head: string[][] = [];
      let body: any[][] = [];

      if (reportTab === 'syahriyah') {
        title = `Laporan Syahriyah ${filterMonth === -1 ? 'Tahunan' : MONTHS[filterMonth]} ${filterYear}`;
        head = [['Tanggal', 'Nama Santri', 'Bulan dibayar', 'Tagihan', 'Bayar']];
        body = syahriyahData.map(f => [
          new Date(f[0]).toLocaleDateString('id-ID'),
          f[2] || '-',
          f[4] || '-',
          parseIDR(f[6]).toLocaleString('id-ID'),
          parseIDR(f[7]).toLocaleString('id-ID')
        ]);
      } else if (reportTab === 'harian') {
        title = `Laporan Uang Saku Harian ${filterMonth === -1 ? 'Tahunan' : MONTHS[filterMonth]} ${filterYear}`;
        head = [['Tanggal', 'Nama Santri', 'Tipe', 'Nominal', 'Keterangan']];
        body = allowanceData.map(f => {
          const s = santri.find(st => st[3] === f.santriId);
          return [
            new Date(f.timestamp).toLocaleDateString('id-ID'),
            s?.[2] || '-',
            f.tipe,
            parseIDR(f.jumlah).toLocaleString('id-ID'),
            f.keterangan || '-'
          ];
        });
      } else if (reportTab === 'tabungan') {
        title = `Laporan Tabungan Santri ${filterMonth === -1 ? 'Tahunan' : MONTHS[filterMonth]} ${filterYear}`;
        head = [['Tanggal', 'Nama Santri', 'Tipe', 'Nominal', 'Keterangan']];
        body = tabunganData.map(f => {
          const s = santri.find(st => st[3] === f.santriId);
          return [
            new Date(f.timestamp).toLocaleDateString('id-ID'),
            s?.[2] || '-',
            f.tipe,
            parseIDR(f.jumlah).toLocaleString('id-ID'),
            f.keterangan || '-'
          ];
        });
      } else {
        title = `Laporan Tabungan Ziarah Santri`;
        head = [['Nama Santri', 'Kelas', 'Saldo Terkumpul']];
        body = tabunganZiarahData.map(s => [
          s.nama,
          s.kelas || '-',
          s.saldo.toLocaleString('id-ID')
        ]);
      }

      doc.text(title, doc.internal.pageSize.width / 2, 22, { align: 'center' });
      doc.text(`Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}`, doc.internal.pageSize.width / 2, 28, { align: 'center' });
      
      doc.setLineWidth(0.5);
      doc.line(14, 32, doc.internal.pageSize.width - 14, 32);

      (doc as any).autoTable({
        startY: 38,
        head: head,
        body: body,
        theme: 'grid',
        headStyles: { fillColor: [5, 150, 105], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 8 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { top: 38 }
      });

      doc.save(`Laporan_Keuangan_${reportTab}_${new Date().getTime()}.pdf`);
    } catch (err) {
      console.error("Failed to generate PDF:", err);
      alert("Gagal mencetak dokumen PDF.");
    }
  };

  const showHutang = () => {
    const data = syahriyahBalances.filter(s => s.hutang > 0).sort((a, b) => b.hutang - a.hutang);
    setModalData({ title: 'Santri dengan Tunggakan Syahriyah', data, type: 'hutang' });
  };

  const showSisa = () => {
    const data = harianBalances.filter(s => s.sisa > 0).sort((a, b) => b.sisa - a.sisa);
    setModalData({ title: 'Santri dengan Sisa Titipan Harian', data, type: 'sisa' });
  };

  const showSyahriyahSisa = () => {
    const data = syahriyahBalances.filter(s => s.sisa > 0).sort((a, b) => b.sisa - a.sisa);
    setModalData({ title: 'Santri dengan Sisa Pembayaran Syahriyah', data, type: 'sisa' });
  };

  const handleDownload = (data: any[], fileName: string) => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
  };

  const downloadSyahriyah = () => {
    const exportData = syahriyahData.map(f => ({
      Tanggal: f[11] || f[0].split('T')[0],
      Santri: f[2],
      ID: f[1],
      Bulan: f[4],
      Tahun: f[5],
      Nominal: parseIDR(f[7]),
      Titipan: parseIDR(f[8]),
      Kekurangan: parseIDR(f[9]),
      Keterangan: f[10],
      Admin: f[12]
    }));
    handleDownload(exportData, `Laporan_Syahriyah_${filterMonth === -1 ? 'Tahun' : MONTHS[filterMonth]}_${filterYear}`);
  };

  const downloadHarian = () => {
    const exportData = allowanceData.map(a => {
      const s = santri.find(st => st[3] === a.santriId);
      return {
        Tanggal: a.timestamp.split('T')[0],
        Santri: s?.[2] || 'Santri',
        ID: a.santriId,
        Tipe: a.tipe,
        Nominal: parseIDR(a.jumlah),
        Keterangan: a.keterangan,
        Admin: a.admin
      };
    });
    handleDownload(exportData, `Laporan_Titipan_Harian_${filterMonth === -1 ? 'Tahun' : MONTHS[filterMonth]}_${filterYear}`);
  };

  const downloadTabungan = () => {
    const exportData = tabunganData.map(a => {
      const s = santri.find(st => st[3] === a.santriId);
      return {
        Tanggal: new Date(a.timestamp).toLocaleString('id-ID'),
        Santri: s?.[2] || 'Santri',
        ID: a.santriId,
        Tipe: a.tipe,
        Nominal: parseIDR(a.jumlah),
        Keterangan: a.keterangan,
        Admin: a.admin
      };
    });
    handleDownload(exportData, `Laporan_Tabungan_${filterMonth === -1 ? 'Tahun' : MONTHS[filterMonth]}_${filterYear}`);
  };

  const showBoros = () => {
    const data = harianBalances.filter(s => s.boros > 0).sort((a, b) => b.boros - a.boros).slice(0, 10);
    setModalData({ title: 'Santri Paling Boros (Pengambilan Terbanyak)', data, type: 'boros' });
  };

  const showIrit = () => {
    const data = harianBalances.filter(s => s.boros >= 0).sort((a, b) => a.boros - b.boros).slice(0, 10);
    setModalData({ title: 'Santri Paling Irit (Pengambilan Terkecil)', data, type: 'irit' });
  };

  const trendData = useMemo(() => {
    return MONTHS.map((name, index) => {
      const syahriyah = finance.reduce((acc, f) => {
        if (f[4] === 'Harian') return acc;
        const date = new Date(f[11] || f[0]);
        if (date.getMonth() === index && date.getFullYear() === filterYear) {
          return acc + parseIDR(f[7]);
        }
        return acc;
      }, 0);

      const allowance = allowances.reduce((acc, a) => {
        const date = new Date(a[0]);
        if (date.getMonth() === index && date.getFullYear() === filterYear && a[3] === 'Masuk') {
          return acc + parseIDR(a[2]);
        }
        return acc;
      }, 0) + finance.reduce((acc, f) => {
        if (f[4] !== 'Harian') return acc;
        const date = new Date(f[11] || f[0]);
        if (date.getMonth() === index && date.getFullYear() === filterYear) {
          return acc + parseIDR(f[8]); // Titipan column for Harian
        }
        return acc;
      }, 0);

      const saving = savings.reduce((acc, a) => {
        const date = new Date(a[0]);
        if (date.getMonth() === index && date.getFullYear() === filterYear && (a.length > 6 ? a[6] : a[3]) === 'Masuk') {
          return acc + (a.length > 6 ? parseIDR(a[5]) : parseIDR(a[2]));
        }
        return acc;
      }, 0) + finance.reduce((acc, f) => {
        if (f[4] !== 'Tabungan') return acc;
        const date = new Date(f[11] || f[0]);
        if (date.getMonth() === index && date.getFullYear() === filterYear) {
          return acc + parseIDR(f[8]); // Titipan column for Tabungan
        }
        return acc;
      }, 0);

      return { name: name.substring(0, 3), syahriyah, allowance, saving };
    });
  }, [finance, allowances, savings, filterYear]);

  if (loading) return <div className="p-8 text-center text-slate-400">Memuat laporan...</div>;

  return (
    <div className="space-y-8">
      {/* Top Filters */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-emerald-600" />
            <span className="text-sm font-bold text-slate-700">Filter Periode:</span>
          </div>
          <div className="flex items-center gap-3">
            <select 
              value={filterMonth}
              onChange={(e) => { setFilterMonth(parseInt(e.target.value)); setColFilters({}); }}
              className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value={-1}>Semua Bulan</option>
              {MONTHS.map((m, i) => (
                <option key={m} value={i}>{m}</option>
              ))}
            </select>
            <select 
              value={filterYear}
              onChange={(e) => { setFilterYear(parseInt(e.target.value)); setColFilters({}); }}
              className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {[2024, 2025, 2026, 2027].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        {reportTab === 'tabungan_ziarah' && (user.role === 'admin' || user.role === 'superadmin') && (
          <button 
            onClick={() => setShowZiarahConfirm(true)}
            className="px-6 py-2.5 bg-amber-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-amber-100 hover:bg-amber-700 transition-all flex items-center gap-2"
          >
            <Plane className="w-4 h-4" />
            Proses Keberangkatan Ziarah Wali 9
          </button>
        )}

        <div className="flex bg-slate-100 p-1 rounded-2xl">
          <button 
            onClick={() => { setReportTab('syahriyah'); setColFilters({}); }}
            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${reportTab === 'syahriyah' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Syahriyah
          </button>
          <button 
            onClick={() => { setReportTab('harian'); setColFilters({}); }}
            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${reportTab === 'harian' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Uang Saku
          </button>
          <button 
            onClick={() => { setReportTab('tabungan'); setColFilters({}); }}
            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${reportTab === 'tabungan' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Tabungan
          </button>
          <button 
            onClick={() => { setReportTab('tabungan_ziarah'); setColFilters({}); }}
            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${reportTab === 'tabungan_ziarah' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Tabungan Ziarah
          </button>
        </div>
      </div>

      {reportTab === 'syahriyah' ? (
        <div className="space-y-8">
          {/* Syahriyah Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4">
                <TrendingUp className="text-emerald-600" />
              </div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Pemasukan</p>
              <h4 className="text-2xl font-black text-slate-800 mt-1">Rp {syahriyahStats.total.toLocaleString('id-ID')}</h4>
              <p className="text-[10px] text-emerald-600 font-bold mt-1">{syahriyahStats.count} Transaksi</p>
            </div>
            <div 
              onClick={showHutang}
              className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm cursor-pointer hover:shadow-md hover:border-red-200 transition-all group"
            >
              <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Bell className="text-red-600" />
              </div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Tunggakan</p>
              <h4 className="text-2xl font-black text-slate-800 mt-1">Rp {syahriyahStats.tunggakan.toLocaleString('id-ID')}</h4>
              <p className="text-[10px] text-red-600 font-bold mt-1 flex items-center gap-1">
                Perlu ditindaklanjuti <ChevronRight className="w-3 h-3" />
              </p>
            </div>
            <div 
              onClick={showSyahriyahSisa}
              className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm cursor-pointer hover:shadow-md hover:border-blue-200 transition-all group"
            >
              <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Wallet className="text-blue-600" />
              </div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Titipan</p>
              <h4 className="text-2xl font-black text-slate-800 mt-1">Rp {syahriyahStats.titipan.toLocaleString('id-ID')}</h4>
              <p className="text-[10px] text-blue-600 font-bold mt-1 flex items-center gap-1">
                Lihat detail <ChevronRight className="w-3 h-3" />
              </p>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mb-4">
                <Calendar className="text-slate-600" />
              </div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Periode Laporan</p>
              <h4 className="text-2xl font-black text-slate-800 mt-1">{filterMonth === -1 ? 'Tahun' : MONTHS[filterMonth]} {filterYear}</h4>
              <p className="text-[10px] text-slate-600 font-bold mt-1">Data Real-time</p>
            </div>
          </div>

          {/* Syahriyah Chart */}
          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-8">Tren Pemasukan Syahriyah {filterYear}</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="colorSyahriyah" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }} tickFormatter={(v) => `Rp ${v/1000}k`} />
                  <Tooltip 
                    formatter={(value: number) => `Rp ${value.toLocaleString('id-ID')}`}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Area type="monotone" dataKey="syahriyah" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorSyahriyah)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Syahriyah Table */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-50 flex justify-between items-center">
              <h3 className="font-bold text-slate-800">Data Transaksi Syahriyah</h3>
              <div className="flex gap-2">
                <button 
                  onClick={exportReportPdf}
                  className="p-2 text-slate-400 hover:text-emerald-600 transition-colors"
                  title="Cetak PDF"
                >
                  <FileText className="w-5 h-5" />
                </button>
                <button 
                  onClick={downloadSyahriyah}
                  className="p-2 text-slate-400 hover:text-emerald-600 transition-colors"
                  title="Download Excel"
                >
                  <Download className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                    <th className="px-6 py-4">
                      <div className="space-y-2">
                        <span>Tanggal</span>
                        <input 
                          type="text" 
                          placeholder="Filter..." 
                          className="block w-full px-2 py-1 text-[10px] border border-slate-200 rounded-lg font-normal normal-case"
                          onChange={(e) => setColFilters({...colFilters, '11': e.target.value})}
                        />
                      </div>
                    </th>
                    <th className="px-6 py-4">
                      <div className="space-y-2">
                        <span>Santri</span>
                        <input 
                          type="text" 
                          placeholder="Filter..." 
                          className="block w-full px-2 py-1 text-[10px] border border-slate-200 rounded-lg font-normal normal-case"
                          onChange={(e) => setColFilters({...colFilters, '2': e.target.value})}
                        />
                      </div>
                    </th>
                    <th className="px-6 py-4">
                      <div className="space-y-2">
                        <span>Bulan</span>
                        <input 
                          type="text" 
                          placeholder="Filter..." 
                          className="block w-full px-2 py-1 text-[10px] border border-slate-200 rounded-lg font-normal normal-case"
                          onChange={(e) => setColFilters({...colFilters, '4': e.target.value})}
                        />
                      </div>
                    </th>
                    <th className="px-6 py-4 text-right">Nominal</th>
                    <th className="px-6 py-4 text-right">Titipan</th>
                    <th className="px-6 py-4 text-right">Kekurangan</th>
                    <th className="px-6 py-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {syahriyahData.map((f, i) => (
                    <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 text-xs text-slate-600 font-medium">{f[11] || f[0].split('T')[0]}</td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-slate-800">{f[2]}</p>
                        <p className="text-[10px] text-slate-400">ID: {f[1]}</p>
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-600">{f[4]} {f[5]}</td>
                      <td className="px-6 py-4 text-right text-sm font-black text-emerald-600">Rp {parseIDR(f[7]).toLocaleString('id-ID')}</td>
                      <td className="px-6 py-4 text-right text-sm font-bold text-blue-600">Rp {parseIDR(f[8]).toLocaleString('id-ID')}</td>
                      <td className="px-6 py-4 text-right text-sm font-bold text-red-600">Rp {parseIDR(f[9]).toLocaleString('id-ID')}</td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center gap-2">
                          <button 
                            onClick={() => onPrint?.(f)}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 transition-colors"
                            title="Cetak Bukti"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => onEdit?.(
                              (f[15] === 'Allowance' || f[15] === 'TitipanHarian') ? 'Allowance' : 
                              (f[15] === 'Tabungan') ? 'Tabungan' : 'Finance', 
                              f
                            )}
                            className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => setDeletingRecord({ sheet: f[15] || 'Finance', id: f[0] })}
                            className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : reportTab === 'harian' ? (
        <div className="space-y-8">
          {/* Allowance Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div 
              onClick={showIrit}
              className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm cursor-pointer hover:shadow-md hover:border-blue-200 transition-all group"
            >
              <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <ArrowUpRight className="text-blue-600" />
              </div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Titipan Masuk</p>
              <h4 className="text-2xl font-black text-slate-800 mt-1">Rp {allowanceStats.masuk.toLocaleString('id-ID')}</h4>
              <p className="text-[10px] text-blue-600 font-bold mt-1 flex items-center gap-1">
                Lihat Santri Irit <ChevronRight className="w-3 h-3" />
              </p>
            </div>
            <div 
              onClick={showBoros}
              className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm cursor-pointer hover:shadow-md hover:border-amber-200 transition-all group"
            >
              <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <ArrowDownRight className="text-amber-600" />
              </div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Pengambilan</p>
              <h4 className="text-2xl font-black text-slate-800 mt-1">Rp {allowanceStats.keluar.toLocaleString('id-ID')}</h4>
              <p className="text-[10px] text-amber-600 font-bold mt-1 flex items-center gap-1">
                Lihat Santri Boros <ChevronRight className="w-3 h-3" />
              </p>
            </div>
            <div 
              onClick={showSisa}
              className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm cursor-pointer hover:shadow-md hover:border-emerald-200 transition-all group"
            >
              <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Wallet className="text-emerald-600" />
              </div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Saldo Akhir Periode</p>
              <h4 className="text-2xl font-black text-slate-800 mt-1">Rp {allowanceStats.saldo.toLocaleString('id-ID')}</h4>
              <p className="text-[10px] text-emerald-600 font-bold mt-1 flex items-center gap-1">
                Lihat Santri Bersisa <ChevronRight className="w-3 h-3" />
              </p>
            </div>
          </div>

          {/* Allowance Chart */}
          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-8">Tren Titipan Harian {filterYear}</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="colorAllowance" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }} tickFormatter={(v) => `Rp ${v/1000}k`} />
                  <Tooltip 
                    formatter={(value: number) => `Rp ${value.toLocaleString('id-ID')}`}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Area type="monotone" dataKey="allowance" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorAllowance)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Allowance Table */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-50 flex justify-between items-center">
              <h3 className="font-bold text-slate-800">Data Transaksi Titipan Harian</h3>
              <div className="flex gap-2">
                <button 
                  onClick={exportReportPdf}
                  className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                  title="Cetak PDF"
                >
                  <FileText className="w-5 h-5" />
                </button>
                <button 
                  onClick={downloadHarian}
                  className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                  title="Download Excel"
                >
                  <Download className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                    <th className="px-6 py-4">
                      <div className="space-y-2">
                        <span>Tanggal</span>
                        <input 
                          type="text" 
                          placeholder="Filter..." 
                          className="block w-full px-2 py-1 text-[10px] border border-slate-200 rounded-lg font-normal normal-case"
                          onChange={(e) => setColFilters({...colFilters, '0': e.target.value})}
                        />
                      </div>
                    </th>
                    <th className="px-6 py-4">
                      <div className="space-y-2">
                        <span>Santri</span>
                        <input 
                          type="text" 
                          placeholder="Filter..." 
                          className="block w-full px-2 py-1 text-[10px] border border-slate-200 rounded-lg font-normal normal-case"
                          onChange={(e) => setColFilters({...colFilters, 'santri': e.target.value})}
                        />
                      </div>
                    </th>
                    <th className="px-6 py-4">
                      <div className="space-y-2">
                        <span>Tipe</span>
                        <input 
                          type="text" 
                          placeholder="Filter..." 
                          className="block w-full px-2 py-1 text-[10px] border border-slate-200 rounded-lg font-normal normal-case"
                          onChange={(e) => setColFilters({...colFilters, '3': e.target.value})}
                        />
                      </div>
                    </th>
                    <th className="px-6 py-4 text-right">Nominal</th>
                    <th className="px-6 py-4">Keterangan</th>
                    <th className="px-6 py-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {allowanceData.map((a, i) => {
                    const s = santri.find(st => st[3] === a.santriId);

                    return (
                      <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 text-xs text-slate-600 font-medium">{a.timestamp.split('T')[0]}</td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-slate-800">{s?.[2] || 'Santri'}</p>
                          <p className="text-[10px] text-slate-400">ID: {a.santriId}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${a.tipe === 'Masuk' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
                            {a.tipe}
                          </span>
                        </td>
                        <td className={`px-6 py-4 text-right text-sm font-black ${a.tipe === 'Masuk' ? 'text-emerald-600' : 'text-amber-600'}`}>
                          Rp {parseIDR(a.jumlah).toLocaleString('id-ID')}
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-500">{a.keterangan}</td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center gap-2">
                            <button 
                              onClick={() => {
                                if (a.source === 'Allowance') {
                                  printAllowanceReceipt([a.timestamp, a.santriId, a.jumlah, a.tipe, a.keterangan, a.admin], s?.[2] || 'Santri');
                                } else {
                                  // For Finance Harian, we might need a different print function or adapt this one
                                  printAllowanceReceipt([a.timestamp, a.santriId, a.jumlah, a.tipe, a.keterangan, a.admin], s?.[2] || 'Santri');
                                }
                              }}
                              className="p-1.5 text-slate-400 hover:text-emerald-600 transition-colors"
                              title="Cetak Bukti"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => onEdit?.(
                                (a.source === 'Allowance' || a.source === 'TitipanHarian') ? 'Allowance' : 
                                (a.source === 'Tabungan') ? 'Tabungan' : 'Finance', 
                                a.source === 'Allowance' || a.source === 'TitipanHarian' ? [a.timestamp, a.santriId, a.jumlah, a.tipe, a.keterangan, a.admin] : [a.timestamp, a.santriId, s?.[2], s?.[13], 'Harian', '', '0', a.jumlah, '0', '0', a.keterangan, a.timestamp, a.admin]
                              )}
                              className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => setDeletingRecord({ sheet: a.source, id: a.timestamp })}
                              className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : reportTab === 'tabungan_ziarah' ? (
        <div className="space-y-8">
          {ziarahResult && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-emerald-50 border-2 border-emerald-100 p-8 rounded-3xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4">
                <button onClick={() => setZiarahResult(null)} className="text-emerald-400 hover:text-emerald-600">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-emerald-900">Realisasi Ziarah Berhasil!</h3>
                  <p className="text-emerald-700 text-sm font-medium">Dana telah dipotong untuk {ziarahResult.totalSantri} santri aktif.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="bg-white/60 backdrop-blur-sm p-4 rounded-2xl border border-emerald-100">
                  <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">Biaya Per Santri</p>
                  <p className="text-xl font-black text-emerald-900">Rp {ziarahResult.biayaPerSantri.toLocaleString('id-ID')}</p>
                </div>
                <div className="bg-white/60 backdrop-blur-sm p-4 rounded-2xl border border-emerald-100">
                  <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">Total Dana Direalisasikan</p>
                  <p className="text-xl font-black text-emerald-900">Rp {ziarahResult.totalRealized.toLocaleString('id-ID')}</p>
                </div>
                <div className="bg-white/60 backdrop-blur-sm p-4 rounded-2xl border border-emerald-100">
                  <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">Total Piutang Ziarah</p>
                  <p className="text-xl font-black text-red-600">Rp {ziarahResult.totalDebt.toLocaleString('id-ID')}</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Tabungan Ziarah Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center mb-4">
                <Wallet className="text-amber-600" />
              </div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Seluruh Tabungan Ziarah Tersimpan</p>
              <h4 className="text-2xl font-black text-slate-800 mt-1">Rp {totalTabunganZiarah.toLocaleString('id-ID')}</h4>
              <p className="text-[10px] text-amber-600 font-bold mt-1">Akumulasi dari Syahriyah</p>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center mb-4">
                <TrendingDown className="text-red-600" />
              </div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Piutang Ziarah (Minus)</p>
              <h4 className="text-2xl font-black text-red-600 mt-1">
                Rp {santri.reduce((acc, s) => {
                  const val = parseIDR(s[30] || '0');
                  return val < 0 ? acc + Math.abs(val) : acc;
                }, 0).toLocaleString('id-ID')}
              </h4>
              <p className="text-[10px] text-red-600 font-bold mt-1">Kekurangan biaya ziarah</p>
            </div>
          </div>

          {/* Tabungan Ziarah Table */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-50 flex justify-between items-center">
              <h3 className="font-bold text-slate-800">
                {ziarahResult ? "Daftar Santri dengan Piutang Ziarah" : "Daftar Saldo Tabungan Ziarah"}
              </h3>
              <div className="flex gap-2">
                <button 
                  onClick={exportReportPdf}
                  className="p-2 text-slate-400 hover:text-amber-600 transition-colors"
                  title="Cetak PDF"
                >
                  <FileText className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => handleDownload(
                    ziarahResult ? tabunganZiarahData.filter(s => s.saldo < 0) : tabunganZiarahData, 
                    ziarahResult ? 'Laporan_Piutang_Ziarah' : 'Laporan_Tabungan_Ziarah'
                  )}
                  className="p-2 text-slate-400 hover:text-amber-600 transition-colors"
                  title="Download Excel"
                >
                  <Download className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                    <th className="px-6 py-4">
                      <div className="space-y-2">
                        <span>Nama Santri</span>
                        <input 
                          type="text" 
                          placeholder="Filter..." 
                          className="block w-full px-2 py-1 text-[10px] border border-slate-200 rounded-lg font-normal normal-case"
                          onChange={(e) => setColFilters({...colFilters, 'nama': e.target.value})}
                        />
                      </div>
                    </th>
                    <th className="px-6 py-4">
                      <div className="space-y-2">
                        <span>Kelas Formal</span>
                        <input 
                          type="text" 
                          placeholder="Filter..." 
                          className="block w-full px-2 py-1 text-[10px] border border-slate-200 rounded-lg font-normal normal-case"
                          onChange={(e) => setColFilters({...colFilters, 'kelas': e.target.value})}
                        />
                      </div>
                    </th>
                    <th className="px-6 py-4">Total Saldo / Piutang</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {(ziarahResult ? tabunganZiarahData.filter(s => s.saldo < 0) : tabunganZiarahData).length === 0 ? (
                    <tr><td colSpan={3} className="text-center py-8 text-slate-400">Tidak ada data yang sesuai.</td></tr>
                  ) : (ziarahResult ? tabunganZiarahData.filter(s => s.saldo < 0) : tabunganZiarahData).map((s, i) => (
                    <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-slate-800">{s.nama}</p>
                        <p className="text-[10px] text-slate-400">ID: {s.id}</p>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-600 font-medium">{s.kelas}</td>
                      <td className="px-6 py-4">
                        <p className={`font-black text-sm ${s.saldo < 0 ? 'text-red-600' : 'text-amber-600'}`}>
                          {s.saldo < 0 ? `Hutang: Rp ${Math.abs(s.saldo).toLocaleString('id-ID')}` : `Saldo: Rp ${s.saldo.toLocaleString('id-ID')}`}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Tabungan Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4">
                <TrendingUp className="text-emerald-600" />
              </div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Tabungan Masuk</p>
              <h4 className="text-2xl font-black text-slate-800 mt-1">Rp {tabunganStats.masuk.toLocaleString('id-ID')}</h4>
              <p className="text-[10px] text-emerald-600 font-bold mt-1">{tabunganStats.count} Transaksi</p>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center mb-4">
                <TrendingDown className="text-red-600" />
              </div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Penarikan</p>
              <h4 className="text-2xl font-black text-slate-800 mt-1">Rp {tabunganStats.keluar.toLocaleString('id-ID')}</h4>
              <p className="text-[10px] text-red-600 font-bold mt-1">Tabungan Keluar</p>
            </div>
            <div 
              onClick={() => {
                const data = tabunganBalances.filter(s => s.sisa > 0).sort((a, b) => b.sisa - a.sisa);
                setModalData({ title: 'Santri dengan Saldo Tabungan', data, type: 'sisa' });
              }}
              className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm cursor-pointer hover:shadow-md hover:border-emerald-200 transition-all group"
            >
              <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Wallet className="text-emerald-600" />
              </div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Saldo Tabungan</p>
              <h4 className="text-2xl font-black text-slate-800 mt-1">Rp {tabunganStats.saldo.toLocaleString('id-ID')}</h4>
              <p className="text-[10px] text-emerald-600 font-bold mt-1 flex items-center gap-1">
                Lihat detail santri <ChevronRight className="w-3 h-3" />
              </p>
            </div>
          </div>

          {/* Tabungan Chart */}
          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-8">Tren Tabungan Santri {filterYear}</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="colorSaving" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }} tickFormatter={(v) => `Rp ${v/1000}k`} />
                  <Tooltip 
                    formatter={(value: number) => `Rp ${value.toLocaleString('id-ID')}`}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Area type="monotone" dataKey="saving" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorSaving)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tabungan Table */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-50 flex justify-between items-center">
              <h3 className="font-bold text-slate-800">Data Transaksi Tabungan</h3>
              <div className="flex gap-2">
                <button 
                  onClick={exportReportPdf}
                  className="p-2 text-slate-400 hover:text-emerald-600 transition-colors"
                  title="Cetak PDF"
                >
                  <FileText className="w-5 h-5" />
                </button>
                <button 
                  onClick={downloadTabungan}
                  className="p-2 text-slate-400 hover:text-emerald-600 transition-colors"
                  title="Download Excel"
                >
                  <Download className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                    <th className="px-6 py-4">
                      <div className="space-y-2">
                        <span>Tanggal</span>
                        <input 
                          type="text" 
                          placeholder="Filter..." 
                          className="block w-full px-2 py-1 text-[10px] border border-slate-200 rounded-lg font-normal normal-case"
                          onChange={(e) => setColFilters({...colFilters, '0': e.target.value})}
                        />
                      </div>
                    </th>
                    <th className="px-6 py-4">
                      <div className="space-y-2">
                        <span>Santri</span>
                        <input 
                          type="text" 
                          placeholder="Filter..." 
                          className="block w-full px-2 py-1 text-[10px] border border-slate-200 rounded-lg font-normal normal-case"
                          onChange={(e) => setColFilters({...colFilters, 'santri': e.target.value})}
                        />
                      </div>
                    </th>
                    <th className="px-6 py-4">
                      <div className="space-y-2">
                        <span>Jumlah</span>
                        <input 
                          type="text" 
                          placeholder="Filter..." 
                          className="block w-full px-2 py-1 text-[10px] border border-slate-200 rounded-lg font-normal normal-case"
                          onChange={(e) => setColFilters({...colFilters, '2': e.target.value})}
                        />
                      </div>
                    </th>
                    <th className="px-6 py-4">
                      <div className="space-y-2">
                        <span>Tipe</span>
                        <input 
                          type="text" 
                          placeholder="Filter..." 
                          className="block w-full px-2 py-1 text-[10px] border border-slate-200 rounded-lg font-normal normal-case"
                          onChange={(e) => setColFilters({...colFilters, '3': e.target.value})}
                        />
                      </div>
                    </th>
                    <th className="px-6 py-4">
                      <div className="space-y-2">
                        <span>Keterangan</span>
                        <input 
                          type="text" 
                          placeholder="Filter..." 
                          className="block w-full px-2 py-1 text-[10px] border border-slate-200 rounded-lg font-normal normal-case"
                          onChange={(e) => setColFilters({...colFilters, '4': e.target.value})}
                        />
                      </div>
                    </th>
                    <th className="px-6 py-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {tabunganData.map((a, i) => {
                    const s = santri.find(st => st[3] === a.santriId);
                    return (
                      <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 text-xs text-slate-600 font-medium">{new Date(a.timestamp).toLocaleString('id-ID')}</td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-slate-800">{s?.[2] || 'Unknown'}</p>
                          <p className="text-[10px] text-slate-400">ID: {a.santriId}</p>
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-700">Rp {parseIDR(a.jumlah).toLocaleString('id-ID')}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${a.tipe === 'Masuk' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                            {a.tipe}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-500">{a.keterangan}</td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center gap-2">
                            <button 
                              onClick={() => {
                                printAllowanceReceipt([a.timestamp, a.santriId, a.jumlah, a.tipe, a.keterangan, a.admin], s?.[2] || 'Santri');
                              }}
                              className="p-1.5 text-slate-400 hover:text-emerald-600 transition-colors"
                              title="Cetak Bukti"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => onEdit?.(
                                (a.source === 'Tabungan') ? 'Tabungan' : 
                                (a.source === 'Allowance' || a.source === 'TitipanHarian') ? 'Allowance' : 'Finance', 
                                a.source === 'Tabungan' ? [a.timestamp, a.santriId, a.jumlah, a.tipe, a.keterangan, a.admin] : [a.timestamp, a.santriId, s?.[2], s?.[13], 'Tabungan', '', '0', a.jumlah, '0', '0', a.keterangan, a.timestamp, a.admin]
                              )}
                              className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => setDeletingRecord({ sheet: a.source, id: a.timestamp })}
                              className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {modalData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
              onClick={() => setModalData(null)}
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="text-lg font-bold text-slate-800">{modalData.title}</h3>
                <button 
                  onClick={() => setModalData(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto flex-1">
                {modalData.data.length > 0 ? (
                  <div className="space-y-3">
                    {modalData.data.map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 hover:border-blue-100 hover:bg-blue-50/30 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 font-bold">
                            {i + 1}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800">{item.nama}</p>
                            <p className="text-xs text-slate-500">ID: {item.id}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          {modalData.type === 'hutang' && (
                            <p className="font-black text-red-600">Rp {item.hutang.toLocaleString('id-ID')}</p>
                          )}
                          {modalData.type === 'sisa' && (
                            <p className="font-black text-emerald-600">Rp {item.sisa.toLocaleString('id-ID')}</p>
                          )}
                          {(modalData.type === 'boros' || modalData.type === 'irit') && (
                            <p className="font-black text-amber-600">Rp {item.boros.toLocaleString('id-ID')}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-8 h-8 text-slate-300" />
                    </div>
                    <p className="text-slate-500 font-medium">Tidak ada data yang sesuai kriteria.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showZiarahConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-100"
            >
              <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                <Plane className="w-8 h-8 text-amber-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 text-center mb-2">Konfirmasi Keberangkatan</h3>
              <p className="text-slate-500 text-center mb-8">
                Apakah Anda yakin ingin memproses keberangkatan ziarah massal? 
                Sistem akan memotong saldo tabungan seluruh santri aktif sesuai biaya yang diatur di pengaturan. 
                Santri dengan saldo kurang akan tercatat memiliki piutang.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowZiarahConfirm(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all"
                >
                  Batal
                </button>
                <button 
                  onClick={handleProcessZiarah}
                  disabled={isProcessingZiarah}
                  className="flex-1 py-3 bg-amber-600 text-white font-bold rounded-xl hover:bg-amber-700 shadow-lg shadow-amber-100 transition-all flex items-center justify-center gap-2"
                >
                  {isProcessingZiarah ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    "Ya, Proses Sekarang"
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {deletingRecord && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-slate-100"
            >
              <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 text-center mb-2">Konfirmasi Hapus</h3>
              <p className="text-slate-500 text-center mb-8">Apakah Anda yakin ingin menghapus data transaksi ini? Tindakan ini tidak dapat dibatalkan.</p>
              <div className="flex gap-4">
                <button 
                  onClick={() => setDeletingRecord(null)}
                  className="flex-1 px-6 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
                <button 
                  onClick={handleDelete}
                  className="flex-1 px-6 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-200"
                >
                  Hapus
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Alert Toast */}
      <AnimatePresence>
        {alertInfo && (
          <div className="fixed bottom-8 right-8 z-50">
            <motion.div 
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className={`px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3 font-bold text-white ${alertInfo.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}
            >
              {alertInfo.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
              {alertInfo.message}
              <button onClick={() => setAlertInfo(null)} className="ml-4 hover:opacity-70">
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const AcademicProgress = () => {
  const [santri, setSantri] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSantri = async () => {
      try {
        const res = await fetchWithCache('/api/data/Santri');
        if (Array.isArray(res.data)) {
          setSantri(res.data);
        } else {
          setSantri([]);
        }
      } catch (err) {
        console.error("Failed to fetch santri:", err);
        setSantri([]);
      } finally {
        setLoading(false);
      }
    };
    fetchSantri();
  }, []);

  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
      <h2 className="text-xl font-bold text-slate-800 mb-6">Progress Tahfidz & Yanbu'a</h2>
      <div className="space-y-6">
        {loading ? (
          <p className="text-center text-slate-400 py-8">Memuat data...</p>
        ) : santri.length === 0 ? (
          <p className="text-center text-slate-400 py-8">Belum ada data akademik.</p>
        ) : santri.map((s, i) => (
          <div key={i} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-bold text-slate-800">{s[2]}</h4>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full">{s[23]}</span>
            </div>
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full w-1/3"></div>
            </div>
            <p className="text-[10px] text-slate-500 mt-2 font-medium">Terakhir Update: {new Date(s[0]).toLocaleDateString('id-ID')}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

const PhotoGallery = ({ isAdmin, user }: { isAdmin: boolean, user?: any }) => {
  const [albums, setAlbums] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({ namaAcara: '', tanggal: '' });
  const [photos, setPhotos] = useState<FileList | null>(null);

  const fetchGallery = async () => {
    try {
      const res = await fetchWithCache('/api/data/Gallery');
      if (Array.isArray(res.data)) {
        setAlbums(res.data);
      } else {
        setAlbums([]);
      }
    } catch (err) {
      console.error("Failed to fetch gallery:", err);
      setAlbums([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGallery();
  }, []);

  const handleUpload = async () => {
    if (!formData.namaAcara || !formData.tanggal || !photos || photos.length === 0) {
      alert("Mohon lengkapi data acara dan pilih foto.");
      return;
    }

    setUploading(true);
    const data = new FormData();
    data.append('namaAcara', formData.namaAcara);
    data.append('tanggal', formData.tanggal);
    data.append('adminName', user?.username || 'System');
    for (let i = 0; i < photos.length; i++) {
      data.append('photos', photos[i]);
    }

    try {
      await postWithOfflineQueue('/api/gallery', data);
      setFormData({ namaAcara: '', tanggal: '' });
      setPhotos(null);
      fetchGallery();
    } catch (err) {
      console.error("Failed to upload gallery:", err);
      alert("Gagal mengupload foto.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {isAdmin && (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Tambah Album Baru</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input 
              type="text" 
              placeholder="Nama Acara" 
              value={formData.namaAcara}
              onChange={(e) => setFormData({...formData, namaAcara: e.target.value})}
              className="px-4 py-2 rounded-xl border border-slate-200" 
            />
            <input 
              type="date" 
              value={formData.tanggal}
              onChange={(e) => setFormData({...formData, tanggal: e.target.value})}
              className="px-4 py-2 rounded-xl border border-slate-200" 
            />
            <input 
              type="file" 
              multiple 
              onChange={(e) => setPhotos(e.target.files)}
              className="text-sm" 
            />
          </div>
          <button 
            onClick={handleUpload}
            disabled={uploading}
            className="mt-4 bg-emerald-600 text-white px-6 py-2 rounded-xl font-bold disabled:opacity-50"
          >
            {uploading ? 'Mengupload...' : 'Upload Foto'}
          </button>
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {loading ? (
          <p className="col-span-full text-center text-slate-400 py-8">Memuat galeri...</p>
        ) : albums.length === 0 ? (
          <p className="col-span-full text-center text-slate-400 py-8">Belum ada album foto.</p>
        ) : albums.map((album, i) => {
          const urls = album[3]?.split(',') || [];
          return urls.map((url: string, j: number) => (
            <div key={`${i}-${j}`} className="aspect-square bg-slate-200 rounded-2xl overflow-hidden relative group">
              <img src={formatImageUrl(url)} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">
                {album[1]}
              </div>
            </div>
          ));
        })}
      </div>
    </div>
  );
};

const BulkWhatsApp = ({ user }: { user: any }) => {
  const [santriData, setSantriData] = useState<any[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'class'>('all');
  const [selectedClass, setSelectedClass] = useState('');
  const [messageTemplate, setMessageTemplate] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, success: 0, fail: 0 });
  const [showConfirm, setShowConfirm] = useState(false);
  const [targets, setTargets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSantri = async () => {
      try {
        const res = await fetchWithCache('/api/data/Santri');
        if (Array.isArray(res.data)) {
          setSantriData(res.data);
        }
      } catch (err) {
        console.error("Failed to fetch santri:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSantri();
  }, []);

  const classes = useMemo(() => {
    const uniqueClasses = new Set<string>();
    santriData.forEach(s => {
      if (s[22]) uniqueClasses.add(s[22]);
    });
    return Array.from(uniqueClasses).sort();
  }, [santriData]);

  const handlePrepareSend = () => {
    if (!messageTemplate.trim()) {
      alert("Pesan tidak boleh kosong");
      return;
    }

    let filtered = santriData.filter(s => s[26] === 'Aktif');
    if (filterType === 'class') {
      if (!selectedClass) {
        alert("Pilih kelas terlebih dahulu");
        return;
      }
      filtered = filtered.filter(s => s[22] === selectedClass);
    }

    const validTargets = filtered.filter(s => {
      const phone = s[27];
      return phone && phone.trim().length >= 10;
    });

    if (validTargets.length === 0) {
      alert("Tidak ada santri dengan nomor HP yang valid pada filter ini.");
      return;
    }

    setTargets(validTargets);
    setShowConfirm(true);
  };

  const formatPhone = (phone: string) => {
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '62' + cleaned.substring(1);
    }
    return cleaned;
  };

  const executeSend = async () => {
    setShowConfirm(false);
    setIsSending(true);
    setProgress({ current: 0, total: targets.length, success: 0, fail: 0 });

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < targets.length; i++) {
      const santri = targets[i];
      const nama = santri[2] || 'Santri';
      const rawPhone = santri[27];
      const phone = formatPhone(rawPhone);
      
      const message = messageTemplate.replace(/\[nama\]/g, nama);

      setProgress(p => ({ ...p, current: i + 1 }));

      try {
        await postWithOfflineQueue('/api/whatsapp/send-single', {
          target: phone,
          message: message
        });
        successCount++;
      } catch (err) {
        console.error(`Failed to send to ${nama} (${phone}):`, err);
        failCount++;
      }

      setProgress(p => ({ ...p, success: successCount, fail: failCount }));

      if (i < targets.length - 1) {
        const delay = Math.floor(Math.random() * 1000) + 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    setIsSending(false);
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Memuat data santri...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <MessageCircle className="w-6 h-6 text-emerald-600" />
          Pesan Masal WhatsApp
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Filter Penerima</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input 
                  type="radio" 
                  checked={filterType === 'all'} 
                  onChange={() => setFilterType('all')}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <span>Semua Santri Aktif</span>
              </label>
              <label className="flex items-center gap-2">
                <input 
                  type="radio" 
                  checked={filterType === 'class'} 
                  onChange={() => setFilterType('class')}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <span>Per Kelas Formal</span>
              </label>
            </div>
          </div>

          {filterType === 'class' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Pilih Kelas</label>
              <select 
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                <option value="">-- Pilih Kelas --</option>
                {classes.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Pesan Pengumuman
              <span className="text-xs text-slate-500 font-normal ml-2">(Gunakan [nama] untuk menyebut nama santri)</span>
            </label>
            <textarea 
              value={messageTemplate}
              onChange={(e) => setMessageTemplate(e.target.value)}
              rows={6}
              placeholder="Assalamualaikum Bapak/Ibu wali dari [nama], menginformasikan bahwa..."
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
            />
          </div>

          <button 
            onClick={handlePrepareSend}
            disabled={isSending || !messageTemplate.trim()}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Send className="w-5 h-5" />
            Kirim Pesan Masal
          </button>
        </div>
      </div>

      {isSending && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-200 bg-emerald-50/50">
          <h3 className="text-lg font-bold text-emerald-800 mb-2">Sedang Mengirim Pesan...</h3>
          <p className="text-sm text-emerald-600 mb-4">
            Sedang memproses pesan ke-{progress.current} dari {progress.total}...
          </p>
          <div className="w-full bg-emerald-200 rounded-full h-2.5 mb-4 overflow-hidden">
            <div 
              className="bg-emerald-600 h-2.5 rounded-full transition-all duration-300" 
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            ></div>
          </div>
          <div className="flex gap-4 text-sm font-medium">
            <span className="text-emerald-700">Sukses: {progress.success}</span>
            <span className="text-red-600">Gagal: {progress.fail}</span>
          </div>
        </div>
      )}

      {!isSending && progress.total > 0 && progress.current === progress.total && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-blue-200 bg-blue-50/50">
          <h3 className="text-lg font-bold text-blue-800 mb-2 flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            Pengiriman Selesai
          </h3>
          <p className="text-sm text-blue-700">
            Total diproses: {progress.total} pesan.
          </p>
          <div className="flex gap-4 text-sm font-medium mt-2">
            <span className="text-emerald-600">Sukses: {progress.success}</span>
            <span className="text-red-600">Gagal: {progress.fail}</span>
          </div>
        </div>
      )}

      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
            <h3 className="text-xl font-bold text-slate-800 mb-2">Konfirmasi Pengiriman</h3>
            <p className="text-slate-600 mb-6">
              Pesan akan dikirim ke <strong className="text-emerald-600">{targets.length}</strong> santri. Lanjutkan?
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-medium transition-colors"
              >
                Batal
              </button>
              <button 
                onClick={executeSend}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-medium transition-colors"
              >
                Ya, Kirim Sekarang
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const HelpGuide = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <HelpCircle className="w-6 h-6 text-indigo-600" />
          Panduan Penggunaan & Manfaat Fitur
        </h2>
        <p className="text-slate-600 mb-6">
          Selamat datang di Sistem Informasi Manajemen Pondok Pesantren. Berikut adalah panduan singkat cara pengoperasian dan manfaat dari setiap fitur yang tersedia di aplikasi ini.
        </p>

        <div className="space-y-4">
          {/* Dashboard */}
          <div className="border border-slate-200 rounded-xl p-5 hover:border-indigo-200 transition-colors">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-3 text-lg">
              <LayoutDashboard className="w-5 h-5 text-indigo-500" /> Dashboard
            </h3>
            <div className="space-y-2 text-sm text-slate-600">
              <p><strong>Cara Pengoperasian:</strong> Buka menu ini dari sidebar kiri. Halaman ini akan otomatis memuat ringkasan data terbaru.</p>
              <p><strong>Manfaat:</strong> Memantau total santri aktif, ringkasan keuangan (pemasukan & pengeluaran), serta grafik pendaftaran santri baru secara real-time untuk pengambilan keputusan yang cepat oleh pimpinan pondok.</p>
            </div>
          </div>

          {/* Pendaftaran */}
          <div className="border border-slate-200 rounded-xl p-5 hover:border-emerald-200 transition-colors">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-3 text-lg">
              <UserPlus className="w-5 h-5 text-emerald-500" /> Pendaftaran Santri Baru
            </h3>
            <div className="space-y-2 text-sm text-slate-600">
              <p><strong>Cara Pengoperasian:</strong> Isi form pendaftaran dengan data lengkap calon santri. Anda juga dapat mengunggah foto wajah dan scan Kartu Keluarga (KK). Klik "Simpan Pendaftaran" untuk memproses.</p>
              <p><strong>Manfaat:</strong> Mendigitalisasi arsip pendaftaran santri. Data yang masuk akan otomatis tersimpan di database dan mempermudah pencarian data di masa depan tanpa perlu tumpukan kertas.</p>
            </div>
          </div>

          {/* Data Santri */}
          <div className="border border-slate-200 rounded-xl p-5 hover:border-blue-200 transition-colors">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-3 text-lg">
              <Users className="w-5 h-5 text-blue-500" /> Data Santri
            </h3>
            <div className="space-y-2 text-sm text-slate-600">
              <p><strong>Cara Pengoperasian:</strong> Gunakan kolom pencarian untuk mencari nama santri. Anda bisa memfilter berdasarkan status (Aktif/Alumni) atau kelas. Tersedia juga tombol untuk Edit, Hapus, Cetak ID Card, serta Export/Import data Excel.</p>
              <p><strong>Manfaat:</strong> Mengelola database seluruh santri dengan rapi. Memudahkan admin untuk memperbarui data, mencetak kartu identitas, dan merekap data santri dalam format Excel.</p>
            </div>
          </div>

          {/* Pesan Masal WA */}
          <div className="border border-slate-200 rounded-xl p-5 hover:border-green-200 transition-colors">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-3 text-lg">
              <MessageCircle className="w-5 h-5 text-green-500" /> Pesan Masal WhatsApp
            </h3>
            <div className="space-y-2 text-sm text-slate-600">
              <p><strong>Cara Pengoperasian:</strong> Pilih target penerima (Semua Santri atau Kelas tertentu). Ketik pesan Anda, gunakan tag <code>[nama]</code> agar sistem otomatis menyebut nama santri. Klik kirim dan tunggu progress bar selesai.</p>
              <p><strong>Manfaat:</strong> Mempermudah penyebaran pengumuman penting (seperti tagihan, jadwal libur, undangan wali santri) secara instan ke banyak nomor WhatsApp sekaligus tanpa harus mengetik satu per satu.</p>
            </div>
          </div>

          {/* Keuangan */}
          <div className="border border-slate-200 rounded-xl p-5 hover:border-amber-200 transition-colors">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-3 text-lg">
              <Wallet className="w-5 h-5 text-amber-500" /> Manajemen Keuangan (Syahriyah, Titipan, Tabungan)
            </h3>
            <div className="space-y-2 text-sm text-slate-600">
              <p><strong>Cara Pengoperasian:</strong> 
                <br/>- <strong>Syahriyah Bulanan:</strong> Pilih santri, pilih bulan yang dibayar, lalu simpan. <strong>Penting:</strong> Saat santri membayar Syahriyah, sistem akan <strong>otomatis memotong sebagian nominalnya untuk dimasukkan ke Tabungan Ziarah</strong> sesuai dengan konfigurasi yang diatur di menu Pengaturan.
                <br/>- <strong>Titipan Harian:</strong> Catat uang saku harian yang diberikan wali santri. Saldo akan berkurang saat santri melakukan penarikan harian.
                <br/>- <strong>Tabungan (Ziarah/Umum):</strong> Melihat riwayat otomatis dari potongan Syahriyah, serta mencatat setoran/penarikan tabungan manual.
                <br/>- <strong>Riwayat & Cetak:</strong> Melihat riwayat transaksi per santri dan mencetak struk/bukti pembayaran.
                <br/>- <strong>Laporan Keuangan:</strong> Lihat rekapitulasi arus kas masuk dan keluar secara keseluruhan.
              </p>
              <p><strong>Manfaat:</strong> Memastikan transparansi dan akurasi pencatatan keuangan pondok. Mencegah kehilangan catatan kertas, memudahkan audit, dan wali santri dapat menerima bukti pembayaran yang jelas. Fitur otomatisasi tabungan ziarah sangat membantu pengurus dalam mengumpulkan dana kegiatan tahunan tanpa perlu menagih secara terpisah.</p>
            </div>
          </div>

          {/* Pengaturan & Tarif */}
          <div className="border border-slate-200 rounded-xl p-5 hover:border-purple-200 transition-colors">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-3 text-lg">
              <Settings className="w-5 h-5 text-purple-500" /> Manajemen Tarif & Pengaturan
            </h3>
            <div className="space-y-2 text-sm text-slate-600">
              <p><strong>Cara Pengoperasian:</strong> Masuk ke menu Pengaturan untuk mengubah nama pondok, logo, atau API Key. Masuk ke tab "Konfigurasi Tabungan Syahriyah" untuk mengatur nominal potongan otomatis ziarah. Masuk ke tab "Kusus Super Admin" untuk mengelola user dan membuka Spreadsheet database utama.</p>
              <p><strong>Manfaat:</strong> Memberikan fleksibilitas penuh kepada admin untuk menyesuaikan identitas aplikasi dan merubah nominal biaya pendidikan kapan saja tanpa perlu membongkar kode program. Akses Spreadsheet langsung memudahkan Super Admin untuk melakukan backup atau perbaikan data tingkat lanjut.</p>
            </div>
          </div>

          {/* Log Aktivitas */}
          <div className="border border-slate-200 rounded-xl p-5 hover:border-rose-200 transition-colors">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-3 text-lg">
              <History className="w-5 h-5 text-rose-500" /> Log Aktivitas
            </h3>
            <div className="space-y-2 text-sm text-slate-600">
              <p><strong>Cara Pengoperasian:</strong> Buka menu ini untuk melihat daftar riwayat tindakan yang dilakukan oleh pengguna (siapa, melakukan apa, dan kapan).</p>
              <p><strong>Manfaat:</strong> Sebagai fitur keamanan (Audit Trail). Jika terjadi kesalahan data atau penghapusan yang tidak disengaja, admin dapat melacak akun mana yang bertanggung jawab atas perubahan tersebut.</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

const KedisiplinanTahfidz = ({ user, isAdmin }: { user: any, isAdmin: boolean }) => {
  const [santri, setSantri] = useState<any[]>([]);
  const [pelanggaran, setPelanggaran] = useState<any[]>([]);
  const [tahfidz, setTahfidz] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pelanggaran' | 'tahfidz'>('pelanggaran');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth());
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [alertInfo, setAlertInfo] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [deletingRecord, setDeletingRecord] = useState<{sheet: string, id: string} | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    santriId: '',
    santriName: '',
    tanggal: new Date().toISOString().split('T')[0],
    field1: '',
    field2: ''
  });
  const [santriSearch, setSantriSearch] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resSantri, resPelanggaran, resTahfidz] = await Promise.all([
        fetchWithCache('/api/data/Santri'),
        fetchWithCache('/api/data/Pelanggaran'),
        fetchWithCache('/api/data/Tahfidz')
      ]);
      setSantri(Array.isArray(resSantri.data) ? resSantri.data : []);
      setPelanggaran(Array.isArray(resPelanggaran.data) ? resPelanggaran.data : []);
      setTahfidz(Array.isArray(resTahfidz.data) ? resTahfidz.data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleDelete = async () => {
    if (!deletingRecord) return;
    const { sheet, id } = deletingRecord;
    setDeletingRecord(null);
    try {
      await postWithOfflineQueue(`/api/data/${sheet}/delete`, { id, adminName: user?.username || 'System' });
      setAlertInfo({ message: 'Data berhasil dihapus!', type: 'success' });
      fetchData();
    } catch (err) {
      setAlertInfo({ message: 'Gagal menghapus data', type: 'error' });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.santriId || !formData.tanggal || !formData.field1) {
      setAlertInfo({ message: 'Mohon lengkapi data wajib!', type: 'error' });
      return;
    }
    
    setLoading(true);
    try {
      const selectedS = santri.find(s => s[0] === formData.santriId);
      const sheet = activeTab === 'pelanggaran' ? 'Pelanggaran' : 'Tahfidz';
      
      if (editingItem) {
        const updatedRow = [
          editingItem.timestamp,
          formData.santriId,
          selectedS ? selectedS[2] : '',
          formData.tanggal,
          formData.field1,
          formData.field2,
          user?.username || editingItem.admin
        ];
        await postWithOfflineQueue(`/api/data/${sheet}/update`, { id: editingItem.timestamp, data: updatedRow });
      } else {
        const newRow = [
          new Date().toISOString(),
          formData.santriId,
          selectedS ? selectedS[2] : '',
          formData.tanggal,
          formData.field1,
          formData.field2,
          user?.username || 'Admin'
        ];
        await postWithOfflineQueue(`/api/data/${sheet}/add`, { data: newRow });
      }
      
      setShowModal(false);
      setEditingItem(null);
      setAlertInfo({ message: 'Data berhasil disimpan!', type: 'success' });
      fetchData();
    } catch (err) {
      setAlertInfo({ message: 'Gagal menyimpan data', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const processedData = useMemo(() => {
    const data = activeTab === 'pelanggaran' ? pelanggaran : tahfidz;
    return data.map(item => {
      const s = santri.find(st => st[0] === item[1]);
      return {
        timestamp: item[0],
        santriId: item[1],
        santriName: s ? s[2] : item[2],
        kelas: s ? s[22] : '-',
        tanggal: item[3],
        field1: item[4], // jenis/surah
        field2: item[5], // tindakan/keterangan
        admin: item[6] || '-'
      };
    }).filter(item => {
      const date = new Date(item.tanggal);
      const targetMonthMatch = filterMonth === -1 || date.getMonth() === filterMonth;
      const targetYearMatch = !filterYear || date.getFullYear() === filterYear;
      const searchMatch = !searchTerm || item.santriName.toLowerCase().includes(searchTerm.toLowerCase()) || item.field1.toLowerCase().includes(searchTerm.toLowerCase());
      return targetMonthMatch && targetYearMatch && searchMatch;
    }).sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
  }, [pelanggaran, tahfidz, santri, activeTab, searchTerm, filterMonth, filterYear]);

  const exportPdf = () => {
    try {
      const doc = new jsPDF('landscape');
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('PONDOK PESANTREN SALAFIYAH QOUMIYAH', doc.internal.pageSize.width / 2, 15, { align: 'center' });
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Laporan ${activeTab === 'pelanggaran' ? 'Kedisiplinan (Pelanggaran)' : 'Tahfidz (Hafalan)'} ${filterMonth === -1 ? 'Tahunan' : MONTHS[filterMonth]} ${filterYear}`, doc.internal.pageSize.width / 2, 22, { align: 'center' });
      doc.text(`Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}`, doc.internal.pageSize.width / 2, 28, { align: 'center' });
      doc.setLineWidth(0.5);
      doc.line(14, 32, doc.internal.pageSize.width - 14, 32);

      const head = activeTab === 'pelanggaran' 
        ? [['Tgl Kejadian', 'Nama Santri', 'Kelas', 'Jenis Pelanggaran', 'Tindakan/Ta\'zir', 'Pencatat']]
        : [['Tanggal', 'Nama Santri', 'Kelas', 'Surah/Juz', 'Nilai/Predikat', 'Penyimak']];

      const body = processedData.map(item => [
        new Date(item.tanggal).toLocaleDateString('id-ID'),
        item.santriName,
        item.kelas,
        item.field1,
        item.field2,
        item.admin
      ]);

      (doc as any).autoTable({
        startY: 38, head, body, theme: 'grid',
        headStyles: { fillColor: activeTab === 'pelanggaran' ? [220, 38, 38] : [37, 99, 235], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 8 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { top: 38 }
      });
      doc.save(`Laporan_${activeTab}_${new Date().getTime()}.pdf`);
    } catch (err) {
      console.error(err);
      alert('Gagal cetak PDF');
    }
  };

  const handleDownloadExcel = () => {
    const exportData = processedData.map(item => ({
      Tanggal: new Date(item.tanggal).toLocaleDateString('id-ID'),
      Santri: item.santriName,
      Kelas: item.kelas,
      [activeTab === 'pelanggaran' ? 'Jenis Pelanggaran' : 'Surah/Juz']: item.field1,
      [activeTab === 'pelanggaran' ? 'Tindakan/Ta\'zir' : 'Nilai/Predikat']: item.field2,
      [activeTab === 'pelanggaran' ? 'Pencatat' : 'Penyimak']: item.admin
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    XLSX.writeFile(workbook, `Laporan_${activeTab}_${new Date().getTime()}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Kedisiplinan & Tahfidz</h2>
          <p className="text-sm font-medium text-slate-500 mt-1">Rekapitulasi catatan pelanggaran dan capaian hafalan santri</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-6">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="flex bg-slate-100 p-1 rounded-2xl w-full md:w-auto">
            <button 
              onClick={() => { setActiveTab('pelanggaran'); setSearchTerm(''); }}
              className={`flex-1 md:flex-none px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'pelanggaran' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Catatan Pelanggaran
            </button>
            <button 
              onClick={() => { setActiveTab('tahfidz'); setSearchTerm(''); }}
              className={`flex-1 md:flex-none px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'tahfidz' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Catatan Hafalan
            </button>
          </div>

          <div className="flex gap-2 w-full md:w-auto">
            <select 
              value={filterMonth}
              onChange={(e) => setFilterMonth(parseInt(e.target.value))}
              className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 focus:outline-none focus:border-slate-400 flex-1 md:flex-none"
            >
              <option value={-1}>Semua Bulan</option>
              {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
            <select 
              value={filterYear}
              onChange={(e) => setFilterYear(parseInt(e.target.value))}
              className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 focus:outline-none focus:border-slate-400 flex-1 md:flex-none"
            >
              <option value="">Semua Tahun</option>
              {Array.from({ length: 5 }, (_, i) => {
                const year = new Date().getFullYear() - 2 + i;
                return <option key={year} value={year}>{year}</option>;
              })}
            </select>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 justify-between items-center border-t border-slate-100 pt-6">
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Cari santri atau catatan..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-slate-400"
            />
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            {isAdmin && (
              <button 
                onClick={() => {
                  setEditingItem(null);
                  setFormData({
                    santriId: '',
                    tanggal: new Date().toISOString().split('T')[0],
                    field1: '',
                    field2: ''
                  });
                  setSantriSearch('');
                  setShowModal(true);
                }} 
                className={`flex-1 md:flex-none px-4 py-2 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-colors ${activeTab === 'pelanggaran' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                <Plus className="w-4 h-4" /> Tambah Catatan
              </button>
            )}
            <button onClick={exportPdf} className={`px-4 py-2 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-colors ${activeTab === 'pelanggaran' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
              Cetak PDF
            </button>
            <button onClick={handleDownloadExcel} className="px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-emerald-700 transition-colors">
              Excel
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-100">
          <table className="w-full text-left">
            <thead className={`text-[10px] font-bold uppercase tracking-wider ${activeTab === 'pelanggaran' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
              <tr>
                <th className="px-6 py-4">Tanggal</th>
                <th className="px-6 py-4">Nama Santri</th>
                <th className="px-6 py-4">Kelas</th>
                <th className="px-6 py-4">{activeTab === 'pelanggaran' ? 'Jenis Pelanggaran' : 'Surah / Juz'}</th>
                <th className="px-6 py-4">{activeTab === 'pelanggaran' ? 'Tindakan / Ta\'zir' : 'Nilai / Predikat'}</th>
                <th className="px-6 py-4">{activeTab === 'pelanggaran' ? 'Pencatat' : 'Penyimak'}</th>
                <th className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-400">Memuat data...</td></tr>
              ) : processedData.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-400">Belum ada catatan yang sesuai.</td></tr>
              ) : (
                processedData.map((item, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-slate-800">{new Date(item.tanggal).toLocaleDateString('id-ID')}</td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-800">{item.santriName}</td>
                    <td className="px-6 py-4 text-xs text-slate-500">{item.kelas}</td>
                    <td className={`px-6 py-4 text-sm font-bold ${activeTab === 'pelanggaran' ? 'text-red-600' : 'text-blue-600'}`}>{item.field1}</td>
                    <td className={`px-6 py-4 text-sm ${activeTab === 'pelanggaran' ? 'text-slate-600' : 'text-emerald-600 font-bold'}`}>{item.field2}</td>
                    <td className="px-6 py-4 text-xs text-slate-400">{item.admin}</td>
                    <td className="px-6 py-4 text-center space-x-2">
                      {isAdmin && (
                        <>
                          <button 
                            onClick={() => {
                              setEditingItem(item);
                              setFormData({
                                santriId: item.santriId,
                                santriName: item.santriName,
                                tanggal: item.tanggal,
                                field1: item.field1,
                                field2: item.field2
                              });
                              const s = santri.find(st => st[0] === item.santriId);
                              setSantriSearch(s ? s[2] : '');
                              setShowModal(true);
                            }}
                            className={`p-1.5 transition-colors rounded-lg ${activeTab === 'pelanggaran' ? 'text-blue-500 hover:bg-blue-50' : 'text-blue-500 hover:bg-blue-50'}`}
                            title="Edit Catatan"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => setDeletingRecord({ sheet: activeTab === 'pelanggaran' ? 'Pelanggaran' : 'Tahfidz', id: item.timestamp })}
                            className={`p-1.5 transition-colors rounded-lg text-slate-400 hover:text-red-600`}
                            title="Hapus Catatan"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl my-auto">
              <div className={`p-6 text-white ${activeTab === 'pelanggaran' ? 'bg-red-600' : 'bg-blue-600'}`}>
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-bold">{editingItem ? 'Edit Catatan' : 'Tambah Catatan Baru'}</h3>
                  <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/20 rounded-xl"><X className="w-6 h-6" /></button>
                </div>
                <p className="text-white/80 text-xs mt-1">Lengkapi informasi {activeTab === 'pelanggaran' ? 'pelanggaran' : 'hafalan'} santri berikut ini.</p>
              </div>
              
              <form onSubmit={handleSave} className="p-6 space-y-4">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cari & Pilih Santri</label>
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="Ketik nama santri..." 
                        value={santriSearch}
                        onChange={(e) => {
                          setSantriSearch(e.target.value);
                          if (formData.santriId) setFormData({...formData, santriId: ''});
                        }}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {santriSearch && !formData.santriId && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                          {santri.filter(s => s[2].toLowerCase().includes(santriSearch.toLowerCase())).slice(0, 10).map((s, idx) => (
                            <button 
                              key={idx}
                              type="button"
                              onClick={() => {
                                setFormData({...formData, santriId: s[0], santriName: s[2]});
                                setSantriSearch(s[2]);
                              }}
                              className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-none"
                            >
                              <div className="font-bold text-slate-800">{s[2]}</div>
                              <div className="text-[10px] text-slate-400">ID: {s[0]} • Kelas: {s[22] || '-'}</div>
                            </button>
                          ))}
                          {santri.filter(s => s[2].toLowerCase().includes(santriSearch.toLowerCase())).length === 0 && (
                            <div className="px-4 py-8 text-center text-slate-400 text-xs">Santri tidak ditemukan</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tanggal Kejadian</label>
                      <input 
                        type="date" 
                        required
                        value={formData.tanggal}
                        onChange={(e) => setFormData({...formData, tanggal: e.target.value})}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{activeTab === 'pelanggaran' ? 'Jenis Pelanggaran' : 'Surah / Juz'}</label>
                      <input 
                        type="text" 
                        required
                        placeholder={activeTab === 'pelanggaran' ? 'Cth: Keluar tanpa izin' : 'Cth: Juz 30 / An-Nas'}
                        value={formData.field1}
                        onChange={(e) => setFormData({...formData, field1: e.target.value})}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{activeTab === 'pelanggaran' ? 'Tindakan / Ta\'zir' : 'Nilai / Predikat'}</label>
                    <input 
                      type="text" 
                      required
                      placeholder={activeTab === 'pelanggaran' ? 'Cth: Ta\'zir membersihkan halaman' : 'Cth: Mumtaz / Jayyid'}
                      value={formData.field2}
                      onChange={(e) => setFormData({...formData, field2: e.target.value})}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">Batal</button>
                  <button type="submit" disabled={loading} className={`flex-1 py-3 rounded-xl font-bold text-white shadow-lg transition-all ${activeTab === 'pelanggaran' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'} disabled:opacity-50`}>
                    {loading ? 'Menyimpan...' : (editingItem ? 'Simpan Perubahan' : 'Simpan Catatan')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {deletingRecord && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className="bg-white rounded-3xl w-full max-w-sm overflow-hidden p-6 text-center shadow-2xl">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Hapus Catatan?</h3>
              <p className="text-sm text-slate-500 mb-6">Penghapusan catatan bersifat permanen.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeletingRecord(null)} className="flex-1 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200">Batal</button>
                <button onClick={handleDelete} className="flex-1 py-3 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700">Ya, Hapus</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {alertInfo && (
          <div className="fixed bottom-8 right-8 z-50">
            <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className={`px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3 font-bold text-white ${alertInfo.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
              {alertInfo.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
              {alertInfo.message}
              <button onClick={() => setAlertInfo(null)} className="ml-4 hover:opacity-70"><X className="w-4 h-4" /></button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ActivityLogs = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await fetchWithCache('/api/data/Logs');
        if (Array.isArray(res.data)) {
          setLogs(res.data);
        } else {
          setLogs([]);
        }
      } catch (err) {
        console.error("Failed to fetch logs:", err);
        setLogs([]);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-6 border-b border-slate-100">
        <h2 className="text-xl font-bold text-slate-800">Log Aktivitas Sistem</h2>
      </div>
      <div className="divide-y divide-slate-100">
        {loading ? (
          <p className="p-8 text-center text-slate-400">Memuat log...</p>
        ) : logs.length === 0 ? (
          <p className="p-8 text-center text-slate-400">Belum ada riwayat aktivitas.</p>
        ) : logs.map((log, i) => (
          <div key={i} className="p-4 flex gap-4 items-start hover:bg-slate-50 transition-colors">
            <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
              <History className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm text-slate-800 font-medium">{log[1]} {log[2]}: <span className="font-bold">{log[3]}</span></p>
              <p className="text-[10px] text-slate-500 mt-1">{new Date(log[0]).toLocaleString('id-ID')}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
