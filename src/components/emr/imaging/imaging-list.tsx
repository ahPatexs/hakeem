import {
  LabResultsList,
  type LabResultListItem,
} from "@/components/emr/labs/lab-results-list";

/** Imaging list reuses the labs list chrome (Stitch labs/radiology pack). */
export type ImagingListItem = LabResultListItem;

export function ImagingList({
  items,
  title,
  emptyLabel,
  locale = "en",
}: {
  items: ImagingListItem[];
  title: string;
  emptyLabel: string;
  locale?: string;
}) {
  return (
    <LabResultsList
      items={items}
      title={title}
      emptyLabel={emptyLabel}
      locale={locale}
    />
  );
}
