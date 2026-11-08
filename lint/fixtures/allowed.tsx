// Nothing here may be reported. Checked by test/lint.test.ts.
export const Tokens = () => <div className="bg-card text-primary hover:bg-muted" />;
export const Anchor = "#messages";
export const Portal = (c: ShadowRoot) => <Popover.Portal container={c}><div /></Popover.Portal>;
declare const Popover: { Portal: (props: { container?: ShadowRoot; children: unknown }) => null };
