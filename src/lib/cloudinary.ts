export interface CloudinaryUploadResponse {
  url: string;
  public_id: string;
  resource_type: string;
  format: string;
}

export const uploadToCloudinary = async (file: File): Promise<CloudinaryUploadResponse> => {
  // Get Cloudinary credentials from environment variables
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error('Cloudinary configuration missing. Please check environment variables.');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);
  formData.append('folder', 'facelinkup');

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Cloudinary API error:', response.status, errorText);
      throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();

    return {
      url: result.secure_url,
      public_id: result.public_id,
      resource_type: result.resource_type,
      format: result.format
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw error;
  }
};
