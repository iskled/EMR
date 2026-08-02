import {useEffect,useRef,useState} from 'react'
import {conditionStyle,LEGEND_CONDITIONS} from './odontogramConditionStyles'

export default function OdontogramLegend(){
 const [open,setOpen]=useState(false),panel=useRef(null)
 useEffect(()=>{
  if(!open)return
  const close=event=>{if(event.key==='Escape')setOpen(false)}
  document.addEventListener('keydown',close)
  panel.current?.focus()
  return()=>document.removeEventListener('keydown',close)
 },[open])
 return <div className="relative">
  <button type="button" aria-haspopup="dialog" aria-expanded={open} onClick={()=>setOpen(value=>!value)} className="grid min-h-11 place-items-center rounded-full bg-white px-4 text-sm font-semibold text-slate-700">Legend</button>
  {open&&<div ref={panel} role="dialog" aria-label="Odontogram legend" tabIndex="-1" className="absolute right-0 z-20 mt-2 max-h-[70vh] w-72 overflow-auto rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-xl outline-none">
   <div className="mb-3 flex items-center justify-between"><h2 className="font-bold text-slate-900">Chart colours</h2><button type="button" aria-label="Close legend" onClick={()=>setOpen(false)} className="grid h-9 w-9 place-items-center rounded-full text-lg text-slate-600 hover:bg-slate-100">×</button></div>
   <ul className="space-y-2">{LEGEND_CONDITIONS.map(value=>{const style=conditionStyle(value);return <li key={value} data-legend-condition={value} className="flex items-center gap-3">
    <span aria-hidden="true" className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-xs font-black text-slate-950" style={{backgroundColor:style.color,border:`2px ${style.dash?'dashed':'solid'} ${style.stroke}`}}>{style.symbol}</span>
    <span><span className="font-semibold text-slate-800">{style.label}</span><span className="block text-xs text-slate-500">{style.description}</span></span>
   </li>})}</ul>
  </div>}
 </div>
}
