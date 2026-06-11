import { list, put } from '@vercel/blob';

function getDefaultPaintings() {
  return [
    {
      id: "monalisa",
      title: "Mona Lisa (La Gioconda)",
      artist: "Leonardo da Vinci",
      medium: "Minyak pada panel kayu poplar",
      dimensions: "77 cm × 53 cm",
      location: "Museum Louvre, Paris",
      period: "Renaissance Tinggi",
      description: "Mona Lisa adalah salah satu lukisan potret paling terkenal, paling sering dikunjungi, paling banyak ditulis, dan paling banyak diparodikan di dunia. Senyum misterius subjek lukisan ini telah memikat jutaan pengamat selama berabad-abad. Lukisan ini diyakini merupakan potret dari Lisa Gherardini, istri Francesco del Giocondo, seorang pedagang sutra kaya dari Florence, Italia. Teknik 'sfumato' yang digunakan oleh Leonardo da Vinci menciptakan transisi warna yang sangat halus, memberikan efek kedalaman dan ilusi bayangan yang hidup pada wajah subjek, terutama pada sudut mata dan mulutnya.",
      imageUrl: "./monalisa.jpg",
      nftUrl: "./monalisa"
    }
  ];
}

export default async function handler(request, response) {
  // GET: Mengambil daftar lukisan
  if (request.method === 'GET') {
    try {
      const { blobs } = await list();
      const paintingsDbBlob = blobs.find(b => b.pathname === 'paintings.json');

      if (!paintingsDbBlob) {
        // Jika belum ada file database di Blob, kembalikan data default (Mona Lisa)
        return response.status(200).json(getDefaultPaintings());
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

      let paintings = getDefaultPaintings();
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
