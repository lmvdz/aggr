// In src/components/chart/controls.ts or create a new file
import Chart from '../chart'

export class LineDrawingControl {
  private chart: Chart
  private lineSeries: any
  private isDrawingMode: boolean = false
  private drawingState: {
    isDrawing: boolean
    startPoint: { time: number, price: number } | null
  } = {
    isDrawing: false,
    startPoint: null
  }

  constructor(chart: Chart) {
    this.chart = chart
    this.setupLineDrawing()
  }

  private setupLineDrawing() {
    // Create line series for drawing
    this.lineSeries = this.chart.chartInstance.addLineSeries({
      color: '#ff6b6b',
      lineWidth: 2,
      crosshairMarkerVisible: false,
      lastValueVisible: false,
      priceLineVisible: false,
      title: 'Drawing Line'
    })

    // Subscribe to chart events
    this.chart.chartInstance.subscribeClick((param) => {
      if (!this.isDrawingMode || !param.time) return;

      const price = this.chart.getPriceApi()
        .coordinateToPrice(param.point?.y || 0)
      
      this.handleDrawingClick(param.time as number, price)
    })

    this.chart.chartInstance.subscribeCrosshairMove((param) => {
        // console.log("[chart crosshair move line drawing control]")
      if (this.isDrawingMode && this.drawingState.isDrawing && param.time) {
        const price = this.chart.getPriceApi()
          .coordinateToPrice(param.point?.y || 0)
        this.updatePreviewLine(param.time as number, price)
      }
    })
  }

  private handleDrawingClick(time: number, price: number) {
    if (!this.drawingState.isDrawing) {
      // Start drawing
      this.drawingState.startPoint = { time, price }
      this.drawingState.isDrawing = true
      
      // Show start point
      this.lineSeries.setData([{ time, value: price }])
    } else {
      // Finish drawing
      this.finishLine(time, price)
    }
  }

  private updatePreviewLine(endTime: number, endPrice: number) {
    if (!this.drawingState.startPoint) return

    this.lineSeries.setData([
      { time: this.drawingState.startPoint.time, value: this.drawingState.startPoint.price },
      { time: endTime, value: endPrice }
    ])
  }

  private finishLine(endTime: number, endPrice: number) {
    if (!this.drawingState.startPoint) return

    // Create final line
    this.lineSeries.setData([
      { time: this.drawingState.startPoint.time, value: this.drawingState.startPoint.price },
      { time: endTime, value: endPrice }
    ])

    // Reset state
    this.drawingState.isDrawing = false
    this.drawingState.startPoint = null
    this.isDrawingMode = false

    // Emit event or callback
    this.onLineDrawn({
      from: this.drawingState.startPoint,
      to: { time: endTime, price: endPrice }
    })
  }

  public enableDrawingMode() {
    console.log("[enableDrawingMode]")
    this.isDrawingMode = true
    this.drawingState.isDrawing = false
    this.drawingState.startPoint = null
    
    // Change cursor to crosshair
    this.chart.chartElement.style.cursor = 'crosshair'
  }

  public disableDrawingMode() {
    console.log("[disableDrawingMode]")
    this.isDrawingMode = false
    this.drawingState.isDrawing = false
    this.drawingState.startPoint = null
    
    // Reset cursor
    this.chart.chartElement.style.cursor = 'default'
  }

  public clearLines() {
    this.lineSeries.setData([])
  }

  private onLineDrawn(lineData: any) {
    console.log('Line drawn:', lineData)
    // You can emit events or call callbacks here
  }
}