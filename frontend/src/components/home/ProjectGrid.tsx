import type { Project } from '../../api/projects'

interface ProjectGridProps {
  projects: Project[]
}

export function ProjectGrid({ projects }: ProjectGridProps) {
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
        <li
          key={project.id}
          className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
        >
          <h3 className="font-semibold text-gray-900">{project.name}</h3>
          <p className="mt-1 text-sm text-gray-500">{project.config.projectType}</p>
          <p className="mt-3 text-xs text-gray-400">
            Updated {new Date(project.updatedAt).toLocaleDateString()}
          </p>
        </li>
      ))}
    </ul>
  )
}
