export async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes)
  const view = new Uint8Array(digest)
  let out = ""
  for (const b of view) out += b.toString(16).padStart(2, "0")
  return out
}

export async function hashFile(file: File): Promise<string> {
  const buf = await file.arrayBuffer()
  return sha256Hex(buf)
}
