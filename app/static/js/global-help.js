document.addEventListener('DOMContentLoaded', () => {
    const takildimBtn = document.getElementById('takildim-btn');
    const helpModal = document.getElementById('global-help-modal');
    const closeBtn = document.getElementById('close-help-modal');
    const helpOptionsGrid = document.querySelector('.help-options-grid');
    const modalSubtitle = document.querySelector('.global-help-subtitle');
    const modalTitle = document.querySelector('.global-help-header h3');

    // Detect if we are on a guide page and get context
    const isGuidePage = window.location.pathname.startsWith('/guide/');
    let currentGuideId = null;
    let currentStepNumber = 1; // Default

    if (isGuidePage) {
        // Try to find guide ID from URL
        const parts = window.location.pathname.split('/');
        if (parts.length >= 3) {
            currentGuideId = parts[2];
        }

        // Try to find current step number from active step in DOM
        const activeStep = document.querySelector('.step-card.active, .step-card:not(.hidden)');
        if (activeStep) {
            currentStepNumber = activeStep.dataset.stepNumber || 1;
        }
    }

    if (takildimBtn && helpModal && closeBtn) {
        // Open modal
        takildimBtn.addEventListener('click', () => {
            updateModalContent();
            helpModal.style.display = 'flex';
        });

        // Close modal
        closeBtn.addEventListener('click', () => {
            helpModal.style.display = 'none';
        });

        // Close on click outside
        helpModal.addEventListener('click', (e) => {
            if (e.target === helpModal) {
                helpModal.style.display = 'none';
            }
        });
    }

    function updateModalContent() {
        if (isGuidePage) {
            renderGuideHelp();
        } else {
            renderGlobalHelp();
        }
        // Refresh reading mode buttons for new dynamic content
        if (window.YanindayimReadingMode) {
            setTimeout(() => {
                window.YanindayimReadingMode.refresh();
            }, 100);
        }
    }

    function renderGuideHelp() {
        modalTitle.textContent = "Burada Bir Sorun mu Var?";
        modalSubtitle.textContent = "Yaşadığınız sorunu seçin, hemen çözelim:";

        // Reusing the SVGs from global where applicable + adding SMS icon
        const svgs = {
            ui: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M19 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V5C21 3.89543 20.1046 3 19 3Z" stroke="#007AFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 9H21" stroke="#007AFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 21V9" stroke="#007AFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
            stuck: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#FF3B30" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 12H16" stroke="#FF3B30" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 8V16" stroke="#FF3B30" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
            sms: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 4H20C21.1 4 22 4.9 22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6C2 4.9 2.9 4 4 4Z" stroke="#34C759" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M22 6L12 13L2 6" stroke="#34C759" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
            understand: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" stroke="#AF52DE" stroke-width="2"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" stroke="#AF52DE" stroke-width="2" stroke-linecap="round"/><line x1="12" y1="17" x2="12.01" y2="17" stroke="#AF52DE" stroke-width="3" stroke-linecap="round"/></svg>`
        };

        const defaultProblems = [
            { id: 'ui_diff', icon: svgs.ui, text: 'Bende farklı görünüyor' },
            { id: 'stuck', icon: svgs.stuck, text: 'Devam edemiyorum' },
            { id: 'not_understand', icon: svgs.understand, text: 'Ne yapacağımı anlamadım' },
            { id: 'no_sms', icon: svgs.sms, text: 'SMS / Doğrulama gelmedi' },
        ];

        // Try to load help options from guide context (data attribute)
        const dynamicHelpRaw = document.documentElement.dataset.helpOptions;
        let problems = defaultProblems;

        if (dynamicHelpRaw) {
            try {
                const dynamicHelp = JSON.parse(dynamicHelpRaw);
                if (Array.isArray(dynamicHelp) && dynamicHelp.length > 0) {
                    // Map dynamic helpers to UI structure
                    // Assuming AI returns format: { id: "type", text: "Label", icon: "type_ref" }
                    // OR simple strings. Let's assume the JSON structure matches the problems object simpler version
                    // If complex, we map. For now assume it mimics our structure or is a list of objects.

                    // Fallback icon logic if AI supplies just ID/Text
                    problems = dynamicHelp.map(h => ({
                        id: h.id || 'other',
                        text: h.text || h.label,
                        // If AI provides icon name, map to SVG, else default to 'ui' or specific logic
                        icon: svgs[h.icon] || svgs.ui
                    }));
                }
            } catch (e) {
                console.error("Failed to parse help_options", e);
            }
        }

        helpOptionsGrid.innerHTML = problems.map(p => `
            <button class="help-option-card calm-card" data-problem-type="${p.id}">
                <span class="option-icon">${p.icon}</span>
                <span class="option-text">${p.text}</span>
            </button>
        `).join('') + `
            <div style="grid-column: 1 / -1; text-align: center; margin-top: 24px;">
                <button id="show-guide-search-link" class="text-link-button">
                    Başka bir sorun yaşıyorum
                </button>
            </div>
        `;

        // Attach listeners for problems
        document.querySelectorAll('.calm-card').forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.dataset.problemType;
                handleProblemReport(type);
            });
        });

        // Attach listener for guide-specific search
        document.getElementById('show-guide-search-link').addEventListener('click', () => {
            showIntentInput(true); // Show input, true = guide context
        });

        // Refresh reading mode
        if (window.YanindayimReadingMode) {
            setTimeout(() => {
                window.YanindayimReadingMode.refresh();
            }, 100);
        }
    }

    function renderGlobalHelp() {
        modalTitle.textContent = "Merhaba, nasıl yardımcı olabilirim?";
        modalSubtitle.textContent = "Lütfen durumunuzu en iyi anlatan seçeneğe tıklayın:";

        // Professional SVG Icons - Clean, Modern, Trustworthy
        const svgs = {
            // "Hata aldım" - Clean warning triangle
            error: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 9V14" stroke="#FF9500" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 17.01L12.01 16.9989" stroke="#FF9500" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M10.29 3.86L1.82 18C1.64556 18.3024 1.55293 18.6453 1.55201 18.9945C1.55108 19.3438 1.64191 19.6871 1.81551 19.9905C1.98911 20.294 2.23924 20.5467 2.54102 20.7229C2.84279 20.899 3.18567 20.9926 3.535 21H20.465C20.8143 20.9926 21.1572 20.899 21.459 20.7229C21.7608 20.5467 22.0109 20.294 22.1845 19.9905C22.3581 19.6871 22.4489 19.3438 22.448 18.9945C22.4471 18.6453 22.3544 18.3024 22.18 18L13.71 3.86C13.5317 3.56613 13.2807 3.32314 12.9813 3.15399C12.6819 2.98485 12.3442 2.89502 12 2.89502C11.6558 2.89502 11.3181 2.98485 11.0187 3.15399C10.7193 3.32314 10.4683 3.56613 10.29 3.86Z" stroke="#FF9500" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,

            // "Devam edemiyorum" - Hand Stop/Halting
            stuck: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#FF3B30" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 12H16" stroke="#FF3B30" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 8V16" stroke="#FF3B30" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,

            // "Ekran farklı duruyor" - Layers/Layout
            ui: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M19 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V5C21 3.89543 20.1046 3 19 3Z" stroke="#007AFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 9H21" stroke="#007AFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 21V9" stroke="#007AFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,

            // "Yanlış bastım" - Undo/Back curve
            mistake: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 14L4 9L9 4" stroke="#5856D6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M20 20V13C20 11.9391 19.5786 10.9217 18.8284 10.1716C18.0783 9.42143 17.0609 9 16 9H4" stroke="#5856D6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`
        };

        const generalProblems = [
            { id: 'error', icon: svgs.error, text: 'Hata aldım' },
            { id: 'stuck', icon: svgs.stuck, text: 'Devam edemiyorum' },
            { id: 'ui_diff', icon: svgs.ui, text: 'Ekran farklı duruyor' },
            { id: 'wrong_press', icon: svgs.mistake, text: 'Yanlış bastım' },
        ];

        helpOptionsGrid.innerHTML = generalProblems.map(p => `
            <button class="help-option-card calm-card" data-problem-type="${p.id}">
                <span class="option-icon">${p.icon}</span>
                <span class="option-text">${p.text}</span>
            </button>
        `).join('') + `
            <div style="grid-column: 1 / -1; text-align: center; margin-top: 24px;">
                <button id="show-search-link" class="text-link-button">
                    Başka bir konuda yardım istiyorum
                </button>
            </div>
        `;

        // Attach listeners for problems
        document.querySelectorAll('.calm-card').forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.dataset.problemType;
                handleProblemReport(type);
            });
        });

        // Attach listener for footer link
        document.getElementById('show-search-link').addEventListener('click', () => {
            showIntentInput(false); // Show search input, false = not guide specific context
        });
    }

    function showIntentInput(isGuideContext = false) {
        modalSubtitle.textContent = "Sorununuzu kısaca yazın:";
        helpOptionsGrid.innerHTML = `
            <div class="intent-search-wrapper" style="grid-column: 1 / -1; width: 100%; margin-bottom: 20px;">
                <div style="position: relative; width: 100%;">
                    <input type="text" id="custom-problem-input" placeholder="Örn: 'Ekran karardı' veya 'Dondu'" 
                           style="width: 100%; padding: 14px 44px 14px 16px; border-radius: 12px; border: 1px solid #d1d1d6; font-size: 1.1rem; box-sizing: border-box; background: #fff;">
                    
                    <div style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); display: flex; gap: 8px; align-items: center;">
                        <!-- Clear Icon -->
                        <div id="clear-search" role="button" aria-label="Temizle" style="display: none; cursor: pointer; padding: 4px;">
                             <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8e8e93" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="15" y1="9" x2="9" y2="15"></line>
                                <line x1="9" y1="9" x2="15" y2="15"></line>
                             </svg>
                        </div>
                        <!-- Mic Icon -->
                        <div id="mic-trigger" role="button" aria-label="Sesle Yaz" style="cursor: pointer; padding: 4px;">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8e8e93" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                                <line x1="12" y1="19" x2="12" y2="23"></line>
                                <line x1="8" y1="23" x2="16" y2="23"></line>
                            </svg>
                        </div>
                    </div>
                </div>
                
                <div style="display: flex; gap: 12px; margin-top: 16px; width: 100%;">
                    <button id="custom-problem-submit" style="flex: 1; padding: 14px; background: #1d1d1f; color: white; border: none; border-radius: 12px; cursor: pointer; font-weight: 600; font-size: 1rem; transition: background 0.2s;">
                        Çözüm Bul
                    </button>
                     <button id="back-to-options" style="flex: 1; padding: 14px; background: #f5f5f7; color: #1d1d1f; border: none; border-radius: 12px; cursor: pointer; font-weight: 500; font-size: 1rem;">
                        Vazgeç
                    </button>
                </div>
            </div>
            <div id="ai-response-area" style="grid-column: 1 / -1; width: 100%; padding: 15px; background: #f0f9ff; border-radius: 12px; display: none;"></div>
        `;

        if (window.YanindayimReadingMode) {
            setTimeout(() => {
                window.YanindayimReadingMode.refresh();
            }, 100);
        }

        const input = document.getElementById('custom-problem-input');
        const clearBtn = document.getElementById('clear-search');

        // Toggle clear icon based on input
        input.addEventListener('input', () => {
            clearBtn.style.display = input.value.length > 0 ? 'block' : 'none';
        });

        clearBtn.addEventListener('click', () => {
            input.value = '';
            clearBtn.style.display = 'none';
            input.focus();
        });

        const micBtn = document.getElementById('mic-trigger');

        // --- Microphone Logic ---
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            const recognition = new SpeechRecognition();
            recognition.lang = 'tr-TR';
            recognition.continuous = false;
            recognition.interimResults = false;

            micBtn.addEventListener('click', () => {
                try {
                    recognition.start();
                    // Visual feedback: Mic is listening
                    micBtn.innerHTML = `
                         <div class="listening-animation">
                             <div class="pulse-ring"></div>
                             <svg width="20" height="20" viewBox="0 0 24 24" fill="#FF3B30" stroke="#FF3B30" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                                <line x1="12" y1="19" x2="12" y2="23"></line>
                                <line x1="8" y1="23" x2="16" y2="23"></line>
                            </svg>
                         </div>
                    `;
                    input.placeholder = "Dinliyorum...";
                } catch (e) {
                    console.error("Recognition already started", e);
                }
            });

            recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                input.value = transcript;
                clearBtn.style.display = 'block';
                // Auto-submit or focus? Let's verify first.
                // input.focus(); 
            };

            recognition.onerror = (event) => {
                console.error("Speech recognition error", event.error);
                input.placeholder = "Ses anlaşılamadı, tekrar deneyin.";
                resetMicIcon();
            };

            recognition.onend = () => {
                resetMicIcon();
                if (input.value === '') {
                    input.placeholder = "Örn: 'Ekran karardı' veya 'Dondu'";
                }
            };

            function resetMicIcon() {
                micBtn.innerHTML = `
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8e8e93" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                        <line x1="12" y1="19" x2="12" y2="23"></line>
                        <line x1="8" y1="23" x2="16" y2="23"></line>
                    </svg>
                `;
            }

        } else {
            // No support: Hide mic or show alert
            micBtn.style.display = 'none';
        }

        // Trigger search on Enter
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('custom-problem-submit').click();
            }
        });

        document.getElementById('custom-problem-submit').addEventListener('click', () => {
            const text = input.value;
            if (text) {
                // Unified: Always ask AI directly as per new requirement
                handleProblemReport('other', text);
            }
        });

        document.getElementById('back-to-options').addEventListener('click', updateModalContent);
    }

    let lastProblemType = null;
    let lastProblemText = null;
    let lastGuidanceText = null;
    let failedAttempts = []; // List of guidance texts that didn't work

    async function handleProblemReport(type, customText = null, isRetry = false) {
        // If it's a fresh report (not retry), reset history
        if (!isRetry) {
            lastProblemType = type;
            lastProblemText = customText;
            // Reset failed attempts for a new problem context
            failedAttempts = [];
        }

        // Show loading state
        const loadingMsg = isRetry ? "Alternatif çözüm aranıyor..." : "Düşünüyorum...";
        helpOptionsGrid.innerHTML = `<div style="text-align: center; padding: 20px;">${loadingMsg} <div class="spinner"></div></div>`;

        try {
            const response = await fetch('/api/guides/report-problem', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    guide_id: currentGuideId,
                    step_number: currentStepNumber,
                    problem_type: type,
                    custom_text: customText,
                    history: failedAttempts
                })
            });

            const data = await response.json();

            if (data.success && data.guidance) {
                lastGuidanceText = data.guidance; // Store current so we can add to history if it fails
                renderGuidance(data.guidance);
            } else {
                renderGuidance("Şu an bir hata oluştu, lütfen tekrar deneyin veya geri tuşuna basın.");
            }

        } catch (error) {
            console.error('Error reporting problem:', error);
            renderGuidance("Bağlantı hatası oluştu.");
        }
    }

    // ... (handleIntentSearch remains same) ...

    function renderGuidance(text) {
        modalTitle.textContent = "Çözüm Önerisi";
        modalSubtitle.textContent = "Size yardımcı olmaya devam edebilirim:";

        // Append history if it exists, or just show current
        helpOptionsGrid.innerHTML = `
            <div id="chat-history" style="grid-column: 1 / -1; display: flex; flex-direction: column; gap: 16px; margin-bottom: 20px; max-height: 400px; overflow-y: auto; padding: 10px;">
                <div class="ai-msg" style="background: #e3f2fd; padding: 16px; border-radius: 16px; font-size: 1.1rem; line-height: 1.5; white-space: pre-line; align-self: flex-start; max-width: 90%;">
                    ${text}
                </div>
            </div>

            <!-- Chat Input for Follow-up -->
            <div class="chat-input-wrapper" style="grid-column: 1 / -1; width: 100%; border-top: 1px solid #d1d1d6; padding-top: 16px;">
                <div style="display: flex; gap: 10px; align-items: center;">
                    <input type="text" id="chat-follow-up-input" placeholder="Başka bir sorunuz var mı?" 
                           style="flex: 1; padding: 12px; border-radius: 12px; border: 1px solid #d1d1d6; font-size: 1rem;">
                    <button id="chat-send-btn" style="padding: 12px 20px; background: #1d1d1f; color: white; border: none; border-radius: 12px; cursor: pointer; font-weight: 600;">
                        Sor
                    </button>
                </div>
                
                <div style="display: flex; gap: 12px; margin-top: 16px; justify-content: space-between;">
                    <button id="feedback-success" class="secondary-chat-btn" style="padding: 10px 16px; background: #e8f5e9; color: #2e7d32; border: none; border-radius: 10px; font-weight: 600; cursor: pointer; font-size: 0.9rem;">
                        ✓ Sorun Çözüldü
                    </button>
                    <button id="feedback-fail" class="secondary-chat-btn" style="padding: 10px 16px; background: #fff5f5; color: #c62828; border: 1px solid #ffcdd2; border-radius: 10px; font-weight: 600; cursor: pointer; font-size: 0.9rem;">
                        ✗ İşe Yaramadı
                    </button>
                </div>
            </div>
        `;

        // Focus input
        const chatInput = document.getElementById('chat-follow-up-input');
        if (chatInput) chatInput.focus();

        // Refresh reading mode
        if (window.YanindayimReadingMode) {
            setTimeout(() => { window.YanindayimReadingMode.refresh(); }, 100);
        }

        // Send listener
        document.getElementById('chat-send-btn').addEventListener('click', () => {
            const query = chatInput.value.trim();
            if (query) {
                // Add follow-up to history
                if (lastGuidanceText) failedAttempts.push(lastGuidanceText);
                chatInput.value = '';
                handleProblemReport('other', query, true);
            }
        });

        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') document.getElementById('chat-send-btn').click();
        });

        document.getElementById('feedback-success').addEventListener('click', () => {
            helpModal.style.display = 'none';
            setTimeout(updateModalContent, 300);
        });

        document.getElementById('feedback-fail').addEventListener('click', () => {
            if (lastGuidanceText) {
                failedAttempts.push(lastGuidanceText);
                handleProblemReport(lastProblemType || 'other', lastProblemText, true);
            } else {
                showIntentInput(false);
            }
        });
    }
});
