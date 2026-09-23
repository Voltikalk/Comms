import React from 'react';

export type TelegramIconName =
  | 'search'
  | 'check'
  | 'check-bold'
  | 'check-filled'
  | 'message-read'
  | 'message-succeeded'
  | 'message-pending'
  | 'message-failed'
  | 'clock'
  | 'clock-filled'
  | 'send'
  | 'send-outline'
  | 'attach'
  | 'microphone'
  | 'microphone-alt'
  | 'camera'
  | 'camera-add'
  | 'smile'
  | 'smile-filled'
  | 'stickers'
  | 'pin'
  | 'pinned-chat'
  | 'pinned-message'
  | 'unpin'
  | 'mute'
  | 'muted'
  | 'unmute'
  | 'phone'
  | 'phone-discard'
  | 'video'
  | 'round-video'
  | 'menu'
  | 'more'
  | 'more-circle'
  | 'close'
  | 'close-circle'
  | 'arrow-left'
  | 'arrow-right'
  | 'arrow-down'
  | 'down'
  | 'up'
  | 'folder'
  | 'folder-filled'
  | 'folder-tabs-chats'
  | 'folder-tabs-chat'
  | 'folder-tabs-user'
  | 'folder-tabs-group'
  | 'folder-tabs-channel'
  | 'folder-tabs-bot'
  | 'folder-tabs-star'
  | 'archive'
  | 'archive-filled'
  | 'settings'
  | 'settings-filled'
  | 'darkmode'
  | 'edit'
  | 'delete'
  | 'delete-filled'
  | 'copy'
  | 'forward'
  | 'reply'
  | 'reply-filled'
  | 'heart'
  | 'star'
  | 'stars-filled'
  | 'lock'
  | 'unlock'
  | 'user'
  | 'user-filled'
  | 'user-online'
  | 'group'
  | 'channel'
  | 'bots'
  | 'download'
  | 'cloud-download'
  | 'document'
  | 'photo'
  | 'poll'
  | 'link'
  | 'spoiler'
  | 'code'
  | 'bold'
  | 'italic'
  | 'underlined'
  | 'strikethrough'
  | 'monospace'
  | 'blockquote'
  | (string & {});

interface TgIconProps extends React.HTMLAttributes<HTMLElement> {
  name: TelegramIconName;
  className?: string;
  size?: number | string;
  style?: React.CSSProperties;
}

export const TgIcon: React.FC<TgIconProps> = ({ 
  name, 
  className = '', 
  size, 
  style, 
  ...rest 
}) => {
  const sizeStyle: React.CSSProperties = size 
    ? { fontSize: typeof size === 'number' ? `${size}px` : size } 
    : {};

  return (
    <i 
      className={`icon icon-${name} ${className}`.trim()} 
      style={{ ...sizeStyle, ...style }} 
      aria-hidden="true"
      {...rest}
    />
  );
};

export default TgIcon;
