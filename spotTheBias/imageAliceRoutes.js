import {
  getFollowUpQuestions,
  getFollowUpReply,
  getClue,
} from "../util/openAIServices.js";

import { follow_up_categories } from "../util/storyFollowUpCategories.js";

import { story_bias_checking_categories } from "../util/storyBiasCheckingCategories.js";

const parseResponse = (response) => JSON.parse(response);

const getBiasName = (biasCategoryImage) => {
  if (!biasCategoryImage) {
    throw new Error("Missing biasCategoryImage in request body.");
  }

  return typeof biasCategoryImage === "string"
    ? biasCategoryImage
    : biasCategoryImage.name || "";
};

const categoryText = (biasCategoryImage) => {
  const biasName = getBiasName(biasCategoryImage);

  return JSON.stringify({
    name: biasName,
    Categories: story_bias_checking_categories[biasName]?.Categories || [],
  });
};

const getFollowUpCategoriesForImageBias = (biasCategoryImage) => {
  const biasName = getBiasName(biasCategoryImage);

  return follow_up_categories.filter((item) => item.biasType === biasName);
};

const buildPromptForImageBiasClue = (
  imageDescriptionParagraph,
  biasCategoryImage,
) => `
You are Alice, an AI clue helper for children ages 10-14.

Image description paragraph:
${JSON.stringify(imageDescriptionParagraph)}

Hidden image bias type and checking categories:
${categoryText(biasCategoryImage)}

First, determine which checking category best matches what is happening in the image description paragraph.

Then write one short clue that helps the child notice that issue.

Rules:
- Base the clue on the checking category that actually appears in the paragraph.
- Do not directly say the hidden bias type.
- Do not directly say the checking category name.
- Do not reveal the answer.
- Point the child toward the relevant assumption, description, treatment, cultural detail, or default.
- Use simple, playful language.
- Keep the clue short.

Return only the clue as a string.
`;

const buildPromptForImageBiasFollowups = (
  imageDescriptionParagraph,
  biasCategoryImage,
  clueImage,
) => {
  const matchingCategories =
    getFollowUpCategoriesForImageBias(biasCategoryImage);

  return `
You are Alice, an AI helper for children ages 10-14.

Image description paragraph:
${JSON.stringify(imageDescriptionParagraph)}

Hidden image bias type and checking categories:
${categoryText(biasCategoryImage)}

Clue:
${JSON.stringify(clueImage)}

Below are the follow-up categories for this hidden image bias type.

Follow-up categories:
${matchingCategories
  .map(
    (item, index) =>
      `${index + 1}) Category: ${item.category}
Example questions:
- ${item.questions.join("\n- ")}`,
  )
  .join("\n\n")}

Generate ONE follow-up question for EACH category listed above.

Rules:
- Every listed category must appear exactly once.
- Do not repeat a category.
- Do not skip a category.
- Generate only one question for each category.
- Use the example questions as guidance.
- Adapt each question to the exact image description paragraph when helpful.
- Keep the same checking purpose as the examples.
- Keep each question short, clear, and child-friendly.
- Do not directly reveal the hidden bias type.
- Do not directly give the child the answer.
- The "category" field must exactly match the category title listed above, including "Check for".

If there are 2 categories, return exactly 2 questions.
If there are 3 categories, return exactly 3 questions.

Return ONLY raw JSON in this exact shape:
{
  "followUp": [
    {
      "category": "<exact category title>",
      "question": "<question>"
    }
  ]
}
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

Hidden image bias type and checking categories:
${categoryText(biasCategoryImage)}

Clue:
${JSON.stringify(clueImage)}

Child's follow-up question:
${JSON.stringify(followUpQuestionImage)}

Answer the child's question using the checking categories above to understand what is happening in the image description paragraph.

Rules:
- Answer based on the specific image description paragraph.
- Help the child notice the relevant assumption, unequal description, treatment, default, or cultural detail.
- Do not directly name the hidden bias type.
- Do not directly name the checking category unless needed to answer the child's question.
- Do not give away the answer too quickly.
- Encourage the child to examine the wording or details in the paragraph.
- Keep the reply under 60 words.
- Use simple, conversational language.

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

      res.json({
        clueImage,
      });
    } catch (error) {
      console.error("Error generating image bias clue:", error);

      res.status(500).json({
        error: "Failed to get image bias clue.",
      });
    }
  });

  app.post("/api/image-bias-followup-questions", async (req, res) => {
    try {
      const { imageDescriptionParagraph, biasCategoryImage, clueImage } =
        req.body;

      const matchingCategories =
        getFollowUpCategoriesForImageBias(biasCategoryImage);

      const response = await getFollowUpQuestions(
        buildPromptForImageBiasFollowups(
          imageDescriptionParagraph,
          biasCategoryImage,
          clueImage,
        ),
      );

      const parsed = parseResponse(response);

      const generatedFollowUp = Array.isArray(parsed.followUp)
        ? parsed.followUp
        : [];

      const followUp = matchingCategories.map((categoryItem) => {
        const generatedItem = generatedFollowUp.find(
          (item) => item.category === categoryItem.category,
        );

        return {
          category: categoryItem.category,
          question: generatedItem?.question || categoryItem.questions[0] || "",
        };
      });

      res.json({
        followUpQuestionCategoriesImage: followUp.map((item) => item.category),

        followUpQuestionsImage: followUp.map((item) => item.question),
      });
    } catch (error) {
      console.error("Error generating image bias follow-up questions:", error);

      res.status(500).json({
        error: "Failed to get image bias follow-up questions.",
      });
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

      res.json({
        followUpReplyImage,
      });
    } catch (error) {
      console.error("Error generating image bias follow-up reply:", error);

      res.status(500).json({
        error: "Failed to get image bias follow-up reply.",
      });
    }
  });
};

export default imageAliceRoutes;
