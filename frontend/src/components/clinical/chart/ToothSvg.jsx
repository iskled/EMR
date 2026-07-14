import ToothOverlay from './ToothOverlay'
import SurfaceTooth from './SurfaceTooth'

export default function ToothSvg({
  tooth,
  toothRecord,
  color,
  selected,
  onClick,

  selectedSurface,
  onSurfaceClick
}) {

  return (

    <button
      onClick={onClick}
      title={`
Condition: ${toothRecord?.condition || 'healthy'}
Mobility: ${toothRecord?.mobility_grade || 0}
Pocket Depth: ${toothRecord?.pocket_depth || 0}
Furcation: ${toothRecord?.furcation || 'None'}
`}
      className={`
        border
        rounded
        p-2
        text-sm
        transition-all
        min-h-[90px]

        ${color}

        ${
          selected
            ? 'ring-4 ring-blue-500 bg-blue-50'
            : ''
        }
      `}
    >

      <div className="flex flex-col items-center">

        <SurfaceTooth
          tooth={tooth}

          surfaceConditions={
            toothRecord?.surface_conditions || {}
          }

          selectedSurface={
            selectedSurface
          }

          onSurfaceClick={
            onSurfaceClick
          }
        />

        <div className="text-xs mt-1">
          {tooth}
        </div>

        <ToothOverlay
          toothRecord={toothRecord}
        />

      </div>

    </button>

  )
}