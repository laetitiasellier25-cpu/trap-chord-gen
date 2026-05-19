interface SliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  label?: string;
  suffix?: string;
  className?: string;
}

export function Slider({ value, min, max, step = 1, onChange, label, suffix, className }: SliderProps) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className={className}>
      {label && (
        <div className="flex justify-between items-baseline mb-1">
          <span className="text-xs text-gray-400 uppercase tracking-wide">{label}</span>
          <span className="text-sm font-mono text-white">
            {value}
            {suffix}
          </span>
        </div>
      )}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ ['--val' as string]: `${pct}%` } as React.CSSProperties}
        className="w-full"
      />
    </div>
  );
}
