"use client";

import { useEffect, useState } from "react";
import type { DbStatus } from "@/lib/auth/db-status";

// Client-side pages (/login, /register) can't call the server-only
// getDbStatus() directly — this fetches the same status from
// /api/auth/db-status. Defaults to "ok" while loading so the form doesn't
// flash a false-positive warning before the first response arrives.
export function useDbStatus(): DbStatus {
  const [status, setStatus] = useState<DbStatus>("ok");

  useEffect(() => {
    fetch("/api/auth/db-status")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.status) setStatus(data.status);
      })
      .catch(() => {});
  }, []);

  return status;
}
