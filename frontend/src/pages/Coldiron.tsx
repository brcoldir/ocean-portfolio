import { Link } from "react-router-dom"
import { ArrowLeft, Terminal, Tent, Youtube, Linkedin, Github, Instagram, Facebook, Music, AtSign, Mountain, Mic } from "lucide-react"
import headshot from "../images/Headshot.jpg"
import LATEST_STORIES from "../data/latestStories.json"

type Props = {
  mode: "dev" | "human"
}

const PROFILES = [
  { label: "YouTube: Ocean Outdoors (@OceansOutdoors)", href: "https://www.youtube.com/@OceansOutdoors", icon: Youtube },
  { label: "Facebook: Ocean Outdoors", href: "https://www.facebook.com/OceansOutdoors", icon: Facebook },
  { label: "Instagram: @oceansoutdoors", href: "https://www.instagram.com/oceansoutdoors/", icon: Instagram },
  { label: "TikTok: @oceansoutdoors", href: "https://www.tiktok.com/@oceansoutdoors", icon: Music },
  { label: "LinkedIn: Ocean Coldiron", href: "https://www.linkedin.com/in/brandon-coldiron/", icon: Linkedin },
  { label: "GitHub: brcoldir", href: "https://github.com/brcoldir", icon: Github },
  { label: "X: @oceansoutdoors", href: "https://x.com/oceansoutdoors", icon: AtSign },
  { label: "Peakbagger: Ocean Coldiron", href: "https://www.peakbagger.com/climber/climber.aspx?cid=43222", icon: Mountain },
  { label: "ListsOfJohn: brcoldir", href: "https://listsofjohn.com/m/brcoldir", icon: Mountain },
  { label: "SummitPost: brcoldir", href: "https://www.summitpost.org/users/brcoldir/173680", icon: Mountain },
  { label: "Trail Talk podcast, Episode 81", href: "https://www.youtube.com/watch?v=oJLlpVJLn_k", icon: Mic },
]

const Coldiron = ({ mode }: Props) => {
  const isDev = mode === "dev"
  const card = `p-8 rounded-2xl border ${isDev ? "bg-slate-950 border-slate-800" : "bg-white border-stone-200 shadow-sm"}`
  const body = `${isDev ? "text-slate-300" : "text-stone-700"} leading-relaxed space-y-4`
  const link = `underline underline-offset-4 ${isDev ? "text-blue-300 hover:text-blue-200" : "text-orange-700 hover:text-orange-800"}`

  return (
    <div
      className={`min-h-screen transition-colors duration-700 font-sans selection:bg-opacity-30 ${
        isDev ? "bg-[#0a0f1e] text-slate-100 selection:bg-blue-500" : "bg-[#f8f5f2] text-stone-800 selection:bg-orange-500"
      }`}
    >
      {/* Top bar */}
      <div className={`sticky top-0 z-50 border-b backdrop-blur ${isDev ? "bg-[#0a0f1e]/90 border-slate-800" : "bg-white/90 border-stone-200 shadow-sm"}`}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="font-bold text-xl flex items-center gap-2">
            {isDev ? <Terminal size={20} className="text-blue-500" /> : <Tent size={20} className="text-orange-600" />}
            <Link to="/" className="tracking-tight">Ocean Coldiron</Link>
          </div>
          <Link
            to="/"
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300 hover:scale-105 active:scale-95 ${
              isDev ? "bg-slate-800 hover:bg-slate-700 text-blue-200 border border-slate-700" : "bg-white hover:bg-stone-50 text-stone-700 border border-stone-200"
            }`}
          >
            <ArrowLeft size={16} />
            Back Home
          </Link>
        </div>
      </div>

      {/* Hero */}
      <header className="pt-24 pb-14 px-6">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h1 className={`text-6xl md:text-7xl font-black tracking-tighter ${isDev ? "" : "font-serif"}`}>
            Coldiron
          </h1>
          <p className={`text-lg md:text-xl max-w-3xl mx-auto leading-relaxed ${isDev ? "text-slate-300" : "text-stone-600 font-serif"}`}>
            Coldiron is a rare American surname that means "cold iron." It is also the family name of{" "}
            <Link to="/" className={link}>Ocean Coldiron</Link> (Brandon Coldiron), an AI engineer, state highpointer,
            full-time RV traveler, and the creator behind Ocean Outdoors. This page covers where the Coldiron name comes
            from, who Ocean is, and where to find him online.
          </p>
        </div>
      </header>

      <main className={`py-16 px-6 ${isDev ? "bg-slate-900/30 border-y border-slate-800" : "bg-stone-100 border-y border-stone-200"}`}>
        <div className="max-w-4xl mx-auto grid gap-6">

          <section className={card}>
            <h2 className="text-2xl font-bold mb-4">What the name Coldiron means</h2>
            <div className={body}>
              <p>
                Coldiron is an Americanized, translated form of the German surname Kalteisen. In Middle High German,
                kalt means "cold" and isen means "iron," and the name is generally read as an occupational name for a
                blacksmith, someone who worked iron.{" "}
                <a className={link} href="https://www.ancestry.com/last-name-meaning/coldiron" target="_blank" rel="noreferrer">(Ancestry)</a>
              </p>
              <p>
                "Cold iron" also has a life of its own in English. Folklore held that cold iron could repel fairies,
                ghosts, and other supernatural visitors, which is why horseshoes ended up nailed over doors, and Rudyard
                Kipling titled a 1910 poem "Cold Iron."{" "}
                <a className={link} href="https://en.wikipedia.org/wiki/Cold_iron" target="_blank" rel="noreferrer">(Wikipedia)</a>
              </p>
            </div>
          </section>

          <section className={card}>
            <h2 className="text-2xl font-bold mb-4">Where the Coldiron family comes from</h2>
            <div className={body}>
              <p>
                Family historians trace most American Coldirons to one immigrant: Johan Georg Kalteisen, born in 1730
                near Goppingen in Wurttemberg, Germany. He sailed into Philadelphia aboard the ship Phoenix on August 28,
                1750, settled in Berks County, Pennsylvania, and by about 1768 had moved his family to Rowan County, North
                Carolina, where tax and census records began calling him George Coldiron. He died there in 1805.{" "}
                <a className={link} href="https://www.rootsweb.com/~kyharlan/The_Coldiron_Family_In_America.html" target="_blank" rel="noreferrer">(The Coldiron Family in America)</a>
              </p>
              <p>
                His son Conrad and Conrad's sons carried the name west. Branches took root in Ashe County, North Carolina,
                in Lee County, Virginia, and especially in Harlan County, Kentucky. By 1840, Kentucky held the largest share of Coldiron
                households in the United States. In the 1940 census, the most common jobs listed for Coldirons were
                farmer and seamstress.
              </p>
              <p>
                Researchers who have followed the family for more than three decades report that every Coldiron line
                they have traced leads back to Johan Georg. In 1831 his grandson George Coldiron, Conrad's oldest
                son, moved his family to Newton County, Missouri, and is believed to be the first Coldiron to settle
                west of the Mississippi River. Today Coldirons live all over the country, but Harlan County is still the
                place most of the family stories point back to.
              </p>
              <p>
                The family left its mark on the map too. <strong>Coldiron, Kentucky</strong> is a small community in
                Harlan County on the Cumberland River, about 10 miles west of Harlan, named for the local Coldiron family.
                It had 222 residents in the 2020 census.{" "}
                <a className={link} href="https://en.wikipedia.org/wiki/Coldiron,_Kentucky" target="_blank" rel="noreferrer">(Wikipedia)</a>
              </p>
            </div>
          </section>

          <section className={card}>
            <div className="flex flex-col sm:flex-row gap-6 items-start">
              <img src={headshot} alt="Ocean Coldiron" width={112} height={112} className="w-28 h-28 rounded-full object-cover flex-shrink-0" />
              <div>
                <h2 className="text-2xl font-bold mb-4">Ocean Coldiron</h2>
                <div className={body}>
                  <p>
                    Ocean Coldiron, whose legal name is Brandon Coldiron, is a Senior Sustaining and Forward Deployed
                    Engineer at Abacus Insights, the AI and data platform for health plans, starting in November 2026.
                    Before that he spent more than five years at ModMed, from June 2021 to November 2026, first as a
                    senior integration and escalation engineer for HL7, Mirth Connect, and data pipelines across 200+
                    enterprise clients, then as a Forward Deployed AI Engineer building agentic workflows with Claude
                    Code, MCP, Databricks, FastAPI, and RAG. He has more than 15 years in production systems, going back
                    to executive support at Cerner.
                  </p>
                  <p>
                    He grew up in the cornfields outside Chicago, earned a B.S. in Informatics from Indiana University
                    Bloomington and an MBA from Colorado State University, and holds the PMP certification. He also
                    founded <a className={link} href="https://summitridgedigital.com" target="_blank" rel="noreferrer">Summit Ridge Digital</a>,
                    a web design and hosting business for small businesses, and built EZPostScheduler, an AI caption and
                    cross-posting tool. Earlier ventures include RC Lawn and Tree and Coldiron Auto Transport.
                  </p>
                  <p>
                    Off the clock, Ocean lives full time in an RV and chases big outdoor goals. He has stood on the
                    highest point of all 48 contiguous U.S. states, so he is at 48 of 50, with Denali in Alaska and Mauna
                    Kea in Hawaii still ahead. He plans to take on Denali and the Seven Summits around 2032. He also ran
                    the 2025 Las Vegas Marathon and talked about highpointing, mountains, and life on the road as the
                    guest on{" "}
                    <a className={link} href="https://www.buzzsprout.com/2124936/episodes/20075602-episode-81-ocean-coldiron-nomad-adventurer-highpointer" target="_blank" rel="noreferrer">
                      Episode 81 of Trail Talk: Highpointing Podcast
                    </a>.
                  </p>
                  <p>
                    The high point list runs from Mount Whitney in California, climbed in July 2023, through peaks like
                    Borah Peak in Idaho, Granite Peak in Montana, and Mount Katahdin in Maine, to White Butte in North
                    Dakota, which finished the lower 48 in July 2026. One stop had a family connection: Black Mountain,
                    Kentucky's highest point at 4,139 feet, sits in Harlan County, the same county where the Coldiron
                    name took root two centuries ago. He stood on top of it in May 2025. The full list, with dates and
                    photos, is on the{" "}
                    <a className={link} href="/oceansoutdoors/high-points/">state high points page</a>.
                  </p>
                  <p>
                    His outdoor stories reach a wide audience through Ocean Outdoors, a YouTube channel with more than
                    100,000 subscribers, plus Facebook, Instagram, TikTok, and the{" "}
                    <a className={link} href="/oceansoutdoors/">Ocean Outdoors photo stories</a> here on this site.
                    The brand was previously called Brandon Coldiron Outdoors.
                  </p>
                  <p>
                    <Link to="/" className={link}>See Ocean's work, case studies, and resume on the home page</Link>.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className={card}>
            <h2 className="text-2xl font-bold mb-4">Find Ocean Coldiron online</h2>
            <ul className={`grid sm:grid-cols-2 gap-3 ${isDev ? "text-slate-300" : "text-stone-700"}`}>
              <li>
                <Link to="/" className={`${link} inline-flex items-center gap-2`}>
                  <Terminal size={18} /> oceancoldiron.com (home, work, resume)
                </Link>
              </li>
              <li>
                <a href="/oceansoutdoors/" className={`${link} inline-flex items-center gap-2`}>
                  <Tent size={18} /> Ocean Outdoors photo stories
                </a>
              </li>
              {PROFILES.map(({ label, href, icon: Icon }) => (
                <li key={href}>
                  <a href={href} target="_blank" rel="noreferrer me" className={`${link} inline-flex items-center gap-2`}>
                    <Icon size={18} /> {label}
                  </a>
                </li>
              ))}
            </ul>
          </section>

          {LATEST_STORIES.length > 0 && (
            <section className={card}>
              <h2 className="text-2xl font-bold mb-4">Latest from Ocean Outdoors</h2>
              <ul className={`space-y-2 ${isDev ? "text-slate-300" : "text-stone-700"}`}>
                {LATEST_STORIES.map((s) => (
                  <li key={s.link}>
                    <a className={link} href={s.link.replace("https://oceancoldiron.com", "")}>{s.title}</a>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-sm opacity-70">
                <a className={link} href="/oceansoutdoors/">All stories</a>
                {" · "}
                <a className={link} href="/oceansoutdoors/high-points/">State high points</a>
              </p>
            </section>
          )}

          <section className={card}>
            <h2 className="text-2xl font-bold mb-4">Looking for a different Coldiron?</h2>
            <div className={body}>
              <p>
                Plenty of people and places share the name. If you were searching for the Harlan County community, see{" "}
                <a className={link} href="https://en.wikipedia.org/wiki/Coldiron,_Kentucky" target="_blank" rel="noreferrer">Coldiron, Kentucky</a>.
                For family history, the{" "}
                <a className={link} href="https://www.ancestry.com/last-name-meaning/coldiron" target="_blank" rel="noreferrer">Ancestry surname page</a>{" "}
                and the{" "}
                <a className={link} href="https://www.rootsweb.com/~kyharlan/The_Coldiron_Family_In_America.html" target="_blank" rel="noreferrer">Coldiron Family in America</a>{" "}
                history are good starting points. ColdIron Companies, the Oklahoma truck transport business, is at{" "}
                <a className={link} href="https://coldironcompanies.com/" target="_blank" rel="noreferrer">coldironcompanies.com</a>.
                This site is Ocean Coldiron's personal site and is not affiliated with them.
              </p>
            </div>
          </section>
        </div>
      </main>

      <footer className={`py-12 text-center text-sm opacity-70 ${isDev ? "bg-[#0a0f1e] text-slate-500" : "bg-stone-200 text-stone-600"}`}>
        <p className="mb-2">
          © {new Date().getFullYear()} Ocean Coldiron (Brandon Coldiron) ·{" "}
          <Link to="/" className="underline-offset-4 hover:underline">Home</Link>
          {" · "}
          <a href="/oceansoutdoors/" className="underline-offset-4 hover:underline">Ocean Outdoors stories</a>
        </p>
        <p className="text-xs">Built with Go, React, & Tailwind.</p>
      </footer>
    </div>
  )
}

export default Coldiron
