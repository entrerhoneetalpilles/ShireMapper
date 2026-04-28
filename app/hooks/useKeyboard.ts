'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/** A shortcut registration: a key string (e.g. "s", "z") plus a callback. */
interface ShortcutEntry {
  key: string;
  /** Whether Ctrl/Cmd must be held at the same time. */
  ctrl?: boolean;
  /** Whether Shift must be held at the same time. */
  shift?: boolean;
  /** Whether Alt must be held at the same time. */
  alt?: boolean;
  callback: (event: KeyboardEvent) => void;
}

/** Handle returned by registerShortcut — call it to unregister. */
type UnregisterFn = () => void;

// ─────────────────────────────────────────────────────────────────────────────
// useKeyboard
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Tracks modifier-key state and provides a callback-registration API for
 * keyboard shortcuts.
 *
 * Returns live booleans for the four common modifier keys:
 *   spaceHeld, altHeld, shiftHeld, ctrlHeld
 *
 * Shortcuts registered via `registerShortcut` fire only on keydown when the
 * required key and modifier combination matches.
 */
export function useKeyboard(): {
  spaceHeld: boolean;
  altHeld: boolean;
  shiftHeld: boolean;
  ctrlHeld: boolean;
  registerShortcut: (entry: ShortcutEntry) => UnregisterFn;
} {
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [altHeld, setAltHeld] = useState(false);
  const [shiftHeld, setShiftHeld] = useState(false);
  const [ctrlHeld, setCtrlHeld] = useState(false);

  // Store shortcuts in a ref so handlers always see the latest set without
  // needing to re-attach event listeners.
  const shortcutsRef = useRef<ShortcutEntry[]>([]);

  const registerShortcut = useCallback(
    (entry: ShortcutEntry): UnregisterFn => {
      shortcutsRef.current = [...shortcutsRef.current, entry];
      return () => {
        shortcutsRef.current = shortcutsRef.current.filter((e) => e !== entry);
      };
    },
    [],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Update modifier state.
      if (e.code === 'Space') setSpaceHeld(true);
      if (e.key === 'Alt') setAltHeld(true);
      if (e.key === 'Shift') setShiftHeld(true);
      if (e.key === 'Control' || e.key === 'Meta') setCtrlHeld(true);

      // Fire any matching registered shortcuts.
      for (const shortcut of shortcutsRef.current) {
        const keyMatch =
          e.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch =
          shortcut.ctrl !== undefined
            ? (e.ctrlKey || e.metaKey) === shortcut.ctrl
            : true;
        const shiftMatch =
          shortcut.shift !== undefined
            ? e.shiftKey === shortcut.shift
            : true;
        const altMatch =
          shortcut.alt !== undefined ? e.altKey === shortcut.alt : true;

        if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
          shortcut.callback(e);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') setSpaceHeld(false);
      if (e.key === 'Alt') setAltHeld(false);
      if (e.key === 'Shift') setShiftHeld(false);
      if (e.key === 'Control' || e.key === 'Meta') setCtrlHeld(false);
    };

    // Reset all modifiers when the window loses focus to avoid stuck keys.
    const handleBlur = () => {
      setSpaceHeld(false);
      setAltHeld(false);
      setShiftHeld(false);
      setCtrlHeld(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  return { spaceHeld, altHeld, shiftHeld, ctrlHeld, registerShortcut };
}
