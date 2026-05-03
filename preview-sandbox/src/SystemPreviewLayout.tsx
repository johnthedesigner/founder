import type { ProjectConfig } from '@ds-gen/types'

const SHADE_KEYS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]

const RADIUS_SIZES = ['sm', 'md', 'lg', 'full'] as const

const TYPE_STEPS = [
  { name: '4xl', ratio: 6 },
  { name: '3xl', ratio: 5 },
  { name: '2xl', ratio: 4 },
  { name: 'xl', ratio: 3 },
  { name: 'lg', ratio: 2 },
  { name: 'md', ratio: 1 },
  { name: 'base', ratio: 0 },
  { name: 'sm', ratio: -1 },
]

function scaledSize(ratio: number, scaleRatio: number): number {
  return Math.round(16 * Math.pow(scaleRatio, ratio))
}

const SECTION_LABEL: React.CSSProperties = {
  fontSize: '10px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: '#9ca3af',
  marginBottom: '10px',
}

const SECTION: React.CSSProperties = {
  marginBottom: '28px',
}

export function SystemPreviewLayout({ config }: { config: ProjectConfig }) {
  return (
    <div
      style={{
        padding: '20px 24px',
        fontFamily: 'var(--font-body)',
        backgroundColor: '#fff',
        minHeight: '100vh',
      }}
    >
      {/* Primary scale */}
      <section style={SECTION}>
        <div style={SECTION_LABEL}>Primary</div>
        <div style={{ display: 'flex', gap: '3px' }}>
          {SHADE_KEYS.map((shade) => (
            <div key={shade} style={{ flex: 1, textAlign: 'center' }}>
              <div
                style={{
                  height: '36px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: `var(--color-primary-${shade})`,
                  marginBottom: '4px',
                }}
              />
              <span style={{ fontSize: '9px', color: '#9ca3af' }}>{shade}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Neutral scale */}
      <section style={SECTION}>
        <div style={SECTION_LABEL}>Neutral</div>
        <div style={{ display: 'flex', gap: '3px' }}>
          {SHADE_KEYS.map((shade) => (
            <div key={shade} style={{ flex: 1, textAlign: 'center' }}>
              <div
                style={{
                  height: '36px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: `var(--color-neutral-${shade})`,
                  marginBottom: '4px',
                }}
              />
              <span style={{ fontSize: '9px', color: '#9ca3af' }}>{shade}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Type scale */}
      <section style={SECTION}>
        <div style={SECTION_LABEL}>Type Scale</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {TYPE_STEPS.map((step) => {
            const px = scaledSize(step.ratio, config.typography.scaleRatio)
            return (
              <div
                key={step.name}
                style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}
              >
                <span
                  style={{
                    fontSize: '10px',
                    color: '#9ca3af',
                    width: '60px',
                    flexShrink: 0,
                  }}
                >
                  {step.name} / {px}px
                </span>
                <span
                  style={{
                    fontSize: `${px}px`,
                    fontFamily: 'var(--font-display)',
                    color: 'var(--color-neutral-900)',
                    lineHeight: 1.2,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  The quick brown fox
                </span>
              </div>
            )
          })}
        </div>
      </section>

      {/* Components */}
      <section style={SECTION}>
        <div style={SECTION_LABEL}>Components</div>
        <div
          style={{
            display: 'flex',
            gap: '10px',
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <button
            style={{
              backgroundColor: 'var(--color-primary-500)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              padding:
                'calc(var(--spacing-base) * 2) calc(var(--spacing-base) * 4)',
              fontSize: '14px',
              fontFamily: 'var(--font-body)',
              fontWeight: 500,
              cursor: 'default',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            Primary
          </button>
          <button
            style={{
              backgroundColor: 'transparent',
              color: 'var(--color-primary-600)',
              border: '1.5px solid var(--color-primary-300)',
              borderRadius: 'var(--radius-md)',
              padding:
                'calc(var(--spacing-base) * 2) calc(var(--spacing-base) * 4)',
              fontSize: '14px',
              fontFamily: 'var(--font-body)',
              fontWeight: 500,
              cursor: 'default',
            }}
          >
            Secondary
          </button>
          <input
            type="text"
            defaultValue="Input field"
            readOnly
            style={{
              border: '1.5px solid var(--color-neutral-300)',
              borderRadius: 'var(--radius-md)',
              padding:
                'calc(var(--spacing-base) * 2) calc(var(--spacing-base) * 3)',
              fontSize: '14px',
              fontFamily: 'var(--font-body)',
              color: 'var(--color-neutral-700)',
              outline: 'none',
              width: '140px',
            }}
          />
          <span
            style={{
              backgroundColor: 'var(--color-primary-100)',
              color: 'var(--color-primary-700)',
              borderRadius: 'var(--radius-full)',
              padding: '3px 10px',
              fontSize: '12px',
              fontFamily: 'var(--font-body)',
              fontWeight: 500,
            }}
          >
            Badge
          </span>
        </div>
      </section>

      {/* Radius */}
      <section style={SECTION}>
        <div style={SECTION_LABEL}>Radius</div>
        <div style={{ display: 'flex', gap: '16px' }}>
          {RADIUS_SIZES.map((size) => (
            <div key={size} style={{ textAlign: 'center' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  backgroundColor: 'var(--color-primary-100)',
                  border: '2px solid var(--color-primary-300)',
                  borderRadius: `var(--radius-${size})`,
                  marginBottom: '6px',
                }}
              />
              <span style={{ fontSize: '10px', color: '#9ca3af' }}>{size}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Shadow */}
      <section style={SECTION}>
        <div style={SECTION_LABEL}>Shadow</div>
        <div style={{ display: 'flex', gap: '20px' }}>
          {(['sm', 'md', 'lg'] as const).map((size) => (
            <div key={size} style={{ textAlign: 'center' }}>
              <div
                style={{
                  width: '60px',
                  height: '40px',
                  backgroundColor: '#fff',
                  border: '1px solid var(--color-neutral-100)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: `var(--shadow-${size})`,
                  marginBottom: '6px',
                }}
              />
              <span style={{ fontSize: '10px', color: '#9ca3af' }}>{size}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
