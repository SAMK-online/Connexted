import { useEffect, useRef, useState } from "react";
import { animated, useSpring } from "@react-spring/web";

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Scroll-triggered entrance: fades and springs content up the first time it
 * enters the viewport. Pass `delay` (ms) to stagger siblings, and `as` to
 * keep semantics inside lists ("li") or sections.
 */
export function Reveal({ children, delay = 0, y = 28, as = "div", className, style }) {
  const ref = useRef(null);
  const [inView, setInView] = useState(() => prefersReducedMotion());

  useEffect(() => {
    if (inView) return undefined;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return undefined;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -48px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [inView]);

  const spring = useSpring({
    opacity: inView ? 1 : 0,
    transform: inView ? "translateY(0px)" : `translateY(${y}px)`,
    delay: inView ? delay : 0,
    config: { mass: 1, tension: 130, friction: 26 }
  });

  const AnimatedTag = animated[as] ?? animated.div;

  return (
    <AnimatedTag ref={ref} style={{ ...spring, ...style }} className={className}>
      {children}
    </AnimatedTag>
  );
}
