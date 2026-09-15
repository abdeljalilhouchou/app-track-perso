"use client";

import { useState, useTransition } from "react";
import { HabitForm } from "@/components/habit-form";

export function HabitCreateForm({ action }: { action: (formData: FormData) => Promise<void> }) {
  const [resetKey, setResetKey] = useState(0);
  const [pending, startTransition] = useTransition();

  return (
    <HabitForm
      key={resetKey}
      action={(formData) =>
        startTransition(async () => {
          await action(formData);
          setResetKey((k) => k + 1);
        })
      }
      submitLabel={pending ? "Ajout..." : "Ajouter l'habitude"}
    />
  );
}
