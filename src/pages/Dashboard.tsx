import { useMemo } from "react";
import {
  LayoutGrid,
  CheckCircle2,
  Clock,
  Wrench,
  CalendarDays,
  PlayCircle,
  FlaskConical,
  AlertTriangle,
  Package,
  Trash2,
  TrendingUp,
  PieChart,
  ListOrdered,
  ArrowRightLeft,
  User,
  Film,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { useAppStore } from "@/store";
import { formatDateTime, getStatusBadgeClass } from "@/utils";
import {
  BOOKING_STATUS_LABELS,
  CHEMICAL_TYPE_LABELS,
} from "@/types";
import { format, parseISO, startOfMonth, isAfter, addDays } from "date-fns";

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  accentColor?: string;
}

function StatCard({ title, value, icon, accentColor = "text-darkroom-500" }: StatCardProps) {
  return (
    <div className="dark-card dark-card-hover p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-lg bg-ink-800 flex items-center justify-center ${accentColor}`}>
        {icon}
      </div>
      <div className="flex-1">
        <div className="text-sm text-ink-300 mb-1">{title}</div>
        <div className="text-2xl font-serif text-ink-50 font-semibold">{value}</div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const {
    stations,
    bookings,
    chemicalBatches,
    dispatchRecords,
    wasteRecords,
    initMockData,
  } = useAppStore();

  useMemo(() => {
    initMockData();
  }, [initMockData]);

  const stationStats = useMemo(() => {
    return {
      total: stations.length,
      idle: stations.filter((s) => s.status === "idle").length,
      occupied: stations.filter((s) => s.status === "occupied").length,
      maintenance: stations.filter((s) => s.status === "maintenance").length,
    };
  }, [stations]);

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const bookingStats = useMemo(() => {
    const todayBookings = bookings.filter((b) => {
      const bookingDate = format(parseISO(b.startTime), "yyyy-MM-dd");
      return bookingDate === todayStr && b.status !== "cancelled";
    });
    const inProgress = bookings.filter((b) => b.status === "in_progress").length;
    const alertBatches = chemicalBatches.filter(
      (c) => c.status === "near_expiry" || c.status === "expired" || c.status === "exhausted",
    ).length;
    return {
      today: todayBookings.length,
      inProgress,
      chemicalTotal: chemicalBatches.length,
      alertBatches,
    };
  }, [bookings, chemicalBatches, todayStr]);

  const dispatchAndWasteStats = useMemo(() => {
    const monthStart = startOfMonth(new Date());
    const monthlyDispatch = dispatchRecords
      .filter((d) => isAfter(parseISO(d.dispatchTime), monthStart))
      .reduce((sum, d) => sum + d.volume, 0);
    const monthlyWaste = wasteRecords
      .filter((w) => isAfter(parseISO(w.recoveryTime), monthStart))
      .reduce((sum, w) => sum + w.volume, 0);
    return {
      dispatch: monthlyDispatch,
      waste: monthlyWaste,
    };
  }, [dispatchRecords, wasteRecords]);

  const bookingTrendData = useMemo(() => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const date = addDays(new Date(), -i);
      const dateStr = format(date, "yyyy-MM-dd");
      const count = bookings.filter((b) => {
        const bookingDate = format(parseISO(b.startTime), "yyyy-MM-dd");
        return bookingDate === dateStr && b.status !== "cancelled";
      }).length;
      data.push({
        date: format(date, "MM-dd"),
        预约数: count,
      });
    }
    return data;
  }, [bookings]);

  const chemicalDistributionData = useMemo(() => {
    const typeMap = new Map<string, number>();
    chemicalBatches.forEach((c) => {
      const label = CHEMICAL_TYPE_LABELS[c.type];
      const current = typeMap.get(label) || 0;
      typeMap.set(label, current + c.remainingVolume);
    });
    return Array.from(typeMap.entries()).map(([name, value]) => ({ name, value }));
  }, [chemicalBatches]);

  const PIE_COLORS = ["#b8860b", "#2c5f2d", "#c0392b", "#8B4513", "#6b7280"];

  const recentBookings = useMemo(() => {
    return [...bookings]
      .sort((a, b) => parseISO(b.createdAt).getTime() - parseISO(a.createdAt).getTime())
      .slice(0, 5);
  }, [bookings]);

  const recentDispatches = useMemo(() => {
    return [...dispatchRecords]
      .sort((a, b) => parseISO(b.dispatchTime).getTime() - parseISO(a.dispatchTime).getTime())
      .slice(0, 5);
  }, [dispatchRecords]);

  const getStationName = (stationId: string) => {
    return stations.find((s) => s.id === stationId)?.name || "-";
  };

  const getBatchName = (batchId: string) => {
    return chemicalBatches.find((c) => c.id === batchId)?.name || "-";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-serif text-ink-50 flex items-center gap-3">
          <TrendingUp className="w-7 h-7 text-darkroom-500" />
          数据概览
        </h1>
        <div className="text-sm text-ink-400 font-mono">
          {format(new Date(), "yyyy年MM月dd日 HH:mm")}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="工位总数"
          value={stationStats.total}
          icon={<LayoutGrid className="w-6 h-6" />}
          accentColor="text-darkroom-500"
        />
        <StatCard
          title="空闲工位"
          value={stationStats.idle}
          icon={<CheckCircle2 className="w-6 h-6" />}
          accentColor="text-status-idle"
        />
        <StatCard
          title="占用工位"
          value={stationStats.occupied}
          icon={<Clock className="w-6 h-6" />}
          accentColor="text-darkroom-600"
        />
        <StatCard
          title="维护中工位"
          value={stationStats.maintenance}
          icon={<Wrench className="w-6 h-6" />}
          accentColor="text-status-maintenance"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="今日预约数"
          value={bookingStats.today}
          icon={<CalendarDays className="w-6 h-6" />}
          accentColor="text-darkroom-500"
        />
        <StatCard
          title="进行中冲洗"
          value={bookingStats.inProgress}
          icon={<PlayCircle className="w-6 h-6" />}
          accentColor="text-darkroom-600"
        />
        <StatCard
          title="药水批次总数"
          value={bookingStats.chemicalTotal}
          icon={<FlaskConical className="w-6 h-6" />}
          accentColor="text-status-idle"
        />
        <StatCard
          title="临期/耗尽批次"
          value={bookingStats.alertBatches}
          icon={<AlertTriangle className="w-6 h-6" />}
          accentColor="text-status-maintenance"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatCard
          title="本月出库总量 (ml)"
          value={dispatchAndWasteStats.dispatch.toLocaleString()}
          icon={<Package className="w-6 h-6" />}
          accentColor="text-darkroom-500"
        />
        <StatCard
          title="废液回收总量 (ml)"
          value={dispatchAndWasteStats.waste.toLocaleString()}
          icon={<Trash2 className="w-6 h-6" />}
          accentColor="text-darkroom-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="dark-card p-5">
          <div className="section-title">
            <TrendingUp className="w-5 h-5 text-darkroom-500" />
            7日预约趋势
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={bookingTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2d2408" />
                <XAxis
                  dataKey="date"
                  stroke="#9e825a"
                  tick={{ fill: "#b8a380", fontSize: 12 }}
                  axisLine={{ stroke: "#4a3a0c" }}
                />
                <YAxis
                  stroke="#9e825a"
                  tick={{ fill: "#b8a380", fontSize: 12 }}
                  axisLine={{ stroke: "#4a3a0c" }}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1a1a1a",
                    border: "1px solid #6e3f0a",
                    borderRadius: "6px",
                    color: "#e8e0d0",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="预约数"
                  stroke="#b8860b"
                  strokeWidth={3}
                  dot={{ fill: "#b8860b", strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: "#d3b172" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="dark-card p-5">
          <div className="section-title">
            <PieChart className="w-5 h-5 text-darkroom-500" />
            药水类型存量分布
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={chemicalDistributionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    percent > 0.05 ? `${name} ${(percent * 100).toFixed(0)}%` : ""
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chemicalDistributionData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1a1a1a",
                    border: "1px solid #6e3f0a",
                    borderRadius: "6px",
                    color: "#e8e0d0",
                  }}
                  formatter={(value: number) => [`${value} ml`, "存量"]}
                />
                <Legend
                  formatter={(value) => <span style={{ color: "#d1c4a8" }}>{value}</span>}
                />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="dark-card p-5">
          <div className="section-title">
            <ListOrdered className="w-5 h-5 text-darkroom-500" />
            近期预约列表
          </div>
          <div className="space-y-3">
            {recentBookings.length === 0 ? (
              <div className="text-center text-ink-500 py-8">暂无预约记录</div>
            ) : (
              recentBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-ink-950/50 border border-ink-800 hover:border-darkroom-700/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <User className="w-4 h-4 text-darkroom-400" />
                      <span className="text-ink-100 font-medium">{booking.photographer}</span>
                      <span className={`badge ${getStatusBadgeClass(booking.status)}`}>
                        <span className="status-dot bg-current opacity-70" />
                        {BOOKING_STATUS_LABELS[booking.status]}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-ink-400">
                      <span className="flex items-center gap-1">
                        <Film className="w-3.5 h-3.5" />
                        {booking.filmType} × {booking.filmCount}
                      </span>
                      <span>{getStationName(booking.stationId)}</span>
                      <span className="font-mono">{formatDateTime(booking.startTime)}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="dark-card p-5">
          <div className="section-title">
            <ArrowRightLeft className="w-5 h-5 text-darkroom-500" />
            近期出库记录
          </div>
          <div className="space-y-3">
            {recentDispatches.length === 0 ? (
              <div className="text-center text-ink-500 py-8">暂无出库记录</div>
            ) : (
              recentDispatches.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-ink-950/50 border border-ink-800 hover:border-darkroom-700/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <FlaskConical className="w-4 h-4 text-darkroom-400" />
                      <span className="text-ink-100 font-medium">{getBatchName(record.batchId)}</span>
                      <span className="badge bg-darkroom-600/20 text-darkroom-200">
                        <span className="status-dot bg-darkroom-500" />
                        {record.volume} ml
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-ink-400">
                      <span>{record.operator}</span>
                      <span>{record.purpose}</span>
                      <span className="font-mono">{formatDateTime(record.dispatchTime)}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
