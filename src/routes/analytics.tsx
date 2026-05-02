import { createFileRoute } from "@tanstack/react-router";
import { Sidebar } from "@/components/inbox/Sidebar";
import { AnalyticsPage } from "@/components/inbox/AnalyticsPage";

export const Route = createFileRoute("/analytics")({
  head: () => ({ meta: [{ title: "Métricas — Pulse Inbox" }] }),
  component: AnalyticsRoute,
});

function AnalyticsRoute() {
  return (
    <div className="flex h-[100dvh] w-screen overflow-hidden bg-background">
      <Sidebar />
      <AnalyticsPage />
    </div>
  );
}