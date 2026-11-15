// Structured data (JSON-LD) for oceancoldiron.com. Single source of truth,
// injected into the prerendered HTML by scripts/prerender-meta.mjs.
// Only list profiles that are verified to exist and belong to Ocean.
const SITE = 'https://oceancoldiron.com/'
export const PERSON_ID = SITE + '#person'
export const WEBSITE_ID = SITE + '#website'

export const SAME_AS = [
  'https://www.youtube.com/@OceansOutdoors',
  'https://www.facebook.com/OceansOutdoors',
  'https://www.instagram.com/oceansoutdoors/',
  'https://www.tiktok.com/@oceansoutdoors',
  'https://www.linkedin.com/in/brandon-coldiron/',
  'https://github.com/brcoldir',
  'https://www.buzzsprout.com/2124936/episodes/20075602-episode-81-ocean-coldiron-nomad-adventurer-highpointer',
  'https://collabstr.com/brandoncoldironoutdoors',
  'https://oceancoldiron.com/oceansoutdoors/',
]

export function graphFor(route, dateModified) {
  const website = {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    url: SITE,
    name: 'Ocean Coldiron',
    alternateName: ['Coldiron', 'Brandon Coldiron'],
    inLanguage: 'en-US',
    publisher: { '@id': PERSON_ID },
  }
  const person = {
    '@type': 'Person',
    '@id': PERSON_ID,
    name: 'Ocean Coldiron',
    givenName: 'Ocean',
    familyName: 'Coldiron',
    alternateName: ['Brandon Coldiron'],
    url: SITE,
    image: {
      '@type': 'ImageObject',
      '@id': SITE + '#headshot',
      url: SITE + 'ocean-coldiron.jpg',
      contentUrl: SITE + 'ocean-coldiron.jpg',
      width: 640,
      height: 640,
      caption: 'Ocean Coldiron',
    },
    jobTitle: 'Senior Sustaining and Forward Deployed Engineer',
    description:
      'Ocean Coldiron is an AI engineer at Abacus Insights, a state highpointer who has completed all 48 contiguous U.S. state high points, a full-time RV traveler, and the creator of the Ocean Outdoors YouTube channel.',
    worksFor: { '@type': 'Organization', name: 'Abacus Insights', url: 'https://www.abacusinsights.com' },
    alumniOf: [
      { '@type': 'CollegeOrUniversity', name: 'Indiana University Bloomington' },
      { '@type': 'CollegeOrUniversity', name: 'Colorado State University' },
    ],
    hasCredential: [
      { '@type': 'EducationalOccupationalCredential', name: 'Project Management Professional (PMP)' },
      { '@type': 'EducationalOccupationalCredential', name: 'Professional Scrum Product Owner I (PSPO I)' },
    ],
    knowsAbout: [
      'AI agents', 'Model Context Protocol', 'Retrieval-augmented generation', 'LLM evaluation',
      'Forward deployed engineering', 'HL7', 'FHIR', 'Mirth Connect', 'Healthcare interoperability',
      'Databricks', 'AWS', 'Python', 'Go', 'Highpointing', 'Mountaineering', 'Ultrarunning', 'RV living',
    ],
    sameAs: SAME_AS,
  }
  // Summit Ridge Digital, founded by Ocean. schema.org puts `founder` on the
  // Organization (Person has no founder-of property).
  const org = {
    '@type': 'Organization',
    '@id': 'https://summitridgedigital.com/#organization',
    name: 'Summit Ridge Digital',
    url: 'https://summitridgedigital.com',
    founder: { '@id': PERSON_ID },
  }
  const pageUrl = route === '/' ? SITE : SITE.replace(/\/$/, '') + route
  const page = {
    '@type': 'ProfilePage',
    '@id': pageUrl + '#profilepage',
    url: pageUrl,
    name: route === '/' ? 'Ocean Coldiron' : 'Coldiron',
    primaryImageOfPage: { '@id': SITE + '#headshot' },
    isPartOf: { '@id': WEBSITE_ID },
    mainEntity: { '@id': PERSON_ID },
    dateModified,
  }
  if (route === '/coldiron') {
    page.about = [
      { '@id': PERSON_ID },
      { '@type': 'Thing', name: 'Coldiron (surname)', sameAs: 'https://www.wikidata.org/wiki/Q37228481' },
    ]
  }
  return { '@context': 'https://schema.org', '@graph': [website, page, person, org] }
}
