(function () {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  function onReady(fn) {
    if (document.readyState === "complete" || document.readyState === "interactive") {
      fn();
    } else {
      document.addEventListener("DOMContentLoaded", fn, { once: true });
    }
  }

  function getApiUrl() {
    var script = document.currentScript;
    var apiBase;

    try {
      if (script && script.src) {
        apiBase = new URL(script.src).origin;
      } else {
        apiBase = window.location.origin;
      }
    } catch (e) {
      apiBase = window.location.origin;
    }

    return apiBase.replace(/\/+$/, "") + "/api/widget/photo-inventory";
  }

  function createRoot(options) {
    var target =
      document.querySelector("[data-moverz-widget-root]") ||
      document.getElementById("moverz-widget-root") ||
      document.body;

    var host = document.createElement("div");
    host.className = "mzw-host";
    target.appendChild(host);

    if (host.attachShadow) {
      var shadow = host.attachShadow({ mode: "open" });
      mountWidget(shadow, options);
    } else {
      mountWidget(host, options);
    }
  }

  function mountWidget(root, options) {
    var apiUrl = options.apiUrl || getApiUrl();

    var style = document.createElement("style");
    style.textContent = [
      ".mzw-root { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif; color: #0f172a; --mzw-deep: 43 122 120; --mzw-spark: 107 207 207; --mzw-navy: 15 23 42; }",
      ".mzw-card { background: #ffffff; border-radius: 20px; padding: 28px 28px 28px; box-shadow: 0 24px 64px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(148, 163, 184, 0.10); color: #0f172a; max-width: 440px; display: flex; flex-direction: column; position: relative; overflow: hidden; }",
      ".mzw-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, rgb(var(--mzw-deep)), rgb(var(--mzw-spark))); opacity: 0.9; }",
      ".mzw-header { margin-bottom: 24px; position: relative; z-index: 1; transition: opacity 0.4s ease, transform 0.4s cubic-bezier(0.16, 1, 0.3, 1); }",
      ".mzw-header.mzw-fade-out { opacity: 0; transform: translateY(-8px); pointer-events: none; }",
      ".mzw-badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 6px; background: rgba(var(--mzw-deep), 0.08); color: rgb(var(--mzw-deep)); font-size: 10px; font-weight: 600; letter-spacing: 0.02em; text-transform: uppercase; }",
      ".mzw-badge-dot { width: 5px; height: 5px; border-radius: 999px; background: rgb(var(--mzw-spark)); opacity: 0.9; animation: mzw-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }",
      ".mzw-title { margin-top: 16px; font-size: 22px; font-weight: 700; line-height: 1.2; background: linear-gradient(135deg, #0f172a 0%, rgb(var(--mzw-deep)) 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; letter-spacing: -0.025em; }",
      ".mzw-subtitle { margin-top: 8px; font-size: 14px; color: #64748b; line-height: 1.5; font-weight: 400; margin-bottom: 24px; }",
      ".mzw-choice-section { margin-top: 0; }",
      ".mzw-choice-title { font-size: 15px; font-weight: 600; color: #0f172a; margin-bottom: 16px; text-align: center; }",
      ".mzw-choice-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }",
      "@media (max-width: 480px) { .mzw-choice-grid { grid-template-columns: 1fr; gap: 10px; } }",
      ".mzw-choice-btn { position: relative; display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 20px 16px; border-radius: 16px; border: 2px solid rgba(148, 163, 184, 0.20); background: #ffffff; cursor: pointer; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); font-family: inherit; }",
      ".mzw-choice-btn:hover { border-color: rgba(var(--mzw-spark), 0.40); transform: translateY(-2px); box-shadow: 0 8px 24px rgba(var(--mzw-deep), 0.12); }",
      ".mzw-choice-btn-whatsapp { border-color: rgba(37, 211, 102, 0.30); background: linear-gradient(135deg, rgba(37, 211, 102, 0.04) 0%, rgba(18, 140, 126, 0.08) 100%); }",
      ".mzw-choice-btn-whatsapp:hover { border-color: rgba(37, 211, 102, 0.60); box-shadow: 0 8px 24px rgba(37, 211, 102, 0.20); }",
      ".mzw-choice-btn-skip { border-style: dashed; }",
      ".mzw-choice-btn-skip:hover { border-color: rgba(148, 163, 184, 0.50); background: rgba(241, 245, 249, 0.60); }",
      ".mzw-choice-badge { position: absolute; top: -8px; right: -8px; background: #25D366; color: #ffffff; font-size: 9px; font-weight: 700; text-transform: uppercase; padding: 4px 8px; border-radius: 6px; letter-spacing: 0.03em; box-shadow: 0 4px 12px rgba(37, 211, 102, 0.35); }",
      ".mzw-choice-icon { width: 48px; height: 48px; border-radius: 14px; display: flex; align-items: center; justify-content: center; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); }",
      ".mzw-choice-btn:hover .mzw-choice-icon { transform: scale(1.08); }",
      ".mzw-choice-icon-teal { background: linear-gradient(135deg, rgb(var(--mzw-deep)) 0%, rgb(var(--mzw-spark)) 100%); box-shadow: 0 4px 12px rgba(var(--mzw-deep), 0.20); }",
      ".mzw-choice-icon-whatsapp { background: #25D366; box-shadow: 0 4px 12px rgba(37, 211, 102, 0.30); }",
      ".mzw-choice-icon-neutral { background: #e2e8f0; }",
      ".mzw-choice-icon-svg { width: 24px; height: 24px; color: #ffffff; }",
      ".mzw-choice-icon-neutral .mzw-choice-icon-svg { color: #64748b; }",
      ".mzw-choice-label { font-size: 14px; font-weight: 600; color: #0f172a; }",
      ".mzw-choice-sublabel { font-size: 12px; color: #64748b; text-align: center; }",
      ".mzw-dropzone { margin-top: 0; position: relative; border-radius: 20px; background: rgba(255, 255, 255, 0.4); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); padding: 40px 28px; text-align: center; cursor: pointer; transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s ease; border: 1px solid rgba(var(--mzw-spark), 0.08); box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04), 0 0 0 1px rgba(255, 255, 255, 0.6) inset; }",
      ".mzw-dropzone.mzw-fade-out { opacity: 0; transform: translateY(-8px); pointer-events: none; }",
      ".mzw-dropzone:hover { background: rgba(255, 255, 255, 0.6); border-color: rgba(var(--mzw-spark), 0.20); transform: translateY(-3px); box-shadow: 0 12px 40px rgba(var(--mzw-deep), 0.10), 0 4px 12px rgba(var(--mzw-spark), 0.08), 0 0 0 1px rgba(255, 255, 255, 0.8) inset; }",
      ".mzw-dropzone.mzw-dropzone--active { background: rgba(var(--mzw-spark), 0.12); border-color: rgba(var(--mzw-spark), 0.35); transform: scale(0.98); box-shadow: 0 16px 56px rgba(var(--mzw-deep), 0.15), 0 0 0 2px rgba(var(--mzw-spark), 0.25) inset; }",
      ".mzw-drop-icon { position: relative; width: 48px; height: 48px; border-radius: 14px; background: linear-gradient(135deg, rgb(var(--mzw-deep)) 0%, rgb(var(--mzw-spark)) 100%); display: inline-flex; align-items: center; justify-content: center; margin: 0 auto 16px; box-shadow: 0 4px 16px rgba(var(--mzw-deep), 0.16), 0 0 0 1px rgba(255,255,255,0.08) inset; transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1); animation: mzw-icon-pulse 3s ease-in-out infinite; }",
      ".mzw-dropzone:hover .mzw-drop-icon { transform: translateY(-3px) scale(1.05); box-shadow: 0 12px 32px rgba(var(--mzw-deep), 0.24), 0 0 0 1px rgba(255,255,255,0.15) inset; }",
      ".mzw-dropzone.mzw-dropzone--active .mzw-drop-icon { transform: scale(1.1); animation: none; box-shadow: 0 16px 40px rgba(var(--mzw-spark), 0.30), 0 0 0 2px rgba(255,255,255,0.20) inset; }",
      ".mzw-drop-icon-svg { width: 24px; height: 24px; color: #ffffff; opacity: 0.95; }",
      ".mzw-drop-title { font-size: 15px; font-weight: 600; color: #0f172a; letter-spacing: -0.02em; margin-bottom: 6px; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); }",
      ".mzw-dropzone:hover .mzw-drop-title { transform: translateY(-1px); }",
      ".mzw-drop-helper { font-size: 13px; color: #64748b; font-weight: 400; line-height: 1.5; transition: color 0.3s ease; }",
      ".mzw-dropzone:hover .mzw-drop-helper { color: #475569; }",
      ".mzw-drop-limit { margin-top: 10px; font-size: 11px; color: #94a3b8; font-weight: 400; transition: color 0.3s ease; }",
      ".mzw-dropzone:hover .mzw-drop-limit { color: #64748b; }",
      ".mzw-camera { margin-top: 20px; border-radius: 18px; border: 1px solid rgba(var(--mzw-spark), 0.35); background: linear-gradient(135deg, #334155 0%, #1e293b 100%); padding: 18px; box-shadow: 0 10px 32px rgba(0, 0, 0, 0.30), 0 0 0 1px rgba(var(--mzw-spark), 0.20) inset; }",
      ".mzw-camera-header { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 14px; }",
      ".mzw-camera-text { font-size: 12px; color: #e2e8f0; font-weight: 600; line-height: 1.4; }",
      ".mzw-camera-actions { display: flex; gap: 8px; align-items: center; }",
      ".mzw-camera-pill-btn { border-radius: 12px; padding: 9px 15px; font-size: 12px; font-weight: 800; border: none; cursor: pointer; transition: all 0.2s ease; }",
      ".mzw-camera-pill-btn-primary { background: linear-gradient(135deg, rgb(var(--mzw-deep)), rgb(var(--mzw-spark))); color: #ffffff; box-shadow: 0 6px 16px rgba(var(--mzw-spark), 0.40), 0 0 0 1px rgba(255,255,255,0.15) inset; }",
      ".mzw-camera-pill-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 10px 24px rgba(var(--mzw-spark), 0.50), 0 0 0 1px rgba(255,255,255,0.20) inset; }",
      ".mzw-camera-pill-btn-secondary { border: 1px solid rgba(148, 163, 184, 0.35); background: rgba(255, 255, 255, 0.10); color: #e2e8f0; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.10); }",
      ".mzw-camera-pill-btn-secondary:hover { background: rgba(255, 255, 255, 0.15); transform: translateY(-1px); }",
      ".mzw-camera-video-wrapper { margin-top: 14px; border-radius: 16px; overflow: hidden; border: 2px solid rgba(var(--mzw-spark), 0.30); background: #000000; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.40); }",
      ".mzw-camera-video { width: 100%; height: 240px; object-fit: cover; background: #000000; }",
      ".mzw-camera-cta-row { margin-top: 14px; display: flex; justify-content: space-between; align-items: center; gap: 10px; }",
      ".mzw-camera-cta-actions { display: flex; gap: 8px; align-items: center; flex: 1; }",
      ".mzw-camera-cta-actions .mzw-camera-pill-btn-primary { flex: 1; }",
      ".mzw-camera-cta-actions .mzw-camera-pill-btn-secondary { white-space: nowrap; }",
      ".mzw-camera-counter { font-size: 12px; color: #cbd5e1; font-weight: 700; }",
      ".mzw-photos-row { margin-top: 24px; display: flex; gap: 10px; flex-wrap: wrap; transition: opacity 0.4s ease, transform 0.4s cubic-bezier(0.16, 1, 0.3, 1); }",
      ".mzw-photos-row.mzw-fade-out { opacity: 0; transform: translateY(-8px); pointer-events: none; }",
      ".mzw-photo-pill { border-radius: 10px; background: rgba(var(--mzw-deep), 0.06); border: 1px solid rgba(148, 163, 184, 0.20); padding: 8px 14px; font-size: 13px; display: inline-flex; align-items: center; gap: 10px; white-space: nowrap; color: #0f172a; font-weight: 600; box-shadow: 0 2px 6px rgba(15, 23, 42, 0.04); transition: all 0.2s ease; }",
      ".mzw-photo-pill:hover { transform: translateY(-1px); background: rgba(var(--mzw-deep), 0.08); box-shadow: 0 4px 10px rgba(15, 23, 42, 0.08); }",
      ".mzw-photo-pill-count { width: 22px; height: 22px; border-radius: 6px; background: linear-gradient(135deg, rgb(var(--mzw-deep)), rgb(var(--mzw-spark))); display: flex; align-items: center; justify-content: center; font-size: 11px; color: #ffffff; font-weight: 700; box-shadow: 0 2px 6px rgba(var(--mzw-deep), 0.25); }",
      ".mzw-photo-pill-remove { cursor: pointer; opacity: 0.50; font-size: 16px; font-weight: 600; transition: all 0.2s ease; margin-left: 6px; color: #64748b; }",
      ".mzw-photo-pill-remove:hover { opacity: 1; transform: scale(1.15); color: #dc2626; }",
      ".mzw-error { margin-top: 20px; font-size: 13px; color: #dc2626; font-weight: 600; padding: 14px 18px; background: rgba(220, 38, 38, 0.08); border-radius: 12px; border: 1px solid rgba(220, 38, 38, 0.20); }",
      ".mzw-footer { margin-top: 24px; display: flex; flex-direction: column; gap: 12px; }",
      ".mzw-primary-btn { position: relative; overflow: hidden; border: none; border-radius: 14px; padding: 16px 28px; font-size: 15px; font-weight: 800; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 10px; background: linear-gradient(135deg, rgb(var(--mzw-deep)), rgb(var(--mzw-spark))); color: #ffffff; box-shadow: 0 8px 28px rgba(var(--mzw-deep), 0.35), 0 0 0 1px rgba(255,255,255,0.1) inset; transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1); }",
      ".mzw-primary-btn::before { content: ''; position: absolute; inset: 0; background: linear-gradient(135deg, rgba(255,255,255,0.15), transparent); opacity: 0; transition: opacity 0.25s ease; }",
      ".mzw-primary-btn[disabled] { opacity: 0.6; cursor: not-allowed; }",
      ".mzw-primary-btn-inner { position: relative; z-index: 2; display: inline-flex; align-items: center; justify-content: center; gap: 10px; }",
      ".mzw-progress-mask { position: absolute; inset: 0; background: linear-gradient(90deg, rgba(var(--mzw-deep), 0.12), rgba(var(--mzw-spark), 0.18)); pointer-events: none; border-radius: inherit; transform: translateZ(0); width: 0%; opacity: 0; box-shadow: 0 0 20px rgba(var(--mzw-spark), 0.25) inset; }",
      ".mzw-primary-btn:not([disabled]):hover { transform: translateY(-3px) scale(1.02); box-shadow: 0 16px 40px rgba(var(--mzw-deep), 0.45), 0 0 0 1px rgba(255,255,255,0.15) inset; }",
      ".mzw-primary-btn:not([disabled]):hover::before { opacity: 1; }",
      ".mzw-primary-btn:not([disabled]):active { transform: translateY(-1px) scale(0.98); }",
      ".mzw-primary-btn-chevron { font-size: 16px; transition: transform 0.25s ease; }",
      ".mzw-primary-btn:hover .mzw-primary-btn-chevron { transform: translateX(3px); }",
      ".mzw-small-text { font-size: 12px; color: #64748b; text-align: center; font-weight: 500; }",
      ".mzw-links { display: flex; justify-content: center; gap: 16px; }",
      ".mzw-link { appearance: none; border: none; background: transparent; padding: 0; margin: 0; font-size: 13px; color: #64748b; font-weight: 700; cursor: pointer; text-decoration: underline; text-decoration-thickness: 1.5px; text-underline-offset: 3px; transition: all 0.2s ease; }",
      ".mzw-link:hover { color: rgb(var(--mzw-deep)); text-decoration-thickness: 2px; transform: translateY(-1px); }",
      ".mzw-error { margin-top: 12px; font-size: 13px; color: #fca5a5; font-weight: 700; padding: 14px 16px; background: rgba(220, 38, 38, 0.15); border-radius: 14px; border: 1px solid rgba(220, 38, 38, 0.30); }",
      ".mzw-results { margin-top: 20px; border-radius: 16px; background: #ffffff; border: 1px solid rgba(148, 163, 184, 0.15); padding: 20px; max-height: 360px; overflow: auto; color: #0f172a; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.06); opacity: 0; transform: translateY(12px); transition: opacity 0.5s ease, transform 0.5s cubic-bezier(0.16, 1, 0.3, 1); }",
      ".mzw-results.mzw-fade-in { opacity: 1; transform: translateY(0); }",
      ".mzw-results-header { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 18px; padding-bottom: 16px; border-bottom: 1px solid rgba(148, 163, 184, 0.12); }",
      ".mzw-results-title { font-size: 16px; font-weight: 700; color: #0f172a; }",
      ".mzw-results-pill { font-size: 12px; color: #ffffff; background: linear-gradient(135deg, rgb(var(--mzw-deep)), rgb(var(--mzw-spark))); border-radius: 8px; padding: 5px 12px; font-weight: 700; box-shadow: 0 4px 12px rgba(var(--mzw-deep), 0.25); }",
      ".mzw-results-list { display: flex; flex-direction: column; gap: 12px; }",
      ".mzw-item { border-radius: 12px; background: rgba(248, 250, 252, 0.60); padding: 14px 16px; border: 1px solid rgba(148, 163, 184, 0.15); transition: all 0.2s ease; }",
      ".mzw-item:hover { border-color: rgba(var(--mzw-spark), 0.30); transform: translateY(-1px); box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08); }",
      ".mzw-item-header { display: flex; justify-content: space-between; gap: 10px; align-items: center; }",
      ".mzw-item-label { font-size: 14px; font-weight: 700; color: #0f172a; }",
      ".mzw-item-badges { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; justify-content: flex-end; }",
      ".mzw-chip { border-radius: 6px; background: rgba(var(--mzw-deep), 0.08); padding: 4px 10px; font-size: 11px; color: rgb(var(--mzw-deep)); font-weight: 700; }",
      ".mzw-chip-outline { border-radius: 6px; border: 1px solid rgba(148, 163, 184, 0.25); padding: 4px 10px; font-size: 11px; color: #64748b; background: #ffffff; font-weight: 600; }",
      ".mzw-item-body { margin-top: 6px; font-size: 12px; color: #64748b; display: flex; flex-direction: column; gap: 2px; font-weight: 400; }",
      ".mzw-item-subdetails { margin-top: 4px; font-size: 11px; color: #94a3b8; font-weight: 400; }",
      ".mzw-loading { display: inline-flex; align-items: center; gap: 8px; font-size: 12px; color: #ffffff; font-weight: 500; }",
      ".mzw-spinner { width: 16px; height: 16px; border-radius: 999px; border: 2px solid rgba(255, 255, 255, 0.25); border-top-color: #ffffff; animation: mzw-spin 0.6s linear infinite; }",
      "@keyframes mzw-spin { to { transform: rotate(360deg); } }",
      "@keyframes mzw-pulse { 0%, 100% { opacity: 0.9; transform: scale(1); } 50% { opacity: 1; transform: scale(1.15); } }",
      "@keyframes mzw-icon-pulse { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-2px); } }",
      "@media (max-width: 640px) { .mzw-card { max-width: 100%; padding: 24px 20px 20px; border-radius: 16px; } .mzw-title { font-size: 20px; } .mzw-subtitle { font-size: 13px; } .mzw-dropzone { padding: 32px 20px; } .mzw-drop-icon { width: 44px; height: 44px; } .mzw-drop-icon-svg { width: 22px; height: 22px; } }",
    ].join("");

    var wrapper = document.createElement("div");
    wrapper.className = "mzw-root";
    wrapper.innerHTML =
      '<div class="mzw-card">' +
      '  <div class="mzw-header">' +
      '    <div class="mzw-badge"><span class="mzw-badge-dot"></span><span>IA Moverz</span></div>' +
      '    <div class="mzw-title">Des devis de déménagement justes</div>' +
      '    <div class="mzw-subtitle">Estimation IA en 60 secondes pour des devis précis et sans surprises.</div>' +
      "  </div>" +
      '  <div class="mzw-summary" id="mzw-summary" style="display:none"></div>' +
      
      // 3 options pour les photos
      '  <div class="mzw-choice-section" id="mzw-choice-section">' +
      '    <div class="mzw-choice-title">Comment voulez-vous ajouter vos photos ?</div>' +
      '    <div class="mzw-choice-grid">' +
      
      // Option 1: Upload web
      '      <button class="mzw-choice-btn" id="mzw-choice-web" type="button">' +
      '        <div class="mzw-choice-icon mzw-choice-icon-teal">' +
      '          <svg class="mzw-choice-icon-svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>' +
      '        </div>' +
      '        <div class="mzw-choice-label">Upload</div>' +
      '        <div class="mzw-choice-sublabel">Appareil photo ou fichiers</div>' +
      '      </button>' +
      
      // Option 2: WhatsApp
      '      <button class="mzw-choice-btn mzw-choice-btn-whatsapp" id="mzw-choice-whatsapp" type="button">' +
      '        <div class="mzw-choice-badge">Rapide</div>' +
      '        <div class="mzw-choice-icon mzw-choice-icon-whatsapp">' +
      '          <svg class="mzw-choice-icon-svg" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>' +
      '        </div>' +
      '        <div class="mzw-choice-label">WhatsApp</div>' +
      '        <div class="mzw-choice-sublabel">Envoi instantané</div>' +
      '      </button>' +
      
      // Option 3: Sans photos
      '      <button class="mzw-choice-btn mzw-choice-btn-skip" id="mzw-choice-skip" type="button">' +
      '        <div class="mzw-choice-icon mzw-choice-icon-neutral">' +
      '          <svg class="mzw-choice-icon-svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>' +
      '        </div>' +
      '        <div class="mzw-choice-label">Sans photos</div>' +
      '        <div class="mzw-choice-sublabel">Je complèterai plus tard</div>' +
      '      </button>' +
      
      '    </div>' +
      '  </div>' +
      
      '  <div class="mzw-dropzone" id="mzw-dropzone" style="display:none">' +
      '    <div class="mzw-drop-icon">' +
      '      <svg class="mzw-drop-icon-svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="color: rgb(var(--mzw-deep));"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>' +
      "    </div>" +
      '    <div class="mzw-drop-title">Ajoutez vos photos</div>' +
      '    <div class="mzw-drop-helper">Cliquez pour sélectionner ou glissez-déposez</div>' +
      '    <div class="mzw-drop-limit">1 à 3 photos · JPG, PNG ou HEIC</div>' +
      "  </div>" +
      '  <input type="file" id="mzw-file-input" accept="image/*" multiple style="display:none" />' +
      '  <div class="mzw-photos-row" id="mzw-photos-row" style="display:none"></div>' +
      '  <div class="mzw-error" id="mzw-error" style="display:none"></div>' +
      "</div>";

    root.appendChild(style);
    root.appendChild(wrapper);

    var headerEl = root.querySelector(".mzw-header");
    var dropzone = root.getElementById("mzw-dropzone");
    var fileInput = root.getElementById("mzw-file-input");
    var photosRow = root.getElementById("mzw-photos-row");
    var analyzeBtn = root.getElementById("mzw-analyze-btn");
    var analyzeLabel = root.getElementById("mzw-analyze-label");
    var errorEl = root.getElementById("mzw-error");
    var resultsEl = root.getElementById("mzw-results");
    var resultsListEl = root.getElementById("mzw-results-list");
    var resultsPillEl = root.getElementById("mzw-results-pill");
    var progressMaskEl = root.getElementById("mzw-progress-mask");
    var photosLaterBtn = root.getElementById("mzw-photos-later");

    /** @type {File[]} */
    var selectedFiles = [];
    var isAnalyzing = false;
    var hasResults = false;

    // Détection d'un pointeur "grossier" (mobile/tablette) pour décider si on
    // privilégie la caméra comme entrée principale.
    var isCoarsePointer = false;
    try {
      if (typeof window !== "undefined" && window.matchMedia) {
        var pointerMql = window.matchMedia("(pointer: coarse)");
        isCoarsePointer = !!pointerMql.matches;
        if (pointerMql.addEventListener) {
          pointerMql.addEventListener("change", function (event) {
            isCoarsePointer = !!event.matches;
          });
        }
      }
    } catch (e) {
      // on ignore les erreurs de matchMedia
    }

    var cameraSupported =
      typeof navigator !== "undefined" &&
      !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    var cameraActive = false;
    var cameraUnavailable = false;
    var cameraWrapper = null;
    var cameraVideo = null;
    var cameraOpenBtn = null; // conservé pour compat, mais plus affiché
    var cameraCloseBtn = null;
    var cameraCaptureBtn = null;
    var cameraCounterText = null;
    var cameraStream = null;

    function setError(msg) {
      if (!msg) {
        errorEl.style.display = "none";
        errorEl.textContent = "";
        return;
      }
      errorEl.style.display = "block";
      errorEl.textContent = msg;
    }

    function updatePhotosUI() {
      if (!selectedFiles.length) {
        photosRow.style.display = "none";
        photosRow.innerHTML = "";
      } else {
        photosRow.style.display = "flex";
        photosRow.innerHTML = "";
        selectedFiles.forEach(function (file, index) {
          var pill = document.createElement("div");
          pill.className = "mzw-photo-pill";

          var count = document.createElement("div");
          count.className = "mzw-photo-pill-count";
          count.textContent = String(index + 1);

          var name = document.createElement("span");
          // On n'affiche plus le nom complet du fichier (trop long sur mobile),
          // juste un label générique compact.
          name.textContent = "Photo " + (index + 1);

          var remove = document.createElement("span");
          remove.className = "mzw-photo-pill-remove";
          remove.textContent = "x";
          remove.addEventListener("click", function () {
            selectedFiles.splice(index, 1);
            updatePhotosUI();
            updateAnalyzeDisabled();
          });

          pill.appendChild(count);
          pill.appendChild(name);
          pill.appendChild(remove);
          photosRow.appendChild(pill);
        });
      }
    }

    function updateAnalyzeDisabled() {
      // Bouton principal : visible quand photos ou résultats
      // Lien "plus tard" : visible seulement quand photos SANS résultats
      analyzeBtn.disabled = isAnalyzing;
      
      if (!hasResults && selectedFiles.length === 0) {
        // État initial : rien à montrer
        analyzeBtn.style.display = "none";
        if (photosLaterBtn) photosLaterBtn.parentElement.style.display = "none";
      } else if (!hasResults && selectedFiles.length > 0) {
        // Photos ajoutées : montrer bouton + lien
        analyzeBtn.style.display = "inline-flex";
        analyzeLabel.textContent = "Analyser mes photos";
        if (photosLaterBtn) photosLaterBtn.parentElement.style.display = "flex";
      } else {
        // Résultats : montrer seulement bouton, pas le lien
        analyzeBtn.style.display = "inline-flex";
        if (photosLaterBtn) photosLaterBtn.parentElement.style.display = "none";
      }
    }

    function stopCamera() {
      cameraActive = false;
      if (cameraStream) {
        try {
          cameraStream.getTracks().forEach(function (track) {
            try {
              track.stop();
            } catch (e) {}
          });
        } catch (e) {}
        cameraStream = null;
      }
      if (cameraVideo) {
        cameraVideo.srcObject = null;
      }
    }

    function fallbackToGallery() {
      stopCamera();
      if (cameraWrapper) {
        cameraWrapper.style.display = "none";
      }
      if (dropzone) {
        dropzone.style.display = "block";
      }
    }

    function ensureCameraUI() {
      if (cameraWrapper || !dropzone) return;

      cameraWrapper = document.createElement("div");
      cameraWrapper.className = "mzw-camera";

      var header = document.createElement("div");
      header.className = "mzw-camera-header";

      var info = document.createElement("p");
      info.className = "mzw-camera-text";
      info.textContent =
        "Recommandations : 3 à 5 photos par pièce. Tout ce qui est vu sera pris en compte.";

      cameraCloseBtn = document.createElement("button");
      cameraCloseBtn.type = "button";
      cameraCloseBtn.className =
        "mzw-camera-pill-btn mzw-camera-pill-btn-secondary";
      cameraCloseBtn.textContent = "Importer depuis la galerie";

      header.appendChild(info);

      var videoWrapper = document.createElement("div");
      videoWrapper.className = "mzw-camera-video-wrapper";

      cameraVideo = document.createElement("video");
      cameraVideo.className = "mzw-camera-video";
      cameraVideo.playsInline = true;
      cameraVideo.autoplay = true;
      cameraVideo.muted = true;

      videoWrapper.appendChild(cameraVideo);

      var ctaRow = document.createElement("div");
      ctaRow.className = "mzw-camera-cta-row";

      var ctaActions = document.createElement("div");
      ctaActions.className = "mzw-camera-cta-actions";

      cameraCaptureBtn = document.createElement("button");
      cameraCaptureBtn.type = "button";
      cameraCaptureBtn.className =
        "mzw-camera-pill-btn mzw-camera-pill-btn-primary";
      cameraCaptureBtn.textContent = "Prendre une photo";

      cameraCounterText = document.createElement("span");
      cameraCounterText.className = "mzw-camera-counter";
      cameraCounterText.textContent =
        "0 / 3 photos (max pour ce widget de démonstration)";

      ctaActions.appendChild(cameraCloseBtn);
      ctaActions.appendChild(cameraCaptureBtn);

      ctaRow.appendChild(ctaActions);
      ctaRow.appendChild(cameraCounterText);

      cameraWrapper.appendChild(header);
      cameraWrapper.appendChild(videoWrapper);
      cameraWrapper.appendChild(ctaRow);

      cameraWrapper.style.display = "none";

      dropzone.parentNode.insertBefore(cameraWrapper, dropzone.nextSibling);

      cameraCloseBtn.addEventListener("click", function () {
        fallbackToGallery();
      });

      cameraCaptureBtn.addEventListener("click", function () {
        captureFromCamera();
      });
    }

    function updateCameraCounter() {
      if (!cameraCounterText) return;
      cameraCounterText.textContent = selectedFiles.length + " / 3 photos";
    }

    function startCamera() {
      if (!cameraSupported || cameraActive) return;
      setError("");
      cameraActive = true;
      navigator.mediaDevices
        .getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        })
        .then(function (stream) {
          cameraStream = stream;
          if (!cameraVideo) return;
          cameraVideo.srcObject = stream;
          var playPromise = cameraVideo.play();
          if (playPromise && playPromise.catch) {
            playPromise.catch(function () {});
          }
        })
        .catch(function (err) {
          console.error("[MoverzWidget] Erreur accès caméra:", err);
          cameraUnavailable = true;
          fallbackToGallery();
          setError(
            "La caméra n'est pas disponible sur ce navigateur. Utilisez vos photos existantes."
          );
        });
    }

    function captureFromCamera() {
      if (!cameraVideo || !cameraActive) return;
      if (selectedFiles.length >= 3) {
        setError(
          "Ce widget de démonstration accepte jusqu'à 3 photos. Supprimez-en une pour en ajouter une nouvelle."
        );
        return;
      }

      var vw = cameraVideo.videoWidth || 0;
      var vh = cameraVideo.videoHeight || 0;
      if (!vw || !vh) return;

      var maxWidth = 1600;
      var maxHeight = 1200;
      var ratio = Math.min(maxWidth / vw, maxHeight / vh, 1);
      var targetWidth = Math.round(vw * ratio);
      var targetHeight = Math.round(vh * ratio);

      var canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      var ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.drawImage(cameraVideo, 0, 0, targetWidth, targetHeight);

      canvas.toBlob(
        function (blob) {
          if (!blob) return;
          var file = new File([blob], "camera-" + Date.now() + ".jpg", {
            type: "image/jpeg",
          });
          selectedFiles.push(file);
          updatePhotosUI();
          updateAnalyzeDisabled();
          updateCameraCounter();
          setError("");
        },
        "image/jpeg",
        0.9
      );
    }

    function handleFiles(files) {
      setError("");
      var added = 0;
      for (var i = 0; i < files.length; i++) {
        if (selectedFiles.length >= 3) break;
        var f = files[i];
        if (!f.type || !f.type.startsWith("image/")) continue;
        selectedFiles.push(f);
        added++;
      }
      if (!added && !selectedFiles.length) {
        setError("Choisissez au moins une photo au format image.");
      } else if (selectedFiles.length > 3) {
        selectedFiles = selectedFiles.slice(0, 3);
      }
      updatePhotosUI();
      updateAnalyzeDisabled();
    }

    // Event listeners pour les 3 options
    var choiceWeb = root.getElementById("mzw-choice-web");
    var choiceWhatsApp = root.getElementById("mzw-choice-whatsapp");
    var choiceSkip = root.getElementById("mzw-choice-skip");
    var choiceSection = root.getElementById("mzw-choice-section");

    if (choiceWeb) {
      choiceWeb.addEventListener("click", function () {
        if (isAnalyzing) return;
        setError("");
        
        // Masquer les choix, afficher la dropzone
        if (choiceSection) choiceSection.style.display = "none";
        if (dropzone) dropzone.style.display = "block";
        
        // Sur mobile avec caméra disponible: on lance directement le flux caméra
        if (cameraSupported && isCoarsePointer) {
          ensureCameraUI();
          if (cameraWrapper) {
            cameraWrapper.style.display = "block";
          }
          if (dropzone) {
            dropzone.style.display = "none";
          }
          startCamera();
          return;
        }
        
        // Desktop ou caméra indisponible: comportement classique d'upload.
        fileInput.click();
      });
    }

    if (choiceWhatsApp) {
      choiceWhatsApp.addEventListener("click", function () {
        if (isAnalyzing) return;
        setError("");
        
        // TODO: Implémenter le flow WhatsApp avec linking token
        // Pour l'instant, on redirige vers le tunnel qui gère déjà WhatsApp
        var tunnelUrl = window.location.origin + "/devis-gratuits";
        window.location.href = tunnelUrl;
      });
    }

    if (choiceSkip) {
      choiceSkip.addEventListener("click", function () {
        if (isAnalyzing) return;
        setError("");
        
        // Rediriger directement vers le tunnel sans photos
        var tunnelUrl = window.location.origin + "/devis-gratuits";
        window.location.href = tunnelUrl;
      });
    }

    dropzone.addEventListener("click", function () {
      if (isAnalyzing) return;
      setError("");

      // Sur mobile avec caméra disponible: on lance directement le flux caméra
      // au clic sur la zone, comme dans l'étape 4 du tunnel. La galerie reste
      // accessible via le bouton "Utiliser ma galerie".
      if (cameraSupported && isCoarsePointer) {
        ensureCameraUI();
        if (cameraWrapper) {
          cameraWrapper.style.display = "block";
        }
        if (dropzone) {
          dropzone.style.display = "none";
        }
        startCamera();
        return;
      }

      // Desktop ou caméra indisponible: comportement classique d'upload.
      fileInput.click();
    });

    fileInput.addEventListener("change", function (event) {
      var files = event.target.files || [];
      handleFiles(files);
    });

    dropzone.addEventListener("dragover", function (event) {
      event.preventDefault();
      if (isAnalyzing) return;
      dropzone.classList.add("mzw-dropzone--active");
    });

    dropzone.addEventListener("dragleave", function (event) {
      event.preventDefault();
      dropzone.classList.remove("mzw-dropzone--active");
    });

    dropzone.addEventListener("drop", function (event) {
      event.preventDefault();
      dropzone.classList.remove("mzw-dropzone--active");
      if (isAnalyzing) return;
      var dt = event.dataTransfer;
      if (!dt) return;
      var files = dt.files || [];
      handleFiles(files);
    });

    function renderResults(items) {
      if (!items || !items.length) {
        resultsListEl.innerHTML =
          '<div class="mzw-small-text">Aucun objet clairement détecté. Essayez avec une autre photo ou passez directement à la demande de devis.</div>';
        resultsPillEl.textContent = "";
        resultsEl.style.display = "block";
        setTimeout(function() {
          resultsEl.classList.add("mzw-fade-in");
        }, 50);
        return;
      }

      var totalVolume = 0;
      var totalValue = 0;

      resultsListEl.innerHTML = "";

      items.forEach(function (item) {
        var vol = typeof item.volumeM3 === "number" ? item.volumeM3 : 0;
        var val =
          typeof item.valueEstimateEur === "number"
            ? item.valueEstimateEur
            : 0;
        totalVolume += vol;
        totalValue += val;

        var el = document.createElement("div");
        el.className = "mzw-item";

        var header = document.createElement("div");
        header.className = "mzw-item-header";

        var label = document.createElement("div");
        label.className = "mzw-item-label";
        label.textContent =
          item.label + (item.quantity && item.quantity > 1 ? " (x" + item.quantity + ")" : "");

        var badges = document.createElement("div");
        badges.className = "mzw-item-badges";

        if (vol) {
          var chipVol = document.createElement("div");
          chipVol.className = "mzw-chip";
          chipVol.textContent = vol.toFixed(2) + " m³";
          badges.appendChild(chipVol);
        }

        if (val) {
          var chipVal = document.createElement("div");
          chipVal.className = "mzw-chip-outline";
          chipVal.textContent = "~ " + Math.round(val) + " €";
          badges.appendChild(chipVal);
        }

        header.appendChild(label);
        header.appendChild(badges);

        var body = document.createElement("div");
        body.className = "mzw-item-body";

        if (
          typeof item.widthCm === "number" &&
          typeof item.depthCm === "number" &&
          typeof item.heightCm === "number"
        ) {
          var dims = document.createElement("div");
          dims.textContent =
            "Mesures approx. " +
            item.widthCm +
            "×" +
            item.depthCm +
            "×" +
            item.heightCm +
            " cm";
          body.appendChild(dims);
        }

        if (item.valueJustification) {
          var just = document.createElement("div");
          just.textContent = item.valueJustification;
          body.appendChild(just);
        }

        var sub = document.createElement("div");
        sub.className = "mzw-item-subdetails";
        var tags = [];
        if (item.flags && item.flags.fragile) tags.push("Fragile");
        if (item.flags && item.flags.requiresDisassembly)
          tags.push("Démontage conseillé");
        if (item.flags && item.flags.highValue) tags.push("Haute valeur");
        if (tags.length) {
          sub.textContent = tags.join(" • ");
          body.appendChild(sub);
        }

        el.appendChild(header);
        el.appendChild(body);
        resultsListEl.appendChild(el);
      });

      var roundedVol = totalVolume.toFixed(2);
      var roundedVal = Math.round(totalValue / 50) * 50;
      resultsPillEl.textContent =
        roundedVol +
        " m³ estimés · ~ " +
        new Intl.NumberFormat("fr-FR").format(roundedVal) +
        " €";
      resultsEl.style.display = "block";
      setTimeout(function() {
        resultsEl.classList.add("mzw-fade-in");
      }, 50);
    }

    // Compression côté navigateur, alignée avec la normalisation backend (≈400x300, JPEG qualité 80).
    function compressImageFile(file, maxWidth, maxHeight, quality) {
      return new Promise(function (resolve) {
        try {
          if (!file.type || !file.type.startsWith("image/")) {
            return resolve(file);
          }

          var img = new Image();
          img.onload = function () {
            try {
              var width = img.naturalWidth || img.width;
              var height = img.naturalHeight || img.height;
              if (!width || !height) return resolve(file);

              var ratio = Math.min(
                maxWidth / width,
                maxHeight / height,
                1
              );

              var targetWidth = Math.round(width * ratio);
              var targetHeight = Math.round(height * ratio);

              var canvas = document.createElement("canvas");
              canvas.width = targetWidth;
              canvas.height = targetHeight;
              var ctx = canvas.getContext("2d");
              if (!ctx) return resolve(file);

              ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

              canvas.toBlob(
                function (blob) {
                  if (!blob) return resolve(file);
                  var name =
                    (file.name || "photo")
                      .replace(/\.[^.]+$/, "") + ".jpg";
                  var compressed = new File([blob], name, {
                    type: "image/jpeg",
                  });
                  resolve(compressed);
                },
                "image/jpeg",
                quality
              );
            } catch (e) {
              console.error("[MoverzWidget] Erreur compression image:", e);
              resolve(file);
            }
          };
          img.onerror = function () {
            resolve(file);
          };

          var reader = new FileReader();
          reader.onload = function (event) {
            img.src = String(event.target && event.target.result);
          };
          reader.onerror = function () {
            resolve(file);
          };
          reader.readAsDataURL(file);
        } catch (e) {
          console.error("[MoverzWidget] Erreur compression image:", e);
          resolve(file);
        }
      });
    }

    async function analyze() {
      if (!selectedFiles.length || isAnalyzing) {
        if (!selectedFiles.length && !isAnalyzing) {
          setError(
            "Ajoutez au moins une photo avant de lancer l’analyse (caméra ou galerie)."
          );
        }
        return;
      }

      isAnalyzing = true;
      setError("");
      updateAnalyzeDisabled();
      // Quand l'utilisateur lance l'analyse, on retire le bloc de prise de
      // photos et on coupe la caméra pour ne pas laisser la preview active.
      if (cameraWrapper) {
        cameraWrapper.style.display = "none";
      }
      stopCamera();
      resultsEl.classList.remove("mzw-fade-in");
      resultsEl.style.display = "none";
      resultsListEl.innerHTML = "";

      var originalLabel = analyzeLabel.textContent;
      analyzeLabel.textContent = "Analyse en cours…";

      // Progression visuelle : durée en fonction du nombre de photos
      // 1 photo = 9 s, 2 ou 3 photos = 11 s
      var photoCount = selectedFiles.length || 1;
      var expectedMs;
      if (photoCount <= 1) {
        expectedMs = 9000;
      } else {
        expectedMs = 11000;
      }

      if (progressMaskEl) {
        progressMaskEl.style.transition = "none";
        progressMaskEl.style.width = "0%";
        progressMaskEl.style.opacity = "1";
        // forcer un reflow pour que la transition reparte bien de 0%
        void progressMaskEl.offsetWidth;
        progressMaskEl.style.transition =
          "width " + expectedMs + "ms linear";
        progressMaskEl.style.width = "100%";
      }

      try {
        var formData = new FormData();

        // Compression client : max 400x300, JPEG qualité 0.8 (aligné avec /api/uploads/photos).
        var compressedFiles = await Promise.all(
          selectedFiles.map(function (file) {
            return compressImageFile(file, 400, 300, 0.8);
          })
        );

        compressedFiles.forEach(function (file) {
          formData.append("photos", file);
        });

        var response = await fetch(apiUrl, {
          method: "POST",
          body: formData,
        });

        var json;
        try {
          json = await response.json();
        } catch (e) {
          throw new Error("Réponse inattendue de l’IA.");
        }

        if (!response.ok) {
          throw new Error(json && json.error ? json.error : "Erreur lors de l’analyse.");
        }

        var rooms = (json && json.rooms) || [];
        var items =
          rooms.length && rooms[0] && Array.isArray(rooms[0].items)
            ? rooms[0].items
            : [];

        renderResults(items);
        hasResults = true;

        // Step 2 : on garde seulement l'inventaire + CTA bas de carte (avec transitions fluides)
        if (dropzone) dropzone.classList.add("mzw-fade-out");
        if (photosRow) photosRow.classList.add("mzw-fade-out");
        if (headerEl) headerEl.classList.add("mzw-fade-out");
        setTimeout(function() {
          if (dropzone) dropzone.style.display = "none";
          if (photosRow) photosRow.style.display = "none";
        if (headerEl) headerEl.style.display = "none";
        }, 400);
        analyzeLabel.textContent = "Comparer les devis";
      } catch (e) {
        console.error("[MoverzWidget] Erreur d’analyse:", e);
        setError(
          "L’IA n’a pas réussi à lire vos photos cette fois. Vous pouvez réessayer ou passer directement aux devis."
        );
      } finally {
        isAnalyzing = false;
        if (!hasResults) {
          analyzeLabel.textContent = originalLabel;
        }
        if (progressMaskEl) {
          progressMaskEl.style.transition = "opacity 300ms ease-out";
          progressMaskEl.style.opacity = "0";
        }
        updateAnalyzeDisabled();
      }
    }

    // Expose CTA handler à la page hôte
    if (typeof window !== "undefined") {
      if (!window.MoverzWidget) {
        window.MoverzWidget = {};
      }
      window.MoverzWidget.goToQuotes = function (mode) {
        var suffix = mode ? String(mode) : "widget";
        window.location.href =
          "https://devis.moverz.fr/devis-gratuits?src=moverz.fr&from=" +
          encodeURIComponent(suffix);
      };
    }

    analyzeBtn.addEventListener("click", function () {
      if (hasResults && window.MoverzWidget && window.MoverzWidget.goToQuotes) {
        window.MoverzWidget.goToQuotes("widget");
      } else {
        analyze();
      }
    });

    if (photosLaterBtn) {
      photosLaterBtn.addEventListener("click", function () {
        if (window.MoverzWidget && window.MoverzWidget.goToQuotes) {
          window.MoverzWidget.goToQuotes("widget_photos_later");
        }
      });
    }

    // Double-clic facultatif sur le bloc de résultats pour aller aux devis
    resultsEl.addEventListener("dblclick", function () {
      if (window.MoverzWidget && window.MoverzWidget.goToQuotes) {
        window.MoverzWidget.goToQuotes();
      }
    });
  }

  function mount(options) {
    options = options || {};
    createRoot(options);
  }

  onReady(function () {
    mount({});
  });

  if (!window.MoverzWidget) {
    window.MoverzWidget = {};
  }
  window.MoverzWidget.mount = mount;
})(); 


