'use client';

import {
  MousePointer,
  Box,
  Route,
  Layers,
  Home,
  Crop,
  Grid3X3,
  Sun,
  CloudSun,
} from 'lucide-react';
import { useToolStore } from '@/app/store/toolStore';
import { useAtmosphereStore } from '@/app/store/atmosphereStore';
import type { ToolType } from '@/app/types/map';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ToolButtonProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  title: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function ToolButton({ icon, label, active, onClick, title }: ToolButtonProps) {
  return (
    <button
      title={title}
      aria-label={label}
      onClick={onClick}
      className={[
        'flex items-center justify-center w-11 h-11 rounded transition-all duration-150',
        active
          ? 'bg-amber-900/30 border border-amber-500 text-amber-300 shadow-[0_0_8px_rgba(212,132,74,0.35)]'
          : 'bg-[#16213E] hover:bg-[#1e2a4a] border border-transparent text-gray-400 hover:text-gray-200',
      ].join(' ')}
    >
      {icon}
    </button>
  );
}

function Divider() {
  return <div className="w-8 h-px bg-[#2a3a6a] my-1" />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export default function Toolbar() {
  const activeTool = useToolStore((s) => s.activeTool);
  const setActiveTool = useToolStore((s) => s.setActiveTool);
  const gridVisible = useToolStore((s) => s.gridVisible);
  const toggleGrid = useToolStore((s) => s.toggleGrid);

  const lightingEnabled = useAtmosphereStore((s) => s.lightingEnabled);
  const updateAtmosphere = useAtmosphereStore((s) => s.updateAtmosphere);

  const iconProps = { size: 18, strokeWidth: 1.75 };

  const mainTools: Array<{
    tool: ToolType;
    icon: React.ReactNode;
    label: string;
    shortcut: string;
  }> = [
    {
      tool: 'select',
      icon: <MousePointer {...iconProps} />,
      label: 'Select',
      shortcut: 'F5',
    },
    {
      tool: 'object',
      icon: <Box {...iconProps} />,
      label: 'Object',
      shortcut: 'F1',
    },
    {
      tool: 'path',
      icon: <Route {...iconProps} />,
      label: 'Path',
      shortcut: 'F2',
    },
    {
      tool: 'plot',
      icon: <Layers {...iconProps} />,
      label: 'Plot / Zone',
      shortcut: 'F3',
    },
    {
      tool: 'room',
      icon: <Home {...iconProps} />,
      label: 'Room',
      shortcut: 'F4',
    },
    {
      tool: 'export',
      icon: <Crop {...iconProps} />,
      label: 'Export Area',
      shortcut: 'F6',
    },
  ];

  return (
    <aside className="flex flex-col items-center gap-1 py-3 px-1.5 bg-[#16213E] border-r border-[#2a3a6a] h-full">
      {/* Main tools */}
      {mainTools.map(({ tool, icon, label, shortcut }) => (
        <ToolButton
          key={tool}
          icon={icon}
          label={label}
          active={activeTool === tool}
          onClick={() => setActiveTool(tool)}
          title={`${label} (${shortcut})`}
        />
      ))}

      <Divider />

      {/* Grid toggle */}
      <ToolButton
        icon={<Grid3X3 {...iconProps} />}
        label="Toggle Grid"
        active={gridVisible}
        onClick={toggleGrid}
        title="Toggle Grid (Ctrl+G)"
      />

      {/* Lighting toggle */}
      <ToolButton
        icon={<Sun {...iconProps} />}
        label="Toggle Lighting"
        active={lightingEnabled}
        onClick={() => updateAtmosphere({ lightingEnabled: !lightingEnabled })}
        title="Toggle Lighting"
      />

      {/* Atmosphere panel toggle */}
      <ToolButton
        icon={<CloudSun {...iconProps} />}
        label="Atmosphère"
        active={false}
        onClick={() => window.dispatchEvent(new CustomEvent('shiremapper:toggle-atmosphere'))}
        title="Atmosphère & Météo"
      />
    </aside>
  );
}
