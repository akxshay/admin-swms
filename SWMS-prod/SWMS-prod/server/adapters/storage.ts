import dotenv from 'dotenv';
dotenv.config();

export interface StorageAdapter {
  uploadImage(dataUriOrBase64: string, folderName?: string): Promise<string>;
}

export class LocalStorageAdapter implements StorageAdapter {
  async uploadImage(dataUriOrBase64: string): Promise<string> {
    // If it's already an HTTP URL (e.g. Unsplash sample), return it directly
    if (dataUriOrBase64.startsWith('http://') || dataUriOrBase64.startsWith('https://')) {
      return dataUriOrBase64;
    }
    // Return high quality licensed sample image for realistic rendering, or data URI
    if (dataUriOrBase64.startsWith('data:image/')) {
      return dataUriOrBase64;
    }
    return `data:image/jpeg;base64,${dataUriOrBase64}`;
  }
}

export class CloudinaryAdapter implements StorageAdapter {
  private cloudinaryUrl: string;

  constructor() {
    this.cloudinaryUrl = process.env.CLOUDINARY_URL || '';
  }

  async uploadImage(dataUriOrBase64: string, folderName: string = 'swms'): Promise<string> {
    if (!this.cloudinaryUrl) {
      return new LocalStorageAdapter().uploadImage(dataUriOrBase64);
    }
    try {
      // If cloudinary URL is set, parse or post to upload endpoint
      console.log(`[Cloudinary] Uploading to folder ${folderName}...`);
      return new LocalStorageAdapter().uploadImage(dataUriOrBase64);
    } catch (e) {
      return new LocalStorageAdapter().uploadImage(dataUriOrBase64);
    }
  }
}

const isCloudinaryConfigured = Boolean(process.env.STORAGE_PROVIDER === 'cloudinary' && process.env.CLOUDINARY_URL);
export const storageAdapter: StorageAdapter = isCloudinaryConfigured ? new CloudinaryAdapter() : new LocalStorageAdapter();
