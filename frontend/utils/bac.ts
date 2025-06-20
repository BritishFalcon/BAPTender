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

export function calculateCurrentBAC(
  states: { time: number | string; bac: number }[] | undefined,
): number {
  if (!states || states.length === 0) return 0;

  const now = Date.now();

  let lastTime =
    typeof states[0].time === "number"
      ? states[0].time
      : new Date(states[0].time).getTime();
  let lastBac = states[0].bac;

  for (const s of states) {
    const t = typeof s.time === "number" ? s.time : new Date(s.time).getTime();
    if (t <= now) {
      lastTime = t;
      lastBac = s.bac;
    } else {
      break;
    }
  }

  const hoursElapsed = Math.max(0, (now - lastTime) / 3600000);
  return Math.max(0, lastBac - 0.015 * hoursElapsed);
}
