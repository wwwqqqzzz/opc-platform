import type { ProjectDto } from '@/types/projects'

export type OnboardingStepId =
  | 'claim_project'
  | 'connect_github'
  | 'connect_repository'
  | 'bootstrap_workflow'
  | 'sync_github'
  | 'launch_project'
  | 'complete'

export interface OnboardingStepState {
  id: OnboardingStepId
  title: string
  description: string
  complete: boolean
}

export type OnboardingStepVisualState = 'done' | 'current' | 'upcoming'

export interface UserOnboardingState {
  currentStep: OnboardingStepId
  title: string
  description: string
  ctaLabel: string
  ctaHref: string
  steps: OnboardingStepState[]
  activeProject: ProjectDto | null
}

function getActiveProject(projects: ProjectDto[]) {
  return (
    projects.find((project) => project.status !== 'launched' && !project.launch) ||
    projects[0] ||
    null
  )
}

export function getProjectExecutionLabel(project: ProjectDto) {
  if (!project.githubRepoFullName) {
    return 'Connect repository'
  }

  if (!project.githubPrimaryIssueNumber || !project.githubPrimaryPrNumber) {
    return 'Start bootstrap'
  }

  if (!project.githubLastSyncedAt || project.githubSyncStatus === 'error') {
    return 'Run sync'
  }

  if (project.deliveryStage === 'launch_ready' && !project.launch) {
    return 'Create launch'
  }

  if (project.launch) {
    return 'Monitor launch'
  }

  return 'Keep shipping'
}

export function getOnboardingStepVisualState(
  step: OnboardingStepState,
  currentStep: OnboardingStepId
): OnboardingStepVisualState {
  if (step.complete) {
    return 'done'
  }

  if (step.id === currentStep) {
    return 'current'
  }

  return 'upcoming'
}

export function getUserOnboardingState(
  projects: ProjectDto[],
  githubConnected: boolean
): UserOnboardingState {
  const activeProject = getActiveProject(projects)
  const hasProject = Boolean(activeProject)
  const repoConnected = Boolean(activeProject?.githubRepoFullName)
  const bootstrapCreated = Boolean(
    activeProject?.githubPrimaryIssueNumber && activeProject.githubPrimaryPrNumber
  )
  const syncHealthy = Boolean(
    activeProject?.githubLastSyncedAt && activeProject.githubSyncStatus !== 'error'
  )
  const launchReady = Boolean(
    activeProject?.deliveryStage === 'launch_ready' && !activeProject.launch
  )
  const launched = Boolean(activeProject?.launch)

  const steps: OnboardingStepState[] = [
    {
      id: 'claim_project',
      title: 'Claim an idea into a project',
      description: 'Projects are the starting point for GitHub execution in OPC.',
      complete: hasProject,
    },
    {
      id: 'connect_github',
      title: 'Connect your GitHub account',
      description: 'Authorize GitHub once so OPC can bind repositories and create bootstrap artifacts.',
      complete: githubConnected,
    },
    {
      id: 'connect_repository',
      title: 'Connect one repository',
      description: 'Each project keeps one repository as its source of truth.',
      complete: repoConnected,
    },
    {
      id: 'bootstrap_workflow',
      title: 'Create bootstrap issue and PR',
      description: 'OPC creates the first issue, branch, and pull request for execution tracking.',
      complete: bootstrapCreated,
    },
    {
      id: 'sync_github',
      title: 'Sync GitHub activity',
      description: 'Pull back commits, PR state, workflows, and releases so OPC can evaluate readiness.',
      complete: syncHealthy,
    },
    {
      id: 'launch_project',
      title: 'Send the project to launch',
      description: 'Once GitHub reaches launch-ready state, create the launch entry.',
      complete: launchReady || launched,
    },
  ]

  if (!hasProject) {
    return {
      currentStep: 'claim_project',
      title: 'Start with one project',
      description: 'Claim an idea first. Once a project exists, OPC can guide you through the full GitHub execution flow.',
      ctaLabel: 'Find an idea to claim',
      ctaHref: '/ideas/human',
      steps,
      activeProject,
    }
  }

  if (!githubConnected) {
    return {
      currentStep: 'connect_github',
      title: 'Connect GitHub before execution starts',
      description: `Your active project is "${activeProject.title}". Connect GitHub so you can bind a repository and create the first workflow artifacts.`,
      ctaLabel: 'Open GitHub settings',
      ctaHref: '/dashboard/settings',
      steps,
      activeProject,
    }
  }

  if (!repoConnected) {
    return {
      currentStep: 'connect_repository',
      title: 'Connect the project repository',
      description: `Bind one repository to "${activeProject.title}" so GitHub becomes the source of truth for this build.`,
      ctaLabel: 'Open active project',
      ctaHref: `/project/${activeProject.id}`,
      steps,
      activeProject,
    }
  }

  if (!bootstrapCreated) {
    return {
      currentStep: 'bootstrap_workflow',
      title: 'Create the bootstrap workflow',
      description: `Create the primary issue and pull request for "${activeProject.title}" so delivery history starts from OPC.`,
      ctaLabel: 'Start bootstrap',
      ctaHref: `/project/${activeProject.id}`,
      steps,
      activeProject,
    }
  }

  if (!syncHealthy) {
    return {
      currentStep: 'sync_github',
      title: 'Run the first GitHub sync',
      description: `Bring back commit, PR, workflow, and release data for "${activeProject.title}" so OPC can track its real execution state.`,
      ctaLabel: 'Sync the project',
      ctaHref: `/project/${activeProject.id}`,
      steps,
      activeProject,
    }
  }

  if (launchReady) {
    return {
      currentStep: 'launch_project',
      title: 'This project can be launched now',
      description: `"${activeProject.title}" already reached launch-ready state. Create the launch entry while the execution trail is current.`,
      ctaLabel: 'Open launch-ready project',
      ctaHref: `/project/${activeProject.id}`,
      steps,
      activeProject,
    }
  }

  if (launched) {
    return {
      currentStep: 'complete',
      title: 'Execution loop completed',
      description: `"${activeProject.title}" already launched. Use the launch page as the public record and start the next project.`,
      ctaLabel: 'View launch board',
      ctaHref: '/launch',
      steps,
      activeProject,
    }
  }

  return {
    currentStep: 'sync_github',
    title: 'Keep the execution trail current',
    description: `Continue syncing "${activeProject.title}" after meaningful GitHub changes so OPC can keep its status and launch readiness accurate.`,
    ctaLabel: 'Open active project',
    ctaHref: `/project/${activeProject.id}`,
    steps,
    activeProject,
  }
}
