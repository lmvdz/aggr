import Chart from "./chart"

export class CanvasLayerAccess {
  constructor(private chart: Chart) {}

  // Background/Grid canvas (where grid lines are drawn)
  getBackgroundCanvas(): HTMLCanvasElement {
    return this.chart.chartElement.querySelector(
      'tr:first-child td:nth-child(2) canvas:nth-child(1)'
    )
  }

  // Main chart canvas (where series data is drawn)
  getMainCanvas(): HTMLCanvasElement {
    return this.chart.chartElement.querySelector(
      'tr:first-child td:nth-child(2) canvas:nth-child(2)'
    )
  }

  // Crosshair canvas (where crosshair lines are drawn)
  getCrosshairCanvas(): HTMLCanvasElement {
    return this.chart.chartElement.querySelector(
      'tr:first-child td:nth-child(2) canvas:nth-child(3)'
    )
  }

  // Left price scale canvas
  getLeftScaleCanvas(): HTMLCanvasElement {
    return this.chart.chartElement.querySelector(
      'tr:first-child td:first-child canvas'
    )
  }

  // Right price scale canvas  
  getRightScaleCanvas(): HTMLCanvasElement {
    return this.chart.chartElement.querySelector(
      'tr:first-child td:last-child canvas'
    )
  }

  // Time scale canvas
  getTimeScaleCanvas(): HTMLCanvasElement {
    return this.chart.chartElement.querySelector(
      'tr:last-child td:nth-child(2) canvas'
    )
  }

  // Get all canvases
  getAllCanvases(): HTMLCanvasElement[] {
    return Array.from(this.chart.chartElement.querySelectorAll('canvas'))
  }
}