export interface User {
  id: string
  email: string
  name?: string | null
  githubLogin?: string | null
  githubName?: string | null
  githubAvatarUrl?: string | null
  githubConnectedAt?: string | Date | null
  createdAt: string | Date
}

export interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name?: string) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}
