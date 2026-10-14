// Small, readable physics for the page. Illustrative, not the rig's fitted model.

/** Dew point in °C from air temperature (°C) and relative humidity (%), Magnus formula. */
export function dewPoint(tempC: number, rhPct: number): number {
  const b = 17.62
  const c = 243.12
  const g = Math.log(Math.max(rhPct, 1) / 100) + (b * tempC) / (c + tempC)
  return (c * g) / (b - g)
}

export const SAFETY_MARGIN_C = 2
export const CHILLER_MIN_C = 12
export const CHIP_LIMIT_C = 70

/** Lowest coolant supply temperature that stays above the dew point with margin. */
export function coolantFloor(tempC: number, rhPct: number): number {
  return Math.max(dewPoint(tempC, rhPct) + SAFETY_MARGIN_C, CHILLER_MIN_C)
}

/** Share of heat the liquid loop can carry at a given coolant supply temperature. */
export function liquidShare(coolantC: number): number {
  return clamp(0.9 - 0.035 * Math.max(0, coolantC - CHILLER_MIN_C), 0.2, 0.9)
}

/** Fan power relative to full speed: the fan affinity (cube) law. */
export function fanPowerRatio(speed: number): number {
  return speed ** 3
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v))
}

export interface RigState {
  t: number
  cpu: number
  heatW: number
  rh: number
  dewC: number
  coolantC: number
  chipC: number
  liquid: number
  fan: number
  coolingW: number
}

const AMBIENT_C = 24

/** Steps a toy rig: four heaters following CPU load, a coolant loop held above dew point, fans taking the rest. */
export class RigSim {
  private chip = 38
  constructor(private trace: number[]) {}

  step(t: number, dt: number): RigState {
    const n = this.trace.length
    const i = Math.floor(t) % n
    const frac = t - Math.floor(t)
    const cpu = this.trace[i] * (1 - frac) + this.trace[(i + 1) % n] * frac
    const heatW = 20 + 0.8 * cpu
    // Humidity drifts over the loop so the dew point limit visibly moves the split.
    const rh = 52 + 20 * Math.sin((2 * Math.PI * t) / n - 0.6)
    const dewC = dewPoint(AMBIENT_C, rh)
    const coolantSupply = coolantFloor(AMBIENT_C, rh)
    const liquid = liquidShare(coolantSupply)
    const fan = clamp(((1 - liquid) * heatW) / 40, 0.18, 1)
    const target = 30 + 0.32 * heatW * (1 - 0.3 * liquid)
    this.chip += (target - this.chip) * Math.min(1, dt / 8)
    const cop = 0.6 + 0.08 * (coolantSupply - CHILLER_MIN_C)
    const coolingW = 6 * fanPowerRatio(fan) + 4 * liquid + (liquid * heatW) / cop / 4
    return {
      t, cpu, heatW, rh, dewC,
      coolantC: coolantSupply + (liquid * heatW) / 40,
      chipC: this.chip,
      liquid, fan, coolingW,
    }
  }
}
