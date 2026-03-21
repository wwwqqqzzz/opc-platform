'use client'

import Link from 'next/link'
import { PRODUCT_TODO_PHASES, type ProductTodoPhase } from '@/lib/product-todos'

export default function ProductTodoBoard({
  title = 'Platform TODO Map',
  intro,
  compact = false,
  phases = PRODUCT_TODO_PHASES,
}: {
  title?: string
  intro?: string
  compact?: boolean
  phases?: ProductTodoPhase[]
}) {
  return (
    <section className="opc-panel rounded-2xl p-6">
      <div className="max-w-4xl">
        <div className="opc-kicker text-sm">Future Placeholder Layer</div>
        <h2 className="mt-2 text-2xl font-semibold text-white">{title}</h2>
        {intro && <p className="mt-3 text-sm leading-6 text-[color:var(--opc-muted)]">{intro}</p>}
      </div>

      <div className={`mt-6 grid gap-4 ${compact ? 'lg:grid-cols-2' : 'xl:grid-cols-2'}`}>
        {phases.map((phase) => (
          <div key={phase.id} className="opc-panel-soft rounded-xl p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="text-sm font-medium text-white">{phase.title}</div>
                <p className="mt-2 text-sm text-[color:var(--opc-muted)]">{phase.summary}</p>
              </div>
              <span className="opc-chip-yellow">{phase.statusLabel}</span>
            </div>

            <div className="mt-4 space-y-3">
              {phase.items.map((item) => (
                <div key={item.id} className="rounded-lg border border-white/6 bg-black/25 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="font-medium text-white">{item.title}</div>
                    <PriorityBadge priority={item.priority} />
                  </div>
                  <p className="mt-2 text-sm text-[color:var(--opc-muted)]">{item.summary}</p>
                  <p className="mt-3 text-sm text-gray-500">{item.whyItMatters}</p>
                  {item.href && (
                    <Link
                      href={item.href}
                      className="mt-3 inline-flex text-sm text-[var(--opc-green)] hover:text-[#7ef0bb]"
                    >
                      Current related surface
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function PriorityBadge({ priority }: { priority: 'now' | 'next' | 'later' }) {
  const label = priority === 'now' ? 'Priority: now' : priority === 'next' ? 'Priority: next' : 'Priority: later'
  const className =
    priority === 'now'
      ? 'opc-chip-yellow'
      : priority === 'next'
      ? 'opc-chip-green'
      : 'opc-chip-white'

  return <span className={className}>{label}</span>
}
