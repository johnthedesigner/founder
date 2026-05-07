import { Link } from 'react-router-dom'

const FEATURES = [
  {
    icon: '🎨',
    title: 'Palette-first color system',
    body: 'Choose from curated presets or supply your own brand colors. Every shade is generated algorithmically against WCAG contrast targets — no manual tweaking.',
  },
  {
    icon: '⚙️',
    title: 'Semantic + component tokens',
    body: 'Primitives, semantic tokens, and per-component tokens are generated in one pass. Export to CSS custom properties, W3C DTCG JSON, or a Tailwind config.',
  },
  {
    icon: '🤖',
    title: 'Agent API and CLI',
    body: 'Pull your design system into any codebase with one command. The agent API surfaces your full token spec so AI coding tools can reference it directly.',
  },
]

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Wordmark */}
      <div className="px-8 pt-8">
        <span className="text-sm font-semibold text-gray-900 tracking-tight">DS Gen</span>
      </div>

      {/* Hero */}
      <section className="mx-auto max-w-2xl px-8 pt-24 pb-20 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
          A design system built around your brand in minutes.
        </h1>
        <p className="mt-5 text-lg text-gray-500">
          Configure your palette, personality, and component scope — get a complete token set, component library, and documentation, ready to ship.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Link
            to="/new"
            className="rounded-md bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            Start for free
          </Link>
          <Link
            to="/login"
            className="rounded-md border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Sign in
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-4xl px-8 pb-24">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-xl border border-gray-100 bg-gray-50 p-6">
              <div className="mb-3 text-2xl">{f.icon}</div>
              <h3 className="mb-2 text-sm font-semibold text-gray-900">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
