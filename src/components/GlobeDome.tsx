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
        {/* 纯装饰等高线，借鉴参考页的浮雕地图语言，不表示真实地形数据。 */}
        <svg
          aria-hidden="true"
          viewBox="0 0 1000 1000"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 h-full w-full mix-blend-screen"
          style={{ opacity: 0.24 }}
        >
          <g fill="none" stroke="#ead8b3" strokeWidth="1.15">
            <path d="M88 531c70-21 78-90 155-108 67-15 98 26 157 16 62-10 75-71 144-86 73-16 113 33 187 16 67-15 90-65 177-76" />
            <path d="M81 550c78-19 90-91 164-108 65-15 97 26 155 16 63-11 78-70 147-84 70-14 111 33 184 16 70-16 93-65 184-75" />
            <path d="M73 570c86-17 102-91 173-107 64-14 96 26 154 15 65-11 80-70 149-83 68-13 109 33 181 16 74-17 98-65 192-74" />
            <path d="M64 590c94-16 115-91 182-106 63-14 95 26 153 15 66-12 83-70 151-82 66-12 107 33 178 15 77-18 103-65 201-73" />
            <path d="M57 611c103-14 128-91 191-105 62-14 94 26 151 14 68-12 85-69 153-80 64-11 105 32 175 15 81-19 108-65 209-72" />
            <path d="M48 633c112-13 142-91 200-104 61-13 93 26 150 14 69-13 88-69 155-79 62-10 103 32 172 14 84-20 113-65 218-71" />
            <path d="M117 453c60-25 79-90 148-111 55-17 91 3 124-20 39-26 46-77 104-94 61-18 93 18 145 2 48-15 68-58 139-70" />
            <path d="M127 435c57-25 78-88 143-108 52-16 88 3 121-20 40-27 49-76 105-92 58-17 89 18 140 2 50-15 71-57 143-69" />
            <path d="M138 417c53-24 76-86 137-105 49-16 85 3 118-20 41-27 51-75 105-90 55-15 86 18 135 2 52-16 74-57 149-68" />
            <path d="M680 668c49-24 84-19 120-4 36 16 59 13 94-9" stroke="#c71b1b" strokeOpacity=".6" />
          </g>
        </svg>
        {/* 边缘暗化，塑造球体体积感 */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_44%,transparent_46%,rgba(0,0,0,0.66)_76%,rgba(0,0,0,0.92)_100%)]" />
        {/* 底部融入纯黑 */}
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_48%,rgba(0,0,0,0.82)_88%,#000_100%)]" />
      </div>
    </div>
  )
}
