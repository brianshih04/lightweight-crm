"use client";

import React, { useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  Building2,
  Calendar,
  DollarSign,
  GripVertical,
  User,
} from "lucide-react";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

export interface BoardStage {
  id: string;
  name: string;
  color: string;
  deals: BoardDeal[];
}

export interface BoardDeal {
  id: string;
  title: string;
  value: number;
  stageId: string;
  account?: { name: string } | null;
  contact?: { name: string; title?: string } | null;
  expectedCloseDate?: string | null;
}

export interface PipelineBoardProps {
  stages: BoardStage[];
  /** 拖曳或下拉選單觸發階段移動時呼叫（頁面層負責樂觀更新與 rollback） */
  onMoveDeal: (dealId: string, targetStageId: string) => void;
  /** 正在搬移中的商機 ID（顯示卡片處理中狀態） */
  movingDealId: string | null;
  emptyHint?: string;
}

function DealCard({
  deal,
  stages,
  onMoveDeal,
  dragging = false,
  overlay = false,
  moving = false,
  handleProps,
}: {
  deal: BoardDeal;
  stages: BoardStage[];
  onMoveDeal: (dealId: string, targetStageId: string) => void;
  dragging?: boolean;
  overlay?: boolean;
  moving?: boolean;
  handleProps?: Record<string, unknown>;
}) {
  return (
    <div
      className={cn(
        "bg-white rounded-xl p-4 border shadow-sm space-y-3 transition",
        overlay ? "shadow-xl border-indigo-300 rotate-1" : "border-slate-200",
        dragging && "opacity-40",
        moving && "animate-pulse border-indigo-300"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="font-bold text-slate-900 text-sm leading-snug">{deal.title}</h4>
          <div className="flex items-center gap-1 text-base font-bold text-indigo-600 mt-1">
            <DollarSign className="w-4 h-4 -mr-1" />
            <span>{formatCurrency(deal.value)}</span>
          </div>
        </div>
        {handleProps && (
          <button
            type="button"
            aria-label={`拖曳移動商機「${deal.title}」`}
            title="拖曳移動階段（也可用下方選單）"
            className="p-1 -m-1 text-slate-300 hover:text-indigo-600 cursor-grab active:cursor-grabbing rounded touch-none"
            {...handleProps}
          >
            <GripVertical className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="space-y-1.5 text-xs text-slate-500 pt-2 border-t border-slate-100">
        {deal.account && (
          <div className="flex items-center gap-1.5 truncate">
            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{deal.account.name}</span>
          </div>
        )}
        {deal.contact && (
          <div className="flex items-center gap-1.5 truncate">
            <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">
              {deal.contact.name} ({deal.contact.title || "聯絡人"})
            </span>
          </div>
        )}
        {deal.expectedCloseDate && (
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>預計結案：{formatDate(deal.expectedCloseDate, "yyyy-MM-dd")}</span>
          </div>
        )}
      </div>

      {/* 精確移動的無障礙備援（鍵盤與下拉操作） */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
        <label htmlFor={`stage-select-${deal.id}`} className="text-[11px] text-slate-400">
          移動階段：
        </label>
        <select
          id={`stage-select-${deal.id}`}
          value={deal.stageId}
          disabled={moving}
          onChange={(e) => onMoveDeal(deal.id, e.target.value)}
          className="text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-700 font-medium focus:ring-1 focus:ring-indigo-500"
        >
          {stages.map((st) => (
            <option key={st.id} value={st.id}>
              {st.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function DraggableDeal({
  deal,
  stages,
  onMoveDeal,
  movingDealId,
}: {
  deal: BoardDeal;
  stages: BoardStage[];
  onMoveDeal: (dealId: string, targetStageId: string) => void;
  movingDealId: string | null;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: deal.id,
    data: { deal },
  });

  return (
    <div ref={setNodeRef}>
      <DealCard
        deal={deal}
        stages={stages}
        onMoveDeal={onMoveDeal}
        dragging={isDragging}
        moving={movingDealId === deal.id}
        handleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

function StageColumn({
  stage,
  index,
  children,
}: {
  stage: BoardStage;
  index: number;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id, data: { stage } });
  const stageTotal = stage.deals.reduce((sum, deal) => sum + deal.value, 0);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "w-80 shrink-0 bg-slate-100/90 rounded-2xl p-3.5 border flex flex-col max-h-[calc(100vh-220px)] transition",
        isOver ? "border-indigo-400 bg-indigo-50/70 ring-2 ring-indigo-300" : "border-slate-200/80"
      )}
      aria-label={`階段：${stage.name}，共 ${stage.deals.length} 筆商機`}
    >
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color }} />
          <span className="font-bold text-slate-800 text-sm">{stage.name}</span>
          <span className="text-xs bg-slate-200 text-slate-700 font-semibold px-2 py-0.5 rounded-full">
            {stage.deals.length}
          </span>
        </div>
        <span className="text-xs font-bold text-slate-600">{formatCurrency(stageTotal)}</span>
      </div>

      <div className="space-y-3 overflow-y-auto flex-1 pr-1">
        {stage.deals.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
            {index >= 0 ? "拖曳商機到此階段" : "暫無商機"}
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

export function PipelineBoard({
  stages,
  onMoveDeal,
  movingDealId,
  emptyHint = "尚無商機",
}: PipelineBoardProps) {
  const [activeDeal, setActiveDeal] = useState<BoardDeal | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDeal((event.active.data.current?.deal as BoardDeal) ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDeal(null);
    const { active, over } = event;
    if (!over) return;
    const deal = active.data.current?.deal as BoardDeal | undefined;
    if (!deal || over.id === deal.stageId) return;
    onMoveDeal(deal.id, String(over.id));
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveDeal(null)}
    >
      <div className="flex gap-5 overflow-x-auto pb-6 items-start">
        {stages.map((stage, index) => (
          <StageColumn key={stage.id} stage={stage} index={index}>
            {stage.deals.map((deal) => (
              <DraggableDeal
                key={deal.id}
                deal={deal}
                stages={stages}
                onMoveDeal={onMoveDeal}
                movingDealId={movingDealId}
              />
            ))}
          </StageColumn>
        ))}
      </div>

      <DragOverlay dropAnimation={{ duration: 180 }}>
        {activeDeal ? (
          <div className="w-80">
            <DealCard deal={activeDeal} stages={stages} onMoveDeal={() => undefined} overlay />
          </div>
        ) : null}
      </DragOverlay>

      {stages.length === 0 && (
        <p className="text-center text-sm text-slate-400 py-10">{emptyHint}</p>
      )}
    </DndContext>
  );
}
