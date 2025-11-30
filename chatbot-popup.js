// JavaScript cho popup chatbot AI
document.addEventListener('DOMContentLoaded', function() {
    // Dữ liệu mẫu cho chatbot
    const chatbotData = {
        suggestions: [
            "Giới thiệu về tác phẩm 'Truyện Kiều'",
            "Phân tích nhân vật Chí Phèo",
            "So sánh thơ Hồ Xuân Hương và thơ Bà Huyện Thanh Quan",
            "Ý nghĩa của hình tượng 'lá' trong thơ Xuân Diệu",
            "Đặc điểm của văn học trung đại Việt Nam"
        ],
        welcomeMessage: "Xin chào! Tôi là trợ lý AI chuyên về văn học Việt Nam. Tôi có thể giúp bạn phân tích tác phẩm, tìm hiểu về tác giả, hoặc giải đáp các thắc mắc về văn học. Hãy đặt câu hỏi cho tôi!"
    };

    // Hàm khởi tạo chatbot
    function initChatbotPopup() {
        const popupContent = document.getElementById('popupContent');
        
        if (popupContent && document.getElementById('popupTitle').textContent === 'Chatbot AI') {
            // Tạo nội dung cho popup chatbot
            popupContent.innerHTML = `
                <div class="chatbot-popup">
                    <div class="chat-container">
                        <div class="chat-header">
                            <i class="fas fa-robot"></i>
                            <div>
                                <div>Trợ lý Văn học AI</div>
                                <div class="chat-status">
                                    <div class="status-dot"></div>
                                    <span>Đang trực tuyến</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="chat-messages" id="chatMessages">
                            <div class="message bot">
                                <div class="message-bubble">
                                    ${chatbotData.welcomeMessage}
                                    <div class="message-time">${getCurrentTime()}</div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="typing-indicator" id="typingIndicator">
                            <div class="typing-dots">
                                <div class="typing-dot"></div>
                                <div class="typing-dot"></div>
                                <div class="typing-dot"></div>
                            </div>
                        </div>
                        
                        <div class="chat-suggestions">
                            ${chatbotData.suggestions.map(suggestion => `
                                <div class="suggestion-chip" data-suggestion="${suggestion}">
                                    ${suggestion}
                                </div>
                            `).join('')}
                        </div>
                        
                        <div class="chat-input-area">
                            <textarea class="chat-input" id="chatInput" placeholder="Nhập câu hỏi của bạn..." rows="1"></textarea>
                            <button class="send-button" id="sendButton">
                                <i class="fas fa-paper-plane"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;

            // Thêm sự kiện cho chatbot
            setupChatbotEvents();
        }
    }

    // Hàm thiết lập sự kiện cho chatbot
    function setupChatbotEvents() {
        const chatInput = document.getElementById('chatInput');
        const sendButton = document.getElementById('sendButton');
        const chatMessages = document.getElementById('chatMessages');
        const typingIndicator = document.getElementById('typingIndicator');
        
        // Sự kiện gửi tin nhắn
        function sendMessage() {
            const message = chatInput.value.trim();
            if (message) {
                // Thêm tin nhắn người dùng
                addMessage(message, 'user');
                chatInput.value = '';
                
                // Hiển thị typing indicator
                showTypingIndicator();
                
                // Giả lập phản hồi từ AI (trong thực tế sẽ gọi API)
                setTimeout(() => {
                    hideTypingIndicator();
                    const response = generateAIResponse(message);
                    addMessage(response, 'bot');
                    scrollToBottom();
                }, 1500);
            }
        }
        
        // Sự kiện click nút gửi
        sendButton.addEventListener('click', sendMessage);
        
        // Sự kiện nhấn Enter để gửi (nhưng không gửi khi Shift+Enter)
        chatInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
            
            // Tự động điều chỉnh chiều cao textarea
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
        });
        
        // Sự kiện cho các gợi ý
        document.querySelectorAll('.suggestion-chip').forEach(chip => {
            chip.addEventListener('click', function() {
                const suggestion = this.getAttribute('data-suggestion');
                chatInput.value = suggestion;
                chatInput.focus();
            });
        });
        
        // Tự động focus vào input
        chatInput.focus();
    }

    // Hàm thêm tin nhắn vào chat
    function addMessage(text, sender) {
        const chatMessages = document.getElementById('chatMessages');
        const messageHTML = `
            <div class="message ${sender}">
                <div class="message-bubble">
                    ${text}
                    <div class="message-time">${getCurrentTime()}</div>
                </div>
            </div>
        `;
        chatMessages.innerHTML += messageHTML;
        scrollToBottom();
    }

    // Hàm hiển thị typing indicator
    function showTypingIndicator() {
        const typingIndicator = document.getElementById('typingIndicator');
        typingIndicator.style.display = 'block';
        scrollToBottom();
    }

    // Hàm ẩn typing indicator
    function hideTypingIndicator() {
        const typingIndicator = document.getElementById('typingIndicator');
        typingIndicator.style.display = 'none';
    }

    // Hàm cuộn xuống cuối chat
    function scrollToBottom() {
        const chatMessages = document.getElementById('chatMessages');
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Hàm lấy thời gian hiện tại
    function getCurrentTime() {
        const now = new Date();
        return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    }

    // Hàm tạo phản hồi AI (giả lập)
    function generateAIResponse(userMessage) {
        const responses = [
            "Đây là một câu hỏi thú vị về văn học. Dựa trên kiến thức của tôi, tôi có thể cung cấp một số thông tin sau...",
            "Tôi hiểu câu hỏi của bạn. Trong văn học Việt Nam, chủ đề này thường được thể hiện qua...",
            "Câu hỏi này liên quan đến một tác phẩm/tác giả nổi tiếng. Theo phân tích của tôi...",
            "Để trả lời câu hỏi này, chúng ta cần xem xét bối cảnh lịch sử và đặc điểm văn học của giai đoạn đó...",
            "Đây là một chủ đề phức tạp trong văn học. Tôi sẽ cố gắng giải thích ngắn gọn và dễ hiểu nhất có thể..."
        ];
        
        // Trong thực tế, đây sẽ là nơi gọi API AI thực sự
        return responses[Math.floor(Math.random() * responses.length)] + 
               " (Đây là phản hồi mẫu. Trong phiên bản thực tế, chatbot sẽ được tích hợp với API AI thực sự.)";
    }

    // Khởi tạo popup chatbot khi mở
    const originalOpenPopup = window.openPopup;
    window.openPopup = function(menuId) {
        originalOpenPopup(menuId);
        setTimeout(initChatbotPopup, 100);
    };

    // Khởi tạo ngay nếu popup đã mở
    if (document.getElementById('popupTitle').textContent === 'Chatbot AI') {
        initChatbotPopup();
    }
});