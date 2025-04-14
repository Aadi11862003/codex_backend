import express from 'express';
import axios from 'axios';
import { GoogleGenAI } from "@google/genai";

const router = express.Router();
const ai = new GoogleGenAI({ apiKey: "AIzaSyBdD0UwH0c1sECV0orKcdq8vpUVJ1zV96s" });

// Forward compile requests to Spring Boot
router.post('/compile', async (req, res) => {
    try {
        const { code, input } = req.body;

        // Forward the request to the Spring Boot backend
        const response = await axios.post('http://localhost:8080/api/compiler/compile', { code, input });

        // Send the response back to the frontend
        res.status(response.status).json(response.data);
    } catch (error) {
        console.error('Error forwarding request to Spring Boot:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error communicating with the Java backend',
            error: error.message,
        });
    }
});

// Add a new route for complexity calculation
router.post('/spaceComplexity', async (req, res) => {
    try {
        const { code } = req.body;
        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: "just give the space complexity of this code in single word answer no explanation needed, just teh answer in big o notation.The code is " + code,
        });
        console.log(response.text);

        // Send the correct response back to the client
        res.send({ complexity: response.text });
    } catch (error) {
        console.error('Error in complexity route:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error finding complexity',
            error: error.message,
        });
    }
});
router.post('/timeComplexity', async (req, res) => {
    try {
        const { code } = req.body;
        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: "just give the time complexity of this code in single word answer no explanation needed, just teh answer in big o notation.The code is " + code,
        });
        console.log(response.text);

        // Send the correct response back to the client
        res.send({ complexity: response.text });
    } catch (error) {
        console.error('Error in complexity route:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error finding complexity',
            error: error.message,
        });
    }
});

export default router;