import type { Metadata } from 'next';
import { basePath, siteUrl } from '@/lib/site';
import './globals.css';
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: '한 수',
  icons: { icon: `${basePath}/icon.svg` },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 } },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="ko"><head>
    <link rel="preload" href={`${basePath}/fonts/PretendardVariable.woff2`} as="font" type="font/woff2" crossOrigin="anonymous" />
    <link rel="stylesheet" href={`${basePath}/fonts/pretendard.css`} />
    <link rel="sitemap" type="application/xml" href={`${basePath}/sitemap.xml`} />
  </head><body>{children}</body></html>;
}
