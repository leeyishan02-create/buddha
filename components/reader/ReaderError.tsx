"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Home, RotateCcw } from "lucide-react";
import type { TextContentError } from "@/lib/cbeta/server";

const ERROR_MESSAGES: Record<TextContentError, string> = {
  network: "无法连接服务器，请检查网络连接后重试。",
  parse: "经文内容解析失败，可能是格式问题。",
  not_found: "未找到该经典，请检查编号是否正确。",
};

interface ReaderErrorProps {
  catalogId: string;
  error?: TextContentError;
}

export function ReaderError({ catalogId, error }: ReaderErrorProps) {
  const router = useRouter();
  const message = error ? ERROR_MESSAGES[error] : ERROR_MESSAGES.network;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <AlertTriangle className="mb-4 h-16 w-16 text-warning opacity-50" />
      <h1 className="mb-2 text-2xl font-bold font-reading text-text-primary">
        加载失败
      </h1>
      <p className="mb-2 max-w-md text-sm text-text-secondary">
        {message}
      </p>
      <p className="mb-6 text-xs text-text-tertiary">
        经典编号：{catalogId}
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-bg-elevated px-5 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-secondary hover:text-text-primary focus-visible:outline-2 focus-visible:outline-border-focus"
        >
          <Home className="h-4 w-4" />
          返回首页
        </Link>
        <button
          onClick={() => router.refresh()}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-border-focus"
        >
          <RotateCcw className="h-4 w-4" />
          重新加载
        </button>
      </div>
    </div>
  );
}
