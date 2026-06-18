## 1. 架构设计

```mermaid
flowchart TB
    subgraph "前端应用层"
        A["React SPA"]
        A1["工位排期模块"]
        A2["自动分配引擎"]
        A3["药水批次模块"]
        A4["拆分出库模块"]
    end
    subgraph "状态管理层"
        B["Zustand Store"]
        B1["工位状态"]
        B2["预约状态"]
        B3["药水批次状态"]
        B4["拆分记录状态"]
    end
    subgraph "数据持久层"
        C["LocalStorage"]
        C1["工位数据"]
        C2["预约数据"]
        C3["药水批次数据"]
        C4["拆分/废液记录"]
    end
    subgraph "UI组件层"
        D["组件库"]
        D1["甘特图排期"]
        D2["数据表格"]
        D3["图表可视化"]
        D4["表单组件"]
    end
    A --> A1 & A2 & A3 & A4
    A1 & A2 & A3 & A4 --> B
    B --> B1 & B2 & B3 & B4
    B --> C
    C --> C1 & C2 & C3 & C4
    A1 & A2 & A3 & A4 --> D
```

## 2. 技术描述

- **前端框架**：React@18 + TypeScript
- **构建工具**：Vite@5
- **样式方案**：TailwindCSS@3 + CSS Variables（主题系统）
- **状态管理**：Zustand@4（轻量级状态管理，支持持久化）
- **路由**：React Router DOM@6
- **图表可视化**：Recharts（折线图/柱状图/饼图）
- **日期处理**：date-fns
- **图标**：Lucide React（线性图标库）
- **数据持久化**：LocalStorage（纯前端，无后端）
- **后端**：无（纯前端应用，所有数据本地存储）
- **数据库**：LocalStorage + JSON序列化

## 3. 路由定义

| 路由 | 页面组件 | 用途 |
|------|----------|------|
| / | Dashboard | 数据概览仪表盘 |
| /stations | StationsPage | 工位排期看板 |
| /chemicals | ChemicalsPage | 药水批次管理 |
| /dispatch | DispatchPage | 拆分出库追踪 |
| /waste | WastePage | 废液回收记录 |

## 4. 数据模型

### 4.1 ER图

```mermaid
erDiagram
    STATION {
        string id PK "工位ID"
        string code "工位编号"
        string name "工位名称"
        string type "工位类型(黑白/彩色/放大)"
        number capacity "容量(卷/次)"
        string status "状态(空闲/占用/维护)"
        string description "备注"
    }
    
    BOOKING {
        string id PK "预约ID"
        string stationId FK "工位ID"
        string photographer "摄影师"
        string filmType "胶卷类型"
        number filmCount "胶卷数量"
        Date startTime "开始时间"
        Date endTime "结束时间"
        string status "状态(待确认/进行中/已完成)"
        string notes "备注"
    }
    
    CHEMICAL_BATCH {
        string id PK "批次ID"
        string name "药水名称"
        string type "类型(显影/定影/漂白/停显)"
        number totalVolume "总容量(ml)"
        number remainingVolume "剩余容量(ml)"
        string manufacturer "厂商"
        string spec "规格"
        Date productionDate "生产日期"
        Date expiryDate "有效期"
        string status "状态(正常/临期/过期/耗尽)"
        string batchNo "批次号"
    }
    
    DISPATCH_RECORD {
        string id PK "出库ID"
        string batchId FK "批次ID"
        string stationId FK "工位ID(可选)"
        string bookingId FK "预约ID(可选)"
        number volume "出库量(ml)"
        string operator "操作人"
        Date dispatchTime "出库时间"
        string purpose "用途说明"
    }
    
    WASTE_RECORD {
        string id PK "废液ID"
        string batchId FK "批次ID"
        string stationId FK "工位ID"
        number volume "废液量(ml)"
        string type "废液类型(显影废液/定影废液/混合)"
        string recoveryMethod "回收方式(专业回收/中和处理)"
        string operator "操作人"
        Date recoveryTime "回收时间"
        string notes "备注"
    }
    
    STATION ||--o{ BOOKING : "包含"
    CHEMICAL_BATCH ||--o{ DISPATCH_RECORD : "拆分"
    CHEMICAL_BATCH ||--o{ WASTE_RECORD : "产生"
    STATION ||--o{ WASTE_RECORD : "回收"
```

### 4.2 TypeScript 类型定义

```typescript
// 工位类型
export type StationType = 'black_white' | 'color' | 'enlarger' | 'mixed';
export type StationStatus = 'idle' | 'occupied' | 'maintenance';

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

// 预约类型
export type BookingStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';

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

// 药水类型
export type ChemicalType = 'developer' | 'fixer' | 'bleach' | 'stop_bath' | 'wetting_agent';
export type ChemicalStatus = 'normal' | 'near_expiry' | 'expired' | 'exhausted';

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

// 出库记录
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

// 废液类型
export type WasteType = 'developer_waste' | 'fixer_waste' | 'bleach_waste' | 'mixed';
export type RecoveryMethod = 'professional' | 'neutralization' | 'storage';

export interface WasteRecord {
  id: string;
  batchId?: string;
  stationId?: string;
  volume: number;
  type: WasteType;
  recoveryMethod: RecoveryMethod;
  operator: string;
  recoveryTime: string;
  notes?: string;
  createdAt: string;
}
```

## 5. 核心算法

### 5.1 工位自动分配算法

```typescript
// 分配策略：碎片最少优先 + 负载均衡
// 1. 筛选所有满足时间段且状态正常的工位
// 2. 对每个工位计算空闲碎片评分（连续空闲块越大、碎片越少评分越高）
// 3. 计算工位7日负载率（已预约时长/可用时长）
// 4. 综合评分 = 碎片评分 * 0.6 + (1 - 负载率) * 0.4
// 5. 返回综合评分最高的工位
```

### 5.2 药水剩余量计算

```typescript
// remainingVolume = totalVolume - SUM(dispatchRecords.volume where batchId = current)
// 当 remainingVolume <= 100ml 时标记为临耗尽
// 当 expiryDate - now <= 7天 标记为临期
```
