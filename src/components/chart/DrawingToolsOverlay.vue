<template>
  <div class="chart-overlay__panel indicators-overlay">
    <div class="chart-overlay__content">
      <button 
        @click="$props.toggleLineDrawing" 
        :class="{ active: $props.isLineDrawingMode }"
        class="btn btn-line-drawing"
      >
        <i class="icon-edit"></i>
        Draw Line
      </button>
      <button @click="$props.clearLines" class="btn">
        Clear Lines
      </button>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
import Component from 'vue-class-component'

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
