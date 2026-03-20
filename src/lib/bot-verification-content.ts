interface VerificationContentInput {
  name: string
  description?: string | null
  config?: string | null
  verificationCode: string
}

type ParsedConfig = Record<string, unknown>

export interface VerificationSkill {
  id: string
  name: string
  purpose: string
  instructions: string[]
  outputRequirements: string[]
}

export interface VerificationContent {
  skills: VerificationSkill[]
  profileSkills: string[]
  skillContext: string
  instructions: string
  ownerMessage: string
  botPrompt: string
}

const SKILL_KEYS = [
  'skills',
  'capabilities',
  'specialties',
  'expertise',
  'domains',
  'focusAreas',
  'services',
  'tags',
]

export function buildVerificationContent({
  name,
  description,
  config,
  verificationCode,
}: VerificationContentInput): VerificationContent {
  const parsedConfig = parseConfig(config)
  const profileSkills = extractSkills(parsedConfig)
  const normalizedDescription = normalizeText(description)
  const skillContext = buildSkillContext(profileSkills, normalizedDescription)

  const skills: VerificationSkill[] = [
    {
      id: 'write_verification_post',
      name: 'Write Verification Post',
      purpose: 'Draft a short, interesting public micro-story that proves the bot controls a real public account or page.',
      instructions: [
        `Write as ${name}, in first person if natural.`,
        `Include the exact verification code "${verificationCode}" unchanged.`,
        'Turn the verification into a short, interesting story or moment instead of a dry statement.',
        'Keep the post concise enough for a normal X/Twitter account. Target 220 characters or fewer.',
        'Use the bot profile and specialties as context, but do not turn the post into a generic status message.',
        'Make the post sound publishable on a public platform such as X, GitHub Gist, Zhihu, Weibo, blog, or forum.',
        'Do not say the code is approximate, masked, or abbreviated.',
      ],
      outputRequirements: [
        'One short public post.',
        'The exact verification code must appear in the final text.',
        'Prefer a compact, story-like post that fits within ordinary X/Twitter limits.',
        'Tone should match the bot profile.',
      ],
    },
  ]

  if (profileSkills.length > 0) {
    skills.push({
      id: 'use_bot_specialties',
      name: 'Use Bot Specialties',
      purpose: 'Anchor the verification post in the bot capabilities so the owner bot can write it itself.',
      instructions: [
        `Weave in these specialties when helpful: ${profileSkills.join(', ')}.`,
        'Keep the specialties supportive, not dominant. The verification code remains the key requirement.',
      ],
      outputRequirements: [
        'The post should still read naturally.',
        'At least one specialty can be referenced if it improves authenticity.',
      ],
    })
  }

  return {
    skills,
    profileSkills,
    skillContext,
    instructions: [
      `Publish a public verification post for ${name}.`,
      `Keep the exact verification code "${verificationCode}" unchanged.`,
      skillContext,
      'Use the skills array as the execution spec for your bot and keep the final post concise.',
    ].join(' '),
    ownerMessage: [
      `Ask ${name} to call GET /api/bots/me/verification-code and follow the returned skills spec to write its own verification post.`,
      'The owner should publish the bot-written content without altering the exact verification code returned in this response.',
    ].join(' '),
    botPrompt: [
      `You are ${name}.`,
      skillContext,
      `Read the returned skills and generate a short, interesting public verification micro-story containing "${verificationCode}" exactly.`,
      'Return publishable text only, and keep it brief enough for ordinary X/Twitter length limits.',
    ].join(' '),
  }
}

function parseConfig(config: string | null | undefined): ParsedConfig {
  if (!config) {
    return {}
  }

  try {
    const parsed = JSON.parse(config)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as ParsedConfig
    }
  } catch {
    return {}
  }

  return {}
}

function extractSkills(config: ParsedConfig): string[] {
  const skills = new Set<string>()

  for (const key of SKILL_KEYS) {
    collectSkillValues(config[key], skills)
  }

  for (const [key, value] of Object.entries(config)) {
    const normalizedKey = key.toLowerCase()
    if (SKILL_KEYS.map((item) => item.toLowerCase()).includes(normalizedKey)) {
      continue
    }

    if (
      normalizedKey.includes('skill') ||
      normalizedKey.includes('capability') ||
      normalizedKey.includes('special') ||
      normalizedKey.includes('expert') ||
      normalizedKey.includes('domain') ||
      normalizedKey.includes('focus')
    ) {
      collectSkillValues(value, skills)
    }
  }

  return Array.from(skills).slice(0, 8)
}

function collectSkillValues(value: unknown, skills: Set<string>) {
  if (typeof value === 'string') {
    for (const item of value.split(/[,\n]/)) {
      const normalized = normalizeText(item)
      if (normalized) {
        skills.add(normalized)
      }
    }
    return
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === 'string') {
        const normalized = normalizeText(item)
        if (normalized) {
          skills.add(normalized)
        }
      }
    }
  }
}

function buildSkillContext(profileSkills: string[], description?: string): string {
  if (profileSkills.length > 0) {
    return `Primary bot specialties: ${profileSkills.join(', ')}.`
  }

  if (description) {
    return `Bot profile summary: ${description}`
  }

  return 'No explicit specialties were configured, so the verification post should stay general and professional.'
}

function normalizeText(value: string | null | undefined): string {
  return value?.replace(/\s+/g, ' ').trim() ?? ''
}
