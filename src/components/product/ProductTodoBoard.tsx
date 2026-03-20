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
    <section className="rounded-2xl border border-gray-700 bg-gray-800/60 p-6">
      <div className="max-w-4xl">
        <div className="text-sm uppercase tracking-[0.25em] text-amber-300">Future Placeholder Layer</div>
        <h2 className="mt-2 text-2xl font-semibold text-white">{title}</h2>
        {intro && <p className="mt-3 text-sm leading-6 text-gray-400">{intro}</p>}
      </div>

      <div className={`mt-6 grid gap-4 ${compact ? 'lg:grid-cols-2' : 'xl:grid-cols-2'}`}>
        {phases.map((phase) => (
          <div key={phase.id} className="rounded-xl border border-gray-700 bg-gray-900/35 p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="text-sm font-medium text-white">{phase.title}</div>
                <p className="mt-2 text-sm text-gray-400">{phase.summary}</p>
              </div>
              <span className="rounded-full border border-amber-700 bg-amber-900/20 px-3 py-1 text-xs text-amber-200">
                {phase.statusLabel}
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {phase.items.map((item) => (
                <div key={item.id} className="rounded-lg border border-gray-800 bg-gray-950/35 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="font-medium text-white">{item.title}</div>
                    <PriorityBadge priority={item.priority} />
                  </div>
                  <p className="mt-2 text-sm text-gray-400">{item.summary}</p>
                  <p className="mt-3 text-sm text-gray-500">{item.whyItMatters}</p>
                  {item.href && (
                    <Link
                      href={item.href}
                      className="mt-3 inline-flex text-sm text-cyan-400 hover:text-cyan-300"
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
      ? 'border-red-700 bg-red-900/20 text-red-200'
      : priority === 'next'
      ? 'border-cyan-700 bg-cyan-900/20 text-cyan-200'
      : 'border-gray-700 bg-gray-900/40 text-gray-300'

  return <span className={`rounded-full border px-3 py-1 text-xs ${className}`}>{label}</span>
}
