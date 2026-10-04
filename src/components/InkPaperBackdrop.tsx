import { useId } from 'react'

/** 静态淡墨与品牌拓印：不参与文字帘的逐帧渲染，不拦截点击。 */
export default function InkPaperBackdrop({ emblem }: { emblem: string }) {
  const id = useId().replace(/:/g, '')
  return (
    <div className="atlas-ink-paper" aria-hidden="true">
      <svg className="atlas-ink-landscape" viewBox="0 0 1700 1000" preserveAspectRatio="none">
        <defs>
          <filter id={`${id}-wash`} x="-15%" y="-30%" width="130%" height="160%">
            <feTurbulence type="fractalNoise" baseFrequency=".013 .04" numOctaves="3" seed="17" result="fiber" />
            <feDisplacementMap in="SourceGraphic" in2="fiber" scale="24" xChannelSelector="R" yChannelSelector="G" />
            <feGaussianBlur stdDeviation="3" />
          </filter>
          <filter id={`${id}-dry`} x="-10%" y="-20%" width="120%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency=".08 .15" numOctaves="2" seed="8" result="grain" />
            <feDisplacementMap in="SourceGraphic" in2="grain" scale="9" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
        <g fill="#574d3e" filter={`url(#${id}-wash)`}>
          <path opacity=".075" d="M-80 170 Q45 115 110 146 T233 129 Q310 112 369 159 Q434 194 510 165 Q573 142 650 177 L700 202 Q396 231 215 207 T-80 240Z" />
          <path opacity=".055" d="M1130 390 Q1190 365 1229 301 L1296 349 L1344 269 Q1399 317 1437 323 L1483 242 Q1527 291 1578 284 L1673 205 L1770 287 L1780 438 Q1560 401 1360 435Z" />
          <path opacity=".08" d="M-60 960 Q53 913 107 934 Q171 865 247 928 Q301 910 355 943 Q440 924 506 978 L580 1050 L-60 1050Z" />
          <path opacity=".05" d="M1000 1008 Q1104 951 1198 985 Q1317 914 1425 951 Q1510 929 1580 962 L1720 912 L1780 1050Z" />
        </g>
        <g fill="none" stroke="#62543f" strokeLinecap="round" filter={`url(#${id}-dry)`}>
          <path opacity=".12" strokeWidth="1.3" d="M1175 399 Q1215 381 1230 336 M1290 392 L1342 306 L1373 353 M1435 390 L1480 285 L1513 328 M1550 367 L1670 242" />
          <path opacity=".08" strokeWidth="2" d="M-40 199 Q148 167 268 188 T514 190 M1071 986 Q1239 969 1386 995 T1718 976" />
          <path opacity=".1" strokeWidth="1" d="M20 955 Q80 948 120 965 M189 947 Q225 956 283 947 M1440 984 Q1493 973 1558 983" />
        </g>
      </svg>
      <svg className="atlas-ink-emblem" viewBox="0 0 1200 1200">
        <defs>
          <filter id={`${id}-imprint`} x="-5%" y="-5%" width="110%" height="110%">
            <feColorMatrix type="matrix" values="0 0 0 0 .32  0 0 0 0 .25  0 0 0 0 .19  0 0 0 1 0" result="ink" />
            <feTurbulence type="fractalNoise" baseFrequency=".045" numOctaves="3" seed="23" result="grain" />
            <feDisplacementMap in="ink" in2="grain" scale="5" xChannelSelector="R" yChannelSelector="G" result="edge" />
            <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  .4 .4 .4 0 0" result="grainAlpha" />
            <feComposite in="edge" in2="grainAlpha" operator="in" />
          </filter>
        </defs>
        <image href={emblem} width="1200" height="1200" preserveAspectRatio="xMidYMid meet" filter={`url(#${id}-imprint)`} />
      </svg>
    </div>
  )
}
