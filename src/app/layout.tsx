import type { Metadata } from "next";
import { Inter, Montserrat } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Pixcards — The Last Business Card You'll Ever Need",
  description:
    "Share your professional identity instantly with NFC and QR. Build a digital business card, order a premium physical card, and grow your network with Pixcards.",
  metadataBase: new URL("https://pixcards.example"),
  openGraph: {
    title: "Pixcards — Smart Digital Business Cards",
    description:
      "NFC + QR digital business cards. Tap to share, update anytime, track analytics.",
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
      className={`${inter.variable} ${montserrat.variable} h-full`}
    >
      <body className="min-h-full flex flex-col bg-background text-ink">
        {children}
      </body>
    </html>
  );
}
