import { useState, useMemo, useEffect } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  X,
  Clock,
  User,
  Film,
  Sparkles,
  CheckCircle,
  RefreshCw,
  AlertCircle,
  Camera,
  ChevronRight,
  Gauge,
  Layers,
  ChevronLeft,
  CalendarDays,
  Info,
  Ban,
  CheckCircle2,
  Grid3X3,
  ChevronDown,
  ChevronUp,
  BarChart2,
  Droplets,
  Recycle,
  GitBranch,
  FileText,
  PlayCircle,
  StopCircle,
  AlertTriangle,
} from "lucide-react";
import {
  setHours,
  setMinutes,
  startOfToday,
  format,
  parseISO,
  isSameDay,
  addDays,
  startOfDay,
  differenceInMinutes,
} from "date-fns";
import { zhCN } from "date-fns/locale";
import { clsx } from "clsx";
import { useAppStore } from "@/store";
import {
  formatTime,
  formatDateTime,
  findBestStation,
  getStatusBadgeClass,
  getStatusColorClass,
  hasTimeConflict,
  type AllocationResult,
} from "@/utils";
import type {
  Station,
  Booking,
  StationType,
  StationStatus,
  StationCandidate,
  ChemicalBatch,
  ChemicalType,
  DispatchRecord,
  WasteRecord,
  WasteType,
  RecoveryMethod,
} from "@/types";
import {
  STATION_TYPE_LABELS,
  STATION_STATUS_LABELS,
  BOOKING_STATUS_LABELS,
  WASTE_TYPE_LABELS,
  RECOVERY_METHOD_LABELS,
  CHEMICAL_TYPE_LABELS,
} from "@/types";

const HOUR_SLOTS = 14;
const HOURS = Array.from({ length: HOUR_SLOTS + 1 }, (_, i) => 8 + i);
const DAY_START = 8;
const DAY_END = 22;
const TOTAL_MINUTES = (DAY_END - DAY_START) * 60;

interface StationFormData {
  code: string;
  name: string;
  type: StationType;
  capacity: number;
  status: StationStatus;
  description: string;
}

interface BookingFormData {
  photographer: string;
  filmType: string;
  filmCount: number;
  startTime: string;
  endTime: string;
  notes: string;
}

const defaultStationForm: StationFormData = {
  code: "",
  name: "",
  type: "black_white",
  capacity: 4,
  status: "idle",
  description: "",
};

const defaultBookingForm: BookingFormData = {
  photographer: "",
  filmType: "",
  filmCount: 2,
  startTime: "",
  endTime: "",
  notes: "",
};

function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative dark-card w-full max-w-lg mx-4 p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-serif text-ink-50">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-ink-800 text-ink-400 hover:text-ink-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function StationCard({
  station,
  bookings,
  onEdit,
  onDelete,
}: {
  station: Station;
  bookings: Booking[];
  onEdit: (s: Station) => void;
  onDelete: (id: string) => void;
}) {
  const todayBookings = bookings.filter(
    (b) =>
      b.stationId === station.id &&
      isSameDay(parseISO(b.startTime), new Date()) &&
      b.status !== "cancelled" &&
      b.status !== "completed",
  );

  const typeLabel = (STATION_TYPE_LABELS as Record<StationType, string>)[station.type];
  const statusLabel = (STATION_STATUS_LABELS as Record<StationStatus, string>)[station.status];

  return (
    <div className="dark-card dark-card-hover p-5 flex flex-col">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-sm text-darkroom-300">
              {station.code}
            </span>
            <span className={clsx("badge", getStatusBadgeClass(station.status))}>
              <span
                className={clsx("status-dot", getStatusColorClass(station.status))}
              />
              {statusLabel}
            </span>
          </div>
          <h4 className="text-base font-serif text-ink-50">{station.name}</h4>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(station)}
            className="p-1.5 rounded-md hover:bg-ink-800 text-ink-400 hover:text-darkroom-300 transition-colors"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(station.id)}
            className="p-1.5 rounded-md hover:bg-status-maintenance/20 text-ink-400 hover:text-red-300 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-2 mb-4">
        <div className="bg-ink-950/50 rounded-md p-2.5">
          <div className="text-[10px] text-ink-500 uppercase tracking-wider mb-0.5">
            类型
          </div>
          <div className="text-sm text-ink-200">{typeLabel}</div>
        </div>
        <div className="bg-ink-950/50 rounded-md p-2.5">
          <div className="text-[10px] text-ink-500 uppercase tracking-wider mb-0.5">
            容量
          </div>
          <div className="text-sm text-ink-200">{station.capacity} 卷</div>
        </div>
      </div>

      <div className="mt-auto pt-3 border-t border-ink-800 flex items-center justify-between">
        <div className="text-xs text-ink-400">
          今日预约：
          <span className="text-ink-100 font-medium">{todayBookings.length}</span> 个
        </div>
        <div className="h-1.5 w-20 bg-ink-800 rounded-full overflow-hidden">
          <div
            className={clsx("h-full rounded-full", getStatusColorClass(station.status))}
            style={{
              width: `${Math.min(100, (todayBookings.length / Math.max(station.capacity, 1)) * 100)}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}

function WeekOverview({
  stations,
  bookings,
  weekStart,
  onDayClick,
}: {
  stations: Station[];
  bookings: Booking[];
  weekStart: Date;
  onDayClick: (date: Date) => void;
}) {
  const weekDays = useMemo(() => {
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      days.push(addDays(weekStart, i));
    }
    return days;
  }, [weekStart]);

  const getDayOccupancy = (stationId: string, date: Date) => {
    const dayStart = setHours(setMinutes(startOfDay(date), 0), 8);
    const dayEnd = setHours(setMinutes(startOfDay(date), 0), 22);
    const totalMinutes = 14 * 60;

    const dayBookings = bookings.filter(
      (b) =>
        b.stationId === stationId &&
        isSameDay(parseISO(b.startTime), date) &&
        b.status !== "cancelled" &&
        b.status !== "completed",
    );

    let bookedMinutes = 0;
    for (const b of dayBookings) {
      const bStart = parseISO(b.startTime);
      const bEnd = parseISO(b.endTime);
      const overlapStart = bStart > dayStart ? bStart : dayStart;
      const overlapEnd = bEnd < dayEnd ? bEnd : dayEnd;
      const overlap = differenceInMinutes(overlapEnd, overlapStart);
      if (overlap > 0) bookedMinutes += overlap;
    }

    const ratio = Math.min(1, bookedMinutes / totalMinutes);
    return { ratio, count: dayBookings.length, minutes: bookedMinutes };
  };

  const getHeatColor = (ratio: number) => {
    if (ratio === 0) return "bg-ink-900/30";
    if (ratio < 0.25) return "bg-status-normal/30";
    if (ratio < 0.5) return "bg-status-normal/50";
    if (ratio < 0.75) return "bg-darkroom-500/60";
    return "bg-status-occupied/70";
  };

  const getHeatLabel = (ratio: number) => {
    if (ratio === 0) return "空闲";
    if (ratio < 0.25) return "较低";
    if (ratio < 0.5) return "适中";
    if (ratio < 0.75) return "较高";
    return "繁忙";
  };

  return (
    <div className="dark-card p-5">
      <div className="min-w-[900px]">
        <div className="flex border-b border-ink-800 pb-2 mb-3">
          <div className="w-44 flex-shrink-0 pr-4">
            <span className="text-xs text-ink-500 uppercase tracking-wider">
              工位
            </span>
          </div>
          <div className="flex-1 grid grid-cols-7 gap-1.5">
            {weekDays.map((date) => {
              const isToday = isSameDay(date, new Date());
              return (
                <div
                  key={date.toISOString()}
                  className="text-center cursor-pointer hover:bg-ink-800/50 rounded-md py-1 transition-colors"
                  onClick={() => onDayClick(date)}
                >
                  <div className="text-[10px] uppercase tracking-wider text-ink-500 mb-0.5">
                    {format(date, "EEE", { locale: zhCN })}
                  </div>
                  <div
                    className={clsx(
                      "text-sm font-mono",
                      isToday && "text-darkroom-300 font-bold",
                    )}
                  >
                    {format(date, "MM/dd")}
                  </div>
                  {isToday && (
                    <div className="w-1 h-1 rounded-full bg-darkroom-400 mx-auto mt-0.5" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          {stations.map((station) => (
            <div key={station.id} className="flex items-center h-14 group">
              <div className="w-44 flex-shrink-0 pr-4">
                <div className="flex items-center gap-2">
                  <span
                    className={clsx(
                      "status-dot",
                      getStatusColorClass(station.status),
                    )}
                  />
                  <span className="font-mono text-xs text-darkroom-300">
                    {station.code}
                  </span>
                  <span className="text-sm text-ink-200 truncate">
                    {station.name}
                  </span>
                </div>
              </div>
              <div className="flex-1 grid grid-cols-7 gap-1.5">
                {weekDays.map((date) => {
                  const { ratio, count, minutes } = getDayOccupancy(
                    station.id,
                    date,
                  );
                  return (
                    <div
                      key={date.toISOString()}
                      className={clsx(
                        "relative rounded-md h-12 flex items-center justify-center cursor-pointer transition-all hover:ring-2 hover:ring-darkroom-400/50",
                        getHeatColor(ratio),
                        station.status === "maintenance" &&
                          "bg-status-maintenance/20 border border-dashed border-status-maintenance/40",
                      )}
                      onClick={() => onDayClick(date)}
                      title={`${format(date, "MM月dd日")} ${station.name}
预约数：${count} 个
占用时长：${Math.floor(minutes / 60)}小时${minutes % 60}分钟
利用率：${(ratio * 100).toFixed(0)}%`}
                    >
                      {station.status === "maintenance" ? (
                        <span className="text-[10px] text-red-300">维护</span>
                      ) : ratio > 0 ? (
                        <div className="text-center">
                          <div className="text-xs font-mono text-ink-100 font-medium">
                            {(ratio * 100).toFixed(0)}%
                          </div>
                          <div className="text-[10px] text-ink-400">
                            {count}单
                          </div>
                        </div>
                      ) : (
                        <span className="text-[10px] text-ink-600">—</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between mt-5 pt-4 border-t border-ink-800">
          <div className="flex items-center gap-2">
            <span className="text-xs text-ink-400">占用密度：</span>
            <div className="flex items-center gap-1">
              <span className="w-5 h-4 rounded-sm bg-ink-900/30" />
              <span className="text-[10px] text-ink-500">空闲</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-5 h-4 rounded-sm bg-status-normal/30" />
              <span className="text-[10px] text-ink-500">较低</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-5 h-4 rounded-sm bg-status-normal/50" />
              <span className="text-[10px] text-ink-500">适中</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-5 h-4 rounded-sm bg-darkroom-500/60" />
              <span className="text-[10px] text-ink-500">较高</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-5 h-4 rounded-sm bg-status-occupied/70" />
              <span className="text-[10px] text-ink-500">繁忙</span>
            </div>
          </div>
          <div className="text-xs text-ink-500">
            点击任意日期可查看当日详细时间轴
          </div>
        </div>
      </div>
    </div>
  );
}

function GanttChart({
  stations,
  bookings,
  currentDate,
  onBookingClick,
}: {
  stations: Station[];
  bookings: Booking[];
  currentDate: Date;
  onBookingClick: (b: Booking) => void;
}) {
  const [hoverBooking, setHoverBooking] = useState<Booking | null>(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });

  const getBookingPosition = (booking: Booking) => {
    const start = parseISO(booking.startTime);
    const end = parseISO(booking.endTime);

    const dayStartMin = DAY_START * 60;
    const startMin = start.getHours() * 60 + start.getMinutes();
    const endMin = end.getHours() * 60 + end.getMinutes();

    const left = ((startMin - dayStartMin) / TOTAL_MINUTES) * 100;
    const width = ((endMin - startMin) / TOTAL_MINUTES) * 100;

    return {
      left: `${Math.max(0, Math.min(100, left))}%`,
      width: `${Math.max(0.5, Math.min(100 - left, width))}%`,
    };
  };

  const getBarColor = (status: Booking["status"]) => {
    const map: Record<Booking["status"], string> = {
      pending: "bg-darkroom-500/70 border-darkroom-400",
      confirmed: "bg-status-idle/80 border-status-idle",
      in_progress: "bg-status-occupied border-darkroom-400",
      completed: "bg-status-exhausted/60 border-status-exhausted",
      cancelled: "bg-ink-700/50 border-ink-600",
    };
    return map[status] || "bg-ink-600 border-ink-500";
  };

  const dayBookings = bookings.filter((b) =>
    isSameDay(parseISO(b.startTime), currentDate),
  );

  return (
    <div className="dark-card p-5 overflow-x-auto">
      <div className="min-w-[900px]">
        <div className="flex border-b border-ink-800 pb-2 mb-3">
          <div className="w-44 flex-shrink-0 pr-4">
            <span className="text-xs text-ink-500 uppercase tracking-wider">
              工位
            </span>
          </div>
          <div className="flex-1 relative" style={{ height: 20 }}>
            {HOURS.map((h) => {
              const leftPct = ((h - DAY_START) / HOUR_SLOTS) * 100;
              return (
                <div
                  key={h}
                  className="absolute text-xs text-ink-500 font-mono"
                  style={{
                    left: `${leftPct}%`,
                    transform: "translateX(-50%)",
                  }}
                >
                  {String(h).padStart(2, "0")}:00
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          {stations.map((station) => {
            const stationBookings = dayBookings.filter(
              (b) => b.stationId === station.id,
            );
            return (
              <div key={station.id} className="flex items-center h-12 group">
                <div className="w-44 flex-shrink-0 pr-4">
                  <div className="flex items-center gap-2">
                    <span
                      className={clsx(
                        "status-dot",
                        getStatusColorClass(station.status),
                      )}
                    />
                    <span className="font-mono text-xs text-darkroom-300">
                      {station.code}
                    </span>
                    <span className="text-sm text-ink-200 truncate">
                      {station.name}
                    </span>
                  </div>
                </div>
                <div className="flex-1 relative h-10 bg-ink-950/60 rounded-md border border-ink-800/50">
                  {HOURS.slice(0, -1).map((h) => {
                    const leftPct = ((h - DAY_START) / HOUR_SLOTS) * 100;
                    return (
                      <div
                        key={h}
                        className="absolute top-0 bottom-0 border-l border-ink-800/30"
                        style={{ left: `${leftPct}%` }}
                      />
                    );
                  })}

                  {station.status === "maintenance" && (
                    <div
                      className="absolute inset-1 rounded-sm bg-status-maintenance/20 border border-dashed border-status-maintenance/50 flex items-center justify-center"
                    >
                      <span className="text-[10px] text-red-300">维护中</span>
                    </div>
                  )}

                  {stationBookings.map((booking) => {
                    const pos = getBookingPosition(booking);
                    return (
                      <div
                        key={booking.id}
                        className={clsx(
                          "gantt-bar border",
                          getBarColor(booking.status),
                          booking.status === "cancelled" &&
                            "opacity-40 line-through",
                        )}
                        style={pos}
                        onClick={() => onBookingClick(booking)}
                        onMouseEnter={(e) => {
                          setHoverBooking(booking);
                          const rect = (
                            e.currentTarget as HTMLElement
                          ).getBoundingClientRect();
                          setHoverPos({
                            x: rect.left + rect.width / 2,
                            y: rect.top - 8,
                          });
                        }}
                        onMouseLeave={() => setHoverBooking(null)}
                      >
                        <span className="text-ink-50 px-1.5 truncate text-[11px] whitespace-nowrap">
                          {booking.photographer}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {hoverBooking && (
          <div
            className="fixed z-50 pointer-events-none"
            style={{
              left: hoverPos.x,
              top: hoverPos.y,
              transform: "translate(-50%, -100%)",
            }}
          >
            <div className="dark-card px-4 py-3 shadow-xl border-darkroom-500/40 min-w-[220px]">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={clsx("status-dot", getStatusColorClass(hoverBooking.status))}
                />
                <span className="text-sm font-medium text-ink-50">
                  {hoverBooking.photographer}
                </span>
                <span
                  className={clsx("badge ml-auto", getStatusBadgeClass(hoverBooking.status))}
                >
                  {(BOOKING_STATUS_LABELS as Record<Booking["status"], string>)[
                    hoverBooking.status
                  ]}
                </span>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center gap-2 text-ink-300">
                  <Clock className="w-3.5 h-3.5 text-darkroom-400" />
                  {formatTime(hoverBooking.startTime)} -{" "}
                  {formatTime(hoverBooking.endTime)}
                </div>
                <div className="flex items-center gap-2 text-ink-300">
                  <Film className="w-3.5 h-3.5 text-darkroom-400" />
                  {hoverBooking.filmType} × {hoverBooking.filmCount}卷
                </div>
                {hoverBooking.notes && (
                  <div className="pt-1.5 mt-1.5 border-t border-ink-800 text-ink-400">
                    {hoverBooking.notes}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 mt-5 pt-4 border-t border-ink-800">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm bg-status-idle/80 border border-status-idle" />
          <span className="text-xs text-ink-400">已确认</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm bg-status-occupied border border-darkroom-400" />
          <span className="text-xs text-ink-400">进行中</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm bg-darkroom-500/70 border border-darkroom-400" />
          <span className="text-xs text-ink-400">待确认</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm bg-status-exhausted/60 border border-status-exhausted" />
          <span className="text-xs text-ink-400">已完成</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm border border-dashed border-status-maintenance/50 bg-status-maintenance/20" />
          <span className="text-xs text-ink-400">维护</span>
        </div>
      </div>
    </div>
  );
}

function WeekPicker({
  currentDate,
  onDateChange,
}: {
  currentDate: Date;
  onDateChange: (date: Date) => void;
}) {
  const weekDays = useMemo(() => {
    const days: Date[] = [];
    const monday = startOfDay(currentDate);
    for (let i = 0; i < 7; i++) {
      days.push(addDays(monday, i - 3));
    }
    return days;
  }, [currentDate]);

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onDateChange(addDays(currentDate, -7))}
        className="ghost-btn !p-1.5"
        title="上一周"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      <div className="flex gap-1 bg-ink-900/50 rounded-lg p-1">
        {weekDays.map((date) => {
          const isToday = isSameDay(date, new Date());
          const isSelected = isSameDay(date, currentDate);
          return (
            <button
              key={date.toISOString()}
              onClick={() => onDateChange(date)}
              className={clsx(
                "px-3 py-2 rounded-md text-center min-w-[56px] transition-all",
                isSelected
                  ? "bg-darkroom-600 text-ink-50 shadow-amber-glow"
                  : "text-ink-300 hover:bg-ink-800",
              )}
            >
              <div className="text-[10px] uppercase tracking-wider mb-0.5">
                {format(date, "EEE", { locale: zhCN })}
              </div>
              <div
                className={clsx(
                  "text-sm font-mono",
                  isToday && !isSelected && "text-darkroom-300",
                )}
              >
                {format(date, "MM/dd")}
              </div>
              {isToday && (
                <div
                  className={clsx(
                    "w-1 h-1 rounded-full mx-auto mt-1",
                    isSelected ? "bg-ink-50" : "bg-darkroom-400",
                  )}
                />
              )}
            </button>
          );
        })}
      </div>

      <button
        onClick={() => onDateChange(addDays(currentDate, 7))}
        className="ghost-btn !p-1.5"
        title="下一周"
      >
        <ChevronRight className="w-4 h-4" />
      </button>

      <button
        onClick={() => onDateChange(startOfToday())}
        className="ghost-btn text-xs py-1.5 px-3"
      >
        今天
      </button>
    </div>
  );
}

function CandidateCard({
  candidate,
  rank,
  selected,
  expanded,
  onSelect,
  onToggleExpand,
  topCandidate,
}: {
  candidate: StationCandidate;
  rank: number;
  selected: boolean;
  expanded: boolean;
  onSelect: () => void;
  onToggleExpand: () => void;
  topCandidate?: StationCandidate;
}) {
  const {
    station,
    score,
    fragmentScore,
    loadScore,
    gapBefore,
    gapAfter,
    weekLoadHours,
    reasons,
  } = candidate;

  const typeLabel = (STATION_TYPE_LABELS as Record<StationType, string>)[station.type];
  const statusLabel = (STATION_STATUS_LABELS as Record<StationStatus, string>)[station.status];

  const showComparison = rank > 1 && topCandidate && expanded;

  const getComparisonItems = () => {
    if (!topCandidate) return [];
    const items = [];

    const fragDiff = topCandidate.fragmentScore - fragmentScore;
    if (Math.abs(fragDiff) > 0.02) {
      const topGap = topCandidate.gapBefore + topCandidate.gapAfter;
      const curGap = gapBefore + gapAfter;
      items.push({
        label: "碎片利用",
        diff: fragDiff > 0
          ? `前后间隙更大（总隙${curGap}分钟 vs ${topGap}分钟）`
          : `前后间隙更小（总隙${curGap}分钟 vs ${topGap}分钟）`,
        worse: fragDiff > 0,
      });
    }

    const loadDiff = weekLoadHours - topCandidate.weekLoadHours;
    if (Math.abs(loadDiff) > 0.5) {
      items.push({
        label: "负载均衡",
        diff: loadDiff > 0
          ? `7日负载更高（${weekLoadHours.toFixed(1)}h vs ${topCandidate.weekLoadHours.toFixed(1)}h）`
          : `7日负载更低（${weekLoadHours.toFixed(1)}h vs ${topCandidate.weekLoadHours.toFixed(1)}h）`,
        worse: loadDiff > 0,
      });
    }

    const scoreDiff = (topCandidate.score - score) * 100;
    if (scoreDiff > 2) {
      items.push({
        label: "综合评分",
        diff: `低${scoreDiff.toFixed(0)}分（${(score * 100).toFixed(0)} vs ${(topCandidate.score * 100).toFixed(0)}）`,
        worse: true,
      });
    }

    const topHasAdj = topCandidate.hasAdjacentBooking;
    const curHasAdj = candidate.hasAdjacentBooking;
    if (topHasAdj && !curHasAdj) {
      items.push({
        label: "相邻预约",
        diff: "第1名有相邻预约衔接，本候选独立空档",
        worse: true,
      });
    }

    return items;
  };

  const comparisonItems = getComparisonItems();

  return (
    <div
      className={clsx(
        "dark-card dark-card-hover transition-all duration-200 overflow-hidden",
        selected
          ? "border-darkroom-500 shadow-amber-glow ring-1 ring-darkroom-500/30"
          : "border-ink-800",
      )}
    >
      <div
        onClick={onSelect}
        className="p-4 cursor-pointer"
      >
        <div className="flex items-start gap-4">
          <div
            className={clsx(
              "w-10 h-10 rounded-full flex items-center justify-center font-serif text-lg font-bold flex-shrink-0",
              rank === 1
                ? "bg-darkroom-600 text-ink-50 shadow-amber-glow"
                : rank === 2
                ? "bg-darkroom-700/70 text-darkroom-200"
                : rank === 3
                ? "bg-ink-800 text-ink-300"
                : "bg-ink-900 text-ink-400",
            )}
          >
            {rank}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-sm text-darkroom-300">
                {station.code}
              </span>
              <h4 className="text-base font-serif text-ink-50">{station.name}</h4>
              <span className={clsx("badge", getStatusBadgeClass(station.status))}>
                <span
                  className={clsx("status-dot", getStatusColorClass(station.status))}
                />
                {statusLabel}
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs text-ink-400 mb-3">
              <span>{typeLabel}</span>
              <span>·</span>
              <span>容量 {station.capacity} 卷</span>
              <span>·</span>
              <span>近7日负载 {weekLoadHours.toFixed(1)}h</span>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="bg-ink-950/50 rounded-md p-2.5">
                <div className="flex items-center gap-1 text-[10px] text-ink-500 uppercase tracking-wider mb-1">
                  <Sparkles className="w-3 h-3" />
                  综合评分
                </div>
                <div className="text-lg font-mono font-bold text-darkroom-300">
                  {(score * 100).toFixed(0)}
                </div>
              </div>
              <div className="bg-ink-950/50 rounded-md p-2.5">
                <div className="flex items-center gap-1 text-[10px] text-ink-500 uppercase tracking-wider mb-1">
                  <Layers className="w-3 h-3" />
                  碎片评分
                </div>
                <div className="text-lg font-mono font-bold text-ink-200">
                  {(fragmentScore * 100).toFixed(0)}
                </div>
              </div>
              <div className="bg-ink-950/50 rounded-md p-2.5">
                <div className="flex items-center gap-1 text-[10px] text-ink-500 uppercase tracking-wider mb-1">
                  <Gauge className="w-3 h-3" />
                  负载评分
                </div>
                <div className="text-lg font-mono font-bold text-ink-200">
                  {(loadScore * 100).toFixed(0)}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs mb-3">
              <span className="text-ink-400">前后空闲：</span>
              <span className="text-ink-200">
                前 {gapBefore > 0 ? `${gapBefore}分钟` : "—"}
              </span>
              <ChevronRight className="w-3 h-3 text-ink-500" />
              <span className="text-ink-200">
                后 {gapAfter > 0 ? `${gapAfter}分钟` : "—"}
              </span>
            </div>

            <div className="space-y-1.5 bg-ink-950/40 rounded-md p-3">
              <div className="flex items-center gap-1.5 text-[10px] text-ink-400 uppercase tracking-wider mb-1">
                <Info className="w-3 h-3 text-darkroom-400" />
                推荐理由
              </div>
              {reasons.map((reason, idx) => (
                <div
                  key={idx}
                  className="text-xs text-ink-300 pl-3 relative before:content-[''] before:absolute before:left-0 before:top-1.5 before:w-1 before:h-1 before:rounded-full before:bg-darkroom-500"
                >
                  {reason}
                </div>
              ))}
            </div>
          </div>

          <div className="flex-shrink-0 flex flex-col items-center gap-2">
            {selected && <CheckCircle2 className="w-6 h-6 text-darkroom-400" />}
          </div>
        </div>
      </div>

      {rank > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand();
          }}
          className="w-full px-4 py-2 border-t border-ink-800 text-xs text-ink-400 hover:text-darkroom-300 hover:bg-ink-800/30 transition-colors flex items-center justify-center gap-1"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              收起对比
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              对比第1名
            </>
          )}
        </button>
      )}

      {showComparison && (
        <div className="px-4 pb-4 border-t border-ink-800/60">
          <div className="pt-3">
            <div className="flex items-center gap-1.5 text-[10px] text-ink-400 uppercase tracking-wider mb-2">
              <BarChart2 className="w-3 h-3 text-darkroom-400" />
              与第1名对比
            </div>
            <div className="space-y-2">
              {comparisonItems.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between text-xs bg-ink-950/50 rounded-md px-3 py-2"
                >
                  <span className="text-ink-400">{item.label}</span>
                  <span
                    className={clsx(
                      "font-mono",
                      item.worse ? "text-status-maintenance" : "text-status-normal",
                    )}
                  >
                    {item.diff}
                  </span>
                </div>
              ))}
              {comparisonItems.length === 0 && (
                <div className="text-xs text-ink-500 text-center py-2">
                  与第1名表现相近
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function UnavailableStationItem({
  station,
  reason,
}: {
  station: Station;
  reason: string;
}) {
  const typeLabel = (STATION_TYPE_LABELS as Record<StationType, string>)[station.type];
  return (
    <div className="flex items-center gap-3 p-3 bg-ink-950/40 rounded-md border border-ink-800/60 opacity-75">
      <div className="w-8 h-8 rounded-full bg-status-maintenance/15 flex items-center justify-center flex-shrink-0">
        <Ban className="w-4 h-4 text-status-maintenance" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-ink-400">{station.code}</span>
          <span className="text-sm text-ink-300">{station.name}</span>
          <span className="text-xs text-ink-500">({typeLabel})</span>
        </div>
        <div className="text-xs text-status-maintenance mt-0.5">{reason}</div>
      </div>
    </div>
  );
}

function BookingChemicalFlow({
  booking,
  dispatches,
  wastes,
  batches,
}: {
  booking: Booking;
  dispatches: DispatchRecord[];
  wastes: WasteRecord[];
  batches: ChemicalBatch[];
}) {
  const bookingDispatches = dispatches.filter((d) => d.bookingId === booking.id);
  const bookingWastes = wastes.filter((w) => {
    return bookingDispatches.some(
      (d) => d.batchId === w.batchId && d.stationId === w.stationId,
    );
  });

  const totalDispatched = bookingDispatches.reduce((sum, d) => sum + d.volume, 0);
  const totalWasted = bookingWastes.reduce((sum, w) => sum + w.volume, 0);

  if (bookingDispatches.length === 0) {
    return (
      <div className="bg-ink-950/40 rounded-md p-4 text-center">
        <Droplets className="w-8 h-8 text-ink-600 mx-auto mb-2" />
        <div className="text-sm text-ink-500">暂无药水使用记录</div>
        <div className="text-xs text-ink-600 mt-1">该预约尚未关联药水出库</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-darkroom-400" />
          <span className="text-sm font-medium text-ink-200">药水流向</span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-ink-400">
            出库：<span className="text-darkroom-200 font-mono">{totalDispatched.toLocaleString()}ml</span>
          </span>
          <span className="text-ink-400">
            已回收：<span className="text-red-300 font-mono">{totalWasted.toLocaleString()}ml</span>
          </span>
        </div>
      </div>

      <div className="space-y-2">
        {bookingDispatches.map((dispatch) => {
          const batch = batches.find((b) => b.id === dispatch.batchId);
          const relatedWaste = bookingWastes.filter((w) => w.batchId === dispatch.batchId);
          return (
            <div
              key={dispatch.id}
              className="bg-ink-950/50 rounded-md p-3 border border-ink-800/60"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-darkroom-600/30 flex items-center justify-center">
                    <Droplets className="w-4 h-4 text-darkroom-300" />
                  </div>
                  <div>
                    <div className="text-sm text-ink-100 font-medium">
                      {batch?.name || "未知批次"}
                    </div>
                    <div className="text-[10px] text-ink-500 font-mono">
                      {batch?.batchNo || "-"}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-mono text-darkroom-200">
                    -{dispatch.volume.toLocaleString()}ml
                  </div>
                  <div className="text-[10px] text-ink-500">
                    {formatDateTime(dispatch.dispatchTime)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1.5 text-ink-400">
                  <User className="w-3 h-3 text-darkroom-400" />
                  操作人：<span className="text-ink-200">{dispatch.operator}</span>
                </div>
                <div className="flex items-center gap-1.5 text-ink-400">
                  <FileText className="w-3 h-3 text-darkroom-400" />
                  用途：<span className="text-ink-200">{dispatch.purpose}</span>
                </div>
              </div>

              {relatedWaste.length > 0 && (
                <div className="mt-3 pt-3 border-t border-ink-800/40">
                  <div className="text-[10px] text-ink-500 uppercase tracking-wider mb-2">
                    废液回收
                  </div>
                  <div className="space-y-1.5">
                    {relatedWaste.map((w) => (
                      <div
                        key={w.id}
                        className="flex items-center justify-between text-xs bg-status-maintenance/10 rounded px-2 py-1.5"
                      >
                        <div className="flex items-center gap-1.5">
                          <Recycle className="w-3 h-3 text-status-maintenance" />
                          <span className="text-ink-300">
                            {WASTE_TYPE_LABELS[w.type]}
                          </span>
                        </div>
                        <span className="font-mono text-red-300">
                          {w.volume.toLocaleString()}ml
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function StationsPage() {
  const {
    stations,
    bookings,
    chemicalBatches,
    dispatchRecords,
    wasteRecords,
    addStation,
    updateStation,
    deleteStation,
    addBooking,
    updateBooking,
    addDispatchRecord,
    addWasteRecord,
    initMockData,
  } = useAppStore();

  useEffect(() => {
    initMockData();
  }, [initMockData]);

  const [currentDate, setCurrentDate] = useState<Date>(() => startOfToday());
  const [viewMode, setViewMode] = useState<"week" | "day">("week");
  const [weekStart, setWeekStart] = useState<Date>(() => startOfToday());

  const [showStationModal, setShowStationModal] = useState(false);
  const [editingStation, setEditingStation] = useState<Station | null>(null);
  const [stationForm, setStationForm] = useState<StationFormData>(defaultStationForm);

  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingForm, setBookingForm] = useState<BookingFormData>(defaultBookingForm);
  const [allocationResult, setAllocationResult] = useState<AllocationResult | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null);
  const [expandedCandidates, setExpandedCandidates] = useState<Set<string>>(new Set());
  const [allocating, setAllocating] = useState(false);
  const [allocatedTimeKey, setAllocatedTimeKey] = useState<string>("");

  const [detailBooking, setDetailBooking] = useState<Booking | null>(null);
  const [showCompletionForm, setShowCompletionForm] = useState(false);
  const [completionData, setCompletionData] = useState({
    batchId: "",
    volume: "",
    operator: "",
    wasteVolume: "",
    wasteType: "developer_waste" as WasteType,
    recoveryMethod: "professional" as RecoveryMethod,
  });

  const liveDetailBooking = useMemo(() => {
    if (!detailBooking) return null;
    return bookings.find((b) => b.id === detailBooking.id) || detailBooking;
  }, [detailBooking, bookings]);

  const currentTimeKey = `${bookingForm.startTime}|${bookingForm.endTime}`;
  const timeChangedAfterAllocation = allocationResult !== null && allocatedTimeKey !== "" && allocatedTimeKey !== currentTimeKey;

  const handleOpenAddStation = () => {
    setEditingStation(null);
    setStationForm(defaultStationForm);
    setShowStationModal(true);
  };

  const handleOpenEditStation = (station: Station) => {
    setEditingStation(station);
    setStationForm({
      code: station.code,
      name: station.name,
      type: station.type,
      capacity: station.capacity,
      status: station.status,
      description: station.description || "",
    });
    setShowStationModal(true);
  };

  const handleSaveStation = () => {
    if (!stationForm.code || !stationForm.name) return;

    if (editingStation) {
      updateStation(editingStation.id, stationForm);
    } else {
      addStation(stationForm);
    }
    setShowStationModal(false);
  };

  const handleDeleteStation = (id: string) => {
    if (confirm("确定要删除该工位吗？")) {
      deleteStation(id);
    }
  };

  const handleOpenBooking = () => {
    const defaultStart = format(
      setMinutes(setHours(currentDate, 10), 0),
      "yyyy-MM-dd'T'HH:mm",
    );
    const defaultEnd = format(
      setMinutes(setHours(currentDate, 12), 0),
      "yyyy-MM-dd'T'HH:mm",
    );
    setBookingForm({
      ...defaultBookingForm,
      startTime: defaultStart,
      endTime: defaultEnd,
    });
    setAllocationResult(null);
    setSelectedCandidate(null);
    setAllocating(false);
    setShowBookingModal(true);
  };

  const validateBookingForm = (): string | null => {
    if (!bookingForm.photographer.trim()) return "请输入摄影师姓名";
    if (!bookingForm.filmType.trim()) return "请输入胶卷类型";
    if (bookingForm.filmCount <= 0) return "胶卷数量必须大于 0";
    if (!bookingForm.startTime || !bookingForm.endTime) return "请选择时间";
    const start = new Date(bookingForm.startTime);
    const end = new Date(bookingForm.endTime);
    if (end <= start) return "结束时间必须晚于开始时间";

    const startHour = start.getHours() + start.getMinutes() / 60;
    const endHour = end.getHours() + end.getMinutes() / 60;
    if (startHour < 8 || endHour > 22) {
      return "营业时间为 08:00 - 22:00，请选择营业时间内的时段";
    }

    return null;
  };

  const handleFindBestStation = () => {
    const err = validateBookingForm();
    if (err) {
      alert(err);
      return;
    }
    setAllocating(true);
    setTimeout(() => {
      const result = findBestStation(
        stations,
        bookings,
        new Date(bookingForm.startTime).toISOString(),
        new Date(bookingForm.endTime).toISOString(),
      );
      setAllocationResult(result);
      setSelectedCandidate(result.candidates.length > 0 ? result.candidates[0].station.id : null);
      setAllocatedTimeKey(`${bookingForm.startTime}|${bookingForm.endTime}`);
      setAllocating(false);
    }, 500);
  };

  const handleConfirmBooking = () => {
    if (!selectedCandidate) {
      alert("请先选择一个工位");
      return;
    }

    const validationErr = validateBookingForm();
    if (validationErr) {
      alert(validationErr);
      return;
    }

    if (timeChangedAfterAllocation) {
      alert("时间已修改，请重新分配工位后再确认");
      return;
    }

    const conflict = hasTimeConflict(
      selectedCandidate,
      bookings,
      new Date(bookingForm.startTime).toISOString(),
      new Date(bookingForm.endTime).toISOString(),
    );
    if (conflict) {
      alert(
        `该工位在此时间段已有预约冲突：\n${conflict.photographer} - ${formatTime(conflict.startTime)}~${formatTime(conflict.endTime)}`,
      );
      return;
    }

    const station = stations.find((s) => s.id === selectedCandidate);
    if (station?.status === "occupied") {
      alert("该工位当前被占用，请选择其他工位");
      return;
    }
    if (station?.status === "maintenance") {
      alert("该工位处于维护状态，请选择其他工位");
      return;
    }

    addBooking({
      stationId: selectedCandidate,
      photographer: bookingForm.photographer.trim(),
      filmType: bookingForm.filmType.trim(),
      filmCount: bookingForm.filmCount,
      startTime: new Date(bookingForm.startTime).toISOString(),
      endTime: new Date(bookingForm.endTime).toISOString(),
      status: "confirmed",
      notes: bookingForm.notes.trim() || undefined,
    });

    setCurrentDate(startOfDay(parseISO(bookingForm.startTime)));
    setAllocatedTimeKey("");
    setShowBookingModal(false);
  };

  const handleReallocate = () => {
    setAllocationResult(null);
    setSelectedCandidate(null);
    setExpandedCandidates(new Set());
    setAllocatedTimeKey("");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-serif text-ink-50 mb-1">工位排期管理</h2>
          <p className="text-sm text-ink-400">
            管理冲洗工位、查看排期甘特图、智能分配预约
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleOpenBooking} className="amber-btn flex items-center gap-2">
            <Camera className="w-4 h-4" />
            新建预约
          </button>
        </div>
      </div>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="section-title mb-0">工位管理</h3>
          <button onClick={handleOpenAddStation} className="ghost-btn flex items-center gap-1.5 text-sm">
            <Plus className="w-4 h-4" />
            新增工位
          </button>
        </div>

        {stations.length === 0 ? (
          <div className="dark-card p-12 text-center">
            <div className="text-ink-400 mb-2">暂无工位数据</div>
            <button onClick={handleOpenAddStation} className="amber-btn mt-3">
              添加工位
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {stations.map((station) => (
              <StationCard
                key={station.id}
                station={station}
                bookings={bookings}
                onEdit={handleOpenEditStation}
                onDelete={handleDeleteStation}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h3 className="section-title mb-0">
              <CalendarDays className="w-5 h-5 text-darkroom-400 mr-2" />
              <span>排期总览</span>
            </h3>
            <div className="flex items-center bg-ink-900/50 rounded-lg p-1">
              <button
                onClick={() => setViewMode("week")}
                className={clsx(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-all",
                  viewMode === "week"
                    ? "bg-darkroom-600 text-ink-50"
                    : "text-ink-400 hover:text-ink-200",
                )}
              >
                <Grid3X3 className="w-3.5 h-3.5" />
                周视图
              </button>
              <button
                onClick={() => setViewMode("day")}
                className={clsx(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-all",
                  viewMode === "day"
                    ? "bg-darkroom-600 text-ink-50"
                    : "text-ink-400 hover:text-ink-200",
                )}
              >
                <BarChart2 className="w-3.5 h-3.5" />
                日视图
              </button>
            </div>
          </div>
          {viewMode === "week" ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setWeekStart(addDays(weekStart, -7))}
                className="ghost-btn !p-1.5"
                title="上一周"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-mono text-ink-300 min-w-[200px] text-center">
                {format(weekStart, "MM月dd日", { locale: zhCN })} -{" "}
                {format(addDays(weekStart, 6), "MM月dd日 yyyy年", { locale: zhCN })}
              </span>
              <button
                onClick={() => setWeekStart(addDays(weekStart, 7))}
                className="ghost-btn !p-1.5"
                title="下一周"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setWeekStart(startOfToday());
                  setCurrentDate(startOfToday());
                }}
                className="ghost-btn text-xs py-1.5 px-3"
              >
                今天
              </button>
            </div>
          ) : (
            <WeekPicker currentDate={currentDate} onDateChange={setCurrentDate} />
          )}
        </div>

        {stations.length === 0 ? (
          <div className="dark-card p-10 text-center text-ink-400">
            请先添加工位后查看排期
          </div>
        ) : viewMode === "week" ? (
          <WeekOverview
            stations={stations}
            bookings={bookings}
            weekStart={weekStart}
            onDayClick={(date) => {
              setCurrentDate(date);
              setViewMode("day");
            }}
          />
        ) : (
          <div>
            <button
              onClick={() => setViewMode("week")}
              className="mb-3 flex items-center gap-1 text-xs text-ink-400 hover:text-darkroom-300 transition-colors"
            >
              <ChevronUp className="w-3.5 h-3.5" />
              返回周视图
            </button>
            <GanttChart
              stations={stations}
              bookings={bookings}
              currentDate={currentDate}
              onBookingClick={(b) => setDetailBooking(b)}
            />
          </div>
        )}
      </section>

      <Modal
        open={showStationModal}
        onClose={() => setShowStationModal(false)}
        title={editingStation ? "编辑工位" : "新增工位"}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-text">工位编号</label>
              <input
                type="text"
                className="input-field"
                placeholder="如 BW-01"
                value={stationForm.code}
                onChange={(e) =>
                  setStationForm({ ...stationForm, code: e.target.value })
                }
              />
            </div>
            <div>
              <label className="label-text">工位名称</label>
              <input
                type="text"
                className="input-field"
                placeholder="如 黑白工位 1号"
                value={stationForm.name}
                onChange={(e) =>
                  setStationForm({ ...stationForm, name: e.target.value })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-text">工位类型</label>
              <select
                className="input-field"
                value={stationForm.type}
                onChange={(e) =>
                  setStationForm({
                    ...stationForm,
                    type: e.target.value as StationType,
                  })
                }
              >
                {Object.entries(
                  STATION_TYPE_LABELS as unknown as Record<string, string>,
                ).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-text">状态</label>
              <select
                className="input-field"
                value={stationForm.status}
                onChange={(e) =>
                  setStationForm({
                    ...stationForm,
                    status: e.target.value as StationStatus,
                  })
                }
              >
                {Object.entries(
                  STATION_STATUS_LABELS as unknown as Record<string, string>,
                ).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label-text">容量（卷）</label>
            <input
              type="number"
              min={1}
              className="input-field"
              value={stationForm.capacity}
              onChange={(e) =>
                setStationForm({
                  ...stationForm,
                  capacity: parseInt(e.target.value) || 1,
                })
              }
            />
          </div>

          <div>
            <label className="label-text">备注描述</label>
            <textarea
              className="input-field min-h-[80px] resize-none"
              placeholder="选填"
              value={stationForm.description}
              onChange={(e) =>
                setStationForm({ ...stationForm, description: e.target.value })
              }
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-ink-800">
            <button
              onClick={() => setShowStationModal(false)}
              className="ghost-btn"
            >
              取消
            </button>
            <button
              onClick={handleSaveStation}
              className="amber-btn"
              disabled={!stationForm.code || !stationForm.name}
            >
              {editingStation ? "保存修改" : "确认添加"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={showBookingModal}
        onClose={() => setShowBookingModal(false)}
        title="新建预约"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-text flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-darkroom-400" />
                摄影师姓名
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="请输入姓名"
                value={bookingForm.photographer}
                onChange={(e) =>
                  setBookingForm({
                    ...bookingForm,
                    photographer: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <label className="label-text flex items-center gap-1.5">
                <Film className="w-3.5 h-3.5 text-darkroom-400" />
                胶卷数量
              </label>
              <input
                type="number"
                min={1}
                className="input-field"
                value={bookingForm.filmCount}
                onChange={(e) =>
                  setBookingForm({
                    ...bookingForm,
                    filmCount: parseInt(e.target.value) || 1,
                  })
                }
              />
            </div>
          </div>

          <div>
            <label className="label-text">胶卷类型</label>
            <input
              type="text"
              className="input-field"
              placeholder="如 黑白135、彩色120"
              value={bookingForm.filmType}
              onChange={(e) =>
                setBookingForm({ ...bookingForm, filmType: e.target.value })
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-text flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-darkroom-400" />
                开始时间
              </label>
              <input
                type="datetime-local"
                className="input-field"
                value={bookingForm.startTime}
                onChange={(e) =>
                  setBookingForm({
                    ...bookingForm,
                    startTime: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <label className="label-text flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-darkroom-400" />
                结束时间
              </label>
              <input
                type="datetime-local"
                className="input-field"
                value={bookingForm.endTime}
                onChange={(e) =>
                  setBookingForm({
                    ...bookingForm,
                    endTime: e.target.value,
                  })
                }
              />
            </div>
          </div>

          <div>
            <label className="label-text">快捷时长</label>
            <div className="flex flex-wrap gap-2 mt-1.5">
              {[
                { label: "1小时", hours: 1 },
                { label: "2小时", hours: 2 },
                { label: "3小时", hours: 3 },
                { label: "4小时", hours: 4 },
                { label: "半天(6h)", hours: 6 },
                { label: "全天(14h)", hours: 14 },
              ].map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => {
                    if (!bookingForm.startTime) return;
                    const start = new Date(bookingForm.startTime);
                    const end = new Date(start.getTime() + opt.hours * 60 * 60 * 1000);
                    const endHour = end.getHours() + end.getMinutes() / 60;
                    if (endHour > 22) {
                      const dayStart = startOfDay(parseISO(bookingForm.startTime));
                      const endDate = setMinutes(setHours(dayStart, 22), 0);
                      setBookingForm({
                        ...bookingForm,
                        endTime: format(endDate, "yyyy-MM-dd'T'HH:mm"),
                      });
                    } else {
                      setBookingForm({
                        ...bookingForm,
                        endTime: format(end, "yyyy-MM-dd'T'HH:mm"),
                      });
                    }
                  }}
                  className="text-xs px-3 py-1.5 rounded-md bg-ink-900/60 text-ink-300 hover:bg-darkroom-600/30 hover:text-darkroom-200 transition-colors border border-ink-700/50"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label-text">整点开始</label>
            <div className="flex flex-wrap gap-2 mt-1.5">
              {[8, 10, 12, 14, 16, 18, 20].map((hour) => (
                <button
                  key={hour}
                  type="button"
                  onClick={() => {
                    const dayStart = startOfDay(parseISO(bookingForm.startTime || new Date().toISOString()));
                    const start = setMinutes(setHours(dayStart, hour), 0);
                    const end = setMinutes(setHours(dayStart, hour + 2), 0);
                    setBookingForm({
                      ...bookingForm,
                      startTime: format(start, "yyyy-MM-dd'T'HH:mm"),
                      endTime: format(end, "yyyy-MM-dd'T'HH:mm"),
                    });
                  }}
                  className="text-xs px-2.5 py-1.5 rounded-md bg-ink-900/60 text-ink-400 hover:bg-status-normal/20 hover:text-green-300 transition-colors border border-ink-700/50 font-mono"
                >
                  {String(hour).padStart(2, "0")}:00
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label-text">备注</label>
            <textarea
              className="input-field min-h-[60px] resize-none"
              placeholder="选填"
              value={bookingForm.notes}
              onChange={(e) =>
                setBookingForm({ ...bookingForm, notes: e.target.value })
              }
            />
          </div>

          {!allocationResult ? (
            <button
              onClick={handleFindBestStation}
              disabled={allocating}
              className="w-full amber-btn flex items-center justify-center gap-2 py-2.5"
            >
              {allocating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  智能分配中...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  智能分配工位
                </>
              )}
            </button>
          ) : (
            <div className="space-y-3">
              {timeChangedAfterAllocation && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-900/20 border border-amber-700/40 text-amber-300 text-xs">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>时间已修改，当前推荐结果可能不再适用，请重新分配</span>
                  <button
                    className="ml-auto text-amber-200 underline hover:no-underline"
                    onClick={handleReallocate}
                  >
                    重新分配
                  </button>
                </div>
              )}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-ink-300">
                  <Sparkles className="w-4 h-4 text-darkroom-400" />
                  找到 {allocationResult.candidates.length} 个可用工位
                </div>
                <button
                  onClick={handleReallocate}
                  className="ghost-btn text-xs py-1 px-3"
                >
                  <RefreshCw className="w-3.5 h-3.5 inline mr-1" />
                  重新分配
                </button>
              </div>

              {allocationResult.candidates.length === 0 ? (
                <div className="dark-card p-6 text-center">
                  <AlertCircle className="w-8 h-8 text-status-maintenance mx-auto mb-2" />
                  <div className="text-sm text-ink-300 mb-2">
                    没有找到符合时间段的空闲工位
                  </div>
                  <div className="text-xs text-ink-500">
                    请尝试调整时间或更换日期
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                  {allocationResult.candidates.map((candidate, idx) => (
                    <CandidateCard
                      key={candidate.station.id}
                      candidate={candidate}
                      rank={idx + 1}
                      selected={selectedCandidate === candidate.station.id}
                      expanded={expandedCandidates.has(candidate.station.id)}
                      onSelect={() =>
                        setSelectedCandidate(candidate.station.id)
                      }
                      onToggleExpand={() => {
                        const next = new Set(expandedCandidates);
                        if (next.has(candidate.station.id)) {
                          next.delete(candidate.station.id);
                        } else {
                          next.add(candidate.station.id);
                        }
                        setExpandedCandidates(next);
                      }}
                      topCandidate={allocationResult.candidates[0]}
                    />
                  ))}
                </div>
              )}

              {allocationResult.unavailable.length > 0 && (
                <div className="mt-4">
                  <div className="flex items-center gap-1.5 text-xs text-ink-500 uppercase tracking-wider mb-2">
                    <Ban className="w-3 h-3" />
                    不可用工位 ({allocationResult.unavailable.length})
                  </div>
                  <div className="space-y-1.5 max-h-[160px] overflow-y-auto">
                    {allocationResult.unavailable.map((item) => (
                      <UnavailableStationItem
                        key={item.station.id}
                        station={item.station}
                        reason={item.reason}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-ink-800">
                <button
                  onClick={() => setShowBookingModal(false)}
                  className="ghost-btn"
                >
                  取消
                </button>
                <button
                  onClick={handleConfirmBooking}
                  className="amber-btn"
                  disabled={!selectedCandidate}
                >
                  <CheckCircle className="w-4 h-4 inline mr-1.5" />
                  确认分配
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {liveDetailBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm"
            onClick={() => {
              setDetailBooking(null);
              setShowCompletionForm(false);
            }}
          />
          <div className="relative dark-card w-full max-w-2xl mx-4 max-h-[85vh] overflow-hidden shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-ink-800 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-darkroom-700/50 flex items-center justify-center border border-darkroom-500/40">
                  <Camera className="w-5 h-5 text-darkroom-200" />
                </div>
                <div>
                  <h3 className="text-lg font-serif text-ink-50">
                    {liveDetailBooking.photographer}
                  </h3>
                  <p className="text-xs text-ink-400 font-mono">
                    {liveDetailBooking.filmType} × {liveDetailBooking.filmCount}卷
                  </p>
                </div>
              </div>
              <button
                className="ghost-btn !p-1.5"
                onClick={() => {
                  setDetailBooking(null);
                  setShowCompletionForm(false);
                }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="dark-card p-3">
                  <div className="text-xs text-ink-400 mb-2">当前状态</div>
                  <span className={getStatusBadgeClass(liveDetailBooking.status)}>
                    <span
                      className={clsx(
                        "status-dot",
                        getStatusColorClass(liveDetailBooking.status),
                      )}
                    />
                    {(BOOKING_STATUS_LABELS as Record<Booking["status"], string>)[
                      liveDetailBooking.status
                    ]}
                  </span>
                </div>
                <div className="dark-card p-3">
                  <div className="text-xs text-ink-400 mb-1">使用工位</div>
                  <div className="text-sm text-ink-100">
                    {stations.find((s) => s.id === liveDetailBooking.stationId)?.name ||
                      "-"}
                  </div>
                </div>
              </div>

              <div className="dark-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-darkroom-400" />
                  <span className="text-sm font-medium text-ink-200">预约时间</span>
                </div>
                <div className="text-lg font-mono text-ink-100">
                  {formatDateTime(liveDetailBooking.startTime)}
                  <span className="mx-2 text-ink-500">→</span>
                  {formatTime(liveDetailBooking.endTime)}
                </div>
                <div className="text-xs text-ink-500 mt-1">
                  时长{" "}
                  {differenceInMinutes(
                    parseISO(liveDetailBooking.endTime),
                    parseISO(liveDetailBooking.startTime),
                  )}{" "}
                  分钟
                </div>
              </div>

              {liveDetailBooking.notes && (
                <div className="dark-card p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-darkroom-400" />
                    <span className="text-sm font-medium text-ink-200">备注</span>
                  </div>
                  <p className="text-sm text-ink-300">{liveDetailBooking.notes}</p>
                </div>
              )}

              <BookingChemicalFlow
                booking={liveDetailBooking}
                dispatches={dispatchRecords}
                wastes={wasteRecords}
                batches={chemicalBatches}
              />

              {showCompletionForm && (
                <div className="dark-card p-4 border border-darkroom-500/40">
                  <div className="flex items-center gap-2 mb-4">
                    <StopCircle className="w-4 h-4 text-darkroom-400" />
                    <span className="text-sm font-medium text-ink-200">
                      完成登记 — 记录实际冲洗用量和废液回收
                    </span>
                  </div>
                  <div className="space-y-4">
                    <div className="p-3 rounded-md bg-ink-950/50 border border-ink-800">
                      <div className="text-xs text-ink-400 mb-2">冲洗药水用量</div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] text-ink-500 uppercase tracking-wider">
                            选择批次
                          </label>
                          <select
                            className="input-field mt-1"
                            value={completionData.batchId}
                            onChange={(e) =>
                              setCompletionData({
                                ...completionData,
                                batchId: e.target.value,
                              })
                            }
                          >
                            <option value="">-- 选择批次 --</option>
                            {chemicalBatches
                              .filter(
                                (b) =>
                                  b.remainingVolume > 0 && b.status !== "expired",
                              )
                              .map((batch) => (
                                <option key={batch.id} value={batch.id}>
                                  {batch.name} ({CHEMICAL_TYPE_LABELS[batch.type]})
                                  - 剩余{batch.remainingVolume.toLocaleString()}ml
                                </option>
                              ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] text-ink-500 uppercase tracking-wider">
                            使用量 (ml)
                          </label>
                          <input
                            type="number"
                            className="input-field mt-1"
                            placeholder="出库量"
                            min={1}
                            value={completionData.volume}
                            onChange={(e) =>
                              setCompletionData({
                                ...completionData,
                                volume: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="text-[10px] text-ink-500 uppercase tracking-wider">
                            操作人
                          </label>
                          <input
                            type="text"
                            className="input-field mt-1"
                            placeholder="登记操作人"
                            value={completionData.operator}
                            onChange={(e) =>
                              setCompletionData({
                                ...completionData,
                                operator: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>
                    </div>

                    <div className="p-3 rounded-md bg-ink-950/50 border border-ink-800">
                      <div className="text-xs text-ink-400 mb-2">废液回收</div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] text-ink-500 uppercase tracking-wider">
                            回收量 (ml)
                          </label>
                          <input
                            type="number"
                            className="input-field mt-1"
                            placeholder="0 = 暂不回收"
                            min={0}
                            value={completionData.wasteVolume}
                            onChange={(e) =>
                              setCompletionData({
                                ...completionData,
                                wasteVolume: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-ink-500 uppercase tracking-wider">
                            废液类型
                          </label>
                          <select
                            className="input-field mt-1"
                            value={completionData.wasteType}
                            onChange={(e) =>
                              setCompletionData({
                                ...completionData,
                                wasteType: e.target.value as WasteType,
                              })
                            }
                          >
                            {Object.entries(WASTE_TYPE_LABELS).map(([k, v]) => (
                              <option key={k} value={k}>
                                {v}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="col-span-2">
                          <label className="text-[10px] text-ink-500 uppercase tracking-wider">
                            回收方式
                          </label>
                          <select
                            className="input-field mt-1"
                            value={completionData.recoveryMethod}
                            onChange={(e) =>
                              setCompletionData({
                                ...completionData,
                                recoveryMethod: e.target.value as RecoveryMethod,
                              })
                            }
                          >
                            {Object.entries(RECOVERY_METHOD_LABELS).map(([k, v]) => (
                              <option key={k} value={k}>
                                {v}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        className="amber-btn flex items-center gap-1.5"
                        onClick={() => {
                          const batch = completionData.batchId;
                          const vol = Number(completionData.volume);

                          if (batch && vol > 0) {
                            const selectedBatch = chemicalBatches.find(
                              (b) => b.id === batch,
                            );
                            if (selectedBatch && vol > selectedBatch.remainingVolume) {
                              alert("出库量超过批次剩余量");
                              return;
                            }
                            addDispatchRecord({
                              batchId: batch,
                              volume: vol,
                              stationId: liveDetailBooking.stationId,
                              bookingId: liveDetailBooking.id,
                              operator: completionData.operator || "系统",
                              dispatchTime: new Date().toISOString(),
                              purpose: `${liveDetailBooking.photographer} - ${liveDetailBooking.filmType}冲洗`,
                            });
                          }

                          const wasteVol = Number(completionData.wasteVolume);
                          if (wasteVol > 0 && batch) {
                            addWasteRecord({
                              batchId: batch,
                              stationId: liveDetailBooking.stationId,
                              volume: wasteVol,
                              type: completionData.wasteType,
                              recoveryMethod: completionData.recoveryMethod,
                              operator: completionData.operator || "系统",
                              recoveryTime: new Date().toISOString(),
                            });
                          }

                          updateBooking(liveDetailBooking.id, {
                            status: "completed",
                          });
                          setShowCompletionForm(false);
                          setDetailBooking(null);
                        }}
                      >
                        <CheckCircle className="w-4 h-4" />
                        确认完成
                      </button>
                      <button
                        className="ghost-btn"
                        onClick={() => setShowCompletionForm(false)}
                      >
                        取消
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center px-5 py-4 border-t border-ink-800 flex-shrink-0">
              <div className="flex items-center gap-2">
                {liveDetailBooking.status === "confirmed" && (
                  <button
                    className="amber-btn flex items-center gap-1.5"
                    onClick={() =>
                      updateBooking(liveDetailBooking.id, { status: "in_progress" })
                    }
                  >
                    <PlayCircle className="w-4 h-4" />
                    开始冲洗
                  </button>
                )}
                {liveDetailBooking.status === "in_progress" && (
                  <button
                    className="amber-btn flex items-center gap-1.5"
                    onClick={() => setShowCompletionForm(true)}
                  >
                    <StopCircle className="w-4 h-4" />
                    完成登记
                  </button>
                )}
                {liveDetailBooking.status === "pending" && (
                  <button
                    className="amber-btn flex items-center gap-1.5"
                    onClick={() =>
                      updateBooking(liveDetailBooking.id, { status: "confirmed" })
                    }
                  >
                    <CheckCircle className="w-4 h-4" />
                    确认预约
                  </button>
                )}
              </div>
              <button
                className="ghost-btn"
                onClick={() => {
                  setDetailBooking(null);
                  setShowCompletionForm(false);
                }}
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
