import quizData from "../data/generated/quizzes.json" with { type: "json" };
import {
  QuizMapSchema,
  type Question,
  type QuestionWithoutAnswer,
  type Quiz,
  type Category,
} from "../schemas/quiz.js";

// Validate quiz data
QuizMapSchema.parse(quizData);

let categoryNamesMap: Map<string, Category> = new Map();
let slugToQuizMap: Map<string, Quiz> = new Map();
let slugToQuestionMap: Map<string, Question> = new Map();

type QuizListItem = {
  slug: string;
  quizName: string;
  difficulty: string;
};

type CategoryList = {
  [CategoryName: string]: {
    description: string;
    quizzes: QuizListItem[];
  };
};

// Return this when client asks for list of avaiable quizzes
let categoryQuizzes: CategoryList = {};

// Populate maps
const mapStartTime = Date.now();
for (const [_, category] of Object.entries(quizData)) {
  categoryQuizzes[category.title] = {
    description: category.description,
    quizzes: [],
  };
  categoryNamesMap.set(category.title, category);

  category.quizzes.forEach((quiz, _) => {
    slugToQuizMap.set(quiz.slug, quiz);
    categoryQuizzes[category.title]!.quizzes.push({
      slug: quiz.slug,
      quizName: quiz.name,
      difficulty: quiz.difficulty,
    });

    quiz.questions.forEach((question, _) => {
      slugToQuestionMap.set(question.slug, question);
    });
  });
}

const deltaTime = Date.now() - mapStartTime;
console.log(
  `Finished mapping ${categoryNamesMap.size} categories, ${slugToQuizMap.size} quizzes, and ${slugToQuestionMap.size} questions in ${deltaTime} ms`,
);

// Get a list of category names and their quiz names + slugs
function getCategoryList() {
  return categoryQuizzes;
}

// Get questions belonging to a given quiz by its slug
function getQuizQuestionsBySlug(
  quizSlug: string,
): QuestionWithoutAnswer[] | undefined {
  // Remove correct answer info
  if (slugToQuizMap.has(quizSlug)) {
    let questionsArray: QuestionWithoutAnswer[] = [];
    slugToQuizMap.get(quizSlug)!.questions.forEach((question, _) => {
      const { answer_index, ...withoutAnswerIndex } = question;
      questionsArray.push(withoutAnswerIndex);
    });
    return questionsArray;
  }
}

// Get the correct answer index of a question
function getQuestionAnswerBySlug(questionSlug: string) {
  return slugToQuestionMap.get(questionSlug)?.answer_index;
}

export { getCategoryList, getQuizQuestionsBySlug, getQuestionAnswerBySlug };
