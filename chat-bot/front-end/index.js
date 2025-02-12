document.getElementById("send-btn").addEventListener("click", sendMessage);
document.getElementById("user-input").addEventListener("keypress", function(event) {
    if (event.key === "Enter") {
        sendMessage();
    }
});


async function sendMessage() {
    const userInput = document.getElementById("user-input").value.trim();
    if (userInput === "") return;

    displayUserMessage(userInput);
    document.getElementById("user-input").value = "";

    try {
        const response = await fetch("https://chat-bot-le2b.onrender.com/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: userInput }),
        });

        const data = await response.json();
        const formattedData = formatResponse(data.response);
        await displayGeminiMessageWithAnimation(formattedData);
        
    } catch (error) {
        console.error("Error:", error);
        displayGeminiMessage("Error connecting to chatbot.");
    }
}

function displayUserMessage(text) {
    const chatBox = document.getElementById("conversations");
    const messageDiv = document.createElement('div');
    messageDiv.className = 'flex flex-col items-end space-y-2 mb-4 animate-fade-in';
    messageDiv.innerHTML = `
        <div class="flex items-center space-x-2">
            <div class="bg-blue-500 text-white px-4 py-2 rounded-lg max-w-[80%] break-words">
                ${text}
            </div>
            <img src="img/user.jpg" alt="User" class="w-8 h-8 rounded-full">
        </div>
        <span class="text-xs text-gray-500">${new Date().toLocaleTimeString()}</span>
    `;
    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

async function displayGeminiMessageWithAnimation(text) {
    const chatBox = document.getElementById("conversations");
    const messageDiv = document.createElement('div');
    messageDiv.className = 'flex flex-col items-start space-y-2 mb-4';
    
    // Create the message container with the bot icon
    messageDiv.innerHTML = `
        <div class="flex items-start space-x-2">
            <i class="fas fa-robot text-blue-500 text-2xl mt-2"></i>
            <div class="typing-container">
                <div class="bg-gray-100 px-4 py-2 rounded-lg max-w-[80%] break-words">
                    <div class="typing-content"></div>
                </div>
                <div class="typing-indicator">
                    <span class="dot"></span>
                    <span class="dot"></span>
                    <span class="dot"></span>
                </div>
            </div>
        </div>
        <span class="text-xs text-gray-500 ml-10">${new Date().toLocaleTimeString()}</span>
    `;

    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;

    // Get the content container
    const contentDiv = messageDiv.querySelector('.typing-content');
    const typingIndicator = messageDiv.querySelector('.typing-indicator');

    // Split the text into lines (for HTML content, split by tags)
    const lines = text.split(/(<[^>]*>)/g).filter(line => line.trim() !== '');
    
    // Function to add typing animation for text
    const typeText = async (text, element) => {
        const chars = text.split('');
        for (let char of chars) {
            element.innerHTML += char;
            await new Promise(resolve => setTimeout(resolve, 30)); // Adjust speed here
            chatBox.scrollTop = chatBox.scrollHeight;
        }
    };

    // Process each line
    for (let line of lines) {
        if (line.startsWith('<')) {
            // If it's an HTML tag, add it immediately
            contentDiv.innerHTML += line;
        } else {
            // If it's text content, animate it
            await typeText(line, contentDiv);
        }
    }

    // Remove typing indicator after completion
    typingIndicator.remove();
}

function formatResponse(responseText) {
    return responseText
        // Format headings
        .replace(/#{1,6} (.+)/g, (match, content) => {
            const level = match.charAt(0) === '#' ? match.match(/^#+/)[0].length : 1;
            const size = Math.max(4 - level, 1);
            return `<h${level} class="font-bold text-${size}xl my-3">${content}</h${level}>`;
        })
        // Format code blocks
        .replace(/```(\w+)?\n(.*?)\n```/gs, 
            '<pre class="bg-gray-800 text-white p-4 rounded-lg my-3 overflow-x-auto"><code>$2</code></pre>')
        // Format inline code
        .replace(/`([^`]+)`/g, '<code class="bg-gray-200 px-1 rounded">$1</code>')
        // Format bold text
        .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold">$1</strong>')
        // Format italic text
        .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
        // Format lists
        .replace(/^\s*[-*+]\s+(.+)/gm, '<li class="ml-4">• $1</li>')
        // Format paragraphs
        .replace(/(.+?)(\n\n|$)/g, '<p class="my-2">$1</p>')
        // Preserve line breaks
        .replace(/\n/g, '<br>');
}

// Add this CSS to your page
const style = document.createElement('style');
style.textContent = `
    @keyframes fade-in {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }

    .animate-fade-in {
        animation: fade-in 0.3s ease-out;
    }

    .typing-indicator {
        display: flex;
        padding: 8px;
        gap: 4px;
    }

    .dot {
        width: 8px;
        height: 8px;
        background-color: #3B82F6;
        border-radius: 50%;
        animation: bounce 1.4s infinite ease-in-out;
    }

    .dot:nth-child(1) { animation-delay: -0.32s; }
    .dot:nth-child(2) { animation-delay: -0.16s; }

    @keyframes bounce {
        0%, 80%, 100% { transform: scale(0); }
        40% { transform: scale(1); }
    }
`;
document.head.appendChild(style);

document.getElementById("send-btn").addEventListener("click", sendMessage);

// Add input focus on page load
window.addEventListener('load', () => {
    document.getElementById("user-input").focus();
});
