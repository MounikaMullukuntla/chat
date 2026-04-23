"use client";

// /chat/keys — Key Manager page
//
// In the webroot, server.mjs intercepts /chat/keys/ and serves the static
// chat/keys/index.html directly (so this file is never reached there).
//
// On Vercel (or any plain `next start` deployment), server.mjs does not run,
// so Next.js routing hits this page instead. It loads the same vanilla-JS
// widget assets from the /keys/* route, which serves files directly from
// chat/keys/ without relying on a public symlink that breaks Vercel builds.

import Script from "next/script";
import { useEffect, useState } from "react";

export default function KeysPage() {
  const [serverKeys, setServerKeys] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/server-keys")
      .then((r) => r.json())
      .then((keys: string[]) => setServerKeys(keys))
      .catch(() => {});
  }, []);

  function initWidget() {
    if (!loaded) return;
    const root = document.getElementById("key-root");
    if (root && (window as any).KeyManager) {
      (window as any).KeyManager.migrateFromLegacy();
      (window as any).KeyManager.init(root);
    }
  }

  useEffect(() => {
    initWidget();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  const isVercel = !!process.env.NEXT_PUBLIC_VERCEL_ENV;
  const noServerKeys = serverKeys.length === 0;

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link rel="stylesheet" href="/keys/style.css" />

      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/icon?family=Material+Icons"
      />

      <div className="key-page">
        <div className="key-page-header">
          <h1>API Key Settings</h1>
          <p>Add your API keys to unlock AI models and Github integration.</p>

          {isVercel && noServerKeys && (
            <p
              style={{
                marginTop: "10px",
                padding: "8px 12px",
                background: "#fef9c3",
                border: "1px solid #fde047",
                borderRadius: "6px",
                fontSize: "0.85rem",
                color: "#713f12",
              }}
            >
              No server-side API keys detected. Set environment variables (e.g.{" "}
              <code>ANTHROPIC_API_KEY</code>) in your Vercel project settings to
              enable the server badge.
            </p>
          )}
        </div>

        <div id="key-root" />
      </div>

      <Script src="/keys/providers.js" strategy="beforeInteractive" />
      <Script
        src="/keys/key-manager.js"
        strategy="afterInteractive"
        onLoad={() => setLoaded(true)}
      />
    </>
  );
}
