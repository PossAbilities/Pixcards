import type { Metadata, Viewport } from "next";
import { APP_NAME, appUrl } from "@/lib/constants";
import { Inter, Montserrat, Nunito_Sans } from "next/font/google";
// Icon font is self-hosted so visitors' browsers never contact Google.
import "material-symbols/outlined.css";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// PossAbilities card templates use Nunito Sans; self-hosted like the others.
const nunitoSans = Nunito_Sans({
  variable: "--font-nunito-sans",
  subsets: ["latin"],
  weight: ["400", "700", "900"],
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const DESCRIPTION =
  "Share your contact details with a tap or a scan. Build a digital business card, order an NFC card, and update your details any time with Pixcards.";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl()),
  title: {
    default: "Pixcards — Digital business cards with NFC and QR",
    template: "%s | Pixcards",
  },
  description: DESCRIPTION,
  applicationName: APP_NAME,
  openGraph: {
    siteName: APP_NAME,
    type: "website",
    locale: "en_GB",
    title: "Pixcards — Digital business cards with NFC and QR",
    description: DESCRIPTION,
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#4f46e5",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${montserrat.variable} ${nunitoSans.variable} h-full`}
    >
      <body className="min-h-full flex flex-col bg-background text-ink">
        <a href="#main" className="skip-link">
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
