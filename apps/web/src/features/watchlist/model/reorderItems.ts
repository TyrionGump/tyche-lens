export function reorderItems<T>(items: readonly T[], fromIndex: number, toIndex: number): T[] {
  const reorderedItems = [...items];
  const movedItems = reorderedItems.splice(fromIndex, 1);
  if (movedItems.length === 0) return reorderedItems;

  reorderedItems.splice(toIndex, 0, movedItems[0]);
  return reorderedItems;
}
