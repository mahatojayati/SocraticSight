import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { getGenAI, SOCRATIC_SYSTEM_INSTRUCTION } from "./services/geminiServer";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Body parsers with generous limits for base64 images
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // API endpoints
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/chat", async (req, res) => {
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
        res.json({ text });
      } else {
        res.status(500).json({ error: "No response text received from Gemini." });
      }
    } catch (error: any) {
      console.error("Gemini Chat Error:", error);
      res.status(500).json({ error: error.message || "Failed to query Gemini API" });
    }
  });

  app.post("/api/generate-solved-image", async (req, res) => {
    try {
      const { base64Image } = req.body;
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
             return res.json({ data: part.inlineData.data });
          }
        }
      }
      
      res.status(500).json({ error: "No image generated." });
    } catch (error: any) {
      console.error("Gemini Image Generation Error:", error);
      res.status(500).json({ error: error.message || "Failed to generate solved image" });
    }
  });

  // Vite development middleware vs Static Production files
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
