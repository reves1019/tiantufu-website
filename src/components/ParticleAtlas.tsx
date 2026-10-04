import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { follow, particleSeed, smoothMorph, type ParticlePlate } from '../lib/particleAtlas'
import { isMotionReduced, MOTION_PREFERENCE_EVENT } from '../lib/motionPreference'

export interface AtlasPlate { id: string; src: string; label: string; emblem?: boolean }
interface Props { plates: AtlasPlate[]; selected: number; intensity?: number }
interface Updates { select: (plate: AtlasPlate) => void; focus: (amount: number) => void }
declare global { interface Window { __ttfParticleAtlas?: () => unknown } }

const vertex = /* glsl */`
  attribute vec3 aFrom; attribute vec3 aTo;
  attribute vec3 aColorFrom; attribute vec3 aColorTo;
  attribute float aAlphaFrom; attribute float aAlphaTo; attribute vec3 aSeed;
  uniform float uProgress; uniform float uTime; uniform float uDpr;
  uniform vec3 uPointer; uniform float uFocus; uniform float uMotion;
  varying vec3 vColor; varying float vAlpha;
  void main() {
    float t = uProgress * uProgress * (3.0 - 2.0 * uProgress);
    vec3 p = mix(aFrom, aTo, t);
    float journey = sin(t * 3.14159265) * uMotion;
    p += (aSeed - 0.5) * vec3(1.25, 1.0, 3.0) * journey;
    p.z += sin(uTime * 0.45 + p.x * 1.1 + p.y * 0.7) * 0.035 * uMotion;
    vec2 delta = p.xy - uPointer.xy;
    float d = length(delta);
    float touch = (1.0 - smoothstep(0.0, 0.82, d)) * uPointer.z * uMotion;
    p.xy += (delta / max(d, 0.035)) * touch * 0.43;
    p.z += touch * (0.28 + uFocus * 0.16);
    vColor = mix(aColorFrom, aColorTo, t);
    vColor = mix(vColor, vec3(0.95, 0.59, 0.38), touch * 0.3);
    vAlpha = mix(aAlphaFrom, aAlphaTo, t);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = clamp((23.0 + aSeed.x * 5.0) / -mv.z, 1.0, 4.5) * uDpr;
  }
`
const fragment = /* glsl */`
  varying vec3 vColor; varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5 || vAlpha < 0.015) discard;
    float edge = 1.0 - smoothstep(0.30, 0.5, d);
    gl_FragColor = vec4(vColor, vAlpha * edge);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

/** Image → sampled particles → GPU morph. No CPU particle update or React render in the frame loop. */
export default function ParticleAtlas({ plates, selected, intensity = 0 }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const updates = useRef<Updates | null>(null)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const plate = plates[selected] ?? plates[0]
  const initial = useRef(plate)

  useEffect(() => {
    const host = hostRef.current
    if (!host || !initial.current) return
    const compact = matchMedia('(max-width: 767px)').matches
    const columns = compact ? 128 : 192, rows = compact ? 96 : 144
    const count = columns * rows
    const preference = matchMedia('(prefers-reduced-motion: reduce)')
    let reduced = isMotionReduced(), disposed = false, lost = false, frame = 0, last = 0, time = 0
    let visible = false, active = document.documentElement.dataset.page === 'earth'
    let ticket = 0, currentId = '', morph = 1, targetX = 0, targetY = 0, pointerX = 0, pointerY = 0
    let aiming = 0, aimed = 0, frameCount = 0, lastFrameMs = 0, held: number | null = null
    const pending = new Set<HTMLImageElement>()
    const cache = new Map<string, Promise<ParticlePlate>>()
    const canvas = document.createElement('canvas')
    let renderer: THREE.WebGLRenderer
    try { renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'low-power' }) }
    catch { setFailed(true); return }
    renderer.setClearColor(0x000000, 0)
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, compact ? 1.25 : 1.75))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    canvas.setAttribute('aria-hidden', 'true')
    canvas.dataset.particleAtlas = 'true'
    host.appendChild(canvas)
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(38, 1, .1, 50)
    camera.position.set(0, 0, 10.4)
    const geometry = new THREE.BufferGeometry()
    const makeAttribute = (name: string, size: number) => {
      const attr = new THREE.BufferAttribute(new Float32Array(count * size), size)
      attr.setUsage(THREE.DynamicDrawUsage)
      geometry.setAttribute(name, attr)
      return attr
    }
    const from = makeAttribute('aFrom', 3), to = makeAttribute('aTo', 3)
    const colorFrom = makeAttribute('aColorFrom', 3), colorTo = makeAttribute('aColorTo', 3)
    const alphaFrom = makeAttribute('aAlphaFrom', 1), alphaTo = makeAttribute('aAlphaTo', 1)
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3))
    const seeds = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) for (let c = 0; c < 3; c++) seeds[i * 3 + c] = particleSeed(i, c)
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 3))
    const uniforms = { uProgress: { value: 1 }, uTime: { value: 0 }, uDpr: { value: renderer.getPixelRatio() },
      uPointer: { value: new THREE.Vector3() }, uFocus: { value: 0 }, uMotion: { value: reduced ? 0 : 1 } }
    const material = new THREE.ShaderMaterial({ vertexShader: vertex, fragmentShader: fragment, uniforms,
      transparent: true, depthWrite: false, depthTest: false })
    const particles = new THREE.Points(geometry, material)
    particles.frustumCulled = false
    scene.add(particles)

    const loadPlate = (item: AtlasPlate) => {
      const key = `${item.src}:${item.emblem ? 'emblem' : 'map'}`
      if (cache.has(key)) return cache.get(key)!
      const result = new Promise<ParticlePlate>((resolve, reject) => {
        const image = new Image()
        image.crossOrigin = 'anonymous'
        pending.add(image)
        image.onload = () => {
          pending.delete(image)
          try {
            const sample = document.createElement('canvas')
            sample.width = columns; sample.height = rows
            const ctx = sample.getContext('2d', { willReadFrequently: true })!
            ctx.drawImage(image, 0, 0, columns, rows)
            const pixels = ctx.getImageData(0, 0, columns, rows).data
            const positions = new Float32Array(count * 3), colors = new Float32Array(count * 3), opacity = new Float32Array(count)
            const color = new THREE.Color()
            const width = item.emblem ? 5.25 : 6.65
            const height = width * image.naturalHeight / image.naturalWidth
            for (let y = 0; y < rows; y++) for (let x = 0; x < columns; x++) {
              const i = y * columns + x, p = i * 4, v = i * 3
              positions[v] = (x / (columns - 1) - .5) * width
              positions[v + 1] = (.5 - y / (rows - 1)) * height
              positions[v + 2] = Math.cos(positions[v] * .72) * .12
              const r = pixels[p] / 255, g = pixels[p + 1] / 255, b = pixels[p + 2] / 255
              const luma = r * .2126 + g * .7152 + b * .0722
              color.setRGB(item.emblem ? .84 : r * .7 + .24, item.emblem ? .34 : g * .7 + .20,
                item.emblem ? .24 : b * .7 + .14, THREE.SRGBColorSpace)
              colors.set([color.r, color.g, color.b], v)
              opacity[i] = pixels[p + 3] / 255 * (item.emblem ? .96 : .36 + (1 - luma) * .64)
            }
            resolve({ positions, colors, opacity })
          } catch (error) { reject(error) }
        }
        image.onerror = () => { pending.delete(image); reject(new Error('image unavailable')) }
        image.src = item.src
      })
      cache.set(key, result)
      // A rejected request can be retried after the administrator fixes the image URL.
      void result.catch(() => cache.delete(key))
      return result
    }
    const render = () => {
      if (lost) return
      uniforms.uProgress.value = morph
      uniforms.uTime.value = reduced ? 0 : (held ?? time)
      uniforms.uPointer.value.set(pointerX, pointerY, aimed)
      camera.position.x = reduced ? 0 : pointerX * .045
      camera.position.y = reduced ? 0 : pointerY * .035
      camera.position.z = 10.4 - (reduced ? 0 : Math.sin(morph * Math.PI) * .28)
      camera.lookAt(0, 0, 0)
      renderer.render(scene, camera)
      frameCount++
    }
    const tick = (now: number) => {
      frame = 0
      if (disposed || lost || !active || !visible || document.hidden) return
      const started = performance.now(), dt = Math.min((now - (last || now)) / 1000, .05)
      last = now
      time += dt
      morph = reduced ? 1 : Math.min(1, morph + dt / 1.35)
      pointerX = follow(pointerX, targetX, dt, 12); pointerY = follow(pointerY, targetY, dt, 12)
      aimed = follow(aimed, aiming, dt, aiming ? 14 : 7)
      render()
      lastFrameMs = performance.now() - started
      if (!reduced) frame = requestAnimationFrame(tick)
    }
    const stop = () => { cancelAnimationFrame(frame); frame = 0; last = 0 }
    const start = () => {
      if (disposed || lost || !active || !visible || document.hidden) return
      if (reduced) render()
      else if (!frame) frame = requestAnimationFrame(tick)
    }
    const select = async (item: AtlasPlate) => {
      const request = ++ticket
      setFailed(false)
      try {
        const data = await loadPlate(item)
        if (disposed || request !== ticket) return
        const weight = smoothMorph(morph)
        // Interrupted transitions start at their current rendered shape, never the previous end pose.
        for (const [source, destination, values] of [[from, to, data.positions], [colorFrom, colorTo, data.colors], [alphaFrom, alphaTo, data.opacity]] as const) {
          const a = source.array as Float32Array, b = destination.array as Float32Array
          for (let i = 0; i < a.length; i++) a[i] = currentId ? a[i] + (b[i] - a[i]) * weight : values[i]
          b.set(values); source.needsUpdate = true; destination.needsUpdate = true
        }
        if (currentId && !reduced) {
          const burst = Math.sin(weight * Math.PI)
          const previous = from.array as Float32Array
          for (let i = 0; i < count; i++) {
            previous[i * 3] += (seeds[i * 3] - .5) * 1.25 * burst
            previous[i * 3 + 1] += (seeds[i * 3 + 1] - .5) * burst
            previous[i * 3 + 2] += (seeds[i * 3 + 2] - .5) * 3 * burst
          }
        }
        morph = !currentId || reduced ? 1 : 0
        currentId = item.id
        render() // Announce ready only after an actual textured particle frame has been drawn.
        setReady(true)
        start()
      } catch { if (!disposed && request === ticket) { setFailed(true); setReady(false) } }
    }
    updates.current = { select: (item) => { void select(item) }, focus: (amount) => { uniforms.uFocus.value = amount; if (reduced) render() } }
    const resize = () => {
      const { width, height } = host.getBoundingClientRect()
      if (!width || !height) return
      renderer.setSize(width, height, false)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      render()
    }
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(host)
    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), hit = new THREE.Vector3()
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
    const move = (event: PointerEvent) => {
      if (reduced) return
      const rect = host.getBoundingClientRect()
      ndc.set((event.clientX - rect.left) / rect.width * 2 - 1, 1 - (event.clientY - rect.top) / rect.height * 2)
      ray.setFromCamera(ndc, camera)
      if (ray.ray.intersectPlane(plane, hit)) { targetX = hit.x; targetY = hit.y; aiming = 1 }
    }
    const leave = () => { aiming = 0; targetX = 0; targetY = 0 }
    const release = (event: PointerEvent) => { if (event.pointerType !== 'mouse') leave() }
    host.addEventListener('pointermove', move, { passive: true })
    host.addEventListener('pointerleave', leave)
    host.addEventListener('pointercancel', leave)
    host.addEventListener('pointerup', release)
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) start(); else stop() })
    observer.observe(host)
    const onScene = () => { active = document.documentElement.dataset.page === 'earth'; if (active) start(); else { leave(); stop() } }
    const onVisibility = () => { if (document.hidden) { leave(); stop() } else start() }
    const onPreference = () => { reduced = isMotionReduced(); uniforms.uMotion.value = reduced ? 0 : 1; leave(); stop(); morph = 1; start() }
    const onLost = (event: Event) => { event.preventDefault(); lost = true; stop(); setReady(false); setFailed(true) }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('ttf-scene', onScene)
    preference.addEventListener('change', onPreference)
    window.addEventListener(MOTION_PREFERENCE_EVENT, onPreference)
    canvas.addEventListener('webglcontextlost', onLost)
    resize()
    void select(initial.current)
    const probe = () => ({ plate: currentId, progress: morph, count, compact, reduced, active, visible, running: Boolean(frame),
      pointer: [pointerX, pointerY, aimed], camera: camera.position.toArray(), time, frameCount, lastFrameMs,
      drawCalls: renderer.info.render.calls, hold: (value: number | null) => { held = value; render() } })
    if (import.meta.env.DEV) window.__ttfParticleAtlas = probe
    return () => {
      disposed = true; ticket++; stop(); updates.current = null
      resizeObserver.disconnect(); observer.disconnect()
      for (const image of pending) { image.onload = null; image.onerror = null; image.src = '' }
      pending.clear(); cache.clear()
      host.removeEventListener('pointermove', move); host.removeEventListener('pointerleave', leave); host.removeEventListener('pointercancel', leave)
      host.removeEventListener('pointerup', release)
      document.removeEventListener('visibilitychange', onVisibility); window.removeEventListener('ttf-scene', onScene)
      preference.removeEventListener('change', onPreference); window.removeEventListener(MOTION_PREFERENCE_EVENT, onPreference); canvas.removeEventListener('webglcontextlost', onLost)
      geometry.dispose(); material.dispose(); renderer.dispose(); canvas.remove()
      if (window.__ttfParticleAtlas === probe) delete window.__ttfParticleAtlas
    }
  }, [])

  useEffect(() => { if (plate) updates.current?.select(plate) }, [plate])
  useEffect(() => { updates.current?.focus(intensity) }, [intensity])
  return <div ref={hostRef} className={`particle-atlas ${ready && !failed ? 'is-ready' : ''}`} data-particle-state={failed ? 'fallback' : ready ? 'ready' : 'loading'}>
    {plate && <img className="particle-atlas-fallback" src={plate.src} alt={plate.label} />}
  </div>
}
