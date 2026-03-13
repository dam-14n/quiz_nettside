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

const difficultyNamesMap = new Map()
difficultyNamesMap.set("lett", "easy");
difficultyNamesMap.set("middels", "medium");
difficultyNamesMap.set("vanskelig", "hard");

const quizList = document.getElementById("quiz-list");
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
}

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
