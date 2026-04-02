import { Link } from 'react-router-dom'
import {
  ArrowRight, TrendingUp, Shield, Zap, BarChart3, Globe, CheckCircle2, Sparkles
} from 'lucide-react'
import suimfxLogo from '../../assets/suimfxLogo.png'

/**
 * Premium landing for LeoFX / leofx.world — emerald & slate theme.
 * Sign up / Sign in → BrandedSignup / BrandedLogin via slug.
 */
export default function LeofxWorldLanding ({ branding }) {
  const slug = branding.adminSlug
  const name = (branding.brandName || 'LeoFX').trim()
  const logoSrc = branding.logo || suimfxLogo
  const login = `/${slug}/login`
  const signup = `/${slug}/signup`

  return (
    <main className="min-h-screen bg-[#030712] text-white overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-emerald-600/15 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-teal-600/10 rounded-full blur-[140px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.03)_1px,transparent_1px)] bg-[size:72px_72px]" />
      </div>

      <header className="relative z-20 border-b border-emerald-500/10 bg-slate-950/70 backdrop-blur-xl sticky top-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 md:h-[4.5rem] flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={logoSrc} alt={name} className="h-11 md:h-12 w-auto object-contain" />
            <span className="font-semibold text-emerald-100 hidden sm:inline tracking-tight">{name}</span>
          </Link>
          <nav className="flex items-center gap-2 sm:gap-3">
            <a href="#markets" className="hidden md:inline text-sm text-slate-400 hover:text-white px-3">Markets</a>
            <a href="#why" className="hidden md:inline text-sm text-slate-400 hover:text-white px-3">Why us</a>
            <Link to={login} className="px-3 sm:px-4 py-2 text-sm font-medium text-slate-300 hover:text-white">
              Sign in
            </Link>
            <Link
              to={signup}
              className="px-4 sm:px-5 py-2.5 text-sm font-semibold rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20 hover:from-emerald-400 hover:to-teal-500 transition-all"
            >
              Create account
            </Link>
          </nav>
        </div>
      </header>

      <section className="relative z-10 px-4 sm:px-6 pt-14 md:pt-24 pb-20">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              Institutional-grade execution
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-[1.1] mb-6">
              Trade the world
              <span className="block mt-1 bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
                with {name}
              </span>
            </h1>
            <p className="text-lg text-slate-400 max-w-xl mb-8 leading-relaxed">
              Forex, indices, metals and more — tight pricing, fast fills, and a platform built for serious traders. Open your live account in minutes.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mb-10">
              <Link
                to={signup}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-xl shadow-emerald-500/25 hover:opacity-95 transition-opacity"
              >
                Open live account <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                to={login}
                className="inline-flex items-center justify-center px-8 py-4 rounded-xl font-semibold border border-slate-600 text-white hover:bg-slate-800/60 transition-colors"
              >
                Sign in to platform
              </Link>
            </div>
            <div className="flex flex-wrap gap-6 text-sm text-slate-500">
              {['Regulated process', 'Segregated funds', '24/5 support'].map((t) => (
                <span key={t} className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> {t}
                </span>
              ))}
            </div>
          </div>
          <div className="relative">
            <div className="rounded-2xl border border-emerald-500/20 bg-slate-900/40 backdrop-blur p-6 md:p-8 shadow-2xl shadow-emerald-500/5">
              <div className="flex items-center justify-between mb-6 text-xs text-slate-500 uppercase tracking-wider">
                <span>Market watch</span>
                <span className="text-emerald-400">Live</span>
              </div>
              {[
                { pair: 'EURUSD', bid: '1.0842', chg: '+0.12%' },
                { pair: 'XAUUSD', bid: '2,648.10', chg: '+0.35%' },
                { pair: 'GBPUSD', bid: '1.2631', chg: '-0.08%' }
              ].map((row) => (
                <div key={row.pair} className="flex items-center justify-between py-4 border-b border-slate-800 last:border-0">
                  <span className="font-mono font-medium text-white">{row.pair}</span>
                  <div className="text-right">
                    <div className="font-mono text-slate-200">{row.bid}</div>
                    <div className={row.chg.startsWith('+') ? 'text-emerald-400 text-xs' : 'text-rose-400 text-xs'}>{row.chg}</div>
                  </div>
                </div>
              ))}
              <p className="text-xs text-slate-600 mt-4 text-center">Illustrative prices — trade in the live terminal after signup.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="markets" className="relative z-10 py-20 md:py-28 border-y border-emerald-500/10 bg-slate-950/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">Markets you can trade</h2>
          <p className="text-slate-400 text-center max-w-2xl mx-auto mb-14">
            One account, multiple asset classes — diversify with clarity and control.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: Globe, title: 'Forex', desc: 'Majors, minors & crosses' },
              { icon: BarChart3, title: 'Indices', desc: 'Global equity indices' },
              { icon: TrendingUp, title: 'Metals', desc: 'Gold, silver & more' },
              { icon: Zap, title: 'Energies', desc: 'Oil & gas contracts' }
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-emerald-500/40 transition-colors">
                <Icon className="w-8 h-8 text-emerald-400 mb-4" />
                <h3 className="text-lg font-semibold text-white mb-1">{title}</h3>
                <p className="text-sm text-slate-400">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="why" className="relative z-10 py-20 md:py-28 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8">
          {[
            { icon: Shield, title: 'Risk-aware setup', text: 'Tools and transparency so you can size positions with confidence.' },
            { icon: Zap, title: 'Low-latency stack', text: 'Optimized paths from click to fill when markets move.' },
            { icon: TrendingUp, title: 'Growth path', text: 'Scale from first trade to active portfolio on one ecosystem.' }
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="text-center md:text-left p-2">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto md:mx-0 mb-5">
                <Icon className="w-7 h-7 text-emerald-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">{title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative z-10 py-16 md:py-20 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto text-center rounded-3xl border border-emerald-500/20 bg-gradient-to-b from-emerald-950/40 to-slate-950 p-10 md:p-14">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Ready to open your account?</h2>
          <p className="text-slate-400 mb-8">Use your branded sign up — you’ll stay on this site with {name} theming.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to={signup}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors"
            >
              Sign up now <ArrowRight className="w-5 h-5" />
            </Link>
            <Link to={login} className="inline-flex items-center justify-center px-8 py-4 rounded-xl font-semibold border border-slate-600 text-white hover:bg-slate-800/50">
              Already registered? Sign in
            </Link>
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-slate-800 py-10 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img src={logoSrc} alt="" className="h-9 w-auto opacity-90" />
            <span className="text-slate-500 text-sm">© {new Date().getFullYear()} {name}</span>
          </div>
          <div className="flex gap-6 text-sm">
            <Link to={login} className="text-slate-400 hover:text-emerald-400">Sign in</Link>
            <Link to={signup} className="text-slate-400 hover:text-emerald-400">Sign up</Link>
          </div>
        </div>
      </footer>
    </main>
  )
}
