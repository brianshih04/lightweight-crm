"use client";

import React from "react";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

export interface StageFunnelDatum {
  name: string;
  color: string;
  count: number;
  totalValue: number;
}

function ChartTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const datum: StageFunnelDatum = payload[0].payload;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-3.5 py-2.5 text-xs">
      <p className="font-bold text-slate-900 mb-1">{datum.name}</p>
      <p className="text-slate-600">
        <strong className="text-slate-900">{datum.count}</strong> 筆商機 ·{" "}
        <strong className="text-indigo-600">{formatCurrency(datum.totalValue)}</strong>
      </p>
    </div>
  );
}

/** 銷售管線各階段的水平分佈圖（以階段色彩呈現，tooltip 顯示筆數與金額） */
export function StageFunnelChart({ stages }: { stages: StageFunnelDatum[] }) {
  const height = Math.max(stages.length * 46 + 24, 160);
  return (
    <div style={{ height }} role="img" aria-label="銷售管線各階段商機金額分佈圖">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={stages} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="name"
            width={88}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: "#475569", fontWeight: 600 }}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(148,163,184,0.12)" }} />
          <Bar dataKey="totalValue" radius={[0, 6, 6, 0]} barSize={18}>
            {stages.map((stage) => (
              <Cell key={stage.name} fill={stage.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
