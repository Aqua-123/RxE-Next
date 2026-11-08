import {
  BubbleChatIcon,
  Database01Icon,
  PaintBoardIcon,
  PaintBrush02Icon,
  Shield01Icon,
  UserCircleIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import type { ReactNode } from "react";
import { useStore } from "zustand";
import { environmentStore } from "@/core/runtime";
import { META } from "@/meta";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/ui/components/ui/dialog";
import { ScrollArea } from "@/ui/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/components/ui/tabs";
import { BackupTab } from "./BackupTab";
import { FeatureList } from "./FeatureList";
import { type SettingsTab, setSettingsOpen, setSettingsTab, settingsPanel } from "./state";
import { ThemesTab } from "./themes/ThemesTab";

interface TabDefinition {
  id: SettingsTab;
  label: string;
  description: string;
  icon: IconSvgElement;
  content: ReactNode;
  modOnly?: boolean;
}

const TABS: readonly TabDefinition[] = [
  {
    id: "chat",
    label: "Chat",
    description: "How messages look and who you hear from.",
    icon: BubbleChatIcon,
    content: <FeatureList category="chat" />,
  },
  {
    id: "appearance",
    label: "Appearance",
    description: "Visual changes around the site.",
    icon: PaintBrush02Icon,
    content: <FeatureList category="appearance" />,
  },
  {
    id: "profiles",
    label: "Profiles",
    description: "Profiles and user cards.",
    icon: UserCircleIcon,
    content: <FeatureList category="profiles" />,
  },
  {
    id: "moderation",
    label: "Moderation",
    description: "Tools for moderators.",
    icon: Shield01Icon,
    content: <FeatureList category="moderation" />,
    modOnly: true,
  },
  {
    id: "themes",
    label: "Themes",
    description: "Recolor EmeraldChat and RxE.",
    icon: PaintBoardIcon,
    content: <ThemesTab />,
  },
  {
    id: "backup",
    label: "Backup",
    description: "Export, restore or reset RxE.",
    icon: Database01Icon,
    content: <BackupTab />,
  },
];

export function SettingsPanel() {
  const { open, tab } = useStore(settingsPanel);
  const isMod = useStore(environmentStore, (env) => env.user?.isMod ?? false);
  const tabs = TABS.filter((definition) => !definition.modOnly || isMod);
  const current = tabs.find((definition) => definition.id === tab) ?? tabs[0]!;

  return (
    <Dialog open={open} onOpenChange={setSettingsOpen}>
      <DialogContent className="h-[min(720px,88vh)] gap-0 overflow-hidden p-0 sm:max-w-4xl">
        <Tabs
          orientation="vertical"
          value={current.id}
          onValueChange={(next) => setSettingsTab(next as SettingsTab)}
          className="grid h-full min-h-0 grid-cols-[13rem_1fr] gap-0"
        >
          <aside className="flex min-h-0 flex-col gap-4 border-r border-border bg-muted p-3">
            <div className="flex flex-col gap-0.5 px-2 pt-1">
              <DialogTitle className="text-lg font-bold">
                <span className="text-shimmer">RxE</span> Settings
              </DialogTitle>
              <DialogDescription className="text-xs">v{META.version}</DialogDescription>
            </div>
            <TabsList variant="line" className="w-full items-stretch gap-0.5">
              {tabs.map((definition) => (
                <TabsTrigger
                  key={definition.id}
                  value={definition.id}
                  className="h-9 justify-start gap-2.5 rounded-lg px-2.5 data-active:bg-accent data-active:text-foreground"
                >
                  <HugeiconsIcon icon={definition.icon} />
                  {definition.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </aside>
          <div className="flex min-h-0 flex-col">
            <header className="border-b border-border px-6 pt-5 pb-4 pr-14">
              <h2 className="text-base font-semibold">{current.label}</h2>
              <p className="text-sm text-muted-foreground">{current.description}</p>
            </header>
            <ScrollArea className="min-h-0 flex-1">
              {tabs.map((definition) => (
                <TabsContent key={definition.id} value={definition.id} className="p-6">
                  {definition.content}
                </TabsContent>
              ))}
            </ScrollArea>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
