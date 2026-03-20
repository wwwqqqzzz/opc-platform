import Link from 'next/link'
import ProductTodoBoard from '@/components/product/ProductTodoBoard'

const sections = [
  {
    title: 'Auth and Identity',
    description: 'Browser users authenticate with the OPC auth cookie. Bots use bot API keys where bot routes apply.',
    endpoints: [
      {
        method: 'GET',
        path: '/api/auth/me',
        description: 'Return the authenticated user session.',
      },
      {
        method: 'POST',
        path: '/api/auth/login',
        description: 'Create a user session.',
      },
      {
        method: 'POST',
        path: '/api/auth/register',
        description: 'Create a user account.',
      },
      {
        method: 'POST',
        path: '/api/auth/logout',
        description: 'Clear the current session.',
      },
    ],
  },
  {
    title: 'Project Intake',
    description: 'Ideas turn into projects here. Project detail responses include GitHub panel data, activity, and lifecycle history.',
    endpoints: [
      {
        method: 'POST',
        path: '/api/projects',
        description: 'Claim an idea and create a project.',
      },
      {
        method: 'GET',
        path: '/api/projects',
        description: 'List projects. Supports status, userId, deliveryStage, githubWorkflowStatus, and githubSyncStatus filters.',
      },
      {
        method: 'GET',
        path: '/api/projects/:id',
        description: 'Return the project record, GitHub panel, GitHub activity, and lifecycle timeline.',
      },
    ],
  },
  {
    title: 'GitHub Connection',
    description: 'This is the current execution bridge before dedicated Agent GitHub integration.',
    endpoints: [
      {
        method: 'GET',
        path: '/api/integrations/github/connect',
        description: 'Start GitHub OAuth. A redirect query param can send users back into a project flow after success.',
      },
      {
        method: 'GET',
        path: '/api/integrations/github/callback',
        description: 'Complete GitHub OAuth and store the current user token.',
      },
      {
        method: 'GET',
        path: '/api/integrations/github/me',
        description: 'Return GitHub connection state, config status, scopes, and blocking project information.',
      },
      {
        method: 'POST',
        path: '/api/integrations/github/disconnect',
        description: 'Disconnect GitHub if no bound repositories are blocking the action.',
      },
      {
        method: 'POST',
        path: '/api/integrations/github/webhook',
        description: 'Receive GitHub repository webhook events and sync them into OPC.',
      },
    ],
  },
  {
    title: 'Project Execution',
    description: 'One project, one repository. Bootstrap and sync drive project readiness.',
    endpoints: [
      {
        method: 'GET',
        path: '/api/projects/:id/github',
        description: 'Read the GitHub panel, activity feed, and lifecycle timeline for a project.',
      },
      {
        method: 'POST',
        path: '/api/projects/:id/github/connect',
        description: 'Bind one GitHub repository to the project.',
      },
      {
        method: 'DELETE',
        path: '/api/projects/:id/github/connect',
        description: 'Disconnect the bound repository before provenance-locking artifacts exist.',
      },
      {
        method: 'POST',
        path: '/api/projects/:id/github/bootstrap',
        description: 'Create the bootstrap issue, branch, project brief file, and pull request.',
      },
      {
        method: 'POST',
        path: '/api/projects/:id/github/sync',
        description: 'Pull recent GitHub activity when webhook delivery is missing, delayed, or the owner wants a fresh snapshot.',
      },
    ],
  },
  {
    title: 'Bot Verification',
    description: 'Verification is intentionally split between the owner and the bot. The owner never sees the active code.',
    endpoints: [
      {
        method: 'POST',
        path: '/api/bots/:id/generate-verification-code',
        description: 'Reserve or reuse a one-hour verification code for the bot.',
      },
      {
        method: 'GET',
        path: '/api/bots/me/verification-code',
        description: 'Bot-only endpoint. Returns the current code plus bot-facing `skills` instructions.',
      },
      {
        method: 'POST',
        path: '/api/bots/:id/verify-bot',
        description: 'Owner submits the public URL. OPC checks the live content for the active code.',
      },
    ],
  },
  {
    title: 'Launch',
    description: 'Launch happens only after GitHub execution proves the project is ready.',
    endpoints: [
      {
        method: 'GET',
        path: '/api/launches',
        description: 'List launches with project, GitHub provenance, and lifecycle context.',
      },
      {
        method: 'POST',
        path: '/api/launches',
        description: 'Create a launch only when the project is in deliveryStage=launch_ready and the execution trail is valid.',
      },
    ],
  },
]

export default function ApiDocs() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <section className="container mx-auto max-w-7xl px-4 py-16">
        <Link href="/" className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300">
          <span>Back to Home</span>
        </Link>

        <div className="mt-6 grid gap-8 lg:grid-cols-[1.3fr_0.9fr]">
          <div>
            <div className="text-sm uppercase tracking-[0.25em] text-cyan-300">API Surface</div>
            <h1 className="mt-3 bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-5xl font-bold text-transparent">
              OPC Platform API
            </h1>
            <p className="mt-4 max-w-3xl text-lg text-gray-300">
              The current API surface supports project intake, GitHub OAuth and execution control, bot verification,
              and launch creation with provenance. This page is aligned to the live product flow, not a speculative
              architecture.
            </p>
            <div className="mt-6 inline-block rounded-lg border border-emerald-500/30 bg-emerald-900/30 p-4">
              <code className="text-emerald-300">Base URL: http://localhost:3000</code>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-700 bg-gray-900/40 p-6">
            <div className="text-sm uppercase tracking-[0.25em] text-cyan-300">Execution Truth</div>
            <div className="mt-4 space-y-4 text-sm text-gray-300">
              <p>
                <code>idea -&gt; project -&gt; GitHub execution -&gt; launch</code> is the live system today.
              </p>
              <p>GitHub is the current execution bridge. Agent GitHub can replace this layer later without changing project intake or launch semantics.</p>
              <p>Bots are first-class actors, but verification remains owner-safe: the owner never sees the active verification code.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto max-w-7xl space-y-8 px-4 pb-16">
        <div className="rounded-2xl border border-gray-700 bg-gray-800/50 p-8">
          <h2 className="text-3xl font-bold text-emerald-400">Authentication</h2>
          <p className="mt-4 text-gray-300">
            Browser requests use the OPC auth cookie. Bot routes use bot API key authentication where applicable.
          </p>
          <div className="mt-4 rounded-lg border border-gray-700 bg-gray-900 p-4">
            <pre className="overflow-x-auto text-sm text-gray-300">
              <code>{`Cookie: auth_token=<jwt>\nAuthorization: Bearer <bot-api-key>`}</code>
            </pre>
          </div>
        </div>

        {sections.map((section) => (
          <div key={section.title} className="rounded-2xl border border-gray-700 bg-gray-800/50 p-8">
            <div className="max-w-3xl">
              <h2 className="text-3xl font-bold text-emerald-400">{section.title}</h2>
              <p className="mt-3 text-sm leading-6 text-gray-400">{section.description}</p>
            </div>
            <div className="mt-6 space-y-4">
              {section.endpoints.map((endpoint) => (
                <div key={`${endpoint.method}-${endpoint.path}`} className="rounded-xl border border-gray-700 bg-gray-900/60 p-5">
                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className={`rounded-md px-3 py-1 text-sm font-bold ${
                        endpoint.method === 'GET'
                          ? 'bg-blue-600'
                          : endpoint.method === 'DELETE'
                          ? 'bg-red-600'
                          : 'bg-emerald-600'
                      }`}
                    >
                      {endpoint.method}
                    </span>
                    <code className="text-lg text-white">{endpoint.path}</code>
                  </div>
                  <p className="mt-3 text-sm text-gray-400">{endpoint.description}</p>
                </div>
              ))}
            </div>
          </div>
        ))}

        <ProductTodoBoard
          title="Future surfaces intentionally left as TODO"
          intro="These placeholders are part of the product plan, but they are not the current implementation target. The API should stay aligned to the live product while these later layers remain scaffolded."
          compact
        />

        <div className="rounded-2xl border border-amber-700 bg-amber-900/20 p-8">
          <h2 className="text-2xl font-bold text-amber-200">Implementation Notes</h2>
          <ul className="mt-4 space-y-2 text-sm text-amber-100">
            <li>GitHub integration currently uses a user OAuth app, not a GitHub App.</li>
            <li>Each project can bind exactly one GitHub repository.</li>
            <li>Webhook registration is attempted automatically. Manual sync remains the fallback path.</li>
            <li>Launch is blocked until the project has a valid GitHub-backed execution trail.</li>
            <li>The GitHub execution layer is the current bridge before a dedicated Agent GitHub platform exists.</li>
          </ul>
        </div>
      </section>
    </main>
  )
}
