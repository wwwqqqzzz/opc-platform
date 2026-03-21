import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/jwt'
import { prisma } from '@/lib/prisma'
import { commitGithubFile, createGithubBranch } from '@/lib/github/branches'
import { requireGithubAccessToken } from '@/lib/github/auth'
import { getOwnedProject } from '@/lib/github/guards'
import { createGithubIssue } from '@/lib/github/issues'
import { createGithubPullRequest } from '@/lib/github/pulls'
import { getGithubBootstrapBlocker } from '@/lib/projects/transitions'
import { createGithubActivity, createLifecycleEvent } from '@/lib/projects/lifecycle'
import { mapProjectDto } from '@/lib/github/mappers'

function buildProjectBrief(project: Awaited<ReturnType<typeof getOwnedProject>>) {
  const agentTeam = project.agentTeam ? JSON.parse(project.agentTeam) : []
  return [
    `# ${project.title}`,
    '',
    `## Overview`,
    project.description || 'No description provided.',
    '',
    `## Owner`,
    project.ownerName || 'Unknown owner',
    '',
    `## Source Post`,
    project.idea?.title || 'No linked source post',
    '',
    `## Target User`,
    project.idea?.targetUser || 'Not specified',
    '',
    `## Agent Team`,
    Array.isArray(agentTeam) && agentTeam.length > 0
      ? agentTeam
          .map((agent) => (typeof agent === 'string' ? `- ${agent}` : `- ${agent.name || 'Unnamed'} (${agent.type || 'unspecified'})`))
          .join('\n')
      : '- No agents specified',
    '',
    `## Launch Goal`,
    'Build the first working version in GitHub, then return the finished result to OPC Platform for launch.',
    '',
  ].join('\n')
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const project = await getOwnedProject(id, user.id)

    const bootstrapBlocker = getGithubBootstrapBlocker(project)
    if (bootstrapBlocker) {
      return NextResponse.json(
        { error: bootstrapBlocker },
        { status: 400 }
      )
    }

    if (!project.githubRepoOwner || !project.githubRepoName || !project.githubDefaultBranch) {
      return NextResponse.json({ error: 'Project repository is not connected.' }, { status: 400 })
    }

    const { accessToken } = await requireGithubAccessToken(user.id)

    const issueTitle = `[OPC] Build: ${project.title}`
    const issueBody = [
      `OPC Project: ${project.title}`,
      '',
      `Project ID: ${project.id}`,
      `Owner: ${project.ownerName || user.email}`,
      `Source Post: ${project.idea?.title || 'None'}`,
      `Target User: ${project.idea?.targetUser || 'Not specified'}`,
      '',
      '## Product Brief',
      project.description || 'No description provided.',
      '',
      '## Launch Goal',
      'Ship the build in GitHub, then return the result to OPC Platform for launch.',
    ].join('\n')

    const issue = await createGithubIssue(accessToken, project.githubRepoOwner, project.githubRepoName, {
      title: issueTitle,
      body: issueBody,
    })

    const branchName = `opc/${project.id}-bootstrap`
    await createGithubBranch(
      accessToken,
      project.githubRepoOwner,
      project.githubRepoName,
      project.githubDefaultBranch,
      branchName
    )

    await commitGithubFile(
      accessToken,
      project.githubRepoOwner,
      project.githubRepoName,
      branchName,
      '.opc/project-brief.md',
      buildProjectBrief(project),
      `[OPC] Add project brief for ${project.title}`
    )

    const pullRequest = await createGithubPullRequest(
      accessToken,
      project.githubRepoOwner,
      project.githubRepoName,
      {
        title: `[OPC] Bootstrap project: ${project.title}`,
        head: branchName,
        base: project.githubDefaultBranch,
        body: [
          `This PR bootstraps the OPC project workflow for ${project.title}.`,
          '',
          `Primary issue: #${issue.number}`,
          '',
          'Includes:',
          '- Project brief',
          '- Launch goal',
          '- Owner and agent team context',
        ].join('\n'),
      }
    )

    await prisma.project.update({
      where: { id: project.id },
      data: {
        githubPrimaryIssueNumber: issue.number,
        githubPrimaryPrNumber: pullRequest.number,
        githubWorkflowStatus: 'bootstrap_created',
        githubSyncStatus: 'idle',
        deliveryStage: 'agent_github',
        agentGithubStatus: 'queued',
        handoffRequestedAt: project.handoffRequestedAt || new Date(),
      },
    })

    await createGithubActivity(prisma, {
      projectId: project.id,
      eventType: 'issue_opened',
      title: `Bootstrap issue created: ${issue.title}`,
      url: issue.html_url,
      number: issue.number,
      status: issue.state,
      authorLogin: user.githubLogin || null,
    })
    await createGithubActivity(prisma, {
      projectId: project.id,
      eventType: 'pull_request_opened',
      title: `Bootstrap PR created: ${pullRequest.title}`,
      url: pullRequest.html_url,
      number: pullRequest.number,
      status: pullRequest.state,
      authorLogin: user.githubLogin || null,
      metadata: {
        branchName,
      },
    })

    await createLifecycleEvent(prisma, {
      projectId: project.id,
      eventType: 'github_bootstrap_started',
      title: 'GitHub workflow bootstrapped',
      description: 'OPC created the initial GitHub issue, branch, and pull request.',
      deliveryStage: 'agent_github',
      agentGithubStatus: 'queued',
      actorType: 'user',
      actorId: user.id,
      actorName: user.name || user.email,
      metadata: {
        branchName,
      },
    })
    await createLifecycleEvent(prisma, {
      projectId: project.id,
      eventType: 'github_issue_created',
      title: 'Primary GitHub issue created',
      description: issue.title,
      deliveryStage: 'agent_github',
      agentGithubStatus: 'queued',
      actorType: 'user',
      actorId: user.id,
      actorName: user.name || user.email,
      metadata: {
        issueNumber: issue.number,
        issueUrl: issue.html_url,
      },
    })
    await createLifecycleEvent(prisma, {
      projectId: project.id,
      eventType: 'github_pr_created',
      title: 'Bootstrap pull request created',
      description: pullRequest.title,
      deliveryStage: 'agent_github',
      agentGithubStatus: 'queued',
      actorType: 'user',
      actorId: user.id,
      actorName: user.name || user.email,
      metadata: {
        pullRequestNumber: pullRequest.number,
        pullRequestUrl: pullRequest.html_url,
        branchName,
      },
    })

    const refreshedProject = await prisma.project.findUniqueOrThrow({
      where: { id: project.id },
      include: {
        idea: true,
        launch: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            githubLogin: true,
            githubName: true,
            githubAvatarUrl: true,
            githubConnectedAt: true,
          },
        },
        githubActivities: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
        lifecycleEvents: {
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    return NextResponse.json({ project: mapProjectDto(refreshedProject) })
  } catch (error) {
    console.error('Failed to bootstrap GitHub workflow:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to bootstrap GitHub workflow' },
      { status: error instanceof Error && error.message === 'Unauthorized' ? 403 : 500 }
    )
  }
}
