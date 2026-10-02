import {
  getFollowUpQuestions,
  getFollowUpReply,
  getClue,
} from "../util/openAIServices.js";
import { follow_up_categories } from "../util/storyFollowUpCategories.js";

const parseResponse = (response) => JSON.parse(response);

const pickRandom = (items, count) =>
  [...items].sort(() => Math.random() - 0.5).slice(0, count);

const categoryText = (biasCategory) => {
  if (!biasCategory) {
    throw new Error("Missing biasCategory in request body.");
  }

  if (typeof biasCategory === "string") {
    return JSON.stringify({ name: biasCategory, meaning: "", examples: [] });
  }

  return JSON.stringify({
    name: biasCategory.name || "",
    meaning: biasCategory.meaning || "",
    examples: biasCategory.examples || [],
  });
};

const genericFollowUpCategoryNames = [
  "Notice Judging Words",
  "Check for Unfair Guesses or Stereotypes",
  "Check for Unequal Descriptions",
  "Check if Someone or Something Is Treated as the Default",
  "Look for Too Much Focus on Identity or Tools",
];

const disabilitySpecificCategoryNames = {
  "Treating Disability as Something Bad": [
    "Check if Disability Is Shown as Something Bad",
  ],
  "Assuming Disabled People as Helpless": [
    "Check if a Disabled Person Is Shown as Helpless",
  ],
  "Limited View on Disability": ["Check for a Limited View of Disability"],
};

const getFollowUpCategoriesForBias = (biasCategory) => {
  const biasName =
    typeof biasCategory === "string" ? biasCategory : biasCategory?.name || "";

  const genericCategories = follow_up_categories.filter((category) =>
    genericFollowUpCategoryNames.includes(category.followupQuestionCategory),
  );

  const specificCategoryNames = disabilitySpecificCategoryNames[biasName] || [];

  const specificCategories = follow_up_categories.filter((category) =>
    specificCategoryNames.includes(category.followupQuestionCategory),
  );

  if (specificCategories.length > 0) {
    return [...specificCategories, ...pickRandom(genericCategories, 2)];
  }

  return pickRandom(genericCategories, 3);
};

const buildPromptForBiasClue = (paragraph, biasCategory) => `
You are Alice, an AI clue helper for children ages 10-14.

Story paragraph:
${JSON.stringify(paragraph)}

Hidden bias category:
${categoryText(biasCategory)}

Write one short clue that helps the child think critically about the paragraph.
Do not directly say the bias category name.
Do not reveal the answer.
Use simple, playful language.
Return only the clue as a string.
`;

const buildPromptForBiasFollowups = (paragraph, biasCategory, clue) => {
  const chosenCategories = getFollowUpCategoriesForBias(biasCategory);

  return `
You are Alice, an AI helper for children ages 10-14.

Story paragraph:
${JSON.stringify(paragraph)}

Hidden bias category:
${categoryText(biasCategory)}

Clue:
${JSON.stringify(clue)}

Generate exactly 3 follow-up questions that help the child investigate the possible bias.
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

const buildPromptForBiasReply = (
  paragraph,
  biasCategory,
  clue,
  followUpQuestion,
) => `
You are Alice, an AI helper for children ages 10-14.

Story paragraph:
${JSON.stringify(paragraph)}

Hidden bias category:
${categoryText(biasCategory)}

Clue:
${JSON.stringify(clue)}

Child's follow-up question:
${JSON.stringify(followUpQuestion)}

Answer the question in a helpful way.
Help the child think about possible bias, but do not directly give away the answer too quickly.
Keep the reply under 60 words.
Use simple, conversational language.
Return only the reply as a string.
`;

const storyAliceRoutes = (app) => {
  app.post("/api/bias-clue", async (req, res) => {
    try {
      const { paragraph, biasCategory } = req.body;
      const clue = await getClue(
        buildPromptForBiasClue(paragraph, biasCategory),
      );
      res.json({ clue });
    } catch (error) {
      console.error("Error generating bias clue:", error);
      res.status(500).json({ error: "Failed to get bias clue." });
    }
  });

  app.post("/api/bias-followup-questions", async (req, res) => {
    try {
      const { paragraph, biasCategory, clue } = req.body;

      const response = await getFollowUpQuestions(
        buildPromptForBiasFollowups(paragraph, biasCategory, clue),
      );

      const parsed = parseResponse(response);

      res.json({
        followUpQuestionCategories: parsed.followUp.map(
          (item) => item.category,
        ),
        followUpQuestions: parsed.followUp.map((item) => item.question),
      });
    } catch (error) {
      console.error("Error generating bias follow-up questions:", error);
      res
        .status(500)
        .json({ error: "Failed to get bias follow-up questions." });
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

      res.json({ followUpReply });
    } catch (error) {
      console.error("Error generating bias follow-up reply:", error);
      res.status(500).json({ error: "Failed to get bias follow-up reply." });
    }
  });
};

export default storyAliceRoutes;
