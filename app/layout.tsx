import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Newsreader } from "next/font/google";
import { Toaster } from "sonner";
import { APP_URL, BRAND } from "@/lib/brand";
import { Providers } from "./providers";
import "./globals.css";

const sans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const serif = Newsreader({ variable: "--font-serif", subsets: ["latin"], style: ["normal", "italic"] });

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: { default: `${BRAND.name}: ${BRAND.tagline}`, template: `%s · ${BRAND.name}` },
  description: BRAND.description,
  applicationName: BRAND.name,
  authors: [{ name: BRAND.organisation }],
  keywords: ["workshop registration", "front desk", "bookings", "waitlist", "training centre"],
  // An internal staff tool: keep it out of search engines.
  robots: { index: false, follow: false },
  formatDetection: { email: false, telephone: false, address: false },
  appleWebApp: { capable: true, title: BRAND.name, statusBarStyle: "default" },
  openGraph: {
    type: "website",
    siteName: BRAND.name,
    title: `${BRAND.name}: ${BRAND.tagline}`,
    description: BRAND.description,
    locale: "en_GB",
  },
  twitter: {
    card: "summary_large_image",
    title: `${BRAND.name}: ${BRAND.tagline}`,
    description: BRAND.description,
  },
};

export const viewport: Viewport = {
  themeColor: BRAND.paper,
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} ${serif.variable} h-full`}>
      <body className="min-h-full bg-background text-foreground antialiased">
        <Providers>{children}</Providers>
        <Toaster
          position="bottom-right"
          theme="light"
          toastOptions={{
            className: "!rounded-lg !border !border-border !shadow-[0_2px_8px_rgba(0,0,0,0.04)] !font-sans",
          }}
        />
      </body>
    </html>
  );
}
