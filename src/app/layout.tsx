import type { Metadata } from "next";
import { Suspense } from "react";

import "./globals.css";
import Shell from "./Shell";

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
    <html lang="es">
      <body className="antialiased">
        <Suspense fallback={<div className="cargando" aria-hidden="true" />}>
          <Shell />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
