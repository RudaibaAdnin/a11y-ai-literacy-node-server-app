import {
  getImagePrompt,
  generateImagePNG,
  describePNGImage,
  reviewImageBiases,
} from "../util/openAIServices.js";

import { story_bias_checking_categories } from "../util/storyBiasCheckingCategories.js";

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

const getBiasCheckingCategories = (biasCategories) =>
  biasCategories.map((category) => ({
    name: category.name,
    Categories: story_bias_checking_categories[category.name]?.Categories || [],
  }));

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

1. displayedPrompt: a short child-friendly prompt based only on the disabled story character and scene. Example, "generate image of Sara, a blind student"

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

const buildPromptForImageBiasReview = (
  imageDescriptionParagraphs,
  selectedImageBiasCategories,
  biasedImageDescriptionParagraphPlan,
) => `
You are a careful AI image-description bias reviewer.

Image description paragraphs:
${JSON.stringify(imageDescriptionParagraphs)}

Planned biased image-description paragraph plan:
${JSON.stringify(
  biasedImageDescriptionParagraphPlan.map((item) => ({
    imageDescriptionParagraphIndex: item.imageDescriptionParagraphIndex,
    biasCategoryName: item.biasCategory.name,
  })),
)}

Bias checking categories:
${JSON.stringify(getBiasCheckingCategories(selectedImageBiasCategories))}

Review the image-description paragraphs and recheck whether each planned paragraph really contains its assigned bias.

Rules:
- Use the provided bias checking categories and descriptions to evaluate each planned paragraph.
- Check whether each assigned paragraph contains at least one checking category for its assigned bias.
- Also check the other image-description paragraphs in case the assigned bias actually appears in a different paragraph.
- Each selected bias category must appear exactly once.
- Each selected bias category must be assigned to the paragraph where it actually appears.
- A paragraph should contain at most one selected bias category.
- Keep exactly 3 image-description paragraphs.
- Do not add new bias categories.
- Do not remove any selected bias categories.

If a planned paragraph already contains its assigned bias:
- Keep the paragraph exactly the same.
- Keep its imageDescriptionParagraphIndex the same.

If the assigned bias is clearly present in another paragraph:
- Keep the image-description paragraphs unchanged.
- Update imageDescriptionParagraphIndex so it points to the correct paragraph.

If the assigned bias is not clearly present in any paragraph:
- Update only the planned paragraph for that bias.
- Make the smallest possible change needed.
- Keep the same people, objects, actions, setting, and image details.
- Make the paragraph clearly match at least one checking category for the assigned bias.
- Keep the bias noticeable but not too obvious.

Important:
- Do not rewrite paragraphs unless needed.
- Do not change the main image description.
- Do not invent major visual details that are not already described.
- Do not use the words "bias", "biased", or the bias category names inside the image-description paragraphs.
- Paragraph indices start at 0.
- If needed, shuffle the imageDescriptionParagraphIndex values so the final plan matches the paragraphs.
- Before returning, verify that every imageDescriptionParagraphIndex points to a paragraph that really contains its assigned bias.

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

const buildPromptForRephrasedImageDescriptionParagraphs = (rephrasedPrompt) => `
You are Mia, an image description writer for children ages 10-14.

The image was generated from this rewritten prompt:
${JSON.stringify(rephrasedPrompt)}

Write exactly 3 short image-description paragraphs.
Each paragraph should have about 4 short sentences.

Rules:
- Use the image as the main source.
- Do not add hidden bias on purpose.
- Do not mention the prompt.
- Use simple, child-friendly language.

Return ONLY raw JSON:
{
  "imageDescriptionParagraphs": [
    "<paragraph 1>",
    "<paragraph 2>",
    "<paragraph 3>"
  ]
}
`;

const imageRoutes = (app) => {
  app.get("/api/image-routes-test", (req, res) => {
    res.json({
      status: "ok",
      message: "Image reading routes are connected.",
      routes: [
        "GET /api/image-routes-test",
        "GET /api/image-env-test",
        "GET /api/image-model-test",
        "POST /api/generate-image-prompt",
        "POST /api/generate-image-description",
      ],
    });
  });

  app.get("/api/image-env-test", (req, res) => {
    res.json({
      status: "ok",
      hasOpenAIKey: Boolean(process.env.OPENAI_API_KEY),
      message: process.env.OPENAI_API_KEY
        ? "OPENAI_API_KEY exists in backend environment."
        : "OPENAI_API_KEY is missing in backend environment.",
    });
  });

  // Use this only for debugging. It calls OpenAI image generation and may cost money.
  app.get("/api/image-model-test", async (req, res) => {
    try {
      const imageBuffer = await generateImagePNG(
        "A simple child-friendly cartoon image of a yellow star on a plain white background.",
      );

      res.setHeader("Content-Type", "image/jpeg");
      res.send(imageBuffer);
    } catch (error) {
      console.error("Image model test failed:", error);
      res.status(500).json({
        error: "Image model test failed.",
        message: error.message,
      });
    }
  });

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

      const biasedImageDescriptionParagraphPlan = normalizePlan(
        parsed.biasedImageDescriptionParagraphPlan,
        selectedImageBiasCategories,
        initialPlan,
      );

      const reviewed = parseResponse(
        await reviewImageBiases(
          buildPromptForImageBiasReview(
            parsed.imageDescriptionParagraphs || [],
            selectedImageBiasCategories,
            biasedImageDescriptionParagraphPlan,
          ),
        ),
      );

      const reviewedBiasedImageDescriptionParagraphPlan = normalizePlan(
        reviewed.biasedImageDescriptionParagraphPlan,
        selectedImageBiasCategories,
        biasedImageDescriptionParagraphPlan,
      );

      // console.log(
      //   "Image description paragraphs:",
      //   reviewed.imageDescriptionParagraphs ||
      //     parsed.imageDescriptionParagraphs,
      // );

      // console.log(
      //   "Biased image description paragraph plan:",
      //   reviewedBiasedImageDescriptionParagraphPlan,
      // );

      res.json({
        imageBase64: `data:image/jpeg;base64,${imageBuffer.toString("base64")}`,
        imageDescriptionParagraphs:
          reviewed.imageDescriptionParagraphs ||
          parsed.imageDescriptionParagraphs ||
          [],
        biasedImageDescriptionParagraphPlan:
          reviewedBiasedImageDescriptionParagraphPlan,
      });
    } catch (error) {
      console.error("Error getting image description:", error);
      res.status(500).json({ error: "Failed to get image description." });
    }
  });

  app.post("/api/generate-rephrased-image-description", async (req, res) => {
    try {
      const { rephrasedPrompt } = req.body;

      if (!rephrasedPrompt) {
        return res.status(400).json({ error: "Missing rephrased prompt." });
      }

      const imageBuffer = await generateImagePNG(rephrasedPrompt);

      const parsed = parseResponse(
        await describePNGImage({
          imageBuffer,
          prompt:
            buildPromptForRephrasedImageDescriptionParagraphs(rephrasedPrompt),
        }),
      );

      res.json({
        imageBase64: `data:image/png;base64,${imageBuffer.toString("base64")}`,
        imageDescriptionParagraphs: parsed.imageDescriptionParagraphs || [],
        biasedImageDescriptionParagraphPlan: [],
      });
    } catch (error) {
      console.error("Error getting rephrased image description:", error);
      res
        .status(500)
        .json({ error: "Failed to get rephrased image description." });
    }
  });
};

export default imageRoutes;
