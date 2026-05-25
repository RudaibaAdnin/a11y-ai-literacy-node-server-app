import { getStoryQuestions } from "../util/openAIServices.js";

const parseResponse = (response) => JSON.parse(response);

const buildPromptForStoryQuestions = (storyTopic, storyTopicType) => {
  const effectiveStoryTopic =
    storyTopicType === "custom"
      ? `Custom story idea: ${storyTopic}`
      : `Category/genre: ${storyTopic}`;

  return `
You are a story question generator for a creative writing activity.

${effectiveStoryTopic}

Write exactly three short, engaging questions that help a student imagine a story for this topic.
Each question should be simple, clear, conversational, playful, and easy for a child ages 10-14 to answer.
For each question, include exactly two answer options that match the story topic.

Return ONLY raw JSON in this exact shape:
[
  {
    "question": "<short question>",
    "suggestions": ["<option 1>", "<option 2>"]
  },
  {
    "question": "<short question>",
    "suggestions": ["<option 1>", "<option 2>"]
  },
  {
    "question": "<short question>",
    "suggestions": ["<option 1>", "<option 2>"]
  }
]
`;
};

const storyQuestionRoutes = (app) => {
  app.post("/api/story-question", async (req, res) => {
    try {
      const { storyTopic, storyTopicType } = req.body;

      const parsed = parseResponse(
        await getStoryQuestions(
          buildPromptForStoryQuestions(storyTopic, storyTopicType),
        ),
      );

      res.json({
        storyQuestions: parsed.map((item) => ({
          storyQuestion: item.question || "",
          storyQuestionSuggestions: item.suggestions || [],
        })),
      });
    } catch (error) {
      console.error("Error getting story questions:", error);
      res.status(500).json({ error: "Failed to get story questions." });
    }
  });
};

export default storyQuestionRoutes;
