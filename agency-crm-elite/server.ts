import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Gemini Initialization
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // API Routes
  app.post("/api/leads/analyze", async (req, res) => {
    try {
      const { text } = req.body;
      if (!text) {
        return res.status(400).json({ error: "Missing text" });
      }

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Analyze the following text (e-mail or meeting note) and extract lead information.
Text: ${text}`,
        config: {
          systemInstruction: "Extract lead information from the provided text. If a field is not found, provide a reasonable default or null. Budget should be a number. Temperature must be one of: Chaud, Tiède, Froid.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              companyName: { type: Type.STRING, description: "Name of the company" },
              contactName: { type: Type.STRING, description: "Contact person name" },
              email: { type: Type.STRING, description: "Email address if found, otherwise generic placeholder" },
              need: { type: Type.STRING, description: "Short summary of the need or project" },
              budget: { type: Type.NUMBER, description: "Estimated budget in Euros" },
              temperature: { type: Type.STRING, description: "Lead temperature: Chaud, Tiède, or Froid" },
            },
            required: ["companyName", "contactName", "need", "budget", "temperature"]
          }
        }
      });

      const leadData = JSON.parse(response.text || "{}");
      res.json(leadData);
    } catch (error) {
      console.error("AI Analysis Error:", error);
      res.status(500).json({ error: "Failed to analyze text" });
    }
  });

  // Proposal Generation
  app.post("/api/leads/proposal", async (req, res) => {
    try {
      const { lead } = req.body;
      if (!lead) {
        return res.status(400).json({ error: "Missing lead data" });
      }

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Write a professional business proposal for the following lead.
Company: ${lead.companyName}
Contact: ${lead.contactName}
Need: ${lead.need}
Budget: ${lead.budget}€
Service: ${lead.serviceType || 'Général'}

Structure the proposal with:
1. Contexte & Enjeux
2. Solution Proposée
3. Budget & Calendrier
4. Pourquoi nous choisir ?

Use a persuasive and professional tone in French. Return the result in Markdown format.`,
      });

      res.json({ proposal: response.text });
    } catch (error) {
      console.error("Proposal Generation Error:", error);
      res.status(500).json({ error: "Failed to generate proposal" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production: serve static files from dist
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
