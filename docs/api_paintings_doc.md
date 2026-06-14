# Dokumentasi `api/paintings.js`

File `api/paintings.js` adalah sebuah serverless function (API Route) Vercel yang bertindak sebagai backend controller untuk mengelola database lukisan/gambar. API ini berkomunikasi langsung dengan penyimpanan cloud **Vercel Blob** untuk menyimpan dan mengambil data terupdate dalam berkas `paintings.json`.

---

## Logika & Arsitektur Utama

1. **Penyimpanan Berbasis Cloud (Vercel Blob)**:
   API tidak menyimpan file database secara lokal di server melainkan menggunakan Vercel Blob (`@vercel/blob`) agar data bersifat persisten (tidak hilang saat serverless function mati/direset).
2. **RESTful Handler**:
   API mendengarkan dan merespons metode HTTP `GET` dan `POST`.

---

## Detail Fungsi & Handler

### `handler(request, response)` (Ekspor Utama)
Fungsi handler utama yang mengeksekusi request HTTP masuk.

* **Tipe**: `Asynchronous Function` (Default Export)
* **Parameter**:
  * `request` (Object): Request dari client berisi informasi metode, body, dll.
  * `response` (Object): Response object untuk mengirim data kembali ke client.

#### **Alur Logika GET (Mengambil Daftar Lukisan)**:
1. Ketika client mengirimkan request `GET` ke `/api/paintings`.
2. Server memanggil fungsi `list()` dari library `@vercel/blob` untuk memindai daftar file yang tersimpan.
3. Mencari file bernama `paintings.json` di cloud:
   * Jika **tidak ditemukan**, API akan mengembalikan status `200` dengan array kosong (`[]`).
   * Jika **ditemukan**, API mengambil URL file tersebut, mendownload konten terbarunya menggunakan `fetch()`, memparsingnya menjadi JSON, dan mengembalikannya ke client dengan status `200`.
4. Jika terjadi kendala koneksi, API menangkap error dan mengembalikan status `500`.

#### **Alur Logika POST (Menyimpan / Memperbarui Lukisan)**:
1. Ketika client (dalam hal ini, form panel admin) mengirimkan request `POST` berisi data JSON lukisan baru di `request.body`.
2. Validasi awal dilakukan untuk memastikan objek lukisan memiliki atribut minimal `id` dan `title`. Jika tidak valid, mengembalikan status `400`.
3. Memanggil fungsi `list()` untuk memeriksa keberadaan file database `paintings.json` di Vercel Blob.
4. Menyiapkan array lukisan:
   * Jika file database belum ada, inisialisasi array kosong `[]`.
   * Jika sudah ada, unduh isi database terupdate lewat fetch URL.
5. Memeriksa apakah lukisan dengan `id` yang sama sudah ada di dalam array:
   * Jika **sudah ada**, data lukisan lama akan ditimpa dengan data baru yang dikirim (operasi Update).
   * Jika **belum ada**, data baru akan didorong ke dalam array menggunakan `push()` (operasi Create).
6. Mengunggah kembali array JSON utuh ke Vercel Blob menggunakan fungsi `put('paintings.json', ...)` dengan opsi:
   * `access: 'public'` agar dapat dibaca publik.
   * `contentType: 'application/json'` format tipe data.
   * `addRandomSuffix: false` agar URL database tetap statis tanpa akhiran karakter acak (sehingga mudah ditimpa secara konsisten).
7. Jika sukses, mengembalikan status `200` beserta data terbaru yang disimpan. Jika gagal, menangkap error dan mengembalikan status `500`.
