"use client";

// /chat/key — Key Manager page
//
// In the webroot, server.mjs intercepts /chat/key/ and serves the static
// chat/key/index.html directly (so this file is never reached there).
//
// On Vercel (or any plain `next start` deployment), server.mjs does not run,
// so Next.js routing hits this page instead.  It loads the same vanilla-JS
// widget scripts from /key/ (public/ symlink → chat/key/) and initialises
// the widget, giving an identical experience minus the localsite header.

import Script from "next/script";
import { useEffect, useState } from "react";

export default function KeyPage() {
  const [serverKeys, setServerKeys] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Find out which providers have keys configured server-side.
  useEffect(() => {
    fetch("/api/server-keys")
      .then((r) => r.json())
      .then((keys: string[]) => setServerKeys(keys))
      .catch(() => {});
  }, []);

  // Initialise the widget once both scripts have loaded.
  function initWidget() {
    if (!loaded) return;
    const root = document.getElementById("key-root");
    if (root && (window as any).KeyManager) {
      (window as any).KeyManager.migrateFromLegacy();
      (window as any).KeyManager.init(root);
    }
  }

  // Re-run init whenever `loaded` flips to true.
  useEffect(() => {
    initWidget();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  const isVercel = !!(process.env.NEXT_PUBLIC_VERCEL_ENV);
  const noServerKeys = serverKeys.length === 0;

  return (
    <>
      {/* Widget styles */}
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link rel="stylesheet" href="/key/style.css" />

      {/* Material Icons used by the widget */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/icon?family=Material+Icons"
      />

      <div className="key-page">
        <div className="key-page-header">
          <h1>API Key Settings</h1>
          <p>Add your API keys to unlock AI models and Github integration.</p>

          {/* Banner: shown on Vercel when no server-side env vars are set */}
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

      {/* Providers must load before the key manager */}
      <Script
        src="/key/providers.js"
        strategy="beforeInteractive"
      />
      <Script
        src="/key/key-manager.js"
        strategy="afterInteractive"
        onLoad={() => setLoaded(true)}
      />
    </>
  );
}
