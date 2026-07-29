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

const DOCTOR_PHOTOS = {
  ahmed: "/images/doctors/ahmed.jpg",
  sarah: "/images/doctors/sarah.jpg",
  khalid: "/images/doctors/khalid.jpg",
};

function doctors(locale: Locale): DoctorSummary[] {
  const ar = locale === "ar";
  return [
    {
      slug: "dr-ahmed-al-faisal",
      name: ar ? "د. أحمد الفيصل" : "Dr. Ahmed Al-Faisal",
      title: ar ? "استشاري قلب أول" : "Senior Cardiologist",
      specialty: { slug: "cardiology", name: ar ? "أمراض القلب" : "Cardiology" },
      photo: { url: DOCTOR_PHOTOS.ahmed, alt: ar ? "د. أحمد الفيصل" : "Dr. Ahmed Al-Faisal" },
      languages: ["ar", "en"],
      yearsExperience: 15,
      isAvailable: true,
      rating: 4.9,
      bioSnippet: ar
        ? "متخصص في إجراءات القلب طفيفة التوغل والوقاية من أمراض القلب."
        : "Specializing in minimally invasive cardiac procedures and preventive heart health.",
    },
    {
      slug: "dr-sarah-mansour",
      name: ar ? "د. سارة منصور" : "Dr. Sarah Mansour",
      title: ar ? "أخصائية أمراض عصبية" : "Neurology Specialist",
      specialty: { slug: "neurology", name: ar ? "الأمراض العصبية" : "Neurology" },
      photo: { url: DOCTOR_PHOTOS.sarah, alt: ar ? "د. سارة منصور" : "Dr. Sarah Mansour" },
      languages: ["ar", "en"],
      yearsExperience: 12,
      isAvailable: true,
      rating: 5.0,
      bioSnippet: ar
        ? "خبيرة في التشخيص العصبي وعلاج الاضطرابات المعرفية."
        : "Expert in neuro-diagnostics and advanced treatment for cognitive disorders.",
    },
    {
      slug: "dr-khalid-jameel",
      name: ar ? "د. خالد جميل" : "Dr. Khalid Jameel",
      title: ar ? "أخصائي طب أطفال" : "Pediatric Specialist",
      specialty: { slug: "pediatrics", name: ar ? "طب الأطفال" : "Pediatrics" },
      photo: { url: DOCTOR_PHOTOS.khalid, alt: ar ? "د. خالد جميل" : "Dr. Khalid Jameel" },
      languages: ["ar", "en"],
      yearsExperience: 15,
      isAvailable: true,
      rating: 4.8,
      bioSnippet: ar
        ? "متفانٍ في صحة ونمو الأطفال مع أكثر من 15 عاماً من الخبرة."
        : "Dedicated to child wellness and development with over 15 years of experience.",
    },
  ];
}

export class StaticContentProvider implements ContentProvider {
  async listDoctors(params: DoctorQuery): Promise<Paged<DoctorSummary>> {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 12;
    let items = doctors(params.locale);
    if (params.q) {
      const q = params.q.toLowerCase().trim();
      items = items.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.specialty.name.toLowerCase().includes(q) ||
          d.specialty.slug.toLowerCase().includes(q) ||
          (d.title?.toLowerCase().includes(q) ?? false) ||
          (d.bioSnippet?.toLowerCase().includes(q) ?? false),
      );
    }
    if (params.specialty) {
      const slugs = params.specialty
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (slugs.length === 1) {
        items = items.filter((d) => d.specialty.slug === slugs[0]);
      } else if (slugs.length > 1) {
        items = items.filter((d) => slugs.includes(d.specialty.slug));
      }
    }
    if (params.availableOnly) {
      items = items.filter((d) => d.isAvailable);
    }
    const start = (page - 1) * pageSize;
    return {
      items: items.slice(start, start + pageSize),
      total: items.length,
      page,
      pageSize,
    };
  }

  async getDoctor(slug: string, locale: Locale): Promise<DoctorDetail | null> {
    const found = doctors(locale).find((d) => d.slug === slug);
    if (!found) return null;
    return {
      ...found,
      bio: found.bioSnippet ?? null,
      credentials: locale === "ar" ? ["طبيب مرخّص", "استشاري"] : ["Licensed MD", "Board Certified"],
      seo: {
        title: found.name,
        description: found.bioSnippet ?? found.title ?? found.name,
        image: found.photo,
      },
    };
  }

  async listDoctorSlugs(): Promise<string[]> {
    return doctors("en").map((d) => d.slug);
  }

  async getServices(locale: Locale): Promise<ServiceItem[]> {
    return this.getFeatureCards(locale).then((cards) =>
      cards.map((c, i) => ({
        slug: `service-${i + 1}`,
        name: c.title,
        description: c.description,
        iconKey: c.iconKey,
      })),
    );
  }

  async getFeatureCards(locale: Locale): Promise<FeatureCard[]> {
    const ar = locale === "ar";
    return [
      {
        title: ar ? "توثيق بالذكاء الاصطناعي" : "AI Documentation",
        description: ar
          ? "ملاحظات SOAP وملخصات فورية من الاستشارات المباشرة."
          : "Automated SOAP notes and instant summaries generated from live consultations.",
        iconKey: "description",
        tone: "primary",
      },
      {
        title: ar ? "فيديو آمن" : "Secure Video",
        description: ar
          ? "مؤتمرات فيديو عالية الدقة مصممة للاستخدام الطبي."
          : "HIPAA-compliant HD video conferencing designed specifically for medical use.",
        iconKey: "videocam",
        tone: "secondary",
      },
      {
        title: ar ? "حجز سهل" : "Easy Booking",
        description: ar
          ? "جدولة ذكية وتذكيرات آلية لتقليل غياب المرضى."
          : "Smart scheduling and automated reminders to minimize patient no-shows.",
        iconKey: "event_available",
        tone: "tertiary",
      },
      {
        title: ar ? "امتثال سعودي" : "Saudi Compliance",
        description: ar
          ? "متوافق بالكامل مع لوائح الرعاية الصحية وخصوصية البيانات في المملكة."
          : "Fully compliant with KSA healthcare regulations and data privacy standards.",
        iconKey: "verified",
        tone: "accent",
      },
    ];
  }

  async getStats(locale: Locale): Promise<StatItem[]> {
    const ar = locale === "ar";
    return [
      {
        value: "10,000+",
        label: ar ? "أطباء مسجلون" : "Registered Doctors",
        iconKey: "medical_services",
      },
      { value: "250,000+", label: ar ? "مرضى تمت خدمتهم" : "Patients Served", iconKey: "groups" },
      { value: "1.2M+", label: ar ? "ملخصات ذكية" : "AI Summaries", iconKey: "description" },
      {
        value: ar ? "18 دقيقة" : "18 min",
        label: ar ? "متوسط الاستشارة" : "Avg. Consultation",
        iconKey: "timer",
      },
    ];
  }

  async getWorkflowSteps(locale: Locale): Promise<WorkflowStep[]> {
    const ar = locale === "ar";
    return [
      {
        step: 1,
        title: ar ? "تحويل الكلام إلى نص مباشر" : "Live Speech-to-Text",
        description: ar
          ? "تفريغ فوري لحوار الطبيب والمريض أثناء الاستشارة."
          : "Real-time transcription of doctor-patient dialogue during consultations.",
      },
      {
        step: 2,
        title: ar ? "تحليل سياقي بالذكاء الاصطناعي" : "AI Contextual Analysis",
        description: ar
          ? "تحديد واستخراج الكيانات والأعراض السريرية بواسطة ذكاء طبي."
          : "Clinical entities and symptoms are identified and extracted by medical-grade AI.",
      },
      {
        step: 3,
        title: ar ? "ملاحظة SOAP تلقائية" : "Auto SOAP Note",
        description: ar
          ? "توليد ملاحظة SOAP منظمة فوراً لمراجعة الطبيب."
          : "A structured SOAP note is generated instantly for the doctor's review.",
      },
    ];
  }

  async getTestimonials(locale: Locale): Promise<Testimonial[]> {
    const ar = locale === "ar";
    return [
      {
        id: "1",
        authorName: ar ? "نورة العتيبي" : "Noura Al-Otaibi",
        context: ar ? "مريضة استشارة فيديو" : "Video consultation patient",
        quote: ar
          ? "الاستشارة كانت مفيدة جداً وشعرت أن الطبيب اهتم بصحتي حقاً."
          : "The medical consultation was very helpful. I felt like the doctor really cared about my health.",
        rating: 5,
      },
    ];
  }

  async getFaqs(locale: Locale): Promise<FaqItem[]> {
    const ar = locale === "ar";
    return [
      {
        id: "1",
        question: ar ? "كيف أحجز موعداً؟" : "How do I book an appointment?",
        answer: ar
          ? "اختر طبيباً من صفحة البحث ثم اضغط احجز موعداً."
          : "Choose a doctor from Find Care and tap Book Appointment.",
        category: ar ? "المواعيد" : "Appointments",
      },
    ];
  }

  async listPosts(locale: Locale, page = 1): Promise<Paged<PostSummary>> {
    const ar = locale === "ar";
    const items: PostSummary[] = [
      {
        slug: "ai-transforming-consultations",
        title: ar
          ? "كيف يغيّر الذكاء الاصطناعي استشارات الأطباء"
          : "How AI Is Transforming Doctor Consultations",
        summary: ar
          ? "نظرة على التوثيق الذكي والرعاية عن بُعد."
          : "A look at intelligent documentation and remote care.",
        cover: null,
        publishedAt: "2026-01-15T00:00:00.000Z",
        categories: [{ slug: "telemedicine", name: ar ? "الطب عن بُعد" : "Telemedicine" }],
        author: {
          name: ar ? "د. سارة مالك" : "Dr. Sara Malik",
          role: ar ? "مراجعة طبية" : "Medical Reviewer",
          avatarUrl: null,
        },
      },
    ];
    return { items, total: items.length, page, pageSize: 12 };
  }
}

export function getContentProvider(): ContentProvider {
  // Module 0 ships with static seed content. Swap to DbContentProvider when DATABASE_URL is configured.
  return new StaticContentProvider();
}
