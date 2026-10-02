//explain-bias-type: takes input from frontend paragraph, bias category. sends to frontnend explanation in 2 line of the bias type, another example
//explain-if-anything-wrong-with-a-paragraph: takes input from frontend paragraph. sends to frontnend explanation in 2 line, another identify if it could be a bias type
//how-this-prompt-helps-rephrase: takes input from frontend user selected rephraseprompt. sends to frontnend explanation in 2 line
//how-this-question-helps-detect:  takes input from frontend followupquestion. sends to frontnend explanation in 2 line, another example

import { getExplanation } from "../util/openAIServices.js";

const parseResponse = (response) => JSON.parse(response);

const buildPromptForExplainBiasType = (paragraph, biasCategory) => `
You explain why a paragraph matches a specific bias type.

Use simple language for children ages 10-14.
Use only evidence that is actually present in the paragraph.
Do not invent intentions, feelings, or facts.

Paragraph:
${JSON.stringify(paragraph)}

Bias category:
${JSON.stringify(biasCategory)}

Explain how something in the paragraph connects to the meaning of the
provided bias category.

Return ONLY raw JSON in this exact shape:
{
  "explanation": "<exactly 2 short sentences explaining why this paragraph shows this bias type>",
  "example": "<one short NEW example of the same bias type that is unrelated to this paragraph>"
}
`;

const buildPromptForAnythingWrong = (paragraph) => `
You help a child think about whether a paragraph may contain an unfair
assumption or unequal description.

Use simple language for children ages 10-14.
Do not invent information that is not in the paragraph.

Paragraph:
${JSON.stringify(paragraph)}

Possible bias types are ONLY:
- Treating Disability as Something Bad
- Assuming Disabled People as Helpless
- Inspiration Bias
- Limited View on Disability
- Gender Bias
- Age Bias
- Cultural Bias
- Racial Bias

If none clearly fits, return "No clear bias".

Return ONLY raw JSON in this exact shape:
{
  "explanation": "<exactly 2 short sentences explaining what might be unfair or why no clear bias is present>",
  "possibleBiasType": "<one bias type from the list above, or 'No clear bias'>"
}
`;

const buildPromptForQuestionHelpsDetect = (followUpQuestion) => `
You explain how a follow-up question can help someone notice unfair
assumptions, stereotypes, unequal descriptions, or missing perspectives
in a paragraph.

Use simple language for children ages 10-14.
Do not use jargon.

Follow-up question:
${JSON.stringify(followUpQuestion)}

Return ONLY raw JSON in this exact shape:
{
  "explanation": "<exactly 2 short sentences explaining what this question helps the reader check>",
  "example": "<one different follow-up question that checks for a similar problem>"
}
`;

const buildPromptForPromptHelpsRephrase = (rephrasePrompt) => `
You explain why a rephrase prompt can help an AI make a biased paragraph fairer.

Use simple language for children ages 10-14.
Do not use jargon.

Rephrase prompt:
${JSON.stringify(rephrasePrompt)}

Return ONLY raw JSON in this exact shape:
{
  "explanation": "<exactly 2 short sentences explaining how this prompt helps the AI notice and change unfair assumptions, stereotypes, or unequal descriptions>"
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
};

export default storyReviewRoutes;
