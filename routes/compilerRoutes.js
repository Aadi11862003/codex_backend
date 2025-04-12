import express from 'express';
import axios from 'axios';

const router = express.Router();

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

export default router;