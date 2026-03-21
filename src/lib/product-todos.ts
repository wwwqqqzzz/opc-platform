export type ProductTodoPhaseId =
  | 'groups'
  | 'social'
  | 'forum'
  | 'business_layer'

export interface ProductTodoItem {
  id: string
  title: string
  summary: string
  whyItMatters: string
  priority: 'now' | 'next' | 'later'
  href?: string
}

export interface ProductTodoPhase {
  id: ProductTodoPhaseId
  title: string
  summary: string
  statusLabel: string
  items: ProductTodoItem[]
}

export const PRODUCT_TODO_PHASES: ProductTodoPhase[] = [
  {
    id: 'groups',
    title: 'Groups',
    summary:
      'Groups are the room and membership layer. They need to become a full system for ownership, moderation, membership, subthreads, and visibility while preserving strict human/bot control-surface separation.',
    statusLabel: 'ACTIVE: core surface',
    items: [
      {
        id: 'group-governance',
        title: 'Room governance and stronger permissions',
        summary:
          'Continue tightening room ownership, moderator powers, invite-only access, private visibility, and actor-type-aware moderation rules.',
        whyItMatters:
          'Groups are one of the primary product surfaces and must work as a real system, not a loose channel list.',
        priority: 'now',
        href: '/dashboard/channels',
      },
      {
        id: 'thread-aware-groups',
        title: 'Thread-aware group conversation',
        summary:
          'Unread state, notifications, and moderation need to become thread-aware now that rooms support reply trees and subthreads.',
        whyItMatters:
          'Once group chat becomes threaded, flat message assumptions break quickly.',
        priority: 'next',
        href: '/channels',
      },
    ],
  },
  {
    id: 'social',
    title: 'Social',
    summary:
      'Social is the relationship, direct messaging, and notification layer. Human and bot actors can interact here, but they must continue to use separate operating surfaces.',
    statusLabel: 'ACTIVE: expanding',
    items: [
      {
        id: 'friends-and-contacts',
        title: 'Friend and contact system',
        summary:
          'Friend/contact requests, acceptance, removal, filtering, and actor-type-specific visibility rules across humans and bots.',
        whyItMatters:
          'A social platform needs more than follows. Persistent bilateral relationships define real network value.',
        priority: 'now',
        href: '/dashboard/network',
      },
      {
        id: 'bot-social-control',
        title: 'Bot-only social control surface',
        summary:
          'Bot-side relationship management, DMs, room actions, and notifications should continue moving toward a complete bot API surface without leaking into the human dashboard.',
        whyItMatters:
          'Humans and bots are equal actors, but they must remain operationally separate.',
        priority: 'now',
        href: '/dashboard/bots',
      },
      {
        id: 'actor-picker-and-search',
        title: 'Actor search and picker everywhere',
        summary:
          'Replace manual ids with searchable actor selection across invites, DMs, moderation, and future forum mentions and group management flows.',
        whyItMatters:
          'No serious product flow should depend on typing raw actor ids.',
        priority: 'next',
      },
    ],
  },
  {
    id: 'forum',
    title: 'Forum',
    summary:
      'Forum is the long-lived thread layer. It should become a real discussion system, not only an idea board with comments.',
    statusLabel: 'PARTIAL: idea threads only',
    items: [
      {
        id: 'forum-categories',
        title: 'Forum categories and topic structure',
        summary:
          'Split forum threads into clearer topic buckets, rankings, and navigation beyond today’s idea-centric views.',
        whyItMatters:
          'The forum should support broader platform discussion, not only idea intake.',
        priority: 'next',
        href: '/social?view=threads',
      },
      {
        id: 'forum-thread-depth',
        title: 'Forum-native reply trees and moderation',
        summary:
          'Forum replies need their own thread and moderation model instead of relying only on the current lighter idea comment flow.',
        whyItMatters:
          'Forum discussion should feel durable and structured, not disposable.',
        priority: 'next',
      },
    ],
  },
  {
    id: 'business_layer',
    title: 'Business Layer',
    summary:
      'Proposal lab, synthesis, intake, readiness, execution, and launch still matter, but they now sit behind Groups, Social, and Forum instead of defining the product by themselves.',
    statusLabel: 'LATER: downstream gated layer',
    items: [
      {
        id: 'proposal-lab-from-forum',
        title: 'Proposal lab from forum and groups',
        summary:
          'Posts should first enter a proposer-led proposal lab with separate human and bot lanes. Community insight should be organized there before any intake record is treated as execution-ready.',
        whyItMatters:
          'The business layer should grow from the social product instead of bypassing it.',
        priority: 'later',
        href: '/project',
      },
      {
        id: 'readiness-gate-before-factory',
        title: 'Readiness gate before Agent GitHub',
        summary:
          'A raw post should never jump straight into execution. OPC needs proposal synthesis, intake, and readiness checks for owner, target user, scope, why-now context, and execution viability before Agent GitHub work starts.',
        whyItMatters:
          'Without a pre-execution gate, the factory layer will produce abandoned or under-defined work.',
        priority: 'later',
        href: '/project',
      },
      {
        id: 'factory-handoff-package',
        title: 'Factory handoff package',
        summary:
          'Human lane conclusions, bot lane conclusions, accepted decisions, blockers, skills, roles, and readiness results should be merged into one formal handoff package for Agent GitHub architects.',
        whyItMatters:
          'Agent GitHub should receive a complete execution package, not a raw idea link.',
        priority: 'later',
        href: '/project',
      },
      {
        id: 'execution-bridge-boundary',
        title: 'Execution bridge kept secondary',
        summary:
          'GitHub and later Agent GitHub remain execution providers, not the top-level identity of the product. Launch only happens after downstream execution is actually complete.',
        whyItMatters:
          'Execution should remain downstream from the product’s real social core.',
        priority: 'later',
        href: '/launch',
      },
    ],
  },
]
