import type { MigrationBuilder } from 'node-pg-migrate'

export const up = (pgm: MigrationBuilder) => {
  // Drop the composite unique index on (user_id, slug) — cannot enforce uniqueness
  // across nulls correctly with a standard unique index once user_id is nullable.
  pgm.dropIndex('projects', ['user_id', 'slug'], { name: 'idx_projects_slug' })

  // Drop and re-add the FK so it uses SET NULL instead of CASCADE on user delete.
  pgm.dropConstraint('projects', 'projects_user_id_fkey')
  pgm.addConstraint('projects', 'projects_user_id_fkey', {
    foreignKeys: {
      columns: 'user_id',
      references: 'users(id)',
      onDelete: 'SET NULL',
    },
  })

  // Make user_id nullable.
  pgm.alterColumn('projects', 'user_id', { notNull: false })

  // Replace the dropped index with a partial unique index that only enforces
  // uniqueness when user_id is non-null (anonymous projects share no slug namespace).
  pgm.sql(
    `CREATE UNIQUE INDEX idx_projects_slug ON projects (user_id, slug) WHERE user_id IS NOT NULL`,
  )

  // Add owner_token for anonymous edit access. NULL for all authenticated projects.
  pgm.addColumn('projects', {
    owner_token: { type: 'text' },
  })
  pgm.addIndex('projects', 'owner_token', { name: 'idx_projects_owner_token', unique: true })
}

export const down = (pgm: MigrationBuilder) => {
  pgm.dropIndex('projects', 'owner_token', { name: 'idx_projects_owner_token' })
  pgm.dropColumn('projects', 'owner_token')

  pgm.sql(`DROP INDEX IF EXISTS idx_projects_slug`)

  pgm.alterColumn('projects', 'user_id', { notNull: true })

  pgm.dropConstraint('projects', 'projects_user_id_fkey')
  pgm.addConstraint('projects', 'projects_user_id_fkey', {
    foreignKeys: {
      columns: 'user_id',
      references: 'users(id)',
      onDelete: 'CASCADE',
    },
  })

  pgm.createIndex('projects', ['user_id', 'slug'], {
    name: 'idx_projects_slug',
    unique: true,
  })
}
