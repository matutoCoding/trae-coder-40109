import { useState, useMemo } from "react";
import {
  ArrowRightLeft,
  PackageX,
  Droplets,
  Activity,
  CalendarRange,
  CheckCircle2,
  XCircle,
  Filter,
  Beaker,
  MapPin,
  User,
  FileText,
  SlidersHorizontal,
  PieChart as PieChartIcon,
  BarChart3,
  Send,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { clsx } from "clsx";
import { parseISO, startOfToday, startOfMonth, isSameDay, isAfter } from "date-fns";
import {
  CHEMICAL_TYPE_LABELS,
} from "@/types";
import { useAppStore } from "@/store";
import { formatDateTime } from "@/utils";

const PIE_COLORS = ["#b8860b", "#2c5f2d", "#c0392b", "#8B4513", "#6b7280", "#5e4fa2"];

interface FormData {
  batchId: string;
  volume: string;
  stationId: string;
  bookingId: string;
  operator: string;
  purpose: string;
}

const defaultFormData: FormData = {
  batchId: "",
  volume: "",
  stationId: "",
  bookingId: "",
  operator: "",
  purpose: "",
};

interface FormErrors {
  batchId?: string;
  volume?: string;
  stationId?: string;
  operator?: string;
  purpose?: string;
}

export default function DispatchPage() {
  const {
    chemicalBatches,
    dispatchRecords,
    stations,
    bookings,
    addDispatchRecord,
  } = useAppStore();

  const [formData, setFormData] = useState<FormData>(defaultFormData);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [filterBatchId, setFilterBatchId] = useState<string>("");
  const [showSuccess, setShowSuccess] = useState(false);

  const availableBatches = useMemo(
    () => chemicalBatches.filter((b) => b.remainingVolume > 0 && b.status !== "expired"),
    [chemicalBatches],
  );

  const selectedBatch = useMemo(
    () => chemicalBatches.find((b) => b.id === formData.batchId) || null,
    [chemicalBatches, formData.batchId],
  );

  const selectedVolume = Number(formData.volume) || 0;
  const remainingAfter = selectedBatch
    ? Math.max(0, selectedBatch.remainingVolume - selectedVolume)
    : 0;
  const isVolumeInsufficient = selectedBatch && selectedVolume > selectedBatch.remainingVolume;
  const isVolumeZero = selectedVolume <= 0;

  const today = startOfToday();
  const monthStart = startOfMonth(new Date());

  const stats = useMemo(() => {
    const todayRecords = dispatchRecords.filter((d) =>
      isSameDay(parseISO(d.dispatchTime), today),
    );
    const todayCount = todayRecords.length;
    const todayVolume = todayRecords.reduce((sum, d) => sum + d.volume, 0);

    const activeBatches = chemicalBatches.filter(
      (b) => b.status === "normal" || b.status === "near_expiry",
    ).length;

    const monthVolume = dispatchRecords
      .filter((d) => isAfter(parseISO(d.dispatchTime), monthStart))
      .reduce((sum, d) => sum + d.volume, 0);

    return { todayCount, todayVolume, activeBatches, monthVolume };
  }, [dispatchRecords, chemicalBatches, today, monthStart]);

  const filteredRecords = useMemo(() => {
    let records = [...dispatchRecords];
    if (filterBatchId) {
      records = records.filter((d) => d.batchId === filterBatchId);
    }
    return records.sort(
      (a, b) => parseISO(b.dispatchTime).getTime() - parseISO(a.dispatchTime).getTime(),
    );
  }, [dispatchRecords, filterBatchId]);

  const stationDistribution = useMemo(() => {
    const map = new Map<string, number>();
    dispatchRecords.forEach((d) => {
      if (d.stationId) {
        const station = stations.find((s) => s.id === d.stationId);
        const name = station?.name || "未指定";
        const current = map.get(name) || 0;
        map.set(name, current + d.volume);
      }
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [dispatchRecords, stations]);

  const batchConsumption = useMemo(() => {
    const map = new Map<string, number>();
    dispatchRecords.forEach((d) => {
      const batch = chemicalBatches.find((b) => b.id === d.batchId);
      const name = batch?.name || "未知批次";
      const current = map.get(name) || 0;
      map.set(name, current + d.volume);
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [dispatchRecords, chemicalBatches]);

  const getBatchName = (batchId: string) =>
    chemicalBatches.find((b) => b.id === batchId)?.name || "-";

  const getStationName = (stationId?: string) =>
    stationId ? stations.find((s) => s.id === stationId)?.name || "-" : "-";

  const validateForm = (): boolean => {
    const errors: FormErrors = {};
    if (!formData.batchId) errors.batchId = "请选择批次";
    if (!formData.volume || Number(formData.volume) <= 0)
      errors.volume = "请输入有效的出库数量";
    if (selectedBatch && Number(formData.volume) > selectedBatch.remainingVolume)
      errors.volume = "出库数量超过剩余量";
    if (!formData.stationId) errors.stationId = "请选择去向工位";
    if (!formData.operator.trim()) errors.operator = "请输入操作人";
    if (!formData.purpose.trim()) errors.purpose = "请输入用途说明";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    addDispatchRecord({
      batchId: formData.batchId,
      volume: Number(formData.volume),
      stationId: formData.stationId || undefined,
      bookingId: formData.bookingId || undefined,
      operator: formData.operator.trim(),
      dispatchTime: new Date().toISOString(),
      purpose: formData.purpose.trim(),
    });

    setFormData(defaultFormData);
    setFormErrors({});
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2500);
  };

  const handleVolumeChange = (value: string) => {
    setFormData({ ...formData, volume: value });
    if (formErrors.volume) {
      setFormErrors({ ...formErrors, volume: undefined });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-darkroom-700/50 flex items-center justify-center border border-darkroom-500/40">
            <ArrowRightLeft className="w-5 h-5 text-darkroom-200" />
          </div>
          <div>
            <h2 className="text-xl font-serif text-ink-50">药水拆分出库追踪</h2>
            <p className="text-sm text-ink-400">管理药水的拆分出库操作与去向追踪</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="dark-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-ink-400">今日出库次数</span>
            <PackageX className="w-4 h-4 text-darkroom-400" />
          </div>
          <div className="text-2xl font-serif text-ink-50">
            {stats.todayCount}
            <span className="text-sm font-normal ml-1 text-ink-400">次</span>
          </div>
        </div>
        <div className="dark-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-ink-400">今日出库总量</span>
            <Droplets className="w-4 h-4 text-darkroom-400" />
          </div>
          <div className="text-2xl font-serif text-darkroom-200">
            {stats.todayVolume.toLocaleString()}
            <span className="text-sm font-normal ml-1 text-ink-400">ml</span>
          </div>
        </div>
        <div className="dark-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-ink-400">活跃批次数</span>
            <Activity className="w-4 h-4 text-status-normal" />
          </div>
          <div className="text-2xl font-serif text-green-300">{stats.activeBatches}</div>
        </div>
        <div className="dark-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-ink-400">本月累计出库</span>
            <CalendarRange className="w-4 h-4 text-darkroom-400" />
          </div>
          <div className="text-2xl font-serif text-ink-50">
            {stats.monthVolume.toLocaleString()}
            <span className="text-sm font-normal ml-1 text-ink-400">ml</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="dark-card p-5">
          <div className="section-title">
            <SlidersHorizontal className="w-5 h-5 text-darkroom-300" />
            拆分出库操作
          </div>

          {showSuccess && (
            <div className="mb-4 p-3 rounded-lg bg-status-normal/15 border border-status-normal/40 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-status-normal" />
              <span className="text-sm text-green-300">出库操作已成功记录</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="label-text">
                <Beaker className="w-3.5 h-3.5 inline mr-1" />
                选择批次
              </label>
              <select
                className={clsx(
                  "input-field",
                  formErrors.batchId && "border-status-expired",
                )}
                value={formData.batchId}
                onChange={(e) => {
                  setFormData({ ...formData, batchId: e.target.value });
                  if (formErrors.batchId) {
                    setFormErrors({ ...formErrors, batchId: undefined });
                  }
                }}
              >
                <option value="">-- 请选择批次 --</option>
                {availableBatches.map((batch) => (
                  <option key={batch.id} value={batch.id}>
                    {batch.name} ({CHEMICAL_TYPE_LABELS[batch.type]}) - 剩余{" "}
                    {batch.remainingVolume.toLocaleString()}ml
                  </option>
                ))}
              </select>
              {formErrors.batchId && (
                <p className="text-xs text-status-expired mt-1">{formErrors.batchId}</p>
              )}
            </div>

            {selectedBatch && (
              <div className="p-3 rounded-lg bg-ink-950/50 border border-ink-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-ink-300">当前剩余量</span>
                  <span className="text-sm font-mono text-ink-100">
                    {selectedBatch.remainingVolume.toLocaleString()} ml
                  </span>
                </div>
                <div className="progress-bar">
                  <div
                    className={clsx(
                      "h-full rounded-full transition-all",
                      selectedBatch.status === "normal"
                        ? "bg-status-normal"
                        : selectedBatch.status === "near_expiry"
                          ? "bg-status-near"
                          : "bg-status-exhausted",
                    )}
                    style={{
                      width: `${(selectedBatch.remainingVolume / selectedBatch.totalVolume) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="label-text">
                <Droplets className="w-3.5 h-3.5 inline mr-1" />
                拆分数量 (ml)
              </label>
              <input
                type="number"
                className={clsx(
                  "input-field",
                  (formErrors.volume || isVolumeInsufficient) && "border-status-expired",
                )}
                placeholder="请输入出库数量"
                min={1}
                max={selectedBatch?.remainingVolume}
                value={formData.volume}
                onChange={(e) => handleVolumeChange(e.target.value)}
              />
              {selectedBatch && (
                <div className="mt-3 flex items-center gap-3">
                  <input
                    type="range"
                    className="flex-1 accent-darkroom-500"
                    min={0}
                    max={selectedBatch.remainingVolume}
                    step={10}
                    value={selectedVolume}
                    onChange={(e) => handleVolumeChange(e.target.value)}
                  />
                  <span className="text-xs font-mono text-ink-400 w-16 text-right">
                    {selectedVolume.toLocaleString()} ml
                  </span>
                </div>
              )}
              {selectedBatch && selectedVolume > 0 && (
                <div
                  className={clsx(
                    "mt-3 p-3 rounded-lg border flex items-center justify-between",
                    isVolumeInsufficient
                      ? "bg-status-expired/10 border-status-expired/40"
                      : "bg-ink-950/50 border-ink-800",
                  )}
                >
                  <span className="text-sm text-ink-300">拆分后剩余量</span>
                  <span
                    className={clsx(
                      "text-sm font-mono font-medium",
                      isVolumeInsufficient ? "text-status-expired" : "text-ink-100",
                    )}
                  >
                    {isVolumeInsufficient ? (
                      <span className="flex items-center gap-1">
                        <XCircle className="w-4 h-4" />
                        剩余量不足
                      </span>
                    ) : (
                      `${remainingAfter.toLocaleString()} ml`
                    )}
                  </span>
                </div>
              )}
              {formErrors.volume && (
                <p className="text-xs text-status-expired mt-1">{formErrors.volume}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label-text">
                  <MapPin className="w-3.5 h-3.5 inline mr-1" />
                  去向工位
                </label>
                <select
                  className={clsx(
                    "input-field",
                    formErrors.stationId && "border-status-expired",
                  )}
                  value={formData.stationId}
                  onChange={(e) => {
                    setFormData({ ...formData, stationId: e.target.value });
                    if (formErrors.stationId) {
                      setFormErrors({ ...formErrors, stationId: undefined });
                    }
                  }}
                >
                  <option value="">-- 请选择工位 --</option>
                  {stations.map((station) => (
                    <option key={station.id} value={station.id}>
                      {station.name} ({station.code})
                    </option>
                  ))}
                </select>
                {formErrors.stationId && (
                  <p className="text-xs text-status-expired mt-1">
                    {formErrors.stationId}
                  </p>
                )}
              </div>
              <div>
                <label className="label-text">
                  <CalendarRange className="w-3.5 h-3.5 inline mr-1" />
                  关联预约 (可选)
                </label>
                <select
                  className="input-field"
                  value={formData.bookingId}
                  onChange={(e) => setFormData({ ...formData, bookingId: e.target.value })}
                >
                  <option value="">-- 不关联 --</option>
                  {bookings
                    .filter((b) => b.status !== "cancelled" && b.status !== "completed")
                    .map((booking) => {
                      const station = stations.find((s) => s.id === booking.stationId);
                      return (
                        <option key={booking.id} value={booking.id}>
                          {booking.photographer} - {booking.filmType} (
                          {station?.code || "-"})
                        </option>
                      );
                    })}
                </select>
              </div>
            </div>

            <div>
              <label className="label-text">
                <User className="w-3.5 h-3.5 inline mr-1" />
                操作人
              </label>
              <input
                type="text"
                className={clsx(
                  "input-field",
                  formErrors.operator && "border-status-expired",
                )}
                placeholder="请输入操作人姓名"
                value={formData.operator}
                onChange={(e) => {
                  setFormData({ ...formData, operator: e.target.value });
                  if (formErrors.operator) {
                    setFormErrors({ ...formErrors, operator: undefined });
                  }
                }}
              />
              {formErrors.operator && (
                <p className="text-xs text-status-expired mt-1">{formErrors.operator}</p>
              )}
            </div>

            <div>
              <label className="label-text">
                <FileText className="w-3.5 h-3.5 inline mr-1" />
                用途说明
              </label>
              <textarea
                className={clsx(
                  "input-field resize-none",
                  formErrors.purpose && "border-status-expired",
                )}
                rows={2}
                placeholder="请输入用途说明，如：日常冲洗、批量作业等"
                value={formData.purpose}
                onChange={(e) => {
                  setFormData({ ...formData, purpose: e.target.value });
                  if (formErrors.purpose) {
                    setFormErrors({ ...formErrors, purpose: undefined });
                  }
                }}
              />
              {formErrors.purpose && (
                <p className="text-xs text-status-expired mt-1">{formErrors.purpose}</p>
              )}
            </div>

            <button
              className="amber-btn w-full flex items-center justify-center gap-2"
              onClick={handleSubmit}
              disabled={isVolumeInsufficient || isVolumeZero}
            >
              <Send className="w-4 h-4" />
              确认出库
            </button>
          </div>
        </div>

        <div className="dark-card p-5">
          <div className="section-title">
            <Filter className="w-5 h-5 text-darkroom-300" />
            出库记录列表
          </div>

          <div className="mb-4">
            <select
              className="input-field max-w-xs"
              value={filterBatchId}
              onChange={(e) => setFilterBatchId(e.target.value)}
            >
              <option value="">全部批次</option>
              {chemicalBatches.map((batch) => (
                <option key={batch.id} value={batch.id}>
                  {batch.name}
                </option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto max-h-[520px]">
            <table className="w-full">
              <thead className="sticky top-0 bg-ink-900/95 backdrop-blur-sm">
                <tr className="border-b border-ink-800 text-xs text-ink-400 uppercase tracking-wider">
                  <th className="text-left px-3 py-2.5 font-medium">时间</th>
                  <th className="text-left px-3 py-2.5 font-medium">批次名称</th>
                  <th className="text-right px-3 py-2.5 font-medium">出库量</th>
                  <th className="text-left px-3 py-2.5 font-medium">去向工位</th>
                  <th className="text-left px-3 py-2.5 font-medium">操作人</th>
                  <th className="text-left px-3 py-2.5 font-medium">用途</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-800/60">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-12 text-center text-ink-500">
                      暂无出库记录
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((record) => (
                    <tr
                      key={record.id}
                      className="hover:bg-ink-800/30 transition-colors"
                    >
                      <td className="px-3 py-2.5 text-sm font-mono text-ink-300 whitespace-nowrap">
                        {formatDateTime(record.dispatchTime)}
                      </td>
                      <td className="px-3 py-2.5 text-sm text-ink-100 font-medium">
                        {getBatchName(record.batchId)}
                      </td>
                      <td className="px-3 py-2.5 text-sm text-right font-mono text-darkroom-200">
                        {record.volume.toLocaleString()} ml
                      </td>
                      <td className="px-3 py-2.5 text-sm text-ink-200">
                        {getStationName(record.stationId)}
                      </td>
                      <td className="px-3 py-2.5 text-sm text-ink-200">
                        {record.operator}
                      </td>
                      <td className="px-3 py-2.5 text-sm text-ink-300 max-w-[180px] truncate">
                        {record.purpose}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="dark-card p-5">
          <div className="section-title">
            <PieChartIcon className="w-5 h-5 text-darkroom-300" />
            去向分布 (按工位)
          </div>
          <div className="h-72">
            {stationDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stationDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) =>
                      percent > 0.05
                        ? `${name} ${(percent * 100).toFixed(0)}%`
                        : ""
                    }
                    labelLine={false}
                  >
                    {stationDistribution.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1a1a1a",
                      border: "1px solid #6e3f0a",
                      borderRadius: "6px",
                      color: "#e8e0d0",
                    }}
                    formatter={(value: number) => [
                      `${value.toLocaleString()} ml`,
                      "出库量",
                    ]}
                  />
                  <Legend
                    formatter={(value) => (
                      <span style={{ color: "#d1c4a8" }}>{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-ink-500 text-sm">
                暂无可视化数据
              </div>
            )}
          </div>
        </div>

        <div className="dark-card p-5">
          <div className="section-title">
            <BarChart3 className="w-5 h-5 text-darkroom-300" />
            批次消耗排行
          </div>
          <div className="h-72">
            {batchConsumption.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={batchConsumption} layout="vertical">
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#2d2408"
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    stroke="#9e825a"
                    fontSize={12}
                    tickFormatter={(v) => `${v}`}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke="#9e825a"
                    fontSize={11}
                    width={100}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1a1a1a",
                      border: "1px solid #6e3f0a",
                      borderRadius: "6px",
                      color: "#e8e0d0",
                    }}
                    formatter={(value: number) => [
                      `${value.toLocaleString()} ml`,
                      "出库总量",
                    ]}
                  />
                  <Bar dataKey="value" fill="#b8860b" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-ink-500 text-sm">
                暂无可视化数据
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
