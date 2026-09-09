import { JsonLd } from '@/components/json-ld';
import { gameIds, guides } from '@/lib/guides';
import type { Game } from '@/lib/games';
import { absoluteUrl, basePath, siteUrl } from '@/lib/site';
import { pageMetadata } from '@/lib/seo';
export const guideMetadata = (game: Game) => pageMetadata(guides[game].title, guides[game].description, `rules/${game}.html`);
export function RulesGuide({ game }: { game: Game }) {
  const guide = guides[game], url = absoluteUrl(`rules/${game}.html`);
  return <main className="rules-page">
    <JsonLd data={{ '@context': 'https://schema.org', '@graph': [
      { '@type': 'WebPage', '@id': url, name: guide.title, url, description: guide.description, inLanguage: 'ko-KR', isPartOf: { '@id': `${siteUrl}#website` }, mainEntity: { '@id': `${url}#game` } },
      { '@type': 'VideoGame', '@id': `${url}#game`, name: guide.name, alternateName: guide.english, description: guide.intro,
        url: absoluteUrl(`?game=${game}`), gamePlatform: 'Web browser', genre: ['추상전략', '보드게임'],
        inLanguage: 'ko-KR', isAccessibleForFree: true, numberOfPlayers: { '@type': 'QuantitativeValue', minValue: 1, maxValue: 2 },
        image: absoluteUrl('og/hansu.png') },
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: '한 수', item: siteUrl },
        { '@type': 'ListItem', position: 2, name: `${guide.name} 규칙`, item: url },
      ] },
    ] }} />
    <header className="rules-masthead"><a className="wordmark" href={`${basePath}/`}>한 수<span className="brand-seal" aria-hidden="true">手</span></a><a href={`${basePath}/?game=${game}`}>게임으로 돌아가기 ↗</a></header>
    <nav className="breadcrumbs" aria-label="현재 위치"><a href={`${basePath}/`}>한 수</a><span aria-hidden="true">/</span><span aria-current="page">{guide.name} 규칙</span></nav>
    <article className="rules-article"><header><p className="guide-eyebrow">{guide.english} · {guide.size} × {guide.size}</p><h1>{guide.name} 규칙과 두는 법</h1><p className="guide-lead">{guide.intro}</p><a className="play-link" href={`${basePath}/?game=${game}`}>{guide.name} 바로 두기 <span aria-hidden="true">↗</span></a></header>
      {guide.sections.map(section=><section key={section.title}><h2>{section.title}</h2>{section.paragraphs.map(p=><p key={p}>{p}</p>)}</section>)}
      <section><h2>첫 대국에서 살펴볼 것</h2><ul>{guide.tips.map(tip=><li key={tip}>{tip}</li>)}</ul><p>혼자 연습하려면 AI와 두기를, 한 기기에서 번갈아 두려면 둘이 두기를 선택하세요. 힌트와 무르기는 게임판 아래에 있습니다. 대국은 현재 탭에 임시 저장되므로 규칙을 읽고 돌아가도 이어둘 수 있습니다.</p><a className="play-link" href={`${basePath}/?game=${game}`}>{guide.name} 시작하기 <span aria-hidden="true">↗</span></a></section>
    </article>
    <nav className="other-guides" aria-label="다른 게임의 규칙">{gameIds.filter(id=>id!==game).map(id=><a key={id} href={`${basePath}/rules/${id}.html`}>{guides[id].name} 규칙 읽기 ↗</a>)}</nav>
    <footer><a href={`${basePath}/`}>한 수 · 무료 추상전략 보드게임</a><a href={`${basePath}/sitemap.xml`}>사이트맵</a></footer>
  </main>;
}
