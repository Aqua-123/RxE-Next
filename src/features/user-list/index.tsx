import { defineFeature } from "@/core/feature";
import { setting } from "@/core/settings";
import { SORTS, type SortId } from "./sorts";
import { UserListTools } from "./UserListTools";

export default defineFeature({
  id: "user-list",
  name: "Online list tools",
  description:
    "Sort group chat's online list by name, account age or karma, and open anyone's profile by their user ID.",
  category: "chat",
  settings: {
    sort: setting.select({
      label: "Sort online users",
      options: (Object.keys(SORTS) as SortId[]).map((value) => ({
        value,
        label: SORTS[value].label,
      })),
      default: "name-asc",
    }),
  },
  setup({ settings, userList }) {
    settings.watch(({ sort }) => userList.sortBy(SORTS[sort].order));
    userList.addTools((tools) => (
      <UserListTools
        tools={tools}
        sort={settings.get().sort}
        onSort={(sort) => settings.set("sort", sort)}
      />
    ));
  },
});
