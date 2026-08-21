import type { Metadata } from "next";
import { Be_Vietnam_Pro, Fraunces } from "next/font/google";
import "./globals.css";

const sans = Be_Vietnam_Pro({
  variable: "--font-be-vietnam",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
});

const display = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["600", "700"],
});

export const metadata: Metadata = {
  title: "OceanTrack — visibility shipment nội bộ",
  description: "Paste số container/bill để theo dõi lịch tàu, ETD/ETA cho các phòng ban.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className={`${sans.variable} ${display.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
