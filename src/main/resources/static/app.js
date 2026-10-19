const setupScreen = document.getElementById("setup-screen");
const quizScreen = document.getElementById("quiz-screen");
const resultsScreen = document.getElementById("results-screen");

const backButton = document.getElementById("back-button");
const weekGrid = document.getElementById("week-grid");
const selectionSummary = document.getElementById("selection-summary");
const setupMessage = document.getElementById("setup-message");

const settingsHeading = document.getElementById("settings-heading");
const displayModeRow = document.getElementById("display-mode-row");
const displayModeSelect = document.getElementById("display-mode");
const startButton = document.getElementById("start-button");

const questionList = document.getElementById("question-list");
const questionPalette = document.getElementById("question-palette");
const questionNav = document.getElementById("question-nav");
const progressLabel = document.getElementById("progress-label");
const quizModeLabel = document.getElementById("quiz-mode-label");
const scoreLabel = document.getElementById("score-label");
const singleControls = document.getElementById("single-controls");

const selectedWeeks = new Set(Array.from({ length: 13 }, (_, index) => index));
let weekCounts = Array(13).fill(0);

let selectedMode = "practice";
let questions = [];
let currentIndex = 0;
let answers = {};
let checkedPracticeAnswers = new Set();
let examResults = [];
let displayAll = false;
let choiceOrderByQuestionId = {};

function makeWeekButtons() {
    weekGrid.replaceChildren();

    for (let week = 0; week <= 12; week++) {
        const button = document.createElement("button");
        button.className = "week-button selected";
        button.type = "button";
        button.innerHTML =
            `Week ${week}<br><span id="week-count-${week}">Loading…</span>`;

        button.addEventListener("click", () => {
            if (selectedWeeks.has(week)) {
                selectedWeeks.delete(week);
                button.classList.remove("selected");
            } else {
                selectedWeeks.add(week);
                button.classList.add("selected");
            }

            updateWeekSummary();
        });

        weekGrid.append(button);
    }

    updateWeekSummary();

    loadWeekCounts().catch((error) => {
        setupMessage.textContent = error.message;
    });
}

async function loadWeekCounts() {
    const response = await fetch("/api/questions");

    if (!response.ok) {
        throw new Error("Could not load question counts.");
    }

    const allQuestions = await response.json();
    weekCounts = Array(13).fill(0);

    allQuestions.forEach((question) => {
        const week = Number(question.week);

        if (Number.isInteger(week) && week >= 0 && week <= 12) {
            weekCounts[week]++;
        }
    });

    for (let week = 0; week <= 12; week++) {
        const countElement = document.getElementById(`week-count-${week}`);

        if (countElement) {
            const count = weekCounts[week];
            countElement.textContent =
                `${count} ${count === 1 ? "question" : "questions"}`;
        }
    }

    updateWeekSummary();
}

function updateWeekSummary() {
    const selectedWeekCount = selectedWeeks.size;
    const selectedQuestionCount = [...selectedWeeks]
        .reduce((total, week) => total + weekCounts[week], 0);

    selectionSummary.textContent =
        `2026 Edition • ${selectedWeekCount} weeks selected ` +
        `(${selectedQuestionCount} questions)`;

    startButton.disabled = selectedWeekCount === 0;
}

function selectMode(mode) {
    selectedMode = mode;

    document.querySelectorAll(".mode-card").forEach((card) => {
        card.classList.toggle("selected", card.dataset.mode === mode);
    });

    if (mode === "practice") {
        settingsHeading.textContent = "Study Settings";
        displayModeRow.classList.remove("hidden");
        startButton.textContent = "Start Study";
    } else {
        settingsHeading.textContent = "Exam Settings";
        displayModeRow.classList.add("hidden");
        startButton.textContent = "Start Exam";
    }
}

document.querySelectorAll(".mode-card").forEach((card) => {
    card.addEventListener("click", () => {
        selectMode(card.dataset.mode);
    });
});

document.getElementById("select-all-weeks").addEventListener("click", () => {
    for (let week = 0; week <= 12; week++) {
        selectedWeeks.add(week);
    }

    document.querySelectorAll(".week-button").forEach((button) => {
        button.classList.add("selected");
    });

    updateWeekSummary();
});

document.getElementById("clear-weeks").addEventListener("click", () => {
    selectedWeeks.clear();

    document.querySelectorAll(".week-button").forEach((button) => {
        button.classList.remove("selected");
    });

    updateWeekSummary();
});

async function loadQuestionsForSelectedWeeks() {
    const params = new URLSearchParams();

    [...selectedWeeks]
        .sort((a, b) => a - b)
        .forEach((week) => {
            params.append("weeks", week);
        });

    const response = await fetch(`/api/questions?${params.toString()}`);

    if (!response.ok) {
        throw new Error("Could not load questions. Check that the backend is running.");
    }

    return response.json();
}

function shuffle(items) {
    for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [items[i], items[j]] = [items[j], items[i]];
    }

    return items;
}

function prepareChoiceOrder() {
    choiceOrderByQuestionId = {};

    questions.forEach((question) => {
        choiceOrderByQuestionId[question.id] = shuffle([
            question.optionA,
            question.optionB,
            question.optionC,
            question.optionD
        ]);
    });
}

startButton.addEventListener("click", async () => {
    setupMessage.textContent = "";

    if (selectedWeeks.size === 0) {
        setupMessage.textContent = "Select at least one week.";
        return;
    }

    startButton.disabled = true;
    startButton.textContent = "Loading…";

    try {
        questions = await loadQuestionsForSelectedWeeks();

        if (questions.length === 0) {
            setupMessage.textContent =
                "No questions were found for those weeks.";
            return;
        }

        if (document.getElementById("shuffle-questions").checked) {
            questions = shuffle(questions);
        }

        prepareChoiceOrder();

        currentIndex = 0;
        answers = {};
        checkedPracticeAnswers.clear();
        examResults = [];

        // Practice can show all questions if selected.
        // Exam always shows one question at a time.
        displayAll = selectedMode === "practice" &&
            displayModeSelect.value === "all";

        showQuiz();
    } catch (error) {
        setupMessage.textContent = error.message;
    } finally {
        startButton.textContent =
            selectedMode === "practice" ? "Start Study" : "Start Exam";
        startButton.disabled = selectedWeeks.size === 0;
    }
});

function showQuiz() {
    setupScreen.classList.add("hidden");
    resultsScreen.classList.add("hidden");
    quizScreen.classList.remove("hidden");
    backButton.classList.remove("hidden");

    const isExam = selectedMode === "exam";

    quizModeLabel.textContent = isExam ? "EXAM MODE" : "PRACTICE MODE";
    document.getElementById("finish-button").classList.toggle("hidden", !isExam);

    // Hide score progress during exams.
    scoreLabel.classList.toggle("hidden", isExam);

    // Practice "All" hides the palette. Exam keeps the scrollable palette.
    questionNav.classList.toggle("hidden", displayAll);
    singleControls.classList.toggle("hidden", displayAll);

    document.querySelector(".quiz-layout")
        .classList.toggle("palette-full-width", !displayAll);

    renderPalette();
    renderQuestions();
    updateNavigation();
}

function renderPalette() {
    questionPalette.replaceChildren();

    questions.forEach((question, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "palette-button";
        button.textContent = index + 1;
        button.setAttribute("aria-label", `Question ${index + 1}`);

        // This indicates the currently open question only.
        // It does not indicate whether the answer is correct.
        if (index === currentIndex) {
            button.classList.add("current");
        }

        button.addEventListener("click", () => {
            currentIndex = index;
            renderPalette();
            renderQuestions();
            updateNavigation();
        });

        questionPalette.append(button);
    });

    questionPalette.children[currentIndex]?.scrollIntoView({
        block: "nearest"
    });
}

function renderQuestions() {
    questionList.replaceChildren();

    const indexes = displayAll
        ? questions.map((_, index) => index)
        : [currentIndex];

    indexes.forEach((index) => {
        const question = questions[index];
        const card = document.createElement("article");
        card.className = "question-card";
        card.id = `question-${index}`;

        const topic = document.createElement("div");
        topic.className = "question-topic";
        topic.textContent =
            `${question.topic || "Conservation Geography"} • Week ${question.week ?? "—"}`;

        const heading = document.createElement("h3");
        heading.textContent = `${index + 1}. ${question.questionText}`;

        const options = document.createElement("div");
        const choices = choiceOrderByQuestionId[question.id] || [
            question.optionA,
            question.optionB,
            question.optionC,
            question.optionD
        ];

        choices.forEach((choice) => {
            const label = document.createElement("label");
            label.className = "option-label";

            const radio = document.createElement("input");
            radio.type = "radio";
            radio.name = `answer-${question.id}`;
            radio.value = choice;
            radio.checked = answers[question.id] === choice;

            radio.addEventListener("change", () => {
                answers[question.id] = choice;
                checkedPracticeAnswers.delete(question.id);

                const feedback = card.querySelector(".feedback");
                if (feedback) {
                    feedback.textContent = "";
                    feedback.className = "feedback hidden";
                }

                renderPalette();
                updateScore();
            });

            label.append(radio, document.createTextNode(choice));
            options.append(label);
        });

        card.append(topic, heading, options);

        // Practice Mode checks answers immediately.
        // Exam Mode does not create feedback elements or check buttons.
        if (selectedMode === "practice") {
            const actions = document.createElement("div");
            actions.className = "question-actions";

            const checkButton = document.createElement("button");
            checkButton.type = "button";
            checkButton.className = "secondary-button";
            checkButton.textContent = "Check Answer";
            checkButton.addEventListener("click", () => {
                checkPracticeAnswer(question, card);
            });

            const feedback = document.createElement("div");
            feedback.className = "feedback hidden";

            actions.append(checkButton);
            card.append(actions, feedback);
        }

        questionList.append(card);
    });
}

async function checkPracticeAnswer(question, card) {
    const answer = answers[question.id];
    const feedback = card.querySelector(".feedback");

    if (!answer) {
        feedback.textContent = "Choose an answer first.";
        feedback.className = "feedback incorrect";
        return;
    }

    try {
        const response = await fetch(
            `/api/questions/${question.id}/answer`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ answer })
            }
        );

        if (!response.ok) {
            throw new Error("Could not check this answer.");
        }

        const result = await response.json();

        feedback.textContent = result.correct
            ? `Correct! ${result.explanation}`
            : `Not quite. The answer is ${result.correctAnswer}. ${result.explanation}`;

        feedback.className =
            `feedback ${result.correct ? "correct" : "incorrect"}`;

        checkedPracticeAnswers.add(question.id);
        updateScore();
    } catch (error) {
        feedback.textContent = error.message;
        feedback.className = "feedback incorrect";
    }
}

function updateNavigation() {
    progressLabel.textContent =
        `Question ${currentIndex + 1} of ${questions.length}`;

    document.getElementById("previous-button").disabled =
        currentIndex === 0;

    document.getElementById("next-button").disabled =
        currentIndex === questions.length - 1;

    updateScore();
}

function updateScore() {
    if (selectedMode === "practice") {
        scoreLabel.textContent =
            `${checkedPracticeAnswers.size} answers checked • ` +
            `${Object.keys(answers).length} selected`;
    }
}

document.getElementById("previous-button").addEventListener("click", () => {
    if (currentIndex > 0) {
        currentIndex--;
    }

    renderPalette();
    renderQuestions();
    updateNavigation();
    window.scrollTo({ top: 0, behavior: "smooth" });
});

document.getElementById("next-button").addEventListener("click", () => {
    if (currentIndex < questions.length - 1) {
        currentIndex++;
    }

    renderPalette();
    renderQuestions();
    updateNavigation();
    window.scrollTo({ top: 0, behavior: "smooth" });
});

document.getElementById("finish-button").addEventListener("click", submitExam);

async function submitExam() {
    const finishButton = document.getElementById("finish-button");
    finishButton.disabled = true;
    finishButton.textContent = "Submitting…";
    examResults = [];

    try {
        for (const question of questions) {
            const answer = answers[question.id] || "";

            const response = await fetch(
                `/api/questions/${question.id}/answer`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ answer })
                }
            );

            if (!response.ok) {
                throw new Error("Could not submit the exam.");
            }

            const result = await response.json();
            examResults.push({ question, answer, ...result });
        }

        showResults();
    } catch (error) {
        alert(error.message);
    } finally {
        finishButton.disabled = false;
        finishButton.textContent = "Submit Exam";
    }
}

function showResults() {
    quizScreen.classList.add("hidden");
    resultsScreen.classList.remove("hidden");
    backButton.classList.remove("hidden");

    const correctCount = examResults.filter((item) => item.correct).length;
    const wrong = examResults.filter((item) => item.answer && !item.correct);
    const unanswered = examResults.filter((item) => !item.answer);

    document.getElementById("final-score").textContent =
        `${correctCount} / ${questions.length} correct`;

    document.getElementById("result-summary").textContent =
        `${wrong.length} wrong • ${unanswered.length} unanswered`;

    renderResultList("wrong-results", wrong, true);
    renderResultList("unattempted-results", unanswered, false);

    document.getElementById("retest-wrong").disabled = wrong.length === 0;
    document.getElementById("retest-unanswered").disabled =
        unanswered.length === 0;
    document.getElementById("retest-both").disabled =
        wrong.length + unanswered.length === 0;
}

function renderResultList(elementId, items, showSelectedAnswer) {
    const container = document.getElementById(elementId);
    container.replaceChildren();

    if (items.length === 0) {
        container.textContent = "None";
        return;
    }

    items.forEach((item, index) => {
        const entry = document.createElement("div");
        entry.className = "result-item";

        const title = document.createElement("strong");
        title.textContent =
            `${index + 1}. ${item.question.questionText}`;

        entry.append(title);

        if (showSelectedAnswer) {
            const selectedAnswer = document.createElement("p");
            selectedAnswer.textContent = `Your answer: ${item.answer}`;
            entry.append(selectedAnswer);
        }

        const correctAnswer = document.createElement("p");
        correctAnswer.textContent =
            `Correct answer: ${item.correctAnswer}`;
        entry.append(correctAnswer);

        if (item.explanation) {
            const explanation = document.createElement("p");
            explanation.textContent = item.explanation;
            entry.append(explanation);
        }

        container.append(entry);
    });
}

function startRetest(type) {
    const wrongQuestions = examResults
        .filter((item) => item.answer && !item.correct)
        .map((item) => item.question);

    const unansweredQuestions = examResults
        .filter((item) => !item.answer)
        .map((item) => item.question);

    if (type === "wrong") {
        questions = wrongQuestions;
    } else if (type === "unanswered") {
        questions = unansweredQuestions;
    } else {
        questions = [...wrongQuestions, ...unansweredQuestions];
    }

    if (questions.length === 0) {
        return;
    }

    currentIndex = 0;
    answers = {};
    checkedPracticeAnswers.clear();
    examResults = [];
    selectedMode = "exam";
    displayAll = false;
    prepareChoiceOrder();

    showQuiz();
    window.scrollTo({ top: 0, behavior: "smooth" });
}

document.getElementById("retest-wrong").addEventListener("click", () => {
    startRetest("wrong");
});

document.getElementById("retest-unanswered").addEventListener("click", () => {
    startRetest("unanswered");
});

document.getElementById("retest-both").addEventListener("click", () => {
    startRetest("both");
});

document.getElementById("return-home-button").addEventListener("click", () => {
    resultsScreen.classList.add("hidden");
    quizScreen.classList.add("hidden");
    setupScreen.classList.remove("hidden");
    backButton.classList.add("hidden");
    setupMessage.textContent = "";
    selectMode("practice");
    window.scrollTo({ top: 0, behavior: "smooth" });
});

backButton.addEventListener("click", () => {
    if (!quizScreen.classList.contains("hidden")) {
        quizScreen.classList.add("hidden");
        setupScreen.classList.remove("hidden");
        backButton.classList.add("hidden");
    } else if (!resultsScreen.classList.contains("hidden")) {
        resultsScreen.classList.add("hidden");
        setupScreen.classList.remove("hidden");
        backButton.classList.add("hidden");
    }
});

document.getElementById("theme-button").addEventListener("click", () => {
    document.body.classList.toggle("light-theme");
});

makeWeekButtons();
selectMode("practice");