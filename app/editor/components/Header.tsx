'use client';

import { useState, useRef, useEffect } from 'react';
import { Download, Image, Undo, Redo } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface HeaderProps {
  mapName: string;
  onMapNameChange: (name: string) => void;
  onSave: () => void;
  onExport: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

interface IconButtonProps {
  onClick: () => void;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}

function IconButton({ onClick, disabled = false, title, children }: IconButtonProps) {
  return (
    <button
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={[
        'flex items-center justify-center w-9 h-9 rounded border transition-colors',
        disabled
          ? 'border-transparent text-gray-600 cursor-not-allowed'
          : 'border-[#0F3460] text-gray-300 hover:bg-[#0F3460] hover:text-gray-100',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export default function Header({
  mapName,
  onMapNameChange,
  onSave,
  onExport,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: HeaderProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(mapName);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync draft if mapName changes externally
  useEffect(() => {
    if (!editing) {
      setDraft(mapName);
    }
  }, [mapName, editing]);

  function startEditing() {
    setDraft(mapName);
    setEditing(true);
    setTimeout(() => {
      inputRef.current?.select();
    }, 0);
  }

  function commitEdit() {
    const trimmed = draft.trim();
    const final = trimmed.length > 0 ? trimmed : mapName;
    onMapNameChange(final);
    setDraft(final);
    setEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') commitEdit();
    if (e.key === 'Escape') {
      setDraft(mapName);
      setEditing(false);
    }
  }

  return (
    <header className="flex items-center h-12 px-3 bg-[#16213E] border-b border-[#0F3460] shrink-0">
      {/* Left: Logo */}
      <div className="flex items-center gap-2 min-w-[160px]">
        <span className="text-[#E94560] font-bold text-base tracking-tight select-none">
          ShireMapper
        </span>
      </div>

      {/* Center: Map name (editable) */}
      <div className="flex-1 flex items-center justify-center">
        {editing ? (
          <input
            ref={inputRef}
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={handleKeyDown}
            className="bg-[#1A1A2E] border border-[#E94560] text-gray-100 text-sm rounded px-2 py-1 w-56 text-center focus:outline-none"
          />
        ) : (
          <button
            title="Click to rename map"
            onClick={startEditing}
            className="text-sm text-gray-200 hover:text-gray-100 px-3 py-1 rounded hover:bg-[#0F3460]/50 transition-colors max-w-xs truncate"
          >
            {mapName}
          </button>
        )}
      </div>

      {/* Right: Action buttons */}
      <div className="flex items-center gap-1 min-w-[160px] justify-end">
        <IconButton
          title="Undo (Ctrl+Z)"
          onClick={onUndo}
          disabled={!canUndo}
        >
          <Undo size={18} />
        </IconButton>

        <IconButton
          title="Redo (Ctrl+Shift+Z)"
          onClick={onRedo}
          disabled={!canRedo}
        >
          <Redo size={18} />
        </IconButton>

        <div className="w-px h-6 bg-[#0F3460] mx-1" />

        <IconButton title="Save (Ctrl+S)" onClick={onSave}>
          <Download size={18} />
        </IconButton>

        <IconButton title="Export image" onClick={onExport}>
          <Image size={18} />
        </IconButton>
      </div>
    </header>
  );
}
