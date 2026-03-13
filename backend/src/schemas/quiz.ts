import * as z from "zod";

const RawQuestionSchema = z.object({
  questionText: z.string(),
  options: z.string().array(),
  answer_index: z.number(),
});

const RawQuizSchema = z.object({
  name: z.string(),
  difficulty: z.string(),
  questions: z.array(RawQuestionSchema),
});

const RawCategorySchema = z.object({
  title: z.string(),
  description: z.string(),
  quizzes: z.array(RawQuizSchema),
});

const RawQuizMapSchema = z.record(z.string(), RawCategorySchema);

const GeneratedQuestionSchema = RawQuestionSchema.extend({
  slug: z.string(),
});

const GeneratedQuizSchema = RawQuizSchema.extend({
  slug: z.string(),
  questions: z.array(GeneratedQuestionSchema),
});

const GeneratedCategorySchema = RawCategorySchema.omit({
  quizzes: true,
}).extend({
  quizzes: GeneratedQuizSchema.array(),
});

const QuizMapSchema = z.record(z.string(), GeneratedCategorySchema);

export { RawQuizMapSchema, QuizMapSchema };

export type Question = z.infer<typeof GeneratedQuestionSchema>;
export type RawQuestion = z.infer<typeof RawQuestionSchema>;
export type QuestionWithoutAnswer = Omit<Question, "answer_index">;
export type Quiz = z.infer<typeof GeneratedQuizSchema>;
export type Category = z.infer<typeof GeneratedCategorySchema>;
export type RawQuizMap = z.infer<typeof RawQuizMapSchema>;
export type QuizMap = z.infer<typeof QuizMapSchema>;
