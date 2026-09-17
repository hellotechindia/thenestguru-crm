/**
 * Indian Standard Time (IST - UTC+5:30) helper utilities
 */

const IST_TIMEZONE = 'Asia/Kolkata';

/**
 * Returns today's date in IST formatted as YYYY-MM-DD
 */
export function getTodayISTDate(date = new Date()): string {
  // Using Intl with Asia/Kolkata timezone
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: IST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date); // outputs "YYYY-MM-DD"
}

/**
 * Formats a Date object to IST 12-hour time (e.g. "09:30 AM")
 */
export function formatTimeIST(date: Date | string | null): string {
  if (!date) return '--:--';
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: IST_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(d);
}

/**
 * Formats seconds into HHh MMm SSs
 */
export function formatDuration(seconds: number): string {
  if (seconds < 0) seconds = 0;
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${String(hrs).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`;
}

/**
 * Evaluates whether a user's birthday falls within the next 30 days (including today).
 * Returns { isWithin30Days: boolean, isToday: boolean, daysRemaining: number, formattedBirthday: string }
 */
export function evaluateUpcomingBirthday(dob: Date | string): {
  isWithin30Days: boolean;
  isToday: boolean;
  daysRemaining: number;
  formattedBirthday: string;
} {
  const d = typeof dob === 'string' ? new Date(dob) : dob;
  const dobMonth = d.getUTCMonth(); // 0-11
  const dobDay = d.getUTCDate(); // 1-31

  // Today in IST
  const now = new Date();
  const istDateStr = getTodayISTDate(now);
  const [istYearStr, istMonthStr, istDayStr] = istDateStr.split('-');
  const istYear = parseInt(istYearStr, 10);
  const istMonth = parseInt(istMonthStr, 10) - 1; // 0-11
  const istDay = parseInt(istDayStr, 10);

  // Month names for display
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const formattedBirthday = `${dobDay} ${monthNames[dobMonth]}`;

  // Check this year's birthday date in IST
  let bdayYear = istYear;
  let bdayDate = new Date(Date.UTC(bdayYear, dobMonth, dobDay));
  const todayDate = new Date(Date.UTC(istYear, istMonth, istDay));

  let diffTime = bdayDate.getTime() - todayDate.getTime();
  let daysRemaining = Math.round(diffTime / (1000 * 60 * 60 * 24));

  // If birthday this year already passed (daysRemaining < 0), check next year's birthday (for Nov/Dec rolling into Jan)
  if (daysRemaining < 0) {
    bdayYear = istYear + 1;
    bdayDate = new Date(Date.UTC(bdayYear, dobMonth, dobDay));
    diffTime = bdayDate.getTime() - todayDate.getTime();
    daysRemaining = Math.round(diffTime / (1000 * 60 * 60 * 24));
  }

  const isToday = daysRemaining === 0;
  const isWithin30Days = daysRemaining >= 0 && daysRemaining <= 30;

  return {
    isWithin30Days,
    isToday,
    daysRemaining,
    formattedBirthday,
  };
}
