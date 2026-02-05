import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import suimfxLogo from '../assets/suimfxLogo.png'
import { 
  CheckCircle2, Users, TrendingUp, Shield, Zap, Globe, BarChart3,
  Menu, X, Download, ArrowRight, Star, Clock, Headphones, Award,
  ChevronDown, ChevronUp, Smartphone, Monitor, Server
} from 'lucide-react'

// ============ NAVBAR COMPONENT ============
const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const menuItems = [
    { name: 'Markets', href: '#markets' },
    { name: 'Features', href: '#features' },
    { name: 'Account Types', href: '#accounts' },
    { name: 'FAQ', href: '#faq' },
  ]

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : 'unset'
    return () => { document.body.style.overflow = 'unset' }
  }, [mobileMenuOpen])

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-300 ${
        isScrolled ? 'bg-slate-900/95 backdrop-blur-xl shadow-lg' : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            <a href="/" className="flex items-center gap-2">
              <img src={suimfxLogo} alt="Suimfx" className="h-12 md:h-14 w-auto" />
            </a>

            <div className="hidden md:flex items-center gap-8">
              {menuItems.map((item) => (
                <a key={item.name} href={item.href} className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
                  {item.name}
                </a>
              ))}
            </div>

            <div className="hidden md:flex items-center gap-3">
              <a href="/suimfx.apk" download className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-emerald-400 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/10 transition-all">
                <Download className="w-4 h-4" /> APK
              </a>
              <a href="https://trade.suimfx.com/user/login" className="px-4 py-2 text-sm font-medium text-white hover:text-slate-300 transition-colors">Sign In</a>
              <a href="https://trade.suimfx.com/user/signup" className="px-5 py-2.5 text-sm font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/25">
                Get Started
              </a>
            </div>

            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 text-white">
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </nav>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[99] bg-slate-900/98 backdrop-blur-xl md:hidden pt-16">
          <div className="flex flex-col p-6 gap-2">
            {menuItems.map((item) => (
              <a key={item.name} href={item.href} onClick={() => setMobileMenuOpen(false)}
                className="py-4 text-lg font-medium text-white border-b border-slate-800">
                {item.name}
              </a>
            ))}
            <div className="mt-6 flex flex-col gap-3">
              <a href="/suimfx.apk" download className="flex items-center justify-center gap-2 py-3 text-emerald-400 border border-emerald-500/30 rounded-xl">
                <Download className="w-5 h-5" /> Download APK
              </a>
              <a href="https://trade.suimfx.com/user/login" className="py-3 text-center text-white border border-slate-700 rounded-xl">Sign In</a>
              <a href="https://trade.suimfx.com/user/signup" className="py-3 text-center font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl">Get Started</a>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ============ HERO COMPONENT ============
const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-950">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#1e3a5f_0%,_transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_#312e81_0%,_transparent_50%)]" />
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-blue-500/20 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 md:pt-32 md:pb-24">
        <div className="text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            <span className="text-sm font-medium text-blue-300">Trade Forex, Stocks, Crypto & More</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight mb-6">
            Trade Smarter
            <span className="block bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
              With Suimfx
            </span>
            Your Gateway to Global Markets
          </h1>

          {/* Subtitle */}
          <p className="max-w-2xl mx-auto text-lg sm:text-xl text-slate-400 mb-10 leading-relaxed">
            Access global forex, stocks, commodities, and crypto markets with tight spreads, fast execution, and powerful trading tools. Start trading today.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <a href="https://trade.suimfx.com/user/signup" className="w-full sm:w-auto px-8 py-4 text-lg font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-xl shadow-blue-500/30 flex items-center justify-center gap-2">
              Open Account <ArrowRight className="w-5 h-5" />
            </a>
            <a href="#markets" className="w-full sm:w-auto px-8 py-4 text-lg font-semibold text-white border border-slate-700 rounded-xl hover:bg-slate-800/50 transition-all flex items-center justify-center gap-2">
              View Markets
            </a>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 max-w-4xl mx-auto">
            {[
              { value: '100+', label: 'Trading Instruments' },
              { value: '0.0', label: 'Pips Spread From' },
              { value: '1:500', label: 'Max Leverage' },
              { value: '24/5', label: 'Market Access' },
            ].map((stat, i) => (
              <div key={i} className="text-center p-4 rounded-2xl bg-slate-800/30 border border-slate-700/50">
                <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-1">{stat.value}</div>
                <div className="text-sm text-slate-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-slate-950 to-transparent" />
    </section>
  )
}

// ============ MARKETS SECTION ============
const Markets = () => {
  const markets = [
    { name: 'Forex', pairs: '50+ Pairs', description: 'Trade major, minor, and exotic currency pairs with tight spreads', icon: '💱' },
    { name: 'Stocks', pairs: '100+ Stocks', description: 'Access global equities from US, EU, and Asian markets', icon: '📈' },
    { name: 'Commodities', pairs: '20+ Assets', description: 'Trade gold, silver, oil, and other popular commodities', icon: '🥇' },
    { name: 'Crypto', pairs: '30+ Coins', description: 'Bitcoin, Ethereum, and other top cryptocurrencies', icon: '₿' },
    { name: 'Indices', pairs: '15+ Indices', description: 'Trade major global indices like S&P 500, NASDAQ, DAX', icon: '📊' },
    { name: 'Metals', pairs: '10+ Metals', description: 'Precious metals including gold, silver, platinum', icon: '⚡' },
  ]

  return (
    <section id="markets" className="py-20 md:py-32 bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 text-sm font-medium text-emerald-400 bg-emerald-500/10 rounded-full border border-emerald-500/20 mb-4">
            Markets
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
            Trade Global Markets
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Access a wide range of financial instruments from one powerful platform.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6">
          {markets.map((market, i) => (
            <div key={i} className="group p-5 md:p-6 rounded-2xl bg-slate-800/50 border border-slate-700 hover:border-emerald-500/50 transition-all duration-300 hover:-translate-y-1 text-center">
              <div className="text-3xl md:text-4xl mb-3">{market.icon}</div>
              <h3 className="text-lg font-semibold text-white mb-1">{market.name}</h3>
              <p className="text-sm text-emerald-400 font-medium">{market.pairs}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ============ FEATURES SECTION ============
const Features = () => {
  const features = [
    { icon: TrendingUp, title: 'Fast Execution', description: 'Ultra-low latency order execution with no requotes and minimal slippage.' },
    { icon: Shield, title: 'Secure Trading', description: 'Bank-level security with encrypted transactions and segregated accounts.' },
    { icon: BarChart3, title: 'Advanced Charts', description: 'Professional charting tools with 50+ indicators and drawing tools.' },
    { icon: Zap, title: 'Tight Spreads', description: 'Competitive spreads starting from 0.0 pips on major pairs.' },
    { icon: Smartphone, title: 'Mobile Trading', description: 'Trade anywhere with our powerful iOS and Android mobile apps.' },
    { icon: Headphones, title: '24/5 Support', description: 'Expert customer support available around the clock during market hours.' },
  ]

  return (
    <section id="features" className="py-20 md:py-32 bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 text-sm font-medium text-blue-400 bg-blue-500/10 rounded-full border border-blue-500/20 mb-4">
            Why Trade With Us
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
            Trading Made Simple
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Experience professional-grade trading with tools designed for both beginners and experts.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {features.map((feature, i) => (
            <div key={i} className="group p-6 md:p-8 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-blue-500/50 transition-all duration-300 hover:-translate-y-1">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <feature.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-slate-400 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ============ HOW TO START ============
const HowToStart = () => {
  const steps = [
    { step: '01', title: 'Register', description: 'Create your free account in just 2 minutes with email verification.' },
    { step: '02', title: 'Verify', description: 'Complete KYC verification to unlock full trading features.' },
    { step: '03', title: 'Fund', description: 'Deposit funds using multiple payment methods securely.' },
    { step: '04', title: 'Trade', description: 'Start trading forex, stocks, crypto and more instantly.' },
  ]

  return (
    <section id="process" className="py-20 md:py-32 bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 text-sm font-medium text-purple-400 bg-purple-500/10 rounded-full border border-purple-500/20 mb-4">
            Get Started
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
            Start Trading in Minutes
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Opening an account is quick and easy. Follow these simple steps to begin your trading journey.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((item, i) => (
            <div key={i} className="relative">
              <div className="text-6xl md:text-7xl font-bold text-slate-800 mb-4">{item.step}</div>
              <h3 className="text-xl font-semibold text-white mb-2">{item.title}</h3>
              <p className="text-slate-400">{item.description}</p>
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-8 left-full w-full h-0.5 bg-gradient-to-r from-slate-700 to-transparent" style={{ width: '80%', marginLeft: '10%' }} />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ============ ACCOUNT TYPES ============
const AccountTypes = () => {
  return (
    <section id="accounts" className="py-20 md:py-32 bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 text-sm font-medium text-amber-400 bg-amber-500/10 rounded-full border border-amber-500/20 mb-4">
            Account Types
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
            Choose Your Trading Account
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Select the account type that best fits your trading style and experience level.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 md:gap-8">
          {/* Standard Account */}
          <div className="p-6 md:p-8 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-blue-500/50 transition-all">
            <h3 className="text-xl font-bold text-white mb-2">Standard</h3>
            <p className="text-slate-400 text-sm mb-4">Perfect for beginners</p>
            <div className="text-3xl font-bold text-white mb-6">$100 <span className="text-sm font-normal text-slate-400">min deposit</span></div>
            <ul className="space-y-3 mb-8">
              {['Spreads from 1.0 pips', 'Leverage up to 1:200', 'All instruments', 'Basic support', 'No commission'].map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-slate-300 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <a href="https://trade.suimfx.com/user/signup" className="block w-full py-3 text-center font-semibold text-white border border-slate-600 rounded-xl hover:bg-slate-800 transition-all">
              Open Account
            </a>
          </div>

          {/* Pro Account */}
          <div className="relative p-6 md:p-8 rounded-2xl bg-gradient-to-b from-blue-600/20 to-indigo-600/20 border border-blue-500/30">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-semibold rounded-full">
              Most Popular
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Pro</h3>
            <p className="text-slate-400 text-sm mb-4">For active traders</p>
            <div className="text-3xl font-bold text-white mb-6">$1,000 <span className="text-sm font-normal text-slate-400">min deposit</span></div>
            <ul className="space-y-3 mb-8">
              {['Spreads from 0.4 pips', 'Leverage up to 1:400', 'All instruments', 'Priority support', 'Low commission'].map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-slate-300 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <a href="https://trade.suimfx.com/user/signup" className="block w-full py-3 text-center font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all">
              Open Account
            </a>
          </div>

          {/* VIP Account */}
          <div className="p-6 md:p-8 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-amber-500/50 transition-all">
            <h3 className="text-xl font-bold text-white mb-2">VIP</h3>
            <p className="text-slate-400 text-sm mb-4">For professional traders</p>
            <div className="text-3xl font-bold text-white mb-6">$10,000 <span className="text-sm font-normal text-slate-400">min deposit</span></div>
            <ul className="space-y-3 mb-8">
              {['Spreads from 0.0 pips', 'Leverage up to 1:500', 'All instruments', 'Dedicated manager', 'Zero commission'].map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-slate-300 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <a href="https://trade.suimfx.com/user/signup" className="block w-full py-3 text-center font-semibold text-white border border-slate-600 rounded-xl hover:bg-slate-800 transition-all">
              Open Account
            </a>
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
      question: "What markets can I trade on Suimfx?",
      answer: "Suimfx offers access to forex (50+ currency pairs), stocks, commodities, indices, metals, and cryptocurrencies - all from a single trading account."
    },
    {
      question: "What is the minimum deposit to start trading?",
      answer: "You can start trading with as little as $100 on our Standard account. Pro accounts require $1,000 and VIP accounts require $10,000 minimum deposit."
    },
    {
      question: "What leverage do you offer?",
      answer: "We offer flexible leverage up to 1:500 depending on your account type and the instrument you're trading. Higher leverage is available for VIP account holders."
    },
    {
      question: "How fast are withdrawals processed?",
      answer: "Withdrawal requests are typically processed within 24 hours. The actual time to receive funds depends on your payment method - e-wallets are instant, bank transfers take 2-5 business days."
    },
    {
      question: "Is my money safe with Suimfx?",
      answer: "Yes. We use segregated accounts to keep client funds separate from company funds. We also employ bank-level encryption and security measures to protect your account."
    },
    {
      question: "Do you offer a mobile trading app?",
      answer: "Yes! Our mobile trading app is available for both iOS and Android devices. You can trade, manage your account, and monitor markets from anywhere."
    }
  ]

  return (
    <section id="faq" className="py-20 md:py-32 bg-slate-900">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 text-sm font-medium text-blue-400 bg-blue-500/10 rounded-full border border-blue-500/20 mb-4">
            FAQ
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-slate-400">
            Everything you need to know about trading with Suimfx.
          </p>
        </div>

        <div className="space-y-4">
          {faqData.map((item, index) => (
            <div key={index} className="rounded-xl border border-slate-800 overflow-hidden">
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className={`w-full p-5 md:p-6 text-left flex items-center justify-between gap-4 transition-colors ${
                  openIndex === index ? 'bg-slate-800/50' : 'hover:bg-slate-800/30'
                }`}
              >
                <span className="font-medium text-white">{item.question}</span>
                <div className={`flex-shrink-0 transition-transform ${openIndex === index ? 'rotate-180' : ''}`}>
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                </div>
              </button>
              {openIndex === index && (
                <div className="px-5 md:px-6 pb-5 md:pb-6">
                  <p className="text-slate-400 leading-relaxed">{item.answer}</p>
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
    <footer className="bg-slate-950 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div className="col-span-2 md:col-span-1">
            <a href="/" className="inline-block mb-4">
              <img src={suimfxLogo} alt="Suimfx" className="h-14 w-auto" />
            </a>
            <p className="text-slate-400 text-sm mb-4">
              Your trusted partner for forex, stocks, and crypto trading.
            </p>
            <div className="flex gap-4">
              <a href="https://api.whatsapp.com/send/?phone=919932566062" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              </a>
              <a href="https://www.instagram.com/suimfx/" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Trading</h4>
            <ul className="space-y-2">
              {['Forex', 'Stocks', 'Crypto', 'Commodities'].map((item) => (
                <li key={item}><a href="#markets" className="text-slate-400 hover:text-white text-sm transition-colors">{item}</a></li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Account</h4>
            <ul className="space-y-2">
              {['Open Account', 'Deposit', 'Withdraw', 'Support'].map((item) => (
                <li key={item}><a href="#" className="text-slate-400 hover:text-white text-sm transition-colors">{item}</a></li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Legal</h4>
            <ul className="space-y-2">
              {['Privacy Policy', 'Terms of Service', 'Disclaimer'].map((item) => (
                <li key={item}><a href="#" className="text-slate-400 hover:text-white text-sm transition-colors">{item}</a></li>
              ))}
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-800 text-center">
          <p className="text-slate-500 text-sm">© {new Date().getFullYear()} Suimfx. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}

// ============ MAIN LANDING PAGE COMPONENT ============
const LandingPage = () => {
  return (
    <main className="relative min-h-screen bg-slate-950 text-white">
      <Navbar />
      <Hero />
      <Markets />
      <Features />
      <HowToStart />
      <AccountTypes />
      <FAQSection />
      <Footer />
    </main>
  )
}

export default LandingPage
