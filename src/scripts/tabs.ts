// WAI-ARIA tabs with automatic activation.
// Markup: [data-tabs] > [data-tablist][hidden] > [data-tab="<id>"], plus [data-panel="<id>"] per tab.

export function initTabs(root: HTMLElement): void {
  const tablist = root.querySelector<HTMLElement>('[data-tablist]');
  const tabs = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-tab]'));
  if (!tablist || tabs.length === 0) return;

  const select = (tab: HTMLButtonElement, focus = false) => {
    const id = tab.dataset.tab;
    for (const t of tabs) {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
    }
    root.querySelectorAll<HTMLElement>('[data-panel]').forEach((el) => {
      el.hidden = el.dataset.panel !== id;
    });
    if (focus) tab.focus();
  };

  tablist.hidden = false;
  if (tabs.length === 1) tablist.hidden = true;
  select(tabs.find((t) => t.getAttribute('aria-selected') === 'true') ?? tabs[0]);

  tablist.addEventListener('click', (e) => {
    const tab = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-tab]');
    if (tab) select(tab);
  });

  tablist.addEventListener('keydown', (e) => {
    const i = tabs.indexOf(document.activeElement as HTMLButtonElement);
    if (i < 0) return;
    let next: number | undefined;
    if (e.key === 'ArrowRight') next = (i + 1) % tabs.length;
    else if (e.key === 'ArrowLeft') next = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = tabs.length - 1;
    if (next === undefined) return;
    e.preventDefault();
    select(tabs[next], true);
  });
}
