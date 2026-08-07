"use client";

interface LoadingSpinnerProps {
  size?: number;
  className?: string;
}

export function LoadingSpinner({ size = 20, className = "" }: LoadingSpinnerProps) {
  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        flexShrink: 0,
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        style={{ animation: "spinPetal 1.1s ease-in-out infinite" }}
      >
        {/* Arc rose principal */}
        <circle
          cx="12"
          cy="12"
          r="9"
          stroke="#F9A8D4"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="28 56"
        />
        {/* Arc rose foncé */}
        <circle
          cx="12"
          cy="12"
          r="9"
          stroke="#E9688A"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="14 70"
          strokeDashoffset="-14"
        />
      </svg>
    </span>
  );
}

/** Variante plein écran semi-transparente — overlay de chargement */
export function LoadingOverlay({ label = "Chargement..." }: { label?: string }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(255,245,247,0.75)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        gap: 16,
      }}
    >
      <LoadingSpinner size={36} />
      <span
        style={{
          fontSize: 13,
          color: "#B85873",
          fontStyle: "italic",
          letterSpacing: "0.025em",
        }}
      >
        {label}
      </span>
    </div>
  );
}
