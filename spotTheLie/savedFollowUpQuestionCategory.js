export const followUpQuestionCategory = {
  "Mixed-up facts": [
    {
      category: "Ask to Double-Check Facts",
      examples: [
        "Check the color again and describe it.",
        "Check the shape again and describe it.",
      ],
    },
    {
      category: "Ask for More Concrete Details about a Fact",
      examples: [
        "What is the exact color of the shirt?",
        "List all the colors you see on the shirt.",
        "Name each pattern you can find on the shirt.",
      ],
    },
    {
      category: "Checking Consistency within a Detail",
      examples: ["Are all parts of the shirt the same color?"],
    },
  ],

  "Made-up details": [
    {
      category: "Ask for Evidence",
      examples: [
        "Where in the image do you see that?",
        "Is this written on the label or somewhere, or are you guessing?",
        "Does the image actually show this?",
        "Is this clearly written, or is it not shown?",
      ],
    },
    {
      category: "Check for Context Mismatch",
      examples: [
        "Is there enough details in the image to answer this?",
        "Does this information fits with the image context?",
      ],
    },
    {
      category: "Check for Inconsistency over Time",
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
        "Does each step follow from the one before it or did you skip any steps?",
      ],
    },
    {
      category: "Ask to Separate Interpretation from Assumption",
      examples: [
        "What can you actually see in the image and what part are you guessing or inferring?",
        "Is this based only on the image, or on general knowledge?",
        "Could this mean something different in another situation?",
        "Would you know this without outside information?",
      ],
    },
    {
      category: "Check Other Possibilities",
      examples: [
        "Can you think of a case where this would mean something different?",
        "Could this mean something else?",
        "Is there another way to understand this?",
      ],
    },
  ],
};
