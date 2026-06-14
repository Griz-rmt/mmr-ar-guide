/**
 * painting-viewer.js
 * Penampil lukisan 3D berbasis Three.js (standalone, tanpa A-Frame scene kedua).
 * Menggunakan objek THREE global yang sudah tersedia dari A-Frame.
 * Harus dimuat SETELAH aframe.min.js
 */

class PaintingViewer {
    constructor(container) {
        this.container = container;
        this.isDragging = false;
        this.prevX = 0;
        this.prevY = 0;
        this.rotationX = 0;
        this.rotationY = 0;
        this.zoomLevel = 4.5;

        // Three.js setup — THREE sudah tersedia dari A-Frame
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(50, container.clientWidth / Math.max(container.clientHeight, 1), 0.1, 100);
        this.camera.position.z = this.zoomLevel;

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(container.clientWidth, Math.max(container.clientHeight, 300));
        this.renderer.setClearColor(0x000000, 0);

        // Hapus canvas lama jika ada
        const oldCanvas = container.querySelector('canvas.painting-viewer-canvas');
        if (oldCanvas) oldCanvas.remove();

        this.renderer.domElement.classList.add('painting-viewer-canvas');
        this.renderer.domElement.style.cssText = 'width:100%;height:100%;display:block;';
        container.appendChild(this.renderer.domElement);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(2, 3, 4);
        this.scene.add(dirLight);
        const backLight = new THREE.DirectionalLight(0xffffff, 0.3);
        backLight.position.set(-2, -1, -3);
        this.scene.add(backLight);

        // Group untuk lukisan + bingkai
        this.paintingGroup = new THREE.Group();
        this.scene.add(this.paintingGroup);

        // Event listeners untuk drag & zoom
        this._bindEvents();

        // Animasi loop
        this._animate = this._animate.bind(this);
        this._animating = true;
        this._animate();
    }

    /**
     * Memuat atau mengganti lukisan yang ditampilkan.
     * @param {string} imageUrl - URL gambar lukisan
     */
    updatePainting(imageUrl) {
        // Bersihkan group lama
        while (this.paintingGroup.children.length > 0) {
            const child = this.paintingGroup.children[0];
            if (child.material) {
                if (child.material.map) child.material.map.dispose();
                child.material.dispose();
            }
            if (child.geometry) child.geometry.dispose();
            this.paintingGroup.remove(child);
        }

        // Reset rotasi
        this.rotationX = 0;
        this.rotationY = 0;
        this.paintingGroup.rotation.set(0, 0, 0);

        // Load texture
        const loader = new THREE.TextureLoader();
        loader.crossOrigin = 'anonymous';
        loader.load(imageUrl, (texture) => {
            texture.colorSpace = THREE.SRGBColorSpace || 'srgb';

            const imgW = texture.image.width;
            const imgH = texture.image.height;
            const aspect = imgW / imgH;

            // Ukuran lukisan sesuai aspek rasio
            const maxSize = 2.5;
            let planeW, planeH;
            if (aspect >= 1) {
                planeW = maxSize;
                planeH = maxSize / aspect;
            } else {
                planeH = maxSize;
                planeW = maxSize * aspect;
            }

            // Buat plane lukisan
            const planeGeo = new THREE.PlaneGeometry(planeW, planeH);
            const planeMat = new THREE.MeshStandardMaterial({
                map: texture,
                roughness: 0.4,
                metalness: 0.0
            });
            const plane = new THREE.Mesh(planeGeo, planeMat);
            this.paintingGroup.add(plane);

            // Buat bingkai emas
            const frameThickness = 0.08;
            const frameDepth = 0.06;
            const frameMat = new THREE.MeshStandardMaterial({
                color: 0xc9a84c,
                roughness: 0.3,
                metalness: 0.7
            });

            // Bingkai atas
            const topGeo = new THREE.BoxGeometry(planeW + frameThickness * 2, frameThickness, frameDepth);
            const topFrame = new THREE.Mesh(topGeo, frameMat);
            topFrame.position.set(0, planeH / 2 + frameThickness / 2, 0);
            this.paintingGroup.add(topFrame);

            // Bingkai bawah
            const bottomFrame = new THREE.Mesh(topGeo, frameMat);
            bottomFrame.position.set(0, -planeH / 2 - frameThickness / 2, 0);
            this.paintingGroup.add(bottomFrame);

            // Bingkai kiri
            const sideGeo = new THREE.BoxGeometry(frameThickness, planeH + frameThickness * 2, frameDepth);
            const leftFrame = new THREE.Mesh(sideGeo, frameMat);
            leftFrame.position.set(-planeW / 2 - frameThickness / 2, 0, 0);
            this.paintingGroup.add(leftFrame);

            // Bingkai kanan
            const rightFrame = new THREE.Mesh(sideGeo, frameMat);
            rightFrame.position.set(planeW / 2 + frameThickness / 2, 0, 0);
            this.paintingGroup.add(rightFrame);

            // Panel belakang
            const backGeo = new THREE.PlaneGeometry(planeW, planeH);
            const backMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.9 });
            const backPanel = new THREE.Mesh(backGeo, backMat);
            backPanel.position.z = -frameDepth / 2;
            backPanel.rotation.y = Math.PI;
            this.paintingGroup.add(backPanel);

            console.log('[PaintingViewer] Lukisan berhasil dimuat:', imageUrl);
        }, undefined, (err) => {
            console.error('[PaintingViewer] Gagal memuat texture:', err);
        });

        // Resize renderer
        this.renderer.setSize(this.container.clientWidth, Math.max(this.container.clientHeight, 300));
        this.camera.aspect = this.container.clientWidth / Math.max(this.container.clientHeight, 300);
        this.camera.updateProjectionMatrix();
    }

    /** @private Menghitung jarak antara dua sentuhan jari untuk pinch-zoom */
    _getPinchDist(e) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /** @private Mendaftarkan event listener untuk drag dan zoom */
    _bindEvents() {
        const el = this.renderer.domElement;

        // Mouse drag (untuk desktop click & drag)
        el.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            this.prevX = e.clientX;
            this.prevY = e.clientY;
        });
        window.addEventListener('mouseup', () => { this.isDragging = false; });
        window.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;
            const dx = e.clientX - this.prevX;
            const dy = e.clientY - this.prevY;
            this.rotationY += dx * 0.008;
            this.rotationX += dy * 0.008;
            this.rotationX = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.rotationX));
            this.prevX = e.clientX;
            this.prevY = e.clientY;
        });

        // Touch drag & pinch zoom (Mendukung navigasi 1 jari untuk rotasi & 2 jari untuk zoom cubit)
        el.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                this.isDragging = true;
                this.isPinching = false;
                this.prevX = e.touches[0].clientX;
                this.prevY = e.touches[0].clientY;
            } else if (e.touches.length === 2) {
                this.isDragging = false;
                this.isPinching = true;
                this.initialPinchDist = this._getPinchDist(e);
                this.initialZoom = this.zoomLevel;
            }
        }, { passive: true });

        el.addEventListener('touchend', () => { 
            this.isDragging = false; 
            this.isPinching = false;
        }, { passive: true });

        el.addEventListener('touchmove', (e) => {
            if (this.isDragging && e.touches.length === 1) {
                const dx = e.touches[0].clientX - this.prevX;
                const dy = e.touches[0].clientY - this.prevY;
                this.rotationY += dx * 0.01;
                this.rotationX += dy * 0.01;
                this.rotationX = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.rotationX));
                this.prevX = e.touches[0].clientX;
                this.prevY = e.touches[0].clientY;
            } else if (this.isPinching && e.touches.length === 2) {
                const currentDist = this._getPinchDist(e);
                if (this.initialPinchDist > 0) {
                    // Jika cubitan melebar (zoom in), factor < 1, maka zoomLevel mengecil (mendekat)
                    const factor = this.initialPinchDist / currentDist;
                    this.zoomLevel = this.initialZoom * factor;
                    this.zoomLevel = Math.max(2, Math.min(10, this.zoomLevel));
                    this.camera.position.z = this.zoomLevel;
                }
            }
        }, { passive: true });

        // Scroll zoom (untuk scroll mouse desktop)
        el.addEventListener('wheel', (e) => {
            e.preventDefault();
            this.zoomLevel += e.deltaY * 0.005;
            this.zoomLevel = Math.max(2, Math.min(10, this.zoomLevel));
            this.camera.position.z = this.zoomLevel;
        }, { passive: false });
    }

    /** @private Render loop */
    _animate() {
        if (!this._animating) return;
        requestAnimationFrame(this._animate);
        this.paintingGroup.rotation.x = this.rotationX;
        this.paintingGroup.rotation.y = this.rotationY;
        this.renderer.render(this.scene, this.camera);
    }

    /** Membersihkan resources Three.js */
    dispose() {
        this._animating = false;
        this.renderer.dispose();
    }
}
