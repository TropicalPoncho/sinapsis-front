import type { Metadata, Viewport } from "next";
import { Suspense } from "react";

import "./globals.css";
import Shell from "./Shell";

export const metadata: Metadata = {
  title: "Sinapsis",
  description: "Red Social - Obra digital colectiva",
};

// Sin esto, el navegador mobile arma un viewport de diseño falso (~980px) y hace zoom-out:
// todo el CSS @media (max-width: 800px) del sitio corría como si fuera desktop.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
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
