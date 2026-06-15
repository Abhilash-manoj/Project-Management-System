// app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Nexus - Project Management Terminal",
  description: "Enterprise tenant tracking infrastructure portal workspace.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`} 
    >
      <head>
        {/* 👇 ANTI-FLASH INTEGRITY INLINE THEME INITIALIZATION SCRIPT */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                // Read from local storage or fall back safely to your default corporate theme
                var activeTheme = localStorage.getItem('nexus-theme') || 'corporate';
                document.documentElement.setAttribute('data-theme', activeTheme);
              } catch (e) {
                document.documentElement.setAttribute('data-theme', 'corporate');
              }
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-base-100 text-base-content transition-colors duration-150">
        {children}
      </body>
    </html>
  );
}