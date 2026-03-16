import { response, type Request, type Response } from "express";
import {
  getCategoryList,
  getQuizQuestionsBySlug,
  getQuestionAnswerBySlug,
  removeHalf,
} from "../services/quizService.js";

function respondStringified<Args extends unknown[], R>(
  res: Response,
  func: (...args: Args) => R,
  ...args: Args
) {
  try {
    const result = func(...args);

    // 404 if resource not found
    if (typeof result === "undefined") {
      res.status(404).send();
      return;
    }

    const stringified = JSON.stringify(result);
    res.status(200).send(stringified);
  } catch (error) {
    console.error("Error responding:", error);
    res.status(500).send("Internal server error");
  }
}

function getCategoryListHandler(req: Request, res: Response) {
  console.log("Returning category list");
  respondStringified(res, getCategoryList);
}

function getQuizQuestionsBySlugHandler(req: Request, res: Response) {
  const quizSlug = req.params.quizSlug;
  if (!quizSlug) {
    res.status(400).send("Missing slug");
    return;
  }
  console.log(`Returning questions for quiz "${quizSlug}"`);
  respondStringified(res, getQuizQuestionsBySlug, quizSlug as string);
}

function getQuestionAnswerHandler(req: Request, res: Response) {
  const questionSlug = req.params.questionSlug;
  if (!questionSlug) {
    res.status(400).send("Missing slug");
    return;
  }
  console.log(`Returning answer index for question "${questionSlug}"`);
  respondStringified(res, getQuestionAnswerBySlug, questionSlug as string);
}

function removeHalfHandler(req: Request, res: Response) {
  const questionSlug = req.params.questionSlug;
  if (!questionSlug) {
    res.status(400).send("Missing slug");
    return;
  }
  console.log(
    `Eliminating half of alternatives for question "${questionSlug}"`,
  );
  respondStringified(res, removeHalf, questionSlug as string);
}

export {
  getCategoryListHandler,
  getQuizQuestionsBySlugHandler,
  getQuestionAnswerHandler,
  removeHalfHandler,
};
