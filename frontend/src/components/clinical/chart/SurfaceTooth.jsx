export default function SurfaceTooth({
  tooth,
  surfaceConditions = {},
  selectedSurface,
  onSurfaceClick
}) {

  const getColor = (surface) => {

    const condition =
      surfaceConditions?.[surface]

    switch (condition) {

      case 'caries':
        return 'bg-red-500'

      case 'filled':
        return 'bg-blue-500'

      case 'crown':
        return 'bg-yellow-400'

      case 'fracture':
        return 'bg-orange-500'

      case 'implant':
        return 'bg-green-500'

      default:
        return 'bg-white'
    }
  }

  const surfaceClass = (surface) => `
    border
    border-gray-400
    cursor-pointer
    hover:ring-2
    hover:ring-blue-400

    ${getColor(surface)}

    ${
      selectedSurface?.tooth === tooth &&
      selectedSurface?.surface === surface
        ? 'ring-2 ring-blue-600'
        : ''
    }
  `

  return (

    <div
      className="
        relative
        w-10
        h-10
        mx-auto
      "
    >

      {/* Buccal */}

      <div
        onClick={(e) => {
          e.stopPropagation()
          onSurfaceClick('B')
        }}
        className={`
          absolute
          top-0
          left-3
          w-4
          h-3
          ${surfaceClass('B')}
        `}
      />

      {/* Mesial */}

      <div
        onClick={(e) => {
          e.stopPropagation()
          onSurfaceClick('M')
        }}
        className={`
          absolute
          top-3
          left-0
          w-3
          h-4
          ${surfaceClass('M')}
        `}
      />

      {/* Occlusal */}

      <div
        onClick={(e) => {
          e.stopPropagation()
          onSurfaceClick('O')
        }}
        className={`
          absolute
          top-3
          left-3
          w-4
          h-4
          ${surfaceClass('O')}
        `}
      />

      {/* Distal */}

      <div
        onClick={(e) => {
          e.stopPropagation()
          onSurfaceClick('D')
        }}
        className={`
          absolute
          top-3
          right-0
          w-3
          h-4
          ${surfaceClass('D')}
        `}
      />

      {/* Lingual */}

      <div
        onClick={(e) => {
          e.stopPropagation()
          onSurfaceClick('L')
        }}
        className={`
          absolute
          bottom-0
          left-3
          w-4
          h-3
          ${surfaceClass('L')}
        `}
      />

    </div>

  )
}