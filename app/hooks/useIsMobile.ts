'use client';

import { useEffect, useState } from 'react';

const MOBILE_BREAKPOINT = 768; // px

/**
 * Reactive hook that returns true when the viewport width is below the mobile
 * breakpoint (768 px). Uses matchMedia so it re-fires on resize without polling.
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    setIsMobile(mq.matches);

    function handleChange(e: MediaQueryListEvent) {
      setIsMobile(e.matches);
    }

    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, []);

  return isMobile;
}
