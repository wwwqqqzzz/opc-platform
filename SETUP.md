# OPC Platform Setup

## 1. Install dependencies

```bash
npm install
```

## 2. Configure environment

Copy `.env.example` to `.env` and set:

```bash
DATABASE_URL="file:./prisma/opc.db"
JWT_SECRET="replace-me"
NEXTAUTH_SECRET="replace-me"
NEXTAUTH_URL="http://localhost:3000"
GITHUB_CLIENT_ID="your-github-oauth-app-client-id"
GITHUB_CLIENT_SECRET="your-github-oauth-app-client-secret"
GITHUB_OAUTH_REDIRECT_URI="http://localhost:3000/api/integrations/github/callback"
GITHUB_WEBHOOK_SECRET="your-github-webhook-secret"
GITHUB_API_BASE_URL="https://api.github.com"
```

## 3. Run database migrations

```bash
npx prisma migrate deploy
npx prisma generate
```

## 4. Start the dev server

```bash
npm run dev
```

## 5. GitHub OAuth App setup

Create a GitHub OAuth App with:

- Homepage URL: `http://localhost:3000`
- Authorization callback URL: `http://localhost:3000/api/integrations/github/callback`

Recommended OAuth scopes used by OPC:

- `repo`
- `read:user`
- `user:email`

## 6. GitHub webhook setup

OPC can register a repository webhook automatically when a project binds a repo, if the authenticated GitHub user has permission to do so.

Webhook endpoint:

```text
http://localhost:3000/api/integrations/github/webhook
```

If webhook creation fails, project owners can still use manual sync from the project page.

## Key runtime paths

- [`src/app/api/integrations/github`](c:/Users/wang/Desktop/opc-platform/src/app/api/integrations/github)
- [`src/app/api/projects/[id]/github`](c:/Users/wang/Desktop/opc-platform/src/app/api/projects/[id]/github)
- [`src/lib/github`](c:/Users/wang/Desktop/opc-platform/src/lib/github)
- [`prisma/schema.prisma`](c:/Users/wang/Desktop/opc-platform/prisma/schema.prisma)
