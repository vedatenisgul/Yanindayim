var modal = document.getElementById("safety-modal");
var btn = document.getElementById("safety-check-btn");
var closeBtn = document.getElementById("close-safety-modal");
var loadingDiv = document.getElementById("safety-loading");
var contentDiv = document.getElementById("safety-scenario-content");
var resultDiv = document.getElementById("safety-result");
var scenarioText = document.getElementById("scenario-text");
var btnBelieve = document.getElementById("btn-believe");
var btnHangup = document.getElementById("btn-hangup");
var resultTitle = document.getElementById("result-title");
var resultExplanation = document.getElementById("result-explanation");
var resultIcon = document.getElementById("result-icon");
var btnNext = document.getElementById("btn-next-scenario");

let currentScenario = null;

if (btn) {
    btn.onclick = function () {
        modal.style.display = "flex";
        loadScenario();
    }
}

if (closeBtn) {
    closeBtn.onclick = function () {
        modal.style.display = "none";
        resetModal();
    }
}

window.onclick = function (event) {
    if (event.target == modal) {
        modal.style.display = "none";
        resetModal();
    }
}

async function loadScenario() {
    loadingDiv.style.display = "flex";
    contentDiv.style.display = "none";
    resultDiv.style.display = "none";

    try {
        const response = await fetch('/api/safety/scenario');
        if (!response.ok) throw new Error('Network response was not ok');

        currentScenario = await response.json();

        scenarioText.textContent = currentScenario.scenario;
        loadingDiv.style.display = "none";
        contentDiv.style.display = "block";

        // Refresh reading mode for new content
        if (window.YanindayimReadingMode && typeof window.YanindayimReadingMode.refresh === 'function') {
            setTimeout(() => window.YanindayimReadingMode.refresh(), 100);
        }

    } catch (error) {
        console.error('Error:', error);
        loadingDiv.innerHTML = "<p>Bir hata oluştu. Lütfen tekrar deneyin.</p>";
    }
}

function resetModal() {
    loadingDiv.style.display = "flex";
    contentDiv.style.display = "none";
    resultDiv.style.display = "none";
}

if (btnBelieve) {
    btnBelieve.onclick = function () {
        checkAnswer('believe');
    }
}

if (btnHangup) {
    btnHangup.onclick = function () {
        checkAnswer('hangup');
    }
}

if (btnNext) {
    btnNext.onclick = function () {
        loadScenario();
    }
}

function checkAnswer(userAction) {
    contentDiv.style.display = "none";
    resultDiv.style.display = "flex";
    resultDiv.style.flexDirection = "column";
    resultDiv.style.alignItems = "center";
    resultDiv.style.gap = "16px";

    const isCorrect = userAction === currentScenario.correct_action;

    if (isCorrect) {
        resultIcon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';
        resultTitle.textContent = "Harikasınız! Doğru Karar.";
        resultTitle.style.color = "#10B981"; // Green
        triggerConfetti();
    } else {
        resultIcon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>';
        resultTitle.textContent = "Dikkatli Olun!";
        resultTitle.style.color = "#EF4444"; // Red
    }

    resultExplanation.textContent = currentScenario.explanation;

    // Refresh reading mode for new content
    if (window.YanindayimReadingMode && typeof window.YanindayimReadingMode.refresh === 'function') {
        setTimeout(() => window.YanindayimReadingMode.refresh(), 100);
    }
}

function triggerConfetti() {
    if (typeof confetti === 'function') {
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
        });
    }
}
