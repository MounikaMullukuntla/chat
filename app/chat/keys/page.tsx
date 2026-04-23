"use client";

// /chat/keys — Key Manager page (inside the chat layout/navigation).
//
// Accessible without login — listed as a public route in proxy.ts.
//
// In the webroot, server.mjs serves /keys/* statically (standalone form with
// localsite navigation). /chat/keys falls through to Next.js so it renders
// inside the sidebar layout, giving logged-out users the same key manager form
// embedded in the chat navigation.
//
// On Vercel (or any plain `next start` deployment), server.mjs does not run;
// Next.js routing hits this page for both /keys and /chat/keys.

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
              <code>ANTHROPIC_API_KEY</code>) in your{" "}
              <a
                href="https://vercel.com/docs/projects/environment-variables/managing-environment-variables"
                target="_blank"
                rel="noopener noreferrer"
              >
                Vercel project settings
              </a>{" "}
              to enable the server badge. Browser-saved keys stay encrypted in
              local storage and IndexedDB, so they will not appear as server
              {" "}
              <code>.env</code>
              {" "}
              badges unless the deployed server can read the same provider keys
              from its own environment.
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
