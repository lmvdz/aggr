export class CanvasRenderPipelineHook {
  private originalCanvas: HTMLCanvasElement
  private glslCanvas: any
  private updateScheduled: boolean = false
  private originalMethods: Map<string, Function> = new Map()
  private lastFingerprint: string = ''

  constructor(originalCanvas: HTMLCanvasElement, glslCanvas: any) {
    this.originalCanvas = originalCanvas
    this.glslCanvas = glslCanvas
  }

  hookIntoRenderPipeline() {
    const ctx = this.originalCanvas.getContext('2d')
    if (!ctx) return

    // Methods that indicate drawing operations
    const methodsToHook = [
      'drawImage',
      'fillRect',
      'strokeRect',
      'clearRect',
      'fill',
      'stroke',
      'fillText',
      'strokeText',
      'putImageData'
    ]

    methodsToHook.forEach(methodName => {
      const originalMethod = ctx[methodName as keyof CanvasRenderingContext2D]
      if (typeof originalMethod === 'function') {
        this.originalMethods.set(methodName, originalMethod)

        // Override the method
        ;(ctx as any)[methodName] = (...args: any[]) => {
          // Call original method
          const result = originalMethod.apply(ctx, args)

          // Schedule texture update
          this.scheduleTextureUpdate(methodName)

          return result
        }
      }
    })
  }

  tinyCanvasFingerprint(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number
  ): string {
    // sample 9 points on a 3x3 grid
    const pts = [
      [0, 0],
      [w >> 1, 0],
      [w - 1, 0],
      [0, h >> 1],
      [w >> 1, h >> 1],
      [w - 1, h >> 1],
      [0, h - 1],
      [w >> 1, h - 1],
      [w - 1, h - 1]
    ]
    const acc: number[] = []
    for (const [x, y] of pts) {
      const d = ctx.getImageData(x, y, 1, 1).data
      // pack RGBA into a 32-bit-ish number
      acc.push(((d[0] << 24) ^ (d[1] << 16) ^ (d[2] << 8) ^ d[3]) >>> 0)
    }
    // simple string hash
    return acc.join(',')
  }

  private scheduleTextureUpdate(methodName: string) {
    if (!this.updateScheduled) {
      this.updateScheduled = true
      requestAnimationFrame(() => {
        try {
          //   console.log('Updating texture', methodName);
          if (this.glslCanvas?.textures?.['u_canvas']) {
            this.glslCanvas.textures['u_canvas'].update() // upload new pixels
            this.glslCanvas.forceRender = true // ensure a draw this frame
          }

          //   const hasContent = this.originalCanvas.getContext('2d')
          //     ?.getImageData(0, 0, this.originalCanvas.width, this.originalCanvas.height)
          //     .data.some(x => x !== 0)
          //   console.log('Canvas has content:', hasContent)
          //   console.log('animated:', this.glslCanvas.animated, 'forceRender:', this.glslCanvas.forceRender)
        } catch (error) {
          console.warn('Failed to update GLSL texture:', error)
        }
        this.updateScheduled = false
      })
    }
  }

  unhook() {
    const ctx = this.originalCanvas.getContext('2d')
    if (!ctx) return

    // Restore original methods
    this.originalMethods.forEach((originalMethod, methodName) => {
      ;(ctx as any)[methodName] = originalMethod
    })
    this.originalMethods.clear()
  }
}
