/**
 * One-shot EMR timeline backfill (T089).
 *
 * Usage:
 *   npx tsx scripts/emr-backfill-timeline.ts [patientUserId]
 *
 * When patientUserId is omitted, backfills all patients who have appointments,
 * prescriptions, labs, SOAP notes, or clinical documents.
 */
import { PrismaClient } from "@prisma/client";
import { backfillTimelineForPatient } from "../src/lib/emr/timeline";

const prisma = new PrismaClient();

async function main() {
  const argId = process.argv[2];
  const patientIds = argId
    ? [argId]
    : (
        await prisma.user.findMany({
          where: { role: "PATIENT" },
          select: { id: true },
        })
      ).map((u) => u.id);

  let total = 0;
  for (const id of patientIds) {
    const result = await backfillTimelineForPatient(id);
    if (result.ok) {
      console.log(`patient ${id}: upserted ${result.data.upserted}`);
      total += result.data.upserted;
    } else {
      console.error(`patient ${id}: ${result.code} ${result.message ?? ""}`);
    }
  }
  console.log(`Done. Total upsert attempts: ${total}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
