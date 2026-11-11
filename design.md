# DESIGN.md

Alasan tertulis untuk setiap keputusan visual. Rujukan aturan: antislop.md + antislop-ui.
Kalau ada yang tidak tercantum di sini, itu default dan harus dipertanyakan.

## Tujuan produk

Arsip hasil jurnalistik foto. Halaman depan menampilkan daftar folder (per liputan/peristiwa).
Membuka folder menampilkan seluruh foto di dalamnya. Membuka satu foto menampilkan halaman
terpisah dengan caption dan navigasi sebelumnya/berikutnya.

Audiens: pemilik arsip dan orang yang sengaja datang (menekan bio). Bukan audiens acak,
bukan landing page produk. Fokus: karya foto, bukan diri website.

## Prinsip visual

"Pixel" di sini berarti **bahasa visual era 8/16-bit**, bukan tempelan aset game.
Yang membuatnya terasa pixel:
- Sudut tajam (radius 0), bukan pill.
- Border tebal 2–3px, warna solid.
- Shadow keras (offset tanpa blur), bukan soft blur.
- Satu font pixel untuk heading saja.

Yang **tidak** dipakai (default slop): gradient biru-ungu, background grid dot,
emoji dekoratif, badge kapsul, glow, glassmorphism, animasi loop tanpa henti,
fake terminal window, tombol dengan panah di semua tempat.

## Warna (R-29: 2–3 inti + 1 aksen)

Palette diambil dari nuansa layar CRT 8-bit, bukan dari game tertentu (hindari IP).

| Peran        | Hex       | Alasan |
|--------------|-----------|--------|
| Base (latar) | `#1a1420` | Ungu-gelap kehitaman, seperti layar CRT malam. Bukan hitam pekat agar tidak keras. |
| Surface      | `#2a2030` | Satu tingkat di atas base untuk kartu folder. Selisih cukup untuk hierarki tanpa border di mana-mana. |
| Teks utama   | `#f0e6d2` | Krem hangat, kontras tinggi di base (cek > 4.5:1). Bukan putih murni agar tidak menyilaukan. |
| Aksen        | `#e8a33d` | Amber/oranye, satu-satunya warna "terang". Dipakai HANYA untuk: state hover aktif, fokus keyboard, dan penanda foto yang sedang dibuka. Tidak untuk tombol sekunder, tidak untuk border semua kartu. |

Tema gelap dipilih karena: arsip foto lebih nyaman dilihat di latar gelap (foto jadi fokus),
dan nuansa CRT konsisten dengan arah pixel. Alasan tertulis, bukan tren.

Aksen tidak dipakai di lebih dari 2 tempat per layar (R-13 semangatnya).

## Tipografi (R-06)

- **Heading:** satu font pixel, mis. `Press Start 2P` (Google Fonts, unduh lokal agar offline).
  Hanya untuk H1/H2 dan label navigasi. Ukuran kecil (14–20px), letter-spacing normal
  (font pixel sudah lebar; jangan ditambah tracking).
- **Body:** font sistem sans yang terbaca (`system-ui, -apple-system, "Segoe UI", sans-serif`).
  Alasan: font pixel untuk paragraf caption membuat mata capek dan merusak aksesibilitas.
- Tidak memakai Inter/Geist/Space Grotesk sebagai default tanpa alasan. Body pakai system-ui
  karena netral, cepat, dan tidak berpura-pura jadi identitas.

## Spacing & ritme (R-05, RHYTHM dial = 3)

RHYTHM dial 3: section boleh bervariasi, tidak seragam.
- Grid folder: 3 kolom desktop, 2 tablet, 1 ponsel. Gap 24px.
- Halaman folder: grid foto dengan tinggi bervariasi? Tidak — untuk arsip, keseragaman
  membantu memindai. Grid seragam 3:2, gap 12px. Variasi ritme ada di jarak antar-section,
  bukan di dalam grid foto.
- Jarak antar blok: 32px / 64px / 96px (skala 3 tingkat). Tidak seragam di semua tempat.

## Motion (MOTION dial = 1)

Hover state saja: perubahan warna border ke aksen, transisi 120ms. Tidak ada fade-up,
tidak ada parallax, tidak ada loop. Sesuai dial 1.

## State

- **Empty folder:** "Belum ada foto di folder ini." + satu kalimat konteks. Bukan ilustrasi.
- **404:** halaman sederhana, menjelaskan folder/foto tidak ada, dengan link kembali ke beranda.
- Setiap kartu folder dan foto: state hover, focus keyboard (outline aksen 2px), dan active.

## Yang sengaja TIDAK ada

- Testimoni, logo "Trusted By", pricing, FAQ, "How It Works" — bukan produk itu.
- Statistik angka atau feed aktivitas.
- Badge "AI Powered", eyebrow di atas H1, status dot dekoratif.
- Upload dari web (fase berikutnya). Sekarang foto ditaruh manual + edit JSON.