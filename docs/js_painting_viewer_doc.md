# Dokumentasi `js/painting-viewer.js`

File `js/painting-viewer.js` berisi kelas `PaintingViewer` yang mengontrol penampil lukisan 3D mandiri (*standalone*) menggunakan **Three.js** di dalam halaman detail. Modul ini bertanggung jawab merender model lukisan, memasang bingkai dekoratif berwarna emas, dan menangani kontrol rotasi serta zoom cubit (*pinch-to-zoom*) secara manual.

---

## Properti Kelas `PaintingViewer`
* `container` (HTMLElement): Wadah DOM tempat kanvas Three.js akan disematkan.
* `scene` (THREE.Scene): Tempat menaruh objek, lampu, dan kamera.
* `camera` (THREE.PerspectiveCamera): Kamera perspektif untuk melihat objek 3D.
* `renderer` (THREE.WebGLRenderer): Renderer WebGL berakselerasi grafis untuk menggambar visual ke kanvas.
* `paintingGroup` (THREE.Group): Grup kontainer Three.js untuk menyatukan mesh lukisan, bingkai, dan panel belakang agar dapat diputar bersama.
* `rotationX` / `rotationY` (Number): Menyimpan akumulasi rotasi objek pada sumbu X dan Y.
* `zoomLevel` (Number): Jarak kamera dari objek 3D (default: `4.5`).
* `isDragging` (Boolean): Menandai apakah pengguna sedang menyeret layar (untuk rotasi).
* `isPinching` (Boolean): Menandai apakah pengguna sedang mencubit layar dengan 2 jari (untuk zoom).

---

## Metode & Fungsionalitas Kelas

### 1. `constructor(container)`
Inisialisasi dasar ruang Three.js.
* **Logika**:
  1. Menyiapkan instansiasi `THREE.Scene`.
  2. Membuat kamera perspektif dan memposisikan kedalamannya berdasarkan `zoomLevel`.
  3. Menginisialisasi `WebGLRenderer` dengan opsi *alpha: true* (transparan) dan antialias aktif, lalu memasukkan kanvasnya ke wadah `container`.
  4. Menambahkan pencahayaan (*lighting*):
     * `AmbientLight`: Cahaya merata di seluruh ruangan agar tekstur terlihat alami (intensitas `0.6`).
     * Dua buah `DirectionalLight` (cahaya terarah) dari sisi depan-atas dan belakang-bawah untuk memunculkan efek bayangan kedalaman pada bingkai emas.
  5. Menambahkan `paintingGroup` ke dalam scene.
  6. Memanggil `_bindEvents()` untuk mendaftarkan pendengar input dan memulai perulangan animasi `_animate()`.

### 2. `updatePainting(imageUrl)`
Mengganti lukisan yang ditampilkan dengan gambar baru secara dinamis berdasarkan URL yang dipilih.
* **Logika**:
  1. Bersihkan seluruh mesh lama (lukisan, bingkai, panel belakang) dari `paintingGroup` untuk menghemat memori. Melakukan pembuangan memori (*dispose*) secara eksplisit pada material, tekstur, dan geometri lama.
  2. Reset nilai rotasi grup ke nol.
  3. Menggunakan `THREE.TextureLoader` untuk mengunduh gambar lukisan baru dari URL:
     * Mengatur profil ruang warna tekstur menjadi sRGB (`SRGBColorSpace`) agar warna lukisan tetap akurat.
     * Menghitung rasio aspek gambar (*aspect ratio*). Skala lebar/tinggi disesuaikan secara proporsional dengan batas ukuran maksimal `2.5` unit Three.js.
     * Membuat mesh bidang datar lukisan (`PlaneGeometry`) dengan tekstur lukisan.
     * Membuat **bingkai dekoratif emas** di sekeliling bidang lukisan menggunakan 4 buah `BoxGeometry` (atas, bawah, kiri, kanan) dengan material metalik berwarna emas kuno (`#c9a84c`).
     * Membuat panel penutup belakang berbahan kayu cokelat tua (`#3a2a1a`) untuk menutup sisi belakang lukisan.
  4. Menyetel ukuran kanvas renderer dan rasio aspek kamera agar sesuai dengan dimensi terbaru wadah kontainer.

### 3. `_getPinchDist(e)`
Menghitung jarak piksel Euclidean antara dua titik sentuhan jari di layar. Digunakan sebagai dasar kalkulasi pinch-zoom.
* **Parameter**: `e` (TouchEvent) - Event sentuh yang memuat data titik koordinat.
* **Return**: `Number` - Jarak antar jari dalam piksel.

### 4. `_bindEvents()` (Pribadi)
Mendaftarkan event listener untuk mengontrol rotasi dan zoom objek.

#### **Rotasi Mouse (Desktop)**:
* Mendengarkan `mousedown` untuk mengaktifkan status drag dan mencatat koordinat awal mouse.
* Mendengarkan `mousemove` untuk mendeteksi pergeseran koordinat mouse (`dx`, `dy`), lalu menambahkan nilainya ke `rotationY` dan `rotationX` (dibatasi maksimal rotasi atas-bawah 60 derajat).
* Mendengarkan `mouseup` untuk mematikan status drag.

#### **Rotasi & Zoom Sentuh (Mobile)**:
* Mendengarkan `touchstart`:
  * Jika jumlah jari yang menyentuh layar adalah **1 jari**, aktifkan status rotasi (`isDragging = true`).
  * Jika jumlah jari yang menyentuh layar adalah **2 jari**, aktifkan status zoom (`isPinching = true`), rekam jarak cubitan awal (`initialPinchDist`), dan catat tingkat zoom awal (`initialZoom`).
* Mendengarkan `touchmove`:
  * Jika sedang rotasi (1 jari), hitung selisih gesekan jari untuk memutar `paintingGroup`.
  * Jika sedang zoom (2 jari), hitung jarak cubitan terbaru. Rasio perbandingan antara jarak cubitan awal dan terbaru (`initialPinchDist / currentDist`) dikalikan dengan `initialZoom` untuk menetapkan nilai `zoomLevel` baru. Nilai ini kemudian dibatasi di rentang rentang `2` hingga `10` unit, lalu diisi ke posisi kamera `camera.position.z`.
* Mendengarkan `touchend` untuk mereset seluruh status sentuhan.

#### **Zoom Roda Mouse (Scroll Wheel Desktop)**:
* Mendengarkan event `wheel` pada kanvas untuk menaikkan atau menurunkan `zoomLevel` berdasarkan arah gulir roda mouse.

### 5. `_animate()` (Pribadi)
Loop rendering berakselerasi hardware.
* **Logika**:
  1. Memanggil `requestAnimationFrame` untuk terus melakukan rendering ulang pada frame berikutnya (biasanya 60fps).
  2. Menerapkan nilai rotasi `rotationX` dan `rotationY` terbaru pada `paintingGroup`.
  3. Memanggil `renderer.render(scene, camera)` untuk menggambar visual 3D ke layar.

### 6. `dispose()`
Menghancurkan objek penampil 3D ketika pengguna keluar dari layar detail untuk mencegah kebocoran memori (*memory leak*).
* **Logika**:
  1. Mematikan variabel kontrol loop animasi (`_animating = false`).
  2. Memanggil `renderer.dispose()` untuk membebaskan seluruh konteks grafis WebGL dari memori browser.
