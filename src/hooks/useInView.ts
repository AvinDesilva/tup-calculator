import { useRef, useState, useEffect } from "react";

/**
 * Returns [ref, isInView]. Fires once when the element enters the viewport,
 * then disconnects. Respects prefers-reduced-motion by immediately returning true.
 */
export function useInView(
  threshold = 0.3,
  rootMargin = "0px 0px -10% 0px"
): [React.RefObject<HTMLDivElement | null>, boolean] {
  const ref = useRef<HTMLDivElement | null>(null);
  const [isInView, setIsInView] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  useEffect(() => {
    if (isInView) return; // already true (reduced-motion or already intersected)

    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin, isInView]);

  return [ref, isInView];
}
