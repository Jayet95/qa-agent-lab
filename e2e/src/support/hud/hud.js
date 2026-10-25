// Injected into every page when tests run headed (HEADED=1). Plain JS —
// it runs in the browser. Lives in a CLOSED shadow root so test locators,
// the DOM reader and smart find can never see or click it.
(() => {
  if (window.top !== window) return;

  const mount = () => {
    if (document.getElementById('qa-hud-host')) return;
    const host = document.createElement('div');
    host.id = 'qa-hud-host';
    host.style.cssText = 'position:fixed;top:12px;right:12px;z-index:2147483647;';
    const root = host.attachShadow({ mode: 'closed' });
    root.innerHTML = `
      <style>
        .hud { font: 12px/1.4 system-ui, sans-serif; width: 300px; color: #e2e8f0;
               background: rgba(17, 12, 38, .94); border: 1px solid #6d28d9; border-radius: 12px;
               box-shadow: 0 12px 30px rgba(0,0,0,.4); overflow: hidden; }
        .bar { display: flex; align-items: center; gap: 8px; padding: 8px 10px; background: #2e1065; cursor: move; }
        .title { font-weight: 800; flex: 1; letter-spacing: .02em; }
        .status { font-weight: 700; padding: 1px 8px; border-radius: 999px; background: #065f46; color: #a7f3d0; }
        .status.paused { background: #92400e; color: #fde68a; }
        .status.stopped { background: #7f1d1d; color: #fecaca; }
        .body { padding: 9px 10px; }
        .scenario { font-weight: 700; color: #f5f3ff; margin-bottom: 4px; }
        .step { color: #c4b5fd; min-height: 34px; }
        .progress { height: 4px; background: #312e81; border-radius: 4px; margin: 7px 0; overflow: hidden; }
        .progress > i { display: block; height: 100%; width: 0; background: linear-gradient(90deg,#a855f7,#38bdf8); transition: width .2s; }
        .counts { color: #94a3b8; margin-bottom: 8px; }
        .counts b.ok { color: #4ade80; } .counts b.bad { color: #f87171; }
        .btns { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
        button { font: inherit; font-weight: 700; color: #f5f3ff; background: #4c1d95; border: 1px solid #7c3aed;
                 border-radius: 8px; padding: 6px 0; cursor: pointer; }
        button:hover { background: #6d28d9; }
        button.stop { background: #7f1d1d; border-color: #b91c1c; }
        .min .body { display: none; }
        .keys { color: #64748b; font-size: 11px; margin-top: 6px; }
      </style>
      <div class="hud">
        <div class="bar"><span class="title">🧪 QA Agent Lab</span><span class="status" id="status">running</span>
          <button id="min" title="Minimise" style="padding:0 6px">–</button></div>
        <div class="body">
          <div class="scenario" id="scenario">Waiting for a scenario…</div>
          <div class="step" id="step"></div>
          <div class="progress"><i id="bar"></i></div>
          <div class="counts" id="counts"></div>
          <div class="btns">
            <button id="toggle" title="Pause / resume (F8)">⏸ Pause</button>
            <button id="step-btn" title="Run one step, then pause (F10)">⏭ Step</button>
            <button id="inspect" title="Open the Playwright inspector">🔍 Inspect</button>
            <button id="stop" class="stop" title="Stop the run">⏹ Stop</button>
          </div>
          <div class="keys">F8 pause/resume · F10 step · pauses between steps; Inspect steps through actions</div>
        </div>
      </div>`;
    document.documentElement.appendChild(host);

    const $ = (sel) => root.querySelector(sel);
    const render = (s) => {
      if (!s) return;
      $('#scenario').textContent = s.scenario || 'Waiting for a scenario…';
      $('#step').textContent = s.step ? `${s.index}/${s.total} · ${s.step}` : '';
      $('#bar').style.width = s.total ? `${Math.round((s.index / s.total) * 100)}%` : '0';
      $('#counts').innerHTML = `Scenarios: <b class="ok">${s.passed} passed</b> · <b class="bad">${s.failed} failed</b>`;
      const label = s.stopped ? 'stopped' : s.paused ? 'paused' : 'running';
      $('#status').textContent = label;
      $('#status').className = `status ${label}`;
      $('#toggle').textContent = s.paused ? '▶ Resume' : '⏸ Pause';
    };
    const send = async (action) => {
      try { render(await window.__qaHud(action)); } catch { /* page closing */ }
    };

    $('#toggle').onclick = () => send('toggle');
    $('#step-btn').onclick = () => send('step');
    $('#inspect').onclick = () => send('inspect');
    $('#stop').onclick = () => send('stop');
    $('#min').onclick = () => $('.hud').classList.toggle('min');
    document.addEventListener('keydown', (e) => {
      if (e.key === 'F8') { e.preventDefault(); send('toggle'); }
      if (e.key === 'F10') { e.preventDefault(); send('step'); }
    }, true);

    // Drag by the title bar.
    let drag = null;
    $('.bar').addEventListener('mousedown', (e) => { drag = { x: e.clientX - host.offsetLeft, y: e.clientY - host.offsetTop }; });
    document.addEventListener('mousemove', (e) => {
      if (!drag) return;
      host.style.left = `${e.clientX - drag.x}px`; host.style.top = `${e.clientY - drag.y}px`; host.style.right = 'auto';
    });
    document.addEventListener('mouseup', () => { drag = null; });

    window.__qaHudRender = render;
    send('sync');
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
