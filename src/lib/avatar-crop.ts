/** Square region of the (already rotated) image, in source pixels. */
export interface AvatarCrop {
  x: number;
  y: number;
  side: number;
}

export type AvatarRotation = 0 | 90 | 180 | 270;

const encode = (canvas: HTMLCanvasElement) =>
  new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Encoding failed'))), 'image/jpeg', 0.9),
  );

/** Size of the image after rotating it by `rotation` degrees. */
export const rotatedSize = (width: number, height: number, rotation: AvatarRotation) =>
  rotation % 180 === 0 ? { width, height } : { width: height, height: width };

/**
 * Renders the chosen square of a rotated image into a JPEG of at most
 * `size` px, so avatars upload small and look the same in every round frame.
 */
export async function renderAvatar(
  bitmap: ImageBitmap,
  crop: AvatarCrop,
  rotation: AvatarRotation = 0,
  size = 640,
): Promise<Blob> {
  const target = Math.max(1, Math.round(Math.min(size, crop.side)));
  const canvas = document.createElement('canvas');
  canvas.width = target;
  canvas.height = target;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not supported');
  ctx.imageSmoothingQuality = 'high';
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, target, target);

  const { width: rw, height: rh } = rotatedSize(bitmap.width, bitmap.height, rotation);
  const scale = target / crop.side;
  ctx.scale(scale, scale);
  ctx.translate(-crop.x, -crop.y);
  ctx.translate(rw / 2, rh / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2);
  return encode(canvas);
}

/** Center-crops an image to a square (no user adjustments). */
export async function cropAvatar(file: Blob, size = 640): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    const side = Math.min(bitmap.width, bitmap.height);
    return await renderAvatar(bitmap, { x: (bitmap.width - side) / 2, y: (bitmap.height - side) / 2, side }, 0, size);
  } finally {
    bitmap.close();
  }
}
