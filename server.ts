import express from "express";
import path from "path";
import cors from "cors";
import multer from "multer";
import { google } from "googleapis";
import dotenv from "dotenv";
import fs from "fs";
import axios from "axios";
import { v2 as cloudinary } from 'cloudinary';

dotenv.config();

// Cloudinary will automatically use CLOUDINARY_URL from process.env if available
cloudinary.config();

async function uploadToCloudinary(filePath: string, folder: string) {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: `ppsq/${folder}`,
    });
    return result.secure_url;
  } catch (error) {
    console.error("Cloudinary Upload Error:", error);
    throw error;
  }
}

export const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Multer for file uploads
const uploadsDir = process.env.VERCEL ? '/tmp' : path.join(process.cwd(), 'uploads');
if (!process.env.VERCEL && !fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir)
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname))
  }
});

const upload = multer({ storage: storage });

app.use('/uploads', express.static(uploadsDir));

// Google Auth Setup
const getGoogleAuth = () => {
  const client_email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let private_key = process.env.GOOGLE_PRIVATE_KEY;

  if (!client_email || !private_key) {
    console.error("Missing Google Credentials:", { client_email: !!client_email, private_key: !!private_key });
    return null;
  }

  // Clean up private key
  // 1. Replace literal \n strings with actual newlines
  private_key = private_key.replace(/\\n/g, '\n');
  
  // 2. Remove surrounding quotes if present
  if (private_key.startsWith('"') && private_key.endsWith('"')) {
    private_key = private_key.slice(1, -1);
  }
  
  // 3. Ensure it starts and ends correctly
  if (!private_key.includes("-----BEGIN PRIVATE KEY-----")) {
    console.error("Private key format error: Missing BEGIN header");
    return null;
  }

  try {
    return new google.auth.GoogleAuth({
      credentials: {
        client_email,
        private_key: private_key.trim(),
      },
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets'
      ],
    });
  } catch (err) {
    console.error("Error creating Google Auth:", err);
    return null;
  }
};

const sheets = google.sheets('v4');

// Helper to send WhatsApp via Fonnte
async function sendWhatsApp(target: string, message: string) {
  const token = process.env.API_FONNTE;
  if (!token) {
    console.warn("API_FONNTE is not set. WhatsApp skipped.");
    return false;
  }

  // Sanitize phone number: remove non-digits
  let sanitizedTarget = target ? String(target).replace(/\D/g, '') : '';
  
  // Convert 08 to 628
  if (sanitizedTarget.startsWith('0')) {
    sanitizedTarget = '62' + sanitizedTarget.substring(1);
  }

  if (!sanitizedTarget) {
    console.warn("Invalid phone number. WhatsApp skipped.");
    return false;
  }

  try {
    const response = await axios.post('https://api.fonnte.com/send', {
      target: sanitizedTarget,
      message: message,
    }, {
      headers: {
        'Authorization': token
      }
    });
    console.log("WhatsApp sent:", response.data);
    return true;
  } catch (error: any) {
    console.error("WhatsApp failed:", error.response?.data || error.message);
    return false;
  }
}

/**
 * Custom Notification Helper for Finance Transactions
 * Combines transaction data with Santri master data from Google Sheets
 */
async function sendFinanceNotification(params: {
  santriId: string;
  namaSantri: string;
  namaAyah: string;
  phone?: string;
  type: string;
  amount: number;
  bulan?: string;
  tahun?: string;
  titipanBaru?: number;
  kekuranganBaru?: number;
  saldoSaatIni?: number;
  keterangan?: string;
  kewajibanBulanan?: number;
  saldoLalu?: number;
  tanggalTerakhir?: string;
}) {
  let { phone, santriId, namaSantri, namaAyah, type, amount, bulan, tahun, titipanBaru, kekuranganBaru, saldoSaatIni, keterangan, kewajibanBulanan, saldoLalu, tanggalTerakhir } = params;

  // 1. If phone is missing, lookup from Santri sheet (Combining data from GS)
  if (!phone && santriId) {
    try {
      const auth = getGoogleAuth();
      const spreadsheetId = process.env.GOOGLE_SHEET_ID;
      const res = await sheets.spreadsheets.values.get({
        auth,
        spreadsheetId,
        range: 'Santri!A:AB', // No HP is at index 27 (AB)
      });
      const rows = res.data.values || [];
      const santriRow = rows.find(r => r[0] === santriId);
      if (santriRow && santriRow[27]) {
        phone = String(santriRow[27]);
      }
    } catch (e) {
      console.warn("Could not fetch santri phone from sheet:", e);
    }
  }

  if (!phone) {
    console.warn(`Skipping WA for ${namaSantri}: No phone number.`);
    return false;
  }

  // 2. Build the message with the requested automatic link
  const cleanId = santriId.startsWith("'") ? santriId.slice(1) : santriId;
  const rawBaseUrl = (process.env.APP_URL || process.env.URL_APLIKASI || 'https://ppsq2.vercel.app').trim();
  // Ensure no trailing slash
  const cleanBaseUrl = rawBaseUrl.endsWith('/') ? rawBaseUrl.slice(0, -1) : rawBaseUrl;
  const cekKeuanganUrl = `${cleanBaseUrl}/cek-keuangan/${encodeURIComponent(cleanId)}`;
  
  let msg = `*NOTIFIKASI PEMBAYARAN PPSQ*\n\n`;
  msg += `Alhamdulillah, telah diterima pembayaran ${type} untuk:\n`;
  msg += `Nama: ${namaSantri}\n`;
  msg += `Bin/Binti: ${namaAyah}\n`;
  
  if (type === 'AutomatedMonthlyBilling') {
    const prevBal = saldoLalu || 0;
    const totalDue = prevBal + (amount || 0);
    const prevTypeLabel = prevBal > 0 ? 'Tunggakan' : prevBal < 0 ? 'Titipan (Kredit)' : 'Lunas';
    
    msg = `*PEMBERITAHUAN TAGIHAN SYAHRIAH*\n\n`;
    msg += `Assalamu'alaikum Wr. Wb. Bapak/Ibu Wali Santri dari:\n`;
    msg += `Nama: ${namaSantri}\n`;
    msg += `Bin/Binti: ${namaAyah}\n\n`;
    msg += `Berikut kami sampaikan rincian tagihan Syahriah bulan ${bulan} ${tahun || ''}:\n`;
    msg += `-----------------------------------------\n`;
    msg += `Saldo Bulan Lalu: Rp ${Math.abs(prevBal).toLocaleString('id-ID')} (${prevTypeLabel})\n`;
    msg += `Kewajiban Bulan Ini: Rp ${amount.toLocaleString('id-ID')}\n`;
    msg += `-----------------------------------------\n`;
    msg += `*TOTAL TAGIHAN: Rp ${totalDue.toLocaleString('id-ID')}*\n`;
    msg += `-----------------------------------------\n`;
    msg += `\nMohon untuk segera melakukan pembayaran Syahriah tepat waktu.\n`;
    msg += `Rincian lengkap Keuangan Santri:\n${cekKeuanganUrl}\n\n`;
    msg += `Pesan dikirim otomatis oleh sistem, jika sudah membayar mohon abaikan pesan ini. Terima kasih.`;
    
    return await sendWhatsApp(phone, msg);
  }

  const isSyahriah = type.toLowerCase().includes('syahriah');
  if (isSyahriah && bulan) {
    // Exact format requested by user for Syahriah
    const prevBal = saldoLalu || 0;
    const prevTypeLabel = prevBal >= 0 ? 'Tunggakan' : 'Titipan';
    msg += `Titipan/Tunggakan bulan lalu: ${prevTypeLabel} Rp ${Math.abs(prevBal).toLocaleString('id-ID')} (Tgl: ${tanggalTerakhir || '-'})\n`;
    msg += `Kewajiban bulanan: Rp ${(kewajibanBulanan || 0).toLocaleString('id-ID')}\n`;
    msg += `-----------------------------------------\n`;
    msg += `Bulan yang dibayar: ${bulan} ${tahun || ''}\n`;
    msg += `Total tagihan: Rp ${(prevBal + (kewajibanBulanan || 0)).toLocaleString('id-ID')}\n`;
    msg += `-----------------------------------------\n`;
    msg += `Jumlah bayar: Rp ${amount.toLocaleString('id-ID')}\n`;
    msg += `Titipan baru: Rp ${(titipanBaru || 0).toLocaleString('id-ID')}\n`;
    msg += `Kekurangan baru: Rp ${(kekuranganBaru || 0).toLocaleString('id-ID')}\n`;
  } else {
    // Format for others/fallback
    if (bulan && tahun) {
      msg += `Periode: ${bulan} ${tahun}\n`;
    }
    msg += `-----------------------------------------\n`;
    msg += `Jumlah: Rp ${amount.toLocaleString('id-ID')}\n`;
    
    if (isSyahriah) {
      if (titipanBaru !== undefined) msg += `Titipan: Rp ${titipanBaru.toLocaleString('id-ID')}\n`;
      if (kekuranganBaru !== undefined) msg += `Kekurangan: Rp ${kekuranganBaru.toLocaleString('id-ID')}\n`;
    } else {
      // For Titipan Harian / Allowance
      if (saldoSaatIni !== undefined) msg += `Saldo Saat Ini: Rp ${saldoSaatIni.toLocaleString('id-ID')}\n`;
    }
    if (keterangan) msg += `Keterangan: ${keterangan}\n`;
  }
  
  msg += `-----------------------------------------\n`;
  msg += `Lihat Bukti Pembayaran: ${cekKeuanganUrl}\n\n`;
  msg += `Pesan dikirim otomatis oleh sistem, jika ada kekeliruan silahkan hubungi pihak pondok.`;

  return await sendWhatsApp(phone, msg);
}

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    fonnte_configured: !!process.env.API_FONNTE,
    fonnte_token_length: process.env.API_FONNTE ? process.env.API_FONNTE.length : 0
  });
});

// Helper to append to sheet
async function appendToSheet(range: string, values: any[][]) {
  const auth = getGoogleAuth();
  if (!auth) throw new Error("Google Auth not configured");
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  if (!spreadsheetId) throw new Error("GOOGLE_SHEET_ID is not set in Settings.");
  
  console.log(`Appending to Spreadsheet ID: ${spreadsheetId}, Range: ${range}`);
  try {
    await sheets.spreadsheets.values.append({
      auth,
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values },
    });
  } catch (err: any) {
    const errorMsg = err.response?.data?.error?.message || err.message || "";
    console.error("Sheet Append Error:", errorMsg);
    
    if (errorMsg.includes("Unable to parse range")) {
      const sheetName = range.split('!')[0];
      throw new Error(`Sheet "${sheetName}" tidak ditemukan. Silakan klik tombol "Setup Database" di halaman Login terlebih dahulu untuk membuat semua tabel yang diperlukan.`);
    }
    if (errorMsg.toLowerCase().includes("permission") || errorMsg.includes("403")) {
      throw new Error("Akses Google Sheet ditolak. Pastikan Google Sheet sudah di-Share ke email Service Account sebagai 'Editor'.");
    }
    throw new Error(errorMsg || "Gagal menambahkan data ke Google Sheet");
  }
}

// Helper to get sheet data
async function getSheetData(range: string) {
  const auth = getGoogleAuth();
  if (!auth) {
    console.warn("Google Auth not configured");
    return null;
  }
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  if (!spreadsheetId) {
    console.warn("GOOGLE_SHEET_ID not set");
    return null;
  }
  try {
    const response = await sheets.spreadsheets.values.get({
      auth,
      spreadsheetId,
      range,
    });
    return response.data.values;
  } catch (err: any) {
    const errorMsg = err.response?.data?.error?.message || err.message || "";
    // If sheet doesn't exist, range is invalid, or permission denied, return null instead of throwing 500
    if (errorMsg.includes("Unable to parse range") || err.code === 400 || err.code === 404 || err.code === 403) {
      console.warn(`Sheet or range not found or access denied: ${range}`);
      return null;
    }
    throw err;
  }
}

// Helper to get all settings as a map
async function getSettingsMap() {
  const data = await getSheetData('Settings!A2:B100');
  const settings: { [key: string]: string } = {};
  if (data) {
    data.forEach((row: any) => {
      if (row[0]) settings[row[0]] = row[1] || "";
    });
  }
  return settings;
}

// Public Keuangan API (Bypass Auth)
app.get("/api/public/keuangan/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const decodedId = decodeURIComponent(id).trim();
    
    // Fetch Santri
    const santriData = await getSheetData('Santri!A2:AG') || [];
    const santri = santriData.find((s: any) => s[3] === decodedId);
    
    if (!santri) {
      return res.status(404).json({ error: "Data Santri tidak ditemukan." });
    }

    const namaSantri = santri[2];
    const kelasFormal = santri[22] || '-';
    let kategori = santri[31] || 'Biasa';
    if (kategori === '') kategori = 'Biasa';

    // Calculate allowance (saldo titipan) and collect history
    const allowanceData = await getSheetData('Allowance!A2:J') || [];
    let saldoTitipan = 0;
    const history: any[] = [];
    
    allowanceData.filter((a: any) => a[1] === decodedId).forEach((curr: any) => {
      const isNegative = String(curr.length > 6 ? curr[5] : curr[2]).startsWith('-');
      const rawAmount = parseInt(String(curr.length > 6 ? curr[5] : curr[2]).replace(/\D/g, ''), 10) || 0;
      const amount = isNegative ? -rawAmount : rawAmount;
      const tipe = curr.length > 6 ? curr[6] : curr[3];
      const ket = curr.length > 7 ? curr[7] : (tipe === 'Masuk' ? 'Titipan Uang' : 'Uang Saku');
      
      saldoTitipan += (tipe === 'Masuk' ? amount : -amount);
      
      history.push({
        date: curr[0],
        description: ket || (tipe === 'Masuk' ? 'Uang Masuk' : 'Uang Keluar'),
        type: tipe, // 'Masuk' or 'Keluar'
        amount: amount
      });
    });

    // Get Tarif Base
    const masterTarifData = await getSheetData('master_tarif!A2:E') || [];
    let kewajibanBulanan = 0;
    const kfUpper = kelasFormal.toUpperCase();
    const isNdalem = kategori.toUpperCase() === 'SANTRI NDALEM' || kategori.toUpperCase() === 'NDALEM';
    const ndalemSuffix = isNdalem ? ' NDALEM' : '';

    let baseCategory = null;
    if (kfUpper.includes('YATIM') || (namaSantri || '').toLowerCase().includes('yatim')) {
        baseCategory = 'YATIM_BEASISWA';
    } else if (kfUpper.includes('PENGURUS')) {
        baseCategory = 'PENGURUS';
    } else if (kfUpper.includes('LULUS')) {
        baseCategory = 'LULUS_FORMAL';
    } else if (kfUpper.includes('MI')) {
        baseCategory = 'MI';
    } else if (kfUpper.includes('MTS')) {
        baseCategory = 'MTS';
    } else if (kfUpper.includes('MA')) {
        baseCategory = 'MA';
    }

    if (baseCategory) {
        let targetCategory = baseCategory + ndalemSuffix;
        let tarifRow = masterTarifData.find((m: any) => m[0] && m[0].toUpperCase() === targetCategory);
        if (!tarifRow && isNdalem) {
            tarifRow = masterTarifData.find((m: any) => m[0] && m[0].toUpperCase() === baseCategory);
        }
        if (tarifRow) {
            let tStr = String(tarifRow[2]);
            let tNeg = tStr.startsWith('-');
            let tVal = parseInt(tStr.replace(/\D/g, ''), 10) || 0;
            kewajibanBulanan = tNeg ? -tVal : tVal;
        }
    }

    // Tunggakan calculation and add payments to history
    const syahriahData = await getSheetData('Syahriah!A2:M') || [];
    const financeData = await getSheetData('Finance!A2:M') || [];
    
    const relevantFinance = [
        ...syahriahData,
        ...financeData.filter((f: any) => f[4] !== 'Harian' && f[4] !== 'Tabungan')
    ].filter((r: any) => r[1] === decodedId);

    relevantFinance.forEach((r: any) => {
      const bayar = parseInt(String(r[7]).replace(/\D/g, ''), 10) || 0;
      if (bayar > 0) {
        history.push({
          date: r[0],
          description: `Syahriah ${r[4]} ${r[5]}`,
          type: 'Masuk',
          amount: bayar
        });
      }
    });

    // Determine current tunggakan from the absolute latest finance record
    let tunggakan = 0;
    const sortedFinance = [...relevantFinance].sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());
    if (sortedFinance.length > 0) {
        const latestRecord = sortedFinance[0];
        const sVal = parseCurrency(latestRecord[9]); // Kekurangan
        const tVal = parseCurrency(latestRecord[8]); // Titipan
        tunggakan = sVal - tVal;
    }

    // Final sorting of history by date descending
    history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    res.json({
      namaSantri,
      kelasFormal,
      kategori: isNdalem ? 'Ndalem' : 'Biasa',
      saldoTitipan,
      tagihanBulanIni: kewajibanBulanan,
      tunggakan,
      history: history.slice(0, 20), // Send last 20 transactions
      lastSync: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Public Verification API (Bypass Auth)
app.get("/api/public/verify/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const decodedId = decodeURIComponent(id).trim();
    const targetId = decodedId.startsWith("'") ? decodedId.slice(1) : decodedId;
    
    // Mismatch helper for Google Sheets auto-formatting of strings
    const isMatch = (r: any[]) => {
      let cellVal = String(r[0]).trim();
      // Remove apostrophe if manually typed or fetched that way
      if (cellVal.startsWith("'")) cellVal = cellVal.slice(1);
      
      // Exact string match (best case)
      if (cellVal === targetId) return true;
      
      // Legacy matching: Google Sheets formats the timestamp into DD/MM/YYYY HH:mm:ss
      // Let's at least check if it represents roughly the same date
      try {
        let d1 = new Date(cellVal).getTime();
        if (isNaN(d1) && cellVal.match(/^\d{1,2}\/\d{1,2}\/\d{4}/)) {
          // Try swapping DD and MM
          const swapped = cellVal.replace(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/, '$2/$1/$3');
          d1 = new Date(swapped).getTime();
        }
        const d2 = new Date(targetId).getTime();
        if (!isNaN(d1) && !isNaN(d2)) {
          return Math.abs(d1 - d2) <= 24 * 60 * 60 * 1000;
        }
      } catch (e) {}
      
      return false;
    };

    // Fetch all sheets concurrently to avoid timeouts
    const [syahriahData, allowanceData, titipanData, tabunganData, financeData] = await Promise.all([
      getSheetData('Syahriah!A2:M'),
      getSheetData('Allowance!A2:I'),
      getSheetData('TitipanHarian!A2:G'),
      getSheetData('Tabungan!A2:I'),
      getSheetData('Finance!A2:M')
    ]);

    // Check Syahriah
    if (syahriahData) {
      const record = syahriahData.find(isMatch);
      if (record) {
        return res.json({
          id: record[0],
          jenis: 'Syahriah',
          namaSantri: record[2],
          bulan: record[4],
          tahun: record[5],
          nominal: record[7], // Bayar
          tanggal: record[11] || record[0].split('T')[0]
        });
      }
    }

    // Check Allowance
    if (allowanceData) {
      const record = allowanceData.find(isMatch);
      if (record) {
        return res.json({
          id: record[0],
          jenis: `Titipan Harian (${record[6]})`, // Masuk/Keluar
          namaSantri: record[2],
          bulan: '-',
          tahun: '-',
          nominal: record[5], // Jumlah
          tanggal: record[0].split('T')[0],
          keterangan: record[7] || '-'
        });
      }
    }

    // Check TitipanHarian
    if (titipanData) {
      const record = titipanData.find(isMatch);
      if (record) {
        return res.json({
          id: record[0],
          jenis: 'Titipan Harian',
          namaSantri: record[2],
          bulan: '-',
          tahun: '-',
          nominal: record[4], // Jumlah
          tanggal: record[6] || record[0].split('T')[0]
        });
      }
    }

    // Check Tabungan
    if (tabunganData) {
      const record = tabunganData.find(isMatch);
      if (record) {
        return res.json({
          id: record[0],
          jenis: `Tabungan (${record[6]})`, // Masuk/Keluar
          namaSantri: record[2],
          bulan: '-',
          tahun: '-',
          nominal: record[5], // Jumlah
          tanggal: record[0].split('T')[0]
        });
      }
    }

    // Check Finance (Legacy)
    if (financeData) {
      const record = financeData.find(isMatch);
      if (record) {
        return res.json({
          id: record[0],
          jenis: 'Pembayaran',
          namaSantri: record[2],
          bulan: record[4],
          tahun: record[5],
          nominal: record[7], // Bayar
          tanggal: record[11] || record[0].split('T')[0]
        });
      }
    }

    res.status(404).json({ 
      error: "Record not found", 
      debug: { 
        targetId, 
        syahriahRows: syahriahData?.length || 0,
        allowanceRows: allowanceData?.length || 0,
        titipanRows: titipanData?.length || 0,
        tabunganRows: tabunganData?.length || 0,
        financeRows: financeData?.length || 0
      } 
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Login API
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const users = await getSheetData('Users!A2:D'); // Name, Username, Password, Role
    if (!users) return res.status(401).json({ message: "No users found" });
    
    const user = users.find(u => u[1] === username && u[2] === password);
    if (user) {
      res.json({ name: user[0], username: user[1], role: user[3] });
    } else {
      res.status(401).json({ message: "Username atau Password salah" });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Santri Registration with File Upload
app.post("/api/santri/register", upload.fields([{ name: 'kk', maxCount: 1 }, { name: 'wajah', maxCount: 1 }]), async (req, res) => {
  const { nama, data } = req.body;
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };
  
  console.log("Registration request received for:", nama);
  console.log("Files received:", Object.keys(files || {}));

  try {
    const auth = getGoogleAuth();
    if (!auth) throw new Error("Google Auth not configured");

    let kkUrl = "";
    let wajahUrl = "";

    // Use relative paths for the spreadsheet to be more robust
    // The frontend will resolve these relative to the current origin
    const baseUrl = ""; 

    // Upload KK (Cloudinary)
    if (files['kk']) {
      console.log("Uploading KK to Cloudinary for:", nama);
      kkUrl = await uploadToCloudinary(files['kk'][0].path, 'dokumen');
      fs.unlinkSync(files['kk'][0].path);
      console.log("KK uploaded to Cloudinary:", kkUrl);
    }

    // Upload Wajah (Cloudinary)
    if (files['wajah']) {
      console.log("Uploading Wajah to Cloudinary for:", nama);
      wajahUrl = await uploadToCloudinary(files['wajah'][0].path, 'wajah');
      fs.unlinkSync(files['wajah'][0].path);
      console.log("Wajah uploaded to Cloudinary:", wajahUrl);
    }

    // Save to Sheet
    console.log("Parsing registration data...");
    const s = JSON.parse(data);
    const rowData = [
      new Date().toISOString(),
      s.noKK || "",
      s.nama,
      s.nik || "",
      s.jenisKelamin || "",
      s.tempatLahir || "",
      s.tanggalLahir || "",
      s.agama || "",
      s.pendidikan || "",
      s.pekerjaan || "",
      s.statusPerkawinan || "",
      s.statusHubungan || "",
      s.kewarganegaraan || "",
      s.namaAyah || "",
      s.namaIbu || "",
      s.dusun || "",
      s.rt || "",
      s.rw || "",
      s.desa || "",
      s.kecamatan || "",
      s.kabupaten || "",
      s.propinsi || "",
      s.kelasFormal || "",
      s.tingkatPondok || "",
      kkUrl,
      wajahUrl,
      'Aktif',
      s.noHP || "",
      s.tanggalPendaftaran || new Date().toISOString().split('T')[0],
      s.adminName || "",
      "0", // Saldo Tabungan Ziarah
      s.kategoriSantri || "Santri Biasa" // Kategori Santri
    ];

    console.log("Appending to Santri sheet:", rowData);
    await appendToSheet('Santri!A2', [rowData]);

    console.log(`Registration successful for: ${s.nama}`);
    
    // Log Activity
    try {
      await appendToSheet('Logs!A2', [[
        new Date().toISOString(),
        'System/Admin',
        'Pendaftaran Santri',
        `Santri baru terdaftar: ${s.nama}`
      ]]);
    } catch (logErr) {
      console.error("Failed to log activity:", logErr);
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Santri Update with File Upload
app.post("/api/santri/update", upload.fields([{ name: 'kk', maxCount: 1 }, { name: 'wajah', maxCount: 1 }]), async (req, res) => {
  const { id, data } = req.body;
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };
  
  try {
    const auth = getGoogleAuth();
    if (!auth) throw new Error("Google Auth not configured");

    const s = JSON.parse(data);
    let kkUrl = s.kkUrl || "";
    let wajahUrl = s.wajahUrl || "";

    if (files?.kk?.[0]) {
      console.log("Uploading KK to Cloudinary for update:", s.nama);
      kkUrl = await uploadToCloudinary(files.kk[0].path, 'dokumen');
      fs.unlinkSync(files.kk[0].path);
    }
    if (files?.wajah?.[0]) {
      console.log("Uploading Wajah to Cloudinary for update:", s.nama);
      wajahUrl = await uploadToCloudinary(files.wajah[0].path, 'wajah');
      fs.unlinkSync(files.wajah[0].path);
    }

    const rowData = [
      id, // Keep the original timestamp/ID
      s.noKK || "",
      s.nama || "",
      s.nik || "",
      s.jenisKelamin || "",
      s.tempatLahir || "",
      s.tanggalLahir || "",
      s.agama || "",
      s.pendidikan || "",
      s.pekerjaan || "",
      s.statusPerkawinan || "",
      s.statusHubungan || "",
      s.kewarganegaraan || "",
      s.namaAyah || "",
      s.namaIbu || "",
      s.dusun || "",
      s.rt || "",
      s.rw || "",
      s.desa || "",
      s.kecamatan || "",
      s.kabupaten || "",
      s.propinsi || "",
      s.kelasFormal || "",
      s.tingkatPondok || "",
      kkUrl,
      wajahUrl,
      s.status || 'Aktif',
      s.noHP || "",
      s.tanggalPendaftaran || "",
      s.adminName || "",
      s.saldoTabunganZiarah || "0",
      s.kategoriSantri || "Santri Biasa"
    ];

    const spreadsheetId = process.env.GOOGLE_SHEET_ID!;
    const sheetData = await getSheetData(`Santri!A2:A10000`) || [];
    const rowIndex = sheetData.findIndex((row: any) => String(row[0]).trim() === String(id).trim());
    
    if (rowIndex !== -1) {
      await sheets.spreadsheets.values.update({
        auth,
        spreadsheetId,
        range: `Santri!A${rowIndex + 2}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [rowData] }
      });
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Data not found" });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Finance API
app.post("/api/finance", async (req, res) => {
  const { data, phone } = req.body; // phone is the parent's number
  try {
    const timestamp = new Date().toISOString();
    await appendToSheet('Finance!A2', [[
      `'${timestamp}`,
      data.santriId,
      data.namaSantri || "",
      data.namaAyah || "",
      data.bulan,
      data.tahun,
      data.tagihan,
      data.bayar,
      data.titipan,
      data.kekurangan,
      data.keterangan || "",
      data.tanggal || new Date().toISOString().split('T')[0],
      data.adminName || ""
    ]]);

    // Send WhatsApp Notification
    if (phone || data.santriId) {
      await sendFinanceNotification({
        santriId: data.santriId,
        namaSantri: data.namaSantri,
        namaAyah: data.namaAyah,
        phone: phone,
        type: 'Syahriah',
        amount: parseInt(data.bayar || '0'),
        bulan: data.bulan,
        tahun: data.tahun,
        titipanBaru: parseInt(data.titipan || '0'),
        kekuranganBaru: parseInt(data.kekurangan || '0'),
        keterangan: data.keterangan
      });
    }

    // Log Activity
    try {
      await appendToSheet('Logs!A2', [[
        new Date().toISOString(),
        data.adminName || 'System/Admin',
        'Input Pembayaran Syahriah',
        `Pembayaran Syahriah santri: ${data.namaSantri}`
      ]]);
    } catch (logErr) {
      console.error("Failed to log activity:", logErr);
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Daily Allowance API
app.post("/api/allowance", async (req, res) => {
  const { data } = req.body;
  try {
    const timestamp = new Date().toISOString();
    await appendToSheet('Allowance!A2', [[
      `'${timestamp}`,
      data.santriId,
      data.namaSantri || "",
      data.namaAyah || "",
      data.kelasFormal || "",
      data.jumlah,
      data.tipe,
      data.keterangan,
      data.adminName || ""
    ]]);
    
    // Log Activity
    try {
      await appendToSheet('Logs!A2', [[
        new Date().toISOString(),
        data.adminName || 'System/Admin',
        `Input Titipan Harian (${data.tipe})`,
        `Transaksi ${data.tipe} sejumlah ${data.jumlah} untuk ${data.namaSantri} (ID: ${data.santriId})`
      ]]);
    } catch (logErr) {
      console.error("Failed to log activity:", logErr);
    }

    // Send WhatsApp Notification
    const phoneNum = req.body.phone || data.phone;
    let waSent = false;
    if (phoneNum || data.santriId) {
      waSent = await sendFinanceNotification({
        santriId: data.santriId,
        namaSantri: data.namaSantri,
        namaAyah: data.namaAyah,
        phone: phoneNum,
        type: `Titipan Harian (${data.tipe})`,
        amount: parseInt(data.jumlah || '0'),
        saldoSaatIni: data.saldoSaatIni ? parseInt(data.saldoSaatIni) : undefined,
        keterangan: data.keterangan
      });
    }

    res.json({ success: true, waSent, message: waSent ? 'Transaksi berhasil dan WA terkirim' : 'Transaksi berhasil disimpan' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Savings API
app.post("/api/savings", async (req, res) => {
  const { data } = req.body;
  try {
    const timestamp = new Date().toISOString();
    await appendToSheet('Tabungan!A2', [[
      `'${timestamp}`,
      data.santriId,
      data.namaSantri || "",
      data.namaAyah || "",
      data.kelasFormal || "",
      data.jumlah,
      data.tipe,
      data.keterangan,
      data.adminName || ""
    ]]);
    
    // Log Activity
    try {
      await appendToSheet('Logs!A2', [[
        new Date().toISOString(),
        data.adminName || 'System/Admin',
        `Input Tabungan (${data.tipe})`,
        `Transaksi Tabungan ${data.tipe} sejumlah ${data.jumlah} untuk ${data.namaSantri} (ID: ${data.santriId})`
      ]]);
    } catch (logErr) {
      console.error("Failed to log activity:", logErr);
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Gallery API
app.post("/api/gallery", upload.array('photos'), async (req, res) => {
  const { namaAcara, tanggal, adminName } = req.body;
  const files = req.files as Express.Multer.File[];
  
  try {
    const auth = getGoogleAuth();
    if (!auth) throw new Error("Google Auth not configured");

    const photoUrls: string[] = [];
    for (const file of files) {
      console.log("Uploading photo to Cloudinary for gallery:", namaAcara);
      const url = await uploadToCloudinary(file.path, 'acara');
      photoUrls.push(url);
      fs.unlinkSync(file.path);
    }

    await appendToSheet('Gallery!A2', [[
      new Date().toISOString(),
      namaAcara,
      tanggal,
      photoUrls.join(','),
      adminName || ""
    ]]);

    // Log Activity
    try {
      await appendToSheet('Logs!A2', [[
        new Date().toISOString(),
        adminName || 'System/Admin',
        'Upload Galeri',
        `Menambahkan foto untuk acara: ${namaAcara}`
      ]]);
    } catch (logErr) {
      console.error("Failed to log activity:", logErr);
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- Setup Database API ---
app.post("/api/setup-database", async (req, res) => {
  console.log("Starting database setup...");
  try {
    const auth = getGoogleAuth();
    if (!auth) {
      throw new Error("Google Auth not configured. Check GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY in Settings.");
    }
    
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    if (!spreadsheetId) {
      throw new Error("GOOGLE_SHEET_ID is not set in Settings.");
    }

    console.log("Connecting to spreadsheet:", spreadsheetId);

    const requiredSheets = [
      { name: 'Users', headers: ['Nama', 'Username', 'Password', 'Role'] },
      { name: 'Santri', headers: [
        'Timestamp', 'No KK', 'Nama Lengkap', 'NIK', 'Jenis Kelamin', 'Tempat Lahir', 'Tanggal Lahir', 
        'Agama', 'Pendidikan', 'Jenis Pekerjaan', 'Status Perkawinan', 'Status Hubungan Keluarga', 
        'Kewarganegaraan', 'Nama Ayah', 'Nama Ibu', 'Dusun', 'RT', 'RW', 'Desa', 'Kecamatan', 
        'Kabupaten', 'Propinsi', 'Kelas Formal', 'Tingkat Pondok', 'KK URL', 'Wajah URL', 'Status', 'No HP', 'Tanggal Pendaftaran', 'Admin', 'Saldo Tabungan Ziarah', 'Kategori Santri'
      ] },
      { name: 'Finance', headers: ['Timestamp', 'Santri ID', 'Nama Santri', 'Nama Ayah', 'Bulan', 'Tahun', 'Tagihan', 'Bayar', 'Titipan', 'Kekurangan', 'Keterangan', 'Tanggal Pembayaran', 'Admin'] },
      { name: 'Syahriah', headers: ['Timestamp', 'Santri ID', 'Nama Santri', 'Nama Ayah', 'Bulan', 'Tahun', 'Tagihan', 'Bayar', 'Titipan', 'Kekurangan', 'Keterangan', 'Tanggal Pembayaran', 'Admin'] },
      { name: 'TitipanHarian', headers: ['Timestamp', 'Santri ID', 'Nama Santri', 'Nama Ayah', 'Bulan', 'Tahun', 'Tagihan', 'Bayar', 'Titipan', 'Kekurangan', 'Keterangan', 'Tanggal Pembayaran', 'Admin'] },
      { name: 'Tabungan', headers: ['Timestamp', 'Santri ID', 'Nama Santri', 'Nama Ayah', 'Bulan', 'Tahun', 'Tagihan', 'Bayar', 'Titipan', 'Kekurangan', 'Keterangan', 'Tanggal Pembayaran', 'Admin'] },
      { name: 'Allowance', headers: ['Timestamp', 'Santri ID', 'Nama Santri', 'Nama Ayah', 'Kelas Formal', 'Jumlah', 'Tipe', 'Keterangan', 'Admin'] },
      { name: 'Gallery', headers: ['Timestamp', 'Nama Acara', 'Tanggal', 'Photo URLs', 'Admin'] },
      { name: 'Logs', headers: ['Timestamp', 'User', 'Action', 'Details'] },
      { name: 'Settings', headers: ['Key', 'Value'] },
      { name: 'master_tarif', headers: ['kategori_id', 'nama_jenjang', 'nominal', 'keterangan'] },
      { name: 'log_aktivitas', headers: ['Tanggal', 'User', 'Aksi', 'Keterangan'] },
      { name: 'settings_finance', headers: ['Key', 'Value'] },
      { name: 'log_penagihan', headers: ['Bulan', 'Tahun', 'Tanggal Kirim', 'Total Pesan', 'Admin'] },
      { name: 'Pelanggaran', headers: ['Timestamp', 'Santri ID', 'Nama Santri', 'Tanggal', 'Jenis Pelanggaran', 'Tindakan', 'Pencatat'] },
      { name: 'Tahfidz', headers: ['Timestamp', 'Santri ID', 'Nama Santri', 'Tanggal', 'Surah/Juz', 'Nilai/Keterangan', 'Penyimak'] },
    ];

    // Get existing sheets
    let spreadsheet;
    try {
      spreadsheet = await sheets.spreadsheets.get({ auth, spreadsheetId });
    } catch (err: any) {
      console.error("Error fetching spreadsheet:", err.message);
      if (err.message.includes("not found")) {
        throw new Error("Spreadsheet tidak ditemukan. Pastikan GOOGLE_SHEET_ID benar.");
      }
      if (err.message.includes("permission") || err.message.includes("403")) {
        throw new Error("Akses ditolak. Pastikan Anda sudah membagikan (Share) Google Sheet ke email Service Account sebagai Editor.");
      }
      throw err;
    }

    const existingSheetNames = spreadsheet.data.sheets?.map(s => s.properties?.title) || [];
    console.log("Existing sheets:", existingSheetNames);

    const createRequests: any[] = [];
    for (const sheet of requiredSheets) {
      if (!existingSheetNames.includes(sheet.name)) {
        createRequests.push({ addSheet: { properties: { title: sheet.name } } });
      }
    }

    if (createRequests.length > 0) {
      console.log(`Creating ${createRequests.length} sheets...`);
      await sheets.spreadsheets.batchUpdate({
        auth,
        spreadsheetId,
        requestBody: { requests: createRequests }
      });
    }

    const updateData = requiredSheets.map(sheet => ({
      range: `${sheet.name}!A1`,
      values: [sheet.headers]
    }));

    console.log("Updating headers for all sheets...");
    await sheets.spreadsheets.values.batchUpdate({
      auth,
      spreadsheetId,
      requestBody: {
        valueInputOption: 'USER_ENTERED',
        data: updateData
      }
    });

    // Initialize master_tarif with default data, and append Ndalem if missing
    const masterTarifData = await getSheetData('master_tarif!A2:A');
    const existingCategories = (masterTarifData || []).map((row: any) => row[0]);
    
    const defaultTarif = [
      ['MI', 'Madrasah Ibtidaiyah', '0', 'Tarif standar MI'],
      ['MTS', 'Madrasah Tsanawiyah', '0', 'Tarif standar MTS'],
      ['MA', 'Madrasah Aliyah', '0', 'Tarif standar MA'],
      ['LULUS_FORMAL', 'Lulus Formal', '0', 'Tarif santri lulus formal'],
      ['YATIM_BEASISWA', 'Yatim / Beasiswa', '0', 'Tarif khusus yatim/beasiswa'],
      ['PENGURUS', 'Pengurus', '0', 'Tarif khusus pengurus'],
      ['MI NDALEM', 'MI Ndalem', '0', 'Tarif MI Ndalem'],
      ['MTS NDALEM', 'MTS Ndalem', '0', 'Tarif MTS Ndalem'],
      ['MA NDALEM', 'MA Ndalem', '0', 'Tarif MA Ndalem'],
      ['LULUS_FORMAL NDALEM', 'Lulus Formal Ndalem', '0', 'Tarif Lulus Ndalem'],
      ['PENGURUS NDALEM', 'Pengurus Ndalem', '0', 'Tarif Pengurus Ndalem']
    ];

    const missingTarifs = defaultTarif.filter(t => !existingCategories.includes(t[0]));
    if (missingTarifs.length > 0) {
      await appendToSheet('master_tarif!A2', missingTarifs);
    }

    // Initialize settings_finance with default data if empty
    const settingsFinanceData = await getSheetData('settings_finance!A2:A');
    if (!settingsFinanceData || settingsFinanceData.length === 0) {
      const defaultFinanceSettings = [
        ['nominal_tabungan_ziarah', '100000'],
        ['estimasi_biaya_ziarah', '2000000']
      ];
      await appendToSheet('settings_finance!A2', defaultFinanceSettings);
    }

    // Add default admin if Users is empty
    console.log("Checking for default admin...");
    const usersData = await getSheetData('Users!A2:B');
    if (!usersData || usersData.length === 0) {
      console.log("Adding default admin...");
      await appendToSheet('Users!A2', [['Administrator', 'admin', 'ppsq123', 'superadmin']]);
    } else if (usersData[0].length === 3) {
      // Migration: if we find 3 columns, it's the old format [username, password, role]
      // We should probably warn or try to fix it, but for now let's just ensure the default admin is correct
      // if the first user is 'admin', let's update it to the new format
      const allUsers = await getSheetData('Users!A2:D') || [];
      const adminRow = allUsers.find((u: any) => u[0] === 'admin' && u.length === 3);
      if (adminRow) {
        // Update this specific row to 4 columns
        // This is tricky without row index, but since it's setup, we can just overwrite A2 if it matches
        if (allUsers[0][0] === 'admin' && allUsers[0].length === 3) {
          await sheets.spreadsheets.values.update({
            auth,
            spreadsheetId,
            range: 'Users!A2:D2',
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: [['Administrator', 'admin', 'ppsq123', 'superadmin']] }
          });
        }
      }
    }

    // Add default settings if Settings is empty
    console.log("Checking for default settings...");
    const settingsData = await getSheetData('Settings!A2:A');
    if (!settingsData || settingsData.length === 0) {
      console.log("Adding default settings...");
      await appendToSheet('Settings!A2', [
        ['app_name', 'PPSQ Al-Falah'],
        ['app_slogan', 'Pondok Pesantren Salafiyah Qur\'aniyah'],
        ['marquee_text', 'Selamat Datang di Sistem Informasi PPSQ Al-Falah • Silakan lengkapi data santri Anda • Hubungi admin jika ada kendala'],
        ['logo_url', '']
      ]);
    }

    console.log("Database setup completed successfully.");
    res.json({ success: true, message: "Database initialized successfully" });
  } catch (error: any) {
    console.error("Setup failed:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get data from any sheet
app.get("/api/data/:sheetName", async (req, res) => {
  const { sheetName } = req.params;
  try {
    const data = await getSheetData(`${sheetName}!A2:AZ`);
    res.json(data || []);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Add Syahriah Record
app.post("/api/syahriah/add", async (req, res) => {
  try {
    const { santriId, namaSantri, namaAyah, bulan, tahun, tagihan, bayar, keterangan, tanggal, adminName, saldoLalu } = req.body;
    const prevBal = parseInt(saldoLalu || '0');
    const totalDihitung = (parseInt(tagihan || '0') + prevBal) - parseInt(bayar || '0');
    
    const titipan = totalDihitung < 0 ? Math.abs(totalDihitung) : 0;
    const kekurangan = totalDihitung > 0 ? totalDihitung : 0;
    
    const rowData = [
      new Date().toISOString(),
      santriId || "",
      namaSantri || "",
      namaAyah || "",
      bulan || "",
      tahun || "",
      tagihan || "0",
      bayar || "0",
      titipan.toString(),
      kekurangan.toString(),
      keterangan || "",
      tanggal || new Date().toISOString().split('T')[0],
      adminName || "System"
    ];

    await appendToSheet('Syahriah!A2', [rowData]);
    
    // Send WhatsApp Notification
    const { phone, kewajibanBulanan, tanggalTerakhir } = req.body;
    await sendFinanceNotification({
      santriId: santriId,
      namaSantri: namaSantri,
      namaAyah: namaAyah,
      phone: phone,
      type: 'Syahriah',
      amount: parseInt(bayar || '0'),
      bulan: bulan,
      tahun: tahun,
      titipanBaru: titipan,
      kekuranganBaru: kekurangan,
      keterangan: keterangan,
      kewajibanBulanan: parseInt(kewajibanBulanan || '0'),
      saldoLalu: parseInt(saldoLalu || '0'),
      tanggalTerakhir: tanggalTerakhir
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Add Titipan Harian Record
app.post("/api/titipan/add", async (req, res) => {
  try {
    const { santriId, namaSantri, namaAyah, jumlah, keterangan, tanggal } = req.body;
    
    const rowData = [
      new Date().toISOString(),
      santriId || "",
      namaSantri || "",
      namaAyah || "",
      jumlah || "0",
      keterangan || "",
      tanggal || new Date().toISOString().split('T')[0]
    ];

    await appendToSheet('TitipanHarian!A2', [rowData]);
    
    // Send WhatsApp Notification
    const { phone } = req.body;
    await sendFinanceNotification({
      santriId: santriId,
      namaSantri: namaSantri,
      namaAyah: namaAyah,
      phone: phone,
      type: 'Titipan Harian',
      amount: parseInt(jumlah || '0'),
      keterangan: keterangan
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Add Finance Record (Legacy/Generic)
app.post("/api/finance/add", async (req, res) => {
  try {
    const { santriId, namaSantri, namaAyah, bulan, tahun, tagihan, bayar, titipan, keterangan, tanggal, adminName, sheetName, saldoLalu } = req.body;
    
    const tagihanNum = parseInt(tagihan || '0');
    const bayarNum = parseInt(bayar || '0');
    const extraTitipan = parseInt(titipan || '0');
    const prevBal = parseInt(saldoLalu || '0');
    
    let targetTitipan = 0;
    let targetKekurangan = 0;

    if (bulan !== 'Harian') {
      // Logic: (Current Bill + Past Debt) - (Paid Amount + Previous Credit + Manual Extra Credit)
      // Since saldoLalu correctly represents Net Debt (Debt - Credit), we can simplify:
      const totalDue = tagihanNum + prevBal;
      const totalPaid = bayarNum + extraTitipan;
      const finalBal = totalDue - totalPaid;

      if (finalBal < 0) {
        targetTitipan = Math.abs(finalBal);
        targetKekurangan = 0;
      } else {
        targetKekurangan = finalBal;
        targetTitipan = 0;
      }
    } else {
      targetKekurangan = tagihanNum - bayarNum;
      targetTitipan = extraTitipan;
    }
    
    const timestamp = new Date().toISOString();
    const rowData = [
      `'${timestamp}`,
      santriId || "",
      namaSantri || "",
      namaAyah || "",
      bulan || "",
      tahun || "",
      tagihan || "0",
      bayar || "0",
      targetTitipan.toString(),
      targetKekurangan.toString(),
      keterangan || "",
      tanggal || timestamp.split('T')[0],
      adminName || ""
    ];

    const targetSheet = sheetName || 'Finance';
    await appendToSheet(`${targetSheet}!A2`, [rowData]);

    // 2. Split Payment Logic for Tabungan Ziarah (Only for Syahriah)
    if (targetSheet === 'Syahriah' && bayarNum > 0) {
      const auth = getGoogleAuth();
      const spreadsheetId = process.env.GOOGLE_SHEET_ID!;
      
      // Fetch finance settings
      const financeSettingsData = await getSheetData('settings_finance!A2:B100');
      const financeSettings: any = {};
      if (financeSettingsData) {
        financeSettingsData.forEach((r: any) => {
          financeSettings[r[0]] = r[1];
        });
      }

      const nominalTabungan = parseInt(financeSettings.nominal_tabungan_ziarah) || 0;
      
      if (nominalTabungan > 0) {
        // Find Santri and update Saldo Tabungan Ziarah
        const santriData = await getSheetData('Santri!A2:AE');
        if (santriData) {
          const santriIndex = santriData.findIndex((s: any) => s[3] === santriId);
          if (santriIndex !== -1) {
            const currentSaldo = parseInt(santriData[santriIndex][30] || '0') || 0;
            const newSaldo = currentSaldo + nominalTabungan;
            
            await sheets.spreadsheets.values.update({
              auth,
              spreadsheetId,
              range: `Santri!AE${santriIndex + 2}`,
              valueInputOption: 'USER_ENTERED',
              requestBody: { values: [[newSaldo.toString()]] }
            });

            // Log this as a financial activity
            const isRepayment = currentSaldo < 0;
            await appendToSheet('log_aktivitas!A2', [[
              new Date().toLocaleString('id-ID'),
              adminName || 'System',
              isRepayment ? 'Pelunasan Ziarah' : 'Tabungan Ziarah Otomatis',
              `${isRepayment ? 'Pelunasan piutang' : 'Akumulasi tabungan'} ziarah Rp ${nominalTabungan.toLocaleString('id-ID')} untuk ${namaSantri} (ID: ${santriId}). Saldo baru: Rp ${newSaldo.toLocaleString('id-ID')}`
            ]]);
          }
        }
      }
    }

    // Log Activity
    try {
      await appendToSheet('Logs!A2', [[
        new Date().toISOString(),
        adminName || 'System/Admin',
        'Input Pembayaran',
        `Pembayaran untuk ${namaSantri} bulan ${bulan} ${tahun} sebesar Rp ${bayar}`
      ]]);
    } catch (logErr) {
      console.error("Failed to log activity:", logErr);
    }

    // Send WhatsApp Notification
    const { phone, kewajibanBulanan, tanggalTerakhir } = req.body;
    let waSent = false;
    if (phone || santriId) {
      waSent = await sendFinanceNotification({
        santriId: santriId,
        namaSantri: namaSantri,
        namaAyah: namaAyah,
        phone: phone,
        type: targetSheet || 'Pembayaran',
        amount: bayarNum,
        bulan: bulan,
        tahun: tahun,
        titipanBaru: targetTitipan,
        kekuranganBaru: targetKekurangan,
        keterangan: keterangan,
        kewajibanBulanan: parseInt(kewajibanBulanan || '0'),
        saldoLalu: parseInt(saldoLalu || '0'),
        tanggalTerakhir: tanggalTerakhir
      });
    }

    res.json({ success: true, waSent, message: waSent ? 'Pembayaran berhasil dan WA terkirim' : 'Pembayaran berhasil disimpan' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/finance/process-ziarah", async (req, res) => {
  try {
    const { adminName } = req.body;
    const auth = getGoogleAuth();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID!;

    // 1. Fetch Finance Settings
    const financeSettingsData = await getSheetData('settings_finance!A2:B100');
    const financeSettings: any = {};
    if (financeSettingsData) {
      financeSettingsData.forEach((r: any) => {
        financeSettings[r[0]] = r[1];
      });
    }

    const biayaZiarah = parseInt(financeSettings.estimasi_biaya_ziarah) || 0;
    if (biayaZiarah <= 0) {
      return res.status(400).json({ error: "Biaya ziarah belum diatur di pengaturan." });
    }

    // 2. Fetch All Santri
    const santriData = await getSheetData('Santri!A2:AE');
    if (!santriData) {
      return res.status(404).json({ error: "Data santri tidak ditemukan." });
    }

    let totalRealized = 0;
    let totalDebt = 0;
    const updates: any[] = [];
    const logs: any[] = [];

    // Filter active santri (Status is at index 26)
    const activeSantri = santriData.map((s: any, index: number) => ({ data: s, originalIndex: index }))
                                  .filter(s => s.data[26] === 'Aktif');

    for (const s of activeSantri) {
      const currentSaldo = parseInt(s.data[30] || '0') || 0;
      const newSaldo = currentSaldo - biayaZiarah;
      
      // Calculate realized funds (only what was available in saldo)
      const realizedFromThisSantri = currentSaldo > 0 ? Math.min(currentSaldo, biayaZiarah) : 0;
      totalRealized += realizedFromThisSantri;

      if (newSaldo < 0) {
        totalDebt += Math.abs(newSaldo);
      }

      // Prepare update
      updates.push({
        range: `Santri!AE${s.originalIndex + 2}`,
        values: [[newSaldo.toString()]]
      });

      // Prepare log
      logs.push([
        new Date().toLocaleString('id-ID'),
        adminName || 'System',
        'Realisasi Ziarah Massal',
        `Pemotongan biaya ziarah Rp ${biayaZiarah.toLocaleString('id-ID')} untuk ${s.data[2] || 'Santri'}. Saldo: Rp ${newSaldo.toLocaleString('id-ID')}`
      ]);
    }

    // 3. Execute Updates in Batch
    if (updates.length > 0) {
      await sheets.spreadsheets.values.batchUpdate({
        auth,
        spreadsheetId,
        requestBody: {
          valueInputOption: 'USER_ENTERED',
          data: updates
        }
      });

      // Append logs
      await appendToSheet('log_aktivitas!A2', logs);
    }

    res.json({
      success: true,
      summary: {
        totalSantri: activeSantri.length,
        biayaPerSantri: biayaZiarah,
        totalRealized,
        totalDebt
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Generic Update Endpoint
app.post("/api/data/:sheetName/add", async (req, res) => {
  const { sheetName } = req.params;
  const { data } = req.body;
  try {
    await appendToSheet(`${sheetName}!A2`, [data]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Generic Update Endpoint
app.post("/api/data/:sheetName/update", async (req, res) => {
  const { sheetName } = req.params;
  const { id, data } = req.body;
  try {
    const auth = getGoogleAuth();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID!;
    const sheetData = await getSheetData(`${sheetName}!A2:A10000`) || [];
    const rowIndex = sheetData.findIndex((row: any) => String(row[0]).trim() === String(id).trim());
    
    if (rowIndex !== -1) {
      await sheets.spreadsheets.values.update({
        auth,
        spreadsheetId,
        range: `${sheetName}!A${rowIndex + 2}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [data] }
      });
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Data not found" });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Generic Delete Endpoint
app.post("/api/data/:sheetName/delete", async (req, res) => {
  const { sheetName } = req.params;
  const { id, adminName } = req.body;
  try {
    const auth = getGoogleAuth();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID!;
    const sheetData = await getSheetData(`${sheetName}!A2:A10000`) || [];
    const rowIndex = sheetData.findIndex((row: any) => String(row[0]).trim() === String(id).trim());
    
    if (rowIndex !== -1) {
      const spreadsheet = await sheets.spreadsheets.get({ auth, spreadsheetId });
      const sheetId = spreadsheet.data.sheets?.find(s => s.properties?.title === sheetName)?.properties?.sheetId;
      
      await sheets.spreadsheets.batchUpdate({
        auth,
        spreadsheetId,
        requestBody: {
          requests: [{
            deleteDimension: {
              range: {
                sheetId,
                dimension: 'ROWS',
                startIndex: rowIndex + 1,
                endIndex: rowIndex + 2
              }
            }
          }]
        }
      });

      // Log Activity
      try {
        await appendToSheet('Logs!A2', [[
          new Date().toISOString(),
          adminName || 'System/Admin',
          `Hapus Data ${sheetName}`,
          `Menghapus data dengan ID: ${id}`
        ]]);
      } catch (logErr) {
        console.error("Failed to log activity:", logErr);
      }

      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Data not found" });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Settings Endpoints
app.get("/api/settings", async (req, res) => {
  try {
    const data = await getSheetData('Settings!A2:B100');
    const settings: any = {};
    if (data) {
      data.forEach((row: any) => {
        settings[row[0]] = row[1];
      });
    }
    res.json(settings);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/settings/update", async (req, res) => {
  try {
    const auth = getGoogleAuth();
    const { key, value } = req.body;
    const data = await getSheetData('Settings!A2:B100') || [];
    const rowIndex = data.findIndex((row: any) => row[0] === key);
    
    if (rowIndex !== -1) {
      // Update existing
      await sheets.spreadsheets.values.update({
        auth,
        spreadsheetId: process.env.GOOGLE_SHEET_ID!,
        range: `Settings!B${rowIndex + 2}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [[value]] }
      });
    } else {
      // Append new
      await appendToSheet('Settings!A2', [[key, value]]);
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Finance Settings Endpoints
app.get("/api/settings/finance", async (req, res) => {
  try {
    const data = await getSheetData('settings_finance!A2:B100');
    const settings: any = {};
    if (data) {
      data.forEach((row: any) => {
        settings[row[0]] = row[1];
      });
    }
    res.json(settings);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/settings/finance/update", async (req, res) => {
  try {
    const auth = getGoogleAuth();
    const { key, value } = req.body;
    const data = await getSheetData('settings_finance!A2:B100') || [];
    const rowIndex = data.findIndex((row: any) => row[0] === key);
    
    if (rowIndex !== -1) {
      await sheets.spreadsheets.values.update({
        auth,
        spreadsheetId: process.env.GOOGLE_SHEET_ID!,
        range: `settings_finance!B${rowIndex + 2}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [[value]] }
      });
    } else {
      await appendToSheet('settings_finance!A2', [[key, value]]);
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Helper for parsing currency strings in server
const parseCurrency = (val: any): number => {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return val;
  const strVal = String(val);
  const isNegative = strVal.startsWith('-');
  const num = parseInt(strVal.replace(/\D/g, ''), 10) || 0;
  return isNegative ? -num : num;
};

// Helper function to process automated billing
async function processAutoBilling(triggeredBy: string, filter?: { santriId?: string, category?: string }) {
  const auth = getGoogleAuth();
  if (!auth) throw new Error("Google Auth not configured");
  const spreadsheetId = process.env.GOOGLE_SHEET_ID!;

  // 1. Get Settings
  const financeSettingsRaw = await getSheetData('settings_finance!A2:B100') || [];
  const fSettings: any = {};
  financeSettingsRaw.forEach((row: any) => fSettings[row[0]] = row[1]);

  const isBillingActive = fSettings.billing_status === 'Active';
  const billingDay = parseInt(fSettings.billing_day);

  if (!isBillingActive && triggeredBy === 'System') {
    console.log("Cron [Auto Billing]: Status is inactive. Skipping.");
    return { skipped: true, message: "Billing automation is disabled." };
  }

  const now = new Date();
  const currentDay = now.getDate();
  
  if (triggeredBy === 'System') {
    // Check if current day matches the target billing day
    const isTargetDay = currentDay === (billingDay || 10);
    if (!isTargetDay) {
      console.log(`Cron [Auto Billing]: Not the scheduled day. (Target: ${billingDay}, Current: ${currentDay})`);
      return { skipped: true, message: `Not the scheduled day (Target: ${billingDay}).` };
    }
  }

  const currentMonthName = now.toLocaleString('id-ID', { month: 'long' });
  const currentYear = now.getFullYear();

  // 2. Check log_penagihan to prevent duplicate send for this month (only for automated system)
  if (triggeredBy === 'System') {
    const logData = await getSheetData('log_penagihan!A2:B1000') || [];
    const alreadySent = logData.some((row: any) => row[0] === currentMonthName && parseInt(row[1]) === currentYear);

    if (alreadySent) {
      console.log(`Cron [Auto Billing]: Already sent for ${currentMonthName} ${currentYear}. Skipping.`);
      return { skipped: true, message: `Already sent for ${currentMonthName} ${currentYear}.` };
    }
  }

  // 3. Fetch Data
  const [santriDataFull, financeDataFull, tariffsData] = await Promise.all([
    getSheetData('Santri!A2:AF10000'),
    getSheetData('Syahriah!A2:M20000'),
    getSheetData('master_tarif!A2:D100')
  ]);

  if (!santriDataFull) return { error: "No student data found" };

  let activeSantri = santriDataFull.filter((s: any) => s[26] === 'Aktif');

  // Apply Filters
  if (filter) {
    if (filter.santriId) {
      activeSantri = activeSantri.filter((s: any) => s[3] === filter.santriId);
    }
    if (filter.category) {
      const targetCategory = filter.category.toLowerCase();
      activeSantri = activeSantri.filter((s: any) => {
        const studentCategory = String(s[31] || '').toLowerCase();
        return studentCategory === targetCategory;
      });
    }
  }

  const tariffs: any = {};
  if (tariffsData) {
    tariffsData.forEach((t: any) => tariffs[t[0]] = parseCurrency(t[2]));
  }

  let successCount = 0;
  
  // 4. Process each student
  for (const santri of activeSantri) {
    const sId = santri[3];
    const namaSantri = santri[2];
    const namaAyah = santri[13];
    const phone = santri[27];
    const kategori = santri[31];
    
    if (!phone) continue;

    // Find latest finance record for this santri
    const sFinanceRecords = (financeDataFull || []).filter((f: any) => f[1] === sId);
    const sFinance = sFinanceRecords.sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())[0];

    const saldoLaluRaw = sFinance ? parseCurrency(sFinance[9]) : 0; 
    const titipanLaluRaw = sFinance ? parseCurrency(sFinance[8]) : 0; 
    
    const kewajibanBulanan = tariffs[kategori] || parseCurrency(fSettings.monthly_syahriah_fee || '0');
    
    const wasSent = await sendFinanceNotification({
      santriId: sId,
      namaSantri,
      namaAyah,
      phone,
      type: 'AutomatedMonthlyBilling',
      amount: kewajibanBulanan,
      bulan: currentMonthName,
      tahun: currentYear.toString(),
      saldoLalu: saldoLaluRaw - titipanLaluRaw, // Combine previous debt and credit
      tanggalTerakhir: sFinance ? sFinance[0] : ''
    });

    if (wasSent) successCount++;
    
    // Delay to respect Fonnte/WhatsApp limits
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // 5. Finalize Log
  await appendToSheet('log_penagihan!A2', [[
    currentMonthName,
    currentYear,
    now.toISOString(),
    successCount,
    triggeredBy
  ]]);

  await appendToSheet('log_aktivitas!A2', [[
    now.toLocaleString('id-ID'),
    triggeredBy,
    'Penagihan Bulanan',
    `Berhasil mengirim tagihan bulan ${currentMonthName} ke ${successCount} wali santri.`
  ]]);

  return { success: true, totalSent: successCount };
}

// Automated Billing Cron Endpoint
app.get("/api/cron/auto-billing", async (req, res) => {
  console.log("Cron [Auto Billing]: Script triggered at", new Date().toLocaleString());
  try {
    const result = await processAutoBilling('System');
    res.json(result);
  } catch (error: any) {
    console.error("Cron [Auto Billing] Failed:", error);
    res.status(500).json({ error: error.message });
  }
});

// Manual Billing Trigger API
app.post("/api/admin/trigger-billing", async (req, res) => {
  const { adminName, filter } = req.body;
  console.log(`Manual Billing: Triggered by ${adminName} at`, new Date().toLocaleString(), 'Filter:', filter);
  try {
    const result = await processAutoBilling(`Admin: ${adminName || 'Unknown'}`, filter);
    res.json(result);
  } catch (error: any) {
    console.error("Manual Billing Failed:", error);
    res.status(500).json({ error: error.message });
  }
});

// User Management Endpoints
app.post("/api/users/add", async (req, res) => {
  try {
    const { name, username, password, role } = req.body;
    await appendToSheet('Users!A2', [[name, username, password, role]]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/users/delete", async (req, res) => {
  try {
    const auth = getGoogleAuth();
    const { username } = req.body;
    const data = await getSheetData('Users!A2:D') || [];
    const rowIndex = data.findIndex((row: any) => row[1] === username);
    
    if (rowIndex !== -1) {
      // In Sheets API, deleting a row is complex. 
      // For simplicity in this demo, we'll just clear the row or the user can manage in Sheet.
      // But let's try a proper batchUpdate to delete the row.
      const spreadsheet = await sheets.spreadsheets.get({ auth, spreadsheetId: process.env.GOOGLE_SHEET_ID! });
      const sheetId = spreadsheet.data.sheets?.find(s => s.properties?.title === 'Users')?.properties?.sheetId;
      
      await sheets.spreadsheets.batchUpdate({
        auth,
        spreadsheetId: process.env.GOOGLE_SHEET_ID!,
        requestBody: {
          requests: [{
            deleteDimension: {
              range: {
                sheetId,
                dimension: 'ROWS',
                startIndex: rowIndex + 1, // +1 because A2 is index 1
                endIndex: rowIndex + 2
              }
            }
          }]
        }
      });
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "User not found" });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get Spreadsheet URL
app.get("/api/spreadsheet-url", (req, res) => {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  if (!spreadsheetId) return res.status(404).json({ error: "GOOGLE_SHEET_ID not set" });
  res.json({ url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit` });
});

app.post("/api/kenaikan-kelas", async (req, res) => {
  try {
    const { adminName } = req.body;
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    const auth = getGoogleAuth();
    if (!auth) {
      return res.status(500).json({ error: "Google Auth failed. Check credentials." });
    }
    
    // 1. Get all santri
    const santriData = await getSheetData('Santri!A2:AD');
    if (!santriData || santriData.length === 0) {
      return res.status(400).json({ error: "Tidak ada data santri." });
    }

    const gradeMapping: Record<string, string> = {
      // New Labels
      '1 MI': '2 MI', '2 MI': '3 MI', '3 MI': '4 MI', '4 MI': '5 MI', '5 MI': '6 MI', '6 MI': '1 MTS',
      '1 MTS': '2 MTS', '2 MTS': '3 MTS', '3 MTS': '1 MA',
      '1 MA': '2 MA', '2 MA': '3 MA', '3 MA': 'Lulus Sekolah Formal',
      // Legacy Labels (Support existing data)
      'MI 1': '2 MI', 'MI 2': '3 MI', 'MI 3': '4 MI', 'MI 4': '5 MI', 'MI 5': '6 MI', 'MI 6': '1 MTS',
      'MTS 1': '2 MTS', 'MTS 2': '3 MTS', 'MTS 3': '1 MA',
      'MA 1': '2 MA', 'MA 2': '3 MA', 'MA 3': 'Lulus Sekolah Formal'
    };

    let updatedCount = 0;
    const updatedSantri = santriData.map((row: any) => {
      const currentGrade = (row[22] || '').toUpperCase().trim();
      const nextGrade = gradeMapping[currentGrade];
      
      if (nextGrade) {
        const newRow = [...row];
        newRow[22] = nextGrade; // Update Kelas Formal (index 22)
        updatedCount++;
        return newRow;
      }
      return row;
    });

    if (updatedCount > 0) {
      // Update the entire sheet
      await sheets.spreadsheets.values.update({
        auth,
        spreadsheetId,
        range: 'Santri!A2',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: updatedSantri }
      });

      // Log to log_aktivitas
      await appendToSheet('log_aktivitas!A2', [[
        new Date().toLocaleString('id-ID'),
        adminName || 'Admin',
        'Kenaikan Kelas',
        `Berhasil menaikkan kelas untuk ${updatedCount} santri.`
      ]]);
    }

    res.json({ success: true, updatedCount });
  } catch (err: any) {
    console.error("Kenaikan Kelas Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// WhatsApp Single Send Endpoint (For Bulk Messaging)
app.post("/api/whatsapp/send-single", async (req, res) => {
  const { target, message } = req.body;
  const token = process.env.API_FONNTE;
  if (!token) {
    return res.status(400).json({ error: "API_FONNTE is not configured in environment variables." });
  }

  try {
    const response = await axios.post('https://api.fonnte.com/send', {
      target: target,
      message: message,
    }, {
      headers: {
        'Authorization': token
      }
    });
    res.json({ success: true, data: response.data });
  } catch (error: any) {
    console.error("WhatsApp failed:", error.response?.data || error.message);
    res.status(500).json({ error: error.response?.data?.reason || error.message });
  }
});

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Express Global Error:", err);
  res.status(500).json({ error: err.message || "Internal Server Error" });
});

// Vite middleware setup
async function startServer() {
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    const vitePkg = "vite";
    const { createServer: createViteServer } = await import(vitePkg);
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else if (!process.env.VERCEL) {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

startServer();

export default app;
