/**
 * Sort an animal list by tag ID first (numerically when all-digit), then by name.
 * Used wherever animals appear in dropdowns, selects, or checkbox lists.
 */
export function sortByTagThenName<T extends { tagId: string; name: string }>(
  animals: T[]
): T[] {
  return [...animals].sort((a, b) => {
    const aIsNum = /^\d+$/.test(a.tagId);
    const bIsNum = /^\d+$/.test(b.tagId);
    let tagCmp: number;
    if (aIsNum && bIsNum) {
      tagCmp = Number(a.tagId) - Number(b.tagId);
    } else {
      tagCmp = a.tagId.localeCompare(b.tagId, undefined, {
        numeric: true,
        sensitivity: "base",
      });
    }
    if (tagCmp !== 0) return tagCmp;
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });
}
