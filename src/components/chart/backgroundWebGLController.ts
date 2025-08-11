import GlslCanvas from 'glslCanvas'
import Chart from './chart'
//@ts-ignore
import baseWarpFragment from '@/assets/glsl/base-warp.glsl'
import { ColorType } from 'lightweight-charts';
import { CanvasRenderPipelineHook } from './canvasRenderPipelineHook';


const COLOR_MAP = {
  alpha: 0,
  autumn: 1,
  bathymetry: 2,
  blackbody: 3,
  bluered: 4,
  bone: 5,
  cdom: 6,
  chlorophyll: 7,
  cool: 8,
  copper: 9,
  cubehelix: 10,
  density: 11,
  earth: 12,
  electric: 13,
  freesurface_blue: 14,
  freesurface_red: 15,
  greens: 16,
  greys: 17,
  hot: 18,
  hsv: 19,
  inferno: 20,
  jet: 21,
  magma: 22,
  oxygen: 23,
  par: 24,
  phase: 25,
  picnic: 26,
  plasma: 27,
  portland: 28,
  rainbow_soft: 29,
  rainbow: 30,
  rdbu: 31,
  salinity: 32,
  spring: 33,
  summer: 34,
  temperature: 35,
  turbidity: 36,
  velocity_blue: 37,
  velocity_green: 38,
  viridis: 39,
  warm: 40,
  winter: 41,
  yignbu: 42,
  yiorrd: 43,
} as const;

export default class BackgroundWebGLController {
  private backgroundCanvas: HTMLCanvasElement
  private glslCanvas: GlslCanvas
  private originalCanvas: HTMLCanvasElement
  private canvasRenderPipelineHook: CanvasRenderPipelineHook

  constructor(chart: Chart) {
    this.findAndReplaceBackgroundCanvas(chart)
  }

  private findAndReplaceBackgroundCanvas(chart: Chart) {
    setTimeout(() => {

      this.originalCanvas = chart.chartElement.querySelector(
        'tr:first-child td:nth-child(2) canvas:nth-child(1)'
      )

      chart.chartInstance.applyOptions({
        layout: {
          background: {
            type: ColorType.Solid,
            color: 'rgba(0, 0, 0, 0)'
          }
        }
      })
      
      if (this.originalCanvas) {
        this.injectWithWebGLCanvas()
        console.log('Background canvas replaced with WebGL:', this.backgroundCanvas)
      }
    }, 100)
  }

  private injectWithWebGLCanvas() {
    // Create new WebGL canvas with same dimensions and position
    this.backgroundCanvas = document.createElement('canvas')


    this.backgroundCanvas.width = this.originalCanvas.width
    this.backgroundCanvas.height = this.originalCanvas.height
    this.backgroundCanvas.style.cssText = this.originalCanvas.style.cssText
    this.backgroundCanvas.className = this.originalCanvas.className

    this.originalCanvas.style.opacity = '0' // Hide original canvas - need it visible for u_canvas texture

    // Replace the original canvas
    // this.originalCanvas.parentElement.insertBefore(this.backgroundCanvas, this.originalCanvas);
    this.originalCanvas.insertAdjacentElement('afterend', this.backgroundCanvas);

    const shader = baseWarpFragment;
    this.backgroundCanvas.setAttribute('data-fragment', shader);

    // Initialize GLSL Canvas
    this.glslCanvas = new GlslCanvas(this.backgroundCanvas);
    

    this.backgroundCanvas.style.width = '100%';
    this.backgroundCanvas.style.height = '100%';
    this.glslCanvas.uniform("1i", "int", "i_colormap", COLOR_MAP['greys']);
    // Remove texture overlay; we're doing pure neon now
    this.glslCanvas.setUniform("u_texture", "tealstreet.png");
    this.glslCanvas.uniformTexture("u_canvas", this.originalCanvas);
    this.glslCanvas.setUniform("b_displace", false);
    this.glslCanvas.setUniform("b_warp", false);

    this.glslCanvas.setUniform("u_maskThreshold", 0.24); // prefer thicker bodies
    this.glslCanvas.setUniform("u_maskSoftness", 0.10);

    this.glslCanvas.animated = true; // ensure time-based uniforms are considered
    this.glslCanvas.play();

    // Drive the next frame and refresh the u_canvas texture every render
    this.glslCanvas.on('render', () => {
      const tex = this.glslCanvas?.textures?.['u_canvas'];
      if (tex && typeof tex.update === 'function') {
        tex.update();              // upload latest pixels from the original 2D canvas
      }
      this.glslCanvas.forceRender = true; // request the next frame
    });
    
    let keepAliveId = 0;
    const keepAlive = () => {
      if (!this.glslCanvas) return;
      this.glslCanvas.forceRender = true;
      keepAliveId = requestAnimationFrame(keepAlive);
    };
    keepAlive();


    const handleMouseMove = (event: MouseEvent) => {
        const rect = this.glslCanvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = rect.height - (event.clientY - rect.top); // Flip Y coordinate
        this.glslCanvas.setUniform("u_mouse", [x, y]);
    };

    this.backgroundCanvas.addEventListener('mousemove', handleMouseMove);

    this.canvasRenderPipelineHook = new CanvasRenderPipelineHook(this.originalCanvas, this.glslCanvas)
    this.canvasRenderPipelineHook.hookIntoRenderPipeline();

  }

  public getGlslCanvas(): GlslCanvas {
    return this.glslCanvas
  }

  public getWebGLCanvas(): HTMLCanvasElement {
    return this.backgroundCanvas
  }

  public resize(width: number, height: number) {
    if (this.backgroundCanvas) {
      this.backgroundCanvas.width = width
      this.backgroundCanvas.height = height
    }
  }
}