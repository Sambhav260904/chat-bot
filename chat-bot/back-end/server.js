require("dotenv").config();
const express = require("express");
const cors = require("cors");
const rateLimit = require('express-rate-limit');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const path = require('path');

const app = express();

// Middleware
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, '../front-end')));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Chat history (optional - for context awareness)
const chatHistory = new Map();

// Utility function to sanitize and format responses
function formatAIResponse(text) {
    // Remove any potentially unsafe content
    const sanitized = text
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .trim();
    
    return sanitized;
}

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../front-end/index.html'));
});


// Main chat endpoint
app.post("/chat", async (req, res) => {
    const { prompt, sessionId } = req.body;

    // Input validation
    if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({ 
            error: "Invalid input. Please provide a valid text prompt." 
        });
    }

    try {
        // Get chat history for this session (if implementing context)
        const history = chatHistory.get(sessionId) || [];

        // Generate response
        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 1024,
            },
            safetySettings: [
                {
                    category: "HARM_CATEGORY_HARASSMENT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    category: "HARM_CATEGORY_HATE_SPEECH",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                }
            ]
        });

        // Extract and format response
        const responseText = result.response.candidates[0].content.parts[0].text;
        const formattedResponse = formatAIResponse(responseText);

        // Update chat history (if implementing context)
        if (sessionId) {
            const updatedHistory = [...history, { role: "user", content: prompt }, { role: "assistant", content: formattedResponse }];
            chatHistory.set(sessionId, updatedHistory.slice(-10)); // Keep last 10 messages
        }

        // Send response
        res.json({ 
            response: formattedResponse,
            status: "success"
        });

    } catch (error) {
        console.error("Error in chat endpoint:", error);
        
        // Determine appropriate error message
        let errorMessage = "An unexpected error occurred";
        if (error.message.includes("API key")) {
            errorMessage = "API authentication failed";
        } else if (error.message.includes("rate limit")) {
            errorMessage = "Rate limit exceeded. Please try again later";
        }

        res.status(500).json({ 
            error: errorMessage,
            status: "error"
        });
    }
});

// Health check endpoint
app.get("/health", (req, res) => {
    res.json({ status: "healthy" });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        error: "Something broke!",
        status: "error"
    });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});