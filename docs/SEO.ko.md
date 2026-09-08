# 검색 노출 설정

대표 사이트: https://junfuture1103.github.io/new-mok/

## 반영한 내용

- 홈과 게임별 규칙 3페이지를 HTML로 미리 렌더링합니다. 검색 봇은 JavaScript 없이 소개, 규칙, 승리 조건, 첫 수 팁과 안내 링크를 읽을 수 있습니다.
- 페이지마다 고유한 title, description, canonical, Open Graph, Twitter Card를 제공합니다.
- 공개 GitHub Pages를 대표 주소로 지정합니다. `?game=legacy` 같은 플레이 옵션은 별도 검색 문서로 만들지 않고 홈 주소를 canonical로 사용합니다.
- WebSite, WebApplication, VideoGame, BreadcrumbList JSON-LD는 실제 기능과 공개 본문만 설명합니다. 이용자 수·평점·수상 내역을 만들어 넣지 않습니다. 구조화 데이터가 검색 특수 표시나 순위를 보장하지는 않습니다.
- `public/og/hansu.png`는 1200×630 공유 이미지입니다. `node scripts/create-social-preview.mjs`로 프리텐다드를 불러와 재생성할 수 있습니다.
- 사이트맵: https://junfuture1103.github.io/new-mok/sitemap.xml
- `tests/browser/seo.spec.ts`는 JavaScript 없는 본문, canonical·공유 정보·JSON-LD, 내부 링크, 사이트맵, 이미지 크기, 안내에서 해당 게임으로 이동하는 동작을 검사합니다.

## Google / 네이버 등록

소유자 계정에서 한 번 진행하는 단계이며 이번 코드 배포만으로 등록이 완료되는 것은 아닙니다.

1. Google Search Console에서 URL 접두어 속성 `https://junfuture1103.github.io/new-mok/`를 추가합니다.
2. HTML 파일 인증을 선택하면 받은 인증 파일을 저장소의 `public/`에 넣고 배포합니다. 인증 파일은 이후에도 유지합니다. HTML 메타 태그 인증을 선택했다면 제공된 태그를 `app/layout.tsx`에 추가합니다.
3. 인증 후 Sitemaps에서 위 사이트맵 주소를 제출하고 URL 검사에서 홈과 규칙 페이지의 수집 상태를 확인합니다.
4. 네이버 서치어드바이저는 등록 화면에서 허용하는 사이트 범위와 인증 파일 위치를 확인한 뒤 소유 확인과 사이트맵 제출을 진행합니다. 도메인 루트 인증을 요구하면 이 프로젝트의 `public/`에 인증 파일을 넣는 것만으로는 완료되지 않습니다. 루트 사이트의 운영 설정을 별도로 확인해야 합니다.

Google은 robots.txt를 도메인의 루트에서 읽습니다. `/new-mok/robots.txt`를 만드는 것으로 이 프로젝트의 크롤링을 제어할 수 없습니다. 현재 도메인 루트 `/robots.txt`는 404로, robots.txt에 의한 수집 제한은 없습니다. 이 저장소 밖의 루트 사이트를 수정하지 않습니다. 나중에 루트 robots.txt를 운영하면 `/new-mok/`와 정적 자산을 차단하지 않도록 확인하세요.

실제 검색 반영은 검색엔진의 수집·색인 이후에 이루어집니다. Search Console 등록·색인 완료·검색 순위 상승 여부는 별도로 확인해야 합니다.

공식 참고: [Google SEO 기본 가이드](https://developers.google.com/search/docs/fundamentals/seo-starter-guide), [사이트맵 제출](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap), [robots.txt 위치](https://developers.google.com/search/docs/crawling-indexing/robots/create-robots-txt), [네이버 서치어드바이저](https://searchadvisor.naver.com/guide).
