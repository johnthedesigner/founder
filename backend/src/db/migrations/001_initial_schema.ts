import type { MigrationBuilder } from 'node-pg-migrate'

export const up = (pgm: MigrationBuilder) => {
  pgm.createTable('users', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    email: { type: 'text', unique: true, notNull: true },
    password_hash: { type: 'text', notNull: true },
    display_name: { type: 'text', notNull: true },
    email_verified: { type: 'boolean', notNull: true, default: false },
    deleted_at: { type: 'timestamptz' },
    created_at: { type: 'timestamptz', default: pgm.func('now()') },
  })
  pgm.createIndex('users', 'email', { name: 'idx_users_email' })

  pgm.createTable('email_verification_tokens', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    user_id: { type: 'uuid', references: 'users', onDelete: 'CASCADE' },
    token: { type: 'text', unique: true, notNull: true },
    expires_at: { type: 'timestamptz', notNull: true },
    used_at: { type: 'timestamptz' },
  })
  pgm.createIndex('email_verification_tokens', 'user_id', { name: 'idx_email_tokens_user' })

  pgm.createTable('password_reset_tokens', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    user_id: { type: 'uuid', references: 'users', onDelete: 'CASCADE' },
    token: { type: 'text', unique: true, notNull: true },
    expires_at: { type: 'timestamptz', notNull: true },
    used_at: { type: 'timestamptz' },
  })

  pgm.createTable('user_sessions', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    user_id: { type: 'uuid', references: 'users', onDelete: 'CASCADE' },
    jti: { type: 'text', unique: true, notNull: true },
    device_hint: { type: 'text' },
    ip_address: { type: 'inet' },
    last_active_at: { type: 'timestamptz', default: pgm.func('now()') },
    created_at: { type: 'timestamptz', default: pgm.func('now()') },
  })
  pgm.createIndex('user_sessions', 'user_id', { name: 'idx_sessions_user' })
  pgm.createIndex('user_sessions', 'jti', { name: 'idx_sessions_jti' })

  pgm.createTable('projects', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    user_id: { type: 'uuid', references: 'users', onDelete: 'CASCADE' },
    name: { type: 'text', notNull: true, default: "'My Design System'" },
    slug: { type: 'text', notNull: true },
    config: { type: 'jsonb', notNull: true },
    last_exported_at: { type: 'timestamptz' },
    created_at: { type: 'timestamptz', default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', default: pgm.func('now()') },
  })
  pgm.createIndex('projects', 'user_id', { name: 'idx_projects_user' })
  pgm.createIndex('projects', ['user_id', 'slug'], {
    name: 'idx_projects_slug',
    unique: true,
  })

  pgm.createTable('project_snapshots', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    project_id: { type: 'uuid', references: 'projects', onDelete: 'CASCADE' },
    config: { type: 'jsonb', notNull: true },
    label: { type: 'text' },
    created_at: { type: 'timestamptz', default: pgm.func('now()') },
  })
  pgm.createIndex('project_snapshots', 'project_id', { name: 'idx_snapshots_project' })
}

export const down = (pgm: MigrationBuilder) => {
  pgm.dropTable('project_snapshots')
  pgm.dropTable('projects')
  pgm.dropTable('user_sessions')
  pgm.dropTable('password_reset_tokens')
  pgm.dropTable('email_verification_tokens')
  pgm.dropTable('users')
}
