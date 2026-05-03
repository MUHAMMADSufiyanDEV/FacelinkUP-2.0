export interface CloudinaryUploadResponse {
  url: string;
  public_id: string;
  resource_type: string;
  format: string;
}

export const uploadToCloudinary = async (file: File): Promise<CloudinaryUploadResponse> => {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Upload failed');
    }

    return await response.json();
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw error;
  }
};
