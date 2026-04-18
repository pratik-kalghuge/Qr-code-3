import { put } from '@vercel/blob';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const filename = (req.query.filename as string) || 'file';
    const contentType = (req.query.contentType as string) || 'application/octet-stream';

    const blob = await put(filename, req, {
      access: 'public',
      contentType,
      addRandomSuffix: true,
    });

    return res.json({ url: blob.url });
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ error: String(error) });
  }
}
