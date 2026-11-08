import { useState } from "react";
import type { Inline } from "./parse";

function Spoiler({ children }: { children: Inline[] }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <button
      type="button"
      aria-label={revealed ? undefined : "Spoiler, click to reveal"}
      aria-pressed={revealed}
      onClick={() => setRevealed(true)}
      className={
        revealed
          ? "cursor-text rounded-sm bg-muted px-0.5"
          : "cursor-pointer rounded-sm bg-foreground px-0.5 text-transparent transition-colors hover:bg-muted-foreground"
      }
    >
      <InlineNodes nodes={children} />
    </button>
  );
}

function InlineNode({ node }: { node: Inline }) {
  switch (node.type) {
    case "text":
      return node.value;
    case "bold":
      return (
        <strong className="font-bold">
          <InlineNodes nodes={node.children} />
        </strong>
      );
    case "italic":
      return (
        <em className="italic">
          <InlineNodes nodes={node.children} />
        </em>
      );
    case "underline":
      return (
        <span className="underline underline-offset-2">
          <InlineNodes nodes={node.children} />
        </span>
      );
    case "strike":
      return (
        <s className="line-through">
          <InlineNodes nodes={node.children} />
        </s>
      );
    case "spoiler":
      return <Spoiler>{node.children}</Spoiler>;
    case "code":
      return (
        <code className="rounded-sm bg-muted px-1 py-px font-mono text-[0.9em]">{node.value}</code>
      );
    case "link":
      return (
        <a
          href={node.href}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="break-all text-link underline-offset-2 hover:underline"
        >
          {node.href}
        </a>
      );
    case "mention":
      return (
        <mark className="rounded-sm bg-mention px-0.5 text-mention-foreground">{node.value}</mark>
      );
  }
}

function InlineNodes({ nodes }: { nodes: readonly Inline[] }) {
  return nodes.map((node, index) => (
    // biome-ignore lint/suspicious/noArrayIndexKey: parsed nodes have no identity; the list is rebuilt per message.
    <InlineNode key={index} node={node} />
  ));
}

export function RichText({ nodes }: { nodes: readonly Inline[] }) {
  return (
    <span className="whitespace-pre-wrap break-words">
      <InlineNodes nodes={nodes} />
    </span>
  );
}

export function BigEmoji({ text }: { text: string }) {
  return <span className="text-4xl leading-tight">{text}</span>;
}
