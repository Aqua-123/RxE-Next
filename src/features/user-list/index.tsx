import { defineFeature } from "@/core/feature";
import { setting } from "@/core/settings";
import { SORTS, type SortId } from "./sorts";
import { UserListTools } from "./UserListTools";

export default defineFeature({
  id: "user-list",
  name: "Online list tools",
  description:
    "Sort and search group chat's online list, and open anyone's profile by their user ID.",
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
    const search = (query: string) => {
      const needle = query.trim().toLowerCase();
      userList.filterBy(
        needle
          ? (user) =>
              user.name.toLowerCase().includes(needle) ||
              user.username.toLowerCase().includes(needle)
          : null
      );
    };
    userList.addTools((tools) => (
      <UserListTools
        tools={tools}
        sort={settings.get().sort}
        onSort={(sort) => settings.set("sort", sort)}
        onSearch={search}
      />
    ));
  },
});
