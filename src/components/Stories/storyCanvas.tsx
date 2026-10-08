import React from 'react';
import { STORY_FONT_FAMILIES, type Story } from '../../types/story.types';
import { storyGradient, storyTextProps } from './storyStyle';

/** Image/video with a blurred copy behind it, so non-9:16 media fills the frame without cropping. */
export const StoryMedia: React.FC<{
  type: 'image' | 'video';
  src: string;
  videoRef?: React.Ref<HTMLVideoElement>;
  muted?: boolean;
  loop?: boolean;
  onLoaded?: () => void;
}> = ({ type, src, videoRef, muted = true, loop = false, onLoaded }) =>
  type === 'video' ? (
    <video
      ref={videoRef}
      src={src}
      autoPlay
      playsInline
      muted={muted}
      loop={loop}
      onLoadedData={onLoaded}
      className="absolute inset-0 h-full w-full bg-black object-contain"
    />
  ) : (
    <>
      <img src={src} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-125 object-cover opacity-70 blur-2xl" draggable={false} />
      <img src={src} alt="" onLoad={onLoaded} className="absolute inset-0 h-full w-full object-contain" draggable={false} />
    </>
  );

/** Stickers + doodle layer, positioned in % of the canvas. */
export const StoryOverlays: React.FC<{ story: Pick<Story, 'stickerOverlays' | 'textOverlays' | 'drawingData'> }> = ({ story }) => (
  <>
    {story.drawingData && (
      <img src={story.drawingData} alt="" className="pointer-events-none absolute inset-0 h-full w-full" draggable={false} />
    )}
    {story.textOverlays?.map((o) => (
      <div
        key={o.id}
        className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-[2cqw] px-[2cqw] py-[1cqw] text-[5cqw] font-bold"
        style={{
          left: `${o.x}%`,
          top: `${o.y}%`,
          fontFamily: STORY_FONT_FAMILIES[o.fontStyle || 'classic'],
          color: o.color || '#fff',
          backgroundColor: o.backgroundColor || 'transparent',
        }}
      >
        {o.text}
      </div>
    ))}
    {story.stickerOverlays?.map((s) => (
      <div
        key={s.id}
        className="pointer-events-none absolute leading-none drop-shadow-[0_1cqw_2cqw_rgba(0,0,0,0.25)]"
        style={{
          left: `${s.x}%`,
          top: `${s.y}%`,
          fontSize: `${12 * (s.scale || 1)}cqw`,
          transform: `translate(-50%, -50%) rotate(${s.rotation || 0}deg)`,
        }}
      >
        {s.content}
      </div>
    ))}
  </>
);

/** Read-only render of a whole story (viewer). Must be placed in a 9:16 `@container` box. */
export const StoryContent: React.FC<{
  story: Story;
  videoRef?: React.Ref<HTMLVideoElement>;
  muted?: boolean;
  onLoaded?: () => void;
}> = ({ story, videoRef, muted, onLoaded }) => (
  <div className="absolute inset-0 overflow-hidden" style={story.type === 'text' ? { background: storyGradient(story.background) } : { background: '#000' }}>
    {story.type === 'text' ? (
      <div className="absolute inset-0 flex items-center justify-center p-[8cqw]">
        <p {...storyTextProps(story.data, { fontStyle: story.fontStyle, textColor: story.textColor, textBgStyle: story.textBgStyle })}>
          {story.data}
        </p>
      </div>
    ) : (
      <StoryMedia type={story.type} src={story.data} videoRef={videoRef} muted={muted} onLoaded={onLoaded} />
    )}
    <StoryOverlays story={story} />
    {story.caption && (
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent px-[5cqw] pb-[24cqw] pt-[14cqw]">
        <p className="text-center text-[4cqw] font-medium leading-snug text-white [text-wrap:pretty]">{story.caption}</p>
      </div>
    )}
  </div>
);
