import { getStoryReading, reviewStoryBiases } from "../util/openAIServices.js";

import { story_bias_categoriesExamples } from "../util/storyBiasExamplesCategories.js";

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
        paragraphIndex: Number(item.paragraphIndex),
        biasCategory,
      };
    })
    .filter(
      (item) =>
        item &&
        Number.isInteger(item.paragraphIndex) &&
        item.paragraphIndex >= 0 &&
        item.paragraphIndex < 6,
    );

  return normalized.length === biasCategories.length
    ? normalized
    : fallbackPlan;
};

const getBiasCategoriesWithExamples = (biasCategories) =>
  biasCategories.map((category) => ({
    name: category.name,
    Examples: story_bias_categoriesExamples[category.name]?.Examples || [],
  }));

const getBiasCheckingCategories = (biasCategories) =>
  biasCategories.map((category) => ({
    name: category.name,
    Categories: story_bias_checking_categories[category.name]?.Categories || [],
  }));

const buildPromptForStoryReading = (
  storyTopic,
  storyTopicType,
  storyQuestionsAndAnswers,
  biasCategories,
  biasedParagraphPlan,
) => `
You are Mia, an AI story-writing agent for children ages 10-14.

Story topic type: ${JSON.stringify(storyTopicType)}
Story topic: ${JSON.stringify(storyTopic)}
Story planning answers: ${JSON.stringify(storyQuestionsAndAnswers)}

Bias categories to include:
${JSON.stringify(getBiasCategoriesWithExamples(biasCategories))}

Initial biased paragraph plan:
${JSON.stringify(
  biasedParagraphPlan.map((item) => ({
    paragraphIndex: item.paragraphIndex,
    biasCategoryName: item.biasCategory.name,
  })),
)}

Write a story with exactly 6 paragraphs.
Each paragraph should have about 3 short sentences.
The full story should be playful, clear, and easy for children ages 10-14 to read.

Rules:
- Include at least two human characters. One should be blind. Mention their disability details a bit.
- if you are talking about race, gender, culture, age, disability, do not talk about these identities in the same paragraph. keep them in seperate paragraphs.
- Use the provided examples to understand each bias category.
- Do not use complex sentences (e.g., while, instead) to show comparison. Write simple sentences.
- For each selected bias category, create the biased paragraph in an almost same or similar way to the provided examples.
- Keep the type of assumption, treatment, description, or situation similar to the examples.
- Adapt the characters, setting, actions, and details so the paragraph fits the story topic and story planning answers.
- can copy the example word-for-word.
- Prefer creating a close variation of the provided examples instead of creating a completely different kind of bias.
- Keep the bias implicit. Show it only through a character's action, assumption, description, or treatment.
- Do not add a concluding sentence that explains, evaluates, corrects, or draws attention to the biased behavior.
- End the paragraph naturally after the biased action or statement when possible.
- Do not describe how the affected character feels about the biased treatment.
- Include every provided bias category exactly once.
- Each bias category must appear in exactly one paragraph.
- Do not intentionally include any of the other listed bias categories in the remaining paragraphs.
- A paragraph should contain at most one planned bias category.
- Do not use slurs, hateful language, or the words "bias", "biased", or the bias category names.
- Paragraph indices start at 0.
- Before returning, recheck whether each planned paragraph really contains its assigned bias.
- Before returning, recheck that each biased paragraph is similar in its bias pattern to one of the provided examples for that category.
- If needed, shuffle the paragraphIndex values in the final biasedParagraphPlan so the plan matches the story exactly.

Return ONLY raw JSON in this exact shape:
{
  "storyParagraphs": [
    "<paragraph 1>",
    "<paragraph 2>",
    "<paragraph 3>",
    "<paragraph 4>",
    "<paragraph 5>",
    "<paragraph 6>"
  ],
  "biasedParagraphPlan": [
    {
      "paragraphIndex": 0,
      "biasCategoryName": "<category name>"
    }
  ]
}
`;

const buildPromptForStoryBiasReview = (
  storyParagraphs,
  biasCategories,
  biasedParagraphPlan,
) => `
You are a careful AI story bias reviewer.

Story paragraphs:
${JSON.stringify(storyParagraphs)}

Planned biased paragraph plan:
${JSON.stringify(
  biasedParagraphPlan.map((item) => ({
    paragraphIndex: item.paragraphIndex,
    biasCategoryName: item.biasCategory.name,
  })),
)}

Bias checking categories:
${JSON.stringify(getBiasCheckingCategories(biasCategories))}

Review the story and recheck whether each planned paragraph really contains its assigned bias.

Rules:
- Use the provided bias checking categories and descriptions to evaluate each planned paragraph.
- Check whether each assigned paragraph contains at least one of the checking categories for its assigned bias.
- Also check the other story paragraphs in case the assigned bias actually appears in a different paragraph.
- Each selected bias category must appear exactly once.
- Each selected bias category must be assigned to the paragraph where it actually appears.
- A paragraph should contain at most one selected bias category.
- Keep exactly 6 paragraphs.
- Do not add any new bias categories.
- Do not remove any selected bias categories.

If a planned paragraph already contains its assigned bias:
- Keep the paragraph exactly the same.
- Keep its paragraphIndex the same.

If the assigned bias is clearly present in another paragraph:
- Keep the story paragraphs unchanged.
- Update the paragraphIndex in biasedParagraphPlan to point to the correct paragraph.

If the assigned bias is not clearly present in any paragraph:
- Update only the planned paragraph for that bias.
- Make the smallest possible change needed.
- Keep the same characters, setting, actions, and surrounding story context.
- Make the paragraph clearly match at least one of the checking categories for the assigned bias.
- Keep the bias implicit. Show it only through a character's action, assumption, description, or treatment.
- Do not add a concluding sentence that explains, evaluates, corrects, or draws attention to the biased behavior.
- End the paragraph naturally after the biased action or statement when possible.
- Do not describe how the affected character feels about the biased treatment.

Important:
- Do not rewrite paragraphs unless needed.
- Do not change the main story.
- Do not use slurs, hateful language, or the words "bias", "biased", or the bias category names inside the story.
- Paragraph indices start at 0.
- Before returning, verify that every paragraphIndex in biasedParagraphPlan points to a paragraph that really contains its assigned bias.

Return ONLY raw JSON in this exact shape:
{
  "storyParagraphs": [
    "<paragraph 1>",
    "<paragraph 2>",
    "<paragraph 3>",
    "<paragraph 4>",
    "<paragraph 5>",
    "<paragraph 6>"
  ],
  "biasedParagraphPlan": [
    {
      "paragraphIndex": 0,
      "biasCategoryName": "<category name>"
    }
  ]
}
`;

const storyReadingRoutes = (app) => {
  app.post("/api/story-reading", async (req, res) => {
    try {
      const {
        storyTopic,
        storyTopicType,
        storyQuestionsAndAnswers,
        biasCategories,
      } = req.body;

      if (!Array.isArray(biasCategories) || biasCategories.length === 0) {
        return res.status(400).json({ error: "Missing bias categories." });
      }

      const paragraphIndices = pickRandom(
        [0, 1, 2, 3, 4, 5],
        biasCategories.length,
      );

      const initialPlan = biasCategories.map((biasCategory, index) => ({
        paragraphIndex: paragraphIndices[index],
        biasCategory,
      }));

      const parsed = parseResponse(
        await getStoryReading(
          buildPromptForStoryReading(
            storyTopic,
            storyTopicType,
            storyQuestionsAndAnswers,
            biasCategories,
            initialPlan,
          ),
        ),
      );

      const biasedParagraphPlan = normalizePlan(
        parsed.biasedParagraphPlan,
        biasCategories,
        initialPlan,
      );

      const reviewed = parseResponse(
        await reviewStoryBiases(
          buildPromptForStoryBiasReview(
            parsed.storyParagraphs || [],
            biasCategories,
            biasedParagraphPlan,
          ),
        ),
      );

      const reviewedBiasedParagraphPlan = normalizePlan(
        reviewed.biasedParagraphPlan,
        biasCategories,
        biasedParagraphPlan,
      );

      res.json({
        storyParagraphs:
          reviewed.storyParagraphs || parsed.storyParagraphs || [],
        biasedParagraphPlan: reviewedBiasedParagraphPlan,
      });
    } catch (error) {
      console.error("Error getting story reading:", error);
      res.status(500).json({ error: "Failed to get story reading." });
    }
  });
};

export default storyReadingRoutes;

// import { getStoryReading } from "../util/openAIServices.js";

// const parseResponse = (response) => JSON.parse(response);

// const pickRandom = (items, count) =>
//   [...items].sort(() => Math.random() - 0.5).slice(0, count);

// const normalizePlan = (plan = [], biasCategories, fallbackPlan) => {
//   const normalized = plan
//     .map((item) => {
//       const categoryName =
//         item.biasCategoryName || item.biasCategory?.name || item.biasCategory;

//       const biasCategory = biasCategories.find(
//         (category) => category.name === categoryName,
//       );

//       if (!biasCategory) return null;

//       return {
//         paragraphIndex: Number(item.paragraphIndex),
//         biasCategory,
//       };
//     })
//     .filter(
//       (item) =>
//         item &&
//         Number.isInteger(item.paragraphIndex) &&
//         item.paragraphIndex >= 0 &&
//         item.paragraphIndex < 6,
//     );

//   return normalized.length === biasCategories.length
//     ? normalized
//     : fallbackPlan;
// };

// const buildPromptForStoryReading = (
//   storyTopic,
//   storyTopicType,
//   storyQuestionsAndAnswers,
//   biasCategories,
//   biasedParagraphPlan,
// ) => `
// You are Mia, an AI story-writing agent for children ages 10-14.

// Story topic type: ${JSON.stringify(storyTopicType)}
// Story topic: ${JSON.stringify(storyTopic)}
// Story planning answers: ${JSON.stringify(storyQuestionsAndAnswers)}

// Bias categories to include:
// ${JSON.stringify(biasCategories)}

// Initial biased paragraph plan:
// ${JSON.stringify(
//   biasedParagraphPlan.map((item) => ({
//     paragraphIndex: item.paragraphIndex,
//     biasCategoryName: item.biasCategory.name,
//   })),
// )}

// Write a story with exactly 6 paragraphs.
// Each paragraph should have about 3 short sentences.
// The full story should be playful, clear, and easy for children ages 10-14 to read.

// Rules:
// - Include at least two human characters. One should be disabled. Mention the disability details a bit.
// - Use the meaning and examples to understand each bias category.
// - Include every provided bias category exactly once.
// - Each bias category must appear in exactly one paragraph.
// - Do not intentionally include any of the other listed bias categories in the remaining paragraphs.
// - A paragraph should contain at most one planned bias category.
// - Make the bias noticeable but not too obvious.
// - Do not use slurs, hateful language, or the words "bias", "biased", or the bias category names.
// - Paragraph indices start at 0.
// - Before returning, recheck whether each planned paragraph really contains its assigned bias.
// - If needed, shuffle the paragraphIndex values in the final biasedParagraphPlan so the plan matches the story exactly.

// Return ONLY raw JSON in this exact shape:
// {
//   "storyParagraphs": [
//     "<paragraph 1>",
//     "<paragraph 2>",
//     "<paragraph 3>",
//     "<paragraph 4>",
//     "<paragraph 5>",
//     "<paragraph 6>"
//   ],
//   "biasedParagraphPlan": [
//     {
//       "paragraphIndex": 0,
//       "biasCategoryName": "<category name>"
//     }
//   ]
// }
// `;

// const storyReadingRoutes = (app) => {
//   app.post("/api/story-reading", async (req, res) => {
//     try {
//       const {
//         storyTopic,
//         storyTopicType,
//         storyQuestionsAndAnswers,
//         biasCategories,
//       } = req.body;

//       if (!Array.isArray(biasCategories) || biasCategories.length === 0) {
//         return res.status(400).json({ error: "Missing bias categories." });
//       }

//       const paragraphIndices = pickRandom(
//         [0, 1, 2, 3, 4, 5],
//         biasCategories.length,
//       );

//       const initialPlan = biasCategories.map((biasCategory, index) => ({
//         paragraphIndex: paragraphIndices[index],
//         biasCategory,
//       }));

//       const parsed = parseResponse(
//         await getStoryReading(
//           buildPromptForStoryReading(
//             storyTopic,
//             storyTopicType,
//             storyQuestionsAndAnswers,
//             biasCategories,
//             initialPlan,
//           ),
//         ),
//       );

//       const biasedParagraphPlan = normalizePlan(
//         parsed.biasedParagraphPlan,
//         biasCategories,
//         initialPlan,
//       );

//       res.json({
//         storyParagraphs: parsed.storyParagraphs || [],
//         biasedParagraphPlan,
//       });
//     } catch (error) {
//       console.error("Error getting story reading:", error);
//       res.status(500).json({ error: "Failed to get story reading." });
//     }
//   });
// };

// export default storyReadingRoutes;
