import { del, get, set } from "idb-keyval"

const KEY_PREFIX = "dicon:v1"
const IMAGES_KEY = `${KEY_PREFIX}:images`
const LAST_KEY = `${KEY_PREFIX}:last`
const calibKey = (id: string) => `${KEY_PREFIX}:calib:${id}`
const annotsKey = (id: string) => `${KEY_PREFIX}:annots:${id}`
const blobKey = (id: string) => `${KEY_PREFIX}:blob:${id}`

export interface StoredImageMeta {
  imageId: string
  name: string
  type: string
  createdAt: number
}

export interface StoredCalibration {
  mmPerPixel: number
  createdAt: number
}

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export function listImages(): StoredImageMeta[] {
  if (typeof localStorage === "undefined") return []
  return safeParse<StoredImageMeta[]>(localStorage.getItem(IMAGES_KEY)) ?? []
}

export function upsertImage(meta: StoredImageMeta): void {
  const list = listImages().filter((m) => m.imageId !== meta.imageId)
  list.unshift(meta)
  localStorage.setItem(IMAGES_KEY, JSON.stringify(list.slice(0, 50)))
}

export function removeImageMeta(imageId: string): void {
  const list = listImages().filter((m) => m.imageId !== imageId)
  localStorage.setItem(IMAGES_KEY, JSON.stringify(list))
}

export function setLastImage(imageId: string | null): void {
  if (imageId) localStorage.setItem(LAST_KEY, imageId)
  else localStorage.removeItem(LAST_KEY)
}

export function getLastImage(): string | null {
  if (typeof localStorage === "undefined") return null
  return localStorage.getItem(LAST_KEY)
}

export function saveCalibration(
  imageId: string,
  calibration: StoredCalibration | null,
): void {
  if (calibration) {
    localStorage.setItem(calibKey(imageId), JSON.stringify(calibration))
  } else {
    localStorage.removeItem(calibKey(imageId))
  }
}

export function loadCalibration(imageId: string): StoredCalibration | null {
  if (typeof localStorage === "undefined") return null
  return safeParse<StoredCalibration>(localStorage.getItem(calibKey(imageId)))
}

export function saveAnnotations(imageId: string, annotations: unknown): void {
  localStorage.setItem(annotsKey(imageId), JSON.stringify(annotations))
}

export function loadAnnotations<T = unknown>(imageId: string): T | null {
  if (typeof localStorage === "undefined") return null
  return safeParse<T>(localStorage.getItem(annotsKey(imageId)))
}

export function clearImageState(imageId: string): void {
  localStorage.removeItem(calibKey(imageId))
  localStorage.removeItem(annotsKey(imageId))
}

export async function saveBlob(imageId: string, file: File): Promise<void> {
  await set(blobKey(imageId), file)
}

export async function loadBlob(imageId: string): Promise<File | null> {
  const v = await get<File>(blobKey(imageId))
  return v ?? null
}

export async function deleteBlob(imageId: string): Promise<void> {
  await del(blobKey(imageId))
}
