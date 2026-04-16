import { metaData } from "@cornerstonejs/core"

import { isWebImageId } from "./webImageLoader"

type MetadataResult = Record<string, unknown> | undefined

function webImageMetadataProvider(type: string, imageId: unknown): MetadataResult {
  if (!isWebImageId(imageId)) return undefined

  switch (type) {
    case "imagePixelModule":
      return {
        bitsAllocated: 8,
        bitsStored: 8,
        samplesPerPixel: 3,
        highBit: 7,
        photometricInterpretation: "RGB",
        pixelRepresentation: 0,
        planarConfiguration: 0,
        windowWidth: 256,
        windowCenter: 128,
      }
    case "generalSeriesModule":
      return { modality: "OT" }
    case "voiLutModule":
      return { windowWidth: [256], windowCenter: [128] }
    case "modalityLutModule":
      return { rescaleSlope: 1, rescaleIntercept: 0 }
    case "imagePlaneModule":
      return {
        columnPixelSpacing: 1,
        rowPixelSpacing: 1,
        imageOrientationPatient: [1, 0, 0, 0, 1, 0],
        imagePositionPatient: [0, 0, 0],
        rowCosines: [1, 0, 0],
        columnCosines: [0, 1, 0],
      }
    default:
      return undefined
  }
}

let registered = false

export function registerWebImageMetadataProvider(): void {
  if (registered) return
  registered = true
  metaData.addProvider(webImageMetadataProvider, 10000)
}
