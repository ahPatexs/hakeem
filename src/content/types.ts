export type Locale = "en" | "ar";

export interface ImageRef {
  url: string;
  alt: string;
  width?: number;
  height?: number;
}

export interface SeoFields {
  title: string;
  description: string;
  image: ImageRef | null;
}

export interface Taxonomy {
  slug: string;
  name: string;
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface DoctorQuery {
  locale: Locale;
  page?: number;
  pageSize?: number;
  q?: string;
  specialty?: string;
  language?: string;
  gender?: "MALE" | "FEMALE";
  availableOnly?: boolean;
}

export interface DoctorSummary {
  slug: string;
  name: string;
  title: string | null;
  specialty: { slug: string; name: string };
  photo: ImageRef | null;
  languages: string[];
  yearsExperience: number | null;
  isAvailable: boolean;
  rating?: number;
  ratingCount?: number;
  bioSnippet?: string;
}

export interface DoctorDetail extends DoctorSummary {
  bio: string | null;
  credentials: string[];
  seo: SeoFields;
}

export interface ServiceItem {
  slug: string;
  name: string;
  description: string;
  iconKey: string;
}

export interface Testimonial {
  id: string;
  authorName: string;
  context: string | null;
  quote: string;
  rating: number | null;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: string | null;
}

export interface PostSummary {
  slug: string;
  title: string;
  summary: string;
  cover: ImageRef | null;
  publishedAt: string;
  categories: Taxonomy[];
  author: { name: string; role: string | null; avatarUrl: string | null };
}

export interface StatItem {
  value: string;
  label: string;
  iconKey: string;
}

export interface WorkflowStep {
  step: number;
  title: string;
  description: string;
}

export interface FeatureCard {
  title: string;
  description: string;
  iconKey: string;
  tone: "primary" | "secondary" | "tertiary" | "accent";
}
