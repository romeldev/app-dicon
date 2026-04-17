export function downloadCanvasAsPng(
  canvas: HTMLCanvasElement,
  filename: string,
): void {
  canvas.toBlob((blob) => {
    if (!blob) return
    triggerDownload(blob, filename)
  }, "image/png")
}

export function suggestFilename(sourceName: string): string {
  const base = sourceName.replace(/\.[^.]+$/, "") || "viewport"
  const stamp = new Date().toISOString().replace(/[:.]/g, "-")
  return `${base}-${stamp}.png`
}

export async function exportViewportWithAnnotations(
  container: HTMLElement,
  imageCanvas: HTMLCanvasElement,
  filename: string,
): Promise<void> {
  const svg = container.querySelector<SVGSVGElement>(".svg-layer")
  if (!svg) {
    downloadCanvasAsPng(imageCanvas, filename)
    return
  }

  const width = imageCanvas.width
  const height = imageCanvas.height
  if (width === 0 || height === 0) {
    downloadCanvasAsPng(imageCanvas, filename)
    return
  }

  const out = document.createElement("canvas")
  out.width = width
  out.height = height
  const ctx = out.getContext("2d")
  if (!ctx) {
    downloadCanvasAsPng(imageCanvas, filename)
    return
  }

  ctx.drawImage(imageCanvas, 0, 0, width, height)

  const svgRect = svg.getBoundingClientRect()
  if (svgRect.width > 0 && svgRect.height > 0) {
    const clone = svg.cloneNode(true) as SVGSVGElement
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg")
    if (!clone.getAttribute("viewBox")) {
      clone.setAttribute(
        "viewBox",
        `0 0 ${svgRect.width} ${svgRect.height}`,
      )
    }
    clone.setAttribute("width", String(svgRect.width))
    clone.setAttribute("height", String(svgRect.height))

    const serialized = new XMLSerializer().serializeToString(clone)
    const svgBlob = new Blob([serialized], {
      type: "image/svg+xml;charset=utf-8",
    })
    const url = URL.createObjectURL(svgBlob)

    try {
      const img = await loadImage(url)
      // Scale SVG (in CSS px) to match the canvas backing pixel size.
      ctx.drawImage(img, 0, 0, width, height)
    } finally {
      URL.revokeObjectURL(url)
    }
  }

  out.toBlob((blob) => {
    if (blob) triggerDownload(blob, filename)
  }, "image/png")
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error("Failed to rasterize SVG overlay"))
    img.src = url
  })
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
