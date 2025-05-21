import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";

import FloatingMenu from "./components/floatingMenu.js";

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sinapsis",
  description: "Red Social - Obra digital colectiva",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${roboto.className} antialiased text-center`}
      >
        <FloatingMenu />
        <main>
          {children}
        </main>
      </body>
    </html>
  );
}
