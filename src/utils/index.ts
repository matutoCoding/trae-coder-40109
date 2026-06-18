import {
  addDays,
  differenceInMinutes,
  format,
  isAfter,
  isBefore,
  parseISO,
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

export function findBestStation(
  stations: Station[],
  bookings: Booking[],
  startTime: string,
  endTime: string,
): StationCandidate[] {
  const start = parseISO(startTime);
  const end = parseISO(endTime);
  const requiredMinutes = differenceInMinutes(end, start);
  const rangeStart = addDays(start, -3);
  const rangeEnd = addDays(end, 3);

  const candidates: StationCandidate[] = [];

  for (const station of stations) {
    if (station.status === "maintenance") continue;

    const slots = getStationFreeSlots(station, bookings, rangeStart, rangeEnd);
    const matchingSlot = slots.find(
      (s) =>
        (!isAfter(start, s.start) || Math.abs(differenceInMinutes(start, s.start)) < 1) &&
        (!isBefore(end, s.end) || Math.abs(differenceInMinutes(end, s.end)) < 1),
    );

    if (!matchingSlot) {
      const hasEnough = slots.some((s) => s.durationMinutes >= requiredMinutes);
      if (!hasEnough) continue;
    }

    let gapBefore = 0;
    let gapAfter = 0;
    if (matchingSlot) {
      gapBefore = differenceInMinutes(start, matchingSlot.start);
      gapAfter = differenceInMinutes(matchingSlot.end, end);
    }

    const fragmentScore = Math.min(
      1,
      (Math.min(gapBefore, 60) + Math.min(gapAfter, 60)) / 120,
    );

    const todayBookings = bookings.filter((b) => {
      if (b.stationId !== station.id) return false;
      if (b.status === "cancelled" || b.status === "completed") return false;
      const bStart = parseISO(b.startTime);
      return !isBefore(bStart, addDays(new Date(), -7));
    });
    const totalBookedMinutes = todayBookings.reduce(
      (sum, b) => sum + differenceInMinutes(parseISO(b.endTime), parseISO(b.startTime)),
      0,
    );
    const loadRatio = Math.min(1, totalBookedMinutes / (7 * 8 * 60));
    const loadScore = 1 - loadRatio;

    const score = fragmentScore * 0.6 + loadScore * 0.4;

    candidates.push({
      station,
      score,
      fragmentScore,
      loadScore,
      gapBefore,
      gapAfter,
    });
  }

  return candidates.sort((a, b) => b.score - a.score);
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
