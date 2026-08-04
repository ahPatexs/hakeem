/** Admin list/export constants — kept outside `"use server"` modules (Next.js restriction). */

export const REASON_MIN = 10;
export const PAGE_SIZE = 20;
export const EXPORT_ROW_CAP = Number(process.env.ADMIN_EXPORT_ROW_CAP ?? 10_000);
