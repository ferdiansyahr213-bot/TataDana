import './globals.css';
import React from 'react';

export const metadata = {
  title: 'TataDana — Catat Keuangan Semudah Chat Langsung dari Telegram',
  description: 'Aplikasi manajemen keuangan pribadi terintegrasi Telegram Bot dan AI OCR struk belanja.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-white text-slate-800 antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
