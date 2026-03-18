import type { Express, Response, Request } from "express";
import {
  getCategoryListHandler,
  getQuizQuestionsBySlugHandler,
  getQuestionAnswerHandler,
  removeHalfHandler,
  getQuizMetaBySlugHandler,
} from "./controllers/quizController.js";

function routes(app: Express) {
  app.get("/api/health", (req: Request, res: Response) => {
    console.log("Responding to healthcheck successfully");
    res.status(200).send("Det funker!");
  });

  app.get("/api/categories", getCategoryListHandler);

  app.get("/api/quizzes/:quizSlug/questions", getQuizQuestionsBySlugHandler);

  app.get(
    "/api/questions/:questionSlug/correct-answer",
    getQuestionAnswerHandler,
  );

  app.get("/api/questions/:questionSlug/remove-half", removeHalfHandler);

  app.get("/api/quizzes/:quizSlug/metadata", getQuizMetaBySlugHandler);
}

export default routes;
