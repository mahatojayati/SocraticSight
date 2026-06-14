import { getGenAI } from "../services/geminiServer";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  try {
    const { base64Image } = req.body;
    if (!base64Image) {
      return res.status(400).json({ error: "Missing base64Image in request body" });
    }
    const cleanBase64 = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;
    const ai = getGenAI();

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { 
            inlineData: { 
              mimeType: 'image/jpeg',
              data: cleanBase64 
            } 
          },
          { 
            text: "Solve the math or physics problem shown in the image. Output a NEW image that is identical to the original, but with the full solution steps and final answer written in the blank space or next to the problem. Use a handwriting style that closely matches the original text in the image." 
          },
        ],
      },
    });

    if (response.candidates && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
           return res.status(200).json({ data: part.inlineData.data });
        }
      }
    }
    
    return res.status(500).json({ error: "No image generated." });
  } catch (error: any) {
    console.error("Gemini Image Generation Error (serverless):", error);
    return res.status(500).json({ error: error.message || "Failed to generate solved image" });
  }
}
