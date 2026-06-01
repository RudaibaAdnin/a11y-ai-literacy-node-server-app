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

import imageRoutes from "./spotTheBias/imageRoutes.js";
import imageAliceRoutes from "./spotTheBias/imageAliceRoutes.js";
import imageReviewRoutes from "./spotTheBias/imageReviewRoutes.js";
import imageCraftPromptRoutes from "./spotTheBias/imageCraftPromptRoutes.js";

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

imageRoutes(app);
imageAliceRoutes(app);
imageReviewRoutes(app);
imageCraftPromptRoutes(app);

app.listen(process.env.PORT || 4000);
