"use client";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/app/ui";

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <EmptyState title="Something went wrong">
      <p className="mb-4">The page couldn&apos;t load. Your data is safe. Try again in a moment.</p>
      <Button variant="outline" onClick={reset}>
        Try again
      </Button>
    </EmptyState>
  );
}
