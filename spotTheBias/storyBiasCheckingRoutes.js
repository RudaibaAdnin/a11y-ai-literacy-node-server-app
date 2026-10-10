import {
  getBiasCheckOptions,
  getBiasCheckEvaluation,
} from "../util/openAIServices.js";

const parseResponse = (response) => JSON.parse(response);

const biasCheckingCategories = [
  "The Paragraph has Assumptions or Stereotypes",
  "The Paragraph has Unequal Descriptions or Treatment",
  "The Paragraph Treats Something as the Default",
];

const getBiasName = (biasCategory) => {
  if (!biasCategory) return "";

  return typeof biasCategory === "string"
    ? biasCategory
    : biasCategory.name || "";
};

const buildPromptForBiasCheckOptions = (paragraph) => `
You are creating reflection choices for a bias-checking activity for children ages 10-14.

Selected story paragraph:
${JSON.stringify(paragraph)}

The child is deciding whether this paragraph may contain bias.

Use ONLY these three checking categories:

1. The Paragraph has Assumptions or Stereotypes
2. The Paragraph has Unequal Descriptions or Treatment
3. The Paragraph Treats Something as the Default

Generate exactly ONE short statement for EACH category.

The statements must be based on the specific selected paragraph.

Important:
- The paragraph may be biased or may not be biased.
- Do not assume the paragraph definitely contains bias.
- Each statement should describe something the child could check in this paragraph.
- A statement may point out that the paragraph seems to make an assumption, describe people unequally, or treat something as default.
- If that type of issue is not strongly present, phrase the statement as something the child could still examine based on specific details from the paragraph.
- Use simple child-friendly language for ages 10-14.
- Keep each statement short and simple.
- Do not use complicated sentence structures.
- Return exactly 3 items.
- The category names must exactly match the category names provided above.

Example style:

{
  "category": "The Paragraph has Assumptions or Stereotypes",
  "statement": "The paragraph may be assuming what someone is good at because of who they are."
}

Return ONLY valid JSON in this exact shape:

{
  "options": [
    {
      "category": "The Paragraph has Assumptions or Stereotypes",
      "statement": "<statement based on this paragraph>"
    },
    {
      "category": "The Paragraph has Unequal Descriptions or Treatment",
      "statement": "<statement based on this paragraph>"
    },
    {
      "category": "The Paragraph Treats Something as the Default",
      "statement": "<statement based on this paragraph>"
    }
  ]
}
`;

const buildPromptForBiasCheckEvaluation = ({ paragraph, biasCategory }) => `
You are explaining feedback in a bias-checking activity for children ages 10-14.

Selected story paragraph:
${JSON.stringify(paragraph)}

Planned bias category:
${JSON.stringify(getBiasName(biasCategory))}

Important:
- If a planned bias category is provided, this paragraph is a planned biased paragraph.
- If the planned bias category is empty, this paragraph is NOT one of the planned biased paragraphs.
- Your job is NOT to grade what the child selected or typed.
- Your job is only to explain the paragraph itself.

Possible ideas to think about include:
- assumptions or stereotypes
- unequal descriptions or treatment
- treating something as the normal or default way

If a planned bias category IS provided:
- Explain what specific part of the paragraph shows that bias.
- Use the planned bias category to guide the explanation.
- Use actual details from the paragraph.
- Explain what assumption, stereotype, unequal treatment, or default is happening.

If NO planned bias category is provided:
- Explain why the paragraph does not show bias.
- Do not invent a bias.
- Explain why the paragraph does not clearly make an unfair assumption, treat people unequally, or treat one group or way as the normal/default one.

Rules:
- Judge based only on what actually appears in the paragraph.
- mention the child's checkbox choices.
- mention the child's typed answer.
- Use simple language for ages 10-14.
- Keep the explanation to 2-3 short sentences.

Return ONLY valid JSON in this exact shape:

{
  "explanation": "<2-3 short child-friendly sentences based on this paragraph>"
}
`;

const storyBiasCheckingRoutes = (app) => {
  app.post("/api/bias-check-options", async (req, res) => {
    try {
      const { paragraph } = req.body;

      if (!paragraph) {
        return res.status(400).json({
          error: "Missing paragraph.",
        });
      }

      const response = await getBiasCheckOptions(
        buildPromptForBiasCheckOptions(paragraph),
      );

      const parsed = parseResponse(response);

      const generatedOptions = Array.isArray(parsed.options)
        ? parsed.options
        : [];

      const options = biasCheckingCategories.map((category) => {
        const generated = generatedOptions.find(
          (item) => item.category === category,
        );

        return {
          category,
          statement:
            generated?.statement ||
            "Check whether something in this paragraph fits this category.",
        };
      });

      return res.json({
        biasCheckCategories: options.map((item) => item.category),

        biasCheckStatements: options.map((item) => item.statement),
      });
    } catch (error) {
      console.error("Error generating bias checking options:", error);

      return res.status(500).json({
        error: "Failed to generate bias checking options.",
      });
    }
  });

  app.post("/api/check-bias-answer", async (req, res) => {
    try {
      const {
        paragraph,
        biasCategory,
        selectedCategories = [],
        selectedStatements = [],
        typedAnswer = "",
      } = req.body;

      if (!paragraph) {
        return res.status(400).json({
          error: "Missing paragraph.",
        });
      }

      /*
       * Reflection responses only.
       * They do not determine whether the paragraph
       * is actually one of the planned biased paragraphs.
       */
      console.log("Bias reflection response:", {
        selectedCategories,
        selectedStatements,
        typedAnswer,
      });

      /*
       * Always call OpenAI for a paragraph-specific
       * explanation.
       */
      const response = await getBiasCheckEvaluation(
        buildPromptForBiasCheckEvaluation({
          paragraph,
          biasCategory: biasCategory || null,
        }),
      );

      const parsed = parseResponse(response);

      /*
       * Correct is determined only by whether a planned
       * biasCategory exists.
       *
       * OpenAI provides only the explanation.
       */
      return res.json({
        correct: Boolean(biasCategory),
        explanation: parsed.explanation || "",
      });
    } catch (error) {
      console.error("Error checking bias answer:", error);

      return res.status(500).json({
        error: "Failed to check bias answer.",
      });
    }
  });
};

export default storyBiasCheckingRoutes;
