/**
 * Optional tabs behavior. Call initComponents(container) after inserting markup.
 * Expected hooks: [data-sg-tabs], [role=tablist], [role=tab] with aria-controls,
 * and matching [role=tabpanel] IDs. Native details/summary need no JavaScript.
 */
export function initComponents(root = document) {
  root.querySelectorAll('[data-sg-tabs]').forEach(group => {
    if (group.dataset.sgReady) return;
    group.dataset.sgReady = 'true';
    const tabs = [...group.querySelectorAll('[role="tab"]')].filter(tab => tab.closest('[data-sg-tabs]') === group);
    const activate = (tab, focus = false) => {
      tabs.forEach(item => {
        const selected = item === tab;
        item.setAttribute('aria-selected', String(selected));
        item.tabIndex = selected ? 0 : -1;
        const panel = item.ownerDocument.getElementById(item.getAttribute('aria-controls'));
        if (panel && group.contains(panel)) panel.hidden = !selected;
      });
      if (focus) tab.focus();
    };
    tabs.forEach((tab,index) => {
      tab.addEventListener('click', () => activate(tab));
      tab.addEventListener('keydown', event => {
        const rtl = getComputedStyle(group).direction === 'rtl';
        let next;
        if (event.key === 'Home') next = 0;
        if (event.key === 'End') next = tabs.length - 1;
        if (event.key === 'ArrowRight') next = (index + (rtl ? -1 : 1) + tabs.length) % tabs.length;
        if (event.key === 'ArrowLeft') next = (index + (rtl ? 1 : -1) + tabs.length) % tabs.length;
        if (next !== undefined) { event.preventDefault(); activate(tabs[next], true); }
      });
    });
    if (tabs.length) activate(tabs.find(tab => tab.getAttribute('aria-selected') === 'true') || tabs[0]);
  });
}

