"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export const Greeting = () => {
  // Framer Motion's initial->animate transition runs via requestAnimationFrame,
  // which the browser's back-forward cache (bfcache) can freeze mid-flight —
  // e.g. navigating away to an external site and back leaves this stuck at its
  // initial opacity:0 forever. Force a remount (and a fresh animation run)
  // whenever the page is restored from bfcache.
  const [remountKey, setRemountKey] = useState(0);

  useEffect(() => {
    function handlePageShow(event: PageTransitionEvent) {
      if (event.persisted) setRemountKey((k) => k + 1);
    }
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  return (
    <div
      className="mx-auto mt-4 flex size-full max-w-3xl flex-col justify-center px-4 md:mt-16 md:px-8"
      key={`overview-${remountKey}`}
    >
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="font-semibold text-xl md:text-2xl"
        exit={{ opacity: 0, y: 10 }}
        initial={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.5 }}
      >
        Hello there!
      </motion.div>
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="text-xl text-zinc-500 md:text-2xl"
        exit={{ opacity: 0, y: 10 }}
        initial={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.6 }}
      >
        How can I help you today?
      </motion.div>
    </div>
  );
};
