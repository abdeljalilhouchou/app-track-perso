import { SportHubNav } from "@/components/sport/sport-hub-nav";

export default function SportLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <SportHubNav />
      {children}
    </div>
  );
}
