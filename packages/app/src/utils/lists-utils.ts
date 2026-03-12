export const groupBy = <T, K extends string | number | symbol>(
  array: T[],
  keyFn: (item: T) => K,
): Record<K, T[]> => {
  const result: Record<K, T[]> = {} as Record<K, T[]>;
  for (const item of array) {
    const key = keyFn(item);

    if (!result[key]) {
      result[key] = [];
    }

    result[key].push(item);
  }

  return result;
}