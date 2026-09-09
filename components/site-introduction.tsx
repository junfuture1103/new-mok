import { basePath } from '@/lib/site';
import { gameIds, guides } from '@/lib/guides';
export function SiteIntroduction() {
  return <section className="site-introduction" aria-labelledby="about-hansu">
    <div className="intro-heading"><h2 id="about-hansu">한 수, 세 가지 추상전략 보드게임</h2><p>설치와 회원가입 없이 무료로 즐깁니다. 바둑·체스·오목에서 한 수를 고민하는 시간을 좋아한다면, 서로 다른 세 규칙을 만나보세요.</p></div>
    <nav className="guide-index" aria-label="게임별 규칙">{gameIds.map(id=><a key={id} href={`${basePath}/rules/${id}.html`}><span>{guides[id].size} × {guides[id].size}</span><h3>{guides[id].name} <small>{guides[id].english}</small></h3><p>{id==='ripple'?'돌을 놓고 이웃 돌을 밀어 네 개를 잇습니다.':id==='erosion'?'출발한 칸이 사라집니다. 상대의 길을 막고 내 길을 남깁니다.':'이동에 쓴 패를 상대에게 건넵니다. 중심 말을 잡으면 이깁니다.'}</p><b>규칙과 첫 수 팁 ↗</b></a>)}</nav>
    <section className="common-questions" aria-labelledby="faq-heading"><h2 id="faq-heading">시작하기 전에</h2>
      <details><summary>혼자 또는 친구와 할 수 있나요?</summary><p>혼자 할 때는 컴퓨터 AI와 대국합니다. 난이도는 가볍게·신중하게 두 단계입니다. 둘이 두기를 고르면 같은 컴퓨터나 휴대폰에서 번갈아 둡니다. 서로 다른 기기를 연결하는 온라인 대전은 지원하지 않습니다.</p></details>
      <details><summary>휴대폰에서도 되고, 다운로드는 필요 없나요?</summary><p>최신 브라우저에서 주소를 열면 바로 시작할 수 있습니다. 별도 앱 설치나 로그인, 결제가 필요 없습니다. 컴퓨터에서는 방향키로 칸을 이동하고 Enter 또는 Space로 착수할 수도 있습니다.</p></details>
      <details><summary>규칙을 몰라도 시작할 수 있나요?</summary><p>게임판 옆에 두는 법이 표시됩니다. 힌트로 추천 수를 확인하거나 무르기로 직전 선택을 되돌릴 수 있습니다. 자세한 예외 규칙과 시작 팁은 위의 게임별 안내에서 확인하세요.</p></details>
      <details><summary>대국은 저장되나요?</summary><p>세 게임의 대국과 대전 설정은 현재 브라우저 탭에 임시 저장됩니다. 새로고침하거나 규칙을 읽고 돌아와도 이어둘 수 있고, 무르기도 그대로 사용할 수 있습니다. 새 대국은 선택한 게임만 처음부터 시작합니다. 계정이나 서버에 저장하거나 다른 기기와 동기화하지는 않습니다.</p></details>
    </section>
  </section>;
}
