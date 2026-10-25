// Runs INSIDE the browser (plain JS — see read-form.js for why).
// Scores every visible interactive element's accessible name against a
// plain-language description and stamps the best match with data-smart-id.
({ query, role, stampId }) => {
  const SELECTOR = 'button, a, input, textarea, select, [role=button], [role=link], [role=radio], [role=checkbox], [role=tab], [role=textbox]';
  const ROLE_OF = (el) => el.getAttribute('role')
    || (el.tagName === 'A' ? 'link'
      : el.tagName === 'BUTTON' ? 'button'
      : el.tagName === 'SELECT' ? 'combobox'
      : (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') ? 'textbox' : '');
  const norm = (s) => (s || '').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
  const dice = (a, b) => {
    if (a === b) return 1;
    if (a.length < 2 || b.length < 2) return 0;
    const grams = (s) => { const m = new Map(); for (let i = 0; i < s.length - 1; i++) { const g = s.slice(i, i + 2); m.set(g, (m.get(g) || 0) + 1); } return m; };
    const ga = grams(a); const gb = grams(b); let overlap = 0;
    for (const [g, n] of ga) overlap += Math.min(n, gb.get(g) || 0);
    return (2 * overlap) / (a.length + b.length - 2);
  };
  const visible = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const q = norm(query);

  let best = null;
  for (const el of document.querySelectorAll(SELECTOR)) {
    if (!visible(el)) continue;
    const elRole = ROLE_OF(el);
    const names = [el.getAttribute('aria-label'), el.getAttribute('placeholder'), el.innerText, el.getAttribute('title'), el.getAttribute('data-testid')]
      .map(norm).filter(Boolean);
    let score = Math.max(0, ...names.map((n) => Math.max(dice(q, n), n.includes(q) || q.includes(n) ? 0.85 : 0)));
    if (role && elRole === role) score += 0.1; // the role the description asked for
    if (!best || score > best.score) best = { el, score, name: names[0] || '', role: elRole };
  }
  if (!best) return null;
  best.el.setAttribute('data-smart-id', stampId);
  return { score: Math.round(Math.min(best.score, 1) * 100) / 100, name: best.name, role: best.role };
}
