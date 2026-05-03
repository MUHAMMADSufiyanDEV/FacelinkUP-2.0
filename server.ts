import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { Resend } from 'resend';
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Cloudinary lazily
let cloudinaryConfigured = false;
const configureCloudinary = () => {
  if (cloudinaryConfigured) return true;
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    console.warn("Cloudinary credentials are not fully set. Uploads will fail.");
    return false;
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true
  });
  cloudinaryConfigured = true;
  return true;
};

// Initialize Resend lazily
let resend: Resend | null = null;
const getResend = () => {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("RESEND_API_KEY is not set. Email notifications will be skipped.");
    return null;
  }
  if (!resend) resend = new Resend(key);
  return resend;
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(express.json());
  const upload = multer({ storage: multer.memoryStorage() });

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.post("/api/upload", upload.single('file'), async (req, res) => {
    if (!configureCloudinary()) {
      return res.status(503).json({ error: "Cloudinary service not configured" });
    }

    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Convert buffer to base64
      const fileBase64 = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
      
      // Determine resource type (image or video)
      const resourceType = file.mimetype.startsWith('video/') ? 'video' : 'auto';

      const result = await cloudinary.uploader.upload(fileBase64, {
        folder: 'facelinkup',
        resource_type: resourceType
      });

      res.status(200).json({
        url: result.secure_url,
        public_id: result.public_id,
        resource_type: result.resource_type,
        format: result.format
      });
    } catch (err) {
      console.error("Cloudinary upload error:", err);
      res.status(500).json({ error: "Upload failed" });
    }
  });

  app.post("/api/notify", async (req, res) => {
    const { to, subject, html } = req.body;
    const resendClient = getResend();

    if (!resendClient) {
      return res.status(503).json({ error: "Email service not configured" });
    }

    try {
      const { data, error } = await resendClient.emails.send({
        from: 'FaceLinkUp <notifications@facelinkup.app>',
        to: [to],
        subject: subject,
        html: html,
      });

      if (error) {
        return res.status(400).json({ error });
      }

      res.status(200).json({ data });
    } catch (err) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Dynamic Sitemap Endpoints
  const domain = 'https://facelinkup.com';

  app.get('/sitemap.xml', (req, res) => {
    res.header('Content-Type', 'application/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${domain}/page-sitemap.xml</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
  </sitemap>
</sitemapindex>`);
  });

  app.get('/page-sitemap.xml', (req, res) => {
    res.header('Content-Type', 'application/xml');
    
    // Add additional URLs here as they become public
    const publicPages = [
      { url: '/', priority: '1.0', changefreq: 'daily' },
      { url: '/support', priority: '0.8', changefreq: 'monthly' },
      { url: '/login', priority: '0.8', changefreq: 'monthly' }
    ];

    const urlset = publicPages.map(page => `
  <url>
    <loc>${domain}${page.url}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`).join('');

    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlset}
</urlset>`);
  });

  // Handle Vite in dev or static files in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server starting on http://localhost:${PORT}`);
  });
}

startServer();
