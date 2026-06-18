import { useState, useMemo } from "react";
import {
  Trash2,
  Plus,
  Droplets,
  CalendarDays,
  AlertTriangle,
  Recycle,
  PieChart,
  TrendingUp,
  BarChart3,
  Filter,
  X,
  Beaker,
  Factory,
} from "lucide-react";
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
  XAxis,
  YAxis,
  BarChart,
  Bar,
} from "recharts";
import { clsx } from "clsx";
import { formatISO, startOfToday, startOfMonth, subDays, format, parseISO, isSameDay, isAfter } from "date-fns";
import {
  WASTE_TYPE_LABELS,
  RECOVERY_METHOD_LABELS,
  type WasteType,
  type RecoveryMethod,
  type WasteRecord,
} from "@/types";
import { useAppStore } from "@/store";
import { formatDateTime } from "@/utils";

interface WasteFormData {
  batchId: string;
  stationId: string;
  type: WasteType;
  volume: string;
  recoveryMethod: RecoveryMethod;
  operator: string;
  notes: string;
}

const defaultFormData: WasteFormData = {
  batchId: "",
  stationId: "",
  type: "developer_waste",
  volume: "",
  recoveryMethod: "professional",
  operator: "",
  notes: "",
};

const WASTE_TYPE_COLORS: Record<WasteType, string> = {
  developer_waste: "#2c5f2d",
  fixer_waste: "#1e40af",
  bleach_waste: "#b8860b",
  mixed: "#c0392b",
};

const RECOVERY_METHOD_COLORS: Record<RecoveryMethod, string> = {
  professional: "#2c5f2d",
  neutralization: "#1e40af",
  storage: "#6b7280",
};

export default function WastePage() {
  const {
    wasteRecords,
    chemicalBatches,
    stations,
    addWasteRecord,
    deleteWasteRecord,
  } = useAppStore();

  const [formData, setFormData] = useState<WasteFormData>(defaultFormData);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof WasteFormData, string>>>({});
  const [filterType, setFilterType] = useState<string>("");
  const [filterMethod, setFilterMethod] = useState<string>("");

  const stats = useMemo(() => {
    const today = startOfToday();
    const monthStart = startOfMonth(new Date());

    const todayVolume = wasteRecords
      .filter((w) => isSameDay(parseISO(w.recoveryTime), today))
      .reduce((sum, w) => sum + w.volume, 0);

    const monthVolume = wasteRecords
      .filter((w) => isAfter(parseISO(w.recoveryTime), monthStart) || isSameDay(parseISO(w.recoveryTime), monthStart))
      .reduce((sum, w) => sum + w.volume, 0);

    const pendingVolume = wasteRecords
      .filter((w) => w.recoveryMethod === "storage")
      .reduce((sum, w) => sum + w.volume, 0);

    const totalVolume = wasteRecords.reduce((sum, w) => sum + w.volume, 0);
    const professionalVolume = wasteRecords
      .filter((w) => w.recoveryMethod === "professional")
      .reduce((sum, w) => sum + w.volume, 0);
    const professionalRate = totalVolume > 0 ? Math.round((professionalVolume / totalVolume) * 100) : 0;

    return { todayVolume, monthVolume, pendingVolume, professionalRate };
  }, [wasteRecords]);

  const typeDistribution = useMemo(() => {
    const map: Record<WasteType, number> = {
      developer_waste: 0,
      fixer_waste: 0,
      bleach_waste: 0,
      mixed: 0,
    };
    wasteRecords.forEach((w) => {
      map[w.type] += w.volume;
    });
    return Object.entries(map)
      .filter(([, value]) => value > 0)
      .map(([type, value]) => ({
        name: WASTE_TYPE_LABELS[type as WasteType],
        value,
        color: WASTE_TYPE_COLORS[type as WasteType],
      }));
  }, [wasteRecords]);

  const methodDistribution = useMemo(() => {
    const map: Record<RecoveryMethod, number> = {
      professional: 0,
      neutralization: 0,
      storage: 0,
    };
    wasteRecords.forEach((w) => {
      map[w.recoveryMethod] += w.volume;
    });
    return Object.entries(map).map(([method, value]) => ({
      method: method as RecoveryMethod,
      name: RECOVERY_METHOD_LABELS[method as RecoveryMethod],
      value,
      color: RECOVERY_METHOD_COLORS[method as RecoveryMethod],
    }));
  }, [wasteRecords]);

  const trendData = useMemo(() => {
    const data: Array<{ date: string; volume: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const day = subDays(new Date(), i);
      const dayVolume = wasteRecords
        .filter((w) => isSameDay(parseISO(w.recoveryTime), day))
        .reduce((sum, w) => sum + w.volume, 0);
      data.push({
        date: format(day, "MM-dd"),
        volume: dayVolume,
      });
    }
    return data;
  }, [wasteRecords]);

  const filteredRecords = useMemo(() => {
    return wasteRecords
      .filter((w) => !filterType || w.type === filterType)
      .filter((w) => !filterMethod || w.recoveryMethod === filterMethod)
      .sort(
        (a, b) => new Date(b.recoveryTime).getTime() - new Date(a.recoveryTime).getTime(),
      );
  }, [wasteRecords, filterType, filterMethod]);

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof WasteFormData, string>> = {};
    if (!formData.volume || Number(formData.volume) <= 0)
      errors.volume = "请输入有效的回收量";
    if (!formData.operator.trim()) errors.operator = "请输入操作人";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;
    const record: Omit<WasteRecord, "id" | "createdAt"> = {
      batchId: formData.batchId || undefined,
      stationId: formData.stationId || undefined,
      type: formData.type,
      volume: Number(formData.volume),
      recoveryMethod: formData.recoveryMethod,
      operator: formData.operator.trim(),
      recoveryTime: formatISO(new Date()),
      notes: formData.notes.trim() || undefined,
    };
    addWasteRecord(record);
    setFormData(defaultFormData);
    setFormErrors({});
  };

  const handleDelete = (id: string) => {
    if (window.confirm("确定要删除该废液记录吗？")) {
      deleteWasteRecord(id);
    }
  };

  const getBatchName = (id?: string) => {
    if (!id) return "-";
    const batch = chemicalBatches.find((b) => b.id === id);
    return batch ? batch.name : "-";
  };

  const getStationName = (id?: string) => {
    if (!id) return "-";
    const station = stations.find((s) => s.id === id);
    return station ? station.name : "-";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-status-maintenance/30 flex items-center justify-center border border-status-maintenance/50">
            <Recycle className="w-5 h-5 text-status-maintenance" />
          </div>
          <div>
            <h2 className="text-xl font-serif text-ink-50">废液回收记录</h2>
            <p className="text-sm text-ink-400">记录与管理暗房废液的回收处理</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="dark-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-ink-400">今日回收量</span>
            <CalendarDays className="w-4 h-4 text-darkroom-300" />
          </div>
          <div className="text-2xl font-serif text-ink-50">
            {stats.todayVolume.toLocaleString()}
            <span className="text-sm font-normal ml-1 text-ink-400">ml</span>
          </div>
        </div>
        <div className="dark-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-ink-400">本月回收量</span>
            <TrendingUp className="w-4 h-4 text-darkroom-300" />
          </div>
          <div className="text-2xl font-serif text-darkroom-200">
            {stats.monthVolume.toLocaleString()}
            <span className="text-sm font-normal ml-1 text-ink-400">ml</span>
          </div>
        </div>
        <div className="dark-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-ink-400">待处理废液总量</span>
            <AlertTriangle className="w-4 h-4 text-status-near" />
          </div>
          <div className="text-2xl font-serif text-status-near">
            {stats.pendingVolume.toLocaleString()}
            <span className="text-sm font-normal ml-1 text-ink-400">ml</span>
          </div>
        </div>
        <div className="dark-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-ink-400">专业回收率</span>
            <Recycle className="w-4 h-4 text-status-normal" />
          </div>
          <div className="text-2xl font-serif text-green-300">
            {stats.professionalRate}
            <span className="text-sm font-normal ml-1 text-ink-400">%</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="dark-card p-5">
          <div className="section-title">
            <Plus className="w-5 h-5 text-darkroom-300" />
            废液登记
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label-text">关联批次（可选）</label>
                <select
                  className="input-field"
                  value={formData.batchId}
                  onChange={(e) => setFormData({ ...formData, batchId: e.target.value })}
                >
                  <option value="">不关联</option>
                  {chemicalBatches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label-text">关联工位（可选）</label>
                <select
                  className="input-field"
                  value={formData.stationId}
                  onChange={(e) => setFormData({ ...formData, stationId: e.target.value })}
                >
                  <option value="">不关联</option>
                  {stations.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label-text">废液类型</label>
                <select
                  className="input-field"
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value as WasteType })
                  }
                >
                  {Object.entries(WASTE_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label-text">回收量 (ml)</label>
                <input
                  type="number"
                  className={clsx(
                    "input-field",
                    formErrors.volume && "border-status-expired",
                  )}
                  placeholder="如 500"
                  min={1}
                  value={formData.volume}
                  onChange={(e) => setFormData({ ...formData, volume: e.target.value })}
                />
                {formErrors.volume && (
                  <p className="text-xs text-status-expired mt-1">{formErrors.volume}</p>
                )}
              </div>
            </div>
            <div>
              <label className="label-text">回收方式</label>
              <select
                className="input-field"
                value={formData.recoveryMethod}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    recoveryMethod: e.target.value as RecoveryMethod,
                  })
                }
              >
                {Object.entries(RECOVERY_METHOD_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-text">操作人</label>
              <input
                type="text"
                className={clsx(
                  "input-field",
                  formErrors.operator && "border-status-expired",
                )}
                placeholder="请输入操作人姓名"
                value={formData.operator}
                onChange={(e) => setFormData({ ...formData, operator: e.target.value })}
              />
              {formErrors.operator && (
                <p className="text-xs text-status-expired mt-1">{formErrors.operator}</p>
              )}
            </div>
            <div>
              <label className="label-text">备注说明</label>
              <textarea
                className="input-field min-h-[80px] resize-none"
                placeholder="请输入备注信息（可选）"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
            <button className="amber-btn w-full flex items-center justify-center gap-2" onClick={handleSubmit}>
              <Plus className="w-4 h-4" />
              <span>提交记录</span>
            </button>
          </div>
        </div>

        <div className="dark-card p-5">
          <div className="section-title">
            <PieChart className="w-5 h-5 text-darkroom-300" />
            废液类型分布
          </div>
          <div className="h-56">
            {typeDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={typeDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {typeDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1a1a1a",
                      border: "1px solid #6e3f0a",
                      borderRadius: "6px",
                      color: "#e8e0d0",
                    }}
                    formatter={(value: number) => [`${value.toLocaleString()} ml`, "回收量"]}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: "12px", color: "#b8a380" }}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-ink-500 text-sm">
                暂无废液数据
              </div>
            )}
          </div>
        </div>

        <div className="dark-card p-5">
          <div className="section-title">
            <Droplets className="w-5 h-5 text-darkroom-300" />
            回收方式分布
          </div>
          <div className="space-y-3">
            {methodDistribution.map((item) => (
              <div key={item.method} className="dark-card p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {item.method === "professional" && (
                      <Recycle className="w-4 h-4" style={{ color: item.color }} />
                    )}
                    {item.method === "neutralization" && (
                      <Beaker className="w-4 h-4" style={{ color: item.color }} />
                    )}
                    {item.method === "storage" && (
                      <Factory className="w-4 h-4" style={{ color: item.color }} />
                    )}
                    <span className="text-sm text-ink-200">{item.name}</span>
                  </div>
                  <span className="text-sm font-mono text-ink-100">
                    {item.value.toLocaleString()} ml
                  </span>
                </div>
                <div className="progress-bar">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${
                        methodDistribution.reduce((s, m) => s + m.value, 0) > 0
                          ? (item.value / methodDistribution.reduce((s, m) => s + m.value, 0)) * 100
                          : 0
                      }%`,
                      backgroundColor: item.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="dark-card p-5">
        <div className="section-title">
          <BarChart3 className="w-5 h-5 text-darkroom-300" />
          近7日回收趋势
        </div>
        <div className="h-56">
          {trendData.some((d) => d.volume > 0) ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2d2408" />
                <XAxis
                  dataKey="date"
                  stroke="#9e825a"
                  fontSize={12}
                  tickLine={false}
                />
                <YAxis
                  stroke="#9e825a"
                  fontSize={12}
                  tickLine={false}
                  tickFormatter={(v) => `${v}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1a1a1a",
                    border: "1px solid #6e3f0a",
                    borderRadius: "6px",
                    color: "#e8e0d0",
                  }}
                  formatter={(value: number) => [`${value.toLocaleString()} ml`, "回收量"]}
                />
                <Bar dataKey="volume" fill="#b8860b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-ink-500 text-sm">
              近7日暂无回收记录
            </div>
          )}
        </div>
      </div>

      <div className="dark-card">
        <div className="section-title px-5 pt-4">
          <TrendingUp className="w-5 h-5 text-darkroom-300" />
          废液记录列表
        </div>

        <div className="px-5 pb-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-ink-400" />
            <span className="text-sm text-ink-400">筛选:</span>
          </div>
          <div className="flex items-center gap-2">
            <select
              className="input-field !w-auto !py-1.5 text-sm"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="">全部类型</option>
              {Object.entries(WASTE_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <select
              className="input-field !w-auto !py-1.5 text-sm"
              value={filterMethod}
              onChange={(e) => setFilterMethod(e.target.value)}
            >
              <option value="">全部回收方式</option>
              {Object.entries(RECOVERY_METHOD_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          {(filterType || filterMethod) && (
            <button
              className="ghost-btn !py-1.5 !px-3 text-sm flex items-center gap-1"
              onClick={() => {
                setFilterType("");
                setFilterMethod("");
              }}
            >
              <X className="w-3.5 h-3.5" />
              清除筛选
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-ink-800 text-xs text-ink-400 uppercase tracking-wider">
                <th className="text-left px-5 py-3 font-medium">回收时间</th>
                <th className="text-left px-5 py-3 font-medium">废液类型</th>
                <th className="text-right px-5 py-3 font-medium">回收量(ml)</th>
                <th className="text-left px-5 py-3 font-medium">回收方式</th>
                <th className="text-left px-5 py-3 font-medium">关联批次</th>
                <th className="text-left px-5 py-3 font-medium">关联工位</th>
                <th className="text-left px-5 py-3 font-medium">操作人</th>
                <th className="text-left px-5 py-3 font-medium">备注</th>
                <th className="text-right px-5 py-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-800/60">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center text-ink-500">
                    暂无废液记录
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => (
                  <tr
                    key={record.id}
                    className="hover:bg-ink-800/30 transition-colors"
                  >
                    <td className="px-5 py-3 text-sm font-mono text-ink-300">
                      {formatDateTime(record.recoveryTime)}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={clsx(
                          "badge",
                          record.type === "developer_waste" && "text-green-300 bg-status-normal/15",
                          record.type === "fixer_waste" && "text-blue-300 bg-blue-900/20",
                          record.type === "bleach_waste" && "text-amber-300 bg-status-near/15",
                          record.type === "mixed" && "text-red-300 bg-status-expired/15",
                        )}
                      >
                        {WASTE_TYPE_LABELS[record.type]}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-right font-mono text-darkroom-200 font-medium">
                      {record.volume.toLocaleString()}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={clsx(
                          "badge",
                          record.recoveryMethod === "professional" &&
                            "text-green-300 bg-status-normal/15",
                          record.recoveryMethod === "neutralization" &&
                            "text-blue-300 bg-blue-900/20",
                          record.recoveryMethod === "storage" &&
                            "text-gray-300 bg-ink-700/30",
                        )}
                      >
                        {RECOVERY_METHOD_LABELS[record.recoveryMethod]}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-ink-300">
                      {getBatchName(record.batchId)}
                    </td>
                    <td className="px-5 py-3 text-sm text-ink-300">
                      {getStationName(record.stationId)}
                    </td>
                    <td className="px-5 py-3 text-sm text-ink-200">
                      {record.operator}
                    </td>
                    <td className="px-5 py-3 text-sm text-ink-400 max-w-[150px] truncate">
                      {record.notes || "-"}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end">
                        <button
                          className="danger-btn !p-1.5"
                          onClick={() => handleDelete(record.id)}
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
