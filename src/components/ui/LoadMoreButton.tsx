"use client";

import { Button } from "./Button";

export interface LoadMoreButtonProps {
  loading: boolean;
  onClick: () => void;
  label?: string;
}

export function LoadMoreButton({ loading, onClick, label = "載入更多" }: LoadMoreButtonProps) {
  return (
    <div className="flex justify-center">
      <Button variant="secondary" onClick={onClick} loading={loading}>
        {loading ? "載入中..." : label}
      </Button>
    </div>
  );
}
