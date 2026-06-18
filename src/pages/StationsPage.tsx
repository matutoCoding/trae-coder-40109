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
} from "@/types";
import {
  STATION_TYPE_LABELS,
  STATION_STATUS_LABELS,
  BOOKING_STATUS_LABELS,
} from "@/types";

const HOURS = Array.from({ length: 15 }, (_, i) => 8 + i);
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
          <div className="flex-1 flex">
            {HOURS.map((h) => (
              <div
                key={h}
                className="flex-1 text-center text-xs text-ink-500 font-mono"
              >
                {String(h).padStart(2, "0")}:00
              </div>
            ))}
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
                  <div className="absolute inset-0 flex">
                    {HOURS.slice(1).map((h) => (
                      <div
                        key={h}
                        className="h-full border-l border-ink-800/30"
                        style={{ width: `${100 / HOURS.length}%` }}
                      />
                    ))}
                  </div>

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
  onSelect,
}: {
  candidate: StationCandidate;
  rank: number;
  selected: boolean;
  onSelect: () => void;
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

  return (
    <div
      onClick={onSelect}
      className={clsx(
        "dark-card dark-card-hover p-4 cursor-pointer transition-all duration-200",
        selected
          ? "border-darkroom-500 shadow-amber-glow ring-1 ring-darkroom-500/30"
          : "border-ink-800",
      )}
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

        {selected && (
          <div className="flex-shrink-0">
            <CheckCircle2 className="w-6 h-6 text-darkroom-400" />
          </div>
        )}
      </div>
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

export default function StationsPage() {
  const {
    stations,
    bookings,
    addStation,
    updateStation,
    deleteStation,
    addBooking,
    initMockData,
  } = useAppStore();

  useEffect(() => {
    initMockData();
  }, [initMockData]);

  const [currentDate, setCurrentDate] = useState<Date>(() => startOfToday());

  const [showStationModal, setShowStationModal] = useState(false);
  const [editingStation, setEditingStation] = useState<Station | null>(null);
  const [stationForm, setStationForm] = useState<StationFormData>(defaultStationForm);

  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingForm, setBookingForm] = useState<BookingFormData>(defaultBookingForm);
  const [allocationResult, setAllocationResult] = useState<AllocationResult | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null);
  const [allocating, setAllocating] = useState(false);

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
      setAllocating(false);
    }, 500);
  };

  const handleConfirmBooking = () => {
    if (!selectedCandidate) {
      alert("请先选择一个工位");
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
    setShowBookingModal(false);
  };

  const handleReallocate = () => {
    setAllocationResult(null);
    setSelectedCandidate(null);
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
          <h3 className="section-title mb-0">
            <CalendarDays className="w-5 h-5 text-darkroom-400 mr-2" />
            <span>排期甘特图</span>
            <span className="text-sm font-mono text-ink-400 ml-3">
              {format(currentDate, "yyyy年MM月dd日 EEEE", { locale: zhCN })}
            </span>
          </h3>
          <WeekPicker currentDate={currentDate} onDateChange={setCurrentDate} />
        </div>

        {stations.length === 0 ? (
          <div className="dark-card p-10 text-center text-ink-400">
            请先添加工位后查看排期
          </div>
        ) : (
          <GanttChart
            stations={stations}
            bookings={bookings}
            currentDate={currentDate}
            onBookingClick={(b) => {
              alert(
                `预约详情：\n摄影师：${b.photographer}\n胶卷：${b.filmType} × ${b.filmCount}\n时间：${formatDateTime(b.startTime)} - ${formatTime(b.endTime)}\n状态：${(BOOKING_STATUS_LABELS as Record<Booking["status"], string>)[b.status]}`,
              );
            }}
          />
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
                <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                  {allocationResult.candidates.map((candidate, idx) => (
                    <CandidateCard
                      key={candidate.station.id}
                      candidate={candidate}
                      rank={idx + 1}
                      selected={selectedCandidate === candidate.station.id}
                      onSelect={() =>
                        setSelectedCandidate(candidate.station.id)
                      }
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
    </div>
  );
}
