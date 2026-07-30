"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { useUpload } from "@/hooks/platform/use-upload";
import {
  fetchUploadScanStatus,
  uploadPlatformFile,
} from "@/actions/platform/upload";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Invalid file read result"));
        return;
      }
      const base64 = result.includes(",") ? result.split(",")[1]! : result;
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export function FileUploadField({
  purpose = "other",
  accept = "application/pdf,image/jpeg,image/png,image/webp",
  onUploaded,
}: {
  purpose?: string;
  accept?: string;
  onUploaded?: (uploadId: string) => void;
}) {
  const t = useTranslations("platform");
  const [uploadId, setUploadId] = useState<string | undefined>();
  const [localError, setLocalError] = useState<string | null>(null);

  const uploadFile = useCallback(
    async (file: File) => {
      setLocalError(null);
      const base64 = await fileToBase64(file);
      const result = await uploadPlatformFile({
        fileName: file.name,
        contentType: file.type || "application/octet-stream",
        purpose,
        base64,
      });
      if (!result.ok) {
        throw new Error(result.message ?? result.code);
      }
      setUploadId(result.data.uploadId);
      onUploaded?.(result.data.uploadId);
      return { uploadId: result.data.uploadId };
    },
    [purpose, onUploaded],
  );

  const { scanStatus, isScanPending, upload, isUploading, uploadError } = useUpload({
    queryKey: ["platform-upload", purpose],
    uploadId,
    fetchScanStatus: async (id) => {
      const res = await fetchUploadScanStatus(id);
      if (!res.ok) throw new Error(res.code);
      return { scanStatus: res.scanStatus };
    },
    uploadFile,
  });

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await upload(file);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : t("error.generic"));
    }
  }

  const errorMessage =
    localError ?? (uploadError instanceof Error ? uploadError.message : uploadError ? t("error.generic") : null);

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="platform-file-upload">{t("upload.label")}</Label>
        <input
          id="platform-file-upload"
          type="file"
          accept={accept}
          disabled={isUploading}
          onChange={onChange}
          className="block w-full text-sm text-on-surface-variant file:mr-4 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-on-primary"
        />
      </div>
      {isUploading ? <p className="text-sm text-on-surface-variant">{t("upload.uploading")}</p> : null}
      {uploadId && isScanPending ? (
        <p className="text-sm text-on-surface-variant">{t("upload.scanPending")}</p>
      ) : null}
      {uploadId && scanStatus === "CLEAN" ? (
        <p className="text-sm text-med-green">{t("upload.ready")}</p>
      ) : null}
      {uploadId && scanStatus === "REJECTED" ? (
        <p className="text-sm text-warm-coral">{t("upload.rejected")}</p>
      ) : null}
      {errorMessage ? <p className="text-sm text-warm-coral">{errorMessage}</p> : null}
    </div>
  );
}
