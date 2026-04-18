export interface User {
  username: string;
  role: 'admin' | 'user';
}

export interface Santri {
  id?: string;
  nama: string;
  kelasFormal: string;
  tingkatPondok: string;
  kkUrl?: string;
  wajahUrl?: string;
  status: 'Aktif' | 'Lulus' | 'Keluar';
  lastUpdated?: string;
}

export interface FinanceRecord {
  id?: string;
  santriId: string;
  bulan: string;
  tahun: string;
  tagihan: number;
  bayar: number;
  titipan: number;
  kekurangan: number;
  tanggal: string;
}

export interface DailyAllowance {
  id?: string;
  santriId: string;
  jumlah: number;
  tipe: 'Masuk' | 'Keluar';
  keterangan: string;
  tanggal: string;
}

export interface AlbumEvent {
  id?: string;
  namaAcara: string;
  tanggal: string;
  photos: string[]; // URLs
}

export interface LogEntry {
  timestamp: string;
  user: string;
  action: string;
  details: string;
}
