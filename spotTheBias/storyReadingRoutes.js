import { getStoryReading } from "../util/openAIServices.js";

const parseResponse = (response) => JSON.parse(response);

const pickRandom = (items, count) =>
  [...items].sort(() => Math.random() - 0.5).slice(0, count);

const normalizePlan = (plan = [], biasCategories, fallbackPlan) => {
  const normalized = plan
    .map((item) => {
      const categoryName =
        item.biasCategoryName || item.biasCategory?.name || item.biasCategory;

      const biasCategory = biasCategories.find(
        (category) => category.name === categoryName,
      );

      if (!biasCategory) return null;

      return {
        paragraphIndex: Number(item.paragraphIndex),
        biasCategory,
      };
    })
    .filter(
      (item) =>
        item &&
        Number.isInteger(item.paragraphIndex) &&
        item.paragraphIndex >= 0 &&
        item.paragraphIndex < 6,
    );

  return normalized.length === biasCategories.length
    ? normalized
    : fallbackPlan;
};

const buildPromptForStoryReading = (
  storyTopic,
  storyTopicType,
  storyQuestionsAndAnswers,
  biasCategories,
  biasedParagraphPlan,
) => `
You are Mia, an AI story-writing agent for children ages 10-14.

Story topic type: ${JSON.stringify(storyTopicType)}
Story topic: ${JSON.stringify(storyTopic)}
Story planning answers: ${JSON.stringify(storyQuestionsAndAnswers)}

Bias categories to include:
${JSON.stringify(biasCategories)}

Initial biased paragraph plan:
${JSON.stringify(
  biasedParagraphPlan.map((item) => ({
    paragraphIndex: item.paragraphIndex,
    biasCategoryName: item.biasCategory.name,
  })),
)}

Write a story with exactly 6 paragraphs.
Include at least two human characters. One should be disabled.
Each paragraph should have about 3 short sentences.
The full story should be playful, clear, and easy for children ages 10-14 to read.

Rules:
- At least include one human character.
- Use the meaning and examples to understand each bias category.
- Each bias category should appear in one paragraph only.
- Make the bias noticeable but not too obvious.
- Do not use slurs, hateful language, or the words "bias", "biased", or the bias category names.
- Paragraph indices start at 0.
- Before returning, recheck whether each planned paragraph really contains its assigned bias.
- If needed, shuffle the paragraphIndex values in the final biasedParagraphPlan so the plan matches the story exactly.

Return ONLY raw JSON in this exact shape:
{
  "storyParagraphs": [
    "<paragraph 1>",
    "<paragraph 2>",
    "<paragraph 3>",
    "<paragraph 4>",
    "<paragraph 5>",
    "<paragraph 6>"
  ],
  "biasedParagraphPlan": [
    {
      "paragraphIndex": 0,
      "biasCategoryName": "<category name>"
    }
  ]
}
`;

const storyReadingRoutes = (app) => {
  app.post("/api/story-reading", async (req, res) => {
    try {
      const {
        storyTopic,
        storyTopicType,
        storyQuestionsAndAnswers,
        biasCategories,
      } = req.body;

      if (!Array.isArray(biasCategories) || biasCategories.length === 0) {
        return res.status(400).json({ error: "Missing bias categories." });
      }

      const paragraphIndices = pickRandom(
        [0, 1, 2, 3, 4, 5],
        biasCategories.length,
      );

      const initialPlan = biasCategories.map((biasCategory, index) => ({
        paragraphIndex: paragraphIndices[index],
        biasCategory,
      }));

      const parsed = parseResponse(
        await getStoryReading(
          buildPromptForStoryReading(
            storyTopic,
            storyTopicType,
            storyQuestionsAndAnswers,
            biasCategories,
            initialPlan,
          ),
        ),
      );

      const biasedParagraphPlan = normalizePlan(
        parsed.biasedParagraphPlan,
        biasCategories,
        initialPlan,
      );

      res.json({
        storyParagraphs: parsed.storyParagraphs || [],
        biasedParagraphPlan,
      });
    } catch (error) {
      console.error("Error getting story reading:", error);
      res.status(500).json({ error: "Failed to get story reading." });
    }
  });
};

export default storyReadingRoutes;
