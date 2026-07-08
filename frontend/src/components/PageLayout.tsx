import type { ReactNode } from 'react'
import { Terminal, Tent, Cpu, Coffee } from 'lucide-react'
import { ChatWidget } from './ChatWidget'
import MobileNav from './MobileNav'
import { useMediaQuery } from '../hooks/useMediaQuery'

interface PageLayoutProps {
  children: ReactNode
  mode: 'dev' | 'human'
  scrolled: boolean
  onToggleMode: () => void
  name: string
}

const PageLayout = ({ children, mode, scrolled, onToggleMode, name }: PageLayoutProps) => {
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const isDev = mode === 'dev'

  const outerClass = `transition-colors duration-700 font-sans selection:bg-opacity-30 ${
    isDev ? 'bg-[#0a0f1e] text-slate-100 selection:bg-blue-500' : 'bg-[#f8f5f2] text-stone-800 selection:bg-orange-500'
  }`

  if (isDesktop) {
    return (
      <div className={`flex min-h-screen ${outerClass}`}>
        <div className="flex-1 min-w-0">
          <nav className={`fixed top-0 left-0 right-[25%] z-50 transition-all duration-300 ${
            scrolled
              ? isDev
                ? 'bg-[#0a0f1e]/90 backdrop-blur border-b border-slate-800'
                : 'bg-white/90 backdrop-blur border-b border-stone-200 shadow-sm'
              : 'bg-transparent'
          }`}>
            <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
              <div className="font-bold text-xl flex items-center gap-2">
                {isDev ? <Terminal size={20} className="text-blue-500" /> : <Tent size={20} className="text-orange-600" />}
                <span className="tracking-tight">{name}</span>
              </div>
              <button
                onClick={onToggleMode}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300 hover:scale-105 active:scale-95 ${
                  isDev
                    ? 'bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-700 shadow-[0_0_15px_rgba(59,130,246,0.2)]'
                    : 'bg-white hover:bg-stone-50 text-orange-600 border border-stone-200 shadow-sm'
                }`}
              >
                {isDev ? <><span>System View</span><Cpu size={16} /></> : <><span>Human View</span><Coffee size={16} /></>}
              </button>
            </div>
          </nav>
          {children}
        </div>
        <div className={`w-1/4 flex-shrink-0 sticky top-0 h-screen border-l ${isDev ? 'border-slate-800' : 'border-stone-200'}`}>
          <ChatWidget mode={mode} variant="embedded" />
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen ${outerClass}`}>
      <MobileNav mode={mode} onToggleMode={onToggleMode} name={name} />
      {children}
      <ChatWidget mode={mode} variant="floating" />
    </div>
  )
}

export default PageLayout
