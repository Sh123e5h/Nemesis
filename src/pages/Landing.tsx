import React, { useState, useCallback, useEffect } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import {
  ChevronRight,
  ChevronLeft,
  Shield,
  HardDrive,
  Zap,
  Users,
  Layout,
  Calendar,
  Lock,
  Github,
  Mail,
  Phone,
  CheckCircle2,
  Share2,
  BookOpen,
  Globe,
  RefreshCw,
  Instagram,
  Linkedin,
  MessageCircle,
  Copy,
  Check,
  HeartHandshake,
  ShieldCheck
} from 'lucide-react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';

// ─── OFFICIAL TECHNOLOGY LOGOS (SVG) ───
const GoogleDriveLogo = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M12.01 1.485c-2.082 0-3.754.02-3.743.047.01.02 1.708 3.001 3.774 6.62l3.76 6.574h3.76c2.081 0 3.753-.02 3.742-.047-.005-.02-1.708-3.001-3.775-6.62l-3.76-6.574z" fill="#0066da" />
    <path d="M7.25 3.214a789.828 789.861 0 0 0-3.63 6.319L0 15.868l1.89 3.298 1.885 3.297 3.62-6.335 3.618-6.33-1.88-3.287c-.013-.02-.858-1.504-.863-1.51z" fill="#00ac47" />
    <path d="M9.509 15.867l-.203.348c-.114.198-.96 1.672-1.88 3.287a423.93 423.948 0 0 1-1.698 2.97c-.01.026 3.24.042 7.222.042h7.244l1.796-3.157c.992-1.734 1.85-3.23 1.906-3.323l.104-.167h-7.249z" fill="#ffba00" />
  </svg>
);

const GoogleLogo = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

const GoogleVerifiedBadge = ({ className = "" }: { className?: string }) => (
  <div className={`inline-flex items-center gap-2.5 px-4 py-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-slate-700/50 rounded-full shadow-sm hover:shadow-md transition-all group ${className}`}>
    <GoogleLogo size={16} />
    <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
      Verified by Google
      <ShieldCheck size={14} className="text-emerald-500 fill-emerald-500/20" />
    </span>
  </div>
);

const SupabaseLogo = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M21.362 9.354H12V.5L2.638 14.646H12v8.854L21.362 9.354z" />
  </svg>
);

const TypeScriptLogo = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M1.125 0C.502 0 0 .502 0 1.125v21.75C0 23.498.502 24 1.125 24h21.75c.623 0 1.125-.502 1.125-1.125V1.125C24 .502 23.498 0 22.875 0H1.125zm17.363 9.75c.612 0 1.154.037 1.627.111a6.38 6.38 0 0 1 1.306.34v2.458a3.95 3.95 0 0 0-.643-.361 5.093 5.093 0 0 0-.717-.26 5.453 5.453 0 0 0-1.428-.2c-.384 0-.686.049-.904.146-.218.099-.327.245-.327.441 0 .127.049.232.147.315.098.082.254.157.463.222.214.067.48.139.805.216 1.147.28 1.962.623 2.445 1.028.484.405.726.97.726 1.693 0 .835-.273 1.474-.82 1.917-.547.442-1.285.663-2.215.663-1.16 0-2.267-.235-3.319-.706v-2.618c.404.226.824.412 1.258.558.434.145.92.217 1.458.217.428 0 .741-.065.939-.196.197-.131.296-.282.296-.453a.58.58 0 0 0-.156-.4c-.104-.105-.308-.22-.613-.346l-.503-.207c-1.107-.265-1.892-.619-2.355-1.062s-.696-1.023-.696-1.741c0-.765.292-1.378.877-1.838.585-.459 1.433-.689 2.544-.689zm-10.428.107h7.243v2.302h-2.357v10.323H10.44V12.159H8.06V9.857z" />
  </svg>
);

const ReactLogo = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="-11.5 -10.23174 23 20.46348" xmlns="http://www.w3.org/2000/svg">
    <circle cx="0" cy="0" r="2.05" fill="currentColor" />
    <g stroke="currentColor" strokeWidth="1" fill="none">
      <ellipse rx="11" ry="4.2" />
      <ellipse rx="11" ry="4.2" transform="rotate(60)" />
      <ellipse rx="11" ry="4.2" transform="rotate(120)" />
    </g>
  </svg>
);

const VercelLogo = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 256 222" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M128 0L256 221.705H0L128 0Z" />
  </svg>
);

const TailwindLogo = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M12.001 4.8c-3.2 0-5.2 1.6-6 4.8 1.2-1.6 2.6-2.2 4.2-1.8 1.02.26 1.75.98 2.56 1.8 1.32 1.48 2.85 3.2 6.04 3.2 3.2 0 5.2-1.6 6-4.8-1.2 1.6-2.6 2.2-4.2 1.8-.91-.23-1.57-.88-2.25-1.59-.97-1.02-2.12-2.21-4.3-2.21zm-6 4.8c-3.2 0-5.2 1.6-6 4.8 1.2-1.6 2.6-2.2 4.2-1.8 1.02.26 1.75.98 2.56 1.8 1.32 1.48 2.85 3.21 6.04 3.21 3.2 0 5.2-1.6 6-4.8-1.2 1.6-2.6 2.2-4.2 1.8-.91-.23-1.57-.88-2.25-1.59-.97-1.02-2.12-2.21-4.3-2.21z" />
  </svg>
);

const NotionLogo = ({ size = 40 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Official Notion logo — white page + black N */}
    <path fillRule="evenodd" clipRule="evenodd" d="M5.716 29.2178L2.27664 24.9331C1.44913 23.9023 1 22.6346 1 21.3299V5.81499C1 3.86064 2.56359 2.23897 4.58071 2.10125L20.5321 1.01218C21.691 0.933062 22.8428 1.24109 23.7948 1.8847L29.3992 5.67391C30.4025 6.35219 31 7.46099 31 8.64426V26.2832C31 28.1958 29.4626 29.7793 27.4876 29.9009L9.78333 30.9907C8.20733 31.0877 6.68399 30.4237 5.716 29.2178Z" fill="white" />
    <path d="M11.2481 13.5787V13.3756C11.2481 12.8607 11.6605 12.4337 12.192 12.3982L16.0633 12.1397L21.417 20.0235V13.1041L20.039 12.9204V12.824C20.039 12.303 20.4608 11.8732 20.9991 11.8456L24.5216 11.6652V12.1721C24.5216 12.41 24.3446 12.6136 24.1021 12.6546L23.2544 12.798V24.0037L22.1906 24.3695C21.3018 24.6752 20.3124 24.348 19.8036 23.5803L14.6061 15.7372V23.223L16.2058 23.5291L16.1836 23.6775C16.1137 24.1423 15.7124 24.4939 15.227 24.5155L11.2481 24.6926C11.1955 24.1927 11.5701 23.7456 12.0869 23.6913L12.6103 23.6363V13.6552L11.2481 13.5787Z" fill="#000000" />
    <path fillRule="evenodd" clipRule="evenodd" d="M20.6749 2.96678L4.72347 4.05585C3.76799 4.12109 3.02734 4.88925 3.02734 5.81499V21.3299C3.02734 22.1997 3.32676 23.0448 3.87843 23.7321L7.3178 28.0167C7.87388 28.7094 8.74899 29.0909 9.65435 29.0352L27.3586 27.9454C28.266 27.8895 28.9724 27.1619 28.9724 26.2832V8.64426C28.9724 8.10059 28.6979 7.59115 28.2369 7.27951L22.6325 3.49029C22.0613 3.10413 21.3702 2.91931 20.6749 2.96678ZM5.51447 6.057C5.29261 5.89274 5.3982 5.55055 5.6769 5.53056L20.7822 4.44711C21.2635 4.41259 21.7417 4.54512 22.1309 4.82088L25.1617 6.96813C25.2767 7.04965 25.2228 7.22563 25.0803 7.23338L9.08387 8.10336C8.59977 8.12969 8.12193 7.98747 7.73701 7.7025L5.51447 6.057ZM8.33357 10.8307C8.33357 10.311 8.75341 9.88177 9.29027 9.85253L26.203 8.93145C26.7263 8.90296 27.1667 9.30534 27.1667 9.81182V25.0853C27.1667 25.604 26.7484 26.0328 26.2126 26.0633L9.40688 27.0195C8.8246 27.0527 8.33357 26.6052 8.33357 26.0415V10.8307Z" fill="#000000" />
  </svg>
);

const WhatsAppLogo = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.937 3.659 1.432 5.631 1.433h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" fill="currentColor" />
  </svg>
);

const ClassroomLogo = ({ size = 44 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 36 528 456" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="gc-a" x1="50.003%" x2="50.003%" y1="1.385%" y2="101.042%">
        <stop offset="0" stopColor="#bf360c" stopOpacity="0.2" />
        <stop offset="1" stopColor="#bf360c" stopOpacity="0.02" />
      </linearGradient>
      <radialGradient id="gc-b" cx="3.407%" cy="2.344%" gradientTransform="matrix(.86364 0 0 1 .005 0)" r="477.746%">
        <stop offset="0" stopColor="#fff" stopOpacity="0.1" />
        <stop offset="1" stopColor="#fff" stopOpacity="0" />
      </radialGradient>
    </defs>
    <g fill="none">
      <path d="M48 84h432v360H48z" fill="#0f9d58" />
      <path d="M360 276c14.9 0 27-12.1 27-27s-12.1-27-27-27-27 12.1-27 27 12.1 27 27 27zm0 18c-28.9 0-60 15.3-60 34.3V348h120v-19.7c0-19-31.1-34.3-60-34.3zm-192-18c14.9 0 27-12.1 27-27s-12.1-27-27-27-27 12.1-27 27 12.1 27 27 27zm0 18c-28.9 0-60 15.3-60 34.3V348h120v-19.7c0-19-31.1-34.3-60-34.3z" fill="#57bb8a" />
      <path d="M264 252c19.9 0 36-16.1 36-36s-16.1-36-36-36-36 16.1-36 36 16.1 36 36 36zm0 24c-40.5 0-84 21.5-84 48v24h168v-24c0-26.5-43.5-48-84-48z" fill="#f7f7f7" />
      <path d="M312 420h108v24H312z" fill="#f1f1f1" />
      <path d="M492 36H36C16.1 36 0 52.1 0 72v384c0 19.9 16.1 36 36 36h456c19.9 0 36-16.1 36-36V72c0-19.9-16.1-36-36-36zm-12 408H48V84h432z" fill="#f4b400" />
      <path d="M492 36H36C16.1 36 0 52.1 0 72v3c0-19.9 16.1-36 36-36h456c19.9 0 36 16.1 36 36v-3c0-19.9-16.1-36-36-36z" fill="#fff" opacity="0.2" />
      <path d="M492 489H36c-19.9 0-36-16.1-36-36v3c0 19.9 16.1 36 36 36h456c19.9 0 36-16.1 36-36v-3c0 19.9-16.1 36-36 36z" fill="#bf360c" opacity="0.2" />
      <path d="M419.8 444h-108l48 48h107.9z" fill="url(#gc-a)" />
      <path d="M48 81h432v3H48z" fill="#263238" opacity="0.2" />
      <path d="M48 444h432v3H48z" fill="#fff" opacity="0.2" />
      <path d="M492 36H36C16.1 36 0 52.1 0 72v384c0 19.9 16.1 36 36 36h456c19.9 0 36-16.1 36-36V72c0-19.9-16.1-36-36-36z" fill="url(#gc-b)" />
    </g>
  </svg>
);



const ViteLogo = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
    <linearGradient id="viteGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#41D1FF" />
      <stop offset="100%" stopColor="#BD34FE" />
    </linearGradient>
    <path d="M16 1.5L2 26.5h28L16 1.5z" fill="url(#viteGrad)" />
    <path d="M18 10l-4 8h6l-5 10l9-12h-6l4-6z" fill="#FFC517" />
  </svg>
);

const CloudflareLogo = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M21.94 13.11a5.1 5.1 0 00-4.95-3.34h-.05a4.87 4.87 0 00-9.66-.08.57.57 0 00-.01.08c-2.43.34-4.27 2.45-4.27 4.97 0 2.78 2.25 5.03 5.03 5.03h13.91c1.93 0 3.5-1.57 3.5-3.5 0-1.46-1.01-2.65-2.5-3.16z" />
  </svg>
);

const FramerLogo = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 0h16v8h-8zM4 8h8l8 8H4zM4 16h8v8z" />
  </svg>
);

const ZustandLogo = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2c-.5 0-1 .2-1.4.6L8.4 4.8c-.4.4-.6.9-.6 1.4v1.6c0 .1 0 .2.1.3l2 2c.2.2.5.3.8.3h2.6c.3 0 .6-.1.8-.3l2-2c.1-.1.1-.2.1-.3V6.2c0-.5-.2-1-.6-1.4L13.4 2.6C13 2.2 12.5 2 12 2zM6 10c-1.1 0-2 .9-2 2v6c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-6c0-1.1-.9-2-2-2h-3v2h3v6H6v-6h3v-2H6z" />
  </svg>
);

const CapacitorLogo = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M24 3.7l-5.766 5.766 5.725 5.736-3.713 3.712L5.073 3.742 8.786.03l5.736 5.726L20.284 0 24 3.7zM.029 8.785l3.713-3.713 15.173 15.173-3.713 3.714-5.732-5.726L3.7 24 0 20.285l5.754-5.764L.029 8.785z" />
  </svg>
);

const GithubBrandLogo = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
  </svg>
);

const ResendLogo = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M14.679 0c4.648 0 7.413 2.765 7.413 6.434s-2.765 6.434-7.413 6.434H12.33L24 24h-8.245l-8.88-8.44c-.636-.588-.93-1.273-.93-1.86 0-.831.587-1.565 1.713-1.883l4.574-1.224c1.737-.465 2.936-1.81 2.936-3.572 0-2.153-1.761-3.4-3.939-3.4H0V0z" />
  </svg>
);

const GoogleDocsLogo = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M14.5 0H3C1.9 0 1 0.9 1 2v20c0 1.1 0.9 2 2 2h18c1.1 0 2-0.9 2-2V8.5L14.5 0z" fill="#4285F4" />
    <path d="M14.5 0V8.5H23L14.5 0z" fill="#A1C2FA" />
    <path d="M18 13H6v-2h12v2zm0 4H6v-2h12v2zm-5 4H6v-2h7v2z" fill="#FFF" />
  </svg>
);

const GoogleCalendarLogo = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* White body */}
    <rect x="3" y="5" width="18" height="16" rx="2" fill="white" stroke="#E8EAED" strokeWidth="1" />
    {/* Blue top bar */}
    <rect x="3" y="5" width="18" height="6" rx="2" fill="#1A73E8" />
    <rect x="3" y="8" width="18" height="3" fill="#1A73E8" />
    {/* Calendar handle knobs */}
    <rect x="7" y="3" width="2" height="5" rx="1" fill="#1A73E8" />
    <rect x="15" y="3" width="2" height="5" rx="1" fill="#1A73E8" />
    {/* Grid lines */}
    <line x1="3" y1="15" x2="21" y2="15" stroke="#E8EAED" strokeWidth="1" />
    <line x1="9" y1="12" x2="9" y2="21" stroke="#E8EAED" strokeWidth="1" />
    <line x1="15" y1="12" x2="15" y2="21" stroke="#E8EAED" strokeWidth="1" />
    {/* Highlighted date cell */}
    <rect x="10" y="15.5" width="4" height="4" rx="1" fill="#1A73E8" opacity="0.15" />
    <rect x="10" y="11.5" width="4" height="3" rx="0.5" fill="#1A73E8" opacity="0.1" />
  </svg>
);

const ChromeLogo = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
    {/* Red wedge: upper-left → over top → upper-right */}
    <path d="M12 12 L3.34 7 A10 10 0 0 1 20.66 7 Z" fill="#EA4335" />
    {/* Yellow wedge: upper-right → right → bottom */}
    <path d="M12 12 L20.66 7 A10 10 0 0 1 12 22 Z" fill="#FBBC05" />
    {/* Green wedge: bottom → left → upper-left */}
    <path d="M12 12 L12 22 A10 10 0 0 1 3.34 7 Z" fill="#34A853" />
    {/* White ring separator */}
    <circle cx="12" cy="12" r="5.8" fill="white" />
    {/* Blue centre */}
    <circle cx="12" cy="12" r="4" fill="#4285F4" />
  </svg>
);

const AndroidLogo = ({ size = 22, className = "" }: { size?: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M17.6 9.48l1.84-3.18c.16-.31.04-.7-.27-.86-.31-.16-.7-.05-.86.27l-1.93 3.34C15.01 8.35 13.56 8 12 8s-3.01.35-4.38 1.05L5.69 5.71c-.16-.32-.55-.43-.86-.27-.31.16-.43.55-.27.86l1.84 3.18C3.89 11.19 2 13.88 2 17h20c0-3.12-1.89-5.81-4.4-7.52zM7 14.5c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm10 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z" fill="#3DDC84" />
  </svg>
);

const SecurityShield = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 2.18l7 3.11v4.71c0 4.49-3.04 8.68-7 9.81-3.96-1.13-7-5.32-7-9.81V6.29l7-3.11zm0 3.32c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 2c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2z" />
  </svg>
);

// ─── SKETCH ILLUSTRATIONS (HAND-CODED) ───
const SketchCircle = ({ children, color = "currentColor", className = "" }: { children: React.ReactNode, color?: string, className?: string }) => (
  <span className={`relative inline-block ${className}`}>
    <span className="relative z-10">{children}</span>
    <svg className="absolute -inset-x-4 -inset-y-2 w-[calc(100%+32px)] h-[calc(100%+16px)] pointer-events-none z-0" viewBox="0 0 100 40" preserveAspectRatio="none">
      <motion.path
        d="M 5,20 C 5,5 95,5 95,20 C 95,35 5,35 7,22 C 8,10 90,8 88,25"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }}
        whileInView={{ pathLength: 1, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.2, ease: "easeInOut" }}
      />
    </svg>
  </span>
);

const SketchUnderline = ({ color = "currentColor", className = "" }: { color?: string, className?: string }) => (
  <svg className={`absolute -bottom-1 left-0 w-full h-3 pointer-events-none ${className}`} viewBox="0 0 100 10" preserveAspectRatio="none">
    <motion.path
      d="M 2,5 Q 25,2 50,7 T 98,4"
      fill="none"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      initial={{ pathLength: 0, opacity: 0 }}
      whileInView={{ pathLength: 1, opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
    />
    <motion.path
      d="M 5,8 Q 30,5 60,8 T 95,6"
      fill="none"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      initial={{ pathLength: 0, opacity: 0 }}
      whileInView={{ pathLength: 1, opacity: 0.6 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8, ease: "easeOut", delay: 0.4 }}
    />
  </svg>
);

const SketchArrow = ({ className = "", color = "currentColor" }: { className?: string, color?: string }) => (
  <svg className={className} viewBox="0 0 100 60" fill="none" preserveAspectRatio="none">
    <motion.path
      d="M 10,10 Q 50,50 90,10"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      initial={{ pathLength: 0, opacity: 0 }}
      whileInView={{ pathLength: 1, opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 1 }}
    />
    <motion.path
      d="M 75,15 L 90,10 L 85,25"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      initial={{ pathLength: 0, opacity: 0 }}
      whileInView={{ pathLength: 1, opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: 0.8 }}
    />
  </svg>
);

const SketchScribble = ({ className = "", color = "currentColor" }: { className?: string, color?: string }) => (
  <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <motion.path
      d="M 20,50 C 20,20 80,20 80,50 C 80,80 20,80 25,55 C 30,30 70,30 75,55 C 80,80 10,80 15,45"
      stroke={color}
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      initial={{ pathLength: 0, opacity: 0 }}
      whileInView={{ pathLength: 1, opacity: 0.4 }}
      viewport={{ once: true }}
      transition={{ duration: 1.5 }}
    />
  </svg>
);

const SketchSparkle = ({ className = "", color = "currentColor" }: { className?: string, color?: string }) => (
  <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <motion.path
      d="M 50,10 L 50,30 M 50,70 L 50,90 M 10,50 L 30,50 M 70,50 L 90,50 M 25,25 L 35,35 M 65,65 L 75,75 M 25,75 L 35,65 M 65,25 L 75,35"
      stroke={color}
      strokeWidth="6"
      strokeLinecap="round"
      initial={{ pathLength: 0, opacity: 0 }}
      whileInView={{ pathLength: 1, opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8, ease: "easeOut" }}
    />
  </svg>
);

const SketchStar = ({ className = "", color = "currentColor" }: { className?: string, color?: string }) => (
  <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <motion.path
      d="M 50,5 L 61,38 L 95,38 L 68,59 L 78,92 L 50,72 L 22,92 L 32,59 L 5,38 L 39,38 Z"
      stroke={color}
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
      initial={{ pathLength: 0, opacity: 0 }}
      whileInView={{ pathLength: 1, opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 1.2, ease: "easeInOut" }}
    />
  </svg>
);

const MozillaLogo = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M4.819 24H1.75V0H4.82zM7.33 12.242H19.48v-.69L11.562 8.67V6.25l7.918-2.872v-.7H10.1V0h12.149v4.89l-6.445 2.224v.69l6.445 2.224v4.89H7.33zm0-9.565h2.77v2.77H7.33z" />
  </svg>
);

const AWSLogo = ({ size = 22 }: { size?: number }) => (
  <svg width={size * 1.67} height={size} viewBox="0 0 304 182" xmlns="http://www.w3.org/2000/svg" className="text-slate-900 dark:text-white">
    <g>
      <path fill="currentColor" d="M86.4,66.4c0,3.7,0.4,6.7,1.1,8.9c0.8,2.2,1.8,4.6,3.2,7.2c0.5,0.8,0.7,1.6,0.7,2.3c0,1-0.6,2-1.9,3l-6.3,4.2
        c-0.9,0.6-1.8,0.9-2.6,0.9c-1,0-2-0.5-3-1.4C76.2,90,75,88.4,74,86.8c-1-1.7-2-3.6-3.1-5.9c-7.8,9.2-17.6,13.8-29.4,13.8
        c-8.4,0-15.1-2.4-20-7.2c-4.9-4.8-7.4-11.2-7.4-19.2c0-8.5,3-15.4,9.1-20.6c6.1-5.2,14.2-7.8,24.5-7.8c3.4,0,6.9,0.3,10.6,0.8
        c3.7,0.5,7.5,1.3,11.5,2.2v-7.3c0-7.6-1.6-12.9-4.7-16c-3.2-3.1-8.6-4.6-16.3-4.6c-3.5,0-7.1,0.4-10.8,1.3c-3.7,0.9-7.3,2-10.8,3.4
        c-1.6,0.7-2.8,1.1-3.5,1.3c-0.7,0.2-1.2,0.3-1.6,0.3c-1.4,0-2.1-1-2.1-3.1v-4.9c0-1.6,0.2-2.8,0.7-3.5c0.5-0.7,1.4-1.4,2.8-2.1
        c3.5-1.8,7.7-3.3,12.6-4.5c4.9-1.3,10.1-1.9,15.6-1.9c11.9,0,20.6,2.7,26.2,8.1c5.5,5.4,8.3,13.6,8.3,24.6V66.4z M45.8,81.6
        c3.3,0,6.7-0.6,10.3-1.8c3.6-1.2,6.8-3.4,9.5-6.4c1.6-1.9,2.8-4,3.4-6.4c0.6-2.4,1-5.3,1-8.7v-4.2c-2.9-0.7-6-1.3-9.2-1.7
        c-3.2-0.4-6.3-0.6-9.4-0.6c-6.7,0-11.6,1.3-14.9,4c-3.3,2.7-4.9,6.5-4.9,11.5c0,4.7,1.2,8.2,3.7,10.6
        C37.7,80.4,41.2,81.6,45.8,81.6z M126.1,92.4c-1.8,0-3-0.3-3.8-1c-0.8-0.6-1.5-2-2.1-3.9L96.7,10.2c-0.6-2-0.9-3.3-0.9-4
        c0-1.6,0.8-2.5,2.4-2.5h9.8c1.9,0,3.2,0.3,3.9,1c0.8,0.6,1.4,2,2,3.9l16.8,66.2l15.6-66.2c0.5-2,1.1-3.3,1.9-3.9c0.8-0.6,2.2-1,4-1
        h8c1.9,0,3.2,0.3,4,1c0.8,0.6,1.5,2,1.9,3.9l15.8,67l17.3-67c0.6-2,1.3-3.3,2-3.9c0.8-0.6,2.1-1,3.9-1h9.3c1.6,0,2.5,0.8,2.5,2.5
        c0,0.5-0.1,1-0.2,1.6c-0.1,0.6-0.3,1.4-0.7,2.5l-24.1,77.3c-0.6,2-1.3,3.3-2.1,3.9c-0.8,0.6-2.1,1-3.8,1h-8.6c-1.9,0-3.2-0.3-4-1
        c-0.8-0.7-1.5-2-1.9-4L156,23l-15.4,64.4c-0.5,2-1.1,3.3-1.9,4c-0.8,0.7-2.2,1-4,1H126.1z M254.6,95.1c-5.2,0-10.4-0.6-15.4-1.8
        c-5-1.2-8.9-2.5-11.5-4c-1.6-0.9-2.7-1.9-3.1-2.8c-0.4-0.9-0.6-1.9-0.6-2.8v-5.1c0-2.1,0.8-3.1,2.3-3.1c0.6,0,1.2,0.1,1.8,0.3
        c0.6,0.2,1.5,0.6,2.5,1c3.4,1.5,7.1,2.7,11,3.5c4,0.8,7.9,1.2,11.9,1.2c6.3,0,11.2-1.1,14.6-3.3c3.4-2.2,5.2-5.4,5.2-9.5
        c0-2.8-0.9-5.1-2.7-7c-1.8-1.9-5.2-3.6-10.1-5.2L246,52c-7.3-2.3-12.7-5.7-16-10.2c-3.3-4.4-5-9.3-5-14.5c0-4.2,0.9-7.9,2.7-11.1
        c1.8-3.2,4.2-6,7.2-8.2c3-2.3,6.4-4,10.4-5.2c4-1.2,8.2-1.7,12.6-1.7c2.2,0,4.5,0.1,6.7,0.4c2.3,0.3,4.4,0.7,6.5,1.1
        c2,0.5,3.9,1,5.7,1.6c1.8,0.6,3.2,1.2,4.2,1.8c1.4,0.8,2.4,1.6,3,2.5c0.6,0.8,0.9,1.9,0.9,3.3v4.7c0,2.1-0.8,3.2-2.3,3.2
        c-0.8,0-2.1-0.4-3.8-1.2c-5.7-2.6-12.1-3.9-19.2-3.9c-5.7,0-10.2,0.9-13.3,2.8c-3.1,1.9-4.7,4.8-4.7,8.9c0,2.8,1,5.2,3,7.1
        c2,1.9,5.7,3.8,11,5.5l14.2,4.5c7.2,2.3,12.4,5.5,15.5,9.6c3.1,4.1,4.6,8.8,4.6,14c0,4.3-0.9,8.2-2.6,11.6
        c-1.8,3.4-4.2,6.4-7.3,8.8c-3.1,2.5-6.8,4.3-11.1,5.6C264.4,94.4,259.7,95.1,254.6,95.1z" />
      <g>
        <path fillRule="evenodd" clipRule="evenodd" fill="#FF9900" d="M273.5,143.7c-32.9,24.3-80.7,37.2-121.8,37.2c-57.6,0-109.5-21.3-148.7-56.7c-3.1-2.8-0.3-6.6,3.4-4.4
          c42.4,24.6,94.7,39.5,148.8,39.5c36.5,0,76.6-7.6,113.5-23.2C274.2,133.6,278.9,139.7,273.5,143.7z" />
        <path fillRule="evenodd" clipRule="evenodd" fill="#FF9900" d="M287.2,128.1c-4.2-5.4-27.8-2.6-38.5-1.3c-3.2,0.4-3.7-2.4-0.8-4.5c18.8-13.2,49.7-9.4,53.3-5
          c3.6,4.5-1,35.4-18.6,50.2c-2.7,2.3-5.3,1.1-4.1-1.9C282.5,155.7,291.4,133.4,287.2,128.1z" />
      </g>
    </g>
  </svg>
);

const techStack = [
  { name: "Mozilla", icon: <MozillaLogo />, color: "text-slate-900 dark:text-white", url: "https://mozilla.org", font: "font-serif", tracking: "tracking-tight", weight: "font-black" },
  { name: "AWS", icon: <AWSLogo />, color: "text-amber-500", url: "https://aws.amazon.com", font: "font-sans", tracking: "tracking-tight", weight: "font-black" },
  { name: "Google Drive", icon: <GoogleDriveLogo />, color: "text-sky-500", url: "https://google.com/drive", font: "font-sans", tracking: "tracking-tighter", weight: "font-bold" },
  { name: "Supabase", icon: <SupabaseLogo />, color: "text-emerald-500", url: "https://supabase.com", font: "font-sans", tracking: "tracking-normal", weight: "font-black" },
  { name: "TypeScript", icon: <TypeScriptLogo />, color: "text-blue-500", url: "https://typescriptlang.org", font: "font-mono", tracking: "tracking-tight", weight: "font-extrabold" },
  { name: "GitHub", icon: <GithubBrandLogo />, color: "text-slate-900 dark:text-white", url: "https://github.com", font: "font-sans", tracking: "tracking-tight", weight: "font-bold" },
  { name: "React 19", icon: <ReactLogo />, color: "text-sky-400", url: "https://react.dev", font: "font-sans", tracking: "tracking-tighter", weight: "font-black" },
  { name: "Resend", icon: <ResendLogo />, color: "text-slate-900 dark:text-white", url: "https://resend.com", font: "font-sans", tracking: "tracking-tight", weight: "font-bold" },
  { name: "Vercel Edge", icon: <VercelLogo />, color: "text-slate-900 dark:text-white", url: "https://vercel.com", font: "font-sans", tracking: "tracking-[-0.05em]", weight: "font-black" },
  { name: "AES-256", icon: <SecurityShield />, color: "text-emerald-500", url: "https://en.wikipedia.org/wiki/Advanced_Encryption_Standard", font: "font-mono", tracking: "tracking-tight", weight: "font-bold" },
  { name: "Tailwind CSS", icon: <TailwindLogo />, color: "text-sky-400", url: "https://tailwindcss.com", font: "font-sans", tracking: "tracking-tight", weight: "font-extrabold" },
  { name: "Vite", icon: <ViteLogo />, color: "text-purple-500", url: "https://vitejs.dev", font: "font-sans", tracking: "tracking-tight", weight: "font-black" },
  { name: "Cloudflare", icon: <CloudflareLogo />, color: "text-orange-500", url: "https://cloudflare.com", font: "font-sans", tracking: "tracking-tight", weight: "font-black" },
  { name: "Framer Motion", icon: <FramerLogo />, color: "text-rose-500", url: "https://framer.com/motion", font: "font-sans", tracking: "tracking-tight", weight: "font-bold" },
  { name: "Zustand", icon: <ZustandLogo />, color: "text-amber-700 dark:text-amber-500", url: "https://zustand.docs.pmnd.rs", font: "font-sans", tracking: "tracking-tight", weight: "font-bold" },
  { name: "Capacitor", icon: <CapacitorLogo />, color: "text-blue-600", url: "https://capacitorjs.com", font: "font-sans", tracking: "tracking-tight", weight: "font-bold" }
];

// ─── PREMIUM UI MOCKUP ───
const BrowserMockup = ({ src, alt, loading }: { src: string, alt: string, loading?: "lazy" | "eager" }) => (
  <div className="relative group perspective-1000 w-full">
    {/* Background Glow */}
    <div className="absolute inset-0 bg-sky-400/20 dark:bg-sky-500/10 blur-[80px] -z-10 rounded-full group-hover:bg-sky-400/30 transition-colors duration-700" />

    {/* Main Container */}
    <div className="p-0.5 sm:p-1 bg-white/40 dark:bg-slate-800/40 backdrop-blur-2xl rounded-[1.2rem] sm:rounded-[2rem] shadow-glass border border-white/60 dark:border-slate-700/50 relative overflow-hidden group-hover:rotate-1 transition-transform duration-700 will-change-transform transform-gpu [content-visibility:auto] contain-intrinsic-size-[auto_600px]">

      {/* Browser Bar */}
      <div className="flex items-center gap-1.5 px-4 py-2 border-b border-slate-200/50 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex gap-1">
          <div className="w-2 h-2 rounded-full bg-red-400/80" />
          <div className="w-2 h-2 rounded-full bg-amber-400/80" />
          <div className="w-2 h-2 rounded-full bg-emerald-400/80" />
        </div>
      </div>

      {/* Image Content */}
      <div className="aspect-video overflow-hidden bg-slate-50 dark:bg-slate-950 relative">
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover object-top opacity-100 transition-transform duration-700 group-hover:scale-[1.03] will-change-transform transform-gpu [backface-visibility:hidden] [transform-style:preserve-3d]"
          loading={loading || "lazy"}
          decoding="async"
        />
        {/* Subtle Inner Shadow */}
        <div className="absolute inset-0 shadow-[inset_0_0_40px_rgba(0,0,0,0.05)] pointer-events-none" />
      </div>
    </div>
  </div>
);

const androidScreenshots = [
  "/showcase/android/android-1.png",
  "/showcase/android/android-2.png",
  "/showcase/android/android-3.png",
  "/showcase/android/android-4.png",
  "/showcase/android/android-5.png",
  "/showcase/android/android-6.png",
  "/showcase/android/android-7.png",
];

const MobileMockup = ({ src, alt, isActive }: { src: string, alt: string, isActive: boolean }) => (
  <div className={`relative transition-all duration-700 ease-out ${isActive ? 'scale-110' : 'scale-90 opacity-40 blur-[1px]'}`}>
    {/* Dynamic Backdrop Glow */}
    {isActive && (
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[150%] bg-sky-500/20 dark:bg-sky-500/10 blur-[100px] rounded-full animate-pulse pointer-events-none" />
    )}

    <div className="relative group [perspective:2000px] w-[240px] sm:w-[300px] isolation-isolate">
      {/* Hardware Rim */}
      <div className="relative p-[1.5px] bg-slate-400/50 dark:bg-slate-700/50 rounded-[3rem] shadow-2xl overflow-hidden transition-transform duration-700 group-hover:rotate-y-12 [backface-visibility:hidden] [transform-style:preserve-3d]">
        <div className="bg-slate-900 dark:bg-slate-950 p-[6px] rounded-[3rem]">
          {/* Content Area */}
          <div className="aspect-[9/19.5] rounded-[2.5rem] overflow-hidden bg-black relative shadow-inner">
            <img
              src={src}
              alt={alt}
              className="w-[100.5%] h-[100.5%] max-w-none object-cover origin-center [backface-visibility:hidden] transform-gpu"
              loading={isActive ? "eager" : "lazy"}
              decoding="async"
            />

            {/* Screen Reflections */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-white/5 pointer-events-none mix-blend-overlay" />
            <div className="absolute top-0 inset-x-0 h-1/3 bg-gradient-to-b from-white/10 to-transparent opacity-30 pointer-events-none mix-blend-screen" />
          </div>
        </div>

        {/* Metallic Bezel Highlights */}
        <div className="absolute top-0 left-1/4 w-1/2 h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
        <div className="absolute bottom-0 right-1/4 w-1/2 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      </div>
    </div>
  </div>
);

const MobileCarousel = () => {
  const [index, setIndex] = useState(0);

  // Auto-cycle
  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % androidScreenshots.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative w-full max-w-[1440px] mx-auto py-4">
      <div className="flex items-center justify-center relative min-h-[550px] sm:min-h-[600px]">
        <AnimatePresence mode="popLayout">
          <div className="flex items-center justify-center gap-4 sm:gap-12 relative h-full">
            {/* Previous Image */}
            <div className="hidden lg:block">
              <MobileMockup
                src={androidScreenshots[(index - 1 + androidScreenshots.length) % androidScreenshots.length]}
                alt="Previous"
                isActive={false}
              />
            </div>

            {/* Active Image */}
            <motion.div
              key={index}
              initial={{ opacity: 0, x: 100, scale: 0.8, rotateY: 20 }}
              animate={{ opacity: 1, x: 0, scale: 1, rotateY: 0 }}
              exit={{ opacity: 0, x: -100, scale: 0.8, rotateY: -20 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="relative z-20 pointer-events-none"
            >
              <MobileMockup src={androidScreenshots[index]} alt="Active" isActive={true} />
            </motion.div>

            {/* Next Image */}
            <div className="hidden lg:block">
              <MobileMockup
                src={androidScreenshots[(index + 1) % androidScreenshots.length]}
                alt="Next"
                isActive={false}
              />
            </div>
          </div>
        </AnimatePresence>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 mt-16 sm:mt-20 relative z-30">
        <button
          onClick={() => setIndex((prev) => (prev - 1 + androidScreenshots.length) % androidScreenshots.length)}
          className="w-12 h-12 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-slate-600 dark:text-slate-300 shadow-sm hover:scale-105"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="flex gap-2 mx-4">
          {androidScreenshots.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={`h-2 rounded-full transition-all duration-500 ${i === index ? 'w-10 bg-sky-500 shadow-md shadow-sky-500/30' : 'w-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700'}`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
        <button
          onClick={() => setIndex((prev) => (prev + 1) % androidScreenshots.length)}
          className="w-12 h-12 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-slate-600 dark:text-slate-300 shadow-sm hover:scale-105"
        >
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
};

export default function Landing() {
  const [contributionAmount, setContributionAmount] = useState(500);
  const [copied, setCopied] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const { scrollYProgress } = useScroll();

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText("shiresh.kashyap@oksbi");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  const handleDonateNow = useCallback(() => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || (window.innerWidth <= 768);
    const upiUrl = `upi://pay?pa=shiresh.kashyap@oksbi&pn=Nemesis%20Project&am=${contributionAmount}&cu=INR`;

    if (isMobile) {
      window.location.href = upiUrl;
    } else {
      setIsPaid(true);
    }
  }, [contributionAmount]);

  const opacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.2], [1, 0.95]);

  return (
    <div className="bg-slate-50 dark:bg-slate-950 selection:bg-sky-500/30 w-full font-sans">
      <SEO
        title="Nemesis | Unified Academic Platform"
        description="The elite academic coordination hub for modern students. Sync school notes with Google Drive, collaborate in secure group spaces, and manage your study schedule with precision."
        keywords="academic collaboration platform, unified study space, student google drive sync, secure group study hub, study planner, data sovereignty, nemesis vs notion, nemesis vs microsoft teams"
      />


      {/* ─── NAVIGATION ─── */}
      <div className="fixed top-4 sm:top-6 inset-x-0 z-50 flex justify-center px-4 sm:px-6 pointer-events-none">
        <nav className="w-full max-w-7xl h-16 sm:h-20 bg-transparent backdrop-blur-2xl border border-white/20 dark:border-slate-700/50 shadow-2xl shadow-sky-900/10 dark:shadow-black/40 flex items-center justify-between px-6 sm:px-8 rounded-2xl pointer-events-auto transition-all duration-300">
          <a href="#" className="flex items-center gap-3 group cursor-pointer">
            <img src="/logo.svg" alt="Nemesis" className="w-8 h-8 sm:w-10 sm:h-10 group-hover:scale-105 transition-transform" fetchPriority="high" loading="eager" decoding="async" />
            <span className="text-xl sm:text-2xl font-black tracking-tight text-sky-500">NEMESIS</span>
          </a>
          <div className="hidden md:flex items-center gap-4 lg:gap-8 text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
            <a href="#about" className="hover:text-sky-500 transition-colors">About</a>
            <a href="#nexus" className="hover:text-sky-500 transition-colors">Nexus</a>
            <a href="#mobile" className="hover:text-sky-500 transition-colors">App</a>
            <a href="#sync" className="hover:text-sky-500 transition-colors">Sync</a>
            <a href="#transparency" className="hover:text-sky-500 transition-colors">Security</a>
            <a href="#team" className="hover:text-sky-500 transition-colors">Creator</a>
            <a href="#pricing" className="hover:text-sky-500 transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-4">
            <Link
              to="/login"
              className="hidden sm:block px-6 py-2.5 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 text-sky-600 dark:text-sky-400 text-sm font-bold rounded-full transition-all active:scale-95"
            >
              Login
            </Link>
            <Link
              to="/signup"
              className="px-6 py-2.5 bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-400 hover:to-indigo-400 text-white text-sm font-bold rounded-full transition-all shadow-lg shadow-sky-500/20 active:scale-95"
            >
              Get Started
            </Link>
          </div>
        </nav>
      </div>


      <div className="relative overflow-hidden w-full">
        {/* Shared Background Image & Overlay */}
        <div className="absolute inset-0 z-0 bg-slate-50 dark:bg-slate-950 pointer-events-none">
          <img
            src="https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&q=80&w=2000"
            alt="Abstract Premium Gradient"
            className="w-full h-full object-cover opacity-30 dark:opacity-20"
            loading="eager"
            fetchPriority="high"
            decoding="async"
            width={2000}
            height={1000}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-50/50 to-slate-50 dark:via-slate-950/50 dark:to-slate-950" />
        </div>

        {/* Shared Decorative Background Elements */}
        <div className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] z-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-sky-300/20 dark:from-sky-500/10 via-transparent to-transparent blur-3xl opacity-60 pointer-events-none" />

        {/* ─── HERO SECTION ─── */}
        <section className="relative pt-32 pb-20 sm:pt-48 sm:pb-32 px-6 min-h-[90vh] flex flex-col justify-center items-center z-10">

          <motion.div
            style={{ opacity, scale }}
            className="max-w-6xl mx-auto text-center relative z-10 w-full"
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-sky-50 dark:bg-sky-500/10 border border-sky-100 dark:border-sky-500/20 rounded-full text-sky-600 dark:text-sky-400 text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] mb-8"
            >
              <Zap size={14} className="fill-current" />
              Welcome to the Nexus!
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-5xl sm:text-7xl md:text-8xl font-black tracking-tight leading-[0.9] mb-8 uppercase text-transparent bg-clip-text bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-600 pb-2 relative"
            >
              Nemesis: Your Unified Academic Coordination Hub
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="max-w-3xl mx-auto text-lg sm:text-xl text-slate-600 dark:text-slate-300 leading-relaxed font-medium mb-12"
            >
              Nemesis is the <strong className="text-sky-500 font-black">unified academic coordination hub</strong> engineered for the modern educational lifecycle. By integrating protocol level synchronization with Google Drive, Nemesis ensures total <strong className="text-indigo-500 font-bold">data sovereignty</strong> while optimizing group projects through real time Supabase powered Nexus hubs.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
            >
              <Link
                to="/signup"
                className="w-full sm:w-auto px-10 py-5 bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-400 hover:to-indigo-400 text-white font-black rounded-3xl transition-all shadow-xl shadow-sky-500/20 active:scale-95 flex items-center justify-center gap-2 group text-lg"
              >
                Start for Free <ChevronRight className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <a
                href="#nexus"
                className="w-full sm:w-auto px-10 py-5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold rounded-3xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-2 text-lg"
              >
                See How It Works
              </a>
            </motion.div>

            {/* ─── GEO STATISTICS ADDITION (Algorithm Optimization) ─── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-12 mt-8 sm:mt-12 border-t border-slate-200/50 dark:border-slate-800/50 pt-8 sm:pt-12"
            >
              <div className="flex flex-col items-center p-6 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-[2rem] border border-white/60 dark:border-slate-800 shadow-sm hover:-translate-y-1 transition-transform cursor-default">
                <span className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tighter mb-3 text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-indigo-500">&lt;50ms</span>
                <span className="text-sm font-bold text-slate-600 dark:text-slate-400 leading-relaxed font-medium text-center">Syncs academic data across devices with <strong className="text-slate-800 dark:text-slate-200">near-zero latency</strong></span>
              </div>
              <div className="flex flex-col items-center p-6 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-[2rem] border border-white/60 dark:border-slate-800 shadow-sm hover:-translate-y-1 transition-transform cursor-default">
                <span className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tighter mb-3 text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-500">10,000+</span>
                <span className="text-sm font-bold text-slate-600 dark:text-slate-400 leading-relaxed font-medium text-center">Built for massive scale with <strong className="text-slate-800 dark:text-slate-200">simultaneous active sessions</strong></span>
              </div>
              <div className="flex flex-col items-center p-6 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-[2rem] border border-white/60 dark:border-slate-800 shadow-sm hover:-translate-y-1 transition-transform cursor-default">
                <span className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tighter mb-3 text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-orange-500">80%</span>
                <span className="text-sm font-bold text-slate-600 dark:text-slate-400 leading-relaxed font-medium text-center">Proven to <strong className="text-slate-800 dark:text-slate-200">reduce study coordination time</strong> for active groups</span>
              </div>
            </motion.div>

          </motion.div>

        </section>

        {/* ─── TRUST BANNER (The Stack) ─── */}
        <div className="py-12 border-y border-slate-200/50 dark:border-slate-800/50 bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm relative z-10">
          <div className="max-w-7xl mx-auto px-6">
            <p className="text-center text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500 mb-8 px-6">
              Built with World-Class Technology
            </p>
            <div className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
              <div className="animate-marquee py-4 flex items-center">
                {[...techStack, ...techStack].map((item, i) => (
                  <a
                    key={i}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2.5 mx-8 sm:mx-12 group last:mr-0 transition-transform active:scale-95 cursor-pointer"
                  >
                    <div className={`${item.color} group-hover:scale-110 transition-all duration-500 ease-out`}>
                      {item.icon}
                    </div>
                    <span className={`text-xl sm:text-2xl ${item.font} ${item.weight} ${item.tracking} text-slate-900 dark:text-white whitespace-nowrap transition-all duration-500`}>
                      {item.name}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
        {/* ─── END HERO & TRUST STRIP WRAPPER ─── */}
      </div>

      {/* ─── ABOUT NEMESIS (The Purpose) ─── */}
      <section id="about" className="py-24 px-6 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 relative overflow-hidden [content-visibility:auto] contain-intrinsic-size-[auto_800px]">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-indigo-500/5 to-transparent pointer-events-none" />
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 rounded-full text-indigo-600 dark:text-indigo-400 text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] mb-8 shadow-sm relative">
            <Zap size={16} />
            <span className="relative z-10">What is Nemesis?</span>
            <SketchUnderline color="currentColor" className="opacity-40" />
          </div>
          <h2 className="text-4xl sm:text-6xl font-black mb-8 tracking-tight text-slate-900 dark:text-white leading-[1.1]">
            The End of <SketchCircle color="#6366f1">Academic Chaos</SketchCircle>
          </h2>
          <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-400 font-medium mb-16 leading-relaxed max-w-3xl mx-auto">
            Nemesis is an all-in-one workspace built exclusively for students. We realized that juggling WhatsApp groups for projects, Google Drive for PDFs, and random apps for to-do lists was burning students out. So we built <strong>one platform</strong> to unify your entire educational lifecycle.
          </p>

          <div className="grid sm:grid-cols-3 gap-8 text-left">
            <div className="p-8 bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-[2rem] shadow-glass border border-white/50 dark:border-slate-700/50 hover:border-sky-500/30 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
              <div className="w-14 h-14 bg-sky-50 dark:bg-sky-500/10 border border-sky-100 dark:border-sky-500/20 text-sky-600 dark:text-sky-400 rounded-2xl flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform">
                <BookOpen size={24} />
              </div>
              <h4 className="text-xl font-black text-slate-900 dark:text-white mb-3 tracking-tight">Centralized Storage</h4>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium">Every PDF, lecture note, and syllabus lives exactly where it belongs in your secure, unified vault.</p>
            </div>
            <div className="p-8 bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-[2rem] shadow-glass border border-white/50 dark:border-slate-700/50 hover:border-emerald-500/30 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
              <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform">
                <Users size={24} />
              </div>
              <h4 className="text-xl font-black text-slate-900 dark:text-white mb-3 tracking-tight">Focused Collaboration</h4>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium">Dedicated chat rooms and shared whiteboards keep group projects moving without social media distractions.</p>
            </div>
            <div className="p-8 bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-[2rem] shadow-glass border border-white/50 dark:border-slate-700/50 hover:border-rose-500/30 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
              <div className="w-14 h-14 bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform">
                <CheckCircle2 size={24} />
              </div>
              <h4 className="text-xl font-black text-slate-900 dark:text-white mb-3 tracking-tight">Targeted Execution</h4>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium">Integrated drag-and-drop task planners and study timers ensure you actually get your homework done on time.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── RESEARCH SPOTLIGHT (Citations & Quotations) ─── */}
      <section className="py-24 px-6 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 relative">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative p-10 sm:p-14 bg-white dark:bg-slate-800 rounded-[3rem] shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-8 text-sky-500/10">
                <Copy size={120} />
              </div>
              <div className="relative z-10">
                <SketchStar color="#0ea5e9" className="w-12 h-12 mb-8 opacity-40" />
                <p className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white leading-snug italic mb-8">
                  "The transition from fragmented digital tools to a unified academic protocol represents a <span className="text-sky-500 font-black">40% increase</span> in cognitive focus periods for modern researchers."
                </p>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm shrink-0 group-hover:scale-110 transition-transform duration-500">
                    <img
                      src="/shireesh.webp"
                      alt="Shireesh Kashyap"
                      className="w-full h-full object-cover"
                      style={{ objectPosition: "center 15%" }}
                    />
                  </div>
                  <div>
                    <h5 className="text-lg font-black text-slate-900 dark:text-white">Shireesh Kashyap</h5>
                    <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Lead Architect • Team Genesis</p>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-10"
            >
              <div>
                <h3 className="text-xs font-black uppercase tracking-[0.3em] text-sky-500 mb-4">Scientific Backing</h3>
                <h2 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white leading-[1.1] mb-6">
                  Engineered for <span className="text-sky-500">Cognitive Retention</span>
                </h2>
                <div className="space-y-6 text-slate-600 dark:text-slate-400 font-medium">
                  <p className="text-lg leading-relaxed">
                    According to research from the <strong className="text-slate-900 dark:text-white">National Training Laboratories</strong>, collaborative group discussion increases information retention to <strong className="text-sky-500 font-black">50%</strong>, compared to just 5% for passive lecture attendance.
                  </p>
                  <p className="text-lg leading-relaxed">
                    Nemesis is built specifically to capitalize on these metrics. By automating the coordination of shared subjects and real-time task sync, we eliminate <strong className="text-indigo-500 font-bold">cognitive overhead</strong>, allowing students to focus 100% of their energy on high-level synthesis rather than file management.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── COMPARISON (The Old Way vs. Nemesis) ─── */}
      <section className="py-24 px-6 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 relative [content-visibility:auto] contain-intrinsic-size-[auto_1200px]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 relative">
            <h2 className="text-4xl sm:text-6xl font-black text-slate-900 dark:text-white uppercase tracking-tight leading-[1.1] relative z-10">
              The <span className="text-slate-400">Old Way</span> vs. <span className="text-sky-500">Nemesis</span>
            </h2>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-32 hidden md:block">
              <SketchArrow color="#0ea5e9" className="w-full h-full rotate-[-5deg] opacity-60" />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-px bg-slate-200 dark:bg-slate-800 rounded-[3rem] overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800">
            {/* The Old Way */}
            <div className="bg-white dark:bg-slate-900 p-8 sm:p-12 no-hover relative overflow-hidden text-left">
              <div className="absolute top-0 right-0 w-32 h-32 pointer-events-none opacity-20 dark:opacity-40">
                <SketchScribble className="w-full h-full" color="#94a3b8" />
              </div>
              <h4 className="text-2xl font-black text-slate-400 uppercase tracking-widest mb-10 flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-sm ring-1 ring-slate-200 dark:ring-slate-700">✕</span>
                The Stale Way
              </h4>
              <ul className="space-y-12">
                <li className="flex gap-6">
                  <div className="text-slate-300"><Mail size={32} /></div>
                  <div>
                    <h5 className="text-xl font-bold text-slate-900 dark:text-white mb-2">WhatsApp File Chaos</h5>
                    <p className="text-slate-500 dark:text-slate-400 leading-relaxed font-medium">Important PDFs lost in thousands of 'Good Morning' messages and random chat history.</p>
                  </div>
                </li>
                <li className="flex gap-6">
                  <div className="text-slate-300"><HardDrive size={32} /></div>
                  <div>
                    <h5 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Generic Folder Hells</h5>
                    <p className="text-slate-500 dark:text-slate-400 leading-relaxed font-medium">Generic cloud storage that doesn't understand your syllabus, subjects, or deadlines.</p>
                  </div>
                </li>
                <li className="flex gap-6">
                  <div className="text-slate-300"><Lock size={32} /></div>
                  <div>
                    <h5 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Proprietary Lock-in</h5>
                    <p className="text-slate-500 dark:text-slate-400 leading-relaxed font-medium">Your data is trapped on corporate servers. If the service pivots or closes, your academic history vanishes.</p>
                  </div>
                </li>
              </ul>
            </div>

            {/* The Nemesis Way */}
            <div className="bg-sky-50/30 dark:bg-sky-500/5 p-8 sm:p-12 relative overflow-hidden text-left">
              <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/10 blur-[100px] -z-10" />
              <h4 className="text-2xl font-black text-sky-500 uppercase tracking-widest mb-10 flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-sky-100 dark:bg-sky-500/20 flex items-center justify-center text-sm">✓</span>
                The Nemesis Way
              </h4>
              <ul className="space-y-12">
                <li className="flex gap-6">
                  <div className="text-sky-500"><Layout size={32} /></div>
                  <div>
                    <h5 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Unified Smart Library</h5>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium">Every PDF and note organized by subject. Instantly searchable and always at your fingertips.</p>
                  </div>
                </li>
                <li className="flex gap-6">
                  <div className="text-sky-500"><Users size={32} /></div>
                  <div>
                    <h5 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Synchronized Groups</h5>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium">Chat, share files, and whiteboard ideas in a space built purely for your project goals.</p>
                  </div>
                </li>
                <li className="flex gap-6">
                  <div className="text-sky-500"><ShieldCheck size={32} /></div>
                  <div>
                    <h5 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Total Data Sovereignty</h5>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium">Your materials stay in your own private Google Drive. You maintain 100% ownership and permanent portability.</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>

          {/* ─── DETAILED COMPARISON TABLE (GEO CITATION BOOSTER) ─── */}
          <div className="mt-16 overflow-x-auto rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                  <th className="p-6 text-sm font-black uppercase tracking-widest text-slate-400">Feature Comparison</th>
                  <th className="p-8 pb-4 text-xs font-black uppercase tracking-[0.3em] text-slate-400 border-r border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-4">
                      {/* Full-color official Nemesis logo — no filter, no bg override */}
                      <img
                        src="/logo.svg"
                        width={44}
                        height={44}
                        alt="Nemesis logo"
                        className="shrink-0 drop-shadow-lg"
                      />
                      <span className="text-sky-500 dark:text-sky-400">Nemesis</span>
                    </div>
                  </th>
                  <th className="p-8 pb-4 text-xs font-black uppercase tracking-[0.3em] text-slate-400 border-r border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-4">
                      {/* Official Notion logo — renders its own white bg */}
                      <div className="shrink-0 drop-shadow-lg">
                        <NotionLogo size={44} />
                      </div>
                      Notion
                    </div>
                  </th>
                  <th className="p-8 pb-4 text-xs font-black uppercase tracking-[0.2em] text-slate-400 border-r border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#25D366] flex items-center justify-center text-white shrink-0 shadow-lg">
                        <WhatsAppLogo size={20} />
                      </div>
                      WhatsApp
                    </div>
                  </th>
                  <th className="p-8 pb-4 text-xs font-black uppercase tracking-[0.3em] text-slate-400">
                    <div className="flex items-center gap-4">
                      {/* Official Google Classroom logo */}
                      <div className="shrink-0 drop-shadow-lg">
                        <ClassroomLogo size={44} />
                      </div>
                      Google Classroom
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="text-slate-600 dark:text-slate-300 font-medium whitespace-nowrap">
                <tr className="border-b border-slate-100 dark:border-slate-800/50">
                  <td className="p-6 font-bold text-slate-900 dark:text-white">Data Control</td>
                  <td className="p-6 text-emerald-500 font-black">100% Personal Drive</td>
                  <td className="p-6">Company Cloud</td>
                  <td className="p-6">Meta Servers</td>
                  <td className="p-6">Admin Locked</td>
                </tr>
                <tr className="border-b border-slate-100 dark:border-slate-800/50">
                  <td className="p-6 font-bold text-slate-900 dark:text-white">Platform Goal</td>
                  <td className="p-6 text-emerald-500 font-black">Student Workspace</td>
                  <td className="p-6">Business Wiki</td>
                  <td className="p-6">Social Messaging</td>
                  <td className="p-6">Teacher Feed</td>
                </tr>
                <tr className="border-b border-slate-100 dark:border-slate-800/50">
                  <td className="p-6 font-bold text-slate-900 dark:text-white">File Layout</td>
                  <td className="p-6 text-emerald-500 font-black">Organized Subjects</td>
                  <td className="p-6">Complex Databases</td>
                  <td className="p-6">Chaotic Trails</td>
                  <td className="p-6">Static Folders</td>
                </tr>
                <tr>
                  <td className="p-6 font-bold text-slate-900 dark:text-white">Group Study</td>
                  <td className="p-6 text-emerald-500 font-black">Sync in Real-time</td>
                  <td className="p-6">Standard Collab</td>
                  <td className="p-6">Chat Distractions</td>
                  <td className="p-6">Assignment Logic</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
      {/* ─── DEEP DIVE: UNIFIED COMMAND CENTER ─── */}
      <section id="nexus" className="py-24 sm:py-32 px-6 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 relative overflow-hidden [content-visibility:auto] contain-intrinsic-size-[auto_1000px]">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-sky-200/30 dark:from-sky-500/10 via-transparent to-transparent blur-3xl rounded-full z-0 pointer-events-none" />
        <div className="max-w-[1440px] mx-auto relative z-10 text-center">
          <div className="max-w-4xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-sky-50 dark:bg-sky-500/10 border border-sky-100 dark:border-sky-500/20 text-sky-600 dark:text-sky-400 font-black uppercase tracking-[0.2em] text-[10px] sm:text-xs rounded-full mb-6 shadow-sm">
              <Layout size={16} /> Dashboard
            </div>
            <h2 className="text-4xl sm:text-6xl md:text-7xl font-black text-slate-900 dark:text-white uppercase tracking-tight leading-[1.1] mb-6">
              What is the <span className="relative inline-block">
                Unified Nexus?
                <SketchUnderline color="#0ea5e9" className="opacity-60" />
              </span>
            </h2>
            <p className="text-lg sm:text-2xl text-slate-600 dark:text-slate-400 leading-relaxed font-medium max-w-3xl mx-auto">
              Your academic life, consolidated. The Dashboard provides a high-performance overview of your recently used folders, upcoming deadlines, and active study groups.
            </p>
          </div>

          <div className="w-full max-w-[1280px] mx-auto mb-20">
            <BrowserMockup
              src="/showcase/dashboard.png"
              alt="Nemesis Unified Academic Dashboard - Nexus View"
              loading="eager"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-8 max-w-5xl mx-auto text-left">
            <div className="flex gap-5 p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 hover:bg-sky-50/30 dark:hover:bg-slate-800 hover:shadow-xl transition-all duration-300">
              <div className="w-14 h-14 shrink-0 bg-sky-100 dark:bg-sky-500/20 border border-sky-200 dark:border-sky-500/30 rounded-2xl flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-sm">
                <Zap size={28} />
              </div>
              <div>
                <h4 className="text-2xl font-black text-slate-900 dark:text-white mb-2 tracking-tight uppercase">Instant Insights</h4>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-base font-medium">Get a bird's-eye view of your entire semester. Track your progress across subjects and stay ahead of your academic goals with real-time data visualization.</p>
              </div>
            </div>
            <div className="flex gap-5 p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 hover:bg-sky-50/30 dark:hover:bg-slate-800 hover:shadow-xl transition-all duration-300">
              <div className="w-14 h-14 shrink-0 bg-sky-100 dark:bg-sky-500/20 border border-sky-200 dark:border-sky-500/30 rounded-2xl flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-sm">
                <Layout size={28} />
              </div>
              <div>
                <h4 className="text-2xl font-black text-slate-900 dark:text-white mb-2 tracking-tight uppercase">Centralized Access</h4>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-base font-medium">No more digging through folders. Access your most important materials directly from your command center, designed for maximum efficiency and speed.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── DEEP DIVE: THE UNIFIED LIBRARY ─── */}
      <section id="library" className="py-24 sm:py-32 px-6 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 relative overflow-hidden">
        <div className="absolute top-1/2 right-0 -translate-y-1/2 w-[80%] h-[80%] bg-[radial-gradient(circle_at_right,_var(--tw-gradient-stops))] from-sky-200/40 dark:from-sky-500/10 via-transparent to-transparent blur-3xl rounded-full z-0 pointer-events-none" />
        <div className="max-w-[1440px] mx-auto grid lg:grid-cols-[55%_45%] xl:grid-cols-[60%_40%] gap-12 lg:gap-20 items-center relative z-10">
          <div className="order-2 lg:order-1">
            <BrowserMockup
              src="/showcase/organizer.png"
              alt="Nemesis Unified Library - Academic Material Organization"
              loading="lazy"
            />
          </div>
          <div className="order-1 lg:order-2">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-sky-50 dark:bg-sky-500/10 border border-sky-100 dark:border-sky-500/20 text-sky-600 dark:text-sky-400 font-black uppercase tracking-[0.2em] text-[10px] sm:text-xs rounded-full mb-6 shadow-sm">
              <BookOpen size={16} /> Organizer
            </div>
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-black text-slate-900 dark:text-white uppercase tracking-tight leading-[1.1] mb-6">
              How Does the <SketchCircle color="#0ea5e9">Library Work?</SketchCircle>
            </h2>
            <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-400 leading-relaxed font-medium mb-10">
              Stop losing your notes across different apps and folders. Nemesis makes it incredibly easy to keep your study materials organized so you can find them instantly.
            </p>

            <ul className="space-y-4">
              <li className="flex gap-5 p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 hover:bg-white dark:hover:bg-slate-800 hover:shadow-lg transition-all duration-300">
                <div className="w-12 h-12 shrink-0 bg-sky-100 dark:bg-sky-500/20 border border-sky-200 dark:border-sky-500/30 rounded-xl flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-sm mt-1">
                  <Layout size={24} />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-1">The Ultimate Academic Hub</h4>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm sm:text-base font-medium">Nemesis completely replaces your scattered Google Docs, physical notebooks, and random device folders. It is a unified platform designed explicitly to handle your academic workload.</p>
                </div>
              </li>
              <li className="flex gap-5 p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 hover:bg-white dark:hover:bg-slate-800 hover:shadow-lg transition-all duration-300">
                <div className="w-12 h-12 shrink-0 bg-sky-100 dark:bg-sky-500/20 border border-sky-200 dark:border-sky-500/30 rounded-xl flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-sm mt-1">
                  <HardDrive size={24} />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Beyond Simple Storage</h4>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm sm:text-base font-medium">It doesn't just hold your files. Nemesis actively helps you learn by giving you tools to generate mock quizzes from your notes, extract digital flashcards, and track your true study time.</p>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ─── DEEP DIVE: GROUPS & COLLABORATION ─── */}
      <section id="groups" className="py-24 sm:py-32 px-6 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 relative overflow-hidden">
        <div className="absolute top-1/2 left-0 -translate-y-1/2 w-[80%] h-[80%] bg-[radial-gradient(circle_at_left,_var(--tw-gradient-stops))] from-emerald-200/30 dark:from-emerald-500/10 via-transparent to-transparent blur-3xl rounded-full z-0 pointer-events-none" />
        <div className="max-w-[1440px] mx-auto grid lg:grid-cols-[45%_55%] xl:grid-cols-[40%_60%] gap-12 lg:gap-20 items-center relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-[0.2em] text-[10px] sm:text-xs rounded-full mb-6 shadow-sm">
              <Users size={16} /> Group Space
            </div>
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-black text-slate-900 dark:text-white uppercase tracking-tight leading-[1.1] mb-6">
              Study With <span className="relative inline-block">
                Friends
                <SketchUnderline color="#10b981" className="opacity-60" />
              </span>
            </h2>
            <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-400 leading-relaxed font-medium mb-10">
              Group projects don't have to be a mess. Nemesis gives you a dedicated space to work together without getting distracted by social media.
            </p>

            <ul className="space-y-4">
              <li className="flex gap-5 p-5 rounded-2xl bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 hover:bg-emerald-50/30 dark:hover:bg-slate-800 hover:shadow-lg transition-all duration-300">
                <div className="w-12 h-12 shrink-0 bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/30 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm mt-1">
                  <Share2 size={24} />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-1">The End of Chaotic Chats</h4>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm sm:text-base font-medium">Say goodbye to scattered WhatsApp groups mixed with personal messages. Nemesis gives your study groups a dedicated, distraction-free environment built purely for pushing projects forward.</p>
                </div>
              </li>
              <li className="flex gap-5 p-5 rounded-2xl bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 hover:bg-emerald-50/30 dark:hover:bg-slate-800 hover:shadow-lg transition-all duration-300">
                <div className="w-12 h-12 shrink-0 bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/30 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm mt-1">
                  <Layout size={24} />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Collaborative Workspaces</h4>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm sm:text-base font-medium">No more emailing zip files back and forth. Every group gets a shared library, synchronized task board, and real-time whiteboard to map out ideas instantly.</p>
                </div>
              </li>
            </ul>
          </div>
          <BrowserMockup
            src="/showcase/group.png"
            alt="Nemesis Group Study Space - Collaborative Research Environment"
            loading="lazy"
          />
        </div>
      </section>

      {/* ─── DEEP DIVE: STRATEGIC PLANNER ─── */}
      <section id="planner" className="py-24 sm:py-32 px-6 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 relative overflow-hidden">
        <div className="absolute top-1/2 left-0 -translate-y-1/2 w-[80%] h-[80%] bg-[radial-gradient(circle_at_left,_var(--tw-gradient-stops))] from-rose-200/30 dark:from-rose-500/10 via-transparent to-transparent blur-3xl rounded-full z-0 pointer-events-none" />
        <div className="max-w-[1440px] mx-auto grid lg:grid-cols-[55%_45%] xl:grid-cols-[60%_40%] gap-12 lg:gap-20 items-center relative z-10">
          <div className="order-2 lg:order-1">
            <BrowserMockup
              src="/showcase/planner.png"
              alt="Nemesis Strategic Academic Planner - Task Management Hub"
              loading="lazy"
            />
          </div>
          <div className="order-1 lg:order-2">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 font-black uppercase tracking-[0.2em] text-[10px] sm:text-xs rounded-full mb-6 shadow-sm">
              <Calendar size={16} /> Personal Planner
            </div>
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-black text-slate-900 dark:text-white uppercase tracking-tight leading-[1.1] mb-6">
              Track Your <span className="relative inline-block">
                Tasks
                <SketchSparkle color="#f43f5e" className="absolute -top-10 -right-10 w-12 h-12 opacity-60" />
              </span>
            </h2>
            <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-400 leading-relaxed font-medium mb-10">
              Never forget a deadline again. Keep a simple, connected to-do list for your personal homework and group assignments.
            </p>

            <ul className="space-y-4">
              <li className="flex gap-5 p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 hover:bg-white dark:hover:bg-slate-800 hover:shadow-lg transition-all duration-300">
                <div className="w-12 h-12 shrink-0 bg-rose-100 dark:bg-rose-500/20 border border-rose-200 dark:border-rose-500/30 rounded-xl flex items-center justify-center text-rose-600 dark:text-rose-400 shadow-sm mt-1">
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Academic Project Management</h4>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm sm:text-base font-medium">Nemesis brings professional-grade productivity tools to your homework. Visualize your entire semester's deadlines through intuitive drag-and-drop boards.</p>
                </div>
              </li>
              <li className="flex gap-5 p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 hover:bg-white dark:hover:bg-slate-800 hover:shadow-lg transition-all duration-300">
                <div className="w-12 h-12 shrink-0 bg-rose-100 dark:bg-rose-500/20 border border-rose-200 dark:border-rose-500/30 rounded-xl flex items-center justify-center text-rose-600 dark:text-rose-400 shadow-sm mt-1">
                  <Zap size={24} />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Gamified Personal Growth</h4>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm sm:text-base font-medium">Staying organized shouldn't be boring. Complete tasks to earn XP points, achieve badges, and level up your academic standing.</p>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ─── ANDROID APP SHOWCASE ─── */}
      <section id="mobile" className="py-16 sm:py-24 px-6 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 relative overflow-hidden [content-visibility:auto] contain-intrinsic-size-[auto_800px]">
        {/* Glow Blobs */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-sky-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none translate-x-1/2 -translate-y-1/2" />

        <div className="max-w-[1440px] mx-auto relative z-10">
          {/* Centered Section Badge */}
          <div className="text-center mb-16 sm:mb-20">
            <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-sky-50 dark:bg-sky-500/10 border border-sky-100 dark:border-sky-500/20 text-sky-600 dark:text-sky-400 font-black uppercase tracking-[0.2em] text-[10px] sm:text-xs rounded-full shadow-sm">
              <AndroidLogo size={24} className="mb-px" /> Android App
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div className="text-left">
              <h2 className="text-5xl sm:text-7xl md:text-8xl font-black text-slate-900 dark:text-white uppercase tracking-tight leading-[0.95] mb-8">
                Nemesis <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-indigo-500">On Your </span>
                <span className="relative inline-block">
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-indigo-500">Phone</span>
                  <SketchUnderline color="#0EA5E9" className="opacity-80" />
                </span>
              </h2>
              <p className="text-xl sm:text-2xl text-slate-600 dark:text-slate-400 font-medium leading-relaxed max-w-xl mb-12">
                Take your study materials everywhere. Access your notes, track assignments, and organize your tasks—even without an internet connection.
              </p>

              {/* Glass CTAs */}
              <div className="flex flex-wrap items-center gap-6 mb-16">
                <a
                  href="/releases/nemesis-latest.apk"
                  className="group relative px-10 py-5 bg-slate-900 dark:bg-sky-500 text-white font-black rounded-3xl hover:scale-105 transition-all shadow-2xl flex items-center gap-4 uppercase tracking-[0.15em] text-sm overflow-hidden"
                >
                  <Zap size={24} className="fill-current" />
                  <div className="flex flex-col items-start leading-tight">
                    <span className="text-[10px] opacity-70">Direct Download</span>
                    <span>Download APK</span>
                  </div>
                </a>
                <a
                  href="https://f-droid.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-10 py-5 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-black rounded-3xl hover:bg-white dark:hover:bg-slate-900 transition-all flex items-center gap-4 uppercase tracking-[0.15em] text-sm shadow-xl"
                >
                  <Shield size={24} className="text-emerald-500" />
                  <div className="flex flex-col items-start leading-tight">
                    <span className="text-[10px] opacity-70">App Repository</span>
                    <span>F-Droid</span>
                  </div>
                </a>
              </div>

              <div className="grid sm:grid-cols-2 gap-8 border-t border-slate-200 dark:border-slate-800 pt-12">
                {[
                  { title: "Works Offline", desc: "View and edit your study materials anywhere, anytime." },
                  { title: "Always Synced", desc: "Make a change on your phone, and it instantly appears on your laptop." }
                ].map((item, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="w-1.5 h-12 bg-sky-500 rounded-full" />
                    <div>
                      <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-sm mb-1">{item.title}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Premium Carousel */}
            <div className="relative">
              <MobileCarousel />
            </div>
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS & ECOSYSTEM ─── */}
      <section id="sync" className="py-20 px-6 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 relative overflow-hidden [content-visibility:auto] contain-intrinsic-size-[auto_1000px]">
        <div className="absolute top-1/2 left-0 -translate-y-1/2 w-[80%] h-[80%] bg-[radial-gradient(circle_at_left,_var(--tw-gradient-stops))] from-indigo-200/20 dark:from-indigo-500/5 via-transparent to-transparent blur-3xl rounded-full z-0 pointer-events-none" />
        <div className="max-w-[1440px] mx-auto relative z-10">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 rounded-full text-indigo-600 dark:text-indigo-400 text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] mb-4 shadow-sm">
              <Zap size={16} /> How it Works
            </div>
            <h2 className="text-4xl sm:text-6xl font-black text-slate-900 dark:text-white uppercase tracking-tight leading-[1.1] mb-6">
              Setup in <SketchCircle color="#6366f1" className="px-2">Seconds</SketchCircle>, <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-600">Sync Forever</span>
            </h2>
            <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-400 font-medium leading-relaxed max-w-2xl mx-auto">
              Nemesis connects your entire academic workflow into one high-performance command center. Start learning in three simple steps.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12 relative mb-16">
            {/* Connection Line (Desktop) */}
            <div className="hidden md:block absolute top-1/3 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-800 to-transparent z-0" />

            {[
              {
                step: "01",
                title: "Secure OAuth2 Login",
                desc: "Securely link your university or personal Google account. We prioritize privacy with industry-standard 256-bit encryption.",
                icon: <Lock size={28} />,
                color: "sky",
                points: ["Direct Google Auth", "No Passwords Stored", "Privacy Compliant"]
              },
              {
                step: "02",
                title: "Dynamic Vault Sync",
                desc: "Nemesis automatically organizes your academic life by creating a structured vault within your secure Google Drive.",
                icon: <HardDrive size={28} />,
                color: "indigo",
                points: ["Auto-Folder Structure", "Workspace Isolation", "Zero Data Lock-in"]
              },
              {
                step: "03",
                title: "Instant Omni-Sync",
                desc: "Access your dashboard, calendar, and collaborative docs instantly on any device or our Android app.",
                icon: <Globe size={28} />,
                color: "emerald",
                points: ["Real-time Collab", "Offline Support", "Multi-Device Sync"]
              }
            ].map((item, i) => (
              <div key={i} className="group relative z-10 text-center flex flex-col items-center">
                <div className={`w-20 h-20 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:-translate-y-2 transition-all duration-500 relative`}>
                  <div className={`text-${item.color}-500 transition-colors duration-500`}>
                    {React.cloneElement(item.icon as React.ReactElement<{ size?: number }>, { size: 32 })}
                  </div>
                  <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-black flex items-center justify-center text-xs shadow-lg">
                    {item.step}
                  </div>
                </div>
                <h4 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mb-4 tracking-tight uppercase">{item.title}</h4>
                <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 font-medium leading-relaxed mb-6 px-4">{item.desc}</p>

                {/* Feature Points */}
                <div className="flex flex-col gap-2 w-full max-w-[240px]">
                  {item.points.map((point, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100/50 dark:bg-slate-800/50 py-1.5 px-3 rounded-lg border border-slate-200/50 dark:border-slate-700/50 transition-colors duration-300 hover:text-slate-900 dark:hover:text-white">
                      <div className={`w-1.5 h-1.5 rounded-full bg-${item.color}-500 shadow-[0_0_8px_rgba(var(--${item.color}-rgb),0.5)]`} />
                      {point}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Ecosystem Footer (Plays Well with Everything) */}
          <div className="pt-12 border-t border-slate-200 dark:border-slate-800 text-center relative">
            <SketchSparkle className="absolute -top-6 left-1/4 w-12 h-12 text-sky-500 opacity-40 rotate-12 hidden sm:block" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-10">Plays Well with Everything</p>
            <div className="flex flex-wrap justify-center gap-8 sm:gap-12 transition-all duration-500">
              {[
                { name: "Google Drive", icon: <GoogleDriveLogo size={24} />, color: "text-sky-500" },
                { name: "Google Docs", icon: <GoogleDocsLogo size={24} />, color: "text-blue-500" },
                { name: "Calendar", icon: <GoogleCalendarLogo size={24} />, color: "text-rose-500" },
                { name: "Chrome", icon: <ChromeLogo size={24} />, color: "text-amber-500" },
                { name: "Real-time Sync", icon: <RefreshCw size={24} />, color: "text-emerald-500" },
                { name: "Android App", icon: <AndroidLogo size={24} />, color: "text-lime-500" }
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 group cursor-default bg-white/50 dark:bg-slate-900/50 px-5 py-3 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm hover:shadow-md hover:border-sky-500/20 transition-all duration-300">
                  <div className={`group-hover:scale-110 transition-transform`}>{item.icon}</div>
                  <span className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── GOOGLE DATA TRANSPARENCY (Crucial Verification Section) ─── */}
      <section id="transparency" className="py-24 sm:py-32 px-6 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 relative overflow-hidden [content-visibility:auto] contain-intrinsic-size-[auto_1200px]">
        <div className="absolute inset-0 bg-sky-400/5 dark:bg-sky-500/5 pointer-events-none" />
        <div className="max-w-5xl mx-auto relative z-10 text-center">
          <div className="flex flex-col items-center gap-4 mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-sky-100 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-500/20 rounded-full text-sky-600 dark:text-sky-400 text-[10px] sm:text-xs font-black uppercase tracking-[0.2em]">
              <Lock size={16} />
              Safe & Secure
            </div>
            <GoogleVerifiedBadge className="animate-in fade-in slide-in-from-bottom-2 duration-700" />
          </div>
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-black mb-8 tracking-tight uppercase leading-[1.1] text-slate-900 dark:text-white relative inline-block">
            Your Files Live In Your
            <SketchCircle color="#0ea5e9" className="ml-4">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-indigo-500">Google™ Drive</span>
            </SketchCircle>
          </h2>

          {/* ─── Non-AI Google Security Illustration (Code-Driven) ─── */}
          <div className="relative h-32 mb-12 flex items-center justify-center pointer-events-none select-none">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-64 h-64 bg-sky-400/10 dark:bg-sky-500/10 rounded-full blur-3xl animate-pulse" />
            </div>

            <div className="relative z-10 flex items-center justify-center">
              {/* Security Shield Backdrop */}
              <div className="absolute w-40 h-40 border border-sky-200/50 dark:border-sky-500/30 rounded-full animate-[spin_10s_linear_infinite]" />
              <div className="absolute w-48 h-48 border border-dashed border-sky-300/30 dark:border-sky-500/20 rounded-full animate-[spin_20s_linear_infinite_reverse]" />

              {/* Google Drive Official SVG Composition */}
              <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-[2.5rem] shadow-glass border border-white/50 dark:border-slate-700/50 p-6 transform hover:rotate-6 transition-transform duration-700">
                <svg viewBox="0 0 87.3 78" className="w-full h-full drop-shadow-sm">
                  <path fill="#4285F4" d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.85-24h-35c0 1.55.4 3.1 1.2 4.5z" />
                  <path fill="#34A853" d="m27.6 52.8 13.9 24c1.35-.8 2.5-1.9 3.3-3.3l15.85-27.35c.8-1.45 1.2-3 1.2-4.55h-34.3l.05 11.2z" />
                  <path fill="#FBBC04" d="m41.5 52.8h35c0-1.6-.4-3.1-1.2-4.5L59.45 21c-.8-1.4-1.95-2.5-3.3-3.3L42.2 41.7l-.7 11.1z" />
                </svg>

                {/* Security Badge Overlay */}
                <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white rounded-full p-1.5 shadow-lg border-2 border-white dark:border-slate-900 animate-bounce">
                  <ShieldCheck size={16} fill="currentColor" fillOpacity={0.2} />
                </div>
              </div>

              {/* Data Flow Pulses */}
              <div className="absolute -left-32 hidden lg:flex items-center gap-2 opacity-50">
                <div className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
                <div className="h-[1px] w-24 bg-gradient-to-r from-transparent via-sky-400 to-sky-400/20" />
              </div>
              <div className="absolute -right-32 hidden lg:flex items-center gap-2 opacity-50 rotate-180">
                <div className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
                <div className="h-[1px] w-24 bg-gradient-to-r from-transparent via-sky-400 to-sky-400/20" />
              </div>
            </div>
          </div>
          <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-400 font-medium mb-16 leading-relaxed max-w-3xl mx-auto italic">
            Your Intellectual Property, your domain. Nemesis operates as a secure bridge to your private cloud, ensuring every note and study material stays exactly where it belongs—under your permanent, decentralized control.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
            <div className="p-8 sm:p-10 bg-white/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 rounded-[3rem] shadow-premium backdrop-blur-xl hover:border-sky-500/30 transition-all duration-500 group">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 rounded-2xl bg-sky-50 dark:bg-sky-500/10 border border-sky-100 dark:border-sky-500/20 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-110 transition-transform">
                  <HardDrive size={28} className="text-sky-500" />
                </div>
                <h4 className="font-black text-2xl text-slate-900 dark:text-white uppercase tracking-tight">What We Access</h4>
              </div>

              <div className="space-y-6 mb-10 text-slate-700 dark:text-slate-300">
                <div className="flex items-start gap-4">
                  <div className="w-6 h-6 rounded-full bg-sky-500/10 text-sky-500 flex items-center justify-center shrink-0 mt-1">
                    <CheckCircle2 size={14} />
                  </div>
                  <p className="font-medium text-[15px] leading-relaxed">
                    <strong className="text-slate-900 dark:text-slate-100 block mb-1 uppercase text-xs tracking-wider">Selective Scopes (drive.file)</strong>
                    Unlike traditional apps, we use restricted scopes. Nemesis literally cannot see or open any file that wasn't created by the app itself. Your other folders remain invisible to us.
                  </p>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-6 h-6 rounded-full bg-sky-500/10 text-sky-500 flex items-center justify-center shrink-0 mt-1">
                    <CheckCircle2 size={14} />
                  </div>
                  <p className="font-medium text-[15px] leading-relaxed">
                    <strong className="text-slate-900 dark:text-slate-100 block mb-1 uppercase text-xs tracking-wider">Zero-Interception Architecture</strong>
                    Your lecture notes and PDFs move directly between your browser and Google Drive. They never pass through a Nemesis server, ensuring zero exposure of your intellectual property.
                  </p>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-6 h-6 rounded-full bg-sky-500/10 text-sky-500 flex items-center justify-center shrink-0 mt-1">
                    <CheckCircle2 size={14} />
                  </div>
                  <p className="font-medium text-[15px] leading-relaxed">
                    <strong className="text-slate-900 dark:text-slate-100 block mb-1 uppercase text-xs tracking-wider">Unified Settings Sync</strong>
                    We only save a lightweight metadata file to your Drive's app-data folder to sync your theme and layout preferences across devices.
                  </p>
                </div>
              </div>

              <div className="p-7 sm:p-10 bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl border border-white/60 dark:border-slate-800/60 rounded-[2.5rem] shadow-glass relative overflow-hidden group/notice transition-all duration-500 hover:shadow-2xl hover:border-amber-500/30">
                {/* Visual Accent Decoration */}
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover/notice:rotate-12 transition-all duration-700 group-hover/notice:scale-110">
                  <ShieldCheck size={64} className="text-amber-500 drop-shadow-[0_0_15px_rgba(245,158,11,0.3)]" />
                </div>

                <div className="relative z-10 flex flex-col sm:flex-row items-center gap-6">
                  <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center shrink-0 shadow-inner group-hover/notice:scale-110 transition-transform duration-500">
                    <ShieldCheck size={28} className="text-amber-500" />
                  </div>

                  <div className="text-left">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase tracking-[0.2em] mb-3">
                      <GoogleLogo size={14} />
                      Google Verified Application
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-[15px] font-bold leading-relaxed tracking-tight italic">
                      Nemesis is officially verified by Google for secure Drive interaction. We do not request access to your Gmail, Photos, or Personal Contacts.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8 sm:p-10 bg-white/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 rounded-[3rem] shadow-premium backdrop-blur-xl hover:border-emerald-500/30 transition-all duration-500 group">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-110 transition-transform">
                  <Shield size={28} className="text-emerald-500" />
                </div>
                <h4 className="font-black text-2xl text-slate-900 dark:text-white uppercase tracking-tight">Data Ownership</h4>
              </div>

              <div className="space-y-4 mb-8">
                <div className="p-5 bg-white dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800/50 shadow-sm group/card hover:translate-y-[-2px] transition-all">
                  <h5 className="font-black text-slate-900 dark:text-white mb-2 flex items-center gap-2 uppercase text-xs tracking-widest">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" /> Identity Security
                  </h5>
                  <p className="text-slate-500 dark:text-slate-400 text-sm font-medium leading-relaxed">
                    We use <strong>Google OAuth 2.0</strong> for authentication. Your password is never entered into Nemesis; you login directly via Google's secure portal.
                  </p>
                </div>

                <div className="p-5 bg-white dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800/50 shadow-sm group/card hover:translate-y-[-2px] transition-all">
                  <h5 className="font-black text-slate-900 dark:text-white mb-2 flex items-center gap-2 uppercase text-xs tracking-widest">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" /> Permanent Portability
                  </h5>
                  <p className="text-slate-500 dark:text-slate-400 text-sm font-medium leading-relaxed">
                    Even if you stop using Nemesis, your data remains in your Drive. You can download or transfer your notes at any time using standard Google tools.
                  </p>
                </div>

                <div className="p-5 bg-white dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800/50 shadow-sm group/card hover:translate-y-[-2px] transition-all">
                  <h5 className="font-black text-slate-900 dark:text-white mb-2 flex items-center gap-2 uppercase text-xs tracking-widest">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" /> Bank-Grade Infrastructure
                  </h5>
                  <p className="text-slate-500 dark:text-slate-400 text-sm font-medium leading-relaxed">
                    Your materials are protected by Google's multi-billion dollar security infrastructure, including <strong>AES-256</strong> stationary encryption.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">Verified OAuth</span>
                <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">Private-Cloud</span>
                <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">GDPR Compliant</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── TEAM: THE CREATORS ─── */}
      <section id="team" className="py-24 px-6 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 relative overflow-hidden [content-visibility:auto] contain-intrinsic-size-[auto_800px]">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-indigo-500/5 to-transparent pointer-events-none" />
        <div className="max-w-5xl mx-auto text-center relative z-10 flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 rounded-full text-indigo-600 dark:text-indigo-400 text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] mb-8 shadow-sm">
            <Users size={16} />
            The Creators
          </div>
          <h2 className="text-4xl sm:text-6xl font-black mb-8 tracking-tight text-slate-900 dark:text-white leading-[1.1] uppercase relative">
            Meet
            <span className="relative inline-block ml-4">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-indigo-500 font-black">The Creators</span>
              <SketchUnderline color="#6366f1" className="absolute -bottom-4 left-0 w-full h-4 opacity-40" />
            </span>
          </h2>
          <div className="flex flex-col items-center max-w-3xl mx-auto mb-16 space-y-6">
            <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
              We are a small group of thinkers, builders, and dreamers dedicated to building a smarter, unified future for learners worldwide.
            </p>
            <div className="text-left w-full max-w-2xl border-l-4 border-sky-500 pl-5 py-2">
              <p className="text-base sm:text-lg text-slate-500 dark:text-slate-500 italic font-bold">
                "We just don't mould success stories, we make legacy, as we outperform."
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-10 max-w-6xl mx-auto pt-8">
            {[
              {
                name: "Shireesh Kashyap",
                role: "Team Leader | Architect",
                img: "/shireesh.webp",
                zoom: 1.05,
                pos: "center 15%",
                links: { instagram: "https://www.instagram.com/shiresh.kashyap/", whatsapp: "https://wa.me/919450804495", mail: "mailto:shireesh@nemesiss.in" }
              },
              {
                name: "Shashwat Patel",
                role: "QA Lead",
                img: "/shashwat.webp",
                zoom: 1.1,
                pos: "center 20%",
                links: { instagram: "https://www.instagram.com/shashwat.01__/", whatsapp: "https://wa.me/917007817874" }
              },
              {
                name: "Shivam Kumar",
                role: "Strategic Consultant",
                img: "/shivam.webp",
                zoom: 1.15,
                pos: "center 10%",
                links: { instagram: "https://www.instagram.com/its_shivam_9890/", whatsapp: "https://wa.me/919305638947" }
              }
            ].map((member, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 + (i * 0.1), duration: 0.8 }}
                className="group relative"
              >
                {/* Dynamic Background Glow */}
                <div className="absolute inset-0 bg-sky-400/20 dark:bg-sky-500/10 blur-[60px] -z-10 group-hover:bg-sky-400/30 transition-colors duration-700 opacity-0 group-hover:opacity-100" />

                {/* Premium Glass Container */}
                <div className="relative overflow-hidden bg-white/40 dark:bg-slate-800/20 backdrop-blur-2xl rounded-[3rem] shadow-glass border border-white/60 dark:border-slate-700/30 group-hover:border-sky-500/50 group-hover:shadow-sky-500/10 transition-all duration-700 p-3">

                  {/* Image Compartment */}
                  <div className="relative aspect-[4/5] rounded-[2.5rem] overflow-hidden bg-slate-100 dark:bg-slate-900 shadow-inner group">
                    <img
                      src={member.img}
                      alt={`${member.name} - Nemesis ${member.role}`}
                      className="w-full h-full object-cover transition-all duration-1000 grayscale-0 sm:grayscale sm:group-hover:grayscale-0 group-hover:scale-105"
                      style={{ objectPosition: member.pos, transform: `scale(${member.zoom})` }}
                    />

                    {/* Dark/Edge Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                    {/* Social Action Bar */}
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 translate-y-12 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-500 delay-100">
                      {(member.links as any).instagram && (
                        <a href={(member.links as any).instagram} target="_blank" rel="noopener noreferrer" className="p-3 bg-white/10 dark:bg-black/20 backdrop-blur-md rounded-2xl border border-white/20 hover:bg-gradient-to-tr hover:from-[#F58529] hover:via-[#DD2A7B] hover:to-[#8134AF] hover:border-white/40 transition-all duration-300 text-white">
                          <Instagram size={18} />
                        </a>
                      )}
                      {(member.links as any).whatsapp && (
                        <a href={(member.links as any).whatsapp} target="_blank" rel="noopener noreferrer" className="p-3 bg-white/10 dark:bg-black/20 backdrop-blur-md rounded-2xl border border-white/20 hover:bg-[#25D366] hover:border-[#25D366] transition-all duration-300 text-white">
                          <MessageCircle size={18} />
                        </a>
                      )}
                      {(member.links as any).mail && (
                        <a href={(member.links as any).mail} className="p-3 bg-white/10 dark:bg-black/20 backdrop-blur-md rounded-2xl border border-white/20 hover:bg-[#EA4335] hover:border-[#EA4335] transition-all duration-300 text-white">
                          <Mail size={18} />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Content Compartment */}
                  <div className="px-4 py-8 text-center relative">
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                      <div className="px-3 py-1 bg-sky-500 text-white text-[9px] font-black uppercase tracking-widest rounded-full shadow-lg">
                        Active Now
                      </div>
                    </div>

                    <h4 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-2 transition-colors duration-500 group-hover:text-sky-500">
                      {member.name}
                    </h4>

                    {/* Tactical Badge Role */}
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-xl">
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
                      <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{member.role}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-16">
            <Link to="/dev-team" className="inline-flex items-center gap-2 text-slate-500 hover:text-sky-500 font-bold uppercase tracking-widest text-sm transition-colors group">
              View Full Profiles <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── PRICING: THE COST ─── */}
      <section id="pricing" className="py-24 px-6 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 relative overflow-hidden">
        {/* Expanded Background Decor */}
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_30%_20%,_var(--tw-gradient-stops))] from-sky-500/5 via-transparent to-transparent pointer-events-none" />





        <div className="max-w-screen-2xl mx-auto relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-full text-emerald-600 dark:text-emerald-400 text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] mb-8 shadow-sm">
            <Zap size={16} />
            The Cost
          </div>
          <h2 className="text-4xl sm:text-6xl font-black mb-8 tracking-tight uppercase leading-[0.9] text-slate-900 dark:text-white">
            Elite Access, <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-sky-500">Zero Cost</span>
          </h2>
          <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-400 font-medium mb-16 leading-relaxed max-w-3xl mx-auto">
            Nemesis is elite academic software, but our mission is impact. While the platform remains free for every student on the planet, your support ensures our global sustainability. Contribute via UPI to help us maintain elite performance and keep the mission alive.
          </p>

          <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-stretch">
            {/* ─── ELITE STUDENT CARD ─── */}
            <div className="group relative">
              <div className="h-full p-4 bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl border border-white/50 dark:border-slate-800 rounded-[3rem] shadow-glass relative group-hover:-translate-y-2 transition-all duration-500">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-6 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] font-black uppercase tracking-widest rounded-full shadow-2xl z-30 ring-4 ring-slate-50 dark:ring-slate-950">
                  Most Popular
                </div>
                <div className="rounded-[2.5rem] p-10 sm:p-14 text-center relative z-10 flex flex-col h-full">
                  <h4 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">Elite Access</h4>
                  <div className="flex items-center justify-center gap-1 mb-8">
                    <span className="text-4xl sm:text-6xl font-black text-slate-900 dark:text-white">$0</span>
                    <span className="text-slate-400 font-bold uppercase tracking-widest text-xs mt-4">/ Month</span>
                  </div>

                  <ul className="space-y-6 text-left mb-12 flex-grow">
                    {[
                      "Unlimited Academic Subjects",
                      "Unified Library (Connected to Drive)",
                      "Real-time Synchronized Groups",
                      "Integrated Task Planner",
                      "High-Fidelity Document Viewer",
                      "Advanced Search Engine"
                    ].map((feature, i) => (
                      <li key={i} className="flex items-center gap-3 text-slate-600 dark:text-slate-300 font-bold text-sm sm:text-base">
                        <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                          <CheckCircle2 size={14} />
                        </div>
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <Link
                    to="/signup"
                    className="w-full py-5 bg-sky-500 text-white font-black rounded-2xl hover:bg-sky-400 transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2 uppercase tracking-widest text-sm"
                  >
                    Get Started Now <ChevronRight size={18} />
                  </Link>
                </div>
              </div>
            </div>

            {/* ─── CORE UPLINK (DONATION) ─── */}
            <div className="group relative">
              <div className="h-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[3.5rem] shadow-glass relative group-hover:-translate-y-2 transition-all duration-500 overflow-hidden flex flex-col sm:flex-row">
                {/* Left Panel: Nexus Status */}
                <div className="w-full sm:w-[40%] bg-gradient-to-br from-sky-600 via-indigo-600 to-slate-900 p-10 sm:p-12 flex flex-col items-center justify-between text-center text-white relative border-b sm:border-b-0 sm:border-r border-white/40 shrink-0">
                  <div className="relative space-y-4 z-10 flex flex-col items-center">
                    <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center border border-white/30 shadow-xl backdrop-blur-xl animate-float">
                      <HeartHandshake size={32} className="text-white" />
                    </div>
                    <div className="space-y-1">
                      <h5 className="text-white font-black text-2xl uppercase tracking-[0.2em] drop-shadow-lg leading-tight">UPI <br className="sm:hidden" /> DONATION</h5>
                      <p className="text-[10px] text-sky-300 font-black uppercase tracking-[0.3em]">Support Nemesis</p>
                    </div>
                  </div>

                  <div className="relative z-10 p-3 sm:p-4 rounded-[3rem] border border-white/10 shadow-sky-500/20 shadow-2xl bg-white/5 backdrop-blur-md animate-float [animation-delay:1s] group w-full max-w-[380px]">
                    <div className="bg-white p-2 sm:p-3 rounded-[2.5rem] shadow-xl relative flex items-center justify-center transition duration-500 group-hover:scale-[1.05] group-hover:rotate-1">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=upi://pay?pa=shiresh.kashyap@oksbi&pn=Nemesis%20Project&cu=INR&am=${contributionAmount}&margin=1&bgcolor=ffffff&color=0ea5e9`}
                        alt="Nemesis Project UPI QR Code for Supportive Contributions"
                        className="w-full aspect-square object-contain rounded-xl"
                      />
                    </div>
                  </div>

                  {/* Bottom Status Badge */}
                  <div className="relative w-full max-w-[240px] px-6 py-4 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 flex flex-col items-center gap-2 z-10 shadow-2xl group/status transition-all hover:bg-white/15">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(16,185,129,1)]" />
                      <span className="text-sm font-black text-emerald-400 uppercase tracking-[0.3em]">Active Status</span>
                    </div>
                    <div className="w-full h-[1px] bg-white/10" />
                    <p className="text-[10px] font-mono font-bold text-sky-200/60 uppercase tracking-widest group-hover:text-sky-200 transition-colors">Latency: 0.02ms</p>
                  </div>
                </div>

                {/* Right Panel: Contribution Details */}
                <div className="w-full sm:w-[60%] p-10 sm:p-12 flex flex-col justify-between items-center text-center bg-gradient-to-tr from-white to-slate-50 dark:from-slate-900 dark:to-slate-800 relative">
                  <AnimatePresence mode="wait">
                    {!isPaid ? (
                      <motion.div
                        key="config"
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className="w-full flex-grow flex flex-col justify-between"
                      >
                        <div className="w-full flex flex-col items-center">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-10 opacity-70">Contribution Level</p>

                          <div className="flex justify-center gap-4 mb-14 w-full px-2">
                            {[100, 500, 1000].map((amt) => (
                              <button
                                key={amt}
                                onClick={() => setContributionAmount(amt)}
                                className={`flex-1 py-4.5 px-2 rounded-2xl font-black text-sm transition-all duration-300 ${contributionAmount === amt
                                  ? 'bg-[#00a3ff] text-white shadow-[0_15px_30px_rgba(0,163,255,0.3)] scale-105'
                                  : 'bg-slate-50/50 dark:bg-slate-800/50 text-slate-400 hover:bg-slate-100'
                                  }`}
                              >
                                ₹{amt}
                              </button>
                            ))}
                          </div>

                          <div className="mb-14 relative flex flex-col items-center">
                            <div className="flex items-start">
                              <span className="text-3xl font-black text-slate-300 dark:text-slate-700 mt-4 mr-2">₹</span>
                              <span className="text-7xl sm:text-8xl font-black text-[#1a1a1a] dark:text-white leading-none tracking-tighter">
                                {contributionAmount}
                              </span>
                            </div>
                            <p className="text-[11px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-[0.4em] mt-4">INR Contribution</p>
                          </div>
                        </div>

                        <div className="w-full space-y-6">
                          <button
                            onClick={handleDonateNow}
                            className="group relative w-full py-6 bg-gradient-to-r from-[#00c6ff] via-[#00a3ff] to-[#0072ff] text-white font-black rounded-3xl hover:translate-y-[-2px] hover:shadow-[0_20px_40px_rgba(0,163,255,0.4)] transition-all duration-300 active:scale-95 flex items-center justify-center gap-3 uppercase tracking-[0.2em] text-sm shadow-xl overflow-hidden"
                          >
                            <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.2)_50%,transparent_75%)] bg-[length:250%_250%] animate-shimmer pointer-events-none" />
                            <Zap size={22} className="fill-white relative z-10" />
                            <span className="relative z-10 text-[11px] tracking-[0.4em]">
                              {typeof window !== 'undefined' && (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth <= 768) ? 'Donate Now' : 'Done'}
                            </span>
                          </button>

                          <div className="p-5 bg-white dark:bg-slate-950/40 rounded-[2rem] border border-slate-100 dark:border-slate-800/50 shadow-sm flex items-center justify-between gap-6 group/id">
                            <div className="text-left pl-2">
                              <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Global UPI ID</p>
                              <p className="text-[12px] font-mono font-bold text-slate-600 dark:text-slate-300 tracking-tight">shiresh.kashyap@oksbi</p>
                            </div>
                            <button
                              onClick={handleCopy}
                              className={`p-3 rounded-2xl transition-all duration-300 border shadow-sm ${copied
                                ? 'bg-emerald-500 border-emerald-500 text-white'
                                : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-400 hover:text-sky-500 hover:border-sky-100'
                                }`}
                            >
                              {copied ? <Check size={18} /> : <Copy size={18} />}
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="success"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center justify-center text-center space-y-8 py-10"
                      >
                        <div className="w-24 h-24 bg-emerald-500/10 rounded-[2rem] flex items-center justify-center text-emerald-600 border border-white/40 shadow-xl backdrop-blur-xl">
                          <CheckCircle2 size={48} strokeWidth={2.5} />
                        </div>
                        <div className="space-y-3">
                          <h4 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">THANK YOU</h4>
                          <p className="text-xs text-slate-500 font-bold uppercase tracking-[0.2em] max-w-xs leading-relaxed">Your contribution has been recorded. We appreciate your support in building the future of Nemesis.</p>
                        </div>
                        <button
                          onClick={() => setIsPaid(false)}
                          className="px-10 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-black uppercase tracking-[0.3em] text-[10px] shadow-2xl hover:scale-105 active:scale-95 transition"
                        >
                          RETURN TO UPLINK
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>



      {/* ─── CTA: THE FINAL PUSH ─── */}
      <section className="py-32 px-6 bg-[#f8fafc] dark:bg-[#030712] text-center relative overflow-hidden border-t border-slate-200 dark:border-slate-850">
        {/* Glow Effects */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] z-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-sky-400/20 dark:from-sky-500/10 via-transparent to-transparent blur-3xl opacity-60 pointer-events-none" />

        {/* External Badge */}
        <div className="inline-flex items-center gap-3 px-6 py-2.5 bg-gradient-to-r from-[#00c6ff] via-[#00a3ff] to-[#0072ff] rounded-full text-white text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] mb-12 shadow-xl shadow-sky-500/20 relative z-20 hover:scale-105 transition-transform duration-300">
          <Zap size={18} className="fill-white" /> The Final Push
        </div>

        <div className="max-w-4xl mx-auto relative z-10 p-12 sm:p-20 bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl border border-white/50 dark:border-slate-700/50 rounded-[3.5rem] shadow-glass">
          <h2 className="text-5xl sm:text-8xl font-black mb-8 tracking-tight uppercase leading-[0.85] text-transparent bg-clip-text bg-gradient-to-br from-slate-900 via-sky-600 to-indigo-600 dark:from-white dark:via-sky-400 dark:to-indigo-400 relative">
            Ready to <span className="relative inline-block text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-emerald-500">
              Ascend?
              <SketchStar color="#0ea5e9" className="absolute -top-16 -right-16 w-24 h-24 rotate-12 opacity-40 hidden sm:block" />
            </span>
          </h2>
          <p className="text-xl sm:text-2xl font-bold mb-12 text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Stop struggling with messy folders and lost notes. Master your semester today.
          </p>
          <Link
            to="/signup"
            className="px-12 py-5 bg-sky-500 text-white font-black rounded-full hover:bg-sky-400 transition-all shadow-xl shadow-sky-500/20 active:scale-95 inline-flex items-center gap-2 uppercase tracking-widest text-lg group"
          >
            Create Free Account <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="py-20 px-6 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-5 gap-12 sm:gap-16 text-slate-900 dark:text-slate-100">
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-8">
              <img src="/logo.svg" alt="Nemesis" className="w-10 h-10" />
              <span className="text-2xl font-black tracking-tight uppercase text-sky-500">NEMESIS</span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-md mb-8">
              Nemesis is a high fidelity, premium academic workspace designed to consolidate the fractured learning experience into a single, cohesive "Nexus". Built with a focus on privacy first data sovereignty, real time collaboration, and high fidelity aesthetics.
            </p>
            <div className="flex items-center gap-6">
              <a href="https://github.com/Sh123e5h/Nemesis" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-sky-500 transition-colors">
                <Github size={24} />
              </a>
              <a href="mailto:shiresh.kashyap@gmail.com" className="text-slate-400 hover:text-sky-500 transition-colors">
                <Mail size={24} />
              </a>
              <a href="https://www.instagram.com/shiresh.kashyap/" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-pink-500 transition-colors">
                <Instagram size={24} />
              </a>
              <a href="https://www.linkedin.com/in/shireeshkashyap/" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-sky-600 transition-colors">
                <Linkedin size={24} />
              </a>
            </div>
          </div>

          <div>
            <h5 className="font-black uppercase tracking-widest text-xs mb-8 text-slate-400">Legal Compliance</h5>
            <div className="flex flex-col gap-4 text-sm font-bold">
              <Link to="/privacy" className="hover:text-sky-500 transition-colors flex items-center gap-2"><Shield size={16} /> Privacy Policy</Link>
              <Link to="/terms" className="hover:text-sky-500 transition-colors flex items-center gap-2"><Lock size={16} /> Terms of Service</Link>
            </div>
          </div>

          <div>
            <h5 className="font-black uppercase tracking-widest text-xs mb-8 text-slate-400">Project</h5>
            <div className="flex flex-col gap-4 text-sm font-bold">
              <Link to="/dev-team" className="hover:text-sky-500 transition-colors">Meet the Team</Link>
              <Link to="/faq" className="hover:text-sky-500 transition-colors">Help & FAQ</Link>
            </div>
          </div>

          <div>
            <h5 className="font-black uppercase tracking-widest text-xs mb-8 text-slate-400">Contact</h5>
            <div className="flex flex-col gap-4 text-sm font-bold">
              <a
                href="mailto:support@nemesiss.in"
                className="hover:text-sky-500 transition-colors flex items-center gap-2"
              >
                <Mail size={16} className="shrink-0" />
                support@nemesiss.in
              </a>
              <a
                href="tel:+919450804495"
                className="hover:text-sky-500 transition-colors flex items-center gap-2"
              >
                <Phone size={16} className="shrink-0" />
                +91-9450804495
              </a>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto mt-20 pt-8 border-t border-slate-100 dark:border-slate-800 text-center md:text-left flex flex-col sm:flex-row justify-between items-center gap-6">
          <div className="flex flex-col gap-2">
            <p className="text-slate-400 text-[10px] sm:text-xs font-bold uppercase tracking-widest">
              &copy; {new Date().getFullYear()} Built with ❤️ by Team Genesis. All rights reserved.
            </p>
            <div className="flex items-center justify-center md:justify-start">
              <GoogleVerifiedBadge className="transition-all" />
            </div>
          </div>
          <p className="text-slate-500 text-[10px] sm:text-xs font-medium max-w-xl text-center sm:text-right">
            Google Drive™ is a trademark of Google LLC. Use of this trademark is subject to Google Permissions. Nemesis is not affiliated with or endorsed by Google LLC.
          </p>
        </div>
      </footer>
    </div>
  );
}
