import {
  getBiasCheckOptions,
  getBiasCheckEvaluation,
} from "../util/openAIServices.js";

const parseResponse = (response) => JSON.parse(response);

const imageBiasCheckingCategories = [
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

const buildPromptForImageBiasCheckOptions = (paragraph) => `
You are creating reflection choices for an image-bias-checking activity for children ages 10-14.

Selected image description paragraph:
${JSON.stringify(paragraph)}

The child is deciding whether this image description paragraph may contain bias.

Use ONLY these three checking categories:

1. The Paragraph has Assumptions or Stereotypes
2. The Paragraph has Unequal Descriptions or Treatment
3. The Paragraph Treats Something as the Default

Generate exactly ONE short statement for EACH category.

The statements must be based on this specific image description paragraph.

Important:
- The paragraph may be biased or may not be biased.
- Do not assume the paragraph definitely contains bias.
- Do not tell the child whether the paragraph is biased.
- Do not reveal any hidden answer.
- Each statement should describe something the child could check in this paragraph.
- A statement may point out that the paragraph seems to make an assumption about a person, describe people differently, or treat something as normal or expected.
- If that type of issue is not strongly present, phrase the statement as something the child could still examine.
- Use simple child-friendly language for ages 10-14.
- Write statements, NOT questions.
- Keep each statement short and simple.
- Do not use complicated sentence structures.
- Base each statement on specific details from the paragraph.
- Do not make all three statements sound definitely true.
- Return exactly 3 items.
- The category names must exactly match the category names provided above.

Example style:

{
  "category": "The Paragraph has Assumptions or Stereotypes",
  "statement": "The description may be assuming how the person feels because of something about them."
}

Return ONLY valid JSON in this exact shape:

{
  "options": [
    {
      "category": "The Paragraph has Assumptions or Stereotypes",
      "statement": "<statement based on this image description paragraph>"
    },
    {
      "category": "The Paragraph has Unequal Descriptions or Treatment",
      "statement": "<statement based on this image description paragraph>"
    },
    {
      "category": "The Paragraph Treats Something as the Default",
      "statement": "<statement based on this image description paragraph>"
    }
  ]
}
`;

const buildPromptForImageBiasCheckEvaluation = ({
  paragraph,
  biasCategory,
  selectedCategories,
  selectedStatements,
  typedAnswer,
}) => `
You are explaining feedback in an image-bias-checking activity for children ages 10-14.

Selected image description paragraph:
${JSON.stringify(paragraph)}

Planned image bias category:
${JSON.stringify(getBiasName(biasCategory))}

The child selected these reflection categories:
${JSON.stringify(selectedCategories)}

The child selected these reflection statements:
${JSON.stringify(selectedStatements)}

The child's final typed or edited answer:
${JSON.stringify(typedAnswer)}

Important:
- If a planned image bias category is provided, this is a planned biased image description paragraph.
- If the planned image bias category is empty, this is NOT one of the planned biased image description paragraphs.
- The child's checkbox choices and typed answer do NOT determine whether the paragraph is actually biased.
- Your job is to explain the paragraph itself.
- You may use the child's reflection response to understand what they noticed, but do not grade their reflection response.

Possible ideas to think about include:
- assumptions or stereotypes
- unequal descriptions or treatment
- treating something as the normal or default way

If a planned image bias category IS provided:
- Explain what specific part of the image description shows that bias.
- Use the planned bias category to guide the explanation.
- Use actual details from the paragraph.
- Explain the assumption, stereotype, unequal description, treatment, or default that appears.
- Make clear why that description could be unfair or biased.

If NO planned image bias category is provided:
- Explain why this image description paragraph does not show the planned image bias.
- Do not invent a bias.
- Explain why the description does not clearly make an unfair assumption, describe people unequally, or treat one group or way as the normal/default one.

Rules:
- Judge based only on what actually appears in the image description paragraph.
- Do not invent visual details that are not stated in the paragraph.
- Do not invent intentions, feelings, identities, or facts.
- Do not say the child was correct or incorrect.
- Use simple language for ages 10-14.
- Keep the explanation to 2-3 short sentences.

Return ONLY valid JSON in this exact shape:

{
  "explanation": "<2-3 short child-friendly sentences based on this image description paragraph>"
}
`;

const imageBiasCheckingRoutes = (app) => {
  /*
   * STEP 1:
   * Generate three reflection choices.
   *
   * The hidden image bias is NOT sent here.
   */
  app.post("/api/image-bias-check-options", async (req, res) => {
    try {
      const { paragraph } = req.body;

      if (!paragraph) {
        return res.status(400).json({
          error: "Missing image description paragraph.",
        });
      }

      const response = await getBiasCheckOptions(
        buildPromptForImageBiasCheckOptions(paragraph),
      );

      const parsed = parseResponse(response);

      const generatedOptions = Array.isArray(parsed.options)
        ? parsed.options
        : [];

      /*
       * Keep the three categories fixed even if
       * OpenAI changes their order or misses one.
       */
      const options = imageBiasCheckingCategories.map((category) => {
        const generated = generatedOptions.find(
          (item) => item.category === category,
        );

        return {
          category,

          statement:
            generated?.statement ||
            "Check whether something in this image description fits this category.",
        };
      });

      return res.json({
        biasCheckCategories: options.map((item) => item.category),

        biasCheckStatements: options.map((item) => item.statement),
      });
    } catch (error) {
      console.error("Error generating image bias checking options:", error);

      return res.status(500).json({
        error: "Failed to generate image bias checking options.",
      });
    }
  });

  /*
   * STEP 2:
   * Check Answer.
   *
   * The hidden planned biasCategory is sent only here.
   *
   * The student's reflection response does NOT decide
   * correct / incorrect.
   */
  app.post("/api/check-image-bias-answer", async (req, res) => {
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
          error: "Missing image description paragraph.",
        });
      }

      // console.log("Image bias reflection response:", {
      //   selectedCategories,
      //   selectedStatements,
      //   typedAnswer,
      // });

      /*
       * Always call OpenAI so feedback is specific
       * to this image description paragraph.
       */
      const response = await getBiasCheckEvaluation(
        buildPromptForImageBiasCheckEvaluation({
          paragraph,

          biasCategory: biasCategory || null,

          selectedCategories,

          selectedStatements,

          typedAnswer,
        }),
      );

      const parsed = parseResponse(response);

      /*
       * Whether this is a planned biased paragraph
       * comes from biasCategory, not from the child's
       * reflection response or OpenAI.
       *
       * OpenAI provides only the explanation.
       */
      return res.json({
        correct: Boolean(biasCategory),

        explanation: parsed.explanation || "",
      });
    } catch (error) {
      console.error("Error checking image bias answer:", error);

      return res.status(500).json({
        error: "Failed to check image bias answer.",
      });
    }
  });
};

export default imageBiasCheckingRoutes;
