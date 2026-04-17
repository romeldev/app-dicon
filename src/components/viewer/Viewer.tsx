"use client"

import * as React from "react"
import {
  Enums,
  RenderingEngine,
  eventTarget,
  getRenderingEngine,
  metaData,
  utilities as coreUtilities,
  type Types as CoreTypes,
} from "@cornerstonejs/core"
import {
  ToolGroupManager,
  Enums as ToolEnums,
  annotation as csAnnotation,
  cancelActiveManipulations,
  utilities as toolUtilities,
} from "@cornerstonejs/tools"

import { initCornerstone, TOOL_NAMES } from "@/lib/cornerstone/init"
import {
  buildWebImageId,
  registerWebImageSource,
  unregisterWebImageSource,
} from "@/lib/cornerstone/webImageLoader"
import {
  exportViewportWithAnnotations,
  suggestFilename,
} from "@/lib/viewer/export"
import { hashFile } from "@/lib/viewer/hash"
import {
  clearImageState,
  getLastImage,
  listImages,
  loadAnnotations,
  loadBlob,
  loadCalibration,
  removeImageMeta,
  saveAnnotations,
  saveBlob,
  saveCalibration,
  setLastImage,
  upsertImage,
  type StoredCalibration,
  type StoredImageMeta,
} from "@/lib/viewer/persistence"
import { CalibrationDialog } from "./CalibrationDialog"
import { Toolbar, type ActiveTool } from "./Toolbar"
import { UploadDropzone } from "./UploadDropzone"

const RENDERING_ENGINE_ID = "dicon-re"
const TOOL_GROUP_ID = "dicon-tg"
const VIEWPORT_ID = "dicon-vp"

type PendingCalibration = {
  annotationUID: string
  pixelLength: number
}

export function Viewer() {
  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const engineRef = React.useRef<RenderingEngine | null>(null)

  const [ready, setReady] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [imageMeta, setImageMeta] = React.useState<StoredImageMeta | null>(null)
  const [calibration, setCalibration] =
    React.useState<StoredCalibration | null>(null)
  const [activeTool, setActiveTool] = React.useState<ActiveTool>("windowLevel")
  const [calibrateMode, setCalibrateMode] = React.useState(false)
  const [pending, setPending] =
    React.useState<PendingCalibration | null>(null)
  const [recentImages, setRecentImages] = React.useState<StoredImageMeta[]>([])
  const [annotationsHidden, setAnnotationsHidden] = React.useState(false)

  const activeToolRef = React.useRef(activeTool)
  const calibrateModeRef = React.useRef(calibrateMode)
  const imageIdRef = React.useRef<string | null>(null)
  const blobUrlRef = React.useRef<string | null>(null)
  const cancelledUIDsRef = React.useRef<Set<string>>(new Set())
  const isCancellingRef = React.useRef(false)

  React.useEffect(() => {
    activeToolRef.current = activeTool
  }, [activeTool])
  React.useEffect(() => {
    calibrateModeRef.current = calibrateMode
  }, [calibrateMode])

  // Init Cornerstone + rendering engine once
  React.useEffect(() => {
    let cancelled = false
    let boundElement: HTMLDivElement | null = null
    let resizeObserver: ResizeObserver | null = null
    ;(async () => {
      await initCornerstone()
      if (cancelled) return

      const element = containerRef.current
      if (!element) return
      boundElement = element

      const engine = new RenderingEngine(RENDERING_ENGINE_ID)
      engineRef.current = engine
      engine.enableElement({
        viewportId: VIEWPORT_ID,
        type: Enums.ViewportType.STACK,
        element,
      })

      const existingGroup = ToolGroupManager.getToolGroup(TOOL_GROUP_ID)
      const toolGroup =
        existingGroup ?? ToolGroupManager.createToolGroup(TOOL_GROUP_ID)
      if (!toolGroup) return

      if (!toolGroup.hasTool(TOOL_NAMES.Pan)) toolGroup.addTool(TOOL_NAMES.Pan)
      if (!toolGroup.hasTool(TOOL_NAMES.Zoom))
        toolGroup.addTool(TOOL_NAMES.Zoom)
      if (!toolGroup.hasTool(TOOL_NAMES.WindowLevel))
        toolGroup.addTool(TOOL_NAMES.WindowLevel)
      if (!toolGroup.hasTool(TOOL_NAMES.Length))
        toolGroup.addTool(TOOL_NAMES.Length)
      if (!toolGroup.hasTool(TOOL_NAMES.Angle))
        toolGroup.addTool(TOOL_NAMES.Angle)
      if (!toolGroup.hasTool(TOOL_NAMES.Ellipse))
        toolGroup.addTool(TOOL_NAMES.Ellipse)
      if (!toolGroup.hasTool(TOOL_NAMES.Eraser))
        toolGroup.addTool(TOOL_NAMES.Eraser)
      if (!toolGroup.hasTool(TOOL_NAMES.StackScroll))
        toolGroup.addTool(TOOL_NAMES.StackScroll)

      toolGroup.addViewport(VIEWPORT_ID, RENDERING_ENGINE_ID)

      // Zoom always on wheel; pan always on middle mouse; initial primary = window/level.
      toolGroup.setToolActive(TOOL_NAMES.Zoom, {
        bindings: [{ mouseButton: ToolEnums.MouseBindings.Wheel }],
      })
      toolGroup.setToolActive(TOOL_NAMES.Pan, {
        bindings: [{ mouseButton: ToolEnums.MouseBindings.Auxiliary }],
      })
      toolGroup.setToolActive(TOOL_NAMES.WindowLevel, {
        bindings: [{ mouseButton: ToolEnums.MouseBindings.Primary }],
      })
      toolGroup.setToolPassive(TOOL_NAMES.Length)
      toolGroup.setToolPassive(TOOL_NAMES.Angle)
      toolGroup.setToolPassive(TOOL_NAMES.Ellipse)
      toolGroup.setToolPassive(TOOL_NAMES.Eraser)

      setReady(true)
      setRecentImages(listImages())

      // Keep the GPU canvas sized to the container across sidebar toggles / window resize.
      resizeObserver = new ResizeObserver(() => {
        try {
          engineRef.current?.resize(true, true)
        } catch {}
      })
      resizeObserver.observe(element)

      const lastId = getLastImage()
      if (lastId) {
        const blob = await loadBlob(lastId)
        const meta = listImages().find((m) => m.imageId === lastId)
        if (blob && meta) await loadImageIntoViewport(blob, meta)
      }
    })()

    return () => {
      cancelled = true
      resizeObserver?.disconnect()
      resizeObserver = null
      const toolGroup = ToolGroupManager.getToolGroup(TOOL_GROUP_ID)
      if (toolGroup && boundElement) {
        toolGroup.removeViewports(RENDERING_ENGINE_ID, VIEWPORT_ID)
      }
      try {
        engineRef.current?.disableElement(VIEWPORT_ID)
      } catch {}
      engineRef.current?.destroy()
      engineRef.current = null
      if (ToolGroupManager.getToolGroup(TOOL_GROUP_ID)) {
        ToolGroupManager.destroyToolGroup(TOOL_GROUP_ID)
      }
      if (imageIdRef.current) unregisterWebImageSource(imageIdRef.current)
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
      imageIdRef.current = null
      blobUrlRef.current = null
      setReady(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Listen for annotation completion events (for calibration capture).
  // Cornerstone dispatches ANNOTATION_* events on the global eventTarget, not on the DOM element.
  React.useEffect(() => {
    if (!ready) return
    const handler = (evt: Event) => {
      const custom = evt as CustomEvent<{
        annotation?: {
          annotationUID: string
          data?: { handles?: { points?: number[][] }; cachedStats?: unknown }
          metadata?: { toolName?: string }
        }
      }>
      const detail = custom.detail
      const ann = detail?.annotation
      if (!ann) return
      if (ann.metadata?.toolName !== TOOL_NAMES.Length) return
      // Skip if this completion comes from an explicit cancel (LengthTool.cancel()
      // fires ANNOTATION_COMPLETED synchronously even when the user aborted).
      if (isCancellingRef.current || cancelledUIDsRef.current.has(ann.annotationUID)) {
        cancelledUIDsRef.current.delete(ann.annotationUID)
        try {
          csAnnotation.state.removeAnnotation(ann.annotationUID)
        } catch {}
        return
      }
      if (!calibrateModeRef.current) return
      const pts = ann.data?.handles?.points
      if (!pts || pts.length < 2) return
      // Our web loader sets rowPixelSpacing = columnPixelSpacing = 1, so world
      // distance equals image-index distance (in pixels). Using world space
      // matches exactly what Cornerstone uses internally to compute lengths.
      const [ax, ay, az = 0] = pts[0]
      const [bx, by, bz = 0] = pts[1]
      const pixelLength = Math.hypot(bx - ax, by - ay, bz - az)
      setPending({ annotationUID: ann.annotationUID, pixelLength })
    }
    eventTarget.addEventListener(
      ToolEnums.Events.ANNOTATION_COMPLETED,
      handler as EventListener,
    )
    return () => {
      eventTarget.removeEventListener(
        ToolEnums.Events.ANNOTATION_COMPLETED,
        handler as EventListener,
      )
    }
  }, [ready])

  // Eraser hover: highlight the annotation under the cursor in red so the user
  // sees which one will be removed on click.
  React.useEffect(() => {
    if (!ready) return
    if (activeTool !== "eraser" || calibrateMode) return
    const element = containerRef.current
    if (!element) return

    const styleCfg = csAnnotation.config.style as {
      setAnnotationStyles: (
        uid: string,
        styles: Record<string, string>,
      ) => void
    }
    const RED = "rgb(239, 68, 68)"
    const RED_STYLE = {
      color: RED,
      colorHighlighted: RED,
      colorSelected: RED,
      textBoxColor: RED,
      textBoxColorHighlighted: RED,
      textBoxColorSelected: RED,
    }
    let hoveredUID: string | null = null

    const clearHover = () => {
      if (hoveredUID) {
        try {
          styleCfg.setAnnotationStyles(hoveredUID, {})
        } catch {}
        hoveredUID = null
        engineRef.current?.getViewport(VIEWPORT_ID)?.render()
      }
    }

    const onMove = (e: MouseEvent) => {
      const canvas = element.querySelector("canvas") ?? element
      const rect = canvas.getBoundingClientRect()
      const point: [number, number] = [
        e.clientX - rect.left,
        e.clientY - rect.top,
      ]
      const ann = toolUtilities.getAnnotationNearPoint(element, point, 10) as
        | { annotationUID?: string }
        | null
      const uid = ann?.annotationUID ?? null
      if (uid === hoveredUID) return
      if (hoveredUID) {
        try {
          styleCfg.setAnnotationStyles(hoveredUID, {})
        } catch {}
      }
      hoveredUID = uid
      if (uid) {
        styleCfg.setAnnotationStyles(uid, RED_STYLE)
      }
      engineRef.current?.getViewport(VIEWPORT_ID)?.render()
    }

    element.addEventListener("mousemove", onMove)
    element.addEventListener("mouseleave", clearHover)

    return () => {
      element.removeEventListener("mousemove", onMove)
      element.removeEventListener("mouseleave", clearHover)
      clearHover()
    }
  }, [ready, activeTool, calibrateMode])

  // Escape cancels an in-progress drawing (e.g. half-drawn calibration line).
  React.useEffect(() => {
    if (!ready) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        const element = containerRef.current
        if (!element) return
        isCancellingRef.current = true
        let cancelledUID: string | undefined
        try {
          cancelledUID = cancelActiveManipulations(element) ?? undefined
        } finally {
          isCancellingRef.current = false
        }
        if (cancelledUID) {
          try {
            csAnnotation.state.removeAnnotation(cancelledUID)
          } catch {}
          engineRef.current?.getViewport(VIEWPORT_ID)?.render()
        }
        return
      }
      const isMetaOrCtrl = e.metaKey || e.ctrlKey
      if (!isMetaOrCtrl) return
      const key = e.key.toLowerCase()
      if (key === "z" && !e.shiftKey) {
        e.preventDefault()
        historyMemo.undo()
        engineRef.current?.getViewport(VIEWPORT_ID)?.render()
      } else if ((key === "z" && e.shiftKey) || key === "y") {
        e.preventDefault()
        historyMemo.redo()
        engineRef.current?.getViewport(VIEWPORT_ID)?.render()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready])

  // Persist annotations on modify / add / remove.
  React.useEffect(() => {
    if (!ready) return
    const persist = () => {
      const currentId = imageIdRef.current
      if (!currentId) return
      const manager = csAnnotation.state.getAnnotationManager() as {
        saveAnnotations?: () => unknown
      }
      const snapshot = manager.saveAnnotations?.()
      if (snapshot !== undefined) {
        const hashId = currentId.replace(/^web:/, "")
        saveAnnotations(hashId, snapshot)
      }
    }
    eventTarget.addEventListener(ToolEnums.Events.ANNOTATION_ADDED, persist)
    eventTarget.addEventListener(ToolEnums.Events.ANNOTATION_MODIFIED, persist)
    eventTarget.addEventListener(ToolEnums.Events.ANNOTATION_REMOVED, persist)
    return () => {
      eventTarget.removeEventListener(ToolEnums.Events.ANNOTATION_ADDED, persist)
      eventTarget.removeEventListener(
        ToolEnums.Events.ANNOTATION_MODIFIED,
        persist,
      )
      eventTarget.removeEventListener(
        ToolEnums.Events.ANNOTATION_REMOVED,
        persist,
      )
    }
  }, [ready])

  const applyPrimaryTool = React.useCallback((tool: ActiveTool) => {
    const toolGroup = ToolGroupManager.getToolGroup(TOOL_GROUP_ID)
    if (!toolGroup) return
    const primary = ToolEnums.MouseBindings.Primary
    toolGroup.setToolPassive(TOOL_NAMES.WindowLevel)
    toolGroup.setToolPassive(TOOL_NAMES.Pan)
    toolGroup.setToolPassive(TOOL_NAMES.Length)
    toolGroup.setToolPassive(TOOL_NAMES.Angle)
    toolGroup.setToolPassive(TOOL_NAMES.Ellipse)
    toolGroup.setToolPassive(TOOL_NAMES.Eraser)
    if (tool === "windowLevel") {
      toolGroup.setToolActive(TOOL_NAMES.WindowLevel, {
        bindings: [{ mouseButton: primary }],
      })
    } else if (tool === "pan") {
      toolGroup.setToolActive(TOOL_NAMES.Pan, {
        bindings: [{ mouseButton: primary }],
      })
    } else if (tool === "length") {
      toolGroup.setToolActive(TOOL_NAMES.Length, {
        bindings: [{ mouseButton: primary }],
      })
    } else if (tool === "angle") {
      toolGroup.setToolActive(TOOL_NAMES.Angle, {
        bindings: [{ mouseButton: primary }],
      })
    } else if (tool === "ellipse") {
      toolGroup.setToolActive(TOOL_NAMES.Ellipse, {
        bindings: [{ mouseButton: primary }],
      })
    } else if (tool === "eraser") {
      toolGroup.setToolActive(TOOL_NAMES.Eraser, {
        bindings: [{ mouseButton: primary }],
      })
    }
    toolGroup.setToolActive(TOOL_NAMES.Pan, {
      bindings: [{ mouseButton: ToolEnums.MouseBindings.Auxiliary }],
    })
  }, [])

  const handleSelectTool = (tool: ActiveTool) => {
    setActiveTool(tool)
    setCalibrateMode(false)
    applyPrimaryTool(tool)
  }

  const getViewport = React.useCallback(() => {
    const engine = engineRef.current
    if (!engine) return null
    return engine.getViewport(VIEWPORT_ID) as CoreTypes.IStackViewport | null
  }, [])

  const loadImageIntoViewport = React.useCallback(
    async (file: File, metaOverride?: StoredImageMeta) => {
      setLoading(true)
      try {
        const engine =
          engineRef.current ?? getRenderingEngine(RENDERING_ENGINE_ID)
        if (!engine) return

        // Clean up previous image state.
        if (imageIdRef.current) unregisterWebImageSource(imageIdRef.current)
        if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)

        const hash = metaOverride?.imageId ?? (await hashFile(file))
        const imageId = buildWebImageId(hash)
        const blobUrl = URL.createObjectURL(file)
        registerWebImageSource(imageId, blobUrl)
        imageIdRef.current = imageId
        blobUrlRef.current = blobUrl

        // Apply stored calibration (before stack load) so first render is calibrated.
        const stored = loadCalibration(hash)
        applyCalibration(imageId, stored?.mmPerPixel ?? null)
        setCalibration(stored)

        const viewport = engine.getViewport(VIEWPORT_ID) as CoreTypes.IStackViewport
        engine.resize(true, false)
        await viewport.setStack([imageId], 0)
        viewport.setProperties({
          interpolationType: Enums.InterpolationType.LINEAR,
        })

        // Rehydrate annotations (after stack so the FoR is available).
        const storedAnns = loadAnnotations(hash)
        if (storedAnns && typeof storedAnns === "object") {
          try {
            const manager = csAnnotation.state.getAnnotationManager() as {
              restoreAnnotations?: (s: unknown) => void
            }
            manager.restoreAnnotations?.(storedAnns)
          } catch {
            // ignore
          }
        }

        viewport.render()

        const meta: StoredImageMeta =
          metaOverride ?? {
            imageId: hash,
            name: file.name,
            type: file.type || "image/*",
            createdAt: Date.now(),
          }
        upsertImage(meta)
        setLastImage(hash)
        if (!metaOverride) await saveBlob(hash, file)
        setImageMeta(meta)
        setRecentImages(listImages())

        applyPrimaryTool(activeToolRef.current)
      } finally {
        setLoading(false)
      }
    },
    [applyPrimaryTool],
  )

  const applyCalibration = (imageId: string, mmPerPixel: number | null) => {
    if (mmPerPixel && mmPerPixel > 0) {
      // Do NOT set `scale` — it overrides only the X scale in Cornerstone's
      // length units logic, leaving Y inconsistent. Pixel spacings are enough.
      coreUtilities.calibratedPixelSpacingMetadataProvider.add(imageId, {
        type: Enums.CalibrationTypes.USER,
        rowPixelSpacing: mmPerPixel,
        columnPixelSpacing: mmPerPixel,
      })
    } else {
      coreUtilities.calibratedPixelSpacingMetadataProvider.add(imageId, {
        type: Enums.CalibrationTypes.UNCALIBRATED,
      })
    }
  }

  const ensureProviderRegistered = React.useRef(false)
  React.useEffect(() => {
    if (ensureProviderRegistered.current) return
    ensureProviderRegistered.current = true
    metaData.addProvider(
      coreUtilities.calibratedPixelSpacingMetadataProvider.get.bind(
        coreUtilities.calibratedPixelSpacingMetadataProvider,
      ),
      11000,
    )
  }, [])

  const handleFile = async (file: File) => {
    await loadImageIntoViewport(file)
  }

  const handleRotate90 = () => {
    const viewport = getViewport()
    if (!viewport) return
    const presentation = viewport.getViewPresentation()
    const rotation = (presentation.rotation ?? 0) + 90
    viewport.setViewPresentation({ rotation: rotation % 360 })
    viewport.render()
  }

  const handleFlipH = () => {
    const viewport = getViewport()
    if (!viewport) return
    const camera = viewport.getCamera()
    viewport.setCamera({ flipHorizontal: !camera.flipHorizontal })
    viewport.render()
  }

  const handleFlipV = () => {
    const viewport = getViewport()
    if (!viewport) return
    const camera = viewport.getCamera()
    viewport.setCamera({ flipVertical: !camera.flipVertical })
    viewport.render()
  }

  const handleInvert = () => {
    const viewport = getViewport()
    if (!viewport) return
    const props = viewport.getProperties()
    viewport.setProperties({ invert: !props.invert })
    viewport.render()
  }

  const handleReset = () => {
    const viewport = getViewport()
    if (!viewport) return
    viewport.resetCamera()
    viewport.resetProperties()
    viewport.render()
  }

  const handleStartCalibration = () => {
    setCalibrateMode(true)
    const toolGroup = ToolGroupManager.getToolGroup(TOOL_GROUP_ID)
    if (!toolGroup) return
    toolGroup.setToolPassive(TOOL_NAMES.WindowLevel)
    toolGroup.setToolPassive(TOOL_NAMES.Pan)
    toolGroup.setToolActive(TOOL_NAMES.Length, {
      bindings: [{ mouseButton: ToolEnums.MouseBindings.Primary }],
    })
    setActiveTool("length")
  }

  const handleCalibrationConfirm = (realMm: number) => {
    if (!pending || !imageIdRef.current) {
      setPending(null)
      setCalibrateMode(false)
      return
    }
    if (pending.pixelLength <= 0 || realMm <= 0) {
      setPending(null)
      setCalibrateMode(false)
      return
    }
    const mmPerPixel = realMm / pending.pixelLength
    const engine = engineRef.current
    if (engine) {
      toolUtilities.calibrateImageSpacing(imageIdRef.current, engine, {
        type: Enums.CalibrationTypes.USER,
        rowPixelSpacing: mmPerPixel,
        columnPixelSpacing: mmPerPixel,
      })
    }
    const hashId = imageIdRef.current.replace(/^web:/, "")
    const stored: StoredCalibration = { mmPerPixel, createdAt: Date.now() }
    saveCalibration(hashId, stored)
    setCalibration(stored)
    try {
      csAnnotation.state.removeAnnotation(pending.annotationUID)
    } catch {}
    setPending(null)
    setCalibrateMode(false)
    applyPrimaryTool("length")
  }

  const handleCalibrationCancel = () => {
    if (pending) {
      try {
        csAnnotation.state.removeAnnotation(pending.annotationUID)
      } catch {}
    }
    setPending(null)
    setCalibrateMode(false)
    applyPrimaryTool(activeToolRef.current)
  }

  const handleClearCalibration = () => {
    if (!imageIdRef.current) return
    const hashId = imageIdRef.current.replace(/^web:/, "")
    saveCalibration(hashId, null)
    setCalibration(null)
    const engine = engineRef.current
    if (engine) {
      toolUtilities.calibrateImageSpacing(imageIdRef.current, engine, {
        type: Enums.CalibrationTypes.UNCALIBRATED,
      })
    }
  }

  const historyMemo = (
    coreUtilities as unknown as {
      HistoryMemo: { DefaultHistoryMemo: { undo: () => void; redo: () => void } }
    }
  ).HistoryMemo.DefaultHistoryMemo

  const handleUndo = () => {
    historyMemo.undo()
    getViewport()?.render()
  }

  const handleRedo = () => {
    historyMemo.redo()
    getViewport()?.render()
  }

  const handleClearAllAnnotations = () => {
    const all = csAnnotation.state.getAllAnnotations() as Array<{
      annotationUID?: string
    }>
    for (const ann of all) {
      if (ann.annotationUID) {
        try {
          csAnnotation.state.removeAnnotation(ann.annotationUID)
        } catch {}
      }
    }
    getViewport()?.render()
  }

  const handleToggleAnnotations = () => {
    const next = !annotationsHidden
    setAnnotationsHidden(next)
    const all = csAnnotation.state.getAllAnnotations() as Array<{
      annotationUID?: string
    }>
    for (const ann of all) {
      if (ann.annotationUID) {
        csAnnotation.visibility.setAnnotationVisibility(
          ann.annotationUID,
          !next,
        )
      }
    }
    getViewport()?.render()
  }

  const handleExport = () => {
    const viewport = getViewport()
    const element = containerRef.current
    if (!viewport || !element) return
    const canvas = viewport.getCanvas()
    const name = imageMeta?.name ?? "viewport"
    // SVG overlay is only present when annotations are visible; when hidden
    // (annotationsHidden === true) exporting just the canvas is the desired result.
    void exportViewportWithAnnotations(element, canvas, suggestFilename(name))
  }

  const handleOpenRecent = async (meta: StoredImageMeta) => {
    const blob = await loadBlob(meta.imageId)
    if (blob) await loadImageIntoViewport(blob, meta)
  }

  const handleRemoveRecent = async (imageId: string) => {
    removeImageMeta(imageId)
    clearImageState(imageId)
    const { deleteBlob } = await import("@/lib/viewer/persistence")
    await deleteBlob(imageId)
    setRecentImages(listImages())
    if (imageMeta?.imageId === imageId) {
      setImageMeta(null)
      setCalibration(null)
      setLastImage(null)
      if (imageIdRef.current) unregisterWebImageSource(imageIdRef.current)
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
      imageIdRef.current = null
      blobUrlRef.current = null
    }
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-3 p-4">
      <Toolbar
        disabled={!imageMeta || !ready}
        activeTool={activeTool}
        onSelectTool={handleSelectTool}
        onRotate={handleRotate90}
        onFlipH={handleFlipH}
        onFlipV={handleFlipV}
        onInvert={handleInvert}
        onReset={handleReset}
        onCalibrate={handleStartCalibration}
        onClearCalibration={handleClearCalibration}
        onExport={handleExport}
        onToggleAnnotations={handleToggleAnnotations}
        annotationsHidden={annotationsHidden}
        onClearAnnotations={handleClearAllAnnotations}
        onUndo={handleUndo}
        onRedo={handleRedo}
        calibration={calibration}
        calibrateMode={calibrateMode}
      />

      <div className="relative flex-1 min-h-0">
        <div
          ref={containerRef}
          data-viewport
          className="absolute inset-0 rounded-md border border-border bg-black touch-none select-none"
          onContextMenu={(e) => e.preventDefault()}
        />
        {!imageMeta && (
          <div className="absolute inset-0 rounded-md bg-background p-4 overflow-auto">
            <UploadDropzone
              onFile={handleFile}
              loading={loading}
              recent={recentImages}
              onOpenRecent={handleOpenRecent}
              onRemoveRecent={handleRemoveRecent}
            />
          </div>
        )}
      </div>

      {imageMeta && (
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="truncate">
            {imageMeta.name}
            {calibration ? (
              <>
                {" · "}
                <span className="text-foreground">
                  {calibration.mmPerPixel.toFixed(4)} mm/px
                </span>
              </>
            ) : (
              " · sin calibrar (px)"
            )}
          </span>
          <button
            type="button"
            className="underline hover:text-foreground"
            onClick={() => {
              setImageMeta(null)
              setCalibration(null)
              setLastImage(null)
              if (imageIdRef.current)
                unregisterWebImageSource(imageIdRef.current)
              if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
              imageIdRef.current = null
              blobUrlRef.current = null
            }}
          >
            Cerrar imagen
          </button>
        </div>
      )}

      <CalibrationDialog
        open={!!pending}
        pixelLength={pending?.pixelLength ?? 0}
        onConfirm={handleCalibrationConfirm}
        onCancel={handleCalibrationCancel}
      />
    </div>
  )
}
