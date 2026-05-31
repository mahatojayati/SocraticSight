import { Message, Attachment } from "../types";

/**
 * Sends the chat history + new input to Gemini 3 Pro via server-side endpoint.
 */
export const sendMessageToGemini = async (
  history: Message[],
  newItem: { text?: string; attachments?: Attachment[] }
): Promise<string> => {
  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ history, newItem }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.text;
  } catch (error) {
    console.error("Gemini Service Error (frontend):", error);
    throw error;
  }
};

/**
 * Generates a solved version of the provided image via server-side endpoint.
 */
export const generateSolvedImage = async (base64Image: string): Promise<string> => {
  try {
    const response = await fetch("/api/generate-solved-image", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ base64Image }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const json = await response.json();
    return json.data;
  } catch (error) {
    console.error("Image Generation Error (frontend):", error);
    throw error;
  }
};
