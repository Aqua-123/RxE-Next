/** `.name` → text. `.shrug rest` sends `rest ¯\_(ツ)_/¯`, like Discord. */
export const COMMANDS: Readonly<Record<string, string>> = {
  shrug: "¯\\_(ツ)_/¯",
  tableflip: "(╯°□°）╯︵ ┻━┻",
  tableflip2: "(ノಠ益ಠ)ノ彡┻━┻",
  unflip: "┬──┬ ノ( ゜-゜ノ)",
  out: "----------------------> 🚪",
};

/** Returns the expanded message, or null when `text` isn't a command. */
export function expandCommand(text: string): string | null {
  const match = /^\.(\w+)(?:\s+([\s\S]*))?$/.exec(text.trim());
  if (!match) return null;
  const expansion = Object.hasOwn(COMMANDS, match[1]!) ? COMMANDS[match[1]!] : undefined;
  if (expansion === undefined) return null;
  const rest = match[2]?.trim();
  return rest ? `${rest} ${expansion}` : expansion;
}
