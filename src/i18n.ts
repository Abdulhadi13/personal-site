export const locales = ['en', 'ar'] as const;
export const pages = ['home', 'projects', 'blogs', 'about'] as const;

export type Locale = (typeof locales)[number];
export type Page = (typeof pages)[number];

interface Messages {
  name: string;
  navigation: string;
  skipToContent: string;
  construction: string;
  switchLanguage: string;
  lightTheme: string;
  darkTheme: string;
  pages: Record<Page, string>;
}

export const translations = {
  en: {
    name: 'Abdulhadi Fatani',
    navigation: 'Main navigation',
    skipToContent: 'Skip to content',
    construction: 'Under construction',
    switchLanguage: 'Switch to Arabic',
    lightTheme: 'Switch to light mode',
    darkTheme: 'Switch to dark mode',
    pages: { home: 'Home', projects: 'Projects', blogs: 'Blogs', about: 'About' },
  },
  ar: {
    name: 'عبدالهادي فطاني',
    navigation: 'التنقل الرئيسي',
    skipToContent: 'انتقل إلى المحتوى',
    construction: 'قيد الإنشاء',
    switchLanguage: 'التبديل إلى الإنجليزية',
    lightTheme: 'التبديل إلى الوضع الفاتح',
    darkTheme: 'التبديل إلى الوضع الداكن',
    pages: { home: 'الرئيسية', projects: 'المشاريع', blogs: 'المدونة', about: 'نبذة عني' },
  },
} satisfies Record<Locale, Messages>;

export function pagePath(locale: Locale, page: Page): string {
  const prefix = locale === 'ar' ? '/ar/' : '/';
  return page === 'home' ? prefix : `${prefix}${page}/`;
}
