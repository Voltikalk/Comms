import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StorageService } from '../../services/storage.service';
import { formatFileSize } from '../../lib/image-compression';

export interface SendMessageProps {
  roomId: string;
  onSendMessage: (
    content: string,
    attachments?: { fileUrl: string; fileName: string; fileType?: string; fileSize?: number }[]
  ) => Promise<void>;
  replyingTo?: { id: string; content: string } | null;
  onCancelReply?: () => void;
  disabled?: boolean;
}

export const SendMessage: React.FC<SendMessageProps> = ({
  roomId,
  onSendMessage,
  replyingTo,
  onCancelReply,
  disabled = false,
}) => {
  const [text, setText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);

      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
      } else {
        setPreviewUrl(null);
      }
    }
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!text.trim() && !selectedFile) || disabled || isUploading) return;

    setIsUploading(true);
    setUploadProgress(15);

    try {
      let attachments: { fileUrl: string; fileName: string; fileType?: string; fileSize?: number }[] = [];

      // Upload file to Supabase Storage if present
      if (selectedFile) {
        setUploadProgress(45);
        const tempMsgId = 'msg-' + Date.now();
        const uploadRes = await StorageService.uploadMessageAttachment(selectedFile, roomId, tempMsgId);
        
        attachments.push({
          fileUrl: uploadRes.publicUrl,
          fileName: selectedFile.name,
          fileType: selectedFile.type,
          fileSize: selectedFile.size,
        });
        setUploadProgress(85);
      }

      await onSendMessage(text.trim(), attachments.length > 0 ? attachments : undefined);

      setText('');
      handleClearFile();
      if (onCancelReply) onCancelReply();
    } catch (err) {
      console.error('[SendMessage Error]', err);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-white/10 bg-black/40 backdrop-blur-xl p-3 flex flex-col gap-2">
      {/* Replying Banner */}
      <AnimatePresence>
        {replyingTo && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-white/10 text-xs text-white/80 border-l-2 border-cyan-400"
          >
            <div className="truncate">
              <span className="text-cyan-400 font-medium">Ответ: </span>
              <span>{replyingTo.content}</span>
            </div>
            <button
              onClick={onCancelReply}
              className="text-white/50 hover:text-white transition-colors"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected File Preview */}
      <AnimatePresence>
        {selectedFile && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex items-center gap-3 p-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 w-fit"
          >
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Preview"
                className="h-10 w-10 rounded-lg object-cover"
              />
            ) : (
              <span className="text-xl">📎</span>
            )}
            <div className="text-xs">
              <p className="font-medium text-white/90 truncate max-w-[160px]">
                {selectedFile.name}
              </p>
              <p className="text-white/50">{formatFileSize(selectedFile.size)}</p>
            </div>
            <button
              type="button"
              onClick={handleClearFile}
              className="text-white/50 hover:text-red-400 p-1 transition-colors"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Input Row */}
      <div className="flex items-end gap-2">
        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileChange}
          className="hidden"
          disabled={disabled || isUploading}
        />

        {/* Attachment Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isUploading}
          className="h-11 w-11 flex-shrink-0 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all disabled:opacity-50"
          title="Прикрепить файл или фото"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
        </button>

        {/* Message Input Box */}
        <div className="relative flex-1">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Написать сообщение..."
            rows={1}
            disabled={disabled || isUploading}
            className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/40 focus:border-cyan-400 focus:bg-white/10 focus:outline-none transition-all max-h-32 min-h-[44px]"
          />
        </div>

        {/* Send Button */}
        <button
          type="button"
          onClick={() => handleSend()}
          disabled={(!text.trim() && !selectedFile) || disabled || isUploading}
          className="h-11 w-11 flex-shrink-0 flex items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-40 disabled:hover:scale-100"
        >
          {isUploading ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <svg className="w-5 h-5 translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          )}
        </button>
      </div>

      {/* Upload Progress Bar */}
      {isUploading && (
        <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${uploadProgress}%` }}
            className="h-full bg-cyan-400"
          />
        </div>
      )}
    </div>
  );
};

export default SendMessage;
