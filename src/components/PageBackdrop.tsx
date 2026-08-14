import MapSlideshow from './MapSlideshow'
import NoiseField from './NoiseField'

/** 全局复古地图背景：历史地图移动效果 + 复古未来质感（深空紫底调、霓虹微光、噪点） */
export default function PageBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <MapSlideshow />
      {/* 复古未来：深空紫底调 */}
      <div className="absolute inset-0 z-[2] bg-[radial-gradient(ellipse_at_50%_30%,rgba(58,50,69,0.4)_0%,rgba(20,16,26,0.55)_55%,rgba(7,9,13,0.88)_100%)]" />
      {/* 霓虹红/粉微光 */}
      <div className="absolute inset-0 z-[2] bg-[radial-gradient(ellipse_at_18%_88%,rgba(255,143,163,0.09)_0%,transparent_46%)]" />
      {/* 可读性遮罩 */}
      <div className="absolute inset-0 z-[2] bg-gradient-to-b from-ink-950/90 via-ink-950/65 to-ink-950/95" />
      <div className="absolute inset-0 z-[2] bg-[radial-gradient(ellipse_at_center,rgba(7,9,13,0.35)_0%,rgba(7,9,13,0.8)_100%)]" />
      {/* 噪点颗粒（复古未来胶片感） */}
      <div className="grain-overlay absolute inset-0 z-[3]" />
      {/* 动态噪点/尘埃背景（视频中的 WebGL Noise 轻量版） */}
      <NoiseField />
    </div>
  )
}
