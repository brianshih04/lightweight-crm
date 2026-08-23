"use client";

import React, { useCallback, useEffect, useState } from "react";
import { KanbanSquare, Plus } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { apiErrorMessage, apiFetch, fetchAllPages, fetchApiResponse } from "@/lib/api-client";
import { PipelineBoard, type BoardStage } from "@/components/sales/PipelineBoard";
import {
  Button,
  ErrorBanner,
  Field,
  inputClassName,
  LoadMoreButton,
  Modal,
  PageHeader,
  PageLoader,
  useToast,
} from "@/components/ui";

function mergePipelinePage(current: any, incoming: any) {
  const mergeOne = (existing: any, page: any) => ({
    ...existing,
    ...page,
    stages: existing.stages.map((stage: any) => {
      const nextStage = page.stages.find((candidate: any) => candidate.id === stage.id);
      return nextStage ? { ...nextStage, deals: [...stage.deals, ...nextStage.deals] } : stage;
    }),
  });

  return {
    ...current,
    ...incoming,
    pipelines: current.pipelines.map((pipeline: any) => {
      const nextPipeline = incoming.pipelines.find((candidate: any) => candidate.id === pipeline.id);
      return nextPipeline ? mergeOne(pipeline, nextPipeline) : pipeline;
    }),
    activePipeline:
      current.activePipeline && incoming.activePipeline
        ? mergeOne(current.activePipeline, incoming.activePipeline)
        : incoming.activePipeline || current.activePipeline,
  };
}

/** 由目標階段名稱推導商機狀態（贏單/輸單/進行中），與 API 合約一致 */
function statusForStage(stageName: string): string {
  if (stageName.includes("贏單") || stageName.includes("Won")) return "WON";
  if (stageName.includes("輸單") || stageName.includes("Lost")) return "LOST";
  return "OPEN";
}

/** 樂觀地把商機搬到目標階段，回傳新的 pipelineData */
function moveDealOptimistically(data: any, dealId: string, targetStageId: string) {
  let movedDeal: any = null;
  const stagesWithoutDeal = data.activePipeline.stages.map((stage: any) => {
    const found = stage.deals.find((deal: any) => deal.id === dealId);
    if (found) movedDeal = found;
    return { ...stage, deals: stage.deals.filter((deal: any) => deal.id !== dealId) };
  });

  if (!movedDeal) return data;

  const stages = stagesWithoutDeal.map((stage: any) =>
    stage.id === targetStageId
      ? { ...stage, deals: [...stage.deals, { ...movedDeal, stageId: targetStageId }] }
      : stage
  );

  return {
    ...data,
    activePipeline: { ...data.activePipeline, stages },
  };
}

export default function SalesPipelinePage() {
  const toast = useToast();
  const [pipelineData, setPipelineData] = useState<any>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadError, setLoadError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [movingDealId, setMovingDealId] = useState<string | null>(null);

  // New Deal Form State
  const [title, setTitle] = useState("");
  const [value, setValue] = useState("");
  const [stageId, setStageId] = useState("");
  const [contactId, setContactId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [expectedCloseDate, setExpectedCloseDate] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const fetchPipeline = useCallback(async (cursor?: string) => {
    if (cursor) setLoadingMore(true);
    else setLoading(true);
    setLoadError("");
    try {
      const response = await fetchApiResponse(
        `/api/deals?limit=50${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`
      );
      const data = await response.json();
      setNextCursor(response.headers.get("X-Next-Cursor"));
      setPipelineData((current: any) =>
        cursor && current ? mergePipelinePage(current, data) : data
      );
      if (data.activePipeline?.stages?.length > 0) {
        setStageId((current) => current || data.activePipeline.stages[0].id);
      }
    } catch (error) {
      console.error(error);
      setLoadError(apiErrorMessage(error));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchPipeline();
    fetchAllPages<any>("/api/contacts").then(setContacts).catch(console.error);
    fetchAllPages<any>("/api/accounts").then(setAccounts).catch(console.error);
  }, [fetchPipeline]);

  const handleMoveDeal = async (dealId: string, targetStageId: string) => {
    const snapshot = pipelineData;
    const targetStage = snapshot?.activePipeline?.stages?.find((s: any) => s.id === targetStageId);
    if (!targetStage) return;

    setMovingDealId(dealId);
    setPipelineData((current: any) => moveDealOptimistically(current, dealId, targetStageId));

    try {
      await apiFetch("/api/deals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dealId,
          stageId: targetStageId,
          status: statusForStage(targetStage.name),
        }),
      });
      // 樂觀更新已反映結果，成功時不需重新載入整個看板
    } catch (err) {
      console.error(err);
      setPipelineData(snapshot);
      toast.error(`商機階段移動失敗：${apiErrorMessage(err)}`);
    } finally {
      setMovingDealId(null);
    }
  };

  const handleCreateDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !pipelineData?.activePipeline?.id) return;
    setSubmitting(true);
    setFormError("");
    try {
      await apiFetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          value: parseFloat(value) || 0,
          pipelineId: pipelineData.activePipeline.id,
          stageId: stageId || pipelineData.activePipeline.stages[0]?.id,
          contactId: contactId || null,
          accountId: accountId || null,
          expectedCloseDate: expectedCloseDate || null,
          notes,
        }),
      });
      setShowModal(false);
      setTitle("");
      setValue("");
      setContactId("");
      setAccountId("");
      setExpectedCloseDate("");
      toast.success(`已建立商機「${title}」`);
      fetchPipeline();
    } catch (err) {
      console.error(err);
      setFormError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <PageLoader label="載入銷售商機看板中..." />;
  }

  const stages: BoardStage[] = pipelineData?.activePipeline?.stages || [];
  const totalPipelineValue = stages.reduce(
    (sum, stage) => sum + stage.deals.reduce((dealSum, deal) => dealSum + deal.value, 0),
    0
  );

  return (
    <div className="space-y-6">
      <PageHeader
        icon={KanbanSquare}
        title="商機銷售看板 (Sales Kanban)"
        description={
          stages.length > 0 ? (
            <>
              已載入商機總值：<strong className="text-indigo-600 font-semibold">{formatCurrency(totalPipelineValue)}</strong>
              {" · "}拖曳卡片或使用卡片選單推動各階段成交進展。
            </>
          ) : (
            "拖曳卡片推動各階段成交進展。"
          )
        }
      >
        <Button onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4" />
          <span>建立新商機</span>
        </Button>
      </PageHeader>

      {loadError && <ErrorBanner message={loadError} onRetry={() => fetchPipeline()} />}

      <PipelineBoard stages={stages} onMoveDeal={handleMoveDeal} movingDealId={movingDealId} />

      {nextCursor && (
        <LoadMoreButton loading={loadingMore} onClick={() => fetchPipeline(nextCursor!)} label="載入更多商機" />
      )}

      {/* Create Deal Modal */}
      {showModal && (
        <Modal title="建立新商機 (New Deal)" onClose={() => setShowModal(false)}>
          <form onSubmit={handleCreateDeal} className="space-y-4 text-sm">
            {formError && (
              <p role="alert" className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                {formError}
              </p>
            )}

            <Field label="商機名稱" required>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例如：宏威科技 - CRM 系統擴充採購案"
                className={inputClassName}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="預估金額 (TWD)">
                <input
                  type="number"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="500000"
                  className={inputClassName}
                />
              </Field>
              <Field label="初始階段">
                <select value={stageId} onChange={(e) => setStageId(e.target.value)} className={inputClassName}>
                  {stages.map((stage) => (
                    <option key={stage.id} value={stage.id}>
                      {stage.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="關聯企業客戶">
                <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className={inputClassName}>
                  <option value="">選擇企業 (可選)</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="主要聯絡人">
                <select value={contactId} onChange={(e) => setContactId(e.target.value)} className={inputClassName}>
                  <option value="">選擇聯絡人 (可選)</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.title || "聯絡人"})
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="預計結案日期">
              <input
                type="date"
                value={expectedCloseDate}
                onChange={(e) => setExpectedCloseDate(e.target.value)}
                className={inputClassName}
              />
            </Field>

            <Field label="商機備註 / 需求說明">
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="輸入客戶預算、重要決策里程碑或跟進事項..."
                className={`${inputClassName} resize-none`}
              />
            </Field>

            <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
              <Button type="button" variant="ghost" onClick={() => setShowModal(false)}>
                取消
              </Button>
              <Button type="submit" loading={submitting}>
                {submitting ? "建立中..." : "確認建立"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
