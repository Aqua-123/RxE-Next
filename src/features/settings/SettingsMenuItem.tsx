/** Sits in the site's account dropdown; matches its items (`.menuItem > button`) with the RxE shimmer. */
export function SettingsMenuItem({ onSelect }: { onSelect(): void }) {
  return (
    <div role="none" className="cursor-pointer transition-colors duration-300 hover:bg-accent">
      <button
        type="button"
        role="menuitem"
        onClick={onSelect}
        className="group flex w-full cursor-pointer items-center p-2.5 text-start text-base leading-[normal] font-bold outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
      >
        <span className="text-shimmer transition-[filter] duration-150 group-hover:drop-shadow-glow">
          RxE Settings
        </span>
      </button>
    </div>
  );
}
