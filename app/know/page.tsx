import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Know — US State Trade Flow Map",
  description: "A ModelEarth trade-data map embedded via localsite/js/trade.js's autoload mode.",
};

export default function KnowPage() {
  return (
    <div className="h-[calc(100vh-73px)] w-full">
      <iframe
        src="/know/embed.html"
        title="US State Trade Flow Map"
        className="h-full w-full border-0"
      />
    </div>
  );
}
