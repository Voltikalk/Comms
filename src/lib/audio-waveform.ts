/**
 * Audio Waveform Utilities for Telegram-Style Voice Notes
 */

export const DEFAULT_WAVEFORM_BARS = 30;

/**
 * Normalizes an array of raw audio amplitude numbers into a fixed count of bars
 * with values scaled between minHeight and maxHeight (default 8 to 100).
 */
export function normalizeWaveform(
  rawAmplitudes: number[],
  targetBarCount: number = DEFAULT_WAVEFORM_BARS,
  minVal: number = 8,
  maxVal: number = 100
): number[] {
  if (!rawAmplitudes || rawAmplitudes.length === 0) {
    return generateFallbackWaveform('default', targetBarCount, minVal, maxVal);
  }

  // If we have fewer samples than target bars, interpolate/stretch
  let resampled: number[] = [];
  if (rawAmplitudes.length === targetBarCount) {
    resampled = [...rawAmplitudes];
  } else if (rawAmplitudes.length < targetBarCount) {
    for (let i = 0; i < targetBarCount; i++) {
      const idx = (i / (targetBarCount - 1)) * (rawAmplitudes.length - 1);
      const low = Math.floor(idx);
      const high = Math.min(rawAmplitudes.length - 1, Math.ceil(idx));
      const weight = idx - low;
      const val = rawAmplitudes[low] * (1 - weight) + rawAmplitudes[high] * weight;
      resampled.push(val);
    }
  } else {
    // Downsample: average buckets
    const bucketSize = rawAmplitudes.length / targetBarCount;
    for (let i = 0; i < targetBarCount; i++) {
      const start = Math.floor(i * bucketSize);
      const end = Math.min(rawAmplitudes.length, Math.floor((i + 1) * bucketSize));
      let sum = 0;
      let count = 0;
      for (let j = start; j < end; j++) {
        sum += rawAmplitudes[j];
        count++;
      }
      resampled.push(count > 0 ? sum / count : rawAmplitudes[start] || 0);
    }
  }

  // Find peak value to normalize
  const peak = Math.max(...resampled, 1);
  
  // Scale each bar between minVal and maxVal
  return resampled.map((val) => {
    const ratio = Math.max(0, Math.min(1, val / peak));
    // Apply slight non-linear power curve for more aesthetic speech dynamics
    const curved = Math.pow(ratio, 0.75);
    return Math.round(minVal + curved * (maxVal - minVal));
  });
}

/**
 * Generates a deterministic pseudo-random waveform for messages without audio metadata
 */
export function generateFallbackWaveform(
  seed: string,
  targetBarCount: number = DEFAULT_WAVEFORM_BARS,
  minVal: number = 8,
  maxVal: number = 100
): number[] {
  const chars = (seed || 'comms').split('');
  const bars: number[] = [];
  
  for (let i = 0; i < targetBarCount; i++) {
    const charCode = chars[i % chars.length]?.charCodeAt(0) || 65;
    // Generate natural wave oscillations
    const wave = Math.sin(i * 0.45) * 0.3 + 0.5;
    const variation = ((charCode * (i + 7)) % 100) / 100;
    const combined = Math.min(1, Math.max(0.1, wave * 0.6 + variation * 0.4));
    bars.push(Math.round(minVal + combined * (maxVal - minVal)));
  }

  return bars;
}

/**
 * Web Audio API helper to attach an AnalyserNode to a MediaStream for real-time RMS volume sampling
 */
export interface AudioLiveAnalyser {
  audioContext: AudioContext;
  analyser: AnalyserNode;
  getInstantVolume: () => number;
  close: () => void;
}

export function createAudioLiveAnalyser(stream: MediaStream): AudioLiveAnalyser | null {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return null;

    const audioContext = new AudioContextClass();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.4;
    source.connect(analyser);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const getInstantVolume = (): number => {
      analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const avg = sum / bufferLength; // 0 to 255
      return Math.min(100, Math.round((avg / 255) * 100));
    };

    const close = () => {
      try {
        source.disconnect();
        analyser.disconnect();
        if (audioContext.state !== 'closed') {
          audioContext.close();
        }
      } catch (e) {
        console.warn('Error closing AudioContext', e);
      }
    };

    return {
      audioContext,
      analyser,
      getInstantVolume,
      close,
    };
  } catch (err) {
    console.warn('AudioLiveAnalyser could not be initialized:', err);
    return null;
  }
}

/**
 * Format duration in MM:SS (e.g. 0:05 or 1:23)
 */
export function formatAudioDuration(seconds: number): string {
  if (isNaN(seconds) || seconds < 0 || !isFinite(seconds)) return '0:00';
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  return `${min}:${sec < 10 ? '0' : ''}${sec}`;
}
