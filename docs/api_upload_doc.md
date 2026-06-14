# Dokumentasi `api/upload.js`

File `api/upload.js` adalah serverless function Vercel yang menangani inisialisasi dan verifikasi unggahan file langsung dari sisi client (*Client-Side Upload*) ke **Vercel Blob storage**. Prosedur ini aman karena menggunakan sistem penandatanganan token sementara (*temporary token generation*).

---

## Logika & Alur Kerja Utama

1. **Client-Side Uploading**:
   Unggahan file besar seperti gambar pratinjau lukisan (.jpg/.png) dan file deskriptor target AR.js (.fset, .fset3, .iset) dikirim langsung dari browser ke penyimpanan Vercel Blob tanpa perlu melewati serverless function sebagai perantara data. Ini mencegah masalah batas ukuran request (*Payload Too Large*) dan waktu habis (*timeout*) di serverless platform.
2. **Token Generation (Handshake)**:
   Sebelum client mengunggah berkas, browser akan melakukan *handshake* ke `/api/upload` untuk meminta token tanda tangan unggahan yang sah. API ini memvalidasi jenis berkas dan mengembalikan token tersebut.

---

## Detail Fungsi & Handler

### `handler(request, response)` (Ekspor Utama)
Fungsi handler utama yang memproses jabat tangan (*handshake*) unggahan dari client.

* **Tipe**: `Asynchronous Function` (Default Export)
* **Parameter**:
  * `request` (Object): Request dari client berisi metadata file yang akan diunggah.
  * `response` (Object): Response object untuk mengirim data token otorisasi kembali ke client.

#### **Alur Logika**:
1. Menolak semua metode request selain `POST`. Jika metode bukan `POST`, mengembalikan status `405` (*Method Not Allowed*).
2. Memanggil fungsi `handleUpload()` dari library `@vercel/blob/client` dengan menyertakan konfigurasi event handlers:
   * **`onBeforeGenerateToken`**:
     * Dipanggil sebelum token dibuat. Berguna untuk memvalidasi jenis file atau menambahkan hak akses keamanan (misalnya mengecek hak akses Admin).
     * Membatasi jenis file yang boleh diunggah melalui opsi `allowedContentTypes`:
       * `image/jpeg` & `image/png` (untuk gambar lukisan).
       * `application/octet-stream` & `application/x-binary` (untuk file target deskriptor tracking AR.js).
     * Mengatur `addRandomSuffix: false` agar file target AR.js disimpan dengan nama persis tanpa karakter acak di belakangnya, sehingga tracking URL A-Frame tetap konsisten dan mudah diakses.
   * **`onUploadCompleted`**:
     * Dipanggil otomatis oleh sistem Vercel ketika file sudah berhasil diunggah sepenuhnya oleh client ke storage. Berguna untuk mencatat log aktivitas unggahan.
3. Mengembalikan respons JSON berisi token otorisasi ke browser client dengan status `200`.
4. Jika terjadi kegagalan selama proses pembuatan token, error akan ditangkap dan dialihkan menjadi respons status `400` dengan pesan kesalahan detail.
