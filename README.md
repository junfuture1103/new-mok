# 한 수 · HANSU

파문, 침식, 유산을 한 화면에서 플레이하는 추상전략 게임 실험판입니다.

**[바로 플레이하기](https://junfuture1103.github.io/new-mok/)** — GitHub Pages 공개 정적 사이트입니다. 로그인 없이 접속할 수 있습니다.

[파문 규칙](https://junfuture1103.github.io/new-mok/rules/ripple.html) · [침식 규칙](https://junfuture1103.github.io/new-mok/rules/erosion.html) · [유산 규칙](https://junfuture1103.github.io/new-mok/rules/legacy.html)

검색 메타데이터·공유 이미지·사이트맵과 Google/네이버 소유자 등록 절차는 [검색 노출 안내](docs/SEO.ko.md)에 정리했습니다.

세 게임의 기본 글꼴은 프리텐다드 1.3.9입니다. 제목·본문·버튼·좌표·기보에 적용하며, [글꼴과 라이선스](public/fonts/README.md)를 정적 빌드에 포함합니다.

- AI 대전(가볍게 / 신중하게), 같은 기기의 2인 대전
- 파문의 밀림 미리 보기, 이동 가능 칸, 이동 패 도식
- 힌트, 무르기, 최근 수, 승패 판정, 재시작
- 대국·무르기 기록·대전 설정을 현재 탭에 임시 저장합니다. 새로고침하거나 규칙을 읽고 돌아와도 이어둘 수 있습니다.
- 키보드: Tab으로 선택, 방향키로 게임판 이동, Enter/Space로 착수, Escape로 선택 취소
- 게임 진행에는 서버, 계정, 외부 AI API를 사용하지 않습니다. 처음 접속할 때 정적 파일을 불러온 뒤 게임은 브라우저 안에서 실행됩니다.

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

완성된 정적 게임은 `http://127.0.0.1:4190/`에서 열립니다. `dist/client`가 배포 대상입니다. HTML을 파일로 직접 여는 방식은 지원하지 않습니다.

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
