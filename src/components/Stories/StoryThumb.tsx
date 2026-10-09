import React from 'react';
import type { Story } from '../../types/story.types';
import { storyGradient, storyTextProps } from './storyStyle';
import { StoryOverlays } from './storyCanvas';

export type StoryThumbSource = Pick<Story, 'type' | 'data'> &
  Partial<Pick<Story, 'background' | 'fontStyle' | 'textColor' | 'textBgStyle' | 'stickerOverlays' | 'textOverlays' | 'drawingData'>>;

/**
 * Static 9:16 mini preview of a story: side previews in the viewer, the story
 * card of a reply, the profile grid. Videos show their first frame only.
 * Sized by the parent (`className` sets the width), text scales via `cqw`.
 */
export const StoryThumb: React.FC<{ story: StoryThumbSource; className?: string; children?: React.ReactNode }> = ({
  story,
  className = '',
  children,
}) => {
  const text =
    story.type === 'text'
      ? storyTextProps(story.data, { fontStyle: story.fontStyle, textColor: story.textColor, textBgStyle: story.textBgStyle })
      : null;

  return (
    <span
      className={`relative block aspect-[9/16] overflow-hidden [container-type:inline-size] ${className}`}
      style={{ background: text ? storyGradient(story.background) : '#000' }}
    >
      {text ? (
        <span className="absolute inset-0 flex items-center justify-center p-[8cqw] text-center">
          <span
            className={text.className}
            // A thumb only needs a hint of the text — clamp it so long stories don't overflow.
            style={{ ...text.style, display: '-webkit-box', WebkitLineClamp: 6, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
          >
            {story.data}
          </span>
        </span>
      ) : story.type === 'video' ? (
        <video src={story.data} muted playsInline preload="metadata" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <img src={story.data} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" draggable={false} />
      )}
      <StoryOverlays story={story} />
      {children}
    </span>
  );
};
