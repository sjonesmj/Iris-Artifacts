const toggle = document.querySelector('[data-nav-toggle]');
const links = document.querySelector('[data-nav-links]');
if (toggle && links) {
  toggle.addEventListener('click', () => {
    const isOpen = links.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(isOpen));
  });
  links.addEventListener('click', (event) => {
    if (event.target.matches('a')) {
      links.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });
}

document.querySelectorAll('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });

// Budget tracker: saves only to this browser's localStorage.
(() => {
  const app = document.querySelector('[data-budget-app]');
  if (!app) return;

  const storageKey = 'iris-budget-lines-v1';
  const form = app.querySelector('[data-budget-form]');
  const linesEl = app.querySelector('[data-budget-lines]');
  const emptyEl = app.querySelector('[data-budget-empty]');
  const monthLabel = app.querySelector('[data-budget-month-label]');
  const reset = app.querySelector('[data-budget-reset]');
  const totals = {
    income: app.querySelector('[data-budget-total="income"]'),
    planned: app.querySelector('[data-budget-total="planned"]'),
    actual: app.querySelector('[data-budget-total="actual"]'),
    left: app.querySelector('[data-budget-total="left"]')
  };
  const fmt = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' });
  const today = new Date();
  form.month.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  let entries = [];
  try { entries = JSON.parse(localStorage.getItem(storageKey) || '[]'); } catch { entries = []; }

  const money = (value) => Number.parseFloat(value || '0') || 0;
  const save = () => localStorage.setItem(storageKey, JSON.stringify(entries));
  const currentMonth = () => form.month.value;

  function render() {
    const month = currentMonth();
    const monthEntries = entries.filter((entry) => entry.month === month);
    const income = monthEntries.filter((entry) => entry.type === 'income').reduce((sum, entry) => sum + money(entry.actual || entry.planned), 0);
    const plannedExpenses = monthEntries.filter((entry) => entry.type === 'expense').reduce((sum, entry) => sum + money(entry.planned), 0);
    const actualExpenses = monthEntries.filter((entry) => entry.type === 'expense').reduce((sum, entry) => sum + money(entry.actual), 0);
    totals.income.textContent = fmt.format(income);
    totals.planned.textContent = fmt.format(plannedExpenses);
    totals.actual.textContent = fmt.format(actualExpenses);
    totals.left.textContent = fmt.format(income - actualExpenses);
    monthLabel.textContent = monthEntries.length ? `${monthEntries.length} line${monthEntries.length === 1 ? '' : 's'} for ${month}.` : `No entries for ${month} yet.`;
    emptyEl.hidden = monthEntries.length > 0;
    linesEl.innerHTML = monthEntries.map((entry) => {
      const planned = fmt.format(money(entry.planned));
      const actual = fmt.format(money(entry.actual));
      const kind = entry.type === 'income' ? 'income' : 'expense';
      return `<article class="budget-line">
        <div><div class="budget-line-title"><span class="badge ${kind}">${kind}</span>${escapeHtml(entry.category)}</div>
        <div class="budget-line-meta">${escapeHtml(entry.note || 'No note')}</div></div>
        <div class="budget-money"><span>planned ${planned}</span>${actual}<button class="icon-button" type="button" data-delete-entry="${entry.id}" aria-label="Delete ${escapeHtml(entry.category)}">Delete</button></div>
      </article>`;
    }).join('');
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(form);
    entries.push({
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      month: data.get('month'),
      type: data.get('type'),
      category: data.get('category'),
      planned: data.get('planned'),
      actual: data.get('actual'),
      note: data.get('note')
    });
    const month = form.month.value;
    form.reset();
    form.month.value = month;
    save();
    render();
  });

  form.month.addEventListener('change', render);
  linesEl.addEventListener('click', (event) => {
    const button = event.target.closest('[data-delete-entry]');
    if (!button) return;
    entries = entries.filter((entry) => entry.id !== button.dataset.deleteEntry);
    save();
    render();
  });
  reset.addEventListener('click', () => {
    const month = currentMonth();
    if (!confirm(`Delete all budget lines for ${month}?`)) return;
    entries = entries.filter((entry) => entry.month !== month);
    save();
    render();
  });
  render();
})();

