import crypto from 'crypto'

const API_KEY_PREFIX = 'opc_'
const API_KEY_LENGTH = 32

/**
 * 生成安全的 API Key
 * 格式: opc_<random_32_chars>
 */
export function generateApiKey(): string {
  const randomBytes = crypto.randomBytes(API_KEY_LENGTH)
  const apiKey = randomBytes.toString('base64')
    .replace(/\+/g, '')
    .replace(/\//g, '')
    .replace(/=/g, '')
    .substring(0, API_KEY_LENGTH)

  return `${API_KEY_PREFIX}${apiKey}`
}

/**
 * 验证 API Key 格式
 */
export function isValidApiKeyFormat(apiKey: string): boolean {
  return apiKey.startsWith(API_KEY_PREFIX) && apiKey.length === API_KEY_PREFIX.length + API_KEY_LENGTH
}

/**
 * 从请求头中提取 API Key
 */
export function extractApiKeyFromHeader(authHeader: string | null): string | null {
  if (!authHeader) return null

  // 支持 "Bearer <api_key>" 格式
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }

  // 直接返回 API Key
  return authHeader
}
