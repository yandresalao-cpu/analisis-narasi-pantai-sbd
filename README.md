# Analisis Narasi Ulasan Wisata Pantai Sumba Barat Daya

Versi 1.0 — aplikasi analisis awal yang berdiri terpisah dari website rekap PHP–MySQL.

Pemilik penelitian: **Emilianus Aloysius Fernando · NIM 2581011002 · Prodi Magister Pariwisata, Fakultas Pariwisata, Universitas Udayana Denpasar · 2026**.

## Apa yang tersedia

- Halaman responsif dengan foto Pantai Mbawana dari aplikasi sentimen milik pengguna. Foto disertakan sebagai berkas lokal, tidak memakai hotlink. Sumber berkas: https://yandresalao-cpu.github.io/weighted-lexicon-sentiment-analysis-Beaches-in-SBD/pantaimbawana.jpg . Status lisensi pihak ketiga belum diverifikasi; gunakan sesuai hak penggunaan yang dimiliki pemilik proyek.
- Formulir “Masukan ulasan” dan “Analisis”. Beberapa ulasan dipisahkan oleh `---` pada baris tersendiri.
- Analisis AI: open coding, axial coding, selective coding, dan draf interpretasi dengan bukti sumber.
- Node Tree, Diagram Bingkai, dan Treemap yang dihitung/digambar dari hasil coding yang sama. Bukan gambar generatif AI.
- Unduh setiap diagram dalam SVG/PNG, laporan mandiri HTML, data JSON; cetak halaman ke PDF dari browser.
- Klik kode/simpul/kotak untuk melihat kutipan dan ulasan utuh. Memo peneliti diekspor terpisah dari hasil AI.
- Koneksi privat memakai kode akses; API key tidak pernah dikirim ke browser.
- Tidak ada penghitungan sentimen di aplikasi ini. Hasil sentimen tetap diinput manual pada website rekap terpisah sebagaimana rancangan penelitian.

## Penting sebelum mulai

Paket ini **belum dipublikasikan** dan belum terhubung ke akun AI. Tampilan bisa dibuka setelah diunggah ke GitHub Pages, tetapi tombol Analisis memerlukan backend dan API key aktif. Tidak ada analisis palsu atau hasil contoh yang menyamar sebagai hasil AI. Tombol “Isi contoh ulasan” hanya mengisi dua ulasan buatan, tetap memerlukan AI untuk dianalisis dan hasilnya ditandai sebagai contoh.

GitHub Pages hanya menjalankan HTML/CSS/JavaScript. Paket ini memakai **Cloudflare Worker** kecil sebagai backend API pendamping. Ini tidak mengganti rancangan PHP–MySQL website rekap; keduanya aplikasi terpisah. Pemakaian API AI memerlukan akun API dan dapat menimbulkan biaya sesuai pemakaian. Ketersediaan model bergantung pada akun. Jangan mengirim API key melalui percakapan atau memasukkannya dalam repositori.

## 1. Pasang antarmuka di GitHub Pages

1. Ekstrak ZIP ini di komputer.
2. Buat repositori, misalnya `analisis-narasi-pantai-sbd`.
3. Unggah **isi folder narasi-sbd** ke akar repositori. Struktur akhirnya harus memiliki folder `docs`, `backend`, `tests`, serta `package.json` di akar. Jangan hanya mengunggah ZIP.
4. Buka **Settings → Pages → Build and deployment → Deploy from a branch**.
5. Pilih branch **main**, folder **/docs**, lalu **Save**.
6. Tunggu proses deployment berhasil. Untuk nama repositori contoh, tautannya menjadi `https://yandresalao-cpu.github.io/analisis-narasi-pantai-sbd/`.

Jika nama repositori lain, gunakan URL yang benar-benar ditampilkan GitHub. Jangan membuka `index.html` dengan klik ganda untuk pengujian modul JavaScript; gunakan GitHub Pages atau server lokal.

## 2. Pasang backend AI

Backend ini dipasang **sekali** pada akun Cloudflare Anda. Diperlukan Node.js LTS yang didukung Wrangler, npm, akun Cloudflare, dan API key OpenAI aktif. Perintah berikut dijalankan dari Terminal pada folder `narasi-sbd` hasil ekstraksi.

```sh
npm install
npx wrangler login
```

Buka `backend/wrangler.toml`. Nilai `ALLOWED_ORIGIN` sudah diisi `https://yandresalao-cpu.github.io`; ini hanya origin tanpa nama repositori dan tanpa garis miring terakhir. Jika memakai domain lain, sesuaikan. `OPENAI_MODEL` menggunakan `gpt-4.1-mini` sebagai konfigurasi awal; ganti dengan model akun Anda yang mendukung Chat Completions dan Structured Outputs jika diperlukan.

Pasang kode backend:

```sh
npm run deploy:api
```

Simpan dua secret lewat prompt interaktif Terminal:

```sh
npx wrangler secret put OPENAI_API_KEY --config backend/wrangler.toml
npx wrangler secret put ACCESS_TOKEN --config backend/wrangler.toml
```

- `OPENAI_API_KEY`: isi API key dari akun OpenAI Anda.
- `ACCESS_TOKEN`: buat sandi acak panjang minimal 32 karakter untuk akses privat aplikasi. Ini berbeda dari API key. Jangan gunakan sandi akun pribadi. Simpan sendiri, jangan unggah ke GitHub.
- Secret juga dapat dikelola pada pengaturan Worker melalui dashboard Cloudflare. Jangan menulis nilainya pada file `wrangler.toml`.

Worker menolak permintaan sebelum semua konfigurasi terisi. URL Worker akan ditampilkan setelah deploy. Tambahkan `/analyze`, contohnya `https://narasi-pantai-sbd-api.NAMA-AKUN.workers.dev/analyze`.

### Alternatif tanpa Terminal: dashboard Cloudflare

Jika ingin memasang melalui browser, buat Worker pada dashboard Cloudflare, buka editor kode, lalu ganti seluruh kode dengan isi **backend/worker-standalone.js** dan deploy. Berkas ini sudah menggabungkan modul sehingga tidak memerlukan impor file lain.

Pada Settings/Variables and Secrets Worker, tambahkan:

| Nama | Jenis | Nilai |
|---|---|---|
| `ALLOWED_ORIGIN` | Text | `https://yandresalao-cpu.github.io` |
| `OPENAI_MODEL` | Text | `gpt-4.1-mini` atau model kompatibel yang tersedia pada akun |
| `OPENAI_API_KEY` | Secret | API key milik Anda |
| `ACCESS_TOKEN` | Secret | Kode akses acak privat minimal 32 karakter |

Terapkan perubahan, kemudian gunakan URL Worker ditambah `/analyze`. Pilih **salah satu** jalur pemasangan (Terminal atau dashboard). Jika kode sumber diubah kelak, berkas standalone harus digenerasi ulang dari `docs/core.js` dan `backend/worker.js`; jangan menganggapnya otomatis mengikuti perubahan file lain.

## 3. Hubungkan aplikasi

1. Buka aplikasi GitHub Pages.
2. Buka **Pengaturan koneksi AI**.
3. Isi alamat Worker lengkap dengan `/analyze` dan kode `ACCESS_TOKEN` yang Anda buat.
4. Klik **Gunakan koneksi**. Ini memeriksa format konfigurasi, belum memanggil AI.
5. Masukkan ulasan lalu pilih **Analisis** untuk menguji koneksi sebenarnya.

Agar tidak perlu mengisi alamat backend setiap kali, ubah `docs/config.js` di GitHub:

```js
window.APP_CONFIG = {
  apiUrl: "https://narasi-pantai-sbd-api.NAMA-AKUN.workers.dev/analyze"
};
```

**Hanya alamat backend yang boleh dimasukkan dalam file ini.** Kode akses tetap diisi melalui antarmuka dan hanya bertahan selama tab terbuka. Endpoint publik bukan rahasia; akses diproteksi token backend. Proteksi ini ditujukan untuk satu peneliti, bukan sistem multiuser. Jika hendak dibuka bagi banyak orang, tambahkan autentikasi per pengguna, pembatasan laju, dan kuota server terlebih dahulu. Saat ini tidak ada pembatasan biaya otomatis per pengguna; pantau pemakaian akun AI dan jangan membagikan token.

## 4. Memakai instrumen

Tempel satu ulasan utuh termasuk beberapa paragraf. Untuk banyak ulasan, gunakan:

```text
Isi ulasan pertama.
Paragraf kedua masih ulasan pertama.
---
Isi ulasan kedua.
```

Jumlah ulasan tidak ditetapkan 100. Untuk menjaga respons AI tetap lengkap, versi ini membatasi **18.000 karakter input per proses**, dengan batas keluaran 80 penerapan kode dan 16 kategori dalam instruksi AI. Kelompok yang terlalu kaya dapat memerlukan pemecahan manual. Aplikasi tidak mengklaim mendukung dataset tak terbatas, tidak memotong input diam-diam, dan tidak menyediakan penggabungan batch otomatis. Tinjau bagian keterbatasan untuk mengetahui kemungkinan bagian yang belum terwakili. Sintesis lintas kelompok/destinasi dilakukan pada website rekap yang direncanakan terpisah.

ID U001, U002, dst berlaku di dalam satu proses. Untuk rujukan lintas proses gunakan kombinasi **run_id + review_id**. Simpan JSON dan laporan setiap selesai menganalisis. Hasil hanya berada dalam memori halaman, tidak disimpan ke database, tidak disinkronkan antarperangkat, dan akan hilang saat muat ulang. Ulasan dikirim ke backend Worker dan penyedia AI; `store:false` digunakan untuk permintaan AI tetapi bukan janji tanpa retensi oleh semua penyedia. Hilangkan identitas pribadi yang tidak diperlukan sebelum mengirim.

## 5. Cara membaca dan memindahkan hasil

- Open coding: kode dekat dengan data, kutipan persis, penjelasan makna, rujukan ulasan.
- Axial coding: kategori, subkategori, ID open pendukung, penjelasan hubungan dan variasi.
- Selective coding: kategori inti **sementara**, penjelasan, ID axial dan bukti, kasus berlawanan, batas interpretasi. Kategori inti boleh kosong jika bukti belum cukup.
- Hubungan pada Diagram Bingkai ditampilkan per pasangan kategori agar label tidak saling menutupi. Kategori dapat muncul pada beberapa pasangan. Tidak adanya relasi menghasilkan pesan “bukti belum memadai”, bukan hubungan buatan.
- Node Tree memakai kategori → subkategori → penerapan kode. Kode bisa ditautkan ke lebih dari satu kategori jika memang relevan.
- Treemap memakai salah satu metrik yang Anda pilih: ulasan unik per kategori atau potongan unik per kategori. Potongan unik ditentukan oleh pasangan ID ulasan + teks kutipan. Kutipan identik yang berulang dalam satu ulasan dihitung satu potongan. Total antarkategori dapat melebihi jumlah sumber akibat multilabel. Luas kotak dihitung secara deterministik, bukan angka buatan AI.
- Penghitungan ini bersifat deskriptif, bukan pengukuran pentingnya suatu tema. Tidak ada klaim kejenuhan teoretis otomatis.
- Untuk website rekap manual, salin kategori axial dan selective dari laporan HTML, sertakan run_id dan kutipan pendukung. File JSON mempertahankan struktur yang sama untuk integrasi impor di masa mendatang; pengimpor website rekap belum dibuat dalam paket ini.
- Memo hanya menambahkan catatan peneliti; versi ini belum memiliki editor revisi kode/kategori dalam antarmuka. Semua hasil tetap diberi label draf, bahkan setelah memo diisi.

## 6. Mengatasi kendala

| Pesan/kondisi | Tindakan |
|---|---|
| AI belum terhubung | Pasang Worker dan isi pengaturan koneksi. |
| Asal situs tidak diizinkan / gagal fetch | Cocokkan `ALLOWED_ORIGIN` dengan origin GitHub Pages. Deploy ulang jika konfigurasi berubah. |
| Kode akses salah | Isi `ACCESS_TOKEN`, bukan API key OpenAI. |
| Backend belum dikonfigurasi | Periksa kedua Secrets dan nama model. |
| Kuota atau layanan AI gagal | Periksa akun API, saldo, pemakaian, akses model, dan API key. |
| Kutipan/rujukan tidak valid | Respons AI ditolak untuk menjaga keterlacakan. Coba lagi atau perkecil kelompok. Jangan gunakan keluaran gagal sebagai temuan. |
| Keluaran belum lengkap / waktu habis | Bagi kumpulan menjadi kelompok lebih kecil. Pembatalan di browser belum tentu menghentikan proses berbayar yang sudah berjalan di server. |
| Gambar tidak muncul | Pastikan `docs/assets/pantai-mbawana.jpg` ikut terunggah, dengan penamaan dan huruf besar/kecil sama. |
| Hasil sebelumnya masih terlihat setelah gagal | Hasil lama sengaja dipertahankan; ID proses, waktu, dan ulasan sumber di bagian hasil menunjukkan sumber hasil tersebut. |

## 7. Pengembangan dan verifikasi

```sh
npm test
```

Pengujian otomatis mencakup pemisahan ulasan, batas input, duplikasi, pencocokan kutipan, validitas ID bukti, cakupan ulasan, hitungan unik, SVG, otorisasi backend, dan respons AI lengkap/tidak lengkap melalui mock. API berbayar tidak dipanggil oleh tes.

Frontend tidak memakai CDN atau library diagram. Diagram SVG dapat diedit dalam perangkat lunak vektor; PNG dapat langsung dipakai dalam laporan. Sumber model dan versi prompt disertakan dalam ekspor untuk audit. Validasi perangkat lunak memeriksa kecocokan kutipan dan referensi, **bukan kebenaran interpretasi semantik**. Validasi akademik tetap dilakukan peneliti.

## Rujukan teknis

- GitHub Pages: https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site
- API dan Structured Outputs: https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create
- Cloudflare Secrets: https://developers.cloudflare.com/workers/configuration/secrets/
- Konfigurasi Worker: https://developers.cloudflare.com/workers/wrangler/configuration/

Rujukan diperiksa 18 Oktober 2026. Konfigurasi akun dan antarmuka hosting dapat berbeda. Belum dilakukan deployment GitHub/Cloudflare atau pengujian end-to-end dengan akun AI nyata pada saat paket disiapkan.
