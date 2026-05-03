<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/5cf3149f-e8be-448a-935b-e0d19a67b456

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Environment Variables

Copy `.env.example` to `.env.local` and fill in the following variables:

- `GEMINI_API_KEY`: Your Google Gemini API key
- `RESEND_API_KEY`: Your Resend API key (for email notifications)
- `VITE_CLOUDINARY_CLOUD_NAME`: Your Cloudinary cloud name
- `VITE_CLOUDINARY_UPLOAD_PRESET`: Your Cloudinary upload preset name

## Cloudinary Setup

For file uploads to work, you need to set up Cloudinary:

1. Create a [Cloudinary account](https://cloudinary.com/)
2. Go to your Dashboard and copy your Cloud Name
3. Go to Settings > Upload and create an Upload Preset:
   - Set Mode to "Unsigned" for frontend uploads
   - Configure allowed formats (images/videos)
   - Set folder to "facelinkup" (optional)
4. Add these to your `.env.local`:
   ```
   VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
   VITE_CLOUDINARY_UPLOAD_PRESET=your_preset_name
   ```

## Deploy

This app is configured for static deployment on Vercel, Netlify, or similar platforms.
