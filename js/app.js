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

            const img = document.createElement('a-image');
            img.setAttribute('src', painting.imageUrl);
            img.setAttribute('position', '75 250 0');
            img.setAttribute('rotation', '-90 0 0');
            img.setAttribute('width', '150');
            img.setAttribute('height', '220');
            img.setAttribute('class', 'clickable');
            img.setAttribute('gesture-handler', '');

            nft.appendChild(img);
            scene.appendChild(nft);

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

        // Tambahkan Kamera
        const camera = document.createElement('a-entity');
        camera.setAttribute('camera', '');
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
// CAPTURE-PHASE TOUCH HANDLING
// A-Frame memasang touch listeners di window level yang mencegat
// semua touch events. Solusi: tangkap di document level dengan
// capture:true + stopImmediatePropagation agar A-Frame tidak bisa
// mengintervensi sentuhan pada tombol UI.
// ===================================================================

document.addEventListener('touchstart', function (e) {
    const detailBtn = e.target.closest('#btn-show-detail');
    if (detailBtn) {
        e.stopImmediatePropagation();
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
    if (detailBtn) {
        e.stopImmediatePropagation();
        e.preventDefault();
        console.log('[UI] Tombol Detail ditekan (touchend capture)');
        openDetailView();
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
