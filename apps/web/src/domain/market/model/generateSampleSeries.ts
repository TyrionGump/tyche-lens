function createSeededRandom(seed: number): () => number {
  let state = seed % 2_147_483_647;
  if (state <= 0) state += 2_147_483_646;
  return () => (state = (state * 16_807) % 2_147_483_647) / 2_147_483_647;
}

/**
 * Builds a stable price walk whose eased closing drift lands on `endValue` without creating a
 * visually artificial jump in the final sample.
 */
export function generateSampleSeries(
  seed: number,
  pointCount: number,
  endValue: number,
  volatility: number,
): number[] {
  const random = createSeededRandom(seed);
  const points: number[] = [];

  let value = endValue * (1 - (random() - 0.5) * volatility * 2);
  for (let index = 0; index < pointCount; index++) {
    value += (random() - 0.48) * endValue * volatility * 0.18;
    points.push(value);
  }

  const drift = endValue - points[points.length - 1];
  const lastIndex = points.length - 1;
  for (let index = 0; index <= lastIndex; index++) {
    const progress = lastIndex === 0 ? 1 : index / lastIndex;
    points[index] += drift * progress * progress;
  }

  return points;
}
