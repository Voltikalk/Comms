import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatFileSize } from '../lib/image-compression';

export interface FileUploadInputProps {
  onFileSelected: (file: File) => void;
  accept?: string;
  maxSizeBytes?: number;
  label?: string;
  isUploading?: boolean;
  progress?: number;
}

export const FileUploadInput: React.FC<FileUploadInputProps> = ({
  onFileSelected,
  accept = '*/*',
  maxSizeBytes = 50 * 1024 * 1024, // 50MB
  label = 'Перетащите файл или нажмите для выбора',
  isUploading = false,
  progress = 0,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      setError(null);

      // Check size
      if (file.size > maxSizeBytes) {
        setError(`Файл слишком большой (макс. ${formatFileSize(maxSizeBytes)})`);
        return;
      }

      setSelectedFile(file);
      onFileSelected(file);

      // Generate preview if image
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
      } else {
        setPreviewUrl(null);
      }
    },
    [maxSizeBytes, onFileSelected]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full flex flex-col gap-2">
      <motion.div
        whileHover={{ scale: isUploading ? 1 : 1.01 }}
        whileTap={{ scale: isUploading ? 1 : 0.99 }}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-6 transition-all duration-300 flex flex-col items-center justify-center text-center backdrop-blur-md ${
          isDragOver
            ? 'border-cyan-400 bg-cyan-500/10 shadow-lg shadow-cyan-500/20'
            : 'border-white/20 bg-black/20 hover:border-cyan-400/50 hover:bg-black/30'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleInputChange}
          className="hidden"
          disabled={isUploading}
        />

        {/* Preview image if present */}
        {previewUrl ? (
          <div className="relative mb-3 h-28 w-28 overflow-hidden rounded-xl border border-white/20 shadow-inner">
            <img
              src={previewUrl}
              alt="Preview"
              className="h-full w-full object-cover"
            />
            <button
              type="button"
              onClick={handleClear}
              className="absolute top-1 right-1 rounded-full bg-black/70 p-1 text-white hover:bg-red-500 transition-colors"
              title="Удалить"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : (
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 text-cyan-400">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>
        )}

        {/* Label and Info */}
        <p className="text-sm font-medium text-white/90">
          {selectedFile ? selectedFile.name : label}
        </p>
        <p className="text-xs text-white/50 mt-1">
          {selectedFile
            ? formatFileSize(selectedFile.size)
            : `До ${formatFileSize(maxSizeBytes)} (PNG, JPG, WebP, MP4, MP3, PDF)`}
        </p>

        {/* Progress Bar */}
        <AnimatePresence>
          {isUploading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="mt-4 w-full max-w-xs"
            >
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.2 }}
                  className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full"
                />
              </div>
              <p className="text-xs text-cyan-300 mt-1 text-center font-mono">
                Загрузка... {progress}%
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Error Notice */}
      {error && (
        <p className="text-xs text-red-400 px-2 flex items-center gap-1">
          <span>⚠️</span> {error}
        </p>
      )}
    </div>
  );
};

export default FileUploadInput;
