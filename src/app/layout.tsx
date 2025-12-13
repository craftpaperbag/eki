import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '駅コンパス',
  description: '最寄駅までの距離と方角をシンプルに表示する位置情報ウェブアプリ'
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="antialiased bg-slate-950 text-slate-50">
        {children}
      </body>
    </html>
  );
}
