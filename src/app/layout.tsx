import type { Metadata } from "next";

import "./globals.css";

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
      <body className={`antialiased text-center`}>
        {children}
      </body>
    </html>
  );
}
