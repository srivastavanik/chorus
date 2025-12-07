import { useEffect, useRef } from 'react';

export function useClickOutside<T extends HTMLElement>(
  handler: () => void,
  excludeRefs: React.RefObject<HTMLElement>[] = []
) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        // Check if the click was on any excluded element (like the toggle button)
        const isExcluded = excludeRefs.some(
          (excludeRef) =>
            excludeRef.current && excludeRef.current.contains(event.target as Node)
        );

        if (!isExcluded) {
          handler();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, [handler, excludeRefs]);

  return ref;
}

