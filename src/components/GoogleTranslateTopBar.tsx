'use client';

import { useEffect, useState } from 'react';
import { Languages, Check } from 'lucide-react';

declare global {
  interface Window {
    google?: any;
    googleTranslateElementInit?: () => void;
  }
}

export default function GoogleTranslateTopBar() {
  const [currentLang, setCurrentLang] = useState<'en' | 'hi'>('en');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Check initial cookie
    if (typeof document !== 'undefined') {
      const match = document.cookie.match(/(^|;)\s*googtrans=([^;]+)/);
      if (match && match[2].includes('/hi')) {
        setCurrentLang('hi');
      } else {
        const savedLocale = localStorage.getItem('crm_locale');
        if (savedLocale === 'hi') {
          setCurrentLang('hi');
        }
      }
    }

    // Ensure single container on document.body outside React VDOM
    if (!document.getElementById('google_translate_element')) {
      const el = document.createElement('div');
      el.id = 'google_translate_element';
      el.style.display = 'none';
      document.body.appendChild(el);
    }

    // Add Google Translate Script if not already loaded
    if (!document.getElementById('google-translate-script')) {
      window.googleTranslateElementInit = () => {
        try {
          if (window.google?.translate?.TranslateElement) {
            new window.google.translate.TranslateElement(
              {
                pageLanguage: 'en',
                includedLanguages: 'en,hi',
                layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
                autoDisplay: false,
              },
              'google_translate_element'
            );
          }
        } catch (e) {
          console.error('Google Translate init error:', e);
        }
      };

      const script = document.createElement('script');
      script.id = 'google-translate-script';
      script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const changeLanguage = (lang: 'en' | 'hi') => {
    setCurrentLang(lang);
    setIsOpen(false);
    localStorage.setItem('crm_locale', lang);
    window.dispatchEvent(new CustomEvent('crm_locale_changed', { detail: { locale: lang } }));

    const cookieVal = lang === 'hi' ? '/en/hi' : '/en/en';
    const hostname = window.location.hostname;

    // Set cookies across root and domain
    document.cookie = `googtrans=${cookieVal}; path=/;`;
    if (hostname && hostname !== 'localhost') {
      document.cookie = `googtrans=${cookieVal}; path=/; domain=${hostname};`;
      const parts = hostname.split('.');
      if (parts.length > 2) {
        document.cookie = `googtrans=${cookieVal}; path=/; domain=.${parts.slice(-2).join('.')};`;
      }
    }

    // Attempt to trigger select element directly
    const combo = document.querySelector('.goog-te-combo') as HTMLSelectElement | null;
    if (combo) {
      combo.value = lang;
      combo.dispatchEvent(new Event('change'));
    } else {
      // Refresh to apply full-page DOM translation
      window.location.reload();
    }
  };

  return (
    <div className="relative inline-block text-left" suppressHydrationWarning>

      {/* Modern Top Header Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-sm cursor-pointer ${
          currentLang === 'hi'
            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
            : 'bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 hover:text-sky-600'
        }`}
        title="Puri Website Hindi / English me convert karein"
      >
        <Languages className="w-3.5 h-3.5 text-sky-500 shrink-0" />
        <span>{currentLang === 'hi' ? 'हिन्दी (Hindi)' : 'English (EN)'}</span>
      </button>

      {/* Language Switcher Dropdown */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-44 rounded-2xl bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-slate-800 p-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-150">
            <div className="px-2.5 py-1.5 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
              Website Language
            </div>

            <button
              type="button"
              onClick={() => changeLanguage('en')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left font-semibold transition-colors ${
                currentLang === 'en'
                  ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span>English (Default)</span>
              {currentLang === 'en' && <Check className="w-3.5 h-3.5 text-sky-600" />}
            </button>

            <button
              type="button"
              onClick={() => changeLanguage('hi')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left font-semibold transition-colors ${
                currentLang === 'hi'
                  ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <div className="leading-tight">
                <div>हिन्दी (Hindi)</div>
                <div className="text-[10px] text-slate-400 font-normal">पूरा पोर्टल हिन्दी में</div>
              </div>
              {currentLang === 'hi' && <Check className="w-3.5 h-3.5 text-amber-600" />}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
