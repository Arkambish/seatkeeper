"use client";

import { WarningCircle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/app/empty-state";

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <EmptyState
      tone="error"
      icon={<WarningCircle size={22} weight="bold" />}
      title="Something went wrong"
      description="The page couldn't load. Your data is safe. Try again in a moment."
      action={
        <Button variant="outline" onClick={reset}>
          Try again
        </Button>
      }
    />
  );
}
