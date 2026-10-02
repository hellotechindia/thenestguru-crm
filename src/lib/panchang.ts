/**
 * Hindu Panchang & Indian Public Holidays Calendar Utility
 * Provides Tithi, Paksha, Hindu Masa, Nakshatra, Festivals, Vrats, and Public Holidays.
 */

export interface PanchangDayInfo {
  dateStr: string; // YYYY-MM-DD
  tithiNumber: number; // 1-30
  tithiName: string; // e.g. "एकादशी (Ekadashi)", "पूर्णिमा (Purnima)"
  tithiHindi: string; // e.g. "एकादशी"
  paksha: 'SHUKLA' | 'KRISHNA';
  pakshaHindi: string; // "शुक्ल पक्ष" or "कृष्ण पक्ष"
  hinduMonth: string; // e.g. "कार्तिक (Kartika)"
  nakshatra: string; // e.g. "रोहिणी (Rohini)"
  yoga: string; // e.g. "सिद्धि (Siddhi)"
  karana: string; // e.g. "बव (Bava)"
  festival?: string; // Festival name if any
  festivalHindi?: string;
  isPurnima: boolean;
  isAmavasya: boolean;
  isEkadashi: boolean;
  isPublicHoliday: boolean;
  publicHolidayName?: string;
  shubhMuhurat?: string; // e.g. "अभिजीत मुहूर्त: 11:45 AM - 12:35 PM"
  rahuKaal?: string; // e.g. "राहुकाल: 04:30 PM - 06:00 PM"
}

// 15 Tithis in a Lunar Month Paksha
const TITHI_NAMES = [
  { en: 'Pratipada', hi: 'प्रतिपदा' },
  { en: 'Dwitiya', hi: 'द्वितीया' },
  { en: 'Tritiya', hi: 'तृतीया' },
  { en: 'Chaturthi', hi: 'चतुर्थी' },
  { en: 'Panchami', hi: 'पंचमी' },
  { en: 'Shashthi', hi: 'षष्ठी' },
  { en: 'Saptami', hi: 'सप्तमी' },
  { en: 'Ashtami', hi: 'अष्टमी' },
  { en: 'Navami', hi: 'नवमी' },
  { en: 'Dashami', hi: 'दशमी' },
  { en: 'Ekadashi', hi: 'एकादशी' },
  { en: 'Dwadashi', hi: 'द्वादशी' },
  { en: 'Trayodashi', hi: 'त्रयोदशी' },
  { en: 'Chaturdashi', hi: 'चतुर्दशी' },
  { en: 'Purnima', hi: 'पूर्णिमा' }, // 15
];

// 27 Nakshatras
const NAKSHATRAS = [
  'अश्विनी (Ashwini)', 'भरणी (Bharani)', 'कृत्तिका (Krittika)', 'रोहिणी (Rohini)',
  'मृगशिरा (Mrigashirsha)', 'आर्द्रा (Ardra)', 'पुनर्वसु (Punarvasu)', 'पुष्य (Pushya)',
  'आश्लेषा (Ashlesha)', 'मघा (Magha)', 'पूर्वाफाल्गुनी (Purva Phalguni)', 'उत्तराफाल्गुनी (Uttara Phalguni)',
  'हस्त (Hasta)', 'चित्रा (Chitra)', 'स्वाति (Swati)', 'विशाखा (Vishakha)',
  'अनुराधा (Anuradha)', 'ज्येष्ठा (Jyeshtha)', 'मूल (Mula)', 'पूर्वाषाढ़ा (Purva Ashadha)',
  'उत्तराषाढ़ा (Uttara Ashadha)', 'श्रवण (Shravana)', 'धनिष्ठा (Dhanishta)', 'शतभिषा (Shatabhisha)',
  'पूर्वाभाद्रपद (Purva Bhadrapada)', 'उत्तराभाद्रपद (Uttara Bhadrapada)', 'रेवती (Revati)'
];

// 12 Hindu Months (Masa)
const HINDU_MONTHS = [
  'चैत्र (Chaitra)', 'वैशाख (Vaishakha)', 'ज्येष्ठ (Jyeshtha)', 'आषाढ़ (Ashadha)',
  'श्रावण (Shravana)', 'भाद्रपद (Bhadrapada)', 'अश्विन (Ashwina)', 'कार्तिक (Kartika)',
  'मार्गशीर्ष (Margashirsha)', 'पौष (Pausha)', 'माघ (Magha)', 'फाल्गुन (Phalguna)'
];

// 27 Yogas
const YOGAS = [
  'विष्कम्भ', 'प्रीति', 'आयुष्मान', 'सौभाग्य', 'शोभन', 'अतिगण्ड', 'सुकर्मा', 'धृति',
  'शूल', 'गण्ड', 'वृद्धि', 'ध्रुव', 'व्याघात', 'हर्षण', 'वज्र', 'सिद्धि',
  'व्यतीपात', 'वरीयान्', 'परिघ', 'शिव', 'सिद्ध', 'साध्य', 'शुभ', 'शुक्ल',
  'ब्रह्म', 'इन्द्र', 'वैधृति'
];

/**
 * Key Indian Public Holidays & Major Hindu Festivals (2025 - 2027)
 */
export const INDIAN_HOLIDAYS_AND_FESTIVALS: Record<string, { holiday?: string; festival?: string; festivalHindi?: string }> = {
  // 2025
  '2025-01-01': { holiday: "New Year's Day" },
  '2025-01-14': { festival: 'Makar Sankranti / Pongal', festivalHindi: 'मकर संक्रांति / पोंगल' },
  '2025-01-26': { holiday: 'Republic Day', festivalHindi: 'गणतंत्र दिवस' },
  '2025-02-02': { festival: 'Vasant Panchami / Saraswati Puja', festivalHindi: 'वसन्त पंचमी' },
  '2025-02-26': { holiday: 'Maha Shivratri', festival: 'Maha Shivratri', festivalHindi: 'महाशिवरात्रि' },
  '2025-03-13': { festival: 'Holika Dahan', festivalHindi: 'होलिका दहन' },
  '2025-03-14': { holiday: 'Holi (Festival of Colors)', festival: 'Holi', festivalHindi: 'होली' },
  '2025-03-30': { festival: 'Chaitra Navratri Starts / Ugadi / Gudi Padwa', festivalHindi: 'गुड़ी पड़वा / चैत्र नवरात्र आरम्भ' },
  '2025-03-31': { holiday: 'Eid-ul-Fitr', festival: 'Eid-ul-Fitr', festivalHindi: 'ईद-उल-फ़ितर' },
  '2025-04-06': { holiday: 'Ram Navami', festival: 'Ram Navami', festivalHindi: 'श्री राम नवमी' },
  '2025-04-10': { holiday: 'Mahavir Jayanti', festival: 'Mahavir Jayanti', festivalHindi: 'महावीर जयंती' },
  '2025-04-18': { holiday: 'Good Friday', festival: 'Good Friday', festivalHindi: 'गुड फ्राइडे' },
  '2025-05-12': { holiday: 'Buddha Purnima', festival: 'Buddha Purnima', festivalHindi: 'बुद्ध पूर्णिमा' },
  '2025-06-07': { holiday: 'Bakrid / Eid-ul-Adha', festival: 'Eid-ul-Adha', festivalHindi: 'बकरीद' },
  '2025-07-06': { holiday: 'Muharram', festival: 'Muharram', festivalHindi: 'मोहर्रम' },
  '2025-08-09': { festival: 'Raksha Bandhan', festivalHindi: 'रक्षाबंधन' },
  '2025-08-15': { holiday: 'Independence Day', festivalHindi: 'स्वतंत्रता दिवस' },
  '2025-08-16': { holiday: 'Krishna Janmashtami', festival: 'Krishna Janmashtami', festivalHindi: 'श्री कृष्ण जन्माष्टमी' },
  '2025-08-27': { festival: 'Ganesh Chaturthi', festivalHindi: 'गणेश चतुर्थी' },
  '2025-09-05': { holiday: 'Milad-un-Nabi (Id-e-Milad)', festivalHindi: 'मिलाद-उन-नबी' },
  '2025-09-22': { festival: 'Sharad Navratri Starts', festivalHindi: 'शारदीय नवरात्रि प्रारंभ' },
  '2025-10-01': { festival: 'Maha Navami', festivalHindi: 'महानवमी' },
  '2025-10-02': { holiday: 'Mahatma Gandhi Jayanti / Dussehra', festival: 'Vijayadashami (Dussehra)', festivalHindi: 'गांधी जयंती / विजयादशमी' },
  '2025-10-10': { festival: 'Karwa Chauth', festivalHindi: 'करवा चौथ' },
  '2025-10-18': { festival: 'Dhanteras', festivalHindi: 'धनतेरस' },
  '2025-10-20': { holiday: 'Diwali (Deepavali)', festival: 'Diwali / Lakshmi Puja', festivalHindi: 'दीपावली (लक्ष्मी पूजन)' },
  '2025-10-22': { festival: 'Govardhan Puja / Bhai Dooj', festivalHindi: 'गोवर्धन पूजा / भाई दूज' },
  '2025-10-27': { festival: 'Chhath Puja', festivalHindi: 'छठ पूजा' },
  '2025-11-05': { holiday: 'Guru Nanak Jayanti', festival: 'Guru Nanak Jayanti', festivalHindi: 'गुरु नानक जयंती' },
  '2025-12-25': { holiday: 'Christmas Day', festival: 'Christmas', festivalHindi: 'क्रिसमस' },

  // 2026
  '2026-01-01': { holiday: "New Year's Day", festivalHindi: 'नव वर्ष' },
  '2026-01-14': { festival: 'Makar Sankranti / Pongal', festivalHindi: 'मकर संक्रांति / पोंगल' },
  '2026-01-23': { festival: 'Vasant Panchami', festivalHindi: 'वसन्त पंचमी' },
  '2026-01-26': { holiday: 'Republic Day', festivalHindi: 'गणतंत्र दिवस' },
  '2026-02-15': { holiday: 'Maha Shivratri', festival: 'Maha Shivratri', festivalHindi: 'महाशिवरात्रि' },
  '2026-03-03': { festival: 'Holika Dahan', festivalHindi: 'होलिका दहन' },
  '2026-03-04': { holiday: 'Holi (Festival of Colors)', festival: 'Holi / Dhulandi', festivalHindi: 'होली' },
  '2026-03-19': { festival: 'Chaitra Navratri / Gudi Padwa', festivalHindi: 'गुड़ी पड़वा / चैत्र नवरात्रि प्रारंभ' },
  '2026-03-21': { holiday: 'Eid-ul-Fitr', festival: 'Eid-ul-Fitr', festivalHindi: 'ईद-उल-फ़ितर' },
  '2026-03-27': { holiday: 'Ram Navami', festival: 'Ram Navami', festivalHindi: 'श्री राम नवमी' },
  '2026-03-31': { holiday: 'Mahavir Jayanti', festival: 'Mahavir Jayanti', festivalHindi: 'महावीर जयंती' },
  '2026-04-03': { holiday: 'Good Friday', festival: 'Good Friday', festivalHindi: 'गुड फ्राइडे' },
  '2026-05-01': { holiday: 'Buddha Purnima', festival: 'Buddha Purnima', festivalHindi: 'बुद्ध पूर्णिमा' },
  '2026-05-27': { holiday: 'Bakrid / Eid-ul-Adha', festival: 'Eid-ul-Adha', festivalHindi: 'बकरीद' },
  '2026-06-26': { holiday: 'Muharram', festival: 'Muharram', festivalHindi: 'मोहर्रम' },
  '2026-08-15': { holiday: 'Independence Day', festivalHindi: 'स्वतंत्रता दिवस' },
  '2026-08-27': { festival: 'Raksha Bandhan', festivalHindi: 'रक्षाबंधन' },
  '2026-09-04': { holiday: 'Krishna Janmashtami', festival: 'Janmashtami', festivalHindi: 'श्री कृष्ण जन्माष्टमी' },
  '2026-09-15': { festival: 'Ganesh Chaturthi', festivalHindi: 'गणेश चतुर्थी' },
  '2026-09-25': { holiday: 'Milad-un-Nabi', festivalHindi: 'मिलाद-उन-नबी' },
  '2026-10-02': { holiday: 'Mahatma Gandhi Jayanti', festivalHindi: 'गांधी जयंती' },
  '2026-10-11': { festival: 'Sharad Navratri Starts', festivalHindi: 'शारदीय नवरात्रि प्रारंभ' },
  '2026-10-19': { festival: 'Maha Navami', festivalHindi: 'महानवमी' },
  '2026-10-20': { holiday: 'Dussehra (Vijayadashami)', festival: 'Dussehra', festivalHindi: 'विजयादशमी (दशहरा)' },
  '2026-10-29': { festival: 'Karwa Chauth', festivalHindi: 'करवा चौथ' },
  '2026-11-06': { festival: 'Dhanteras', festivalHindi: 'धनतेरस' },
  '2026-11-08': { holiday: 'Diwali (Deepavali)', festival: 'Diwali', festivalHindi: 'दीपावली (लक्ष्मी पूजन)' },
  '2026-11-10': { festival: 'Govardhan Puja / Bhai Dooj', festivalHindi: 'गोवर्धन पूजा / भाई दूज' },
  '2026-11-15': { festival: 'Chhath Puja', festivalHindi: 'छठ पूजा' },
  '2026-11-24': { holiday: 'Guru Nanak Jayanti', festival: 'Guru Nanak Jayanti', festivalHindi: 'गुरु नानक जयंती' },
  '2026-12-25': { holiday: 'Christmas Day', festival: 'Christmas', festivalHindi: 'क्रिसमस' },

  // 2027
  '2027-01-01': { holiday: "New Year's Day", festivalHindi: 'नव वर्ष' },
  '2027-01-14': { festival: 'Makar Sankranti', festivalHindi: 'मकर संक्रांति' },
  '2027-01-26': { holiday: 'Republic Day', festivalHindi: 'गणतंत्र दिवस' },
  '2027-03-07': { holiday: 'Maha Shivratri', festival: 'Maha Shivratri', festivalHindi: 'महाशिवरात्रि' },
  '2027-03-22': { holiday: 'Holi (Festival of Colors)', festival: 'Holi', festivalHindi: 'होली' },
  '2027-08-15': { holiday: 'Independence Day', festivalHindi: 'स्वतंत्रता दिवस' },
  '2027-10-02': { holiday: 'Gandhi Jayanti', festivalHindi: 'गांधी जयंती' },
  '2027-10-29': { holiday: 'Diwali (Deepavali)', festival: 'Diwali', festivalHindi: 'दीपावली' },
  '2027-12-25': { holiday: 'Christmas Day', festivalHindi: 'क्रिसमस' },
};

/**
 * Calculates Astronomical Hindu Panchang details for any given Gregorian Date
 */
export function getPanchangForDate(inputDate: Date | string): PanchangDayInfo {
  const d = typeof inputDate === 'string' ? new Date(inputDate) : inputDate;
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  // Lunar synodic month = 29.53058867 days
  // Known reference new moon (Amavasya): Jan 11, 2024 at 11:57 UTC
  const refNewMoonMs = Date.UTC(2024, 0, 11, 11, 57, 0);
  const targetMs = Date.UTC(year, month - 1, day, 12, 0, 0);
  const diffDays = (targetMs - refNewMoonMs) / (1000 * 60 * 60 * 24);

  const synodicMonth = 29.53058867;
  const cycleProgress = ((diffDays % synodicMonth) + synodicMonth) % synodicMonth;
  const tithiFloat = (cycleProgress / synodicMonth) * 30; // 0 to 30
  let tithiNumber = Math.floor(tithiFloat) + 1; // 1 to 30
  if (tithiNumber > 30) tithiNumber = 30;

  // Determine Paksha & Tithi Name
  const isShukla = tithiNumber <= 15;
  const paksha: 'SHUKLA' | 'KRISHNA' = isShukla ? 'SHUKLA' : 'KRISHNA';
  const pakshaHindi = isShukla ? 'शुक्ल पक्ष' : 'कृष्ण पक्ष';

  const tithiIndex = isShukla ? tithiNumber - 1 : tithiNumber - 16;
  const tInfo = TITHI_NAMES[tithiIndex] || TITHI_NAMES[0];

  let tithiName = `${isShukla ? 'Shukla' : 'Krishna'} ${tInfo.en}`;
  let tithiHindi = `${pakshaHindi} ${tInfo.hi}`;

  const isPurnima = tithiNumber === 15;
  const isAmavasya = tithiNumber === 30;
  const isEkadashi = tithiNumber === 11 || tithiNumber === 26;

  if (isPurnima) {
    tithiName = 'Purnima (Full Moon)';
    tithiHindi = 'पूर्णिमा (पूर्ण चंद्र 🌕)';
  } else if (isAmavasya) {
    tithiName = 'Amavasya (New Moon)';
    tithiHindi = 'अमावस्या (अमावस 🌑)';
  } else if (isEkadashi) {
    tithiName = `${isShukla ? 'Shukla' : 'Krishna'} Ekadashi`;
    tithiHindi = `${pakshaHindi} एकादशी (हरिवासर)`;
  }

  // Approximate Hindu Masa (Month) based on Gregorian month and lunar cycle
  // Chaitra starts around mid-March / April
  const totalMonthsSinceRef = diffDays / synodicMonth;
  const hinduMonthIndex = Math.floor(((totalMonthsSinceRef + 9) % 12 + 12) % 12);
  const hinduMonth = HINDU_MONTHS[hinduMonthIndex] || HINDU_MONTHS[0];

  // Approximate Nakshatra (Moon completes orbit in 27.32 days)
  const nakshatraCycle = ((diffDays % 27.32166) + 27.32166) % 27.32166;
  const nakshatraIndex = Math.floor((nakshatraCycle / 27.32166) * 27) % 27;
  const nakshatra = NAKSHATRAS[nakshatraIndex] || NAKSHATRAS[0];

  // Yoga based on combination of day and lunar day
  const yogaIndex = (day + tithiNumber) % 27;
  const yoga = YOGAS[yogaIndex] || YOGAS[0];

  // Karana (each tithi has 2 karanas, total 60 in month)
  const karanaList = ['बव', 'बालव', 'कौलव', 'तैतिल', 'गर', 'वणिज', 'विष्टि (भद्रा)', 'शकुनि', 'चतुष्पद', 'नाग', 'किंस्तुघ्न'];
  const karana = karanaList[(tithiNumber * 2) % karanaList.length];

  // Check known holidays and festivals
  const holidayEntry = INDIAN_HOLIDAYS_AND_FESTIVALS[dateStr];
  const isPublicHoliday = !!holidayEntry?.holiday;
  const publicHolidayName = holidayEntry?.holiday;

  let festival = holidayEntry?.festival;
  let festivalHindi = holidayEntry?.festivalHindi;

  // Add default tithi-based vrats if no major festival exists
  if (!festival) {
    if (isEkadashi) {
      festival = `${isShukla ? 'Shukla' : 'Krishna'} Ekadashi Vrat`;
      festivalHindi = 'एकादशी व्रत';
    } else if (isPurnima) {
      festival = 'Satyanarayan Puja / Purnima Vrat';
      festivalHindi = 'सत्यनारायण पूजा / पूर्णिमा';
    } else if (isAmavasya) {
      festival = 'Amavasya Pitru Tarpan';
      festivalHindi = 'अमावस्या';
    } else if (tithiNumber === 13 || tithiNumber === 28) {
      festival = 'Pradosh Vrat';
      festivalHindi = 'प्रदोष व्रत (शिव पूजा)';
    } else if (tithiNumber === 4 || tithiNumber === 19) {
      festival = isShukla ? 'Vinayaka Chaturthi' : 'Sankashti Chaturthi';
      festivalHindi = isShukla ? 'विनायक चतुर्थी' : 'संकष्टी चतुर्थी (गणेश पूजा)';
    }
  }

  // Rahu Kaal based on Day of Week (Sun=0..Sat=6)
  const dayOfWeek = d.getDay();
  const rahuKaalTimings = [
    '04:30 PM - 06:00 PM', // Sunday
    '07:30 AM - 09:00 AM', // Monday
    '03:00 PM - 04:30 PM', // Tuesday
    '12:00 PM - 01:30 PM', // Wednesday
    '01:30 PM - 03:00 PM', // Thursday
    '10:30 AM - 12:00 PM', // Friday
    '09:00 AM - 10:30 AM', // Saturday
  ];
  const rahuKaal = `राहुकाल: ${rahuKaalTimings[dayOfWeek]}`;
  const shubhMuhurat = 'अभिजीत मुहूर्त: 11:52 AM - 12:44 PM';

  return {
    dateStr,
    tithiNumber,
    tithiName,
    tithiHindi,
    paksha,
    pakshaHindi,
    hinduMonth,
    nakshatra,
    yoga,
    karana,
    festival,
    festivalHindi,
    isPurnima,
    isAmavasya,
    isEkadashi,
    isPublicHoliday,
    publicHolidayName,
    shubhMuhurat,
    rahuKaal,
  };
}
