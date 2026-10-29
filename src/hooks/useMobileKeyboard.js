import { useEffect, useState } from 'react';
export function useMobileKeyboard() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    let fullHeight = window.innerHeight;
    let fullWidth = window.innerWidth;
    const update = () => {
      const focused = document.activeElement?.matches(
        'input:not([type="checkbox"]):not([type="file"]), textarea, select',
      );
      if (!focused) fullHeight = Math.max(fullHeight, viewport.height);
      document.documentElement.style.setProperty(
        '--visual-viewport-height',
        viewport.height + 'px',
      );
      setOpen(Boolean(focused && fullHeight - viewport.height > 120));
    };
    const orientation = () => {
      if (window.innerWidth !== fullWidth) {
        fullHeight = window.innerHeight;
        fullWidth = window.innerWidth;
      }
      update();
    };
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    document.addEventListener('focusin', update);
    document.addEventListener('focusout', update);
    window.addEventListener('orientationchange', orientation);
    window.addEventListener('resize', orientation);
    update();
    return () => {
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
      document.removeEventListener('focusin', update);
      document.removeEventListener('focusout', update);
      window.removeEventListener('orientationchange', orientation);
      window.removeEventListener('resize', orientation);
      document.documentElement.style.removeProperty('--visual-viewport-height');
    };
  }, []);
  return open;
}
