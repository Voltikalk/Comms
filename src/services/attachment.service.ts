import { supabase } from '../lib/supabase/client';
import { SUPABASE_CONFIG } from '../lib/supabase/config';

export interface UploadResult {
  fileUrl: string;
  filePath: string;
  fileName: string;
  fileType: string;
  fileSize: number;
}

export const AttachmentService = {
  /**
   * 1. Upload a file or Blob to Supabase Storage and return public URL
   */
  async uploadFile(
    file: File | Blob,
    roomId: string,
    customName?: string,
    bucketName: string = SUPABASE_CONFIG.storage.buckets.media
  ): Promise<UploadResult> {
    try {
      const fileName = customName || (file instanceof File ? file.name : `attachment-${Date.now()}.bin`);
      const fileType = file.type || 'application/octet-stream';
      const fileSize = file.size;

      // Check max size
      if (fileSize > SUPABASE_CONFIG.storage.maxFileSizeBytes) {
        throw new Error(`Размер файла превышает допустимый лимит (50 МБ).`);
      }

      // Generate unique path: rooms/{roomId}/{timestamp}-{sanitizedName}
      const sanitized = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
      const uniquePath = `rooms/${roomId}/${Date.now()}-${sanitized}`;

      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(uniquePath, file, {
          contentType: fileType,
          upsert: true,
        });

      if (error || !data) {
        console.error('[AttachmentService.uploadFile] Storage upload error:', error);
        throw error;
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(data.path);

      return {
        fileUrl: publicUrlData.publicUrl,
        filePath: data.path,
        fileName,
        fileType,
        fileSize,
      };
    } catch (err: any) {
      console.error('[AttachmentService.uploadFile] Failed:', err);
      throw err;
    }
  },

  /**
   * 2. Delete a file from Supabase Storage
   */
  async deleteFile(
    filePath: string,
    bucketName: string = SUPABASE_CONFIG.storage.buckets.media
  ): Promise<boolean> {
    try {
      const { error } = await supabase.storage
        .from(bucketName)
        .remove([filePath]);

      if (error) {
        console.error('[AttachmentService.deleteFile] Error:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('[AttachmentService.deleteFile] Failed:', err);
      return false;
    }
  },

  /**
   * 3. Get public URL for a file path
   */
  getFileUrl(
    filePath: string,
    bucketName: string = SUPABASE_CONFIG.storage.buckets.media
  ): string {
    const { data } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    return data.publicUrl;
  },

  /**
   * 4. Get file metadata (Size, Content-Type, Updated)
   */
  async getFileMetadata(
    filePath: string,
    bucketName: string = SUPABASE_CONFIG.storage.buckets.media
  ): Promise<any | null> {
    try {
      const folder = filePath.substring(0, filePath.lastIndexOf('/'));
      const filename = filePath.substring(filePath.lastIndexOf('/') + 1);

      const { data, error } = await supabase.storage
        .from(bucketName)
        .list(folder, { search: filename });

      if (error || !data?.length) return null;
      return data[0];
    } catch (err) {
      return null;
    }
  },
};

export default AttachmentService;
