/** Shared macOS-feel spring. Snappy but soft. */
export const macSpring = {
  type: "spring",
  stiffness: 320,
  damping: 28,
  mass: 0.9,
} as const;

export const softSpring = {
  type: "spring",
  stiffness: 220,
  damping: 26,
} as const;
