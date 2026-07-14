export default function ToothShape({ color }) {
  return (
    <svg
      viewBox="0 0 100 120"
      className={`w-10 h-12 ${color}`}
    >
      <path
        d="
          M25 12
          C35 4,65 4,75 12

          C85 20,90 35,88 50

          C86 65,80 78,72 92

          C68 99,62 110,56 118

          C53 120,47 120,44 118

          C38 110,32 99,28 92

          C20 78,14 65,12 50

          C10 35,15 20,25 12
        "
        fill="currentColor"
        stroke="#333"
        strokeWidth="3"
      />
    </svg>
  )
}