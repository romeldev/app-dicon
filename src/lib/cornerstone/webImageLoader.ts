import {
  Enums,
  utilities as coreUtilities,
  type Types,
} from "@cornerstonejs/core"

export const WEB_IMAGE_SCHEME = "web"

const sourceUrls = new Map<string, string>()

export function registerWebImageSource(imageId: string, url: string): void {
  sourceUrls.set(imageId, url)
}

export function unregisterWebImageSource(imageId: string): void {
  sourceUrls.delete(imageId)
}

export function isWebImageId(imageId: unknown): boolean {
  return typeof imageId === "string" && imageId.startsWith(`${WEB_IMAGE_SCHEME}:`)
}

export function buildWebImageId(key: string): string {
  return `${WEB_IMAGE_SCHEME}:${key}`
}

function loadHtmlImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => resolve(img)
    img.onerror = () =>
      reject(new Error(`webImageLoader: failed to decode image at ${url}`))
    img.src = url
  })
}

function extractRgb(img: HTMLImageElement): {
  rgb: Uint8Array
  canvas: HTMLCanvasElement
} {
  const canvas = document.createElement("canvas")
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext("2d")
  if (!ctx) {
    throw new Error("webImageLoader: 2D canvas context unavailable")
  }
  ctx.drawImage(img, 0, 0)
  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const pixelCount = width * height
  const rgb = new Uint8Array(pixelCount * 3)
  for (let i = 0, j = 0; i < data.length; i += 4, j += 3) {
    rgb[j] = data[i]
    rgb[j + 1] = data[i + 1]
    rgb[j + 2] = data[i + 2]
  }
  return { rgb, canvas }
}

function resolveUrl(imageId: string): string {
  const stored = sourceUrls.get(imageId)
  if (stored) return stored
  if (imageId.startsWith(`${WEB_IMAGE_SCHEME}:`)) {
    return imageId.slice(WEB_IMAGE_SCHEME.length + 1)
  }
  throw new Error(`webImageLoader: unknown imageId ${imageId}`)
}

export function loadWebImage(imageId: string): {
  promise: Promise<Types.IImage>
  cancelFn?: () => void
  decache?: () => void
} {
  const url = resolveUrl(imageId)
  const promise = loadHtmlImage(url).then((img) => {
    const { rgb, canvas } = extractRgb(img)
    const rows = img.naturalHeight
    const columns = img.naturalWidth
    const voxelManager = coreUtilities.VoxelManager.createImageVoxelManager({
      width: columns,
      height: rows,
      scalarData: rgb,
      numberOfComponents: 3,
    })
    const image = {
      imageId,
      minPixelValue: 0,
      maxPixelValue: 255,
      slope: 1,
      intercept: 0,
      windowCenter: 128,
      windowWidth: 256,
      voiLUTFunction: Enums.VOILUTFunctionType.LINEAR,
      getPixelData: () => voxelManager.getScalarData(),
      getCanvas: () => canvas,
      rows,
      columns,
      height: rows,
      width: columns,
      color: true,
      rgba: false,
      numberOfComponents: 3,
      columnPixelSpacing: 1,
      rowPixelSpacing: 1,
      invert: false,
      sizeInBytes: rgb.byteLength,
      dataType: "Uint8Array",
      voxelManager,
      imageFrame: {},
    } as unknown as Types.IImage
    return image
  })

  return { promise }
}
