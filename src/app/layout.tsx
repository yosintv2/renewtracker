import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://renewtracker.net"),
  title: "RenewTracker — Never Miss a Subscription Payment",
  description:
    "Track every subscription, bill, rent, and financial liability in one place. Get reminded before payments hit — Netflix, Spotify, rent, credit cards, BNPL, and more. Free forever.",
  keywords: [
    "subscription tracker",
    "bill reminder app",
    "subscription management",
    "recurring payment tracker",
    "Netflix reminder",
    "subscription cost tracker",
    "monthly bill tracker",
    "BNPL tracker",
    "credit card payment reminder",
    "rent reminder",
  ],
  openGraph: {
    title: "RenewTracker — Never Miss a Subscription Payment",
    description:
      "Track every subscription, bill, and recurring payment. Get reminded before they charge. Free forever.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        {/* Stats counters — hidden from view, sitewide */}
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "1px", overflow: "hidden", visibility: "hidden", zIndex: -1 }}>
          <Script src="https://widget.supercounters.com/ssl/online_i.js" strategy="afterInteractive" />
          <Script id="sc-online-init" strategy="afterInteractive">
            {`sc_online_i(1714446,"ffffff","ffffff");`}
          </Script>
          <Script id="wau-init" strategy="afterInteractive">
            {`var _wau = _wau || []; _wau.push(["sjphoi7xt1", "sjphoi7xt1", "9qe", "c4302bffffff", "small"]);`}
          </Script>
          <Script src="https://waust.at/d.js" strategy="afterInteractive" />
        </div>
      </body>
    </html>
  );
}
