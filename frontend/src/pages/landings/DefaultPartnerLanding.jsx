import { Link } from 'react-router-dom'
import { ArrowRight, TrendingUp, Shield, Headphones } from 'lucide-react'
import suimfxLogo from '../../assets/suimfxLogo.png'

/** Polished default when admin slug has no dedicated template — still uses their logo/name & branded auth. */
export default function DefaultPartnerLanding ({ branding }) {
  const slug = branding.adminSlug
  const name = (branding.brandName || 'Trading').trim() || 'Trading'
  const logoSrc = branding.logo || suimfxLogo
  const login = `/${slug}/login`
  const signup = `/${slug}/signup`

  return (
    <main className="relative min-h-screen bg-slate-950 text-white overflow-x-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#1e3a5f_0%,_transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_#312e81_0%,_transparent_50%)]" />

      <nav className="relative z-10 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 md:h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={logoSrc} alt={name} className="h-12 md:h-14 w-auto object-contain" />
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link to={login} className="px-3 sm:px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors">
              Sign in
            </Link>
            <Link
              to={signup}
              className="px-4 sm:px-5 py-2.5 text-sm font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/25"
            >
              Create account
            </Link>
          </div>
        </div>
      </nav>

      <section className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 pt-16 md:pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 mb-8">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
          </span>
          <span className="text-sm font-medium text-blue-300">Live markets · Fast execution</span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white leading-tight mb-6">
          Welcome to{' '}
          <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">{name}</span>
        </h1>
        <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          Open your trading account, fund your wallet, and access forex, indices, metals and more from one platform.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
          <Link
            to={signup}
            className="w-full sm:w-auto px-8 py-4 text-lg font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-xl shadow-blue-500/30 flex items-center justify-center gap-2"
          >
            Get started <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            to={login}
            className="w-full sm:w-auto px-8 py-4 text-lg font-semibold text-white border border-slate-600 rounded-xl hover:bg-slate-800/50 transition-all"
          >
            Sign in
          </Link>
        </div>

        <div className="grid sm:grid-cols-3 gap-6 text-left">
          {[
            { icon: TrendingUp, title: 'Trade global markets', text: 'Forex, commodities, indices and more with competitive conditions.' },
            { icon: Shield, title: 'Secure & transparent', text: 'Your account and funds protected with industry-standard practices.' },
            { icon: Headphones, title: 'Support when you need it', text: 'Reach out through your dashboard support section anytime.' }
          ].map(({ icon: Icon, title, text }) => (
            <div
              key={title}
              className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-blue-500/40 transition-colors"
            >
              <div className="w-11 h-11 rounded-xl bg-blue-600/20 flex items-center justify-center mb-4">
                <Icon className="w-5 h-5 text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="relative z-10 border-t border-slate-800 py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img src={logoSrc} alt="" className="h-10 w-auto opacity-90 object-contain" />
            <span className="text-slate-500 text-sm">© {new Date().getFullYear()} {name}</span>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <Link to={login} className="text-slate-400 hover:text-white transition-colors">Sign in</Link>
            <Link to={signup} className="text-slate-400 hover:text-white transition-colors">Create account</Link>
          </div>
        </div>
      </footer>
    </main>
  )
}
