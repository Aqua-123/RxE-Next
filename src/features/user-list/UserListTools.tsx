import { UserSearch01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";
import type { UserId } from "@/site/model";
import type { UserListTools as Tools } from "@/site/surfaces/userList";
import { Button } from "@/ui/components/ui/button";
import { Input } from "@/ui/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/ui/components/ui/select";
import { SORTS, type SortId } from "./sorts";

/** A user ID, or a profile link with one in it. */
export function parseUserId(text: string): UserId | null {
  const match = /\d{1,12}/.exec(text.trim());
  const id = match ? Number(match[0]) : 0;
  return id > 0 ? (id as UserId) : null;
}

interface Props {
  tools: Tools;
  sort: SortId;
  onSort(sort: SortId): void;
  /** Called as you type; a user ID filters nothing. */
  onSearch(query: string): void;
}

export function UserListTools({ tools, sort, onSort, onSearch }: Props) {
  const [text, setText] = useState("");
  const [invalid, setInvalid] = useState(false);

  const open = () => {
    const id = parseUserId(text);
    setInvalid(id === null);
    if (id === null) return;
    tools.openProfile(id);
    setText("");
    onSearch("");
  };
  const isId = /^\s*\d+\s*$/.test(text) || /[?&]id=\d+/.test(text);

  return (
    <div className="flex flex-col gap-2 py-2">
      <Select value={sort} onValueChange={(value) => onSort(value as SortId)}>
        <SelectTrigger size="sm" aria-label="Sort online users" className="w-full">
          <SelectValue>{SORTS[sort].label}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(SORTS) as SortId[]).map((id) => (
            <SelectItem key={id} value={id}>
              {SORTS[id].label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <form
        className="flex gap-1.5"
        onSubmit={(event) => {
          event.preventDefault();
          open();
        }}
      >
        <Input
          value={text}
          onChange={(event) => {
            const value = event.target.value;
            setText(value);
            setInvalid(false);
            const id = /^\s*\d+\s*$/.test(value) || /[?&]id=\d+/.test(value);
            onSearch(id ? "" : value);
          }}
          type="search"
          placeholder="Search or user ID"
          aria-label="Search the online list, or enter a user ID to open their profile"
          aria-invalid={invalid || undefined}
          className="h-7 min-w-0 flex-1 text-xs"
        />
        <Button
          type="submit"
          size="icon-sm"
          variant={isId ? "default" : "secondary"}
          aria-label="Open profile"
          title="Open the profile with this user ID"
        >
          <HugeiconsIcon icon={UserSearch01Icon} />
        </Button>
      </form>
    </div>
  );
}
