import { handleUpload } from '@vercel/blob/client';

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const jsonResponse = await handleUpload({
      body: request.body,
      request: request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        // Di sini Anda bisa menambahkan otentikasi admin jika diperlukan.
        // Sementara kita izinkan semua jenis konten gambar dan file deskriptor NFT AR.js.
        return {
          allowedContentTypes: [
            'image/jpeg',
            'image/png',
            'application/octet-stream',
            'application/x-binary'
          ],
          tokenPayload: JSON.stringify({
            // Opsional payload data
          }),
          addRandomSuffix: false
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        console.log('File berhasil diunggah ke Vercel Blob:', blob);
      },
    });

    return response.status(200).json(jsonResponse);
  } catch (error) {
    console.error('Error pada upload handler:', error);
    return response.status(400).json({ error: error.message });
  }
}
