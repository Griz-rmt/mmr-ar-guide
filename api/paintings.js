import { list, put } from '@vercel/blob';

export default async function handler(request, response) {
  // GET: Mengambil daftar lukisan
  if (request.method === 'GET') {
    try {
      const { blobs } = await list();
      const paintingsDbBlob = blobs.find(b => b.pathname === 'paintings.json');

      if (!paintingsDbBlob) {
        // Jika belum ada file database di Blob, kembalikan array kosong
        return response.status(200).json([]);
      }

      // Fetch isi data JSON terupdate dari Vercel Blob
      const res = await fetch(paintingsDbBlob.url);
      const data = await res.json();
      return response.status(200).json(data);
    } catch (error) {
      console.error('Error fetching paintings:', error);
      return response.status(500).json({ error: error.message });
    }
  }

  // POST: Menambahkan atau memperbarui lukisan
  if (request.method === 'POST') {
    try {
      const newPainting = request.body;
      if (!newPainting || !newPainting.id || !newPainting.title) {
        return response.status(400).json({ error: 'Data lukisan tidak lengkap atau tidak valid.' });
      }

      const { blobs } = await list();
      const paintingsDbBlob = blobs.find(b => b.pathname === 'paintings.json');

      let paintings = [];
      if (paintingsDbBlob) {
        const res = await fetch(paintingsDbBlob.url);
        paintings = await res.json();
      }

      // Cari apakah lukisan dengan ID yang sama sudah ada untuk diperbarui
      const index = paintings.findIndex(p => p.id === newPainting.id);
      if (index !== -1) {
        paintings[index] = newPainting;
      } else {
        paintings.push(newPainting);
      }

      // Tulis kembali file paintings.json di Blob tanpa suffix acak
      const updatedBlob = await put('paintings.json', JSON.stringify(paintings, null, 2), {
        access: 'public',
        contentType: 'application/json',
        addRandomSuffix: false
      });

      return response.status(200).json({
        success: true,
        url: updatedBlob.url,
        data: paintings
      });
    } catch (error) {
      console.error('Error saving painting:', error);
      return response.status(500).json({ error: error.message });
    }
  }

  return response.status(405).json({ error: 'Method Not Allowed' });
}
