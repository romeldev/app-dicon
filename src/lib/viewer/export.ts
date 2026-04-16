export function downloadCanvasAsPng(
  canvas: HTMLCanvasElement,
  filename: string,
): void {
  canvas.toBlob((blob) => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }, "image/png")
}

export function suggestFilename(sourceName: string): string {
  const base = sourceName.replace(/\.[^.]+$/, "") || "viewport"
  const stamp = new Date().toISOString().replace(/[:.]/g, "-")
  return `${base}-${stamp}.png`
}
