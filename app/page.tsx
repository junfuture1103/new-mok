import GameRoom from '@/components/game-room';
import { SiteIntroduction } from '@/components/site-introduction';
import { JsonLd } from '@/components/json-ld';
import { homeDescription, homeTitle, pageMetadata } from '@/lib/seo';
import { absoluteUrl, siteUrl } from '@/lib/site';

export const metadata = pageMetadata(homeTitle, homeDescription);
export default function Home() {
  return <>
    <JsonLd data={{ '@context': 'https://schema.org', '@graph': [
      { '@type': 'WebSite', '@id': `${siteUrl}#website`, url: siteUrl, name: '한 수', alternateName: 'HANSU', inLanguage: 'ko-KR', description: homeDescription },
      { '@type': 'WebApplication', '@id': `${siteUrl}#application`, name: '한 수', url: siteUrl,
        description: homeDescription, applicationCategory: 'GameApplication', operatingSystem: 'Any',
        browserRequirements: 'Requires JavaScript and a modern web browser', inLanguage: 'ko-KR',
        isAccessibleForFree: true, offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
        image: absoluteUrl('og/hansu.png'), featureList: ['컴퓨터 AI 대전', '같은 기기의 2인 대전', '힌트와 무르기', '키보드 조작'],
      },
    ] }} />
    <GameRoom><SiteIntroduction /></GameRoom>
  </>;
}
