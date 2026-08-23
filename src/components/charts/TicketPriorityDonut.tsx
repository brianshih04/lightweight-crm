"use client";

import React from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

export interface PriorityDatum {
  name: string;
  value: number;
  color: string;
}

export const TICKET_PRIORITY_COLORS: Record<string, string> = {
  LOW: "#94a3b8",
  MEDIUM: "#3b82f6",
  HIGH: "#f59e0b",
  URGENT: "#ef4444",
};

function ChartTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const datum: PriorityDatum = payload[0].payload;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-3 py-2 text-xs">
      <p className="font-bold text-slate-900">
        {datum.name}：<span className="text-slate-700">{datum.value} 件</span>
      </p>
    </div>
  );
}

/** 待處理工單的優先級分佈甜甜圈圖，中央顯示總數 */
export function TicketPriorityDonut({ data }: { data: PriorityDatum[] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="relative h-52" role="img" aria-label={`待處理工單共 ${total} 件，依優先級分佈`}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="62%"
            outerRadius="88%"
            paddingAngle={data.length > 1 ? 3 : 0}
            strokeWidth={0}
          >
            {data.map((item) => (
              <Cell key={item.name} fill={item.color} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-2xl font-extrabold text-slate-900">{total}</span>
        <span className="text-[10px] text-slate-400 font-semibold">待處理</span>
      </div>
      {data.length > 0 && (
        <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-1">
          {data.map((item) => (
            <span key={item.name} className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
              {item.name} {item.value}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
