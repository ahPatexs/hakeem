/**
 * Seed script for Neon/Prisma.
 * Requires DATABASE_URL. Module 0 uses StaticContentProvider until Neon is provisioned.
 *
 * Run: npm run prisma:seed
 */
import { createHash } from "node:crypto";
import {
  PrismaClient,
  PublishStatus,
  type AiFeatureKey,
  type LabResult,
  type Prescription,
} from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

const AI_FEATURE_KEYS: AiFeatureKey[] = [
  "PATIENT_ASSISTANT",
  "SYMPTOM_CHECKER",
  "RECOMMENDATIONS",
  "DOCTOR_SOAP",
  "DOCTOR_SUMMARY",
  "RX_ASSIST",
  "CDS",
];

const AI_PROMPT_DEFAULTS: Record<
  AiFeatureKey,
  { name: string; bodyEn: string; bodyAr: string; modelName: string }
> = {
  PATIENT_ASSISTANT: {
    name: "Patient medical assistant",
    bodyEn:
      "You are Hakeem's patient health assistant. Answer general health questions clearly, never diagnose or prescribe, and remind users to seek professional care when appropriate.",
    bodyAr:
      "أنت مساعد صحة المرضى في حكيم. أجب عن الأسئلة الصحية العامة بوضوح، ولا تشخّص ولا تصف أدوية، وذكّر المستخدم بطلب الرعاية المهنية عند الحاجة.",
    modelName: "gpt-4o-mini",
  },
  SYMPTOM_CHECKER: {
    name: "Symptom checker",
    bodyEn:
      "Guide the patient through a non-diagnostic symptom triage. Ask one focused question at a time and propose a triage outcome with plain-language rationale.",
    bodyAr:
      "وجّه المريض عبر فرز أعراض غير تشخيصي. اطرح سؤالاً مركزاً واحداً في كل مرة واقترح نتيجة فرز مع تبرير بلغة بسيطة.",
    modelName: "gpt-4o-mini",
  },
  RECOMMENDATIONS: {
    name: "Health recommendations",
    bodyEn:
      "Produce concise, explainable wellness or education recommendations. Cite only allowed chart categories when personalization is enabled.",
    bodyAr:
      "قدّم توصيات عافية أو تثقيف صحي موجزة وقابلة للتفسير. استشهد فقط بفئات السجل المسموح بها عند تفعيل التخصيص.",
    modelName: "gpt-4o-mini",
  },
  DOCTOR_SOAP: {
    name: "Doctor SOAP draft",
    bodyEn:
      "Draft a clinician SOAP note from the encounter context. Mark uncertainty explicitly. Never finalize or sign; output is a draft for clinician review.",
    bodyAr:
      "امسودة ملاحظة SOAP سريرية من سياق الزيارة. وضّح عدم اليقين صراحة. لا تعتمد أو توقّع؛ الناتج مسودة لمراجعة الطبيب.",
    modelName: "gpt-4o",
  },
  DOCTOR_SUMMARY: {
    name: "Consultation summary draft",
    bodyEn:
      "Draft a patient-facing consultation summary in the patient's locale. Keep clinical accuracy and leave final wording to the clinician.",
    bodyAr:
      "امسودة ملخص استشارة موجّه للمريض بلغة المريض. حافظ على الدقة السريرية واترك الصياغة النهائية للطبيب.",
    modelName: "gpt-4o",
  },
  RX_ASSIST: {
    name: "Prescription assistance",
    bodyEn:
      "Suggest prescription options with evidence citations and surface allergy or interaction conflicts before any acceptance step.",
    bodyAr:
      "اقترح خيارات وصفات مع استشهادات بالأدلة وأظهر تعارضات الحساسية أو التفاعلات قبل أي خطوة قبول.",
    modelName: "gpt-4o",
  },
  CDS: {
    name: "Clinical decision support",
    bodyEn:
      "Provide dismissible clinical decision-support insights grounded in chart evidence. Do not write to the chart.",
    bodyAr:
      "قدّم رؤى دعم قرار سريري قابلة للتجاهل مستندة إلى أدلة السجل. لا تكتب في السجل الطبي.",
    modelName: "gpt-4o",
  },
};

/**
 * Module 7 AI defaults (T004): published prompt versions, STUB model configs,
 * GLOBAL budget, and bilingual KB docs. Safe to re-run (idempotent).
 */
async function seedAiModuleDefaults(): Promise<void> {
  const now = new Date();

  for (const feature of AI_FEATURE_KEYS) {
    const defaults = AI_PROMPT_DEFAULTS[feature];
    const template = await prisma.aiPromptTemplate.upsert({
      where: { feature },
      update: { name: defaults.name },
      create: { feature, name: defaults.name },
    });

    const existingVersion = await prisma.aiPromptVersion.findUnique({
      where: { templateId_version: { templateId: template.id, version: 1 } },
    });
    if (!existingVersion) {
      await prisma.aiPromptVersion.create({
        data: {
          templateId: template.id,
          version: 1,
          bodyEn: defaults.bodyEn,
          bodyAr: defaults.bodyAr,
          status: "PUBLISHED",
          publishedAt: now,
          changeNote: "Seed default published prompt",
        },
      });
    } else if (existingVersion.status !== "PUBLISHED") {
      await prisma.aiPromptVersion.update({
        where: { id: existingVersion.id },
        data: {
          bodyEn: defaults.bodyEn,
          bodyAr: defaults.bodyAr,
          status: "PUBLISHED",
          publishedAt: existingVersion.publishedAt ?? now,
          changeNote: existingVersion.changeNote ?? "Seed default published prompt",
        },
      });
    }

    const activeConfig = await prisma.aiModelConfig.findFirst({
      where: { feature, active: true },
      orderBy: { version: "desc" },
    });
    if (!activeConfig) {
      await prisma.aiModelConfig.create({
        data: {
          feature,
          provider: "STUB",
          modelName: defaults.modelName,
          fallbackModel: "gpt-4o-mini",
          temperature: 0.3,
          maxOutputTokens: 1024,
          active: true,
          version: 1,
        },
      });
    } else if (activeConfig.provider !== "STUB") {
      // Keep existing admin overrides; only ensure a STUB seed exists when none active.
    }
  }

  const globalBudget = await prisma.aiCostBudget.findFirst({
    where: { scope: "GLOBAL", feature: null },
  });
  if (!globalBudget) {
    await prisma.aiCostBudget.create({
      data: {
        scope: "GLOBAL",
        feature: null,
        monthlyUsd: 500,
        alertThreshold: 80,
        hardCap: false,
      },
    });
  }

  const kbDocs: Array<{
    slug: string;
    title: string;
    locale: "EN" | "AR";
    kind: string;
    content: string;
  }> = [
    {
      slug: "education-hand-hygiene-en",
      title: "Hand hygiene basics",
      locale: "EN",
      kind: "education",
      content:
        "Wash hands with soap and water for at least 20 seconds before eating, after using the restroom, and after coughing or sneezing. Alcohol-based sanitizer is an alternative when hands are not visibly soiled.",
    },
    {
      slug: "education-hand-hygiene-ar",
      title: "أساسيات نظافة اليدين",
      locale: "AR",
      kind: "education",
      content:
        "اغسل يديك بالماء والصابون لمدة لا تقل عن 20 ثانية قبل الأكل وبعد استخدام دورة المياه وبعد السعال أو العطاس. يمكن استخدام معقم كحولي عندما لا تكون اليدان متسختين بشكل ظاهر.",
    },
    {
      slug: "self-care-hydration-en",
      title: "Staying hydrated",
      locale: "EN",
      kind: "self-care",
      content:
        "Most adults benefit from regular water intake throughout the day. Increase fluids during heat, exercise, or illness with fever. Seek care if you cannot keep fluids down or notice dark urine with dizziness.",
    },
    {
      slug: "self-care-hydration-ar",
      title: "الحفاظ على الترطيب",
      locale: "AR",
      kind: "self-care",
      content:
        "يستفيد معظم البالغين من شرب الماء بانتظام خلال اليوم. زد السوائل في الحر أو أثناء الرياضة أو عند الحمى. اطلب الرعاية إذا لم تستطع الاحتفاظ بالسوائل أو لاحظت بولاً داكناً مع دوار.",
    },
    {
      slug: "wellness-sleep-en",
      title: "Healthy sleep habits",
      locale: "EN",
      kind: "wellness",
      content:
        "Aim for a consistent sleep schedule, a dark quiet room, and limited screens before bed. Persistent snoring, gasping, or daytime sleepiness should be discussed with a clinician.",
    },
    {
      slug: "wellness-sleep-ar",
      title: "عادات نوم صحية",
      locale: "AR",
      kind: "wellness",
      content:
        "احرص على جدول نوم ثابت وغرفة مظلمة هادئة وقلل الشاشات قبل النوم. الشخير المستمر أو توقف التنفس أو النعاس النهاري يستدعي مناقشة مع مختص رعاية صحية.",
    },
  ];

  for (const doc of kbDocs) {
    const contentHash = createHash("sha256").update(doc.content).digest("hex");
    await prisma.aiKnowledgeDoc.upsert({
      where: { slug: doc.slug },
      update: {
        title: doc.title,
        locale: doc.locale,
        kind: doc.kind,
        status: "PUBLISHED",
        content: doc.content,
        contentHash,
      },
      create: {
        slug: doc.slug,
        title: doc.title,
        locale: doc.locale,
        kind: doc.kind,
        status: "PUBLISHED",
        content: doc.content,
        contentHash,
      },
    });
  }
}

/**
 * One-time backfill (T034): migrates legacy `MedicalProfile.allergies` /
 * `.conditions` free-text string arrays into the typed `AllergyEntry` /
 * `ConditionEntry` tables introduced by EMR Module 6. This is the documented
 * migration path for patients whose history predates the typed EMR tables —
 * it is safe to re-run because entries are matched by patient + substance/
 * display (case-insensitive) and only created when missing, so it never
 * duplicates rows.
 *
 * `currentMedications` is intentionally NOT backfilled here: EMR Module 6
 * models active medications via `Prescription`/`PrescriptionLine`, not a
 * dedicated typed "entry" table, so there is no 1:1 migration target.
 */
async function backfillMedicalProfileToTypedEntries(userId: string): Promise<void> {
  const profile = await prisma.medicalProfile.findUnique({ where: { userId } });
  if (!profile) return;

  const existingAllergies = await prisma.allergyEntry.findMany({
    where: { patientUserId: userId, deletedAt: null },
    select: { substance: true },
  });
  const existingAllergyNames = new Set(
    existingAllergies.map((a) => a.substance.trim().toLowerCase()),
  );
  for (const allergy of profile.allergies) {
    const substance = allergy.trim();
    if (!substance || existingAllergyNames.has(substance.toLowerCase())) continue;
    await prisma.allergyEntry.create({
      data: {
        patientUserId: userId,
        substance,
        source: "PATIENT_REPORTED",
        recordedByUserId: userId,
      },
    });
  }

  const existingConditions = await prisma.conditionEntry.findMany({
    where: { patientUserId: userId, deletedAt: null },
    select: { display: true },
  });
  const existingConditionNames = new Set(
    existingConditions.map((c) => c.display.trim().toLowerCase()),
  );
  for (const condition of profile.conditions) {
    const display = condition.trim();
    if (!display || existingConditionNames.has(display.toLowerCase())) continue;
    await prisma.conditionEntry.create({
      data: {
        patientUserId: userId,
        display,
        status: "ACTIVE",
        source: "PATIENT_REPORTED",
        recordedByUserId: userId,
      },
    });
  }
}

async function main() {
  const cardiology = await prisma.specialty.upsert({
    where: { slug: "cardiology" },
    update: {},
    create: { slug: "cardiology", nameEn: "Cardiology", nameAr: "أمراض القلب", sortOrder: 1 },
  });

  await prisma.doctor.upsert({
    where: { slug: "dr-ahmed-al-faisal" },
    update: {},
    create: {
      slug: "dr-ahmed-al-faisal",
      status: PublishStatus.PUBLISHED,
      nameEn: "Dr. Ahmed Al-Faisal",
      nameAr: "د. أحمد الفيصل",
      titleEn: "Senior Cardiologist",
      titleAr: "استشاري قلب أول",
      bioEn: "Specializing in minimally invasive cardiac procedures and preventive heart health.",
      bioAr: "متخصص في إجراءات القلب طفيفة التوغل والوقاية من أمراض القلب.",
      languages: ["ar", "en"],
      yearsExperience: 15,
      isAvailable: true,
      specialtyId: cardiology.id,
      publishedAt: new Date(),
    },
  });

  await prisma.siteSetting.upsert({
    where: { key: "pricing.enabled" },
    update: { value: false },
    create: { key: "pricing.enabled", value: false },
  });

  const adminEmail = "admin@hakeem.local";
  const passwordHash = await hash("Admin!Pass1234", 12);
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash,
      role: "ADMIN",
      status: "ACTIVE",
      emailVerified: new Date(),
    },
    create: {
      email: adminEmail,
      name: "Bootstrap Admin",
      passwordHash,
      role: "ADMIN",
      status: "ACTIVE",
      emailVerified: new Date(),
    },
  });

  const patientEmail = "patient@hakeem.local";
  const patientHash = await hash("Patient!Pass1234", 12);
  const patient = await prisma.user.upsert({
    where: { email: patientEmail },
    update: {
      passwordHash: patientHash,
      status: "ACTIVE",
      emailVerified: new Date(),
      name: "Demo Patient",
    },
    create: {
      email: patientEmail,
      name: "Demo Patient",
      passwordHash: patientHash,
      role: "PATIENT",
      status: "ACTIVE",
      emailVerified: new Date(),
    },
  });

  await prisma.patientProfile.upsert({
    where: { userId: patient.id },
    update: { phone: "+966500000001", city: "Riyadh" },
    create: {
      userId: patient.id,
      phone: "+966500000001",
      city: "Riyadh",
      emergencyContactName: "Family Contact",
      emergencyContactPhone: "+966500000002",
      insuranceProvider: "Demo Insurance",
    },
  });

  await prisma.medicalProfile.upsert({
    where: { userId: patient.id },
    update: {},
    create: {
      userId: patient.id,
      allergies: ["Penicillin"],
      conditions: ["Mild asthma"],
      currentMedications: ["Inhaler as needed"],
    },
  });

  // ── EMR Module 6 typed history (T007) ────────────────────────────────────
  // Sample typed entries for the demo patient, mirroring the free-text
  // MedicalProfile fields above but modeled via the dedicated EMR tables
  // consumed by src/lib/emr/history.ts.
  const seedAllergy = await prisma.allergyEntry.findFirst({
    where: { patientUserId: patient.id, substance: "Penicillin", deletedAt: null },
  });
  if (!seedAllergy) {
    await prisma.allergyEntry.create({
      data: {
        patientUserId: patient.id,
        substance: "Penicillin",
        reaction: "Hives and rash",
        severity: "MODERATE",
        source: "PATIENT_REPORTED",
        criticalFlag: true,
        recordedByUserId: patient.id,
      },
    });
  }

  const seedCondition = await prisma.conditionEntry.findFirst({
    where: { patientUserId: patient.id, display: "Mild asthma", deletedAt: null },
  });
  if (!seedCondition) {
    await prisma.conditionEntry.create({
      data: {
        patientUserId: patient.id,
        display: "Mild asthma",
        icd10Code: "J45.20",
        status: "ACTIVE",
        source: "CLINICIAN_ATTESTED",
        onsetDate: new Date("2018-05-01"),
        recordedByUserId: patient.id,
      },
    });
  }

  const seedImmunization = await prisma.immunizationEntry.findFirst({
    where: { patientUserId: patient.id, vaccineName: "Influenza (seasonal)", deletedAt: null },
  });
  if (!seedImmunization) {
    await prisma.immunizationEntry.create({
      data: {
        patientUserId: patient.id,
        vaccineName: "Influenza (seasonal)",
        administeredOn: new Date(new Date().getFullYear() - 1, 9, 15),
        source: "CLINICIAN_ATTESTED",
        lotNumber: "FLU-2025-118",
        recordedByUserId: patient.id,
      },
    });
  }

  const seedFamilyHistory = await prisma.familyHistoryEntry.findFirst({
    where: {
      patientUserId: patient.id,
      relation: "Father",
      conditionDisplay: "Type 2 diabetes",
      deletedAt: null,
    },
  });
  if (!seedFamilyHistory) {
    await prisma.familyHistoryEntry.create({
      data: {
        patientUserId: patient.id,
        relation: "Father",
        conditionDisplay: "Type 2 diabetes",
        notes: "Diagnosed in his 50s (demo)",
        source: "PATIENT_REPORTED",
        recordedByUserId: patient.id,
      },
    });
  }

  // Applies the T034 backfill helper to the demo patient. For this patient
  // it is a no-op (the entries above already cover "Penicillin"/"Mild
  // asthma"), which demonstrates the helper's idempotency.
  await backfillMedicalProfileToTypedEntries(patient.id);

  await prisma.lifestyleProfile.upsert({
    where: { patientUserId: patient.id },
    update: {},
    create: {
      patientUserId: patient.id,
      smoking: "Never",
      alcohol: "Occasional",
      activity: "Moderate (2-3x/week)",
      notes: "Demo lifestyle profile",
    },
  });

  await prisma.emergencyInfo.upsert({
    where: { patientUserId: patient.id },
    update: {},
    create: {
      patientUserId: patient.id,
      contactName: "Family Contact",
      contactPhone: "+966500000002",
      criticalAlertsText: "Penicillin allergy - avoid beta-lactam antibiotics",
      clinicianCriticalFlag: true,
    },
  });

  // ── EMR consent config (T075) ────────────────────────────────────────────
  // ConsentType + ConsentTextVersion reference data consumed by
  // src/lib/emr/consents.ts. Not patient-specific; seeded once globally.
  const consentSeeds: Array<{
    code: string;
    nameEn: string;
    nameAr: string;
    bodyEn: string;
    bodyAr: string;
  }> = [
    {
      code: "TELEHEALTH",
      nameEn: "Telehealth Consent",
      nameAr: "موافقة الطب عن بعد",
      bodyEn:
        "I consent to receive medical care via telehealth/video consultation, understanding its benefits and limitations compared to in-person care.",
      bodyAr:
        "أوافق على تلقي الرعاية الطبية عبر الطب عن بعد/الاستشارة بالفيديو، مع إدراكي لفوائدها وحدودها مقارنة بالرعاية الحضورية.",
    },
    {
      code: "DATA_SHARING",
      nameEn: "Data Sharing Consent",
      nameAr: "موافقة مشاركة البيانات",
      bodyEn:
        "I consent to sharing my medical records with authorized clinicians involved in my care for coordination and continuity purposes.",
      bodyAr:
        "أوافق على مشاركة سجلاتي الطبية مع الأطباء المخولين المشاركين في رعايتي لأغراض التنسيق واستمرارية الرعاية.",
    },
  ];
  for (const consentSeed of consentSeeds) {
    const consentType = await prisma.consentType.upsert({
      where: { code: consentSeed.code },
      update: { nameEn: consentSeed.nameEn, nameAr: consentSeed.nameAr },
      create: {
        code: consentSeed.code,
        nameEn: consentSeed.nameEn,
        nameAr: consentSeed.nameAr,
      },
    });

    const versionsByLocale: Array<{ locale: "EN" | "AR"; body: string }> = [
      { locale: "EN", body: consentSeed.bodyEn },
      { locale: "AR", body: consentSeed.bodyAr },
    ];
    for (const { locale, body } of versionsByLocale) {
      await prisma.consentTextVersion.upsert({
        where: { typeId_version_locale: { typeId: consentType.id, version: 1, locale } },
        update: { body, bodyHash: createHash("sha256").update(body).digest("hex") },
        create: {
          typeId: consentType.id,
          version: 1,
          locale,
          body,
          bodyHash: createHash("sha256").update(body).digest("hex"),
        },
      });
    }
  }

  await prisma.portalSettings.upsert({
    where: { userId: patient.id },
    update: {},
    create: { userId: patient.id, locale: "EN" },
  });

  const publishedDoctor = await prisma.doctor.findFirst({
    where: { status: "PUBLISHED" },
  });

  // Captured so the EMR timeline seeding below (T007) can reference the
  // exact rows created here without a second lookup.
  let timelinePrescriptionSeed: Prescription | undefined;
  let timelineLabSeed: LabResult | undefined;

  // Linked doctor account for portal QA (Module 4)
  const doctorEmail = "doctor@hakeem.local";
  const doctorHash = await hash("Doctor!Pass1234", 12);
  if (publishedDoctor) {
    await prisma.user.upsert({
      where: { email: doctorEmail },
      update: {
        passwordHash: doctorHash,
        role: "DOCTOR",
        status: "ACTIVE",
        emailVerified: new Date(),
        name: "Demo Doctor",
        doctorProfileId: publishedDoctor.id,
        doctorApproval: "APPROVED",
      },
      create: {
        email: doctorEmail,
        name: "Demo Doctor",
        passwordHash: doctorHash,
        role: "DOCTOR",
        status: "ACTIVE",
        emailVerified: new Date(),
        doctorProfileId: publishedDoctor.id,
        doctorApproval: "APPROVED",
      },
    });

    const doctorUser = await prisma.user.findUnique({ where: { email: doctorEmail } });
    if (doctorUser) {
      await prisma.portalSettings.upsert({
        where: { userId: doctorUser.id },
        update: {},
        create: { userId: doctorUser.id, locale: "EN" },
      });

      const todayStart = new Date();
      todayStart.setHours(9, 0, 0, 0);
      const todayEnd = new Date(todayStart.getTime() + 30 * 60 * 1000);
      const existingToday = await prisma.appointment.findFirst({
        where: {
          patientUserId: patient.id,
          doctorId: publishedDoctor.id,
          status: { in: ["CHECKED_IN", "CONFIRMED", "IN_PROGRESS"] },
          startAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      });
      if (!existingToday) {
        await prisma.appointment.create({
          data: {
            patientUserId: patient.id,
            doctorId: publishedDoctor.id,
            mode: "VIDEO",
            status: "CHECKED_IN",
            startAt: todayStart,
            endAt: todayEnd,
            checkedInAt: new Date(),
            reason: "Follow-up consultation (demo)",
          },
        });
      }

      await prisma.notification.create({
        data: {
          recipientUserId: doctorUser.id,
          category: "QUEUE",
          title: "Patient checked in",
          body: "Demo Patient is waiting in your queue.",
          href: "/doctor/queue",
        },
      }).catch(() => undefined);

      await prisma.labResult.create({
        data: {
          patientUserId: patient.id,
          title: "Lipid Panel (preliminary)",
          releaseStatus: "PENDING_REVIEW",
          phase: "PRELIMINARY",
          criticalFlag: false,
          resultedAt: new Date(),
          summary: "Awaiting physician review (demo)",
        },
      }).catch(() => undefined);
    }
  }

  if (publishedDoctor) {
    const startAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    startAt.setHours(10, 0, 0, 0);
    const endAt = new Date(startAt.getTime() + 30 * 60 * 1000);
    const existing = await prisma.appointment.findFirst({
      where: { patientUserId: patient.id, status: "CONFIRMED" },
    });
    if (!existing) {
      await prisma.appointment.create({
        data: {
          patientUserId: patient.id,
          doctorId: publishedDoctor.id,
          mode: "VIDEO",
          status: "CONFIRMED",
          startAt,
          endAt,
          reason: "General consultation",
        },
      });
    }

    timelinePrescriptionSeed = await prisma.prescription.create({
      data: {
        patientUserId: patient.id,
        medicationName: "Vitamin D3",
        instructions: "1 tablet daily",
        status: "ACTIVE",
        prescribedAt: new Date(),
        endsAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        doctorId: publishedDoctor.id,
      },
    }).catch(() => undefined);

    await prisma.prescription.create({
      data: {
        patientUserId: patient.id,
        medicationName: "Amoxicillin (draft)",
        instructions: "Draft prescription pending physician review",
        status: "DRAFT",
        prescribedAt: new Date(),
        doctorId: publishedDoctor.id,
        lines: {
          create: [
            {
              medicationName: "Amoxicillin",
              dose: "500mg",
              frequency: "TID",
              sortOrder: 0,
            },
          ],
        },
      },
    }).catch(() => undefined);

    timelineLabSeed = await prisma.labResult.create({
      data: {
        patientUserId: patient.id,
        title: "Complete Blood Count",
        releaseStatus: "RELEASED",
        phase: "FINAL",
        resultedAt: new Date(),
        summary: "Within normal limits (demo)",
      },
    }).catch(() => undefined);

    await prisma.medicalRecord.create({
      data: {
        patientUserId: patient.id,
        title: "Initial consultation summary",
        recordType: "encounter",
        summary: "Demo medical record for portal QA.",
        recordedAt: new Date(),
        doctorId: publishedDoctor.id,
      },
    }).catch(() => undefined);
  }

  await prisma.notification.create({
    data: {
      recipientUserId: patient.id,
      category: "SYSTEM",
      title: "Welcome to Hakeem Patient Portal",
      body: "Your dashboard is ready. Book an appointment anytime.",
      href: "/patient/appointments/book",
    },
  }).catch(() => undefined);

  await prisma.paymentObligation.upsert({
    where: { idempotencyKey: `seed-pending-${patient.id}` },
    update: {},
    create: {
      patientUserId: patient.id,
      description: "Consultation fee (demo)",
      amountCents: 15000,
      currency: "SAR",
      status: "PENDING",
      idempotencyKey: `seed-pending-${patient.id}`,
    },
  });

  await prisma.paymentObligation.upsert({
    where: { idempotencyKey: `seed-paid-${patient.id}` },
    update: { status: "PAID" },
    create: {
      patientUserId: patient.id,
      description: "Completed consultation (demo paid)",
      amountCents: 20000,
      currency: "SAR",
      status: "PAID",
      idempotencyKey: `seed-paid-${patient.id}`,
    },
  });

  const adminUser = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (adminUser) {
    await prisma.securityAuditEvent.create({
      data: {
        type: "admin.bootstrap",
        outcome: "SUCCESS",
        actorUserId: adminUser.id,
        meta: { source: "seed" },
      },
    }).catch(() => undefined);
  }

  await prisma.user.upsert({
    where: { email: "pending-doctor@hakeem.local" },
    update: { doctorApproval: "PENDING_APPROVAL", role: "DOCTOR", status: "PENDING_VERIFICATION" },
    create: {
      email: "pending-doctor@hakeem.local",
      name: "Pending Doctor Applicant",
      role: "DOCTOR",
      status: "PENDING_VERIFICATION",
      doctorApproval: "PENDING_APPROVAL",
    },
  });

  const platformDefaults: Array<{ key: string; valueType: "BOOLEAN" | "STRING"; value: string }> = [
    { key: "maintenanceMode", valueType: "BOOLEAN", value: "false" },
    { key: "maintenanceMessage", valueType: "STRING", value: "Platform is under maintenance." },
    { key: "supportEmail", valueType: "STRING", value: "support@hakeem.example" },
    { key: "supportPhone", valueType: "STRING", value: "+966500000000" },
    { key: "ai.patientEnabled", valueType: "BOOLEAN", value: "true" },
    { key: "ai.doctorDocumentationEnabled", valueType: "BOOLEAN", value: "true" },
    { key: "ai.doctorPrescriptionEnabled", valueType: "BOOLEAN", value: "true" },
  ];
  for (const s of platformDefaults) {
    await prisma.platformSetting.upsert({
      where: { key: s.key },
      update: {},
      create: { key: s.key, valueType: s.valueType, value: s.value },
    });
  }

  await prisma.systemHealthSnapshot.create({
    data: {
      overall: "HEALTHY",
      components: [
        { key: "APP", ok: true, message: "Seed healthy" },
        { key: "DATABASE", ok: true, message: "Connected" },
      ],
    },
  }).catch(() => undefined);

  // ── EMR timeline events (T007) ───────────────────────────────────────────
  // A few representative EmrTimelineEvent rows spanning ENCOUNTER,
  // PRESCRIPTION, and LAB — the same shape src/lib/emr/timeline.ts'
  // `upsertTimelineEvent`/`backfillTimelineForPatient` produce, upserted
  // directly here (keyed by refType+refId+type, matching the model's
  // @@unique) to stay idempotent across repeated `prisma db seed` runs.
  const encounterRecord = await prisma.medicalRecord.findFirst({
    where: { patientUserId: patient.id, recordType: "encounter" },
    orderBy: { recordedAt: "desc" },
  });
  if (encounterRecord) {
    await prisma.emrTimelineEvent.upsert({
      where: {
        refType_refId_type: {
          refType: "MedicalRecord",
          refId: encounterRecord.id,
          type: "ENCOUNTER",
        },
      },
      update: {},
      create: {
        patientUserId: patient.id,
        type: "ENCOUNTER",
        effectiveAt: encounterRecord.recordedAt,
        refType: "MedicalRecord",
        refId: encounterRecord.id,
        title: encounterRecord.title,
        summary: encounterRecord.summary,
        visibility: "ALL_AUTHORIZED",
      },
    });
  }

  if (timelinePrescriptionSeed) {
    await prisma.emrTimelineEvent.upsert({
      where: {
        refType_refId_type: {
          refType: "Prescription",
          refId: timelinePrescriptionSeed.id,
          type: "PRESCRIPTION",
        },
      },
      update: {},
      create: {
        patientUserId: patient.id,
        type: "PRESCRIPTION",
        effectiveAt: timelinePrescriptionSeed.prescribedAt,
        refType: "Prescription",
        refId: timelinePrescriptionSeed.id,
        title: `Prescription (${timelinePrescriptionSeed.status})`,
        summary: timelinePrescriptionSeed.medicationName,
        visibility: "ALL_AUTHORIZED",
      },
    });
  }

  if (timelineLabSeed) {
    await prisma.emrTimelineEvent.upsert({
      where: {
        refType_refId_type: {
          refType: "LabResult",
          refId: timelineLabSeed.id,
          type: "LAB",
        },
      },
      update: {},
      create: {
        patientUserId: patient.id,
        type: "LAB",
        effectiveAt: timelineLabSeed.resultedAt,
        refType: "LabResult",
        refId: timelineLabSeed.id,
        title: timelineLabSeed.title,
        summary: timelineLabSeed.releaseStatus,
        visibility: "ALL_AUTHORIZED",
      },
    });
  }

  // ── AI Healthcare Platform Module 7 (T004) ───────────────────────────────
  await seedAiModuleDefaults();

  console.log(
    "Seed complete (admin@hakeem.local / patient@hakeem.local / doctor@hakeem.local Doctor!Pass1234)",
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
