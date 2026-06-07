import { useState } from 'react'

import Tabs from '../ui/Tabs'

import SOAPEditor from './SOAPEditor'
import ClinicalTimeline from './ClinicalTimeline'
import ClinicalBanner from './ClinicalBanner'
import TreatmentPlanBoard from './TreatmentPlanBoard'
import Odontogram from './chart/Odontogram'
import ToothContextPanel from './chart/ToothContextPanel'
import ClinicalImageGallery from './ClinicalImageGallery'

const [selectedTooth, setSelectedTooth] =
  useState(null)

export default function ClinicalWorkspace({ patient }) {
  const [tab, setTab] = useState('Overview')

  return (
    <>
      <Tabs
        tabs={[
          'Overview',
          'Clinical',
          'Treatment Plans',
          'Images',
          'Timeline',
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
                selectedTooth={selectedTooth}
                onSelect={setSelectedTooth}
              />
            </div>

            <div>
              <ToothContextPanel
                selectedTooth={selectedTooth}
              />
            </div>
          </div>

          <div className="mt-4">
            <SOAPEditor
              patient={patient}
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