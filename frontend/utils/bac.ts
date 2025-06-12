export const ALCOHOL_DENSITY = 0.789; // g/mL

function getTotalBodyWater(gender: string, age: number, height: number, weight: number): number {
  if (gender.toUpperCase() === "MALE") {
    return 2.447 - 0.09516 * age + 0.1074 * height + 0.3362 * weight;
  }
  return -2.097 + 0.1069 * height + 0.2466 * weight;
}

function getWidmarkFactor(gender: string): number {
  return gender.toUpperCase() === "MALE" ? 0.68 : 0.55;
}

export function calculateDrinkBAC(
  volumeMl: number,
  strengthDecimal: number,
  weightKg: number,
  gender: string,
  age?: number,
  heightCm?: number,
): number {
  if (!volumeMl || !strengthDecimal || !weightKg || !gender) return 0;
  const alcoholGrams = volumeMl * strengthDecimal * ALCOHOL_DENSITY;

  if (age !== undefined && heightCm !== undefined) {
    const tbw = getTotalBodyWater(gender, age, heightCm, weightKg);
    return Math.max(0, alcoholGrams / (tbw * 10));
  }

  const bodyWeightG = weightKg * 1000;
  const widmark = getWidmarkFactor(gender);
  return Math.max(0, (alcoholGrams / (bodyWeightG * widmark)) * 100);
}

export function estimateCurrentBAC(
  states: { time: number | string; bac: number }[] | undefined,
): number {
  if (!states || states.length === 0) return 0;
  const now = Date.now();
  // Find the most recent state at or before "now". States may end with a
  // future sobriety point, so simply taking the last entry can underestimate
  // the actual BAC.
  let last = states[0];
  for (const point of states) {
    const t = typeof point.time === "number" ? point.time : new Date(point.time).getTime();
    if (t <= now) {
      last = point;
    } else {
      break;
    }
  }
  const lastTime = typeof last.time === "number" ? last.time : new Date(last.time).getTime();
  const hours = Math.max(0, (now - lastTime) / 3600000);
  return Math.max(0, last.bac - 0.015 * hours);
}
