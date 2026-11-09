import type { ReactNode } from "react";
import type { Scope } from "@/core/scope";
import { injectStyle, watch } from "@/platform/dom";
import { mount } from "@/ui/mount";

/** The header's icon buttons, labelled by `aria-label` ("0 Notifications") except the volume control. */
const HEADER_ICONS = '[class*="Layout_profile-container__"] button.btn-basic[aria-label]';
const VOLUME_CONTROL = '[class*="Layout_profile-container__"] label[translate="no"]';
/** The left navigation drawer's list: Dashboard, Meet, Friends, Messages, Search, then a rule. */
const NAV_LIST = "#nav ul:has(> li > a[href='/app/'])";
/** The dashboard (/app) is three cards: Meet, Profile, Settings. */
const DASHBOARD = '#main-content:has(> section[class*="app-page_profile-section"])';
const SUPPORT_REASON = 'input[placeholder="reason"]';
const POPUP_CLOSE = ".EmeraldPopupContainer .closePopupBtn";

/** Each fix returns a function that undoes it; stopping the feature undoes it too. */
export interface ChromeApi {
  /** Tooltips on the header's unlabelled icon buttons. */
  headerTooltips(): () => void;
  /** Bigger touch targets for the header icons on small screens. */
  largerHeaderTargets(): () => void;
  /** Turns the popup's detached "Close" text into a clear button under the card. */
  clearPopupClose(): () => void;
  /** A helpful placeholder for the support form's reason field. */
  clearerSupportForm(): () => void;
  /** Keeps the browser tab's title at `title`, even as the site changes it on navigation. */
  tabTitle(title: string): () => void;
  /** Replaces the browser tab's icon with `href` while registered. */
  tabIcon(href: string): () => void;
  /** Adds an item at the end of the navigation drawer's list. */
  addNavItem(render: () => ReactNode): void;
  /** Adds a full-width section under the dashboard's cards. */
  addDashboardSection(render: () => ReactNode): void;
}

/** The site's labels, made clearer: "0 Notifications" → "Notifications", "Menu" → "Account". */
const TOOLTIPS: Record<string, string> = { "Friend Feeds": "Friend feed", Menu: "Account" };
function tooltipFor(label: string): string {
  const name = label.replace(/^\d+\s+/, "");
  return TOOLTIPS[name] ?? name;
}

const HEADER_TARGETS_CSS = `@media(max-width:992px){
${HEADER_ICONS},${VOLUME_CONTROL}{min-width:40px;min-height:40px;display:inline-flex;align-items:center;justify-content:center}
}`;

const POPUP_CLOSE_CSS = `${POPUP_CLOSE}{display:flex;justify-content:center;margin-top:12px}
${POPUP_CLOSE}>button{background:var(--base1-500);color:var(--primary-content);border-radius:999px;padding:8px 22px;font-weight:700}
${POPUP_CLOSE}>button:hover{background:var(--base1-450)}`;

function setAttribute(element: Element, name: string, value: string): () => void {
  const previous = element.getAttribute(name);
  element.setAttribute(name, value);
  return () => {
    if (previous === null) element.removeAttribute(name);
    else element.setAttribute(name, previous);
  };
}

export function scopedChrome(scope: Scope): ChromeApi {
  const own = (undo: () => void) => {
    scope.add(undo);
    return undo;
  };
  return {
    headerTooltips() {
      const stopIcons = watch(HEADER_ICONS, (button) =>
        setAttribute(button, "title", tooltipFor(button.getAttribute("aria-label") ?? ""))
      );
      const stopVolume = watch(VOLUME_CONTROL, (label) => setAttribute(label, "title", "Volume"));
      return own(() => {
        stopIcons();
        stopVolume();
      });
    },
    largerHeaderTargets: () =>
      own(injectStyle(`chrome:header-targets:${scope.owner}`, HEADER_TARGETS_CSS)),
    clearPopupClose: () => own(injectStyle(`chrome:popup-close:${scope.owner}`, POPUP_CLOSE_CSS)),
    clearerSupportForm: () =>
      own(
        watch(SUPPORT_REASON, (input) =>
          setAttribute(input, "placeholder", "What do you need help with?")
        )
      ),
    tabTitle(title) {
      const original = document.title;
      const apply = () => {
        if (document.title !== title) document.title = title;
      };
      apply();
      // Next.js rewrites <title> (or swaps the element) on every navigation.
      const observer = new MutationObserver(apply);
      observer.observe(document.head, { childList: true, subtree: true, characterData: true });
      return own(() => {
        observer.disconnect();
        document.title = original;
      });
    },
    tabIcon(href) {
      const ours = document.createElement("link");
      ours.rel = "icon";
      ours.href = href;
      // The site's icons are hidden rather than removed, so stopping can put them back.
      const theirs = new Map<HTMLLinkElement, string>();
      const apply = () => {
        for (const link of document.head.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]')) {
          if (link === ours || theirs.has(link)) continue;
          theirs.set(link, link.rel);
          link.rel = "rxe-hidden-icon";
        }
        if (ours.parentNode !== document.head) document.head.prepend(ours);
      };
      apply();
      const observer = new MutationObserver(apply);
      observer.observe(document.head, { childList: true });
      return own(() => {
        observer.disconnect();
        ours.remove();
        for (const [link, rel] of theirs) link.rel = rel;
      });
    },
    addNavItem(render) {
      scope.add(
        watch(NAV_LIST, (list) => {
          const rule = list.querySelector(":scope > hr");
          return rule ? mount(render(), rule, "before") : mount(render(), list, "append");
        })
      );
    },
    addDashboardSection(render) {
      scope.add(watch(DASHBOARD, (main) => mount(render(), main, "append")));
    },
  };
}
