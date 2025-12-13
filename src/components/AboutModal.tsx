'use client';

import { useEffect } from 'react';

type AboutModalProps = {
  open: boolean;
  onClose: () => void;
};

export function AboutModal({ open, onClose }: AboutModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">このアプリについて</h2>
            <p className="mt-2 text-sm text-slate-200">
              現在地から最寄りの駅までの距離と方角を、端末の位置情報と方位センサーを用いてリアルタイムに表示します。
              取得した方角は端末のコンパス情報を利用するため、磁気干渉の少ない場所でお試しください。
            </p>
          </div>
          <button
            type="button"
            aria-label="閉じる"
            onClick={onClose}
            className="rounded-full bg-slate-800 px-3 py-1 text-sm hover:bg-slate-700"
          >
            ×
          </button>
        </div>
        <ul className="mt-4 space-y-2 text-sm text-slate-200">
          <li>・駅データはJR路線LODの公開データを利用しています（リポジトリに静的同梱）。</li>
          <li>・処理はクライアントサイドで完結し、サーバーレス関数のタイムアウトを回避しています。</li>
          <li>・ブラウザが位置情報と方位取得への許可を求めたら、許可してください。</li>
        </ul>
      </div>
    </div>
  );
}
