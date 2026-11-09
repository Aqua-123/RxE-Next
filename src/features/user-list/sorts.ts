import type { User } from "@/site/model";

const byName = (a: User, b: User) =>
  a.name.localeCompare(b.name, undefined, { sensitivity: "base", numeric: true });

/** Accounts without a creation date sort last either way. */
const age = (user: User) => user.createdAt?.getTime() ?? Number.NaN;
const byAge = (direction: 1 | -1) => (a: User, b: User) => {
  const left = age(a);
  const right = age(b);
  if (Number.isNaN(left) || Number.isNaN(right)) return Number.isNaN(left) ? 1 : -1;
  return (left - right) * direction;
};

export const SORTS = {
  site: { label: "Site order", order: null },
  "name-asc": { label: "Name, A to Z", order: byName },
  "name-desc": { label: "Name, Z to A", order: (a: User, b: User) => byName(b, a) },
  newest: { label: "Newest accounts first", order: byAge(-1) },
  oldest: { label: "Oldest accounts first", order: byAge(1) },
  karma: { label: "Most karma first", order: (a: User, b: User) => b.karma - a.karma },
} as const;

export type SortId = keyof typeof SORTS;
