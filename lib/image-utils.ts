export async function compressImage(
  blob: Blob,
  { maxDimension = 1600, maxBytes = 3_700_000 }: { maxDimension?: number; maxBytes?: number } = {}
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(blob)
    img.onload = () => {
      URL.revokeObjectURL(url)

      let { width, height } = img
      if (width > maxDimension || height > maxDimension) {
        const ratio = Math.min(maxDimension / width, maxDimension / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)

      const tryQuality = (quality: number) => {
        canvas.toBlob(
          (result) => {
            if (!result) { reject(new Error('canvas empty')); return }
            if (result.size <= maxBytes || quality <= 0.4) {
              resolve(result)
            } else {
              tryQuality(Math.round((quality - 0.1) * 10) / 10)
            }
          },
          'image/jpeg',
          quality
        )
      }
      tryQuality(0.85)
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load failed')) }
    img.src = url
  })
}
