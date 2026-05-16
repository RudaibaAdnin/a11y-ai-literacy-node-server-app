import { getExplanation } from "../util/openAIServices.js";
import { followUpQuestionCategory } from "./followUpQuestionCategory.js";

const parseResponse = (response) => JSON.parse(response);

const chooseRandomCategories = (count = 2) => {
  const allCategories = Object.values(followUpQuestionCategory).flat();

  return [...allCategories].sort(() => Math.random() - 0.5).slice(0, count);
};

const buildPromptForExplainHallucinationType = (
  hallucinationType,
  hallucinatedLine,
  accurateLine,
) =>
  `
You explain WHY a hallucinated sentence matches a specific lie type.
Use simple language for children ages 10-14. No jargon. Do NOT invent facts.

INPUTS:
- Lie type: "${hallucinationType}"
- Hallucinated line: "${hallucinatedLine}"
- Accurate line: "${accurateLine}"

Return ONLY raw JSON in this exact shape:
{
  "explanation": "<exactly 2 short sentences explaining why this is that lie type>",
  "example": "<one short example of the same lie type, unrelated to this image>",
  "exampleExplanation": "<exactly 2 short sentences explaining why the example fits>"
}
`;

const buildPromptForWhyThisQuestionHelps = (
  followUpQuestionType,
  followUpQuestionCategory,
  followUpQuestion,
) =>
  `
You explain WHY a follow-up question helps detect AI hallucinations.
Use simple language for children ages 10-14. No jargon.

INPUTS:
- Hallucination type: "${followUpQuestionType}"
- Follow-up category: "${followUpQuestionCategory}"
- Follow-up question: "${followUpQuestion}"

Return ONLY raw JSON in this exact shape:
{
  "why": "<1-2 short sentences explaining how this question helps>",
  "example": "<one similar follow-up question>"
}
`;

const buildPromptForHowToImproveTheQuestion = (followUpQuestion) => {
  const chosenCategories = chooseRandomCategories(2);

  return `
You help a blind or low-vision user improve a follow-up question.
Use simple language for children ages 10-14. No jargon. Do NOT invent facts.

INPUT:
- User question: "${followUpQuestion}"

Improve the question using these two question styles:

1) ${chosenCategories[0].category}
Examples:
- ${chosenCategories[0].examples.join("\n- ")}

2) ${chosenCategories[1].category}
Examples:
- ${chosenCategories[1].examples.join("\n- ")}

Return ONLY raw JSON in this exact shape:
{
  "improvedQuestionOption1": "<improved question based on question style 1>",
  "improvedQuestionOption2": "<improved question based on question style 2>",
  "tips": ["<short tip 1>", "<short tip 2>"]
}
`;
};

const buildPromptForExplainReplyType = (
  replyType,
  replyText,
  imageDescription,
) =>
  `
You explain why Sara's reply has a problem.
Use simple language for children ages 10-14. No jargon. Do NOT invent facts.

INPUTS:
- Reply type: "${replyType}"
- Sara's reply: "${replyText}"
- Image description: ${JSON.stringify(imageDescription)}

Reply type meanings:
- "irrelevance" means "off-topic answer"
- "misfocus" means "missed the main point"

Return ONLY raw JSON in this exact shape:
{
  "explanation": "<1-2 short sentences explaining what is wrong with the reply and how it fits the reply type. in the reply type use off-topic answer or Missed point of the main idea (do not use the term misfocus or irrelevance)>",
  "tip": "<one short tip for checking replies like this>"
}
`;

const reviewRoutes = (app) => {
  app.post("/api/review-explain-hallucination-type", async (req, res) => {
    try {
      const { hallucinationType, hallucinatedLine, accurateLine } = req.body;

      const response = await getExplanation(
        buildPromptForExplainHallucinationType(
          hallucinationType,
          hallucinatedLine,
          accurateLine,
        ),
      );

      res.json(parseResponse(response));
    } catch (error) {
      console.error("Error explaining hallucination type:", error);
      res.status(500).json({ error: "Failed to explain hallucination type." });
    }
  });

  app.post("/api/review-why-question-helps", async (req, res) => {
    try {
      const {
        followUpQuestionType,
        followUpQuestionCategory,
        followUpQuestion,
      } = req.body;

      const response = await getExplanation(
        buildPromptForWhyThisQuestionHelps(
          followUpQuestionType,
          followUpQuestionCategory,
          followUpQuestion,
        ),
      );

      res.json(parseResponse(response));
    } catch (error) {
      console.error("Error explaining follow-up question:", error);
      res.status(500).json({ error: "Failed to explain follow-up question." });
    }
  });

  app.post("/api/review-improve-followup-question", async (req, res) => {
    try {
      const { followUpQuestion } = req.body;

      const response = await getExplanation(
        buildPromptForHowToImproveTheQuestion(followUpQuestion),
      );

      res.json(parseResponse(response));
    } catch (error) {
      console.error("Error improving follow-up question:", error);
      res.status(500).json({ error: "Failed to improve follow-up question." });
    }
  });

  app.post("/api/review-explain-reply-type", async (req, res) => {
    try {
      const { replyType, replyText, imageDescription } = req.body;

      const response = await getExplanation(
        buildPromptForExplainReplyType(replyType, replyText, imageDescription),
      );

      res.json(parseResponse(response));
    } catch (error) {
      console.error("Error explaining reply type:", error);
      res.status(500).json({ error: "Failed to explain reply type." });
    }
  });
};

export default reviewRoutes;
