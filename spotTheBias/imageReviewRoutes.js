import { getExplanation } from "../util/openAIServices.js";

const parseResponse = (response) => JSON.parse(response);

const buildPromptForExplainImageBiasType = (
  imageDescriptionParagraph,
  biasCategoryImage,
) => `
You explain why an image description paragraph matches an image bias type.
Use simple language for children ages 10-14. No jargon. Do NOT invent facts.

INPUTS:
- Image description paragraph: ${JSON.stringify(imageDescriptionParagraph)}
- Image bias category: ${JSON.stringify(biasCategoryImage)}

Return ONLY raw JSON in this exact shape:
{
  "explanation": "<exactly 2 short sentences explaining why this image description paragraph shows this bias type>",
  "example": "<one short example of the same image bias type, unrelated to this paragraph>"
}
`;

const buildPromptForAnythingWrongImage = (imageDescriptionParagraph) => `
You help a child think about whether an image description paragraph may have bias.
Use simple language for children ages 10-14. No jargon. Do NOT invent facts.

INPUT:
- Image description paragraph: ${JSON.stringify(imageDescriptionParagraph)}

Return ONLY raw JSON in this exact shape:
{
  "explanation": "<exactly 2 short sentences explaining what might be wrong or why it seems okay>",
  "possibleBiasType": "<name of possible image bias type, or 'No clear bias'>"
}
`;

const buildPromptForImageQuestionHelpsDetect = (followUpQuestionImage) => `
You explain why a follow-up question can help detect bias in an image description.
Use simple language for children ages 10-14. No jargon.

INPUT:
- Follow-up question: ${JSON.stringify(followUpQuestionImage)}

Return ONLY raw JSON in this exact shape:
{
  "explanation": "<exactly 2 short sentences explaining how this question helps detect image bias>",
  "example": "<one similar follow-up question>"
}
`;

const buildPromptForImagePromptHelpsRephrase = (rephrasedPromptImage) => `
You explain why a prompt can help make an AI-generated image fairer.
Use simple language for children ages 10-14. No jargon.

INPUT:
- Rephrased image prompt: ${JSON.stringify(rephrasedPromptImage)}

Return ONLY raw JSON in this exact shape:
{
  "explanation": "<exactly 3 short sentences explaining how this prompt helps make the image fairer>"
}
`;

const imageReviewRoutes = (app) => {
  app.post("/api/image-review-explain-bias-type", async (req, res) => {
    try {
      const { imageDescriptionParagraph, biasCategoryImage } = req.body;

      const parsed = parseResponse(
        await getExplanation(
          buildPromptForExplainImageBiasType(
            imageDescriptionParagraph,
            biasCategoryImage,
          ),
        ),
      );

      res.json({
        explanation: parsed.explanation || "",
        example: parsed.example || "",
      });
    } catch (error) {
      console.error("Error explaining image bias type:", error);
      res.status(500).json({ error: "Failed to explain image bias type." });
    }
  });

  app.post("/api/image-review-explain-if-anything-wrong", async (req, res) => {
    try {
      const { imageDescriptionParagraph } = req.body;

      const parsed = parseResponse(
        await getExplanation(
          buildPromptForAnythingWrongImage(imageDescriptionParagraph),
        ),
      );

      res.json({
        explanation: parsed.explanation || "",
        possibleBiasType: parsed.possibleBiasType || "",
      });
    } catch (error) {
      console.error("Error checking image description paragraph:", error);
      res
        .status(500)
        .json({ error: "Failed to check image description paragraph." });
    }
  });

  app.post("/api/image-review-how-question-helps-detect", async (req, res) => {
    try {
      const { followUpQuestionImage } = req.body;

      const parsed = parseResponse(
        await getExplanation(
          buildPromptForImageQuestionHelpsDetect(followUpQuestionImage),
        ),
      );

      res.json({
        explanation: parsed.explanation || "",
        example: parsed.example || "",
      });
    } catch (error) {
      console.error("Error explaining image follow-up question:", error);
      res
        .status(500)
        .json({ error: "Failed to explain image follow-up question." });
    }
  });

  app.post("/api/image-review-how-prompt-helps-rephrase", async (req, res) => {
    try {
      const { rephrasedPromptImage } = req.body;

      const parsed = parseResponse(
        await getExplanation(
          buildPromptForImagePromptHelpsRephrase(rephrasedPromptImage),
        ),
      );

      res.json({
        explanation: parsed.explanation || "",
      });
    } catch (error) {
      console.error("Error explaining image rephrase prompt:", error);
      res
        .status(500)
        .json({ error: "Failed to explain image rephrase prompt." });
    }
  });
};

export default imageReviewRoutes;
