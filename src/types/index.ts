export type StationType = "black_white" | "color" | "enlarger" | "mixed";
export type StationStatus = "idle" | "occupied" | "maintenance";

export interface Station {
  id: string;
  code: string;
  name: string;
  type: StationType;
  capacity: number;
  status: StationStatus;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled";

export interface Booking {
  id: string;
  stationId: string;
  photographer: string;
  filmType: string;
  filmCount: number;
  startTime: string;
  endTime: string;
  status: BookingStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type ChemicalType =
  | "developer"
  | "fixer"
  | "bleach"
  | "stop_bath"
  | "wetting_agent";
export type ChemicalStatus = "normal" | "near_expiry" | "expired" | "exhausted";

export interface ChemicalBatch {
  id: string;
  name: string;
  type: ChemicalType;
  totalVolume: number;
  remainingVolume: number;
  manufacturer: string;
  spec: string;
  productionDate: string;
  expiryDate: string;
  status: ChemicalStatus;
  batchNo: string;
  createdAt: string;
  updatedAt: string;
}

export interface DispatchRecord {
  id: string;
  batchId: string;
  stationId?: string;
  bookingId?: string;
  volume: number;
  operator: string;
  dispatchTime: string;
  purpose: string;
  createdAt: string;
}

export type WasteType =
  | "developer_waste"
  | "fixer_waste"
  | "bleach_waste"
  | "mixed";
export type RecoveryMethod = "professional" | "neutralization" | "storage";

export interface WasteRecord {
  id: string;
  batchId?: string;
  stationId?: string;
  bookingId?: string;
  volume: number;
  type: WasteType;
  recoveryMethod: RecoveryMethod;
  operator: string;
  recoveryTime: string;
  notes?: string;
  createdAt: string;
}

export interface StationCandidate {
  station: Station;
  score: number;
  fragmentScore: number;
  loadScore: number;
  gapBefore: number;
  gapAfter: number;
  hasAdjacentBooking: boolean;
  adjacentBooking?: {
    type: "before" | "after" | "both";
    timeDiff: number;
    photographer?: string;
  };
  weekLoadHours: number;
  reasons: string[];
}

export const STATION_TYPE_LABELS: Record<StationType, string> = {
  black_white: "黑白冲洗",
  color: "彩色冲洗",
  enlarger: "放大机",
  mixed: "综合工位",
};

export const STATION_STATUS_LABELS: Record<StationStatus, string> = {
  idle: "空闲",
  occupied: "占用中",
  maintenance: "维护中",
};

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  pending: "待确认",
  confirmed: "已确认",
  in_progress: "进行中",
  completed: "已完成",
  cancelled: "已取消",
};

export const CHEMICAL_TYPE_LABELS: Record<ChemicalType, string> = {
  developer: "显影液",
  fixer: "定影液",
  bleach: "漂白液",
  stop_bath: "停显液",
  wetting_agent: "润湿剂",
};

export const CHEMICAL_STATUS_LABELS: Record<ChemicalStatus, string> = {
  normal: "正常",
  near_expiry: "临期",
  expired: "已过期",
  exhausted: "已耗尽",
};

export const WASTE_TYPE_LABELS: Record<WasteType, string> = {
  developer_waste: "显影废液",
  fixer_waste: "定影废液",
  bleach_waste: "漂白废液",
  mixed: "混合废液",
};

export const RECOVERY_METHOD_LABELS: Record<RecoveryMethod, string> = {
  professional: "专业回收",
  neutralization: "中和处理",
  storage: "暂存待处理",
};
