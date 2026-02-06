// Search and Microphone Support for Yanındayım
(function () {
    const searchInput = document.querySelector('.search-input');
    const micIcon = document.querySelector('.search-mic-icon');
    const searchClear = document.getElementById('search-clear');
    const suggestionsList = document.querySelector('.suggestions-list');
    const suggestionTitle = document.querySelector('.suggestion-title');

    const initialSuggestions = suggestionsList ? suggestionsList.innerHTML : '';

    if (!searchInput) return;

    let searchTimeout = null;

    function updateClearButton() {
        if (searchClear) {
            searchClear.style.display = searchInput.value.length > 0 ? 'flex' : 'none';
        }
    }

    if (searchClear) {
        searchClear.addEventListener('click', () => {
            searchInput.value = '';
            searchInput.focus();
            updateClearButton();
            if (suggestionsList) {
                suggestionsList.innerHTML = initialSuggestions;
                // Add eye icons back to restored suggestions if reading mode is on
                if (window.YanindayimReadingMode && typeof window.YanindayimReadingMode.refresh === 'function') {
                    window.YanindayimReadingMode.refresh();
                }
            }
            suggestionTitle.textContent = 'Bunu mu aramak istemiştiniz?';
        });
    }

    // --- Search Logic ---
    async function performSearch(query) {
        if (!query || query.length < 2) return;

        try {
            const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
            const results = await response.json();
            renderResults(results, query);
        } catch (error) {
            console.error('Search error:', error);
        }
    }

    function renderResults(results, query) {
        if (!suggestionsList) return;

        suggestionsList.innerHTML = '';

        if (results.length === 0) {
            suggestionTitle.textContent = '"' + query + '" için sonuç bulunamadı.';

            const requestContainer = document.createElement('div');
            requestContainer.className = 'request-guide-container';

            const requestText = document.createElement('p');
            requestText.textContent = 'Bunun için bir rehber hazırlamamızı ister misiniz?';
            requestContainer.appendChild(requestText);

            const requestBtn = document.createElement('button');
            requestBtn.className = 'nav-button primary';
            requestBtn.textContent = 'Yazılması için Talep Et';
            requestBtn.onclick = () => requestGuide(query, requestBtn);
            requestContainer.appendChild(requestBtn);

            suggestionsList.appendChild(requestContainer);
            return;
        }

        suggestionTitle.textContent = '"' + query + '" için sonuçlar:';

        results.forEach(item => {
            const link = document.createElement('a');
            link.href = `/guide/${item.id}`;
            link.className = 'suggestion-link';
            link.textContent = item.title;
            suggestionsList.appendChild(link);
        });

        // Trigger reading mode to add eye icons to new results
        if (window.YanindayimReadingMode && typeof window.YanindayimReadingMode.refresh === 'function') {
            window.YanindayimReadingMode.refresh();
        }
    }

    async function requestGuide(query, btn) {
        try {
            btn.disabled = true;
            btn.textContent = 'Talebiniz Alındı...';

            const response = await fetch('/api/ideas/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: query })
            });

            const result = await response.json();
            if (result.success) {
                btn.className = 'nav-button secondary';
                btn.textContent = 'Talep Gönderildi ✓';
            } else {
                btn.disabled = false;
                btn.textContent = 'Hata: Tekrar Dene';
            }
        } catch (error) {
            console.error('Request error:', error);
            btn.disabled = false;
            btn.textContent = 'Hata: Tekrar Dene';
        }
    }

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        updateClearButton();
        clearTimeout(searchTimeout);

        if (query.length === 0) {
            suggestionTitle.textContent = 'Bunu mu aramak istemiştiniz?';
            return;
        }

        searchTimeout = setTimeout(() => {
            performSearch(query);
        }, 300);
    });

    // --- Microphone / Speech-to-Text Logic ---
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();

        recognition.lang = 'tr-TR';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        let isListening = false;

        if (micIcon) {
            micIcon.addEventListener('click', () => {
                if (isListening) {
                    recognition.stop();
                    return;
                }
                recognition.start();
            });
        }

        recognition.onstart = () => {
            isListening = true;
            if (micIcon) micIcon.classList.add('mic-listening');
            searchInput.placeholder = 'Dinleniyor...';
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            searchInput.value = transcript;
            updateClearButton();
            performSearch(transcript);
        };

        recognition.onend = () => {
            isListening = false;
            if (micIcon) micIcon.classList.remove('mic-listening');
            searchInput.placeholder = "Örnek: MHRS'den nasıl randevu alırım?";
            console.log('Microphone listening ended.');
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            isListening = false;
            if (micIcon) micIcon.classList.remove('mic-listening');

            let message = "Hata oluştu.";
            if (event.error === 'not-allowed') {
                message = "Mikrofon izni verilmedi.";
                alert('Mikrofon erişimi reddedildi. Lütfen tarayıcı ayarlarından izin verin.');
            } else if (event.error === 'service-not-allowed') {
                message = "Servis desteklenmiyor.";
                alert('Sesli arama şu anki tarayıcınızda veya bağlantınızda (HTTPS gerekebilir) desteklenmiyor.');
            } else {
                message = "Hata: " + event.error;
            }
            searchInput.placeholder = message;
        };
    } else {
        console.warn('Speech Recognition API not supported in this browser.');
        if (micIcon) micIcon.style.display = 'none';
    }
})();
