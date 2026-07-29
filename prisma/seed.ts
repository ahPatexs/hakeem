/**
 * Seed script for Neon/Prisma.
 * Requires DATABASE_URL. Module 0 uses StaticContentProvider until Neon is provisioned.
 *
 * Run: npm run prisma:seed
 */
import { PrismaClient, PublishStatus } from "@prisma/client";

const prisma = new PrismaClient();

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

  console.log("Seed complete");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
