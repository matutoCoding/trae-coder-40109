import { useState, useMemo } from "react";
import {
  FlaskConical,
  Plus,
  Eye,
  Trash2,
  X,
  PackagePlus,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Droplets,
  TrendingDown,
  Beaker,
  History,
  Recycle,
  BarChart3,
  ArrowRight,
  GitBranch,
  MapPin,
  User,
  FileText,
  PackageOpen,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import { clsx } from "clsx";
import {
  CHEMICAL_STATUS_LABELS,
  CHEMICAL_TYPE_LABELS,
  WASTE_TYPE_LABELS,
  RECOVERY_METHOD_LABELS,
  type ChemicalBatch,
  type ChemicalType,
  type DispatchRecord,
  type WasteRecord,
  type Booking,
  type Station,
} from "@/types";
import { useAppStore } from "@/store";
import { formatDate, formatTime, formatDateTime, getStatusBadgeClass } from "@/utils";

function getProgressColorClass(status: ChemicalBatch["status"]): string {
  const map: Record<string, string> = {
    normal: "bg-status-normal",
    near_expiry: "bg-status-near",
    expired: "bg-status-expired",
    exhausted: "bg-status-exhausted",
  };
  return map[status] || "bg-ink-600";
}

function getTypeColorClass(type: ChemicalType): string {
  const map: Record<ChemicalType, string> = {
    developer: "text-green-300 bg-status-normal/15",
    fixer: "text-blue-300 bg-blue-900/20",
    bleach: "text-yellow-300 bg-yellow-900/20",
    stop_bath: "text-purple-300 bg-purple-900/20",
    wetting_agent: "text-cyan-300 bg-cyan-900/20",
  };
  return map[type];
}

interface BatchFormData {
  name: string;
  type: ChemicalType;
  totalVolume: string;
  manufacturer: string;
  spec: string;
  productionDate: string;
  expiryDate: string;
  batchNo: string;
}

const defaultFormData: BatchFormData = {
  name: "",
  type: "developer",
  totalVolume: "",
  manufacturer: "",
  spec: "",
  productionDate: "",
  expiryDate: "",
  batchNo: "",
};

interface FlowNode {
  id: string;
  type: "inbound" | "dispatch" | "waste";
  title: string;
  subtitle: string;
  volume: number;
  volumePrefix?: "+" | "-";
  timestamp: string;
  details: Array<{ icon: typeof User; label: string; value: string }>;
  linkedBooking?: Booking;
  linkedStation?: Station;
}

function FlowTimeline({
  batch,
  dispatches,
  wastes,
  stations,
  bookings,
}: {
  batch: ChemicalBatch;
  dispatches: DispatchRecord[];
  wastes: WasteRecord[];
  stations: Station[];
  bookings: Booking[];
}) {
  const nodes = useMemo<FlowNode[]>(() => {
    const result: FlowNode[] = [];

    result.push({
      id: "inbound",
      type: "inbound",
      title: "批次入库",
      subtitle: `${batch.manufacturer} · ${batch.spec || "标准规格"}`,
      volume: batch.totalVolume,
      volumePrefix: "+",
      timestamp: batch.createdAt,
      details: [
        { icon: PackagePlus, label: "批次号", value: batch.batchNo },
        { icon: Clock, label: "生产日期", value: formatDate(batch.productionDate) },
        { icon: AlertTriangle, label: "有效期至", value: formatDate(batch.expiryDate) },
      ],
    });

    const sortedDispatches = [...dispatches].sort(
      (a, b) => new Date(a.dispatchTime).getTime() - new Date(b.dispatchTime).getTime(),
    );

    const sortedWastes = [...wastes].sort(
      (a, b) => new Date(a.recoveryTime).getTime() - new Date(b.recoveryTime).getTime(),
    );

    const allEvents: Array<
      | { kind: "dispatch"; data: DispatchRecord; time: number }
      | { kind: "waste"; data: WasteRecord; time: number }
    > = [
      ...sortedDispatches.map((d) => ({
        kind: "dispatch" as const,
        data: d,
        time: new Date(d.dispatchTime).getTime(),
      })),
      ...sortedWastes.map((w) => ({
        kind: "waste" as const,
        data: w,
        time: new Date(w.recoveryTime).getTime(),
      })),
    ].sort((a, b) => a.time - b.time);

    for (const event of allEvents) {
      if (event.kind === "dispatch") {
        const d = event.data;
        const station = stations.find((s) => s.id === d.stationId);
        const booking = d.bookingId
          ? bookings.find((b) => b.id === d.bookingId)
          : undefined;

        result.push({
          id: d.id,
          type: "dispatch",
          title: "拆分出库",
          subtitle: d.purpose,
          volume: d.volume,
          volumePrefix: "-",
          timestamp: d.dispatchTime,
          details: [
            { icon: User, label: "操作人", value: d.operator },
            ...(station
              ? [{ icon: MapPin, label: "使用工位", value: station.name }]
              : []),
            ...(booking
              ? [{ icon: FileText, label: "关联订单", value: `${booking.photographer} · ${booking.filmType}` }]
              : []),
          ],
          linkedBooking: booking,
          linkedStation: station,
        });
      } else {
        const w = event.data;
        const station = stations.find((s) => s.id === w.stationId);

        result.push({
          id: w.id,
          type: "waste",
          title: "废液回收",
          subtitle: WASTE_TYPE_LABELS[w.type],
          volume: w.volume,
          volumePrefix: "-",
          timestamp: w.recoveryTime,
          details: [
            { icon: User, label: "操作人", value: w.operator },
            { icon: Recycle, label: "回收方式", value: RECOVERY_METHOD_LABELS[w.recoveryMethod] },
            ...(station
              ? [{ icon: MapPin, label: "来源工位", value: station.name }]
              : []),
            ...(w.notes
              ? [{ icon: FileText, label: "备注", value: w.notes }]
              : []),
          ],
          linkedStation: station,
        });
      }
    }

    return result;
  }, [batch, dispatches, wastes, stations, bookings]);

  const totalDispatched = dispatches.reduce((sum, d) => sum + d.volume, 0);
  const totalWasted = wastes.reduce((sum, w) => sum + w.volume, 0);

  return (
    <div className="dark-card p-5">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-darkroom-400" />
          <h4 className="font-serif text-ink-50">完整流向链路</h4>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="text-ink-400">
            已出库：<span className="text-darkroom-200 font-mono">{totalDispatched.toLocaleString()}ml</span>
          </span>
          <span className="text-ink-400">
            已回收：<span className="text-red-300 font-mono">{totalWasted.toLocaleString()}ml</span>
          </span>
          <span className="text-ink-400">
            当前剩余：<span className="text-green-300 font-mono">{batch.remainingVolume.toLocaleString()}ml</span>
          </span>
        </div>
      </div>

      <div className="relative">
        <div className="absolute left-[22px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-darkroom-600 via-darkroom-800 to-status-maintenance/50" />

        <div className="space-y-4">
          {nodes.map((node, idx) => (
            <div key={node.id} className="relative pl-14">
              <div
                className={clsx(
                  "absolute left-0 w-11 h-11 rounded-full flex items-center justify-center border-2 border-ink-900 shadow-lg z-10",
                  node.type === "inbound" && "bg-status-normal/90",
                  node.type === "dispatch" && "bg-darkroom-600",
                  node.type === "waste" && "bg-status-maintenance/90",
                )}
              >
                {node.type === "inbound" && (
                  <PackageOpen className="w-5 h-5 text-ink-50" />
                )}
                {node.type === "dispatch" && (
                  <Droplets className="w-5 h-5 text-ink-50" />
                )}
                {node.type === "waste" && (
                  <Recycle className="w-5 h-5 text-ink-50" />
                )}
              </div>

              {idx < nodes.length - 1 && (
                <div className="absolute left-5 top-11 text-darkroom-600">
                  <ArrowRight className="w-3 h-3 rotate-90" />
                </div>
              )}

              <div
                className={clsx(
                  "dark-card p-4",
                  node.type === "inbound" && "border-l-2 border-l-status-normal",
                  node.type === "dispatch" && "border-l-2 border-l-darkroom-500",
                  node.type === "waste" && "border-l-2 border-l-status-maintenance",
                )}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h5 className="font-serif text-ink-50 text-base">{node.title}</h5>
                      <span
                        className={clsx(
                          "badge text-[10px]",
                          node.type === "inbound" && "bg-status-normal/15 text-green-300",
                          node.type === "dispatch" && "bg-darkroom-500/20 text-darkroom-200",
                          node.type === "waste" && "bg-status-maintenance/15 text-red-300",
                        )}
                      >
                        {node.volumePrefix}
                        {node.volume.toLocaleString()}ml
                      </span>
                    </div>
                    <p className="text-sm text-ink-400 mt-0.5">{node.subtitle}</p>
                  </div>
                  <span className="text-xs text-ink-500 font-mono">
                    {formatDateTime(node.timestamp)}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-3 pt-3 border-t border-ink-800/60">
                  {node.details.map((detail, i) => {
                    const Icon = detail.icon;
                    return (
                      <div
                        key={i}
                        className="flex items-center gap-2 text-xs bg-ink-950/40 rounded-md px-2.5 py-1.5"
                      >
                        <Icon className="w-3.5 h-3.5 text-darkroom-400 flex-shrink-0" />
                        <span className="text-ink-400 flex-shrink-0">{detail.label}：</span>
                        <span className="text-ink-200 truncate">{detail.value}</span>
                      </div>
                    );
                  })}
                </div>

                {node.type === "dispatch" && (node.linkedBooking || node.linkedStation) && (
                  <div className="mt-3 pt-3 border-t border-ink-800/30">
                    <div className="flex items-center gap-4 text-xs">
                      {node.linkedStation && (
                        <div className="flex items-center gap-1.5 text-ink-400">
                          <MapPin className="w-3.5 h-3.5 text-status-normal" />
                          <span>
                            工位：<span className="text-ink-200">{node.linkedStation.name}</span>
                          </span>
                        </div>
                      )}
                      {node.linkedBooking && (
                        <div className="flex items-center gap-1.5 text-ink-400">
                          <FileText className="w-3.5 h-3.5 text-darkroom-400" />
                          <span>
                            预约：<span className="text-ink-200">{node.linkedBooking.photographer}</span>
                            <span className="text-ink-500 mx-1">·</span>
                            <span className="text-ink-300">
                              {formatTime(node.linkedBooking.startTime)}-
                              {formatTime(node.linkedBooking.endTime)}
                            </span>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ChemicalsPage() {
  const {
    chemicalBatches,
    dispatchRecords,
    wasteRecords,
    stations,
    bookings,
    addChemicalBatch,
    deleteChemicalBatch,
  } = useAppStore();

  const [showAddModal, setShowAddModal] = useState(false);
  const [detailBatch, setDetailBatch] = useState<ChemicalBatch | null>(null);
  const [formData, setFormData] = useState<BatchFormData>(defaultFormData);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof BatchFormData, string>>>({});

  const stats = useMemo(() => {
    const total = chemicalBatches.length;
    const normal = chemicalBatches.filter((b) => b.status === "normal").length;
    const nearExpiry = chemicalBatches.filter((b) => b.status === "near_expiry").length;
    const exhausted = chemicalBatches.filter((b) => b.status === "exhausted").length;
    const totalStock = chemicalBatches.reduce((sum, b) => sum + b.remainingVolume, 0);

    const typeDistribution: Array<{ name: string; value: number; color: string }> = [];
    const typeMap: Record<ChemicalType, number> = {
      developer: 0,
      fixer: 0,
      bleach: 0,
      stop_bath: 0,
      wetting_agent: 0,
    };
    chemicalBatches.forEach((b) => {
      typeMap[b.type] += b.remainingVolume;
    });
    Object.entries(typeMap).forEach(([type, value]) => {
      if (value > 0) {
        typeDistribution.push({
          name: CHEMICAL_TYPE_LABELS[type as ChemicalType],
          value,
          color: "#b8860b",
        });
      }
    });

    return { total, normal, nearExpiry, exhausted, totalStock, typeDistribution };
  }, [chemicalBatches]);

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof BatchFormData, string>> = {};
    if (!formData.name.trim()) errors.name = "请输入药水名称";
    if (!formData.totalVolume || Number(formData.totalVolume) <= 0)
      errors.totalVolume = "请输入有效的总量";
    if (!formData.manufacturer.trim()) errors.manufacturer = "请输入厂商";
    if (!formData.productionDate) errors.productionDate = "请选择生产日期";
    if (!formData.expiryDate) errors.expiryDate = "请选择有效期";
    if (formData.productionDate && formData.expiryDate && formData.productionDate >= formData.expiryDate)
      errors.expiryDate = "有效期必须晚于生产日期";
    if (!formData.batchNo.trim()) errors.batchNo = "请输入批次号";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;
    const batch = {
      name: formData.name.trim(),
      type: formData.type,
      totalVolume: Number(formData.totalVolume),
      remainingVolume: Number(formData.totalVolume),
      manufacturer: formData.manufacturer.trim(),
      spec: formData.spec.trim(),
      productionDate: new Date(formData.productionDate).toISOString(),
      expiryDate: new Date(formData.expiryDate).toISOString(),
      batchNo: formData.batchNo.trim(),
    };
    addChemicalBatch(batch);
    setFormData(defaultFormData);
    setFormErrors({});
    setShowAddModal(false);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("确定要删除该批次吗？")) {
      deleteChemicalBatch(id);
      if (detailBatch?.id === id) setDetailBatch(null);
    }
  };

  const batchDispatches = useMemo(() => {
    if (!detailBatch) return [];
    return dispatchRecords.filter((d) => d.batchId === detailBatch.id);
  }, [detailBatch, dispatchRecords]);

  const batchWastes = useMemo(() => {
    if (!detailBatch) return [];
    return wasteRecords.filter((w) => w.batchId === detailBatch.id);
  }, [detailBatch, wasteRecords]);

  const trendData = useMemo(() => {
    if (!detailBatch) return [];
    const data: Array<{ date: string; volume: number }> = [];
    data.push({
      date: formatDate(detailBatch.createdAt),
      volume: detailBatch.totalVolume,
    });
    const sorted = [...batchDispatches].sort(
      (a, b) => new Date(a.dispatchTime).getTime() - new Date(b.dispatchTime).getTime(),
    );
    let remaining = detailBatch.totalVolume;
    sorted.forEach((d) => {
      remaining = Math.max(0, remaining - d.volume);
      data.push({
        date: formatDate(d.dispatchTime),
        volume: remaining,
      });
    });
    if (data.length === 1 || data[data.length - 1].volume !== detailBatch.remainingVolume) {
      data.push({
        date: formatDate(new Date().toISOString()),
        volume: detailBatch.remainingVolume,
      });
    }
    return data;
  }, [detailBatch, batchDispatches]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-darkroom-700/50 flex items-center justify-center border border-darkroom-500/40">
            <FlaskConical className="w-5 h-5 text-darkroom-200" />
          </div>
          <div>
            <h2 className="text-xl font-serif text-ink-50">药水批次管理</h2>
            <p className="text-sm text-ink-400">管理冲洗药水的入库、出库与库存状态</p>
          </div>
        </div>
        <button className="amber-btn flex items-center gap-2" onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4" />
          <span>新批次入库</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="dark-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-ink-400">总批次数</span>
            <Beaker className="w-4 h-4 text-ink-500" />
          </div>
          <div className="text-2xl font-serif text-ink-50">{stats.total}</div>
        </div>
        <div className="dark-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-ink-400">正常批次</span>
            <CheckCircle2 className="w-4 h-4 text-status-normal" />
          </div>
          <div className="text-2xl font-serif text-green-300">{stats.normal}</div>
        </div>
        <div className="dark-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-ink-400">临期批次</span>
            <AlertTriangle className="w-4 h-4 text-status-near" />
          </div>
          <div className="text-2xl font-serif text-amber-300">{stats.nearExpiry}</div>
        </div>
        <div className="dark-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-ink-400">已耗尽</span>
            <Clock className="w-4 h-4 text-status-exhausted" />
          </div>
          <div className="text-2xl font-serif text-gray-300">{stats.exhausted}</div>
        </div>
        <div className="dark-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-ink-400">总库存量</span>
            <Droplets className="w-4 h-4 text-darkroom-300" />
          </div>
          <div className="text-2xl font-serif text-darkroom-200">
            {stats.totalStock.toLocaleString()}
            <span className="text-sm font-normal ml-1 text-ink-400">ml</span>
          </div>
        </div>
      </div>

      <div className="dark-card p-4">
        <div className="section-title">
          <BarChart3 className="w-5 h-5 text-darkroom-300" />
          各类型库存分布
        </div>
        <div className="h-48">
          {stats.typeDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.typeDistribution} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#2d2408" horizontal={false} />
                <XAxis type="number" stroke="#9e825a" fontSize={12} />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="#9e825a"
                  fontSize={12}
                  width={70}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1a1a1a",
                    border: "1px solid #6e3f0a",
                    borderRadius: "6px",
                    color: "#e8e0d0",
                  }}
                  formatter={(value: number) => [`${value.toLocaleString()} ml`, "剩余量"]}
                />
                <Bar dataKey="value" fill="#b8860b" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-ink-500 text-sm">
              暂无库存数据
            </div>
          )}
        </div>
      </div>

      <div className="dark-card">
        <div className="section-title px-5 pt-4">
          <History className="w-5 h-5 text-darkroom-300" />
          批次列表
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-ink-800 text-xs text-ink-400 uppercase tracking-wider">
                <th className="text-left px-5 py-3 font-medium">批次号</th>
                <th className="text-left px-5 py-3 font-medium">药水名称</th>
                <th className="text-left px-5 py-3 font-medium">类型</th>
                <th className="text-right px-5 py-3 font-medium">总量(ml)</th>
                <th className="text-right px-5 py-3 font-medium">剩余量(ml)</th>
                <th className="text-left px-5 py-3 font-medium w-40">进度</th>
                <th className="text-left px-5 py-3 font-medium">状态</th>
                <th className="text-left px-5 py-3 font-medium">生产日期</th>
                <th className="text-left px-5 py-3 font-medium">有效期</th>
                <th className="text-right px-5 py-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-800/60">
              {chemicalBatches.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-5 py-12 text-center text-ink-500">
                    暂无批次数据，点击「新批次入库」添加
                  </td>
                </tr>
              ) : (
                chemicalBatches.map((batch) => {
                  const progress = batch.totalVolume > 0
                    ? Math.round((batch.remainingVolume / batch.totalVolume) * 100)
                    : 0;
                  return (
                    <tr
                      key={batch.id}
                      className="hover:bg-ink-800/30 transition-colors"
                    >
                      <td className="px-5 py-3 text-sm font-mono text-ink-200">
                        {batch.batchNo}
                      </td>
                      <td className="px-5 py-3 text-sm text-ink-100 font-medium">
                        {batch.name}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={clsx(
                            "badge",
                            getTypeColorClass(batch.type),
                          )}
                        >
                          {CHEMICAL_TYPE_LABELS[batch.type]}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm text-right text-ink-200 font-mono">
                        {batch.totalVolume.toLocaleString()}
                      </td>
                      <td className="px-5 py-3 text-sm text-right text-ink-100 font-mono font-medium">
                        {batch.remainingVolume.toLocaleString()}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="progress-bar flex-1">
                            <div
                              className={clsx(
                                "h-full rounded-full transition-all",
                                getProgressColorClass(batch.status),
                              )}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-ink-400 font-mono w-10 text-right">
                            {progress}%
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className={getStatusBadgeClass(batch.status)}>
                          <span
                            className={clsx(
                              "status-dot",
                              getProgressColorClass(batch.status),
                            )}
                          />
                          {CHEMICAL_STATUS_LABELS[batch.status]}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm text-ink-300">
                        {formatDate(batch.productionDate)}
                      </td>
                      <td className="px-5 py-3 text-sm text-ink-300">
                        {formatDate(batch.expiryDate)}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            className="ghost-btn !p-1.5"
                            onClick={() => setDetailBatch(batch)}
                            title="查看详情"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            className="danger-btn !p-1.5"
                            onClick={() => handleDelete(batch.id)}
                            title="删除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/80 backdrop-blur-sm">
          <div className="dark-card w-full max-w-lg mx-4 max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-ink-800">
              <div className="flex items-center gap-2">
                <PackagePlus className="w-5 h-5 text-darkroom-300" />
                <h3 className="text-lg font-serif text-ink-50">新批次入库</h3>
              </div>
              <button
                className="ghost-btn !p-1.5"
                onClick={() => {
                  setShowAddModal(false);
                  setFormData(defaultFormData);
                  setFormErrors({});
                }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-text">药水名称</label>
                  <input
                    type="text"
                    className={clsx("input-field", formErrors.name && "border-status-expired")}
                    placeholder="如 D-76 显影液"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                  {formErrors.name && (
                    <p className="text-xs text-status-expired mt-1">{formErrors.name}</p>
                  )}
                </div>
                <div>
                  <label className="label-text">类型</label>
                  <select
                    className="input-field"
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value as ChemicalType })
                    }
                  >
                    {Object.entries(CHEMICAL_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-text">总量 (ml)</label>
                  <input
                    type="number"
                    className={clsx(
                      "input-field",
                      formErrors.totalVolume && "border-status-expired",
                    )}
                    placeholder="如 5000"
                    min={1}
                    value={formData.totalVolume}
                    onChange={(e) => setFormData({ ...formData, totalVolume: e.target.value })}
                  />
                  {formErrors.totalVolume && (
                    <p className="text-xs text-status-expired mt-1">
                      {formErrors.totalVolume}
                    </p>
                  )}
                </div>
                <div>
                  <label className="label-text">批次号</label>
                  <input
                    type="text"
                    className={clsx("input-field", formErrors.batchNo && "border-status-expired")}
                    placeholder="如 KD-D76-202405"
                    value={formData.batchNo}
                    onChange={(e) => setFormData({ ...formData, batchNo: e.target.value })}
                  />
                  {formErrors.batchNo && (
                    <p className="text-xs text-status-expired mt-1">{formErrors.batchNo}</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-text">厂商</label>
                  <input
                    type="text"
                    className={clsx(
                      "input-field",
                      formErrors.manufacturer && "border-status-expired",
                    )}
                    placeholder="如 柯达"
                    value={formData.manufacturer}
                    onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                  />
                  {formErrors.manufacturer && (
                    <p className="text-xs text-status-expired mt-1">
                      {formErrors.manufacturer}
                    </p>
                  )}
                </div>
                <div>
                  <label className="label-text">规格</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="如 浓缩液 1:1"
                    value={formData.spec}
                    onChange={(e) => setFormData({ ...formData, spec: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-text">生产日期</label>
                  <input
                    type="date"
                    className={clsx(
                      "input-field",
                      formErrors.productionDate && "border-status-expired",
                    )}
                    value={formData.productionDate}
                    onChange={(e) =>
                      setFormData({ ...formData, productionDate: e.target.value })
                    }
                  />
                  {formErrors.productionDate && (
                    <p className="text-xs text-status-expired mt-1">
                      {formErrors.productionDate}
                    </p>
                  )}
                </div>
                <div>
                  <label className="label-text">有效期</label>
                  <input
                    type="date"
                    className={clsx(
                      "input-field",
                      formErrors.expiryDate && "border-status-expired",
                    )}
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                  />
                  {formErrors.expiryDate && (
                    <p className="text-xs text-status-expired mt-1">{formErrors.expiryDate}</p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-5 py-4 border-t border-ink-800">
              <button
                className="ghost-btn"
                onClick={() => {
                  setShowAddModal(false);
                  setFormData(defaultFormData);
                  setFormErrors({});
                }}
              >
                取消
              </button>
              <button className="amber-btn" onClick={handleSubmit}>
                确认入库
              </button>
            </div>
          </div>
        </div>
      )}

      {detailBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/80 backdrop-blur-sm overflow-y-auto py-8">
          <div className="dark-card w-full max-w-4xl mx-4 my-auto max-h-[calc(100vh-4rem)] overflow-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-ink-800 sticky top-0 bg-ink-900/95 backdrop-blur-sm z-10">
              <div className="flex items-center gap-3">
                <div
                  className={clsx(
                    "w-10 h-10 rounded-lg flex items-center justify-center",
                    getTypeColorClass(detailBatch.type),
                  )}
                >
                  <Beaker className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-serif text-ink-50">{detailBatch.name}</h3>
                  <p className="text-xs text-ink-400 font-mono">{detailBatch.batchNo}</p>
                </div>
              </div>
              <button
                className="ghost-btn !p-1.5"
                onClick={() => setDetailBatch(null)}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="dark-card p-3">
                  <div className="text-xs text-ink-400 mb-1">类型</div>
                  <div className="text-sm text-ink-100">
                    {CHEMICAL_TYPE_LABELS[detailBatch.type]}
                  </div>
                </div>
                <div className="dark-card p-3">
                  <div className="text-xs text-ink-400 mb-1">状态</div>
                  <div>
                    <span className={getStatusBadgeClass(detailBatch.status)}>
                      <span
                        className={clsx(
                          "status-dot",
                          getProgressColorClass(detailBatch.status),
                        )}
                      />
                      {CHEMICAL_STATUS_LABELS[detailBatch.status]}
                    </span>
                  </div>
                </div>
                <div className="dark-card p-3">
                  <div className="text-xs text-ink-400 mb-1">厂商</div>
                  <div className="text-sm text-ink-100">{detailBatch.manufacturer}</div>
                </div>
                <div className="dark-card p-3">
                  <div className="text-xs text-ink-400 mb-1">规格</div>
                  <div className="text-sm text-ink-100">
                    {detailBatch.spec || "-"}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="dark-card p-3">
                  <div className="text-xs text-ink-400 mb-1">总量</div>
                  <div className="text-sm text-ink-100 font-mono">
                    {detailBatch.totalVolume.toLocaleString()} ml
                  </div>
                </div>
                <div className="dark-card p-3">
                  <div className="text-xs text-ink-400 mb-1">剩余量</div>
                  <div className="text-sm text-ink-100 font-mono font-medium">
                    {detailBatch.remainingVolume.toLocaleString()} ml
                  </div>
                </div>
                <div className="dark-card p-3">
                  <div className="text-xs text-ink-400 mb-1">生产日期</div>
                  <div className="text-sm text-ink-100">
                    {formatDate(detailBatch.productionDate)}
                  </div>
                </div>
                <div className="dark-card p-3">
                  <div className="text-xs text-ink-400 mb-1">有效期</div>
                  <div className="text-sm text-ink-100">
                    {formatDate(detailBatch.expiryDate)}
                  </div>
                </div>
              </div>

              <div className="dark-card p-4">
                <div className="section-title !mb-3">
                  <TrendingDown className="w-4 h-4 text-darkroom-300" />
                  剩余量趋势
                </div>
                <div className="h-40">
                  {trendData.length > 1 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2d2408" />
                        <XAxis
                          dataKey="date"
                          stroke="#9e825a"
                          fontSize={11}
                          tickLine={false}
                        />
                        <YAxis
                          stroke="#9e825a"
                          fontSize={11}
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
                          formatter={(value: number) => [
                            `${value.toLocaleString()} ml`,
                            "剩余量",
                          ]}
                        />
                        <Line
                          type="monotone"
                          dataKey="volume"
                          stroke="#b8860b"
                          strokeWidth={2}
                          dot={{ fill: "#b8860b", strokeWidth: 2, r: 3 }}
                          activeDot={{ r: 5 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-ink-500 text-sm">
                      暂无出库记录
                    </div>
                  )}
                </div>
              </div>

              <FlowTimeline
                batch={detailBatch}
                dispatches={batchDispatches}
                wastes={batchWastes}
                stations={stations}
                bookings={bookings}
              />
            </div>

            <div className="flex justify-end gap-3 px-5 py-4 border-t border-ink-800 sticky bottom-0 bg-ink-900/95 backdrop-blur-sm">
              <button
                className="danger-btn flex items-center gap-2"
                onClick={() => handleDelete(detailBatch.id)}
              >
                <Trash2 className="w-4 h-4" />
                删除批次
              </button>
              <button className="ghost-btn" onClick={() => setDetailBatch(null)}>
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
