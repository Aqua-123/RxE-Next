import { Undo02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useId, useState } from "react";
import { alphaOf, type Hex, isHex, opaquePart, parseColor, toHex } from "@/themes/color";
import { Button } from "@/ui/components/ui/button";
import { Input } from "@/ui/components/ui/input";

interface ColorFieldProps {
  label: string;
  /** Token whose live value the swatch shows. */
  swatchToken: string;
  value: Hex;
  onChange(value: Hex): void;
  /** Shown when the value overrides the base; clears the override. */
  onReset?: () => void;
}

export function ColorField({ label, swatchToken, value, onChange, onReset }: ColorFieldProps) {
  const id = useId();
  const [text, setText] = useState<string>(value);
  useEffect(() => setText(value), [value]);

  const commitText = () => {
    if (isHex(text)) onChange(text.toLowerCase() as Hex);
    else setText(value);
  };
  /** The native picker has no alpha channel; keep the current alpha. */
  const pick = (picked: string) => {
    const rgba = parseColor(picked);
    if (rgba) onChange(toHex({ ...rgba, a: alphaOf(value) }));
  };

  return (
    <div className="flex items-center gap-3">
      <label
        data-swatch={swatchToken}
        className="relative size-8 shrink-0 cursor-pointer rounded-md border border-input shadow-xs transition-shadow focus-within:ring-3 focus-within:ring-ring/50"
      >
        <span className="sr-only">Pick {label}</span>
        <input
          type="color"
          className="sr-only"
          value={opaquePart(value)}
          onChange={(event) => pick(event.currentTarget.value)}
        />
      </label>
      <label htmlFor={id} className="min-w-0 flex-1 truncate text-sm">
        {label}
      </label>
      <Input
        id={id}
        value={text}
        spellCheck={false}
        className="h-8 w-28 font-mono text-xs"
        onChange={(event) => setText(event.currentTarget.value)}
        onBlur={commitText}
        onKeyDown={(event) => event.key === "Enter" && commitText()}
      />
      {onReset ? (
        <Button variant="ghost" size="icon-sm" onClick={onReset} aria-label={`Reset ${label}`}>
          <HugeiconsIcon icon={Undo02Icon} />
        </Button>
      ) : (
        <span aria-hidden className="size-7 shrink-0" />
      )}
    </div>
  );
}
