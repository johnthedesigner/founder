import type { Project } from '../../api/projects'
import { ProjectCard } from './ProjectCard'

interface ProjectGridProps {
  projects: Project[]
  onMutate: () => void
}

export function ProjectGrid({ projects, onMutate }: ProjectGridProps) {
  if (projects.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500 text-lg">No projects yet</p>
        <p className="text-gray-400 text-sm mt-1">
          Create your first design system to get started.
        </p>
      </div>
    )
  }

  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((project) => (
        <ProjectCard key={project.id} project={project} onMutate={onMutate} />
      ))}
    </ul>
  )
}
