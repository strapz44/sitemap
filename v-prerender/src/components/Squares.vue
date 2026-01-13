<template>
  <canvas ref="canvasRef" class="squares-canvas"></canvas>
</template>

<script>
export default {
  name: 'UiSquaresBackground'
}
</script>

<script setup>
/* eslint-env vue/setup-compiler-macros */
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'

const props = defineProps({
  direction: { type: String, default: 'up' }, // up, down, left, right, diagonal
  speed: { type: Number, default: 0.5 },
  borderColor: { type: String, default: '#999' },
  squareSize: { type: Number, default: 40 },
  hoverFillColor: { type: String, default: '#222' },
})

const canvasRef = ref(null)
let rafId = 0
const gridOffset = { x: 0, y: 0 }
let hoveredSquare = null

const resizeCanvas = () => {
  const canvas = canvasRef.value
  if (!canvas) return
  // Fill viewport
  canvas.width = canvas.clientWidth
  canvas.height = canvas.clientHeight
  // counts kept implicit; no need to store for drawing loop
}

const drawGrid = () => {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  const { squareSize, borderColor, hoverFillColor } = props
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  const startX = Math.floor(gridOffset.x / squareSize) * squareSize
  const startY = Math.floor(gridOffset.y / squareSize) * squareSize

  for (let x = startX; x < canvas.width + squareSize; x += squareSize) {
    for (let y = startY; y < canvas.height + squareSize; y += squareSize) {
      const squareX = x - (gridOffset.x % squareSize)
      const squareY = y - (gridOffset.y % squareSize)

      if (
        hoveredSquare &&
        Math.floor((x - startX) / squareSize) === hoveredSquare.x &&
        Math.floor((y - startY) / squareSize) === hoveredSquare.y
      ) {
        ctx.fillStyle = hoverFillColor
        ctx.fillRect(squareX, squareY, squareSize, squareSize)
      }

      ctx.strokeStyle = borderColor
      ctx.lineWidth = 2
      ctx.strokeRect(squareX, squareY, squareSize, squareSize)
    }
  }

  // Subtle vignette
  const gradient = ctx.createRadialGradient(
    canvas.width / 2,
    canvas.height / 2,
    0,
    canvas.width / 2,
    canvas.height / 2,
    Math.hypot(canvas.width, canvas.height) / 2
  )
  gradient.addColorStop(0, 'rgba(0,0,0,0)')
  gradient.addColorStop(1, 'rgba(0,0,0,0.0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, canvas.width, canvas.height)
}

const step = () => {
  const effectiveSpeed = Math.max(props.speed, 0.05)
  const s = props.squareSize
  switch (props.direction) {
    case 'right':
      gridOffset.x = (gridOffset.x - effectiveSpeed + s) % s
      break
    case 'left':
      gridOffset.x = (gridOffset.x + effectiveSpeed + s) % s
      break
    case 'down':
      gridOffset.y = (gridOffset.y - effectiveSpeed + s) % s
      break
    case 'diagonal':
      gridOffset.x = (gridOffset.x - effectiveSpeed + s) % s
      gridOffset.y = (gridOffset.y + effectiveSpeed + s) % s
      break
    case 'up':
    default:
      gridOffset.y = (gridOffset.y + effectiveSpeed + s) % s
      break
  }
  drawGrid()
  rafId = requestAnimationFrame(step)
}

const onMouseMove = (e) => {
  const canvas = canvasRef.value
  if (!canvas) return
  const rect = canvas.getBoundingClientRect()
  const mouseX = e.clientX - rect.left
  const mouseY = e.clientY - rect.top
  const startX = Math.floor(gridOffset.x / props.squareSize) * props.squareSize
  const startY = Math.floor(gridOffset.y / props.squareSize) * props.squareSize
  const hoveredSquareX = Math.floor((mouseX + gridOffset.x - startX) / props.squareSize)
  const hoveredSquareY = Math.floor((mouseY + gridOffset.y - startY) / props.squareSize)
  if (!hoveredSquare || hoveredSquare.x !== hoveredSquareX || hoveredSquare.y !== hoveredSquareY) {
    hoveredSquare = { x: hoveredSquareX, y: hoveredSquareY }
  }
}

const onMouseLeave = () => { hoveredSquare = null }

onMounted(() => {
  const canvas = canvasRef.value
  if (!canvas) return
  // Make canvas span viewport
  canvas.style.position = 'fixed'
  canvas.style.inset = '0'
  canvas.style.zIndex = '0'
  canvas.style.pointerEvents = 'none'

  const handleResize = () => { resizeCanvas(); drawGrid() }
  window.addEventListener('resize', handleResize)
  canvas.addEventListener('mousemove', onMouseMove)
  canvas.addEventListener('mouseleave', onMouseLeave)

  handleResize()
  rafId = requestAnimationFrame(step)

  // Cleanup
  onBeforeUnmount(() => {
    cancelAnimationFrame(rafId)
    window.removeEventListener('resize', handleResize)
    canvas.removeEventListener('mousemove', onMouseMove)
    canvas.removeEventListener('mouseleave', onMouseLeave)
  })
})

// Redraw if key props change
watch(() => [props.direction, props.speed, props.borderColor, props.squareSize, props.hoverFillColor], () => {
  resizeCanvas(); drawGrid()
})
</script>

<style scoped>
.squares-canvas {
  width: 100vw;
  height: 100vh;
  display: block;
}
</style>
