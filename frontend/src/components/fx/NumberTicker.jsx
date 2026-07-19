import { useEffect, useRef, useState } from "react";
import { animated, useSpring } from "@react-spring/web";

/** Counts up from 0 with spring physics the first time it scrolls into view. */
export function NumberTicker({ value, className }) {
  const target = Number(value) || 0;
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
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
      { threshold: 0.4 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const { n } = useSpring({
    n: inView ? target : 0,
    config: { tension: 60, friction: 24 }
  });

  return (
    <animated.span ref={ref} className={className}>
      {n.to((v) => Math.round(v))}
    </animated.span>
  );
}
