import type { Metadata } from 'next';
import { basePath } from '@/lib/site';
import './globals.css';
export const metadata: Metadata = {
  title: '한 수 · 파문, 침식, 유산',
  icons: { icon: `${basePath}/icon.svg` },
  description: '작은 규칙, 깊은 선택. 파문·침식·유산 세 가지 추상전략 게임을 AI 또는 친구와 즐겨보세요.',
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="ko"><head>
    <link rel="preload" href={`${basePath}/fonts/PretendardVariable.woff2`} as="font" type="font/woff2" crossOrigin="anonymous" />
    <link rel="stylesheet" href={`${basePath}/fonts/pretendard.css`} />
  </head><body>{children}</body></html>;
}
