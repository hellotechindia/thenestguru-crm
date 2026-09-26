'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import {
  Bell,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  Volume2,
  VolumeX,
  Check,
  Briefcase,
  FileText,
  UserCheck,
  Sparkles,
  X,
  ArrowRight,
  Radio
} from 'lucide-react';
import {
  getNotificationsAction,
  markNotificationAsReadAction,
} from '@/app/actions';

interface NotificationItem {
  id: string;
  userId?: string | null;
  title: string;
  message: string;
  type: string;
  link?: string | null;
  isRead: boolean;
  createdAt: string | Date;
}

// Global AudioContext cache & user-interaction primer
let sharedAudioCtx: AudioContext | null = null;

function getOrCreateAudioContext(): AudioContext | null {
  try {
    if (typeof window === 'undefined') return null;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
      sharedAudioCtx = new AudioContextClass();
    }
    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  } catch (e) {
    return null;
  }
}

// Web Audio API Synthesized Crystal 3-Tone Chime Tune (E5 -> G#5 -> B5)
function playNotificationChime() {
  try {
    const ctx = getOrCreateAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Tone 1: E5 (659.25 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0.18, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.3);

    // Tone 2: G#5 (830.61 Hz) at +0.10s
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(830.61, now + 0.10);
    gain2.gain.setValueAtTime(0.001, now);
    gain2.gain.setValueAtTime(0.22, now + 0.10);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.10);
    osc2.stop(now + 0.45);

    // Tone 3: B5 (987.77 Hz) at +0.22s
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(987.77, now + 0.22);
    gain3.gain.setValueAtTime(0.001, now);
    gain3.gain.setValueAtTime(0.28, now + 0.22);
    gain3.gain.exponentialRampToValueAtTime(0.0001, now + 0.75);
    osc3.connect(gain3);
    gain3.connect(ctx.destination);
    osc3.start(now + 0.22);
    osc3.stop(now + 0.75);
  } catch (e) {
    console.warn('AudioContext playback error:', e);
  }
}

function timeAgo(date: string | Date): string {
  const d = new Date(date);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (diffSec < 15) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function NotificationBell() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isOpen, setIsOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  // Live Toast Alerts Stack for floating real-time cards
  const [liveToasts, setLiveToasts] = useState<NotificationItem[]>([]);
  const [mounted, setMounted] = useState(false);

  // Track known notification IDs to detect brand new incoming ones
  const knownIdsRef = useRef<Set<string>>(new Set());
  const initialLoadDoneRef = useRef(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-dismiss oldest live toast after 8 seconds so they don't block the screen
  useEffect(() => {
    if (liveToasts.length === 0) return;
    const timer = setTimeout(() => {
      setLiveToasts((prev) => prev.slice(1));
    }, 8000);
    return () => clearTimeout(timer);
  }, [liveToasts]);

  // Prime audio context on user's first click anywhere on the page
  useEffect(() => {
    const handleFirstInteraction = () => {
      getOrCreateAudioContext();
    };
    window.addEventListener('click', handleFirstInteraction, { once: true });
    window.addEventListener('keydown', handleFirstInteraction, { once: true });
    return () => {
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };
  }, []);

  // Load sound preference from localStorage
  useEffect(() => {
    const pref = localStorage.getItem('nestguru_notif_sound');
    if (pref !== null) {
      setSoundEnabled(pref === 'true');
    }
  }, []);

  const toggleSound = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextVal = !soundEnabled;
    setSoundEnabled(nextVal);
    localStorage.setItem('nestguru_notif_sound', String(nextVal));
    if (nextVal) {
      playNotificationChime();
    }
  };

  // Test sound & trigger sample toast
  const handleTestAlert = () => {
    playNotificationChime();
    const testToast: NotificationItem = {
      id: `test_${Date.now()}`,
      title: 'Real-Time Alert Sound Active',
      message: 'System is monitoring database & dashboard events live. Tune is enabled!',
      type: 'SUCCESS',
      isRead: false,
      createdAt: new Date(),
    };
    setLiveToasts((prev) => [testToast, ...prev.slice(0, 3)]);
  };

  // Dismiss a live toast card
  const dismissToast = (toastId: string) => {
    setLiveToasts((prev) => prev.filter((t) => t.id !== toastId));
  };

  // Fetch notifications action
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await getNotificationsAction();
      if (res.success && Array.isArray(res.notifications)) {
        const incoming = res.notifications as NotificationItem[];

        // Check if there are brand new notifications that weren't in knownIdsRef
        if (initialLoadDoneRef.current) {
          const newItems = incoming.filter(
            (item) => !item.isRead && !knownIdsRef.current.has(item.id)
          );

          if (newItems.length > 0) {
            // Play notification tune if sound is enabled
            if (soundEnabled) {
              playNotificationChime();
            }

            // Push to floating live toasts (max 4 on screen)
            setLiveToasts((prev) => [...newItems, ...prev].slice(0, 4));
          }
        }

        // Update known IDs
        const newSet = new Set<string>();
        incoming.forEach((n) => newSet.add(n.id));
        knownIdsRef.current = newSet;
        initialLoadDoneRef.current = true;

        setNotifications(incoming);
        setUnreadCount(res.unreadCount || 0);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  }, [soundEnabled]);

  // Initial fetch and high-frequency real-time polling (every 3.5 seconds)
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 3500);

    // Fetch immediately when tab becomes visible / focused
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchNotifications();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', fetchNotifications);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', fetchNotifications);
    };
  }, [fetchNotifications]);

  // Auto-dismiss live toasts after 6 seconds
  useEffect(() => {
    if (liveToasts.length === 0) return;
    const timer = setTimeout(() => {
      setLiveToasts((prev) => prev.slice(0, prev.length - 1));
    }, 6000);
    return () => clearTimeout(timer);
  }, [liveToasts]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleMarkAllRead = async () => {
    await markNotificationAsReadAction(undefined, true);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    setLiveToasts([]);
  };

  const handleNotificationClick = async (notif: NotificationItem) => {
    if (!notif.isRead) {
      await markNotificationAsReadAction(notif.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      dismissToast(notif.id);
    }

    if (notif.link) {
      setIsOpen(false);
      router.push(notif.link);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'SUCCESS':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />;
      case 'WARNING':
        return <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />;
      case 'CASE_UPDATE':
        return <Briefcase className="w-4 h-4 text-sky-500 shrink-0" />;
      case 'TASK_UPDATE':
        return <FileText className="w-4 h-4 text-purple-500 shrink-0" />;
      default:
        return <Clock className="w-4 h-4 text-indigo-500 shrink-0" />;
    }
  };

  return (
    <>
      <div className="relative shrink-0" ref={dropdownRef}>
        {/* Bell Trigger Button */}
        <button
          onClick={() => {
            setIsOpen(!isOpen);
            getOrCreateAudioContext();
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          title={
            unreadCount > 0
              ? `${unreadCount} unread notification(s) • Live chime active`
              : 'Real-time Notifications'
          }
          className="relative p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 hover:border-sky-300 transition-all shadow-sm cursor-pointer"
        >
          <Bell className={`w-4 h-4 transition-transform ${isHovered ? 'rotate-12' : ''}`} />

          {/* Unread Ping / Badge */}
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-600 text-white text-[9px] font-extrabold items-center justify-center shadow-sm">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            </span>
          )}
        </button>

        {/* Notifications Dropdown Drawer */}
        {isOpen && (
          <div className="absolute right-0 mt-2 w-80 sm:w-96 max-w-[calc(100vw-2rem)] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
            {/* Header */}
            <div className="px-4 py-3 bg-gradient-to-r from-sky-500/10 via-indigo-500/5 to-transparent border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                <h3 className="text-xs font-extrabold text-slate-900 dark:text-white">
                  Real-Time Updates
                </h3>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800">
                    {unreadCount} new
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1">
                {/* Test Sound Button */}
                <button
                  onClick={handleTestAlert}
                  title="Test notification tune and popup"
                  className="px-2 py-0.5 text-[10px] font-bold rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1 transition"
                >
                  <Sparkles className="w-3 h-3" /> Test Tune
                </button>

                {/* Sound Toggle */}
                <button
                  onClick={toggleSound}
                  title={soundEnabled ? 'Mute notification tune' : 'Unmute notification tune'}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  {soundEnabled ? (
                    <Volume2 className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                  ) : (
                    <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              {notifications.length > 0 ? (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`p-3.5 flex items-start gap-3 transition cursor-pointer ${
                      notif.isRead
                        ? 'bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800/40 opacity-75'
                        : 'bg-sky-50/50 dark:bg-sky-950/20 hover:bg-sky-50 dark:hover:bg-sky-950/30'
                    }`}
                  >
                    <div className="mt-0.5">{getTypeIcon(notif.type)}</div>
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className={`text-xs font-bold truncate ${
                            notif.isRead
                              ? 'text-slate-700 dark:text-slate-300'
                              : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          {notif.title}
                        </span>
                        <span className="text-[10px] text-slate-400 whitespace-nowrap">
                          {timeAgo(notif.createdAt)}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2">
                        {notif.message}
                      </p>
                      {notif.link && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-sky-600 dark:text-sky-400 pt-0.5">
                          View details <ArrowRight className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </div>
                    {!notif.isRead && (
                      <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0 mt-1" />
                    )}
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-slate-400 space-y-1">
                  <Bell className="w-6 h-6 mx-auto opacity-40 mb-1" />
                  <p>No notifications yet</p>
                  <p className="text-[10px] opacity-75">
                    Updates to cases, stages, visits, and follow-ups will appear here live.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px]">
              <span className="text-slate-400 text-[10px] flex items-center gap-1">
                <Radio className="w-3 h-3 text-emerald-500 animate-pulse" /> Live Real-time Sync Active
              </span>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="font-semibold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Check className="w-3 h-3" /> Mark all read
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Floating Real-Time Toast Alert Stack rendered into document.body via Portal to prevent any header clipping */}
      {mounted && typeof document !== 'undefined' && liveToasts.length > 0 && createPortal(
        <div className="fixed bottom-6 right-6 z-[999999] flex flex-col gap-3 max-w-sm sm:max-w-md w-full pointer-events-none px-4 sm:px-0">
          {liveToasts.map((toast) => (
            <div
              key={toast.id}
              className="pointer-events-auto w-full p-4 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-2xl space-y-2 animate-in slide-in-from-right-8 duration-300 ring-1 ring-black/5 dark:ring-white/10"
            >
              {/* Top Bar: Icon, Title & Close */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded-lg bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800">
                    {getTypeIcon(toast.type)}
                  </span>
                  <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                    {toast.title}
                  </span>
                </div>
                <button
                  onClick={() => dismissToast(toast.id)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Description: Mention what was updated */}
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                {toast.message}
              </p>

              {/* Action link & timestamp */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 text-[10px]">
                <span className="text-slate-400 font-mono">{timeAgo(toast.createdAt)}</span>
                {toast.link ? (
                  <button
                    onClick={() => {
                      dismissToast(toast.id);
                      router.push(toast.link!);
                    }}
                    className="font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    View Update <ArrowRight className="w-3 h-3" />
                  </button>
                ) : (
                  <span className="text-emerald-500 font-semibold flex items-center gap-0.5">
                    <CheckCircle2 className="w-3 h-3" /> Updated
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}
