import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import {
  createCurtainPhysics,
  getCurtainMetrics,
  resetCurtainPhysics,
  stepCurtainPhysics,
} from '../lib/curtainPhysics'
import { isMotionReduced, MOTION_PREFERENCE_EVENT } from '../lib/motionPreference'

interface AtlasCurtainProps { roof: string; words: string[]; label: string; active?: boolean }
interface CurtainUpdates { roof: (url: string) => void; words: (text: string) => void; active: (enabled: boolean) => void }

const COLUMNS = 42
const ROWS = 48
const CURTAIN_WIDTH = 4.35
const CURTAIN_HEIGHT = 4.82
const CURTAIN_TOP = 1.08
const ROOF_WIDTH = 6.2
const FIXED_STEP = 1 / 120
const DEFAULT_WORDS = '山海有图经纬为序探索绘制记录历史疆域'
const FONT = '500 54px "Noto Serif SC", "SimSun", serif'
const probeRegistry = new Map<number, () => unknown>()
let nextProbeId = 0

declare global {
  interface Window { __ttfAtlasCurtain?: () => unknown[] }
}

/**
 * 原创屋檐贴图下的独立文字串：每列只与自己的上下字符相连。
 * 画面不自转、不整体倾斜；指针穿过某一列才拨动那一列。
 * DEV: window.__ttfAtlasCurtain() 提供各实例的 snapshot/project/point/hold/reset。
 */
export default function AtlasCurtain({ roof, words, label, active = true }: AtlasCurtainProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const updatesRef = useRef<CurtainUpdates | null>(null)
  const [ready, setReady] = useState(false)
  const wordString = words.join('') || DEFAULT_WORDS

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const compact = window.matchMedia('(max-width: 767px)').matches
    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)')
    let reduced = isMotionReduced()
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('webgl2', { alpha: true, antialias: !compact })
    if (!context) return
    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ canvas, context, alpha: true, antialias: !compact, powerPreference: 'low-power' })
    } catch { return }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, compact ? 1.25 : 1.75))
    renderer.setClearColor(0x000000, 0)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    canvas.dataset.atlasCurtain = 'true'
    canvas.setAttribute('aria-hidden', 'true')
    canvas.style.cssText = 'position:absolute;inset:0;display:block;width:100%;height:100%;pointer-events:none;opacity:0'
    host.appendChild(canvas)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(34, 1, .1, 100)
    camera.position.set(0, 0, 16)
    const physics = createCurtainPhysics({ columns: COLUMNS, rows: ROWS, width: CURTAIN_WIDTH, height: CURTAIN_HEIGHT, top: CURTAIN_TOP })
    const textures = new Set<THREE.Texture>()
    const loader = new THREE.TextureLoader()
    loader.setCrossOrigin('anonymous')
    let disposed = false
    let contextLost = false
    let roofRequest = 0
    let textRequest = 0
    let roofReady = false
    let textReady = false
    let announcedReady = false
    let visible = true
    let propActive = true
    let sceneActive = (document.documentElement.dataset.page ?? 'home') === 'home'
    let held = false
    let frame = 0
    let frameCount = 0
    let lastTime = 0
    let accumulator = 0
    let lastRenderMs = 0
    let calmFrames = 0

    // 所有无贴图平面在加载前都隐藏，不会出现默认白色矩形。
    const roofMaterial = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false })
    const roofMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), roofMaterial)
    roofMesh.visible = false
    roofMesh.position.z = .18
    roofMesh.renderOrder = 4
    scene.add(roofMesh)
    const roofShadowMaterial = new THREE.MeshBasicMaterial({ color: 0x372b20, opacity: .15, transparent: true, depthWrite: false })
    const roofShadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), roofShadowMaterial)
    roofShadow.visible = false
    roofShadow.position.z = -.5
    roofShadow.renderOrder = 0
    scene.add(roofShadow)

    const glyphGeometry = new THREE.BufferGeometry()
    const positions = new Float32Array(physics.count * 12)
    const uvs = new Float32Array(physics.count * 8)
    const colors = new Float32Array(physics.count * 12)
    const indices = new Uint16Array(physics.count * 6)
    for (let i = 0; i < physics.count; i++) {
      const vertex = i * 4
      indices.set([vertex, vertex + 1, vertex + 2, vertex, vertex + 2, vertex + 3], i * 6)
      const ink = .8 + (Math.floor(i / ROWS) * 7 % 11) / 11 * .2
      colors.fill(ink, i * 12, i * 12 + 12)
    }
    const positionAttribute = new THREE.BufferAttribute(positions, 3)
    positionAttribute.setUsage(THREE.DynamicDrawUsage)
    glyphGeometry.setAttribute('position', positionAttribute)
    glyphGeometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
    glyphGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    glyphGeometry.setIndex(new THREE.BufferAttribute(indices, 1))
    const inkMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: .94, depthWrite: false, side: THREE.DoubleSide, vertexColors: true })
    inkMaterial.forceSinglePass = true
    const glyphMesh = new THREE.Mesh(glyphGeometry, inkMaterial)
    glyphMesh.visible = false
    glyphMesh.frustumCulled = false
    glyphMesh.renderOrder = 3
    scene.add(glyphMesh)
    const textShadowMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: .12, depthWrite: false, side: THREE.DoubleSide, color: 0x554331 })
    textShadowMaterial.forceSinglePass = true
    const textShadow = new THREE.Mesh(glyphGeometry, textShadowMaterial)
    textShadow.position.set(.32, -.16, -.5)
    textShadow.visible = false
    textShadow.frustumCulled = false
    textShadow.renderOrder = 1
    scene.add(textShadow)

    const pointer = { x: 0, y: 0, vx: 0, vy: 0, radius: .42, active: false, time: 0 }
    const raycaster = new THREE.Raycaster()
    const ndc = new THREE.Vector2()
    const hit = new THREE.Vector3()
    // 字符实际位于 z≈0；不能误投到水平地面或屋檐的平面。
    const characterPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
    const project = (x: number, y: number, z = 0) => {
      const point = new THREE.Vector3(x, y, z).project(camera)
      const rect = host.getBoundingClientRect()
      return { x: rect.left + (point.x + 1) * rect.width / 2, y: rect.top + (1 - point.y) * rect.height / 2 }
    }
    const disposeTexture = (texture: THREE.Texture | null | undefined) => {
      if (!texture) return
      textures.delete(texture)
      texture.dispose()
    }
    const stampGeometry = () => {
      const halfSize = Math.min(physics.columnSpacing, physics.rowSpacing) * .5
      const p = physics.position
      for (let column = 0; column < COLUMNS; column++) {
        for (let row = 0; row < ROWS; row++) {
          const index = column * ROWS + row
          const offset = index * 3
          const previous = (column * ROWS + Math.max(0, row - 1)) * 3
          const next = (column * ROWS + Math.min(ROWS - 1, row + 1)) * 3
          const angle = Math.atan2(p[next + 1] - p[previous + 1], p[next] - p[previous]) + Math.PI / 2
          const a = Math.cos(angle) * halfSize
          const b = Math.sin(angle) * halfSize
          const x = p[offset], y = p[offset + 1], z = p[offset + 2]
          // 四角随相邻字符的切线转动，而不是把字串作为一张布进行拉伸。
          const vertex = index * 12
          positions[vertex] = x - a + b
          positions[vertex + 1] = y - b - a
          positions[vertex + 2] = z
          positions[vertex + 3] = x + a + b
          positions[vertex + 4] = y + b - a
          positions[vertex + 5] = z
          positions[vertex + 6] = x + a - b
          positions[vertex + 7] = y + b + a
          positions[vertex + 8] = z
          positions[vertex + 9] = x - a - b
          positions[vertex + 10] = y - b + a
          positions[vertex + 11] = z
        }
      }
      positionAttribute.needsUpdate = true
    }
    const stop = () => {
      cancelAnimationFrame(frame)
      frame = 0
      lastTime = 0
      accumulator = 0
      host.dataset.curtainRunning = 'false'
    }
    const draw = () => {
      if (disposed || contextLost) return
      const started = performance.now()
      stampGeometry()
      renderer.render(scene, camera)
      frameCount++
      lastRenderMs = performance.now() - started
      if (roofReady && textReady && !announcedReady) {
        announcedReady = true
        canvas.style.opacity = '1'
        setReady(true)
      }
    }
    const canAnimate = () => !disposed && !contextLost && visible && propActive && sceneActive && !document.hidden && !reduced && !held
    const tick = (now: number) => {
      frame = 0
      if (!canAnimate()) { stop(); return }
      const delta = lastTime ? Math.min((now - lastTime) / 1000, .05) : FIXED_STEP
      lastTime = now
      accumulator += delta
      const pointerFresh = pointer.active && now - pointer.time < 180
      if (!pointerFresh) { pointer.vx = 0; pointer.vy = 0 }
      while (accumulator >= FIXED_STEP) {
        stepCurtainPhysics(physics, pointer.active ? pointer : null, FIXED_STEP)
        accumulator -= FIXED_STEP
      }
      draw()
      if (!pointer.active && frameCount % 6 === 0) {
        const metrics = getCurtainMetrics(physics)
        const calm = metrics.maxSpeed < .018 && metrics.maxDisplacement < .02
        calmFrames = calm ? calmFrames + 6 : 0
      } else if (pointer.active) calmFrames = 0
      if (calmFrames >= 14) {
        resetCurtainPhysics(physics)
        draw()
        stop()
      } else if (canAnimate()) {
        host.dataset.curtainRunning = 'true'
        frame = requestAnimationFrame(tick)
      }
    }
    const requestDraw = () => {
      if (disposed || contextLost || !visible || !propActive || !sceneActive || document.hidden) return
      if (reduced || held) { draw(); return }
      if (!frame) {
        lastTime = 0
        host.dataset.curtainRunning = 'true'
        frame = requestAnimationFrame(tick)
      }
    }
    const freeze = () => {
      pointer.active = false
      pointer.vx = pointer.vy = 0
      physics.previous.set(physics.position)
      stop()
    }
    const updateActive = (enabled: boolean) => {
      propActive = enabled
      if (propActive && sceneActive) requestDraw()
      else freeze()
    }
    const onScene = (event: Event) => {
      const id = (event as CustomEvent<{ id?: string }>).detail?.id
      if (typeof id !== 'string') return
      sceneActive = id === 'home'
      if (propActive && sceneActive) requestDraw()
      else freeze()
    }
    window.addEventListener('ttf-scene', onScene)
    const shadowTexture = (source: CanvasImageSource, width: number, height: number, blur: number) => {
      const surface = document.createElement('canvas')
      const ratio = Math.min(1, 1024 / width)
      surface.width = Math.max(1, Math.round(width * ratio))
      surface.height = Math.max(1, Math.round(height * ratio))
      const ctx = surface.getContext('2d')
      if (!ctx) return null
      ctx.filter = `blur(${blur * ratio}px)`
      ctx.drawImage(source, 0, 0, surface.width, surface.height)
      const texture = new THREE.CanvasTexture(surface)
      texture.colorSpace = THREE.SRGBColorSpace
      textures.add(texture)
      return texture
    }
    const updateRoof = (url: string) => {
      const request = ++roofRequest
      if (!url) {
        roofMesh.visible = roofShadow.visible = false
        roofReady = false
        announcedReady = false
        canvas.style.opacity = '0'
        disposeTexture(roofMaterial.map)
        disposeTexture(roofShadowMaterial.map)
        roofMaterial.map = roofShadowMaterial.map = null
        setReady(false)
        requestDraw()
        return
      }
      let pending: THREE.Texture | undefined
      try {
        pending = loader.load(url, (texture) => {
          if (disposed || request !== roofRequest) { disposeTexture(texture); return }
          const image = texture.image as HTMLImageElement
          const width = image.naturalWidth || image.width
          const height = image.naturalHeight || image.height
          if (!width || !height) { disposeTexture(texture); return }
          texture.colorSpace = THREE.SRGBColorSpace
          texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 4)
          const old = roofMaterial.map
          roofMaterial.map = texture
          roofMaterial.needsUpdate = true
          const planeHeight = ROOF_WIDTH * height / width
          roofMesh.scale.set(ROOF_WIDTH, planeHeight, 1)
          roofMesh.position.y = CURTAIN_TOP + planeHeight / 2 + .025
          roofMesh.visible = true
          disposeTexture(old)
          const oldShadow = roofShadowMaterial.map
          try { roofShadowMaterial.map = shadowTexture(image, width, height, 14) } catch { roofShadowMaterial.map = null }
          roofShadowMaterial.needsUpdate = true
          roofShadow.scale.copy(roofMesh.scale)
          roofShadow.position.set(.24, roofMesh.position.y - .19, -.5)
          roofShadow.visible = !!roofShadowMaterial.map
          disposeTexture(oldShadow)
          roofReady = true
          host.dataset.curtainRoof = url
          requestDraw()
        }, undefined, () => {
          disposeTexture(pending)
          // 更新失败仍保留上一张有效屋檐；首张失败由静态纸面版本接管。
        })
        textures.add(pending)
      } catch { disposeTexture(pending) }
    }
    const updateWords = async (text: string) => {
      const request = ++textRequest
      const source = Array.from(text || DEFAULT_WORDS).filter((char) => char.trim())
      const stream = source.length ? source : Array.from(DEFAULT_WORDS)
      const unique = [...new Set(stream)].slice(0, 256)
      try {
        // 请求字体使用的真实字符；只等 fonts.ready 会漏掉尚未启动下载的 CJK 子集。
        await document.fonts.load(FONT, unique.join(''))
        await document.fonts.ready
      } catch { /* 本机宋体仍可提供完整字形；不会在网络失败时生成空白矩形。 */ }
      if (disposed || request !== textRequest) return
      const tile = 64
      const grid = Math.ceil(Math.sqrt(unique.length))
      const surface = document.createElement('canvas')
      surface.width = surface.height = grid * tile
      const ctx = surface.getContext('2d')
      if (!ctx) return
      ctx.font = FONT
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = '#403125'
      unique.forEach((char, index) => {
        ctx.fillText(char, (index % grid + .5) * tile, (Math.floor(index / grid) + .5) * tile + 2)
      })
      const atlas = new THREE.CanvasTexture(surface)
      atlas.colorSpace = THREE.SRGBColorSpace
      atlas.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 4)
      textures.add(atlas)
      const old = inkMaterial.map
      inkMaterial.map = atlas
      inkMaterial.needsUpdate = true
      disposeTexture(old)
      const oldShadow = textShadowMaterial.map
      textShadowMaterial.map = shadowTexture(surface, surface.width, surface.height, 2)
      textShadowMaterial.needsUpdate = true
      disposeTexture(oldShadow)
      const glyphIndex = new Map(unique.map((char, index) => [char, index]))
      for (let column = 0; column < COLUMNS; column++) {
        for (let row = 0; row < ROWS; row++) {
          const i = column * ROWS + row
          const glyph = glyphIndex.get(stream[(column * 7 + row) % stream.length]) ?? 0
          const u0 = (glyph % grid) / grid
          const v0 = 1 - (Math.floor(glyph / grid) + 1) / grid
          const u1 = u0 + 1 / grid, v1 = v0 + 1 / grid
          uvs.set([u0, v0, u1, v0, u1, v1, u0, v1], i * 8)
        }
      }
      glyphGeometry.getAttribute('uv').needsUpdate = true
      glyphMesh.visible = true
      textShadow.visible = !!textShadowMaterial.map
      textReady = true
      host.dataset.curtainFontReady = 'true'
      requestDraw()
    }

    const onPointer = (event: PointerEvent) => {
      if (reduced || held || !visible || !propActive || !sceneActive || document.hidden || event.pointerType === 'touch' && !event.buttons) return
      const rect = host.getBoundingClientRect()
      if (!rect.width || !rect.height || event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) {
        pointer.active = false
        return
      }
      ndc.set((event.clientX - rect.left) / rect.width * 2 - 1, 1 - (event.clientY - rect.top) / rect.height * 2)
      raycaster.setFromCamera(ndc, camera)
      if (!raycaster.ray.intersectPlane(characterPlane, hit)) return
      const now = performance.now()
      const delta = Math.max((now - pointer.time) / 1000, 1 / 240)
      const wasActive = pointer.active
      pointer.vx = wasActive ? THREE.MathUtils.clamp((hit.x - pointer.x) / delta, -14, 14) : 0
      pointer.vy = wasActive ? THREE.MathUtils.clamp((hit.y - pointer.y) / delta, -14, 14) : 0
      pointer.x = hit.x
      pointer.y = hit.y
      pointer.time = now
      pointer.active = Math.abs(hit.x) < CURTAIN_WIDTH / 2 + pointer.radius && hit.y < CURTAIN_TOP + .1 && hit.y > CURTAIN_TOP - CURTAIN_HEIGHT - .25
      calmFrames = 0
      requestDraw()
    }
    const onRelease = (event?: PointerEvent) => {
      if (event?.pointerType === 'mouse' && event.type === 'pointerup') return
      pointer.active = false
      pointer.vx = pointer.vy = 0
      requestDraw()
    }
    window.addEventListener('pointermove', onPointer, { passive: true })
    window.addEventListener('pointerdown', onPointer, { passive: true })
    window.addEventListener('pointerup', onRelease, { passive: true })
    window.addEventListener('pointercancel', onRelease, { passive: true })
    window.addEventListener('blur', freeze)
    document.addEventListener('pointerleave', onRelease)
    const resize = () => {
      const { width, height } = host.getBoundingClientRect()
      if (!width || !height) return
      camera.aspect = width / height
      const halfHeight = Math.max(4.6, 3.35 / camera.aspect)
      camera.position.z = halfHeight / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
      camera.updateProjectionMatrix()
      camera.updateMatrixWorld()
      renderer.setSize(width, height, false)
      requestDraw()
    }
    const resizer = new ResizeObserver(resize)
    resizer.observe(host)
    resize()
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      if (visible) requestDraw()
      else freeze()
    }, { threshold: .01 })
    observer.observe(host)
    const onVisibility = () => { if (document.hidden) freeze(); else requestDraw() }
    document.addEventListener('visibilitychange', onVisibility)
    const onMediaPreference = () => {
      reduced = isMotionReduced()
      freeze()
      resetCurtainPhysics(physics)
      requestDraw()
    }
    const onMotionPreference = () => {
      reduced = isMotionReduced()
      freeze()
      resetCurtainPhysics(physics)
      requestDraw()
    }
    motionPreference.addEventListener('change', onMediaPreference)
    window.addEventListener(MOTION_PREFERENCE_EVENT, onMotionPreference)
    const onContextLost = (event: Event) => {
      event.preventDefault()
      contextLost = true
      announcedReady = false
      canvas.style.opacity = '0'
      freeze()
      setReady(false)
    }
    const onContextRestored = () => {
      if (disposed) return
      contextLost = false
      requestDraw()
    }
    canvas.addEventListener('webglcontextlost', onContextLost)
    canvas.addEventListener('webglcontextrestored', onContextRestored)
    const updates = { roof: updateRoof, words: (text: string) => { void updateWords(text) }, active: updateActive }
    updatesRef.current = updates
    host.dataset.curtainColumns = String(COLUMNS)
    host.dataset.curtainGlyphs = String(COLUMNS * ROWS)
    host.dataset.curtainRows = String(ROWS)

    const probeId = ++nextProbeId
    if (import.meta.env.DEV) {
      probeRegistry.set(probeId, () => ({
        id: probeId,
        snapshot: () => ({
          ...getCurtainMetrics(physics), frameCount, drawCalls: renderer.info.render.calls,
          triangles: renderer.info.render.triangles, textures: renderer.info.memory.textures,
          roofReady, textReady, visible, active: propActive, sceneActive, reduced, held, contextLost, running: !!frame,
          columns: COLUMNS, rows: ROWS, glyphs: physics.count, lastRenderMs,
          pointer: { x: pointer.x, y: pointer.y, active: pointer.active },
        }),
        project,
        point: (column: number, row: number) => {
          const c = THREE.MathUtils.clamp(Math.floor(column), 0, COLUMNS - 1)
          const r = THREE.MathUtils.clamp(Math.floor(row), 0, ROWS - 1)
          const i = (c * ROWS + r) * 3
          return { ...project(physics.position[i], physics.position[i + 1], physics.position[i + 2]),
            world: Array.from(physics.position.subarray(i, i + 3)), rest: Array.from(physics.rest.subarray(i, i + 3)) }
        },
        hold: (value: boolean) => { held = value; freeze(); requestDraw() },
        reset: () => { freeze(); resetCurtainPhysics(physics); calmFrames = 0; requestDraw() },
      }))
      window.__ttfAtlasCurtain = () => Array.from(probeRegistry.values(), (read) => read())
    }
    return () => {
      disposed = true
      if (updatesRef.current === updates) updatesRef.current = null
      stop()
      observer.disconnect()
      resizer.disconnect()
      motionPreference.removeEventListener('change', onMediaPreference)
      window.removeEventListener(MOTION_PREFERENCE_EVENT, onMotionPreference)
      document.removeEventListener('visibilitychange', onVisibility)
      document.removeEventListener('pointerleave', onRelease)
      window.removeEventListener('pointermove', onPointer)
      window.removeEventListener('pointerdown', onPointer)
      window.removeEventListener('pointerup', onRelease)
      window.removeEventListener('pointercancel', onRelease)
      window.removeEventListener('blur', freeze)
      window.removeEventListener('ttf-scene', onScene)
      canvas.removeEventListener('webglcontextlost', onContextLost)
      canvas.removeEventListener('webglcontextrestored', onContextRestored)
      probeRegistry.delete(probeId)
      if (!probeRegistry.size && import.meta.env.DEV) delete window.__ttfAtlasCurtain
      const geometries = new Set<THREE.BufferGeometry>()
      scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return
        geometries.add(object.geometry)
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) material.dispose()
      })
      for (const geometry of geometries) geometry.dispose()
      for (const texture of textures) texture.dispose()
      textures.clear()
      renderer.dispose()
      renderer.forceContextLoss()
      canvas.remove()
    }
  }, [])

  // 主题切换不销毁 WebGL 实例；新的屋檐和字形均准备好后才替换旧资源。
  useEffect(() => { updatesRef.current?.roof(roof) }, [roof])
  useEffect(() => { updatesRef.current?.words(wordString) }, [wordString])
  useEffect(() => { updatesRef.current?.active(active) }, [active])

  const fallbackChars = Array.from(wordString)
  return <div ref={hostRef} className="atlas-curtain" role="img" aria-label={label} data-curtain-ready={ready} onClick={(event) => event.stopPropagation()}>
    {!ready && <div className="atlas-curtain-fallback" aria-hidden="true">
      <img className="atlas-curtain-fallback-roof" src={roof || undefined} alt="" onLoad={(event) => { event.currentTarget.style.visibility = 'visible' }} onError={(event) => { event.currentTarget.style.visibility = 'hidden' }} />
      <div className="atlas-curtain-fallback-strings">{Array.from({ length: COLUMNS }, (_, column) =>
        <span key={column}>{Array.from({ length: ROWS }, (_, row) => fallbackChars[(column * 7 + row) % fallbackChars.length]).join('')}</span>,
      )}</div>
    </div>}
  </div>
}
