import React, { useEffect, useRef, useState, useCallback } from 'react';
import lottie from 'lottie-web';
import type { AnimationItem } from 'lottie-web';
import { isTgsSource, loadLottieData } from '../../lib/tgs-loader';

interface TgsStickerPlayerProps {
  src: string;
  alt?: string;
  animationData?: any;
  loop?: boolean;
  autoplay?: boolean;
  playOnHover?: boolean;
  className?: string;
  style?: React.CSSProperties;
  width?: number | string;
  height?: number | string;
  fallbackUrl?: string;
}

export const TgsStickerPlayer: React.FC<TgsStickerPlayerProps> = React.memo(({
  src,
  alt = 'Sticker',
  animationData,
  loop = true,
  autoplay = true,
  playOnHover = false,
  className = '',
  style,
  width,
  height,
  fallbackUrl
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animItemRef = useRef<AnimationItem | null>(null);
  const [isInView, setIsInView] = useState(false);
  const [isNearViewport, setIsNearViewport] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const isLottieSource = Boolean(
    animationData || 
    (src && (isTgsSource(src) || src.endsWith('.json')))
  );

  // 1. Viewport Culling Observer (Loads lazily and pauses offscreen animations)
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !isLottieSource) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) {
          setIsInView(entry.isIntersecting);
          if (entry.isIntersecting) {
            setIsNearViewport(true);
          }
        }
      },
      {
        root: null,
        rootMargin: '120px 0px 120px 0px',
        threshold: 0.05
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [isLottieSource]);

  // 2. Play / Pause based on visibility and hover state without destroying instance
  useEffect(() => {
    const anim = animItemRef.current;
    if (!anim) return;

    if (!isInView) {
      anim.pause();
      return;
    }

    if (playOnHover) {
      if (isHovered) {
        anim.play();
      } else {
        anim.pause();
      }
    } else {
      if (autoplay) {
        anim.play();
      }
    }
  }, [isInView, isHovered, playOnHover, autoplay]);

  // 3. Hardware-Accelerated Canvas Lottie Initialization (Stable - only runs when src/data changes)
  const initLottie = useCallback(async () => {
    if (!containerRef.current || !isLottieSource) return;

    try {
      let lottieJson = animationData;
      if (!lottieJson) {
        lottieJson = await loadLottieData(src);
      }

      if (!containerRef.current || !lottieJson) return;

      // Clean up previous instance if exists
      if (animItemRef.current) {
        animItemRef.current.destroy();
        animItemRef.current = null;
      }

      // Fast hardware-accelerated Canvas renderer (10x faster than SVG DOM)
      const anim = lottie.loadAnimation({
        container: containerRef.current,
        renderer: 'canvas',
        loop: loop,
        autoplay: playOnHover ? false : autoplay,
        animationData: lottieJson,
        rendererSettings: {
          clearCanvas: true,
          progressiveLoad: true,
          preserveAspectRatio: 'xMidYMid meet'
        }
      });

      animItemRef.current = anim;

      if (playOnHover) {
        anim.goToAndStop(0, true);
      }
    } catch (err) {
      console.warn('[TgsPlayer] Animation fallback to static image:', err);
      setLoadError(true);
    }
  }, [src, animationData, isLottieSource, loop, autoplay, playOnHover]);

  useEffect(() => {
    if (isNearViewport && isLottieSource && !loadError) {
      initLottie();
    }

    return () => {
      if (animItemRef.current) {
        animItemRef.current.destroy();
        animItemRef.current = null;
      }
    };
  }, [isNearViewport, isLottieSource, loadError, initLottie]);

  const containerStyle: React.CSSProperties = {
    width: width || '100%',
    height: height || '100%',
    aspectRatio: '1 / 1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...style
  };

  // If not Lottie or loading failed, render as standard image
  if (!isLottieSource || loadError) {
    const finalImageSrc = (loadError && fallbackUrl) ? fallbackUrl : src;
    return (
      <div
        className={`relative select-none ${className}`}
        style={containerStyle}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <img
          src={finalImageSrc}
          alt={alt}
          className="w-full h-full object-contain pointer-events-none drop-shadow-sm transition-transform duration-200"
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative select-none ${className}`}
      style={containerStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    />
  );
});

TgsStickerPlayer.displayName = 'TgsStickerPlayer';
