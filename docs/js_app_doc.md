# Dokumentasi `js/app.js`

File `js/app.js` adalah otak utama dari aplikasi sisi client (frontend). File ini mengontrol seluruh siklus hidup inisialisasi AR, deteksi penanda (*marker tracking*), kontrol antarmuka pengguna (HUD), navigasi halaman detail, serta penanganan gestur sentuhan.

---

## Variabel Global
* `paintingsList` (Array): Menyimpan daftar data seluruh lukisan yang diunduh dari API.
* `lostTimeout` (Number): Menyimpan ID timer untuk menunda penutupan notifikasi pemindaian ketika penanda hilang secara tidak sengaja.
* `activePainting` (Object): Menyimpan referensi data lukisan yang saat ini sedang aktif dideteksi di layar kamera.

---

## Detail Fungsi & Logika

### 1. `createButtonTexture(text)`
Menghasilkan gambar tombol "Detail >" secara dinamis dengan format Data URL menggunakan HTML5 Canvas. Gambar ini digunakan sebagai material tekstur untuk tombol 3D di dalam A-Frame.
* **Parameter**: `text` (String) - Teks yang akan ditulis di tombol.
* **Return**: `String` - Data URL berformat Base64 PNG.
* **Logika**:
  1. Membuat elemen `<canvas>` ukuran 256x128 piksel secara memori.
  2. Menggambar rounded rectangle di atas kanvas dengan latar belakang gradien linear dari Cyan (`#00ffcc`) ke Biru (`#00b8ff`).
  3. Menuliskan parameter `text` di tengah kanvas menggunakan font tebal "Outfit".
  4. Mengonversi kanvas ke URL gambar Base64.

### 2. `initAR()`
Inisialisasi utama kamera AR.js dan pembuatan entitas 3D A-Frame secara dinamis berdasarkan data lukisan dari database.
* **Tipe**: `Asynchronous Function`
* **Logika**:
  1. Melakukan fetch `GET` ke `/api/paintings` untuk mengambil database lukisan terupdate.
  2. Membuat elemen `<a-scene>` dengan konfigurasi AR.js (source kamera webcam, menonaktifkan UI bawaan VR/AR).
  3. Melakukan looping pada setiap lukisan untuk membuat elemen pelacak `<a-nft>`:
     * Mengatur URL NFT pelacakan gambar berdasarkan properti `nftUrl`.
     * Membuat elemen gambar preview `<a-image>` (`img`) dan memposisikannya tepat di depan lukisan asli (posisi lokal `75 2 -110` dengan ukuran `150x220`).
     * Meredupkan warna gambar dengan atribut `color="#777777"` agar tombol detail lebih terlihat kontras.
     * Membuat tombol visual detail `<a-image>` (`btn`) dan memposisikannya di tengah gambar (posisi lokal `75 3 -110`).
     * Menambahkan listener klik (`click`) pada elemen `img` dan `btn` untuk memicu `openDetailView()`.
  4. Menambahkan event listener deteksi marker pada `<a-nft>`:
     * **`markerFound`**: Menghentikan timer hilangnya penanda, menetapkan `activePainting`, memperbarui kartu notifikasi bawah (`#scan-alert-card`), dan memunculkan notifikasi serta tombol detail terapung (`#btn-ar-detail`).
     * **`markerLost`**: Membuat timer tunda selama 3 detik. Jika penanda tidak terdeteksi kembali dalam 3 detik, kartu notifikasi dan tombol detail terapung akan disembunyikan.
  5. Membuat entitas kamera `<a-entity camera>` dengan komponen pelacak sentuh `cursor` dan `raycaster` yang diarahkan ke kelas `.clickable`.
  6. Memasukkan seluruh elemen ke dalam DOM `<body>`.

### 3. `updateFloatingButton()`
Melakukan proyeksi koordinat 3D di ruang AR ke koordinat piksel 2D pada layar layar ponsel untuk memposisikan tombol detail HTML terapung (`#btn-ar-detail`).
* **Logika**:
  1. Berjalan di latar belakang menggunakan `requestAnimationFrame`.
  2. Memeriksa keberadaan tombol terapung dan penanda aktif. Jika tidak terdeteksi, fungsi berhenti dini.
  3. Mengambil titik lokal 3D tombol (`75 3 -110`) dan mengonversinya menjadi koordinat dunia (World Matrix) menggunakan `.applyMatrix4(nft.object3D.matrixWorld)`.
  4. Memproyeksikan koordinat dunia tersebut menggunakan matriks proyeksi kamera A-Frame (`scene.camera.project()`).
  5. Memeriksa apakah posisi berada di belakang kamera (`z > 1`). Jika ya, sembunyikan tombol.
  6. Mengonversi nilai proyeksi normal (-1 hingga 1) ke piksel layar (`left` dan `top` dalam CSS) untuk memposisikan tombol HTML mengambang tepat di sebelah lukisan di layar.

### 4. `openDetailView()`
Membuka antarmuka detail lukisan, mematikan kamera webcam untuk hemat daya baterai, dan menampilkan viewer 3D.
* **Logika**:
  1. Membaca `data-painting-id` dari tombol pemicu.
  2. Mencari data lukisan yang cocok di `paintingsList`.
  3. Memperbarui seluruh elemen informasi teks di layar detail (Judul, Medium, Dimensi, Deskripsi, dll).
  4. Memulai atau memperbarui Three.js `PaintingViewer` dengan URL gambar lukisan terpilih.
  5. Memberikan kelas aktif `.active` pada layar detail dan memastikan bottom sheet dalam keadaan terbuka (`collapsed` dihapus).
  6. Menonaktifkan aliran streaming kamera webcam (`video.srcObject.getTracks()`) dan menyembunyikan canvas rendering A-Frame utama agar menghemat daya komputasi ponsel.

### 5. `closeDetailView()`
Kembali dari halaman detail ke mode kamera pemindaian AR.
* **Logika**:
  1. Menutup layar detail (menghapus kelas `.active`).
  2. Menyalakan kembali aliran streaming kamera webcam.
  3. Menampilkan kembali canvas utama AR dan mengaktifkan interaksi kursor A-Frame.
  4. Jika penanda lukisan masih terdeteksi saat kembali, munculkan kembali tombol detail terapung di layar.

---

## Penanganan Sentuhan Khusus (Capture-Phase Touch Interceptors)
Pada bagian bawah file, terdapat event listener sentuh khusus pada tingkat dokumen (`touchstart` dan `touchend`) dengan opsi `capture: true`.
* **Tujuan**: A-Frame secara default mencegat seluruh event sentuhan di layar ponsel untuk mengontrol kamera 3D, sehingga tombol HTML normal sering kali menjadi tidak bisa ditekan (*unclickable*).
* **Solusi**: Sentuhan pada elemen UI penting (seperti tombol kembali, tombol detail, dan drag handle bottom sheet) ditangkap lebih awal di fase *capture*. Event ini diproses langsung lalu dihentikan penyebarannya (`e.stopImmediatePropagation()`) agar tidak sampai ke modul A-Frame.
* **Fungsionalitas Drag Handle**: Menyimpan titik sentuh awal `dragStartY`. Pada event `touchend`, jarak pergeseran vertikal (`diffY`) dihitung:
  * Jika jarak pergeseran sangat kecil (<10px), dianggap sebagai **ketukan biasa** -> memicu buka/tutup (*toggle*) bottom sheet.
  * Jika digeser ke bawah (>40px), menutup/mengecilkan bottom sheet (`collapsed` aktif).
  * Jika digeser ke atas (<-40px), membuka bottom sheet (`collapsed` nonaktif).
