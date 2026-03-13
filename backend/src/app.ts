import express from "express";
import routes from "./routes.js";
import cors from "cors";
import "dotenv/config";

let app = express();
const PORT = process.env.PORT;
const FRONTEND_URL = process.env.CORS_ORIGIN;

app.use(
  cors({
    origin: FRONTEND_URL,
  }),
);

app.listen(PORT, async () => {
  console.log(`Server listening on port ${PORT}`);
  routes(app);
});
