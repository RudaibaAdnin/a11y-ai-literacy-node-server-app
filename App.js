import express from "express";
import cors from "cors";

import Hello from "./Hello.js";
import saraRoutes from "./spotTheLie/saraRoutes.js";
import reviewRoutes from "./spotTheLie/reviewRoutes.js";
import adamRoutes from "./spotTheLie/adamRoutes.js";

import storyQuestionRoutes from "./spotTheBias/storyQuestionRoutes.js";

import storyReadingRoutes from "./spotTheBias/storyReadingRoutes.js";
import storyAliceRoutes from "./spotTheBias/storyAliceRoutes.js";
import storyCraftPromptRoutes from "./spotTheBias/storyCraftPromptRoutes.js";
import storyReviewRoutes from "./spotTheBias/storyReviewRoutes.js";

import imageReadingRoutes from "./spotTheBias/imageRoutes/imageReadingRoutes.js";
import imageAliceRoutes from "./spotTheBias/imageRoutes/imageAliceRoutes.js";
import imageReviewRoutes from "./spotTheBias/imageRoutes/imageReviewRoutes.js";

const app = express();
app.use(cors());
app.use(express.json());

Hello(app);
saraRoutes(app);
adamRoutes(app);
reviewRoutes(app);

storyQuestionRoutes(app);

storyReadingRoutes(app);
storyAliceRoutes(app);
storyCraftPromptRoutes(app);
storyReviewRoutes(app);

imageReadingRoutes(app);
imageAliceRoutes(app);
imageReviewRoutes(app);

app.listen(process.env.PORT || 4000);
