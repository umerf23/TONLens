import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TONLens — TON Research Intelligence",
  description: "AI-powered research on TON projects, wallets & tokens inside Telegram",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Telegram WebApp SDK — must load before anything else */}
        <script src="https://telegram.org/js/telegram-web-app.js" />

        {/* TON Connect bridge — enables Telegram Wallet to work inside Mini App */}
        {/* This is what fixes the blank screen when using Telegram Wallet */}
        <script src="https://unpkg.com/@tonconnect/ui@latest/dist/tonconnect-ui.min.js" />
      </head>
      <body style={{ margin: 0, padding: 0, background: "#070b14" }}>
        {children}
      </body>
    </html>
  );
}
