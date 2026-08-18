import { useState, useCallback } from 'react';
import { StorageService } from '../services/storage.service';
import type { UploadAttachmentResult } from '../services/storage.service';

export interface UseFileUploadReturn {
  isUploading: boolean;
  progress: number;
  error: string | null;
  uploadedUrl: string | null;
  uploadAttachment: (file: File | Blob, roomId: string, messageId: string, customName?: string) => Promise<UploadAttachmentResult | null>;
  uploadAvatar: (file: File | Blob, userId: string) => Promise<string | null>;
  uploadRoomCover: (file: File | Blob, roomId: string) => Promise<string | null>;
  reset: () => void;
}

export function useFileUpload(): UseFileUploadReturn {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);

  const reset = useCallback(() => {
    setIsUploading(false);
    setProgress(0);
    setError(null);
    setUploadedUrl(null);
  }, []);

  const uploadAttachment = useCallback(
    async (
      file: File | Blob,
      roomId: string,
      messageId: string,
      customName?: string
    ): Promise<UploadAttachmentResult | null> => {
      setIsUploading(true);
      setProgress(20);
      setError(null);

      try {
        setProgress(50);
        const result = await StorageService.uploadMessageAttachment(file, roomId, messageId, customName);
        setProgress(100);
        setUploadedUrl(result.publicUrl);
        setIsUploading(false);
        return result;
      } catch (err: any) {
        setError(err.message || 'Ошибка загрузки файла');
        setIsUploading(false);
        return null;
      }
    },
    []
  );

  const uploadAvatar = useCallback(
    async (file: File | Blob, userId: string): Promise<string | null> => {
      setIsUploading(true);
      setProgress(25);
      setError(null);

      try {
        setProgress(60);
        const url = await StorageService.uploadAvatar(file, userId);
        setProgress(100);
        setUploadedUrl(url);
        setIsUploading(false);
        return url;
      } catch (err: any) {
        setError(err.message || 'Ошибка загрузки аватара');
        setIsUploading(false);
        return null;
      }
    },
    []
  );

  const uploadRoomCover = useCallback(
    async (file: File | Blob, roomId: string): Promise<string | null> => {
      setIsUploading(true);
      setProgress(25);
      setError(null);

      try {
        setProgress(60);
        const url = await StorageService.uploadRoomImage(file, roomId);
        setProgress(100);
        setUploadedUrl(url);
        setIsUploading(false);
        return url;
      } catch (err: any) {
        setError(err.message || 'Ошибка загрузки обложки чата');
        setIsUploading(false);
        return null;
      }
    },
    []
  );

  return {
    isUploading,
    progress,
    error,
    uploadedUrl,
    uploadAttachment,
    uploadAvatar,
    uploadRoomCover,
    reset,
  };
}

export default useFileUpload;
