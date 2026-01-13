<template>
  <div ref="root" class="galaxy-container" aria-hidden="true"></div>
</template>

<script setup>
/* eslint-env vue/setup-compiler-macros */
import { onMounted, onBeforeUnmount, ref } from 'vue'

// Props with gentle defaults (low saturation/brightness, not dense)
const props = defineProps({
  focal: { type: Array, default: () => [0.5, 0.5] },
  rotation: { type: Array, default: () => [1.0, 0.0] },
  starSpeed: { type: Number, default: 0.5 },
  density: { type: Number, default: 1.0 },
  hueShift: { type: Number, default: 140 },
  disableAnimation: { type: Boolean, default: false },
  speed: { type: Number, default: 1.0 },
  mouseInteraction: { type: Boolean, default: true },
  glowIntensity: { type: Number, default: 0.3 },
  saturation: { type: Number, default: 0.0 },
  mouseRepulsion: { type: Boolean, default: true },
  repulsionStrength: { type: Number, default: 2 },
  twinkleIntensity: { type: Number, default: 0.3 },
  rotationSpeed: { type: Number, default: 0.1 },
  autoCenterRepulsion: { type: Number, default: 0 },
  transparent: { type: Boolean, default: true },
})

const root = ref(null)
let cleanup = null

onMounted(() => {
  const existing = typeof window !== 'undefined' ? (window.OGL || window.ogl) : null
  if (existing) {
    cleanup = initGalaxy(root.value, existing, props)
    return
  }
  const script = document.createElement('script')
  // Try self-hosted OGL first (served from /public)
  script.src = '/vendor/ogl.umd.js'
  script.async = true
  script.onload = () => {
    const mod = window.OGL || window.ogl
    if (mod) cleanup = initGalaxy(root.value, mod, props)
  }
  script.onerror = (e) => {
    console.error('[GalaxyBackground] Failed to load local OGL UMD, trying CDN unpkg', e)
    const cdn1 = document.createElement('script')
    cdn1.src = 'https://unpkg.com/ogl@0.0.103/dist/ogl.umd.js'
    cdn1.async = true
    cdn1.onload = () => {
      const mod = window.OGL || window.ogl
      if (mod) cleanup = initGalaxy(root.value, mod, props)
    }
    cdn1.onerror = (e1) => {
      console.error('[GalaxyBackground] Failed to load OGL UMD from unpkg', e1)
      const cdn2 = document.createElement('script')
      cdn2.src = 'https://cdn.jsdelivr.net/npm/ogl@0.0.103/dist/ogl.umd.js'
      cdn2.async = true
      cdn2.onload = () => {
        const mod = window.OGL || window.ogl
        if (mod) cleanup = initGalaxy(root.value, mod, props)
      }
      cdn2.onerror = (e2) => {
        console.error('[GalaxyBackground] Failed to load OGL UMD from jsDelivr', e2)
      }
      document.head.appendChild(cdn2)
    }
    document.head.appendChild(cdn1)
  }
  document.head.appendChild(script)
})

onBeforeUnmount(() => {
  if (cleanup) cleanup()
})

function initGalaxy(container, ogl, p, allowFallback = true) {
  if (!container) return () => {}
  const { Renderer, Program, Mesh, Triangle, Vec3 } = ogl

  // Guard OGL Program.use against undefined uniformBlocks on some versions/builds
  if (Program && Program.prototype && !Program.prototype.__guardedUse) {
    const originalUse = Program.prototype.use
    Program.prototype.use = function () {
      if (!this.uniformBlocks) this.uniformBlocks = []
      if (!this.blockUniforms) this.blockUniforms = []
      if (this && this.gl && this.gl.renderer) this.gl.renderer.isWebgl2 = false
      return originalUse.apply(this, arguments)
    }
    Program.prototype.__guardedUse = true
  }

  const vertexShader = `
attribute vec2 uv; attribute vec2 position; varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position,0.,1.); }
`
  const fragmentShader = `
precision highp float; varying vec2 vUv; uniform float uTime; uniform vec3 uResolution; uniform vec2 uFocal; uniform vec2 uRotation; uniform float uStarSpeed; uniform float uDensity; uniform float uHueShift; uniform float uSpeed; uniform vec2 uMouse; uniform float uGlowIntensity; uniform float uSaturation; uniform bool uMouseRepulsion; uniform float uTwinkleIntensity; uniform float uRotationSpeed; uniform float uRepulsionStrength; uniform float uMouseActiveFactor; uniform float uAutoCenterRepulsion; uniform bool uTransparent; #define NUM_LAYER 4.0 #define STAR_COLOR_CUTOFF 0.2 #define MAT45 mat2(0.7071, -0.7071, 0.7071, 0.7071) #define PERIOD 3.0 float Hash21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y);} float tri(float x){ return abs(fract(x)*2.0-1.0);} float tris(float x){ float t=fract(x); return 1.0 - smoothstep(0.0,1.0,abs(2.0*t-1.0));} float trisn(float x){ float t=fract(x); return 2.0*(1.0 - smoothstep(0.0,1.0,abs(2.0*t-1.0))) - 1.0;} vec3 hsv2rgb(vec3 c){ vec4 K=vec4(1.0,2.0/3.0,1.0/3.0,3.0); vec3 p=abs(fract(c.xxx+K.xyz)*6.0 - K.www); return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);} float Star(vec2 uv,float flare){ float d=length(uv); float m=(0.05*uGlowIntensity)/d; float rays=smoothstep(0.0,1.0,1.0-abs(uv.x*uv.y*1000.0)); m+=rays*flare*uGlowIntensity; uv*=MAT45; rays=smoothstep(0.0,1.0,1.0-abs(uv.x*uv.y*1000.0)); m+=rays*0.3*flare*uGlowIntensity; m*=smoothstep(1.0,0.2,d); return m;} vec3 StarLayer(vec2 uv){ vec3 col=vec3(0.0); vec2 gv=fract(uv)-0.5; vec2 id=floor(uv); for(int y=-1;y<=1;y++){ for(int x=-1;x<=1;x++){ vec2 offset=vec2(float(x),float(y)); vec2 si=id+vec2(float(x),float(y)); float seed=Hash21(si); float size=fract(seed*345.32); float glossLocal=tri(uStarSpeed/(PERIOD*seed+1.0)); float flareSize=smoothstep(0.9,1.0,size)*glossLocal; float red=smoothstep(STAR_COLOR_CUTOFF,1.0,Hash21(si+1.0))+STAR_COLOR_CUTOFF; float blu=smoothstep(STAR_COLOR_CUTOFF,1.0,Hash21(si+3.0))+STAR_COLOR_CUTOFF; float grn=min(red,blu)*seed; vec3 base=vec3(red,grn,blu); float hue=atan(base.g-base.r, base.b-base.r)/(2.0*3.14159)+0.5; hue=fract(hue+uHueShift/360.0); float sat=length(base-vec3(dot(base, vec3(0.299,0.587,0.114))))*uSaturation; float val=max(max(base.r,base.g),base.b); base=hsv2rgb(vec3(hue,sat,val)); vec2 pad=vec2(tris(seed*34.0+uTime*uSpeed/10.0), tris(seed*38.0+uTime*uSpeed/30.0)) - 0.5; float star=Star(gv - offset - pad, flareSize); vec3 color=base; float twinkle=trisn(uTime*uSpeed+seed*6.2831)*0.5+1.0; twinkle=mix(1.0, twinkle, uTwinkleIntensity); star*=twinkle; col+=star*size*color; } } return col;} void main(){ vec2 focalPx=uFocal*uResolution.xy; vec2 uv=(vUv*uResolution.xy - focalPx)/uResolution.y; vec2 mouseNorm=uMouse - vec2(0.5); if(uAutoCenterRepulsion>0.0){ vec2 centerUV=vec2(0.0,0.0); float centerDist=length(uv-centerUV); vec2 repulsion=normalize(uv-centerUV)*(uAutoCenterRepulsion/(centerDist+0.1)); uv+=repulsion*0.05; } else if(uMouseRepulsion){ vec2 mousePosUV=(uMouse*uResolution.xy - focalPx)/uResolution.y; float mouseDist=length(uv-mousePosUV); vec2 repulsion=normalize(uv-mousePosUV)*(uRepulsionStrength/(mouseDist+0.1)); uv+=repulsion*0.05*uMouseActiveFactor; } else { vec2 mouseOffset=mouseNorm*0.1*uMouseActiveFactor; uv+=mouseOffset; } float autoRotAngle=uTime*uRotationSpeed; mat2 autoRot=mat2(cos(autoRotAngle),-sin(autoRotAngle),sin(autoRotAngle),cos(autoRotAngle)); uv=autoRot*uv; uv=mat2(uRotation.x, -uRotation.y, uRotation.y, uRotation.x)*uv; vec3 col=vec3(0.0); for(float i=0.0; i<1.0; i += 1.0/NUM_LAYER){ float depth=fract(i + uStarSpeed*uSpeed); float scale=mix(20.0*uDensity, 0.5*uDensity, depth); float fade=depth * smoothstep(1.0,0.9,depth); col += StarLayer(uv*scale + i*453.32) * fade; } if(uTransparent){ float alpha=length(col); alpha=smoothstep(0.0,0.3,alpha); alpha=min(alpha,1.0); gl_FragColor=vec4(col,alpha); } else { gl_FragColor=vec4(col,1.0);} }
`

  // High quality rendering with DPR awareness (capped for perf)
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
  const renderer = new Renderer({ alpha: p.transparent, premultipliedAlpha: false, dpr })
  const gl = renderer.gl
  // Force WebGL1 codepath to avoid uniformBlocks usage in Program.use on some OGL versions
  renderer.isWebgl2 = false
  if (gl && gl.renderer) gl.renderer.isWebgl2 = false
  if (p.transparent) {
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.clearColor(0,0,0,0)
  } else { gl.clearColor(0.02,0.01,0.05,1) }

  // Append canvas early so we see something even if Program build fails
  container.appendChild(gl.canvas)
  gl.canvas.style.width = '100%'
  gl.canvas.style.height = '100%'

  let program
  // Animate handle must be declared before any fallback that cancels it
  let animateId
  // Fallback loader to older OGL UMD if a render error persists
  let fallbackTried = false
  function tryFallback() {
    if (fallbackTried) return
    if (window && window.__OGL_GALAXY_FALLBACK_USED__) return
    fallbackTried = true
    try { if (typeof cleanup === 'function') cleanup() } catch (_) { void 0 }
    if (window) window.__OGL_GALAXY_FALLBACK_USED__ = true
    try { cancelAnimationFrame(animateId) } catch (_) { void 0 }
    try { container.removeChild(gl.canvas) } catch (_) { void 0 }
    try { gl.getExtension('WEBGL_lose_context')?.loseContext() } catch (_) { void 0 }
    const ver = '0.0.42'
    // Prefer local fallback if available
    const localId = `ogl-umd-${ver}-local`
    if (!document.getElementById(localId)) {
      const sLocal = document.createElement('script')
      sLocal.id = localId
      sLocal.src = `/vendor/ogl-${ver}.umd.js`
      sLocal.async = true
      sLocal.onload = () => {
        const mod = window.OGL || window.ogl
        if (mod) { cleanup = initGalaxy(container, mod, p, false); return }
      }
      sLocal.onerror = () => {
        const id = `ogl-umd-${ver}`
        if (!document.getElementById(id)) {
          const s = document.createElement('script')
          s.id = id
          s.src = `https://unpkg.com/ogl@${ver}/dist/ogl.umd.js`
          s.async = true
          s.onload = () => {
            const mod = window.OGL || window.ogl
            if (mod) cleanup = initGalaxy(container, mod, p, false)
          }
          s.onerror = () => {
            const jd = document.createElement('script')
            jd.id = `${id}-jsdelivr`
            jd.src = `https://cdn.jsdelivr.net/npm/ogl@${ver}/dist/ogl.umd.js`
            jd.async = true
            jd.onload = () => {
              const mod = window.OGL || window.ogl
              if (mod) cleanup = initGalaxy(container, mod, p, false)
            }
            jd.onerror = (e2) => console.error('[GalaxyBackground] fallback load failed (all sources)', e2)
            document.head.appendChild(jd)
          }
          document.head.appendChild(s)
        }
      }
      document.head.appendChild(sLocal)
    } else {
      const mod = window.OGL || window.ogl
      if (mod) cleanup = initGalaxy(container, mod, p, false)
    }
  }
  // Respect reduced motion if requested by the user OS
  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const resize = () => {
    const w = window.innerWidth
    const h = window.innerHeight
    renderer.setSize(w, h)
    if (program) {
      program.uniforms.uResolution.value = new Vec3(
        gl.canvas.width,
        gl.canvas.height,
        gl.canvas.width / gl.canvas.height
      )
    }
  }
  window.addEventListener('resize', resize)
  resize()

  let geometry
  try {
    geometry = new Triangle(gl)
    program = new Program(gl, {
      vertex: vertexShader,
      fragment: fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: new Vec3(gl.canvas.width, gl.canvas.height, gl.canvas.width / gl.canvas.height) },
        uFocal: { value: new Float32Array(p.focal) },
        uRotation: { value: new Float32Array(p.rotation) },
        uStarSpeed: { value: p.starSpeed },
        uDensity: { value: p.density },
        uHueShift: { value: p.hueShift },
        uSpeed: { value: p.speed },
        uMouse: { value: new Float32Array([0.5, 0.5]) },
        uGlowIntensity: { value: p.glowIntensity },
        uSaturation: { value: Math.min(0.4, Math.max(0.0, p.saturation)) },
        uMouseRepulsion: { value: p.mouseRepulsion },
        uTwinkleIntensity: { value: p.twinkleIntensity },
        uRotationSpeed: { value: p.rotationSpeed },
        uRepulsionStrength: { value: p.repulsionStrength },
        uMouseActiveFactor: { value: 0.0 },
        uAutoCenterRepulsion: { value: p.autoCenterRepulsion },
        uTransparent: { value: p.transparent },
      }
    })
  } catch (buildErr) {
    console.error('[GalaxyBackground] Program build failed, switching fallback', buildErr)
    try { window.removeEventListener('resize', resize) } catch (_) { void 0 }
    if (allowFallback) tryFallback()
    return () => {}
  }
  const mesh = new Mesh(gl, { geometry, program })
  // Some OGL versions may expect uniform block arrays even on WebGL1; guard them.
  if (!program.uniformBlocks) program.uniformBlocks = []
  if (!program.blockUniforms) program.blockUniforms = []
  if (program && program.gl && program.gl.renderer) program.gl.renderer.isWebgl2 = false
  // Instance-level guard in case Program.use is assigned per instance (class field)
  if (program && typeof program.use === 'function' && !program.__guardedUse) {
    const instOrigUse = program.use
    program.use = function () {
      if (!this.uniformBlocks) this.uniformBlocks = []
      if (!this.blockUniforms) this.blockUniforms = []
      if (this && this.gl && this.gl.renderer) this.gl.renderer.isWebgl2 = false
      return instOrigUse.apply(this, arguments)
    }
    program.__guardedUse = true
  }

  // Canvas already appended above

  // Draw one frame immediately so it's visible before RAF kicks in
  try {
    renderer.render({ scene: mesh })
  } catch (err) {
    console.warn('[GalaxyBackground] initial render retry with guards', err)
    try {
      if (!program.uniformBlocks) program.uniformBlocks = []
      if (!program.blockUniforms) program.blockUniforms = []
      if (renderer && renderer.gl && renderer.gl.renderer) renderer.gl.renderer.isWebgl2 = false
      renderer.render({ scene: mesh })
    } catch (e) {
      console.error('[GalaxyBackground] render failed, switching fallback', e)
      if (allowFallback) tryFallback()
      return
    }
  }

  const targetMouse = { x: 0.5, y: 0.5 }
  const smoothMouse = { x: 0.5, y: 0.5 }
  const targetActive = { v: 0.0 }
  const smoothActive = { v: 0.0 }
  // FPS guard variables
  let lastT = 0
  let fpsEma = 60
  let qualityScale = 1.0
  let lowFpsStreak = 0


  function update(t) {
    animateId = requestAnimationFrame(update)
    if (!(p.disableAnimation || prefersReduced)) {
      program.uniforms.uTime.value = t * 0.001
      program.uniforms.uStarSpeed.value = (t * 0.001 * p.starSpeed * qualityScale) / 10.0
    }
    // FPS estimation and quality adaptation
    if (lastT) {
      const dt = (t - lastT) / 1000
      if (dt > 0) {
        const inst = 1 / dt
        const alpha = 0.1
        fpsEma = fpsEma * (1 - alpha) + inst * alpha
        if (fpsEma < 28) {
          lowFpsStreak++
          if (lowFpsStreak > 60 && qualityScale > 0.7) {
            qualityScale = Math.max(0.7, qualityScale * 0.88)
            lowFpsStreak = 0
          }
        } else {
          lowFpsStreak = 0
        }
      }
    }
    lastT = t
    const lerp=0.05
    smoothMouse.x += (targetMouse.x - smoothMouse.x) * lerp
    smoothMouse.y += (targetMouse.y - smoothMouse.y) * lerp
    smoothActive.v += (targetActive.v - smoothActive.v) * lerp
    program.uniforms.uMouse.value[0] = smoothMouse.x
    program.uniforms.uMouse.value[1] = smoothMouse.y
    program.uniforms.uMouseActiveFactor.value = smoothActive.v
    // Apply quality scaling to key visual parameters
    program.uniforms.uDensity.value = p.density * qualityScale
    program.uniforms.uGlowIntensity.value = p.glowIntensity * qualityScale
    program.uniforms.uTwinkleIntensity.value = p.twinkleIntensity * qualityScale
    try {
      renderer.render({ scene: mesh })
    } catch (err) {
      console.error('[GalaxyBackground] render error, switching fallback', err)
      if (allowFallback) tryFallback(); else { try { cancelAnimationFrame(animateId) } catch (_) { void 0 } }
      return
    }
  }
  animateId = requestAnimationFrame(update)
  function onVisibility() {
    if (document.hidden) {
      try { cancelAnimationFrame(animateId) } catch (_) { void 0 }
    } else {
      animateId = requestAnimationFrame(update)
    }
  }
  document.addEventListener('visibilitychange', onVisibility)
  console.log('[GalaxyBackground] mounted', {
    dpr: window.devicePixelRatio, size: { w: gl.canvas.width, h: gl.canvas.height }
  })

  function onMove(e){
    const rect = container.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = 1 - (e.clientY - rect.top) / rect.height
    targetMouse.x = x; targetMouse.y = y; targetActive.v = 1.0
  }
  function onLeave(){ targetActive.v = 0.0 }
  if (p.mouseInteraction) {
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseout', onLeave)
  }

  return () => {
    cancelAnimationFrame(animateId)
    window.removeEventListener('resize', resize)
    document.removeEventListener('visibilitychange', onVisibility)
    if (p.mouseInteraction) {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseout', onLeave)
    }
    try { container.removeChild(gl.canvas) } catch (e) { /* ignore */ }
    gl.getExtension('WEBGL_lose_context')?.loseContext()
  }
}
</script>

<style scoped>
.galaxy-container {
  position: fixed;
  inset: 0;
  z-index: 0; /* behind content */
  pointer-events: none;
  background-color: transparent; /* transparent to let StarsBackground show when Galaxy not loaded */
}
</style>
