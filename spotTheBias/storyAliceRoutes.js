import {
  getFollowUpQuestions,
  getFollowUpReply,
  getClue,
} from "../util/openAIServices.js";

import { follow_up_categories } from "../util/storyFollowUpCategories.js";

import { story_bias_checking_categories } from "../util/storyBiasCheckingCategories.js";

const parseResponse = (response) => JSON.parse(response);

const getBiasName = (biasCategory) => {
  if (!biasCategory) {
    throw new Error("Missing biasCategory in request body.");
  }

  return typeof biasCategory === "string"
    ? biasCategory
    : biasCategory.name || "";
};

const categoryText = (biasCategory) => {
  const biasName = getBiasName(biasCategory);

  return JSON.stringify({
    name: biasName,
    Categories: story_bias_checking_categories[biasName]?.Categories || [],
  });
};

const getFollowUpCategoriesForBias = (biasCategory) => {
  const biasName = getBiasName(biasCategory);

  return follow_up_categories.filter((item) => item.biasType === biasName);
};

const buildPromptForBiasClue = (paragraph, biasCategory) => `
You are Alice, an AI clue helper for children ages 10-14.

Story paragraph:
${JSON.stringify(paragraph)}

Hidden bias type and checking categories:
${categoryText(biasCategory)}

First, determine which checking category best matches what is happening in the paragraph.

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

const buildPromptForBiasFollowups = (paragraph, biasCategory, clue) => {
  const matchingCategories = getFollowUpCategoriesForBias(biasCategory);

  return `
You are Alice, an AI helper for children ages 10-14.

Story paragraph:
${JSON.stringify(paragraph)}

Hidden bias type and checking categories:
${categoryText(biasCategory)}

Clue:
${JSON.stringify(clue)}

Below are the follow-up categories for this hidden bias type.

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
- Adapt each question to the exact story paragraph when helpful.
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

const buildPromptForBiasReply = (
  paragraph,
  biasCategory,
  clue,
  followUpQuestion,
) => `
You are Alice, an AI helper for children ages 10-14.

Story paragraph:
${JSON.stringify(paragraph)}

Hidden bias type and checking categories:
${categoryText(biasCategory)}

Clue:
${JSON.stringify(clue)}

Child's follow-up question:
${JSON.stringify(followUpQuestion)}

Answer the child's question using the checking categories above to understand what is happening in the paragraph.

Rules:
- Answer based on the specific paragraph.
- Help the child notice the relevant assumption, unequal description, treatment, default, or cultural detail.
- Do not directly name the hidden bias type.
- Do not directly name the checking category unless needed to answer the child's question.
- Do not give away the answer too quickly.
- Encourage the child to examine the wording or actions in the paragraph.
- Keep the reply under 60 words.
- Use simple, conversational language.

Return only the reply as a string.
`;

const storyAliceRoutes = (app) => {
  app.post("/api/bias-clue", async (req, res) => {
    try {
      const { paragraph, biasCategory } = req.body;

      const clue = await getClue(
        buildPromptForBiasClue(paragraph, biasCategory),
      );

      res.json({
        clue,
      });
    } catch (error) {
      console.error("Error generating bias clue:", error);

      res.status(500).json({
        error: "Failed to get bias clue.",
      });
    }
  });

  app.post("/api/bias-followup-questions", async (req, res) => {
    try {
      const { paragraph, biasCategory, clue } = req.body;

      const matchingCategories = getFollowUpCategoriesForBias(biasCategory);

      const response = await getFollowUpQuestions(
        buildPromptForBiasFollowups(paragraph, biasCategory, clue),
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
        followUpQuestionCategories: followUp.map((item) => item.category),

        followUpQuestions: followUp.map((item) => item.question),
      });
    } catch (error) {
      console.error("Error generating bias follow-up questions:", error);

      res.status(500).json({
        error: "Failed to get bias follow-up questions.",
      });
    }
  });

  app.post("/api/bias-followup-reply", async (req, res) => {
    try {
      const { paragraph, biasCategory, clue, followUpQuestion } = req.body;

      const followUpReply = await getFollowUpReply(
        buildPromptForBiasReply(
          paragraph,
          biasCategory,
          clue,
          followUpQuestion,
        ),
      );

      res.json({
        followUpReply,
      });
    } catch (error) {
      console.error("Error generating bias follow-up reply:", error);

      res.status(500).json({
        error: "Failed to get bias follow-up reply.",
      });
    }
  });
};

export default storyAliceRoutes;
