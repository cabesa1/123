import type { Metadata } from 'next';
import './globals.css';
import './apple.css';

export const metadata: Metadata = {
  title: 'Trend Finder',
  description: 'Curadoria de vídeos e tendências para marcas.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
