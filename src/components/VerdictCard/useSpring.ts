import { useRef, useState, useEffect } from "react";

interface SpringConfig {
  stiffness: number;
  damping: number;
  mass: number;
  precision: number;
}

const defaults: SpringConfig = { stiffness: 120, damping: 14, mass: 1.2, precision: 0.01 };

export function useSpring(target: number, config?: Partial<SpringConfig>): number {
  const { stiffness, damping, mass, precision } = { ...defaults, ...config };
  const [current, setCurrent] = useState(target);
  const pos = useRef(target);
  const vel = useRef(0);

  const [reducedMotion, setReducedMotion] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const h = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);

  useEffect(() => {
    if (reducedMotion) {
      pos.current = target;
      vel.current = 0;
      return;
    }

    let prev = performance.now();
    let animId = 0;

    function tick() {
      const now = performance.now();
      const dt = Math.min((now - prev) / 1000, 0.064);
      prev = now;

      const displacement = pos.current - target;
      const springForce = -stiffness * displacement;
      const dampingForce = -damping * vel.current;
      const accel = (springForce + dampingForce) / mass;

      vel.current += accel * dt;
      pos.current += vel.current * dt;

      if (Math.abs(vel.current) < precision && Math.abs(displacement) < precision) {
        pos.current = target;
        vel.current = 0;
        setCurrent(target);
        return;
      }

      setCurrent(pos.current);
      animId = requestAnimationFrame(tick);
    }

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [target, reducedMotion, stiffness, damping, mass, precision]);

  return reducedMotion ? target : current;
}
