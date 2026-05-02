import { useBoardStore } from '../store'

const CONNECTION_COLORS: Record<string, string> = {
  supports: '#B9DEC8',
  extends: '#B8DAF0',
  contradicts: '#EFB9A6',
  inspires: '#F4E8B2',
  depends_on: '#E9DABF',
}

export default function IslandOverlays() {
  const nodes = useBoardStore((s) => s.nodes)
  const synthesisResult = useBoardStore((s) => s.synthesisResult)

  if (!synthesisResult || synthesisResult.groups.length === 0) return null

  const groupBounds = synthesisResult.groups.map((group) => {
    const groupNodes = nodes.filter((n) => group.node_ids.includes(n.id))
    if (groupNodes.length === 0) return null

    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (const n of groupNodes) {
      minX = Math.min(minX, n.x)
      minY = Math.min(minY, n.y)
      maxX = Math.max(maxX, n.x + n.width)
      maxY = Math.max(maxY, n.y + n.height)
    }

    return { group, minX, minY, maxX, maxY, centerX: (minX + maxX) / 2, centerY: (minY + maxY) / 2 }
  }).filter((b): b is NonNullable<typeof b> => b !== null)

  return (
    <svg
      className="island-svg"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: 1,
        height: 1,
        overflow: 'visible',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    >
      <defs>
        {groupBounds.map(({ group }) => (
          <filter key={`glow-${group.id}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feFlood floodColor={group.color} floodOpacity="0.2" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="shadow" />
            <feMerge>
              <feMergeNode in="shadow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        ))}
      </defs>

      {groupBounds.map(({ group, minX, minY, maxX, maxY }) => {
        const pad = 24
        const labelH = 28
        const rx = minX - pad
        const ry = minY - pad - labelH
        const rw = maxX - minX + pad * 2
        const rh = maxY - minY + pad * 2 + labelH

        return (
          <g key={group.id} className="island-group">
            <rect
              x={rx}
              y={ry}
              width={rw}
              height={rh}
              rx={20}
              fill={group.color}
              fillOpacity={0.1}
              stroke={group.color}
              strokeWidth={2}
              strokeOpacity={0.35}
              strokeDasharray="8 4"
              filter={`url(#glow-${group.id})`}
            />
            <rect
              x={rx + 8}
              y={ry + 4}
              width={group.name.length * 8 + 20}
              height={22}
              rx={11}
              fill={group.color}
              fillOpacity={0.9}
            />
            <text
              x={rx + 18}
              y={ry + 19}
              fill="white"
              fontSize={12}
              fontWeight={600}
              fontFamily="'Plus Jakarta Sans', sans-serif"
            >
              {group.name}
            </text>
          </g>
        )
      })}

      {synthesisResult.connections.map((conn, i) => {
        const from = groupBounds.find((b) => b.group.id === conn.from_group)
        const to = groupBounds.find((b) => b.group.id === conn.to_group)
        if (!from || !to) return null

        const x1 = from.centerX
        const y1 = from.maxY + 24
        const x2 = to.centerX
        const y2 = to.minY - 24 - 28

        const midY = (y1 + y2) / 2

        return (
          <g key={`conn-${i}`}>
            <path
              d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
              fill="none"
              stroke={CONNECTION_COLORS[conn.type] || 'var(--text-muted)'}
              strokeWidth={2.5}
              strokeOpacity={0.5}
              strokeDasharray="6 3"
            />
            <rect
              x={(x1 + x2) / 2 - conn.label.length * 3.5 - 8}
              y={midY - 10}
              width={conn.label.length * 7 + 16}
              height={20}
              rx={10}
              fill="white"
              fillOpacity={0.9}
              stroke={CONNECTION_COLORS[conn.type] || 'var(--divider)'}
              strokeWidth={1}
            />
            <text
              x={(x1 + x2) / 2}
              y={midY + 4}
              textAnchor="middle"
              fill="var(--text-secondary)"
              fontSize={10}
              fontWeight={500}
              fontFamily="'Inter', sans-serif"
            >
              {conn.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
