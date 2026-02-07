(function () {
    const searchInput = document.querySelector('.hero-search-input');
    const micIcon = document.querySelector('.search-mic-icon');
    const searchClear = document.getElementById('search-clear');
    const mainGrid = document.getElementById('main-guides-grid');

    let originalGridContent = '';
    if (mainGrid) {
        originalGridContent = mainGrid.innerHTML;
    }

    if (!searchInput) return;

    let searchTimeout = null;

    function updateClearButton() {
        if (searchClear) {
            searchClear.style.display = searchInput.value.length > 0 ? 'flex' : 'none';
        }
    }

    function restoreGrid() {
        if (mainGrid) {
            mainGrid.innerHTML = originalGridContent;
            if (window.YanindayimReadingMode && typeof window.YanindayimReadingMode.refresh === 'function') {
                window.YanindayimReadingMode.refresh();
            }
        }
    }

    if (searchClear) {
        searchClear.addEventListener('click', () => {
            searchInput.value = '';
            searchInput.focus();
            updateClearButton();
            restoreGrid();
        });
    }

    async function performSearch(query) {
        if (!query || query.length < 2) {
            if (query.length === 0) restoreGrid();
            return;
        }

        try {
            const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
            const results = await response.json();
            renderResults(results, query);
        } catch (error) {
            console.error('Search error:', error);
        }
    }

    function renderResults(results, query) {
        if (!mainGrid) return;

        mainGrid.innerHTML = '';

        if (results.length === 0) {
            const noResultCard = document.createElement('div');
            noResultCard.className = 'feature-card no-results-card';
            noResultCard.style.cursor = 'default';
            noResultCard.style.minHeight = 'auto';
            noResultCard.style.textAlign = 'center';
            noResultCard.style.padding = '32px';

            noResultCard.innerHTML = `
                <div class="card-content" style="flex-direction: column; gap: 16px;">
                    <h3 style="margin-bottom: 8px;">"${query}" için sonuç bulunamadı</h3>
                    <p style="color: var(--text-secondary);">Bunun için bir rehber hazırlamamızı ister misiniz?</p>
                    <button id="request-guide-btn" class="nav-button primary">Yazılması için Talep Et</button>
                    <button id="clear-search-btn" class="nav-button secondary">Aramayı Temizle</button>
                </div>
            `;

            mainGrid.appendChild(noResultCard);

            document.getElementById('request-guide-btn').onclick = function () {
                requestGuide(query, this);
            };
            document.getElementById('clear-search-btn').onclick = function () {
                searchInput.value = '';
                updateClearButton();
                restoreGrid();
            };
            return;
        }

        results.forEach(item => {
            const card = document.createElement('a');
            card.href = `/guide/${item.id}`;
            card.className = 'feature-card';

            let imageHtml = '';
            if (item.image_url) {
                imageHtml = `
            <div class="card-image-container">
                <img src="${item.image_url}" alt="${item.title}" class="card-image">
            </div>`;
            } else {
                imageHtml = `
            <div class="card-image-container" style="background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 2rem;">📄</span>
            </div>`;
            }

            card.innerHTML = `
                ${imageHtml}
                <div class="card-content">
                    <h3>${item.title}</h3>
                </div>
            `;
            mainGrid.appendChild(card);
        });

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
            restoreGrid();
            return;
        }

        searchTimeout = setTimeout(() => {
            performSearch(query);
        }, 300);
    });

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
