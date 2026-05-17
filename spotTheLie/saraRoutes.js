import {
  getFollowUpQuestions,
  getFollowUpReply,
  getClue,
} from "../util/openAIServices.js";
import { followUpQuestionCategory } from "./followUpQuestionCategory.js";

const accuratePrompt =
  "Given an image description and a follow-up question asked by a blind or low-vision user, provide a clear, direct response. Use a natural and informative tone.\n" +
  "Help improve understanding or highlight uncertainty without making assumptions.\n" +
  "Make sure the reply is only about the description.\n" +
  "Return only the reply as a string.\n" +
  "Keep the reply short, not more than 60 words, and conversational.\n" +
  "Use language for children above age 10 years.\n";

const irrelevancePrompt =
  "Given an image description and a follow-up question asked by a blind or low-vision user, provide a response that is irrelevant.\n" +
  "Ignore the actual intent of the question and include unrelated details from the description.\n" +
  "Return only the reply as a string.\n" +
  "Keep the reply short, not more than 60 words, and conversational.\n" +
  "Use language for children above age 10 years.\n";

const misfocusPrompt =
  "Given an image description and a follow-up question asked by a blind or low-vision user, provide a response that follows the question structure but focuses on a secondary detail from the description instead of the main intent.\n" +
  "Do not invent unrelated facts.\n" +
  "Make sure the reply is only about the description.\n" +
  "Return only the reply as a string.\n" +
  "Keep the reply short, not more than 60 words, and conversational.\n" +
  "Use language for children above age 10 years.\n";

const chooseHallucinationType = () => {
  const types = Object.keys(followUpQuestionCategory);
  return types[Math.floor(Math.random() * types.length)];
};

const chooseReplyTypePrompt = () => {
  const ReplyTypePrompt = [
    { replyType: "accurate", prompt: accuratePrompt, weight: 0.5 },
    { replyType: "irrelevance", prompt: irrelevancePrompt, weight: 0.25 }, //Off-topic answer
    { replyType: "misfocus", prompt: misfocusPrompt, weight: 0.25 }, //Missed the main point
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

const buildPromptForClueHallucinationFollowup = (
  imageDescription,
  imageHallucinationLine,
  clue = "",
) => {
  const chosenHallucinationType = chooseHallucinationType();
  const chosenCategories = followUpQuestionCategory[chosenHallucinationType];

  return (
    "Given an image description and a hallucination sentence, generate 3 follow-up questions that " +
    "a blind user might naturally ask to better understand or challenge the hallucinated detail.\n\n" +
    `You are focusing on this hallucination-check TYPE: "${chosenHallucinationType}".\n\n` +
    "Each question should be:\n" +
    "- Short and conversational\n" +
    "- Distinct in intent, such as asking for more detail, confirming realism, or testing logic\n" +
    "- Framed as a natural response from a blind user trying to mentally visualize the scene\n" +
    "- Focused especially on the hallucinated sentence\n" +
    "- Encouraging the user to critically think and guess the hallucination\n" +
    "- When referring to the hallucination, use the hallucinated sentence itself\n" +
    "- Matched to ONE of the listed follow-up question categories\n\n" +
    "- Avoid repeating the same phrasing or tone across questions.\n" +
    "- Use language for children above age 10 years.\n\n" +
    `Description: ${JSON.stringify(imageDescription)}\n` +
    `Hallucination sentence: ${JSON.stringify(imageHallucinationLine)}\n` +
    (clue ? `Clue: ${JSON.stringify(clue)}\n` : "") +
    "\nCategories + example style:\n" +
    chosenCategories
      .map(
        (c, idx) =>
          `${idx + 1}) ${c.category}\nExamples:\n- ${c.examples.join("\n- ")}\n`,
      )
      .join("\n") +
    "\nReturn ONLY raw JSON, in this exact shape:\n" +
    '{ "type": "<chosenType>", "followUp": [ { "category": "<category1>", "question": "<q1>" }, { "category": "<category2>", "question": "<q2>" }, { "category": "<category3>", "question": "<q3>" } ] }\n' +
    "Make sure the categories in the JSON exactly match the category titles above."
  );
};

const buildPromptForClue = (imageDescription, imageHallucinationLine) => {
  return (
    "Write a concise sentence to encourage critical thinking and point the user toward asking a " +
    "meaningful follow-up question by providing a clue or reasoning.\n" +
    "The sentence should hint that:\n" +
    "- AI tools sometimes make assumptions or add extra details not in the source\n\n" +
    "Do not use the hint provided directly. Use your own words.\n" +
    "The sentence should be brief and avoid technical jargon.\n" +
    "Use language for children above age 10 years.\n" +
    "Return only the clue sentence as a string.\n\n" +
    `Hallucination: ${JSON.stringify(imageHallucinationLine)}\n` +
    `Description: ${JSON.stringify(imageDescription)}`
  );
};

const saraRoutes = (app) => {
  app.post("/api/sara-followup-current-line", async (req, res) => {
    try {
      const { currentImageDescriptionLine, imageDescription } = req.body;

      const response = await getFollowUpQuestions(
        buildPromptForCurrentLineFollowup(
          currentImageDescriptionLine,
          imageDescription,
        ),
      );

      const parsedResponse = JSON.parse(response);
      //console.log(parsedResponse);

      res.json({
        followUpQuestionType: parsedResponse.type,
        followUpQuestionCategories: parsedResponse.followUp.map(
          (item) => item.category,
        ),
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
      //console.log(parsedResponse);

      res.json({
        followUpQuestionType: parsedResponse.type,
        followUpQuestionCategories: parsedResponse.followUp.map(
          (item) => item.category,
        ),
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

      //console.log(followUpReply);
      res.json({
        replyType: chosenReplyTypePrompt.replyType,
        followUpReply,
      });
    } catch (error) {
      console.error("Error generating Sara follow-up reply:", error);
      res.status(500).json({ error: "Failed to get Sara follow-up reply." });
    }
  });

  app.post("/api/sara-followup-clue", async (req, res) => {
    try {
      const { imageDescription, imageHallucinationLine, clue } = req.body;

      const response = await getFollowUpQuestions(
        buildPromptForClueHallucinationFollowup(
          imageDescription,
          imageHallucinationLine,
          clue,
        ),
      );

      const parsedResponse = JSON.parse(response);
      //console.log(parsedResponse);

      res.json({
        followUpQuestionType: parsedResponse.type,
        followUpQuestionCategories: parsedResponse.followUp.map(
          (item) => item.category,
        ),
        followUpQuestions: parsedResponse.followUp.map((item) => item.question),
      });
    } catch (error) {
      console.error("Error generating follow-up questions:", error);
      res.status(500).json({ error: "Failed to get follow-up questions." });
    }
  });

  app.post("/api/sara-clue", async (req, res) => {
    try {
      const { imageDescription, imageHallucinationLine } = req.body;

      const response = await getClue(
        buildPromptForClue(imageDescription, imageHallucinationLine),
      );

      //console.log(response);

      res.json({
        clue: response,
      });
    } catch (error) {
      console.error("Error generating clue", error);
      res.status(500).json({ error: "Failed to get clue." });
    }
  });
};
export default saraRoutes;
