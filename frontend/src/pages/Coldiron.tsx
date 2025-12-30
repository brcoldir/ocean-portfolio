import { Link } from "react-router-dom"
import { ArrowLeft, Terminal, Tent, Youtube, Linkedin } from "lucide-react"

type Props = {
  mode: "dev" | "human"
}

const Coldiron = ({ mode }: Props) => {
  return (
    <div
      className={`min-h-screen transition-colors duration-700 font-sans selection:bg-opacity-30 ${
        mode === "dev"
          ? "bg-[#0a0f1e] text-slate-100 selection:bg-blue-500"
          : "bg-[#f8f5f2] text-stone-800 selection:bg-orange-500"
      }`}
    >
      {/* Top bar */}
      <div
        className={`sticky top-0 z-50 border-b backdrop-blur ${
          mode === "dev"
            ? "bg-[#0a0f1e]/90 border-slate-800"
            : "bg-white/90 border-stone-200 shadow-sm"
        }`}
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="font-bold text-xl flex items-center gap-2">
            {mode === "dev" ? (
              <Terminal size={20} className="text-blue-500" />
            ) : (
              <Tent size={20} className="text-orange-600" />
            )}
            <span className="tracking-tight">Ocean Coldiron</span>
          </div>

          <Link
            to="/"
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300 hover:scale-105 active:scale-95 ${
              mode === "dev"
                ? "bg-slate-800 hover:bg-slate-700 text-blue-200 border border-slate-700"
                : "bg-white hover:bg-stone-50 text-stone-700 border border-stone-200"
            }`}
          >
            <ArrowLeft size={16} />
            Back Home
          </Link>
        </div>
      </div>

      {/* Hero */}
      <section className="pt-28 pb-16 px-6 relative overflow-hidden">
        {mode === "dev" && (
          <div className="absolute top-20 right-0 opacity-10 font-mono text-xs pointer-events-none select-none">
            {Array.from({ length: 18 }).map((_, i) => (
              <div key={i}>{Math.random().toString(36).substring(7)}</div>
            ))}
          </div>
        )}

        <div className="max-w-5xl mx-auto text-center space-y-6 relative z-10">
          <h1 className="text-6xl md:text-7xl font-black tracking-tighter">
            {mode === "dev" ? (
              <span>
                <span className="text-slate-600">&lt;</span>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                  Coldiron
                </span>
                <span className="text-slate-600">/&gt;</span>
                <span className="animate-pulse text-blue-500">_</span>
              </span>
            ) : (
              <span className="font-serif">
                Coldiron<span className="text-orange-500">.</span>
              </span>
            )}
          </h1>

          <p
            className={`text-lg md:text-xl max-w-3xl mx-auto leading-relaxed ${
              mode === "dev" ? "text-slate-300" : "text-stone-600 font-serif"
            }`}
          >
            The surname <strong>Coldiron</strong> is associated with outdoor creator and technologist{" "}
            <strong>Ocean Coldiron</strong> (also known as Brandon Coldiron). This page exists to help searchers
            find the official source.
          </p>

          <div
            className={`mt-8 max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-2xl border ${
              mode === "dev"
                ? "bg-slate-900/50 border-slate-800"
                : "bg-white border-stone-200 shadow-lg"
            }`}
          >
            <div className="text-center">
              <div className={`text-2xl font-bold ${mode === "dev" ? "text-white" : "text-stone-800"}`}>
                100k+
              </div>
              <div className="text-xs uppercase tracking-wide opacity-50">YouTube Subscribers</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${mode === "dev" ? "text-white" : "text-stone-800"}`}>
                39/50
              </div>
              <div className="text-xs uppercase tracking-wide opacity-50">State High Points</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${mode === "dev" ? "text-white" : "text-stone-800"}`}>
                15+
              </div>
              <div className="text-xs uppercase tracking-wide opacity-50">Years in Systems</div>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-4 pt-8">
            <a
              href="https://youtube.com/@oceanoutdoors"
              target="_blank"
              rel="noreferrer"
              className={`group flex items-center gap-2 px-5 py-2 rounded-lg transition-all ${
                mode === "dev"
                  ? "hover:bg-slate-900 text-slate-400 hover:text-red-500"
                  : "hover:bg-stone-200 text-stone-600 hover:text-red-600"
              }`}
            >
              <Youtube size={20} />
              <span className="text-sm font-bold">YouTube</span>
            </a>

            <a
              href="https://linkedin.com/in/brandon-coldiron/"
              target="_blank"
              rel="noreferrer"
              className={`group flex items-center gap-2 px-5 py-2 rounded-lg transition-all ${
                mode === "dev"
                  ? "hover:bg-slate-900 text-slate-400 hover:text-white"
                  : "hover:bg-stone-200 text-stone-600 hover:text-stone-900"
              }`}
            >
              <Linkedin size={20} />
              <span className="text-sm font-bold">LinkedIn</span>
            </a>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className={`py-16 px-6 ${mode === "dev" ? "bg-slate-900/30 border-y border-slate-800" : "bg-stone-100 border-y border-stone-200"}`}>
        <div className="max-w-4xl mx-auto grid gap-6">
          <div
            className={`p-8 rounded-2xl border ${
              mode === "dev" ? "bg-slate-950 border-slate-800" : "bg-white border-stone-200 shadow-sm"
            }`}
          >
            <h2 className="text-2xl font-bold mb-4">About the Coldiron name</h2>
            <p className={`${mode === "dev" ? "text-slate-300" : "text-stone-600"} leading-relaxed`}>
              If you searched “Coldiron” looking for Ocean Coldiron: you’re in the right place. This page is
              intentionally optimized to help Google connect the Coldiron surname with Ocean’s official site and
              social profiles.
            </p>
          </div>

          <div
            className={`p-8 rounded-2xl border ${
              mode === "dev" ? "bg-slate-950 border-slate-800" : "bg-white border-stone-200 shadow-sm"
            }`}
          >
            <h2 className="text-2xl font-bold mb-4">Official links</h2>
            <ul className={`space-y-2 ${mode === "dev" ? "text-slate-300" : "text-stone-600"}`}>
              <li>
                <a className="underline" href="https://oceancoldiron.com">oceancoldiron.com</a>
              </li>
              <li>
                <a className="underline" href="https://youtube.com/@oceanoutdoors">youtube.com/@oceanoutdoors</a>
              </li>
              <li>
                <a className="underline" href="https://linkedin.com/in/brandon-coldiron/">linkedin.com/in/brandon-coldiron</a>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={`py-12 text-center text-sm opacity-50 ${mode === "dev" ? "bg-[#0a0f1e] text-slate-500" : "bg-stone-200 text-stone-600"}`}>
        <p className="mb-2">© {new Date().getFullYear()} Ocean (Brandon Coldiron).</p>
        <p className="text-xs">Built with Go, React, & Tailwind.</p>
      </footer>
    </div>
  )
}

export default Coldiron
