// Import fungsi client upload Vercel Blob menggunakan esm.sh CDN
import { upload } from 'https://esm.sh/@vercel/blob/client';

// Event listener saat file dipilih untuk memperbarui tampilan input
const fileInputs = ['image', 'fset', 'fset3', 'iset'];
fileInputs.forEach(type => {
    const input = document.getElementById(`file-${type}`);
    const box = document.getElementById(`box-${type}`);
    const label = document.getElementById(`lbl-${type}`);
    const defaultLabel = label.textContent;

    input.addEventListener('change', (e) => {
        if (input.files.length > 0) {
            box.classList.add('file-box-selected');
            label.textContent = input.files[0].name;
        } else {
            box.classList.remove('file-box-selected');
            label.textContent = defaultLabel;
        }
    });
});

// Handler pengiriman form
document.getElementById('upload-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const title = document.getElementById('title').value.trim();
    const artist = document.getElementById('artist').value.trim();
    const period = document.getElementById('period').value.trim();
    const medium = document.getElementById('medium').value.trim();
    const dimensions = document.getElementById('dimensions').value.trim();
    const location = document.getElementById('location').value.trim();
    const description = document.getElementById('description').value.trim();

    const fileImg = document.getElementById('file-image').files[0];
    const fileFset = document.getElementById('file-fset').files[0];
    const fileFset3 = document.getElementById('file-fset3').files[0];
    const fileIset = document.getElementById('file-iset').files[0];

    // Buat ID unik berdasarkan nama lukisan
    const paintingId = title.toLowerCase().replace(/[^a-z0-9]/g, '');

    if (!paintingId) {
        alert('Nama lukisan tidak valid untuk dibuatkan ID.');
        return;
    }

    // Dapatkan ekstensi file gambar
    const imgExt = fileImg.name.split('.').pop();

    // Aktifkan progress panel
    const overlay = document.getElementById('progress-overlay');
    const submitBtn = document.getElementById('btn-submit');
    const spinner = document.getElementById('btn-spinner');

    overlay.classList.add('active');
    submitBtn.disabled = true;
    spinner.style.display = 'block';

    const uploadConfig = {
        access: 'public',
        handleUploadUrl: '/api/upload'
    };

    try {
        // 1. Upload Gambar
        updateStatus('image', 'uploading', 'Mengunggah...');
        const imageBlob = await upload(`paintings/${paintingId}/target.${imgExt}`, fileImg, uploadConfig);
        updateStatus('image', 'done', 'Selesai');

        // 2. Upload file .fset
        updateStatus('fset', 'uploading', 'Mengunggah...');
        const fsetBlob = await upload(`paintings/${paintingId}/target.fset`, fileFset, uploadConfig);
        updateStatus('fset', 'done', 'Selesai');

        // 3. Upload file .fset3
        updateStatus('fset3', 'uploading', 'Mengunggah...');
        const fset3Blob = await upload(`paintings/${paintingId}/target.fset3`, fileFset3, uploadConfig);
        updateStatus('fset3', 'done', 'Selesai');

        // 4. Upload file .iset
        updateStatus('iset', 'uploading', 'Mengunggah...');
        const isetBlob = await upload(`paintings/${paintingId}/target.iset`, fileIset, uploadConfig);
        updateStatus('iset', 'done', 'Selesai');

        // 5. Simpan metadata ke API paintings.json
        updateStatus('db', 'uploading', 'Menyimpan...');

        // Bentuk URL basis untuk NFT (hilangkan ekstensi .fset dari URL .fset)
        const nftBaseUrl = fsetBlob.url.replace(/\.fset$/, '');

        const newPaintingData = {
            id: paintingId,
            title: title,
            artist: artist,
            period: period,
            medium: medium,
            dimensions: dimensions,
            location: location,
            description: description,
            imageUrl: imageBlob.url,
            nftUrl: nftBaseUrl
        };

        const dbResponse = await fetch('/api/paintings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(newPaintingData)
        });

        if (!dbResponse.ok) {
            const dbErr = await dbResponse.json();
            throw new Error(dbErr.error || 'Gagal menyimpan ke database JSON.');
        }

        updateStatus('db', 'done', 'Selesai');
        
        alert('Lukisan berhasil ditambahkan!');
        window.location.href = '/';

    } catch (error) {
        console.error(error);
        alert('Proses unggah gagal: ' + error.message);
        
        // Reset UI
        overlay.classList.remove('active');
        submitBtn.disabled = false;
        spinner.style.display = 'none';
        
        // Set status error
        const steps = ['image', 'fset', 'fset3', 'iset', 'db'];
        steps.forEach(s => {
            const el = document.getElementById(`status-${s}`);
            if (el.classList.contains('status-uploading') || el.classList.contains('status-waiting')) {
                el.textContent = 'Gagal';
                el.className = 'step-status status-error';
            }
        });
    }
});

function updateStatus(step, type, text) {
    const el = document.getElementById(`status-${step}`);
    el.textContent = text;
    el.className = `step-status status-${type}`;
}
