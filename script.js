// ==============================================
// FIREBASE CONFIGURATION
// ==============================================

const firebaseConfig = {
  apiKey: "AIzaSyCVD_Um0fWAK3ogQQUwCDINV_dN1hJZxL4",
  authDomain: "tkc-vanw.firebaseapp.com",
  projectId: "tkc-vanw",
  storageBucket: "tkc-vanw.firebasestorage.app",
  messagingSenderId: "862465503494",
  appId: "1:862465503494:web:8aec558b363988deec6e87",
  measurementId: "G-F23NN1KLW0"
};

// Initialize Firebase
let firebaseApp, firestoreDb;
try {
  firebaseApp = firebase.initializeApp(firebaseConfig);
  firestoreDb = firebase.firestore();
  console.log("Firebase initialized successfully");
} catch (error) {
  console.error("Firebase initialization error:", error);
}

// ==============================================
// SELF-CHECK FUNCTIONALITY
// ==============================================

// Hàm tạo hash cho văn bản (để dùng làm ID)
function createTextHash(text) {
  // Tạo một hash đơn giản từ nội dung văn bản
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}

// Hàm kiểm tra xem văn bản đã có trong database chưa
async function checkTextInDatabase(text) {
  if (!firestoreDb) return null;
  
  try {
    const textHash = createTextHash(text.trim());
    const docRef = firestoreDb.collection('analyzedTexts').doc(textHash);
    const doc = await docRef.get();
    
    if (doc.exists) {
      console.log("Found cached analysis in database");
      return doc.data();
    } else {
      console.log("No cached analysis found");
      return null;
    }
  } catch (error) {
    console.error("Error checking database:", error);
    return null;
  }
}

// Hàm lưu phân tích vào database
async function saveAnalysisToDatabase(text, analysisData) {
  if (!firestoreDb) return false;
  
  try {
    const textHash = createTextHash(text.trim());
    const docRef = firestoreDb.collection('analyzedTexts').doc(textHash);
    
    await docRef.set({
      originalText: text.trim(),
      analysis: analysisData,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      wordCount: countWords(text),
      analysisMode: document.getElementById('analysisMode').value,
      useAIFull: document.getElementById('aiFullToggle').checked
    });
    
    console.log("Analysis saved to database with ID:", textHash);
    return true;
  } catch (error) {
    console.error("Error saving to database:", error);
    return false;
  }
}

// Hàm hiển thị thông báo tự kiểm chứng
function showSelfCheckNotice() {
  const notice = document.getElementById('selfCheckNotice');
  const analysisCard = document.getElementById('mainAnalysisCard');
  
  notice.style.display = 'flex';
  analysisCard.classList.add('self-check-active');
}

// Hàm ẩn thông báo tự kiểm chứng
function hideSelfCheckNotice() {
  const notice = document.getElementById('selfCheckNotice');
  const analysisCard = document.getElementById('mainAnalysisCard');
  
  notice.style.display = 'none';
  analysisCard.classList.remove('self-check-active');
}

// Hàm hiển thị phân tích từ cache
function displayCachedAnalysis(cachedData, fromCache = false) {
  const resultDiv = document.getElementById('result');
  resultDiv.innerHTML = '';
  
  // Hiển thị thông tin từ cache
  if (cachedData.analysis) {
    // Hiển thị thông tin cơ bản
    if (cachedData.analysis.basicInfo) {
      const basicInfo = cachedData.analysis.basicInfo;
      resultDiv.innerHTML += `
        <div class="analysis-section">
          <h3><i class="fas fa-tags"></i> Kết quả phân loại ${fromCache ? '<span class="cached-tag">TỰ KIỂM CHỨNG</span>' : ''}</h3>
          <div class="analysis-content">
            <p><strong>Loại văn bản:</strong> ${basicInfo.textType || 'Không xác định'}</p>
            ${basicInfo.author ? `<p><strong>Tác giả:</strong> ${basicInfo.author}</p>` : ''}
            ${basicInfo.title ? `<p><strong>Tác phẩm:</strong> ${basicInfo.title}</p>` : ''}
          </div>
        </div>`;
    }
    
    // Hiển thị phân tích thể thơ (nếu có)
    if (cachedData.analysis.poemTypeInfo) {
      const poemType = cachedData.analysis.poemTypeInfo;
      resultDiv.innerHTML += `
        <div class="analysis-section">
          <h3><i class="fas fa-ruler-combined"></i> Thể thơ</h3>
          <div class="analysis-content">
            <p><strong>Thể loại:</strong> ${poemType.poemType || 'Không xác định'}</p>
            <p><strong>Giải thích:</strong> ${poemType.reason || 'Không có giải thích'}</p>
            ${poemType.link ? `<p><strong>Tìm hiểu thêm:</strong> <a href="${poemType.link}" target="_blank" class="text-blue-600 hover:underline">${poemType.poemType || 'Chi tiết'}</a></p>` : ''}
          </div>
        </div>`;
    }
    
    // Hiển thị phân tích kỹ thuật (nếu có)
    if (cachedData.analysis.technicalAnalysis) {
      resultDiv.innerHTML += cachedData.analysis.technicalAnalysis;
    }
    
    // Hiển thị phân tích nội dung (nếu có)
    if (cachedData.analysis.contentAnalysis) {
      resultDiv.innerHTML += `
        <div class="analysis-section">
          <h3><i class="fas fa-scroll"></i> Phân tích nội dung</h3>
          <div class="analysis-content">
            ${parseMarkdown(cachedData.analysis.contentAnalysis)}
          </div>
        </div>`;
    }
    
    // Hiển thị phân tích nghệ thuật (nếu có)
    if (cachedData.analysis.artisticAnalysis) {
      resultDiv.innerHTML += `
        <div class="analysis-section">
          <h3><i class="fas fa-paint-brush"></i> Phân tích nghệ thuật</h3>
          <div class="analysis-content">
            ${parseMarkdown(cachedData.analysis.artisticAnalysis)}
          </div>
        </div>`;
    }
    
    // Hiển thị so sánh (nếu có)
    if (cachedData.analysis.comparisonAnalysis) {
      resultDiv.innerHTML += `
        <div class="analysis-section">
          <h3><i class="fas fa-balance-scale"></i> So sánh với tác phẩm khác</h3>
          <div class="analysis-content">
            ${parseMarkdown(cachedData.analysis.comparisonAnalysis)}
          </div>
        </div>`;
    }
    
    // Hiển thị thông tin từ database (nếu có)
    if (fromCache && cachedData.timestamp) {
      const date = cachedData.timestamp.toDate ? cachedData.timestamp.toDate() : new Date(cachedData.timestamp);
      resultDiv.innerHTML += `
        <div class="analysis-section" style="background-color: rgba(76, 175, 80, 0.1);">
          <h3><i class="fas fa-database"></i> Thông tin tự kiểm chứng</h3>
          <div class="analysis-content">
            <p><strong>Phân tích được lấy từ cơ sở dữ liệu:</strong> Đã tìm thấy kết quả phân tích tương tự</p>
            <p><strong>Thời gian lưu trữ:</strong> ${date.toLocaleDateString('vi-VN')} ${date.toLocaleTimeString('vi-VN')}</p>
            <p><strong>Số từ:</strong> ${cachedData.wordCount || countWords(cachedData.originalText)}</p>
            <p><em>Kết quả này được tải từ phân tích trước đó, giúp tiết kiệm thời gian và tài nguyên API.</em></p>
          </div>
        </div>`;
    }
    
    // Thêm sự kiện chọn văn bản sau khi hiển thị
    setTimeout(addTextSelectionFeature, 100);
  }
}

// ==============================================
// SIDEBAR POPUP FUNCTIONALITY
// ==============================================

const sidebarPopup = document.getElementById('sidebarPopup');
const popupTitle = document.getElementById('popupTitle');
const popupContent = document.getElementById('popupContent');
const closePopup = document.getElementById('closePopup');

// Menu items - Cập nhật content cho mapMenu và chatbotMenu
const menuItems = {
    mapMenu: {
        title: 'Bản đồ văn học',
        content: '<div class="loading-chatbot"><p><span class="loading-spinner"></span> Đang tải bản đồ văn học...</p></div>'
    },
    chatbotMenu: {
        title: 'Chatbot AI Văn Học',
        content: '<div class="loading-chatbot"><p><span class="loading-spinner"></span> Đang tải Chatbot AI...</p></div>'
    }
};

// Biến để theo dõi menu hiện tại đang mở
let currentActiveMenu = null;

// Hàm mở popup
function openPopup(menuId) {
    const menuItem = menuItems[menuId];
    popupTitle.textContent = menuItem.title;
    popupContent.innerHTML = menuItem.content;
    
    sidebarPopup.classList.add('active');
    currentActiveMenu = menuId;
    
    // Đánh dấu menu đang active
    setActiveMenu(menuId);
    
    // Khởi tạo nội dung dựa trên menu được chọn
    setTimeout(() => {
        if (menuId === 'mapMenu') {
            // Bản đồ sẽ được khởi tạo trong map-popup.js
            console.log('Map menu opened');
        } else if (menuId === 'chatbotMenu') {
            // Chatbot sẽ được khởi tạo trong chatbot-popup.js
            console.log('Chatbot menu opened');
        }
    }, 100);
}

// Hàm đóng popup
function closePopupFunc() {
    sidebarPopup.classList.remove('active');
    currentActiveMenu = null;
    
    // Bỏ đánh dấu menu active
    removeActiveMenu();
}

// Hàm đánh dấu menu đang active
function setActiveMenu(menuId) {
    // Xóa active class khỏi tất cả menu
    document.querySelectorAll('.nav-btn').forEach(item => {
        item.classList.remove('active');
    });
    
    // Thêm active class vào menu được chọn
    const navBtn = document.getElementById(menuId);
    if (navBtn) navBtn.classList.add('active');
}

// Hàm bỏ đánh dấu menu active
function removeActiveMenu() {
    document.querySelectorAll('.nav-btn').forEach(item => {
        item.classList.remove('active');
    });
}

// Add click events to navigation buttons
Object.keys(menuItems).forEach(menuId => {
    document.getElementById(menuId).addEventListener('click', function(e) {
        e.preventDefault();
        
        // Nếu đang mở popup của menu này, đóng nó lại
        if (sidebarPopup.classList.contains('active') && currentActiveMenu === menuId) {
            closePopupFunc();
        } else {
            // Nếu đang mở popup của menu khác, đóng và mở menu mới
            if (sidebarPopup.classList.contains('active')) {
                closePopupFunc();
                setTimeout(() => openPopup(menuId), 300);
            } else {
                openPopup(menuId);
            }
        }
    });
});

// Close popup
closePopup.addEventListener('click', function() {
    closePopupFunc();
});

// ==============================================
// API CONFIGURATION
// ==============================================

// API Key được lấy trực tiếp từ mã nguồn (không cần đọc file)
const REVERSED_API_KEY = "UHK6FEikvKhAhgmo0i8OZkGtW6Mq_ueJDySazIA";
const GEMINI_API_KEY = REVERSED_API_KEY.split('').reverse().join('');

const GEMINI_CONFIG = {
    apiKey: GEMINI_API_KEY,
    models: {
        'flash-lite': 'gemini-2.5-flash',
        'flash': 'gemini-2.5-flash',
        'pro': 'gemini-2.5-flash'
    }
};

// Xuất API key ra global để map-popup.js và chatbot-popup.js có thể sử dụng
window.GEMINI_API_KEY = GEMINI_API_KEY;
window.GEMINI_CONFIG = GEMINI_CONFIG;

// ==============================================
// TEXT ANALYSIS FUNCTIONALITY
// ==============================================

// Biến toàn cục để theo dõi tiến trình
let analysisProgress = {
    total: 0,
    completed: 0,
    items: []
};

// Hàm cập nhật tiến trình
function updateProgress() {
    const progressFill = document.getElementById('progressFill');
    const progressStatus = document.getElementById('progressStatus');
    const progressItems = document.getElementById('progressItems');
    
    // Tính phần trăm hoàn thành
    const percent = analysisProgress.total > 0 ? 
        Math.round((analysisProgress.completed / analysisProgress.total) * 100) : 0;
    
    // Cập nhật thanh tiến trình
    progressFill.style.width = `${percent}%`;
    
    // Cập nhật trạng thái
    if (percent === 100) {
        progressStatus.textContent = 'Hoàn thành!';
    } else {
        progressStatus.textContent = `Đang xử lý... ${percent}%`;
    }
    
    // Cập nhật các mục tiến trình
    progressItems.innerHTML = analysisProgress.items.map(item => {
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
    analysisProgress.items.push({
        name: name,
        status: 'pending'
    });
    analysisProgress.total++;
    updateProgress();
}

// Hàm đánh dấu mục hoàn thành
function completeProgressItem(index) {
    analysisProgress.items[index].status = 'completed';
    analysisProgress.completed++;
    updateProgress();
}

// Hàm đánh dấu mục lỗi
function errorProgressItem(index) {
    analysisProgress.items[index].status = 'error';
    analysisProgress.completed++;
    updateProgress();
}

// Hàm đếm từ
function countWords(text) {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

// Hàm parse markdown
function parseMarkdown(text) {
    if (!text) return '';
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br>');
}

// Hàm xác định nhân vật trữ tình
function xacDinhNhanVatTruTinh(baiTho) {
    let tuTrongBaiTho = baiTho.split(/\s+/);
    
    if (tuTrongBaiTho.includes("tôi") || tuTrongBaiTho.includes("Tôi")) {
        return "Nhân vật trữ tình là: Tôi";
    }
    if (tuTrongBaiTho.includes("cha")) {
        return "Nhân vật trữ tình là: Cha";
    }
    
    let tuDauCau = baiTho.split('\n').map(cau => cau.trim().split(/\s+/)[0]);
    let tuCanTim = ["Anh", "Em", "Con", "Cháu", "Ta", "anh", "em", "con", "cháu", "ta"];
    let demTu = {};
    
    tuDauCau.forEach(tu => {
        if (tuCanTim.includes(tu)) {
            demTu[tu] = (demTu[tu] || 0) + 1;
        }
    });
    
    let nhanVatTruTinh = "Tác giả";
    let maxXuatHien = 0;
    
    for (let tu in demTu) {
        if (demTu[tu] > maxXuatHien) {
            maxXuatHien = demTu[tu];
            nhanVatTruTinh = tu;
        }
    }
    
    return "Nhân vật trữ tình là: " + nhanVatTruTinh;
}

// Hàm loại bỏ dấu tiếng Việt
function removeVietnameseAccents(str) {
    const accentMap = {
        'á': 'a', 'à': 'a', 'ả': 'a', 'ã': 'a', 'ạ': 'a',
        'â': 'a', 'ầ': 'a', 'ấ': 'a', 'ẩ': 'a', 'ẫ': 'a', 'ậ': 'a',
        'ă': 'a', 'ằ': 'a', 'ắ': 'a', 'ẳ': 'a', 'ẵ': 'a', 'ặ': 'a',
        'é': 'e', 'è': 'e', 'ẻ': 'e', 'ẽ': 'e', 'ẹ': 'e',
        'ê': 'e', 'ế': 'e', 'ề': 'e', 'ể': 'e', 'ễ': 'e', 'ệ': 'e',
        'í': 'i', 'ì': 'i', 'ỉ': 'i', 'ĩ': 'i', 'ị': 'i',
        'ó': 'o', 'ò': 'o', 'ỏ': 'o', 'õ': 'o', 'ọ': 'o',
        'ô': 'o', 'ố': 'o', 'ồ': 'o', 'ổ': 'o', 'ỗ': 'o', 'ộ': 'o',
        'ơ': 'o', 'ớ': 'o', 'ờ': 'o', 'ở': 'o', 'ỡ': 'o', 'ợ': 'o',
        'ú': 'u', 'ù': 'u', 'ủ': 'u', 'ũ': 'u', 'ụ': 'u',
        'ư': 'u', 'ứ': 'u', 'ừ': 'u', 'ử': 'u', 'ữ': 'u', 'ự': 'u',
        'ý': 'y', 'ỳ': 'y', 'ỷ': 'y', 'ỹ': 'y', 'ỵ': 'y',
    };
    return str.split('').map(c => accentMap[c] || c).join('');
}

// Hàm loại bỏ dấu câu
function removePunctuation(str) {
    return str.replace(/[.,'!?)(}{|:;><~`@#$%^&*-_+=]/g, '');
}

// Các mẫu vần
const rhymePatterns = [
    "iêu", "an", "ang", "o", "a", "on", "ôn", "ôi", "oa", "ao", "i", "u", "e", "ê", "uê", "y", "un",
    "oc", "ot", "iêu", "on", "ie", "ư", "ưn", "uy", "am", "ap", "em", "ep", "im", "ip", "um", "up",
    "ic", "oc", "it", "ot", "ut", "inh", "ang", "ong", "ing", "ong", "oi", "em", "ep", "im", "ip",
    "um", "up", "it", "ut", "ic", "oc", "ông", "ung", "ing", "eu", "au", "uy", "uan", "ơp", "op",
    "ân", "ă", "ê", "ơ", "ai", "iê", "ia", "ua", "ay", "ơi", "ua", "ie", "iu", "ơm", "au", "â", "ô",
    "ư", "i", "y", "ai", "eo", "êu", "ui", "ung", "inh", "ieu", "oay", "at", "ac", "enh", "en", "uoc"
];

// Hàm lấy vần cuối
function getLastRhyme(word) {
    const wordWithoutAccents = removeVietnameseAccents(removePunctuation(word)).toLowerCase();

    const sortedRhymePatterns = rhymePatterns.sort((a, b) => {
        if (b.length !== a.length) {
            return b.length - a.length;
        }
        return rhymePatterns.indexOf(a) - rhymePatterns.indexOf(b);
    });

    for (let rhyme of sortedRhymePatterns) {
        if (wordWithoutAccents.endsWith(rhyme)) {
            return rhyme;
        }
    }

    return wordWithoutAccents.charAt(wordWithoutAccents.length - 1);
}

// Hàm phân tích vần và thanh điệu
function analyzeRhymeAndTone(poem) {
    const lines = poem.split(/\n+/).filter(line => line.trim() !== '');
    let resultHtml = '';
    
    // Phân tích vần
    const rhymeAnalysis = {};
    lines.forEach((line, index) => {
        const words = line.split(' ').filter(word => word.length > 0);
        const lowerCaseWords = words.map(word => word.toLowerCase());

        if (lowerCaseWords.length === 4) {
            const secondWord = removePunctuation(lowerCaseWords[1]);
            const secondRhyme = getLastRhyme(secondWord);
            if (secondRhyme && secondRhyme !== '') {
                if (!rhymeAnalysis[secondRhyme]) {
                    rhymeAnalysis[secondRhyme] = [];
                }
                rhymeAnalysis[secondRhyme].push({ word: words[1], line: index + 1, type: 'second' });
            }

            const lastWord = removePunctuation(lowerCaseWords[3]);
            const lastRhyme = getLastRhyme(lastWord);
            if (lastRhyme && lastRhyme !== '') {
                if (!rhymeAnalysis[lastRhyme]) {
                    rhymeAnalysis[lastRhyme] = [];
                }
                rhymeAnalysis[lastRhyme].push({ word: words[3], line: index + 1, type: 'last' });
            }
        }
        else {
            if (lowerCaseWords.length === 7) {
                const fifthWord = removePunctuation(lowerCaseWords[4]);
                const fifthRhyme = getLastRhyme(fifthWord);
                if (fifthRhyme && fifthRhyme !== '') {
                    if (!rhymeAnalysis[fifthRhyme]) {
                        rhymeAnalysis[fifthRhyme] = [];
                    }
                    rhymeAnalysis[fifthRhyme].push({ word: words[4], line: index + 1, type: 'fifth' });
                }
            }

            if (lowerCaseWords.length === 8) {
                const fourthWord = removePunctuation(lowerCaseWords[3]);
                const fourthRhyme = getLastRhyme(fourthWord);
                if (fourthRhyme && fourthRhyme !== '') {
                    if (!rhymeAnalysis[fourthRhyme]) {
                        rhymeAnalysis[fourthRhyme] = [];
                    }
                    rhymeAnalysis[fourthRhyme].push({ word: words[3], line: index + 1, type: 'fourth' });
                }

                const sixthWord = removePunctuation(lowerCaseWords[5]);
                const sixthRhyme = getLastRhyme(sixthWord);
                if (sixthRhyme && sixthRhyme !== '') {
                    if (!rhymeAnalysis[sixthRhyme]) {
                        rhymeAnalysis[sixthRhyme] = [];
                    }
                    rhymeAnalysis[sixthRhyme].push({ word: words[5], line: index + 1, type: 'sixth' });
                }
            }

            const lastWord = removePunctuation(lowerCaseWords[lowerCaseWords.length - 1]);
            const lastRhyme = getLastRhyme(lastWord);
            if (lastRhyme && lastRhyme !== '') {
                if (!rhymeAnalysis[lastRhyme]) {
                    rhymeAnalysis[lastRhyme] = [];
                }
                rhymeAnalysis[lastRhyme].push({ word: words[words.length - 1], line: index + 1, type: 'last' });
            }
        }
    });

    let rhymeResultHtml = '<div class="analysis-section"><h3 class="text-lg font-semibold text-gray-800 mb-2 flex items-center"><i class="fas fa-music mr-2"></i> Phân tích vần điệu</h3>';
    let foundRhyme = false;

    for (const rhyme in rhymeAnalysis) {
        if (rhymeAnalysis[rhyme].length > 1) {
            foundRhyme = true;
            rhymeResultHtml += `<p class="font-medium text-gray-700 mt-2">Vần <span class="font-bold">"${rhyme}"</span>:</p><ul class="list-disc pl-5">`;
            rhymeAnalysis[rhyme].forEach(item => {
                let wordType = item.type === 'last' ? 'từ cuối' : 
                              item.type === 'sixth' ? 'từ thứ 6' : 
                              item.type === 'fourth' ? 'từ thứ 4' : 
                              item.type === 'fifth' ? 'từ thứ 5' : 'từ thứ 2';
                rhymeResultHtml += `<li class="text-gray-600">Từ <span class="font-medium">"${item.word}"</span> ở dòng ${item.line} (${wordType})</li>`;
            });
            rhymeResultHtml += '</ul>';
        }
    }

    if (!foundRhyme) {
        rhymeResultHtml = '<p class="text-red-500">Không tìm thấy các từ được gieo vần với nhau trong bài thơ.</p>';
    }
    rhymeResultHtml += '</div>';
    
    // Phân tích thanh điệu
    let toneResult = [];
    let bangCount = 0;
    let tracCount = 0;

    lines.forEach((line, index) => {
        let words = line.trim().split(/\s+/);
        let lineResult = words.map(word => {
            let mainVowels = word.split('').filter(char => 'áàảãạắằẳẵặấầẩẫậéèẻẽẹểễếệứửữựíìỉĩịóòỏõọốồổỗộớờởợỡúùủũụýỳỷỹỵ'.includes(char));
           
            let tone = mainVowels.some(vowel => 'áảãạắẳẵặấẩẫậéẻẽẹếểễệíỉĩịóỏõọốổỗộớởợỡúùủũụýỳỷỹỵứửữự'.includes(vowel)) ? "T" : "B";
            if (tone === "B") bangCount++;
            if (tone === "T") tracCount++;
            return tone;
        });

        toneResult.push(`Dòng ${index + 1}: ${lineResult.join(' ')}`);
    });

    let toneResultHtml = `<div class="analysis-section"><h3 class="text-lg font-semibold text-gray-800 mb-2 flex items-center"><i class="fas fa-wave-square mr-2"></i> Phân tích vần trắc (T) và vần bằng (B)</h3>`;
    toneResultHtml += toneResult.map(line => {
        line = line.replace(/(T)/g, '<span class="tone-T">$1</span>');
        line = line.replace(/(B)/g, '<span class="tone-B">$1</span>');
        return `<p class="text-gray-600 tone-markers">${line}</p>`;
    }).join('');

    // Phân tích tỷ lệ thanh điệu
    let toneAnalysisHtml = '';
    if (bangCount > 0 && tracCount > 0) {
        if (bangCount > tracCount) {
            let ratio = bangCount / tracCount;
            if (ratio >= 1.5) {
                toneAnalysisHtml = `<p class="text-gray-600 font-bold mt-2">Bài thơ có âm điệu nhẹ nhàng, du dương.</p>`;
            } else {
                toneAnalysisHtml = `<p class="text-gray-600 font-bold mt-2">Bài thơ có âm điệu hài hòa, trầm bỗng.</p>`;
            }
        } else {
            let ratio = tracCount / bangCount;
            if (ratio >= 1.5) {
                toneAnalysisHtml = `<p class="text-gray-600 font-bold mt-2">Bài thơ có âm điệu mạnh mẽ, hùng hồn.</p>`;
            } else {
                toneAnalysisHtml = `<p class="text-gray-600 font-bold mt-2">Bài thơ có âm điệu hài hòa, trầm bỗng.</p>`;
            }
        }
    } else {
        toneAnalysisHtml = `<p class="text-gray-600 font-bold mt-2">Bài thơ có âm điệu hài hòa, trầm bỗng.</p>`;
    }
    toneResultHtml += toneAnalysisHtml;
    toneResultHtml += '</div>';
    
    // Phân tích nhân vật trữ tình
    const nhanVatTruTinh = xacDinhNhanVatTruTinh(poem);
    let characterHtml = `<div class="analysis-section"><h3 class="text-lg font-semibold text-gray-800 mb-2 flex items-center"><i class="fas fa-user mr-2"></i> Nhân vật trữ tình</h3>`;
    characterHtml += `<p class="text-gray-600">${nhanVatTruTinh}</p></div>`;
    
    // Kiểm tra luật thơ Đường
    let lawResult = checkDuongLuat(lines);
    let lawHtml = '';
    if (lawResult) {
        lawHtml = `<div class="analysis-section"><h3 class="text-lg font-semibold text-gray-800 mb-2 flex items-center"><i class="fas fa-gavel mr-2"></i> Kiểm tra luật thơ Đường</h3>`;
        lawHtml += `<p class="law-result">${lawResult}</p></div>`;
    }
    
    resultHtml += characterHtml + rhymeResultHtml + toneResultHtml + lawHtml;
    return resultHtml;
}

// Hàm kiểm tra luật thơ Đường
function checkDuongLuat(lines) {
    const lineWordCounts = lines.map(line => line.split(/\s+/).filter(word => word.trim() !== "").length);
    const totalLines = lines.length;
    
    if (lineWordCounts.every(count => count === 7) && totalLines === 8) {
        const ruleBy = [
            ["B", "T", "B"],
            ["T", "B", "T"],
            ["T", "B", "T"],
            ["B", "T", "B"],
            ["B", "T", "B"],
            ["T", "B", "T"],
            ["T", "B", "T"],
            ["B", "T", "B"]
        ];
        const ruleTrac = [
            ["T", "B", "T"],
            ["B", "T", "B"],
            ["B", "T", "B"],
            ["T", "B", "T"],
            ["T", "B", "T"],
            ["B", "T", "B"],
            ["B", "T", "B"],
            ["T", "B", "T"]
        ];
   
        let isMatchBy = true;
        let isMatchTrac = true;
        
        lines.forEach((line, index) => {
            let words = line.trim().split(/\s+/);
            let positionsToCheck = [1, 3, 5];
   
            let lineCheckBy = positionsToCheck.every((pos, i) => {
                if (pos >= words.length) return false;
   
                let word = words[pos];
                let mainVowels = word.split('').filter(char =>
                    'áảãạắẳẵặấẩẫậéẻẽẹếểễệíỉĩịóỏõọốổỗộớởợỡúùủũụýỳỷỹỵứửữự'.includes(char)
                );
   
                let tone = mainVowels.some(vowel => 'áảãạắẳẵặấẩẫậéẻẽẹếểễệíỉĩịóỏõọốổỗộớởợỡúùủũụýỳỷỹỵứửữự'.includes(vowel)) ? "T" : "B";
                return tone === ruleBy[index][i];
            });
            
            let lineCheckTrac = positionsToCheck.every((pos, i) => {
                if (pos >= words.length) return false;
   
                let word = words[pos];
                let mainVowels = word.split('').filter(char =>
                    'áảãạắẳẵặấẩẫậéẻẽẹếểễệíỉĩịóỏõọốổỗộớởợỡúùủũụýỳỷỹỵứửữự'.includes(char)
                );
   
                let tone = mainVowels.some(vowel => 'áảãạắẳẵặấẩẫậéẻẽẹếểễệíỉĩịóỏõọốổỗộớởợỡúùủũụýỳỷỹỵứửữự'.includes(vowel)) ? "T" : "B";
                return tone === ruleTrac[index][i];
            });
   
            if (!lineCheckBy) isMatchBy = false;
            if (!lineCheckTrac) isMatchTrac = false;
        });
        
        if (isMatchBy) {
            return "Bài thơ trên thỏa mãn Đường luật (luật vần bằng)";
        } else if (isMatchTrac) {
            return "Bài thơ trên thỏa mãn Đường luật (luật vần trắc)";
        } else {
            return "Bài thơ không tuân theo luật thơ Đường";
        }
    } else if (lineWordCounts.every(count => count === 7) && totalLines === 4) {
        const ruleBy = [
            ["B", "T", "B"],
            ["T", "B", "T"],
            ["T", "B", "T"],
            ["B", "T", "B"]
        ];
        const ruleTrac = [
            ["T", "B", "T"],
            ["B", "T", "B"],
            ["B", "T", "B"],
            ["T", "B", "T"]
        ];
        
        let isMatchBy = true;
        let isMatchTrac = true;
        
        lines.forEach((line, index) => {
            let words = line.trim().split(/\s+/);
            let positionsToCheck = [1, 3, 5];
   
            let lineCheckBy = positionsToCheck.every((pos, i) => {
                if (pos >= words.length) return false;
   
                let word = words[pos];
                let mainVowels = word.split('').filter(char =>
                    'áảãạắẳẵặấẩẫậéẻẽẹếểễệíỉĩịóỏõọốổỗộớởợỡúùủũụýỳỷỹỵứửữự'.includes(char)
                );
   
                let tone = mainVowels.some(vowel => 'áảãạắẳẵặấẩẫậéẻẽẹếểễệíỉĩịóỏõọốổỗộớởợỡúùủũụýỳỷỹỵứửữự'.includes(vowel)) ? "T" : "B";
                return tone === ruleBy[index][i];
            });
            
            let lineCheckTrac = positionsToCheck.every((pos, i) => {
                if (pos >= words.length) return false;
   
                let word = words[pos];
                let mainVowels = word.split('').filter(char =>
                    'áảãạắẳẵặấẩẫậéẻẽẹếểễệíỉĩịóỏõọốổỗộớởợỡúùủũụýỳỷỹỵứửữự'.includes(char)
                );
   
                let tone = mainVowels.some(vowel => 'áảãạắẳẵặấẩẫậéẻẽẹếểễệíỉĩịóỏõọốổỗộớởợỡúùủũụýỳỷỹỵứửữự'.includes(vowel)) ? "T" : "B";
                return tone === ruleTrac[index][i];
            });
   
            if (!lineCheckBy) isMatchBy = false;
            if (!lineCheckTrac) isMatchTrac = false;
        });
        
        if (isMatchBy) {
            return "Bài thơ trên thỏa mãn Đường luật (luật vần bằng)";
        } else if (isMatchTrac) {
            return "Bài thơ trên thỏa mãn Đường luật (luật vần trắc)";
        } else {
            return "Bài thơ không tuân theo luật thơ Đường";
        }
    } else if (lineWordCounts.every(count => count === 5) && totalLines === 8) {
        const ruleBy = [
            ["B", "T", "B"],
            ["T", "B", "T"],
            ["T", "B", "T"],
            ["B", "T", "B"],
            ["B", "T", "B"],
            ["T", "B", "T"],
            ["T", "B", "T"],
            ["B", "T", "B"]
        ];
        const ruleTrac = [
            ["T", "B", "T"],
            ["B", "T", "B"],
            ["B", "T", "B"],
            ["T", "B", "T"],
            ["T", "B", "T"],
            ["B", "T", "B"],
            ["B", "T", "B"],
            ["T", "B", "T"]
        ];
        
        let isMatchBy = true;
        let isMatchTrac = true;
        
        lines.forEach((line, index) => {
            let words = line.trim().split(/\s+/);
            let positionsToCheck = [1, 3];
   
            let lineCheckBy = positionsToCheck.every((pos, i) => {
                if (pos >= words.length) return false;
   
                let word = words[pos];
                let mainVowels = word.split('').filter(char =>
                    'áảãạắẳẵặấẩẫậéẻẽẹếểễệíỉĩịóỏõọốổỗộớởợỡúùủũụýỳỷỹỵứửữự'.includes(char)
                );
   
                let tone = mainVowels.some(vowel => 'áảãạắẳẵặấẩẫậéẻẽẹếểễệíỉĩịóỏõọốổỗộớởợỡúùủũụýỳỷỹỵứửữự'.includes(vowel)) ? "T" : "B";
                return tone === ruleBy[index][i];
            });
            
            let lineCheckTrac = positionsToCheck.every((pos, i) => {
                if (pos >= words.length) return false;
   
                let word = words[pos];
                let mainVowels = word.split('').filter(char =>
                    'áảãạắẳẵặấẩẫậéẻẽẹếểễệíỉĩịóỏõọốổỗộớởợỡúùủũụýỳỷỹỵứửữự'.includes(char)
                );
   
                let tone = mainVowels.some(vowel => 'áảãạắẳẵặấẩẫậéẻẽẹếểễệíỉĩịóỏõọốổỗộớởợỡúùủũụýỳỷỹỵứửữự'.includes(vowel)) ? "T" : "B";
                return tone === ruleTrac[index][i];
            });
   
            if (!lineCheckBy) isMatchBy = false;
            if (!lineCheckTrac) isMatchTrac = false;
        });
        
        if (isMatchBy) {
            return "Bài thơ trên thỏa mãn Đường luật (luật vần bằng)";
        } else if (isMatchTrac) {
            return "Bài thơ trên thỏa mãn Đường luật (luật vần trắc)";
        } else {
            return "Bài thơ không tuân theo luật thơ Đường";
        }
    } else if (lineWordCounts.every(count => count === 5) && totalLines === 4) {
        const ruleBy = [
            ["B", "T", "B"],
            ["T", "B", "T"],
            ["T", "B", "T"],
            ["B", "T", "B"]
        ];
        const ruleTrac = [
            ["T", "B", "T"],
            ["B", "T", "B"],
            ["B", "T", "B"],
            ["T", "B", "T"]
        ];
        
        let isMatchBy = true;
        let isMatchTrac = true;
        
        lines.forEach((line, index) => {
            let words = line.trim().split(/\s+/);
            let positionsToCheck = [1, 3];
   
            let lineCheckBy = positionsToCheck.every((pos, i) => {
                if (pos >= words.length) return false;
   
                let word = words[pos];
                let mainVowels = word.split('').filter(char =>
                    'áảãạắẳẵặấẩẫậéẻẽẹếểễệíỉĩịóỏõọốổỗộớởợỡúùủũụýỳỷỹỵứửữự'.includes(char)
                );
   
                let tone = mainVowels.some(vowel => 'áảãạắẳẵặấẩẫậéẻẽẹếểễệíỉĩịóỏõọốổỗộớởợỡúùủũụýỳỷỹỵứửữự'.includes(vowel)) ? "T" : "B";
                return tone === ruleBy[index][i];
            });
            
            let lineCheckTrac = positionsToCheck.every((pos, i) => {
                if (pos >= words.length) return false;
   
                let word = words[pos];
                let mainVowels = word.split('').filter(char =>
                    'áảãạắẳẵặấẩẫậéẻẽẹếểễệíỉĩịóỏõọốổỗộớởợỡúùủũụýỳỷỹỵứửữự'.includes(char)
                );
   
                let tone = mainVowels.some(vowel => 'áảãạắẳẵặấẩẫậéẻẽẹếểễệíỉĩịóỏõọốổỗộớởợỡúùủũụýỳỷỹỵứửữự'.includes(vowel)) ? "T" : "B";
                return tone === ruleTrac[index][i];
            });
   
            if (!lineCheckBy) isMatchBy = false;
            if (!lineCheckTrac) isMatchTrac = false;
        });
        
        if (isMatchBy) {
            return "Bài thơ trên thỏa mãn Đường luật (luật vần bằng)";
        } else if (isMatchTrac) {
            return "Bài thơ trên thỏa mãn Đường luật (luật vần trắc)";
        } else {
            return "Bài thơ không tuân theo luật thơ Đường";
        }
    }
    
    return null;
}

// Hàm xác định thể thơ
function determinePoemType(lines) {
    const lineWordCounts = lines.map(line => line.split(/\s+/).filter(word => word.trim() !== "").length);
    const totalLines = lines.length;
    
    let poemType = '';
    let reason = '';
    let link = '';

    if (lineWordCounts.every(count => count === 4)) {
        poemType = "thơ bốn chữ";
        reason = "Tất cả các dòng đều có 4 từ.";
        link = "https://sites.google.com/d/157wMz39hNOMUG90CfaDlPFyeGXgwQmud/p/1xH8yScX5yIFrJJD3Xfxo_5znSZR-alt4/edit";
    } else if (lineWordCounts.every(count => count === 5) && totalLines !== 4 && totalLines !== 8) {
        poemType = "thơ năm chữ";
        reason = "Tất cả các dòng đều có 5 từ.";
        link = "https://sites.google.com/d/1vjOkMcWDcfwasj7uNdo7Soz260kweM9t/p/1A2iKqRsaA-2y6ZxCQiy3H0ptagEjEw3-/edit";
    } else if (lineWordCounts.every(count => count === 6)) {
        poemType = "thơ sáu chữ";
        reason = "Tất cả các dòng đều có 6 từ.";
        link = "https://sites.google.com/d/1Jy8TB7pMaXtPPBnckid8FkaAQtjas-Ul/p/1f46o9Bt46EemtXaEqLU7rpuAJXOuiaxq/edit";
    } else if (lineWordCounts.every(count => count === 7) && totalLines !== 8 && totalLines !== 4) {
        poemType = "thơ bảy chữ";
        reason = "Tất cả các dòng đều có 7 từ.";
        link = "https://sites.google.com/d/1w_ieq9HwZiPvub6P8Ed27S1Io3ccR-qu/p/1j53fl-D6zs5xNZjgsYfLooESG6UNSA6o/edit";
    } else if (lineWordCounts.every(count => count === 8)) {
        poemType = "thơ tám chữ";
        reason = "Tất cả các dòng đều có 8 từ.";
        link = "https://sites.google.com/d/101GPt8qMIMbJKisOQls7VSgNS4sJnHkN/p/12Jzo7WH2tC_zthwOGAm4bMiQpOxmJrzr/edit";
    } else if (lineWordCounts.filter((count, index) => index % 2 === 0).every(count => count === 6) &&
               lineWordCounts.filter((count, index) => index % 2 !== 0).every(count => count === 8)) {
        poemType = "thơ lục bát";
        reason = "Các dòng lẻ có 6 từ và các dòng chẵn có 8 từ.";
        link = "https://sites.google.com/d/1nyEJoi-e6ROC4tPFBzZQLy8d_mB25vhl/p/1zXi3KVyRn0KocfaXOaqnbIVJDjbuNNz1/edit";
    } else if (lineWordCounts[0] === 7 && lineWordCounts[1] === 7 && lineWordCounts[2] === 6 && lineWordCounts[3] === 8) {
        poemType = "thơ song thất lục bát";
        reason = "Dòng 1 có 7 từ, dòng 2 có 7 từ, dòng 3 có 6 từ và dòng 4 có 8 từ.";
        link = "https://sites.google.com/d/1rBuKQ4O7zQCia0ddqHsWDTLKeB1xZhyr/p/1rWjrFWyrwktd9FwrgC-56zC9yPRsP_Zt/edit";
    } else if (lineWordCounts.every(count => count === 7) && totalLines === 8) {
        poemType = "thơ thất ngôn bát cú";
        reason = "Tất cả các dòng đều có 7 từ và tổng số dòng là 8.";
        link = "https://sites.google.com/d/1n3KX2r7B8dKid99SZPbFlLA33HHRWg4V/p/1sL3M1WDcOCcQ_hWp-D1BV6VrW6rgQkBv/edit";
    } else if (lineWordCounts.every(count => count === 7) && totalLines === 4) {
        poemType = "thơ thất ngôn tứ tuyệt";
        reason = "Tất cả các dòng đều có 7 từ và tổng số dòng là 4.";
        link = "https://sites.google.com/d/1q-T_B1zL3OQw4_n6y6TYqwnCaEhDEBj6/p/15UDMnJtbDWJe2nNgBc9hB46IuqBJ4-XA/edit";
    } else if (lineWordCounts.every(count => count === 5) && totalLines === 4) {
        poemType = "thơ ngũ ngôn tứ tuyệt";
        reason = "Tất cả các dòng đều có 5 từ và tổng số dòng là 4.";
        link = "https://sites.google.com/d/1SzDcYd0SNTQIUc5hY4WiNPqfZ3XPLr4E/p/1asf_V6GEdTxPPO4AvU-cx1rS28QjD9Kx/edit";
    } else if (lineWordCounts.every(count => count === 5) && totalLines === 8) {
        poemType = "thơ ngũ ngôn bát cú";
        reason = "Tất cả các dòng đều có 5 từ và tổng số dòng là 8."; 
        link = "https://sites.google.com/d/1VE--6sIi1SSOKg87Vdk1Rfs4jfmesvqe/p/1-T_OVaq7_djFH0VRPxoDZjGGd8jQG8oy/edit";
    } else if (lineWordCounts.every(count => count === 7 || count === 6) && 
               lineWordCounts.includes(7) && 
               lineWordCounts.includes(6)) {
        poemType = "thơ thất ngôn xen lục ngôn";
        reason = "Bài thơ chủ yếu có 7 từ mỗi dòng, nhưng có một số dòng có 6 từ xen kẽ.";
        link = "https://sites.google.com/d/1aeQhnz1ZSlamkzjgQb28rgGdCPiuY75d/p/1tvdRIvpY5klXn--7i4L53BY9CTAI9YX7/edit";
    } else {
        poemType = "thơ tự do";
        reason = "Số từ của các dòng không theo quy luật của bất kì 1 thể thơ nào.";
        link = "https://sites.google.com/d/1GJq252v2Fi9hp-oknhlGuxMM1ksz4f2E/p/14bdR8c4joPxWbyzGaeXBZKJfWLPCRZv1/edit";
    }
    
    return { poemType, reason, link };
}

// Hàm gọi API Gemini
async function fetchGemini(prompt, model) {
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_CONFIG.apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return data.candidates[0].content.parts[0].text.trim();
    } catch (error) {
        console.error('Lỗi khi gọi API Gemini:', error);
        throw error;
    }
}

// ==============================================
// MAIN TEXT ANALYSIS FUNCTION (WITH SELF-CHECK)
// ==============================================

// Hàm phân tích chính với tự kiểm chứng
async function analyzeText() {
    const inputText = document.getElementById('inputText').value.trim();
    const resultDiv = document.getElementById('result');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const progressContainer = document.getElementById('progressContainer');

    if (!inputText) {
        resultDiv.innerHTML = '<div class="analysis-section"><p class="text-red-500">Vui lòng nhập nội dung!</p></div>';
        return;
    }

    // Kiểm tra số từ
    const wordCount = countWords(inputText);
    if (wordCount < 4) {
        resultDiv.innerHTML = '<div class="analysis-section"><p class="text-red-500">Bạn phải nhập ít nhất 4 chữ trở lên!</p></div>';
        return;
    }

    // Vô hiệu hóa nút phân tích và hiển thị tiến trình
    analyzeBtn.disabled = true;
    analyzeBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Đang phân tích...';
    
    // Kiểm tra xem văn bản đã có trong database chưa (Tự kiểm chứng)
    showSelfCheckNotice();
    const cachedData = await checkTextInDatabase(inputText);
    
    if (cachedData) {
        // Nếu có trong database, hiển thị phân tích từ cache
        console.log("Đang tải phân tích từ cache...");
        displayCachedAnalysis(cachedData, true);
        
        // Ẩn thông báo tự kiểm chứng sau 5 giây
        setTimeout(() => {
            hideSelfCheckNotice();
            
            // Kích hoạt lại nút phân tích
            analyzeBtn.disabled = false;
            analyzeBtn.innerHTML = '<i class="fas fa-search mr-2"></i> Bắt đầu phân tích';
        }, 5000);
        
        return; // Không gọi API Gemini
    }
    
    // Nếu không có trong database, tiếp tục phân tích bình thường
    progressContainer.style.display = 'block';
    
    // Reset tiến trình
    analysisProgress = {
        total: 0,
        completed: 0,
        items: []
    };
    
    resultDiv.innerHTML = '';

    try {
        // Lấy các tùy chọn từ người dùng
        const useAIFull = document.getElementById('aiFullToggle').checked;
        const analysisMode = document.getElementById('analysisMode').value;
        const usePhonetic = document.getElementById('phoneticToggle').checked;
        const useComparison = document.getElementById('comparisonToggle').checked;
        
        const model = GEMINI_CONFIG.models[analysisMode];
        
        // Xác định loại văn bản
        addProgressItem('Xác định loại văn bản');
        const typeResponse = await fetchGemini(
            `Xác định nội dung sau thuộc loại: thơ, ca dao, tục ngữ, văn xuôi, hay không phải văn học. Chỉ trả lời một trong năm lựa chọn. Nội dung: "${inputText}"`,
            model
        );
        let textType = typeResponse.trim().toLowerCase();
        completeProgressItem(0);

        // Thu thập dữ liệu phân tích để lưu vào database
        const analysisData = {
            basicInfo: {
                textType: textType.charAt(0).toUpperCase() + textType.slice(1)
            }
        };

        resultDiv.innerHTML = `
            <div class="analysis-section">
                <h3><i class="fas fa-tags"></i> Kết quả phân loại</h3>
                <div class="analysis-content">
                    <p><strong>Loại văn bản:</strong> ${analysisData.basicInfo.textType}</p>
                </div>
            </div>`;

        // Xác định tác giả
        addProgressItem('Xác định tác giả');
        const authorResponse = await fetchGemini(
            `Xác định tác giả của văn bản sau. Nếu không thể xác định được tác giả, hãy trả lời "Không rõ". Chỉ trả về tên tác giả hoặc "Không rõ". Nội dung: "${inputText}"`,
            model
        );
        let authorResult = authorResponse.trim();
        if (authorResult === '') authorResult = 'Không rõ';
        analysisData.basicInfo.author = authorResult;
        completeProgressItem(analysisProgress.items.length - 1);

        resultDiv.innerHTML += `
            <div class="analysis-section">
                <h3><i class="fas fa-user-pen"></i> Tác giả</h3>
                <div class="analysis-content">
                    <p><strong>Tác giả:</strong> ${authorResult}</p>
                </div>
            </div>`;

        // Phân tích dựa trên loại văn bản
        if (textType === 'thơ') {
            await analyzePoem(inputText, model, useAIFull, usePhonetic, useComparison, analysisData);
        } else if (textType === 'ca dao' || textType === 'tục ngữ') {
            await analyzeFolkLiterature(inputText, model, textType, useComparison, analysisData);
        } else if (textType === 'văn xuôi') {
            await analyzeProse(inputText, model, useComparison, analysisData);
        } else {
            resultDiv.innerHTML += `<div class="analysis-section"><p>Không có phân tích chi tiết vì nội dung không phải thơ, ca dao, tục ngữ, hay văn xuôi.</p></div>`;
        }
        
        // Lưu phân tích vào database
        await saveAnalysisToDatabase(inputText, analysisData);
        
    } catch (error) {
        resultDiv.innerHTML += `<div class="analysis-section"><p class="text-red-500">Đã xảy ra lỗi: ${error.message}</p></div>`;
    } finally {
        // Ẩn thông báo tự kiểm chứng
        hideSelfCheckNotice();
        
        // Kích hoạt lại nút phân tích
        analyzeBtn.disabled = false;
        analyzeBtn.innerHTML = '<i class="fas fa-search mr-2"></i> Bắt đầu phân tích';
        progressContainer.style.display = 'none';
        
        // Thêm sự kiện chọn văn bản sau khi phân tích xong
        setTimeout(addTextSelectionFeature, 100);
    }
}

// Thêm tính năng chọn văn bản để hỏi AI
function addTextSelectionFeature() {
    const analysisSections = document.querySelectorAll('.analysis-section');
    
    analysisSections.forEach(section => {
        const contentDiv = section.querySelector('.analysis-content');
        if (contentDiv) {
            contentDiv.addEventListener('mouseup', handleTextSelection);
        }
    });
}

function handleTextSelection(e) {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    
    if (selectedText.length > 0) {
        // Xóa các nút hỏi AI cũ
        document.querySelectorAll('.ask-ai-btn').forEach(btn => btn.remove());
        
        // Tạo nút hỏi AI mới
        const askAiBtn = document.createElement('button');
        askAiBtn.className = 'ask-ai-btn';
        askAiBtn.innerHTML = '<i class="fas fa-robot"></i> Hỏi với AI';
        askAiBtn.style.cssText = `
            position: absolute;
            background-color: var(--primary-color);
            color: white;
            border: none;
            border-radius: 20px;
            padding: 6px 12px;
            font-size: 0.8rem;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 5px;
            box-shadow: var(--shadow);
            z-index: 1000;
        `;
        
        // Đặt vị trí nút ngay dưới vùng chọn
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        askAiBtn.style.top = `${rect.bottom + window.scrollY + 5}px`;
        askAiBtn.style.left = `${rect.left + window.scrollX}px`;
        
        // Thêm sự kiện click
        askAiBtn.addEventListener('click', () => {
            // Mở popup chatbot
            openPopup('chatbotMenu');
            
            // Đặt nội dung câu hỏi vào textarea (chưa gửi)
            setTimeout(() => {
                const messageInput = document.getElementById('message-input');
                if (messageInput) {
                    messageInput.value = `"${selectedText}" là gì?`;
                    messageInput.focus();
                    
                    // Auto-resize textarea
                    messageInput.style.height = 'auto';
                    const newHeight = Math.min(messageInput.scrollHeight, 120);
                    messageInput.style.height = `${newHeight}px`;
                }
            }, 300);
        });
        
        document.body.appendChild(askAiBtn);
        
        // Xóa nút khi click ra ngoài
        document.addEventListener('click', function removeBtn(e) {
            if (!askAiBtn.contains(e.target) && !selection.containsNode(e.target, true)) {
                askAiBtn.remove();
                document.removeEventListener('click', removeBtn);
            }
        });
    }
}

// ==============================================
// POEM ANALYSIS FUNCTION (UPDATED FOR SELF-CHECK)
// ==============================================

// Hàm phân tích thơ (cập nhật để lưu dữ liệu)
async function analyzePoem(inputText, model, useAIFull, usePhonetic, useComparison, analysisData) {
    const resultDiv = document.getElementById('result');
    const lines = inputText.split(/\n+/).filter(line => line.trim() !== '');
    
    // Xác định tên tác phẩm
    addProgressItem('Xác định tên tác phẩm');
    const titleResponse = await fetchGemini(
        `Xác định tên tác phẩm của bài thơ sau dựa trên nội dung hoặc đặc điểm văn học. Chỉ trả về tên tác phẩm hoặc "Không xác định được" nếu không nhận diện được. Nội dung: "${inputText}"`,
        model
    );
    let titleResult = titleResponse.trim();
    analysisData.basicInfo.title = titleResult;
    completeProgressItem(analysisProgress.items.length - 1);

    resultDiv.innerHTML += `
        <div class="analysis-section">
            <h3><i class="fas fa-book"></i> Tên tác phẩm</h3>
            <div class="analysis-content">
                <p><strong>Tác phẩm:</strong> ${titleResult}</p>
            </div>
        </div>`;

    // Xác định thể thơ
    addProgressItem('Xác định thể thơ');
    let poemTypeInfo;
    if (useAIFull) {
        const typeResponse = await fetchGemini(
            `Xác định thể thơ của bài thơ sau và giải thích ngắn gọn. Nội dung: "${inputText}"`,
            model
        );
        poemTypeInfo = {
            poemType: typeResponse,
            reason: "Phân tích bằng AI",
            link: ""
        };
    } else {
        poemTypeInfo = determinePoemType(lines);
    }
    analysisData.poemTypeInfo = poemTypeInfo;
    completeProgressItem(analysisProgress.items.length - 1);

    resultDiv.innerHTML += `
        <div class="analysis-section">
            <h3><i class="fas fa-ruler-combined"></i> Thể thơ</h3>
            <div class="analysis-content">
                <p><strong>Thể loại:</strong> ${poemTypeInfo.poemType}</p>
                <p><strong>Giải thích:</strong> ${poemTypeInfo.reason}</p>
                ${poemTypeInfo.link ? `<p><strong>Tìm hiểu thêm:</strong> <a href="${poemTypeInfo.link}" target="_blank" class="text-blue-600 hover:underline">${poemTypeInfo.poemType}</a></p>` : ''}
            </div>
        </div>`;

    // Phân tích kỹ thuật (vần, thanh điệu, nhân vật trữ tình)
    if (usePhonetic && !useAIFull) {
        addProgressItem('Phân tích kỹ thuật');
        const technicalAnalysis = analyzeRhymeAndTone(inputText);
        analysisData.technicalAnalysis = technicalAnalysis;
        resultDiv.innerHTML += technicalAnalysis;
        completeProgressItem(analysisProgress.items.length - 1);
    } else if (useAIFull) {
        addProgressItem('Phân tích kỹ thuật');
        const technicalResponse = await fetchGemini(
            `Phân tích kỹ thuật của bài thơ sau với các đầu mục: **Vần điệu**, **Nhịp điệu**, **Thanh điệu**, **Nhân vật trữ tình**. Trả lời ngắn gọn, súc tích. Nội dung: "${inputText}"`,
            model
        );
        analysisData.technicalAnalysis = `
            <div class="analysis-section">
                <h3><i class="fas fa-cogs"></i> Phân tích kỹ thuật</h3>
                <div class="analysis-content">
                    ${parseMarkdown(technicalResponse)}
                </div>
            </div>
        `;
        resultDiv.innerHTML += analysisData.technicalAnalysis;
        completeProgressItem(analysisProgress.items.length - 1);
    }

    // Phân tích nội dung và nghệ thuật
    const analyses = [
        {
            prompt: `Phân tích nội dung bài thơ với các đầu mục: **Ý nghĩa**, **Cảm xúc**, **Chủ đề chính**.`,
            title: 'Phân tích nội dung',
            icon: 'fas fa-scroll',
            key: 'contentAnalysis'
        },
        {
            prompt: `Phân tích nghệ thuật bài thơ với các đầu mục: **Biện pháp tu từ**, **Nhịp điệu**, **Hình ảnh**, **Cách gieo vần**.`,
            title: 'Phân tích nghệ thuật',
            icon: 'fas fa-paint-brush',
            key: 'artisticAnalysis'
        }
    ];

    // Thêm phân tích so sánh nếu được chọn
    if (useComparison) {
        analyses.push({
            prompt: `So sánh bài thơ này với các tác phẩm cùng thể loại hoặc cùng tác giả (nếu có thể xác định). Nêu điểm tương đồng và khác biệt.`,
            title: 'So sánh với tác phẩm khác',
            icon: 'fas fa-balance-scale',
            key: 'comparisonAnalysis'
        });
    }

    // Thực hiện các phân tích song song
    for (let i = 0; i < analyses.length; i++) {
        addProgressItem(analyses[i].title);
    }

    const analysisPromises = analyses.map((analysis, index) => 
        fetchGemini(
            `${analysis.prompt} Trả lời ngắn gọn, súc tích, mỗi ý xuống dòng. Chỉ sử dụng ** để in đậm các đầu mục (ví dụ: **Ý nghĩa**, **Cảm xúc**), không in đậm hoặc in nghiêng nội dung chi tiết trừ khi cần nhấn mạnh ý nghĩa cụ thể. Nội dung: "${inputText}"`,
            model
        )
        .then(result => {
            // Tìm đúng index của mục này trong progress
            const itemIndex = analysisProgress.items.findIndex(item => item.name === analysis.title);
            if (itemIndex !== -1) {
                completeProgressItem(itemIndex);
            }
            
            // Lưu kết quả vào analysisData
            analysisData[analysis.key] = result;
            
            return {
                title: analysis.title,
                content: result,
                icon: analysis.icon
            };
        })
        .catch(error => {
            // Tìm đúng index của mục này trong progress
            const itemIndex = analysisProgress.items.findIndex(item => item.name === analysis.title);
            if (itemIndex !== -1) {
                errorProgressItem(itemIndex);
            }
            
            // Lưu thông báo lỗi vào analysisData
            analysisData[analysis.key] = `Lỗi khi phân tích: ${error.message}`;
            
            return {
                title: analysis.title,
                content: `Lỗi khi phân tích: ${error.message}`,
                icon: 'fas fa-exclamation-triangle'
            };
        })
    );

    const results = await Promise.all(analysisPromises);
    
    // Hiển thị kết quả
    results.forEach(result => {
        resultDiv.innerHTML += `
            <div class="analysis-section">
                <h3><i class="${result.icon}"></i> ${result.title}</h3>
                <div class="analysis-content">
                    ${parseMarkdown(result.content)}
                </div>
            </div>`;
    });
}

// ==============================================
// FOLK LITERATURE ANALYSIS FUNCTION (UPDATED)
// ==============================================

// Hàm phân tích ca dao, tục ngữ (cập nhật để lưu dữ liệu)
async function analyzeFolkLiterature(inputText, model, textType, useComparison, analysisData) {
    const resultDiv = document.getElementById('result');
    
    const analyses = [
        {
            prompt: `Phân tích ${textType} với các đầu mục: **Nghĩa đen**, **Nghĩa bóng**, **Hình ảnh và từ ngữ**, **Ý nghĩa biểu tượng**.`,
            title: 'Nghĩa đen và nghĩa bóng',
            icon: 'fas fa-lightbulb',
            key: 'meaningAnalysis'
        },
        {
            prompt: `Phân tích nội dung tư tưởng của ${textType} với các đầu mục: **Bài học**, **Tình cảm - cảm xúc**, **Thái độ**.`,
            title: 'Nội dung tư tưởng',
            icon: 'fas fa-brain',
            key: 'thoughtAnalysis'
        },
        {
            prompt: `Phân tích biện pháp nghệ thuật của ${textType} với các đầu mục: **Hình ảnh dân dã**, **Biện pháp tu từ**, **Nhịp điệu**, **Âm điệu**, **Từ láy**, **Cách gieo vần**, **Cấu trúc lặp**.`,
            title: 'Biện pháp nghệ thuật',
            icon: 'fas fa-paint-brush',
            key: 'artAnalysis'
        },
        {
            prompt: `Phân tích giá trị của ${textType} với các đầu mục: **Giá trị nhân văn**, **Giá trị nhân đạo**, **Giá trị giáo dục**.`,
            title: 'Giá trị',
            icon: 'fas fa-star',
            key: 'valueAnalysis'
        }
    ];

    // Thêm phân tích so sánh nếu được chọn
    if (useComparison) {
        analyses.push({
            prompt: `So sánh ${textType} này với các ${textType} khác cùng chủ đề. Nêu điểm tương đồng và khác biệt.`,
            title: 'So sánh với tác phẩm khác',
            icon: 'fas fa-balance-scale',
            key: 'comparisonAnalysis'
        });
    }

    // Thêm các mục vào tiến trình
    for (let i = 0; i < analyses.length; i++) {
        addProgressItem(analyses[i].title);
    }

    // Thực hiện các phân tích song song
    const analysisPromises = analyses.map((analysis, index) => 
        fetchGemini(
            `${analysis.prompt} Trả lời ngắn gọn, súc tích, mỗi ý xuống dòng. Chỉ sử dụng ** để in đậm các đầu mục (ví dụ: **Ý nghĩa**, **Cảm xúc**), không in đậm hoặc in nghiêng nội dung chi tiết trừ khi cần nhấn mạnh ý nghĩa cụ thể. Nội dung: "${inputText}"`,
            model
        )
        .then(result => {
            completeProgressItem(index + 1); // +1 vì đã có 1 mục trước đó (xác định loại văn bản)
            
            // Lưu kết quả vào analysisData
            analysisData[analysis.key] = result;
            
            return {
                title: analysis.title,
                content: result,
                icon: analysis.icon
            };
        })
        .catch(error => {
            errorProgressItem(index + 1);
            
            // Lưu thông báo lỗi vào analysisData
            analysisData[analysis.key] = `Lỗi khi phân tích: ${error.message}`;
            
            return {
                title: analysis.title,
                content: `Lỗi khi phân tích: ${error.message}`,
                icon: 'fas fa-exclamation-triangle'
            };
        })
    );

    const results = await Promise.all(analysisPromises);
    
    // Hiển thị kết quả
    results.forEach(result => {
        resultDiv.innerHTML += `
            <div class="analysis-section">
                <h3><i class="${result.icon}"></i> ${result.title}</h3>
                <div class="analysis-content">
                    ${parseMarkdown(result.content)}
                </div>
            </div>`;
    });
}

// ==============================================
// PROSE ANALYSIS FUNCTION (UPDATED)
// ==============================================

// Hàm phân tích văn xuôi (cập nhật để lưu dữ liệu)
async function analyzeProse(inputText, model, useComparison, analysisData) {
    const resultDiv = document.getElementById('result');
    
    const analyses = [
        {
            prompt: 'Xác định thể loại của văn bản (truyện ngắn, tiểu thuyết, tản văn, bút ký, tùy bút, hồi ký, văn nghị luận, văn miêu tả, v.v.). Giải thích ngắn gọn tại sao.',
            title: 'Xác định thể loại',
            icon: 'fas fa-tags',
            key: 'genreAnalysis'
        },
        {
            prompt: 'Tóm tắt ngắn gọn nội dung chính của văn bản trong 3-5 câu. Làm nổi bật các sự kiện, tình tiết chính.',
            title: 'Tóm tắt nội dung',
            icon: 'fas fa-scroll',
            key: 'summaryAnalysis'
        },
        {
            prompt: 'Phân tích cấu trúc văn bản với các đầu mục: **Bố cục**, **Mạch văn**, **Cách triển khai ý**, **Điểm nhìn trần thuật**.',
            title: 'Phân tích cấu trúc',
            icon: 'fas fa-project-diagram',
            key: 'structureAnalysis'
        },
        {
            prompt: 'Phân tích các nhân vật (nếu có) với các đầu mục: **Tính cách**, **Hành động**, **Mối quan hệ**, **Vai trò trong cốt truyện**.',
            title: 'Phân tích nhân vật',
            icon: 'fas fa-users',
            key: 'characterAnalysis'
        },
        {
            prompt: 'Phân tích ngôn ngữ văn bản với các đầu mục: **Từ ngữ đặc sắc**, **Biện pháp tu từ**, **Giọng điệu**, **Phong cách ngôn ngữ**.',
            title: 'Phân tích ngôn ngữ',
            icon: 'fas fa-language',
            key: 'languageAnalysis'
        },
        {
            prompt: 'Phân tích chủ đề và thông điệp của văn bản với các đầu mục: **Chủ đề chính**, **Thông điệp**, **Giá trị nhân văn**, **Liên hệ thực tế**.',
            title: 'Phân tích chủ đề',
            icon: 'fas fa-lightbulb',
            key: 'themeAnalysis'
        }
    ];

    // Thêm phân tích so sánh nếu được chọn
    if (useComparison) {
        analyses.push({
            prompt: 'So sánh văn bản này với các tác phẩm cùng thể loại hoặc cùng tác giả (nếu có thể xác định). Nêu điểm tương đồng và khác biệt.',
            title: 'So sánh với tác phẩm khác',
            icon: 'fas fa-balance-scale',
            key: 'comparisonAnalysis'
        });
    }

    // Thêm các mục vào tiến trình
    for (let i = 0; i < analyses.length; i++) {
        addProgressItem(analyses[i].title);
    }

    // Thực hiện các phân tích song song
    const analysisPromises = analyses.map((analysis, index) => 
        fetchGemini(
            `${analysis.prompt} Trả lời ngắn gọn, súc tích, mỗi ý xuống dòng. Chỉ sử dụng ** để in đậm các đầu mục (ví dụ: **Ý nghĩa**, **Cảm xúc**), không in đậm hoặc in nghiêng nội dung chi tiết trừ khi cần nhấn mạnh ý nghĩa cụ thể. Nội dung: "${inputText}"`,
            model
        )
        .then(result => {
            completeProgressItem(index + 1); // +1 vì đã có 1 mục trước đó (xác định loại văn bản)
            
            // Lưu kết quả vào analysisData
            analysisData[analysis.key] = result;
            
            return {
                title: analysis.title,
                content: result,
                icon: analysis.icon
            };
        })
        .catch(error => {
            errorProgressItem(index + 1);
            
            // Lưu thông báo lỗi vào analysisData
            analysisData[analysis.key] = `Lỗi khi phân tích: ${error.message}`;
            
            return {
                title: analysis.title,
                content: `Lỗi khi phân tích: ${error.message}`,
                icon: 'fas fa-exclamation-triangle'
            };
        })
    );

    const results = await Promise.all(analysisPromises);
    
    // Hiển thị kết quả
    results.forEach(result => {
        resultDiv.innerHTML += `
            <div class="analysis-section">
                <h3><i class="${result.icon}"></i> ${result.title}</h3>
                <div class="analysis-content">
                    ${parseMarkdown(result.content)}
                </div>
            </div>`;
    });
}

// ==============================================
// EVENT LISTENERS
// ==============================================

// Gán sự kiện cho nút phân tích
document.getElementById('analyzeBtn').addEventListener('click', analyzeText);

// Gán sự kiện cho phím Enter trong textarea
document.getElementById('inputText').addEventListener('keypress', function(e) {
    if (e.key === 'Enter' && e.ctrlKey) {
        analyzeText();
    }
});

// Settings Panel Toggle
document.getElementById('settingsBtn').addEventListener('click', function() {
    document.getElementById('settingsPanel').classList.toggle('active');
});

// ==============================================
// GLOBAL FUNCTIONS FOR OTHER SCRIPTS
// ==============================================

// Xuất các hàm cần thiết ra global scope
window.openPopup = openPopup;
window.closePopupFunc = closePopupFunc;
window.GEMINI_API_KEY = GEMINI_API_KEY;
window.GEMINI_CONFIG = GEMINI_CONFIG;
window.firestoreDb = firestoreDb;
window.firebaseApp = firebaseApp;

// Khởi tạo khi DOM đã tải xong
document.addEventListener('DOMContentLoaded', function() {
    console.log('VANW Text Analysis Tool đã sẵn sàng!');
    console.log('API Key đã được cấu hình:', GEMINI_API_KEY ? 'Có' : 'Không');
    console.log('Firebase đã được khởi tạo:', firebaseApp ? 'Có' : 'Không');
    
    // Thêm loading cho chatbot và map popups
    const originalOpenPopup = openPopup;
    window.openPopup = function(menuId) {
        originalOpenPopup(menuId);
        
        // Gọi hàm khởi tạo từ các file khác nếu có
        setTimeout(() => {
            if (menuId === 'mapMenu' && window.initMapPopup) {
                initMapPopup();
            } else if (menuId === 'chatbotMenu' && window.initChatbot) {
                initChatbot();
            }
        }, 100);
    };
});
