'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { getOnboardingStepVisualState, getProjectExecutionLabel } from '@/lib/projects/onboarding'
import { useDashboardOnboarding } from '@/hooks/useDashboardExecutionState'

export default function DashboardExecutionRail() {
  const pathname = usePathname()
  const { onboarding, projects, githubStatus, loading, error } = useDashboardOnboarding(pathname)
  const activeProject = onboarding.activeProject
  const launchReadyProjects = projects.filter(
    (project) => project.deliveryStage === 'launch_ready' && !project.launch
  ).length
  const repoConnectedProjects = projects.filter((project) => Boolean(project.githubRepoFullName)).length
  const syncIssues = projects.filter((project) => project.githubSyncStatus === 'error').length

  return (
    <section className="mb-6 rounded-2xl border border-cyan-700/40 bg-gradient-to-r from-cyan-900/25 to-gray-800 p-5">
      {loading ? (
        <div className="text-sm text-gray-400">Loading execution state...</div>
      ) : (
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <div className="text-sm uppercase tracking-wide text-cyan-300">Execution Rail</div>
            <h2 className="mt-2 text-xl font-semibold text-white">{onboarding.title}</h2>
            <p className="mt-2 text-sm text-gray-300">{onboarding.description}</p>

            {error && (
              <p className="mt-3 text-sm text-amber-300">
                Execution state is partially unavailable: {error}
              </p>
            )}

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <MetricCard label="Projects with repos" value={`${repoConnectedProjects}/${projects.length}`} />
              <MetricCard label="Ready for launch" value={String(launchReadyProjects)} />
              <MetricCard
                label="GitHub connection"
                value={githubStatus?.connection.connected ? 'Connected' : 'Not connected'}
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {onboarding.steps.map((step) => (
                <span
                  key={step.id}
                  className={`rounded-full border px-3 py-1 text-xs ${
                    getOnboardingStepVisualState(step, onboarding.currentStep) === 'done'
                      ? 'border-emerald-700 bg-emerald-900/20 text-emerald-200'
                      : getOnboardingStepVisualState(step, onboarding.currentStep) === 'current'
                      ? 'border-cyan-700 bg-cyan-900/20 text-cyan-200'
                      : 'border-gray-700 bg-gray-900/50 text-gray-400'
                  }`}
                >
                  {getOnboardingStepVisualState(step, onboarding.currentStep) === 'done'
                    ? 'Done'
                    : getOnboardingStepVisualState(step, onboarding.currentStep) === 'current'
                    ? 'Current'
                    : 'Upcoming'}
                  : {step.title}
                </span>
              ))}
            </div>
          </div>

          <div className="min-w-[280px] rounded-xl border border-gray-700 bg-gray-900/40 p-4">
            <div className="text-sm text-gray-400">Active execution target</div>
            {activeProject ? (
              <>
                <div className="mt-1 text-lg font-medium text-white">{activeProject.title}</div>
                <div className="mt-2 text-sm text-gray-400">
                  Next move: {getProjectExecutionLabel(activeProject)}
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  {syncIssues > 0
                    ? `${syncIssues} project${syncIssues === 1 ? '' : 's'} need GitHub attention.`
                    : 'Execution health looks stable right now.'}
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link
                    href={onboarding.ctaHref}
                    className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-700"
                  >
                    {onboarding.ctaLabel}
                  </Link>
                  <Link
                    href={`/project/${activeProject.id}`}
                    className="rounded-lg border border-gray-600 px-4 py-2 text-sm font-medium text-gray-200 transition hover:bg-gray-800"
                  >
                    Open project
                  </Link>
                </div>
              </>
            ) : (
              <>
                <div className="mt-1 text-lg font-medium text-white">No active project yet</div>
                <p className="mt-2 text-sm text-gray-400">
                  Claim one idea to activate the GitHub execution flow.
                </p>
                <Link
                  href={onboarding.ctaHref}
                  className="mt-4 inline-flex rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-700"
                >
                  {onboarding.ctaLabel}
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-700 bg-gray-900/35 p-4">
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-2 text-lg font-semibold text-white">{value}</div>
    </div>
  )
}
