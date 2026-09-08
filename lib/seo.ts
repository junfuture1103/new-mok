import type { Metadata } from 'next';
import { absoluteUrl } from './site';

export const homeTitle = '한 수 | 무료 추상전략 보드게임 · 파문, 침식, 유산';
export const homeDescription = '설치와 회원가입 없이 즐기는 무료 보드게임 한 수. 돌을 미는 파문, 길을 지우는 침식, 이동 패를 건네는 유산을 컴퓨터 AI 또는 같은 기기의 친구와 플레이하세요. 규칙과 첫 수 팁도 확인할 수 있습니다.';

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
