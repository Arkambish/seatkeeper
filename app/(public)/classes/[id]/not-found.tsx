import Link from "next/link";
import { CalendarBlank } from "@phosphor-icons/react/dist/ssr";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/app/empty-state";

export default function ClassNotFound() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-24">
      <EmptyState
        icon={<CalendarBlank size={22} weight="bold" />}
        title="We couldn't find that workshop"
        description="It may have been rescheduled or removed. Here's everything that's coming up."
        action={
          <Link href="/#workshops" className={buttonVariants()}>
            See upcoming workshops
          </Link>
        }
      />
    </main>
  );
}
