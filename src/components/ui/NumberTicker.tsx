import { useEffect, useRef } from "react";
import { useInView, useMotionValue, useSpring } from "framer-motion";
import { useMobile } from "../../hooks/useMobile";

export default function NumberTicker({
  value,
  direction = "up",
  delay = 0,
  className,
}: {
  value: number;
  direction?: "up" | "down";
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const { isMobile } = useMobile();
  
  const safeValue = isNaN(value) ? 0 : value;
  const startingValue = direction === "down" ? safeValue : 0;
  
  const motionValue = useMotionValue(startingValue);
  const springValue = useSpring(motionValue, {
    damping: 60,
    stiffness: 100,
  });
  const isInView = useInView(ref, { once: true, margin: "0px" });

  useEffect(() => {
    if (isMobile) return; // Skip animations on mobile for performance
    if (isInView && !isNaN(safeValue)) {
      const timeoutId = setTimeout(() => {
        motionValue.set(direction === "down" ? 0 : safeValue);
      }, delay * 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [motionValue, isInView, delay, safeValue, direction, isMobile]);

  useEffect(() => {
    if (isMobile) return;
    const unsubscribe = springValue.on("change", (latest) => {
      if (ref.current && !isNaN(latest)) {
        ref.current.textContent = Intl.NumberFormat("en-US").format(
          Math.floor(latest)
        );
      }
    });
    return () => unsubscribe();
  }, [springValue, isMobile]);

  if (isMobile) {
    return (
      <span className={`inline-block tabular-nums ${className}`}>
        {Intl.NumberFormat("en-US").format(safeValue)}
      </span>
    );
  }

  return (
    <span
      className={`inline-block tabular-nums ${className}`}
      ref={ref}
    >
      {Intl.NumberFormat("en-US").format(startingValue)}
    </span>
  );
}
