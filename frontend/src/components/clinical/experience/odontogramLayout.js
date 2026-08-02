const toothNames=['central incisor','lateral incisor','canine','first premolar','second premolar','first molar','second molar','third molar']
const MIDLINE_GAP=26
const CURVE_SAMPLES=400

const point=(start,control,end,t)=>{
 const inverse=1-t
 return {
  x:inverse*inverse*start.x+2*inverse*t*control.x+t*t*end.x,
  y:inverse*inverse*start.y+2*inverse*t*control.y+t*t*end.y,
 }
}

function equalDistancePoints(start,control,end,count=8){
 const samples=Array.from({length:CURVE_SAMPLES+1},(_,index)=>point(start,control,end,index/CURVE_SAMPLES))
 const lengths=[0]
 for(let index=1;index<samples.length;index++)lengths.push(lengths[index-1]+Math.hypot(samples[index].x-samples[index-1].x,samples[index].y-samples[index-1].y))
 const total=lengths[lengths.length-1]
 return Array.from({length:count},(_,index)=>{
  const target=total*(index/(count-1))
  let sampleIndex=lengths.findIndex(length=>length>=target)
  if(sampleIndex<1)sampleIndex=1
  const before=lengths[sampleIndex-1],after=lengths[sampleIndex],ratio=(target-before)/(after-before||1)
  return {
   x:samples[sampleIndex-1].x+(samples[sampleIndex].x-samples[sampleIndex-1].x)*ratio,
   y:samples[sampleIndex-1].y+(samples[sampleIndex].y-samples[sampleIndex-1].y)*ratio,
  }
 })
}

const curves={
 upperLeftScreen:equalDistancePoints({x:500-MIDLINE_GAP,y:135},{x:270,y:136},{x:55,y:185}),
 upperRightScreen:equalDistancePoints({x:500+MIDLINE_GAP,y:135},{x:730,y:136},{x:945,y:185}),
 lowerLeftScreen:equalDistancePoints({x:500-MIDLINE_GAP,y:325},{x:270,y:324},{x:55,y:275}),
 lowerRightScreen:equalDistancePoints({x:500+MIDLINE_GAP,y:325},{x:730,y:324},{x:945,y:275}),
}

function quadrant({name,prefix,arch,screenSide,fdiBase,curve,rotationSign}){
 return curve.map((position,index)=>{
  const number=index+1
  const rotation=rotationSign*(24*Math.sin((index/7)*Math.PI/2))
  return {
   code:`${prefix}${number}`,
   fdi:fdiBase+number,
   arch,
   quadrant:name,
   screenSide,
   indexFromMidline:index,
   x:Number(position.x.toFixed(2)),
   y:Number(position.y.toFixed(2)),
   rotation:Number(rotation.toFixed(2)),
   labelY:Number((arch==='upper'?position.y-43:position.y+55).toFixed(2)),
   zIndex:8-index,
   accessibleName:`${arch==='upper'?'Upper':'Lower'} ${name.endsWith('Right')?'right':'left'} ${toothNames[index]}, ${prefix}${number}, FDI ${fdiBase+number}`,
  }
 })
}

export const upperRight=quadrant({name:'upperRight',prefix:'UR',arch:'upper',screenSide:'left',fdiBase:10,curve:curves.upperLeftScreen,rotationSign:-1})
export const upperLeft=quadrant({name:'upperLeft',prefix:'UL',arch:'upper',screenSide:'right',fdiBase:20,curve:curves.upperRightScreen,rotationSign:1})
export const lowerRight=quadrant({name:'lowerRight',prefix:'LR',arch:'lower',screenSide:'left',fdiBase:40,curve:curves.lowerLeftScreen,rotationSign:1})
export const lowerLeft=quadrant({name:'lowerLeft',prefix:'LL',arch:'lower',screenSide:'right',fdiBase:30,curve:curves.lowerRightScreen,rotationSign:-1})

export const UPPER_LAYOUT=[...upperRight].reverse().concat(upperLeft)
export const LOWER_LAYOUT=[...lowerRight].reverse().concat(lowerLeft)
export const ODONTOGRAM_LAYOUT=[...UPPER_LAYOUT,...LOWER_LAYOUT]

export function validateOdontogramLayout(layout=ODONTOGRAM_LAYOUT){
 const errors=[],codes=new Set(layout.map(t=>t.code)),fdis=new Set(layout.map(t=>t.fdi))
 if(layout.length!==32)errors.push('Exactly 32 permanent teeth are required.')
 if(codes.size!==32)errors.push('Tooth codes must be unique.')
 if(fdis.size!==32)errors.push('FDI values must be unique.')
 const rules=[
  ['upperRight','UR','upper','left'],['upperLeft','UL','upper','right'],
  ['lowerRight','LR','lower','left'],['lowerLeft','LL','lower','right'],
 ]
 for(const [name,prefix,arch,side] of rules){
  const teeth=layout.filter(t=>t.quadrant===name)
  if(teeth.length!==8)errors.push(`${name} must contain 8 teeth.`)
  if(teeth.some(t=>!t.code.startsWith(prefix)||t.arch!==arch||t.screenSide!==side))errors.push(`${name} metadata is invalid.`)
  const byMidline=[...teeth].sort((a,b)=>a.indexFromMidline-b.indexFromMidline)
  if(byMidline.some((t,index)=>t.code!==`${prefix}${index+1}`))errors.push(`${name} midline order is invalid.`)
 }
 if(UPPER_LAYOUT.map(t=>t.code).join(' ')!=='UR8 UR7 UR6 UR5 UR4 UR3 UR2 UR1 UL1 UL2 UL3 UL4 UL5 UL6 UL7 UL8')errors.push('Upper order is invalid.')
 if(LOWER_LAYOUT.map(t=>t.code).join(' ')!=='LR8 LR7 LR6 LR5 LR4 LR3 LR2 LR1 LL1 LL2 LL3 LL4 LL5 LL6 LL7 LL8')errors.push('Lower order is invalid.')
 return {valid:errors.length===0,errors}
}

export const TOOTH_NUMBER=Object.fromEntries(ODONTOGRAM_LAYOUT.map(t=>[t.code,t.fdi]))
export {curves,equalDistancePoints}
