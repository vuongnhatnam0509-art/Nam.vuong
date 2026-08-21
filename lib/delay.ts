import { parseStamp } from "./format";

const DONE = /discharg|delivered|gate out|empty out|completed|available for pickup|ata discharged/i;

export type DelayVerdict = {
  delayed: boolean;
  delayHours: number | null;
  delayNote: string | null;
};

export function evaluateDelay(input: {
  eta?: string | null;
  status?: string | null;
  previousEta?: string | null;
  now?: Date;
}): DelayVerdict {
  if (input.status && DONE.test(input.status)) {
    return { delayed: false, delayHours: null, delayNote: null };
  }

  const now = input.now ?? new Date();
  const eta = parseStamp(input.eta);
  const previous = parseStamp(input.previousEta);

  if (previous && eta) {
    const slippedHours = (eta.getTime() - previous.getTime()) / 3_600_000;
    if (slippedHours >= 12) {
      return {
        delayed: true,
        delayHours: Math.round(slippedHours),
        delayNote: `ETA lùi ~${Math.round(slippedHours)} giờ`,
      };
    }
  }

  if (eta) {
    const lateHours = (now.getTime() - eta.getTime()) / 3_600_000;
    if (lateHours >= 12) {
      return {
        delayed: true,
        delayHours: Math.round(lateHours),
        delayNote: `ETA đã qua ~${Math.round(lateHours)} giờ`,
      };
    }
  }

  return { delayed: false, delayHours: null, delayNote: null };
}
