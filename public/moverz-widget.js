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

  function getTunnelUrl() {
    var script = document.currentScript;
    var baseUrl;

    try {
      if (script && script.src) {
        baseUrl = new URL(script.src).origin;
      } else {
        baseUrl = window.location.origin;
      }
    } catch (e) {
      baseUrl = window.location.origin;
    }

    return baseUrl.replace(/\/+$/, "") + "/devis-gratuits";
  }

  function createRoot(options) {
    try {
    var target =
      document.querySelector("[data-moverz-widget-root]") ||
      document.getElementById("moverz-widget-root") ||
      document.body;

      if (!target) {
        console.error("[Moverz Widget] No target found for widget");
        return;
      }

    var host = document.createElement("div");
    host.className = "mzw-host";
    target.appendChild(host);

    if (host.attachShadow) {
      var shadow = host.attachShadow({ mode: "open" });
      mountWidget(shadow, options);
    } else {
      mountWidget(host, options);
      }
    } catch (e) {
      console.error("[Moverz Widget] Error creating widget:", e);
    }
  }

  function mountWidget(root, options) {
    var apiUrl = options.apiUrl || getApiUrl();

    var style = document.createElement("style");
    style.textContent = [
      // Core + Variables (Moverz 2025 style)
      ".mzw-root { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #0f172a; --mzw-deep: 43 122 120; --mzw-spark: 107 207 207; line-height: 1.5; -webkit-font-smoothing: antialiased; }",
      
      // Card container - pure white, soft shadow like tunnel
      ".mzw-card { background: #ffffff; border-radius: 24px; padding: 40px 36px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08); max-width: 480px; display: flex; flex-direction: column; position: relative; }",
      
      // Header - Moverz 2025 style (like tunnel hero)
      ".mzw-header { margin-bottom: 32px; transition: opacity 0.3s ease; }",
      ".mzw-header.mzw-fade-out { opacity: 0; pointer-events: none; }",
      ".mzw-badge { display: inline-flex; align-items: center; gap: 8px; margin-bottom: 20px; padding: 8px 16px; border-radius: 999px; border: 1px solid rgba(15, 23, 42, 0.08); background: #ffffff; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04); }",
      ".mzw-badge-dot { width: 6px; height: 6px; border-radius: 999px; background: #6BCFCF; }",
      ".mzw-badge-text { font-size: 13px; font-weight: 500; color: #0f172a; }",
      ".mzw-title { font-size: 32px; font-weight: 700; line-height: 1.2; color: #0f172a; letter-spacing: -0.02em; margin-bottom: 12px; }",
      ".mzw-subtitle { font-size: 16px; color: #334155; line-height: 1.5; font-weight: 400; margin-bottom: 8px; }",
      ".mzw-micro { font-size: 13px; color: #64748b; line-height: 1.4; }",
      
      // Choice section - Moverz 2025
      ".mzw-choice-section { margin-top: 8px; }",
      ".mzw-choice-title { font-size: 17px; font-weight: 600; color: #0f172a; margin-bottom: 20px; }",
      ".mzw-choice-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }",
      "@media (max-width: 480px) { .mzw-choice-grid { grid-template-columns: 1fr; } }",
      
      // Choice buttons - clean with subtle hover
      ".mzw-choice-btn { position: relative; display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 24px 20px; border-radius: 16px; border: 1.5px solid rgba(148, 163, 184, 0.20); background: #ffffff; cursor: pointer; transition: all 0.2s ease; font-family: inherit; text-align: center; }",
      ".mzw-choice-btn:hover { border-color: rgba(43, 122, 120, 0.40); box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06); transform: translateY(-2px); }",
      ".mzw-choice-btn-whatsapp { border-color: rgba(37, 211, 102, 0.25); }",
      ".mzw-choice-btn-whatsapp:hover { border-color: rgba(37, 211, 102, 0.50); box-shadow: 0 4px 12px rgba(37, 211, 102, 0.12); }",
      ".mzw-choice-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; transition: transform 0.2s ease; }",
      ".mzw-choice-btn:hover .mzw-choice-icon { transform: scale(1.05); }",
      ".mzw-choice-icon-teal { background: rgba(var(--mzw-deep), 0.10); }",
      ".mzw-choice-icon-whatsapp { background: rgba(37, 211, 102, 0.12); }",
      ".mzw-choice-icon-svg { width: 20px; height: 20px; color: rgb(var(--mzw-deep)); }",
      ".mzw-choice-icon-whatsapp .mzw-choice-icon-svg { color: #25D366; }",
      ".mzw-choice-label { font-size: 14px; font-weight: 500; color: #0f172a; }",
      ".mzw-choice-sublabel { font-size: 12px; color: #64748b; margin-top: 2px; }",
      
      // Photos section - progressive disclosure
      ".mzw-photos-row { margin-top: 16px; display: none; flex-direction: column; gap: 12px; }",
      ".mzw-photos-meta { display: flex; align-items: center; justify-content: space-between; }",
      ".mzw-photos-count { font-size: 13px; font-weight: 500; color: #0f172a; }",
      ".mzw-photos-hint { font-size: 12px; color: #64748b; }",
      ".mzw-photos-bar { height: 6px; width: 100%; border-radius: 999px; background: rgba(148, 163, 184, 0.15); overflow: hidden; }",
      ".mzw-photos-bar-fill { height: 100%; width: 0%; border-radius: 999px; background: rgb(var(--mzw-deep)); transition: width 0.3s ease; }",
      ".mzw-thumbs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 12px; }",
      ".mzw-thumb { position: relative; border-radius: 8px; overflow: hidden; border: 1px solid rgba(148, 163, 184, 0.15); background: #f8fafc; }",
      ".mzw-thumb::before { content: ''; display: block; padding-top: 100%; }",
      ".mzw-thumb-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }",
      ".mzw-thumb-remove { position: absolute; top: 6px; right: 6px; height: 22px; width: 22px; border-radius: 999px; border: 1px solid rgba(0, 0, 0, 0.08); background: rgba(255, 255, 255, 0.95); color: #64748b; font-weight: 600; line-height: 1; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.15s ease; font-size: 14px; }",
      ".mzw-thumb-remove:hover { background: #ffffff; color: #0f172a; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08); }",
      
      // Dropzone - Moverz 2025 style
      ".mzw-dropzone { margin-top: 0; border-radius: 16px; background: #f8fafc; padding: 36px 28px; text-align: center; cursor: pointer; transition: all 0.2s ease; border: 2px dashed rgba(148, 163, 184, 0.30); }",
      ".mzw-dropzone.mzw-fade-out { opacity: 0; pointer-events: none; }",
      ".mzw-dropzone:hover { background: #f1f5f9; border-color: rgba(43, 122, 120, 0.40); }",
      ".mzw-dropzone.mzw-dropzone--active { background: rgba(107, 207, 207, 0.08); border-color: rgba(107, 207, 207, 0.50); border-style: solid; }",
      ".mzw-drop-icon { width: 48px; height: 48px; border-radius: 12px; background: rgba(43, 122, 120, 0.10); display: inline-flex; align-items: center; justify-content: center; margin: 0 auto 16px; transition: all 0.2s ease; }",
      ".mzw-dropzone:hover .mzw-drop-icon { background: rgba(43, 122, 120, 0.15); transform: translateY(-2px); }",
      ".mzw-drop-icon-svg { width: 24px; height: 24px; color: #2B7A78; }",
      ".mzw-drop-title { font-size: 15px; font-weight: 600; color: #0f172a; margin-bottom: 8px; }",
      ".mzw-drop-helper { font-size: 14px; color: #64748b; line-height: 1.4; }",
      ".mzw-drop-limit { margin-top: 12px; font-size: 13px; color: #94a3b8; }",
      
      // Camera component - clean
      ".mzw-camera { margin-top: 16px; border-radius: 12px; border: 1px solid rgba(148, 163, 184, 0.15); background: #ffffff; padding: 16px; }",
      ".mzw-camera-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }",
      ".mzw-camera-text { font-size: 13px; color: #334155; font-weight: 500; }",
      ".mzw-camera-actions { display: flex; gap: 8px; }",
      ".mzw-camera-pill-btn { border-radius: 8px; padding: 8px 14px; font-size: 13px; font-weight: 500; border: none; cursor: pointer; transition: all 0.15s ease; }",
      ".mzw-camera-pill-btn-primary { background: rgb(var(--mzw-deep)); color: #ffffff; }",
      ".mzw-camera-pill-btn-primary:hover { background: rgba(var(--mzw-deep), 0.90); }",
      ".mzw-camera-pill-btn-secondary { border: 1px solid rgba(148, 163, 184, 0.25); background: #ffffff; color: #334155; }",
      ".mzw-camera-pill-btn-secondary:hover { background: #f8fafc; }",
      ".mzw-camera-video-wrapper { margin-top: 12px; border-radius: 10px; overflow: hidden; border: 1px solid rgba(148, 163, 184, 0.20); background: #000000; }",
      ".mzw-camera-video { width: 100%; height: 240px; object-fit: cover; background: #000000; }",
      ".mzw-camera-cta-row { margin-top: 12px; display: flex; justify-content: space-between; align-items: center; gap: 10px; }",
      ".mzw-camera-cta-actions { display: flex; gap: 8px; flex: 1; }",
      ".mzw-camera-cta-actions .mzw-camera-pill-btn-primary { flex: 1; }",
      ".mzw-camera-counter { font-size: 12px; color: #64748b; font-weight: 500; }",
      
      // Primary button - pill shape like moverz.fr CTA
      ".mzw-primary-btn { border: none; border-radius: 999px; padding: 14px 28px; font-size: 15px; font-weight: 500; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 10px; background: #1e293b; color: #ffffff; transition: all 0.2s ease; width: 100%; margin-top: 20px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.10); }",
      ".mzw-primary-btn:hover:not([disabled]) { background: #0f172a; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15); }",
      ".mzw-primary-btn[disabled] { opacity: 0.5; cursor: not-allowed; }",
      ".mzw-primary-btn-inner { display: inline-flex; align-items: center; gap: 10px; }",
      ".mzw-primary-btn-chevron { font-size: 16px; transition: transform 0.2s ease; }",
      ".mzw-primary-btn:hover:not([disabled]) .mzw-primary-btn-chevron { transform: translateX(2px); }",
      
      // Back button
      ".mzw-back-btn { appearance: none; border: none; background: transparent; padding: 10px 0; margin-top: 12px; font-size: 13px; color: #64748b; cursor: pointer; transition: color 0.15s ease; display: inline-flex; align-items: center; gap: 6px; }",
      ".mzw-back-btn:hover { color: #334155; }",
      
      // Privacy text
      ".mzw-privacy { font-size: 12px; color: #94a3b8; text-align: center; margin-top: 16px; line-height: 1.4; }",
      
      // Error messages
      ".mzw-error { margin-top: 16px; font-size: 13px; color: #dc2626; font-weight: 500; padding: 12px 16px; background: rgba(220, 38, 38, 0.06); border-radius: 10px; border: 1px solid rgba(220, 38, 38, 0.15); }",
      
      // Results section
      ".mzw-results { margin-top: 20px; border-radius: 12px; background: #ffffff; border: 1px solid rgba(148, 163, 184, 0.15); padding: 20px; max-height: 360px; overflow: auto; opacity: 0; transform: translateY(8px); transition: opacity 0.3s ease, transform 0.3s ease; }",
      ".mzw-results.mzw-fade-in { opacity: 1; transform: translateY(0); }",
      ".mzw-results-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid rgba(148, 163, 184, 0.10); }",
      ".mzw-results-title { font-size: 15px; font-weight: 500; color: #0f172a; }",
      ".mzw-results-pill { font-size: 12px; color: #ffffff; background: rgb(var(--mzw-deep)); border-radius: 6px; padding: 4px 10px; font-weight: 500; }",
      ".mzw-results-list { display: flex; flex-direction: column; gap: 10px; }",
      ".mzw-item { border-radius: 10px; background: #fafbfc; padding: 12px 14px; border: 1px solid rgba(148, 163, 184, 0.12); transition: all 0.15s ease; }",
      ".mzw-item:hover { border-color: rgba(var(--mzw-deep), 0.25); background: #ffffff; }",
      ".mzw-item-header { display: flex; justify-content: space-between; gap: 10px; align-items: center; }",
      ".mzw-item-label { font-size: 13px; font-weight: 500; color: #0f172a; }",
      ".mzw-item-badges { display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }",
      ".mzw-chip { border-radius: 5px; background: rgba(var(--mzw-deep), 0.08); padding: 3px 8px; font-size: 11px; color: rgb(var(--mzw-deep)); font-weight: 500; }",
      ".mzw-chip-outline { border-radius: 5px; border: 1px solid rgba(148, 163, 184, 0.20); padding: 3px 8px; font-size: 11px; color: #64748b; background: #ffffff; font-weight: 500; }",
      ".mzw-item-body { margin-top: 6px; font-size: 12px; color: #64748b; line-height: 1.5; }",
      ".mzw-item-subdetails { margin-top: 4px; font-size: 11px; color: #94a3b8; }",
      
      // Loading spinner
      ".mzw-loading { display: inline-flex; align-items: center; gap: 8px; font-size: 13px; color: #ffffff; }",
      ".mzw-spinner { width: 14px; height: 14px; border-radius: 999px; border: 2px solid rgba(255, 255, 255, 0.30); border-top-color: #ffffff; animation: mzw-spin 0.6s linear infinite; }",
      "@keyframes mzw-spin { to { transform: rotate(360deg); } }",
      
      // Mobile responsive
      "@media (max-width: 640px) { .mzw-card { max-width: 100%; padding: 32px 24px; border-radius: 20px; } .mzw-title { font-size: 26px; } .mzw-subtitle { font-size: 15px; } .mzw-dropzone { padding: 32px 24px; } }",
    ].join("");

    var wrapper = document.createElement("div");
    wrapper.className = "mzw-root";
    wrapper.innerHTML =
      '<div class="mzw-card">' +
      '  <div class="mzw-header">' +
      '    <div class="mzw-badge">' +
      '      <div class="mzw-badge-dot"></div>' +
      '      <span class="mzw-badge-text">Service gratuit • Déménageurs vérifiés</span>' +
      '    </div>' +
      '    <div class="mzw-title">Comparez 5+ devis maintenant</div>' +
      '    <div class="mzw-subtitle">L\'IA analyse vos photos, compare les devis, vous déménagez sans stress.</div>' +
      '    <div class="mzw-micro">3 min • IA • 0 spam • 5+ devis</div>' +
      "  </div>" +
      
      // Choice section
      '  <div class="mzw-choice-section" id="mzw-choice-section">' +
      '    <div class="mzw-choice-title">Comment souhaitez-vous envoyer vos photos ?</div>' +
      '    <div class="mzw-choice-grid">' +
      
      // Upload web
      '      <button class="mzw-choice-btn" id="mzw-choice-web" type="button">' +
      '        <div class="mzw-choice-icon mzw-choice-icon-teal">' +
      '          <svg class="mzw-choice-icon-svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>' +
      '        </div>' +
      '        <div class="mzw-choice-label">Upload web</div>' +
      '        <div class="mzw-choice-sublabel">Depuis votre appareil</div>' +
      '      </button>' +
      
      // WhatsApp
      '      <button class="mzw-choice-btn mzw-choice-btn-whatsapp" id="mzw-choice-whatsapp" type="button">' +
      '        <div class="mzw-choice-icon mzw-choice-icon-whatsapp">' +
      '          <svg class="mzw-choice-icon-svg" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 3.817 1.452 5.483l-1.559 5.699 5.828-1.534a11.875 11.875 0 005.672 1.449h.005c6.554 0 11.89-5.335 11.893-11.893a11.819 11.819 0 00-3.48-8.413z"/></svg>' +
      '        </div>' +
      '        <div class="mzw-choice-label">WhatsApp</div>' +
      '        <div class="mzw-choice-sublabel">Simple et rapide</div>' +
      '      </button>' +
      
      '    </div>' +
      '  </div>' +
      
      // Upload flow (hidden initially)
      '  <div id="mzw-upload-flow" style="display:none">' +
      '    <div class="mzw-dropzone" id="mzw-dropzone">' +
      '      <div class="mzw-drop-icon">' +
      '        <svg class="mzw-drop-icon-svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>' +
      '      </div>' +
      '      <div class="mzw-drop-title">Glissez vos photos ici</div>' +
      '      <div class="mzw-drop-helper">ou cliquez pour sélectionner</div>' +
      '      <div class="mzw-drop-limit">2-3 photos par pièce • Max 48 photos</div>' +
      '      <input type="file" id="mzw-file-input" accept="image/*" multiple style="display:none" />' +
      '    </div>' +
      
      '    <div class="mzw-camera" id="mzw-camera" style="display:none">' +
      '      <div class="mzw-camera-header">' +
      '        <span class="mzw-camera-text">Prenez vos photos</span>' +
      '        <div class="mzw-camera-actions">' +
      '          <button class="mzw-camera-pill-btn mzw-camera-pill-btn-primary" id="mzw-camera-start" type="button">Démarrer</button>' +
      '          <button class="mzw-camera-pill-btn mzw-camera-pill-btn-secondary" id="mzw-camera-close" type="button">Fermer</button>' +
      '        </div>' +
      '      </div>' +
      '      <div id="mzw-camera-video-wrapper" class="mzw-camera-video-wrapper" style="display:none">' +
      '        <video id="mzw-camera-video" class="mzw-camera-video" autoplay playsinline></video>' +
      '      </div>' +
      '      <div id="mzw-camera-cta-row" class="mzw-camera-cta-row" style="display:none">' +
      '        <div class="mzw-camera-cta-actions">' +
      '          <button class="mzw-camera-pill-btn mzw-camera-pill-btn-primary" id="mzw-camera-capture" type="button">Capturer</button>' +
      '          <button class="mzw-camera-pill-btn mzw-camera-pill-btn-secondary" id="mzw-camera-stop" type="button">Arrêter</button>' +
      '        </div>' +
      '        <span class="mzw-camera-counter" id="mzw-camera-counter">0</span>' +
      '      </div>' +
      '    </div>' +
      
      '    <div class="mzw-photos-row" id="mzw-photos-row">' +
      '      <div class="mzw-photos-meta">' +
      '        <span class="mzw-photos-count" id="mzw-photos-count">0 photo</span>' +
      '        <span class="mzw-photos-hint" id="mzw-photos-hint"></span>' +
      '      </div>' +
      '      <div class="mzw-photos-bar"><div class="mzw-photos-bar-fill" id="mzw-photos-bar-fill"></div></div>' +
      '      <div class="mzw-thumbs" id="mzw-thumbs"></div>' +
      '    </div>' +
      
      '    <button class="mzw-primary-btn" id="mzw-continue-btn" type="button" disabled>' +
      '      <span class="mzw-primary-btn-inner">' +
      '        <span id="mzw-btn-text">Continuer</span>' +
      '        <span class="mzw-primary-btn-chevron">→</span>' +
      '      </span>' +
      '    </button>' +
      
      '    <button class="mzw-back-btn" id="mzw-back-choice" type="button">' +
      '      <span>← Changer de méthode</span>' +
      '    </button>' +
      
      '    <div class="mzw-privacy">Vos photos servent uniquement à estimer le volume et les accès. Aucune donnée n\'est publique.</div>' +
      '  </div>' +
      
      '  <div id="mzw-error" class="mzw-error" style="display:none"></div>' +
      '  <div id="mzw-results" class="mzw-results"></div>' +
      "</div>";

    try {
    root.appendChild(style);
    root.appendChild(wrapper);
      console.log("[Moverz Widget] Widget mounted successfully");
    } catch (e) {
      console.error("[Moverz Widget] Error appending widget to DOM:", e);
    }

    // DOM refs
    var choiceSection = root.getElementById("mzw-choice-section");
    var choiceWebBtn = root.getElementById("mzw-choice-web");
    var choiceWhatsAppBtn = root.getElementById("mzw-choice-whatsapp");
    var uploadFlow = root.getElementById("mzw-upload-flow");
    var dropzone = root.getElementById("mzw-dropzone");
    var fileInput = root.getElementById("mzw-file-input");
    var cameraEl = root.getElementById("mzw-camera");
    var cameraStartBtn = root.getElementById("mzw-camera-start");
    var cameraCloseBtn = root.getElementById("mzw-camera-close");
    var cameraVideoWrapper = root.getElementById("mzw-camera-video-wrapper");
    var cameraVideo = root.getElementById("mzw-camera-video");
    var cameraCaptureBtn = root.getElementById("mzw-camera-capture");
    var cameraStopBtn = root.getElementById("mzw-camera-stop");
    var cameraCTARow = root.getElementById("mzw-camera-cta-row");
    var cameraCounter = root.getElementById("mzw-camera-counter");
    var photosRow = root.getElementById("mzw-photos-row");
    var photosCount = root.getElementById("mzw-photos-count");
    var photosHint = root.getElementById("mzw-photos-hint");
    var photosBarFill = root.getElementById("mzw-photos-bar-fill");
    var thumbsContainer = root.getElementById("mzw-thumbs");
    var continueBtn = root.getElementById("mzw-continue-btn");
    var btnText = root.getElementById("mzw-btn-text");
    var backChoiceBtn = root.getElementById("mzw-back-choice");
    var errorEl = root.getElementById("mzw-error");
    var resultsEl = root.getElementById("mzw-results");

    /** @type {File[]} */
    var selectedFiles = [];
    var isAnalyzing = false;
    var hasResults = false;
    var cameraStream = null;

    // Tracking: widget view
    trackWidgetEvent("widget_view");

    // Choice buttons
    choiceWebBtn.addEventListener("click", function () {
      trackWidgetEvent("widget_upload_click");
      choiceSection.style.display = "none";
      uploadFlow.style.display = "block";
    });

    choiceWhatsAppBtn.addEventListener("click", function () {
      trackWidgetEvent("widget_whatsapp_click");
      var whatsappPhone = "33633046059";
      var whatsappMessage = "Bonjour ! Je souhaite obtenir des devis pour mon déménagement 🚚";
      var whatsappUrl = "https://wa.me/" + whatsappPhone + "?text=" + encodeURIComponent(whatsappMessage);
      window.location.href = whatsappUrl;
    });

    // Back to choice
    backChoiceBtn.addEventListener("click", function () {
      uploadFlow.style.display = "none";
      choiceSection.style.display = "block";
      selectedFiles = [];
      updateUI();
    });

    // Dropzone
    dropzone.addEventListener("click", function () {
      trackWidgetEvent("widget_dropzone_click");
      fileInput.click();
    });

    fileInput.addEventListener("change", function (e) {
      if (e.target.files && e.target.files.length > 0) {
        addFiles(Array.from(e.target.files));
      }
    });

    // Drag & drop
    dropzone.addEventListener("dragover", function (e) {
      e.preventDefault();
      dropzone.classList.add("mzw-dropzone--active");
    });

    dropzone.addEventListener("dragleave", function () {
      dropzone.classList.remove("mzw-dropzone--active");
    });

    dropzone.addEventListener("drop", function (e) {
      e.preventDefault();
      dropzone.classList.remove("mzw-dropzone--active");
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        addFiles(Array.from(e.dataTransfer.files));
      }
    });

    // Camera
    cameraStartBtn.addEventListener("click", function () {
      if (!cameraStream) {
        navigator.mediaDevices
          .getUserMedia({ video: { facingMode: "environment" }, audio: false })
          .then(function (stream) {
            cameraStream = stream;
            cameraVideo.srcObject = stream;
            cameraVideoWrapper.style.display = "block";
            cameraCTARow.style.display = "flex";
          })
          .catch(function (err) {
            showError("Impossible d'accéder à la caméra : " + err.message);
          });
      }
    });

    cameraCloseBtn.addEventListener("click", function () {
      stopCamera();
      cameraEl.style.display = "none";
    });

    cameraStopBtn.addEventListener("click", function () {
      stopCamera();
    });

    cameraCaptureBtn.addEventListener("click", function () {
      if (!cameraStream) return;
      var canvas = document.createElement("canvas");
      canvas.width = cameraVideo.videoWidth;
      canvas.height = cameraVideo.videoHeight;
      var ctx = canvas.getContext("2d");
      ctx.drawImage(cameraVideo, 0, 0);
      canvas.toBlob(function (blob) {
        if (blob) {
          var file = new File([blob], "camera-" + Date.now() + ".jpg", { type: "image/jpeg" });
          addFiles([file]);
        }
      }, "image/jpeg");
    });

    // Continue button
    continueBtn.addEventListener("click", function () {
      if (selectedFiles.length > 0 && !isAnalyzing && !hasResults) {
        trackWidgetEvent("widget_continue_click", { count: selectedFiles.length, has_results: false });
        analyzePhotos();
      } else if (hasResults) {
        trackWidgetEvent("widget_continue_click", { count: selectedFiles.length, has_results: true });
        window.location.href = getTunnelUrl();
      }
    });

    function addFiles(files) {
      var newFiles = files.filter(function (f) {
        return f.type.startsWith("image/") && selectedFiles.length < 48;
      });
      selectedFiles = selectedFiles.concat(newFiles);
      if (selectedFiles.length > 0) {
        trackWidgetEvent("widget_photos_added", { count: selectedFiles.length });
      }
      updateUI();
    }

    function removeFile(index) {
      selectedFiles.splice(index, 1);
      trackWidgetEvent("widget_photos_removed", { count: selectedFiles.length });
      updateUI();
    }

    function updateUI() {
      var count = selectedFiles.length;
      
      // Photos count and progress
      if (count > 0) {
        photosRow.style.display = "flex";
        photosCount.textContent = count + " photo" + (count > 1 ? "s" : "");
        
        var progress = Math.min((count / 12) * 100, 100);
        photosBarFill.style.width = progress + "%";
        
        if (count < 6) {
          photosHint.textContent = "Continuez";
        } else if (count < 12) {
          photosHint.textContent = "Excellent";
        } else {
          photosHint.textContent = "Parfait";
        }
        
        // Thumbnails (max 3)
        thumbsContainer.innerHTML = "";
        selectedFiles.slice(0, 3).forEach(function (file, idx) {
          var url = URL.createObjectURL(file);
          var thumb = document.createElement("div");
          thumb.className = "mzw-thumb";
          thumb.innerHTML =
            '<img class="mzw-thumb-img" src="' + url + '" alt="Photo" />' +
            '<button class="mzw-thumb-remove" type="button" data-index="' + idx + '">×</button>';
          thumbsContainer.appendChild(thumb);
        });
        
        // Remove handlers
        thumbsContainer.querySelectorAll(".mzw-thumb-remove").forEach(function (btn) {
          btn.addEventListener("click", function (e) {
            e.stopPropagation();
            removeFile(parseInt(this.getAttribute("data-index"), 10));
          });
        });
        
        continueBtn.disabled = false;
      } else {
        photosRow.style.display = "none";
        continueBtn.disabled = true;
      }
      
      // Camera counter
      cameraCounter.textContent = count.toString();
    }

    function stopCamera() {
      if (cameraStream) {
        cameraStream.getTracks().forEach(function (track) {
          track.stop();
        });
        cameraStream = null;
      }
      cameraVideoWrapper.style.display = "none";
      cameraCTARow.style.display = "none";
    }

    function showError(msg) {
      errorEl.textContent = msg;
      errorEl.style.display = "block";
      setTimeout(function () {
        errorEl.style.display = "none";
      }, 5000);
    }

    function analyzePhotos() {
      if (selectedFiles.length === 0) return;

      isAnalyzing = true;
      continueBtn.disabled = true;
      btnText.textContent = "Analyse en cours...";

        var formData = new FormData();
      selectedFiles.forEach(function (file) {
          formData.append("photos", file);
        });

      fetch(apiUrl, {
          method: "POST",
          body: formData,
      })
        .then(function (res) {
          if (!res.ok) throw new Error("Erreur serveur");
          return res.json();
        })
        .then(function (data) {
          isAnalyzing = false;
          hasResults = true;
          btnText.textContent = "Voir mes devis";
          continueBtn.disabled = false;
          displayResults(data);
        })
        .catch(function (err) {
          isAnalyzing = false;
          btnText.textContent = "Continuer";
          continueBtn.disabled = false;
          showError("Impossible d'analyser vos photos : " + err.message);
        });
    }

    function displayResults(data) {
      if (!data || !data.rooms || data.rooms.length === 0) return;

      var html = '<div class="mzw-results-header">' +
        '<div class="mzw-results-title">Inventaire estimé</div>' +
        '<div class="mzw-results-pill">' + data.totalVolume.toFixed(1) + ' m³</div>' +
        '</div>' +
        '<div class="mzw-results-list">';

      data.rooms.forEach(function (room) {
        html += '<div class="mzw-item">' +
          '<div class="mzw-item-header">' +
          '<div class="mzw-item-label">' + room.roomType + '</div>' +
          '<div class="mzw-item-badges">' +
          '<span class="mzw-chip">' + room.volume.toFixed(1) + ' m³</span>' +
          '</div>' +
          '</div>';
        
        if (room.objects && room.objects.length > 0) {
          html += '<div class="mzw-item-body">' + room.objects.slice(0, 3).join(", ");
          if (room.objects.length > 3) html += "...";
          html += '</div>';
        }
        
        html += '</div>';
      });

      html += '</div>';
      resultsEl.innerHTML = html;
      resultsEl.classList.add("mzw-fade-in");
    }

    function trackWidgetEvent(eventName, params) {
      if (typeof window.gtag === "function") {
        window.gtag("event", eventName, params || {});
      }
    }
  }

  onReady(function () {
    createRoot({});
  });
})(); 
