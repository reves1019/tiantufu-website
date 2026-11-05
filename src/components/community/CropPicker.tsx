import { useRef } from 'react'
import type { Crop } from '../../lib/community'
import { normalizeCrop } from '../../lib/palaceModel'
export default function CropPicker({src,title,crop,onChange,onAspect}:{src:string;title:string;crop:Crop|null;onChange:(crop:Crop|null)=>void;onAspect:(ratio:number)=>void}) {
  const start=useRef<{x:number;y:number}|null>(null)
  return <div className="palace-crop-picker" aria-label="在地图上拖动，框选摘取范围" onPointerDown={e=>{ if(e.button!==0)return; const r=e.currentTarget.getBoundingClientRect(); start.current={x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height};e.currentTarget.setPointerCapture(e.pointerId) }} onPointerMove={e=>{if(!start.current)return;const r=e.currentTarget.getBoundingClientRect();onChange(normalizeCrop(start.current,{x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height}))}} onPointerUp={()=>{start.current=null}} onPointerCancel={()=>{start.current=null}}>
    <img src={src} alt={title} draggable={false} onLoad={e=>onAspect(e.currentTarget.naturalWidth/e.currentTarget.naturalHeight)}/>{crop&&<span style={{left:`${crop.x*100}%`,top:`${crop.y*100}%`,width:`${crop.w*100}%`,height:`${crop.h*100}%`}}/>}
  </div>
}
