import type {
  DoctorDetail,
  DoctorQuery,
  DoctorSummary,
  FaqItem,
  FeatureCard,
  Locale,
  Paged,
  PostSummary,
  ServiceItem,
  StatItem,
  Testimonial,
  WorkflowStep,
} from "./types";

export interface ContentProvider {
  listDoctors(params: DoctorQuery): Promise<Paged<DoctorSummary>>;
  getDoctor(slug: string, locale: Locale): Promise<DoctorDetail | null>;
  listDoctorSlugs(): Promise<string[]>;
  getServices(locale: Locale): Promise<ServiceItem[]>;
  getFeatureCards(locale: Locale): Promise<FeatureCard[]>;
  getStats(locale: Locale): Promise<StatItem[]>;
  getWorkflowSteps(locale: Locale): Promise<WorkflowStep[]>;
  getTestimonials(locale: Locale): Promise<Testimonial[]>;
  getFaqs(locale: Locale): Promise<FaqItem[]>;
  listPosts(locale: Locale, page?: number): Promise<Paged<PostSummary>>;
}
