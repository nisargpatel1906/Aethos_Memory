import React from "react";

interface LogoProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export default function AethosLogo({ size = 28, className, style }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 350 350"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ flexShrink: 0, ...style }}
    >
      <path
        d="M30.0001 210.663V247.56L176.27 336.508L319.246 247.56V210.663L176.27 296.317L30.0001 210.663Z"
        fill="#39CD96"
      />
      <path
        d="M176.27 266.667L319.246 181.672V144.116L176.27 229.77L30.0001 143.457V180.354L176.27 266.667Z"
        fill="#39CD96"
      />
      <path
        d="M319.246 102.607V113.808L190.107 189.579V146.752L252.7 109.196L176.27 61.7568L99.8409 109.196L161.116 146.752L160.457 189.579L30.0001 113.808V102.607L176.27 13L319.246 102.607Z"
        fill="#39CD96"
      />
    </svg>
  );
}
