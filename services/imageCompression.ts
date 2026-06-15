/**
 * Utility to compress and resize images client-side to prevent Vercel 413 Payload Too Large error
 */
export const compressImage = (
  dataUrl: string,
  maxDimension = 1200,
  quality = 0.8
): Promise<string> => {
  return new Promise((resolve) => {
    // If it's not an image dataurl, return as-is
    if (!dataUrl.startsWith("data:image/")) {
      resolve(dataUrl);
      return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = dataUrl;

    img.onload = () => {
      let width = img.width;
      let height = img.height;

      // Only resize if the image exceeds the max dimension
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      } else {
        // Even if we don't resize, we should convert to webp/jpeg to benefit from lossy compression
        // unless it's already small. But resizing and compressing everything ensures optimal payload size.
      }

      try {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(dataUrl); // fallback
          return;
        }

        // Draw image on canvas
        ctx.fillStyle = "#FFFFFF"; // Fill background in case of PNG transparency with JPEG output
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to highly-compressed JPEG (highly efficient)
        const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(compressedDataUrl);
      } catch (err) {
        console.error("Error drawing image to canvas for compression", err);
        resolve(dataUrl); // fallback to original
      }
    };

    img.onerror = (err) => {
      console.error("Error loading image for compression", err);
      resolve(dataUrl); // fallback
    };
  });
};
