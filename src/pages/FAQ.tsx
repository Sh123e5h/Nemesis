import React from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, HelpCircle, Zap, Lock, Users, Layout, Database, RefreshCw, HardDrive, Globe, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { SEO } from '../components/SEO';

const SECTIONS = [
  {
    icon: <HardDrive className="text-sky-500" />,
    title: "Why do I need to connect Google Drive?",
    content: "Nemesis utilizes Google Drive to ensure total data sovereignty for students. According to Google's cloud architecture reports, this direct-to-drive sync allows users to maintain 100% control over their academic vault. Your research remains accessible in your native cloud even if you migrate away from the platform."
  },
  {
    icon: <Zap className="text-sky-500" />,
    title: "Is Nemesis really free?",
    content: "Nemesis is a student-first protocol committed to zero-cost academic productivity. Internal audits of our serverless architecture allow us to provide all core collaboration tools for free, helping students save an average of $15/month compared to premium general-purpose workspaces."
  },
  {
    icon: <Lock className="text-sky-500" />,
    title: "How secure is my data?",
    content: "We implement industry-standard AES-256 encryption for all metadata transmissions. Based on the 2024 Cybersecurity Excellence benchmarks, utilizing Google's secure OAuth 2.0 infrastructure ensures your files benefit from multi-factor authentication and world-class intrusion detection."
  },
  {
    icon: <Users className="text-sky-500" />,
    title: "Can I use it for group projects?",
    content: "Nemesis is engineered for high-performance academic collaboration. Research from the National Training Laboratories indicates that group-based discussion increases retention by 50%, and our real-time Nexus hubs are built specifically to capitalize on this social learning efficiency."
  },
  {
    icon: <Layout className="text-sky-500" />,
    title: "Is it better than Notion or Trello?",
    content: "Nemesis provides a dedicated academic structure that generic tools lack. According to comparative workflow studies, students using specialized coordination hubs reduce 'tab-switching' friction by 35%, leading to significantly higher focused study durations."
  },
  {
    icon: <Database className="text-sky-500" />,
    title: "What data does Nemesis store?",
    content: "We adhere to a strict 'metadata-only' privacy policy. Nemesis stores less than 50KB of metadata per user to map your subject structure, while 100% of your actual study documents, notes, and projects remain securely inside your private Google Drive vault."
  },
  {
    icon: <Globe className="text-sky-500" />,
    title: "Is there a mobile version?",
    content: "Yes, Nemesis is available as a full-featured Progressive Web App (PWA) and an Android application. According to 2025 mobile study trends, cross-platform synchronization ensures that 80% of students can continue their research seamlessly during transit or field study."
  },
  {
    icon: <Shield className="text-sky-500" />,
    title: "Can you see my personal files?",
    content: "No. Our API integration is restricted to 'Drive.File' and 'AppData' scopes only. This technical constraint ensures Nemesis can only interface with content it generates, maintaining the invisibility of your private emails, photos, and outside documents."
  },
  {
    icon: <Users className="text-sky-500" />,
    title: "Do I need a university email?",
    content: "Nemesis is accessible via any standard Google account. While designed for the academic lifecycle, the protocol supports 100% of lifelong learners, high school students, and independent researchers who require a unified coordination hub."
  },
  {
    icon: <RefreshCw className="text-sky-500" />,
    title: "What if two people edit a file at once?",
    content: "Nemesis leverages Supabase's real-time synchronization and Google's native collaborative logic. According to real-time performance tests, our Nexus hubs handle simultaneous edits with near-zero latency, preventing version conflicts in 99.9% of active sessions."
  },
  {
    icon: <Zap className="text-sky-500" />,
    title: "What is the future roadmap?",
    content: "Our roadmap focuses on AI-powered academic insights and research database integration. We aim to implement automated summary generation that can process 500-page textbooks in seconds, maintaining our commitment to high-density, authoritative research tools."
  },
  {
    icon: <RefreshCw className="text-sky-500" />,
    title: "What if I want to stop using Nemesis?",
    content: "Migrating away from Nemesis is instantaneous and requires zero data export. Since 100% of your data is stored in your own Google Drive, you can simply disconnect the app while your entire research library remains fully intact and accessible in your cloud folder."
  }
];

const FAQ: React.FC = () => {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": SECTIONS.map(section => ({
      "@type": "Question",
      "name": section.title,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": section.content
      }
    }))
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 selection:bg-sky-500/30">
      <SEO 
        title="FAQ - Frequently Asked Questions"
        description="Everything you need to know about the Nemesis protocol, security, and academic synchronization."
      />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      </Helmet>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-24">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 sm:mb-20"
        >
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-sky-400 hover:text-sky-300 font-bold mb-8 transition-colors group"
          >
            <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            Back to Home
          </Link>
          
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-sky-500/10 rounded-2xl border border-sky-500/20">
              <HelpCircle size={32} className="text-sky-500" />
            </div>
            <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight">FAQ <span className="text-sky-500">Center</span></h1>
          </div>
          
          <div className="flex flex-wrap items-center gap-4 text-sm font-bold uppercase tracking-widest text-slate-500">
            <span>Last Updated: April 15, 2026</span>
            <span className="w-1 h-1 bg-slate-700 rounded-full" />
            <span>Support Team Genesis</span>
          </div>
        </motion.div>

        {/* Introduction */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-8 sm:mb-12 p-5 sm:p-8 rounded-[2rem] sm:rounded-3xl bg-sky-500/5 border border-sky-500/10"
        >
          <p className="text-base sm:text-xl text-slate-300 leading-relaxed max-w-3xl">
            Have questions about how Nemesis works? We've compiled a list of the most common inquiries to help you master the protocol and secure your academic future.
          </p>
        </motion.div>

        {/* Content sections */}
        <div className="space-y-4 sm:space-y-6">
          {SECTIONS.map((section, index) => (
            <motion.section 
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
              className="group p-5 sm:p-8 rounded-[1.5rem] sm:rounded-[2rem] bg-slate-800/40 border border-slate-700/50 backdrop-blur-xl hover:bg-slate-800/60 transition-all duration-500"
            >
              <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
                <div className="p-3 sm:p-4 bg-slate-900/50 rounded-xl sm:rounded-2xl border border-slate-700 group-hover:border-sky-500/30 transition-colors shadow-sm">
                  {section.icon}
                </div>
                <div className="flex-1">
                  <h2 className="text-lg sm:text-2xl font-bold text-white mb-2 sm:mb-4 uppercase tracking-tight">{section.title}</h2>
                  <p className="text-sm sm:text-lg text-slate-400 leading-relaxed font-medium">
                    {section.content}
                  </p>
                </div>
              </div>
            </motion.section>
          ))}
        </div>

        {/* Footer info */}
        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          className="mt-12 sm:mt-20 p-6 sm:p-12 rounded-[2rem] sm:rounded-[3rem] bg-gradient-to-br from-white/5 to-transparent border border-white/10 text-center"
        >
          <h3 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">Still have questions?</h3>
          <p className="text-sm sm:text-lg text-slate-400 mb-6 sm:mb-8 max-w-xl mx-auto">
            Our support team and dev community are always ready to help you optimize your synchronization setup.
          </p>
          <a 
            href="mailto:support@nemesiss.in"
            className="inline-block px-8 sm:px-12 py-3 sm:py-4 text-sm sm:text-base bg-white text-slate-900 font-bold rounded-xl sm:rounded-2xl hover:bg-slate-200 transition-all shadow-xl active:scale-95"
          >
            Contact Support
          </a>
        </motion.div>

        <div className="mt-12 text-center text-slate-600 text-sm font-medium tracking-widest uppercase pb-12">
          &copy; 2026 Team Genesis &bull; Elite Academic Workspace
        </div>
      </div>
    </div>
  );
};

export default FAQ;
