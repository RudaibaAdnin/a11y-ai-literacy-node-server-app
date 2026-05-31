import {
  getImagePrompt,
  generateImagePNG,
  describePNGImage,
} from "../../util/openAIServices.js";

const parseResponse = (response) => JSON.parse(response);

const pickRandom = (items, count) =>
  [...items].sort(() => Math.random() - 0.5).slice(0, count);

const normalizePlan = (plan = [], biasCategories, fallbackPlan) => {
  const normalized = plan
    .map((item) => {
      const categoryName =
        item.biasCategoryName || item.biasCategory?.name || item.biasCategory;

      const biasCategory = biasCategories.find(
        (category) => category.name === categoryName,
      );

      if (!biasCategory) return null;

      return {
        imageDescriptionParagraphIndex: Number(
          item.imageDescriptionParagraphIndex,
        ),
        biasCategory,
      };
    })
    .filter(
      (item) =>
        item &&
        Number.isInteger(item.imageDescriptionParagraphIndex) &&
        item.imageDescriptionParagraphIndex >= 0 &&
        item.imageDescriptionParagraphIndex < 3,
    );

  return normalized.length === biasCategories.length
    ? normalized
    : fallbackPlan;
};

const buildPromptForImageGenerationPrompt = (
  storyParagraphs,
  selectedImageBiasCategories,
) => `
You are Mia, an image prompt writer for children ages 10-14.

Story paragraphs:
${JSON.stringify(storyParagraphs)}

Image bias category for originalPrompt only:
${JSON.stringify(selectedImageBiasCategories)}

Create two prompts:
1. displayedPrompt: a short child-friendly prompt based only on one story character or scene. Example, "generate image of Sara, a disabled student"
2. originalPrompt: the real image generation prompt. It should use the displayedPrompt idea and include bias similar to Image bias category.

Return ONLY raw JSON:
{
  "displayedPrompt": "",
  "originalPrompt": ""
}
`;

const buildPromptForImageDescriptionParagraphs = (
  selectedImageBiasCategories,
  biasedImageDescriptionParagraphPlan,
) => `
You are Mia, an image description writer for children ages 10-14.

Image bias categories included in the image:
${JSON.stringify(selectedImageBiasCategories)}

Planned biased description paragraph:
${JSON.stringify(
  biasedImageDescriptionParagraphPlan.map((item) => ({
    imageDescriptionParagraphIndex: item.imageDescriptionParagraphIndex,
    biasCategoryName: item.biasCategory.name,
  })),
)}

Write exactly 3 short image-description paragraphs.
Each paragraph should have about 4 short sentences.

Rules:
- Use the image as the main source.
- Include each hidden bias category in only its planned paragraph.
- Do not include the hidden bias categories in the other paragraphs.
- Do not use the words "bias", "biased", or the bias category names.
- Paragraph indices start at 0.
- Before returning, recheck that the final plan matches the paragraphs.

Return ONLY raw JSON:
{
  "imageDescriptionParagraphs": [
    "<paragraph 1>",
    "<paragraph 2>",
    "<paragraph 3>"
  ],
  "biasedImageDescriptionParagraphPlan": [
    {
      "imageDescriptionParagraphIndex": 0,
      "biasCategoryName": "<category name>"
    }
  ]
}
`;

const imageReadingRoutes = (app) => {
  app.post("/api/generate-image-prompt", async (req, res) => {
    try {
      const { storyParagraphs, selectedImageBiasCategories } = req.body;

      if (!storyParagraphs?.length || !selectedImageBiasCategories?.length) {
        return res.status(400).json({ error: "Missing image prompt data." });
      }

      const parsed = parseResponse(
        await getImagePrompt(
          buildPromptForImageGenerationPrompt(
            storyParagraphs,
            selectedImageBiasCategories,
          ),
        ),
      );

      // console.log("Generated displayed prompt:", parsed.displayedPrompt);
      // console.log("Generated original prompt:", parsed.originalPrompt);
      res.json({
        imagePrompt: {
          displayedPrompt: parsed.displayedPrompt || "",
          originalPrompt: parsed.originalPrompt || "",
        },
      });
    } catch (error) {
      console.error("Error getting image prompt:", error);
      res.status(500).json({ error: "Failed to get image prompt." });
    }
  });

  // app.post("/api/generate-image", async (req, res) => {
  //   try {
  //     const { originalPrompt } = req.body;

  //     if (!originalPrompt) {
  //       return res.status(400).json({ error: "Missing original prompt." });
  //     }

  //     const imageBuffer = await generateImagePNG(originalPrompt);

  //     res.setHeader("Content-Type", "image/png");
  //     res.send(imageBuffer);
  //   } catch (error) {
  //     console.error("Error generating image:", error);
  //     res.status(500).json({ error: "Failed to generate image." });
  //   }
  // });

  app.post("/api/generate-image-description", async (req, res) => {
    try {
      const { originalPrompt, selectedImageBiasCategories } = req.body;

      if (!originalPrompt || !selectedImageBiasCategories?.length) {
        return res
          .status(400)
          .json({ error: "Missing image description data." });
      }

      const imageBuffer = await generateImagePNG(originalPrompt);

      const paragraphIndices = pickRandom(
        [0, 1, 2],
        selectedImageBiasCategories.length,
      );

      const initialPlan = selectedImageBiasCategories.map(
        (biasCategory, index) => ({
          imageDescriptionParagraphIndex: paragraphIndices[index],
          biasCategory,
        }),
      );

      //console.log("Initial image description plan:", initialPlan);
      const parsed = parseResponse(
        await describePNGImage({
          imageBuffer,
          prompt: buildPromptForImageDescriptionParagraphs(
            selectedImageBiasCategories,
            initialPlan,
          ),
        }),
      );

      // console.log(
      //   "Image description paragraphs:",
      //   parsed.imageDescriptionParagraphs,
      // );
      // console.log(
      //   "Biased image description paragraph plan:",
      //   parsed.biasedImageDescriptionParagraphPlan,
      // );
      res.json({
        imageBase64: `data:image/jpeg;base64,${imageBuffer.toString("base64")}`,
        imageDescriptionParagraphs: parsed.imageDescriptionParagraphs || [],
        biasedImageDescriptionParagraphPlan: normalizePlan(
          parsed.biasedImageDescriptionParagraphPlan,
          selectedImageBiasCategories,
          initialPlan,
        ),
      });
    } catch (error) {
      console.error("Error getting image description:", error);
      res.status(500).json({ error: "Failed to get image description." });
    }
  });
};

export default imageReadingRoutes;
