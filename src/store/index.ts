import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  addDays,
  addHours,
  formatISO,
  setHours,
  setMinutes,
  startOfToday,
} from "date-fns";
import type {
  Booking,
  BookingStatus,
  ChemicalBatch,
  DispatchRecord,
  Station,
  StationStatus,
  StationType,
  WasteRecord,
} from "@/types";
import { computeChemicalStatus, nowISO, uid } from "@/utils";

function createMockStations(): Station[] {
  const base = [
    { code: "BW-01", name: "黑白工位 1号", type: "black_white", capacity: 8 },
    { code: "BW-02", name: "黑白工位 2号", type: "black_white", capacity: 6 },
    { code: "BW-03", name: "黑白工位 3号", type: "black_white", capacity: 10 },
    { code: "C-01", name: "彩色工位 1号", type: "color", capacity: 6 },
    { code: "C-02", name: "彩色工位 2号", type: "color", capacity: 4 },
    { code: "E-01", name: "放大机 A", type: "enlarger", capacity: 2 },
    { code: "E-02", name: "放大机 B", type: "enlarger", capacity: 2 },
    { code: "M-01", name: "综合工位", type: "mixed", capacity: 8 },
  ];
  const now = nowISO();
  return base.map((s, i) => ({
    id: uid(),
    ...s,
    type: s.type as StationType,
    status: (i === 4 ? "maintenance" : "idle") as StationStatus,
    description: "",
    createdAt: now,
    updatedAt: now,
  }));
}

function createMockBookings(stations: Station[]): Booking[] {
  const bookings: Booking[] = [];
  const photographers = ["李明", "王芳", "张伟", "陈晨", "赵磊"];
  const filmTypes = ["黑白135", "彩色135", "黑白120", "彩色120"];
  const statuses: BookingStatus[] = ["confirmed", "in_progress", "pending", "completed"];

  for (let i = 0; i < 12; i++) {
    const station = stations[i % stations.length];
    if (station.status === "maintenance") continue;

    const dayOffset = Math.floor(i / 4);
    const startHour = 9 + (i % 4) * 2;
    const start = setMinutes(
      setHours(addDays(startOfToday(), dayOffset), startHour),
      0,
    );
    const end = addHours(start, 2 + (i % 3));

    bookings.push({
      id: uid(),
      stationId: station.id,
      photographer: photographers[i % photographers.length],
      filmType: filmTypes[i % filmTypes.length],
      filmCount: 2 + (i % 5),
      startTime: formatISO(start),
      endTime: formatISO(end),
      status: statuses[i % statuses.length],
      notes: i % 3 === 0 ? "加急处理" : "",
      createdAt: nowISO(),
      updatedAt: nowISO(),
    });
  }
  return bookings;
}

function createMockChemicals(): ChemicalBatch[] {
  const chemicals: Array<Omit<ChemicalBatch, "id" | "createdAt" | "updatedAt">> = [
    {
      name: "D-76 显影液",
      type: "developer",
      totalVolume: 5000,
      remainingVolume: 3200,
      manufacturer: "柯达",
      spec: "浓缩液 1:1",
      productionDate: formatISO(addDays(new Date(), -20)),
      expiryDate: formatISO(addDays(new Date(), 40)),
      status: "normal",
      batchNo: "KD-D76-202405",
    },
    {
      name: "F-5 定影液",
      type: "fixer",
      totalVolume: 5000,
      remainingVolume: 180,
      manufacturer: "伊尔福",
      spec: "酸性坚膜定影",
      productionDate: formatISO(addDays(new Date(), -30)),
      expiryDate: formatISO(addDays(new Date(), 30)),
      status: "normal",
      batchNo: "IL-F5-202404",
    },
    {
      name: "C-41 彩色显影液",
      type: "developer",
      totalVolume: 3000,
      remainingVolume: 2500,
      manufacturer: "富士",
      spec: "彩显套装",
      productionDate: formatISO(addDays(new Date(), -10)),
      expiryDate: formatISO(addDays(new Date(), 5)),
      status: "near_expiry",
      batchNo: "FU-C41-202406",
    },
    {
      name: "停显液",
      type: "stop_bath",
      totalVolume: 2000,
      remainingVolume: 0,
      manufacturer: "柯达",
      spec: "醋酸停显",
      productionDate: formatISO(addDays(new Date(), -60)),
      expiryDate: formatISO(addDays(new Date(), -5)),
      status: "exhausted",
      batchNo: "KD-SB-202403",
    },
    {
      name: "漂白液",
      type: "bleach",
      totalVolume: 3000,
      remainingVolume: 2800,
      manufacturer: "富士",
      spec: "EDTA铁铵",
      productionDate: formatISO(addDays(new Date(), -5)),
      expiryDate: formatISO(addDays(new Date(), 55)),
      status: "normal",
      batchNo: "FU-BL-202406",
    },
    {
      name: "润湿剂",
      type: "wetting_agent",
      totalVolume: 1000,
      remainingVolume: 850,
      manufacturer: "柯达",
      spec: "Photo-Flo",
      productionDate: formatISO(addDays(new Date(), -40)),
      expiryDate: formatISO(addDays(new Date(), 140)),
      status: "normal",
      batchNo: "KD-WA-202404",
    },
  ];

  const now = nowISO();
  return chemicals.map((c) => ({
    ...c,
    id: uid(),
    createdAt: now,
    updatedAt: now,
    status: computeChemicalStatus({
      ...c,
      id: "",
      createdAt: now,
      updatedAt: now,
    }),
  }));
}

function createMockDispatches(
  batches: ChemicalBatch[],
  stations: Station[],
): DispatchRecord[] {
  const records: DispatchRecord[] = [];
  const operators = ["技师老王", "技师小李", "管理员"];
  const purposes = ["日常冲洗", "批量作业", "实验测试", "加急订单"];

  for (let i = 0; i < 10; i++) {
    const batch = batches[i % batches.length];
    if (batch.remainingVolume >= batch.totalVolume) continue;

    records.push({
      id: uid(),
      batchId: batch.id,
      stationId: stations[i % stations.length].id,
      volume: 200 + (i % 4) * 100,
      operator: operators[i % operators.length],
      dispatchTime: formatISO(addDays(new Date(), -i)),
      purpose: purposes[i % purposes.length],
      createdAt: nowISO(),
    });
  }
  return records;
}

function createMockWaste(
  batches: ChemicalBatch[],
  stations: Station[],
): WasteRecord[] {
  const records: WasteRecord[] = [];
  const operators = ["技师老王", "技师小李"];
  const types: WasteRecord["type"][] = [
    "developer_waste",
    "fixer_waste",
    "mixed",
  ];
  const methods: WasteRecord["recoveryMethod"][] = [
    "professional",
    "neutralization",
    "storage",
  ];

  for (let i = 0; i < 6; i++) {
    records.push({
      id: uid(),
      batchId: batches[i % batches.length].id,
      stationId: stations[i % stations.length].id,
      volume: 150 + (i % 3) * 100,
      type: types[i % types.length],
      recoveryMethod: methods[i % methods.length],
      operator: operators[i % operators.length],
      recoveryTime: formatISO(addDays(new Date(), -i * 2)),
      notes: i % 2 === 0 ? "交由专业回收公司处理" : "",
      createdAt: nowISO(),
    });
  }
  return records;
}

interface AppState {
  stations: Station[];
  bookings: Booking[];
  chemicalBatches: ChemicalBatch[];
  dispatchRecords: DispatchRecord[];
  wasteRecords: WasteRecord[];
  initialized: boolean;

  initMockData: () => void;

  addStation: (data: Omit<Station, "id" | "createdAt" | "updatedAt">) => void;
  updateStation: (id: string, data: Partial<Station>) => void;
  deleteStation: (id: string) => void;

  addBooking: (
    data: Omit<Booking, "id" | "createdAt" | "updatedAt">,
  ) => void;
  updateBooking: (id: string, data: Partial<Booking>) => void;
  deleteBooking: (id: string) => void;

  addChemicalBatch: (
    data: Omit<ChemicalBatch, "id" | "createdAt" | "updatedAt" | "status">,
  ) => void;
  updateChemicalBatch: (
    id: string,
    data: Partial<ChemicalBatch>,
  ) => void;
  deleteChemicalBatch: (id: string) => void;

  addDispatchRecord: (
    data: Omit<DispatchRecord, "id" | "createdAt">,
  ) => void;

  addWasteRecord: (
    data: Omit<WasteRecord, "id" | "createdAt">,
  ) => void;
  deleteWasteRecord: (id: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      stations: [],
      bookings: [],
      chemicalBatches: [],
      dispatchRecords: [],
      wasteRecords: [],
      initialized: false,

      initMockData: () => {
        if (get().initialized) return;
        const stations = createMockStations();
        const bookings = createMockBookings(stations);
        const chemicalBatches = createMockChemicals();
        const dispatchRecords = createMockDispatches(chemicalBatches, stations);
        const wasteRecords = createMockWaste(chemicalBatches, stations);
        set({
          stations,
          bookings,
          chemicalBatches,
          dispatchRecords,
          wasteRecords,
          initialized: true,
        });
      },

      addStation: (data) =>
        set((s) => ({
          stations: [
            ...s.stations,
            { ...data, id: uid(), createdAt: nowISO(), updatedAt: nowISO() },
          ],
        })),
      updateStation: (id, data) =>
        set((s) => ({
          stations: s.stations.map((st) =>
            st.id === id ? { ...st, ...data, updatedAt: nowISO() } : st,
          ),
        })),
      deleteStation: (id) =>
        set((s) => ({ stations: s.stations.filter((st) => st.id !== id) })),

      addBooking: (data) =>
        set((s) => ({
          bookings: [
            ...s.bookings,
            { ...data, id: uid(), createdAt: nowISO(), updatedAt: nowISO() },
          ],
        })),
      updateBooking: (id, data) =>
        set((s) => ({
          bookings: s.bookings.map((b) =>
            b.id === id ? { ...b, ...data, updatedAt: nowISO() } : b,
          ),
        })),
      deleteBooking: (id) =>
        set((s) => ({ bookings: s.bookings.filter((b) => b.id !== id) })),

      addChemicalBatch: (data) => {
        const now = nowISO();
        const batch = { ...data, id: uid(), createdAt: now, updatedAt: now, status: "normal" as const };
        set((s) => ({
          chemicalBatches: [
            ...s.chemicalBatches,
            { ...batch, status: computeChemicalStatus(batch) },
          ],
        }));
      },
      updateChemicalBatch: (id, data) =>
        set((s) => ({
          chemicalBatches: s.chemicalBatches.map((b) => {
            const updated = { ...b, ...data, updatedAt: nowISO() };
            return { ...updated, status: computeChemicalStatus(updated) };
          }),
        })),
      deleteChemicalBatch: (id) =>
        set((s) => ({
          chemicalBatches: s.chemicalBatches.filter((b) => b.id !== id),
        })),

      addDispatchRecord: (data) => {
        const now = nowISO();
        set((s) => {
          const record = { ...data, id: uid(), createdAt: now };
          const newRecords = [...s.dispatchRecords, record];
          const batch = s.chemicalBatches.find((b) => b.id === data.batchId);
          let newBatches = s.chemicalBatches;
          if (batch) {
            const remaining = Math.max(
              0,
              batch.remainingVolume - data.volume,
            );
            const updated = {
              ...batch,
              remainingVolume: remaining,
              updatedAt: now,
            };
            newBatches = s.chemicalBatches.map((b) =>
              b.id === batch.id
                ? { ...updated, status: computeChemicalStatus(updated) }
                : b,
            );
          }
          return { dispatchRecords: newRecords, chemicalBatches: newBatches };
        });
      },

      addWasteRecord: (data) =>
        set((s) => ({
          wasteRecords: [
            ...s.wasteRecords,
            { ...data, id: uid(), createdAt: nowISO() },
          ],
        })),
      deleteWasteRecord: (id) =>
        set((s) => ({ wasteRecords: s.wasteRecords.filter((w) => w.id !== id) })),
    }),
    {
      name: "darkroom-storage",
      partialize: (state) => ({
        stations: state.stations,
        bookings: state.bookings,
        chemicalBatches: state.chemicalBatches,
        dispatchRecords: state.dispatchRecords,
        wasteRecords: state.wasteRecords,
        initialized: state.initialized,
      }),
    },
  ),
);
