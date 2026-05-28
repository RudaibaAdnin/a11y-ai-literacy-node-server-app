//explain-bias-type: takes input from frontend paragraph, bias category. sends to frontnend explanation in 2 line of the bias type, another example
//explain-if-anything-wrong-with-a-paragraph: takes input from frontend paragraph. sends to frontnend explanation in 2 line, another identify if it could be a bias type
//how-this-prompt-helps-rephrase: takes input from frontend user selected rephraseprompt. sends to frontnend explanation in 2 line
//how-this-question-helps-detect:  takes input from frontend followupquestion. sends to frontnend explanation in 2 line, another example

import { getExplanation } from "../util/openAIServices.js";

const parseResponse = (response) => JSON.parse(response);

const buildPromptForExplainBiasType = (paragraph, biasCategory) => `
You explain why a story paragraph matches a bias type.
Use simple language for children ages 10-14. No jargon. Do NOT invent facts.

INPUTS:
- Paragraph: ${JSON.stringify(paragraph)}
- Bias category: ${JSON.stringify(biasCategory)}

Return ONLY raw JSON in this exact shape:
{
  "explanation": "<exactly 2 short sentences explaining why this paragraph shows this bias type>",
  "example": "<one short example of the same bias type, unrelated to this paragraph>"
}
`;

const buildPromptForAnythingWrong = (paragraph) => `
You help a child think about whether a story paragraph may have bias.
Use simple language for children ages 10-14. No jargon. Do NOT invent facts.

INPUT:
- Paragraph: ${JSON.stringify(paragraph)}

Return ONLY raw JSON in this exact shape:
{
  "explanation": "<exactly 2 short sentences explaining what might be wrong or why it seems okay>",
  "possibleBiasType": "<name of possible bias type, or 'No clear bias'>"
}
`;

const buildPromptForPromptHelpsRephrase = (rephrasePrompt) => `
You explain why a rephrase prompt can help improve a biased paragraph.
Use simple language for children ages 10-14. No jargon.

INPUT:
- Rephrase prompt: ${JSON.stringify(rephrasePrompt)}

Return ONLY raw JSON in this exact shape:
{
  "explanation": "<exactly 2 short sentences explaining how this prompt helps rephrase the paragraph>"
}
`;

const buildPromptForQuestionHelpsDetect = (followUpQuestion) => `
You explain why a follow-up question can help detect bias in a story paragraph.
Use simple language for children ages 10-14. No jargon.

INPUT:
- Follow-up question: ${JSON.stringify(followUpQuestion)}

Return ONLY raw JSON in this exact shape:
{
  "explanation": "<exactly 2 short sentences explaining how this question helps detect bias>",
  "example": "<one similar follow-up question>"
}
`;

const storyReviewRoutes = (app) => {
  app.post("/api/story-review-explain-bias-type", async (req, res) => {
    try {
      const { paragraph, biasCategory } = req.body;

      const parsed = parseResponse(
        await getExplanation(
          buildPromptForExplainBiasType(paragraph, biasCategory),
        ),
      );

      res.json({
        explanation: parsed.explanation || "",
        example: parsed.example || "",
      });
    } catch (error) {
      console.error("Error explaining bias type:", error);
      res.status(500).json({ error: "Failed to explain bias type." });
    }
  });

  app.post("/api/story-review-explain-if-anything-wrong", async (req, res) => {
    try {
      const { paragraph } = req.body;

      const parsed = parseResponse(
        await getExplanation(buildPromptForAnythingWrong(paragraph)),
      );

      res.json({
        explanation: parsed.explanation || "",
        possibleBiasType: parsed.possibleBiasType || "",
      });
    } catch (error) {
      console.error("Error checking paragraph:", error);
      res.status(500).json({ error: "Failed to check paragraph." });
    }
  });

  app.post("/api/story-review-how-prompt-helps-rephrase", async (req, res) => {
    try {
      const { rephrasePrompt } = req.body;

      const parsed = parseResponse(
        await getExplanation(buildPromptForPromptHelpsRephrase(rephrasePrompt)),
      );

      res.json({
        explanation: parsed.explanation || "",
      });
    } catch (error) {
      console.error("Error explaining rephrase prompt:", error);
      res.status(500).json({ error: "Failed to explain rephrase prompt." });
    }
  });

  app.post("/api/story-review-how-question-helps-detect", async (req, res) => {
    try {
      const { followUpQuestion } = req.body;

      const parsed = parseResponse(
        await getExplanation(
          buildPromptForQuestionHelpsDetect(followUpQuestion),
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
};

export default storyReviewRoutes;
