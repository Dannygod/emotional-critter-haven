/**
 * Compute updated mood / energy values after an emotion input.
 */
export function computeMoodUpdate(
  current: { mood_score: number; negative_energy: number; positive_energy: number },
  intensity: number,
  isComforting: boolean,
) {
  const newNeg = isComforting
    ? Math.max(0, current.negative_energy - 10)
    : Math.min(100, current.negative_energy + intensity * 0.15);

  const newPos = isComforting
    ? Math.min(100, current.positive_energy + 12)
    : current.positive_energy;

  const newMood = Math.max(
    -100,
    Math.min(
      100,
      isComforting
        ? current.mood_score + 10
        : current.mood_score - intensity * 0.1,
    ),
  );

  return {
    negativeEnergy: Math.round(newNeg),
    positiveEnergy: Math.round(newPos),
    moodScore: Math.round(newMood),
  };
}
