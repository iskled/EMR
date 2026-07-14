export default function ToothOverlay({
  toothRecord
}) {

  if (!toothRecord) {
    return null
  }

  const condition =
    toothRecord.condition

  const surfaceConditions =
    Object.values(
      toothRecord.surface_conditions || {}
    )

  const hasSurfaceCaries =
    surfaceConditions.includes('caries')

  const hasComposite =
    surfaceConditions.includes(
      'filled_composite'
    )

  const hasAmalgam =
    surfaceConditions.includes(
      'filled_amalgam'
    )

  const hasCeramic =
    surfaceConditions.includes(
      'filled_ceramic'
    )

  const hasSealant =
    surfaceConditions.includes(
      'sealant'
    )

  const hasWatch =
    surfaceConditions.includes(
      'watch'
    )

  const hasWear =
    surfaceConditions.includes(
      'worn'
    )

  return (

    <div
      className="
        flex
        flex-col
        items-center
        gap-0.5
        text-[10px]
        mt-1
      "
    >

      {condition === 'crown' && (
        <div
          title="Crown"
          className="font-bold"
        >
          👑
        </div>
      )}

      {condition === 'implant' && (
        <div
          title="Implant"
          className="font-bold"
        >
          🔩
        </div>
      )}

      {condition === 'missing' && (
        <div
          title="Missing Tooth"
          className="
            text-red-600
            font-bold
          "
        >
          ✕
        </div>
      )}

      {condition === 'rct' && (
        <div
          title="Root Canal Treated"
          className="
            text-purple-600
            font-bold
          "
        >
          RCT
        </div>
      )}

      {condition === 'bridge_anchor' && (
        <div
          title="Bridge Anchor"
          className="
            text-indigo-600
            font-bold
          "
        >
          BA
        </div>
      )}

      {condition === 'bridge_pontic' && (
        <div
          title="Bridge Pontic"
          className="
            text-indigo-600
            font-bold
          "
        >
          BP
        </div>
      )}

      {condition === 'fractured' && (
        <div
          title="Fractured Tooth"
          className="
            text-orange-600
            font-bold
          "
        >
          ⚡
        </div>
      )}

      {condition === 'impacted' && (
        <div
          title="Impacted Tooth"
          className="
            text-yellow-700
            font-bold
          "
        >
          IMP
        </div>
      )}

      {condition === 'extracted' && (
        <div
          title="Extracted"
          className="
            text-red-700
            font-bold
          "
        >
          EXT
        </div>
      )}

      {hasSurfaceCaries && (
        <div
          title="Surface Caries"
          className="text-red-600"
        >
          C
        </div>
      )}

      {hasComposite && (
        <div
          title="Composite Restoration"
          className="text-blue-600"
        >
          RC
        </div>
      )}

      {hasAmalgam && (
        <div
          title="Amalgam Restoration"
          className="text-slate-700"
        >
          RA
        </div>
      )}

      {hasCeramic && (
        <div
          title="Ceramic Restoration"
          className="text-cyan-600"
        >
          RCe
        </div>
      )}

      {hasSealant && (
        <div
          title="Sealant"
          className="text-green-600"
        >
          S
        </div>
      )}

      {hasWatch && (
        <div
          title="Watch Area"
          className="text-yellow-600"
        >
          W
        </div>
      )}

      {hasWear && (
        <div
          title="Wear / Attrition"
          className="text-orange-600"
        >
          A
        </div>
      )}

      {toothRecord.mobility_grade > 0 && (
        <div title="Mobility">
          M{toothRecord.mobility_grade}
        </div>
      )}

      {toothRecord.furcation && (
        <div title="Furcation">
          F{toothRecord.furcation}
        </div>
      )}

    </div>

  )
}