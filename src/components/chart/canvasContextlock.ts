import Chart from "./chart"

export class CanvasContextLock {
  private backgroundCanvas: HTMLCanvasElement
  private backgroundCtx: CanvasRenderingContext2D
  private isLocked: boolean = false
  private originalMethods: any = {}
  private pendingOperations: Array<() => void> = []

  constructor(chart: Chart) {
    this.backgroundCanvas = chart.canvasLayerAccess.getBackgroundCanvas()
    this.backgroundCtx = this.backgroundCanvas.getContext('2d')!
    this.setupContextLock()
  }

  private setupContextLock() {
    // Store original context methods
    this.originalMethods = {
      clearRect: this.backgroundCtx.clearRect.bind(this.backgroundCtx),
      fillRect: this.backgroundCtx.fillRect.bind(this.backgroundCtx),
      stroke: this.backgroundCtx.stroke.bind(this.backgroundCtx),
      fill: this.backgroundCtx.fill.bind(this.backgroundCtx),
      drawImage: this.backgroundCtx.drawImage.bind(this.backgroundCtx)
    }

    // Override context methods to respect lock
    this.backgroundCtx.clearRect = (...args) => {
      if (this.isLocked) {
        this.pendingOperations.push(() => this.originalMethods.clearRect(...args))
        return
      }
      this.originalMethods.clearRect(...args)
    }

    this.backgroundCtx.fillRect = (...args) => {
      if (this.isLocked) {
        this.pendingOperations.push(() => this.originalMethods.fillRect(...args))
        return
      }
      this.originalMethods.fillRect(...args)
    }

    this.backgroundCtx.stroke = (...args) => {
      if (this.isLocked) {
        this.pendingOperations.push(() => this.originalMethods.stroke(...args))
        return
      }
      this.originalMethods.stroke(...args)
    }

    this.backgroundCtx.fill = (...args) => {
      if (this.isLocked) {
        this.pendingOperations.push(() => this.originalMethods.fill(...args))
        return
      }
      this.originalMethods.fill(...args)
    }
  }

  public lock() {
    this.isLocked = true
  }

  public unlock() {
    this.isLocked = false
    
    // Execute any pending operations
    this.pendingOperations.forEach(op => op())
    this.pendingOperations = []
  }

  public async drawWithLock(drawFunction: (ctx: CanvasRenderingContext2D) => void | Promise<void>) {
    this.lock()
    
    try {
      await drawFunction(this.backgroundCtx)
    } finally {
      this.unlock()
    }
  }
}