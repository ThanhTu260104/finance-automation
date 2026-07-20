import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { siteConfig } from "@/config/site";
import { AppToaster } from "@/components/ui/AppToaster";
import { UserProvider } from "@/lib/context/UserContext";
import { PushNotificationManager } from "@/components/pwa/PushNotificationManager";
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
  title: siteConfig.name,
  description: siteConfig.description,
  applicationName: siteConfig.name,
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'SAW Requests' },
  icons: {
    icon: [
      { url: '/app-icon-web-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/app-icon-web-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/app-icon-web-180.png', sizes: '180x180', type: 'image/png' }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang={siteConfig.locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <UserProvider>
          {children}
          <PushNotificationManager />
          <AppToaster />
        </UserProvider>
      </body>
    </html>
  );
}
