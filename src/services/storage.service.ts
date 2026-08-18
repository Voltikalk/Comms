import { supabase } from '../lib/supabase/client';
import { compressImage, createAvatarThumbnail } from '../lib/image-compression';
import type { MessageAttachment } from '../lib/supabase/types';

export const STORAGE_BUCKETS = {
  MESSAGE_ATTACHMENTS: 'message-attachments',
  AVATARS: 'avatars',
  ROOM_IMAGES: 'room-images',
  TEMP_UPLOADS: 'temp-uploads',
} as const;

export type StorageBucket = typeof STORAGE_BUCKETS[keyof typeof STORAGE_BUCKETS];

export interface UploadAttachmentResult {
  publicUrl: string;
  filePath: string;
  attachment: MessageAttachment;
}

export const StorageService = {
  /**
   * 1. Upload message attachment (File/Image/Audio/Video, max 100MB / 50MB)
   */
  async uploadMessageAttachment(
    file: File | Blob,
    roomId: string,
    messageId: string,
    originalFileName?: string
  ): Promise<UploadAttachmentResult> {
    const rawName = originalFileName || (file instanceof File ? file.name : `attachment-${Date.now()}.bin`);
    const sanitizedName = rawName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const timestamp = Date.now();
    const filePath = `${roomId}/${messageId}/${timestamp}-${sanitizedName}`;
    const contentType = file.type || 'application/octet-stream';

    // Compress images if it is an image
    let fileToUpload: File | Blob = file;
    if (file.type.startsWith('image/') && !file.type.includes('gif') && !file.type.includes('svg')) {
      try {
        fileToUpload = await compressImage(file, { maxWidth: 1920, maxHeight: 1080, quality: 0.85 });
      } catch (err) {
        console.warn('[StorageService] Image compression notice:', err);
      }
    }

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadErr } = await supabase.storage
      .from(STORAGE_BUCKETS.MESSAGE_ATTACHMENTS)
      .upload(filePath, fileToUpload, {
        contentType,
        upsert: true,
      });

    if (uploadErr || !uploadData) {
      console.error('[StorageService.uploadMessageAttachment] Upload error:', uploadErr);
      throw uploadErr;
    }

    const { data: publicUrlData } = supabase.storage
      .from(STORAGE_BUCKETS.MESSAGE_ATTACHMENTS)
      .getPublicUrl(uploadData.path);

    const publicUrl = publicUrlData.publicUrl;

    // Save attachment record in PostgreSQL table
    const { data: attachmentRecord, error: dbErr } = await supabase
      .from('message_attachments')
      .insert({
        message_id: messageId,
        file_url: publicUrl,
        file_name: rawName,
        file_type: contentType,
        file_size: fileToUpload.size,
      })
      .select()
      .single();

    if (dbErr || !attachmentRecord) {
      console.warn('[StorageService.uploadMessageAttachment] Attachment DB record notice:', dbErr);
    }

    return {
      publicUrl,
      filePath: uploadData.path,
      attachment: attachmentRecord || {
        id: `att-${timestamp}`,
        message_id: messageId,
        file_url: publicUrl,
        file_name: rawName,
        file_type: contentType,
        file_size: fileToUpload.size,
        uploaded_at: new Date().toISOString(),
      },
    };
  },

  /**
   * 2. Upload and optimize user avatar (Max 5MB, 200x200 crop, update users table)
   */
  async uploadAvatar(file: File | Blob, userId: string): Promise<string> {
    if (!file.type.startsWith('image/')) {
      throw new Error('Для аватара разрешены только изображения (JPEG, PNG, WebP).');
    }

    // Create optimized square thumbnail (200x200)
    const thumbnailBlob = await createAvatarThumbnail(file, 200, 0.9);
    const filePath = `${userId}/avatar-${Date.now()}.webp`;

    const { data: uploadData, error: uploadErr } = await supabase.storage
      .from(STORAGE_BUCKETS.AVATARS)
      .upload(filePath, thumbnailBlob, {
        contentType: 'image/webp',
        upsert: true,
      });

    if (uploadErr || !uploadData) {
      console.error('[StorageService.uploadAvatar] Upload error:', uploadErr);
      throw uploadErr;
    }

    const { data: publicUrlData } = supabase.storage
      .from(STORAGE_BUCKETS.AVATARS)
      .getPublicUrl(uploadData.path);

    const publicUrl = publicUrlData.publicUrl;

    // Update avatar_url in public.users table
    await supabase
      .from('users')
      .update({ avatar_url: publicUrl })
      .eq('id', userId);

    return publicUrl;
  },

  /**
   * 3. Upload and optimize room image (Max 10MB, update rooms table)
   */
  async uploadRoomImage(file: File | Blob, roomId: string): Promise<string> {
    if (!file.type.startsWith('image/')) {
      throw new Error('Для обложки чата разрешены только изображения.');
    }

    const compressed = await compressImage(file, { maxWidth: 800, maxHeight: 800, quality: 0.85 });
    const filePath = `${roomId}/room-${Date.now()}.webp`;

    const { data: uploadData, error: uploadErr } = await supabase.storage
      .from(STORAGE_BUCKETS.ROOM_IMAGES)
      .upload(filePath, compressed, {
        contentType: 'image/webp',
        upsert: true,
      });

    if (uploadErr || !uploadData) {
      console.error('[StorageService.uploadRoomImage] Upload error:', uploadErr);
      throw uploadErr;
    }

    const { data: publicUrlData } = supabase.storage
      .from(STORAGE_BUCKETS.ROOM_IMAGES)
      .getPublicUrl(uploadData.path);

    const publicUrl = publicUrlData.publicUrl;

    // Update avatar_url in public.rooms table
    await supabase
      .from('rooms')
      .update({ avatar_url: publicUrl })
      .eq('id', roomId);

    return publicUrl;
  },

  /**
   * 4. Delete file from Storage bucket
   */
  async deleteFile(bucket: StorageBucket, path: string): Promise<boolean> {
    try {
      const { error } = await supabase.storage.from(bucket).remove([path]);
      if (error) {
        console.error('[StorageService.deleteFile] Error:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('[StorageService.deleteFile] Failed:', err);
      return false;
    }
  },

  /**
   * 5. Get public URL for any file path in a public bucket
   */
  getPublicUrl(bucket: StorageBucket, path: string): string {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  },
};

export default StorageService;
