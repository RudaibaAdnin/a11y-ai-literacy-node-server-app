import { getExplanation } from "../util/openAIServices.js";
import { followUpQuestionCategory } from "./followUpQuestionCategory.js";

const parseResponse = (response) => JSON.parse(response);

const chooseRandomCategories = (count = 2) =>
  Object.values(followUpQuestionCategory)
    .flat()
    .sort(() => Math.random() - 0.5)
    .slice(0, count);

const buildPromptForExplainHallucinationType = (
  hallucinationType,
  hallucinatedLine,
  accurateLine,
) => `
You explain WHY a hallucinated sentence matches a specific lie type.
Use simple language for children ages 10-14. No jargon. Do NOT invent facts.

INPUTS:
- Lie type: ${JSON.stringify(hallucinationType)}
- Hallucinated line: ${JSON.stringify(hallucinatedLine)}
- Accurate line: ${JSON.stringify(accurateLine)}

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
) => `
You explain WHY a follow-up question helps detect AI hallucinations.
Use simple language for children ages 10-14. No jargon.

INPUTS:
- Hallucination type: ${JSON.stringify(followUpQuestionType)}
- Follow-up category: ${JSON.stringify(followUpQuestionCategory)}
- Follow-up question: ${JSON.stringify(followUpQuestion)}

Return ONLY raw JSON in this exact shape:
{
  "explanation": "<1-2 short sentences explaining how this question helps based on the Follow-up category and Hallucination type>",
  "example": "<one similar follow-up question>"
}
`;

const buildPromptForHowToImproveTheQuestion = (followUpQuestion) => {
  const categories = chooseRandomCategories(2);

  return `
You help a blind or low-vision user improve a follow-up question.
Use simple language for children ages 10-14. No jargon. Do NOT invent facts.

INPUT:
- User question: ${JSON.stringify(followUpQuestion)}

Improve the question using these two question categories:

1) ${categories[0].category}
Examples:
- ${categories[0].examples.join("\n- ")}

2) ${categories[1].category}
Examples:
- ${categories[1].examples.join("\n- ")}

Return ONLY raw JSON in this exact shape:
{
  "improvedQuestionOption1": "<improved question based on question style 1>",
  "improvedQuestionOption2": "<improved question based on question style 2>",
  "tips": ["<short tip 1 mentioning what question categories should be asked>", "<short tip 2 what question categories should be asked>"]
}
`;
};

const buildPromptForExplainReplyType = (
  replyType,
  replyText,
  imageDescription,
) => `
You explain why Sara's reply has a problem.
Use simple language for children ages 10-14. No jargon.

INPUTS:
- Reply type: ${JSON.stringify(replyType)}
- Sara's reply: ${JSON.stringify(replyText)}
- Image description: ${JSON.stringify(imageDescription)}

Reply type meanings:
- if reply type "irrelevance" mention reply type was "off-topic answer"
- if reply type "misfocus" mention reply type was "missed the main point"

Return ONLY raw JSON in this exact shape:
{
  "explanation": "<1-2 short sentences explaining the reply type and why is that. What is wrong with the reply>",
  "tip": "<one short tip for checking replies like this>"
}
`;

const reviewRoutes = (app) => {
  app.post("/api/review-explain-hallucination-type", async (req, res) => {
    try {
      const { hallucinationType, hallucinatedLine, accurateLine } = req.body;

      const parsed = parseResponse(
        await getExplanation(
          buildPromptForExplainHallucinationType(
            hallucinationType,
            hallucinatedLine,
            accurateLine,
          ),
        ),
      );

      res.json({
        explanation: parsed.explanation || "",
        example: parsed.example || "",
        exampleExplanation: parsed.exampleExplanation || "",
      });
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

      const parsed = parseResponse(
        await getExplanation(
          buildPromptForWhyThisQuestionHelps(
            followUpQuestionType,
            followUpQuestionCategory,
            followUpQuestion,
          ),
        ),
      );

      res.json({
        explanation: parsed.explanation || "",
        example: parsed.example || "",
      });
    } catch (error) {
      console.error("Error explaining follow-up question:", error);
      res.status(500).json({ error: "Failed to explain follow-up question." });
    }
  });

  app.post("/api/review-improve-followup-question", async (req, res) => {
    try {
      const { followUpQuestion } = req.body;

      const parsed = parseResponse(
        await getExplanation(
          buildPromptForHowToImproveTheQuestion(followUpQuestion),
        ),
      );

      res.json({
        improvedQuestions: [
          parsed.improvedQuestionOption1 || "",
          parsed.improvedQuestionOption2 || "",
        ].filter(Boolean),
        tips: parsed.tips || [],
      });
    } catch (error) {
      console.error("Error improving follow-up question:", error);
      res.status(500).json({ error: "Failed to improve follow-up question." });
    }
  });

  app.post("/api/review-explain-reply-type", async (req, res) => {
    try {
      const { replyType, replyText, imageDescription } = req.body;

      const parsed = parseResponse(
        await getExplanation(
          buildPromptForExplainReplyType(
            replyType,
            replyText,
            imageDescription,
          ),
        ),
      );

      res.json({
        explanation: parsed.explanation || "",
        tip: parsed.tip || "",
      });
    } catch (error) {
      console.error("Error explaining reply type:", error);
      res.status(500).json({ error: "Failed to explain reply type." });
    }
  });
};

export default reviewRoutes;
