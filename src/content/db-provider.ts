import { PublishStatus, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { pickLocalized } from "./locale";
import { mapDoctorDetail, mapDoctorSummary } from "./mappers";
import type { ContentProvider } from "./provider";
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

const FEATURE_TONES = ["primary", "secondary", "tertiary", "accent"] as const;

function buildDoctorWhere(params: DoctorQuery): Prisma.DoctorWhereInput {
  const where: Prisma.DoctorWhereInput = {
    status: PublishStatus.PUBLISHED,
    NOT: { slug: { startsWith: "dr-qa-" } },
  };
  if (params.q) {
    const q = params.q.trim();
    if (q) {
      where.OR = [
        { nameEn: { contains: q, mode: "insensitive" } },
        { nameAr: { contains: q, mode: "insensitive" } },
        { titleEn: { contains: q, mode: "insensitive" } },
        { titleAr: { contains: q, mode: "insensitive" } },
        { bioEn: { contains: q, mode: "insensitive" } },
        { bioAr: { contains: q, mode: "insensitive" } },
        { specialty: { nameEn: { contains: q, mode: "insensitive" } } },
        { specialty: { nameAr: { contains: q, mode: "insensitive" } } },
        { specialty: { slug: { contains: q, mode: "insensitive" } } },
      ];
    }
  }
  if (params.specialty) {
    const slugs = params.specialty.split(",").map((s) => s.trim()).filter(Boolean);
    if (slugs.length === 1) where.specialty = { slug: slugs[0] };
    else if (slugs.length > 1) where.specialty = { slug: { in: slugs } };
  }
  if (params.language) where.languages = { has: params.language };
  if (params.gender) where.gender = params.gender;
  if (params.availableOnly) where.isAvailable = true;
  return where;
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M+`;
  if (n >= 10_000) return `${Math.round(n / 1000)}k+`;
  if (n >= 1_000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k+`;
  return String(n);
}

type WorkflowStepSeed = {
  step: number;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
};

export class DbContentProvider implements ContentProvider {
  async listDoctors(params: DoctorQuery): Promise<Paged<DoctorSummary>> {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 12;
    const where = buildDoctorWhere(params);
    const [total, rows] = await Promise.all([
      prisma.doctor.count({ where }),
      prisma.doctor.findMany({
        where,
        include: { specialty: true },
        orderBy: [{ publishedAt: "desc" }, { nameEn: "asc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return { items: rows.map((row) => mapDoctorSummary(row, params.locale)), total, page, pageSize };
  }

  async getDoctor(slug: string, locale: Locale): Promise<DoctorDetail | null> {
    const row = await prisma.doctor.findFirst({
      where: { slug, status: PublishStatus.PUBLISHED },
      include: { specialty: true },
    });
    return row ? mapDoctorDetail(row, locale) : null;
  }

  async listDoctorSlugs(): Promise<string[]> {
    const rows = await prisma.doctor.findMany({
      where: { status: PublishStatus.PUBLISHED },
      select: { slug: true },
      orderBy: { slug: "asc" },
    });
    return rows.map((r) => r.slug);
  }

  async getServices(locale: Locale): Promise<ServiceItem[]> {
    const rows = await prisma.service.findMany({
      where: { status: PublishStatus.PUBLISHED },
      orderBy: { sortOrder: "asc" },
    });
    return rows.map((row) => ({
      slug: row.slug,
      name: pickLocalized(locale, row.nameEn, row.nameAr),
      description: pickLocalized(locale, row.descriptionEn, row.descriptionAr),
      iconKey: row.iconKey,
    }));
  }

  async getFeatureCards(locale: Locale): Promise<FeatureCard[]> {
    const services = await this.getServices(locale);
    return services.map((service, index) => ({
      title: service.name,
      description: service.description,
      iconKey: service.iconKey,
      tone: FEATURE_TONES[index % FEATURE_TONES.length],
    }));
  }

  async getStats(locale: Locale): Promise<StatItem[]> {
    const ar = locale === "ar";
    const [doctorCount, patientCount, summaryCount, completedAppointments] = await Promise.all([
      prisma.doctor.count({ where: { status: PublishStatus.PUBLISHED } }),
      prisma.user.count({ where: { role: "PATIENT", status: "ACTIVE" } }),
      prisma.soapNote.count({ where: { status: "FINAL" } }),
      prisma.appointment.findMany({
        where: { status: "COMPLETED" },
        select: { startAt: true, endAt: true, completedAt: true },
        take: 200,
        orderBy: { completedAt: "desc" },
      }),
    ]);
    const durations = completedAppointments
      .map((a) => ((a.completedAt ?? a.endAt).getTime() - a.startAt.getTime()) / 60_000)
      .filter((mins) => mins > 0 && mins < 180);
    const avgMinutes = durations.length
      ? Math.round(durations.reduce((sum, m) => sum + m, 0) / durations.length)
      : null;
    return [
      { value: formatCount(doctorCount), label: ar ? "أطباء منشورون" : "Published Doctors", iconKey: "medical_services" },
      { value: formatCount(patientCount), label: ar ? "مرضى نشطون" : "Active Patients", iconKey: "groups" },
      { value: formatCount(summaryCount), label: ar ? "ملخصات SOAP نهائية" : "Final SOAP Notes", iconKey: "description" },
      { value: avgMinutes ? (ar ? `${avgMinutes} دقيقة` : `${avgMinutes} min`) : "—", label: ar ? "متوسط الاستشارة" : "Avg. Consultation", iconKey: "timer" },
    ];
  }

  async getWorkflowSteps(locale: Locale): Promise<WorkflowStep[]> {
    const setting = await prisma.siteSetting.findUnique({ where: { key: "marketing.workflowSteps" } });
    const steps = (setting?.value as WorkflowStepSeed[] | undefined) ?? [];
    return steps
      .slice()
      .sort((a, b) => a.step - b.step)
      .map((step) => ({
        step: step.step,
        title: pickLocalized(locale, step.titleEn, step.titleAr),
        description: pickLocalized(locale, step.descriptionEn, step.descriptionAr),
      }));
  }

  async getTestimonials(locale: Locale): Promise<Testimonial[]> {
    const rows = await prisma.testimonial.findMany({
      where: { status: PublishStatus.PUBLISHED },
      orderBy: { sortOrder: "asc" },
    });
    return rows.map((row) => ({
      id: row.id,
      authorName: pickLocalized(locale, row.authorNameEn, row.authorNameAr),
      context: pickLocalized(locale, row.contextEn, row.contextAr) || null,
      quote: pickLocalized(locale, row.quoteEn, row.quoteAr),
      rating: row.rating,
    }));
  }

  async getFaqs(locale: Locale): Promise<FaqItem[]> {
    const rows = await prisma.faqItem.findMany({
      where: { status: PublishStatus.PUBLISHED },
      orderBy: { sortOrder: "asc" },
    });
    return rows.map((row) => ({
      id: row.id,
      question: pickLocalized(locale, row.questionEn, row.questionAr),
      answer: pickLocalized(locale, row.answerEn, row.answerAr),
      category: pickLocalized(locale, row.categoryEn, row.categoryAr) || null,
    }));
  }

  async listPosts(locale: Locale, page = 1): Promise<Paged<PostSummary>> {
    const pageSize = 12;
    const where = { status: PublishStatus.PUBLISHED };
    const [total, rows] = await Promise.all([
      prisma.blogPost.count({ where }),
      prisma.blogPost.findMany({
        where,
        include: { author: true, categories: true },
        orderBy: { publishedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return {
      items: rows.map((row) => ({
        slug: row.slug,
        title: pickLocalized(locale, row.titleEn, row.titleAr),
        summary: pickLocalized(locale, row.summaryEn, row.summaryAr),
        cover: row.coverUrl
          ? { url: row.coverUrl, alt: pickLocalized(locale, row.coverAltEn ?? row.titleEn, row.coverAltAr ?? row.titleAr) }
          : null,
        publishedAt: (row.publishedAt ?? row.createdAt).toISOString(),
        categories: row.categories.map((c) => ({
          slug: c.slug,
          name: pickLocalized(locale, c.nameEn, c.nameAr),
        })),
        author: {
          name: pickLocalized(locale, row.author.nameEn, row.author.nameAr),
          role: pickLocalized(locale, row.author.roleEn, row.author.roleAr) || null,
          avatarUrl: row.author.avatarUrl,
        },
      })),
      total,
      page,
      pageSize,
    };
  }
}