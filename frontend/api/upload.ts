import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body as HandleUploadBody;

    const response = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (_pathname) => {
        return {
          maximumSizeInBytes: 100 * 1024 * 1024, // 100MB
          addRandomSuffix: true,
          allowedContentTypes: [
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
            'application/pdf',
            'text/plain',
            'text/csv',
            'application/json',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          ],
        };
      },
      onUploadCompleted: async ({ blob }) => {
        console.log('Upload completed:', blob.url);
      },
    });

    return res.json(response);
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(400).json({ error: String(error) });
  }
}
