import {
  QuizMapSchema,
  type RawQuizMap,
  type QuizMap,
  type RawQuestion,
  type Question,
  RawQuizMapSchema,
} from "../schemas/quiz.js";
import quizData from "../data/raw/quizzes.json" with { type: "json" };
import fs, { cpSync } from "fs";

// Array of slugs which appear more than once
// Those will have number suffixes attached, such as trivia-1, trivia-2, etc.
let duplicateSlugs: string[] = [];

function findDuplicateNames(quizData: RawQuizMap) {
  let seenSlugs: string[] = [];
  // Iterate over quizzes and and find which slugs appear more than once
  for (const [categoryName, category] of Object.entries(quizData)) {
    category.quizzes.map((quiz, index) => {
      let quizSlugPrefix = quiz.name.replaceAll(" ", "-").toLowerCase();

      // If slug has been seen before, add it to duplicates list
      if (seenSlugs.includes(quizSlugPrefix)) {
        duplicateSlugs.push(quizSlugPrefix);
      } else {
        seenSlugs.push(quizSlugPrefix);
      }
    });
  }
}

// Map of how many times each slug has been used
let usedSlugMap: Map<string, number> = new Map();
function generateQuizSlug(quizName: string) {
  const slug = quizName.replaceAll(" ", "-").toLowerCase();
  if (!duplicateSlugs.includes(slug)) {
    return slug;
  } else {
    const slugIndex = usedSlugMap.get(slug) ?? 1;
    usedSlugMap.set(slug, slugIndex + 1);
    return `${slug}-${slugIndex}`;
  }
}

// Maps old indexes to shuffled
function shuffleArray(array: any[]) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// Shuffles answer options and adds slug
function generateQuestion(
  question: RawQuestion,
  questionIndex: number,
  quizSlug: string,
): Question {
  let newQuestion: Partial<Question> = structuredClone(question);
  newQuestion.slug = `${quizSlug}-q${questionIndex}`;
  shuffleArray(newQuestion.options!);

  // Find the new post-shuffle index of the correct answer
  const correctAnswerText = question.options[question.answer_index]!;
  const newAnswerIndex = newQuestion.options!.indexOf(correctAnswerText);

  newQuestion.answer_index = newAnswerIndex;
  return newQuestion as Question;
}

// Returns quizData with slugs added
function generateIDs(quizData: RawQuizMap): QuizMap {
  findDuplicateNames(quizData);

  // Same as quizData but with slugs added to quizzes and questions (and shuffled options)
  let processedQuizData: QuizMap = {};
  // Loop through each category
  for (const [categoryName, category] of Object.entries(quizData)) {
    let newQuizzes = [];
    // For each quiz, add quiz & question slug
    for (const quiz of category.quizzes) {
      const quizSlug = generateQuizSlug(quiz.name);
      console.log(`Inserting slug for "${quiz.name}": "${quizSlug}"`);

      let newQuestions = quiz.questions.map((question, index) =>
        generateQuestion(question, index, quizSlug),
      );
      newQuizzes.push({
        name: quiz.name,
        difficulty: quiz.difficulty,
        slug: quizSlug,
        questions: newQuestions,
      });
    }
    // Add each category to processedQuizData when done adding slugs
    processedQuizData[categoryName] = {
      ...category,
      quizzes: newQuizzes,
    };
    console.log(`Finished category ${category.title}`);
  }
  return processedQuizData;
}

const startTick = Date.now();

// Validate raw data
RawQuizMapSchema.parse(quizData);

// Generate and validate processed data
const processedQuizData = generateIDs(quizData);
QuizMapSchema.parse(processedQuizData);

console.log(`Successfully generated quizzes in ${Date.now() - startTick} ms`);

try {
  fs.writeFileSync(
    "./src/data/generated/quizzes.json",
    JSON.stringify(processedQuizData),
  );
  console.log("Wrote quizzes.json successfully");
} catch (error) {
  console.log("Error writing quizzes.json file:", error);
}
