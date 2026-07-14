import ToothSvg from './ToothSvg'

export default function Quadrant({
  teeth,
  selectedTeeth = [],
  onSelect,
  getToothRecord,
  getToothColor,

  selectedSurface,
  onSurfaceClick
}) {

  return (

    <div className="grid grid-cols-8 gap-2">

      {teeth.map((tooth) => {

        const toothRecord =
          getToothRecord(tooth)

        return (

          <ToothSvg
            key={tooth}
            tooth={tooth}
            toothRecord={toothRecord}
            color={getToothColor(tooth)}

            selected={
              selectedTeeth.includes(tooth)
            }

            onClick={() =>
              onSelect(tooth)
            }

            selectedSurface={
              selectedSurface
            }

            onSurfaceClick={(surface) =>
              onSurfaceClick({
                tooth,
                surface
              })
            }
          />

        )
      })}

    </div>

  )
}