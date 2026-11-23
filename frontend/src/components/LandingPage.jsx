import React from 'react';
import {
  Compass,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  FileText,
  Search,
  CheckCircle2,
  Lock,
  Database,
  FileSpreadsheet,
  FileDown,
  Layers,
  ChevronRight,
  Cpu,
  UserCheck,
  Sun,
  Moon,
  ExternalLink,
  HelpCircle,
  BarChart3
} from 'lucide-react';

export default function LandingPage({
  onExplore,
  onLogin,
  onRegister,
  theme = 'dark',
  toggleTheme
}) {
  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className={`min-h-screen transition-colors font-sans selection:bg-emerald-500 selection:text-slate-950 ${
      theme === 'dark' ? 'bg-[#090d16] text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* =========================================================================
          1. TOP NAVIGATION BAR
      ========================================================================= */}
      <header className={`sticky top-0 z-40 backdrop-blur-md border-b transition-colors ${
        theme === 'dark' ? 'bg-[#090d16]/85 border-slate-800/90' : 'bg-white/85 border-slate-200'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-slate-950 shadow-md shadow-emerald-500/20">
              <Compass className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight">PolicyPilot</span>
                <span className="text-emerald-500 font-black text-sm tracking-widest px-1.5 py-0.2 rounded bg-emerald-500/10 border border-emerald-500/20 font-mono">
                  RAG
                </span>
              </div>
              <p className={`text-[10px] font-mono tracking-tight ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                Grounded Enterprise Policy Intelligence
              </p>
            </div>
          </div>

          {/* Navigation Anchors */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold">
            <button
              onClick={() => scrollToSection('features')}
              className={`transition-colors hover:text-emerald-400 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}
            >
              Key Features
            </button>
            <button
              onClick={() => scrollToSection('architecture')}
              className={`transition-colors hover:text-emerald-400 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}
            >
              Zero-Hallucination Architecture
            </button>
            <button
              onClick={() => scrollToSection('security')}
              className={`transition-colors hover:text-emerald-400 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}
            >
              Security & RLS
            </button>
            <button
              onClick={() => scrollToSection('faq')}
              className={`transition-colors hover:text-emerald-400 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}
            >
              FAQ
            </button>
          </nav>

          {/* Actions & Theme */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-xl border transition-colors ${
                theme === 'dark'
                  ? 'bg-slate-900 border-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-800'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
              title="Toggle color mode"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>

            {/* Sign In Button */}
            <button
              onClick={onLogin}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                theme === 'dark'
                  ? 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800 hover:border-slate-600'
                  : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-100'
              }`}
            >
              Sign In
            </button>

            {/* Primary Explore CTA */}
            <button
              onClick={onExplore}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all shadow-md hover:shadow-emerald-500/25 flex items-center gap-1.5 cursor-pointer"
            >
              <span>Explore Platform</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* =========================================================================
          2. HERO SECTION
      ========================================================================= */}
      <section className="relative pt-16 pb-20 overflow-hidden">
        {/* Subtle Background Glow Circles */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-emerald-500/10 blur-[130px] rounded-full pointer-events-none" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          {/* Trust Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-mono font-semibold mb-6 border bg-emerald-500/10 text-emerald-400 border-emerald-500/25 shadow-xs animate-fade-in">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>100% GROUNDED INTELLIGENCE &bull; ZERO HALLUCINATIONS &bull; MULTI-TENANT RLS</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.15] mb-6 max-w-4xl mx-auto">
            Grounded Policy Intelligence with{' '}
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500 bg-clip-text text-transparent">
              Zero Hallucinations
            </span>
          </h1>

          {/* Subheading */}
          <p className={`text-base sm:text-lg max-w-3xl mx-auto leading-relaxed mb-8 ${
            theme === 'dark' ? 'text-slate-300' : 'text-slate-600'
          }`}>
            Query complex HR handbooks, compliance guidelines, legal frameworks, and spreadsheets with absolute certainty. Every finding is mathematically verified against source documents with exact line citations and refusal guardrails.
          </p>

          {/* Hero CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mb-14">
            <button
              onClick={onExplore}
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl font-bold text-sm bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all shadow-lg hover:shadow-emerald-500/30 flex items-center justify-center gap-2 cursor-pointer group"
            >
              <span>Explore PolicyPilot RAG</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={() => scrollToSection('architecture')}
              className={`w-full sm:w-auto px-6 py-3.5 rounded-xl font-semibold text-sm border transition-all ${
                theme === 'dark'
                  ? 'bg-slate-900/90 border-slate-700/80 text-slate-200 hover:bg-slate-800 hover:border-slate-600'
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              How It Works
            </button>
          </div>

          {/* =====================================================================
              LIVE INTERACTIVE MOCKUP / PREVIEW
          ===================================================================== */}
          <div className={`max-w-4xl mx-auto rounded-2xl border shadow-2xl overflow-hidden text-left transition-all ${
            theme === 'dark' ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200'
          }`}>
            {/* Window Header */}
            <div className={`px-4 py-3 border-b flex items-center justify-between text-xs ${
              theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
            }`}>
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                </div>
                <span className="font-mono text-[11px] ml-2">policypilot-query-session.active</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-400 font-mono text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Threshold: 0.58 Passed</span>
              </div>
            </div>

            {/* Simulated Query & Answer */}
            <div className="p-5 sm:p-7 space-y-5">
              {/* User Question */}
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-slate-700 text-slate-200 flex items-center justify-center font-bold text-xs shrink-0">
                  Q
                </div>
                <div className="flex-1">
                  <div className="text-[11px] font-mono text-slate-400 mb-1">AUDIT QUERY &bull; JUST NOW</div>
                  <div className={`text-sm font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>
                    "Under Section 4.2 of the Enterprise Remote Work Policy, what is the maximum reimbursement for home office ergonomic equipment?"
                  </div>
                </div>
              </div>

              {/* RAG Answer */}
              <div className={`p-4 sm:p-5 rounded-xl border ${
                theme === 'dark' ? 'bg-slate-900/90 border-slate-700/80' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span>VERIFIED POLICY FINDING &bull; 100% GROUNDED</span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    Similarity: 0.842
                  </span>
                </div>

                <div className={`text-xs sm:text-sm leading-relaxed mb-4 ${
                  theme === 'dark' ? 'text-slate-200' : 'text-slate-800'
                }`}>
                  According to <strong>Section 4.2 (Equipment & Ergonomics)</strong> of the Remote Work Policy, eligible full-time employees are entitled to a one-time equipment reimbursement up to a maximum of <strong>$750 USD</strong> for certified ergonomic desks, chairs, and monitors upon submission of itemized receipts within 60 days of onboarding.
                </div>

                {/* Audit Citation Box */}
                <div className={`p-3 rounded-lg border text-xs font-mono ${
                  theme === 'dark' ? 'bg-[#0f172a] border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-600'
                }`}>
                  <div className="flex items-center gap-2 text-emerald-400 font-bold mb-1 text-[11px]">
                    <FileText className="w-3 h-3" />
                    <span>Source: Enterprise_Remote_Work_Policy_2025.pdf &bull; Page 12 &bull; Chunk #4</span>
                  </div>
                  <div className="text-[10px] italic line-clamp-1">
                    "4.2 Eligible employees may claim an expense up to $750 for ergonomic desks, monitors, and chairs..."
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          3. ENTERPRISE SECURITY NOTICE / AUTHENTICATION GATE
      ========================================================================= */}
      <section className={`py-12 border-y transition-colors ${
        theme === 'dark' ? 'bg-[#0b101d] border-slate-800/80' : 'bg-emerald-50/50 border-emerald-200/60'
      }`}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold tracking-tight mb-1">
                  Enterprise Compliance & Multi-Tenant Access Control
                </h3>
                <p className={`text-xs max-w-xl leading-relaxed ${
                  theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                }`}>
                  To protect proprietary organizational manuals and enforce strict audit trails, unauthenticated querying is disabled. Register your enterprise account or sign in with Google to explore your isolated workspace.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={onRegister}
                className="px-5 py-2.5 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors shadow-md cursor-pointer"
              >
                Create Free Account
              </button>
              <button
                onClick={onLogin}
                className={`px-4 py-2.5 rounded-xl font-semibold text-xs border transition-colors ${
                  theme === 'dark'
                    ? 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Sign In
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          4. CORE CAPABILITIES / KEY FEATURES
      ========================================================================= */}
      <section id="features" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-mono uppercase tracking-widest text-emerald-400 font-bold mb-2">
              Architectural Guardrails
            </h2>
            <p className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              Built for Zero Tolerance Against Inaccurate AI Answers
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Card 1 */}
            <div className={`p-6 rounded-2xl border transition-all ${
              theme === 'dark' ? 'bg-[#0f172a] border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 hover:shadow-lg'
            }`}>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold mb-2">Mathematical Refusal Guardrails</h3>
              <p className={`text-xs leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                If vector cosine similarity falls below the 0.58 threshold, the system immediately refuses to speculate, citing lack of documented policy evidence.
              </p>
            </div>

            {/* Card 2 */}
            <div className={`p-6 rounded-2xl border transition-all ${
              theme === 'dark' ? 'bg-[#0f172a] border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 hover:shadow-lg'
            }`}>
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 mb-4">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold mb-2">Transparent Audit Citations</h3>
              <p className={`text-xs leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                Every single claim is linked to exact source document filenames, chunk IDs, similarity scores, and verbatim quoted passages.
              </p>
            </div>

            {/* Card 3 */}
            <div className={`p-6 rounded-2xl border transition-all ${
              theme === 'dark' ? 'bg-[#0f172a] border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 hover:shadow-lg'
            }`}>
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-4">
                <Database className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold mb-2">Multi-Tenant PostgreSQL Isolation</h3>
              <p className={`text-xs leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                Supabase Row Level Security (RLS) policies isolate each user's uploaded manuals, profile info, and chat query logs at the database kernel.
              </p>
            </div>

            {/* Card 4 */}
            <div className={`p-6 rounded-2xl border transition-all ${
              theme === 'dark' ? 'bg-[#0f172a] border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 hover:shadow-lg'
            }`}>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold mb-2">Spreadsheet & Tabular Precision</h3>
              <p className={`text-xs leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                Processes financial and policy matrices with row/column fidelity. Renders interactive grid tables with instant custom PDF table exports.
              </p>
            </div>

            {/* Card 5 */}
            <div className={`p-6 rounded-2xl border transition-all ${
              theme === 'dark' ? 'bg-[#0f172a] border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 hover:shadow-lg'
            }`}>
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 mb-4">
                <FileDown className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold mb-2">Certified PDF Compliance Reports</h3>
              <p className={`text-xs leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                Export executive reports formatted with custom enterprise letterheads, callout summary boxes, page numbering, and audit trail sections.
              </p>
            </div>

            {/* Card 6 */}
            <div className={`p-6 rounded-2xl border transition-all ${
              theme === 'dark' ? 'bg-[#0f172a] border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 hover:shadow-lg'
            }`}>
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-4">
                <BarChart3 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold mb-2">100% Free-Tier Cloud Native</h3>
              <p className={`text-xs leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                Architected to run 24/7 on free tiers: Render backend, Qdrant Cloud vector cluster, Supabase PostgreSQL, and Google Gemini API.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          5. ZERO-HALLUCINATION ARCHITECTURE & WORKFLOW
      ========================================================================= */}
      <section id="architecture" className={`py-20 border-t transition-colors ${
        theme === 'dark' ? 'bg-[#0b101d] border-slate-800/80' : 'bg-slate-100 border-slate-200'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-mono uppercase tracking-widest text-emerald-400 font-bold mb-2">
              End-to-End Pipeline
            </h2>
            <p className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              How PolicyPilot Verifies Every Single Sentence
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
            {/* Step 1 */}
            <div className={`p-6 rounded-2xl border relative ${
              theme === 'dark' ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="text-3xl font-black text-emerald-500/30 font-mono mb-2">01</div>
              <h4 className="text-sm font-bold mb-2">Document Ingestion</h4>
              <p className={`text-xs leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                PDFs, Word documents, and CSV spreadsheets are chunked with recursive overlap and metadata enrichment.
              </p>
            </div>

            {/* Step 2 */}
            <div className={`p-6 rounded-2xl border relative ${
              theme === 'dark' ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="text-3xl font-black text-emerald-500/30 font-mono mb-2">02</div>
              <h4 className="text-sm font-bold mb-2">Dense Vector Embedding</h4>
              <p className={`text-xs leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                Embedded via Google text-embedding-004 and indexed into high-speed Qdrant Cloud vector partitions.
              </p>
            </div>

            {/* Step 3 */}
            <div className={`p-6 rounded-2xl border relative ${
              theme === 'dark' ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="text-3xl font-black text-emerald-500/30 font-mono mb-2">03</div>
              <h4 className="text-sm font-bold mb-2">Grounded Retrieval</h4>
              <p className={`text-xs leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                Strict cosine similarity threshold (0.58). Ungrounded or unrelated queries are immediately rejected.
              </p>
            </div>

            {/* Step 4 */}
            <div className={`p-6 rounded-2xl border relative ${
              theme === 'dark' ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="text-3xl font-black text-emerald-500/30 font-mono mb-2">04</div>
              <h4 className="text-sm font-bold mb-2">Synthesis & Citations</h4>
              <p className={`text-xs leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                Gemini 1.5 Flash synthesizes the verified answer strictly using retrieved context passages, appending audit trails.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          6. FREQUENTLY ASKED QUESTIONS (FAQ)
      ========================================================================= */}
      <section id="faq" className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-xs font-mono uppercase tracking-widest text-emerald-400 font-bold mb-2">
              Common Questions
            </h2>
            <p className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Frequently Asked Questions
            </p>
          </div>

          <div className="space-y-4">
            <div className={`p-5 rounded-2xl border ${theme === 'dark' ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200'}`}>
              <h4 className="text-sm font-bold mb-1.5 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Why is account registration required before querying?</span>
              </h4>
              <p className={`text-xs leading-relaxed pl-6 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                To guarantee enterprise confidentiality and multi-tenant isolation, queries and uploaded documents are isolated per user account through Supabase PostgreSQL Row Level Security (RLS). This ensures one user never sees another user's policy manuals or chat audit logs.
              </p>
            </div>

            <div className={`p-5 rounded-2xl border ${theme === 'dark' ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200'}`}>
              <h4 className="text-sm font-bold mb-1.5 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Can I log in using my Google Account?</span>
              </h4>
              <p className={`text-xs leading-relaxed pl-6 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                Yes! PolicyPilot RAG supports one-click "Login with Google" via official OAuth2, as well as traditional Email and Password registration with phone/contact details.
              </p>
            </div>

            <div className={`p-5 rounded-2xl border ${theme === 'dark' ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200'}`}>
              <h4 className="text-sm font-bold mb-1.5 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>What happens if an employee asks something not in the policy?</span>
              </h4>
              <p className={`text-xs leading-relaxed pl-6 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                PolicyPilot RAG strictly enforces a 0.58 vector similarity threshold. If an answer cannot be grounded directly in your uploaded policy files, the engine politely refuses to speculate and advises consulting the appropriate HR or legal officer.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          7. FINAL CALL TO ACTION (CTA)
      ========================================================================= */}
      <section className={`py-16 border-t ${
        theme === 'dark' ? 'bg-gradient-to-b from-[#0f172a] to-[#090d16] border-slate-800' : 'bg-emerald-50/80 border-emerald-200'
      }`}>
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight mb-4">
            Ready to explore verified policy intelligence?
          </h2>
          <p className={`text-sm max-w-xl mx-auto mb-8 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
            Sign in or register your account to start uploading enterprise manuals and querying with 100% vector grounding.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={onExplore}
              className="px-8 py-3.5 rounded-xl font-bold text-sm bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all shadow-lg hover:shadow-emerald-500/30 flex items-center gap-2 cursor-pointer"
            >
              <span>Explore Platform</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={onLogin}
              className={`px-6 py-3.5 rounded-xl font-semibold text-sm border transition-colors ${
                theme === 'dark'
                  ? 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800'
                  : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-100'
              }`}
            >
              Sign In to Existing Account
            </button>
          </div>
        </div>
      </section>

      {/* =========================================================================
          8. FOOTER
      ========================================================================= */}
      <footer className={`py-8 border-t text-xs transition-colors ${
        theme === 'dark' ? 'bg-[#090d16] border-slate-800 text-slate-500' : 'bg-white border-slate-200 text-slate-600'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-emerald-500" />
            <span className="font-bold text-slate-300">PolicyPilot RAG</span>
            <span>&bull; Confidential Enterprise Policy Compliance & Grounded Intelligence</span>
          </div>
          <div>
            Powered by FastAPI &bull; Qdrant Vector Cloud &bull; Supabase PostgreSQL &bull; Gemini Flash
          </div>
        </div>
      </footer>
    </div>
  );
}
