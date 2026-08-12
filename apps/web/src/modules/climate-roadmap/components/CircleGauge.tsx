import React from 'react';

interface CircleGaugeProps {
  value: number;
  size?: number;
  label?: string;
}

export const CircleGauge: React.FC<CircleGaugeProps> = ({ value, size = 48, label }) => {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg className="-rotate-90" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="hsl(var(--border))" strokeWidth="2.5" />
          <circle cx={size/2} cy={size/2} r={radius} fill="none"
            stroke="hsl(var(--primary))" strokeWidth="2.5"
            strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" />
        </svg>
        <span className="absolute text-xs font-bold text-foreground">{value}%</span>
      </div>
      {label && <span className="text-[10px] text-muted-foreground">{label}</span>}
    </div>
  );
};
