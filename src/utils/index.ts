import {
  addDays,
  differenceInMinutes,
  format,
  isAfter,
  isBefore,
  isSameDay,
  parseISO,
  setHours,
  setMinutes,
  startOfDay,
} from "date-fns";
import type {
  Booking,
  ChemicalBatch,
  ChemicalStatus,
  Station,
  StationCandidate,
} from "@/types";

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function formatDateTime(iso: string): string {
  return format(parseISO(iso), "yyyy-MM-dd HH:mm");
}

export function formatDate(iso: string): string {
  return format(parseISO(iso), "yyyy-MM-dd");
}

export function formatTime(iso: string): string {
  return format(parseISO(iso), "HH:mm");
}

export function nowISO(): string {
  return new Date().toISOString();
}

export function isTimeOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string,
): boolean {
  return isBefore(parseISO(startA), parseISO(endB)) &&
    isAfter(parseISO(endA), parseISO(startB));
}

export interface FreeSlot {
  start: Date;
  end: Date;
  durationMinutes: number;
}

export function getStationFreeSlots(
  station: Station,
  bookings: Booking[],
  rangeStart: Date,
  rangeEnd: Date,
): FreeSlot[] {
  const stationBookings = bookings
    .filter(
      (b) =>
        b.stationId === station.id &&
        b.status !== "cancelled" &&
        b.status !== "completed",
    )
    .sort((a, b) => parseISO(a.startTime).getTime() - parseISO(b.startTime).getTime());

  const slots: FreeSlot[] = [];
  let cursor = rangeStart;

  for (const booking of stationBookings) {
    const bStart = parseISO(booking.startTime);
    const bEnd = parseISO(booking.endTime);

    if (isAfter(cursor, rangeEnd)) break;

    if (isBefore(bEnd, cursor)) continue;

    if (isBefore(bStart, cursor)) {
      cursor = bEnd;
      continue;
    }

    const slotEnd = isBefore(bStart, rangeEnd) ? bStart : rangeEnd;
    const duration = differenceInMinutes(slotEnd, cursor);
    if (duration > 0) {
      slots.push({ start: cursor, end: slotEnd, durationMinutes: duration });
    }
    cursor = bEnd;
  }

  if (isBefore(cursor, rangeEnd)) {
    const duration = differenceInMinutes(rangeEnd, cursor);
    if (duration > 0) {
      slots.push({ start: cursor, end: rangeEnd, durationMinutes: duration });
    }
  }

  return slots;
}

export function hasTimeConflict(
  stationId: string,
  bookings: Booking[],
  startTime: string,
  endTime: string,
  excludeBookingId?: string,
): Booking | null {
  const start = parseISO(startTime);
  const end = parseISO(endTime);

  for (const b of bookings) {
    if (b.stationId !== stationId) continue;
    if (excludeBookingId && b.id === excludeBookingId) continue;
    if (b.status === "cancelled" || b.status === "completed") continue;

    const bStart = parseISO(b.startTime);
    const bEnd = parseISO(b.endTime);

    if (isBefore(start, bEnd) && isAfter(end, bStart)) {
      return b;
    }
  }
  return null;
}

export interface AllocationResult {
  candidates: StationCandidate[];
  unavailable: Array<{
    station: Station;
    reason: string;
  }>;
}

export function findBestStation(
  stations: Station[],
  bookings: Booking[],
  startTime: string,
  endTime: string,
): AllocationResult {
  const start = parseISO(startTime);
  const end = parseISO(endTime);
  const requiredMinutes = differenceInMinutes(end, start);
  const rangeStart = addDays(start, -3);
  const rangeEnd = addDays(end, 3);

  const candidates: StationCandidate[] = [];
  const unavailable: AllocationResult["unavailable"] = [];

  for (const station of stations) {
    if (station.status === "maintenance") {
      unavailable.push({ station, reason: "工位处于维护状态" });
      continue;
    }
    if (station.status === "occupied") {
      unavailable.push({ station, reason: "工位当前被占用" });
      continue;
    }

    const conflict = hasTimeConflict(station.id, bookings, startTime, endTime);
    if (conflict) {
      unavailable.push({
        station,
        reason: `与 ${conflict.photographer} 的预约冲突 (${formatTime(conflict.startTime)}-${formatTime(conflict.endTime)})`,
      });
      continue;
    }

    const slots = getStationFreeSlots(station, bookings, rangeStart, rangeEnd);
    const matchingSlot = slots.find(
      (s) =>
        (!isAfter(start, s.start) || Math.abs(differenceInMinutes(start, s.start)) < 1) &&
        (!isBefore(end, s.end) || Math.abs(differenceInMinutes(end, s.end)) < 1),
    );

    if (!matchingSlot) {
      const hasEnough = slots.some((s) => s.durationMinutes >= requiredMinutes);
      if (!hasEnough) {
        unavailable.push({ station, reason: "无满足时长的连续空闲时段" });
        continue;
      }
    }

    const dayStart = setHours(setMinutes(start, 0), 8);
    const dayEnd = setHours(setMinutes(start, 0), 22);

    const dayBookings = bookings
      .filter(
        (b) =>
          b.stationId === station.id &&
          isSameDay(parseISO(b.startTime), start) &&
          b.status !== "cancelled" &&
          b.status !== "completed",
      )
      .sort((a, b) => parseISO(a.startTime).getTime() - parseISO(b.startTime).getTime());

    let gapBefore = -1;
    let gapAfter = -1;
    let prevBooking: Booking | undefined;
    let nextBooking: Booking | undefined;

    for (const b of dayBookings) {
      const bEnd = parseISO(b.endTime);
      const bStart = parseISO(b.startTime);
      if (isBefore(bEnd, start)) {
        prevBooking = b;
      }
      if (isAfter(bStart, end) && !nextBooking) {
        nextBooking = b;
      }
    }

    if (prevBooking) {
      gapBefore = differenceInMinutes(start, parseISO(prevBooking.endTime));
    } else {
      gapBefore = differenceInMinutes(start, dayStart);
    }

    if (nextBooking) {
      gapAfter = differenceInMinutes(parseISO(nextBooking.startTime), end);
    } else {
      gapAfter = differenceInMinutes(dayEnd, end);
    }

    const reasons: string[] = [];

    const isExactFit =
      (prevBooking && gapBefore <= 1) && (nextBooking && gapAfter <= 1);
    const hasNeighbors = prevBooking || nextBooking;

    if (isExactFit) {
      reasons.push("✓ 完美嵌入空闲时段，前后零间隙");
    } else if (hasNeighbors && (gapBefore <= 30 || gapAfter <= 30)) {
      const gaps = [];
      if (prevBooking && gapBefore <= 30) gaps.push(`前隙${gapBefore}分钟`);
      if (nextBooking && gapAfter <= 30) gaps.push(`后隙${gapAfter}分钟`);
      reasons.push(`✓ 紧凑利用间隙（${gaps.join("、")}），减少碎片`);
    } else if (!hasNeighbors) {
      reasons.push("· 独立大空档，前后无预约");
    } else {
      const beforeDesc = prevBooking ? `前${gapBefore}分钟` : "";
      const afterDesc = nextBooking ? `后${gapAfter}分钟` : "";
      const gapDesc = [beforeDesc, afterDesc].filter(Boolean).join("、");
      reasons.push(`· 空档较大（${gapDesc}），会产生碎片`);
    }

    const weekBookings = bookings.filter((b) => {
      if (b.stationId !== station.id) return false;
      if (b.status === "cancelled" || b.status === "completed") return false;
      const bStart = parseISO(b.startTime);
      return !isBefore(bStart, addDays(new Date(), -7));
    });
    const weekBookedMinutes = weekBookings.reduce(
      (sum, b) => sum + differenceInMinutes(parseISO(b.endTime), parseISO(b.startTime)),
      0,
    );
    const weekLoadHours = weekBookedMinutes / 60;
    const loadRatio = Math.min(1, weekBookedMinutes / (7 * 8 * 60));
    const loadScore = 1 - loadRatio;

    if (loadRatio < 0.3) {
      reasons.push(`✓ 近7日负载${weekLoadHours.toFixed(1)}h，偏低，均衡调度`);
    } else if (loadRatio < 0.6) {
      reasons.push(`· 近7日负载${weekLoadHours.toFixed(1)}h，适中`);
    } else {
      reasons.push(`⚠ 近7日负载${weekLoadHours.toFixed(1)}h，较高`);
    }

    if (prevBooking || nextBooking) {
      const neighbors = [];
      if (prevBooking) {
        neighbors.push(
          `紧接 ${prevBooking.photographer} 之后（间隔${gapBefore}分钟）`,
        );
      }
      if (nextBooking) {
        neighbors.push(
          `紧邻 ${nextBooking.photographer} 之前（间隔${gapAfter}分钟）`,
        );
      }
      neighbors.forEach((n) => reasons.push(`✓ ${n}`));
    }

    let hasAdjacentBooking = false;
    let adjacentBooking: StationCandidate["adjacentBooking"] | undefined;

    if (prevBooking || nextBooking) {
      hasAdjacentBooking = true;
      if (prevBooking && nextBooking) {
        adjacentBooking = {
          type: "both",
          timeDiff: Math.min(gapBefore, gapAfter),
          photographer: prevBooking.photographer,
        };
      } else if (prevBooking) {
        adjacentBooking = {
          type: "before",
          timeDiff: gapBefore,
          photographer: prevBooking.photographer,
        };
      } else if (nextBooking) {
        adjacentBooking = {
          type: "after",
          timeDiff: gapAfter,
          photographer: nextBooking.photographer,
        };
      }
    }

    const fragmentScore = hasNeighbors
      ? 1 - Math.min(1, (Math.min(gapBefore, 120) + Math.min(gapAfter, 120)) / 240)
      : 0.15;

    const score = fragmentScore * 0.65 + loadScore * 0.35;

    candidates.push({
      station,
      score,
      fragmentScore,
      loadScore,
      gapBefore,
      gapAfter,
      hasAdjacentBooking,
      adjacentBooking,
      weekLoadHours,
      reasons,
    });
  }

  return {
    candidates: candidates.sort((a, b) => b.score - a.score),
    unavailable,
  };
}

export function computeChemicalStatus(batch: ChemicalBatch): ChemicalStatus {
  const now = new Date();
  const expiry = parseISO(batch.expiryDate);
  const daysToExpiry = Math.ceil(
    (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (batch.remainingVolume <= 0) return "exhausted";
  if (daysToExpiry < 0) return "expired";
  if (daysToExpiry <= 7 || batch.remainingVolume <= 100) return "near_expiry";
  return "normal";
}

export function getStatusColorClass(status: string): string {
  const map: Record<string, string> = {
    idle: "bg-status-idle",
    occupied: "bg-status-occupied",
    maintenance: "bg-status-maintenance",
    normal: "bg-status-normal",
    near_expiry: "bg-status-near",
    expired: "bg-status-expired",
    exhausted: "bg-status-exhausted",
    pending: "bg-darkroom-500",
    confirmed: "bg-status-normal",
    in_progress: "bg-darkroom-600",
    completed: "bg-status-exhausted",
    cancelled: "bg-ink-700",
  };
  return map[status] || "bg-ink-600";
}

export function getStatusBadgeClass(status: string): string {
  const dotColor = getStatusColorClass(status);
  const bg: Record<string, string> = {
    idle: "bg-status-idle/15 text-status-idle",
    occupied: "bg-status-occupied/15 text-darkroom-300",
    maintenance: "bg-status-maintenance/15 text-red-300",
    normal: "bg-status-normal/15 text-green-300",
    near_expiry: "bg-status-near/15 text-amber-300",
    expired: "bg-status-expired/15 text-red-300",
    exhausted: "bg-status-exhausted/20 text-gray-300",
    pending: "bg-darkroom-500/20 text-darkroom-200",
    confirmed: "bg-status-normal/15 text-green-300",
    in_progress: "bg-darkroom-600/20 text-darkroom-200",
    completed: "bg-status-exhausted/20 text-gray-300",
    cancelled: "bg-ink-700/30 text-ink-400",
  };
  return `badge ${bg[status] || "bg-ink-700/30 text-ink-300"} ${dotColor ? "" : ""}`;
}
