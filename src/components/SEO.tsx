import { useState, useEffect, type FC } from 'react';
import { useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '../lib/supabase';

const BRAND_NAME = 'Nemesis';
let DEFAULT_TITLE = 'Nemesis | Academic Platform';
let DEFAULT_DESCRIPTION = 'Nemesis is a unified academic ecosystem where students sync materials, collaborate in real-time groups, and optimize their study workflow with precision tools.';

// For the homepage, use just the brand name as the title (no suffix)
// HOMEPAGE_TITLE unused - cleaning up for SEO performance

/**
 * ✅ BING WEBMASTER GUIDELINES COMPLIANCE
 * 
 * Public pages: These are the ONLY pages Google & Bing should index.
 * - Eligible for grounding results and Copilot citations
 * - Allow indexing, snippets, and content archiving (no NOARCHIVE/NOCACHE)
 * - Include rich structured data for better grounding accuracy
 * 
 * All other routes: auth-gated, alias-redirects, splash rendered as noindex.
 * - Prevents duplicate content issues
 * - Reduces crawl waste (Guideline #21)
 * - Improves indexing of priority content
 */
const PUBLIC_ROUTES = new Set([
  '/',
  '/welcome',
  '/login',
  '/signup',
  '/signup/username',
  '/forgot-password',
  '/reset-password',
  '/terms',
  '/privacy',
  '/dev-team',
]);

const SEO_CONFIG: Record<string, { title: string; description?: string; image?: string }> = {
  '/': { 
    title: 'Nemesis | Your Unified Academic Coordination Hub', 
    description: 'Nemesis is the elite academic coordination hub for modern students. Synchronize study materials with Google Drive, collaborate in real-time groups, and manage your academic journey with precision.' 
  },
  '/welcome': { 
    title: 'Academic Orientation - Nemesis | Get Started', 
    description: 'Embark on your academic journey with the primary Nemesis orientation protocol.' 
  },
  '/login': { 
    title: 'Secure Access - Nemesis | Unified Login Hub', 
    description: 'Securely access your personal study hub and high-performance research tools.' 
  },
  '/signup': { 
    title: 'Create Account - Nemesis | Join the Academic Nexus', 
    description: 'Register to unlock zero-latency collaboration and AI-driven study coordination.' 
  },
  '/forgot-password': { 
    title: 'Account Recovery - Nemesis | Secure Password Reset', 
    description: 'Securely recover your account credentials via our high-integrity recovery bridge.' 
  },
  '/terms': { 
    title: 'Terms of Service - Nemesis | Governance Standards', 
    description: 'Detailed standards governing elite usage and coordination on the Nemesis network.' 
  },
  '/privacy': { 
    title: 'Privacy Policy - Nemesis | Data Sovereignty Protocol', 
    description: 'Maintaining total structural encryption and private research silos for every member.' 
  },
  '/dev-team': { 
    title: 'Meet the Architects - Nemesis | Team Genesis', 
    description: 'Meet the visionary team behind the Nemesis core and future academic intelligence.',
    image: 'https://nemesiss.in/shireesh.webp' 
  },
  // Private routes — titles used in document tab only, never indexed
  '/home':            { title: 'Dashboard' },
  '/organizer':       { title: 'Library' },
  '/planner':         { title: 'Planner' },
  '/groups':          { title: 'Groups' },
  '/settings':        { title: 'Settings' },
  '/profile':         { title: 'Profile' },
  '/search':          { title: 'Search' },
  '/notifications':   { title: 'Notifications' },
  '/messages':        { title: 'Messages' },
  '/admin':           { title: 'Admin' },
  '/admin/dashboard': { title: 'Admin Dashboard' },
  '/admin/users':     { title: 'Manage Users' },
};

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
}

/**
 * - Public routes: index, follow + full Open Graph + canonical
 * - Protected / redirect routes: noindex, nofollow (no canonical to avoid signalling)
 */
export const SEO: FC<SEOProps> = ({ title, description, keywords }) => {
  const location = useLocation();
  const [dynamicConfig, setDynamicConfig] = useState<any>(null);

  // 🛰️ DISCOVERY: Fetch neural search configuration on initial uplink
  useEffect(() => {
    const fetchSEO = async () => {
      try {
        const { data } = await supabase.from('system_settings').select('value').eq('key', 'seo_analytics_config').single();
        if (data?.value) {
          setDynamicConfig(data.value);
          if (data.value.global_meta?.title) DEFAULT_TITLE = data.value.global_meta.title;
          if (data.value.global_meta?.description) DEFAULT_DESCRIPTION = data.value.global_meta.description;
        }
      } catch {
        console.warn('SEO Sync: Using fallback static protocol.');
      }
    };
    fetchSEO();
  }, []);

  // Normalize path: lowercase and remove trailing slash (except for root)
  const rawPath = location.pathname;
  const path = rawPath === '/' ? '/' : rawPath.replace(/\/$/, '').toLowerCase();
  
  const isPublic = PUBLIC_ROUTES.has(path);

  // Config lookup — admin paths collapse to /admin entry
  const config = SEO_CONFIG[path] || (path.startsWith('/admin') ? SEO_CONFIG['/admin'] : null);

  const pageTitle = title || config?.title;
  // Metadata Engine:
  // 1. Homepage: Uses the full config title ('Nemesis | Academic Platform') directly.
  // 2. Sub-pages: If the provided title already contains our brand (e.g., 'Login | Nemesis'), 
  //    we use it as is to prevent the Helmet template from double-branding it.
  // 3. Defaults: If only a bare name is provided (e.g., 'Explorer'), the Helmet template 
  //    automatically appends '| Nemesis'.
  const finalTitle = path === '/' 
    ? (config?.title || `${BRAND_NAME} | Academic Platform`) 
    : (pageTitle?.includes(BRAND_NAME) ? pageTitle : (pageTitle || DEFAULT_TITLE));
  const finalDescription = description || config?.description || DEFAULT_DESCRIPTION;
  const dbKeywords = dynamicConfig?.keyword_monitor?.map((k: any) => k.keyword).join(', ') || '';
  const finalKeywords = keywords || dbKeywords || 'academic collaboration, study platform, student productivity, google drive sync, group study, study planner';
  const finalImage = config?.image || dynamicConfig?.social_share?.og_default_image || 'https://hzostigkcsursgbbqudn.supabase.co/storage/v1/object/public/system-assets/og-preview.png';

  // Canonical URL Logic:
  // 1. Root (/) is the primary homepage — canonical is itself
  // 2. Public pages have self-referencing canonicals
  // 3. Other pages (protected) should not signal a canonical to avoid signalling)
  const canonicalUrl = `https://nemesiss.in${path === '/' ? '/' : path}`;

  // ─── STRUCTURED DATA ─────────────────────────────────────────────────────────
  // WebSite schema: tells Google this is the authoritative homepage and enables
  // the Sitelinks Search Box (the feature that shows one big result with links
  // beneath it, just like Instagram/YouTube).
  // ✅ GOOGLE SERP SITELINKS OPTIMIZATION: This schema enables the prominent
  //    "Nemesis | Academic Platform" card with sitelinks beneath in Google search
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    // @id creates a named node that WebPage.isPartOf can reference,
    // forming a graph that tells Google the site hierarchy clearly.
    "@id": "https://nemesiss.in/#website",
    "name": "Nemesis",
    "alternateName": "Nemesis Academic Platform",
    "url": "https://nemesiss.in/",
    "description": "Nemesis is the unified academic coordination hub for modern students. Sync materials with Google Drive, collaborate in real-time groups, and manage your academic journey with precision.",
    "inLanguage": "en-US",
    "isAccessibleForFree": true,
    "potentialAction": [
      {
        "@type": "SearchAction",
        "target": {
          "@type": "EntryPoint",
          "urlTemplate": "https://nemesiss.in/search?q={search_term_string}"
        },
        "query-input": "required name=search_term_string"
      }
    ]
  };

  // Organization schema: tells Google who owns the site — feeds the 'About the source' panel
  // and enables brand/knowledge panel features in SERP
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Nemesis",
    "alternateName": "Nemesis Academic Platform",
    "url": "https://nemesiss.in/",
    "logo": {
      "@type": "ImageObject",
      "url": "https://nemesiss.in/icon-512.png",
      "width": 512,
      "height": 512
    },
    "image": "https://nemesiss.in/icon-512.png",
    "description": "Nemesis is a high-performance academic collaboration and study platform for modern students. Sync notes, collaborate in groups, plan your schedule, and succeed together.",
    "foundingDate": "2025",
    "foundingLocation": {
      "@type": "Place",
      "name": "India"
    },
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "customer support",
      "url": "https://nemesiss.in/dev-team"
    },
    "sameAs": [
      "https://github.com/Sh123e5h",
      "https://www.instagram.com/shiresh.kashyap/"
    ],
    "founders": [
      {
        "@type": "Person",
        "name": "Shireesh Kashyap",
        "jobTitle": "Lead Architect & Co-Founder",
        "url": "https://nemesiss.in/dev-team",
        "sameAs": ["https://github.com/Sh123e5h", "https://www.instagram.com/shiresh.kashyap/"]
      },
      {
        "@type": "Person",
        "name": "Shashwat Patel",
        "jobTitle": "QA Lead & Co-Founder",
        "url": "https://nemesiss.in/dev-team",
        "sameAs": ["https://www.instagram.com/shashwat.01__/"]
      },
      {
        "@type": "Person",
        "name": "Shivam Kumar",
        "jobTitle": "Strategic Advisor",
        "url": "https://nemesiss.in/dev-team"
      }
    ],
    "knowsAbout": ["Academic Collaboration", "Student Productivity", "Study Planning", "Group Learning"],
    "audience": {
      "@type": "Audience",
      "audienceType": "Students"
    }
  };

  // ✅ FAQPage SCHEMA: Strategic for GEO grounding. 
  // Based on the landing page's 'How it Works' and 'Transparency' sections.
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "What is Nemesis?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Nemesis is a high-performance academic coordination hub designed to unify study materials with Google Drive, enable real-time group collaboration, and manage academic workflows through a single Nexus."
        }
      },
      {
        "@type": "Question",
        "name": "How does Nemesis handle my academic data and privacy?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Nemesis prioritizes data sovereignty. Your files live directly in your personal Google Drive and never pass through Nemesis servers. We use restricted drive.file scopes, meaning we can only access files created by the application."
        }
      },
      {
        "@type": "Question",
        "name": "Is Nemesis free to use for students?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes, Nemesis is free for every student globally. Our mission is to provide elite academic software without cost barriers, supported entirely by voluntary contributions."
        }
      },
      {
        "@type": "Question",
        "name": "Can I use Nemesis offline?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes, Nemesis supports offline access to your study materials and tasks, synchronizing automatically across devices once you're back online."
        }
      },
      {
        "@type": "Question",
        "name": "Does Nemesis support group study projects?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Nemesis features Synchronized Groups where you can chat, share files, and collaborate on whiteboards in a dedicated space built for academic goals."
        }
      }
    ]
  };

  // ⚡ SPA PAGE VIEW: Report route changes to Google Analytics.
  // NOTE: gtag script injection is handled ONLY by main.tsx (deferred 3s after idle).
  // We must NOT inject the script here — doing so creates duplicate pageview events.
  useEffect(() => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'page_view', {
        page_location: window.location.href,
        page_path: path,
        page_title: finalTitle
      });
    }
  }, [path, finalTitle]);

  if (!isPublic) {
    // Private / protected / redirect pages — instruct crawlers to ignore entirely
    return (
      <Helmet
        defaultTitle={DEFAULT_TITLE}
        titleTemplate={`%s | ${BRAND_NAME}`}
      >
        <title>{finalTitle}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
    );
  }
  // 🛠️ ELITE SCHEMA LAYER
  // (FAQ Schema Eradicated intentionally to prevent Search Console validation errors)

  return (
    <Helmet
      defaultTitle={BRAND_NAME}
      titleTemplate={path === '/' || finalTitle?.includes(BRAND_NAME) ? '%s' : `%s | ${BRAND_NAME}`}
    >
      <title>{finalTitle}</title>
      <meta name="description" content={finalDescription} />
      {finalKeywords && <meta name="keywords" content={finalKeywords} />}
      
      {/* ✅ SEO ROBOTS DIRECTIVE (Bing Guideline #10 + Google Best Practices)
          - index, follow: Allow both Bing and Google to discover and crawl
          - max-image-preview:large: Support rich search result previews
          - max-snippet:-1: Unlimited snippet length for better context
          - max-video-preview:-1: Unlimited video preview (future support)
          - NO NOARCHIVE: Allows Copilot & Googlebot to cache content
          - NO NOCACHE: Allows rich citations with full context depth
      */}
      <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      
      {/* ✅ GOOGLE-SPECIFIC CRAWL DIRECTIVES
          - Googlebot gets same directives as main robots
          - Ensures consistent behavior across Google's crawlers
      */}
      <meta name="googlebot" content="index, follow, max-image-preview:large, max-snippet:-1" />
      <meta name="googlebot-news" content="index, follow" />
      
      {/* ✅ BING-SPECIFIC SEARCH ENGINE DIRECTIVES (Guideline #2 + #10) */}
      <meta name="bingbot" content="index, follow, max-image-preview:large, max-snippet:-1" />

      {/* Canonical URL (Bing Guideline #6: Consolidate Duplicates) */}
      <link rel="canonical" href={canonicalUrl} />

      {/* Favicon & Touch Icons: Prioritizing 48px square for Google SERP support */}
      <link rel="icon" type="image/png" sizes="48x48" href="/favicon-48x48.png" />
      <link rel="icon" type="image/png" sizes="96x96" href="/favicon-96x96.png" />
      <link rel="icon" type="image/x-icon" href="/favicon.ico" />
      <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
      <link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png" />
      <link rel="icon" type="image/svg+xml" href="/logo.svg" />
      <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

      {/* WebSite + Organization Schema — enables Google Sitelinks */}
      <script type="application/ld+json">{JSON.stringify(websiteSchema)}</script>
      <script type="application/ld+json">{JSON.stringify(organizationSchema)}</script>
      
      {/* FAQPage Schema — Essential for GEO grounding and Rich Results */}
      {path === '/' && (
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      )}

      {/* WebPage schema — explicitly declares canonicalURL for THIS page.
          This is critical for fixing the Google breadcrumb showing '› home'
          instead of the root domain. The @id + isPartOf signal is what
          Google uses to determine the breadcrumb path in SERP results. */}
      <script type="application/ld+json">{JSON.stringify({
        "@context": "https://schema.org",
        "@type": "WebPage",
        "@id": canonicalUrl,
        "url": canonicalUrl,
        "name": finalTitle,
        "description": finalDescription,
        "inLanguage": "en-US",
        "isPartOf": {
          "@type": "WebSite",
          "@id": "https://nemesiss.in/#website",
          "url": "https://nemesiss.in/"
        },
        "about": {
          "@type": "Thing",
          "name": "Nemesis Academic Platform"
        },
        ...(path === '/' ? {
          "speakable": {
            "@type": "SpeakableSpecification",
            "cssSelector": ["h1", ".splash-text"]
          }
        } : {}),
        "breadcrumb": path !== '/' ? {
          "@type": "BreadcrumbList",
          "@id": `${canonicalUrl}#breadcrumb`,
          "itemListElement": [
            { "@type": "ListItem", "position": 1, "item": { "@id": "https://nemesiss.in/", "name": "Home" } },
            { "@type": "ListItem", "position": 2, "item": { "@id": canonicalUrl, "name": config?.title || finalTitle } }
          ]
        } : undefined
      })}</script>

      {/* SoftwareApplication schema — homepage only, no fabricated ratings */}
      {path === '/' && (
        <script type="application/ld+json">{
          JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "Nemesis",
            "operatingSystem": "Web, iOS, Android, Windows, macOS",
            "applicationCategory": "EducationalApplication",
            "applicationSubCategory": "Academic Coordination & Collaboration Hub",
            "description": "High-performance academic collaboration and study platform for modern students. Sync notes, collaborate in groups, and optimize study workflows.",
            "featureList": [
              "Real-time Academic Sync",
              "Collaborative Study Groups",
              "Task Planning & Planner",
              "Material Library & Organizer",
              "Secure Messaging & Groups"
            ],
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "USD"
            },
            "author": {
              "@type": "Organization",
              "name": "Genesis Development Team",
              "url": "https://nemesiss.in/dev-team"
            }
          })
        }</script>
      )}

            {/* ✅ SITELINKS OPTIMIZATION: Explicit SiteNavigationElement Schema */}
      {path === '/' && (
        <script type="application/ld+json">{
          JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            "name": "Nemesis Primary Navigation",
            "itemListElement": [
              {
                "@type": "SiteNavigationElement",
                "position": 1,
                "name": "Welcome",
                "description": "Embark on your academic journey with the primary Nemesis orientation protocol.",
                "url": "https://nemesiss.in/welcome"
              },
              {
                "@type": "SiteNavigationElement",
                "position": 2,
                "name": "Login",
                "description": "Securely access your personal study hub and high-performance research tools.",
                "url": "https://nemesiss.in/login"
              },
              {
                "@type": "SiteNavigationElement",
                "position": 3,
                "name": "Sign Up",
                "description": "Register to unlock zero-latency collaboration and AI-driven study coordination.",
                "url": "https://nemesiss.in/signup"
              },
              {
                "@type": "SiteNavigationElement",
                "position": 4,
                "name": "Dev Team",
                "description": "Meet the visionary team behind the Nemesis core and future academic intelligence.",
                "url": "https://nemesiss.in/dev-team"
              },
              {
                "@type": "SiteNavigationElement",
                "position": 5,
                "name": "Terms and Conditions",
                "description": "Detailed standards governing elite usage and coordination on the Nemesis network.",
                "url": "https://nemesiss.in/terms"
              },
              {
                "@type": "SiteNavigationElement",
                "position": 6,
                "name": "Privacy Policy",
                "description": "Maintaining total structural encryption and private research silos for every member.",
                "url": "https://nemesiss.in/privacy"
              },
              {
                "@type": "SiteNavigationElement",
                "position": 7,
                "name": "Forget Password",
                "description": "Securely recover your account credentials via our high-integrity recovery bridge.",
                "url": "https://nemesiss.in/forgot-password"
              }
            ]
          })
        }</script>
      )}

      {/* NOTE: BreadcrumbList is already embedded inside the WebPage schema above
          (as WebPage.breadcrumb). We do NOT emit a second standalone BreadcrumbList
          script — having two BreadcrumbList schemas for the same URL causes Google's
          Rich Results Test to flag a conflict and ignore both. */}

      {/* Mobile / iOS Native Hardening */}
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      <meta name="apple-mobile-web-app-title" content={BRAND_NAME} />
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="format-detection" content="telephone=no" />
      <meta name="theme-color" content="#ffffff" />

      {/* OpenGraph (Facebook / Instagram / WhatsApp / Google Preview) — supports social sharing + SERP preview */}
      <meta property="og:title" content={finalTitle} />
      <meta property="og:description" content={finalDescription} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={BRAND_NAME} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={finalImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content="Nemesis — The Ultimate Academic Platform" />
      <meta property="og:locale" content="en_IN" />
      
      {/* ✅ ALTERNATE LANGUAGE / LOCALE for International SERP (when expanding)
          Omitted if only one language version exists. Extend this when adding locales.
      */}
      {/* <link rel="alternate" hrefLang="en" href={`https://nemesiss.in${path}`} /> */}

      {/* Twitter / X Cards — ✅ TWITTER SERP ENHANCEMENT */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={finalTitle} />
      <meta name="twitter:description" content={finalDescription} />
      <meta name="twitter:image" content={finalImage} />
      
      {/* ✅ BING ENTITY MARKUP (Guideline #16: Define Entities Clearly)
          Helps Bing disambiguate brand mentions and identify canonical entity references.
          This improves grounding visibility for brand-related queries.
      */}
      <meta name="entity" content="Nemesis" />

      {/* Neural Performance Hints */}
      <link rel="preconnect" href="https://hzostigkcsursgbbqudn.supabase.co" />
      <link rel="dns-prefetch" href="https://hzostigkcsursgbbqudn.supabase.co" />
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link rel="preconnect" href="https://api.qrserver.com" />
    </Helmet>
  );
};

export default SEO;
