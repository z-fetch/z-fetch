// app/layout.tsx
import "./global.css";
import { Inter } from "next/font/google";
import { RootProvider } from "fumadocs-ui/provider";
import type { ReactNode } from "react";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Z-Fetch - A pragmatic native fetch wrapper for JavaScript",
  description:
    "z-fetch is a lightweight and pragmatic wrapper around the native fetch API, providing a simpler and more intuitive way to make HTTP requests in JavaScript.",
  keywords:
    "z-fetch, fetch wrapper, javascript, http client, fetch api, web requests",
  openGraph: {
    title: "z-fetch - A pragmatic native fetch wrapper for JavaScript",
    description:
      "A lightweight and pragmatic wrapper around the native fetch API for JavaScript",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "z-fetch - JavaScript Fetch Wrapper",
    description:
      "A lightweight and pragmatic wrapper around the native fetch API for JavaScript",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={inter.className} suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <RootProvider
          search={{
            options: {
              type: "static",
            },
          }}
        >
          {children}
        </RootProvider>
      </body>
    </html>
  );
}
