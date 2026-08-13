import type { Doctor, Specialty } from "@prisma/client";
import { pickLocalized } from "./locale";
import type { DoctorDetail, DoctorSummary, ImageRef, Locale } from "./types";

type DoctorWithSpecialty = Doctor & { specialty: Specialty };

export function mapDoctorSummary(row: DoctorWithSpecialty, locale: Locale): DoctorSummary {
  const bio = pickLocalized(locale, row.bioEn, row.bioAr);
  const photo: ImageRef | null = row.photoUrl
    ? {
        url: row.photoUrl,
        alt: pickLocalized(locale, row.photoAltEn ?? row.nameEn, row.photoAltAr ?? row.nameAr),
      }
    : null;

  return {
    slug: row.slug,
    name: pickLocalized(locale, row.nameEn, row.nameAr),
    title: pickLocalized(locale, row.titleEn, row.titleAr) || null,
    specialty: {
      slug: row.specialty.slug,
      name: pickLocalized(locale, row.specialty.nameEn, row.specialty.nameAr),
    },
    photo,
    languages: row.languages,
    yearsExperience: row.yearsExperience,
    isAvailable: row.isAvailable,
    bioSnippet: bio ? bio.slice(0, 160) : undefined,
  };
}

export function mapDoctorDetail(row: DoctorWithSpecialty, locale: Locale): DoctorDetail {
  const summary = mapDoctorSummary(row, locale);
  const bio = pickLocalized(locale, row.bioEn, row.bioAr) || null;
  const credentials =
    locale === "ar"
      ? row.credentialsAr.length
        ? row.credentialsAr
        : row.credentialsEn
      : row.credentialsEn.length
        ? row.credentialsEn
        : row.credentialsAr;
  const description =
    pickLocalized(locale, row.metaDescEn, row.metaDescAr) || bio || summary.title || summary.name;

  return {
    ...summary,
    bio,
    credentials,
    seo: {
      title: summary.name,
      description,
      image: summary.photo,
    },
  };
}