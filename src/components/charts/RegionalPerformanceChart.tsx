"use client";

import React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

export interface RegionalDatum {
  name: string;
  wonValue: number;
  pipelineValue: number;
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-3.5 py-2.5 text-xs space-y-1">
      <p className="font-bold text-slate-900 mb-1">{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.dataKey} className="flex items-center gap-1.5 text-slate-600">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          {entry.name}：<strong className="text-slate-900">{formatCurrency(entry.value)}</strong>
        </p>
      ))}
    </div>
  );
}

/** 分區營運績效：已贏單 vs 進行中商機的分組長條圖 */
export function RegionalPerformanceChart({ regions }: { regions: RegionalDatum[] }) {
  return (
    <div className="h-64" role="img" aria-label="分區營運績效長條圖（已贏單與進行中商機金額）">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={regions} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey="name"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: "#475569", fontWeight: 600 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            tickFormatter={(value: number) => (value >= 1000000 ? `${Math.round(value / 1000000)}M` : value >= 1000 ? `${Math.round(value / 1000)}K` : String(value))}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(148,163,184,0.12)" }} />
          <Legend wrapperStyle={{ fontSize: 12, color: "#475569" }} iconType="circle" iconSize={8} />
          <Bar dataKey="wonValue" name="已贏單成交額" fill="#10b981" radius={[4, 4, 0, 0]} barSize={22} />
          <Bar dataKey="pipelineValue" name="進行中商機總額" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={22} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
