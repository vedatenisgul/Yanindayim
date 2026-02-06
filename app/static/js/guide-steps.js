// Interactive Guide Steps Logic
let currentStep = 1;

function updateProgress() {
    const activeCard = document.querySelector('.step-card.active');
    if (!activeCard) return;

    const total = parseInt(activeCard.dataset.total);
    const progressFill = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');

    if (progressFill && progressText) {
        const percentage = (currentStep / total) * 100;
        progressFill.style.width = percentage + '%';
        progressText.textContent = `Aşama ${currentStep} / ${total}`;
    }
}

function showStep(stepNum) {
    const cards = document.querySelectorAll('.step-card');
    cards.forEach(card => card.classList.remove('active'));

    const nextCard = document.querySelector(`.step-card[data-step="${stepNum}"]`);
    if (nextCard) {
        nextCard.classList.add('active');
        currentStep = stepNum;
        updateProgress();
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // Refresh reading mode for new step content
        if (window.YanindayimReadingMode && typeof window.YanindayimReadingMode.refresh === 'function') {
            window.YanindayimReadingMode.refresh();
        }
    }
}

function nextStep() {
    showStep(currentStep + 1);
}

function prevStep() {
    if (currentStep > 1) {
        showStep(currentStep - 1);
    }
}

function finishGuide() {
    const stepsWrapper = document.getElementById('steps-wrapper');
    const completionCard = document.getElementById('completion-card');

    if (stepsWrapper && completionCard) {
        stepsWrapper.style.display = 'none';
        completionCard.style.display = 'block';
        completionCard.classList.add('active');

        const progressFill = document.getElementById('progress-bar');
        const progressText = document.getElementById('progress-text');
        if (progressFill) progressFill.style.width = '100%';
        if (progressText) progressText.textContent = 'Tamamlandı!';
    }
}

async function showProblem() {
    const activeCard = document.querySelector('.step-card.active');
    if (!activeCard) return;

    const stepNum = parseInt(activeCard.dataset.step);

    // Get guide ID: Try data attribute first, then robust URL parsing
    let guideId = document.documentElement.dataset.guideId;

    if (!guideId) {
        // Fallback for logic if data attribute is missing
        const parts = window.location.pathname.split('/');
        // Filter out empty strings
        const segments = parts.filter(p => p.length > 0);

        // Handle /admin/guides/1/test -> 1 is at index 2 (0-based: admin, guides, 1, test)
        // Handle /guide/1 -> 1 is at index 1 (guide, 1)

        // Try the segment before 'test' if it exists
        if (segments[segments.length - 1] === 'test') {
            guideId = segments[segments.length - 2];
        } else {
            guideId = segments[segments.length - 1];
        }
    }

    guideId = parseInt(guideId);

    const modal = document.getElementById('ai-support-modal');
    const guidanceText = document.getElementById('ai-guidance-text');

    if (modal && guidanceText) {
        modal.style.display = 'flex';
        guidanceText.textContent = 'Düşünülüyor...';

        try {
            const response = await fetch('/api/guides/report-problem', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    guide_id: guideId,
                    step_number: stepNum
                })
            });

            const data = await response.json();
            if (data.success) {
                guidanceText.textContent = data.guidance;
            } else {
                guidanceText.textContent = 'Sakin olun, yanınızdayız. Bir sorun oluştu ancak her şey düzelecek.';
            }
        } catch (error) {
            console.error('Error reporting problem:', error);
            guidanceText.textContent = 'Şu an teknik bir aksaklık var ama endişelenmeyin, biz buradayız.';
        }
    }
}

function closeSupportModal() {
    const modal = document.getElementById('ai-support-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Initialize progress on load
document.addEventListener('DOMContentLoaded', () => {
    updateProgress();
});
