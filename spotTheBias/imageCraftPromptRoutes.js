//rephrase-image-prompt-suggestions (takes input from backend originalPrompt, biasedoriginalparagraph, selectedImageBiasCategories)
//loads prompt categories from imageCraftpromptcategories based on BiasCategorieName
//selects two prompt categories randomly and create two rephrase-image-prompt-suggestions for originalPrompt based on those two prompt categories, originalPrompt, biasedoriginalparagraph, BiasCategorieName. sends it to frontend, two categories and two prompts.

import { getCraftPromptSuggestions } from "../util/openAIServices.js";
import { image_craft_prompt_categories } from "../util/imageCraftPromptCategories.js";

const parseResponse = (response) => JSON.parse(response);

const pickRandom = (items = [], count) =>
  [...items].sort(() => Math.random() - 0.5).slice(0, count);

const getBiasCategoryName = (biasCategory) =>
  typeof biasCategory === "string" ? biasCategory : biasCategory?.name || "";

const buildPromptForImageCraftPromptSuggestions = ({
  originalPrompt = "",
  biasedOriginalParagraph = "",
  biasCategoryName = "",
  chosenCategories = [],
}) => `
You are Mia, a prompt helper for children ages 10-14.

Original image prompt:
${JSON.stringify(originalPrompt)}

Biased image description paragraph:
${JSON.stringify(biasedOriginalParagraph)}

Bias type:
${JSON.stringify(biasCategoryName)}

Suggest exactly 2 rewritten image prompts that make the image fairer.
Each suggestion must use one of the 2 categories below.

Categories + example styles:
${chosenCategories
  .map(
    (item, index) =>
      `${index + 1}) ${item.promptSuggestionCategory}\nExample:\n- ${
        item.promptSuggestionExample
      }`,
  )
  .join("\n\n")}

Keep each prompt short, clear, child-friendly, and specific.

Return ONLY raw JSON in this exact shape:
{
  "promptSuggestions": [
    { "category": "<category1>", "suggestion": "<suggestion1>" },
    { "category": "<category2>", "suggestion": "<suggestion2>" }
  ]
}

Make sure the categories exactly match the 2 category titles above.
`;

const imageCraftPromptRoutes = (app) => {
  app.post("/api/rephrase-image-prompt-suggestions", async (req, res) => {
    try {
      const {
        originalPrompt = "",
        biasedOriginalParagraph = "",
        selectedImageBiasCategories = [],
      } = req.body;

      const biasCategoryName = getBiasCategoryName(
        selectedImageBiasCategories[0],
      );

      const chosenCategories = pickRandom(
        image_craft_prompt_categories[biasCategoryName]?.promptSuggestions ||
          [],
        2,
      );

      const response = await getCraftPromptSuggestions(
        buildPromptForImageCraftPromptSuggestions({
          originalPrompt,
          biasedOriginalParagraph,
          biasCategoryName,
          chosenCategories,
        }),
      );

      const parsed = parseResponse(response);
      const promptSuggestions = parsed.promptSuggestions || [];

      res.json({
        promptSuggestionCategories: promptSuggestions.map(
          (item) => item.category,
        ),
        promptSuggestions: promptSuggestions.map((item) => item.suggestion),
      });
    } catch (error) {
      console.error("Error generating image craft prompt suggestions:", error);
      res.status(500).json({
        error: "Failed to get image craft prompt suggestions.",
      });
    }
  });
};

export default imageCraftPromptRoutes;
