import {
  init as coreInit,
  imageLoader,
} from "@cornerstonejs/core"
import {
  init as toolsInit,
  addTool,
  PanTool,
  ZoomTool,
  WindowLevelTool,
  LengthTool,
  StackScrollTool,
} from "@cornerstonejs/tools"

import { WEB_IMAGE_SCHEME, loadWebImage } from "./webImageLoader"
import { registerWebImageMetadataProvider } from "./webImageMetadata"

let initPromise: Promise<void> | null = null

export function initCornerstone(): Promise<void> {
  if (initPromise) return initPromise

  initPromise = (async () => {
    await coreInit()
    await toolsInit()
    imageLoader.registerImageLoader(WEB_IMAGE_SCHEME, loadWebImage)
    registerWebImageMetadataProvider()
    addTool(PanTool)
    addTool(ZoomTool)
    addTool(WindowLevelTool)
    addTool(LengthTool)
    addTool(StackScrollTool)
  })()

  return initPromise
}

export const TOOL_NAMES = {
  Pan: PanTool.toolName,
  Zoom: ZoomTool.toolName,
  WindowLevel: WindowLevelTool.toolName,
  Length: LengthTool.toolName,
  StackScroll: StackScrollTool.toolName,
} as const
