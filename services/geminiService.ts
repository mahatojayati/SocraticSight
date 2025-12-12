import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Message, Attachment } from "../types";

// Initialize the client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SOCRATIC_SYSTEM_INSTRUCTION = `
You are SocraticSight, a patient, encouraging, and wise Socratic Tutor for students. 
Your goal is to help students learn math and physics by thinking critically.

**Context:**
The user may upload images of problems and PDF notes/reference materials. Use the notes to inform your guidance.

**Modes:**
1. **Normal Mode (Socratic Method):**
    - **Identify the Concept**: Briefly mention the underlying concept.
    - **Check the Work**: If the user uploaded work, check it for errors gently.
    - **Ask a Guiding Question**: Ask ONE clear question to help the user take the next step. DO NOT solve it yet.
    - **YouTube Suggestion**: At the end, output \`VIDEO_SEARCH: <concept search term>\`.

2. **Reveal Answer Mode:**
    - Triggered if the user says "REVEAL_ANSWER", "I give up", or asks for the solution directly.
    - **Step-by-Step Solution**: Provide the full, detailed derivation.
    - **Final Answer Block**: You MUST output the final answer in a distinct block at the end, like:
      
      **Final Answer:**
      $$ <answer> $$
      (or simply the value if Latex is not needed).

    - **Explanation**: Explain why this is the answer.
    - Still provide the \`VIDEO_SEARCH: <term>\` at the end.

**Formatting Rules**:
- Keep responses concise and friendly.
- Use Markdown.
- Ensure the \`VIDEO_SEARCH: ...\` tag is the last line.
`;

/**
 * Sends the chat history + new input to Gemini 3 Pro.
 */
export const sendMessageToGemini = async (
  history: Message[],
  newItem: { text?: string; attachments?: Attachment[] }
): Promise<string> => {
  try {
    const model = "gemini-3-pro-preview";

    // Format history
    const contents = history.map((msg) => {
      const parts: any[] = [];
      
      if (msg.attachments) {
        msg.attachments.forEach(att => {
          // Remove prefix if present, though usually handled before storage
          const base64Data = att.data.includes(',') ? att.data.split(',')[1] : att.data;
          parts.push({
            inlineData: {
              mimeType: att.mimeType,
              data: base64Data,
            },
          });
        });
      }
      
      if (msg.text) {
        parts.push({ text: msg.text });
      }
      
      return {
        role: msg.role === 'user' ? 'user' : 'model',
        parts: parts,
      };
    });

    // Add new item
    const newParts: any[] = [];
    if (newItem.attachments) {
        newItem.attachments.forEach(att => {
            const base64Data = att.data.includes(',') ? att.data.split(',')[1] : att.data;
            newParts.push({
                inlineData: {
                    mimeType: att.mimeType,
                    data: base64Data
                }
            });
        });
    }
    if (newItem.text) {
        newParts.push({ text: newItem.text });
    }
    
    contents.push({
        role: 'user',
        parts: newParts
    });

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: model,
      contents: contents,
      config: {
        systemInstruction: SOCRATIC_SYSTEM_INSTRUCTION,
        thinkingConfig: { thinkingBudget: 1024 },
      },
    });

    if (response.text) {
      return response.text;
    } else {
      throw new Error("No response text received from Gemini.");
    }
  } catch (error) {
    console.error("Gemini Service Error:", error);
    throw error;
  }
};

/**
 * Generates a solved version of the provided image.
 */
export const generateSolvedImage = async (base64Image: string): Promise<string> => {
  try {
    // Clean base64 string
    const cleanBase64 = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { 
            inlineData: { 
              mimeType: 'image/jpeg', // Assuming jpeg/png generic compatibility
              data: cleanBase64 
            } 
          },
          { 
            text: "Solve the math or physics problem shown in the image. Output a NEW image that is identical to the original, but with the full solution steps and final answer written in the blank space or next to the problem. Use a handwriting style that closely matches the original text in the image." 
          },
        ],
      },
      // Config not needed for simple image edit/generation unless specific aspect ratio desired, 
      // but here we want to preserve context so we let the model decide.
    });

    // Extract image from response
    if (response.candidates && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
           return part.inlineData.data;
        }
      }
    }
    
    throw new Error("No image generated.");
  } catch (error) {
    console.error("Image Generation Error:", error);
    throw error;
  }
};
