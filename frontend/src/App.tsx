import { Routes, Route } from 'react-router-dom'
import Coldiron from './pages/Coldiron'

import React, { useState, useEffect } from 'react';
import {
  Code,
  Terminal,
  Coffee,
  Mail,
  Github,
  Linkedin,
  Server,
  Database,
  Cloud,
  Brain,
  Briefcase,
  GraduationCap,
  Send,
  MapPin,
  Youtube,
  Mountain,
  Tent,
  Activity,
  Cpu,
  Map,
  Instagram,
  Facebook,
  Music,
  Camera
} from 'lucide-react';


// --- DATA: REAL CONTENT ---
const SITE_DATA = {
  name: "Ocean Coldiron",
  fullName: "Brandon Coldiron",
  role: "Systems Engineer & AI Technologist",
  location: "Remote (RV) | Base: TX",
  tagline: "Modernizing business operations with AI, Go, and 15+ years of systems expertise.",

  about: {
dev: "I’m a systems and integration engineer with 15+ years of experience building reliable automation across cloud and healthcare. I specialize in Go services, AWS infrastructure, and HL7/FHIR interoperability at scale (200+ client integrations). My focus is turning operational pain into calm, maintainable systems, eliminating failure modes, reducing noise, and preventing the daily fires.",
    human: "I design my life around growth, discomfort, and perspective. I live and work full-time from my RV, deliberately placing myself in unfamiliar places and cultures, often as the outsider in the room, because that is where real learning happens. I am pursuing the highest point in every U.S. state and training for Denali in 2027, not as a bucket list, but as a practice in discipline, resilience, and long-term thinking. Every challenge I choose is a system I’m trying to understand. Every place I go makes me better at building the next one.",
  },

  // --- SPLIT STATS: The Metrics that Matter for Each Side ---
  stats: {
    dev: [
      { value: "15+", label: "Years Experience" },
      { value: "200+", label: "Client Integrations" },
      { value: "5 TB+", label: "Data Managed" },
      { value: "99.9%", label: "System Uptime" },
    ],
    human: [
      { value: "100k+", label: "YouTube Subs" },
      { value: "39/50", label: "State High Points" }, // Updated to your specific number
      { value: "Full-Time", label: "RV Living" },
      { value: "2027", label: "Denali Goal" },
    ]
  },

  skills: [
    { name: "Go (Golang)", icon: Code, level: 40, type: "dev" },
    { name: "AI / LLM Integrations", icon: Brain, level: 50, type: "dev" },
    { name: "AWS & Cloud", icon: Cloud, level: 50, type: "dev" },
    { name: "Mirth Connect / HL7", icon: Server, level: 90, type: "dev" },
    { name: "SQL & DB Optimization", icon: Database, level: 80, type: "dev" },
    { name: "Content Creation", icon: Youtube, level: 80, type: "human" },
    { name: "Mountaineering", icon: Mountain, level: 70, type: "human" },
    { name: "Entrepreneurship", icon: Briefcase, level: 80, type: "human" },
    { name: "Photography", icon: Camera, level: 50, type: "human" },
    { name: "Logistics", icon: Map, level: 90, type: "human" },
  ],

  // --- SPLIT CONTENT: EXPERIENCE VS ADVENTURES ---
  experience: {
    dev: [
      { year: "2021 - Present", role: "Integration Consultant II", company: "ModMed", desc: "Built a full-stack Go app for dynamic protocols. Managing 200+ healthcare client integrations via Mirth Connect & AWS." },
      { year: "2020 - 2021", role: "Telecom Engineer", company: "Snap-On Credit", desc: "Managed an Avaya Systems Upgrade, upgrade was a success with zero downtime" },
      { year: "2019 - 2020", role: "IT Specialist / Lead DBA", company: "Lakeshore Bone & Joint", desc: "Sole DBA managing 5TB+ of clinical data. Collaborated directly with physicians to optimize EHR workflows and clinical operations." },
      { year: "2015 - 2019", role: "Entreprenuer/CEO", company: "Coldiron Auto Transport and RC Lawn and Tree", desc: "Founded and Ran 2 Businesses, Learnt all the hard lessons of being an Entreprenuer" },
      { year: "2011 - 2015", role: "Systems Engineer", company: "Cerner Corp", desc: "Executive white-glove support for C-Suite. Managed global technical logistics." },
    ],
    human: [
      {
        year: "2023 - Present",
        role: "Deliberate Discomfort",
        company: "North America",
        desc: "Left conventional stability behind to live and work full-time on the road. I chose constant change, unfamiliar environments, and new communities as my classroom—because comfort is the enemy of growth."
      },
      { year: "2027", role: "Denali Summit Attempt", company: "Alaska Range", desc: "Primary expedition objective: reach the summit of Denali after completing all U.S. state high points." },
      { year: "2023 - Present", role: "High Points Project", company: "North America", desc: "Transitioned to full-time RV life to pursue the highest point in every U.S. state while building software remotely." },
      { year: "2023 - Present", role: "Ocean Outdoors", company: "Media Platform", desc: "Built a 100k+ subscriber community focused on outdoor endurance, exploration, and lifestyle design." },
      { year: "2015 - 2019", role: "Owner / CEO", company: "RC Lawn and Tree", desc: "Bootstrapped a service business from zero. Learned the hard lessons of P&L, staffing, and customer satisfaction." },
    ]
  },

  education: [
    { school: "Colorado State University", degree: "Master of Business Administration (MBA)", year: "2024 - 2026", desc: "GPA: 3.9. Focus on Business Strategy." },
    { school: "Indiana University Bloomington", degree: "B.S. Informatics", year: "2009 - 2012", desc: "Minor in Business. GPA: 3.6." },
  ],

  // --- SPLIT CONTENT: CODE VS CREATION ---
  projects: {
    dev: [
      { title: "EZPostScheduler.com", desc: "Social Media AI Caption Generator and Scheduler", tags: ["Go", "AWS", "React", "Typescript", "Postgres"], link: "https://ezpostscheduler.com" },
      { title: "Healthcare Interop Engine", desc: "Architected HL7 & FHIR data pipelines using Mirth Connect for 200+ clients. Decreased Integration Trouble Tickets 87% MoM.", tags: ["Mirth", "HL7", "JavaScript"], link: "#" },
      { title: "Summit Ridge Digital", desc: "Website Hosting and Building Services", tags: ["S3", "AWS", "Typescript"], link: "https://summitridgedigital.com" },
    ],
    human: [
      { title: "Ocean Outdoors", desc: "A YouTube community of 100k+ outdoor enthusiasts following my journey across America.", tags: ["Video Production", "Community"], link: "https://youtube.com/@oceanoutdoors" },
      { title: "Project 50", desc: "The quest to summit the highest point in every US state. Currently at 39/50.", tags: ["Alpinism", "Logistics"], link: "#" },
      { title: "The Mobile HQ", desc: "Custom retrofitted RV setup allowing for enterprise-grade remote work from off-grid locations.", tags: ["Solar", "Starlink", "Build"], link: "#" },
    ]
  },

  socials: {
    linkedin: "https://linkedin.com/in/brandon-coldiron/",
    email: "brcoldir@gmail.com",
    youtube: "https://youtube.com/@oceanoutdoors",
    tiktok: "https://www.tiktok.com/@oceansoutdoors",
    instagram: "https://www.instagram.com/oceansoutdoors",
    facebook: "https://www.facebook.com/OceansOutdoors"
  }

};

// --- COMPONENT: TYPEWRITER EFFECT ---
const Typewriter = ({ text, delay = 50, startDelay = 0 }: { text: string, delay?: number, startDelay?: number }) => {
  const [currentText, setCurrentText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setHasStarted(true), startDelay);
    return () => clearTimeout(timer);
  }, [startDelay]);

  useEffect(() => {
    if (!hasStarted) return;
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setCurrentText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, delay);
      return () => clearTimeout(timeout);
    }
  }, [currentIndex, delay, hasStarted, text]);

  return <span>{currentText}</span>;
};

// --- MAIN APP COMPONENT ---
const App = () => {
  const [mode, setMode] = useState<'dev' | 'human'>('dev');
  const [scrolled, setScrolled] = useState(false);
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleMode = () => setMode(prev => prev === 'dev' ? 'human' : 'dev');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactForm),
      });

      if (!response.ok) throw new Error('Failed to send');

      setSubmitStatus('success');
      setContactForm({ name: '', email: '', message: '' });
      setTimeout(() => setSubmitStatus('idle'), 5000);
    } catch (error) {
      console.error(error);
      setSubmitStatus('error');
      setTimeout(() => setSubmitStatus('idle'), 3000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const home = (
    <div className={`min-h-screen transition-colors duration-700 font-sans selection:bg-opacity-30 ${mode === 'dev' ? 'bg-[#0a0f1e] text-slate-100 selection:bg-blue-500' : 'bg-[#f8f5f2] text-stone-800 selection:bg-orange-500'}`}>

      {/* Navigation */}
      <nav className={`fixed w-full z-50 transition-all duration-300 ${scrolled ? (mode === 'dev' ? 'bg-[#0a0f1e]/90 backdrop-blur border-b border-slate-800' : 'bg-white/90 backdrop-blur border-b border-stone-200 shadow-sm') : 'bg-transparent'}`}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="font-bold text-xl flex items-center gap-2">
            {mode === 'dev' ? <Terminal size={20} className="text-blue-500" /> : <Tent size={20} className="text-orange-600" />}
            <span className="tracking-tight">{SITE_DATA.name}</span>
          </div>

          <button
            onClick={toggleMode}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300 hover:scale-105 active:scale-95 ${mode === 'dev'
              ? 'bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-700 shadow-[0_0_15px_rgba(59,130,246,0.2)]'
              : 'bg-white hover:bg-stone-50 text-orange-600 border border-stone-200 shadow-sm'
              }`}
          >
            {mode === 'dev' ? (
              <><span>System View</span><Cpu size={16} /></>
            ) : (
              <><span>Human View</span><Coffee size={16} /></>
            )}
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-40 pb-20 px-6 relative overflow-hidden">
        {mode === 'dev' && (
          <div className="absolute top-20 right-0 opacity-10 font-mono text-xs pointer-events-none select-none">
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i}>{Math.random().toString(36).substring(7)}</div>
            ))}
          </div>
        )}

        <div className="max-w-5xl mx-auto text-center space-y-8 relative z-10">
          <div className="space-y-4">
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-4">
              {mode === 'dev' ? (
                <span>
                  <span className="text-slate-600">&lt;</span>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                    {SITE_DATA.name}
                  </span>
                  <span className="text-slate-600">/&gt;</span>
                  <span className="animate-pulse text-blue-500">_</span>
                </span>
              ) : (
                <span className="text-stone-800 font-serif">
                  {SITE_DATA.name}<span className="text-orange-500">.</span>
                </span>
              )}
            </h1>

            <div className={`text-xl md:text-2xl max-w-2xl mx-auto leading-relaxed h-24 flex items-center justify-center ${mode === 'dev' ? 'text-blue-200/80 font-mono' : 'text-stone-600 font-serif italic'}`}>
              {mode === 'dev' ? (
                <span>
                  <span className="text-blue-500">func</span> <span className="text-yellow-300">init</span>() &#123; <Typewriter text='replace("Chaos", "Clarity")' startDelay={500} />
 &#125;
                </span>
              ) : (
                "I follow curiosity, not comfort."
              )}
            </div>
          </div>

          {/* DYNAMIC STATS BAR: This now changes based on mode */}
          <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto mt-12 p-4 rounded-2xl border ${mode === 'dev' ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-stone-200 shadow-lg'}`}>
            {/* We map over the correct stats array based on the current mode */}
            {SITE_DATA.stats[mode].map((stat, idx) => (
              <div key={idx} className="text-center">
                <div className={`text-2xl font-bold ${mode === 'dev' ? 'text-white' : 'text-stone-800'}`}>{stat.value}</div>
                <div className="text-xs uppercase tracking-wide opacity-50">{stat.label}</div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap justify-center gap-4 pt-8">
            <a href={SITE_DATA.socials.linkedin} target="_blank" rel="noreferrer" className={`group flex items-center gap-2 px-5 py-2 rounded-lg transition-all ${mode === 'dev' ? 'hover:bg-slate-900 text-slate-400 hover:text-white' : 'hover:bg-stone-200 text-stone-600 hover:text-stone-900'}`}>
              <Linkedin size={20} />
              <div className="text-left flex flex-col leading-none">
                <span className="text-xs opacity-50 font-mono">Connect</span>
                <span className="text-xs font-bold mt-1">LinkedIn</span>
              </div>
            </a>

            <a href={SITE_DATA.socials.youtube} target="_blank" rel="noreferrer" className={`group flex items-center gap-2 px-5 py-2 rounded-lg transition-all ${mode === 'dev' ? 'hover:bg-slate-900 text-slate-400 hover:text-red-500' : 'hover:bg-stone-200 text-stone-600 hover:text-red-600'}`}>
              <Youtube size={20} />
              <div className="text-left flex flex-col leading-none">
                <span className="text-xs opacity-50 font-mono">Watch</span>
                <span className="text-xs font-bold mt-1">@oceanoutdoors</span>
              </div>
            </a>

            <a href={SITE_DATA.socials.tiktok} target="_blank" rel="noreferrer" className={`group flex items-center gap-2 px-5 py-2 rounded-lg transition-all ${mode === 'dev' ? 'hover:bg-slate-900 text-slate-400 hover:text-pink-400' : 'hover:bg-stone-200 text-stone-600 hover:text-pink-500'}`}>
              <Music size={20} />
              <div className="text-left flex flex-col leading-none">
                <span className="text-xs opacity-50 font-mono">Also on</span>
                <span className="text-xs font-bold mt-1">TikTok</span>
              </div>
            </a>

            <a href={SITE_DATA.socials.instagram} target="_blank" rel="noreferrer" className={`group flex items-center gap-2 px-5 py-2 rounded-lg transition-all ${mode === 'dev' ? 'hover:bg-slate-900 text-slate-400 hover:text-purple-400' : 'hover:bg-stone-200 text-stone-600 hover:text-purple-500'}`}>
              <Instagram size={20} />
              <div className="text-left flex flex-col leading-none">
                <span className="text-xs opacity-50 font-mono">Lets Not Forget</span>
                <span className="text-xs font-bold mt-1">Instagram</span>
              </div>
            </a>

            <a href={SITE_DATA.socials.facebook} target="_blank" rel="noreferrer" className={`group flex items-center gap-2 px-5 py-2 rounded-lg transition-all ${mode === 'dev' ? 'hover:bg-slate-900 text-slate-400 hover:text-blue-400' : 'hover:bg-stone-200 text-stone-600 hover:text-blue-600'}`}>
              <Facebook size={20} />
              <div className="text-left flex flex-col leading-none">
                <span className="text-xs opacity-50 font-mono">Check me out on</span>
                <span className="text-xs font-bold mt-1">Facebook</span>
              </div>
            </a>

            <a href={`mailto:${SITE_DATA.socials.email}`} className={`flex items-center gap-2 px-5 py-2 rounded-lg transition-all ${mode === 'dev' ? 'hover:bg-slate-900 text-slate-400 hover:text-white' : 'hover:bg-stone-200 text-stone-600 hover:text-stone-900'}`}>
              <Mail size={20} />
              <span className="text-sm font-bold">Email Me</span>
            </a>


          </div>
        </div>
      </section>

      {/* The Dual Content Section */}
      <section className={`py-24 px-6 transition-colors duration-500 ${mode === 'dev' ? 'bg-slate-900/50 border-y border-slate-800' : 'bg-stone-100 border-y border-stone-200'}`}>
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">

          <div className="space-y-8">
            <h2 className={`text-3xl font-bold flex items-center gap-3 ${mode === 'dev' ? 'font-sans' : 'font-serif'}`}>
              {mode === 'dev' ? <Terminal className="text-blue-500" /> : <MapPin className="text-orange-600" />}
              {mode === 'dev' ? "System Architecture" : "The Mission"}
            </h2>
            <p className={`text-lg leading-loose ${mode === 'dev' ? 'text-slate-300' : 'text-stone-700'}`}>
              {mode === 'dev' ? SITE_DATA.about.dev : SITE_DATA.about.human}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {SITE_DATA.skills.filter(s => s.type === mode).map((skill, idx) => (
                <div key={idx} className={`p-4 rounded-xl border flex items-center gap-4 transition-all hover:translate-x-1 ${mode === 'dev'
                  ? 'bg-slate-950 border-slate-800 hover:border-blue-500/50 hover:shadow-[0_0_15px_rgba(59,130,246,0.1)]'
                  : 'bg-white border-stone-200 shadow-sm hover:shadow-md'
                  }`}>
                  <skill.icon size={24} className={mode === 'dev' ? 'text-blue-400' : 'text-orange-600'} />
                  <div>
                    <div className="font-bold text-sm">{skill.name}</div>
                    <div className="w-24 h-1 bg-gray-200/20 rounded-full mt-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${mode === 'dev' ? 'bg-blue-500' : 'bg-orange-500'}`}
                        style={{ width: `${skill.level}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Side: Visuals */}
          <div className="relative">
            {mode === 'dev' ? (
              <div className="bg-[#0f1423] rounded-lg p-6 font-mono text-sm border border-slate-800 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-cyan-500" />
                <div className="flex gap-1.5 mb-6 opacity-50">
                  <div className="w-3 h-3 rounded-full bg-slate-600" />
                  <div className="w-3 h-3 rounded-full bg-slate-600" />
                  <div className="w-3 h-3 rounded-full bg-slate-600" />
                </div>
                <div className="space-y-2 text-slate-400">
                  <p><span className="text-purple-400">package</span> main</p>
                  <p className="mt-4"><span className="text-purple-400">type</span> Engineer <span className="text-purple-400">struct</span> {`{`}</p>
                  <p className="pl-4">Name&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-yellow-300">string</span></p>
                  <p className="pl-4">Skills&nbsp;&nbsp;&nbsp;<span className="text-yellow-300">[]string</span></p>
                  <p className="pl-4">Uptime&nbsp;&nbsp;&nbsp;<span className="text-yellow-300">string</span></p>
                  <p>{`}`}</p>

                  <p className="mt-4"><span className="text-purple-400">func</span> <span className="text-blue-400">GetProfile</span>() Engineer {`{`}</p>
                  <p className="pl-4"><span className="text-purple-400">return</span> Engineer{`{`}</p>
                  <p className="pl-8">Name: <span className="text-green-400">"Ocean"</span>,</p>
                  <p className="pl-8">Skills: []<span className="text-yellow-300">string</span>{`{`}<span className="text-green-400">"Go"</span>, <span className="text-green-400">"AI"</span>, <span className="text-green-400">"AWS"</span>{`}`},</p>
                  <p className="pl-8">Uptime: <span className="text-green-400">"15 Years"</span>,</p>
                  <p className="pl-4">{`}`}</p>
                  <p>{`}`}</p>
                  <div className="mt-4 flex items-center gap-2 text-blue-500/50">
                    <Activity size={14} className="animate-pulse" />
                    <span>System Nominal</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative h-80 w-full">
                <div className="absolute top-0 right-10 bg-white p-5 rounded-lg shadow-md border border-stone-200 rotate-3 z-10 max-w-xs transition-transform hover:scale-105 hover:z-20">
                  <div className="flex gap-3 mb-3">
                    <div className="p-2 bg-red-100 text-red-600 rounded-lg"><Youtube size={24} /></div>
                    <div>
                      <div className="font-bold text-stone-800">Content Creator</div>
                      <div className="text-xs text-stone-500">100k+ Subscribers</div>
                    </div>
                  </div>
                  <p className="text-sm text-stone-600 leading-snug">
                    "Documenting the RV life and outdoor adventures for a growing community of enthusiasts."
                  </p>
                </div>

                <div className="absolute bottom-4 left-4 bg-white p-5 rounded-lg shadow-md border border-stone-200 -rotate-2 max-w-xs transition-transform hover:scale-105 hover:z-20">
                  <div className="flex gap-3 mb-3">
                    <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg"><Mountain size={24} /></div>
                    <div>
                      <div className="font-bold text-stone-800">Mountaineer</div>
                      <div className="text-xs text-stone-500">Goal: Denali 2027</div>
                    </div>
                  </div>
                  <p className="text-sm text-stone-600 leading-snug">
                    "Attempting to summit the high point of every US state. Living full-time on the road to make it happen."
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Experience Timeline (SPLIT) */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className={`text-3xl font-bold mb-16 text-center ${mode === 'dev' ? 'font-sans' : 'font-serif'}`}>
            {mode === 'dev' ? "Professional History" : "The Making of Me"}
          </h2>

          <div className="space-y-12">
            {(mode === 'dev' ? SITE_DATA.experience.dev : SITE_DATA.experience.human).map((item, idx) => (
              <div key={idx} className="relative pl-12 group">
                {/* Timeline Line */}
                <div className={`absolute left-[11px] top-2 bottom-0 w-0.5 ${mode === 'dev' ? 'bg-slate-800' : 'bg-stone-300'} group-last:hidden`} />

                {/* Dot */}
                <div className={`absolute left-0 top-2 w-6 h-6 rounded-full border-4 transition-colors ${mode === 'dev' ? 'bg-slate-950 border-blue-500 group-hover:border-cyan-400' : 'bg-stone-50 border-orange-400 group-hover:border-orange-600'}`} />

                <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between mb-2">
                  <h3 className="text-xl font-bold">{item.role}</h3>
                  <span className={`text-sm font-mono ${mode === 'dev' ? 'text-slate-500' : 'text-stone-500'}`}>{item.year}</span>
                </div>

                <div className={`text-lg font-medium mb-3 ${mode === 'dev' ? 'text-blue-400' : 'text-orange-600'}`}>
                  {item.company}
                </div>

                <p className={`leading-relaxed ${mode === 'dev' ? 'text-slate-400' : 'text-stone-600'}`}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Education Section (ONLY SHOW IN DEV MODE for Cleanliness, or keep both?) Let's keep both. */}
      <section className={`py-24 px-6 ${mode === 'dev' ? 'bg-slate-900/30 border-y border-slate-800' : 'bg-stone-50 border-y border-stone-200'}`}>
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center gap-4 mb-12">
            <div className={`p-3 rounded-xl ${mode === 'dev' ? 'bg-purple-500/10 text-purple-400' : 'bg-indigo-500/10 text-indigo-600'}`}>
              <GraduationCap size={32} />
            </div>
            <h2 className="text-3xl font-bold">Education</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {SITE_DATA.education.map((edu, idx) => (
              <div key={idx} className={`p-8 rounded-2xl border transition-all hover:-translate-y-1 ${mode === 'dev'
                ? 'bg-slate-950 border-slate-800 hover:border-purple-500/50'
                : 'bg-white border-stone-200 shadow-sm hover:shadow-md'
                }`}>
                <div className={`text-sm font-mono mb-2 opacity-60 ${mode === 'dev' ? 'text-purple-300' : 'text-indigo-600'}`}>{edu.year}</div>
                <h3 className="text-xl font-bold mb-1">{edu.school}</h3>
                <div className={`font-medium mb-4 ${mode === 'dev' ? 'text-purple-400' : 'text-indigo-600'}`}>{edu.degree}</div>
                <p className={`text-sm leading-relaxed ${mode === 'dev' ? 'text-slate-400' : 'text-stone-600'}`}>
                  {edu.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Projects Grid (SPLIT) */}
      <section className={`py-24 px-6 ${mode === 'dev' ? 'bg-[#0a0f1e]' : 'bg-[#f4f1ea]'}`}>
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-4 mb-12">
            <div className={`p-3 rounded-xl ${mode === 'dev' ? 'bg-blue-500/10 text-blue-400' : 'bg-orange-500/10 text-orange-600'}`}>
              <Briefcase size={32} />
            </div>
            <h2 className="text-3xl font-bold">
              {mode === 'dev' ? "Selected Projects" : "What I'm Building"}
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {(mode === 'dev' ? SITE_DATA.projects.dev : SITE_DATA.projects.human).map((project, idx) => {
              const isExternal = project.link?.startsWith("http")
              const Wrapper: any = isExternal ? "a" : "div"

              return (
                <Wrapper
                  key={idx}
                  href={isExternal ? project.link : undefined}
                  target={isExternal ? "_blank" : undefined}
                  rel={isExternal ? "noreferrer" : undefined}
                  className={`group flex flex-col p-8 rounded-2xl border transition-all duration-300 hover:-translate-y-2 cursor-pointer ${mode === 'dev'
                    ? 'bg-slate-950 border-slate-800 hover:border-blue-500/50 hover:shadow-2xl hover:shadow-blue-900/20'
                    : 'bg-white border-stone-200 hover:border-orange-300 shadow-sm hover:shadow-xl hover:shadow-orange-900/5'
                    }`}
                >
                  <div className="flex justify-between items-start mb-6">
                    <h3 className="font-bold text-xl">{project.title}</h3>
                    {mode === 'dev' ? (
                      <Github size={20} className="opacity-0 group-hover:opacity-50 hover:!opacity-100 cursor-pointer transition-opacity" />
                    ) : (
                      <Youtube size={20} className="opacity-0 group-hover:opacity-50 hover:!opacity-100 cursor-pointer transition-opacity text-red-500" />
                    )}
                  </div>

                  <p className={`mb-8 flex-grow leading-relaxed text-sm ${mode === 'dev' ? 'text-slate-400' : 'text-stone-600'}`}>
                    {project.desc}
                  </p>

                  <div className="flex flex-wrap gap-2 pt-6 border-t border-dashed border-opacity-50 border-gray-500">
                    {project.tags.map((tag, tIdx) => (
                      <span key={tIdx} className={`text-xs px-2.5 py-1 rounded-md font-medium ${mode === 'dev' ? 'bg-slate-900 text-blue-300' : 'bg-stone-100 text-stone-600'
                        }`}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </Wrapper>
              )
            })}

          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className={`py-24 px-6 ${mode === 'dev' ? 'bg-gradient-to-b from-[#0a0f1e] to-slate-950' : 'bg-stone-100'}`}>
        <div className="max-w-xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6">Let's Connect</h2>
          <p className="mb-10 opacity-70">
            {mode === 'dev'
              ? "Ready to collaborate on scalable systems or AI architecture?"
              : "Whether it's about tech, business, or the best way to fell a tree, I'm all ears."}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4 text-left">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-2 opacity-50 ml-1">Name</label>
                <input
                  type="text"
                  required
                  value={contactForm.name}
                  onChange={e => setContactForm({ ...contactForm, name: e.target.value })}
                  className={`w-full px-4 py-3 rounded-lg border outline-none transition-all ${mode === 'dev'
                    ? 'bg-slate-900 border-slate-700 focus:border-blue-500 text-white placeholder-slate-600'
                    : 'bg-white border-stone-300 focus:border-orange-500 placeholder-stone-400'
                    }`}
                  placeholder="Name"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-2 opacity-50 ml-1">Email</label>
                <input
                  type="email"
                  required
                  value={contactForm.email}
                  onChange={e => setContactForm({ ...contactForm, email: e.target.value })}
                  className={`w-full px-4 py-3 rounded-lg border outline-none transition-all ${mode === 'dev'
                    ? 'bg-slate-900 border-slate-700 focus:border-blue-500 text-white placeholder-slate-600'
                    : 'bg-white border-stone-300 focus:border-orange-500 placeholder-stone-400'
                    }`}
                  placeholder="email@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-2 opacity-50 ml-1">Message</label>
              <textarea
                rows={5}
                required
                value={contactForm.message}
                onChange={e => setContactForm({ ...contactForm, message: e.target.value })}
                className={`w-full px-4 py-3 rounded-lg border outline-none transition-all ${mode === 'dev'
                  ? 'bg-slate-900 border-slate-700 focus:border-blue-500 text-white placeholder-slate-600'
                  : 'bg-white border-stone-300 focus:border-orange-500 placeholder-stone-400'
                  }`}
                placeholder={mode === 'dev' ? "func Contact(msg string) error {...}" : "How can I help you?"}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-4 rounded-lg font-bold text-lg flex items-center justify-center gap-2 transition-all hover:translate-y-[-2px] ${mode === 'dev'
                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/50'
                : 'bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-900/20'
                }`}
            >
              {isSubmitting ? (
                <span className="animate-pulse">Sending...</span>
              ) : (
                <>
                  {submitStatus === 'success' ? "Message Sent!" : "Send Message"}
                  {!submitStatus && <Send size={20} />}
                </>
              )}
            </button>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className={`py-12 text-center text-sm opacity-50 ${mode === 'dev' ? 'bg-[#0a0f1e] text-slate-500' : 'bg-stone-200 text-stone-600'}`}>
        <p className="mb-2">
          © {new Date().getFullYear()} Ocean (Brandon Coldiron) ·{" "}
          <a
            href="/coldiron"
            className={`underline-offset-4 hover:underline transition ${mode === 'dev'
              ? 'text-blue-300 hover:text-blue-400'
              : 'text-orange-600 hover:text-orange-700'
              }`}
          >
            Coldiron
          </a>
        </p>
        <p className="text-xs">Built with Go, React, & Tailwind.</p>
      </footer>

    </div>
  );

  return (
    <Routes>
      <Route path="/" element={home} />
      <Route path="/coldiron" element={<Coldiron mode={mode} />} />
    </Routes>
  );

};

export default App;