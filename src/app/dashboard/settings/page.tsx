'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useDashboardOnboarding } from '@/hooks/useDashboardExecutionState'
import type { GithubIntegrationStatus } from '@/types/github'

export default function SettingsPage() {
  const { user, refreshUser } = useAuth()
  const searchParams = useSearchParams()
  const { onboarding } = useDashboardOnboarding()
  const [githubStatus, setGithubStatus] = useState<GithubIntegrationStatus | null>(null)
  const [githubStatusLoading, setGithubStatusLoading] = useState(true)
  const [loading, setLoading] = useState(false)
  const [disconnectingGithub, setDisconnectingGithub] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showNameModal, setShowNameModal] = useState(false)
  const [newName, setNewName] = useState(user?.name || '')
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  useEffect(() => {
    const githubStatus = searchParams.get('github')
    if (githubStatus === 'connected') {
      setSuccess('GitHub account connected successfully.')
      void refreshUser()
    } else if (githubStatus === 'callback_error') {
      setError('GitHub OAuth callback failed. Please try again.')
    } else if (githubStatus === 'config_error') {
      setError('GitHub OAuth is not configured yet. Add the GitHub env vars first.')
    } else if (githubStatus === 'invalid_state') {
      setError('GitHub OAuth state validation failed. Please retry the connection flow.')
    } else if (githubStatus === 'auth_required') {
      setError('Please sign in before completing GitHub OAuth.')
    }
  }, [refreshUser, searchParams])

  useEffect(() => {
    if (user) {
      void fetchGithubStatus()
    } else {
      setGithubStatus(null)
      setGithubStatusLoading(false)
    }
  }, [user])

  const fetchGithubStatus = async () => {
    try {
      setGithubStatusLoading(true)
      const response = await fetch('/api/integrations/github/me')
      if (!response.ok) {
        throw new Error('Failed to load GitHub integration status')
      }

      const data: GithubIntegrationStatus = await response.json()
      setGithubStatus(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load GitHub integration status')
    } finally {
      setGithubStatusLoading(false)
    }
  }

  const updateName = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!user) return

    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update name')
      }

      setSuccess('Name updated successfully.')
      setShowNameModal(false)
      await refreshUser()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update name')
    } finally {
      setLoading(false)
    }
  }

  const updatePassword = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!user) return

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match')
      return
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/users/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update password')
      }

      setSuccess('Password updated successfully.')
      setShowPasswordModal(false)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update password')
    } finally {
      setLoading(false)
    }
  }

  const disconnectGithub = async () => {
    try {
      setDisconnectingGithub(true)
      setError(null)

      const response = await fetch('/api/integrations/github/disconnect', {
        method: 'POST',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to disconnect GitHub')
      }

      setSuccess('GitHub account disconnected.')
      await refreshUser()
      await fetchGithubStatus()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect GitHub')
    } finally {
      setDisconnectingGithub(false)
    }
  }

  if (!user) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-400">Please login to view settings</p>
      </div>
    )
  }

  const githubConnected = Boolean(githubStatus?.connection.connected)
  const githubConfigured = githubStatus?.configured ?? false
  const blockingProjects = githubStatus?.blockingProjects ?? []
  const githubScopes = githubStatus?.connection.scopes ?? []
  const githubConnectHref = onboarding.activeProject
    ? `/api/integrations/github/connect?redirect=${encodeURIComponent(`/project/${onboarding.activeProject.id}?onboarding=1`)}`
    : '/api/integrations/github/connect'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="mt-1 text-sm text-gray-400">Manage your account, security, and GitHub connection.</p>
      </div>

      <section className="rounded-lg border border-cyan-700/40 bg-cyan-900/20 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-sm uppercase tracking-wide text-cyan-300">Execution routing</div>
            <div className="mt-1 text-lg font-medium text-white">{onboarding.title}</div>
            <p className="mt-2 text-sm text-cyan-100/80">{onboarding.description}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href={onboarding.ctaHref}
              className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-700"
            >
              {onboarding.ctaLabel}
            </Link>
            {onboarding.activeProject && (
              <Link
                href={`/project/${onboarding.activeProject.id}`}
                className="rounded-lg border border-gray-600 px-4 py-2 text-sm font-medium text-gray-200 transition hover:bg-gray-800"
              >
                Open active project
              </Link>
            )}
          </div>
        </div>
      </section>

      {error && <Banner tone="error" message={error} onClose={() => setError(null)} />}
      {success && <Banner tone="success" message={success} onClose={() => setSuccess(null)} />}

      <section className="overflow-hidden rounded-lg border border-gray-700 bg-gray-800">
        <div className="border-b border-gray-700 p-6">
          <h2 className="text-lg font-medium text-white">GitHub Integration</h2>
          <p className="mt-1 text-sm text-gray-400">
            Connect GitHub to bind repositories, bootstrap project workflows, and sync delivery activity back into OPC Platform.
          </p>
        </div>
        <div className="space-y-4 p-6">
          {githubStatusLoading ? (
            <div className="rounded-lg border border-gray-700 bg-gray-900/40 p-4 text-sm text-gray-400">
              Loading GitHub integration status...
            </div>
          ) : null}

          {!githubConfigured && githubStatus && (
            <div className="rounded-lg border border-amber-700 bg-amber-900/30 p-4 text-sm text-amber-100">
              GitHub OAuth is not fully configured yet. Missing environment variables:{' '}
              {githubStatus.missingEnv.join(', ')}
            </div>
          )}

          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-gray-700 bg-gray-900 text-lg font-semibold">
                {githubConnected ? (githubStatus?.connection.login || 'GH').slice(0, 2).toUpperCase() : 'GH'}
              </div>
              <div>
                <div className="text-sm text-gray-400">Status</div>
                <div className="text-base font-medium text-white">
                  {githubConnected ? `Connected as @${githubStatus?.connection.login}` : 'Not connected'}
                </div>
                <div className="mt-1 text-sm text-gray-500">
                  {githubConnected
                    ? `Connected on ${new Date(githubStatus?.connection.connectedAt as string).toLocaleString()}`
                    : 'OAuth scopes: repo, read:user, user:email'}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              {githubConfigured ? (
                <a
                  href={githubConnectHref}
                  className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-700"
                >
                  {githubConnected ? 'Reconnect GitHub' : 'Connect GitHub'}
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  className="rounded-lg bg-gray-700 px-4 py-2 text-sm font-medium text-gray-400"
                >
                  Connect GitHub
                </button>
              )}
              {githubConnected && (
                <button
                  onClick={disconnectGithub}
                  disabled={disconnectingGithub || blockingProjects.length > 0}
                  className="rounded-lg border border-red-700 px-4 py-2 text-sm font-medium text-red-300 transition hover:bg-red-900/30 disabled:opacity-50"
                >
                  {disconnectingGithub ? 'Disconnecting...' : 'Disconnect'}
                </button>
              )}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <ChecklistCard
              title="1. Connect account"
              status={githubConnected ? 'done' : githubConfigured ? 'current' : 'blocked'}
              description={
                githubConfigured
                  ? 'Authorize GitHub once so OPC can access repositories you choose.'
                  : 'Add the required GitHub env vars before OAuth can be used.'
              }
            />
            <ChecklistCard
              title="2. Bind one repo per project"
              status={githubConnected ? 'current' : 'blocked'}
              description="Each project gets a single source of truth repository for provenance and launch history."
            />
            <ChecklistCard
              title="3. Bootstrap and sync"
              status={githubConnected ? 'current' : 'blocked'}
              description="Create the initial issue and PR from OPC, then sync GitHub activity back into project status."
            />
          </div>

          <div className="rounded-lg border border-gray-700 bg-gray-900/40 p-4 text-sm text-gray-400">
            <div className="font-medium text-white">What this unlocks</div>
            <ul className="mt-2 space-y-1">
              <li>Bind a single GitHub repository to each project</li>
              <li>Create the bootstrap issue, branch, and pull request from OPC</li>
              <li>Sync commits, issues, PRs, workflow runs, and releases back into the project timeline</li>
            </ul>
            {githubScopes.length > 0 && (
              <div className="mt-3 text-xs text-gray-500">Scopes in use: {githubScopes.join(', ')}</div>
            )}
          </div>

          {blockingProjects.length > 0 && (
            <div className="rounded-lg border border-blue-700 bg-blue-900/20 p-4 text-sm text-blue-100">
              GitHub disconnect is locked while {blockingProjects.length} project
              {blockingProjects.length === 1 ? ' is' : 's are'} still connected:
              <ul className="mt-2 space-y-1 text-blue-200">
                {blockingProjects.map((project) => (
                  <li key={project.id}>
                    {project.title} ({project.githubRepoFullName})
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-gray-700 bg-gray-800">
        <div className="border-b border-gray-700 p-6">
          <h2 className="text-lg font-medium text-white">Profile Information</h2>
          <p className="mt-1 text-sm text-gray-400">Update your account profile information.</p>
        </div>
        <div className="space-y-4 p-6">
          <div>
            <label className="block text-sm font-medium text-gray-300">Email</label>
            <p className="mt-1 text-sm text-gray-400">{user.email}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300">Display Name</label>
            <div className="mt-1 flex items-center gap-3">
              <p className="text-sm text-gray-400">{user.name || 'Not set'}</p>
              <button
                onClick={() => {
                  setShowNameModal(true)
                  setNewName(user.name || '')
                  setError(null)
                  setSuccess(null)
                }}
                className="text-sm text-emerald-400 hover:text-emerald-300"
              >
                Edit
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300">Account Created</label>
            <p className="mt-1 text-sm text-gray-400">{new Date(user.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-gray-700 bg-gray-800">
        <div className="border-b border-gray-700 p-6">
          <h2 className="text-lg font-medium text-white">Security</h2>
          <p className="mt-1 text-sm text-gray-400">Update your password.</p>
        </div>
        <div className="p-6">
          <button
            onClick={() => {
              setShowPasswordModal(true)
              setCurrentPassword('')
              setNewPassword('')
              setConfirmPassword('')
              setError(null)
              setSuccess(null)
            }}
            className="inline-flex items-center rounded-md border border-gray-600 bg-gray-700 px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-600"
          >
            Change Password
          </button>
        </div>
      </section>

      {showNameModal && (
        <Modal title="Update Display Name" onClose={() => setShowNameModal(false)}>
          <form onSubmit={updateName} className="space-y-4">
            <Field id="name" label="Display Name" type="text" value={newName} onChange={setNewName} />
            <ModalActions loading={loading} primaryLabel={loading ? 'Saving...' : 'Save'} onCancel={() => setShowNameModal(false)} />
          </form>
        </Modal>
      )}

      {showPasswordModal && (
        <Modal title="Change Password" onClose={() => setShowPasswordModal(false)}>
          <form onSubmit={updatePassword} className="space-y-4">
            <Field id="current-password" label="Current Password" type="password" value={currentPassword} onChange={setCurrentPassword} />
            <Field id="new-password" label="New Password" type="password" value={newPassword} onChange={setNewPassword} />
            <Field id="confirm-password" label="Confirm New Password" type="password" value={confirmPassword} onChange={setConfirmPassword} />
            <ModalActions loading={loading} primaryLabel={loading ? 'Updating...' : 'Update Password'} onCancel={() => setShowPasswordModal(false)} />
          </form>
        </Modal>
      )}
    </div>
  )
}

function ChecklistCard({
  title,
  status,
  description,
}: {
  title: string
  status: 'done' | 'current' | 'blocked'
  description: string
}) {
  const tone =
    status === 'done'
      ? 'border-emerald-700 bg-emerald-900/20 text-emerald-100'
      : status === 'current'
      ? 'border-cyan-700 bg-cyan-900/20 text-cyan-100'
      : 'border-gray-700 bg-gray-900/40 text-gray-300'

  const badge =
    status === 'done' ? 'Done' : status === 'current' ? 'Next' : 'Blocked'

  return (
    <div className={`rounded-lg border p-4 ${tone}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="font-medium text-white">{title}</div>
        <span className="rounded-full border border-current px-2 py-0.5 text-xs">{badge}</span>
      </div>
      <p className="mt-2 text-sm">{description}</p>
    </div>
  )
}

function Banner({
  tone,
  message,
  onClose,
}: {
  tone: 'error' | 'success'
  message: string
  onClose: () => void
}) {
  const className =
    tone === 'error'
      ? 'border-red-700 bg-red-900/50 text-red-200'
      : 'border-emerald-700 bg-emerald-900/50 text-emerald-200'

  return (
    <div className={`flex items-center justify-between rounded-lg border px-4 py-3 ${className}`}>
      <span>{message}</span>
      <button onClick={onClose} className="text-sm">
        x
      </button>
    </div>
  )
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string
  children: React.ReactNode
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/75 p-4">
      <div className="w-full max-w-md rounded-lg border border-gray-700 bg-gray-800 shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-700 px-6 py-4">
          <h3 className="text-lg font-medium text-white">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            x
          </button>
        </div>
        <div className="px-6 py-4">{children}</div>
      </div>
    </div>
  )
}

function Field({
  id,
  label,
  type,
  value,
  onChange,
}: {
  id: string
  label: string
  type: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-300">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 block w-full rounded-md border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
      />
    </div>
  )
}

function ModalActions({
  loading,
  primaryLabel,
  onCancel,
}: {
  loading: boolean
  primaryLabel: string
  onCancel: () => void
}) {
  return (
    <div className="flex justify-end gap-3 pt-4">
      <button
        type="button"
        onClick={onCancel}
        className="rounded-md border border-gray-600 bg-gray-700 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-600"
        disabled={loading}
      >
        Cancel
      </button>
      <button
        type="submit"
        className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        disabled={loading}
      >
        {primaryLabel}
      </button>
    </div>
  )
}
