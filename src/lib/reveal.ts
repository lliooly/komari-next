import type { CSSProperties } from "react";

type RevealStyle = CSSProperties & {
  "--reveal-delay"?: string;
};

export function getRevealProps(delayMs = 0) {
  return {
    "data-reveal": "true" as const,
    style: {
      "--reveal-delay": `${Math.max(0, delayMs)}ms`,
    } as RevealStyle,
  };
}
