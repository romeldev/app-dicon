"use client"

import * as React from "react"
import { Dialog } from "@base-ui/react/dialog"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type Props = {
  open: boolean
  pixelLength: number
  onConfirm: (realMm: number) => void
  onCancel: () => void
}

export function CalibrationDialog({
  open,
  pixelLength,
  onConfirm,
  onCancel,
}: Props) {
  const [value, setValue] = React.useState("")

  React.useEffect(() => {
    if (open) setValue("")
  }, [open])

  const parsed = Number.parseFloat(value)
  const valid = Number.isFinite(parsed) && parsed > 0

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (valid) onConfirm(parsed)
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel()
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 data-starting-style:opacity-0 data-ending-style:opacity-0 transition-opacity duration-150" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[90vw] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-popover p-5 text-popover-foreground shadow-lg data-starting-style:opacity-0 data-ending-style:opacity-0 data-starting-style:scale-95 data-ending-style:scale-95 transition-all duration-150">
          <Dialog.Title className="font-heading text-base font-medium">
            Calibrar imagen
          </Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-muted-foreground">
            Línea dibujada: <strong>{pixelLength.toFixed(1)} px</strong>.
            Ingresa la distancia real que representa.
          </Dialog.Description>
          <form onSubmit={handleSubmit} className="mt-4 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="calibration-mm">Distancia real (mm)</Label>
              <Input
                id="calibration-mm"
                type="number"
                step="0.01"
                min="0"
                autoFocus
                value={value}
                onChange={(e) => setValue(e.currentTarget.value)}
                placeholder="p. ej. 50"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={onCancel}>
                Cancelar
              </Button>
              <Button type="submit" disabled={!valid}>
                Calibrar
              </Button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
