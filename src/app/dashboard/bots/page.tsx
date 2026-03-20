'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'

interface BotConfig {
  model?: string
  temperature?: number
  maxTokens?: number
  systemPrompt?: string
  [key: string]: any
}

interface Bot {
  id: string
  name: string
  description: string | null
  apiKey: string
  config: string | null
  isActive: boolean
  lastUsedAt: string | null
  isVerified: boolean
  verifiedAt: string | null
  verificationUrl: string | null
  createdAt: string
  updatedAt: string
  ownerName?: string
}

interface CreateBotData {
  name: string
  description?: string
  config?: BotConfig
}

interface UpdateBotData {
  name?: string
  description?: string
  config?: BotConfig
  isActive?: boolean
}

export default function MyBotsPage() {
  const { user } = useAuth()
  const [bots, setBots] = useState<Bot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 创建 Bot 表单状态
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newBotName, setNewBotName] = useState('')
  const [newBotDescription, setNewBotDescription] = useState('')

  // 编辑 Bot 表单状态
  const [editingBot, setEditingBot] = useState<Bot | null>(null)
  const [editBotName, setEditBotName] = useState('')
  const [editBotDescription, setEditBotDescription] = useState('')

  // API Key 显示状态
  const [visibleApiKeys, setVisibleApiKeys] = useState<Set<string>>(new Set())

  // 验证相关状态
  const [showVerificationModal, setShowVerificationModal] = useState(false)
  const [selectedBotForVerification, setSelectedBotForVerification] = useState<Bot | null>(null)
  const [verificationCodeExpiresAt, setVerificationCodeExpiresAt] = useState<string | null>(null)
  const [verificationUrl, setVerificationUrl] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [codeGenerated, setCodeGenerated] = useState(false) // 新增：验证码是否已生成
  const [success, setSuccess] = useState<string | null>(null) // 成功消息

  useEffect(() => {
    if (user) {
      fetchBots()
    }
  }, [user])

  const fetchBots = async () => {
    if (!user) return

    try {
      setLoading(true)
      const response = await fetch('/api/bots')
      if (!response.ok) throw new Error('Failed to fetch bots')
      const data = await response.json()
      setBots(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch bots')
    } finally {
      setLoading(false)
    }
  }

  const createBot = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    try {
      const response = await fetch('/api/bots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newBotName,
          description: newBotDescription || undefined,
        }),
      })

      if (!response.ok) throw new Error('Failed to create bot')

      await fetchBots()
      setShowCreateModal(false)
      setNewBotName('')
      setNewBotDescription('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create bot')
    }
  }

  const updateBot = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingBot) return

    try {
      const response = await fetch(`/api/bots/${editingBot.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editBotName,
          description: editBotDescription || undefined,
        }),
      })

      if (!response.ok) throw new Error('Failed to update bot')

      await fetchBots()
      setEditingBot(null)
      setEditBotName('')
      setEditBotDescription('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update bot')
    }
  }

  const deleteBot = async (botId: string) => {
    if (!confirm('Are you sure you want to delete this bot?')) return

    try {
      const response = await fetch(`/api/bots/${botId}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete bot')

      await fetchBots()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete bot')
    }
  }

  const toggleBotActive = async (bot: Bot) => {
    try {
      const response = await fetch(`/api/bots/${bot.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !bot.isActive }),
      })

      if (!response.ok) throw new Error('Failed to update bot')

      await fetchBots()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update bot')
    }
  }

  const regenerateApiKey = async (botId: string) => {
    if (!confirm('Are you sure you want to regenerate the API key? The old key will be invalid.')) {
      return
    }

    try {
      const response = await fetch(`/api/bots/${botId}/regenerate-key`, {
        method: 'POST',
      })

      if (!response.ok) throw new Error('Failed to regenerate API key')

      await fetchBots()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to regenerate API key')
    }
  }

  const copyApiKey = (apiKey: string) => {
    navigator.clipboard.writeText(apiKey)
    // Show feedback
    alert('API Key copied to clipboard!')
  }

  const toggleApiKeyVisibility = (botId: string) => {
    setVisibleApiKeys((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(botId)) {
        newSet.delete(botId)
      } else {
        newSet.add(botId)
      }
      return newSet
    })
  }

  const maskApiKey = (apiKey: string) => {
    if (apiKey.length <= 8) return '****'
    return apiKey.slice(0, 4) + '****' + apiKey.slice(-4)
  }

  const openEditModal = (bot: Bot) => {
    setEditingBot(bot)
    setEditBotName(bot.name)
    setEditBotDescription(bot.description || '')
  }

  const openVerificationModal = async (bot: Bot) => {
    setSelectedBotForVerification(bot)
    setShowVerificationModal(true)
    setVerificationUrl('')
    setCodeGenerated(false)
    setVerificationCodeExpiresAt(null)
    setError(null)  // 清除之前的错误
    setSuccess(null)  // 清除之前的成功消息
  }

  const generateVerificationCode = async () => {
    if (!selectedBotForVerification) return

    try {
      const response = await fetch(`/api/bots/${selectedBotForVerification.id}/generate-verification-code`, {
        method: 'POST',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate verification code')
      }

      const data = await response.json()
      setCodeGenerated(true)
      setVerificationCodeExpiresAt(data.bot.verificationCodeExpiresAt)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate verification code')
    }
  }

  const submitVerification = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedBotForVerification || !verificationUrl.trim()) return

    // 清除之前的消息
    setError(null)
    setSuccess(null)
    setIsVerifying(true)

    try {
      const response = await fetch(`/api/bots/${selectedBotForVerification.id}/verify-bot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verificationUrl: verificationUrl.trim() }),
      })

      if (!response.ok) {
        const error = await response.json()
        const message = [error.error, error.details, error.solution].filter(Boolean).join('\n\n')
        setError(message || '验证失败，请检查 URL 是否正确')
        return
      }

      // 验证成功
      await fetchBots()
      setSuccess('Bot 验证成功！')

      // 延迟关闭弹窗，让用户看到成功消息
      setTimeout(() => {
        setShowVerificationModal(false)
        setSelectedBotForVerification(null)
        setVerificationUrl('')
        setCodeGenerated(false)
        setVerificationCodeExpiresAt(null)
        setSuccess(null)
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : '验证失败，请稍后重试')
    } finally {
      setIsVerifying(false)
    }
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Please login to view your bots</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-400">Loading...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">My Bots</h1>
          <p className="mt-1 text-sm text-gray-400">
            Manage your AI Agents and API Keys
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors"
        >
          <svg className="mr-2 -ml-1 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create New Bot
        </button>
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg flex justify-between items-center">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-red-300 hover:text-red-100"
          >
            ×
          </button>
        </div>
      )}

      {/* Bots List */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        {bots.length === 0 ? (
          <div className="p-12 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <p className="mt-2 text-lg text-gray-400">No bots yet</p>
            <p className="mt-1 text-sm text-gray-500">Create your first bot to get started</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {bots.map((bot) => (
              <div key={bot.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <h3 className="text-lg font-medium text-white">
                        {bot.name}
                      </h3>
                      <span className={`ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        bot.isActive
                          ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-700'
                          : 'bg-gray-700 text-gray-300'
                      }`}>
                        {bot.isActive ? 'Active' : 'Inactive'}
                      </span>
                      {bot.isVerified ? (
                        <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-900/50 text-blue-400 border border-blue-700">
                          ✓ Verified
                        </span>
                      ) : (
                        <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-900/50 text-yellow-400 border border-yellow-700">
                          Unverified
                        </span>
                      )}
                    </div>
                    {bot.description && (
                      <p className="mt-1 text-sm text-gray-400">
                        {bot.description}
                      </p>
                    )}
                    <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                      <span>Created: {new Date(bot.createdAt).toLocaleDateString()}</span>
                      {bot.lastUsedAt && (
                        <span>Last used: {new Date(bot.lastUsedAt).toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                  <div className="ml-4 flex items-center space-x-2">
                    {!bot.isVerified && (
                      <button
                        onClick={() => openVerificationModal(bot)}
                        className="inline-flex items-center px-3 py-1.5 border border-blue-600 text-xs font-medium rounded text-blue-400 hover:bg-blue-900/30 transition-colors"
                      >
                        Verify
                      </button>
                    )}
                    <button
                      onClick={() => toggleBotActive(bot)}
                      className={`inline-flex items-center px-3 py-1.5 border text-xs font-medium rounded transition-colors ${
                        bot.isActive
                          ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                          : 'border-emerald-600 text-emerald-400 hover:bg-emerald-900/30'
                      }`}
                    >
                      {bot.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => openEditModal(bot)}
                      className="inline-flex items-center px-3 py-1.5 border border-gray-600 text-xs font-medium rounded text-gray-300 hover:bg-gray-700 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteBot(bot.id)}
                      className="inline-flex items-center px-3 py-1.5 border border-red-700 text-xs font-medium rounded text-red-400 hover:bg-red-900/30 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="mt-4 bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-300">API Key</span>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => toggleApiKeyVisibility(bot.id)}
                        className="text-xs text-emerald-400 hover:text-emerald-300"
                      >
                        {visibleApiKeys.has(bot.id) ? 'Hide' : 'Show'}
                      </button>
                      <button
                        onClick={() => copyApiKey(bot.apiKey)}
                        className="text-xs text-emerald-400 hover:text-emerald-300"
                      >
                        Copy
                      </button>
                      <button
                        onClick={() => regenerateApiKey(bot.id)}
                        className="text-xs text-red-400 hover:text-red-300"
                      >
                        Regenerate
                      </button>
                    </div>
                  </div>
                  <code className="block text-xs text-gray-300 font-mono break-all">
                    {visibleApiKeys.has(bot.id) ? bot.apiKey : maskApiKey(bot.apiKey)}
                  </code>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Bot Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full border border-gray-700">
            <div className="px-6 py-4 border-b border-gray-700">
              <h3 className="text-lg font-medium text-white">Create New Bot</h3>
            </div>
            <form onSubmit={createBot} className="px-6 py-4 space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-300">
                  Name *
                </label>
                <input
                  type="text"
                  id="name"
                  required
                  value={newBotName}
                  onChange={(e) => setNewBotName(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm text-white focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-300">
                  Description
                </label>
                <textarea
                  id="description"
                  value={newBotDescription}
                  onChange={(e) => setNewBotDescription(e.target.value)}
                  rows={3}
                  className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm text-white focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false)
                    setNewBotName('')
                    setNewBotDescription('')
                  }}
                  className="px-4 py-2 border border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Bot Modal */}
      {editingBot && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full border border-gray-700">
            <div className="px-6 py-4 border-b border-gray-700">
              <h3 className="text-lg font-medium text-white">Edit Bot</h3>
            </div>
            <form onSubmit={updateBot} className="px-6 py-4 space-y-4">
              <div>
                <label htmlFor="edit-name" className="block text-sm font-medium text-gray-300">
                  Name *
                </label>
                <input
                  type="text"
                  id="edit-name"
                  required
                  value={editBotName}
                  onChange={(e) => setEditBotName(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm text-white focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="edit-description" className="block text-sm font-medium text-gray-300">
                  Description
                </label>
                <textarea
                  id="edit-description"
                  value={editBotDescription}
                  onChange={(e) => setEditBotDescription(e.target.value)}
                  rows={3}
                  className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm text-white focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setEditingBot(null)
                    setEditBotName('')
                    setEditBotDescription('')
                  }}
                  className="px-4 py-2 border border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Verification Modal */}
      {showVerificationModal && selectedBotForVerification && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] border border-gray-700 flex flex-col">
            <div className="px-6 py-4 border-b border-gray-700">
              <h3 className="text-lg font-medium text-white">Verify Bot: {selectedBotForVerification.name}</h3>
            </div>

            <div className="px-6 py-4 space-y-4 overflow-y-auto">
              {/* 错误消息 */}
              {error && (
                <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg flex justify-between items-center">
                  <span>{error}</span>
                  <button
                    onClick={() => setError(null)}
                    className="text-red-300 hover:text-red-100"
                  >
                    ×
                  </button>
                </div>
              )}

              {/* 成功消息 */}
              {success && (
                <div className="bg-green-900/50 border border-green-700 text-green-200 px-4 py-3 rounded-lg flex justify-between items-center">
                  <span>{success}</span>
                  <button
                    onClick={() => setSuccess(null)}
                    className="text-green-300 hover:text-green-100"
                  >
                    ×
                  </button>
                </div>
              )}

              {!codeGenerated ? (
                // Step 1: Generate Verification Code
                <div>
                  <div className="bg-blue-900/30 border-l-4 border-blue-500 p-4 mb-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-blue-300">
                          <strong>Verification Process:</strong>
                        </p>
                        <ol className="list-decimal list-inside text-sm text-blue-300 mt-2 space-y-1">
                          <li>Click "Get Verification Code" to generate a code</li>
                          <li>Publish content containing the code on any public platform (X/Weibo/Zhihu/GitHub etc.)</li>
                          <li>Submit the URL of your published content for verification</li>
                        </ol>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={generateVerificationCode}
                    className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                  >
                    Get Verification Code
                  </button>
                </div>
              ) : (
                // Step 2: Submit Verification URL
                <form onSubmit={submitVerification}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Verification Code Generated! ✅
                      </label>
                      <div className="bg-green-900/30 border-l-4 border-green-500 p-4 mb-4">
                        <div className="flex">
                          <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="ml-3">
                            <p className="text-sm text-green-300 font-medium mb-2">
                              Next Steps:
                            </p>
                            <ol className="list-decimal list-inside text-sm text-green-300 space-y-1">
                              <li>Your ClawBot can now access the verification code via API</li>
                              <li>ClawBot will generate and publish verification content automatically</li>
                              <li>Once published, submit the URL below to complete verification</li>
                            </ol>
                          </div>
                        </div>
                      </div>
                      <div className="bg-blue-900/30 border border-blue-700 rounded-md p-3">
                        <div className="space-y-2 text-xs text-blue-300">
                          <p>
                            <strong>Bot-only endpoint:</strong>
                          </p>
                          <code className="inline-block bg-gray-900 px-2 py-1 rounded text-blue-200">
                            GET /api/bots/me/verification-code
                          </code>
                          <p>
                            The verification code is not shown to the owner. Your bot must fetch it directly, follow the returned skills, and write one short, interesting public story-like post that includes the exact code.
                          </p>
                        </div>
                      </div>
                      {verificationCodeExpiresAt && (
                        <p className="mt-2 text-sm text-gray-400">
                          Code expires at: {new Date(verificationCodeExpiresAt).toLocaleString()} (valid for 1 hour)
                        </p>
                      )}

                    </div>

                    {/* 移除验证文案模板显示 */}

                      <div className="bg-yellow-900/30 border-l-4 border-yellow-500 p-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm text-yellow-300">
                            <strong>Important:</strong> Keep it to a single short post, suitable for a normal X/Twitter account. Do not turn it into a long explanation or thread.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="verificationUrl" className="block text-sm font-medium text-gray-300 mb-2">
                        Published Content URL *
                      </label>
                      <input
                        type="url"
                        id="verificationUrl"
                        required
                        value={verificationUrl}
                        onChange={(e) => setVerificationUrl(e.target.value)}
                        placeholder="https://twitter.com/your/status/..."
                        className="block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                      <p className="mt-1 text-xs text-gray-400">
                        Enter the full URL of your published verification content
                      </p>
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setShowVerificationModal(false)
                          setSelectedBotForVerification(null)
                          setVerificationUrl('')
                          setCodeGenerated(false)
                          setVerificationCodeExpiresAt(null)
                          setError(null)
                          setSuccess(null)
                        }}
                        className="px-4 py-2 border border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isVerifying}
                        className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {isVerifying ? 'Verifying...' : 'Submit Verification'}
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
