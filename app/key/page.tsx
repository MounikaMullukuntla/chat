"use client";

import Script from "next/script";
import { useEffect, useState } from "react";

export default function KeyPage() {
  const [serverKeys, setServerKeys] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/server-keys")
      .then((r) => r.json())
      .then((keys: string[]) => setServerKeys(keys))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const root = document.getElementById("key-root");
    if (root && (window as any).KeyManager) {
      (window as any).KeyManager.migrateFromLegacy();
      (window as any).KeyManager.init(root);
    }
  }, [loaded]);

  const isVercel = !!process.env.NEXT_PUBLIC_VERCEL_ENV;
  const noServerKeys = serverKeys.length === 0;

  return (
    <>
      <link rel="stylesheet" href="/keys/style.css" />
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
              enable server badges.
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
