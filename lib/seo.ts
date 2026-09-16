import type { Metadata } from 'next';
import { absoluteUrl } from './site';

export const homeTitle = '한 수 | 무료 추상전략 보드게임 · 파문, 침식, 유산';
export const homeDescription = '설치와 회원가입 없이 즐기는 무료 보드게임 한 수. 파문, 침식, 유산을 컴퓨터 AI 또는 친구와 플레이하세요. 닉네임으로 온라인 방을 만들고 초대 링크로 함께 두거나, 같은 기기에서 번갈아 둘 수 있습니다.';

export function pageMetadata(title: string, description: string, path = ''): Metadata {
  return {
    title, description, alternates: { canonical: absoluteUrl(path) },
    openGraph: {
      type: 'website', locale: 'ko_KR', siteName: '한 수',
      title, description, url: absoluteUrl(path),
      images: [{ url: absoluteUrl('og/hansu.png'), width: 1200, height: 630, alt: '한 수 — 파문, 침식, 유산 세 가지 추상전략 보드게임' }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [absoluteUrl('og/hansu.png')] },
  };
}
