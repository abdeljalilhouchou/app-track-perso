import { SportHubNav } from "@/components/sport/sport-hub-nav";
import "@/components/sport/ui/sport-ui.css";
import "@/components/sport/exercises/exercise-library.css";
import "@/components/sport/anatomy/anatomy.css";

export default function SportLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="sport-ui space-y-6">
      <SportHubNav />
      {children}
    </div>
  );
}
