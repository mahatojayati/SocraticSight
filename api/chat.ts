import { getGenAI, SOCRATIC_SYSTEM_INSTRUCTION } from "../services/geminiServer";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  try {
    const { history, newItem } = req.body;
    const model = "gemini-3.5-flash";
    const ai = getGenAI();

    // Format history
    const contents = history.map((msg: any) => {
      const parts: any[] = [];
      
      if (msg.attachments) {
        msg.attachments.forEach((att: any) => {
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
      newItem.attachments.forEach((att: any) => {
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

    const response = await ai.models.generateContent({
      model: model,
      contents: contents,
      config: {
        systemInstruction: SOCRATIC_SYSTEM_INSTRUCTION,
        thinkingConfig: { thinkingBudget: 1024 },
      },
    });

    const text = response.text;
    if (text) {
      return res.status(200).json({ text });
    } else {
      return res.status(500).json({ error: "No response text received from Gemini." });
    }
  } catch (error: any) {
    console.error("Gemini Chat Error (serverless):", error);
    return res.status(500).json({ error: error.message || "Failed to query Gemini API" });
  }
}
