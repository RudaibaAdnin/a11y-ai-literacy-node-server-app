import {
  getFollowUpQuestions,
  getFollowUpReply,
  getClue,
} from "../util/openAIServices.js";
import { follow_up_categories } from "../util/storyFollowUpCategories.js";

const parseResponse = (response) => JSON.parse(response);

const pickRandom = (items, count) =>
  [...items].sort(() => Math.random() - 0.5).slice(0, count);

const categoryText = (biasCategoryImage) => {
  if (!biasCategoryImage) {
    throw new Error("Missing biasCategoryImage in request body.");
  }

  if (typeof biasCategoryImage === "string") {
    return JSON.stringify({
      name: biasCategoryImage,
      meaning: "",
      examples: [],
    });
  }

  return JSON.stringify({
    name: biasCategoryImage.name || "",
    meaning: biasCategoryImage.meaning || "",
    examples: biasCategoryImage.examples || [],
  });
};

const buildPromptForImageBiasClue = (
  imageDescriptionParagraph,
  biasCategoryImage,
) => `
You are Alice, an AI clue helper for children ages 10-14.

Image description paragraph:
${JSON.stringify(imageDescriptionParagraph)}

Hidden image bias category:
${categoryText(biasCategoryImage)}

Write one short clue that helps the child think critically about the image description paragraph.
Do not directly say the bias category name.
Do not reveal the answer.
Use simple, playful language.
Return only the clue as a string.
`;

const buildPromptForImageBiasFollowups = (
  imageDescriptionParagraph,
  biasCategoryImage,
  clueImage,
) => {
  const chosenCategories = pickRandom(follow_up_categories, 3);

  return `
You are Alice, an AI helper for children ages 10-14.

Image description paragraph:
${JSON.stringify(imageDescriptionParagraph)}

Hidden image bias category:
${categoryText(biasCategoryImage)}

Clue:
${JSON.stringify(clueImage)}

Generate exactly 3 follow-up questions that help the child investigate the possible image bias.
Each question must use one of the 3 categories below.

Categories + example styles:
${chosenCategories
  .map(
    (item, index) =>
      `${index + 1}) ${item.followupQuestionCategory}\nExamples:\n- ${item.followupQuestionExamples.join("\n- ")}`,
  )
  .join("\n\n")}

Keep each question short, clear, and child-friendly.

Return ONLY raw JSON in this exact shape:
{
  "followUp": [
    { "category": "<category1>", "question": "<question1>" },
    { "category": "<category2>", "question": "<question2>" },
    { "category": "<category3>", "question": "<question3>" }
  ]
}

Make sure the categories in the JSON exactly match the 3 category titles above.
`;
};

const buildPromptForImageBiasReply = (
  imageDescriptionParagraph,
  biasCategoryImage,
  clueImage,
  followUpQuestionImage,
) => `
You are Alice, an AI helper for children ages 10-14.

Image description paragraph:
${JSON.stringify(imageDescriptionParagraph)}

Hidden image bias category:
${categoryText(biasCategoryImage)}

Clue:
${JSON.stringify(clueImage)}

Child's follow-up question:
${JSON.stringify(followUpQuestionImage)}

Answer the question in a helpful way.
Help the child think about possible image bias, but do not directly give away the answer too quickly.
Keep the reply under 60 words.
Use simple, conversational language.
Return only the reply as a string.
`;

const imageAliceRoutes = (app) => {
  app.get("/api/image-alice-routes-test", (req, res) => {
    res.json({
      status: "ok",
      message: "Image Alice text routes are connected.",
      routes: [
        "GET /api/image-alice-routes-test",
        "POST /api/image-bias-clue",
        "POST /api/image-bias-followup-questions",
        "POST /api/image-bias-followup-reply",
      ],
    });
  });
  app.post("/api/image-bias-clue", async (req, res) => {
    try {
      const { imageDescriptionParagraph, biasCategoryImage } = req.body;

      const clueImage = await getClue(
        buildPromptForImageBiasClue(
          imageDescriptionParagraph,
          biasCategoryImage,
        ),
      );

      res.json({ clueImage });
    } catch (error) {
      console.error("Error generating image bias clue:", error);
      res.status(500).json({ error: "Failed to get image bias clue." });
    }
  });

  app.post("/api/image-bias-followup-questions", async (req, res) => {
    try {
      const { imageDescriptionParagraph, biasCategoryImage, clueImage } =
        req.body;

      const parsed = parseResponse(
        await getFollowUpQuestions(
          buildPromptForImageBiasFollowups(
            imageDescriptionParagraph,
            biasCategoryImage,
            clueImage,
          ),
        ),
      );

      res.json({
        followUpQuestionCategoriesImage: parsed.followUp.map(
          (item) => item.category,
        ),
        followUpQuestionsImage: parsed.followUp.map((item) => item.question),
      });
    } catch (error) {
      console.error("Error generating image bias follow-up questions:", error);
      res
        .status(500)
        .json({ error: "Failed to get image bias follow-up questions." });
    }
  });

  app.post("/api/image-bias-followup-reply", async (req, res) => {
    try {
      const {
        imageDescriptionParagraph,
        biasCategoryImage,
        clueImage,
        followUpQuestionImage,
      } = req.body;

      const followUpReplyImage = await getFollowUpReply(
        buildPromptForImageBiasReply(
          imageDescriptionParagraph,
          biasCategoryImage,
          clueImage,
          followUpQuestionImage,
        ),
      );

      res.json({ followUpReplyImage });
    } catch (error) {
      console.error("Error generating image bias follow-up reply:", error);
      res
        .status(500)
        .json({ error: "Failed to get image bias follow-up reply." });
    }
  });
};

export default imageAliceRoutes;
