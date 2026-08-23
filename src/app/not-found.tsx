import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
      <p className="text-6xl font-extrabold text-indigo-600 tracking-tight">404</p>
      <h1 className="mt-3 text-xl font-bold text-slate-900">找不到此頁面</h1>
      <p className="mt-2 text-sm text-slate-500">
        您造訪的頁面不存在或已被移動，請返回首頁繼續操作。
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm transition"
      >
        返回總覽儀表板
      </Link>
    </div>
  );
}
