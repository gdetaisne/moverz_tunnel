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
      ".mzw-card { background: #ffffff; border-radius: 16px; padding: 32px; box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08), 0 0 0 1px rgba(15, 23, 42, 0.05); color: #0f172a; max-width: 480px; display: flex; flex-direction: column; }",
      ".mzw-header { margin-bottom: 32px; }",
      ".mzw-badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 8px; border-radius: 6px; background: rgba(var(--mzw-deep), 0.06); color: rgb(var(--mzw-deep)); font-size: 11px; font-weight: 600; letter-spacing: 0.02em; }",
      ".mzw-badge-dot { width: 5px; height: 5px; border-radius: 999px; background: rgb(var(--mzw-deep)); opacity: 0.8; }",
      ".mzw-title { margin-top: 16px; font-size: 22px; font-weight: 600; line-height: 1.3; color: #0f172a; letter-spacing: -0.015em; }",
      ".mzw-subtitle { margin-top: 8px; font-size: 14px; color: #64748b; line-height: 1.5; font-weight: 400; }",
      ".mzw-benefits { margin-top: 20px; display: flex; gap: 12px; }",
      ".mzw-benefit { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #475569; font-weight: 500; }",
      ".mzw-benefit-icon { width: 16px; height: 16px; border-radius: 999px; background: rgba(var(--mzw-deep), 0.10); display: flex; align-items: center; justify-content: center; font-size: 10px; color: rgb(var(--mzw-deep)); flex-shrink: 0; }",
      ".mzw-dropzone { margin-top: 0; border: 1.5px dashed rgba(148, 163, 184, 0.30); border-radius: 12px; background: rgba(248, 250, 252, 0.50); padding: 40px 32px; text-align: center; cursor: pointer; transition: all 0.15s ease; position: relative; }",
      ".mzw-dropzone:hover { border-color: rgba(var(--mzw-deep), 0.40); background: rgba(var(--mzw-deep), 0.02); }",
      ".mzw-dropzone.mzw-dropzone--active { border-color: rgb(var(--mzw-deep)); background: rgba(var(--mzw-deep), 0.04); border-style: solid; }",
      ".mzw-drop-icon { width: 48px; height: 48px; border-radius: 10px; background: rgba(var(--mzw-deep), 0.08); display: inline-flex; align-items: center; justify-content: center; margin: 0 auto 16px; }",
      ".mzw-drop-icon-svg { width: 24px; height: 24px; }",
      ".mzw-drop-title { font-size: 15px; font-weight: 600; color: #0f172a; letter-spacing: -0.01em; }",
      ".mzw-drop-helper { margin-top: 6px; font-size: 13px; color: #64748b; font-weight: 400; }",
      ".mzw-camera { margin-top: 20px; border-radius: 12px; border: 1px solid rgba(148, 163, 184, 0.20); background: #0f172a; padding: 16px; }",
      ".mzw-camera-header { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 12px; }",
      ".mzw-camera-text { font-size: 12px; color: #cbd5e1; font-weight: 400; line-height: 1.4; }",
      ".mzw-camera-actions { display: flex; gap: 8px; align-items: center; }",
      ".mzw-camera-pill-btn { border-radius: 8px; padding: 8px 14px; font-size: 12px; font-weight: 600; border: none; cursor: pointer; transition: all 0.15s ease; }",
      ".mzw-camera-pill-btn-primary { background: rgb(var(--mzw-deep)); color: #ffffff; }",
      ".mzw-camera-pill-btn-primary:hover { background: rgba(var(--mzw-deep), 0.90); }",
      ".mzw-camera-pill-btn-secondary { border: 1px solid rgba(148, 163, 184, 0.30); background: transparent; color: #cbd5e1; }",
      ".mzw-camera-pill-btn-secondary:hover { background: rgba(255, 255, 255, 0.05); }",
      ".mzw-camera-video-wrapper { margin-top: 12px; border-radius: 10px; overflow: hidden; border: 1px solid rgba(148, 163, 184, 0.20); background: #000000; }",
      ".mzw-camera-video { width: 100%; height: 240px; object-fit: cover; background: #000000; }",
      ".mzw-camera-cta-row { margin-top: 12px; display: flex; justify-content: space-between; align-items: center; gap: 10px; }",
      ".mzw-camera-cta-actions { display: flex; gap: 8px; align-items: center; flex: 1; }",
      ".mzw-camera-cta-actions .mzw-camera-pill-btn-primary { flex: 1; }",
      ".mzw-camera-cta-actions .mzw-camera-pill-btn-secondary { white-space: nowrap; }",
      ".mzw-camera-counter { font-size: 12px; color: #94a3b8; font-weight: 500; }",
      ".mzw-photos-row { margin-top: 16px; display: flex; gap: 8px; flex-wrap: wrap; }",
      ".mzw-photo-pill { border-radius: 8px; background: rgba(var(--mzw-deep), 0.06); border: 1px solid rgba(var(--mzw-deep), 0.12); padding: 8px 12px; font-size: 13px; display: inline-flex; align-items: center; gap: 8px; white-space: nowrap; color: #0f172a; font-weight: 500; }",
      ".mzw-photo-pill-count { width: 20px; height: 20px; border-radius: 6px; background: rgba(var(--mzw-deep), 0.12); display: flex; align-items: center; justify-content: center; font-size: 11px; color: rgb(var(--mzw-deep)); font-weight: 600; }",
      ".mzw-photo-pill-remove { cursor: pointer; opacity: 0.50; font-size: 16px; font-weight: 400; transition: opacity 0.15s ease; margin-left: 4px; }",
      ".mzw-photo-pill-remove:hover { opacity: 1; }",
      ".mzw-summary { margin-top: 16px; display: flex; justify-content: flex-end; }",
      ".mzw-summary-pill { font-size: 12px; padding: 6px 12px; border-radius: 8px; background: rgba(var(--mzw-deep), 0.08); color: rgb(var(--mzw-deep)); font-weight: 600; border: 1px solid rgba(var(--mzw-deep), 0.12); }",
      ".mzw-footer { margin-top: 24px; display: flex; flex-direction: column; gap: 12px; }",
      ".mzw-primary-btn { position: relative; overflow: hidden; border: none; border-radius: 10px; padding: 12px 20px; font-size: 14px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 8px; background: rgb(var(--mzw-deep)); color: #ffffff; transition: all 0.15s ease; }",
      ".mzw-primary-btn[disabled] { opacity: 0.5; cursor: not-allowed; }",
      ".mzw-primary-btn-inner { position: relative; z-index: 2; display: inline-flex; align-items: center; justify-content: center; gap: 8px; }",
      ".mzw-progress-mask { position: absolute; inset: 0; background: rgba(15, 23, 42, 0.20); pointer-events: none; border-radius: inherit; transform: translateZ(0); width: 0%; opacity: 0; }",
      ".mzw-primary-btn:not([disabled]):hover { background: rgba(var(--mzw-deep), 0.90); }",
      ".mzw-primary-btn:not([disabled]):active { background: rgba(var(--mzw-deep), 0.80); }",
      ".mzw-primary-btn-chevron { font-size: 14px; }",
      ".mzw-small-text { font-size: 12px; color: #94a3b8; text-align: center; font-weight: 400; }",
      ".mzw-links { display: flex; justify-content: center; gap: 16px; }",
      ".mzw-link { appearance: none; border: none; background: transparent; padding: 0; margin: 0; font-size: 13px; color: #64748b; font-weight: 500; cursor: pointer; text-decoration: none; transition: color 0.15s ease; }",
      ".mzw-link:hover { color: rgb(var(--mzw-deep)); }",
      ".mzw-error { margin-top: 12px; font-size: 13px; color: #dc2626; font-weight: 500; padding: 12px; background: rgba(220, 38, 38, 0.05); border-radius: 10px; border: 1px solid rgba(220, 38, 38, 0.15); }",
      ".mzw-results { margin-top: 16px; border-radius: 12px; background: rgba(248, 250, 252, 0.50); border: 1px solid rgba(148, 163, 184, 0.20); padding: 16px; max-height: 320px; overflow: auto; color: #0f172a; }",
      ".mzw-results-header { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid rgba(148, 163, 184, 0.15); }",
      ".mzw-results-title { font-size: 14px; font-weight: 600; color: #0f172a; }",
      ".mzw-results-pill { font-size: 12px; color: rgb(var(--mzw-deep)); background: rgba(var(--mzw-deep), 0.08); border-radius: 8px; padding: 4px 10px; font-weight: 600; border: 1px solid rgba(var(--mzw-deep), 0.12); }",
      ".mzw-results-list { display: flex; flex-direction: column; gap: 8px; }",
      ".mzw-item { border-radius: 10px; background: #ffffff; padding: 12px; border: 1px solid rgba(148, 163, 184, 0.15); transition: border-color 0.15s ease; }",
      ".mzw-item:hover { border-color: rgba(var(--mzw-deep), 0.25); }",
      ".mzw-item-header { display: flex; justify-content: space-between; gap: 10px; align-items: center; }",
      ".mzw-item-label { font-size: 13px; font-weight: 600; color: #0f172a; }",
      ".mzw-item-badges { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; justify-content: flex-end; }",
      ".mzw-chip { border-radius: 6px; background: rgba(var(--mzw-deep), 0.08); padding: 3px 8px; font-size: 11px; color: rgb(var(--mzw-deep)); font-weight: 600; }",
      ".mzw-chip-outline { border-radius: 6px; border: 1px solid rgba(148, 163, 184, 0.25); padding: 3px 8px; font-size: 11px; color: #475569; background: transparent; font-weight: 500; }",
      ".mzw-item-body { margin-top: 6px; font-size: 12px; color: #64748b; display: flex; flex-direction: column; gap: 2px; font-weight: 400; }",
      ".mzw-item-subdetails { margin-top: 4px; font-size: 11px; color: #94a3b8; font-weight: 400; }",
      ".mzw-loading { display: inline-flex; align-items: center; gap: 8px; font-size: 12px; color: #ffffff; font-weight: 500; }",
      ".mzw-spinner { width: 16px; height: 16px; border-radius: 999px; border: 2px solid rgba(255, 255, 255, 0.25); border-top-color: #ffffff; animation: mzw-spin 0.6s linear infinite; }",
      "@keyframes mzw-spin { to { transform: rotate(360deg); } }",
      "@media (max-width: 640px) { .mzw-card { max-width: 100%; padding: 24px 20px; border-radius: 12px; } .mzw-title { font-size: 20px; } .mzw-subtitle { font-size: 13px; } .mzw-dropzone { padding: 32px 20px; } .mzw-primary-btn { padding: 11px 18px; font-size: 14px; } }",
    ].join("");

    var wrapper = document.createElement("div");
    wrapper.className = "mzw-root";
    wrapper.innerHTML =
      '<div class="mzw-card">' +
      '  <div class="mzw-header">' +
      '    <div class="mzw-badge"><span class="mzw-badge-dot"></span><span>AI Inventory</span></div>' +
      '    <div class="mzw-title">Get accurate moving quotes</div>' +
      '    <div class="mzw-subtitle">AI analyzes your photos to estimate volume and value—so quotes are comparable and surprises are minimized.</div>' +
      '    <div class="mzw-benefits">' +
      '      <div class="mzw-benefit"><span class="mzw-benefit-icon">✓</span><span>Fair estimates</span></div>' +
      '      <div class="mzw-benefit"><span class="mzw-benefit-icon">✓</span><span>No surprises</span></div>' +
      "    </div>" +
      "  </div>" +
      '  <div class="mzw-summary" id="mzw-summary" style="display:none"></div>' +
      '  <div class="mzw-dropzone" id="mzw-dropzone">' +
      '    <div class="mzw-drop-icon">' +
      '      <svg class="mzw-drop-icon-svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" style="color: rgb(var(--mzw-deep));"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>' +
      "    </div>" +
      '    <div class="mzw-drop-title">Upload photos</div>' +
      '    <div class="mzw-drop-helper">Add 1–3 photos to get started</div>' +
      "  </div>" +
      '  <input type="file" id="mzw-file-input" accept="image/*" multiple style="display:none" />' +
      '  <div class="mzw-photos-row" id="mzw-photos-row" style="display:none"></div>' +
      '  <div class="mzw-footer">' +
      '    <div class="mzw-results" id="mzw-results" style="display:none">' +
      '      <div class="mzw-results-header">' +
      '        <div class="mzw-results-title" id="mzw-results-title">Inventaire estimé</div>' +
      '        <div class="mzw-results-pill" id="mzw-results-pill"></div>' +
      "      </div>" +
      '      <div class="mzw-results-list" id="mzw-results-list"></div>' +
      "    </div>" +
      '    <button class="mzw-primary-btn" id="mzw-analyze-btn">' +
      '      <div class="mzw-progress-mask" id="mzw-progress-mask"></div>' +
      '      <div class="mzw-primary-btn-inner">' +
      '        <span id="mzw-analyze-label">Choisir mes photos</span>' +
      '        <span class="mzw-primary-btn-chevron">→</span>' +
      "      </div>" +
      "    </button>" +
      '    <div class="mzw-small-text">Gratuit · Résultat en &lt; 60 secondes</div>' +
      '    <div class="mzw-links">' +
      '      <button type="button" class="mzw-link" id="mzw-photos-later">Ajouter plus tard</button>' +
      "    </div>" +
      '    <div class="mzw-error" id="mzw-error" style="display:none"></div>' +
      "  </div>" +
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
      // CTA reste cliquable même sans photo (il sert alors à ouvrir la galerie/caméra).
      analyzeBtn.disabled = isAnalyzing;
      if (!hasResults && selectedFiles.length === 0) {
        analyzeLabel.textContent = "Choisir mes photos";
      } else if (!hasResults) {
        analyzeLabel.textContent = "Lancer l’analyse";
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

        // Step 2 : on garde seulement l'inventaire + CTA bas de carte
        dropzone.style.display = "none";
        photosRow.style.display = "none";
        if (headerEl) headerEl.style.display = "none";
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
        if (!selectedFiles.length && !isAnalyzing) {
          // UX: si aucune photo n'est sélectionnée, ce bouton sert de raccourci
          // vers la sélection galerie/caméra.
          dropzone.click();
          return;
        }
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


