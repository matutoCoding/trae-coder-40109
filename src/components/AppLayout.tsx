import {
  LayoutDashboard,
  Printer as Darkroom,
  FlaskConical,
  PackageOpen,
  Recycle,
} from "lucide-react";
import type { ComponentType } from "react";
import { NavLink } from "react-router-dom";
import { clsx } from "clsx";

interface NavItem {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { to: "/", label: "数据概览", icon: LayoutDashboard },
  { to: "/stations", label: "工位排期", icon: Darkroom },
  { to: "/chemicals", label: "药水批次", icon: FlaskConical },
  { to: "/dispatch", label: "拆分出库", icon: PackageOpen },
  { to: "/waste", label: "废液回收", icon: Recycle },
];

function FilmDecor() {
  return (
    <div className="flex items-center gap-1.5">
      <div className="relative w-8 h-8 rounded bg-gradient-to-br from-darkroom-600 to-darkroom-800 flex items-center justify-center shadow-amber-glow">
        <div className="absolute inset-x-0 top-0 h-1 film-perforation" />
        <div className="absolute inset-x-0 bottom-0 h-1 film-perforation" />
        <span className="text-darkroom-100 font-serif text-sm font-bold">暗</span>
      </div>
      <div>
        <div className="font-serif text-ink-50 text-base leading-tight">
          暗房管理系统
        </div>
        <div className="text-[10px] text-ink-400 font-mono tracking-wider">
          DARKROOM STUDIO
        </div>
      </div>
    </div>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      <aside className="w-60 border-r border-ink-800 bg-ink-950/60 backdrop-blur-sm flex flex-col">
        <div className="p-5 border-b border-ink-800">
          <FilmDecor />
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  clsx(
                    "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all duration-200 group",
                    isActive
                      ? "bg-darkroom-700/50 text-ink-50 border border-darkroom-500/40 shadow-amber-glow"
                      : "text-ink-300 hover:bg-ink-800/60 hover:text-ink-50 border border-transparent",
                  )
                }
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="font-medium">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
        <div className="p-4 border-t border-ink-800">
          <div className="dark-card p-3">
            <div className="text-xs text-ink-400 mb-1">在线技师</div>
            <div className="flex items-center gap-2">
              <span className="status-dot bg-status-idle animate-pulse" />
              <span className="text-sm text-ink-100">技师老王 · 值班中</span>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-ink-800 bg-ink-950/40 backdrop-blur-sm px-8 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-serif text-ink-50">摄影工作室暗房管理</h1>
            <p className="text-xs text-ink-400 font-mono">
              Darkroom Processing Workstation Management
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-xs text-ink-400">当前时间</div>
              <div className="text-sm text-ink-100 font-mono">
                {new Date().toLocaleString("zh-CN", {
                  hour12: false,
                })}
              </div>
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-8">{children}</div>
      </main>
    </div>
  );
}
