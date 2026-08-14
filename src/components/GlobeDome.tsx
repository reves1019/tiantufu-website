interface GlobeDomeProps {
  className?: string
}

/**
 * 首页星球穹顶：复古地图贴面 + 60s 慢自转。
 * 边缘经径向遮罩羽化、渐隐入纯黑背景，带红色大气光晕（深空星球感）。
 */
export default function GlobeDome({ className = '' }: GlobeDomeProps) {
  return (
    <div aria-hidden="true" className={`pointer-events-none absolute left-1/2 -translate-x-1/2 ${className}`}>
      {/* 大气光晕：边缘弥散，淡入背景 */}
      <div className="absolute -inset-[12%] rounded-full bg-[radial-gradient(circle,rgba(199,27,27,0.17)_0%,rgba(199,27,27,0.05)_42%,transparent_64%)] blur-2xl" />
      <div className="absolute -inset-[28%] rounded-full bg-[radial-gradient(circle,rgba(201,161,90,0.07)_0%,transparent_55%)] blur-3xl" />

      {/* 球面主体：径向遮罩让边缘逐渐淡入背景 */}
      <div className="relative aspect-square w-full [-webkit-mask-image:radial-gradient(circle_at_50%_42%,black_54%,transparent_80%)] [mask-image:radial-gradient(circle_at_50%_42%,black_54%,transparent_80%)]">
        {/* 球面纹理：两张复古世界地图拼接，横向滚动模拟自转 */}
        <div className="globe-rotate absolute inset-y-0 left-0 flex w-[200%]">
          <img src="maps/map-01.jpg" alt="" className="h-full w-1/2 object-cover" />
          <img src="maps/map-01.jpg" alt="" className="h-full w-1/2 object-cover" />
        </div>
        {/* 顶部高光（图1：光源在正上方） */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_16%,rgba(240,225,200,0.3)_0%,rgba(240,225,200,0.06)_36%,transparent_50%)]" />
        {/* 边缘暗化，塑造球体体积感 */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_44%,transparent_46%,rgba(0,0,0,0.66)_76%,rgba(0,0,0,0.92)_100%)]" />
        {/* 底部融入纯黑 */}
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_48%,rgba(0,0,0,0.82)_88%,#000_100%)]" />
      </div>
    </div>
  )
}
