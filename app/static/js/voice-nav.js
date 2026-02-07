// Voice Navigation for Yanındayım (Hands-Free)
// Commands: "İleri/Sonraki", "Geri/Önceki", "Tekrarla/Oku", "Dur"

(function () {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        console.warn('Voice Navigation: Speech API not supported.');
        return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.lang = 'tr-TR';
    recognition.continuous = true; // Keep listening
    recognition.interimResults = false;

    let isListening = false;
    let manualStop = false;

    // UI Elements
    const UI = {
        toggleBtn: null,
        statusIndicator: null
    };

    function initUI() {
        // Create Floating Voice Toggle if not exists
        if (!document.getElementById('voice-nav-toggle')) {
            const btn = document.createElement('button');
            btn.id = 'voice-nav-toggle';
            btn.className = 'voice-nav-toggle';
            btn.setAttribute('aria-label', 'Sesli Komut Aç/Kapa');
            btn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                    <line x1="12" y1="19" x2="12" y2="23"></line>
                    <line x1="8" y1="23" x2="16" y2="23"></line>
                </svg>
                <span class="voice-status-text">Sesli Komut</span>
            `;
            document.body.appendChild(btn);

            btn.addEventListener('click', toggleListening);
            UI.toggleBtn = btn;
        } else {
            UI.toggleBtn = document.getElementById('voice-nav-toggle');
        }
    }

    function toggleListening() {
        if (isListening) {
            stopListening();
        } else {
            startListening();
        }
    }

    function startListening() {
        manualStop = false;
        try {
            recognition.start();
        } catch (e) {
            console.error("Recognition start error:", e);
        }
        UI.toggleBtn.classList.add('listening');
        showToast('Sesli Komut Aktif: "İleri", "Geri", "Tekrarla" diyebilirsiniz.', 'info');
    }

    function stopListening() {
        manualStop = true;
        recognition.stop();
        UI.toggleBtn.classList.remove('listening');
        isListening = false;
        showToast('Sesli Komut Kapatıldı.', 'info');
    }

    // Command Handlers
    function handleCommand(command) {
        console.log("Voice Command Received:", command);
        const cmd = command.toLowerCase().trim();

        // Debug Feedback
        if (cmd.length > 1) {
            showToast(`🎤 "${command}"`, 'info');
        }

        // --- 1. GLOBAL NAVIGATION ---

        // "Ana Sayfa"
        if (cmd.includes("ana sayfa") || cmd.includes("başa dön") || cmd.includes("giriş")) {
            showToast('🏠 Ana Sayfaya Gidiliyor...', 'success');
            window.location.href = "/";
            return;
        }

        // "Geri" / "Önceki"
        if (cmd.includes("geri") || cmd.includes("önceki")) {
            if (typeof window.prevStep === 'function') {
                window.prevStep();
                return;
            }
            const prevBtn = document.getElementById('reading-prev') || document.querySelector('.back-button');
            if (prevBtn) prevBtn.click();
            else history.back();
            return;
        }

        // "İleri" / "Sonraki"
        if (cmd.includes("ileri") || cmd.includes("sonraki") || cmd.includes("devam") || cmd.includes("geç")) {
            if (typeof window.nextStep === 'function') {
                window.nextStep();
                return;
            }
            const nextBtn = document.getElementById('reading-next') ||
                Array.from(document.querySelectorAll('button, a')).find(el => {
                    const t = el.innerText.toLowerCase();
                    return t.includes("tamamlandı") || t.includes("sonraki") || t.includes("devam");
                });
            if (nextBtn) nextBtn.click();
            else showToast('⚠️ İleri gidecek buton bulunamadı.', 'warning');
            return;
        }

        // --- 2. READING CONTROLS ---

        if (cmd.includes("tekrarla") || cmd.includes("oku") || cmd.includes("seslendir")) {
            if (window.YanindayimReadingMode && !window.YanindayimReadingMode.isEnabled()) {
                window.YanindayimReadingMode.enable();
            }
            const repeatBtn = document.getElementById('reading-repeat');
            if (repeatBtn) repeatBtn.click();
            return;
        }

        if (cmd.includes("dur") || cmd.includes("susam") || cmd.includes("bekle")) {
            const stopBtn = document.getElementById('reading-stop') || document.getElementById('reading-stop-floating');
            if (stopBtn) stopBtn.click();
            return;
        }

        // --- 3. GENERIC BUTTON CLICKING (The "Intelligent" Part) ---

        // Remove common verbs to isolate the button name
        let targetName = cmd
            .replace("bas", "")
            .replace("tıkla", "")
            .replace("aç", "")
            .replace("seç", "")
            .replace("kapat", "") // 'kapat' might be the name itself, handled below
            .replace("bildir", "")
            .replace("git", "")
            .trim();

        // Handle aggressive suffixes (Turkish) - primitive approach
        // e.g., "Market Alışverişi'ne" -> "Market Alışverişi"
        // This is tricky, simplified by splitting at apostrophe if present, or just checking containment
        if (targetName.includes("'")) {
            targetName = targetName.split("'")[0];
        }

        // Special handling for "Kapat" / "X" / "Çık"
        if (cmd.includes("kapat") || cmd.includes("çık") || cmd.includes("x")) {
            // Look for close buttons specifically
            const closeBtn = document.querySelector('.close-modal-btn') ||
                document.querySelector('button[aria-label="Kapat"]') ||
                document.querySelector('button[aria-label="Close"]');
            if (closeBtn && closeBtn.offsetParent !== null) { // must be visible
                showToast('❎ Kapatılıyor...', 'success');
                closeBtn.click();
                return;
            }
        }

        // Find ALL clickable elements including those in modals AND Home Cards
        const clickables = Array.from(document.querySelectorAll('button, a, input[type="submit"], input[type="button"], .feature-card, .help-option-card, .safety-floating-btn'));

        // Filter visible ones only
        const visibleClickables = clickables.filter(el => el.offsetParent !== null);

        let bestMatch = null;
        let bestScore = 0;

        visibleClickables.forEach(el => {
            // Get text from multiple sources: innerText, aria-label, title, or nested h3 (for cards)
            let text = (el.innerText || el.getAttribute('aria-label') || el.getAttribute('title') || "").toLowerCase();

            // Special check for card headers if the main element text is cluttered
            const cardHeader = el.querySelector('h3');
            if (cardHeader) {
                text += " " + cardHeader.innerText.toLowerCase();
            }

            // Check for match
            if (text.includes(targetName)) {
                let score = 0;

                // Exact match preference (allowing for some noise)
                if (text === targetName) score += 10;
                // Starts with preference
                else if (text.startsWith(targetName)) score += 5;
                // Contains preference
                else score += 1;

                // Prioritize "danger" buttons if command implies problem
                if ((cmd.includes("sorun") || cmd.includes("hata")) && el.classList.contains("danger")) {
                    score += 20;
                }
                // Prioritize "success" buttons if command implies finish
                if ((cmd.includes("tamam") || cmd.includes("bitti")) && el.classList.contains("success")) {
                    score += 20;
                }

                if (score > bestScore) {
                    bestScore = score;
                    bestMatch = el;
                }
            }
        });

        if (bestMatch) {
            console.log("Voice Click Match:", bestMatch);
            bestMatch.style.outline = "3px solid #EF4444";
            bestMatch.style.transition = "outline 0.2s";
            setTimeout(() => bestMatch.style.outline = "", 1000);

            showToast(`� Tıklanıyor: "${bestMatch.innerText.substring(0, 25)}..."`, 'success');
            bestMatch.click();
        } else {
            // If no button found but command was specific enough, show warning
            if (targetName.length > 2) {
                // Don't toast for everything to avoid noise, only if it really looked like a command
            }
        }
    }

    // Event Listeners
    recognition.onstart = function () {
        isListening = true;
        if (UI.toggleBtn) UI.toggleBtn.classList.add('listening');
    };

    recognition.onend = function () {
        isListening = false;
        if (UI.toggleBtn) UI.toggleBtn.classList.remove('listening');
        if (!manualStop) {
            // Restart automatically (continuous listening workaround)
            setTimeout(() => {
                if (!manualStop) recognition.start();
            }, 500);
        }
    };

    recognition.onresult = function (event) {
        const transcript = event.results[event.results.length - 1][0].transcript;
        handleCommand(transcript);
    };

    recognition.onerror = function (event) {
        console.error("Voice Nav Error:", event.error);
        if (event.error === 'not-allowed') {
            stopListening();
            alert("Mikrofon izni reddedildi.");
        }
    };

    // Helper Toast
    function showToast(msg, type) {
        // Reuse existing toast system if available or create simple one
        const container = document.getElementById('toast-container');
        if (container) {
            const toast = document.createElement('div');
            toast.className = `toast ${type} show`;
            toast.innerText = msg;
            container.appendChild(toast);
            setTimeout(() => toast.remove(), 3000);
        } else {
            // Fallback
            console.log("Voice Nav:", msg);
            // Create temporary toast container if needed (usually handled by base.html)
        }
    }

    // Initialize on load
    window.addEventListener('DOMContentLoaded', initUI);

})();
