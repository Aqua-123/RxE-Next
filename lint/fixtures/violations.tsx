// Every line below must be reported. Checked by test/lint.test.ts.
export const InlineStyle = () => <div style={{ display: "flex" }} />;
export const StyleWrite = (el: HTMLElement) => { el.style.display = "contents"; };
export const StyleAttr = (el: HTMLElement) => el.setAttribute("style", "x");
export const Hex = "#262834";
export const Fn = `oklch(1 0 0)`;
export const ArbitraryClass = () => <div className="bg-[#fff]" />;
export const ArbitraryVar = "hover:bg-[var(--base1-700)]";
export const Palette = "text-white";
export const Portal = () => <Popover.Portal><div /></Popover.Portal>;
