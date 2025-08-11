<template>
  <div class="chart-overlay__panel indicators-overlay">
    <div class="chart-overlay__content">
      <button 
        @click="toggleLineDrawing" 
        :class="{ active: isLineDrawingMode }"
        class="btn btn-line-drawing"
      >
        <i class="icon-edit"></i>
        Draw Line
      </button>
      <button @click="clearLines" class="btn">
        Clear Lines
      </button>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
import { PropType } from 'vue';
import Chart from './chart'
import Component from 'vue-class-component'

import { ChartPaneState } from '../../store/panesSettings/chart'

@Component({
  name: 'DrawingToolsOverlay',
  components: {
  },
  props: {
    toggleLineDrawing: {
      type: Function,
      required: true
    },
    isLineDrawingMode: {
      type: Boolean,
      required: true
    },
    clearLines: {
      type: Function,
      required: true
    }
  }
})
export default class DrawingToolsOverlay extends Vue {
  private paneId: string
}
</script>
