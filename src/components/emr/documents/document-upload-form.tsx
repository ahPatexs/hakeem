"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { emrRegisterDocument } from "@/actions/emr/documents";

const KIND_OPTIONS = [
  "PATIENT_UPLOAD",
  "OTHER",
  "REFERRAL",
  "CERTIFICATE",
  "CONSENT_EVIDENCE",
  "IMAGING_REPORT",
  "RECORD_ATTACHMENT",
  "LAB_ATTACHMENT",
] as const;

type Kind = (typeof KIND_OPTIONS)[number];

const KIND_LABEL_KEYS: Record<Kind, string> = {
  PATIENT_UPLOAD: "kindPatientUpload",
  OTHER: "kindOther",
  REFERRAL: "kindReferral",
  CERTIFICATE: "kindCertificate",
  CONSENT_EVIDENCE: "kindConsent",
  IMAGING_REPORT: "kindImaging",
  RECORD_ATTACHMENT: "kindRecord",
  LAB_ATTACHMENT: "kindLab",
};

/** Upload a clinical document into the EMR chart (T138 / T139). */
export function DocumentUploadForm({
  patientUserId,
  allowedKinds,
}: {
  patientUserId: string;
  allowedKinds?: Kind[];
}) {
  const t = useTranslations("emr");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<Kind>(allowedKinds?.[0] ?? "PATIENT_UPLOAD");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const kinds = allowedKinds?.length ? allowedKinds : [...KIND_OPTIONS];

  function submit() {
    if (!file || !title.trim()) {
      setError(t("documents.uploadHint"));
      return;
    }
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      try {
        const buffer = await file.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = "";
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
        const base64 = btoa(binary);

        const res = await emrRegisterDocument({
          patientUserId,
          kind,
          title: title.trim(),
          contentType: file.type || "application/octet-stream",
          fileName: file.name,
          base64,
        });
        if (!res.ok) {
          const code = res.code;
          if (code === "VALIDATION_ERROR") setError(t("documents.uploadInvalidType"));
          else if (code === "FORBIDDEN") setError(t("documents.uploadForbidden"));
          else setError(t("error"));
          return;
        }
        setTitle("");
        setFile(null);
        setSuccess(t("documents.uploadSuccess"));
        router.refresh();
      } catch {
        setError(t("error"));
      }
    });
  }

  return (
    <section className="space-y-3 rounded-xl border border-outline-variant/20 bg-surface-container-low p-5">
      <h2 className="font-headline text-lg text-primary">{t("documents.upload")}</h2>
      <p className="text-xs text-on-surface-variant">{t("documents.uploadHint")}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-xs font-medium text-on-surface-variant">{t("documents.titleField")}</span>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-on-surface-variant">{t("documents.kind")}</span>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as Kind)}
            className="flex h-10 w-full rounded-xl border border-outline-variant/30 bg-background px-3 text-sm"
          >
            {kinds.map((k) => (
              <option key={k} value={k}>
                {t(`documents.${KIND_LABEL_KEYS[k]}`)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <input
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.txt,application/pdf,image/*"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="block w-full text-sm text-on-surface-variant"
      />
      {file ? (
        <p className="text-xs text-on-surface-variant">
          {file.name} · {(file.size / 1024).toFixed(1)} KB
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="text-sm text-med-green" role="status">
          {success}
        </p>
      ) : null}
      <Button type="button" variant="soft" size="sm" disabled={pending || !file || !title.trim()} onClick={submit}>
        {pending ? t("loading") : t("documents.upload")}
      </Button>
    </section>
  );
}