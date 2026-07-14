import { useState, useEffect } from 'react'

import Tabs from '../ui/Tabs'

import SOAPEditor from './SOAPEditor'
import ClinicalTimeline from './ClinicalTimeline'
import ClinicalBanner from './ClinicalBanner'
import TreatmentPlanBoard from './TreatmentPlanBoard'
import Odontogram from './Odontogram'
import ToothContextPanel from './chart/ToothContextPanel'
import ClinicalImageGallery from './ClinicalImageGallery'

import {
  getToothChart
} from '../../services/toothChartService'

export default function ClinicalWorkspace({
  patient
}) {
  const [tab, setTab] = useState('Clinical')
  const [chartData, setChartData] = useState(null)
  const [selectedTeeth, setSelectedTeeth] = useState([])
  const [selectedSurface, setSelectedSurface] = useState(null)

  function toggleTooth(tooth) {
    setSelectedTeeth(prev => {
      if (prev.includes(tooth)) {
        return prev.filter(t => t !== tooth)
      }
      return [...prev, tooth]
    })
  }

  const TOOTH_MAP = {
    UR8: 18, UR7: 17, UR6: 16, UR5: 15,
    UR4: 14, UR3: 13, UR2: 12, UR1: 11,

    UL1: 21, UL2: 22, UL3: 23, UL4: 24,
    UL5: 25, UL6: 26, UL7: 27, UL8: 28,

    LL1: 31, LL2: 32, LL3: 33, LL4: 34,
    LL5: 35, LL6: 36, LL7: 37, LL8: 38,

    LR1: 41, LR2: 42, LR3: 43, LR4: 44,
    LR5: 45, LR6: 46, LR7: 47, LR8: 48
  }

  const loadChart = async () => {
    try {
      const data = await getToothChart(patient.id)
      setChartData(data)
    } catch (error) {
      console.error('Failed loading chart:', error)
    }
  }

  useEffect(() => {
    if (!patient?.id) return
    loadChart()
  }, [patient])

  const selectedToothRecord =
    selectedTeeth.length === 1
      ? chartData?.results?.[0]?.teeth?.find(
          tooth =>
            tooth.tooth_number ===
            TOOTH_MAP[selectedTeeth[0]]
        )
      : null

  return (
    <>
      <Tabs
        tabs={[
          'Overview',
          'Clinical',
          'Treatment Plans',
          'Images',
          'Timeline'
        ]}
        activeTab={tab}
        onChange={setTab}
      />

      {tab === 'Clinical' && (
        <>
          <ClinicalBanner patient={patient} />

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <Odontogram
                selectedTeeth={selectedTeeth}
                onSelect={toggleTooth}
                chartData={chartData}
                selectedSurface={selectedSurface}
                onSurfaceClick={setSelectedSurface}
              />
            </div>

            <div>
              <ToothContextPanel
                selectedTooth={
                  selectedTeeth.length === 1
                    ? selectedTeeth[0]
                    : null
                }
                toothData={selectedToothRecord}
                chartId={chartData?.results?.[0]?.id}
                onSaved={loadChart}
                selectedSurface={selectedSurface}
              />
            </div>
          </div>

          <div className="mt-4">
            <SOAPEditor
              patient={patient}
              selectedTeeth={selectedTeeth}
            />
          </div>
        </>
      )}

      {tab === 'Treatment Plans' && (
        <TreatmentPlanBoard patient={patient} />
      )}

      {tab === 'Images' && (
        <ClinicalImageGallery patient={patient} />
      )}

      {tab === 'Timeline' && (
        <ClinicalTimeline patient={patient} />
      )}
    </>
  )
}
