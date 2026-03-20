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

// For CSS class names
const difficultyNamesMap = new Map()
difficultyNamesMap.set("lett", "easy");
difficultyNamesMap.set("middels", "medium");
difficultyNamesMap.set("vanskelig", "hard");

function capitalize(str) {
  if (typeof str !== 'string' || str.length === 0) {
    return '';
  }
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Quiz slugs by category
let quizSlugs = {}
// Difficulties "chose random" will pick from
// Easy and medium are enabled by default
let enabledDifficulties = JSON.parse(sessionStorage.getItem("enabledDifficulties")) ?? ["lett", "middels"];

const quizList = document.getElementById("quiz-list");
const filterButtons = document.getElementById("difficulty-filter");
const randomQuizButton = document.getElementById("random-quiz");
async function loadCategories() {
    const categoryList = await getData("http://localhost:4000/api/categories");
    if (!categoryList) {
        return;
    }
    for (const [categoryName, category] of Object.entries(categoryList)) {
        console.log(`Adding ${categoryName} to list...`);
        const newListItem = document.createElement("div");
        newListItem.classList.add("quiz-list-item");

        const newCategoryName = document.createElement("div");
        newCategoryName.classList.add("category-name")
        newListItem.appendChild(newCategoryName);

        const innerDiv = document.createElement("div");
        innerDiv.classList.add("innerContainer")
        newCategoryName.appendChild(innerDiv);

        // Header for category name
        const categoryHeader = document.createElement("h3");
        categoryHeader.innerText = categoryName;
        innerDiv.appendChild(categoryHeader);
        
        // Category description
        const description = document.createElement("p");
        description.innerText = category.description;
        innerDiv.appendChild(description);

        // Add arrow emoji
        const arrowIcon = document.createElement("span");
        arrowIcon.classList.add("material-symbols-outlined")
        arrowIcon.textContent = "keyboard_arrow_down";
        newCategoryName.appendChild(arrowIcon);

        const quizzesList = document.createElement("ul");
        quizzesList.classList.add("category-quizzes-dropdown");
        newListItem.appendChild(quizzesList);

        // Add LI for each quiz
        category.quizzes.forEach(quiz => {
            let difficultyArrray = quizSlugs[quiz.difficulty];
            if (!difficultyArrray) {
                quizSlugs[quiz.difficulty] = [];
                difficultyArrray = quizSlugs[quiz.difficulty];
            }
            difficultyArrray.push(quiz.slug);

            const linkItem = document.createElement("a");
            linkItem.href = new URL(`/frontend/quizzes.html?quiz=${quiz.slug}`, location.href)

            const listItem = document.createElement("li");
            // Not currently used
            listItem.setAttribute("data-quiz-slug", quiz.slug);

            // Add class based on difficulty
            const difficulty = quiz.difficulty;
            if (difficultyNamesMap.has(difficulty)) {
                listItem.classList.add(`list-item-${difficultyNamesMap.get(difficulty)}`);
            }

            linkItem.appendChild(listItem);

            const quizNameP = document.createElement("p");
            quizNameP.innerText = quiz.quizName;
            quizNameP.classList.add("quiz-name");
            listItem.appendChild(quizNameP);

            const difficultyP = document.createElement("p");
            difficultyP.innerText = difficulty;
            difficultyP.classList.add("quiz-difficulty");
            listItem.appendChild(difficultyP);

            quizzesList.appendChild(linkItem);
        });

        quizList.appendChild(newListItem);
    }
    
    for (const difficulty of Object.keys(quizSlugs)) {
        let difficultyButton = document.createElement("button");
        difficultyButton.innerText = capitalize(difficulty);
        filterButtons.appendChild(difficultyButton);
        // Difficulties in enabledDifficulties are enabled by default
        if (enabledDifficulties.includes(difficulty)) {
            difficultyButton.classList.add("checked-button");
        }

        difficultyButton.addEventListener("click", () => {
            const difficultyIndex = enabledDifficulties.indexOf(difficulty);
            // Check if difficulty is present in difficultyIndex
            if (difficultyIndex !== -1) {
                enabledDifficulties.splice(difficultyIndex, 1);
            } else {
                enabledDifficulties.push(difficulty);
            }
            difficultyButton.classList.toggle("checked-button");
        })
    }
}

function playRandomQuiz() {
    if (enabledDifficulties.length < 1) {
        return;
    }

    let avaiableQuizzes = [];
    const playedQuizzes = JSON.parse(sessionStorage.getItem("playedQuizzes")) ?? {};

    // Check if all avaiable quizzes have been played
    enabledDifficulties.forEach((difficulty) => {
        // If all quizzes within a difficulty have been played, 
        // allow them to be played again
        if (playedQuizzes[difficulty] && playedQuizzes[difficulty].length >= quizSlugs[difficulty].length) {
            playedQuizzes[difficulty] = [];
            console.log("Resetting", difficulty, "as all quizzes have been played");
            sessionStorage.setItem("playedQuizzes", JSON.stringify(playedQuizzes));
        }
    });
    let excludedSlugs = [];
    for (difficulty of enabledDifficulties) {
        // Create array of [quizSlug, difficulty][]
        const avaiableQuizzesArray = [];
        quizSlugs[difficulty].forEach(slug => {
            avaiableQuizzesArray.push({slug: slug, difficulty: difficulty});
        });
        avaiableQuizzes = avaiableQuizzes.concat(avaiableQuizzesArray);

        if (playedQuizzes[difficulty]) {
            excludedSlugs = excludedSlugs.concat(playedQuizzes[difficulty]);
            console.log("Added", playedQuizzes[difficulty].length, difficulty, "quizzes to exclude list")
        }
    }
    console.log("Excluded quizzes:", excludedSlugs);
    // Remove played quizzes
    if (excludedSlugs.length > 0) {
        avaiableQuizzes = avaiableQuizzes.filter((item) => {
            if (excludedSlugs.includes(item.slug)) {
                return false;
            }
            return true;
        })
    }
    console.log("Picking from:", avaiableQuizzes);
    const pickedQuiz = avaiableQuizzes[Math.floor(Math.random() * avaiableQuizzes.length)];
    console.log("Picked", pickedQuiz.slug)
    // Save picked difficulties
    sessionStorage.setItem("enabledDifficulties", JSON.stringify(enabledDifficulties));
    window.location.href = `/frontend/quizzes.html?quiz=${pickedQuiz.slug}`;
}

randomQuizButton.addEventListener("click", playRandomQuiz);

function populateQuizList() {
    const quizListItems = document.getElementsByClassName("quiz-list-item");

    function expandChildItems(element) {
        element.classList.toggle("expanded");
    }

    for (const item of quizListItems) {
        item.querySelector(".category-name").addEventListener("click", () => expandChildItems(item));
    }
}

loadCategories().then(populateQuizList)
