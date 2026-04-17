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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import type { StoredCalibration } from "@/lib/viewer/persistence"

export type ActiveTool =
  | "windowLevel"
  | "pan"
  | "length"
  | "angle"
  | "ellipse"
  | "eraser"

type ToolSpec = {
  label: string
  icon: React.ReactNode
  active?: boolean
  disabled?: boolean
  onClick: () => void
}

type CollapseBreakpoint = "sm" | "md" | "lg"

const BP_EXPANDED_CLASS: Record<CollapseBreakpoint, string> = {
  sm: "hidden sm:flex",
  md: "hidden md:flex",
  lg: "hidden lg:flex",
}
const BP_COLLAPSED_CLASS: Record<CollapseBreakpoint, string> = {
  sm: "flex sm:hidden",
  md: "flex md:hidden",
  lg: "flex lg:hidden",
}

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
  const toolActive = (name: ActiveTool) =>
    activeTool === name && !calibrateMode

  const navigation: ToolSpec[] = [
    {
      label: "Window / Level",
      icon: <SlidersHorizontalIcon />,
      active: toolActive("windowLevel"),
      disabled,
      onClick: () => onSelectTool("windowLevel"),
    },
    {
      label: "Pan",
      icon: <MoveIcon />,
      active: toolActive("pan"),
      disabled,
      onClick: () => onSelectTool("pan"),
    },
  ]

  const measurements: ToolSpec[] = [
    {
      label: "Medir longitud",
      icon: <RulerIcon />,
      active: toolActive("length"),
      disabled,
      onClick: () => onSelectTool("length"),
    },
    {
      label: "Medir ángulo",
      icon: <TriangleIcon />,
      active: toolActive("angle"),
      disabled,
      onClick: () => onSelectTool("angle"),
    },
    {
      label: "Medir elipse",
      icon: <CircleIcon />,
      active: toolActive("ellipse"),
      disabled,
      onClick: () => onSelectTool("ellipse"),
    },
  ]

  const edits: ToolSpec[] = [
    {
      label: "Borrar (clic en medición)",
      icon: <EraserIcon />,
      active: toolActive("eraser"),
      disabled,
      onClick: () => onSelectTool("eraser"),
    },
    {
      label: "Borrar todas",
      icon: <Trash2Icon />,
      disabled,
      onClick: onClearAnnotations,
    },
    {
      label: "Deshacer (Ctrl+Z)",
      icon: <Undo2Icon />,
      disabled,
      onClick: onUndo,
    },
    {
      label: "Rehacer (Ctrl+Shift+Z)",
      icon: <Redo2Icon />,
      disabled,
      onClick: onRedo,
    },
    {
      label: annotationsHidden ? "Mostrar mediciones" : "Ocultar mediciones",
      icon: annotationsHidden ? <EyeOffIcon /> : <EyeIcon />,
      active: annotationsHidden,
      disabled,
      onClick: onToggleAnnotations,
    },
  ]

  const transforms: ToolSpec[] = [
    {
      label: "Rotar 90°",
      icon: <RotateCwIcon />,
      disabled,
      onClick: onRotate,
    },
    {
      label: "Flip horizontal",
      icon: <FlipHorizontal2Icon />,
      disabled,
      onClick: onFlipH,
    },
    {
      label: "Flip vertical",
      icon: <FlipVertical2Icon />,
      disabled,
      onClick: onFlipV,
    },
    {
      label: "Invertir",
      icon: <ContrastIcon />,
      disabled,
      onClick: onInvert,
    },
    {
      label: "Reset",
      icon: <RotateCcwIcon />,
      disabled,
      onClick: onReset,
    },
  ]

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-border bg-card p-1.5">
      <ToolGroup
        label="Navegación"
        groupIcon={<SlidersHorizontalIcon />}
        tools={navigation}
        collapseAt="sm"
      />
      <Separator orientation="vertical" className="h-6 mx-1" />
      <ToolGroup
        label="Mediciones"
        groupIcon={<RulerIcon />}
        tools={measurements}
        collapseAt="sm"
      />
      <Separator orientation="vertical" className="h-6 mx-1" />
      <ToolGroup
        label="Edición"
        groupIcon={<EraserIcon />}
        tools={edits}
        collapseAt="md"
      />
      <Separator orientation="vertical" className="h-6 mx-1" />
      <ToolGroup
        label="Transformaciones"
        groupIcon={<RotateCwIcon />}
        tools={transforms}
        collapseAt="md"
      />

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

function ToolGroup({
  label,
  groupIcon,
  tools,
  collapseAt,
}: {
  label: string
  groupIcon: React.ReactNode
  tools: ToolSpec[]
  collapseAt: CollapseBreakpoint
}) {
  const anyActive = tools.some((t) => t.active)
  const allDisabled = tools.every((t) => t.disabled)

  return (
    <>
      <div
        className={`${BP_EXPANDED_CLASS[collapseAt]} items-center gap-1.5`}
        aria-label={label}
      >
        {tools.map((t) => (
          <ToolButton
            key={t.label}
            label={t.label}
            active={t.active}
            disabled={t.disabled}
            onClick={t.onClick}
          >
            {t.icon}
          </ToolButton>
        ))}
      </div>
      <div className={BP_COLLAPSED_CLASS[collapseAt]}>
        <DropdownMenu>
          <DropdownMenuTrigger
            disabled={allDisabled}
            render={
              <Button
                type="button"
                size="icon"
                variant={anyActive ? "default" : "ghost"}
                disabled={allDisabled}
                title={label}
                aria-label={label}
              />
            }
          >
            {groupIcon}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {tools.map((t) => (
              <DropdownMenuItem
                key={t.label}
                disabled={t.disabled}
                onClick={t.onClick}
                data-active={t.active ? "true" : undefined}
                className="data-active:bg-accent data-active:text-accent-foreground"
              >
                {t.icon}
                <span>{t.label}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
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
