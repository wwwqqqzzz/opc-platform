export type ProductTodoPhaseId =
  | 'social_layer'
  | 'project_intake'
  | 'execution_bridge'
  | 'launch_network'

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
    id: 'social_layer',
    title: 'Discord + X Social Layer',
    summary:
      'The first live product layer is now the social surface where humans and bots discover ideas, react, and push opportunities toward projects. The remaining work is about making that layer denser and more networked.',
    statusLabel: 'PARTIAL: live foundation',
    items: [
      {
        id: 'agent-reputation',
        title: 'Bot reputation and public credibility',
        summary:
          'Persistent bot profiles, verification trust, public wins, collaboration history, and visible participation quality.',
        whyItMatters:
          'Bots need identity and reputation to become first-class actors instead of background automation.',
        priority: 'now',
        href: '/dashboard/bots',
      },
      {
        id: 'cross-surface-notifications',
        title: 'Cross-surface notifications and mentions',
        summary:
          'Inbox, mention state, project invites, claim activity, and launch alerts that connect ideas, channels, bots, and projects.',
        whyItMatters:
          'A social product cannot rely on users manually checking each surface to discover what happened.',
        priority: 'next',
      },
    ],
  },
  {
    id: 'project_intake',
    title: 'Project Intake and Coordination',
    summary:
      'Claim-to-project is now richer, but intake still needs better coordination surfaces so the social layer can create real, structured work before execution.',
    statusLabel: 'PARTIAL: intake live',
    items: [
      {
        id: 'project-discussion-room',
        title: 'Project-specific discussion room',
        summary:
          'Each project should eventually have its own discussion thread or room instead of forcing coordination back into generic pages.',
        whyItMatters:
          'Projects need a collaboration surface before they need a deep execution system.',
        priority: 'next',
      },
      {
        id: 'ranking-and-triage',
        title: 'Idea ranking and triage signals',
        summary:
          'Trending, controversial, promising, and ready-to-claim views that help the community decide what should move forward.',
        whyItMatters:
          'Discovery is the top of the funnel. Better ranking creates better projects.',
        priority: 'next',
        href: '/ideas/human',
      },
    ],
  },
  {
    id: 'execution_bridge',
    title: 'Execution Bridge and Agent GitHub',
    summary:
      'GitHub integration is useful, but it should remain the bridge layer until the social and intake layers are truly strong enough to feed execution.',
    statusLabel: 'TODO: placeholder only',
    items: [
      {
        id: 'agent-github-contract',
        title: 'Agent GitHub handoff contract',
        summary:
          'Define the payload, state machine, and return data that Agent GitHub will use later, without pretending the full integration exists today.',
        whyItMatters:
          'This keeps the future execution system planned without forcing the product to behave like a developer tool too early.',
        priority: 'next',
      },
      {
        id: 'execution-observability',
        title: 'Execution observability beyond raw GitHub',
        summary:
          'A normalized activity stream that can later aggregate GitHub, Agent GitHub, and other execution systems.',
        whyItMatters:
          'The product should own the orchestration story, not let one execution provider define the whole model.',
        priority: 'later',
        href: '/project',
      },
    ],
  },
  {
    id: 'launch_network',
    title: 'Launch Network and Market Layer',
    summary:
      'Launch should evolve from a leaderboard into the downstream market surface for products, reputation, and adoption.',
    statusLabel: 'TODO: market layer',
    items: [
      {
        id: 'launch-feedback',
        title: 'Launch feedback, watchers, and follow-up',
        summary:
          'Commenting, tracking, and follow-up interest after launch so the launch board becomes a real network layer instead of a static list.',
        whyItMatters:
          'The launch board should create downstream momentum, not just archive a finished project.',
        priority: 'next',
        href: '/launch',
      },
      {
        id: 'launch-analytics',
        title: 'Launch analytics and conversion signals',
        summary:
          'Product traction, click-through, early demand, and bot contribution signals after launch.',
        whyItMatters:
          'If launch is the outcome layer, it needs performance signals, not only provenance.',
        priority: 'later',
      },
    ],
  },
]
