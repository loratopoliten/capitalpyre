import { Link } from 'react-router-dom'

const FEATURES = [
  { icon: '⚡', title: 'Smart Matching',       desc: 'Our algorithm connects the right capital to the right opportunity — scored and ranked.' },
  { icon: '◈',  title: 'Capital Readiness',    desc: 'Know your score. Every entrepreneur and SME gets a 0–100 readiness rating investors can trust.' },
  { icon: '◉',  title: 'Deal Room',            desc: 'Secure document exchange, NDA management, and deal stage tracking — all in one place.' },
  { icon: '▲',  title: 'Bond Instruments',     desc: 'Vetted SMEs are pooled into institutional-grade bond structures listed on the BSE.' },
  { icon: '✉',  title: 'Direct Messaging',     desc: 'Real-time encrypted messaging between matched entrepreneurs and investors.' },
  { icon: '★',  title: 'Watchlist & Pipeline', desc: 'Save promising profiles, track deal flow, and never lose sight of an opportunity.' },
]

const STATS = [
  { value: '~20,000', label: 'SMEs in Botswana' },
  { value: '0–100',   label: 'CRS Score Range' },
  { value: '4+',      label: 'Revenue Streams' },
  { value: '62%',     label: 'Year 3 Margin Target' },
]

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#000D1A] text-gray-100">

      {/* ── Nav ────────────────────────────────────────── */}
      <nav className="flex items-center justify-between px-8 md:px-12 h-14 border-b border-pyre-gold/20 sticky top-0 bg-[#000D1A]/90 backdrop-blur-sm z-50">
        <span className="font-display font-bold text-lg tracking-wide">
          CAPITAL <span className="text-pyre-gold">PYRE</span>
        </span>
        <div className="flex items-center gap-4">
          <Link to="/login"    className="text-sm text-pyre-muted hover:text-white transition-colors">Sign in</Link>
          <Link to="/register" className="btn-primary py-2 px-4 text-xs">Get Started</Link>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────── */}
      <section className="px-8 md:px-12 pt-20 pb-16 max-w-5xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-pyre-gold/10 border border-pyre-gold/20 rounded-full px-3 py-1 mb-8">
          <span className="w-1.5 h-1.5 bg-pyre-gold rounded-full animate-pulse" />
          <span className="text-xs text-pyre-gold font-medium">Botswana's Capital Network</span>
        </div>
        <h1 className="font-display font-bold text-4xl md:text-6xl leading-tight text-white mb-6 max-w-3xl">
          Where capital<br />
          <span className="text-pyre-gold">ignites.</span>
        </h1>
        <p className="text-base md:text-lg text-pyre-muted max-w-2xl leading-relaxed mb-10">
          Capital Pyre connects entrepreneurs and SMEs with the right investors — from angel rounds to BSE-listed bond instruments. Built for Botswana's next generation of business.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link to="/register?role=entrepreneur" className="btn-primary">I'm an Entrepreneur</Link>
          <Link to="/register?role=investor"     className="btn-secondary">I'm an Investor</Link>
          <Link to="/register?role=sme"          className="btn-ghost">I'm an SME</Link>
        </div>
      </section>

      {/* ── Stats ──────────────────────────────────────── */}
      <section className="px-8 md:px-12 py-10 border-y border-pyre-gold/10 bg-pyre-navy/30">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map(s => (
            <div key={s.label} className="text-center">
              <p className="font-display font-bold text-2xl md:text-3xl text-pyre-gold">{s.value}</p>
              <p className="text-xs text-pyre-muted mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ───────────────────────────────────── */}
      <section className="px-8 md:px-12 py-20 max-w-5xl mx-auto">
        <h2 className="font-display font-bold text-2xl text-white text-center mb-2">
          Everything the deal needs
        </h2>
        <p className="text-pyre-muted text-center text-sm mb-12">One platform, every stage of the funding journey.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {FEATURES.map(f => (
            <div key={f.title} className="card hover:border-pyre-gold/50 transition-colors group">
              <span className="text-2xl mb-3 block text-pyre-gold group-hover:scale-110 transition-transform">{f.icon}</span>
              <h3 className="font-display font-semibold text-white mb-2 text-sm">{f.title}</h3>
              <p className="text-xs text-pyre-muted leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────── */}
      <section className="px-8 md:px-12 py-16 border-t border-pyre-gold/10 text-center">
        <p className="text-pyre-muted text-xs italic mb-4 max-w-lg mx-auto">
          "When we fix access to capital, we don't just grow economies — we change lives from the ground up."
        </p>
        <Link to="/register" className="btn-primary">
          Start your journey →
        </Link>
      </section>

      {/* ── Footer ─────────────────────────────────────── */}
      <footer className="px-8 py-6 border-t border-pyre-gold/10 text-center">
        <span className="text-xs text-pyre-muted">
          © {new Date().getFullYear()} Capital Pyre · Where capital ignites · Botswana
        </span>
      </footer>

    </div>
  )
}
