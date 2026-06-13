import React from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Scale, ShieldCheck, UserCheck, Gavel, AlertCircle, HelpCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SEO } from '../components/SEO';

const SECTIONS = [
  {
    icon: <Gavel className="text-sky-500" />,
    title: "1. Acceptance of Terms",
    content: `By accessing or using the Nemesis platform ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not access or use the Service. These Terms apply to all visitors, users, and others who access or use the Service. We reserve the right to update or change our Terms at any time and you should check these Terms periodically.`
  },
  {
    icon: <UserCheck className="text-sky-500" />,
    title: "2. User Accounts & Registration",
    content: `To access most features of the Service, you must register for an account. You agree to provide accurate, current, and complete information during the registration process and to update such information to keep it accurate, current, and complete. You are responsible for safeguarding your password and for any activities or actions under your account. You must notify us immediately upon becoming aware of any breach of security or unauthorized use of your account.`
  },
  {
    icon: <ShieldCheck className="text-sky-500" />,
    title: "3. Google Drive™ & Data Integration",
    content: `Nemesis provides integration with Google Drive™ to facilitate its core functionality as a collaborative academic productivity platform. By enabling this feature, you grant us permission to access specific 'drive.file' and 'drive.appdata' scopes to sync your study materials and application settings. You retain full ownership of your data. Our access is strictly limited to managing Nemesis-specific files and configuration data. We do not use your private content for advertising or external data mining.`
  },
  {
    icon: <Scale className="text-sky-500" />,
    title: "4. Intellectual Property",
    content: `The Service and its original content (excluding content provided by users), features, and functionality are and will remain the exclusive property of Nemesis and its licensors. The Service is protected by copyright, trademark, and other laws of both the country and foreign countries. Our trademarks and trade dress may not be used in connection with any product or service without the prior written consent of Nemesis.`
  },
  {
    icon: <AlertCircle className="text-sky-500" />,
    title: "5. Limitation of Liability",
    content: `In no event shall Nemesis, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from (i) your access to or use of or inability to access or use the Service; (ii) any conduct or content of any third party on the Service; (iii) any content obtained from the Service; and (iv) unauthorized access, use or alteration of your transmissions or content.`
  },
  {
    icon: <HelpCircle className="text-sky-500" />,
    title: "6. Termination",
    content: `We may terminate or suspend your account and bar access to the Service immediately, without prior notice or liability, under our sole discretion, for any reason whatsoever and without limitation, including but not limited to a breach of the Terms. All provisions of the Terms which by their nature should survive termination shall survive termination, including, without limitation, ownership provisions, warranty disclaimers, indemnity and limitations of liability.`
  }
];

const TermsOfService: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 selection:bg-sky-500/30">
      <SEO 
        title="Terms of Service"
        description="Detailed standards governing elite usage and academic integrity protocol within the Nemesis ecosystem."
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-24">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 sm:mb-20"
        >
          <Link 
            to="/login" 
            className="inline-flex items-center gap-2 text-sky-400 hover:text-sky-300 font-bold mb-8 transition-colors group"
          >
            <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            Back to Login
          </Link>
          
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-sky-500/10 rounded-2xl border border-sky-500/20">
              <Scale size={32} className="text-sky-500" />
            </div>
            <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight">Terms of <span className="text-sky-500">Service</span></h1>
          </div>
          
          <div className="flex flex-wrap items-center gap-4 text-sm font-bold uppercase tracking-widest text-slate-500">
            <span>Last Updated: April 10, 2026</span>
            <span className="w-1 h-1 bg-slate-700 rounded-full" />
            <span>Version 2.2.0</span>
            <span className="w-1 h-1 bg-slate-700 rounded-full" />
            <span className="text-sky-500">Genesis Protocol</span>
          </div>
        </motion.div>

        {/* Content sections */}
        <div className="space-y-4 sm:space-y-12">
          {SECTIONS.map((section, index) => (
            <motion.section 
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group p-5 sm:p-8 rounded-[1.5rem] sm:rounded-[2rem] bg-slate-800/40 border border-slate-700/50 backdrop-blur-xl hover:bg-slate-800/60 transition-all duration-500"
            >
              <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
                <div className="p-3 sm:p-4 bg-slate-900/50 rounded-xl sm:rounded-2xl border border-slate-700 group-hover:border-sky-500/30 transition-colors">
                  {section.icon}
                </div>
                <div className="flex-1">
                  <h2 className="text-lg sm:text-2xl font-bold text-white mb-2 sm:mb-4">{section.title}</h2>
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
          className="mt-12 sm:mt-20 p-6 sm:p-12 rounded-[2rem] sm:rounded-[3rem] bg-gradient-to-br from-sky-500/20 to-transparent border border-sky-500/20 text-center"
        >
          <h3 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">Questions about our Terms?</h3>
          <p className="text-sm sm:text-lg text-slate-400 mb-6 sm:mb-8 max-w-xl mx-auto">
            Our legal team is here to help clarify any points of synchronization or data usage.
          </p>
          <a 
            href="mailto:support@nemesiss.in"
            className="inline-block px-8 sm:px-12 py-3 sm:py-4 text-sm sm:text-base bg-sky-500 hover:bg-sky-400 text-white font-bold rounded-xl sm:rounded-2xl transition-all shadow-xl shadow-sky-500/20 active:scale-95"
          >
            Contact Legal Team
          </a>
        </motion.div>

        <div className="mt-12 text-center text-slate-600 text-sm font-medium tracking-widest uppercase pb-12">
          &copy; 2026 Team Genesis &bull; Nemesis Platform Security Division
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
