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

type QuizMeta = Pick<Quiz, "name" | "difficulty">;

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

// Eliminates half of the answer options by returning answer indexes which are wrong
// Amount of indexes it retruns depends on how many answer options the question has;
// always leaves at least two options as to not reveal the answer
function removeHalf(questionSlug: string): number[] | undefined {
  if (!slugToQuestionMap.has(questionSlug)) {
    return;
  }
  const question = slugToQuestionMap.get(questionSlug)!;
  const answerOptionsAmount = question.options.length;
  // Don't remove anything if answer only has two options
  if (answerOptionsAmount <= 2) {
    return [];
  }

  // Creates an array with all answer indexes, remove correct one
  let incorrectIndexes = Array.from(
    { length: answerOptionsAmount },
    (_, i) => i,
  );
  incorrectIndexes.splice(question.answer_index, 1);

  // Amount of answers to remove from incorrectIndexes before returning
  // Amount that is left will be answerOptionsAmount - answersToRemove - 1 (correct answer removed)
  const answersToRemove = Math.floor((answerOptionsAmount - 1) / 2);
  for (let i = 0; i < answersToRemove; i++) {
    const indexToRemove = Math.floor(Math.random() * incorrectIndexes.length);
    incorrectIndexes.splice(indexToRemove, 1);
  }
  return incorrectIndexes;
}

function getQuizMetaBySlug(quizSlug: string): QuizMeta | undefined {
  const quiz = slugToQuizMap.get(quizSlug);
  if (quiz) {
    return {
      name: quiz.name,
      difficulty: quiz.difficulty,
    };
  }
}

export {
  getCategoryList,
  getQuizQuestionsBySlug,
  getQuestionAnswerBySlug,
  removeHalf,
  getQuizMetaBySlug,
};
