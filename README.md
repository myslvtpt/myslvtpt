# SLV Tours & Travels — MICE Website

Responsive MICE information website with a homepage hero carousel and a password-protected slide manager.

## Features
- Homepage promotional carousel with automatic rotation and manual controls
- Admin dashboard at `/admin.html` for uploading and deleting carousel slides
- Server-side login with an HTTP-only signed session cookie
- Image storage in Vercel Blob
- Responsive MICE information and enquiry pages

## Local / Vercel setup
1. Install dependencies with `npm install`.
2. Create a **public Vercel Blob store** in the same Vercel project.
3. Configure these Vercel project environment variables for Production, Preview and Development:
   - `ADMIN_USERNAME`: initial admin username
   - `ADMIN_PASSWORD`: strong admin password (replace the temporary initial password before public launch)
   - `SESSION_SECRET`: a long random secret, at least 32 bytes
   - `BLOB_READ_WRITE_TOKEN`: generated automatically when the Blob store is connected to the project
4. Redeploy after environment variables are configured.

## Admin dashboard
Open `/admin.html`, sign in, then upload JPG, PNG, WEBP or GIF images (maximum 2.8 MB each), add a heading and caption, and delete slides as needed. Slides are displayed in upload order and rotate every five seconds.

The initial requested login values are not committed to the repository. Set them as Vercel environment variables; use a strong replacement password before production launch.

## Notes
- Uploaded images are public because they appear on the public homepage. The dashboard and mutation endpoints require a valid admin session.
- Use HTTPS in deployment. Session cookies are Secure, HttpOnly and SameSite=Strict.
- The enquiry form remains a client-side downloadable brief; connect it to a CRM or server endpoint before collecting live enquiries.
