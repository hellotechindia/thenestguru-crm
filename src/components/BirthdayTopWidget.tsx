'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Cake } from 'lucide-react';
import { getUpcomingBirthdaysAction } from '@/app/actions';

export default function BirthdayTopWidget() {
  const [todayCount, setTodayCount] = useState(0);
  const [upcomingCount, setUpcomingCount] = useState(0);

  const fetchBirthdays = async () => {
    try {
      const res = await getUpcomingBirthdaysAction();
      if (res.success && res.birthdays) {
        setTodayCount(res.birthdays.filter((b: any) => b.isToday).length);
        setUpcomingCount(res.birthdays.length);
      }
    } catch (err) {
      console.error('Failed to load upcoming birthdays count', err);
    }
  };

  useEffect(() => {
    fetchBirthdays();
    const interval = setInterval(fetchBirthdays, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Link
      href="/birthdays"
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all border shadow-sm shrink-0 ${
        todayCount > 0
          ? 'bg-gradient-to-r from-amber-500/20 via-pink-500/20 to-purple-500/20 text-amber-600 dark:text-amber-300 border-amber-400/50 animate-pulse shadow-amber-500/20'
          : upcomingCount > 0
          ? 'bg-pink-500/10 hover:bg-pink-500/20 text-pink-600 dark:text-pink-300 border-pink-500/30'
          : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700/60 hover:text-slate-900 dark:hover:text-white'
      }`}
      title="Open Birthday Celebrations Directory & Table"
    >
      <Cake className={`w-3.5 h-3.5 shrink-0 ${todayCount > 0 ? 'text-amber-500 animate-bounce' : 'text-pink-500'}`} />
      <span className="hidden sm:inline">
        {todayCount > 0 ? "Today's Birthday! 🎉" : 'Birthdays'}
      </span>
      {upcomingCount > 0 && (
        <span
          className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
            todayCount > 0
              ? 'bg-amber-500 text-white'
              : 'bg-pink-600 text-white'
          }`}
        >
          {upcomingCount}
        </span>
      )}
    </Link>
  );
}
