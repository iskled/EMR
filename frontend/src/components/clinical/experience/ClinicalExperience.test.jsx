import {fireEvent,render,screen,waitFor} from '@testing-library/react'
import {describe,expect,it,vi} from 'vitest'
import ExperienceNav from './ExperienceNav'
import DentalCanvas from './DentalCanvas'
import FindingInspector from './FindingInspector'
import OdontogramLegend from './OdontogramLegend'
import {updateTooth} from '../../../services/toothChartService'
import {LOWER_LAYOUT,ODONTOGRAM_LAYOUT,TOOTH_NUMBER,UPPER_LAYOUT,lowerLeft,lowerRight,upperLeft,upperRight,validateOdontogramLayout} from './odontogramLayout'
import {conditionStyle,LEGEND_CONDITIONS,surfaceStyle} from './odontogramConditionStyles'

vi.mock('../../../services/toothChartService',()=>({updateTooth:vi.fn()}))

const chart={results:[{teeth:[{tooth_number:18,condition:'caries',surface_conditions:{O:'watch'}},{tooth_number:48,condition:'filled',surface_conditions:{B:'filled_composite'}}]}]}
const frozenLayout='UR8:55:185:-24:0.62|UR7:114.07:172.4:-23.4:0.62|UR6:173.48:161.5:-21.62:0.62|UR5:233.19:152.37:-18.76:0.62|UR4:293.15:145.09:-14.96:0.62|UR3:353.31:139.72:-10.41:0.62|UR2:413.61:136.34:-5.34:0.62|UR1:474:135:0:0.62|UL1:526:135:0:0.62|UL2:586.39:136.34:5.34:0.62|UL3:646.69:139.72:10.41:0.62|UL4:706.85:145.09:14.96:0.62|UL5:766.81:152.37:18.76:0.62|UL6:826.52:161.5:21.62:0.62|UL7:885.93:172.4:23.4:0.62|UL8:945:185:24:0.62|LR8:55:275:24:0.62|LR7:114.07:287.6:23.4:0.62|LR6:173.48:298.5:21.62:0.62|LR5:233.19:307.63:18.76:0.62|LR4:293.15:314.91:14.96:0.62|LR3:353.31:320.28:10.41:0.62|LR2:413.61:323.66:5.34:0.62|LR1:474:325:0:0.62|LL1:526:325:0:0.62|LL2:586.39:323.66:-5.34:0.62|LL3:646.69:320.28:-10.41:0.62|LL4:706.85:314.91:-14.96:0.62|LL5:766.81:307.63:-18.76:0.62|LL6:826.52:298.5:-21.62:0.62|LL7:885.93:287.6:-23.4:0.62|LL8:945:275:-24:0.62'

describe('replacement clinical experience',()=>{
 it('renders the clinical navigation in required order',()=>{
  render(<ExperienceNav active="chart" onChange={vi.fn()}/>)
  expect(screen.getAllByRole('button').map(button=>button.textContent)).toEqual(['Overview','Chart','Clinical Note','Recall','Images','Timeline'])
 })

 it('validates unique permanent tooth and FDI identities',()=>{
  expect(validateOdontogramLayout()).toEqual({valid:true,errors:[]})
  expect(ODONTOGRAM_LAYOUT).toHaveLength(32)
  expect(new Set(ODONTOGRAM_LAYOUT.map(t=>t.code))).toHaveProperty('size',32)
  expect(new Set(ODONTOGRAM_LAYOUT.map(t=>t.fdi))).toHaveProperty('size',32)
  expect(new Set(ODONTOGRAM_LAYOUT.map(t=>t.fdi))).toEqual(new Set([...Array(8)].map((_,i)=>11+i).concat([...Array(8)].map((_,i)=>21+i),[...Array(8)].map((_,i)=>31+i),[...Array(8)].map((_,i)=>41+i))))
 })

 it('keeps each explicit quadrant in its authoritative arch and screen side',()=>{
  expect(upperRight.every(t=>t.code.startsWith('UR')&&t.arch==='upper'&&t.screenSide==='left')).toBe(true)
  expect(upperLeft.every(t=>t.code.startsWith('UL')&&t.arch==='upper'&&t.screenSide==='right')).toBe(true)
  expect(lowerRight.every(t=>t.code.startsWith('LR')&&t.arch==='lower'&&t.screenSide==='left')).toBe(true)
  expect(lowerLeft.every(t=>t.code.startsWith('LL')&&t.arch==='lower'&&t.screenSide==='right')).toBe(true)
  expect([upperRight,upperLeft,lowerLeft,lowerRight].every(q=>q.length===8)).toBe(true)
 })

 it('uses authoritative screen order and matching FDI values',()=>{
  expect(UPPER_LAYOUT.map(t=>t.code)).toEqual(['UR8','UR7','UR6','UR5','UR4','UR3','UR2','UR1','UL1','UL2','UL3','UL4','UL5','UL6','UL7','UL8'])
  expect(LOWER_LAYOUT.map(t=>t.code)).toEqual(['LR8','LR7','LR6','LR5','LR4','LR3','LR2','LR1','LL1','LL2','LL3','LL4','LL5','LL6','LL7','LL8'])
  expect(UPPER_LAYOUT.map(t=>t.fdi)).toEqual([18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28])
  expect(LOWER_LAYOUT.map(t=>t.fdi)).toEqual([48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38])
  expect(ODONTOGRAM_LAYOUT.every(t=>TOOTH_NUMBER[t.code]===t.fdi)).toBe(true)
 })

 it('freezes every approved coordinate, rotation and scale',()=>{
  expect(ODONTOGRAM_LAYOUT.map(t=>[t.code,t.x,t.y,t.rotation,.62].join(':')).join('|')).toBe(frozenLayout)
 })

 it('places incisors nearest the midline with upper and lower curves forming an open oral cavity',()=>{
  for(const quadrant of [upperRight,upperLeft,lowerLeft,lowerRight]){
   const sorted=[...quadrant].sort((a,b)=>a.indexFromMidline-b.indexFromMidline)
   expect(Math.abs(sorted[0].x-500)).toBeLessThan(Math.abs(sorted[7].x-500))
  }
 expect(Math.max(...UPPER_LAYOUT.map(t=>t.y))).toBeLessThan(Math.min(...LOWER_LAYOUT.map(t=>t.y)))
  expect(upperRight[0].y).toBeLessThan(upperRight[7].y)
  expect(lowerRight[0].y).toBeGreaterThan(lowerRight[7].y)
 })

 it('generates uniformly spaced and perfectly symmetrical quadrant curves',()=>{
  for(const quadrant of [upperRight,upperLeft,lowerRight,lowerLeft]){
   const distances=quadrant.slice(1).map((tooth,index)=>Math.hypot(tooth.x-quadrant[index].x,tooth.y-quadrant[index].y))
   expect(Math.max(...distances)-Math.min(...distances)).toBeLessThan(.2)
  }
  for(let index=0;index<8;index++){
   expect(upperRight[index].x+upperLeft[index].x).toBeCloseTo(1000,1)
   expect(upperRight[index].y).toBeCloseTo(upperLeft[index].y,1)
   expect(lowerRight[index].x+lowerLeft[index].x).toBeCloseTo(1000,1)
   expect(lowerRight[index].y).toBeCloseTo(lowerLeft[index].y,1)
  }
 })

 it('renders stable findings and emits tooth codes rather than layout indexes',()=>{
  const onTooth=vi.fn(),onSurface=vi.fn()
  const {container}=render(<DentalCanvas chart={chart} selectedTeeth={[]} selectedSurface={null} onTooth={onTooth} onSurface={onSurface} showFindings/>)
  expect(screen.queryByTestId('oral-cavity')).not.toBeInTheDocument()
  expect(container.querySelector('svg')).toHaveAttribute('fill','none')
  expect(container.querySelectorAll('[data-tooth]')).toHaveLength(32)
  expect(container.querySelectorAll('[data-arch="upper"]')).toHaveLength(16)
  expect(container.querySelectorAll('[data-arch="lower"]')).toHaveLength(16)
  expect(container.querySelector('[data-tooth="UR8"]')).toHaveAttribute('data-fdi','18')
  expect(container.querySelector('[data-tooth="LR8"]')).toHaveAttribute('data-fdi','48')
  fireEvent.click(container.querySelector('[data-tooth="LR4"] rect[role="button"]'))
  expect(onTooth).toHaveBeenCalledWith('LR4',{ctrlKey:false,metaKey:false,shiftKey:false})
  fireEvent.keyDown(screen.getByRole('button',{name:'Lower right first premolar, LR4, FDI 44, occlusal surface'}),{key:'Enter'})
  expect(onSurface).toHaveBeenCalledWith({tooth:'LR4',surface:'O'})
 })

 it('highlights every selected tooth and forwards modifier keys',()=>{
  const onTooth=vi.fn()
  render(<DentalCanvas chart={chart} selectedTeeth={['UR6','UL6']} selectedSurface={null} onTooth={onTooth} onSurface={vi.fn()} showFindings/>)
  expect(screen.getByRole('button',{name:/Upper right first molar, UR6, FDI 16,.*selected/})).toHaveAttribute('aria-pressed','true')
  expect(screen.getByRole('button',{name:/Upper left first molar, UL6, FDI 26,.*selected/})).toHaveAttribute('aria-pressed','true')
  expect(document.querySelectorAll('[data-selected-ring]')).toHaveLength(2)
  fireEvent.click(document.querySelector('[data-tooth="UL5"] rect[role="button"]'),{ctrlKey:true})
  expect(onTooth).toHaveBeenCalledWith('UL5',{ctrlKey:true,metaKey:false,shiftKey:false})
 })

 it('uses high-contrast defaults, preserves selected surface findings and falls back safely',()=>{
  const legacy={results:[{teeth:[{tooth_number:16,condition:'legacy_code',surface_conditions:{O:'caries'}}]}]}
  const {container}=render(<DentalCanvas chart={legacy} selectedTeeth={['UR6']} selectedSurface={{tooth:'UR6',surface:'O'}} onTooth={vi.fn()} onSurface={vi.fn()} showFindings/>)
  expect(container.querySelector('[data-tooth-body="UR7"]')).toHaveAttribute('stroke',conditionStyle('healthy').stroke)
  expect(container.querySelector('[data-tooth-body="UR6"]')).toHaveAttribute('stroke',conditionStyle('legacy_code').stroke)
  const selectedFinding=container.querySelector('[data-tooth="UR6"] [data-surface="O"]')
  expect(selectedFinding).toHaveAttribute('fill',surfaceStyle('caries').color)
  expect(selectedFinding).toHaveAttribute('stroke','#075985')
 })

 it('shows matching coloured legend entries, closes by button and Escape',()=>{
  const {container}=render(<OdontogramLegend/>)
  fireEvent.click(screen.getByRole('button',{name:'Legend'}))
  expect(screen.getByRole('dialog',{name:'Odontogram legend'})).toBeInTheDocument()
  expect(container.querySelectorAll('[data-legend-condition]')).toHaveLength(LEGEND_CONDITIONS.length)
  for(const value of LEGEND_CONDITIONS)expect(container.querySelector(`[data-legend-condition="${value}"] span`).style.backgroundColor).toBeTruthy()
  expect(container.querySelector('[data-legend-condition="missing"] span')).toHaveTextContent('×')
  expect(container.querySelector('[data-legend-condition="extracted"] span')).toHaveTextContent('×')
  fireEvent.keyDown(document,{key:'Escape'})
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button',{name:'Legend'}))
  fireEvent.click(screen.getByRole('button',{name:'Close legend'}))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
 })

 it('previews and confirms one safe update per selected tooth',async()=>{
  updateTooth.mockResolvedValue({})
  const selectedData=[
   {tooth_number:16,condition:'healthy',surface_conditions:{B:'sound'}},
   {tooth_number:15,condition:'healthy',surface_conditions:{O:'watch'}},
  ]
  render(<FindingInspector selection={['UR6','UR5']} toothData={selectedData[1]} selectedData={selectedData} chartId="chart-1" onSaved={vi.fn()} onClear={vi.fn()}/>)
  expect(screen.getByText('Selected: 2 teeth')).toBeInTheDocument()
  fireEvent.change(screen.getByLabelText('Bulk condition'),{target:{value:'crown'}})
  fireEvent.click(screen.getByRole('button',{name:'Apply to 2 teeth'}))
  expect(screen.getByText('Confirm bulk update')).toBeInTheDocument()
  expect(updateTooth).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button',{name:'Confirm — Apply to 2 teeth'}))
  await waitFor(()=>expect(updateTooth).toHaveBeenCalledTimes(2))
  expect(updateTooth).toHaveBeenNthCalledWith(1,'chart-1',16,{condition:'crown'})
  expect(updateTooth).toHaveBeenNthCalledWith(2,'chart-1',15,{condition:'crown'})
 })
})
