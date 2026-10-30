import { list, put, del } from '@vercel/blob';
import { createHmac, timingSafeEqual } from 'node:crypto';

const COOKIE = 'slv_admin';
const MAX_BYTES = 2.8 * 1024 * 1024;

function sign(value) {
  return createHmac('sha256', process.env.SESSION_SECRET).update(value).digest('hex');
}
function validSession(req) {
  const cookie = req.headers.cookie || '';
  const match = cookie.split(';').map(x => x.trim()).find(x => x.startsWith(COOKIE + '='));
  if (!match || !process.env.SESSION_SECRET) return false;
  const token = decodeURIComponent(match.slice(COOKIE.length + 1));
  const [expires, signature] = token.split('.');
  if (!expires || !signature || Number(expires) < Date.now()) return false;
  const expected = sign(expires);
  const a = Buffer.from(signature), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
function setCookie(res, value, maxAge) {
  res.setHeader('Set-Cookie', `${COOKIE}=${value}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAge}`);
}
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'POST' && req.url?.split('?')[0] === '/api/carousel/login') {
    const { username, password } = req.body || {};
    if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD || username !== process.env.ADMIN_USERNAME || password !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    const expires = String(Date.now() + 8 * 60 * 60 * 1000);
    setCookie(res, expires + '.' + sign(expires), 8 * 60 * 60);
    return res.status(200).json({ ok: true });
  }
  if (req.method === 'POST' && req.url?.split('?')[0] === '/api/carousel/logout') {
    setCookie(res, '', 0);
    return res.status(200).json({ ok: true });
  }
  if (req.method === 'GET') {
    try {
      const result = await list({ prefix: 'carousel/' });
      const slides = result.blobs.map(blob => ({
        url: blob.url, pathname: blob.pathname, uploadedAt: blob.uploadedAt,
        title: blob.pathname.split('/').pop().replace(/^\d+-/, '').replace(/\.[^.]+$/, ''),
        description: blob.pathname.split('/').pop().replace(/^\d+-/, '')
      })).sort((a,b) => new Date(a.uploadedAt) - new Date(b.uploadedAt));
      return res.status(200).json({ slides });
    } catch (error) {
      return res.status(500).json({ error: 'Carousel storage is not configured yet' });
    }
  }
  if (!validSession(req)) return res.status(401).json({ error: 'Please sign in again' });
  if (req.method === 'POST') {
    const { image, filename, title, description } = req.body || {};
    if (typeof image !== 'string' || !image.startsWith('data:image/')) return res.status(400).json({ error: 'Choose an image file' });
    const match = image.match(/^data:(image\/(?:jpeg|png|webp|gif));base64,([\s\S]+)$/);
    if (!match) return res.status(400).json({ error: 'Use JPG, PNG, WEBP or GIF images' });
    const bytes = Buffer.from(match[2], 'base64');
    if (!bytes.length || bytes.length > MAX_BYTES) return res.status(413).json({ error: 'Image must be smaller than 4 MB' });
    const ext = ({'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif'})[match[1]];
    const safeName = String(filename || 'slide').replace(/[^a-zA-Z0-9_-]/g, '-').slice(0,50) || 'slide';
    try {
      const blob = await put(`carousel/${Date.now()}-${safeName}.${ext}`, bytes, { access: 'public', contentType: match[1], addRandomSuffix: true });
      return res.status(201).json({ ok: true, url: blob.url, title: String(title || '').slice(0,100), description: String(description || '').slice(0,200) });
    } catch (error) {
      return res.status(500).json({ error: 'Upload failed. Check Vercel Blob storage configuration.' });
    }
  }
  if (req.method === 'DELETE') {
    const { url } = req.body || {};
    if (typeof url !== 'string' || !url.startsWith('https://')) return res.status(400).json({ error: 'Invalid image URL' });
    try {
      const result = await list({ prefix: 'carousel/' });
      const blob = result.blobs.find(item => item.url === url);
      if (!blob) return res.status(404).json({ error: 'Image not found' });
      await del(blob.url);
      return res.status(200).json({ ok: true });
    } catch (error) {
      return res.status(500).json({ error: 'Could not delete image' });
    }
  }
  res.setHeader('Allow', 'GET, POST, DELETE');
  return res.status(405).end('Method not allowed');
}
