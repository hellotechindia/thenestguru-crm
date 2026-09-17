// 15 Curated, Professional & Heartfelt Birthday Wish Message Templates for NestGuru CRM

export interface BirthdayTemplate {
  id: number;
  tone: 'Professional' | 'Warm & Inspiring' | 'Celebratory' | 'Leadership';
  template: string;
}

export const BIRTHDAY_TEMPLATES: BirthdayTemplate[] = [
  {
    id: 1,
    tone: 'Warm & Inspiring',
    template: "🎉 Happy Birthday, {name}! May this special day bring you immense joy, good health, and abundant success in both personal and professional life. Wishing you a fantastic year ahead! 🌟",
  },
  {
    id: 2,
    tone: 'Professional',
    template: "🎂 Wishing a very Happy Birthday to {name}! Your hard work, dedication, and positive energy make a real difference in our team. Here's to another year of milestone achievements together!",
  },
  {
    id: 3,
    tone: 'Celebratory',
    template: "🎈 Happy Birthday, {name}! May your day be filled with laughter, great memories, and lots of celebration. Thank you for being such an incredible part of our TheNestGuru family!",
  },
  {
    id: 4,
    tone: 'Warm & Inspiring',
    template: "✨ Dear {name}, on your birthday, we wish you endless happiness, boundless growth, and unstoppable motivation. Keep shining bright! Have a wonderful day! 🚀",
  },
  {
    id: 5,
    tone: 'Professional',
    template: "👔 Warmest birthday greetings, {name}! May this year open exciting new avenues of learning, professional triumphs, and personal fulfillment for you. Happy Birthday!",
  },
  {
    id: 6,
    tone: 'Celebratory',
    template: "🎊 Hip, Hip, Hooray! Wishing you a very Happy Birthday, {name}! May the coming year bring you countless reasons to smile and celebrate. Enjoy your special day to the fullest! 🍰",
  },
  {
    id: 7,
    tone: 'Leadership',
    template: "⭐ Happy Birthday, {name}! Your commitment and contributions empower our entire team every single day. Wishing you wisdom, prosperity, and continued success ahead!",
  },
  {
    id: 8,
    tone: 'Warm & Inspiring',
    template: "🌟 Happy Birthday, {name}! May your journey ahead be blessed with good health, great fortune, and all the dreams you aspire to accomplish. Have an amazing year!",
  },
  {
    id: 9,
    tone: 'Celebratory',
    template: "🎁 Wishing the happiest of birthdays to {name}! May your day be as remarkable and inspiring as you are. Cheers to another fabulous trip around the sun! 🥳",
  },
  {
    id: 10,
    tone: 'Professional',
    template: "💼 Happy Birthday, {name}! It is a true pleasure working alongside you. Wishing you continued success, inspiring breakthroughs, and good health in the year ahead.",
  },
  {
    id: 11,
    tone: 'Warm & Inspiring',
    template: "💐 Dearest {name}, wishing you peace, boundless joy, and extraordinary accomplishments on your birthday and always. Have a memorable and joyful day! 🎂",
  },
  {
    id: 12,
    tone: 'Leadership',
    template: "🏆 Happy Birthday, {name}! May your passion and dedication continue to inspire everyone around you. Wishing you great health, wealth, and grand achievements this year!",
  },
  {
    id: 13,
    tone: 'Celebratory',
    template: "🥳 It's celebration time! Happy Birthday, {name}! May this birthday mark the start of a year filled with good luck, great health, and much happiness! 🥂",
  },
  {
    id: 14,
    tone: 'Warm & Inspiring',
    template: "🌺 Wishing you a very Happy Birthday, {name}! May all your hard work turn into fruitful results and may your days be blessed with joy and serenity. Have a great day!",
  },
  {
    id: 15,
    tone: 'Professional',
    template: "🎯 Happy Birthday, {name}! Wishing you soaring success in all your targets, prosperity in your endeavors, and quality moments with loved ones today and always!",
  },
];

/**
 * Returns a customized message with the recipient's name substituted.
 */
export function getCustomWish(template: string, name: string): string {
  return template.replace(/\{name\}/g, name);
}

/**
 * Pick a random template from the 15 templates.
 */
export function getRandomWishTemplate(): BirthdayTemplate {
  const index = Math.floor(Math.random() * BIRTHDAY_TEMPLATES.length);
  return BIRTHDAY_TEMPLATES[index];
}
