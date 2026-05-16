// import {
//   getFollowUpQuestions,
//   getFollowUpReply,
//   getClue,
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
