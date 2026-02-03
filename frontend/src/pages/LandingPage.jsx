import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Filter, Target, Star, Lock, CheckCircle2, Database, Users, Code, 
  Activity, Globe, Shield, ChevronDown, ChevronUp, Zap, Brain, ShieldCheck, Bot,
  Menu, X
} from 'lucide-react'

// ============ NAVBAR COMPONENT ============
const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const navigate = useNavigate()

  const menuItems = [
    { name: 'White Label Solutions', href: '#' },
    { name: 'CRM & API', href: '#' },
    { name: 'Web Development', href: '#' },
    { name: 'Pricing', href: '#pricing' },
    { name: 'Contact', href: '#contact' },
  ]

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [mobileMenuOpen])

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-[100] w-full border-b transition-all duration-300 ${
        isScrolled ? 'bg-black/90 border-white/10 backdrop-blur-lg' : 'bg-black/40 border-white/5 backdrop-blur-lg'
      }`}>
        <div className="mx-auto flex h-[70px] md:h-[86px] max-w-[1440px] items-center justify-between px-4 md:px-6 xl:px-8">
          <div className="flex shrink-0 items-center">
            <a href="/" className="flex items-center" aria-label="SetupFX24 Home">
              <img 
                src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/document-uploads/setupFX24-logo-1766736768413.png?width=8000&height=8000&resize=contain" 
                alt="SetupFX24 Logo" 
                className="h-8 md:h-10 w-auto object-contain"
              />
            </a>
          </div>

          <div className="hidden items-center gap-x-6 lg:gap-x-8 lg:flex">
            {menuItems.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className="text-[14px] lg:text-[15px] font-medium text-white transition-opacity hover:opacity-80"
              >
                {item.name}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3 lg:gap-4">
            <a
              href="/user/login"
              className="rounded-lg border border-white/20 bg-white/5 px-4 lg:px-5 py-2 lg:py-2.5 text-[14px] lg:text-[15px] font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/10 active:scale-95"
            >
              Sign In
            </a>
            <a
              href="/user/signup"
              className="rounded-lg bg-white px-4 lg:px-5 py-2 lg:py-2.5 text-[14px] lg:text-[15px] font-semibold text-[#111111] transition-all hover:bg-opacity-90 active:scale-95"
            >
              Get Started
            </a>
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-white"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </nav>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[99] bg-black/95 backdrop-blur-lg md:hidden pt-[70px]">
          <div className="flex flex-col h-full px-6 py-8">
            <div className="flex flex-col gap-4">
              {menuItems.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-[18px] font-medium text-white py-3 border-b border-white/10 transition-opacity hover:opacity-80"
                >
                  {item.name}
                </a>
              ))}
            </div>
            <div className="mt-8 flex flex-col gap-4">
              <a
                href="/user/login"
                className="w-full rounded-lg border border-white/20 bg-white/5 px-5 py-3 text-[16px] font-semibold text-white transition-all hover:bg-white/10 text-center"
              >
                Sign In
              </a>
              <a
                href="/user/signup"
                className="w-full rounded-lg bg-white px-5 py-3 text-[16px] font-semibold text-[#111111] transition-all hover:bg-opacity-90 text-center"
              >
                Get Started
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ============ HERO COMPONENT ============
const Hero = () => {
  const navigate = useNavigate()

  return (
    <section className="relative w-full overflow-hidden bg-black text-white">
      <div className="absolute inset-0 z-0">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="w-full h-full object-cover object-center"
          poster="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/df683367-7790-4791-bf67-54d56d7ef621-ankar-ai/assets/images/OXXnRWwOHTLxnj6fGttTq13VSI-1.png"
        >
          <source src="/assets/setupfx%20video.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen flex-col items-center justify-center px-4 sm:px-6 pt-24 pb-12 md:px-12 lg:pt-32 lg:pb-24">
        <div className="relative flex w-full max-w-[1200px] flex-col items-center">
          <div className="pointer-events-none absolute -inset-x-2 -inset-y-8 sm:-inset-x-4 sm:-inset-y-12 lg:-inset-x-12 lg:-inset-y-20 hidden sm:block">
            <div className="absolute top-0 left-0 h-1.5 w-1.5 bg-white" />
            <div className="absolute top-0 right-0 h-1.5 w-1.5 bg-white" />
            <div className="absolute bottom-0 left-0 h-1.5 w-1.5 bg-white" />
            <div className="absolute bottom-0 right-0 h-1.5 w-1.5 bg-white" />
          </div>

          <a
            href="#"
            className="group mb-6 sm:mb-8 flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 sm:px-4 py-1.5 backdrop-blur-md transition-colors hover:bg-white/20"
          >
            <span className="text-[10px] sm:text-xs font-semibold tracking-wide uppercase md:text-sm">
              SetupFX24 White Label — Launch in 15 Days
            </span>
            <div className="flex h-4 w-4 items-center justify-center">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-3 w-3 transition-transform group-hover:translate-x-0.5"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>
          </a>

          <div className="max-w-[1000px] text-center px-2">
            <h1 className="text-[28px] sm:text-[36px] leading-[1.15] font-medium tracking-tight md:text-[56px] lg:text-[72px]">
              SetupFX24 — Empowering Forex Brokers with White Label Solution
            </h1>
          </div>

          <div className="mt-6 sm:mt-8 max-w-[840px] text-center px-2">
            <p className="text-[14px] sm:text-[16px] leading-[1.6] text-white/80 md:text-[18px]">
              Our comprehensive white-label solutions provide everything you need to launch and grow a successful forex brokerage, from a robust trading platform to a powerful CRM and dedicated support.
            </p>
          </div>

          <div className="mt-8 sm:mt-12 flex flex-col items-center gap-3 sm:gap-4 w-full sm:w-auto sm:flex-row">
            <a
              href="/user/signup"
              className="w-full sm:w-auto rounded-lg bg-white px-6 sm:px-8 py-3 sm:py-4 text-[14px] sm:text-[16px] font-bold text-black transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98] text-center"
            >
              Get Started
            </a>
            <a
              href="#"
              className="w-full sm:w-auto text-center rounded-lg border border-white/20 bg-white/5 px-6 sm:px-8 py-3 sm:py-4 text-[14px] sm:text-[16px] font-bold text-white backdrop-blur-sm transition-all hover:bg-white/10 active:scale-[0.98]"
            >
              Learn More
            </a>
          </div>

          <div className="mt-12 sm:mt-20 w-full max-w-[1000px]">
            <div className="mb-6 sm:mb-10 text-center">
              <h2 className="text-lg sm:text-xl md:text-2xl font-medium text-white/90">Unlock Boundless Growth with SetupFX24's White Label Solutions</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-8">
              {[
                { title: "Real-Time Trading", icon: "M13 10V3L4 14h7v7l9-11h-7z" },
                { title: "Deep Liquidity Access", icon: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" },
                { title: "Advanced Risk Management", icon: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" },
                { title: "Multi-Asset Support", icon: "M4 7h16M4 12h16m-7 5h7" }
              ].map((item, i) => (
                <div key={i} className="flex flex-col items-center text-center group">
                  <div className="mb-3 sm:mb-4 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-white/5 border border-white/10 transition-colors group-hover:bg-white/10">
                    <svg className="h-5 w-5 sm:h-6 sm:w-6 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                    </svg>
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-white/60">{item.title}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="absolute top-0 bottom-0 left-4 sm:left-12 w-[1px] bg-white opacity-5 lg:left-24 hidden sm:block" />
        <div className="absolute top-0 bottom-0 right-4 sm:right-12 w-[1px] bg-white opacity-5 lg:right-24 hidden sm:block" />
      </div>

      <div className="absolute bottom-0 left-0 h-32 w-full bg-gradient-to-t from-black to-transparent pointer-events-none" />
    </section>
  )
}

// ============ DASHBOARD PREVIEW COMPONENT ============
const DashboardPreview = () => {
  return (
    <section className="relative w-full bg-black py-20 px-6 md:px-12 overflow-hidden border-y border-gray-800">
      <div className="mx-auto max-w-[1200px]">
        <div className="relative rounded-2xl border border-gray-800 bg-gray-900 p-2 shadow-2xl transition-transform duration-500 hover:scale-[1.01]">
          <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl">
            <img
              src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/document-uploads/Screenshot-2025-10-30-at-11-1766736547869.webp?width=8000&height=8000&resize=contain"
              alt="SetupFX24 Trading Dashboard Preview"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="absolute -top-4 -right-4 h-24 w-24 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute -bottom-4 -left-4 h-24 w-24 rounded-full bg-white/5 blur-3xl" />
        </div>
      </div>
    </section>
  )
}

// ============ PLATFORM PROCESS COMPONENT ============
const PlatformProcess = () => {
  const steps = [
    {
      title: "Discovery & Branding",
      description: "Initial consultation to define your brand identity and business requirements.",
      image: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/df683367-7790-4791-bf67-54d56d7ef621-ankar-ai/assets/images/2fNNZEzL755aVuKeUK1tPzTBg88-11.png",
    },
    {
      title: "Platform & CRM Setup",
      description: "Technical configuration of your branded trading platform and enterprise CRM.",
      image: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/df683367-7790-4791-bf67-54d56d7ef621-ankar-ai/assets/images/uWRzJkLGsaA1LVpb42bqe5TptPc-12.png",
    },
    {
      title: "Website & Terminals",
      description: "Development of your professional brokerage website and multi-platform terminals.",
      image: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/df683367-7790-4791-bf67-54d56d7ef621-ankar-ai/assets/images/9fg8VMqWWHp79dQnSXdcvnDTLc-13.png",
    },
    {
      title: "Testing & Training",
      description: "Rigorous quality assurance and comprehensive training for your administrative team.",
      image: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/df683367-7790-4791-bf67-54d56d7ef621-ankar-ai/assets/images/p6LHitJjdmwe99AkfKpxp2klltM-14.png",
    },
    {
      title: "Launch & Support",
      description: "Official launch of your brokerage with ongoing expert technical support.",
      image: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/df683367-7790-4791-bf67-54d56d7ef621-ankar-ai/assets/images/2fNNZEzL755aVuKeUK1tPzTBg88-11.png",
    }
  ]

  return (
    <section id="our-process" className="bg-white py-16 sm:py-20 md:py-[120px] overflow-hidden">
      <div className="max-w-[1248px] px-4 sm:px-6 mx-auto">
        <div className="mb-8 sm:mb-[40px]">
          <div className="max-w-[700px]">
            <h2 className="text-[28px] sm:text-[36px] md:text-[48px] mb-4 sm:mb-6 text-black leading-[1.2] font-medium">
              Setup Your White Label in 15 Days
            </h2>
            <p className="text-[14px] sm:text-[16px] md:text-[18px] text-black/70 leading-[1.6]">
              Our comprehensive package delivers everything you need to launch a successful brokerage. We provide a fully branded trading platform, enterprise-grade Forex CRM, a professional website, and both mobile and web terminals, all backed by our ongoing expert support.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 sm:gap-4">
          {steps.map((step, index) => (
            <div key={index} className="flex flex-col group transition-all duration-500 hover:z-10">
              <div className="relative aspect-[4/2.5] mb-6 rounded-lg overflow-hidden border border-gray-200 shadow-sm transition-all duration-500 ease-out group-hover:shadow-[0_20px_40px_rgba(255,77,77,0.15)] group-hover:border-[#ff4d4d]/40 group-hover:-translate-y-3 group-hover:scale-[1.03]">
                <img
                  src={step.image}
                  alt={step.title}
                  className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                />
              </div>
              <div className="transition-all duration-500 ease-out group-hover:translate-y-[-8px]">
                <h4 className="text-[15px] font-semibold text-black mb-3 group-hover:text-[#ff4d4d] transition-colors duration-300">
                  {step.title}
                </h4>
                <p className="text-[14px] text-black/60 leading-[1.6]">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ============ FEATURE CARD COMPONENT ============
const FeatureCard = ({ title, description, icon: Icon }) => (
  <div className="flex flex-col p-4 rounded-xl border transition-all duration-300 bg-[#0f1115] border-white/10 hover:border-white/20">
    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center mb-3 border border-white/10">
      <Icon className="w-4 h-4 text-white" strokeWidth={1.5} />
    </div>
    <h4 className="text-[16px] font-semibold text-white mb-1">{title}</h4>
    <p className="text-[13px] leading-relaxed text-gray-400">{description}</p>
  </div>
)

// ============ FEATURED MODULES COMPONENT ============
const FeaturedModules = () => {
  const features = [
    {
      title: "Real-Time Trading",
      description: "Empower your clients with a platform that delivers split-second execution and live market data.",
      icon: Zap,
    },
    {
      title: "Deep Liquidity Access",
      description: "Connect to a vast network of liquidity providers, ensuring competitive spreads and reliable order fulfillment.",
      icon: Brain,
    },
    {
      title: "Advanced Risk Management",
      description: "Utilize sophisticated tools to monitor exposure, manage risk, and protect your brokerage from market volatility.",
      icon: ShieldCheck,
    },
    {
      title: "Multi-Asset Support",
      description: "Offer a diverse range of trading instruments, including forex, equities, commodities, and cryptocurrencies.",
      icon: Bot,
    }
  ]

  return (
    <section className="bg-white py-16 sm:py-20 md:py-[120px] overflow-hidden w-full">
      <div className="mx-auto px-4 sm:px-6 md:px-8 max-w-[1200px]">
        <div className="mb-8 sm:mb-12">
          <h2 className="text-[28px] sm:text-[36px] md:text-[48px] font-medium leading-[1.2] tracking-[-0.01em] text-black max-w-[974px]">
            Unlock Boundless Growth with SetupFX24's White Label Solutions
          </h2>
        </div>

        <div className="flex flex-col gap-12 md:gap-[100px]">
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 lg:gap-12">
            <div className="flex-1 max-w-[640px] w-full">
              <div className="flex flex-col">
                <p className="text-[14px] sm:text-[16px] md:text-[18px] leading-[1.6] text-black/80 mb-6 max-w-[600px]">
                  Establish a strong market presence with our comprehensive white label solutions, designed to provide brokers with the tools they need to succeed.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {features.map((feature, index) => (
                    <FeatureCard key={index} {...feature} />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex-1 relative w-full aspect-[1.4/1.15] max-w-[500px] md:max-w-[700px]">
              <div className="absolute inset-0 blur-[100px] opacity-30 rounded-full bg-blue-500/40" />
              <div className="relative w-full h-full rounded-2xl border border-gray-200 overflow-hidden shadow-2xl bg-white">
                <img
                  src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/document-uploads/solution-problem-solving-share-ideas-concept-resized-1766750890282.jpg?width=8000&height=8000&resize=contain"
                  alt="CRM & API Integration Solutions"
                  className="w-full h-full object-contain p-4"
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-black/5 to-transparent pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ============ KEY FEATURES COMPONENT ============
const KeyFeatures = () => {
  const features = [
    { icon: Filter, title: "15-day Swift Setup" },
    { icon: Target, title: "Revenue Optimization" },
    { icon: Star, title: "Competitive Pricing" },
    { icon: Lock, title: "Advanced Risk Management" },
    { icon: Filter, title: "Expert Team Support" },
    { icon: Target, title: "Comprehensive Infrastructure" },
    { icon: Star, title: "Trading Platforms" },
    { icon: Lock, title: "CRM Systems" },
    { icon: Target, title: "Flexible Packages" },
    { icon: Star, title: "Cost-Effectiveness" },
    { icon: Lock, title: "Branded Mobile Apps" }
  ]

  return (
    <section className="bg-[#0f1115] py-16 sm:py-20 md:py-24">
      <div className="mx-auto px-4 sm:px-6 max-w-[1200px]">
        <div className="flex flex-col items-center text-center mb-10 sm:mb-16">
          <div className="bg-white/5 text-indigo-400 text-[11px] sm:text-[12px] font-semibold px-3 sm:px-4 py-1.5 rounded-full mb-4 sm:mb-6 border border-white/10">
            Key Features
          </div>
          <h2 className="text-[28px] sm:text-[36px] md:text-[48px] font-semibold text-white leading-[1.2] mb-4 sm:mb-6 tracking-tight">
            Features of SetupFX24 White-Label Solutions
          </h2>
          <p className="text-gray-400 text-[14px] sm:text-[16px] md:text-[18px] max-w-[800px] leading-[1.6]">
            Experience revolutionary Forex brokerage excellence with our all-in-one solution. We provide a comprehensive suite of tools and services to launch and scale your brokerage.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-6 sm:gap-y-8 gap-x-8 sm:gap-x-12 max-w-[1000px] mx-auto">
          {features.map((feature, index) => (
            <div key={index} className="flex items-center gap-4">
              <div className="flex-shrink-0 w-6 h-6 bg-white/5 rounded flex items-center justify-center border border-white/10">
                <feature.icon className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-white text-[18px] font-medium">
                {feature.title}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ============ PRICING COMPONENT ============
const Pricing = () => {
  const navigate = useNavigate()

  return (
    <section id="pricing" className="bg-white py-16 sm:py-20 md:py-24">
      <div className="mx-auto px-4 sm:px-6 max-w-[1200px]">
        <div className="text-center mb-10 sm:mb-16">
          <h2 className="text-[28px] sm:text-[36px] md:text-[48px] font-bold text-gray-900 mb-3 sm:mb-4 tracking-tight">
            Simple, Transparent Pricing
          </h2>
          <p className="text-gray-600 text-[14px] sm:text-[16px] md:text-[18px]">
            Get everything you need to launch your brokerage for one flat monthly fee.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-[900px] mx-auto">
          <div className="bg-white rounded-[20px] sm:rounded-[24px] p-6 sm:p-10 border border-gray-100 shadow-xl flex flex-col h-full transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl">
            <div className="text-center mb-6 sm:mb-8">
              <span className="text-gray-500 text-[12px] sm:text-[14px] font-medium uppercase tracking-wider">One-Time Setup</span>
              <div className="flex items-baseline justify-center gap-2 mt-3 sm:mt-4">
                <span className="text-[36px] sm:text-[48px] font-bold text-[#ff4d4d]">$10,000</span>
                <span className="text-gray-500 text-[14px] sm:text-[16px]">setup fee</span>
              </div>
            </div>

            <ul className="space-y-3 sm:space-y-4 mb-8 sm:mb-10 flex-grow">
              {[
                "Your Branded Trading Platform",
                "Fully Integrated Forex CRM",
                "Professional Brokerage Website",
                "Ongoing Technical Support",
                "Mobile & Web Terminals"
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-gray-700">
                  <div className="flex-shrink-0 w-5 h-5 bg-[#ff4d4d]/10 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-3 h-3 text-[#ff4d4d]" />
                  </div>
                  <span className="text-[15px]">{item}</span>
                </li>
              ))}
            </ul>

            <a 
              href="/user/signup"
              className="w-full bg-[#ff4d4d] hover:bg-[#e63946] text-white py-4 rounded-xl text-[16px] font-semibold transition-all duration-200 block text-center"
            >
              Get Started
            </a>
            <p className="text-center text-gray-400 text-[12px] mt-6">
              Flexible pricing tailored to your needs
            </p>
          </div>

          <div className="relative group h-full transition-all duration-300 hover:-translate-y-2">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-[#ff4d4d] to-[#ff8080] rounded-[20px] sm:rounded-[24px] blur opacity-10 group-hover:opacity-30 transition duration-500"></div>
            <div className="relative bg-white rounded-[20px] sm:rounded-[24px] p-6 sm:p-10 border border-[#ff4d4d]/10 shadow-2xl flex flex-col h-full hover:shadow-[0_20px_40px_rgba(255,77,77,0.15)] transition-shadow duration-300">
              <div className="text-center mb-6 sm:mb-8">
                <span className="text-gray-500 text-[12px] sm:text-[14px] font-medium uppercase tracking-wider">For 1000 Users</span>
                <div className="mt-3 sm:mt-4 space-y-1">
                  <div className="flex items-baseline justify-center gap-2">
                    <span className="text-[32px] sm:text-[40px] font-bold text-[#ff4d4d]">$1,000</span>
                    <span className="text-gray-500 text-[14px] sm:text-[16px]">setup</span>
                  </div>
                  <div className="flex items-baseline justify-center gap-2">
                    <span className="text-[36px] sm:text-[48px] font-bold text-[#ff4d4d]">$500</span>
                    <span className="text-gray-500 text-[14px] sm:text-[16px]">/month</span>
                  </div>
                </div>
              </div>

              <ul className="space-y-3 sm:space-y-4 mb-8 sm:mb-10 flex-grow">
                {[
                  "Branded Trading Platform",
                  "Web Development & mobile responsive app",
                  "Forex CRM",
                  "Liquidity Manager",
                  "A-book B-book Management",
                  "$500 monthly License Fees for 1000 users fixed"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-gray-700">
                    <div className="flex-shrink-0 w-5 h-5 bg-[#ff4d4d]/10 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="w-3 h-3 text-[#ff4d4d]" />
                    </div>
                    <span className="text-[15px]">{item}</span>
                  </li>
                ))}
              </ul>

              <a 
                href="/user/signup"
                className="w-full bg-[#ff4d4d] hover:bg-[#e63946] text-white py-4 rounded-xl text-[16px] font-semibold shadow-[0_10px_30px_rgba(255,77,77,0.2)] transition-all duration-200 block text-center"
              >
                Get Started
              </a>
              <p className="text-center text-gray-400 text-[12px] mt-6">
                Perfect for growing brokerages
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ============ CRM SOLUTIONS COMPONENT ============
const CrmSolutions = () => {
  return (
    <section className="bg-white py-16 sm:py-20 md:py-24 border-t border-gray-100">
      <div className="mx-auto px-4 sm:px-6 max-w-[1200px]">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 sm:gap-16 items-start">
          <div className="order-2 lg:order-1">
            <div className="mb-8 sm:mb-12">
              <h2 className="text-[28px] sm:text-[36px] md:text-[48px] font-bold text-gray-900 leading-tight mb-4 sm:mb-6 tracking-tight">
                CRM & API Integration Solutions
              </h2>
              <p className="text-gray-600 text-[14px] sm:text-[16px] md:text-[18px] leading-relaxed max-w-[540px]">
                Contact us to explore how our CRM and API integration can empower your business.
              </p>
            </div>

            <div className="w-full h-px bg-gray-200 mb-8 sm:mb-12" />

            <div className="mb-8 sm:mb-12">
              <h3 className="text-[20px] sm:text-[24px] font-bold text-gray-900 mb-4 sm:mb-6">What is a CRM?</h3>
              <p className="text-gray-600 text-[14px] sm:text-[16px] leading-relaxed mb-6 sm:mb-8 max-w-[540px]">
                A CRM (Customer Relationship Management) system is a technology for managing all your company's relationships and interactions with customers and potential customers. The goal is simple: Improve business relationships to grow your business.
              </p>
              
              <ul className="space-y-4">
                {[
                  "Streamline Client Data",
                  "Optimize Communication",
                  "Improve Client Experience"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 group">
                    <div className="flex-shrink-0 w-6 h-6 bg-[#ff4d4d]/10 rounded-full flex items-center justify-center transition-colors group-hover:bg-[#ff4d4d]/20">
                      <CheckCircle2 className="w-4 h-4 text-[#ff4d4d]" />
                    </div>
                    <span className="text-gray-700 font-medium">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-[20px] sm:text-[24px] font-bold text-gray-900 mb-6 sm:mb-8">
                Explore Our Powerful CRM and API Solutions
              </h3>
              
              <div className="space-y-3 sm:space-y-4">
                {[
                  {
                    icon: Activity,
                    title: "Real-Time Data Access",
                    desc: "Access comprehensive client data in real-time to make informed decisions."
                  },
                  {
                    icon: Users,
                    title: "Efficient Partner Collaboration",
                    desc: "Enable seamless collaboration with introducing brokers and affiliates through our integrated portal."
                  },
                  {
                    icon: Code,
                    title: "Integrated Trading with API",
                    desc: "Connect your trading platform for a unified client experience and streamlined operations."
                  }
                ].map((item, i) => (
                  <div key={i} className="bg-[#1a1a1a] p-4 sm:p-6 rounded-[16px] sm:rounded-[24px] flex items-start gap-4 sm:gap-6 transition-all duration-300 hover:translate-x-2 hover:shadow-xl group">
                    <div className="flex-shrink-0 w-10 h-10 sm:w-14 sm:h-14 bg-white/5 rounded-xl sm:rounded-2xl flex items-center justify-center border border-white/10 transition-colors group-hover:border-[#ff4d4d]/30 group-hover:bg-[#ff4d4d]/5">
                      <item.icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div>
                      <h4 className="text-white text-[16px] sm:text-[18px] font-semibold mb-1 sm:mb-2">{item.title}</h4>
                      <p className="text-gray-400 text-[13px] sm:text-[15px] leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="order-1 lg:order-2 relative lg:sticky lg:top-32">
            <div className="relative aspect-square md:aspect-video lg:aspect-square bg-[#0a0c10] rounded-[24px] sm:rounded-[40px] overflow-hidden border border-gray-800 shadow-2xl p-4 sm:p-6 md:p-12">
              <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a1a] via-transparent to-transparent opacity-60" />
              
              <div className="relative bg-white rounded-3xl p-6 shadow-2xl mb-6 transform -rotate-1 group hover:rotate-0 transition-all duration-500 border border-gray-100">
                <div className="flex justify-between items-center mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center border border-gray-100">
                      <Globe className="w-5 h-5 text-[#ff4d4d]" />
                    </div>
                    <div>
                      <div className="text-[12px] text-gray-400 font-bold uppercase tracking-wider">Symbol</div>
                      <div className="font-bold text-gray-900 text-lg">AAPL <span className="text-gray-400 font-medium text-sm">NASDAQ</span></div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[24px] font-bold text-gray-900">189.43</div>
                    <div className="text-green-500 text-sm font-semibold">+2.45 (1.31%)</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="h-2 w-full bg-gray-50 rounded-full overflow-hidden">
                      <div className="h-full w-[70%] bg-[#ff4d4d]" />
                    </div>
                    <div className="h-2 w-2/3 bg-gray-50 rounded-full overflow-hidden">
                      <div className="h-full w-[40%] bg-blue-500" />
                    </div>
                    <div className="h-2 w-1/2 bg-gray-50 rounded-full" />
                  </div>
                  <div className="flex flex-col justify-end gap-2">
                    <div className="h-8 w-full bg-gray-900 rounded-lg" />
                    <div className="h-8 w-full bg-[#ff4d4d] rounded-lg" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                <div className="bg-[#1a1a1a] rounded-3xl p-6 border border-white/10 shadow-2xl transform translate-x-4 md:translate-x-0 transition-transform duration-500 hover:scale-105">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/10">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    <div className="font-semibold text-white">Client Growth</div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>Monthly Goal</span>
                      <span>84%</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full w-[84%] bg-[#ff4d4d]" />
                    </div>
                  </div>
                </div>

                <div className="bg-[#1a1a1a] rounded-3xl p-6 border border-white/10 shadow-2xl transform -translate-y-4 transition-transform duration-500 hover:scale-105">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/10">
                      <Shield className="w-5 h-5 text-white" />
                    </div>
                    <div className="font-semibold text-white">Security Hub</div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-10 bg-white/5 rounded-lg border border-white/5" />
                    ))}
                  </div>
                </div>
              </div>

              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-[#ff4d4d]/10 blur-[120px] -z-10 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ============ FAQ SECTION COMPONENT ============
const FAQSection = () => {
  const [openIndex, setOpenIndex] = useState(0)

  const faqData = [
    {
      question: "What liquidity solutions does SetupFX24 provide?",
      answer: "SetupFX24 offers access to deep, multi-asset liquidity with stable execution, competitive spreads, and scalable infrastructure suitable for both new and growing brokerage firms."
    },
    {
      question: "How does SetupFX24 support new and existing brokerage firms?",
      answer: "We deliver end-to-end white-label solutions including trading platforms, CRM, website development, risk management tools, and ongoing technical and operational support."
    },
    {
      question: "What is DMA (Direct Market Access) in trading?",
      answer: "DMA allows brokers and traders to place orders directly into the market without intermediaries, ensuring greater transparency, faster execution, and improved pricing control."
    },
    {
      question: "Can I launch my brokerage without technical experience?",
      answer: "Yes. SetupFX24 handles the complete technical setup, integrations, and backend configuration, allowing you to focus on client acquisition and business growth."
    },
    {
      question: "Does SetupFX24 offer customization and branding?",
      answer: "Absolutely. All platforms, websites, and mobile apps are fully customizable and branded to match your brokerage's identity and business objectives."
    },
    {
      question: "What makes SetupFX24 different from other white-label providers?",
      answer: "SetupFX24 combines fast deployment, enterprise-grade technology, transparent pricing, and expert support to help brokers launch faster and scale with confidence."
    }
  ]

  return (
    <section id="faq" className="bg-[#0A0A0B] py-16 sm:py-20 md:py-32 overflow-hidden">
      <div className="mx-auto px-4 sm:px-6 max-w-[900px]">
        <div className="text-center mb-10 sm:mb-16">
          <h2 className="text-[24px] sm:text-[32px] md:text-[48px] font-bold text-white mb-4 sm:mb-6 tracking-tight">
            Frequently Asked Questions About <span className="text-[#ff4d4d]">SetupFX24</span> White-Label Solutions
          </h2>
          <div className="h-1 w-[80px] sm:w-[100px] bg-[#ff4d4d] mx-auto rounded-full" />
        </div>

        <div className="space-y-3 sm:space-y-4">
          {faqData.map((item, index) => (
            <div key={index} className="group">
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className={`w-full p-4 sm:p-6 md:p-8 rounded-[16px] sm:rounded-[24px] text-left transition-all duration-300 flex items-start justify-between gap-3 sm:gap-4 border ${
                  openIndex === index 
                    ? 'bg-white/5 border-white/10' 
                    : 'bg-transparent border-white/5 hover:border-white/20 hover:bg-white/[0.02]'
                }`}
              >
                <span className={`text-[14px] sm:text-[16px] md:text-[20px] font-semibold transition-colors duration-300 ${
                  openIndex === index ? 'text-[#ff4d4d]' : 'text-white/90 group-hover:text-white'
                }`}>
                  {item.question}
                </span>
                <div className={`mt-1 p-1 rounded-full transition-all duration-300 ${
                  openIndex === index ? 'bg-[#ff4d4d] text-white' : 'bg-white/5 text-white/50 group-hover:bg-white/10'
                }`}>
                  {openIndex === index ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>

              {openIndex === index && (
                <div className="overflow-hidden px-4 sm:px-8 mt-3 sm:mt-4">
                  <p className="text-gray-400 text-[13px] sm:text-[15px] md:text-[17px] leading-relaxed pb-4 sm:pb-6">
                    {item.answer}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ============ FOOTER COMPONENT ============
const Footer = () => {
  return (
    <footer className="w-full bg-black text-white pt-12 sm:pt-16 md:pt-20 pb-8 sm:pb-12 flex flex-col items-center">
      <div className="max-w-[1200px] px-4 sm:px-6 w-full">
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-12 gap-8 sm:gap-10 lg:gap-8 mb-10 sm:mb-16">
          <div className="col-span-2 sm:col-span-2 lg:col-span-4 flex flex-col gap-6 sm:gap-8">
            <div className="flex flex-col gap-4 sm:gap-6">
              <a href="/" className="flex items-center" aria-label="SetupFX24 Home">
                <img
                  src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/document-uploads/setupFX24-logo-1766736768413.png?width=8000&height=8000&resize=contain"
                  alt="SetupFX24 Logo"
                  className="h-8 sm:h-10 w-auto object-contain"
                />
              </a>
              <p className="text-[#a0a0a0] text-xs sm:text-sm leading-relaxed max-w-[320px]">
                SetupFX24 is a technology and service provider, empowering Forex brokers with white-label solutions.
              </p>
            </div>

            <div className="flex flex-col gap-1 text-[#a0a0a0] text-xs sm:text-sm">
              <p className="font-bold text-white mb-1">SetupFX24</p>
              <p>4th good floor 4084, currency tower, Vishal Nagar, Raipur, Chhattisgarh</p>
            </div>

            <div className="flex gap-4 sm:gap-5">
              <a 
                href="https://api.whatsapp.com/send/?phone=19082280305&text&type=phone_number&app_absent=0" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[#a0a0a0] hover:text-white transition-colors"
                aria-label="WhatsApp"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </a>
              <a 
                href="https://www.facebook.com/Setupfx24" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[#a0a0a0] hover:text-white transition-colors"
                aria-label="Facebook"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>
              <a 
                href="https://www.instagram.com/setup.fx24/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[#a0a0a0] hover:text-white transition-colors"
                aria-label="Instagram"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
              <a 
                href="https://tr.ee/FIAU0cD5FI" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[#a0a0a0] hover:text-white transition-colors"
                aria-label="Google"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              </a>
            </div>
          </div>

          <div className="col-span-1 lg:col-span-3 flex flex-col gap-4 sm:gap-6">
            <h4 className="text-white font-bold text-sm sm:text-base">Quick Links</h4>
            <ul className="flex flex-col gap-2 sm:gap-4">
              {['White Label', 'Trading Platform', 'CRM', 'Web Development', 'Pricing', 'Contact'].map((item) => (
                <li key={item}>
                  <a href="#" className="text-[#a0a0a0] hover:text-white transition-colors text-xs sm:text-sm">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="col-span-1 lg:col-span-3 flex flex-col gap-4 sm:gap-6">
            <h4 className="text-white font-bold text-sm sm:text-base">Resources</h4>
            <ul className="flex flex-col gap-2 sm:gap-4">
              {['Blog', 'Documentation', 'Support', 'FAQ'].map((item) => (
                <li key={item}>
                  <a href="#" className="text-[#a0a0a0] hover:text-white transition-colors text-xs sm:text-sm">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="col-span-2 sm:col-span-1 lg:col-span-2 flex flex-col gap-4 sm:gap-6">
            <h4 className="text-white font-bold text-sm sm:text-base">Legal</h4>
            <ul className="flex flex-col gap-2 sm:gap-4">
              {['Privacy Policy', 'Terms & Conditions', 'Disclaimer'].map((item) => (
                <li key={item}>
                  <a href="#" className="text-[#a0a0a0] hover:text-white transition-colors text-xs sm:text-sm">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </footer>
  )
}

// ============ MAIN LANDING PAGE COMPONENT ============
const LandingPage = () => {
  return (
    <main className="relative min-h-screen bg-black text-white">
      <Navbar />
      <Hero />
      <DashboardPreview />
      <PlatformProcess />
      <FeaturedModules />
      <KeyFeatures />
      <Pricing />
      <CrmSolutions />
      <FAQSection />
      <Footer />
    </main>
  )
}

export default LandingPage
