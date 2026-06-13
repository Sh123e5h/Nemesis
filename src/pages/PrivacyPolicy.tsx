import React from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Shield, Eye, Lock, Globe, Database, UserMinus, HardDrive } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SEO } from '../components/SEO';

const SECTIONS = [
  {
    icon: <Eye className="text-sky-500" />,
    title: "1. Data We Collect",
    content: "We collect information you provide directly to us, such as your username, email address, password, date of birth, and gender. We also collect usage data, device information, and interaction patterns within the platform to improve your synchronization experience and optimize performance."
  },
  {
    icon: <HardDrive className="text-sky-500" />,
    title: "2. Google Drive™ Sync & Permissions",
    content: (
      <>
        Our platform uses Google Drive™ for secure cloud storage. We specifically request access to 'drive.file' (files created by Nemesis) and 'drive.appdata' (configuration). We do not access, view, or modify any other files in your Google Drive without your explicit action. 
        <br /><br />
        <strong>Nemesis's use and transfer to any other app of information received from Google APIs will adhere to the <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" className="text-sky-500 hover:underline">Google API Services User Data Policy</a>, including the Limited Use requirements.</strong>
        <br /><br />
        Your data remains yours, and we do not use your private content for advertising or machine learning training.
      </>
    )
  },
  {
    icon: <Database className="text-sky-500" />,
    title: "3. Third-Party Services",
    content: "We utilize industry-leading third-party services to ensure stability and security. This includes Supabase (Database & Authentication) and Google (Cloud Storage). These partners are compliant with global privacy standards and are only authorized to use your data to maintain the specific services they provide for Nemesis."
  },
  {
    icon: <Lock className="text-sky-500" />,
    title: "4. Data Security & Encryption",
    content: "All data transmitted between your device and our servers is encrypted using industry-standard SSL/TLS protocols. Profile information, synchronization tokens, and sensitive account data are protected by multiple layers of encryption to prevent unauthorized access at rest and in transit."
  },
  {
    icon: <Globe className="text-sky-500" />,
    title: "5. International Data Transfers",
    content: "By using Nemesis, you understand that your information may be processed in various global regions where our infrastructure partners operate. We ensure that all cross-border transfers are conducted under strict legal frameworks and privacy safeguards to protect your identity regardless of localization."
  },
  {
    icon: <UserMinus className="text-sky-500" />,
    title: "6. Your Rights & Data Deletion",
    content: "You have the right to access, correct, or delete your personal data at any time. Through the app settings, you can initiate a 'Full Reset' which permanently wipes your profile, sync data, and files from our database and connected cloud storage. For explicit deletion requests, you can contact our privacy team."
  }
];

const PrivacyPolicy: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 selection:bg-sky-500/30">
      <SEO 
        title="Privacy Policy"
        description="Maintaining total structural encryption and private research sovereignty through our security protocols."
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
              <Shield size={32} className="text-sky-500" />
            </div>
            <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight">Privacy <span className="text-sky-500">Policy</span></h1>
          </div>
          
          <div className="flex flex-wrap items-center gap-4 text-sm font-bold uppercase tracking-widest text-slate-500">
            <span>Last Updated: April 10, 2026</span>
            <span className="w-1 h-1 bg-slate-700 rounded-full" />
            <span>Version 2.2.0</span>
            <span className="w-1 h-1 bg-slate-700 rounded-full" />
            <span className="text-sky-500">GDSC Compliant</span>
          </div>
        </motion.div>

        {/* Introduction */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-8 sm:mb-12 p-5 sm:p-8 rounded-[2rem] sm:rounded-3xl bg-sky-500/5 border border-sky-500/10"
        >
          <p className="text-base sm:text-xl text-slate-300 leading-relaxed max-w-3xl">
            At Nemesis, your privacy is the cornerstone of our protocol. We believe in total transparency and data sovereignty. This policy outlines exactly how we manage your information—no hidden trackers, no data sales.
          </p>
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
                <div className="p-3 sm:p-4 bg-slate-900/50 rounded-xl sm:rounded-2xl border border-slate-700 group-hover:border-sky-500/30 transition-colors shadow-sm">
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
          className="mt-12 sm:mt-20 p-6 sm:p-12 rounded-[2rem] sm:rounded-[3rem] bg-gradient-to-br from-white/5 to-transparent border border-white/10 text-center"
        >
          <h3 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">Privacy Concerns?</h3>
          <p className="text-sm sm:text-lg text-slate-400 mb-6 sm:mb-8 max-w-xl mx-auto">
            We are committed to absolute data transparency. Reach out to our Data Privacy Officer for detailed inquiries.
          </p>
          <a 
            href="mailto:support@nemesiss.in"
            className="inline-block px-8 sm:px-12 py-3 sm:py-4 text-sm sm:text-base bg-white text-slate-900 font-bold rounded-xl sm:rounded-2xl hover:bg-slate-200 transition-all shadow-xl active:scale-95"
          >
            Contact Privacy Officer
          </a>
        </motion.div>

        <div className="mt-12 text-center text-slate-600 text-sm font-medium tracking-widest uppercase pb-12">
          &copy; 2026 Team Genesis &bull; Global Data Protection Initiative
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
