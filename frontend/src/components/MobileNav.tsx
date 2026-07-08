import { useState } from 'react'
import { Terminal, Tent, Cpu, Coffee, Menu, X } from 'lucide-react'

interface MobileNavProps {
  mode: 'dev' | 'human'
  onToggleMode: () => void
  name: string
}

const NAV_LINKS = [
  { label: 'About', href: '#about' },
  { label: 'Skills', href: '#skills' },
  { label: 'Experience', href: '#experience' },
  { label: 'Education', href: '#education' },
  { label: 'Projects', href: '#projects' },
  { label: 'Contact', href: '#contact' },
]

const MobileNav = ({ mode, onToggleMode, name }: MobileNavProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const isDev = mode === 'dev'

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-50 border-b ${isDev ? 'bg-[#0a0f1e]/95 backdrop-blur border-slate-800' : 'bg-white/95 backdrop-blur border-stone-200 shadow-sm'}`}>
        <div className="px-4 h-14 flex items-center justify-between">
          <div className="font-bold text-lg flex items-center gap-2">
            {isDev ? <Terminal size={18} className="text-blue-500" /> : <Tent size={18} className="text-orange-600" />}
            <span className="tracking-tight">{name}</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onToggleMode}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${isDev
                ? 'bg-slate-800 text-blue-400 border border-slate-700'
                : 'bg-white text-orange-600 border border-stone-200 shadow-sm'
              }`}
            >
              {isDev ? <><span>System</span><Cpu size={12} /></> : <><span>Human</span><Coffee size={12} /></>}
            </button>
            <button
              onClick={() => setIsOpen(o => !o)}
              aria-label={isOpen ? 'Close menu' : 'Open menu'}
              className={`p-2 rounded-lg transition-colors ${isDev ? 'text-slate-400 hover:bg-slate-800' : 'text-stone-600 hover:bg-stone-100'}`}
            >
              {isOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </nav>

      {isOpen && (
        <>
          <div className={`fixed top-14 left-0 right-0 z-40 border-b ${isDev ? 'bg-[#0a0f1e] border-slate-800' : 'bg-white border-stone-200 shadow-lg'}`}>
            <div className="px-4 py-4 flex flex-col gap-1">
              {NAV_LINKS.map(link => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className={`px-4 py-3 rounded-lg font-medium transition-colors ${isDev
                    ? 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    : 'text-stone-700 hover:bg-stone-100 hover:text-stone-900'
                  }`}
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>
          <div className="fixed inset-0 z-30 bg-black/20" onClick={() => setIsOpen(false)} />
        </>
      )}
    </>
  )
}

export default MobileNav
