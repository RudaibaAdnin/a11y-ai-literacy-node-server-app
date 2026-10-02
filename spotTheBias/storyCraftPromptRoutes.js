import {
  getCraftPromptSuggestions,
  getRephrasedParagraph,
} from "../util/openAIServices.js";
import { craft_prompt_categories } from "../util/storyCraftPromptCategories.js";

const parseResponse = (response) => JSON.parse(response);

const pickRandom = (items, count) =>
  [...items].sort(() => Math.random() - 0.5).slice(0, count);

const genericCraftPromptCategoryNames = [
  "Do not Use Judging Words",
  "Remove Unfair Assumptions or Stereotypes",
  "Make Descriptions More Equal",
  "Do not Treat Someone or Something as the Default",
  "Reduce Too Much Focus on Identity or Tools",
];

const disabilitySpecificCraftPromptCategoryNames = {
  "Treating Disability as Something Bad": [
    "Do not Show Disability as Something Bad",
  ],
  "Assuming Disabled People as Helpless": [
    "Do not Show a Disabled Person as Helpless",
  ],
  "Limited View on Disability": ["Show a Broader View of Disability"],
};

const getCraftPromptCategoriesForBias = (biasCategory) => {
  const biasName =
    typeof biasCategory === "string" ? biasCategory : biasCategory?.name || "";

  const genericCategories = craft_prompt_categories.filter((category) =>
    genericCraftPromptCategoryNames.includes(category.promptSuggestionCategory),
  );

  const specificCategoryNames =
    disabilitySpecificCraftPromptCategoryNames[biasName] || [];

  const specificCategories = craft_prompt_categories.filter((category) =>
    specificCategoryNames.includes(category.promptSuggestionCategory),
  );

  if (specificCategories.length > 0) {
    return [...specificCategories, ...pickRandom(genericCategories, 2)];
  }

  return pickRandom(genericCategories, 3);
};

const buildPromptForCraftPromptSuggestions = (paragraph, biasCategory) => {
  const chosenCategories = getCraftPromptCategoriesForBias(biasCategory);

  return `
You are a prompt helper for children ages 10-14.

Story paragraph:
${JSON.stringify(paragraph)}

Hidden bias category:
${JSON.stringify(biasCategory)}

Suggest exactly 3 prompt-writing tips that help the child revise the paragraph to reduce bias.
Each suggestion must use one of the 3 categories below.

Categories + example styles:
${chosenCategories
  .map(
    (item, index) =>
      `${index + 1}) ${item.promptSuggestionCategory}\nExample:\n- ${
        item.promptSuggestionExample
      }`,
  )
  .join("\n\n")}

Keep each suggestion short, clear, and child-friendly.

Return ONLY raw JSON in this exact shape:
{
  "promptSuggestions": [
    { "category": "<category1>", "suggestion": "<suggestion1>" },
    { "category": "<category2>", "suggestion": "<suggestion2>" },
    { "category": "<category3>", "suggestion": "<suggestion3>" }
  ]
}

Make sure the categories exactly match the 3 category titles above.
`;
};

const buildPromptForRephrasedParagraph = (paragraph, prompt, category) => `
You are a story revision helper for children ages 10-14.

Original paragraph:
${JSON.stringify(paragraph)}

Child's revision prompt:
${JSON.stringify(prompt)} 

Prompt category:
 ${JSON.stringify(category)}

Rewrite the paragraph using the child's prompt.
Keep the meaning of the story, but reduce biased wording.
Use clear, child-friendly language.
Keep it about the same length as the original paragraph.
Return only the rewritten paragraph as a string.
`;

const storyCraftPromptRoutes = (app) => {
  app.post("/api/craft-prompt-suggestions", async (req, res) => {
    try {
      const { paragraph, biasCategory } = req.body;

      if (!paragraph) {
        return res.status(400).json({ error: "Missing paragraph." });
      }

      const response = await getCraftPromptSuggestions(
        buildPromptForCraftPromptSuggestions(paragraph, biasCategory),
      );

      const parsed = parseResponse(response);

      res.json({
        promptSuggestionCategories: parsed.promptSuggestions.map(
          (item) => item.category,
        ),
        promptSuggestions: parsed.promptSuggestions.map(
          (item) => item.suggestion,
        ),
      });
    } catch (error) {
      console.error("Error generating craft prompt suggestions:", error);
      res
        .status(500)
        .json({ error: "Failed to get craft prompt suggestions." });
    }
  });

  app.post("/api/rephrase-paragraph", async (req, res) => {
    try {
      const { paragraph, prompt, category } = req.body;

      if (!paragraph || !prompt) {
        return res.status(400).json({ error: "Missing paragraph or prompt." });
      }

      const rephrasedParagraph = await getRephrasedParagraph(
        buildPromptForRephrasedParagraph(paragraph, prompt, category),
      );

      res.json({ rephrasedParagraph });
    } catch (error) {
      console.error("Error rephrasing paragraph:", error);
      res.status(500).json({ error: "Failed to rephrase paragraph." });
    }
  });
};

export default storyCraftPromptRoutes;
