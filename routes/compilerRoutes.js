// backend/routes/compilerRoutes.js
import express from "express";
import {Groq} from "groq-sdk";
import axios from "axios"; 

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const router = express.Router();


// Forward compile requests to Spring Boot
router.post("/compile", async (req, res) => {
  try {
    const { code, input } = req.body;
    const response = await axios.post("http://localhost:8080/api/compiler/compile", { code, input });
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error("Error forwarding request to Spring Boot:", error.message);
    res.status(500).json({
      success: false,
      message: "Error communicating with the Java backend",
      error: error.message,
    });
  }
});

// Code Analysis Route
// Code Analysis Route
router.post("/analyze-code", async (req, res) => {
  try {
    const { code } = req.body;

    const prompt = `You are a friendly programming tutor.
    Analyze this code and return ONLY a JSON response in this exact format:
    {
      "introduction": "Overview of what this code does",
      "lineByLine": [
        {
          "lineNumber": 1,
          "code": "actual code from the line",
          "explanation": "Simple explanation of what this line does",
          "concepts": ["concept1", "concept2"],
          "tips": ["tip1", "tip2"]
        }
      ],
      "complexity": {
        "time": "O(n) - ...",
        "space": "O(1) - ..."
      },
      "summary": "A wrap-up of how the code works"
    }

    Here is the code: \n${code}`;

    const response = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant", // you can use other models like gemma-7b-it
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
    });

    const rawText = response.choices[0].message.content;

    let parsedAnalysis;
    try {
      parsedAnalysis = JSON.parse(rawText);
    } catch (e) {
      console.warn("Could not parse AI JSON, sending fallback.");
      parsedAnalysis = {
        introduction: "Let me explain this code:",
        lineByLine: [{ lineNumber: 1, code, explanation: rawText }],
        summary: "End of explanation",
      };
    }

    res.json({ success: true, analysis: parsedAnalysis });
  } catch (error) {
    console.error("Error in code analysis:", error.message);
    res.status(500).json({
      success: false,
      message: "Error analyzing code",
      error: error.message,
    });
  }
});


// Space Complexity
router.post("/spaceComplexity", async (req, res) => {
  try {
    const { code } = req.body;

    // Define the prompt string
    const prompt = "Analyze this code and provide only the space complexity in Big O notation (just the notation, no explanation): " + code;

    // Call Groq model
    const response = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant", // Or gemma-7b-it
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
    });

    // Extract text response
    const complexity = response.choices[0]?.message?.content || "Not found";

    res.send({ complexity });
  } catch (error) {
    console.error("Error in complexity route:", error.message);
    res.status(500).json({ success: false, message: "Error finding complexity", error: error.message });
  }
});


// Time Complexity
router.post("/timeComplexity", async (req, res) => {
  try {
    const { code } = req.body;

    // Define the prompt string
    const prompt = "Analyze this code and provide only the time complexity in Big O notation (just the notation, no explanation): " + code;

    // Call Groq model
    const response = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant", // Or gemma-7b-it
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
    });

    // Extract text response
    const complexity = response.choices[0]?.message?.content || "Not found";

    res.send({ complexity });
  } catch (error) {
    console.error("Error in complexity route:", error.message);
    res.status(500).json({ success: false, message: "Error finding complexity", error: error.message });
  }
});


// Route for querying anything (not just code)
router.post("/query", async (req, res) => {
  try {
    const { question } = req.body;

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: "You are a helpful assistant. Answer clearly and concisely." },
        { role: "user", content: question },
      ],
      temperature: 0.5,
    });

    const responseText =
      completion.choices?.[0]?.message?.content || "No response found";

    // ⬇️ fix here
    res.json({ success: true, answer: responseText });
  } catch (error) {
    console.error("Error in /query:", error.message);
    res.status(500).json({ success: false, message: "Error answering query" });
  }
});




export default router;
