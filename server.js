const os = require('os'); // Tambahkan ini di paling atas, bersama require lainnya
require('dotenv').config();

const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = process.env.PORT || 3000;

const FOTO_DIR = path.join(__dirname, 'public', 'foto');
const LOG_FILE = path.join(__dirname, 'data', 'kunjungan.jsonl');
const EKSTENSI_GAMBAR = new Set(['.jpg', '.jpeg', '.png', '.webp']);

function dapatkanTanggalFile(filePath) {
  try {
    const stats = fs.statSync(filePath);
    const date = stats.birthtimeMs > 0 ? stats.birthtime : stats.mtime;
    return date.toISOString().split('T')[0];
  } catch (err) {
    return null;
  }
}

// Mengambil data sistem tanpa library eksternal
function dapatkanStatistikSistem() {
  try {
    // 1. RAM (Menggunakan modul os bawaan Node.js)
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    
    const ramDigunakan = (usedMem / 1024 / 1024 / 1024).toFixed(1);
    const ramTotal = (totalMem / 1024 / 1024 / 1024).toFixed(1);

    // 2. CPU (Menggunakan os.loadavg untuk Linux/Mac, atau estimasi untuk Windows)
    // os.loadavg() hanya bekerja optimal di Linux (Pterodactyl).
    // Di Windows, kita gunakan pendekatan sederhana berbasis os.cpus()
    let cpuPersen = 0;
    if (os.platform() === 'win32') {
      // Estimasi kasar untuk Windows (karena Node.js tidak punya API CPU realtime bawaan)
      const cpus = os.cpus();
      let totalIdle = 0, totalTick = 0;
      cpus.forEach(cpu => {
        for (type in cpu.times) totalTick += cpu.times[type];
        totalIdle += cpu.times.idle;
      });
      const idle = totalIdle / cpus.length;
      const total = totalTick / cpus.length;
      cpuPersen = Math.round(100 - ~~(100 * idle / total));
    } else {
      // Linux (Pterodactyl)
      const load = os.loadavg()[0];
      const cores = os.cpus().length;
      cpuPersen = Math.min(100, Math.round((load / cores) * 100));
    }

    // 3. DISK (Menggunakan modul fs bawaan)
    // Kita hanya mengecek ukuran total proyek web kita (folder public/foto) 
    // Dibandingkan dengan sisa ruang, atau hanya menampilkan ukuran folder.
    // Untuk menghindari crash lintas platform (Windows vs Linux Container),
    // kita akan menghitung ukuran folder proyek saat ini.
    
    // Kita gunakan trik sederhana: hitung ukuran folder 'public/foto' sebagai representasi disk terpakai
    const folderFoto = path.join(__dirname, 'public', 'foto');
    let totalUkuranFoto = 0;
    if (fs.existsSync(folderFoto)) {
      // Fungsi bantu hitung ukuran
      const hitungUkuran = (dir) => {
        let size = 0;
        fs.readdirSync(dir).forEach(file => {
          const fp = path.join(dir, file);
          const stat = fs.statSync(fp);
          if (stat.isDirectory()) size += hitungUkuran(fp);
          else size += stat.size;
        });
        return size;
      };
      totalUkuranFoto = (hitungUkuran(folderFoto) / 1024 / 1024 / 1024).toFixed(2);
    }

    return {
      cpu: cpuPersen,
      ramDigunakan: ramDigunakan,
      ramTotal: ramTotal,
      // Karena membaca total disk host di Pterodactyl sering diblokir, 
      // kita tampilkan ukuran folder foto sebagai indikator "Penyimpanan Arsip"
      diskDigunakan: totalUkuranFoto,
      diskTotal: 'N/A' 
    };
  } catch (err) {
    return { cpu: '0', ramDigunakan: '0', ramTotal: '0', diskDigunakan: '0', diskTotal: '0' };
  }
}

function waktuWITA() {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Makassar',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false
  }).format(new Date());
}

function judulDariSlug(slug) {
  return slug.replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).trim();
}

function bacaMetadataFolder(folderPath, slug) {
  const fileTxt = path.join(folderPath, '_folder.txt');
  if (fs.existsSync(fileTxt)) {
    const baris = fs.readFileSync(fileTxt, 'utf8').split(/\r?\n/).map(b => b.trim());
    return {
      judul: baris[0] || judulDariSlug(slug),
      tanggal: baris[1] || '',
      deskripsi: baris.slice(2).join(' ').trim()
    };
  }
  return { judul: judulDariSlug(slug), tanggal: '', deskripsi: '' };
}

function bacaFotoFolder(folderPath) {
  if (!fs.existsSync(folderPath)) return [];
  
  const semuaFile = fs.readdirSync(folderPath);
  const grupFoto = {};

  semuaFile.forEach(nama => {
    const ext = path.extname(nama).toLowerCase();
    if (EKSTENSI_GAMBAR.has(ext)) {
      const namaTanpaEkstensi = path.parse(nama).name;
      
      if (!grupFoto[namaTanpaEkstensi]) {
        grupFoto[namaTanpaEkstensi] = { webp: null, asli: null };
      }

      if (ext === '.webp') {
        grupFoto[namaTanpaEkstensi].webp = nama;
      } else {
        if (!grupFoto[namaTanpaEkstensi].asli || ext === '.jpg') {
          grupFoto[namaTanpaEkstensi].asli = nama;
        }
      }
    }
  });

  return Object.keys(grupFoto)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map(namaTanpaEkstensi => {
      const grup = grupFoto[namaTanpaEkstensi];
      const fileTampil = grup.webp || grup.asli;
      const fileAsli = grup.asli || grup.webp; 

      return {
        slug: namaTanpaEkstensi,
        judul: namaTanpaEkstensi,
        fileTampil: fileTampil,
        fileAsli: fileAsli
      };
    });
}

function bacaSemuaFolder() {
  if (!fs.existsSync(FOTO_DIR)) return [];
  return fs.readdirSync(FOTO_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => {
      const slug = d.name;
      const folderPath = path.join(FOTO_DIR, slug);
      const meta = bacaMetadataFolder(folderPath, slug);
      const fotos = bacaFotoFolder(folderPath);
      return {
        slug, judul: meta.judul, tanggal: meta.tanggal, deskripsi: meta.deskripsi,
        fotos,
        cover: fotos.length > 0 ? `/foto/${slug}/${fotos[0].fileTampil}` : null
      };
    })
    .sort((a, b) => {
      if (!a.tanggal && !b.tanggal) return a.judul.localeCompare(b.judul);
      if (!a.tanggal) return 1;
      if (!b.tanggal) return -1;
      return b.tanggal.localeCompare(a.tanggal);
    });
}

function catatKunjungan(nama, kelas) {
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  const entri = JSON.stringify({ waktu: waktuWITA(), nama, kelas });
  fs.appendFileSync(LOG_FILE, entri + '\n', 'utf8');
}

function bacaLog() {
  if (!fs.existsSync(LOG_FILE)) return [];
  return fs.readFileSync(LOG_FILE, 'utf8')
    .split('\n')
    .filter(b => b.trim())
    .map(b => { try { return JSON.parse(b); } catch { return null; } })
    .filter(Boolean)
    .reverse();
}

function kunciCocok(input) {
  const kunciBenar = process.env.KUNCI_LOG || '';
  if (!kunciBenar || !input) return false;
  const a = Buffer.from(input);
  const b = Buffer.from(kunciBenar);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.get('/', (req, res) => {
  res.render('masuk', { error: null, nilai: { nama: '', kelas: '' } });
});

app.post('/masuk', (req, res) => {
  const nama = String(req.body.nama || '').trim();
  const kelas = String(req.body.kelas || '').trim();

  if (nama.length < 1 || kelas.length < 1) {
    return res.status(400).render('masuk', {
      error: 'Nama dan kelas wajib diisi (minimal 1 karakter).',
      nilai: { nama, kelas }
    });
  }

  catatKunjungan(nama, kelas);
  res.redirect('/arsip');
});
// Halaman arsip utama
app.get('/arsip', (req, res) => {
  res.render('index', { folders: bacaSemuaFolder(), currentPath: '/arsip' });
});

// Halaman isi folder
app.get('/folder/:slug', (req, res, next) => {
  const folder = bacaSemuaFolder().find(f => f.slug === req.params.slug);
  if (!folder) return next();
  res.render('folder', { folder, currentPath: `/folder/${folder.slug}` });
});

// Halaman satu foto
app.get('/folder/:slug/:fotoSlug', (req, res, next) => {
  const folder = bacaSemuaFolder().find(f => f.slug === req.params.slug);
  if (!folder) return next();
  const index = folder.fotos.findIndex(f => f.slug === req.params.fotoSlug);
  if (index === -1) return next();
  
  const foto = folder.fotos[index];
  const preferensiHd = req.cookies.preferensi_hd === '1';
  const fileTampil = preferensiHd ? foto.fileAsli : foto.fileTampil;

  res.render('foto', {
    folder, 
    foto: { ...foto, fileTampil: fileTampil },
    preferensiHd,
    posisiSekarang: index + 1,
    totalFoto: folder.fotos.length,
    sebelumnya: index > 0 ? folder.fotos[index - 1] : null,
    berikutnya: index < folder.fotos.length - 1 ? folder.fotos[index + 1] : null,
    currentPath: `/folder/${folder.slug}/${foto.slug}`
  });
});

// Halaman Dasbor (Publik, tanpa kunci)
app.get('/dashboard', async (req, res, next) => {
  const folders = bacaSemuaFolder();
  const entriLog = bacaLog();
  
  const memberMap = {};
  entriLog.forEach(e => {
    const key = `${e.nama} - ${e.kelas}`;
    if (!memberMap[key]) {
      memberMap[key] = { nama: e.nama, kelas: e.kelas, terakhirKunjungan: e.waktu, totalKunjungan: 1 };
    } else {
      memberMap[key].totalKunjungan += 1;
    }
  });
  const memberList = Object.values(memberMap).slice(0, 10);
  const liputanTerbaru = folders.length > 0 ? folders[0] : null;

  const historyMap = {};
  folders.forEach(folder => {
    const folderPath = path.join(FOTO_DIR, folder.slug);
    if (fs.existsSync(folderPath)) {
      const files = fs.readdirSync(folderPath);
      files.forEach(file => {
        if (EKSTENSI_GAMBAR.has(path.extname(file).toLowerCase())) {
          const tgl = dapatkanTanggalFile(path.join(folderPath, file));
          if (tgl) {
            if (!historyMap[tgl]) historyMap[tgl] = {};
            if (!historyMap[tgl][folder.slug]) historyMap[tgl][folder.slug] = 0;
            historyMap[tgl][folder.slug]++;
          }
        }
      });
    }
  });

  const historyList = Object.keys(historyMap)
    .sort((a, b) => b.localeCompare(a))
    .map(tgl => {
      const folderAktivitas = historyMap[tgl];
      const detail = Object.keys(folderAktivitas).map(slug => {
        return `${folderAktivitas[slug]} foto di folder "${slug}"`;
      }).join(', ');
      return { tanggal: tgl, detail: `Penambahan: ${detail}` };
    })
    .slice(0, 5);

  const statistikSistem = dapatkanStatistikSistem();
  const totalFoto = folders.reduce((sum, f) => sum + f.fotos.length, 0);

  res.render('dashboard', {
    statistikSistem,
    memberList,
    liputanTerbaru,
    totalFoto,
    totalLiputan: folders.length,
    historyList,
    currentPath: '/dashboard'
  });
});

app.post('/api/preferensi-hd', (req, res) => {
  const { hd } = req.body;
  if (hd === '1') {
    res.cookie('preferensi_hd', '1', { maxAge: 30 * 24 * 60 * 60 * 1000, httpOnly: true });
  } else {
    res.clearCookie('preferensi_hd');
  }
  res.json({ success: true });
});

app.get('/download/:slug/:fotoFile', (req, res, next) => {
  const folderPath = path.join(FOTO_DIR, req.params.slug);
  const filePath = path.join(folderPath, req.params.fotoFile);
  
  if (!filePath.startsWith(FOTO_DIR) || !fs.existsSync(filePath)) {
    return next();
  }

  res.download(filePath);
});

app.get('/log', (req, res, next) => {
  if (!kunciCocok(req.query.kunci)) return next();
  const entri = bacaLog();
  res.render('log', { entri, total: entri.length });
});

app.use((req, res) => {
  res.status(404).render('404');
});

app.listen(PORT, () => {
  console.log(`Server jalan di http://localhost:${PORT}`);
});