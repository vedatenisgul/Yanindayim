// Reading Mode controller for Yanındayım
// Uses browser Web Speech API (speechSynthesis) only.
(function () {
  if (!("speechSynthesis" in window)) {
    // Browser not supported; fail silently for now.
    return;
  }

  const synth = window.speechSynthesis;

  const STATE = {
    enabled: false,
    voices: [],
    selectedVoice: null,
    rate: 0.9,
    pitch: 1.0,
    currentSentences: [],
    currentIndex: 0,
    isPaused: false,
    lastSpokenText: "",
    hoverEnabled: true,
    utterance: null,
    userStopped: false,
  };

  const UI = {};

  function byId(id) {
    return document.getElementById(id);
  }

  function initUIRefs() {
    UI.toggle = document.querySelector("[data-reading-toggle]");
    UI.panel = document.querySelector("[data-reading-panel]");
    UI.close = document.querySelector("[data-reading-close]");
    UI.btnStop = byId("reading-stop");
    UI.btnStopFloating = byId("reading-stop-floating");
    UI.btnPause = byId("reading-pause");
    UI.btnRepeat = byId("reading-repeat");
    UI.btnNext = byId("reading-next");
    UI.btnPrev = byId("reading-prev");
    UI.hoverCheckbox = byId("reading-hover");
  }

  const STORAGE_KEYS = {
    enabled: "yanReadingEnabled",
    panelVisible: "yanReadingPanelVisible",
  };

  // Text targets that can get an inline “eye” button
  const TEXT_TARGET_SELECTOR =
    "p, h1, h2, h3, h4, h5, h6, .nav-button, .reading-mode-toggle, .logout-link, .search-back-button, .search-input, .suggestion-title, .hero-title, .guide-content, .feature-card, .suggestion-link, .auth-title, .auth-subtitle, .form-group label, .takildim-button, .global-help-header h3, .global-help-subtitle, .help-option-card, .calm-card, .ai-guidance-box, #global-help-modal button, #global-help-modal input, .safety-btn-hero, .safety-floating-btn, .safety-header h3, .scenario-text, .safety-action-btn, #result-title, #result-explanation, #btn-next-scenario";
  const MIN_TEXT_LENGTH = 4;

  function setPanelVisible(visible) {
    // Panel is no longer used as a primary UI; keep it hidden.
    if (!UI.panel) return;
    UI.panel.hidden = true;
    UI.panel.classList.remove("reading-mode-panel-visible");
  }

  function addEyeButtons() {
    if (!STATE.enabled) return;
    const candidates = document.querySelectorAll(TEXT_TARGET_SELECTOR);
    candidates.forEach((el) => {
      if (!(el instanceof Element)) return;
      if (el.closest("[data-reading-panel]")) return;

      // Prevent duplicate eyes: if an ancestor is also a candidate, skip this one
      // This solves the issue of having eyes both on .feature-card and its <h3>
      let parent = el.parentElement;
      while (parent) {
        if (parent.matches && parent.matches(TEXT_TARGET_SELECTOR)) {
          return; // Skip if a parent will already get an eye
        }
        parent = parent.parentElement;
      }

      if (el.dataset.readingEyeAttached === "1") return;

      const text = getReadableText(el);
      if (!text || text.length < MIN_TEXT_LENGTH) return;

      el.classList.add("reading-text-target");
      el.dataset.readingEyeAttached = "1";

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "reading-eye-button";
      btn.setAttribute("aria-label", "Bu metni oku");
      btn.innerHTML =
        '<span class="reading-eye-icon" aria-hidden="true">' +
        '<svg viewBox="0 0 24 24" width="65%" height="65%" focusable="false" aria-hidden="true">' +
        '<path d="M12 5C7 5 3.1 8.1 1.5 12c1.6 3.9 5.5 7 10.5 7s8.9-3.1 10.5-7C20.9 8.1 17 5 12 5zm0 11.2A4.2 4.2 0 1 1 16.2 12 4.2 4.2 0 0 1 12 16.2zm0-6.7A2.5 2.5 0 1 0 14.5 12 2.5 2.5 0 0 0 12 9.5z" fill="currentColor"/>' +
        "</svg></span>";

      btn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (!STATE.enabled) return;
        const target = el.tagName === "INPUT" ? el : el; // logically same, but we'll use 'el' for text
        const t = getReadableText(el);
        if (t) {
          speakText(t);
        }
      });

      if (el.tagName === "INPUT") {
        el.parentElement.style.position = "relative";
        el.parentElement.appendChild(btn);
      } else {
        el.appendChild(btn);
      }
    });
  }

  function clearEyeButtons() {
    document.querySelectorAll(".reading-eye-button").forEach((btn) => {
      btn.remove();
    });
    document.querySelectorAll(".reading-text-target").forEach((el) => {
      el.classList.remove("reading-text-target");
      delete el.dataset.readingEyeAttached;
    });
  }

  function splitIntoSentences(text) {
    if (!text) return [];
    const cleaned = text.replace(/\s+/g, " ").trim();
    if (!cleaned) return [];
    const parts = cleaned.match(/[^\.!?]+[\.!?…]?/g);
    return (parts || []).map((s) => s.trim()).filter(Boolean);
  }

  function pickBestVoice(voices) {
    if (!voices || !voices.length) return null;
    const turkishVoices = voices.filter((v) =>
      (v.lang || "").toLowerCase().startsWith("tr")
    );
    if (!turkishVoices.length) {
      return voices[0];
    }
    const preferredVendors = ["google", "microsoft", "apple", "premium", "natural"];
    const scored = turkishVoices
      .map((v) => {
        const nameLower = (v.name || "").toLowerCase();
        let score = 0;
        preferredVendors.forEach((vendor, i) => {
          if (nameLower.includes(vendor)) {
            score += (preferredVendors.length - i) * 10;
          }
        });
        if (v.default) score += 5;
        return { v, score };
      })
      .sort((a, b) => b.score - a.score);
    return scored[0].v;
  }

  function refreshVoices() {
    const voices = synth.getVoices();
    if (!voices || !voices.length) return;
    STATE.voices = voices;

    const prevName = STATE.selectedVoice && STATE.selectedVoice.name;

    if (!STATE.selectedVoice) {
      const best = pickBestVoice(voices);
      STATE.selectedVoice = best || voices[0];
    } else if (prevName) {
      const stillThere = voices.find((v) => v.name === prevName);
      if (stillThere) {
        STATE.selectedVoice = stillThere;
      }
    }

    // UI is minimal, we only keep the best automatic choice in STATE.selectedVoice.
  }

  function cancelCurrent() {
    STATE.userStopped = true;
    synth.cancel();
    STATE.utterance = null;
    STATE.isPaused = false;
    if (UI.btnStopFloating) {
      UI.btnStopFloating.classList.remove("visible");
    }
  }

  function speakSentenceAt(index) {
    if (!STATE.enabled) return;
    const sentences = STATE.currentSentences;
    if (!sentences || !sentences.length) return;
    if (index < 0 || index >= sentences.length) return;

    cancelCurrent();
    STATE.currentIndex = index;
    STATE.userStopped = false;

    const text = sentences[index];
    if (!text) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "tr-TR";
    utterance.rate = STATE.rate;
    utterance.pitch = STATE.pitch;
    if (STATE.selectedVoice) {
      utterance.voice = STATE.selectedVoice;
    }

    utterance.onend = function () {
      if (!STATE.enabled || STATE.userStopped) return;
      const nextIndex = STATE.currentIndex + 1;
      if (nextIndex < STATE.currentSentences.length) {
        speakSentenceAt(nextIndex);
      } else {
        // Finished reading
        if (UI.btnStopFloating) {
          UI.btnStopFloating.classList.remove("visible");
        }
      }
    };

    utterance.onerror = function () {
      STATE.utterance = null;
      STATE.isPaused = false;
      if (UI.btnStopFloating) {
        UI.btnStopFloating.classList.remove("visible");
      }
    };

    STATE.lastSpokenText = sentences.join(" ");
    STATE.utterance = utterance;

    // Show stop button when speaking starts
    if (UI.btnStopFloating) {
      UI.btnStopFloating.classList.add("visible");
    }

    synth.speak(utterance);
  }

  function speakText(text) {
    if (!STATE.enabled) return;
    const sentences = splitIntoSentences(text);
    if (!sentences.length) return;
    STATE.currentSentences = sentences;
    speakSentenceAt(0);
  }

  function extractLabelFromAriaLabelledby(el) {
    const ids = (el.getAttribute("aria-labelledby") || "").split(/\s+/).filter(Boolean);
    if (!ids.length) return "";
    const texts = ids
      .map((id) => document.getElementById(id))
      .filter(Boolean)
      .map((n) => n.innerText || n.textContent || "")
      .map((t) => t.trim())
      .filter(Boolean);
    return texts.join(" ");
  }

  function getReadableText(target) {
    if (!target || !(target instanceof Element)) return "";

    const ariaLabel = target.getAttribute("aria-label");
    if (ariaLabel) return ariaLabel.trim();

    const viaLabelled = extractLabelFromAriaLabelledby(target);
    if (viaLabelled) return viaLabelled;

    const alt = target.getAttribute("alt");
    if (alt) return alt.trim();

    const title = target.getAttribute("title");
    if (title) return title.trim();

    if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
      const placeholder = target.getAttribute("placeholder");
      const val = target.value;
      if (val && val.trim()) return val.trim();
      if (placeholder && placeholder.trim()) return placeholder.trim();
    }

    if (target.tagName === "SELECT") {
      const selected = target.selectedOptions && target.selectedOptions[0];
      if (selected && selected.textContent) {
        return selected.textContent.trim();
      }
    }

    if (target.tagName === "OPTION") {
      if (target.textContent) return target.textContent.trim();
    }

    const text = target.innerText || target.textContent || "";
    return text.replace(/\s+/g, " ").trim();
  }

  function isInteractive(el) {
    if (!el || !(el instanceof Element)) return false;
    const tag = el.tagName;
    if (["A", "BUTTON", "INPUT", "SELECT", "TEXTAREA", "OPTION"].includes(tag)) {
      return true;
    }
    const role = el.getAttribute("role");
    if (role && ["button", "link", "menuitem", "tab"].includes(role)) {
      return true;
    }
    const tabindex = el.getAttribute("tabindex");
    if (tabindex && parseInt(tabindex, 10) >= 0) {
      return true;
    }
    if (el.hasAttribute("aria-label") || el.hasAttribute("aria-labelledby")) {
      return true;
    }
    return false;
  }

  function handleUserInteraction(event) {
    if (!STATE.enabled) return;

    // Don't read if clicking on reading mode controls or close buttons
    if (event.target.closest("[data-reading-panel], [data-reading-toggle], [data-reading-close], .close-modal-btn")) {
      return;
    }

    let target = event.target;

    // For click events, try to find the best readable element
    if (event.type === "click") {
      // First check if it's an interactive element
      const interactive = target.closest("a, button, [role='button'], [role='link'], [role='menuitem'], input, select, textarea, [tabindex], [aria-label], [aria-labelledby]");
      if (interactive && isInteractive(interactive)) {
        target = interactive;
      } else {
        // Otherwise, try to find readable text content (p, h1-h6, div with text, etc.)
        const textElement = target.closest("p, h1, h2, h3, h4, h5, h6, .hero-title, .guide-content, .feature-card, .suggestion-link, [class*='content'], [class*='text'], .scenario-text, .safety-header h3");
        if (textElement) {
          target = textElement;
        }
      }
    } else {
      // For focus events, only handle interactive elements
      target = target.closest("a, button, [role='button'], [role='link'], [role='menuitem'], input, select, textarea, [tabindex], [aria-label], [aria-labelledby]") || target;
      if (!isInteractive(target)) return;
    }

    const text = getReadableText(target);
    if (!text || text.length < 3) return; // Skip very short text

    // Avoid repeating the exact same text immediately on focus after click
    if (event.type === "focusin" && text === STATE.lastSpokenText) {
      return;
    }

    speakText(text);
  }

  let hoverTimer = null;
  function handleHover(event) {
    if (!STATE.enabled || !STATE.hoverEnabled) return;

    // Don't read if hovering over reading mode controls
    if (event.target.closest("[data-reading-panel], [data-reading-toggle], [data-reading-close]")) {
      return;
    }

    if (hoverTimer) {
      clearTimeout(hoverTimer);
      hoverTimer = null;
    }

    let target = event.target;

    // Try interactive elements first
    const interactive = target.closest("a, button, [role='button'], [role='link'], [role='menuitem'], input, select, textarea, [tabindex], [aria-label], [aria-labelledby]");
    if (interactive && isInteractive(interactive)) {
      target = interactive;
    } else {
      // Otherwise, try to find readable text content
      const textElement = target.closest("p, h1, h2, h3, h4, h5, h6, .hero-title, .guide-content, .feature-card, .suggestion-link, [class*='content'], [class*='text']");
      if (textElement) {
        target = textElement;
      }
    }

    hoverTimer = setTimeout(() => {
      const text = getReadableText(target);
      if (!text || text.length < 3) return; // Skip very short text
      speakText(text);
    }, 300);
  }

  function attachInteractionListeners() {
    document.addEventListener("click", handleUserInteraction, true);
    document.addEventListener("focusin", handleUserInteraction, true);
    document.addEventListener("mouseover", handleHover, true);
  }

  function detachInteractionListeners() {
    document.removeEventListener("click", handleUserInteraction, true);
    document.removeEventListener("focusin", handleUserInteraction, true);
    document.removeEventListener("mouseover", handleHover, true);
  }

  function toggleEnabled() {
    STATE.enabled = !STATE.enabled;
    if (STATE.enabled) {
      // Only use inline eye buttons in reading mode
      addEyeButtons();
      if (UI.toggle) {
        UI.toggle.classList.add("reading-mode-toggle-active");
        UI.toggle.setAttribute("aria-pressed", "true");
      }
      try {
        localStorage.setItem(STORAGE_KEYS.enabled, "1");
      } catch (e) { }
    } else {
      cancelCurrent();
      detachInteractionListeners();
      clearEyeButtons();
      if (UI.toggle) {
        UI.toggle.classList.remove("reading-mode-toggle-active");
        UI.toggle.setAttribute("aria-pressed", "false");
      }
      try {
        localStorage.setItem(STORAGE_KEYS.enabled, "0");
      } catch (e) { }
    }
  }

  function bindUIEvents() {
    if (UI.toggle) {
      UI.toggle.addEventListener("click", function (e) {
        e.preventDefault();
        toggleEnabled();
      });
    }

    if (UI.close) {
      UI.close.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        // Disable reading mode when closing
        if (STATE.enabled) {
          toggleEnabled();
        }
      });
    }

    if (UI.btnStop) {
      UI.btnStop.addEventListener("click", function (e) {
        e.preventDefault();
        cancelCurrent();
      });
    }

    if (UI.btnStopFloating) {
      UI.btnStopFloating.addEventListener("click", function (e) {
        e.preventDefault();
        cancelCurrent();
      });
    }

    if (UI.btnPause) {
      UI.btnPause.addEventListener("click", function (e) {
        e.preventDefault();
        if (!STATE.utterance) return;
        if (!STATE.isPaused) {
          synth.pause();
          STATE.isPaused = true;
          UI.btnPause.textContent = "Devam Et";
        } else {
          synth.resume();
          STATE.isPaused = false;
          UI.btnPause.textContent = "Duraklat";
        }
      });
    }

    if (UI.btnRepeat) {
      UI.btnRepeat.addEventListener("click", function (e) {
        e.preventDefault();
        if (!STATE.currentSentences.length) return;
        speakSentenceAt(STATE.currentIndex || 0);
      });
    }

    if (UI.btnNext) {
      UI.btnNext.addEventListener("click", function (e) {
        e.preventDefault();
        const nextIndex = STATE.currentIndex + 1;
        if (nextIndex < STATE.currentSentences.length) {
          speakSentenceAt(nextIndex);
        }
      });
    }

    if (UI.btnPrev) {
      UI.btnPrev.addEventListener("click", function (e) {
        e.preventDefault();
        const prevIndex = STATE.currentIndex - 1;
        if (prevIndex >= 0) {
          speakSentenceAt(prevIndex);
        }
      });
    }

    if (UI.hoverCheckbox) {
      UI.hoverCheckbox.checked = STATE.hoverEnabled;
      UI.hoverCheckbox.addEventListener("change", function () {
        STATE.hoverEnabled = UI.hoverCheckbox.checked;
      });
    }
  }

  function init() {
    initUIRefs();
    if (!UI.toggle || !UI.panel) {
      return;
    }
    bindUIEvents();
    refreshVoices();
    if (typeof synth.onvoiceschanged !== "undefined") {
      synth.onvoiceschanged = function () {
        refreshVoices();
      };
    }

    // Restore state from previous page if available
    try {
      const enabledStored = localStorage.getItem(STORAGE_KEYS.enabled) === "1";

      if (enabledStored) {
        STATE.enabled = true;
        addEyeButtons();
        if (UI.toggle) {
          UI.toggle.classList.add("reading-mode-toggle-active");
          UI.toggle.setAttribute("aria-pressed", "true");
        }
      } else {
        clearEyeButtons();
      }

      // Panel stays hidden in the new design
      setPanelVisible(false);
    } catch (e) {
      // If storage fails, fall back to default hidden panel and disabled mode
      setPanelVisible(false);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Expose API for external control (like search results or debug)
  window.YanindayimReadingMode = {
    enable() {
      if (!STATE.enabled) toggleEnabled();
    },
    disable() {
      if (STATE.enabled) toggleEnabled();
    },
    refresh: addEyeButtons,
    isEnabled: () => STATE.enabled
  };
})();

