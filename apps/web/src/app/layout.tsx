import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'BizSocial360 — Social Media Dashboard',
  description:
    'Engagement insights and customer-response tracking across Facebook, Instagram, and TikTok.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
