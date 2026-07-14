import Quadrant from './Quadrant'

export default function AdultOdontogram({
  selectedTeeth = [],
  onSelect,
  chartData,

  selectedSurface,
  onSurfaceClick
}) {

  const TOOTH_MAP = {
    UR8:18, UR7:17, UR6:16, UR5:15,
    UR4:14, UR3:13, UR2:12, UR1:11,

    UL1:21, UL2:22, UL3:23, UL4:24,
    UL5:25, UL6:26, UL7:27, UL8:28,

    LL1:31, LL2:32, LL3:33, LL4:34,
    LL5:35, LL6:36, LL7:37, LL8:38,

    LR1:41, LR2:42, LR3:43, LR4:44,
    LR5:45, LR6:46, LR7:47, LR8:48
  }

  const getToothRecord = (toothLabel) => {

    const toothNumber =
      TOOTH_MAP[toothLabel]

    return chartData?.results?.[0]?.teeth?.find(
      t => t.tooth_number === toothNumber
    )
  }

  const getToothColor = (toothLabel) => {

    const tooth =
      getToothRecord(toothLabel)

    if (!tooth)
      return 'bg-white'

    switch (tooth.condition) {

      case 'caries':
        return 'bg-red-500 text-white'

      case 'filled':
        return 'bg-blue-500 text-white'

      case 'crown':
        return 'bg-yellow-400'

      case 'implant':
        return 'bg-green-500 text-white'

      case 'missing':
        return 'bg-gray-400'

      default:
        return 'bg-white'
    }
  }

  return (

    <div className="bg-white rounded-xl shadow p-6">

      <h2 className="text-xl font-bold mb-4">
        Odontogram
      </h2>

      <div className="flex flex-wrap gap-3 mb-4 text-xs">

        <div className="flex items-center gap-1">
          <span className="w-4 h-4 border bg-white"></span>
          Healthy
        </div>

        <div className="flex items-center gap-1">
          <span className="w-4 h-4 bg-red-500"></span>
          Caries
        </div>

        <div className="flex items-center gap-1">
          <span className="w-4 h-4 bg-blue-500"></span>
          Filled
        </div>

        <div className="flex items-center gap-1">
          <span className="w-4 h-4 bg-yellow-400"></span>
          Crown
        </div>

        <div className="flex items-center gap-1">
          <span className="w-4 h-4 bg-green-500"></span>
          Implant
        </div>

        <div className="flex items-center gap-1">
          <span className="w-4 h-4 bg-gray-400"></span>
          Missing
        </div>


        <div className="flex items-center gap-1">
          <span>⚡</span>
          Fracture
        </div>

        <div className="flex items-center gap-1">
          <span>M</span>
          Mobility
        </div>

        <div className="flex items-center gap-1">
          <span>PD</span>
          Pocket Depth
        </div>

        <div className="flex items-center gap-1">
          <span>F</span>
          Furcation
        </div>



      </div>

      <div className="space-y-6">

        <Quadrant
          teeth={[
            'UR8','UR7','UR6','UR5',
            'UR4','UR3','UR2','UR1'
          ]}
          selectedTeeth={selectedTeeth}
          onSelect={onSelect}
          getToothRecord={getToothRecord}
          getToothColor={getToothColor}

          selectedSurface={selectedSurface}
          onSurfaceClick={onSurfaceClick}
        />

        <Quadrant
          teeth={[
            'UL1','UL2','UL3','UL4',
            'UL5','UL6','UL7','UL8'
          ]}
          selectedTeeth={selectedTeeth}
          onSelect={onSelect}
          getToothRecord={getToothRecord}
          getToothColor={getToothColor}

          selectedSurface={selectedSurface}
          onSurfaceClick={onSurfaceClick}
        />

        <Quadrant
          teeth={[
            'LL8','LL7','LL6','LL5',
            'LL4','LL3','LL2','LL1'
          ]}
          selectedTeeth={selectedTeeth}
          onSelect={onSelect}
          getToothRecord={getToothRecord}
          getToothColor={getToothColor}

          selectedSurface={selectedSurface}
          onSurfaceClick={onSurfaceClick}
        />

        <Quadrant
          teeth={[
            'LR1','LR2','LR3','LR4',
            'LR5','LR6','LR7','LR8'
          ]}
          selectedTeeth={selectedTeeth}
          onSelect={onSelect}
          getToothRecord={getToothRecord}
          getToothColor={getToothColor}

          selectedSurface={selectedSurface}
          onSurfaceClick={onSurfaceClick}
        />

      </div>

    </div>
  )
}