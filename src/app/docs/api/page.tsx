import Link from 'next/link'

const sections = [
  {
    title: 'Project Intake',
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
        description: 'Get a single project with GitHub panel data, activity history, and lifecycle events.',
      },
    ],
  },
  {
    title: 'GitHub Integration',
    endpoints: [
      {
        method: 'GET',
        path: '/api/integrations/github/connect',
        description: 'Start GitHub OAuth.',
      },
      {
        method: 'GET',
        path: '/api/integrations/github/callback',
        description: 'GitHub OAuth callback endpoint.',
      },
      {
        method: 'GET',
        path: '/api/integrations/github/me',
        description: 'Get the current user GitHub connection summary.',
      },
      {
        method: 'POST',
        path: '/api/integrations/github/disconnect',
        description: 'Disconnect the current user GitHub account.',
      },
      {
        method: 'POST',
        path: '/api/integrations/github/webhook',
        description: 'Receive GitHub repository webhook events and sync them into OPC.',
      },
    ],
  },
  {
    title: 'Project GitHub Execution',
    endpoints: [
      {
        method: 'GET',
        path: '/api/projects/:id/github',
        description: 'Read the project GitHub panel, activity list, and lifecycle timeline.',
      },
      {
        method: 'POST',
        path: '/api/projects/:id/github/connect',
        description: 'Bind one GitHub repository to the project.',
      },
      {
        method: 'POST',
        path: '/api/projects/:id/github/bootstrap',
        description: 'Create the bootstrap issue, branch, project brief file, and pull request.',
      },
      {
        method: 'POST',
        path: '/api/projects/:id/github/sync',
        description: 'Manually pull recent GitHub activity when webhook delivery is missing or delayed.',
      },
    ],
  },
  {
    title: 'Launch',
    endpoints: [
      {
        method: 'GET',
        path: '/api/launches',
        description: 'List launches with project, GitHub provenance, and lifecycle context.',
      },
      {
        method: 'POST',
        path: '/api/launches',
        description: 'Launch a project only after it reaches deliveryStage=launch_ready.',
      },
    ],
  },
]

export default function ApiDocs() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <section className="container mx-auto px-4 py-16">
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300">
            <span>Back to Home</span>
          </Link>
        </div>

        <h1 className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-5xl font-bold text-transparent">
          OPC Platform API
        </h1>
        <p className="mt-4 max-w-3xl text-xl text-gray-400">
          Current API surface for idea intake, project creation, GitHub OAuth, repository binding, bootstrap workflow creation, sync, and launch.
        </p>
        <div className="mt-6 inline-block rounded-lg border border-emerald-500/30 bg-emerald-900/30 p-4">
          <code className="text-emerald-400">Base URL: http://localhost:3000</code>
        </div>
      </section>

      <section className="container mx-auto space-y-8 px-4 py-8">
        <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-8">
          <h2 className="text-3xl font-bold text-emerald-400">Authentication</h2>
          <p className="mt-4 text-gray-300">
            Browser requests use the OPC auth cookie. Bot routes continue to use bot API key authentication where applicable.
          </p>
          <div className="mt-4 rounded-lg border border-gray-700 bg-gray-900 p-4">
            <pre className="overflow-x-auto text-sm text-gray-300">
              <code>{`Cookie: auth_token=<jwt>\nAuthorization: Bearer <bot-api-key>`}</code>
            </pre>
          </div>
        </div>

        {sections.map((section) => (
          <div key={section.title} className="rounded-lg border border-gray-700 bg-gray-800/50 p-8">
            <h2 className="text-3xl font-bold text-emerald-400">{section.title}</h2>
            <div className="mt-6 space-y-4">
              {section.endpoints.map((endpoint) => (
                <div key={endpoint.path} className="rounded-lg border border-gray-700 bg-gray-900/60 p-5">
                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className={`rounded-md px-3 py-1 text-sm font-bold ${
                        endpoint.method === 'GET' ? 'bg-blue-600' : 'bg-emerald-600'
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

        <div className="rounded-lg border border-amber-700 bg-amber-900/20 p-8">
          <h2 className="text-2xl font-bold text-amber-200">Implementation Notes</h2>
          <ul className="mt-4 space-y-2 text-sm text-amber-100">
            <li>GitHub integration currently uses a user OAuth app, not a GitHub App.</li>
            <li>Each project can bind exactly one GitHub repository.</li>
            <li>Webhook registration is attempted automatically; if it fails, owners can still use manual sync.</li>
            <li>The GitHub execution layer is the current bridge before a dedicated Agent GitHub platform exists.</li>
          </ul>
        </div>
      </section>
    </main>
  )
}
