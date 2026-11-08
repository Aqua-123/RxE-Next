import { useStore } from "zustand";
import type { FeatureCategory } from "@/core/feature";
import { featureStatuses } from "@/core/runtime";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/ui/components/ui/empty";
import { FeatureCard } from "./FeatureCard";

export function FeatureList({ category }: { category: FeatureCategory }) {
  const statuses = useStore(featureStatuses).filter(
    (status) => status.category === category && !status.core
  );

  if (statuses.length === 0) {
    return (
      <Empty className="border border-dashed border-border">
        <EmptyHeader>
          <EmptyTitle>Nothing here yet</EmptyTitle>
          <EmptyDescription>Features for this section are on the way.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      {statuses.map((status) => (
        <FeatureCard key={status.id} status={status} />
      ))}
    </div>
  );
}
