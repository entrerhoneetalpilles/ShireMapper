'use client';

import {
  MousePointer,
  Box,
  Route,
  Layers,
  Home,
  Crop,
  PanelBottom,
  CloudSun,
} from 'lucide-react';
import { useToolStore } from '@/app/store/toolStore';
import type { ToolType } from '@/app/types/map';

// ─────────────────────────────────────────────────────────────────────────────
// MobileToolbar
// ─────────────────────────────────────────────────────────────────────────────

interface MobileToolbarProps {
  onOpenAssets: () => void;
  onOpenLayers: () => void;
  onOpenAtmosphere: () => void;
  className?: string;
}

const TOOLS: Array<{ tool: ToolType; icon: React.ReactNode; label: string }> = [
  { tool: 'select',  icon: <MousePointer size={20} strokeWidth={1.75} />, label: 'Select' },
  { tool: 'object',  icon: <Box          size={20} strokeWidth={1.75} />, label: 'Object' },
  { tool: 'path',    icon: <Route        size={20} strokeWidth={1.75} />, label: 'Path' },
  { tool: 'plot',    icon: <Layers       size={20} strokeWidth={1.75} />, label: 'Zone' },
  { tool: 'room',    icon: <Home         size={20} strokeWidth={1.75} />, label: 'Room' },
  { tool: 'export',  icon: <Crop         size={20} strokeWidth={1.75} />, label: 'Export' },
];

/**
 * Horizontal bottom toolbar designed for mobile screens.
 * Replaces the vertical left sidebar when viewport < 768 px.
 *
 * Layout (two rows):
 *   Row 1 — 6 drawing tools (scrollable)
 *   Row 2 — Assets | Layers | Atmosphere quick-access buttons
 */
export default function MobileToolbar({
  onOpenAssets,
  onOpenLayers,
  onOpenAtmosphere,
  className,
}: MobileToolbarProps) {
  const activeTool = useToolStore((s) => s.activeTool);
  const setActiveTool = useToolStore((s) => s.setActiveTool);

  return (
    <nav
      className={['flex flex-col shrink-0 bg-[#16213E] border-t border-[#2a3a6a]', className].filter(Boolean).join(' ')}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Row 1: drawing tools */}
      <div className="flex items-center justify-around px-1 py-1">
        {TOOLS.map(({ tool, icon, label }) => (
          <button
            key={tool}
            aria-label={label}
            title={label}
            onClick={() => setActiveTool(tool)}
            className={[
              'flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-all min-w-[44px]',
              activeTool === tool
                ? 'bg-amber-900/40 text-amber-300 shadow-[0_0_8px_rgba(212,132,74,0.3)]'
                : 'text-gray-500 hover:text-gray-300 active:bg-[#1e2a4a]',
            ].join(' ')}
          >
            {icon}
            <span className="text-[9px] leading-none">{label}</span>
          </button>
        ))}
      </div>

      {/* Row 2: panel shortcuts */}
      <div className="flex items-center border-t border-[#2a3a6a]/50">
        <button
          onClick={onOpenAssets}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs text-gray-400 hover:text-amber-300 active:bg-amber-900/20 transition-colors"
        >
          <PanelBottom size={14} />
          Assets
        </button>

        <div className="w-px h-5 bg-[#2a3a6a]" />

        <button
          onClick={onOpenLayers}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs text-gray-400 hover:text-amber-300 active:bg-amber-900/20 transition-colors"
        >
          <Layers size={14} />
          Calques
        </button>

        <div className="w-px h-5 bg-[#2a3a6a]" />

        <button
          onClick={onOpenAtmosphere}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs text-gray-400 hover:text-amber-300 active:bg-amber-900/20 transition-colors"
        >
          <CloudSun size={14} />
          Atmosphère
        </button>
      </div>
    </nav>
  );
}
