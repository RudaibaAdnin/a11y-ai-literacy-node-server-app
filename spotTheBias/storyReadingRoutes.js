import { getStoryReading } from "../util/openAIServices.js";

const parseResponse = (response) => JSON.parse(response);

const pickRandom = (items, count) =>
  [...items].sort(() => Math.random() - 0.5).slice(0, count);

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
${JSON.stringify(
  biasCategories.map((biasCategory) => ({
    name: biasCategory.name,
    meaning: biasCategory.meaning,
    examples: biasCategory.examples,
  })),
)}

Biased paragraph plan:
${JSON.stringify(biasedParagraphPlan)}

Write a story with exactly 6 paragraphs.
Each paragraph should have about 3 short sentences.
The full story should be playful, clear, and easy for children ages 10-14 to read.

At least include one human character.
Use the meaning and examples to understand each bias category.
Include each bias category only in its assigned paragraphIndex.
Each bias should appear in one paragraph only.
Make the bias noticeable but not too obvious.
Do not use slurs, hateful language, or the words "bias", "biased", or the bias category names.
Paragraph indices start at 0.

Return ONLY raw JSON in this exact shape:
{
  "storyParagraphs": ["<paragraph 1>", "<paragraph 2>", "<paragraph 3>", "<paragraph 4>", "<paragraph 5>", "<paragraph 6>"]
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

      const biasedParagraphIndices = pickRandom(
        [0, 1, 2, 3, 4, 5],
        biasCategories.length,
      );

      const biasedParagraphPlan = biasCategories.map((biasCategory, index) => ({
        paragraphIndex: biasedParagraphIndices[index],
        biasCategory,
      }));

      const parsed = parseResponse(
        await getStoryReading(
          buildPromptForStoryReading(
            storyTopic,
            storyTopicType,
            storyQuestionsAndAnswers,
            biasCategories,
            biasedParagraphPlan,
          ),
        ),
      );

      res.json({
        storyParagraphs: parsed.storyParagraphs || [],
        biasedParagraphIndices,
        biasedParagraphPlan,
      });
    } catch (error) {
      console.error("Error getting story reading:", error);
      res.status(500).json({ error: "Failed to get story reading." });
    }
  });
};

export default storyReadingRoutes;
