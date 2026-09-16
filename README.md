# 한 수 · HANSU

파문, 침식, 유산을 한 화면에서 플레이하는 추상전략 게임 실험판입니다.

**[바로 플레이하기](https://junfuture1103.github.io/new-mok/)** — GitHub Pages 공개 정적 사이트입니다. 로그인 없이 접속할 수 있습니다.

**[친구와 온라인 대국](https://junfuture1103.github.io/new-mok/online.html)** — 닉네임을 입력하고 파문·침식·유산 중 게임을 골라 방을 만듭니다. 초대 링크 또는 10자리 방 코드로 두 번째 사람이 입장하면 바로 시작합니다.

[파문 규칙](https://junfuture1103.github.io/new-mok/rules/ripple.html) · [침식 규칙](https://junfuture1103.github.io/new-mok/rules/erosion.html) · [유산 규칙](https://junfuture1103.github.io/new-mok/rules/legacy.html)

검색 메타데이터·공유 이미지·사이트맵과 Google/네이버 소유자 등록 절차는 [검색 노출 안내](docs/SEO.ko.md)에 정리했습니다.

세 게임의 기본 글꼴은 프리텐다드 1.3.9입니다. 제목·본문·버튼·좌표·기보에 적용하며, [글꼴과 라이선스](public/fonts/README.md)를 정적 빌드에 포함합니다.

- AI 대전(가볍게 / 신중하게), 같은 기기의 2인 대전
- 서로 다른 기기의 온라인 2인 대전, 방 코드·초대 링크, 재접속, 기권, 양쪽 동의 후 흑백 교대 재대국
- 파문의 밀림 미리 보기, 이동 가능 칸, 이동 패 도식
- 힌트, 무르기, 최근 수, 승패 판정, 재시작
- 대국·무르기 기록·대전 설정을 현재 탭에 임시 저장합니다. 새로고침하거나 규칙을 읽고 돌아와도 이어둘 수 있습니다.
- 키보드: Tab으로 선택, 방향키로 게임판 이동, Enter/Space로 착수, Escape로 선택 취소
- AI 대전과 같은 기기의 대전은 브라우저 안에서 실행됩니다. 온라인 대전은 Sites Worker + D1이 방과 기보를 보관하고, 참가자·차례·합법적인 수를 검증합니다. 계정이나 외부 AI API는 사용하지 않습니다.

## 실행

Node.js 22.13 이상(검증: 24.19.0), npm 사용.

```powershell
npm ci
npm run dev -- --port 4180
```

로컬 주소는 개발 서버가 출력하는 URL을 사용합니다.

```powershell
npm run build
npm start
```

완성된 게임은 `http://127.0.0.1:4190/`에서 열립니다. `dist/client`는 정적 프런트엔드이며, `npm run build`는 Sites용 Worker와 마이그레이션도 `dist/`에 생성합니다. HTML을 파일로 직접 여는 방식은 지원하지 않습니다.

## GitHub Pages

`main`에 푸시하면 `.github/workflows/pages.yml`이 규칙 테스트·타입 검사·정적 빌드를 수행하고 GitHub Pages에 자동 배포합니다. 저장소 Settings → Pages의 Source는 **GitHub Actions**로 설정합니다.

Pages 빌드는 `/new-mok/` 아래에서 코드·프리텐다드·아이콘이 로드되도록 경로를 설정합니다. 기본 `npm run build`는 기존 도메인의 루트 경로를 유지합니다.

```powershell
$env:NEXT_PUBLIC_BASE_PATH='/new-mok'
npm run build:pages
npm start
```

이 경우 미리 보기 주소는 `http://127.0.0.1:4190/new-mok/`입니다. 같은 환경 변수로 `npm run test:e2e`를 실행하면 Pages 경로에서 브라우저 테스트를 수행합니다. 기본 빌드로 돌아갈 때는 `Remove-Item Env:NEXT_PUBLIC_BASE_PATH`로 환경 변수를 지웁니다.

## 검증

```powershell
npm test
npm run typecheck
npm run test:simulate
npm run build
npm run test:e2e
```

브라우저 테스트는 설치된 Microsoft Edge를 사용합니다. 운영체제에 맞게 `playwright.config.ts`의 channel을 조정할 수 있습니다.

## 규칙 0.1

**파문:** 7×7. 빈칸에 자기 돌 하나를 놓고 상하좌우 인접 돌을 색과 무관하게 한 칸 밉니다. 이동은 동시 처리하며, 목적지에 돌이 있으면 움직이지 않고 연쇄 밀기도 없습니다. 판 밖으로 나가는 돌은 제거합니다. 처리 후 자기 돌 네 개 이상을 가로·세로·대각선으로 연결하면 승리합니다. 두 색 동시 연결, 가득 찬 판, 같은 차례·배치 세 번 반복, 160수 제한은 무승부입니다.

**침식:** 6×6. 흑 B1/D1/F1, 백 A6/C6/E6에서 세 말씩 시작합니다. 자기 말을 상하좌우로 원하는 만큼 옮기며 말과 구멍을 넘을 수 없습니다. 출발 칸만 영구적으로 사라집니다. 자기 차례에 어떤 말도 움직일 수 없으면 패배합니다. 매번 한 칸이 사라지므로 최대 30수 안에 끝납니다.

**유산:** 5×5. 각자의 맨 아래줄에 말 다섯 개, 가운데 말이 왕관이 있는 중심 말입니다. 흑은 도약·날개·갈고리, 백은 걸음·빗길로 시작합니다. 자기 차례에는 항상 패 세 장이 됩니다. 패 하나와 말을 골라 패 도식대로 이동하고 사용한 패를 상대에게 직접 넘깁니다. 백의 도식은 180° 회전하며 화면에는 회전된 방향이 표시됩니다. 두 칸 이동은 중간 말을 넘습니다. 도착지의 적은 잡고, 자기 말이 있는 칸으로는 이동할 수 없습니다. 상대 중심 말을 잡거나 상대의 합법적 수가 없어지면 승리합니다. 차례·배치·소유 패의 조합이 세 번 반복되거나 160수에 도달하면 무승부입니다.

공통: 흑 선공. AI 대전에서 플레이어는 흑입니다. 2인 모드 무르기는 한 수, AI 모드는 직전 사람의 선택까지 되돌립니다.

온라인: 방을 만든 사람이 첫 판의 흑입니다. 무르기와 힌트는 제공하지 않으며, 끝난 대국에서 두 사람이 다시 두기에 동의하면 흑백을 교대합니다. 스왑 규칙은 적용하지 않았습니다.

## 온라인 서버와 검증

게임 주소는 GitHub Pages를 유지합니다. API는 `.openai/hosting.json`에 등록된 기존 Sites 프로젝트에 별도로 배포합니다. Pages 배포만으로 API가 갱신되지는 않습니다. `NEXT_PUBLIC_ROOM_API`는 공개 API 주소이며 비밀키가 아닙니다. 생략하면 운영 Sites 주소를 사용합니다.

- `server/rooms.ts`: JSON API, SHA-256 처리한 입장 토큰, 서버 규칙 검증, SQL 버전 비교로 동시 입장·중복 착수 방지
- `db/schema.ts`, `drizzle/`: D1 스키마와 버전별 마이그레이션. 배포된 마이그레이션은 수정하지 않습니다.
- 방은 생성 후 24시간 동안 이용할 수 있으며, 만료 방과 요청 제한 기록은 새 방 생성 시 제한된 개수씩 정리합니다.
- 닉네임과 기보는 서버에 저장합니다. 참가자 토큰은 탭의 sessionStorage에 저장하며 초대 링크에 넣지 않습니다. 다른 탭이나 기기로 참가자 신분을 이전하는 기능은 없습니다.
- 1.2초 간격으로 판을 확인합니다. 백그라운드에서는 10초로 줄이고 연결 실패 시 간격을 늘립니다. 자동 패배 없이 재접속을 기다립니다.
- 기본 방 생성 제한은 접속 IP당 한 시간 12개입니다. 원본 IP는 저장하지 않고 시간 구간을 포함한 해시만 저장합니다.

로컬 온라인 검증(PowerShell, Node.js 24):

```powershell
$env:NEXT_PUBLIC_ROOM_API='http://127.0.0.1:4191'
$env:NEXT_PUBLIC_BASE_PATH='/new-mok'
npm run build:pages
npm run test:e2e
```

Playwright가 정적 서버와 로컬 SQLite API를 실행합니다. 실제 운영 SQL과 동일한 마이그레이션을 적용하며, 온라인 테스트는 운영 서버에 자동 실행되지 않습니다. 수동 API 실행은 `node --experimental-strip-types scripts/serve-api.ts`입니다. 검증 후 운영 빌드에서는 `NEXT_PUBLIC_ROOM_API`의 로컬 값을 제거합니다.

## 구조

- `lib/games.ts`: UI와 독립적인 순수 규칙, 합법적 수 생성, 평가함수, 제한된 2수 탐색 AI
- `components/game-room.tsx`, `app/globals.css`: 게임 화면과 상호작용
- `lib/session.ts`: 현재 탭의 대국·설정 저장과 검증된 기보 복원
- `tests/rules.test.ts`: 예외 규칙과 150판 상태 불변조건 테스트
- `tests/simulate.ts`: 고정 난수를 사용하는 재현 가능한 360판 대전
- `tests/openings.ts`, `tests/validate-openings.ts`: 유산의 시작 패 비교
- `tests/browser/play.spec.ts`: 실제 배포용 정적 파일의 조작 및 세 게임 완주
- `tests/browser/interaction.spec.ts`: 실제 포인터 클릭, 터치, 느린 로딩, 대국 복원, 키보드 경계 검사
- `docs/QA.ko.md`: 결과와 한계

AI는 외부 모델이 아닌 로컬 탐색입니다. 정상 난이도는 상위 14개 후보에 대해 모든 상대 응수를 확인하는 제한된 탐색으로, 최적 수나 게임의 공정성을 보장하지 않습니다. Windows에서 Vinext의 즉시 종료가 네이티브 작업 종료와 충돌하는 문제를 막기 위해 빌드 스크립트가 성공 종료만 250ms 지연합니다. 실패 코드는 그대로 유지됩니다.

재사용 가능한 WebMCP 액션 `read_game`, `start_game`, `play_move`는 지원 브라우저에서만 등록됩니다. 초기 Edge 테스트에서는 미지원이었으며, 디자인 개정 후 Codex 내장 브라우저에서 세 액션의 등록·실행과 잘못된 입력 거절을 확인했습니다.
