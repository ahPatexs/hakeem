import { setRequestLocale, getTranslations } from "next-intl/server";
import { QueueBoard, QueueScheduleLink } from "@/components/doctor/schedule/queue-board";
import { getPatientQueue } from "@/actions/doctor/schedule";
import { ErrorState } from "@/components/doctor/shared";

export default async function DoctorQueuePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("doctor.queue");
  const ts = await getTranslations("doctor.status");
  const tSchedule = await getTranslations("doctor.schedule");

  const result = await getPatientQueue();
  if (!result.ok) {
    return <ErrorState title={t("title")} message={t("loadError")} />;
  }

  const { checkedIn, inProgress } = result.data;
  const nextName = checkedIn[0]?.patient.name ?? checkedIn[0]?.patient.email ?? t("noneWaiting");
  const dateLabel = new Date().toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-6">
      <section className="welcome-banner space-y-5 p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-white/80">{t("subtitle")}</p>
            <h1 className="font-headline mt-1 text-2xl text-white md:text-3xl">{t("title")}</h1>
            <p className="mt-1 text-sm text-white/85">{dateLabel}</p>
          </div>
          <QueueScheduleLink href="/doctor/schedule" label={t("openSchedule")} />
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="rounded-2xl bg-white/12 px-4 py-3">
            <p className="text-2xl font-bold tabular-nums text-white">{inProgress.length}</p>
            <p className="text-xs font-medium text-white/80">{t("inProgress")}</p>
          </div>
          <div className="rounded-2xl bg-white/12 px-4 py-3">
            <p className="text-2xl font-bold tabular-nums text-white">{checkedIn.length}</p>
            <p className="text-xs font-medium text-white/80">{t("waiting")}</p>
          </div>
          <div className="rounded-2xl bg-white/12 px-4 py-3">
            <p className="truncate text-sm font-semibold text-white">{nextName}</p>
            <p className="text-xs font-medium text-white/80">{t("nextUp")}</p>
          </div>
        </div>
      </section>

      <QueueBoard
        checkedIn={checkedIn}
        inProgress={inProgress}
        locale={locale}
        emptyTitle={t("emptyTitle")}
        emptyDescription={t("emptyDescription")}
        waitingTitle={t("waiting")}
        inProgressTitle={t("inProgress")}
        nowEmpty={t("nowEmpty")}
        videoLabel={tSchedule("video")}
        inPersonLabel={tSchedule("inPerson")}
        liveLabel={t("live")}
        arrivedLabel={(time) => t("arrivedAt", { time })}
        waitLabel={(minutes) => t("waitTime", { minutes })}
        scheduledLabel={(time) => t("scheduledAt", { time })}
        statusLabel={(status) => ts(status)}
      />
    </div>
  );
}
