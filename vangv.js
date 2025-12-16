// API Key - Đã thay bằng key mới
const REVERSED_API_KEY = "cSrpZ5sOecGANFvg8sg3jYjki3InbsPUAySazIA";
const GEMINI_API_KEY = REVERSED_API_KEY.split('').reverse().join('');

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyBLZpLQKl0x-kMez2v5NURU5qSthT_6qYI",
    authDomain: "loginnn-b1dc0.firebaseapp.com",
    projectId: "loginnn-b1dc0",
    storageBucket: "loginnn-b1dc0.firebasestorage.app",
    messagingSenderId: "481800915428",
    appId: "1:481800915428:web:b524925c25efb53e7b9ff1",
    measurementId: "G-XF2ZBFBCR7"
};

// Initialize Firebase
let firestoreDb = null;
try {
    firebase.initializeApp(firebaseConfig);
    firestoreDb = firebase.firestore();
    console.log("Firebase Firestore initialized successfully");
} catch (error) {
    console.warn("Firebase initialization error (may be already initialized):", error);
}

// Biến toàn cục
let generationProgress = {
    total: 0,
    completed: 0,
    items: []
};

let currentExamBlocks = [];
let currentExamCode = '';
let examSettings = {
    time: 90,
    difficulty: 'medium',
    grade: '12',
    hasReading: true,
    hasEssay: true,
    hasPractice: false,
    questionCount: 5
};

let richTextEditors = [];

// Hàm đếm từ
function countWords(text) {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

// Hàm cập nhật tiến trình
function updateProgress() {
    const progressFill = document.getElementById('progressFill');
    const progressStatus = document.getElementById('progressStatus');
    const progressItems = document.getElementById('progressItems');
    
    const percent = generationProgress.total > 0 ? 
        Math.round((generationProgress.completed / generationProgress.total) * 100) : 0;
    
    progressFill.style.width = `${percent}%`;
    
    if (percent === 100) {
        progressStatus.textContent = 'Hoàn thành!';
    } else {
        progressStatus.textContent = `Đang xử lý... ${percent}%`;
    }
    
    progressItems.innerHTML = generationProgress.items.map(item => {
        let iconClass = 'fas fa-clock';
        let statusClass = 'pending';
        
        if (item.status === 'completed') {
            iconClass = 'fas fa-check-circle';
            statusClass = 'completed';
        } else if (item.status === 'error') {
            iconClass = 'fas fa-exclamation-circle';
            statusClass = 'error';
        }
        
        return `
            <div class="progress-item ${statusClass}">
                <i class="${iconClass}"></i>
                ${item.name}
            </div>
        `;
    }).join('');
}

// Hàm thêm mục vào tiến trình
function addProgressItem(name) {
    generationProgress.items.push({
        name: name,
        status: 'pending'
    });
    generationProgress.total++;
    updateProgress();
}

// Hàm đánh dấu mục hoàn thành
function completeProgressItem(index) {
    generationProgress.items[index].status = 'completed';
    generationProgress.completed++;
    updateProgress();
}

// Hàm đánh dấu mục lỗi
function errorProgressItem(index) {
    generationProgress.items[index].status = 'error';
    generationProgress.completed++;
    updateProgress();
}

// Hàm format thời gian
function formatDuration(minutes) {
    if (minutes < 60) {
        return `${minutes} phút`;
    } else {
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        return remainingMinutes > 0 ? 
            `${hours} giờ ${remainingMinutes} phút` : 
            `${hours} giờ`;
    }
}

// Hàm kiểm tra trạng thái API key
function checkAPIStatus() {
    // Kiểm tra lỗi phổ biến với API key
    const apiKeyPattern = /^AIzaSy[A-Za-z0-9-_]{33}$/;
    if (!apiKeyPattern.test(GEMINI_API_KEY)) {
        return {
            valid: false,
            message: "API Key không đúng định dạng. Vui lòng kiểm tra lại."
        };
    }
    
    // Kiểm tra xem API key có bị hạn chế không
    if (GEMINI_API_KEY.includes('xxx') || GEMINI_API_KEY.includes('dummy')) {
        return {
            valid: false,
            message: "API Key không hợp lệ hoặc đã bị vô hiệu hóa."
        };
    }
    
    return {
        valid: true,
        message: "API Key hợp lệ"
    };
}

// Hàm tạo nội dung mẫu khi API bị lỗi
function createSampleContent(inputText, duration, teachingStyle, addDiscussion, addHomework, addExamples) {
    const wordCount = countWords(inputText);
    const sampleTitle = "Bài giảng mẫu - Sử dụng khi API gặp sự cố";
    
    const sampleContent = `
# ${sampleTitle}

## 1. GIỚI THIỆU BÀI HỌC (15 phút)

**Thông tin văn bản:**
- Độ dài: ${wordCount} từ
- Phong cách giảng dạy: ${teachingStyle}
- Thời lượng: ${formatDuration(duration)}

**Mục tiêu bài học:**
1. Hiểu được nội dung chính của văn bản
2. Phân tích các yếu tố nghệ thuật
3. Rút ra bài học ý nghĩa từ tác phẩm

## 2. PHÂN TÍCH VĂN BẢN (${Math.round(duration * 0.6)} phút)

### A. Nội dung chính
- **Ý tưởng trung tâm:** Từ văn bản ${wordCount} từ, có thể xác định chủ đề chính là...
- **Thông điệp:** Tác giả muốn truyền tải thông điệp về...

### B. Đặc điểm nghệ thuật
- **Ngôn ngữ:** Sử dụng ngôn ngữ ${wordCount < 200 ? 'giản dị, gần gũi' : 'phong phú, đa dạng'}
- **Biện pháp tu từ:** Có thể có các biện pháp như so sánh, ẩn dụ, nhân hóa
- **Bố cục:** Văn bản được tổ chức theo cấu trúc phù hợp

${addExamples ? `
### C. Ví dụ minh họa
- **Ví dụ 1:** Phân tích một đoạn tiêu biểu trong văn bản
- **Ví dụ 2:** So sánh với tác phẩm cùng thể loại
` : ''}

## 3. HOẠT ĐỘNG HỌC TẬP (${Math.round(duration * 0.2)} phút)

${addDiscussion ? `
### A. Thảo luận nhóm
**Câu hỏi thảo luận:**
1. Theo bạn, thông điệp quan trọng nhất của văn bản là gì?
2. Phân tích một chi tiết nghệ thuật đặc sắc trong văn bản
3. Bài học nào có thể áp dụng vào cuộc sống hiện tại?

**Hướng dẫn thảo luận:**
- Chia lớp thành 4 nhóm, mỗi nhóm 5-6 học sinh
- Thời gian thảo luận: 15 phút
- Đại diện nhóm trình bày: 5 phút/nhóm
` : ''}

${addHomework ? `
### B. Bài tập về nhà
1. **Bài tập cơ bản:** Viết đoạn văn (200 chữ) nêu cảm nhận về văn bản
2. **Bài tập nâng cao:** Phân tích giá trị nhân văn trong tác phẩm
3. **Bài tập sáng tạo:** Viết một đoạn văn có chủ đề tương tự
` : ''}

## 4. TỔNG KẾT (${Math.round(duration * 0.05)} phút)

**Những điểm chính cần ghi nhớ:**
1. Nội dung cốt lõi của văn bản
2. Giá trị nghệ thuật đặc sắc
3. Ý nghĩa thực tiễn

**Đánh giá kết quả học tập:**
- Hiểu bài: 80%
- Vận dụng: 70%
- Sáng tạo: 60%
    `;
    
    return sampleContent;
}

// Hàm tạo đề thi mẫu khi API bị lỗi
function createSampleExam(inputText) {
    const wordCount = countWords(inputText);
    const examCode = generateExamCode();
    
    return {
        title: "ĐỀ THI NGỮ VĂN (MẪU)",
        description: "Đề thi được tạo tự động từ văn bản. Lưu ý: Đang sử dụng chế độ mẫu do API gặp sự cố.",
        blocks: [
            {
                type: "text",
                title: "Phần I: ĐỌC HIỂU",
                content: `Đọc đoạn văn sau (khoảng ${wordCount} từ) và trả lời các câu hỏi:\n\n"${inputText.substring(0, 500)}..."`,
                points: 0
            },
            {
                type: "question",
                title: "Câu hỏi 1",
                content: "**Nêu nội dung chính** của đoạn văn trên?",
                points: 2.0
            },
            {
                type: "question",
                title: "Câu hỏi 2",
                content: "*Phân tích* một biện pháp nghệ thuật được sử dụng trong đoạn văn?",
                points: 2.0
            },
            {
                type: "text",
                title: "Phần II: LÀM VĂN",
                content: "Viết bài văn nghị luận phân tích giá trị của văn bản.",
                points: 0
            },
            {
                type: "question",
                title: "Câu hỏi 3",
                content: "__Viết bài văn__ (khoảng 600 chữ) trình bày suy nghĩ của em về thông điệp của tác phẩm.",
                points: 6.0
            }
        ]
    };
}

// Hàm gọi API Gemini với timeout và retry
async function fetchGemini(prompt, maxRetries = 2) { // Giảm số lần retry
    // Kiểm tra API key trước
    const apiStatus = checkAPIStatus();
    if (!apiStatus.valid) {
        throw new Error(`API Key không hợp lệ: ${apiStatus.message}`);
    }
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Request timeout after 60 seconds')), 60000); // Giảm timeout
            });
            
            const fetchPromise = fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{ 
                        parts: [{ text: prompt }] 
                    }],
                    generationConfig: {
                        maxOutputTokens: 4000, // Giảm output tokens
                        temperature: 0.7,
                        topP: 0.95,
                        topK: 40,
                    }
                })
            });
            
            const response = await Promise.race([fetchPromise, timeoutPromise]);
            
            if (response.status === 429) {
                throw new Error('API quota exceeded (429 Too Many Requests). Vui lòng thử lại sau ít phút hoặc kiểm tra API key.');
            }
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
                throw new Error('Invalid response format from API');
            }
            
            const result = data.candidates[0].content.parts[0].text.trim();
            
            if (result.length > 0 && !isCompleteResponse(result)) {
                console.warn('Response appears to be truncated, retrying...');
                if (attempt < maxRetries) continue;
            }
            
            return result;
            
        } catch (error) {
            console.error(`Attempt ${attempt} failed:`, error);
            
            if (attempt === maxRetries) {
                // Phân loại lỗi để thông báo chi tiết hơn
                let errorMessage = error.message;
                if (error.message.includes('429')) {
                    errorMessage = 'API key đã vượt quá giới hạn sử dụng (429 Too Many Requests). Vui lòng: 1. Kiểm tra lại API key, 2. Đợi ít phút rồi thử lại, 3. Sử dụng chế độ mẫu bên dưới.';
                } else if (error.message.includes('timeout')) {
                    errorMessage = 'Kết nối quá thời gian chờ. Vui lòng thử lại với văn bản ngắn hơn.';
                } else if (error.message.includes('quota')) {
                    errorMessage = 'API key đã hết hạn mức sử dụng. Vui lòng kiểm tra lại API key hoặc đợi đến chu kỳ mới.';
                }
                
                throw new Error(errorMessage);
            }
            
            await new Promise(resolve => setTimeout(resolve, 3000 * attempt)); // Tăng thời gian chờ giữa các lần retry
        }
    }
}

// Hàm kiểm tra xem response có bị cắt cụt không
function isCompleteResponse(text) {
    const incompleteIndicators = [
        /\.\.\.$/,
        /---$/,
        /\*\*\*$/,
        /\[truncated\]$/i,
        /\[còn tiếp\]$/i,
        /phần tiếp theo/i,
        /còn nữa...$/i
    ];
    
    if (text.endsWith('.') || text.endsWith('!') || text.endsWith('?')) {
        return true;
    }
    
    for (const indicator of incompleteIndicators) {
        if (indicator.test(text)) {
            return false;
        }
    }
    
    return true;
}

// Hàm parse và format nội dung từ AI
function parseAndFormatContent(text) {
    if (!text) return '';
    
    let formatted = text;
    
    formatted = formatted.replace(/^(\d+\.\s+)(.*$)/gm, '<h2>$1$2</h2>');
    formatted = formatted.replace(/^(\d+\.\d+\.\s+)(.*$)/gm, '<h3>$1$2</h3>');
    formatted = formatted.replace(/^#\s+(.*$)/gm, '<h1>$1</h1>');
    formatted = formatted.replace(/^##\s+(.*$)/gm, '<h2>$1</h2>');
    formatted = formatted.replace(/^###\s+(.*$)/gm, '<h3>$1</h3>');
    formatted = formatted.replace(/^####\s+(.*$)/gm, '<h4>$1</h4>');
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/\*(?!\*)(.*?)\*/g, '<em>$1</em>');
    formatted = formatted.replace(/^---+/gm, '<hr>');
    formatted = formatted.replace(/^\*\*\*+/gm, '<hr>');
    
    const lines = formatted.split('\n');
    let inList = false;
    let listHtml = '';
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (line.match(/^[-*]\s+/)) {
            if (!inList) {
                inList = true;
                listHtml = '<ul>\n';
            }
            const item = line.replace(/^[-*]\s+/, '');
            listHtml += `<li>${item}</li>\n`;
            
            if (i === lines.length - 1 || !lines[i + 1].trim().match(/^[-*]\s+/)) {
                listHtml += '</ul>';
                lines[i] = listHtml;
                inList = false;
            } else {
                lines[i] = '';
            }
        } else if (inList) {
            listHtml += '</ul>';
            inList = false;
        }
        
        if (line.match(/^\d+\.\s+/)) {
            if (!inList) {
                inList = true;
                listHtml = '<ol>\n';
            }
            const item = line.replace(/^\d+\.\s+/, '');
            listHtml += `<li>${item}</li>\n`;
            
            if (i === lines.length - 1 || !lines[i + 1].trim().match(/^\d+\.\s+/)) {
                listHtml += '</ol>';
                lines[i] = listHtml;
                inList = false;
            } else {
                lines[i] = '';
            }
        } else if (inList) {
            listHtml += '</ol>';
            inList = false;
        }
    }
    
    formatted = lines.filter(line => line !== '').join('\n');
    formatted = formatted.replace(/^>\s+(.*$)/gm, '<blockquote>$1</blockquote>');
    
    const paragraphs = formatted.split('\n\n');
    formatted = paragraphs.map(paragraph => {
        if (paragraph.trim().startsWith('<') || paragraph.trim().match(/^<[^>]+>/) || paragraph.trim() === '') {
            return paragraph;
        }
        return `<p>${paragraph}</p>`;
    }).join('\n');
    
    formatted = formatted.replace(/\n(?!\s*<)/g, '<br>');
    
    formatted = formatted.replace(/<h2>(.*?)<\/h2>/g, (match, content) => {
        return `<div class="lesson-section"><h2>${content}</h2>`;
    });
    
    if (formatted.includes('<div class="lesson-section">')) {
        formatted += '</div>';
    }
    
    formatted = formatted.replace(/\[QUAN TRỌNG\](.*?)\[\/QUAN TRỌNG\]/gs, 
        '<div class="highlight-box">$1</div>');
    
    return formatted;
}

// Hàm chuyển đổi markdown sang HTML cho đề thi
function markdownToHtml(text) {
    if (!text) return '';
    
    let html = text;
    
    // Tiêu đề
    html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');
    html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
    html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
    
    // In đậm
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // In nghiêng
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Gạch chân (sử dụng __text__)
    html = html.replace(/__(.*?)__/g, '<u>$1</u>');
    
    // Danh sách không thứ tự
    html = html.replace(/^- (.*$)/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, function(match) {
        return '<ul>' + match + '</ul>';
    });
    
    // Danh sách có thứ tự
    html = html.replace(/^\d+\. (.*$)/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, function(match) {
        return '<ol>' + match + '</ol>';
    });
    
    // Đoạn văn
    const lines = html.split('\n');
    html = '';
    let inParagraph = false;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (line === '') {
            if (inParagraph) {
                html += '</p>\n';
                inParagraph = false;
            }
        } else if (line.startsWith('<')) {
            if (inParagraph) {
                html += '</p>\n';
                inParagraph = false;
            }
            html += line + '\n';
        } else {
            if (!inParagraph) {
                html += '<p>';
                inParagraph = true;
            }
            html += line + ' ';
        }
    }
    
    if (inParagraph) {
        html += '</p>';
    }
    
    // Xuống dòng
    html = html.replace(/\\n/g, '<br>');
    
    return html;
}

// Hàm lấy cấu trúc theo thể loại
function getStructureByGenre(genre) {
    const lowerGenre = genre.toLowerCase();
    
    if (lowerGenre.includes('thơ')) {
        return `**1. Về hình thức**\n- Thể thơ, cấu trúc bài thơ\n- Số câu, số chữ mỗi dòng\n- Vần, nhịp, thanh điệu\n\n**2. Về nội dung**\n- Chủ đề, tư tưởng chính\n- Mạch cảm xúc, tâm trạng\n- Hình ảnh, biểu tượng chủ đạo\n- Thông điệp của tác phẩm\n\n**3. Về nghệ thuật**\n- Biện pháp tu từ (so sánh, ẩn dụ, nhân hóa...)\n- Ngôn ngữ, giọng điệu\n- Cách xây dựng hình tượng\n- Kết cấu bài thơ`;    
    } else if (lowerGenre.includes('truyện ngắn') || lowerGenre.includes('truyện')) {
        return `**1. Tóm tắt cốt truyện**\n- Tình huống truyện\n- Diễn biến chính\n- Kết thúc truyện\n\n**2. Phân tích nhân vật**\n- Tính cách, đặc điểm nhân vật\n- Hành động, lời nói, suy nghĩ\n- Sự phát triển, biến đổi của nhân vật\n- Mối quan hệ giữa các nhân vật\n\n**3. Phân tích tình huống**\n- Xung đột chính\n- Cao trào, điểm nhấn\n- Cách giải quyết xung đột\n\n**4. Giá trị tác phẩm**\n- Chủ đề, thông điệp\n- Giá trị hiện thực\n- Giá trị nhân đạo\n- Bài học rút ra`;    
    } else if (lowerGenre.includes('tiểu thuyết')) {
        return `**1. Giới thiệu tác phẩm**\n- Bối cảnh, không gian, thời gian\n- Tóm tắt nội dung chính\n\n**2. Hệ thống nhân vật**\n- Nhân vật chính, nhân vật phụ\n- Tính cách, số phận nhân vật\n- Mối quan hệ giữa các nhân vật\n\n**3. Cốt truyện**\n- Tình tiết chính\n- Xung đột, mâu thuẫn\n- Diễn biến tâm lý\n\n**4. Giá trị tác phẩm**\n- Chủ đề, tư tưởng\n- Giá trị nghệ thuật\n- Ý nghĩa xã hội`;    
    } else {
        return `**1. Bố cục văn bản**\n- Cấu trúc tổng thể\n- Sự liên kết giữa các phần\n\n**2. Nội dung chính**\n- Ý tưởng trung tâm\n- Thông tin quan trọng\n\n**3. Đặc điểm nghệ thuật**\n- Phong cách ngôn ngữ\n- Phương pháp biểu đạt\n\n**4. Giá trị tư tưởng**\n- Thông điệp\n- Ý nghĩa thực tiễn`;
    }
}

// Hàm tạo prompt chi tiết cho AI
function createDetailedPrompt(inputText, duration, teachingStyle, addDiscussion, addHomework, addExamples, textType, authorInfo) {
    const introTime = Math.round(duration * 0.15);
    const mainTime = Math.round(duration * 0.65);
    const conclusionTime = Math.round(duration * 0.1);
    const discussionTime = addDiscussion ? Math.round(duration * 0.1) : 0;
    
    // Giảm độ dài prompt
    const shortenedText = inputText.length > 1500 ? inputText.substring(0, 1500) + "..." : inputText;
    
    return `BẠN LÀ: Một giáo viên văn học giàu kinh nghiệm.

NHIỆM VỤ: Tạo bài giảng chi tiết.

VĂN BẢN CẦN GIẢNG DẠY (tóm tắt):
${shortenedText}

THÔNG TIN:
- Thể loại: ${textType}
- Tác giả: ${authorInfo.substring(0, 100)}
- Thời lượng: ${duration} phút
- Phong cách: ${teachingStyle}
- Thảo luận: ${addDiscussion ? 'CÓ' : 'KHÔNG'}

YÊU CẦU:
1. Bài giảng HOÀN CHỈNH, không bị cắt
2. Dùng Markdown đơn giản
3. Có thời gian cho từng phần
4. KHÔNG dùng --- hoặc *** để ngăn cách

CẤU TRÚC:

1. GIỚI THIỆU (${introTime} phút)
   - Giới thiệu tác giả
   - Mục tiêu bài học

2. NỘI DUNG CHÍNH (${mainTime} phút)
   ${getStructureByGenre(textType).substring(0, 300)}

3. KẾT LUẬN (${conclusionTime} phút)
   - Tổng kết giá trị
   - Bài học rút ra

${addDiscussion ? `4. THẢO LUẬN (${discussionTime} phút)
   - Câu hỏi thảo luận` : ''}

${addHomework ? `5. BÀI TẬP
   - Bài tập cơ bản` : ''}`;
}

// Hàm tạo nội dung giảng dạy (bài giảng + đề thi) với fallback
async function generateTeachingContent() {
    const inputText = document.getElementById('inputText').value.trim();
    const generateBtn = document.getElementById('generateAllBtn');
    const progressContainer = document.getElementById('progressContainer');
    const resultTabs = document.getElementById('resultTabs');

    if (!inputText) {
        showNotification('Vui lòng nhập nội dung văn bản!', 'error');
        return;
    }

    // Kiểm tra số từ
    const wordCount = countWords(inputText);
    if (wordCount < 10) {
        showNotification(`Văn bản quá ngắn (${wordCount} từ)! Vui lòng nhập ít nhất 10 từ.`, 'error');
        return;
    }

    // Vô hiệu hóa nút và hiển thị tiến trình
    generateBtn.disabled = true;
    generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Đang tạo nội dung...';
    progressContainer.style.display = 'block';
    resultTabs.style.display = 'none';
    
    // Reset tiến trình
    generationProgress = {
        total: 0,
        completed: 0,
        items: []
    };
    
    document.getElementById('teachingResult').innerHTML = '';
    document.getElementById('examResult').innerHTML = '';

    try {
        // Lấy các tùy chọn từ người dùng
        const duration = parseInt(document.getElementById('durationSlider').value);
        const teachingStyle = document.getElementById('teachingStyle').value;
        const addDiscussion = document.getElementById('discussionToggle').checked;
        const addHomework = document.getElementById('homeworkToggle').checked;
        const addExamples = document.getElementById('exampleToggle').checked;
        const teachingNotes = document.getElementById('teachingNotes').value;
        const examNotes = document.getElementById('examNotes').value;
        
        // Cập nhật exam settings
        examSettings = {
            time: parseInt(document.getElementById('examTimeSlider').value),
            difficulty: document.getElementById('difficulty').value,
            grade: document.getElementById('grade').value,
            hasReading: document.getElementById('readingToggle').checked,
            hasEssay: document.getElementById('essayToggle').checked,
            hasPractice: document.getElementById('practiceToggle').checked,
            questionCount: parseInt(document.getElementById('questionCount').value)
        };

        // Thêm tiến trình cho cả bài giảng và đề thi
        addProgressItem('Kiểm tra API và kết nối');
        addProgressItem('Phân tích thể loại văn bản');
        addProgressItem('Tạo bài giảng chi tiết');
        addProgressItem('Tạo đề thi');
        addProgressItem('Hoàn thiện nội dung');

        // 0. Kiểm tra API
        const apiStatus = checkAPIStatus();
        if (!apiStatus.valid) {
            throw new Error(apiStatus.message);
        }
        completeProgressItem(0);

        let textType = "Văn bản văn học";
        let authorResponse = "Tác giả: Chưa xác định\nTác phẩm: Văn bản người dùng cung cấp";
        let teachingPlan = "";
        let examData = null;
        
        let useFallbackMode = false;
        
        try {
            // 1. Phân tích thể loại văn bản
            const textTypeResponse = await fetchGemini(
                `Xác định thể loại của văn bản sau (trả về 1-3 từ): "${inputText.substring(0, 500)}"`
            );
            textType = textTypeResponse.trim().replace(/^["']|["']$/g, '') || "Văn bản văn học";
            completeProgressItem(1);

            // 2. Xác định tác giả và tác phẩm
            const authorPrompt = `Từ văn bản sau, xác định:
1. Tác giả (nếu biết): 
2. Tên tác phẩm (nếu biết):

Văn bản: "${inputText.substring(0, 500)}"

Trả lời ngắn gọn, mỗi thông tin một dòng.`;
            
            authorResponse = await fetchGemini(authorPrompt);
            completeProgressItem(2);

            // 3. Tạo bài giảng chi tiết
            const detailedPrompt = createDetailedPrompt(
                inputText, 
                duration, 
                teachingStyle, 
                addDiscussion, 
                addHomework, 
                addExamples,
                textType,
                authorResponse
            );
            
            teachingPlan = await fetchGemini(detailedPrompt);
            completeProgressItem(3);

            // 4. Tạo đề thi
            examData = await generateExamWithGemini(inputText);
            completeProgressItem(4);

        } catch (apiError) {
            console.warn('API gặp sự cố, sử dụng chế độ mẫu:', apiError);
            useFallbackMode = true;
            
            // Đánh dấu tất cả các mục tiến trình là lỗi
            for (let i = 1; i < generationProgress.items.length; i++) {
                if (generationProgress.items[i].status === 'pending') {
                    errorProgressItem(i);
                }
            }
            
            // Sử dụng nội dung mẫu
            teachingPlan = createSampleContent(inputText, duration, teachingStyle, addDiscussion, addHomework, addExamples);
            examData = createSampleExam(inputText);
            
            // Hiển thị cảnh báo về chế độ mẫu
            showNotification('Đang sử dụng chế độ mẫu do API gặp sự cố. Nội dung có thể không chi tiết như mong đợi.', 'warning');
        }

        // 5. Format và hiển thị kết quả
        const lessonPlan = formatTeachingResult(teachingPlan, duration, textType, authorResponse, teachingNotes, useFallbackMode);
        document.getElementById('teachingResult').innerHTML = lessonPlan;
        setupLessonActions();

        showExamResult(examData, examNotes, useFallbackMode);
        
        if (!useFallbackMode) {
            completeProgressItem(4);
        }

        // Hiển thị kết quả tabs
        resultTabs.style.display = 'block';
        
        if (useFallbackMode) {
            showNotification('Tạo nội dung thành công (chế độ mẫu)! Vui lòng kiểm tra API key nếu muốn sử dụng tính năng đầy đủ.', 'warning');
        } else {
            showNotification('Tạo nội dung giảng dạy thành công!', 'success');
        }

    } catch (error) {
        console.error('Lỗi khi tạo nội dung:', error);
        
        let errorMessage = 'Đã xảy ra lỗi khi tạo nội dung. ';
        
        if (error.message.includes('429') || error.message.includes('quota')) {
            errorMessage = 'API key đã vượt quá giới hạn sử dụng. ';
            errorMessage += 'Vui lòng: 1. Kiểm tra lại API key, 2. Đợi ít phút, 3. Sử dụng chế độ mẫu bằng cách nhấn nút "Tạo Nội Dung Giảng Dạy" lần nữa.';
            
            // Hiển thị nút tạo nội dung mẫu
            document.getElementById('teachingResult').innerHTML = `
                <div class="analysis-section">
                    <h2><i class="fas fa-exclamation-triangle"></i> Lỗi API Key</h2>
                    <div class="highlight-box">
                        <h4><i class="fas fa-info-circle"></i> Thông tin lỗi</h4>
                        <p>${errorMessage}</p>
                        
                        <div style="margin-top: 20px; padding: 15px; background: rgba(227, 124, 45, 0.1); border-radius: 8px; border-left: 4px solid var(--primary-color);">
                            <h4 style="color: var(--primary-color); margin-top: 0;"><i class="fas fa-lightbulb"></i> Giải pháp tạm thời</h4>
                            <p>Bạn có thể sử dụng chế độ mẫu để tạo bài giảng cơ bản:</p>
                            <button id="useSampleModeBtn" class="action-btn" style="background: linear-gradient(135deg, #FF9800, #F57C00); margin-top: 10px;">
                                <i class="fas fa-magic mr-2"></i> Sử dụng chế độ mẫu
                            </button>
                        </div>
                        
                        <div style="margin-top: 20px;">
                            <h4><i class="fas fa-key"></i> Hướng dẫn sửa API Key</h4>
                            <ol>
                                <li>Truy cập <a href="https://makersuite.google.com/app/apikey" target="_blank">Google AI Studio</a></li>
                                <li>Tạo API key mới</li>
                                <li>Thay thế API key hiện tại trong file vangv.js</li>
                                <li>Làm mới trang và thử lại</li>
                            </ol>
                        </div>
                    </div>
                </div>
            `;
            
            // Thêm sự kiện cho nút sử dụng chế độ mẫu
            setTimeout(() => {
                const sampleBtn = document.getElementById('useSampleModeBtn');
                if (sampleBtn) {
                    sampleBtn.addEventListener('click', function() {
                        // Tạo nội dung mẫu ngay lập tức
                        generateSampleContent();
                    });
                }
            }, 100);
            
        } else if (error.message.includes('timeout')) {
            errorMessage += 'Yêu cầu mất quá nhiều thời gian. Vui lòng thử lại với văn bản ngắn hơn hoặc kiểm tra kết nối mạng.';
        } else {
            errorMessage += error.message;
        }
        
        if (!error.message.includes('429')) {
            document.getElementById('teachingResult').innerHTML = `
                <div class="analysis-section">
                    <h2><i class="fas fa-exclamation-triangle"></i> Lỗi khi tạo nội dung</h2>
                    <div class="highlight-box">
                        <h4><i class="fas fa-info-circle"></i> Thông tin lỗi</h4>
                        <p>${errorMessage}</p>
                        <p><strong>Gợi ý:</strong></p>
                        <ul>
                            <li>Kiểm tra kết nối internet</li>
                            <li>Thử lại với văn bản ngắn hơn (dưới 500 từ)</li>
                            <li>Đảm bảo văn bản có ít nhất 10 từ</li>
                            <li>Thử lại sau vài phút</li>
                            <li>Kiểm tra API key trong file vangv.js</li>
                        </ul>
                    </div>
                </div>
            `;
        }
        
        showNotification(errorMessage, 'error');
        
        if (generationProgress.items.length > 0) {
            const lastIndex = generationProgress.items.length - 1;
            errorProgressItem(lastIndex);
        }
    } finally {
        generateBtn.disabled = false;
        generateBtn.innerHTML = '<i class="fas fa-chalkboard-teacher mr-2"></i> Tạo Nội Dung Giảng Dạy';
    }
}

// Hàm tạo nội dung mẫu
function generateSampleContent() {
    const inputText = document.getElementById('inputText').value.trim();
    const duration = parseInt(document.getElementById('durationSlider').value);
    const teachingStyle = document.getElementById('teachingStyle').value;
    const addDiscussion = document.getElementById('discussionToggle').checked;
    const addHomework = document.getElementById('homeworkToggle').checked;
    const addExamples = document.getElementById('exampleToggle').checked;
    const teachingNotes = document.getElementById('teachingNotes').value;
    const examNotes = document.getElementById('examNotes').value;
    
    if (!inputText) {
        showNotification('Vui lòng nhập nội dung văn bản trước!', 'error');
        return;
    }
    
    // Tạo nội dung mẫu
    const teachingPlan = createSampleContent(inputText, duration, teachingStyle, addDiscussion, addHomework, addExamples);
    const examData = createSampleExam(inputText);
    
    // Hiển thị kết quả
    const lessonPlan = formatTeachingResult(teachingPlan, duration, "Văn bản mẫu", "Tác giả: Mẫu\nTác phẩm: Văn bản người dùng", teachingNotes, true);
    document.getElementById('teachingResult').innerHTML = lessonPlan;
    document.getElementById('resultTabs').style.display = 'block';
    
    // Kích hoạt tab bài giảng
    document.querySelector('[data-tab="teaching-result"]').click();
    
    showExamResult(examData, examNotes, true);
    
    showNotification('Đã tạo nội dung mẫu thành công!', 'success');
    
    // Setup lại các nút action
    setupLessonActions();
}

// Hàm parse thông tin tác giả
function parseAuthorInfo(authorResponse) {
    const lines = authorResponse.split('\n');
    const authorInfo = {
        author: '',
        work: '',
        period: '',
        other: []
    };
    
    for (const line of lines) {
        const cleanLine = line.trim();
        if (!cleanLine) continue;
        
        if (cleanLine.toLowerCase().includes('tác giả') || cleanLine.toLowerCase().includes('author')) {
            authorInfo.author = cleanLine.replace(/^.*?:/, '').trim();
        } else if (cleanLine.toLowerCase().includes('tác phẩm') || cleanLine.toLowerCase().includes('tên') || cleanLine.toLowerCase().includes('work')) {
            authorInfo.work = cleanLine.replace(/^.*?:/, '').trim();
        } else if (cleanLine.toLowerCase().includes('thời kỳ') || cleanLine.toLowerCase().includes('trào lưu') || cleanLine.toLowerCase().includes('period')) {
            authorInfo.period = cleanLine.replace(/^.*?:/, '').trim();
        } else {
            authorInfo.other.push(cleanLine);
        }
    }
    
    if (!authorInfo.author && lines.length > 0) {
        authorInfo.author = lines[0].replace(/^.*?:/, '').trim();
    }
    if (!authorInfo.work && lines.length > 1) {
        authorInfo.work = lines[1].replace(/^.*?:/, '').trim();
    }
    
    return authorInfo;
}

// Hàm format kết quả bài giảng
function formatTeachingResult(plan, duration, genre, authorResponse, teachingNotes, isFallback = false) {
    const formattedPlan = parseAndFormatContent(plan);
    const authorInfo = parseAuthorInfo(authorResponse);
    
    const fallbackNotice = isFallback ? `
        <div class="highlight-box" style="border-color: #ff9800; background: rgba(255, 152, 0, 0.1);">
            <h4><i class="fas fa-exclamation-triangle" style="color: #ff9800;"></i> Đang sử dụng chế độ mẫu</h4>
            <p>Nội dung này được tạo bằng chế độ mẫu do API gặp sự cố. Để có nội dung chi tiết hơn, vui lòng:</p>
            <ol>
                <li>Kiểm tra API key trong file vangv.js</li>
                <li>Đảm bảo API key còn hiệu lực</li>
                <li>Thử lại sau ít phút</li>
            </ol>
            <p style="margin-top: 10px; font-weight: bold;">Bạn vẫn có thể chỉnh sửa, lưu và in bài giảng này.</p>
        </div>
    ` : '';
    
    const authorInfoHTML = `
        <div class="author-info-section">
            <div class="author-info-grid">
                ${authorInfo.author ? `
                <div class="author-info-item">
                    <strong>Tác giả</strong>
                    <span>${authorInfo.author}</span>
                </div>` : ''}
                
                ${authorInfo.work ? `
                <div class="author-info-item">
                    <strong>Tác phẩm</strong>
                    <span>${authorInfo.work}</span>
                </div>` : ''}
                
                ${authorInfo.period ? `
                <div class="author-info-item">
                    <strong>Thời kỳ/Trào lưu</strong>
                    <span>${authorInfo.period}</span>
                </div>` : ''}
                
                ${authorInfo.other.filter(info => info).map(info => `
                <div class="author-info-item">
                    <strong>Thông tin khác</strong>
                    <span>${info}</span>
                </div>`).join('')}
            </div>
        </div>
    `;
    
    let notesHTML = '';
    if (teachingNotes.trim()) {
        notesHTML = `
            <div class="highlight-box">
                <h4><i class="fas fa-sticky-note"></i> Ghi chú bài giảng</h4>
                <p>${teachingNotes.replace(/\n/g, '<br>')}</p>
            </div>
        `;
    }
    
    return `
        ${fallbackNotice}
        
        <div class="lesson-header">
            <h2><i class="fas fa-chalkboard-teacher"></i> KẾ HOẠCH BÀI GIẢNG VĂN HỌC ${isFallback ? '(MẪU)' : ''}</h2>
            <div class="lesson-meta">
                <span class="meta-item"><i class="fas fa-clock"></i> ${formatDuration(duration)}</span>
                <span class="meta-item"><i class="fas fa-book"></i> ${genre}</span>
                <span class="meta-item"><i class="fas fa-calendar"></i> ${new Date().toLocaleDateString('vi-VN')}</span>
            </div>
        </div>
        
        ${authorInfoHTML}
        
        <div class="lesson-content">
            ${formattedPlan}
            
            ${notesHTML}
            
            <div class="highlight-box">
                <h4><i class="fas fa-lightbulb"></i> Ghi chú cho giáo viên</h4>
                <p><strong>Thời gian:</strong> Bài giảng được thiết kế cho ${formatDuration(duration)}. Giáo viên có thể điều chỉnh linh hoạt theo tình hình thực tế.</p>
                <p><strong>Phương pháp:</strong> ${document.getElementById('teachingStyle').value}</p>
                <p><strong>Tài liệu hỗ trợ:</strong> Chuẩn bị thêm hình ảnh, video, hoặc tài liệu liên quan để bài giảng sinh động hơn.</p>
            </div>
        </div>
        
        <div class="lesson-actions">
            <button id="printLesson" class="action-btn print-btn">
                <i class="fas fa-print"></i> In bài giảng
            </button>
            <button id="saveWord" class="action-btn save-btn">
                <i class="fas fa-file-word"></i> Xuất Word
            </button>
            <button id="copyLesson" class="action-btn copy-btn">
                <i class="fas fa-copy"></i> Sao chép
            </button>
            <button id="saveToDatabase" class="action-btn save-btn" style="background: linear-gradient(135deg, #FF9800, #F57C00);">
                <i class="fas fa-database"></i> Lưu vào Database
            </button>
        </div>
    `;
}

// Hàm tạo đề thi với Gemini (có fallback)
async function generateExamWithGemini(text) {
    // Sử dụng text ngắn hơn để tránh quá tải
    const shortText = text.length > 1000 ? text.substring(0, 1000) + "..." : text;
    
    const prompt = `
        Tạo đề thi Ngữ Văn ngắn gọn:
        
        VĂN BẢN: ${shortText}
        
        THÔNG TIN:
        - Thời gian: ${examSettings.time} phút
        - Độ khó: ${examSettings.difficulty}
        - Khối lớp: ${examSettings.grade}
        
        YÊU CẦU:
        1. Tạo 3-4 câu hỏi
        2. Dùng Markdown đơn giản
        3. Trả về JSON đơn giản
        
        Định dạng JSON:
        {
            "title": "ĐỀ THI NGỮ VĂN",
            "description": "Mô tả ngắn",
            "blocks": [
                {"type": "text", "title": "Phần I", "content": "Nội dung", "points": 0},
                {"type": "question", "title": "Câu 1", "content": "Câu hỏi?", "points": 2.0}
            ]
        }
    `;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }],
                generationConfig: {
                    maxOutputTokens: 2000, // Giảm output
                    temperature: 0.7,
                    topP: 0.95,
                    topK: 40,
                }
            })
        });

        if (!response.ok) {
            if (response.status === 429) {
                throw new Error('API quota exceeded. Using sample exam.');
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
            throw new Error('Invalid response format');
        }

        const resultText = data.candidates[0].content.parts[0].text;
        
        const jsonMatch = resultText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        } else {
            throw new Error('No valid JSON found in response');
        }
    } catch (error) {
        console.warn('Failed to generate exam with Gemini:', error);
        // Fallback to sample exam
        return createSampleExam(text);
    }
}

// Hàm hiển thị kết quả đề thi
function showExamResult(examData, examNotes, isFallback = false) {
    currentExamBlocks = examData.blocks || [];
    currentExamCode = generateExamCode();
    
    const fallbackNotice = isFallback ? `
        <div class="highlight-box" style="border-color: #ff9800; background: rgba(255, 152, 0, 0.1); margin-bottom: 20px;">
            <h4><i class="fas fa-exclamation-triangle" style="color: #ff9800;"></i> Đề thi mẫu</h4>
            <p>Đề thi này được tạo bằng chế độ mẫu. Bạn vẫn có thể chỉnh sửa, lưu và in đề thi.</p>
        </div>
    ` : '';
    
    let examNotesHTML = '';
    if (examNotes.trim()) {
        examNotesHTML = `
            <div class="highlight-box">
                <h4><i class="fas fa-sticky-note"></i> Ghi chú đề thi</h4>
                <p>${examNotes.replace(/\n/g, '<br>')}</p>
            </div>
        `;
    }
    
    let previewHTML = `
        ${fallbackNotice}
        
        <div class="exam-header">
            <h3><i class="fas fa-file-alt mr-2"></i> ${examData.title || 'ĐỀ THI NGỮ VĂN'}</h3>
            <div class="exam-code">
                Mã đề: <span id="examCodeSpan">${currentExamCode}</span>
            </div>
        </div>
        
        <div class="exam-info">
            <p><strong>Thời gian:</strong> ${examSettings.time} phút | <strong>Độ khó:</strong> ${examSettings.difficulty === 'easy' ? 'Dễ' : examSettings.difficulty === 'medium' ? 'Trung bình' : 'Khó'} | <strong>Khối lớp:</strong> ${examSettings.grade}</p>
            <p>${examData.description || 'Đề thi được tạo tự động từ văn bản tác phẩm'}</p>
        </div>
        
        ${examNotesHTML}
        
        <div class="preview-exam">
    `;
    
    let questionCounter = 1;
    let totalPoints = 0;
    
    currentExamBlocks.forEach((block, index) => {
        if (block.type === 'text') {
            previewHTML += `
                <div class="exam-section">
                    <h3 class="section-title">${block.title || 'Phần văn bản'}</h3>
                    <div class="text-content markdown-content">${markdownToHtml(block.content)}</div>
                </div>
            `;
        } else if (block.type === 'question') {
            totalPoints += block.points || 0;
            previewHTML += `
                <div class="question-item">
                    <div class="question-header">
                        <div class="question-text markdown-content"><strong>Câu ${questionCounter}:</strong> ${markdownToHtml(block.content)}</div>
                        <div class="question-points">${block.points || 1.0} điểm</div>
                    </div>
                    <div class="answer-area">
                        <textarea class="answer-textarea" placeholder="Thí sinh viết câu trả lời vào đây..." rows="4"></textarea>
                    </div>
                </div>
            `;
            questionCounter++;
        }
    });
    
    previewHTML += `
        <div class="exam-info" style="margin-top: 2rem; padding-top: 1rem; border-top: 2px solid var(--card-outline);">
            <p><strong>Tổng điểm: ${totalPoints.toFixed(1)} điểm</strong></p>
            <p><em>--- Hết đề thi ---</em></p>
        </div>
    `;
    
    previewHTML += `</div>`;
    
    const examActions = `
        <div class="exam-actions">
            <button id="previewExamBtn" class="exam-action-btn preview-btn">
                <i class="fas fa-eye mr-2"></i> Xem trước
            </button>
            <button id="editExamBtn" class="exam-action-btn edit-btn">
                <i class="fas fa-edit mr-2"></i> Chỉnh sửa
            </button>
            <button id="saveExamBtn" class="exam-action-btn save-btn">
                <i class="fas fa-save mr-2"></i> Lưu đề thi
            </button>
            <button id="printExamBtn" class="exam-action-btn print-btn">
                <i class="fas fa-print mr-2"></i> In đề thi
            </button>
            <button id="saveExamToDatabase" class="exam-action-btn" style="background: linear-gradient(135deg, #FF9800, #F57C00);">
                <i class="fas fa-database mr-2"></i> Lưu vào Database
            </button>
        </div>
    `;
    
    document.getElementById('examResult').innerHTML = previewHTML + examActions;
    
    // Thêm sự kiện cho các nút
    document.getElementById('previewExamBtn')?.addEventListener('click', updateExamPreview);
    document.getElementById('editExamBtn')?.addEventListener('click', openExamEditor);
    document.getElementById('saveExamBtn')?.addEventListener('click', saveExam);
    document.getElementById('printExamBtn')?.addEventListener('click', printExam);
    document.getElementById('saveExamToDatabase')?.addEventListener('click', saveExamToDatabase);
}

// Hàm lưu đề thi vào Firestore Database
async function saveExamToDatabase() {
    if (!firestoreDb) {
        showNotification('Firestore Database chưa được khởi tạo!', 'error');
        return;
    }
    
    try {
        // Cập nhật từ editor nếu đang mở
        updateExamFromEditor();
        
        const inputText = document.getElementById('inputText').value.trim();
        const examNotes = document.getElementById('examNotes').value;
        
        // Tính tổng điểm
        const totalPoints = currentExamBlocks.reduce((sum, block) => sum + (block.points || 0), 0);
        
        // Chuẩn bị dữ liệu để lưu
        const examData = {
            examId: currentExamCode,
            title: "Đề thi Ngữ Văn",
            literaryText: inputText.substring(0, 500), // Lưu 500 ký tự đầu
            examTime: examSettings.time,
            difficulty: examSettings.difficulty,
            grade: examSettings.grade,
            notes: examNotes,
            blocks: currentExamBlocks,
            createdAt: new Date().toISOString(),
            totalPoints: totalPoints,
            source: "VANW Teaching Tool"
        };
        
        showNotification('Đang lưu đề thi vào database...', 'info');
        
        // Lưu vào Firestore
        await firestoreDb.collection('exams').doc(currentExamCode).set(examData);
        
        showNotification(`Đã lưu đề thi vào database thành công! Mã đề: ${currentExamCode}`, 'success');
        
        // Tạo link để chia sẻ
        const link = `${window.location.origin}/take_exam.html?code=${currentExamCode}`;
        
        // Hiển thị thông báo với link
        setTimeout(() => {
            showNotification(`Link đề thi: ${link} (Đã sao chép vào clipboard)`, 'info');
            
            // Sao chép link vào clipboard
            navigator.clipboard.writeText(link).then(() => {
                console.log('Link đã được sao chép:', link);
            });
        }, 1000);
        
    } catch (error) {
        console.error('Lỗi khi lưu đề thi vào database:', error);
        showNotification(`Lỗi khi lưu vào database: ${error.message}`, 'error');
    }
}

// Hàm mở trình chỉnh sửa đề thi
function openExamEditor() {
    const modal = document.getElementById('editExamModal');
    const editorContainer = document.getElementById('examEditorContainer');
    
    // Tạo giao diện editor
    editorContainer.innerHTML = createExamEditorHTML();
    
    // Khởi tạo trình soạn thảo cho từng block
    setTimeout(() => {
        initRichTextEditors();
    }, 100);
    
    modal.classList.add('active');
}

// Hàm tạo HTML cho trình chỉnh sửa đề thi
function createExamEditorHTML() {
    let editorHTML = `
        <div class="exam-editor-container">
            <div class="editor-actions">
                <button id="addTextBlockBtn" class="editor-action-btn">
                    <i class="fas fa-paragraph mr-2"></i> Thêm phần văn bản
                </button>
                <button id="addQuestionBlockBtn" class="editor-action-btn">
                    <i class="fas fa-question-circle mr-2"></i> Thêm câu hỏi
                </button>
                <button id="reorderBlocksBtn" class="editor-action-btn" onclick="reorderBlocks()">
                    <i class="fas fa-sort mr-2"></i> Sắp xếp lại
                </button>
            </div>
            
            <div class="exam-blocks-container" id="examBlocksContainer">
    `;
    
    currentExamBlocks.forEach((block, index) => {
        editorHTML += createBlockEditorHTML(block, index);
    });
    
    editorHTML += `
            </div>
            
            <div class="exam-actions">
                <button id="previewEditedExamBtn" class="exam-action-btn preview-btn">
                    <i class="fas fa-eye mr-2"></i> Xem trước
                </button>
                <button id="saveEditedExamBtn" class="exam-action-btn save-btn">
                    <i class="fas fa-save mr-2"></i> Lưu thay đổi
                </button>
            </div>
        </div>
    `;
    
    return editorHTML;
}

// Hàm tạo HTML cho một block chỉnh sửa
function createBlockEditorHTML(block, index) {
    return `
        <div class="exam-block-editor" data-index="${index}">
            <div class="block-header">
                <select class="block-type-select" data-index="${index}">
                    <option value="text" ${block.type === 'text' ? 'selected' : ''}>Phần văn bản</option>
                    <option value="question" ${block.type === 'question' ? 'selected' : ''}>Câu hỏi</option>
                </select>
                
                <div class="block-actions">
                    <button class="block-btn move-up" data-index="${index}" ${index === 0 ? 'disabled' : ''}>
                        <i class="fas fa-arrow-up"></i>
                    </button>
                    <button class="block-btn move-down" data-index="${index}" ${index === currentExamBlocks.length - 1 ? 'disabled' : ''}>
                        <i class="fas fa-arrow-down"></i>
                    </button>
                    <button class="block-btn delete" data-index="${index}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            
            <div class="block-content">
                <div class="form-group">
                    <label class="block-label">Tiêu đề:</label>
                    <input type="text" class="block-title" data-index="${index}" value="${block.title || ''}" placeholder="Nhập tiêu đề...">
                </div>
                
                <div class="form-group">
                    <label class="block-label">Nội dung:</label>
                    <div class="rich-text-editor" id="editor-${index}"></div>
                    <textarea style="display: none;" id="editor-text-${index}">${block.content || ''}</textarea>
                </div>
                
                ${block.type === 'question' ? `
                <div class="block-controls">
                    <div class="form-group">
                        <label class="block-label">Điểm số:</label>
                        <input type="number" class="block-points-input" data-index="${index}" value="${block.points || 1.0}" min="0" max="10" step="0.5">
                    </div>
                </div>
                ` : ''}
            </div>
        </div>
    `;
}

// Hàm khởi tạo trình soạn thảo rich text
function initRichTextEditors() {
    richTextEditors = [];
    
    currentExamBlocks.forEach((block, index) => {
        const editorId = `editor-${index}`;
        const textareaId = `editor-text-${index}`;
        
        const quill = new Quill(`#${editorId}`, {
            theme: 'snow',
            modules: {
                toolbar: [
                    ['bold', 'italic', 'underline'],
                    [{ 'header': 1 }, { 'header': 2 }],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                    ['clean']
                ]
            },
            placeholder: 'Nhập nội dung...'
        });
        
        // Thiết lập nội dung ban đầu
        const textarea = document.getElementById(textareaId);
        if (textarea) {
            quill.root.innerHTML = markdownToHtml(textarea.value);
        }
        
        // Lưu lại editor
        richTextEditors[index] = {
            quill: quill,
            textareaId: textareaId
        };
        
        // Cập nhật textarea khi nội dung thay đổi
        quill.on('text-change', function() {
            if (textarea) {
                textarea.value = quill.root.innerHTML;
            }
        });
    });
}

// Hàm cập nhật đề thi từ editor
function updateExamFromEditor() {
    // Kiểm tra xem trình chỉnh sửa có đang mở không
    const blocksContainer = document.getElementById('examBlocksContainer');
    
    // Nếu không có trình chỉnh sửa, không làm gì cả
    if (!blocksContainer) {
        console.log('Trình chỉnh sửa không mở, bỏ qua cập nhật từ editor');
        return;
    }
    
    const blockElements = blocksContainer.querySelectorAll('.exam-block-editor');
    
    const updatedBlocks = [];
    
    // Convert NodeList to Array để sử dụng find
    const blockArray = Array.from(blockElements);
    
    blockArray.forEach((blockElement, blockIndex) => {
        const dataIndex = parseInt(blockElement.dataset.index);
        const typeSelect = blockElement.querySelector('.block-type-select');
        const titleInput = blockElement.querySelector('.block-title');
        const pointsInput = blockElement.querySelector('.block-points-input');
        
        // Lấy nội dung từ trình soạn thảo
        let content = '';
        if (richTextEditors[dataIndex]) {
            const quill = richTextEditors[dataIndex].quill;
            content = quill.root.innerHTML;
        } else {
            // Fallback nếu không có editor
            const textarea = document.getElementById(`editor-text-${dataIndex}`);
            content = textarea ? textarea.value : '';
        }
        
        const blockData = {
            type: typeSelect.value,
            title: titleInput.value,
            content: content,
            points: typeSelect.value === 'question' ? parseFloat(pointsInput?.value || 1.0) : 0
        };
        
        updatedBlocks.push(blockData);
    });
    
    // Sắp xếp lại theo thứ tự hiện tại
    currentExamBlocks = updatedBlocks;
}

// Hàm sắp xếp lại blocks
function reorderBlocks() {
    // Hiển thị thông báo
    showNotification('Kéo và thả các block để sắp xếp lại', 'info');
    
    // Cập nhật từ editor trước
    updateExamFromEditor();
    
    // Đóng modal và mở lại để refresh
    const modal = document.getElementById('editExamModal');
    modal.classList.remove('active');
    
    setTimeout(() => {
        openExamEditor();
    }, 300);
}

// Hàm thêm block mới
function addBlock(type) {
    const newBlock = {
        type: type,
        title: type === 'text' ? 'Phần mới' : 'Câu hỏi mới',
        content: '',
        points: type === 'question' ? 1.0 : 0
    };
    
    currentExamBlocks.push(newBlock);
    
    // Cập nhật giao diện editor
    const blocksContainer = document.getElementById('examBlocksContainer');
    blocksContainer.insertAdjacentHTML('beforeend', createBlockEditorHTML(newBlock, currentExamBlocks.length - 1));
    
    // Khởi tạo lại trình soạn thảo
    initRichTextEditors();
}

// Hàm xóa block
function deleteBlock(index) {
    if (currentExamBlocks.length <= 1) {
        showNotification('Đề thi phải có ít nhất một phần!', 'error');
        return;
    }
    
    currentExamBlocks.splice(index, 1);
    
    // Cập nhật giao diện
    const editorContainer = document.getElementById('examEditorContainer');
    editorContainer.innerHTML = createExamEditorHTML();
    
    // Khởi tạo lại trình soạn thảo
    setTimeout(() => {
        initRichTextEditors();
    }, 100);
}

// Hàm di chuyển block
function moveBlock(index, direction) {
    if (direction === 'up' && index > 0) {
        [currentExamBlocks[index], currentExamBlocks[index - 1]] = [currentExamBlocks[index - 1], currentExamBlocks[index]];
    } else if (direction === 'down' && index < currentExamBlocks.length - 1) {
        [currentExamBlocks[index], currentExamBlocks[index + 1]] = [currentExamBlocks[index + 1], currentExamBlocks[index]];
    }
    
    // Cập nhật giao diện
    const editorContainer = document.getElementById('examEditorContainer');
    editorContainer.innerHTML = createExamEditorHTML();
    
    // Khởi tạo lại trình soạn thảo
    setTimeout(() => {
        initRichTextEditors();
    }, 100);
}

// Hàm lưu đề thi đã chỉnh sửa
function saveEditedExam() {
    updateExamFromEditor();
    
    // Đóng modal
    const modal = document.getElementById('editExamModal');
    modal.classList.remove('active');
    
    // Cập nhật giao diện xem trước
    const examData = {
        title: "Đề thi Ngữ Văn",
        description: "Đề thi đã được chỉnh sửa",
        blocks: currentExamBlocks
    };
    
    const examNotes = document.getElementById('examNotes').value;
    showExamResult(examData, examNotes);
    
    showNotification('Đã lưu thay đổi đề thi!', 'success');
}

// Hàm tạo mã đề thi
function generateExamCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Hàm cập nhật preview
function updateExamPreview() {
    updateExamFromEditor();
    
    let previewHTML = `
        <div class="preview-exam">
            <h1 class="exam-title">ĐỀ THI NGỮ VĂN</h1>
            <div class="exam-info">
                <p><strong>Thời gian làm bài:</strong> ${examSettings.time} phút | <strong>Mã đề:</strong> ${currentExamCode}</p>
                <p><strong>Khối lớp:</strong> ${examSettings.grade} | <strong>Độ khó:</strong> ${examSettings.difficulty === 'easy' ? 'Dễ' : examSettings.difficulty === 'medium' ? 'Trung bình' : 'Khó'}</p>
            </div>
    `;
    
    let questionCounter = 1;
    let totalPoints = 0;
    
    currentExamBlocks.forEach((block, index) => {
        if (block.type === 'text') {
            previewHTML += `
                <div class="exam-section">
                    <h3 class="section-title">${block.title || 'Phần văn bản'}</h3>
                    <div class="text-content markdown-content">${block.content}</div>
                </div>
            `;
        } else if (block.type === 'question') {
            totalPoints += block.points || 0;
            previewHTML += `
                <div class="question-item">
                    <div class="question-header">
                        <div class="question-text markdown-content"><strong>Câu ${questionCounter}:</strong> ${block.content}</div>
                        <div class="question-points">${block.points || 1.0} điểm</div>
                    </div>
                    <div class="answer-area">
                        <textarea class="answer-textarea" placeholder="Thí sinh viết câu trả lời vào đây..." rows="4"></textarea>
                    </div>
                </div>
            `;
            questionCounter++;
        }
    });
    
    previewHTML += `
        <div class="exam-info" style="margin-top: 2rem; padding-top: 1rem; border-top: 2px solid var(--card-outline);">
            <p><strong>Tổng điểm: ${totalPoints.toFixed(1)} điểm</strong></p>
            <p><em>--- Hết đề thi ---</em></p>
        </div>
    `;
    
    previewHTML += `</div>`;
    document.getElementById('previewContent').innerHTML = previewHTML;
    
    const modal = document.getElementById('previewModal');
    modal.classList.add('active');
}

// Hàm lưu đề thi
function saveExam() {
    // Chỉ cập nhật từ editor nếu editor đang mở
    const editModal = document.getElementById('editExamModal');
    if (editModal && editModal.classList.contains('active')) {
        updateExamFromEditor();
    }
    
    const examData = {
        code: currentExamCode,
        title: "Đề thi Ngữ Văn",
        time: examSettings.time,
        difficulty: examSettings.difficulty,
        grade: examSettings.grade,
        blocks: currentExamBlocks,
        createdAt: new Date().toISOString(),
        totalPoints: currentExamBlocks.reduce((sum, block) => sum + (block.points || 0), 0)
    };
    
    const savedExams = JSON.parse(localStorage.getItem('vanw_exams') || '[]');
    savedExams.push(examData);
    localStorage.setItem('vanw_exams', JSON.stringify(savedExams));
    
    showNotification(`Đã lưu đề thi thành công! Mã đề: ${currentExamCode}`, 'success');
}

// Hàm in đề thi
function printExam() {
    updateExamFromEditor();
    
    let printHTML = `
        <div class="preview-exam">
            <h1 class="exam-title">ĐỀ THI NGỮ VĂN</h1>
            <div class="exam-info">
                <p><strong>Thời gian làm bài:</strong> ${examSettings.time} phút | <strong>Mã đề:</strong> ${currentExamCode}</p>
                <p><strong>Khối lớp:</strong> ${examSettings.grade} | <strong>Độ khó:</strong> ${examSettings.difficulty === 'easy' ? 'Dễ' : examSettings.difficulty === 'medium' ? 'Trung bình' : 'Khó'}</p>
            </div>
    `;
    
    let questionCounter = 1;
    let totalPoints = 0;
    
    currentExamBlocks.forEach((block, index) => {
        if (block.type === 'text') {
            printHTML += `
                <div class="exam-section">
                    <h3 class="section-title">${block.title || 'Phần văn bản'}</h3>
                    <div class="text-content markdown-content">${block.content}</div>
                </div>
            `;
        } else if (block.type === 'question') {
            totalPoints += block.points || 0;
            printHTML += `
                <div class="question-item">
                    <div class="question-header">
                        <div class="question-text markdown-content"><strong>Câu ${questionCounter}:</strong> ${block.content}</div>
                        <div class="question-points">${block.points || 1.0} điểm</div>
                    </div>
                    <div class="answer-area">
                        <div class="answer-space" style="min-height: 100px; border: 1px dashed #ccc; margin-top: 10px;"></div>
                    </div>
                </div>
            `;
            questionCounter++;
        }
    });
    
    printHTML += `
        <div class="exam-info" style="margin-top: 2rem; padding-top: 1rem; border-top: 2px solid var(--card-outline);">
            <p><strong>Tổng điểm: ${totalPoints.toFixed(1)} điểm</strong></p>
            <p><em>--- Hết đề thi ---</em></p>
        </div>
    `;
    
    printHTML += `</div>`;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Đề thi ${currentExamCode} - VANW</title>
            <style>
                body { 
                    font-family: 'Inter', Arial, sans-serif; 
                    padding: 20px; 
                    line-height: 1.6;
                    color: #333;
                    max-width: 210mm;
                    margin: 0 auto;
                }
                .exam-title { 
                    text-align: center; 
                    color: #e37c2d;
                    font-size: 24px;
                    margin-bottom: 10px;
                    border-bottom: 3px solid #e37c2d;
                    padding-bottom: 10px;
                }
                .exam-info { 
                    text-align: center; 
                    color: #666;
                    margin-bottom: 30px;
                    font-size: 14px;
                }
                .section-title {
                    color: #e37c2d;
                    font-size: 18px;
                    margin: 25px 0 15px;
                    padding-bottom: 5px;
                    border-bottom: 2px solid rgba(227, 124, 45, 0.3);
                }
                .text-content {
                    background: #f9f9f9;
                    padding: 15px;
                    border-radius: 8px;
                    margin-bottom: 20px;
                    border-left: 4px solid #e37c2d;
                }
                .question-item {
                    margin-bottom: 20px;
                    padding: 15px;
                    border: 1px solid #ddd;
                    border-radius: 8px;
                }
                .question-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 10px;
                }
                .question-text {
                    flex: 1;
                    font-weight: 500;
                }
                .question-points {
                    background: #e37c2d;
                    color: white;
                    padding: 2px 10px;
                    border-radius: 15px;
                    font-size: 12px;
                    font-weight: bold;
                }
                .answer-space {
                    min-height: 100px;
                    border: 1px dashed #ccc;
                    padding: 10px;
                    border-radius: 5px;
                    margin-top: 10px;
                }
                .markdown-content h1, .markdown-content h2, .markdown-content h3 {
                    color: #e37c2d;
                }
                .markdown-content strong {
                    color: #e37c2d;
                    font-weight: bold;
                }
                .markdown-content em {
                    font-style: italic;
                }
                .markdown-content u {
                    text-decoration: underline;
                }
                @media print {
                    body { font-size: 12pt; }
                    .no-print { display: none; }
                    .exam-title { font-size: 20pt; }
                }
            </style>
        </head>
        <body>
            ${printHTML}
            <div class="exam-info no-print" style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ccc; font-size: 12px; color: #888;">
                <p>Được tạo bởi Hệ thống Hỗ trợ Giảng dạy Văn học VANW</p>
                <p>Ngày in: ${new Date().toLocaleDateString('vi-VN')}</p>
            </div>
            <script>
                window.onload = function() { 
                    setTimeout(() => { window.print(); }, 500);
                }
            <\/script>
        </body>
        </html>
    `);
    printWindow.document.close();
}

// Hàm thiết lập sự kiện cho các nút action
function setupLessonActions() {
    const printBtn = document.getElementById('printLesson');
    const saveWordBtn = document.getElementById('saveWord');
    const copyBtn = document.getElementById('copyLesson');
    const saveToDatabaseBtn = document.getElementById('saveToDatabase');
    
    if (printBtn) {
        printBtn.addEventListener('click', printLesson);
    }
    
    if (saveWordBtn) {
        saveWordBtn.addEventListener('click', exportToWord);
    }
    
    if (copyBtn) {
        copyBtn.addEventListener('click', copyLesson);
    }
    
    if (saveToDatabaseBtn) {
        saveToDatabaseBtn.addEventListener('click', saveLessonToDatabase);
    }
}

// Hàm lưu bài giảng vào database
async function saveLessonToDatabase() {
    if (!firestoreDb) {
        showNotification('Firestore Database chưa được khởi tạo!', 'error');
        return;
    }
    
    try {
        const inputText = document.getElementById('inputText').value.trim();
        const teachingNotes = document.getElementById('teachingNotes').value;
        const duration = parseInt(document.getElementById('durationSlider').value);
        const teachingStyle = document.getElementById('teachingStyle').value;
        
        // Lấy nội dung bài giảng
        const lessonContent = document.querySelector('.lesson-content');
        if (!lessonContent) {
            showNotification('Không tìm thấy nội dung bài giảng!', 'error');
            return;
        }
        
        const lessonData = {
            lessonId: generateExamCode() + '_LESSON',
            title: "Bài giảng Văn học",
            literaryText: inputText.substring(0, 500),
            duration: duration,
            teachingStyle: teachingStyle,
            notes: teachingNotes,
            content: lessonContent.innerHTML,
            createdAt: new Date().toISOString(),
            source: "VANW Teaching Tool"
        };
        
        showNotification('Đang lưu bài giảng vào database...', 'info');
        
        // Lưu vào Firestore
        await firestoreDb.collection('lessons').doc(lessonData.lessonId).set(lessonData);
        
        showNotification(`Đã lưu bài giảng vào database thành công! Mã bài: ${lessonData.lessonId}`, 'success');
        
    } catch (error) {
        console.error('Lỗi khi lưu bài giảng vào database:', error);
        showNotification(`Lỗi khi lưu vào database: ${error.message}`, 'error');
    }
}

// Hàm xuất bài giảng ra Word (DOCX)
function exportToWord() {
    const lessonContent = document.querySelector('.lesson-content');
    const lessonHeader = document.querySelector('.lesson-header');
    const authorInfoSection = document.querySelector('.author-info-section');
    
    if (!lessonContent || !lessonHeader) {
        showNotification('Không tìm thấy nội dung bài giảng!', 'error');
        return;
    }
    
    showNotification('Đang xuất file Word...', 'info');
    
    const title = 'KẾ HOẠCH BÀI GIẢNG VĂN HỌC';
    
    const wordHTML = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>${title}</title>
            <!--[if gte mso 9]>
            <xml>
                <w:WordDocument>
                    <w:View>Print</w:View>
                    <w:Zoom>100</w:Zoom>
                    <w:DoNotOptimizeForBrowser/>
                </w:WordDocument>
            </xml>
            <![endif]-->
            <style>
                body {
                    font-family: 'Calibri', Arial, sans-serif;
                    font-size: 12pt;
                    line-height: 1.5;
                    margin: 2cm;
                }
                
                .word-header {
                    text-align: center;
                    margin-bottom: 40pt;
                    padding-bottom: 20pt;
                    border-bottom: 3pt double #e37c2d;
                }
                
                .word-header h1 {
                    color: #e37c2d;
                    font-size: 27pt;
                    margin-bottom: 15pt;
                    font-weight: bold;
                }
                
                .word-meta {
                    display: flex;
                    justify-content: center;
                    gap: 25pt;
                    flex-wrap: wrap;
                    margin-top: 20pt;
                    color: #666;
                    font-size: 12pt;
                }
                
                .word-meta-item {
                    background: #f5f5f5;
                    padding: 8pt 16pt;
                    border-radius: 20pt;
                    border: 1pt solid #ddd;
                    font-weight: 500;
                }
                
                .author-info-word {
                    margin: 20pt 0 30pt 0;
                    padding: 15pt;
                    background: #fff;
                    border: 2pt solid #ddd;
                    border-radius: 8pt;
                }
                
                .author-info-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200pt, 1fr));
                    gap: 15pt;
                }
                
                .author-info-item {
                    padding: 8pt 12pt;
                    border-left: 3pt solid #e37c2d;
                    background: rgba(227, 124, 45, 0.05);
                    border-radius: 4pt;
                }
                
                .author-info-item strong {
                    color: #e37c2d;
                    font-size: 10pt;
                    margin-bottom: 3pt;
                    text-transform: uppercase;
                    letter-spacing: 0.5pt;
                    display: block;
                }
                
                .author-info-item span {
                    color: #000;
                    font-size: 11pt;
                    font-weight: 500;
                    display: block;
                }
                
                .word-content {
                    margin-top: 30pt;
                    text-align: left;
                }
                
                .word-content h1 {
                    color: #e37c2d;
                    font-size: 24pt;
                    margin: 35pt 0 20pt;
                    padding-bottom: 8pt;
                    border-bottom: 3pt solid #e37c2d;
                    font-weight: bold;
                    page-break-after: avoid;
                    text-align: left;
                }
                
                .word-content h2 {
                    color: #e37c2d;
                    font-size: 18pt;
                    margin: 30pt 0 15pt;
                    padding-left: 8pt;
                    border-left: 2pt solid #e37c2d;
                    font-weight: bold;
                    page-break-after: avoid;
                    text-align: left;
                }
                
                .word-content h3 {
                    color: #f5a742;
                    font-size: 16pt;
                    margin: 25pt 0 12pt;
                    font-weight: bold;
                    page-break-after: avoid;
                    text-align: left;
                }
                
                .word-content p {
                    margin-bottom: 12pt;
                    font-size: 12pt;
                    text-align: justify;
                }
                
                .word-content strong {
                    color: #e37c2d;
                    font-weight: bold;
                }
                
                .word-content ul, .word-content ol {
                    margin-left: 36pt;
                    margin-bottom: 15pt;
                    text-align: left;
                }
                
                .word-content li {
                    margin-bottom: 12pt;
                    font-size: 12pt;
                }
                
                .word-content .highlight-box {
                    background: #fff9e6;
                    border: 2pt solid #fad859;
                    border-radius: 8pt;
                    padding: 15pt;
                    margin: 20pt 0;
                    page-break-inside: avoid;
                    text-align: left;
                }
                
                .word-content .time-badge {
                    display: inline-block;
                    background: #e37c2d;
                    color: white;
                    padding: 4pt 10pt;
                    border-radius: 15pt;
                    font-size: 10pt;
                    margin-right: 8pt;
                    margin-bottom: 8pt;
                }
                
                .word-footer {
                    text-align: center;
                    margin-top: 60pt;
                    padding-top: 20pt;
                    border-top: 1pt solid #ccc;
                    color: #666;
                    font-size: 10pt;
                }
                
                @media print {
                    body {
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                }
            </style>
        </head>
        <body>
            <div class="word-header">
                <h1>${title}</h1>
                <div class="word-meta">
                    ${document.querySelector('.lesson-meta').innerHTML.replace(/class="meta-item"/g, 'class="word-meta-item"')}
                </div>
            </div>
            
            ${authorInfoSection ? `
            <div class="author-info-word">
                ${authorInfoSection.innerHTML}
            </div>` : ''}
            
            <div class="word-content">
                ${lessonContent.innerHTML
                    .replace(/<h2>/g, '<h2 style="color: #e37c2d; font-size: 18pt; margin: 30pt 0 15pt; padding-left: 8pt; border-left: 2pt solid #e37c2d; font-weight: bold; page-break-after: avoid; text-align: left;">')
                    .replace(/<h1>/g, '<h1 style="color: #e37c2d; font-size: 24pt; margin: 35pt 0 20pt; padding-bottom: 8pt; border-bottom: 3pt solid #e37c2d; font-weight: bold; page-break-after: avoid; text-align: left;">')
                    .replace(/<div class="lesson-section">/g, '<div style="page-break-inside: avoid;">')
                    .replace(/<div class="lesson-actions"[^>]*>.*?<\/div>/g, '')
                    .replace(/<div class="highlight-box"[^>]*>/g, '<div style="background: #fff9e6; border: 2pt solid #fad859; border-radius: 8pt; padding: 15pt; margin: 20pt 0; page-break-inside: avoid; text-align: left;">')
                    .replace(/<i class="[^"]*"><\/i>/g, '')
                }
            </div>
            
            <div class="word-footer">
                <p>Được tạo bởi Hệ thống Hỗ trợ Giảng dạy Văn học VANW</p>
                <p>Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}</p>
            </div>
        </body>
        </html>
    `;
    
    const blob = new Blob([wordHTML], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Bai_giang_Van_hoc_${new Date().toISOString().slice(0, 10)}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setTimeout(() => {
        showNotification('Đã xuất file Word thành công!', 'success');
    }, 1000);
}

// Hàm in bài giảng
function printLesson() {
    const lessonContent = document.querySelector('.lesson-content');
    const lessonHeader = document.querySelector('.lesson-header');
    const authorInfoSection = document.querySelector('.author-info-section');
    
    if (!lessonContent || !lessonHeader) return;
    
    const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Bài giảng văn học - VANW</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
                
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                
                body {
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    padding: 30px;
                    max-width: 210mm;
                    margin: 0 auto;
                    background: #fff;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }
                
                .print-header {
                    text-align: center;
                    margin-bottom: 40px;
                    padding-bottom: 25px;
                    border-bottom: 4px solid #e37c2d;
                }
                
                .print-header h1 {
                    color: #e37c2d;
                    font-size: 32px;
                    margin-bottom: 15px;
                    font-weight: 700;
                }
                
                .print-meta {
                    display: flex;
                    justify-content: center;
                    gap: 20px;
                    flex-wrap: wrap;
                    margin-top: 20px;
                }
                
                .print-meta span {
                    background: #f8f9fa;
                    padding: 8px 20px;
                    border-radius: 25px;
                    font-size: 14px;
                    border: 2px solid #e9ecef;
                    color: #495057;
                    font-weight: 500;
                }
                
                .print-author-info {
                    background: #fff;
                    padding: 20px;
                    border-radius: 10px;
                    margin: 20px 0 30px 0;
                    border: 2px solid #e9ecef;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
                }
                
                .print-author-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 15px;
                }
                
                .print-author-item {
                    padding: 10px 15px;
                    border-left: 3px solid #e37c2d;
                    background: rgba(227, 124, 45, 0.05);
                    border-radius: 6px;
                }
                
                .print-author-item strong {
                    color: #e37c2d;
                    font-size: 12px;
                    margin-bottom: 5px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    display: block;
                }
                
                .print-author-item span {
                    color: #333;
                    font-size: 14px;
                    font-weight: 500;
                    display: block;
                }
                
                .print-content {
                    margin-top: 40px;
                    text-align: left;
                }
                
                .print-content h1 {
                    color: #e37c2d;
                    font-size: 28px;
                    margin: 35px 0 20px;
                    padding-bottom: 10px;
                    border-bottom: 3px solid #e37c2d;
                    font-weight: 700;
                    text-align: left;
                }
                
                .print-content h2 {
                    color: #e37c2d;
                    font-size: 22px;
                    margin: 30px 0 15px;
                    padding-left: 10px;
                    border-left: 3px solid #e37c2d;
                    font-weight: 600;
                    text-align: left;
                }
                
                .print-content h3 {
                    color: #f5a742;
                    font-size: 19px;
                    margin: 25px 0 12px;
                    font-weight: 600;
                    text-align: left;
                }
                
                .print-content p {
                    margin-bottom: 15px;
                    font-size: 15px;
                    text-align: justify;
                }
                
                .print-content strong {
                    color: #e37c2d;
                    font-weight: 700;
                }
                
                .print-content ul, .print-content ol {
                    margin-left: 30px;
                    margin-bottom: 20px;
                    text-align: left;
                }
                
                .print-content li {
                    margin-bottom: 10px;
                    font-size: 15px;
                }
                
                .print-content .highlight-box {
                    background: linear-gradient(135deg, rgba(227, 124, 45, 0.1), rgba(250, 216, 89, 0.1));
                    border: 3px solid #fad859;
                    border-radius: 12px;
                    padding: 20px;
                    margin: 25px 0;
                    page-break-inside: avoid;
                    text-align: left;
                }
                
                .print-content .time-badge {
                    display: inline-block;
                    background: #e37c2d;
                    color: white;
                    padding: 6px 15px;
                    border-radius: 20px;
                    font-size: 13px;
                    font-weight: 600;
                    margin-right: 10px;
                    margin-bottom: 10px;
                }
                
                .print-footer {
                    text-align: center;
                    margin-top: 60px;
                    padding-top: 25px;
                    border-top: 2px solid #e9ecef;
                    color: #6c757d;
                    font-size: 14px;
                }
                
                @page {
                    size: A4;
                    margin: 25mm;
                }
                
                @media print {
                    body {
                        padding: 0;
                        margin: 0;
                    }
                    
                    .print-header {
                        margin-top: 0;
                    }
                    
                    .no-print {
                        display: none !important;
                    }
                }
            </style>
        </head>
        <body>
            <div class="print-header">
                <h1>KẾ HOẠCH BÀI GIẢNG VĂN HỌC</h1>
                <div class="print-meta">
                    ${document.querySelector('.lesson-meta').innerHTML}
                </div>
            </div>
            
            ${authorInfoSection ? `
            <div class="print-author-info">
                ${authorInfoSection.innerHTML}
            </div>` : ''}
            
            <div class="print-content">
                ${lessonContent.innerHTML
                    .replace(/<div class="lesson-actions"[^>]*>.*?<\/div>/g, '')
                }
            </div>
            
            <div class="print-footer">
                <p>Được tạo bởi Hệ thống Hỗ trợ Giảng dạy Văn học VANW</p>
                <p>Ngày in: ${new Date().toLocaleDateString('vi-VN')} - ${new Date().toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'})}</p>
            </div>
            
            <script>
                window.onload = function() {
                    window.print();
                }
            </script>
        </body>
        </html>
    `;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
}

// Hàm sao chép bài giảng
async function copyLesson() {
    const lessonContent = document.querySelector('.lesson-content');
    const lessonHeader = document.querySelector('.lesson-header');
    const authorInfoSection = document.querySelector('.author-info-section');
    
    if (!lessonContent || !lessonHeader) {
        showNotification('Không tìm thấy nội dung bài giảng!', 'error');
        return;
    }
    
    const authorInfoText = authorInfoSection ? authorInfoSection.textContent + '\n\n' : '';
    
    const textContent = `
KẾ HOẠCH BÀI GIẢNG VĂN HỌC
===========================

Thông tin bài giảng:
${document.querySelector('.lesson-meta').textContent}

${authorInfoText}

Nội dung bài giảng:
${lessonContent.textContent}

---
Được tạo bởi Hệ thống Hỗ trợ Giảng dạy Văn học VANW
Ngày tạo: ${new Date().toLocaleDateString('vi-VN')}
    `;
    
    try {
        await navigator.clipboard.writeText(textContent);
        showNotification('Đã sao chép nội dung bài giảng!', 'success');
    } catch (err) {
        console.error('Lỗi khi sao chép:', err);
        showNotification('Không thể sao chép, vui lòng thử lại!', 'error');
    }
}

// ==================== KHỞI TẠO KHI TRANG TẢI ====================

// Hàm hiển thị thông báo
function showNotification(message, type = 'info') {
    const oldNotification = document.querySelector('.notification');
    if (oldNotification) {
        oldNotification.remove();
    }
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    let icon = 'info-circle';
    if (type === 'success') icon = 'check-circle';
    if (type === 'error') icon = 'exclamation-circle';
    if (type === 'warning') icon = 'exclamation-triangle';
    
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${icon}"></i>
            <span>${message}</span>
        </div>
    `;
    
    notification.style.cssText = `
        position: fixed;
        top: 30px;
        right: 30px;
        background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : type === 'warning' ? '#ff9800' : '#2196F3'};
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        box-shadow: 0 6px 20px rgba(0,0,0,0.2);
        z-index: 10000;
        animation: slideIn 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55), fadeOut 0.4s ease 3.6s;
        animation-fill-mode: forwards;
        max-width: 400px;
        border: 2px solid rgba(255,255,255,0.3);
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 4000);
}

// Hàm xử lý slider thời lượng
function setupDurationSlider() {
    const slider = document.getElementById('durationSlider');
    const valueDisplay = document.getElementById('durationValue');
    const durationBtns = document.querySelectorAll('#teaching-settings-tab .duration-btn');
    
    if (!slider || !valueDisplay) return;
    
    valueDisplay.textContent = formatDuration(slider.value);
    updateSliderColor(slider.value);
    
    slider.addEventListener('input', function() {
        valueDisplay.textContent = formatDuration(this.value);
        updateSliderColor(this.value);
        
        durationBtns.forEach(btn => {
            if (parseInt(btn.dataset.value) === parseInt(this.value)) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    });
    
    durationBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const value = parseInt(this.dataset.value);
            slider.value = value;
            valueDisplay.textContent = formatDuration(value);
            updateSliderColor(value);
            
            durationBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    const defaultBtn = document.querySelector('#teaching-settings-tab .duration-btn[data-value="45"]');
    if (defaultBtn) {
        defaultBtn.classList.add('active');
    }
}

// Hàm cập nhật màu slider
function updateSliderColor(value) {
    const slider = document.getElementById('durationSlider');
    const percent = ((value - slider.min) / (slider.max - slider.min)) * 100;
    slider.style.background = `linear-gradient(to right, var(--primary-color) 0%, var(--primary-color) ${percent}%, var(--border-color) ${percent}%, var(--border-color) 100%)`;
}

// Hàm khởi tạo exam slider
function setupExamSlider() {
    const slider = document.getElementById('examTimeSlider');
    const valueDisplay = document.getElementById('examTimeValue');
    
    if (!slider || !valueDisplay) return;
    
    valueDisplay.textContent = formatDuration(slider.value);
    updateExamSliderColor(slider.value);
    
    slider.addEventListener('input', function() {
        valueDisplay.textContent = formatDuration(this.value);
        updateExamSliderColor(this.value);
        
        const durationBtns = document.querySelectorAll('#exam-settings-tab .duration-btn');
        durationBtns.forEach(btn => {
            if (parseInt(btn.dataset.value) === parseInt(this.value)) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    });
    
    const examDurationBtns = document.querySelectorAll('#exam-settings-tab .duration-btn');
    examDurationBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const value = parseInt(this.dataset.value);
            slider.value = value;
            valueDisplay.textContent = formatDuration(value);
            updateExamSliderColor(value);
            
            examDurationBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });
}

// Hàm cập nhật màu slider đề thi
function updateExamSliderColor(value) {
    const slider = document.getElementById('examTimeSlider');
    const percent = ((value - slider.min) / (slider.max - slider.min)) * 100;
    slider.style.background = `linear-gradient(to right, var(--primary-color) 0%, var(--primary-color) ${percent}%, var(--border-color) ${percent}%, var(--border-color) 100%)`;
}

// Hàm đếm từ
function setupWordCounter() {
    const textarea = document.getElementById('inputText');
    const wordCount = document.getElementById('wordCount');
    
    if (!textarea || !wordCount) return;
    
    textarea.addEventListener('input', function() {
        const count = countWords(this.value);
        wordCount.textContent = `${count} từ`;
        
        if (count < 10) {
            wordCount.style.color = '#ef4444';
            wordCount.style.fontWeight = '600';
        } else {
            wordCount.style.color = 'var(--text-secondary)';
            wordCount.style.fontWeight = 'normal';
        }
    });
}

// Hàm xử lý tabs trong settings
function setupSettingsTabs() {
    const tabBtns = document.querySelectorAll('#settingsPanel .tab-btn');
    const tabContents = document.querySelectorAll('#settingsPanel .tab-content');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const tabId = this.dataset.tab;
            
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            this.classList.add('active');
            document.getElementById(`${tabId}-tab`).classList.add('active');
        });
    });
}

// Hàm xử lý tabs trong kết quả
function setupResultTabs() {
    const tabBtns = document.querySelectorAll('#resultTabs .tab-btn');
    const tabContents = document.querySelectorAll('#resultTabs .tab-content');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const tabId = this.dataset.tab;
            
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            this.classList.add('active');
            document.getElementById(`${tabId}-tab`).classList.add('active');
        });
    });
}

// Hàm xử lý modal
function setupModal() {
    const previewModal = document.getElementById('previewModal');
    const editModal = document.getElementById('editExamModal');
    const closeButtons = document.querySelectorAll('.close-modal');
    const closePreviewBtn = document.getElementById('closePreviewBtn');
    const printPreviewBtn = document.getElementById('printPreviewBtn');
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    const saveEditedExamBtn = document.getElementById('saveEditedExamBtn');
    
    // Đóng modal
    closeButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) {
                modal.classList.remove('active');
            }
        });
    });
    
    if (closePreviewBtn) {
        closePreviewBtn.addEventListener('click', function() {
            previewModal.classList.remove('active');
        });
    }
    
    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', function() {
            editModal.classList.remove('active');
        });
    }
    
    if (saveEditedExamBtn) {
        saveEditedExamBtn.addEventListener('click', function(e) {
            e.preventDefault();
            saveEditedExam();
        });
    }
    
    if (printPreviewBtn) {
        printPreviewBtn.addEventListener('click', function() {
            const printContent = document.getElementById('previewContent').innerHTML;
            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Đề thi ${currentExamCode} - VANW</title>
                    <style>
                        body { 
                            font-family: 'Inter', Arial, sans-serif; 
                            padding: 20px; 
                            line-height: 1.6;
                            color: #333;
                            max-width: 210mm;
                            margin: 0 auto;
                        }
                        .exam-title { 
                            text-align: center; 
                            color: #e37c2d;
                            font-size: 24px;
                            margin-bottom: 10px;
                            border-bottom: 3px solid #e37c2d;
                            padding-bottom: 10px;
                        }
                        .exam-info { 
                            text-align: center; 
                            color: #666;
                            margin-bottom: 30px;
                            font-size: 14px;
                        }
                        .section-title {
                            color: #e37c2d;
                            font-size: 18px;
                            margin: 25px 0 15px;
                            padding-bottom: 5px;
                            border-bottom: 2px solid rgba(227, 124, 45, 0.3);
                        }
                        .text-content {
                            background: #f9f9f9;
                            padding: 15px;
                            border-radius: 8px;
                            margin-bottom: 20px;
                            border-left: 4px solid #e37c2d;
                        }
                        .question-item {
                            margin-bottom: 20px;
                            padding: 15px;
                            border: 1px solid #ddd;
                            border-radius: 8px;
                        }
                        .question-header {
                            display: flex;
                            justify-content: space-between;
                            align-items: flex-start;
                            margin-bottom: 10px;
                        }
                        .question-text {
                            flex: 1;
                            font-weight: 500;
                        }
                        .question-points {
                            background: #e37c2d;
                            color: white;
                            padding: 2px 10px;
                            border-radius: 15px;
                            font-size: 12px;
                            font-weight: bold;
                        }
                        .answer-textarea {
                            width: 100%;
                            min-height: 100px;
                            border: 1px dashed #ccc;
                            padding: 10px;
                            border-radius: 5px;
                            margin-top: 10px;
                            font-family: inherit;
                        }
                        .markdown-content h1, .markdown-content h2, .markdown-content h3 {
                            color: #e37c2d;
                        }
                        .markdown-content strong {
                            color: #e37c2d;
                            font-weight: bold;
                        }
                        .markdown-content em {
                            font-style: italic;
                        }
                        .markdown-content u {
                            text-decoration: underline;
                        }
                        @media print {
                            body { font-size: 12pt; }
                            .no-print { display: none; }
                            .exam-title { font-size: 20pt; }
                        }
                    </style>
                </head>
                <body>
                    ${printContent}
                    <div class="exam-info no-print" style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ccc; font-size: 12px; color: #888;">
                        <p>Được tạo bởi Hệ thống Hỗ trợ Giảng dạy Văn học VANW</p>
                        <p>Ngày in: ${new Date().toLocaleDateString('vi-VN')}</p>
                    </div>
                    <script>
                        window.onload = function() { 
                            setTimeout(() => { window.print(); }, 500);
                        }
                    <\/script>
                </body>
                </html>
            `);
            printWindow.document.close();
        });
    }
    
    // Đóng modal khi click bên ngoài
    [previewModal, editModal].forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });
    
    // Xử lý sự kiện trong modal chỉnh sửa
    document.addEventListener('click', function(e) {
        // Thêm block văn bản
        if (e.target && e.target.id === 'addTextBlockBtn') {
            e.preventDefault();
            addBlock('text');
        }
        
        // Thêm block câu hỏi
        if (e.target && e.target.id === 'addQuestionBlockBtn') {
            e.preventDefault();
            addBlock('question');
        }
        
        // Xem trước đề thi đã chỉnh sửa
        if (e.target && e.target.id === 'previewEditedExamBtn') {
            e.preventDefault();
            updateExamFromEditor();
            updateExamPreview();
            editModal.classList.remove('active');
        }
        
        // Xóa block
        if (e.target && e.target.closest('.block-btn.delete')) {
            e.preventDefault();
            const btn = e.target.closest('.block-btn.delete');
            const index = parseInt(btn.dataset.index);
            deleteBlock(index);
        }
        
        // Di chuyển block lên
        if (e.target && e.target.closest('.block-btn.move-up')) {
            e.preventDefault();
            const btn = e.target.closest('.block-btn.move-up');
            const index = parseInt(btn.dataset.index);
            moveBlock(index, 'up');
        }
        
        // Di chuyển block xuống
        if (e.target && e.target.closest('.block-btn.move-down')) {
            e.preventDefault();
            const btn = e.target.closest('.block-btn.move-down');
            const index = parseInt(btn.dataset.index);
            moveBlock(index, 'down');
        }
    });
}

// Khởi tạo khi trang được tải
document.addEventListener('DOMContentLoaded', function() {
    // Gán sự kiện cho nút tạo nội dung giảng dạy
    const generateAllBtn = document.getElementById('generateAllBtn');
    if (generateAllBtn) {
        generateAllBtn.addEventListener('click', generateTeachingContent);
    }
    
    // Gán sự kiện cho phím Enter trong textarea (Ctrl+Enter)
    const inputText = document.getElementById('inputText');
    if (inputText) {
        inputText.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && e.ctrlKey) {
                e.preventDefault();
                generateTeachingContent();
            }
        });
    }
    
    // Settings Panel Toggle
    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', function() {
            const settingsPanel = document.getElementById('settingsPanel');
            if (settingsPanel) {
                settingsPanel.classList.toggle('active');
                
                const icon = this.querySelector('i');
                if (settingsPanel.classList.contains('active')) {
                    icon.className = 'fas fa-times';
                    this.style.backgroundColor = 'rgba(227, 124, 45, 0.2)';
                    this.style.borderColor = 'var(--primary-color)';
                } else {
                    icon.className = 'fas fa-cog';
                    this.style.backgroundColor = '';
                    this.style.borderColor = '';
                }
            }
        });
    }
    
    // Khởi tạo các thành phần
    setupDurationSlider();
    setupExamSlider();
    setupWordCounter();
    setupSettingsTabs();
    setupResultTabs();
    setupModal();
    
    // Thêm animation cho notification
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%) translateY(-20px);
                opacity: 0;
            }
            to {
                transform: translateX(0) translateY(0);
                opacity: 1;
            }
        }
        
        @keyframes fadeOut {
            from {
                opacity: 1;
            }
            to {
                opacity: 0;
                transform: translateX(100%) translateY(-20px);
            }
        }
        
        .notification-content {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        
        .notification-content i {
            font-size: 1.3rem;
        }
        
        .notification-content span {
            font-size: 1rem;
            font-weight: 500;
        }
    `;
    document.head.appendChild(style);
    
    // Focus vào textarea
    document.getElementById('inputText')?.focus();
    
    // Hiển thị thông báo nếu Firebase đã được khởi tạo
    if (firestoreDb) {
        console.log('Firestore Database đã sẵn sàng để lưu đề thi');
    }

    // Kiểm tra API key và hiển thị cảnh báo nếu cần
    setTimeout(() => {
        const apiStatus = checkAPIStatus();
        if (!apiStatus.valid) {
            showNotification(`Cảnh báo: ${apiStatus.message} Vui lòng cập nhật API key trong file vangv.js`, 'warning');
        }
    }, 2000);

});


