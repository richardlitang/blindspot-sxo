// Full-page screenshot capture logic
// Captures the entire page by scrolling and stitching viewports

export interface CaptureResult {
  screenshot: string // base64 data URL
  width: number
  height: number
}

export interface CaptureError {
  error: string
}

// Simple viewport capture (fast, good for MVP)
export async function captureViewport(windowId: number): Promise<CaptureResult | CaptureError> {
  try {
    const dataUrl = await chrome.tabs.captureVisibleTab(windowId, {
      format: 'jpeg',
      quality: 85,
    })

    return {
      screenshot: dataUrl,
      width: 0, // Will be determined by the image
      height: 0,
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Screenshot failed' }
  }
}

// Full-page capture by scrolling (more comprehensive)
export async function captureFullPage(tabId: number, windowId: number): Promise<CaptureResult | CaptureError> {
  try {
    // Get page dimensions
    const [dimensionResult] = await chrome.scripting.executeScript({
      target: { tabId },
      func: getPageDimensions,
    })

    const dimensions = dimensionResult?.result
    if (!dimensions) {
      return { error: 'Could not get page dimensions' }
    }

    const { scrollHeight, viewportHeight, viewportWidth } = dimensions

    // If page fits in viewport, just capture once
    if (scrollHeight <= viewportHeight * 1.2) {
      return captureViewport(windowId)
    }

    // For tall pages, capture multiple viewports and stitch
    const screenshots: string[] = []
    const scrollStep = Math.floor(viewportHeight * 0.9) // 90% to handle overlap
    let currentScroll = 0

    // Scroll to top first
    await chrome.scripting.executeScript({
      target: { tabId },
      func: () => window.scrollTo(0, 0),
    })
    await sleep(100)

    while (currentScroll < scrollHeight) {
      // Capture current viewport
      const dataUrl = await chrome.tabs.captureVisibleTab(windowId, {
        format: 'jpeg',
        quality: 85,
      })
      screenshots.push(dataUrl)

      // Scroll down
      currentScroll += scrollStep
      if (currentScroll < scrollHeight) {
        await chrome.scripting.executeScript({
          target: { tabId },
          func: (scroll) => window.scrollTo(0, scroll),
          args: [currentScroll],
        })
        await sleep(150) // Wait for render
      }
    }

    // Scroll back to top
    await chrome.scripting.executeScript({
      target: { tabId },
      func: () => window.scrollTo(0, 0),
    })

    // For now, if we have multiple screenshots, we'll use canvas stitching
    // This happens in the background script context
    if (screenshots.length === 1) {
      return {
        screenshot: screenshots[0],
        width: viewportWidth,
        height: viewportHeight,
      }
    }

    // Stitch screenshots together using OffscreenCanvas
    const stitched = await stitchScreenshots(screenshots, viewportWidth, viewportHeight, scrollHeight)

    return {
      screenshot: stitched,
      width: viewportWidth,
      height: scrollHeight,
    }
  } catch (error) {
    console.error('Full page capture error:', error)
    // Fallback to simple viewport capture
    return captureViewport(windowId)
  }
}

function getPageDimensions() {
  return {
    scrollHeight: Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight
    ),
    viewportHeight: window.innerHeight,
    viewportWidth: window.innerWidth,
    devicePixelRatio: window.devicePixelRatio || 1,
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function stitchScreenshots(
  screenshots: string[],
  viewportWidth: number,
  viewportHeight: number,
  totalHeight: number
): Promise<string> {
  // Create offscreen canvas for stitching
  // Note: OffscreenCanvas is available in service workers
  const canvas = new OffscreenCanvas(viewportWidth, totalHeight)
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('Could not get canvas context')
  }

  const scrollStep = Math.floor(viewportHeight * 0.9)

  for (let i = 0; i < screenshots.length; i++) {
    const img = await loadImage(screenshots[i])
    const y = i * scrollStep

    // For the last image, we might need to adjust to not go over
    const drawHeight = Math.min(viewportHeight, totalHeight - y)
    ctx.drawImage(img, 0, 0, viewportWidth, drawHeight, 0, y, viewportWidth, drawHeight)
  }

  // Convert to blob then to data URL
  const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.85 })
  return blobToDataUrl(blob)
}

async function loadImage(dataUrl: string): Promise<ImageBitmap> {
  const response = await fetch(dataUrl)
  const blob = await response.blob()
  return createImageBitmap(blob)
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

// Optimize image if it's too large for the API
export async function optimizeScreenshot(
  dataUrl: string,
  maxSizeBytes: number = 4 * 1024 * 1024 // 4MB default
): Promise<string> {
  // Check current size (rough estimate from base64)
  const base64Length = dataUrl.split(',')[1]?.length || 0
  const estimatedBytes = (base64Length * 3) / 4

  if (estimatedBytes <= maxSizeBytes) {
    return dataUrl // Already small enough
  }

  // Need to resize
  const response = await fetch(dataUrl)
  const blob = await response.blob()
  const img = await createImageBitmap(blob)

  // Calculate scale factor to get under max size
  // This is approximate - we may need multiple attempts
  const scaleFactor = Math.sqrt(maxSizeBytes / estimatedBytes) * 0.9

  const newWidth = Math.floor(img.width * scaleFactor)
  const newHeight = Math.floor(img.height * scaleFactor)

  const canvas = new OffscreenCanvas(newWidth, newHeight)
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    return dataUrl // Fallback to original
  }

  ctx.drawImage(img, 0, 0, newWidth, newHeight)

  const optimizedBlob = await canvas.convertToBlob({
    type: 'image/jpeg',
    quality: 0.8,
  })

  return blobToDataUrl(optimizedBlob)
}
