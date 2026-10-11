export const followUpQuestionCategory = {
  "Mixed-up facts": [
    {
      category: "Ask Sara to Double-Check Facts",
      examples: [
        "Check the color again and describe it.",
        "Check the shape again and describe it.",
      ],
    },
    {
      category: "Ask Sara for Clear Details About a Fact",
      examples: [
        "What exact color is the shirt?",
        "List all the colors you see on the shirt.",
        "Name each pattern you can find on the shirt.",
      ],
    },
    {
      category: "Check Consistency within a Detail",
      examples: ["Are all parts of the shirt the same color?"],
    },
  ],

  "Made-up details": [
    {
      category: "Ask Sara for Evidence",
      examples: [
        "Where in the image do you see that?",
        "Is this written on the label or somewhere, or are you guessing?",
        "Does the image actually show this?",
        "Is this clearly written, or is it not shown?",
      ],
    },
    {
      category: "Check for Mismatch in Detail",
      examples: [
        "Are there enough details in the image to answer this?",
        "Does this information fit with what is shown in the image?",
      ],
    },
    {
      category: "Ask Sara to Check the Detail Again",
      examples: [
        "Describe this part again.",
        "Does the table actually exist in the image?",
      ],
    },
  ],

  "Wrong guess": [
    {
      category: "Ask for Reasoning Steps",
      examples: [
        "How did you figure out the region from the license plate?",
        "Explain your steps one by one.",
        "Which rule are you using to understand this?",
        "Does each step follow from the one before it, or did you skip any steps?",
      ],
    },
    {
      category: "Ask Sara What It Is Assuming",
      examples: [
        "What can you actually see in the image, and what part are you guessing?",
        "Is this based only on the image, or on general knowledge?",
        "Could this mean something different in another situation?",
        "Would you know this without outside information?",
      ],
    },
    {
      category: "Check Other Possible Answers",
      examples: [
        "Can you think of a case where this would mean something different?",
        "Could this mean something else?",
        "Is there another way to understand this?",
      ],
    },
  ],
};
