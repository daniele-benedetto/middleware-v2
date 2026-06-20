"use client";

import { motion, useScroll, useSpring } from "motion/react";

export function HomeScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 140,
    damping: 30,
    mass: 0.2,
  });

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-120 h-1 bg-transparent">
      <motion.div className="h-full origin-left bg-accent" style={{ scaleX }} />
    </div>
  );
}
