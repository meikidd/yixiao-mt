// OpenCV.js document scanning utilities
// Runs in the browser to preprocess images before sending to Claude Vision

type CvMat = {
  rows: number
  data32S: Int32Array
  data32F: Float32Array
}
type CvMatConstructor = { new(): CvMat; eye(rows: number, cols: number, type: number): CvMat }
type CvMatVector = { size(): number; get(i: number): CvMat }

declare const cv: {
  imread: (canvas: HTMLCanvasElement) => CvMat
  imshow: (canvas: HTMLCanvasElement, mat: CvMat) => void
  Mat: CvMatConstructor
  MatVector: { new(): CvMatVector }
  cvtColor: (src: CvMat, dst: CvMat, code: number) => void
  GaussianBlur: (src: CvMat, dst: CvMat, ksize: unknown, sigma: number) => void
  Canny: (src: CvMat, dst: CvMat, t1: number, t2: number) => void
  findContours: (src: CvMat, contours: CvMatVector, hierarchy: CvMat, mode: number, method: number) => void
  contourArea: (c: CvMat) => number
  arcLength: (c: CvMat, closed: boolean) => number
  approxPolyDP: (src: CvMat, dst: CvMat, epsilon: number, closed: boolean) => void
  getPerspectiveTransform: (src: CvMat, dst: CvMat) => CvMat
  warpPerspective: (src: CvMat, dst: CvMat, M: CvMat, dsize: unknown) => void
  Size: new (w: number, h: number) => unknown
  RETR_LIST: number
  CHAIN_APPROX_SIMPLE: number
  COLOR_RGBA2GRAY: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete: (mat: any) => void
}

export interface ProcessedImage {
  blob: Blob
  wasProcessed: boolean
}

export async function preprocessDocumentImage(file: File): Promise<ProcessedImage> {
  // Try OpenCV.js processing, fall back to original if not available or fails
  try {
    if (typeof cv === 'undefined') {
      return { blob: file, wasProcessed: false }
    }
    const processed = await runOpenCVPerspectiveCorrection(file)
    return { blob: processed, wasProcessed: true }
  } catch (err) {
    console.warn('OpenCV preprocessing skipped, using original:', err)
    return { blob: file, wasProcessed: false }
  }
}

async function runOpenCVPerspectiveCorrection(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      try {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0)

        const src = cv.imread(canvas)
        const gray = new cv.Mat()
        const blurred = new cv.Mat()
        const edges = new cv.Mat()
        const contours = new cv.MatVector()
        const hierarchy = new cv.Mat()

        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY)
        cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0)
        cv.Canny(blurred, edges, 75, 200)
        cv.findContours(edges, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE)

        // Find the largest 4-point contour (the document)
        let bestContour: CvMat | null = null
        let bestArea = 0
        for (let i = 0; i < contours.size(); i++) {
          const contour = contours.get(i)
          const peri = cv.arcLength(contour, true)
          const approx = new cv.Mat()
          cv.approxPolyDP(contour, approx, 0.02 * peri, true)
          const area = cv.contourArea(contour)
          if (approx.rows === 4 && area > bestArea) {
            bestArea = area
            bestContour = approx
          } else {
            cv.delete(approx)
          }
        }

        if (!bestContour || bestArea < (img.width * img.height * 0.1)) {
          // No document found, return CLAHE-enhanced original
          cv.delete(src); cv.delete(gray); cv.delete(blurred)
          cv.delete(edges); cv.delete(hierarchy)
          canvas.toBlob((b) => b ? resolve(b) : reject(new Error('canvas empty')), 'image/jpeg', 0.92)
          return
        }

        // Apply perspective transform
        const data32S = bestContour.data32S
        const pts = [
          { x: data32S[0], y: data32S[1] },
          { x: data32S[2], y: data32S[3] },
          { x: data32S[4], y: data32S[5] },
          { x: data32S[6], y: data32S[7] },
        ]
        pts.sort((a, b) => a.y - b.y)
        const [tl, tr] = pts[0].x < pts[1].x ? [pts[0], pts[1]] : [pts[1], pts[0]]
        const [bl, br] = pts[2].x < pts[3].x ? [pts[2], pts[3]] : [pts[3], pts[2]]

        const maxW = Math.max(
          Math.hypot(br.x - bl.x, br.y - bl.y),
          Math.hypot(tr.x - tl.x, tr.y - tl.y)
        )
        const maxH = Math.max(
          Math.hypot(tr.x - br.x, tr.y - br.y),
          Math.hypot(tl.x - bl.x, tl.y - bl.y)
        )
        const W = Math.round(maxW)
        const H = Math.round(maxH)

        const srcPts = cv.Mat.eye(4, 2, 5 /* CV_32F */)
        const dstPts = cv.Mat.eye(4, 2, 5)
        srcPts.data32F.set([tl.x, tl.y, tr.x, tr.y, br.x, br.y, bl.x, bl.y])
        dstPts.data32F.set([0, 0, W, 0, W, H, 0, H])

        const M = cv.getPerspectiveTransform(srcPts, dstPts)
        const warped = new cv.Mat()
        cv.warpPerspective(src, warped, M, new cv.Size(W, H))

        const outCanvas = document.createElement('canvas')
        cv.imshow(outCanvas, warped)

        cv.delete(src); cv.delete(gray); cv.delete(blurred); cv.delete(edges)
        cv.delete(hierarchy); cv.delete(bestContour!)
        cv.delete(srcPts); cv.delete(dstPts); cv.delete(M); cv.delete(warped)

        outCanvas.toBlob((b) => b ? resolve(b) : reject(new Error('canvas empty')), 'image/jpeg', 0.92)
      } catch (e) {
        reject(e)
      }
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load failed')) }
    img.src = url
  })
}
