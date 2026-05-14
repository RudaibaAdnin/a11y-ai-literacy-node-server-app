import {
  getFollowUpQuestions,
  getFollowUpReply,
} from "../util/openAIServices.js";
import { followUpQuestionCategory } from "./followUpQuestionCategory.js";

const accuratePrompt =
  "Given an image description and a follow-up question asked by a blind or low-vision user, provide a clear, direct response. Use a natural and informative tone.\n" +
  "Help improve understanding or highlight uncertainty without making assumptions.\n" +
  "Make sure the reply is only about the description.\n" +
  "Return only the reply as a string.\n" +
  "Keep the reply short, not more than 100 words, and conversational.\n" +
  "Use language for children above age 10 years.\n";

const irrelevancePrompt =
  "Given an image description and a follow-up question asked by a blind or low-vision user, provide a response that is irrelevant.\n" +
  "Ignore the actual intent of the question and include unrelated details from the description.\n" +
  "Return only the reply as a string.\n" +
  "Keep the reply short, not more than 100 words, and conversational.\n" +
  "Use language for children above age 10 years.\n";

const misfocusPrompt =
  "Given an image description and a follow-up question asked by a blind or low-vision user, provide a response that follows the question structure but focuses on a secondary detail from the description instead of the main intent.\n" +
  "Do not invent unrelated facts.\n" +
  "Make sure the reply is only about the description.\n" +
  "Return only the reply as a string.\n" +
  "Keep the reply short, not more than 100 words, and conversational.\n" +
  "Use language for children above age 10 years.\n";

const chooseHallucinationType = () => {
  const types = Object.keys(followUpQuestionCategory);
  return types[Math.floor(Math.random() * types.length)];
};

const chooseReplyTypePrompt = () => {
  const ReplyTypePrompt = [
    { replyType: "accurate", prompt: accuratePrompt, weight: 0.3 },
    { replyType: "irrelevance", prompt: irrelevancePrompt, weight: 0.35 },
    { replyType: "misfocus", prompt: misfocusPrompt, weight: 0.35 },
  ];

  const totalWeight = ReplyTypePrompt.reduce(
    (sum, item) => sum + item.weight,
    0,
  );

  let randomWeight = Math.random() * totalWeight;

  for (const item of ReplyTypePrompt) {
    randomWeight -= item.weight;
    if (randomWeight <= 0) return item;
  }

  return ReplyTypePrompt[ReplyTypePrompt.length - 1];
};

const buildPromptForEntireDescriptionFollowup = (imageDescription) => {
  const chosenHallucinationType = chooseHallucinationType();
  const chosenCategories = followUpQuestionCategory[chosenHallucinationType];

  return (
    "You are helping a blind or low-vision user verify the OVERALL image description.\n" +
    `You are focusing on this hallucination-check TYPE: "${chosenHallucinationType}".\n\n` +
    `Image description: ${JSON.stringify(imageDescription)}\n\n` +
    "Questions should be about the overall scene, including consistency, missing information, and plausibility.\n" +
    "Generate EXACTLY 3 follow-up questions.\n" +
    "Each question MUST match ONE of these question categories and feel similar in tone to the examples.\n" +
    "Keep questions short (not more than 20 words) and conversational.\n\n" +
    "Use language for children above age 10 years.\n\n" +
    "Categories + example style:\n" +
    chosenCategories
      .map(
        (c, idx) =>
          `${idx + 1}) ${c.category}\nExamples:\n- ${c.examples.join("\n- ")}\n`,
      )
      .join("\n") +
    '\nReturn ONLY raw JSON, in this exact shape:\n{ "type": "<chosenType>", "followUp": [ { "category": "<category1>", "question": "<q1>" }, { "category": "<category2>", "question": "<q2>" }, { "category": "<category3>", "question": "<q3>" } ] }\n' +
    "Make sure the categories in the JSON exactly match the 3 category titles above."
  );
};

const buildPromptForCurrentLineFollowup = (
  currentImageDescriptionLine,
  imageDescription,
) => {
  const chosenHallucinationType = chooseHallucinationType();
  const chosenCategories = followUpQuestionCategory[chosenHallucinationType];

  return (
    "You are helping a blind or low-vision user verify the OVERALL image description.\n" +
    `You are focusing on this hallucination-check TYPE: "${chosenHallucinationType}".\n\n` +
    `Image description: ${JSON.stringify(imageDescription)}\n\n` +
    `Questions should be about the current line: ${JSON.stringify(currentImageDescriptionLine)}\n\n` +
    "Generate EXACTLY 3 follow-up questions.\n" +
    "Each question MUST match ONE of these question categories and feel similar in tone to the examples.\n" +
    "Keep questions short (not more than 20 words) and conversational.\n\n" +
    "Use language for children above age 10 years.\n\n" +
    "Categories + example style:\n" +
    chosenCategories
      .map(
        (c, idx) =>
          `${idx + 1}) ${c.category}\nExamples:\n- ${c.examples.join("\n- ")}\n`,
      )
      .join("\n") +
    '\nReturn ONLY raw JSON, in this exact shape:\n{ "type": "<chosenType>", "followUp": [ { "category": "<category1>", "question": "<q1>" }, { "category": "<category2>", "question": "<q2>" }, { "category": "<category3>", "question": "<q3>" } ] }\n' +
    "Make sure the categories in the JSON exactly match the 3 category titles above."
  );
};

const saraRoutes = (app) => {
  app.post("/api/sara-followup-current-line", async (req, res) => {
    try {
      const { currentImageDescriptionLine, imageDescription } = req.body;

      const response = await getFollowUpQuestions(
        buildPromptForCurrentLineFollowup(
          imageDescription,
          currentImageDescriptionLine,
        ),
      );

      const parsedResponse = JSON.parse(response);
      console.log(parsedResponse);

      res.json({
        type: parsedResponse.type,
        categories: parsedResponse.followUp.map((item) => item.category),
        followUpQuestions: parsedResponse.followUp.map((item) => item.question),
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get follow-up questions." });
    }
  });
  app.post("/api/sara-followup-entire-description", async (req, res) => {
    try {
      const { imageDescription } = req.body;

      const response = await getFollowUpQuestions(
        buildPromptForEntireDescriptionFollowup(imageDescription),
      );

      const parsedResponse = JSON.parse(response);
      console.log(parsedResponse);

      res.json({
        type: parsedResponse.type,
        categories: parsedResponse.followUp.map((item) => item.category),
        followUpQuestions: parsedResponse.followUp.map((item) => item.question),
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get follow-up questions." });
    }
  });

  app.post("/api/sara-followup-reply", async (req, res) => {
    try {
      const { imageDescription, followUpQuestion } = req.body;

      const chosenReplyTypePrompt = chooseReplyTypePrompt();

      const userMessage =
        chosenReplyTypePrompt.prompt +
        `Image description: ${JSON.stringify(imageDescription)}\n` +
        `Follow-up question: ${followUpQuestion}`;

      const response = await getFollowUpReply(userMessage);
      const followUpReply = response;

      console.log(followUpReply);
      res.json({
        replyType: chosenReplyTypePrompt.replyType,
        followUpReply,
      });
    } catch (error) {
      console.error("Error generating Sara follow-up reply:", error);
      res.status(500).json({ error: "Failed to get Sara follow-up reply." });
    }
  });
};
export default saraRoutes;
