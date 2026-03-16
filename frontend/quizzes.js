const quizSlug = new URLSearchParams(location.search).get("quiz")
const BASE_URL = new URL("http://localhost:4000/") 

if (!quizSlug) {
    throw new Error("No quiz slug query found")
}

async function getData(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    }

    const result = await response.json();
    return result
  } catch (error) {
    console.error(error.message);
  }
}

async function wait(milliSeconds) {
    return new Promise((resolve) => {
        setTimeout(resolve, milliSeconds);
    })
}

const questionArray = getData(new URL(`/api/quizzes/${quizSlug}/questions`, BASE_URL));

const questionTextHeader = document.getElementById("question-text");
const answerList = document.getElementById("answer-list");
const quizScreen = document.getElementById("question-screen");
const endScreen = document.getElementById("end-screen");
const pointAmount = document.getElementById("point-amount");
const feedbackText = document.getElementById("feedback")
const timer = document.getElementById("timer");
const removeHalfButton = document.getElementById("remove-half");

const introAudio = new Audio("./assets/intro.mp3");
const timeoutSound = new Audio("./assets/timeout.mp3");
const removeHalfSound = new Audio("./assets/5050.mp3");
const questionSound = new Audio("./assets/question.mp3")

let answerButtons = [];
// Seconds to answer question 
const QUESTION_TIMEOUT = 10;

// Whether or not to accept answers
let answerPicked = false;
let currentQuestionSlug = "";

let totalPoints = 0;
let maxPoints = 0;

// Makes buttons non-reactive to user input
let buttonsDisabled = false;
function disableButtons() {
    if (buttonsDisabled) {
        return;
    };
    buttonsDisabled = true;
    for (const [_, button] of answerButtons.entries()) {
        button.classList.add("answered");
    }
}

function fadeIn(audioElement, startDelay, fadeInTime) {
  let i = 0;
  const steps = 10;
  let interval = fadeInTime / steps;
  audioElement.play();
  setTimeout(function () {
    let intervalId = setInterval(function() {
      let volume = (1 / steps) * i;
      audioElement.volume = volume;
      if(++i >= steps)
        clearInterval(intervalId);
    }, interval);
  }, startDelay);
}

function startBackgroundMusic() {
    fadeIn(questionSound, 0, 1000);
}

function stopBackgroundMusic() {
    // Stop music by pausing and resetting position
    questionSound.pause();
    questionSound.currentTime = 0;
}


// if answerIndex not specified, only show correct answers
async function showCorrectAndGrade(answerIndex) {
    if (answerPicked === true) {
        return;
    }
    answerPicked = true;
    const correctAnswerIndex = await getData(new URL(`/api/questions/${currentQuestionSlug}/correct-answer`, BASE_URL));

    if (typeof answerIndex === "number")  {
        if (answerIndex === correctAnswerIndex) {
            console.log("Correct!");
            totalPoints++;
        } else {
            console.log("Incorrect!");
        }
    }

    for (const [index, button] of answerButtons.entries()) {
        if (button.disabled) {
            continue;
        }
        if (index === correctAnswerIndex) {
            button.classList.add("correct");
        } else {
            button.classList.add("wrong");
        }
    }
}

function waitForAnswer() {
    return new Promise((resolve) => {
        answerButtons.forEach((button, index) => {
            button.addEventListener("click", () => {
                if (!buttonsDisabled) {
                    // Make selected button pushed in
                    button.classList.add("pushed");
                    // Allow no further inputs
                    disableButtons();
                    resolve(index);
                }
            });
        });
    });
}

// Calculates appropriate font size to keep buttons the same size
function computeFontSize(textContent) {
    const size = 900 / textContent.length;
    return Math.min(32, Math.max(12, size));
}


// Change question text and add answer options
async function renderQuestion(index) {
    const questions = await questionArray;
    const question = questions[index];
    if (!question) {
        throw new Error(`No question of index ${index} in quiz ${quizSlug}`)
    }

    currentQuestionSlug = question.slug;
    questionTextHeader.innerText = question.questionText;

    for (const [questionIndex, questionText] of question.options.entries()) {
        const questionButton = document.createElement("button");
        questionButton.innerText = questionText;
        questionButton.style.fontSize = computeFontSize(questionText) + "px";
        answerList.appendChild(questionButton)

        answerButtons[questionIndex] = questionButton;
    }
}

function cleanUpButtons() {
    for (button of answerButtons) {
        button.remove()
    }
}

// Uses "remove half" hint
async function removeHalf() {
    const wrongIndexes = await getData(new URL(`/api/questions/${currentQuestionSlug}/remove-half`, BASE_URL));
    wrongIndexes.forEach((value, _) => {
        answerButtons[value].disabled = true;
    })
}

// Array of cheat names which have been used this round
let cheatsUsed = [];
removeHalfButton.addEventListener("click", () => {
    if (cheatsUsed.find((v, _) =>  v === "remove-half") || buttonsDisabled === true) {
        return;
    }
    cheatsUsed.push("remove-half");
    removeHalfButton.disabled = true;
    removeHalfSound.play();
    // Let sound play first
    setTimeout(removeHalf, 500);
});

async function startTimer() {
    let timerNumber = QUESTION_TIMEOUT;
    timer.classList.remove("low-time");
    
    let lastTime = Date.now();
    while (answerPicked === false) {
        const delta = (Date.now() - lastTime) / 1000;
        timerNumber = (timerNumber - delta).toFixed(2);
        timer.innerText = timerNumber;
        if (timerNumber <= 0) {
            timer.innerText = "0.00";
            disableButtons();
            timeoutSound.play();
            
            // Flash timer off and on three times
            for (let i = 0; i < 3; i++) {
                await wait(400);
                timer.style.opacity = 0;
                await wait(400);
                timer.style.opacity = 100;
            }
            return;
        }
        if (timerNumber < 3) {
            timer.classList.add("low-time")
        }
        lastTime = Date.now();
        await wait(50);
    }
}

async function runQuestion(questionIndex) {
    await renderQuestion(questionIndex);
    buttonsDisabled = false;
    startBackgroundMusic();
    // Race question timeout and answer being submitted
    const answerIndex = await Promise.race([startTimer(), waitForAnswer()]);
    stopBackgroundMusic();
    console.log("Answered or timeout. Index:", answerIndex);
    await showCorrectAndGrade(answerIndex);

    // Wait less time if answer has been provided by player
    if (typeof answerIndex === "number") {
        await wait(1500);
    } else {
        await wait(2000);
    }
    cleanUpButtons();
}

const feedbacks = {
    high: [
        "Imponerende!",
        "Fantastisk jobbet!",
        "Knallsterkt resultat!",
        "Supert! Dette kan du.",
    ],
    medium: [
        "Ikke verst!",
        "Bra forsøk! Litt mer øving for en perfekt score.",
        "Solid innsats.",
        "Godt jobbet! Med litt øving blir dette topp.",
    ],
    low: [
        "Litt mer øving vil hjelpe mye.",
        "Ikke gi deg!",
        "Prøv en runde til.",
        "Neste forsøk går sikkert bedre.",
    ],
}
function getFeedback(percentage) {
    if (percentage <= 1 / 3) {
        const feedbackArray = feedbacks.low;
        return feedbackArray[Math.floor(Math.random() * feedbackArray.length)];
    } else if (percentage <= 2 / 3 ) {
        const feedbackArray = feedbacks.medium;
        return feedbackArray[Math.floor(Math.random() * feedbackArray.length)];
    } else {
        const feedbackArray = feedbacks.high;
        return feedbackArray[Math.floor(Math.random() * feedbackArray.length)];
    }
}

async function startQuiz() {
    const questions = await questionArray;
    maxPoints = questions.length;

    introAudio.play();
    for (const questionIndex in questions) {
        console.log("Running ", questionIndex);
        document.title = `Quiz - Spørsmål ${parseInt(questionIndex) + 1}`;
        await runQuestion(parseInt(questionIndex));
        answerPicked = false;
        console.log(`Loading next question: ${parseInt(questionIndex) + 1}`);
    }

    document.title = "Quiz - Resultat"
    const finalPercentage = totalPoints / maxPoints;

    quizScreen.style.display = "none";
    endScreen.style.display = "block"
    pointAmount.innerText = `${totalPoints}/${maxPoints}`;
    feedbackText.innerText = getFeedback(finalPercentage);
}
startQuiz();