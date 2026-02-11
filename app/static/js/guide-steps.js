// Interactive Guide Steps Logic
let currentStep = 1;

function getGuideId() {
    // Try data attribute first
    let guideId = document.documentElement.dataset.guideId;

    if (!guideId) {
        // Fallback robust URL parsing
        const parts = window.location.pathname.split('/');
        const segments = parts.filter(p => p.length > 0);

        // Handle /admin/guides/1/test -> 1 is at index 2
        // Handle /guide/1 -> 1 is at index 1
        if (segments[segments.length - 1] === 'test') {
            guideId = segments[segments.length - 2];
        } else {
            guideId = segments[segments.length - 1];
        }
    }
    return guideId;
}

function getTotalSteps() {
    return document.querySelectorAll('.step-card').length;
}

// --- Progress Persistence ---

function saveProgress(stepNum) {
    const guideId = getGuideId();
    if (!guideId) return;

    // Always save to localStorage as fallback
    localStorage.setItem(`guide_progress_${guideId}`, stepNum);

    // Sync to server if logged in
    if (window.currentUser) {
        fetch('/api/progress/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                guide_id: parseInt(guideId),
                current_step: stepNum,
                total_steps: getTotalSteps()
            })
        }).catch(err => console.log('Progress sync error:', err));
    }
}

function clearProgress() {
    const guideId = getGuideId();
    if (guideId) {
        localStorage.removeItem(`guide_progress_${guideId}`);
    }
}

async function checkResume() {
    const guideId = getGuideId();
    if (!guideId) return;

    let savedStep = null;

    // Try server-side progress first for logged-in users
    if (window.currentUser) {
        try {
            const res = await fetch(`/api/progress/${guideId}`);
            const data = await res.json();
            if (data.success && data.current_step && data.current_step > 1 && !data.completed) {
                savedStep = data.current_step;
            }
        } catch (err) {
            console.log('Server progress fetch failed, falling back to localStorage');
        }
    }

    // Fallback to localStorage
    if (!savedStep) {
        const localStep = localStorage.getItem(`guide_progress_${guideId}`);
        if (localStep && parseInt(localStep) > 1) {
            savedStep = parseInt(localStep);
        }
    }

    if (savedStep) {
        // Show resume modal
        const modal = document.getElementById('resume-modal');
        const stepNumSpan = document.getElementById('resume-step-num');

        if (modal && stepNumSpan) {
            stepNumSpan.textContent = savedStep;
            modal.style.display = 'flex';
            modal.dataset.savedStep = savedStep;
        }
    }
}

function resumeGuide() {
    const modal = document.getElementById('resume-modal');
    if (modal) {
        const savedStep = parseInt(modal.dataset.savedStep || 1);
        modal.style.display = 'none';
        showStep(savedStep);
    }
}

function restartGuide() {
    const modal = document.getElementById('resume-modal');
    if (modal) {
        modal.style.display = 'none';
        clearProgress();
        showStep(1);
    }
}

// --- Step Navigation ---

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
        saveProgress(currentStep); // Save execution state
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
        clearProgress(); // Clear saved state on completion

        const progressFill = document.getElementById('progress-bar');
        const progressText = document.getElementById('progress-text');
        if (progressFill) progressFill.style.width = '100%';
        if (progressText) progressText.textContent = 'Tamamlandı!';

        // Mark as completed on server
        if (window.currentUser) {
            const guideId = getGuideId();
            fetch('/api/progress/complete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ guide_id: parseInt(guideId) })
            }).catch(err => console.log('Completion sync error:', err));
        }
    }
}

// --- AI Support ---

async function showProblem() {
    const activeCard = document.querySelector('.step-card.active');
    if (!activeCard) return;

    const stepNum = parseInt(activeCard.dataset.step);
    let guideId = getGuideId();

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
                    guide_id: parseInt(guideId),
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
    checkResume(); // Check for saved progress
});
