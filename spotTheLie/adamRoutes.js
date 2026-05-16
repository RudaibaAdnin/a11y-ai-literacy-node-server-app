import { getExplanation } from "../util/openAIServices.js";

const parseResponse = (response) => JSON.parse(response);

const buildPromptForImageDescription = (imageDescription, imageHallucination) =>
  `
Given an array of AI description sentences and a hallucination sentence in that array,
rewrite the entire description in your own words.

Rules:
- Keep EXACTLY the same number of sentences as the original description.
- Include the corrected version of the hallucination sentence.
- Use simple language for children ages 10-14.
- Return ONLY raw JSON.

Input:
Description: ${JSON.stringify(imageDescription)}
Hallucination: ${JSON.stringify(imageHallucination)}

Return this exact JSON shape:
{
  "newDescription": ["<rewritten sentence 1>", "<rewritten sentence 2>"],
  "updatedHallucination": "<rewritten corrected hallucination sentence>"
}
`;

const buildPromptForSummaryDifferences = (saraText, adamText) =>
  `
You are comparing two image descriptions written by Adam and Sara.

Instructions:
- Summarize only the differences.
- For each difference, start with "Adam..." and contrast with "Sara..."
- Mention changes in details, spatial descriptions, adjectives, tone, or atmosphere.
- Do not restate the full descriptions.
- Do not evaluate quality.
- Return AT MOST 5 bullet points.
- Keep each bullet one concise sentence.
- Use simple language for children ages 10-14.

Input:
Adam: ${JSON.stringify(adamText)}
Sara: ${JSON.stringify(saraText)}

Return only the bullet list as plain text.
`;

const adamRoutes = (app) => {
  app.post("/api/adam-description", async (req, res) => {
    try {
      const { imageDescription, imageHallucination } = req.body;

      const response = await getExplanation(
        buildPromptForImageDescription(imageDescription, imageHallucination),
      );

      res.json(parseResponse(response));
    } catch (error) {
      console.error("Error generating Adam description:", error);
      res.status(500).json({ error: "Failed to generate Adam description." });
    }
  });

  app.post("/api/adam-summary-differences", async (req, res) => {
    try {
      const { saraText, adamText } = req.body;

      const response = await getExplanation(
        buildPromptForSummaryDifferences(saraText, adamText),
      );

      res.json({ summaryDifferences: response });
    } catch (error) {
      console.error("Error generating summary differences:", error);
      res
        .status(500)
        .json({ error: "Failed to generate summary differences." });
    }
  });
};

export default adamRoutes;

// import {
//   getExplanation
// } from "../util/openAIServices.js";

//generate image descriptions

//generateImageDescription(imageDesription, imageHallucination)
// const userMessage =
//   "Given an array of AI description of an image and a hallucination sentence in that array. " +
//   "Rewrite the entire description in your own words in EXACTLY the sentence count of the description and return an array of the updated sentences. " +
//   "In your response array, also include the corrected hallucination sentence. The response should " +
//   "be a json with fields:\n" +
//   "- newDescription: an array containing the rewritten description\n" +
//   "- updatedHallucination: the rewritten hallucination line\n" +
//   `Description: ${description}, and hallucination: ${hallucination}\n` +
//   "Respond only with raw JSON. Do not include any code block markers like json or ```.";

//generate summary of differences
//generate summaryDifferences(imageDesription, AdamText)
//       const prompt = `
// You are comparing two image descriptions written by Adam and Sara.
// Your task is to summarize the differences between their descriptions in a clear, sentence-by-sentence format.

// Instructions:
// - For each difference, start with “Adam…” and then contrast with “Sara…”.
// - Focus on what Adam includes, emphasizes, or phrases differently from Sara.
// - Mention changes in details, spatial descriptions, adjectives, emotional tone, or atmosphere.
// - Keep each difference concise (one line or sentence).
// - Do not restate the entire descriptions.
// - Do not evaluate quality—only describe differences objectively.
// - If Adam and Sara describe the same thing differently (e.g., “right” vs. “left,” “warm” vs. “friendly”), highlight that specific wording difference.

// Example format:
// - Adam says the rack is on the right side of the image; Sara says it is on the left side.
// - Adam refers to it simply as a light blue Adidas shirt; Sara states the shirt has a black three-stripes Adidas logo.
// - Adam describes them as “cheerful and absorbed in conversation”; Sara notes the women are “engaged and cheerful.”

// Input:
// Adam: ${adamText}
// Sara: ${saraText}

// Output:
// - A bullet-style or line-separated list summarizing each difference.
// - Return AT MOST 5 bullet points.
// - Keep each bullet to one concise sentence.
