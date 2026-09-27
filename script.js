// APPLICATION STATE

const state = {
    questions: [],       // The filtered & shuffled questions for this run
    currentIndex: 0,     // Which question we're on
    score: 0,            // Number of correct answers
    answers: [],         // User's answers for review: { selectedIndex, wasCorrect, timedOut }
    timerInterval: null, // Reference to the active setInterval
    timeLeft: 15,        // Seconds remaining on the current question
    isAnswered: false,   // True once the user has answered or timed out
    config: {
        category: "all",
        difficulty: "all"
    }
};

const QUESTION_TIME = 15;
const FEEDBACK_DELAY = 1500; // ms before auto-advancing

// DOM REFERENCES

const screens = {
    start:   document.querySelector("#screen-start"),
    quiz:    document.querySelector("#screen-quiz"),
    results: document.querySelector("#screen-results"),
    review:  document.querySelector("#screen-review")
};

const els = {
    filterCategory:  document.querySelector("#filter-category"),
    filterDifficulty: document.querySelector("#filter-difficulty"),
    btnStart:        document.querySelector("#btn-start"),
    lastScore:       document.querySelector("#last-score"),
    leaderboard:     document.querySelector("#leaderboard-container"),
    leaderboardList: document.querySelector("#leaderboard-list"),
    btnClearScores:  document.querySelector("#btn-clear-scores"),

    progressText:    document.querySelector("#progress-text"),
    scoreDisplay:    document.querySelector("#score-display"),
    progressFill:    document.querySelector("#progress-fill"),
    timerDisplay:    document.querySelector("#timer-display"),
    timerFill:       document.querySelector("#timer-fill"),
    questionText:    document.querySelector("#question-text"),
    answers:         document.querySelector("#answers"),

    resultScore:     document.querySelector("#result-score"),
    resultPercent:   document.querySelector("#result-percent"),
    resultGrade:     document.querySelector("#result-grade"),
    resultMessage:   document.querySelector("#result-message"),
    btnReview:       document.querySelector("#btn-review"),
    btnShare:        document.querySelector("#btn-share"),
    btnRestart:      document.querySelector("#btn-restart"),
    shareFeedback:   document.querySelector("#share-feedback"),

    reviewContainer: document.querySelector("#review-container"),
    btnBack:         document.querySelector("#btn-back")
};

// SCREEN MANAGEMENT

/**
 * showScreen(name)
 * Hides every screen, then activates the requested one.
 * Valid names: "start", "quiz", "results", "review".
 */
function showScreen(name) {
    for (const key in screens) {
        screens[key].classList.toggle("active", key === name);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
}

// HELPERS


/**
 * shuffle(array)
 * Fisher-Yates shuffle — returns a NEW array, does not mutate.
 */
function shuffle(array) {
    const copy = [...array];

    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }

    return copy;
}

/**
 * getFilteredQuestions()
 * Applies the category and difficulty filters from state.config.
 */
function getFilteredQuestions() {
    return quizQuestions.filter(q => {
        const categoryMatch = state.config.category === "all" || q.category === state.config.category;
        const difficultyMatch = state.config.difficulty === "all" || q.difficulty === state.config.difficulty;
        return categoryMatch && difficultyMatch;
    });
}

// SOUND EFFECTS (Web Audio API — no external files)


let audioContext = null;

/**
 * playTone(frequency, duration)
 * Creates a short beep using the Web Audio API. No audio files needed.
 */
function playTone(frequency, duration) {
    try {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();

        oscillator.frequency.value = frequency;
        oscillator.type = "sine";

        gain.gain.setValueAtTime(0.1, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);

        oscillator.connect(gain);
        gain.connect(audioContext.destination);

        oscillator.start();
        oscillator.stop(audioContext.currentTime + duration);
    } catch (err) {
        // Silently ignore — some browsers block audio without a user gesture
    }
}

function playCorrectSound() {
    playTone(880, 0.15);
    setTimeout(() => playTone(1320, 0.15), 120);
}

function playWrongSound() {
    playTone(220, 0.25);
}

// START SCREEN

/**
 * renderLastScore()
 * Reads the last score from localStorage and shows it on the start screen.
 */
function renderLastScore() {
    const raw = localStorage.getItem("quizLastScore");

    if (!raw) {
        els.lastScore.textContent = "";
        return;
    }

    try {
        const last = JSON.parse(raw);
        const date = new Date(last.date).toLocaleDateString("en-KE", {
            day: "numeric",
            month: "short",
            year: "numeric"
        });
        els.lastScore.textContent = `Your last score: ${last.score}/${last.total} (${last.percent}%) on ${date}`;
    } catch {
        els.lastScore.textContent = "";
    }
}

/**
 * renderLeaderboard()
 * Shows the top 5 scores stored in localStorage.
 */
function renderLeaderboard() {
    const raw = localStorage.getItem("quizLeaderboard");
    const scores = raw ? JSON.parse(raw) : [];

    if (scores.length === 0) {
        els.leaderboard.classList.add("hidden");
        return;
    }

    els.leaderboard.classList.remove("hidden");
    els.leaderboardList.innerHTML = "";

    scores.slice(0, 5).forEach(entry => {
        const li = document.createElement("li");
        const date = new Date(entry.date).toLocaleDateString("en-KE", {
            day: "numeric", month: "short", year: "numeric"
        });
        li.innerHTML = `<strong>${entry.score}/${entry.total}</strong> (${entry.percent}%) — ${date}`;
        els.leaderboardList.appendChild(li);
    });
}

/**
 * startQuiz()
 * Filters + shuffles questions, resets state, and loads the first question.
 */
function startQuiz() {
    state.config.category = els.filterCategory.value;
    state.config.difficulty = els.filterDifficulty.value;

    const filtered = getFilteredQuestions();

    if (filtered.length === 0) {
        alert("No questions match that filter. Try a different combination.");
        return;
    }

    state.questions = shuffle(filtered);
    state.currentIndex = 0;
    state.score = 0;
    state.answers = [];
    state.isAnswered = false;

    showScreen("quiz");
    loadQuestion();
}

// QUIZ SCREEN — QUESTION LOADING
/**
 * loadQuestion()
 * Renders the current question, resets and starts the timer,
 * and updates the progress bar. This is the core render function.
 */
function loadQuestion() {
    // Reset the answer flag
    state.isAnswered = false;

    const question = state.questions[state.currentIndex];

    // --- Progress ---
    els.progressText.textContent = `Question ${state.currentIndex + 1} of ${state.questions.length}`;
    els.scoreDisplay.textContent = `Score: ${state.score}`;
    const progressPercent = ((state.currentIndex) / state.questions.length) * 100;
    els.progressFill.style.width = `${progressPercent}%`;

    // --- Question text ---
    els.questionText.textContent = question.question;

    // --- Answer buttons ---
    els.answers.innerHTML = "";
    const letters = ["A", "B", "C", "D"];

    question.options.forEach((optionText, index) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "answer-btn";
        btn.dataset.index = index;
        btn.innerHTML = `<span class="answer-letter">${letters[index]}</span><span>${optionText}</span>`;
        btn.addEventListener("click", () => handleAnswer(index));
        els.answers.appendChild(btn);
    });

    // --- Timer ---
    startTimer();
}

// TIMER

/**
 * startTimer()
 * Resets the countdown to QUESTION_TIME and starts a new interval.
 * Always clears any existing interval first so timers don't stack.
 */
function startTimer() {
    clearInterval(state.timerInterval);

    state.timeLeft = QUESTION_TIME;
    updateTimerUI();

    state.timerInterval = setInterval(() => {
        state.timeLeft--;
        updateTimerUI();

        if (state.timeLeft <= 0) {
            clearInterval(state.timerInterval);
            handleTimeout();
        }
    }, 1000);
}

/**
 * updateTimerUI()
 * Updates the numeric countdown and the horizontal bar,
 * applying warning/danger colours as time gets low.
 */
function updateTimerUI() {
    els.timerDisplay.textContent = `${state.timeLeft}s`;
    const percent = (state.timeLeft / QUESTION_TIME) * 100;
    els.timerFill.style.width = `${percent}%`;

    // Clear previous states
    els.timerDisplay.classList.remove("warning", "danger");
    els.timerFill.classList.remove("warning", "danger");

    if (state.timeLeft <= 5) {
        els.timerDisplay.classList.add("danger");
        els.timerFill.classList.add("danger");
    } else if (state.timeLeft <= 10) {
        els.timerDisplay.classList.add("warning");
        els.timerFill.classList.add("warning");
    }
}

// ANSWER HANDLING

/**
 * handleAnswer(selectedIndex)
 * Called when the user clicks an answer. Stops the timer,
 * shows feedback, and schedules the next question.
 */
function handleAnswer(selectedIndex) {
    if (state.isAnswered) return;
    state.isAnswered = true;

    clearInterval(state.timerInterval);

    const question = state.questions[state.currentIndex];
    const wasCorrect = selectedIndex === question.correct;

    if (wasCorrect) {
        state.score++;
        els.scoreDisplay.textContent = `Score: ${state.score}`;
        playCorrectSound();
    } else {
        playWrongSound();
    }

    // Record this answer for review mode
    state.answers.push({
        questionIndex: state.currentIndex,
        selectedIndex,
        correctIndex: question.correct,
        wasCorrect,
        timedOut: false
    });

    revealAnswer(selectedIndex);
    setTimeout(advance, FEEDBACK_DELAY);
}

/**
 * handleTimeout()
 * Called when the timer reaches 0. Same effect as answering wrong,
 * but with no selected answer.
 */
function handleTimeout() {
    if (state.isAnswered) return;
    state.isAnswered = true;

    const question = state.questions[state.currentIndex];
    playWrongSound();

    state.answers.push({
        questionIndex: state.currentIndex,
        selectedIndex: null,
        correctIndex: question.correct,
        wasCorrect: false,
        timedOut: true
    });

    revealAnswer(null);
    setTimeout(advance, FEEDBACK_DELAY);
}

/**
 * revealAnswer(selectedIndex)
 * Applies the correct/wrong styling to the answer buttons
 * and disables them all so the user cannot click again.
 */
function revealAnswer(selectedIndex) {
    const question = state.questions[state.currentIndex];
    const buttons = els.answers.querySelectorAll(".answer-btn");

    buttons.forEach((btn, i) => {
        btn.disabled = true;

        if (i === question.correct) {
            btn.classList.add("correct");
        } else if (i === selectedIndex) {
            btn.classList.add("wrong");
        } else {
            btn.classList.add("dimmed");
        }
    });
}

/**
 * advance()
 * Moves to the next question, or shows the results screen if done.
 */
function advance() {
    state.currentIndex++;

    if (state.currentIndex >= state.questions.length) {
        finishQuiz();
    } else {
        loadQuestion();
    }
}

// RESULTS

/**
 * finishQuiz()
 * Calculates the final score, grade, and message, then
 * renders the results screen and saves to localStorage.
 */
function finishQuiz() {
    clearInterval(state.timerInterval);

    const total = state.questions.length;
    const percent = Math.round((state.score / total) * 100);
    const { grade, message, cssClass } = gradeFor(percent);

    els.resultScore.textContent = `You got ${state.score} out of ${total}`;
    els.resultPercent.textContent = `${percent}%`;
    els.resultGrade.textContent = grade;
    els.resultGrade.className = `result-grade ${cssClass}`;
    els.resultMessage.textContent = message;

    els.shareFeedback.textContent = "";

    saveScore(state.score, total, percent);
    renderLastScore();
    renderLeaderboard();

    showScreen("results");
}

/**
 * gradeFor(percent)
 * Returns { grade, message, cssClass } based on the percentage.
 */
function gradeFor(percent) {
    if (percent >= 90) {
        return { grade: "A", message: "Excellent work! You really know your stuff.", cssClass: "grade-a" };
    }
    if (percent >= 80) {
        return { grade: "B", message: "Great job! Just a few points off the top.", cssClass: "grade-b" };
    }
    if (percent >= 70) {
        return { grade: "C", message: "Good effort. A little more study and you'll ace it.", cssClass: "grade-c" };
    }
    if (percent >= 60) {
        return { grade: "D", message: "Not bad — keep practising and you'll improve quickly.", cssClass: "grade-d" };
    }
    return { grade: "F", message: "Keep practising! Review your answers and try again.", cssClass: "grade-f" };
}

// LOCALSTORAGE


/**
 * saveScore(score, total, percent)
 * Saves the latest score, and prepends it to the leaderboard list.
 */
function saveScore(score, total, percent) {
    const entry = { score, total, percent, date: new Date().toISOString() };

    // Last score
    localStorage.setItem("quizLastScore", JSON.stringify(entry));

    // Leaderboard — sorted by percent, then by score, keep top 10
    const raw = localStorage.getItem("quizLeaderboard");
    const board = raw ? JSON.parse(raw) : [];

    board.push(entry);
    board.sort((a, b) => b.percent - a.percent);
    const trimmed = board.slice(0, 10);

    localStorage.setItem("quizLeaderboard", JSON.stringify(trimmed));
}

// REVIEW MODE
/**
 * renderReview()
 * Builds a review card for every question, showing the user's
 * answer and the correct answer.
 */
function renderReview() {
    els.reviewContainer.innerHTML = "";

    state.answers.forEach((entry, i) => {
        const question = state.questions[entry.questionIndex];

        const card = document.createElement("div");
        card.className = `review-card ${entry.wasCorrect ? "correct-card" : "wrong-card"}`;

        // --- Question ---
        const q = document.createElement("p");
        q.className = "review-question";
        q.textContent = `${i + 1}. ${question.question}`;
        card.appendChild(q);

        // --- User's answer ---
        const userRow = document.createElement("div");
        if (entry.timedOut) {
            userRow.className = "review-row timed-out";
            userRow.innerHTML = `<span class="review-label">Your answer:</span><span>Time ran out</span>`;
        } else {
            userRow.className = `review-row ${entry.wasCorrect ? "user-right" : "user-wrong"}`;
            const mark = entry.wasCorrect ? "✓" : "✗";
            userRow.innerHTML =
                `<span class="review-label">Your answer:</span>` +
                `<span>${mark} ${question.options[entry.selectedIndex]}</span>`;
        }
        card.appendChild(userRow);

        // --- Correct answer ---
        const correctRow = document.createElement("div");
        correctRow.className = "review-row correct-answer";
        correctRow.innerHTML =
            `<span class="review-label">Correct answer:</span>` +
            `<span>✓ ${question.options[entry.correctIndex]}</span>`;
        card.appendChild(correctRow);

        els.reviewContainer.appendChild(card);
    });
}

// RESTART


/**
 * restartQuiz()
 * Resets the state and starts a fresh run.
 */
function restartQuiz() {
    clearInterval(state.timerInterval);

    state.currentIndex = 0;
    state.score = 0;
    state.answers = [];
    state.isAnswered = false;

    showScreen("start");
    renderLastScore();
    renderLeaderboard();
}

// SHARE SCORE

/**
 * shareScore()
 * Copies a share message to the clipboard and shows feedback.
 */
async function shareScore() {
    const total = state.questions.length;
    const percent = Math.round((state.score / total) * 100);
    const message = `I scored ${state.score}/${total} (${percent}%) on the Mctaba Quiz App! Can you beat me?`;

    try {
        await navigator.clipboard.writeText(message);
        els.shareFeedback.textContent = "Copied to clipboard!";
    } catch {
        els.shareFeedback.textContent = message;
    }

    setTimeout(() => {
        els.shareFeedback.textContent = "";
    }, 3000);
}

// EVENT LISTENERS

els.btnStart.addEventListener("click", startQuiz);
els.btnReview.addEventListener("click", () => { renderReview(); showScreen("review"); });
els.btnBack.addEventListener("click", () => showScreen("results"));
els.btnRestart.addEventListener("click", restartQuiz);
els.btnShare.addEventListener("click", shareScore);

els.btnClearScores.addEventListener("click", () => {
    if (confirm("Clear all scores from this browser?")) {
        localStorage.removeItem("quizLastScore");
        localStorage.removeItem("quizLeaderboard");
        renderLastScore();
        renderLeaderboard();
    }
});

// --- Global keyboard shortcuts ---
document.addEventListener("keydown", event => {
    // Only handle keys while the quiz screen is visible
    if (!screens.quiz.classList.contains("active")) return;
    if (state.isAnswered) return;

    // Number keys 1-4 select answers A-D
    const key = event.key;
    if (key >= "1" && key <= "4") {
        const index = parseInt(key, 10) - 1;
        const buttons = els.answers.querySelectorAll(".answer-btn");
        if (buttons[index]) {
            handleAnswer(index);
        }
    }
});

// INITIALISE

// Guard: ensure questions.js loaded successfully.
if (typeof quizQuestions === "undefined") {
    console.error("questions.js failed to load. Check the <script> order in index.html.");
} else {
    console.log(`Quiz App ready — ${quizQuestions.length} questions loaded.`);
}

renderLastScore();
renderLeaderboard();
showScreen("start");