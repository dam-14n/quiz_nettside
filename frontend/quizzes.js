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

const quizMetadata = getData(new URL(`/api/quizzes/${quizSlug}/metadata`, BASE_URL))
const questionArray = getData(new URL(`/api/quizzes/${quizSlug}/questions`, BASE_URL));

const questionTextHeader = document.getElementById("question-text");
const answerList = document.getElementById("answer-list");
const quizScreen = document.getElementById("question-screen");
const endScreen = document.getElementById("end-screen");
const introScreen = document.getElementById("intro-screen");
const pointAmount = document.getElementById("point-amount");
const feedbackText = document.getElementById("feedback")
const timer = document.getElementById("timer");
const introQuizName = document.getElementById("quiz-name");
const introQuizDifficulty = document.getElementById("quiz-difficulty");

const introAudio = new Audio("./assets/intro.mp3");
const timeoutSound = new Audio("./assets/timeout.mp3");
const removeHalfSound = new Audio("./assets/5050.mp3");
const questionSound = new Audio("./assets/question.mp3");
const correctSound = new Audio("./assets/correct.mp3");
const wrongSound = new Audio("./assets/wrong.mp3");
const addTimeSound = new Audio("./assets/add_time.mp3");

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
  setTimeout(function() {
    audioElement.volume = 0;
    audioElement.play();
    let intervalId = setInterval(function() {
      let volume = (1 / steps) * i;
      audioElement.volume = volume;
      if(i++ >= steps)
        clearInterval(intervalId);
    }, interval);
  }, startDelay);
}

questionSound.loop = true;
function startBackgroundMusic() {
    fadeIn(questionSound, 1000, 1500);
}

function stopBackgroundMusic() {
    // Stop music by pausing
    questionSound.pause();
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
            correctSound.play();
            console.log("Correct!");
            totalPoints++;
        } else {
            wrongSound.play();
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

class CheatItem {
    #used = false;
    constructor(func, button) {
        // Wrap function to only run when not used and buttons enabled
        this.func = () => {
            if (this.#used === false && buttonsDisabled === false) {
                this.#used = true;
                func();
                this.button.disabled = true;
            }
        };
        this.button = button;
    }
}

let cheatItems = [];
cheatItems.push(new CheatItem(
    async function() {
        removeHalfSound.play();
        // Let sound play first
        await wait(250);
        const wrongIndexes = await getData(new URL(`/api/questions/${currentQuestionSlug}/remove-half`, BASE_URL));
        wrongIndexes.forEach((value, _) => {
            answerButtons[value].disabled = true;
        })
    },
    document.getElementById("remove-half")
));

// Time in seconds to add to timer
// Resets to 0 once time has been added by timer function
let timeToAdd = 0;
cheatItems.push(new CheatItem(
    function() {
        addTimeSound.play();
        timeToAdd = 10;
    },
    document.getElementById("add-time")
));

// Connect button events to functions
for (item of cheatItems) {
    item.button.addEventListener("click", item.func);
}

async function startTimer() {
    let timerNumber = QUESTION_TIMEOUT;
    timer.classList.remove("low-time");
    
    let lastTime = Date.now();
    while (answerPicked === false) {
        const delta = (Date.now() - lastTime) / 1000;
        timerNumber = timerNumber - delta + timeToAdd;
        timeToAdd = 0;
        timer.innerText = timerNumber.toFixed(2);
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

function capitalize(str) {
  if (typeof str !== 'string' || str.length === 0) {
    return '';
  }
  return str.charAt(0).toUpperCase() + str.slice(1);
}

async function startQuiz() {
    const questions = await questionArray;
    const metadata = await quizMetadata;
    maxPoints = questions.length;

    introQuizName.innerText = metadata.name;
    introQuizDifficulty.innerText = capitalize(metadata.difficulty);

    introAudio.play();
    await wait(1000);
    introScreen.classList.add("hidden");
    await wait(1000);
    introScreen.style.display = "none";
    await wait(1000);
    quizScreen.style.display = "flex";

    for (const questionIndex in questions) {
        console.log("Running ", questionIndex);
        document.title = `Quiz - Spørsmål ${parseInt(questionIndex) + 1}`;
        await runQuestion(parseInt(questionIndex));
        answerPicked = false;
        console.log(`Next question: ${parseInt(questionIndex) + 1}`);
    }

    const playedQuizzes = JSON.parse(sessionStorage.getItem("playedQuizzes")) ?? {};

     // Save played quiz to sessionStorage
    const playedQuizzesArray = playedQuizzes[metadata.difficulty];
    if (playedQuizzesArray) {
        if (!playedQuizzesArray.includes(quizSlug)) {
            playedQuizzesArray.push(quizSlug);
        }
    } else {
        playedQuizzes[metadata.difficulty] = [];
        playedQuizzes[metadata.difficulty].push(quizSlug);
    }
    sessionStorage.setItem("playedQuizzes", JSON.stringify(playedQuizzes));

    document.title = "Quiz - Resultat"
    const finalPercentage = totalPoints / maxPoints;

    quizScreen.style.display = "none";
    endScreen.style.display = "block"
    pointAmount.innerText = `${totalPoints}/${maxPoints}`;
    feedbackText.innerText = getFeedback(finalPercentage);
}
startQuiz();