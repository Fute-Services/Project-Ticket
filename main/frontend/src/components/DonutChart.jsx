import React from 'react';

export default function DonutChart({ title, total, data }) {
  let cumulativeAngle = 0;
  const radius = 38;
  const circumference = 2 * Math.PI * radius;

  const segments = data.map((item) => {
    const strokeDasharray = `${(item.percent / 100) * circumference} ${circumference}`;
    const strokeDashoffset = -cumulativeAngle;
    cumulativeAngle += (item.percent / 100) * circumference;

    return {
      ...item,
      strokeDasharray,
      strokeDashoffset,
    };
  });

  return (
    <div className="bg-[#141418] border border-white/5 rounded-2xl p-3.5 flex flex-col justify-between h-full">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-extrabold text-xs text-white">{title}</h3>
      </div>

      <div className="flex flex-row items-center gap-4 my-auto">
        {/* SVG Donut Chart with central total */}
        <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            {/* Background circle */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="13"
              fill="transparent"
            />
            {/* Donut Segments */}
            {segments.map((seg, idx) => (
              <circle
                key={idx}
                cx="50"
                cy="50"
                r={radius}
                stroke={seg.color}
                strokeWidth="13"
                strokeDasharray={seg.strokeDasharray}
                strokeDashoffset={seg.strokeDashoffset}
                fill="transparent"
                className="transition-all duration-500 hover:opacity-80"
              />
            ))}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-xl font-extrabold text-white leading-none">{total}</span>
            <span className="text-[9px] text-gray-400 font-medium mt-0.5">Total</span>
          </div>
        </div>

        {/* Legend List */}
        <div className="flex flex-col gap-1.5 w-full">
          {data.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-gray-300 truncate font-medium">{item.label}</span>
              </div>
              <span className="text-gray-400 font-bold shrink-0">
                {item.percent}% <span className="text-gray-500 font-normal text-[10px]">({item.value})</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
