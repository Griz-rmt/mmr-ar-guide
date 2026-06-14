/**
 * app.js
 * Logika utama aplikasi Museum AR Guide.
 * Menangani: inisialisasi AR, loading screen, UI handler, dan touch events.
 * Harus dimuat SETELAH painting-viewer.js
 */

let paintingsList = [];
let lostTimeout;

// ===================================================================
// INISIALISASI AR
// Mengambil data lukisan dari API dan membuat A-Frame scene secara dinamis
// ===================================================================

// Helper untuk menghasilkan gambar tombol Detail 3D secara dinamis menggunakan Canvas
function createButtonTexture(text) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    // Gradien Latar Belakang (Cyan ke Biru, senada dengan UI)
    const gradient = ctx.createLinearGradient(0, 0, 256, 128);
    gradient.addColorStop(0, '#00ffcc');
    gradient.addColorStop(1, '#00b8ff');

    // Menggambar rounded rectangle
    ctx.fillStyle = gradient;
    const radius = 24;
    const x = 10, y = 15, w = 236, h = 98;
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();

    // Gaya teks
    ctx.fillStyle = '#0a0a0f';
    ctx.font = 'bold 30px "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 64);

    return canvas.toDataURL();
}

async function initAR() {
    // Referensi elemen UI (diambil di sini karena DOM sudah siap)
    const alertCard = document.getElementById('scan-alert-card');
    const detailScreen = document.getElementById('detail-view-screen');

    try {
        const response = await fetch('/api/paintings');
        paintingsList = await response.json();
        console.log('Database Lukisan Dimuat:', paintingsList);

        // Buat elemen a-scene AR.js dinamis
        const scene = document.createElement('a-scene');
        scene.setAttribute('vr-mode-ui', 'enabled: false;');
        scene.setAttribute('renderer', 'logarithmicDepthBuffer: true;');
        scene.setAttribute('embedded', '');
        scene.setAttribute('arjs', 'trackingMethod: best; sourceType: webcam; debugUIEnabled: false;');
        scene.setAttribute('gesture-detector', '');
        scene.setAttribute('id', 'scene');

        // Tambahkan target NFT untuk setiap lukisan
        paintingsList.forEach(painting => {
            const nft = document.createElement('a-nft');
            nft.setAttribute('type', 'nft');
            nft.setAttribute('url', painting.nftUrl);
            nft.setAttribute('id', `target-${painting.id}`);
            nft.setAttribute('smooth', 'true');
            nft.setAttribute('smoothCount', '10');
            nft.setAttribute('smoothTolerance', '.01');
            nft.setAttribute('smoothThreshold', '5');

            // Gambar Pratinjau Lukisan (diletakkan tepat di depan lukisan asli, sedikit melayang Y=2)
            // Diberi warna abu-abu gelap (color="#777777") untuk efek redup/dim di belakang tombol
            const img = document.createElement('a-image');
            img.setAttribute('src', painting.imageUrl);
            img.setAttribute('position', '75 2 -110'); // Tengah dari ukuran 150x220
            img.setAttribute('rotation', '-90 0 0');
            img.setAttribute('width', '150');
            img.setAttribute('height', '220');
            img.setAttribute('color', '#777777'); // Efek dim (gelap) pada gambar
            img.setAttribute('class', 'clickable');
            img.setAttribute('gesture-handler', '');

            // Tombol Detail 3D (diletakkan tepat di tengah gambar pratinjau, sedikit di depannya Y=3)
            const btn = document.createElement('a-image');
            btn.setAttribute('src', createButtonTexture('Detail >'));
            btn.setAttribute('position', '75 3 -110'); // Tengah dari gambar
            btn.setAttribute('rotation', '-90 0 0');
            btn.setAttribute('width', '60');
            btn.setAttribute('height', '30');
            btn.setAttribute('class', 'clickable');

            nft.appendChild(img);
            nft.appendChild(btn);
            scene.appendChild(nft);

            // Handler Klik untuk beralih ke Halaman Detail
            img.addEventListener('click', () => {
                // Hanya proses klik jika target NFT ini benar-benar sedang terdeteksi/terlihat oleh kamera
                if (!nft.object3D || !nft.object3D.visible) {
                    console.log('[AR] Mengabaikan klik pada gambar yang tidak terlihat:', painting.title);
                    return;
                }
                console.log('[AR] Lukisan diketuk:', painting.title);
                document.getElementById('btn-show-detail').setAttribute('data-painting-id', painting.id);
                openDetailView();
            });

            btn.addEventListener('click', () => {
                // Hanya proses klik jika target NFT ini benar-benar sedang terdeteksi/terlihat oleh kamera
                if (!nft.object3D || !nft.object3D.visible) {
                    console.log('[AR] Mengabaikan klik pada tombol yang tidak terlihat:', painting.title);
                    return;
                }
                console.log('[AR] Tombol Detail diketuk:', painting.title);
                document.getElementById('btn-show-detail').setAttribute('data-painting-id', painting.id);
                openDetailView();
            });

            // Event deteksi lukisan
            nft.addEventListener('markerFound', () => {
                clearTimeout(lostTimeout);

                // Perbarui alert card
                document.querySelector('#scan-alert-card img').src = painting.imageUrl;
                document.querySelector('#scan-alert-card h3').textContent = painting.title;
                document.getElementById('btn-show-detail').setAttribute('data-painting-id', painting.id);

                document.getElementById('scan-alert-card').classList.add('active');
                console.log(`Ditemukan target: ${painting.title}`);
            });

            nft.addEventListener('markerLost', () => {
                clearTimeout(lostTimeout);
                lostTimeout = setTimeout(() => {
                    if (!detailScreen.classList.contains('active')) {
                        alertCard.classList.remove('active');
                    }
                }, 3000);
            });
        });

        // Tambahkan Kamera dengan Cursor dan Raycaster (agar presisi dalam melacak klik layar ke objek 3D)
        const camera = document.createElement('a-entity');
        camera.setAttribute('camera', '');
        camera.setAttribute('cursor', 'rayOrigin: mouse; fuse: false;');
        camera.setAttribute('raycaster', 'objects: .clickable');
        scene.appendChild(camera);

        // Masukkan scene ke body
        document.body.appendChild(scene);

    } catch (error) {
        console.error('Gagal menginisialisasi AR target:', error);
    }
}

// Jalankan Inisialisasi saat DOM siap
window.addEventListener('DOMContentLoaded', initAR);

// ===================================================================
// LOADING SCREEN
// ===================================================================

window.addEventListener('arjs-nft-loaded', () => {
    const loader = document.getElementById('ar-loader');
    loader.style.opacity = '0';
    setTimeout(() => {
        loader.style.display = 'none';
    }, 500);
    console.log('Data NFT Lukisan Berhasil Dimuat!');
});

// ===================================================================
// UI HANDLER: DETAIL VIEW
// ===================================================================

const alertCard = document.getElementById('scan-alert-card');
const detailScreen = document.getElementById('detail-view-screen');
const btnShowDetail = document.getElementById('btn-show-detail');
const btnBack = document.getElementById('btn-back');
const museumUi = document.getElementById('museum-ui');

/**
 * Membuka halaman detail 3D lukisan.
 * Memuat data lukisan yang dipilih dan menampilkan PaintingViewer.
 */
function openDetailView() {
    const paintingId = btnShowDetail.getAttribute('data-painting-id');
    const painting = paintingsList.find(p => p.id === paintingId);

    if (painting) {
        // Perbarui Konten Detail
        document.querySelector('.info-title').textContent = painting.title;
        document.querySelector('.info-subtitle').textContent = `Karya ${painting.artist}, sekitar ${painting.period || ''}`;

        const metaValues = document.querySelectorAll('.meta-value');
        metaValues[0].textContent = painting.medium;
        metaValues[1].textContent = painting.dimensions;
        metaValues[2].textContent = painting.location;
        metaValues[3].textContent = painting.period || 'Renaissance';

        // Pisahkan deskripsi paragraf
        const descContainer = document.querySelector('.info-desc-container');
        descContainer.innerHTML = '';
        const paragraphs = painting.description.split('\n\n');
        paragraphs.forEach(pText => {
            if (pText.trim()) {
                const p = document.createElement('p');
                p.className = 'info-desc-text';
                p.textContent = pText;
                descContainer.appendChild(p);
            }
        });

        // Inisialisasi atau perbarui penampil 3D
        if (!window.paintingViewer) {
            const viewerContainer = document.getElementById('detail-viewer-container');
            window.paintingViewer = new PaintingViewer(viewerContainer);
        }
        window.paintingViewer.updatePainting(painting.imageUrl);
    }

    detailScreen.classList.add('active');
    alertCard.classList.remove('active');
    museumUi.style.opacity = '0';

    // Pastikan bottom sheet dalam keadaan terbuka (expanded) saat baru masuk
    const infoSheet = document.querySelector('.detail-info-sheet');
    if (infoSheet) {
        infoSheet.classList.remove('collapsed');
    }

    // Matikan streaming webcam untuk menghemat baterai
    const video = document.querySelector('body > video');
    if (video) {
        video.style.display = 'none';
        if (video.srcObject) {
            video.srcObject.getTracks().forEach(track => track.enabled = false);
        }
    }

    // Sembunyikan canvas AR utama & matikan pointer events
    const arCanvas = document.querySelector('#scene .a-canvas');
    if (arCanvas) {
        arCanvas.style.display = 'none';
        arCanvas.style.pointerEvents = 'none';
    }
}

/**
 * Kembali ke tampilan kamera AR dari halaman detail.
 */
function closeDetailView() {
    detailScreen.classList.remove('active');
    museumUi.style.opacity = '1';

    // Hidupkan streaming webcam kembali
    const video = document.querySelector('body > video');
    if (video) {
        video.style.display = 'block';
        if (video.srcObject) {
            video.srcObject.getTracks().forEach(track => track.enabled = true);
        }
    }

    // Tampilkan kembali canvas AR utama
    const arCanvas = document.querySelector('#scene .a-canvas');
    if (arCanvas) {
        arCanvas.style.display = 'block';
        arCanvas.style.pointerEvents = 'auto';
    }
}

// ===================================================================
// CAPTURE-PHASE TOUCH HANDLING & BOTTOM SHEET GESTURES
// A-Frame memasang touch listeners di window level yang mencegat
// semua touch events. Solusi: tangkap di document level dengan
// capture:true + stopImmediatePropagation agar A-Frame tidak bisa
// mengintervensi sentuhan pada tombol UI & drag handle bottom sheet.
// ===================================================================

let dragStartY = 0;

document.addEventListener('touchstart', function (e) {
    const detailBtn = e.target.closest('#btn-show-detail');
    const dragHandle = e.target.closest('.sheet-drag-handle-container');
    
    if (detailBtn) {
        e.stopImmediatePropagation();
        return;
    }
    if (dragHandle) {
        e.stopImmediatePropagation();
        dragStartY = e.touches[0].clientY;
        return;
    }
    const backBtn = e.target.closest('#btn-back');
    if (backBtn) {
        e.stopImmediatePropagation();
        return;
    }
}, true); // true = capture phase

document.addEventListener('touchend', function (e) {
    const detailBtn = e.target.closest('#btn-show-detail');
    const dragHandle = e.target.closest('.sheet-drag-handle-container');
    
    if (detailBtn) {
        e.stopImmediatePropagation();
        e.preventDefault();
        console.log('[UI] Tombol Detail ditekan (touchend capture)');
        openDetailView();
        return;
    }
    if (dragHandle) {
        e.stopImmediatePropagation();
        e.preventDefault();
        const endY = e.changedTouches[0].clientY;
        const diffY = endY - dragStartY;
        const infoSheetEl = document.querySelector('.detail-info-sheet');

        if (infoSheetEl) {
            if (Math.abs(diffY) < 10) {
                // Ketukan singkat (tap) -> toggle collapse/expand
                infoSheetEl.classList.toggle('collapsed');
                console.log('[UI] Drag handle diklik/tap (toggle)');
            } else if (diffY > 40) {
                // Geser ke bawah -> collapse
                infoSheetEl.classList.add('collapsed');
                console.log('[UI] Drag handle digeser ke bawah (collapse)');
            } else if (diffY < -40) {
                // Geser ke atas -> expand
                infoSheetEl.classList.remove('collapsed');
                console.log('[UI] Drag handle digeser ke atas (expand)');
            }
        }
        return;
    }
    const backBtn = e.target.closest('#btn-back');
    if (backBtn) {
        e.stopImmediatePropagation();
        e.preventDefault();
        console.log('[UI] Tombol Kembali ditekan (touchend capture)');
        closeDetailView();
        return;
    }
}, true); // true = capture phase

// Fallback click untuk desktop
btnShowDetail.addEventListener('click', openDetailView);
btnBack.addEventListener('click', closeDetailView);

const desktopDragHandle = document.querySelector('.sheet-drag-handle-container');
if (desktopDragHandle) {
    desktopDragHandle.addEventListener('click', () => {
        const infoSheetEl = document.querySelector('.detail-info-sheet');
        if (infoSheetEl) {
            infoSheetEl.classList.toggle('collapsed');
        }
    });
}
