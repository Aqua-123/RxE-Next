import { Album02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { defineFeature } from "@/core/feature";
import type { UserId } from "@/site/model";
import { Button } from "@/ui/components/ui/button";
import { openWall } from "./state";
import { WallViewer } from "./WallViewer";

function ViewWallButton({ userId }: { userId: UserId }) {
  return (
    <Button
      variant="secondary"
      size="sm"
      className="mb-2 w-full gap-1.5"
      onClick={() => openWall(userId)}
    >
      <HugeiconsIcon icon={Album02Icon} className="size-4" />
      View wall
    </Button>
  );
}

export default defineFeature({
  id: "profile-viewer",
  name: "View anyone's wall",
  description:
    "Adds a “View wall” button to every profile card, so you can read any user's posts and comments, not just your friends'.",
  category: "profiles",
  setup({ ui, profiles }) {
    ui.overlay(<WallViewer profiles={profiles} />);
    profiles.addCardAction(({ userId }) => <ViewWallButton userId={userId} />);
  },
});
