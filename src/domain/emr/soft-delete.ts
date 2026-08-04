/** Prisma `where` fragment that excludes soft-deleted chart rows from default lists. */
export function softDeleteWhere(): { deletedAt: null } {
  return { deletedAt: null };
}

export function isSoftDeleted(row: { deletedAt?: Date | null }): boolean {
  return row.deletedAt != null;
}
