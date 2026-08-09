/** Categories double as the filter bar's tabs, in this order. */
export const NEWS_CATEGORIES = [
  'ALL',
  'DEVLOGS',
  'EXHIBITIONS',
  'ARTICLES',
  'PRESS',
] as const;

export type NewsCategory = (typeof NEWS_CATEGORIES)[number];
/** Every category except the ALL pseudo-tab, which no entry can carry. */
export type NewsItemCategory = Exclude<NewsCategory, 'ALL'>;

export interface NewsItem {
  id: string;
  /** ISO date. Rendered with a fixed locale so SSR and client agree. */
  date: string;
  category: NewsItemCategory;
  title: string;
  /** One or two lines shown on the card. */
  excerpt: string;
  /** Full text, one string per paragraph, shown in the HUD reader. */
  body: string[];
  /** Terminal-style tags, lowercase with underscores. */
  tags: string[];
  /** Gradient stops for the placeholder visual until real media exists. */
  tint: [string, string];
  /** Optional clip for the reader panel, e.g. '/news/foo.mp4'. */
  video?: string;
  status?: 'PUBLISHED' | 'DRAFT' | 'ARCHIVED';
}
