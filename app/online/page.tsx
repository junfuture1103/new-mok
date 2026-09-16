import OnlineRoom from '@/components/online-room';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata('온라인 대국 | 한 수 · 파문, 침식, 유산', '닉네임으로 방을 만들고 친구와 파문, 침식, 유산을 두세요. 초대 링크와 방 코드로 입장하는 무료 2인 온라인 보드게임.', 'online.html');
export default function OnlinePage() { return <OnlineRoom />; }
