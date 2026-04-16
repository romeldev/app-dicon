"use client"

import * as React from "react"
import { CameraIcon, ImageIcon, Trash2Icon, UploadIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { StoredImageMeta } from "@/lib/viewer/persistence"

type Props = {
  onFile: (file: File) => void
  loading: boolean
  recent: StoredImageMeta[]
  onOpenRecent: (meta: StoredImageMeta) => void
  onRemoveRecent: (imageId: string) => void
}

export function UploadDropzone({
  onFile,
  loading,
  recent,
  onOpenRecent,
  onRemoveRecent,
}: Props) {
  const [dragging, setDragging] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)
  const cameraInputRef = React.useRef<HTMLInputElement | null>(null)

  const handleSelectFile = () => fileInputRef.current?.click()
  const handleCapture = () => cameraInputRef.current?.click()

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) onFile(file)
    e.target.value = ""
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith("image/")) onFile(file)
  }

  return (
    <div className="flex flex-1 flex-col gap-4 min-h-0">
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`flex flex-1 min-h-[240px] flex-col items-center justify-center gap-3 rounded-md border-2 border-dashed p-8 text-center transition-colors ${
          dragging
            ? "border-primary bg-primary/5"
            : "border-border bg-muted/30"
        }`}
      >
        <ImageIcon className="size-8 text-muted-foreground" />
        <div className="space-y-1">
          <p className="text-sm font-medium">
            Arrastra una imagen PNG o JPG aquí
          </p>
          <p className="text-xs text-muted-foreground">
            o selecciona desde tu dispositivo
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="default"
            disabled={loading}
            onClick={handleSelectFile}
          >
            <UploadIcon />
            Seleccionar archivo
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={handleCapture}
          >
            <CameraIcon />
            Usar cámara
          </Button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp"
          hidden
          onChange={onChange}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={onChange}
        />
      </div>

      {recent.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            Imágenes recientes
          </p>
          <ul className="flex flex-col gap-1">
            {recent.map((meta) => (
              <li
                key={meta.imageId}
                className="flex items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm"
              >
                <button
                  type="button"
                  className="flex-1 truncate text-left hover:text-primary"
                  onClick={() => onOpenRecent(meta)}
                >
                  {meta.name}
                </button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label="Eliminar"
                  onClick={() => onRemoveRecent(meta.imageId)}
                >
                  <Trash2Icon />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
