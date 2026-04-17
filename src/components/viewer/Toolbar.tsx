"use client"

import * as React from "react"
import {
  CircleIcon,
  ContrastIcon,
  DownloadIcon,
  EraserIcon,
  EyeIcon,
  EyeOffIcon,
  FlipHorizontal2Icon,
  FlipVertical2Icon,
  MoveIcon,
  Redo2Icon,
  RotateCcwIcon,
  RotateCwIcon,
  RulerIcon,
  SlidersHorizontalIcon,
  Trash2Icon,
  TriangleIcon,
  Undo2Icon,
  XIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import type { StoredCalibration } from "@/lib/viewer/persistence"

export type ActiveTool =
  | "windowLevel"
  | "pan"
  | "length"
  | "angle"
  | "ellipse"
  | "eraser"

type ToolbarProps = {
  disabled: boolean
  activeTool: ActiveTool
  onSelectTool: (tool: ActiveTool) => void
  onRotate: () => void
  onFlipH: () => void
  onFlipV: () => void
  onInvert: () => void
  onReset: () => void
  onCalibrate: () => void
  onClearCalibration: () => void
  onExport: () => void
  onToggleAnnotations: () => void
  annotationsHidden: boolean
  onClearAnnotations: () => void
  onUndo: () => void
  onRedo: () => void
  calibration: StoredCalibration | null
  calibrateMode: boolean
}

export function Toolbar({
  disabled,
  activeTool,
  onSelectTool,
  onRotate,
  onFlipH,
  onFlipV,
  onInvert,
  onReset,
  onCalibrate,
  onClearCalibration,
  onExport,
  onToggleAnnotations,
  annotationsHidden,
  onClearAnnotations,
  onUndo,
  onRedo,
  calibration,
  calibrateMode,
}: ToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-border bg-card p-1.5">
      <ToolButton
        label="Window / Level"
        active={activeTool === "windowLevel" && !calibrateMode}
        disabled={disabled}
        onClick={() => onSelectTool("windowLevel")}
      >
        <SlidersHorizontalIcon />
      </ToolButton>
      <ToolButton
        label="Pan"
        active={activeTool === "pan" && !calibrateMode}
        disabled={disabled}
        onClick={() => onSelectTool("pan")}
      >
        <MoveIcon />
      </ToolButton>
      <ToolButton
        label="Medir longitud"
        active={activeTool === "length" && !calibrateMode}
        disabled={disabled}
        onClick={() => onSelectTool("length")}
      >
        <RulerIcon />
      </ToolButton>
      <ToolButton
        label="Medir ángulo"
        active={activeTool === "angle" && !calibrateMode}
        disabled={disabled}
        onClick={() => onSelectTool("angle")}
      >
        <TriangleIcon />
      </ToolButton>
      <ToolButton
        label="Medir elipse"
        active={activeTool === "ellipse" && !calibrateMode}
        disabled={disabled}
        onClick={() => onSelectTool("ellipse")}
      >
        <CircleIcon />
      </ToolButton>
      <ToolButton
        label="Borrar (clic en medición)"
        active={activeTool === "eraser" && !calibrateMode}
        disabled={disabled}
        onClick={() => onSelectTool("eraser")}
      >
        <EraserIcon />
      </ToolButton>
      <ToolButton
        label="Borrar todas las mediciones"
        disabled={disabled}
        onClick={onClearAnnotations}
      >
        <Trash2Icon />
      </ToolButton>
      <ToolButton
        label="Deshacer (Ctrl+Z)"
        disabled={disabled}
        onClick={onUndo}
      >
        <Undo2Icon />
      </ToolButton>
      <ToolButton
        label="Rehacer (Ctrl+Shift+Z)"
        disabled={disabled}
        onClick={onRedo}
      >
        <Redo2Icon />
      </ToolButton>

      <Separator orientation="vertical" className="h-6 mx-1" />

      <ToolButton
        label="Rotar 90°"
        disabled={disabled}
        onClick={onRotate}
      >
        <RotateCwIcon />
      </ToolButton>
      <ToolButton
        label="Flip horizontal"
        disabled={disabled}
        onClick={onFlipH}
      >
        <FlipHorizontal2Icon />
      </ToolButton>
      <ToolButton
        label="Flip vertical"
        disabled={disabled}
        onClick={onFlipV}
      >
        <FlipVertical2Icon />
      </ToolButton>
      <ToolButton label="Invertir" disabled={disabled} onClick={onInvert}>
        <ContrastIcon />
      </ToolButton>
      <ToolButton label="Reset" disabled={disabled} onClick={onReset}>
        <RotateCcwIcon />
      </ToolButton>
      <ToolButton
        label={annotationsHidden ? "Mostrar mediciones" : "Ocultar mediciones"}
        active={annotationsHidden}
        disabled={disabled}
        onClick={onToggleAnnotations}
      >
        {annotationsHidden ? <EyeOffIcon /> : <EyeIcon />}
      </ToolButton>

      <Separator orientation="vertical" className="h-6 mx-1" />

      <Button
        type="button"
        size="sm"
        variant={calibrateMode ? "default" : "outline"}
        disabled={disabled}
        onClick={onCalibrate}
      >
        <RulerIcon />
        {calibrateMode ? "Dibuja referencia…" : "Calibrar"}
      </Button>
      {calibration ? (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={disabled}
          onClick={onClearCalibration}
          title="Quitar calibración"
        >
          <XIcon />
          <span className="text-xs">
            {calibration.mmPerPixel.toFixed(4)} mm/px
          </span>
        </Button>
      ) : null}

      <div className="flex-1" />

      <Button
        type="button"
        size="sm"
        variant="secondary"
        disabled={disabled}
        onClick={onExport}
      >
        <DownloadIcon />
        Exportar PNG
      </Button>
    </div>
  )
}

function ToolButton({
  children,
  label,
  active,
  disabled,
  onClick,
}: {
  children: React.ReactNode
  label: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <Button
      type="button"
      size="icon"
      variant={active ? "default" : "ghost"}
      disabled={disabled}
      onClick={onClick}
      title={label}
      aria-label={label}
    >
      {children}
    </Button>
  )
}
