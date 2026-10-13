// lib/image-compressor.ts
// Utilidad del lado del cliente para redimensionar y comprimir fotos antes de subirlas al servidor.
// Convierte fotos pesadas de cámara (5-15 MB) a WebP o JPEG ligero (~150-250 KB) con resolución HD.

export interface CompressOptions {
  maxWidth?: number; // Ancho máximo en píxeles (default: 1200)
  maxHeight?: number; // Alto máximo en píxeles (default: 1200)
  quality?: number; // Calidad de compresión entre 0 y 1 (default: 0.82)
  preferredFormat?: "image/webp" | "image/jpeg"; // Formato deseado (default: image/webp)
}

export interface CompressionResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  savedPercent: number;
}

/**
 * Comprime y redimensiona una sola imagen en el navegador.
 */
export async function compressImage(
  file: File,
  options: CompressOptions = {}
): Promise<File> {
  const {
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 0.82,
    preferredFormat = "image/webp",
  } = options;

  // Si no es un archivo de imagen (ej. PDF o corrupto), devolver tal cual
  if (!file || !file.type.startsWith("image/")) {
    return file;
  }

  // SVG no se debe rasterizar ni redimensionar con Canvas
  if (file.type === "image/svg+xml") {
    return file;
  }

  return new Promise((resolve) => {
    // Si estamos en un entorno sin soporte de window/document (SSR), devolver archivo
    if (typeof window === "undefined" || typeof document === "undefined") {
      resolve(file);
      return;
    }

    const reader = new FileReader();

    reader.onload = (readerEvent) => {
      const img = new Image();

      img.onload = () => {
        try {
          let { width, height } = img;

          // Si la imagen ya es más pequeña que los límites y pesa poco (< 200 KB), devolverla tal cual
          if (width <= maxWidth && height <= maxHeight && file.size <= 200 * 1024) {
            resolve(file);
            return;
          }

          // Calcular nuevas dimensiones manteniendo la relación de aspecto exacta
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(file);
            return;
          }

          // Suavizado de imagen de alta calidad
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";

          // Dibujar la imagen redimensionada
          ctx.drawImage(img, 0, 0, width, height);

          // Verificar soporte de WebP
          const targetFormat = preferredFormat;

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                resolve(file);
                return;
              }

              // Si el archivo comprimido resultó ser más pesado que el original, conservar el original
              if (blob.size >= file.size) {
                resolve(file);
                return;
              }

              const extension = targetFormat === "image/webp" ? ".webp" : ".jpg";
              const originalBaseName = file.name.replace(/\.[^/.]+$/, "");
              const newFileName = `${originalBaseName}${extension}`;

              const compressedFile = new File([blob], newFileName, {
                type: targetFormat,
                lastModified: Date.now(),
              });

              console.log(
                `[Compresión] ${file.name} (${formatBytes(file.size)}) -> ${newFileName} (${formatBytes(compressedFile.size)}) | Reducción: ${Math.round(
                  (1 - compressedFile.size / file.size) * 100
                )}%`
              );

              resolve(compressedFile);
            },
            targetFormat,
            quality
          );
        } catch (err) {
          console.warn("Fallo durante compresión en Canvas, usando archivo original:", err);
          resolve(file);
        }
      };

      img.onerror = () => {
        resolve(file);
      };

      img.src = readerEvent.target?.result as string;
    };

    reader.onerror = () => {
      resolve(file);
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Comprime múltiples imágenes en paralelo antes de enviarlas al servidor.
 */
export async function compressImages(
  files: File[],
  options: CompressOptions = {}
): Promise<File[]> {
  if (!files || files.length === 0) return [];
  return Promise.all(files.map((f) => compressImage(f, options)));
}

/**
 * Formatea bytes a KB o MB para mostrar en consola o interfaces.
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}
