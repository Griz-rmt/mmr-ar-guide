# Dokumentasi `js/admin.js`

File `js/admin.js` adalah modul JavaScript utama yang mengendalikan Panel Admin. File ini menangani perubahan visual status input berkas, proses validasi formulir, koordinasi unggahan berkas multipart target NFT secara asinkronus langsung ke *Vercel Blob Storage*, pembaruan antarmuka visual progress unggah, dan penyimpanan metadata ke database JSON.

---

## Variabel & Konfigurasi Utama
* `fileInputs` (Array): Daftar tipe input berkas yang dikelola secara dinamis (`['image', 'fset', 'fset3', 'iset']`).
* `uploadConfig` (Object): Konfigurasi unggah Vercel Blob client-side:
  * `access`: Ditetapkan sebagai `'public'` agar berkas dapat diakses secara publik.
  * `handleUploadUrl`: Ditetapkan ke `/api/upload` yang bertugas memberikan tanda tangan keamanan (token otorisasi) untuk klien.

---

## Detail Fungsi & Logika

### 1. Inisialisasi Event Listener Input Berkas
Melakukan perulangan di setiap elemen input berkas dalam array `fileInputs` untuk mengaktifkan perubahan gaya visual saat berkas dipilih:
* **Logika**:
  1. Mendapatkan elemen input (`file-[type]`), kotak pembungkus (`box-[type]`), dan label teks (`lbl-[type]`).
  2. Menyimpan nama label bawaan (*default label*).
  3. Menambahkan listener `'change'`:
     * Jika berkas berhasil dipilih oleh pengguna (`input.files.length > 0`): menambahkan kelas CSS `.file-box-selected` pada kotak pembungkus dan mengganti teks label dengan nama asli berkas.
     * Jika pemilihan dibatalkan atau kosong: menghapus kelas CSS `.file-box-selected` dan mengembalikan teks label ke nama bawaan.

### 2. Handler Pengiriman Formulir (`submit` event)
Mengambil alih event submit dari form `#upload-form` untuk memproses unggah seluruh aset gambar & target NFT serta menyimpan metadata lukisan secara terpusat.
* **Tipe**: `Asynchronous Function`
* **Logika**:
  1. Mencegah aksi bawaan submit HTML (`e.preventDefault()`).
  2. Membaca dan membersihkan spasi awal/akhir (*trimming*) seluruh nilai metadata lukisan (Judul, Seniman, Era, Medium, Dimensi, Lokasi, Deskripsi).
  3. Mengambil file blob dari masing-masing elemen masukan input berkas (Gambar, FSET, FSET3, ISET).
  4. Menghasilkan ID Lukisan unik (`paintingId`) berbasis teks judul dengan mengubah menjadi huruf kecil dan membuang semua karakter selain alfanumerik (`title.toLowerCase().replace(/[^a-z0-9]/g, '')`).
  5. Memvalidasi bahwa ID Lukisan terbentuk dengan benar. Jika tidak valid, proses dihentikan dini dan menampilkan peringatan.
  6. Mengambil format ekstensi berkas gambar (`imgExt`).
  7. Mengaktifkan visual progress overlay (`#progress-overlay` diberi kelas `.active`), menonaktifkan tombol submit (`#btn-submit`), dan menampilkan spinner loading (`#btn-spinner`).
  8. Menjalankan proses unggah asinkronus secara berurutan menggunakan metode asinkronus `upload` dari `@vercel/blob/client`:
     * **Langkah 1**: Mengunggah gambar preview ke `paintings/[paintingId]/target.[imgExt]`.
     * **Langkah 2**: Mengunggah berkas tracking `.fset` ke `paintings/[paintingId]/target.fset`.
     * **Langkah 3**: Mengunggah berkas tracking `.fset3` ke `paintings/[paintingId]/target.fset3`.
     * **Langkah 4**: Mengunggah berkas tracking `.iset` ke `paintings/[paintingId]/target.iset`.
     Setiap proses di atas memperbarui visual indikator status pada UI menjadi `Mengunggah...` lalu `Selesai` menggunakan fungsi `updateStatus`.
  9. Mengonversi URL berkas `.fset` yang dihasilkan menjadi URL basis NFT dengan membuang ekstensi `.fset` dari string URL.
  10. Mengirimkan permintaan `POST` ke `/api/paintings` yang membawa JSON payload metadata lukisan baru beserta URL Blob dari berkas gambar preview dan NFT base URL.
  11. Jika respons database sukses, status diubah menjadi `Selesai`, menampilkan pesan sukses, dan mengarahkan kembali pengguna ke halaman utama kamera (`/`).
  12. Jika terjadi kegagalan/error dalam proses:
      * Mencetak error ke konsol browser dan memunculkan peringatan.
      * Menyembunyikan kembali overlay progress dan mengaktifkan kembali tombol submit formulir.
      * Melakukan iterasi di semua langkah progress dan mengubah status langkah yang masih menunggu/sedang berjalan menjadi `Gagal` dengan kelas CSS `.status-error`.

### 3. Fungsi Pembantu `updateStatus(step, type, text)`
Fungsi utilitas visual untuk memperbarui status baris proses unggah asinkronus pada progress overlay.
* **Parameter**:
  * `step` (String): ID langkah proses (`'image'`, `'fset'`, `'fset3'`, `'iset'`, atau `'db'`).
  * `type` (String): Tipe kelas visual status (`'waiting'`, `'uploading'`, `'done'`, atau `'error'`).
  * `text` (String): Teks status yang akan ditampilkan kepada pengguna.
* **Logika**:
  1. Mendapatkan elemen teks status di DOM dengan ID `status-[step]`.
  2. Mengganti teks konten dengan parameter `text`.
  3. Mengatur ulang kelas nama elemen tersebut menjadi `step-status status-[type]` untuk memicu pembaruan warna teks di CSS.
