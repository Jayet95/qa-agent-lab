// Runs INSIDE the browser via page.evaluate. Plain JS on purpose: the TS
// toolchain (esbuild) injects helpers like __name() that don't exist in the
// page, so this file is read as text and never transpiled.
() => {
  const CONTROL = 'input:not([type=hidden]), select, textarea, [role=radiogroup]';
  const ANY_CONTROL = 'input, select, textarea, [role=radio], [role=button], button';

  const visible = (el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
  };
  const text = (el) => ((el && el.textContent) || '').replace(/\s+/g, ' ').trim() || null;

  // Visible label that isn't linked to the control: the nearest text-only
  // sibling before it, climbing only while still inside the field's own
  // container (an ancestor holding no other form controls).
  const visualLabel = (el) => {
    let node = el;
    for (let depth = 0; depth < 4 && node.parentElement; depth++) {
      for (let sib = node.previousElementSibling; sib; sib = sib.previousElementSibling) {
        if (sib.querySelectorAll(ANY_CONTROL).length > 0) return null; // reached another field
        const t = text(sib);
        if (t) return t;
      }
      const parent = node.parentElement;
      if (parent.querySelectorAll('input, select, textarea, [role=radiogroup]').length > 1) return null;
      node = parent;
    }
    return null;
  };

  const labelledBy = (el) => {
    const ids = el.getAttribute('aria-labelledby');
    if (!ids) return null;
    return ids.split(/\s+/).map((id) => text(document.getElementById(id))).filter(Boolean).join(' ') || null;
  };
  const forLabel = (el) => {
    const id = el.getAttribute('id');
    const lbl = (id && document.querySelector('label[for="' + CSS.escape(id) + '"]')) || el.closest('label');
    return lbl ? text(lbl) : null;
  };

  const controls = [...document.querySelectorAll(CONTROL)].filter(visible);
  return controls.map((el, i) => {
    const dynId = 'f' + i;
    el.setAttribute('data-dyn-id', dynId);
    const isGroup = el.getAttribute('role') === 'radiogroup' || el.tagName === 'SELECT';
    const type = (el.getAttribute('type') || '').toLowerCase();
    const inputMode = el.getAttribute('inputmode');
    const kind = isGroup ? 'choice'
      : type === 'email' ? 'email'
      : type === 'password' ? 'password'
      : type === 'tel' ? 'tel'
      : type === 'date' ? 'date'
      : (inputMode === 'numeric' || inputMode === 'decimal' || type === 'number') ? 'numeric'
      : 'text';
    const options = el.tagName === 'SELECT'
      ? [...el.options].map((o) => o.text)
      : [...el.querySelectorAll('[role=radio]')].map((o) => o.getAttribute('aria-label') || text(o) || '');
    const maxLength = el.getAttribute('maxlength');
    return {
      dynId,
      kind,
      tag: el.tagName.toLowerCase(),
      ariaLabel: el.getAttribute('aria-label') || labelledBy(el) || forLabel(el),
      visualLabel: visualLabel(el),
      placeholder: el.getAttribute('placeholder'),
      testId: el.getAttribute('data-testid'),
      name: el.getAttribute('name'),
      inputMode,
      maxLength: maxLength ? Number(maxLength) : null,
      options,
    };
  });
}
