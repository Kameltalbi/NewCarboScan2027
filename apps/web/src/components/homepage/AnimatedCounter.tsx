import React, { useEffect, useRef, useState } from "react";

interface AnimatedCounterProps {
  target: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
  pause?: number;
}

function useInView<T extends HTMLElement>(options?: IntersectionObserverInit) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
        } else {
          setInView(false);
        }
      },
      { threshold: 0.3, ...options }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [options]);

  return { ref, inView };
}

function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  target,
  suffix = "%",
  prefix = "-",
  duration = 2500,
  pause = 1500,
}) => {
  const { ref, inView } = useInView<HTMLDivElement>();
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (!inView) {
      setDisplayValue(0);
      return;
    }

    let rafId: number;
    let cycleStart: number;
    let cycleId = 0;

    const runCycle = () => {
      cycleStart = performance.now();
      const currentCycle = ++cycleId;

      const animate = (now: number) => {
        if (currentCycle !== cycleId) return;

        const elapsed = now - cycleStart;

        if (elapsed < duration) {
          const progress = elapsed / duration;
          const eased = easeOutExpo(progress);
          const current = Math.round(eased * target);
          setDisplayValue(current);
          rafId = requestAnimationFrame(animate);
        } else {
          setDisplayValue(target);
          // Pause puis recommence
          setTimeout(() => {
            if (currentCycle === cycleId) {
              setDisplayValue(0);
              runCycle();
            }
          }, pause);
        }
      };

      rafId = requestAnimationFrame(animate);
    };

    runCycle();

    return () => {
      cancelAnimationFrame(rafId);
      cycleId++;
    };
  }, [inView, target, duration, pause]);

  return (
    <div ref={ref} className="flex items-end gap-2">
      <span className="text-6xl lg:text-7xl font-light text-white tracking-tight tabular-nums">
        {prefix}{displayValue}{suffix}
      </span>
    </div>
  );
};
