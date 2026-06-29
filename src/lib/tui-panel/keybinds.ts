function isTypingTarget(el: Element | null): boolean {
  if (!el) return false;
  if (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT") return true;
  return (el as HTMLElement).isContentEditable;
}

function shortcuts(): { panel: HTMLElement; key: string }[] {
  return [...document.querySelectorAll<HTMLElement>("[data-tui-shortcut]")].map((panel) => ({
    panel,
    key: panel.dataset.tuiShortcut!.toLowerCase(),
  }));
}

let buffer = "";
let resetTimer: ReturnType<typeof setTimeout> | undefined;
let pendingFire: ReturnType<typeof setTimeout> | undefined;

// module is cached by the bundler, so this listener is only ever attached once
document.addEventListener("keydown", (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(document.activeElement)) return;
  if (e.key.length !== 1) return; // ignore Shift, Tab, arrows, etc.

  clearTimeout(resetTimer);
  clearTimeout(pendingFire);

  const key = e.key.toLowerCase();
  let candidate = buffer + key;
  let matches = shortcuts().filter((s) => s.key.startsWith(candidate));
  if (matches.length === 0) {
    // not extending any known chord, start a fresh one from this key
    candidate = key;
    matches = shortcuts().filter((s) => s.key.startsWith(candidate));
  }
  buffer = candidate;
  resetTimer = setTimeout(() => (buffer = ""), 600);

  const exact = matches.find((s) => s.key === candidate);
  if (!exact) return; // partial chord (e.g. "p" while "Pr" exists), keep buffering

  e.preventDefault();
  const fire = () => {
    exact.panel.focus();
    buffer = "";
  };
  // if a longer shortcut also starts with this chord, give it a moment to be completed
  if (matches.some((s) => s.key.length > candidate.length)) {
    pendingFire = setTimeout(fire, 350);
  } else {
    fire();
  }
});
