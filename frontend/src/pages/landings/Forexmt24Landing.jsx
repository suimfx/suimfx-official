import { Link } from 'react-router-dom'
import {
  ArrowRight, Shield, LineChart, Cpu, Award, CheckCircle2, Flame
} from 'lucide-react'
import suimfxLogo from '../../assets/suimfxLogo.png'

/**
 * Premium landing for ForexMT / forexmt24.com — gold & midnight theme.
 * Sign up / Sign in → BrandedSignup / BrandedLogin via slug.
 */
export default function Forexmt24Landing ({ branding }) {
  const slug = branding.adminSlug
  const name = (branding.brandName || 'ForexMT').trim()
  const logoSrc = branding.logo || suimfxLogo
  const login = `/${slug}/login`
  const signup = `/${slug}/signup`

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-40 right-0 w-[480px] h-[480px] bg-amber-500/12 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-0 w-[520px] h-[520px] bg-orange-600/8 rounded-full blur-[120px]" />
        <div className="absolute inset-0 opacity-[0.15] bg-[url('data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 0h60v60H0z\' fill=\'none\'/%3E%3Cpath d=\'M30 0L60 30 30 60 0 30z\' fill=\'%23d97706\' fill-opacity=\'.08\'/%3E%3C/svg%3E')]" />
      </div>

      <header className="relative z-20 border-b border-amber-500/15 bg-black/60 backdrop-blur-xl sticky top-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 md:h-[4.5rem] flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={logoSrc} alt={name} className="h-11 md:h-12 w-auto object-contain" />
            <span className="font-bold text-amber-100/95 hidden sm:inline tracking-tight">{name}</span>
          </Link>
          <nav className="flex items-center gap-2 sm:gap-3">
            <a href="#edge" className="hidden md:inline text-sm text-slate-400 hover:text-amber-200 px-3">Edge</a>
            <a href="#plans" className="hidden md:inline text-sm text-slate-400 hover:text-amber-200 px-3">Traders</a>
            <Link to={login} className="px-3 sm:px-4 py-2 text-sm font-medium text-slate-300 hover:text-amber-200">
              Login
            </Link>
            <Link
              to={signup}
              className="px-4 sm:px-5 py-2.5 text-sm font-bold rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 shadow-lg shadow-amber-500/25 hover:from-amber-400 hover:to-orange-500 transition-all"
            >
              Register
            </Link>
          </nav>
        </div>
      </header>

      <section className="relative z-10 px-4 sm:px-6 pt-12 md:pt-20 pb-16">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-200 text-sm font-medium mb-8">
            <Flame className="w-4 h-4 text-amber-400" />
            Built for active FX & CFD traders
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-[3.5rem] font-extrabold leading-tight mb-6 tracking-tight">
            Precision pricing.
            <span className="block mt-2 bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 bg-clip-text text-transparent">
              Power under {name}.
            </span>
          </h1>
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Execute on majors, gold, and indices with a streamlined workspace. Your branded login keeps you on this domain end-to-end.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link
              to={signup}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-10 py-4 rounded-xl font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 shadow-xl shadow-amber-500/20 transition-all"
            >
              Create trading account <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              to={login}
              className="w-full sm:w-auto inline-flex items-center justify-center px-10 py-4 rounded-xl font-semibold border-2 border-amber-500/40 text-amber-100 hover:bg-amber-500/10 transition-colors"
            >
              Member login
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto">
            {[
              { v: '24/5', l: 'Market access' },
              { v: '1:500', l: 'Leverage tiers' },
              { v: 'Fast', l: 'Execution focus' }
            ].map((s) => (
              <div key={s.l} className="py-4 px-2 rounded-xl bg-slate-900/80 border border-amber-500/10">
                <div className="text-xl md:text-2xl font-bold text-amber-300">{s.v}</div>
                <div className="text-xs text-slate-500 mt-1">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="edge" className="relative z-10 py-20 md:py-24 border-y border-amber-500/10 bg-gradient-to-b from-black/40 to-transparent">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">Your edge on the chart</h2>
          <p className="text-slate-400 text-center max-w-xl mx-auto mb-14">
            Everything routes through your official signup & login — same brand, same trust.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: LineChart, title: 'Pro charts', text: 'Track structure, levels, and volatility in one workspace.' },
              { icon: Cpu, title: 'Stable infrastructure', text: 'Designed for reliability when sessions get busy.' },
              { icon: Shield, title: 'Account security', text: 'Protecting access to your funds and personal data.' }
            ].map(({ icon: Icon, title, text }) => (
              <div key={title} className="p-8 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-amber-500/30 transition-colors">
                <Icon className="w-9 h-9 text-amber-400 mb-5" />
                <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="plans" className="relative z-10 py-20 md:py-24 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">Start in two steps</h2>
          <div className="space-y-4">
            {[
              { step: '1', title: 'Register with your email', body: `Open the sign up page — it’s tailored for ${name} clients.` },
              { step: '2', title: 'Verify & fund', body: 'Complete KYC where required, deposit, and launch the trading terminal from your dashboard.' }
            ].map((row) => (
              <div key={row.step} className="flex gap-5 p-6 rounded-2xl border border-slate-800 bg-slate-900/40">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center font-bold text-amber-300">
                  {row.step}
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">{row.title}</h3>
                  <p className="text-sm text-slate-400">{row.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 py-14 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto rounded-3xl overflow-hidden border border-amber-500/25 bg-gradient-to-br from-amber-950/50 via-slate-950 to-black p-10 md:p-16 text-center">
          <Award className="w-12 h-12 text-amber-400 mx-auto mb-6" />
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Join {name} on the live market</h2>
          <p className="text-slate-400 mb-8 max-w-lg mx-auto">
            Use the buttons below — they open your branded registration and login flows on this domain.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to={signup}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-bold bg-amber-500 text-slate-950 hover:bg-amber-400"
            >
              Go to sign up <ArrowRight className="w-5 h-5" />
            </Link>
            <Link to={login} className="inline-flex items-center justify-center px-8 py-4 rounded-xl font-semibold border border-amber-400/50 text-amber-100 hover:bg-amber-500/10">
              Go to login
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-6 text-xs text-slate-500">
            {['CFDs involve risk', 'Trade responsibly', 'Terms apply'].map((t) => (
              <span key={t} className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" /> {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-slate-800/80 py-10 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img src={logoSrc} alt="" className="h-9 w-auto opacity-95" />
            <span className="text-slate-500 text-sm">© {new Date().getFullYear()} {name}</span>
          </div>
          <div className="flex gap-8 text-sm">
            <Link to={login} className="text-slate-400 hover:text-amber-400 transition-colors">Login</Link>
            <Link to={signup} className="text-slate-400 hover:text-amber-400 transition-colors">Sign up</Link>
          </div>
        </div>
      </footer>
    </main>
  )
}
