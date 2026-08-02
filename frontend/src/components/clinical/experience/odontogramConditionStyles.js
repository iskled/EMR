export const ODONTOGRAM_CONDITION_STYLES={
 healthy:{label:'Healthy / Sound',color:'#ffffff',stroke:'#64748b',symbol:'',description:'No recorded finding'},
 caries:{label:'Caries / Decay',color:'#ef6b63',stroke:'#b42318',symbol:'',description:'Active decay'},
 filled:{label:'Existing restoration',color:'#4f8edc',stroke:'#1d4ed8',symbol:'',description:'Restored tooth'},
 crown:{label:'Crown',color:'#f3bd4f',stroke:'#a16207',symbol:'',description:'Crowned tooth'},
 missing:{label:'Missing',color:'#e2e8f0',stroke:'#64748b',symbol:'×',dash:'5 3',description:'Tooth is absent'},
 implant:{label:'Implant',color:'#3bb8aa',stroke:'#0f766e',symbol:'●',description:'Dental implant'},
 bridge_anchor:{label:'Bridge abutment',color:'#818cf8',stroke:'#4338ca',symbol:'B',description:'Bridge supporting tooth'},
 bridge_pontic:{label:'Bridge pontic',color:'#a5b4fc',stroke:'#4338ca',symbol:'B',description:'Bridge replacement tooth'},
 rct:{label:'Root canal treated',color:'#a78bda',stroke:'#6d28d9',symbol:'R',description:'Endodontically treated'},
 fractured:{label:'Fracture',color:'#f59e62',stroke:'#c2410c',symbol:'!',description:'Fracture recorded'},
 impacted:{label:'Impacted',color:'#b7a3d6',stroke:'#6b21a8',symbol:'I',description:'Impacted tooth'},
 extracted:{label:'Extraction indicated',color:'#fee2e2',stroke:'#b91c1c',symbol:'×',dash:'3 2',description:'Extraction recorded'},
 watch:{label:'Review required',color:'#c4b5db',stroke:'#6b21a8',symbol:'?',description:'Monitor or review'},
 unknown:{label:'Other / legacy finding',color:'#ddd6e8',stroke:'#67556f',symbol:'?',dash:'2 2',description:'Unrecognised historical condition'},
}

export const ODONTOGRAM_SURFACE_STYLES={
 sound:ODONTOGRAM_CONDITION_STYLES.healthy,
 caries:ODONTOGRAM_CONDITION_STYLES.caries,
 filled_composite:ODONTOGRAM_CONDITION_STYLES.filled,
 filled_amalgam:{label:'Amalgam restoration',color:'#94a3b8',stroke:'#475569'},
 filled_ceramic:{label:'Ceramic restoration',color:'#8b7bc8',stroke:'#5b21b6'},
 watch:ODONTOGRAM_CONDITION_STYLES.watch,
 sealant:{label:'Sealant',color:'#58c7bd',stroke:'#0f766e'},
 worn:{label:'Worn / attrition',color:'#d29b57',stroke:'#92400e'},
}

export const conditionStyle=value=>ODONTOGRAM_CONDITION_STYLES[value||'healthy']||ODONTOGRAM_CONDITION_STYLES.unknown
export const surfaceStyle=value=>ODONTOGRAM_SURFACE_STYLES[value||'sound']||ODONTOGRAM_CONDITION_STYLES.unknown
export const findingSummary=record=>{
 const findings=[]
 if(record?.condition&&record.condition!=='healthy')findings.push(conditionStyle(record.condition).label)
 for(const [surface,value] of Object.entries(record?.surface_conditions||{})){
  if(value&&value!=='sound')findings.push(`${surface} ${surfaceStyle(value).label}`)
 }
 return findings.length?findings.join(', '):'Healthy / Sound'
}

export const LEGEND_CONDITIONS=['healthy','filled','caries','crown','rct','missing','extracted','implant','bridge_anchor','fractured','impacted','watch']
