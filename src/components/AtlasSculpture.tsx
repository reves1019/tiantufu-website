import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import AtlasRelief from './AtlasRelief'
import { isMotionReduced, MOTION_PREFERENCE_EVENT } from '../lib/motionPreference'

interface AtlasSculptureProps { map: string; emblem: string; words: string[] }
interface SculptureUpdates {
  map: (url: string) => void
  emblem: (url: string) => void
  words: (value: string) => void
}

/** 真正的 WebGL 铜制地图盘 + 悬垂文字曲面。离开页面或切到后台时停止绘制。 */
export default function AtlasSculpture({ map, emblem, words }: AtlasSculptureProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const updatesRef = useRef<SculptureUpdates | null>(null)
  const [ready, setReady] = useState(false)
  const wordString = words.join('') || '探索绘制记录经纬山海'

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    setReady(false)
    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)')
    let reduced = isMotionReduced()
    const compact = window.matchMedia('(max-width: 767px)').matches
    let renderer: THREE.WebGLRenderer
    // 检测在构造前进行，避免不支持 WebGL 的浏览器打印 Three.js 初始化错误。
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('webgl2', { alpha: true, antialias: !compact })
    if (!context) return
    try {
      renderer = new THREE.WebGLRenderer({ canvas, context, alpha: true, antialias: !compact, powerPreference: 'low-power' })
    } catch { return }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, compact ? 1.25 : 1.75))
    renderer.shadowMap.enabled = !compact
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.domElement.dataset.atlas3d = 'true'
    renderer.domElement.setAttribute('aria-hidden', 'true')
    host.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera(-5, 5, 5, -5, .1, 100)
    camera.position.set(0, 6, 14)
    camera.lookAt(0, -.4, 0)
    scene.add(new THREE.HemisphereLight(0xfff2d8, 0x775a38, 2.3))
    const sun = new THREE.DirectionalLight(0xffe8bc, 3.1)
    sun.position.set(-4, 8, 6)
    sun.castShadow = !compact
    sun.shadow.mapSize.set(1024, 1024)
    sun.shadow.camera.left = -7
    sun.shadow.camera.right = 7
    sun.shadow.camera.top = 7
    sun.shadow.camera.bottom = -7
    sun.shadow.bias = -.001
    sun.shadow.normalBias = .03
    scene.add(sun)
    const fill = new THREE.DirectionalLight(0xe6d7be, .8)
    fill.position.set(6, 2, -4)
    scene.add(fill)

    const sculpture = new THREE.Group()
    scene.add(sculpture)
    const bronze = new THREE.MeshStandardMaterial({ color: 0x8e6338, metalness: .52, roughness: .57 })
    const brass = new THREE.MeshStandardMaterial({ color: 0xc5a36b, metalness: .45, roughness: .49 })
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(2.74, 2.68, .19, compact ? 64 : 112), bronze)
    plate.position.y = 1.58
    plate.castShadow = true
    plate.receiveShadow = true
    sculpture.add(plate)
    const rim = new THREE.Mesh(new THREE.TorusGeometry(2.7, .06, 12, 112), brass)
    rim.rotation.x = -Math.PI / 2
    rim.position.y = 1.72
    rim.castShadow = true
    sculpture.add(rim)

    const resources = new Set<THREE.Texture>()
    let disposed = false
    let contextLost = false
    let renderStatic: (() => void) | undefined
    const mapMaterial = new THREE.MeshStandardMaterial({ color: 0xe2cba4, roughness: .9, metalness: .02 })
    const mapFace = new THREE.Mesh(new THREE.CircleGeometry(2.64, 112), mapMaterial)
    mapFace.rotation.x = -Math.PI / 2
    mapFace.position.y = 1.685
    mapFace.receiveShadow = true
    sculpture.add(mapFace)
    const loader = new THREE.TextureLoader()
    loader.setCrossOrigin('anonymous')
    const disposeTexture = (texture: THREE.Texture | null | undefined) => {
      if (!texture) return
      resources.delete(texture)
      texture.dispose()
    }
    const loadTexture = (url: string, isCurrent: () => boolean, use: (texture: THREE.Texture) => void) => {
      let pending: THREE.Texture | undefined
      try {
        pending = loader.load(url, (texture) => {
          // 慢请求不允许覆盖后来的主题；卸载后的请求也不会重新挂载资源。
          if (disposed || !isCurrent()) { disposeTexture(texture); return }
          texture.colorSpace = THREE.SRGBColorSpace
          texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 4)
          use(texture)
          renderStatic?.()
        }, undefined, () => {
          disposeTexture(pending)
          // 加载失败保留上一张有效素材，而不是暴露无纹理平面。
        })
        resources.add(pending)
      } catch { disposeTexture(pending) }
    }

    // 立体指南针八角星：不是一张浮在盘面上的平面图。
    const needleShape = new THREE.Shape()
    for (let i = 0; i < 16; i++) {
      const angle = i * Math.PI / 8
      const radius = i % 2 ? .22 : i % 4 === 0 ? 1.15 : .7
      const x = Math.sin(angle) * radius
      const y = Math.cos(angle) * radius
      if (i === 0) needleShape.moveTo(x, y)
      else needleShape.lineTo(x, y)
    }
    needleShape.closePath()
    const needle = new THREE.Mesh(
      new THREE.ExtrudeGeometry(needleShape, { depth: .09, bevelEnabled: true, bevelSegments: 2, bevelSize: .025, bevelThickness: .018, steps: 1 }),
      new THREE.MeshStandardMaterial({ color: 0x972f24, roughness: .5, metalness: .2 }),
    )
    needle.rotation.x = -Math.PI / 2
    needle.position.y = 1.75
    needle.castShadow = true
    sculpture.add(needle)
    const medallion = new THREE.Mesh(new THREE.CylinderGeometry(.41, .41, .13, 48), brass)
    medallion.position.y = 1.89
    medallion.castShadow = true
    sculpture.add(medallion)
    const logoMaterial = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false })
    const logo = new THREE.Mesh(new THREE.PlaneGeometry(.65, .65), logoMaterial)
    // MeshBasicMaterial 无贴图时是白色：只有真实纹理就绪才显示徽标。
    logo.visible = false
    logo.rotation.x = -Math.PI / 2
    logo.position.y = 1.97
    sculpture.add(logo)
    let mapRequest = 0
    let emblemRequest = 0
    const updateMap = (url: string) => {
      const request = ++mapRequest
      if (!url) {
        disposeTexture(mapMaterial.map)
        mapMaterial.map = null
        mapMaterial.needsUpdate = true
        renderStatic?.()
        return
      }
      loadTexture(url, () => request === mapRequest, (texture) => {
        const previous = mapMaterial.map
        mapMaterial.map = texture
        mapMaterial.needsUpdate = true
        disposeTexture(previous)
      })
    }
    const updateEmblem = (url: string) => {
      const request = ++emblemRequest
      if (!url) {
        logo.visible = false
        disposeTexture(logoMaterial.map)
        logoMaterial.map = null
        logoMaterial.needsUpdate = true
        renderStatic?.()
        return
      }
      loadTexture(url, () => request === emblemRequest, (texture) => {
        const previous = logoMaterial.map
        logoMaterial.map = texture
        logoMaterial.needsUpdate = true
        logo.visible = true
        disposeTexture(previous)
      })
    }

    // 以一次 canvas 绘制生成字幕纹理，之后只变形网格顶点，不重排文字。
    const textCanvas = document.createElement('canvas')
    textCanvas.width = compact ? 768 : 1536
    textCanvas.height = compact ? 1024 : 2048
    const ctx = textCanvas.getContext('2d')!
    const columns = 41
    const rows = 62
    const cw = textCanvas.width / columns
    const rh = textCanvas.height / rows
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `${Math.round(cw * .62)}px "Noto Serif SC", "SimSun", serif`
    const textTexture = new THREE.CanvasTexture(textCanvas)
    textTexture.colorSpace = THREE.SRGBColorSpace
    resources.add(textTexture)
    const updateWords = (value: string) => {
      const glyphs = [...(value || '探索绘制记录经纬山海')]
      ctx.clearRect(0, 0, textCanvas.width, textCanvas.height)
      for (let column = 0; column < columns; column++) {
        for (let row = 0; row < rows; row++) {
          const alpha = (.4 + (column % 5) * .09) * (1 - row / rows * .35)
          ctx.fillStyle = `rgba(63,45,30,${alpha})`
          ctx.fillText(glyphs[(column * 3 + row) % glyphs.length], (column + .5) * cw, (row + .5) * rh)
        }
      }
      textTexture.needsUpdate = true
      renderStatic?.()
    }
    updateWords('探索绘制记录经纬山海')
    const geometry = new THREE.PlaneGeometry(5.1, 5.5, compact ? 24 : 40, compact ? 32 : 48)
    const base = new Float32Array(geometry.attributes.position.array)
    const curtain = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ map: textTexture, transparent: true, side: THREE.DoubleSide, depthWrite: false, alphaTest: .035 }))
    curtain.position.set(0, -1.1, .45)
    sculpture.add(curtain)

    // 柔和接触阴影避免小型 shadow camera 裁出硬边；盘面仍接收指南针的真实投影。
    const shadowCanvas = document.createElement('canvas')
    shadowCanvas.width = shadowCanvas.height = 128
    const shadowCtx = shadowCanvas.getContext('2d')!
    const shadowGradient = shadowCtx.createRadialGradient(64, 64, 0, 64, 64, 62)
    shadowGradient.addColorStop(0, 'rgba(77,53,28,.2)')
    shadowGradient.addColorStop(.5, 'rgba(77,53,28,.09)')
    shadowGradient.addColorStop(1, 'rgba(77,53,28,0)')
    shadowCtx.fillStyle = shadowGradient
    shadowCtx.fillRect(0, 0, 128, 128)
    const shadowTexture = new THREE.CanvasTexture(shadowCanvas)
    resources.add(shadowTexture)
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(8, 5), new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false }))
    floor.rotation.x = -Math.PI / 2
    floor.position.y = -4.1
    floor.position.x = .8
    scene.add(floor)

    const pointer = { x: 0, y: 0 }
    const onMove = (event: PointerEvent) => {
      if (reduced || compact || event.pointerType !== 'mouse') return
      const bounds = host.getBoundingClientRect()
      pointer.x = ((event.clientX - bounds.left) / bounds.width - .5) * 2
      pointer.y = ((event.clientY - bounds.top) / bounds.height - .5) * 2
    }
    const onLeave = () => { pointer.x = 0; pointer.y = 0 }
    host.addEventListener('pointermove', onMove, { passive: true })
    host.addEventListener('pointerleave', onLeave)
    let frame = 0
    let visible = true
    let lastTime = 0
    let elapsed = 0
    const draw = (now: number) => {
      if (disposed || contextLost) return
      const delta = lastTime ? Math.min((now - lastTime) / 1000, .05) : 0
      lastTime = now
      if (!reduced) elapsed += delta
      const smoothing = 1 - Math.exp(-delta * 4)
      sculpture.rotation.y += (pointer.x * .16 - sculpture.rotation.y) * smoothing
      sculpture.rotation.z += (-pointer.y * .028 - sculpture.rotation.z) * smoothing
      sculpture.position.y = reduced ? 0 : Math.sin(elapsed * .5) * .045
      const positions = geometry.attributes.position
      for (let i = 0; i < positions.count; i++) {
        const x = base[i * 3]
        const y = base[i * 3 + 1]
        const depth = (2.75 - y) / 5.5
        const wave = Math.sin(x * 1.65 + elapsed * .55 + depth * 3)
        positions.setXYZ(i, x + Math.sin(depth * 3 + elapsed * .35) * depth * .2,
          y + Math.sin(x * .8) * depth * .15,
          -Math.cos(x / 2.55 * Math.PI / 2) * .65 + wave * depth * .3 + pointer.x * depth * .15)
      }
      positions.needsUpdate = true
      renderer.render(scene, camera)
      if (!reduced && visible && !document.hidden) frame = requestAnimationFrame(draw)
    }
    renderStatic = () => { if (reduced && !disposed) draw(performance.now()) }
    const resize = () => {
      const { width, height } = host.getBoundingClientRect()
      if (!width || !height) return
      const aspect = width / height
      const halfHeight = Math.max(4.25, 3.2 / aspect)
      camera.left = -halfHeight * aspect
      camera.right = halfHeight * aspect
      camera.top = halfHeight
      camera.bottom = -halfHeight
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
      if (reduced) draw(performance.now())
    }
    const resizer = new ResizeObserver(resize)
    resizer.observe(host)
    resize()
    const start = () => {
      cancelAnimationFrame(frame)
      lastTime = 0
      // 先绘制首帧再揭开备用画面，避免初始化时的一帧透明空洞。
      if (visible && !document.hidden) draw(performance.now())
    }
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; start() }, { threshold: .05 })
    observer.observe(host)
    document.addEventListener('visibilitychange', start)
    const onMediaPreference = () => {
      reduced = isMotionReduced()
      if (reduced) onLeave()
      start()
    }
    const onMotionPreference = () => {
      reduced = isMotionReduced()
      if (reduced) onLeave()
      start()
    }
    motionPreference.addEventListener('change', onMediaPreference)
    window.addEventListener(MOTION_PREFERENCE_EVENT, onMotionPreference)
    const onContextLost = (event: Event) => {
      event.preventDefault()
      contextLost = true
      cancelAnimationFrame(frame)
      setReady(false)
    }
    const onContextRestored = () => {
      if (disposed) return
      contextLost = false
      start()
      setReady(true)
    }
    renderer.domElement.addEventListener('webglcontextlost', onContextLost)
    renderer.domElement.addEventListener('webglcontextrestored', onContextRestored)
    const updates = { map: updateMap, emblem: updateEmblem, words: updateWords }
    updatesRef.current = updates
    start()
    setReady(true)
    return () => {
      disposed = true
      if (updatesRef.current === updates) updatesRef.current = null
      cancelAnimationFrame(frame)
      observer.disconnect()
      resizer.disconnect()
      document.removeEventListener('visibilitychange', start)
      motionPreference.removeEventListener('change', onMediaPreference)
      window.removeEventListener(MOTION_PREFERENCE_EVENT, onMotionPreference)
      host.removeEventListener('pointermove', onMove)
      host.removeEventListener('pointerleave', onLeave)
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost)
      renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored)
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose()
          for (const material of Array.isArray(object.material) ? object.material : [object.material]) material.dispose()
        }
      })
      for (const texture of resources) texture.dispose()
      resources.clear()
      sun.shadow.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
      renderer.domElement.remove()
    }
  }, [])

  // 主题/文字变化只更新已有纹理，不销毁画布、灯光或动画时钟。
  useEffect(() => { updatesRef.current?.map(map) }, [map])
  useEffect(() => { updatesRef.current?.emblem(emblem) }, [emblem])
  useEffect(() => { updatesRef.current?.words(wordString) }, [wordString])

  return <div className="atlas-sculpture">
    {!ready && <AtlasRelief map={map} emblem={emblem} words={words} />}
    <div ref={hostRef} className={`atlas-sculpture-canvas ${ready ? 'is-ready' : ''}`} />
  </div>
}
