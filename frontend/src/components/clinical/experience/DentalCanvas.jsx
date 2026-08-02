import {LOWER_LAYOUT,ODONTOGRAM_LAYOUT,TOOTH_NUMBER,UPPER_LAYOUT,validateOdontogramLayout} from './odontogramLayout'
import {conditionStyle,findingSummary,surfaceStyle} from './odontogramConditionStyles'
const surfaceNames={B:'buccal',M:'mesial',O:'occlusal',D:'distal',L:'lingual'}

function Tooth({ layout, record, selectedTeeth, selectedSurface, onTooth, onSurface, showFindings }) {
  const {code}=layout,selected=selectedTeeth.includes(code)
  const overall=conditionStyle(showFindings?record?.condition:'healthy')
  const surfaces=record?.surface_conditions||{}
  const accessibleLabel=`${layout.accessibleName}, ${findingSummary(record)}${selected?', selected':''}`
  const paths={B:'M-18 -25 Q0 -34 18 -25 L12 -10 Q0 -14 -12 -10Z',M:'M-23 -20L-12 -10Q-16 0 -12 10L-23 20Q-31 0 -23 -20Z',O:'M-12 -10Q0 -14 12 -10Q16 0 12 10Q0 14 -12 10Q-16 0 -12 -10Z',D:'M23 -20Q31 0 23 20L12 10Q16 0 12 -10Z',L:'M-18 25L-12 10Q0 14 12 10L18 25Q0 34 -18 25Z'}
  return (
    <g data-tooth={code} data-fdi={layout.fdi} data-arch={layout.arch} data-screen-side={layout.screenSide} data-quadrant={layout.quadrant} transform={`translate(${layout.x} ${layout.y})`}>
     <g transform={`rotate(${layout.rotation}) scale(.62)`}>
      {selected&&<path data-selected-ring={code} d="M-29 -34 Q0 -51 29 -34 Q41 -3 31 34 Q18 51 0 57 Q-18 51 -31 34 Q-41 -3 -29 -34Z" fill="none" stroke="#0369a1" strokeWidth="4" vectorEffect="non-scaling-stroke"/>}
      <path d="M-24 -28 Q0 -43 24 -28 Q34 -3 25 28 Q15 43 0 48 Q-15 43 -25 28 Q-34 -3 -24 -28Z"
        data-tooth-body={code} fill={overall.color} fillOpacity={record?.condition&&record.condition!=='healthy'?.28:1} stroke={overall.stroke} strokeWidth="1.8"
        strokeDasharray={overall.dash} vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none"/>
      {Object.entries(paths).map(([surface,d])=><path key={surface} d={d}
        data-surface={surface} data-finding={surfaces[surface]||'sound'}
        fill={showFindings?surfaceStyle(surfaces[surface]).color:'#ffffff'} stroke={selectedSurface?.tooth===code&&selectedSurface.surface===surface?'#075985':'#64748b'}
        strokeWidth={selectedSurface?.tooth===code&&selectedSurface.surface===surface?3:1.25}
        vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round"
        className="cursor-pointer outline-none focus:stroke-fuchsia-700 focus:[stroke-width:3]" role="button" tabIndex="0"
        aria-label={`${layout.accessibleName}, ${surfaceNames[surface]} surface`} aria-pressed={selectedSurface?.tooth===code&&selectedSurface.surface===surface}
        onClick={e=>{e.stopPropagation();onSurface({tooth:code,surface})}}
        onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();onSurface({tooth:code,surface})}}}/>)}
      {showFindings&&overall.symbol&&<text data-condition-symbol={record?.condition||'healthy'} x="0" y="7" textAnchor="middle" className="pointer-events-none fill-slate-950 text-[20px] font-black">{overall.symbol}</text>}
     </g>
      <rect x="-25" y={layout.labelY-layout.y-15} width="50" height="22" rx="11" fill="transparent"
        className="cursor-pointer stroke-transparent transition hover:fill-cyan-50/60 hover:stroke-cyan-700 focus:stroke-fuchsia-700 focus:[stroke-width:2px] focus:outline-none"
        role="button" tabIndex="0" aria-label={accessibleLabel} aria-pressed={selected}
        onClick={event=>onTooth(code,{ctrlKey:event.ctrlKey,metaKey:event.metaKey,shiftKey:event.shiftKey})}
        onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();onTooth(code,{ctrlKey:event.ctrlKey,metaKey:event.metaKey,shiftKey:event.shiftKey})}}}/>
      <text data-tooth-label={code} y={layout.labelY-layout.y} textAnchor="middle" className={`pointer-events-none text-[12px] ${selected?'fill-sky-800 font-black':'fill-slate-800 font-bold'}`}>{code}</text>
    </g>
  )
}

export default function DentalCanvas({ chart, selectedTeeth=[], selectedSurface, onTooth, onSurface, showFindings }) {
  const teeth=chart?.results?.[0]?.teeth||[]
  const validation=validateOdontogramLayout()
  if(!validation.valid)return <div role="alert" className="rounded-2xl bg-red-50 p-6 font-semibold text-red-800">Odontogram configuration is invalid. The chart has been hidden for clinical safety.</div>
  const record=code=>teeth.find(item=>item.tooth_number===TOOTH_NUMBER[code])
  return (
    <div className="overflow-x-auto rounded-[2rem] bg-white p-3 shadow-[0_24px_70px_-40px_rgba(15,23,42,.35)] sm:p-5">
      <svg viewBox="0 0 1000 460" fill="none" shapeRendering="geometricPrecision" className="w-full min-w-[780px] 2xl:min-w-0" aria-label="Interactive adult odontogram">
        <line x1="500" y1="82" x2="500" y2="378" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 9"/>
        {UPPER_LAYOUT.map(layout=><Tooth key={layout.code} layout={layout} record={record(layout.code)} {...{selectedTeeth,selectedSurface,onTooth,onSurface,showFindings}}/>)}
        {LOWER_LAYOUT.map(layout=><Tooth key={layout.code} layout={layout} record={record(layout.code)} {...{selectedTeeth,selectedSurface,onTooth,onSurface,showFindings}}/>)}
      </svg>
    </div>
  )
}

export { TOOTH_NUMBER as toothNumber,ODONTOGRAM_LAYOUT }
