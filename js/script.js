const firebaseConfig = {
  apiKey: "AIzaSyCVD_Um0fWAK3ogQQUwCDINV_dN1hJZxL4",
  authDomain: "tkc-vanw.firebaseapp.com",
  projectId: "tkc-vanw",
  storageBucket: "tkc-vanw.firebasestorage.app",
  messagingSenderId: "862465503494",
  appId: "1:862465503494:web:8aec558b363988deec6e87",
  measurementId: "G-F23NN1KLW0"
};

let firebaseApp, firestoreDb;
try {
  firebaseApp = firebase.initializeApp(firebaseConfig);
  firestoreDb = firebase.firestore();
  console.log("Firebase initialized successfully");
} catch (error) {
  console.error("Firebase initialization error:", error);
}

// ============================
// CƠ CHẾ API PHÒNG THỦ DUY NHẤT
// ============================

class APIDefenseSystem {
  constructor() {
    // API key chính bị đảo ngược
    this.reversedPrimaryApiKey = "ADHvlJk9rfZ40q7ju_r-yVQl1ZqW4Z-MDySzAI";
    this.primaryModel = "gemini-2.5-flash-lite";
    this.allApis = [];
    this.workingApis = [];
    this.currentApiIndex = -1;
    this.isInitialized = false;
    this.initializationPromise = null;
    this.isLoading = false;
    
    // Cấu hình cho các module khác
    this.mapReversedApiKey = "cbRSGo7aT22YUIRKGY4db94W_uD1rUmkDySazIA";
    this.mapPrimaryModel = "gemini-2.5-flash";
  }

  // Hàm đảo ngược chuỗi để lấy key đúng
  reverseApiKey(reversedKey) {
    if (!reversedKey || typeof reversedKey !== 'string') {
      console.error("API key không hợp lệ:", reversedKey);
      return reversedKey;
    }
    return reversedKey.split('').reverse().join('');
  }

  async initialize() {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = (async () => {
      console.log("=== BẮT ĐẦU KHỞI TẠO API PHÒNG THỦ ===");
      console.log("Lưu ý: Tất cả API key đều được đảo ngược, hệ thống sẽ tự động đảo lại");
      
      // Thêm API chính vào danh sách (đã đảo ngược)
      this.allApis.push({
        reversedKey: this.reversedPrimaryApiKey,
        apiKey: this.reverseApiKey(this.reversedPrimaryApiKey),
        model: this.primaryModel,
        isPrimary: true,
        index: 0,
        source: "primary"
      });
      
      // Thêm API cho bản đồ
      this.allApis.push({
        reversedKey: this.mapReversedApiKey,
        apiKey: this.reverseApiKey(this.mapReversedApiKey),
        model: this.mapPrimaryModel,
        isPrimary: false,
        index: 1,
        source: "map"
      });
      
      // Load API dự phòng từ file
      await this.loadBackupApis();
      
      // Test tất cả API tuần tự (một API một lần)
      await this.testAllApisSequentially();
      
      // Chọn API hoạt động đầu tiên
      if (this.workingApis.length > 0) {
        this.currentApiIndex = 0;
        console.log(`=== ĐÃ CHỌN API HOẠT ĐỘNG: #${this.workingApis[0].index} ===`);
        this.isInitialized = true;
        return this.workingApis[0];
      } else {
        console.error("=== KHÔNG CÓ API NÀO HOẠT ĐỘNG! ===");
        throw new Error("KHÔNG CÓ API NÀO HOẠT ĐỘNG!");
      }
    })();

    return this.initializationPromise;
  }

  async loadBackupApis() {
    try {
      console.log("=== ĐANG TẢI API DỰ PHÒNG TỪ FILE ===");
      
      const possiblePaths = [
        'assets/apiphongthu.txt',
        './assets/apiphongthu.txt',
        '/assets/apiphongthu.txt',
        'apiphongthu.txt',
        './apiphongthu.txt'
      ];
      
      let response = null;
      
      for (const path of possiblePaths) {
        try {
          console.log(`Thử đường dẫn: ${path}`);
          response = await fetch(path);
          if (response.ok) {
            console.log(`✓ Tìm thấy file tại: ${path}`);
            break;
          }
        } catch (e) {
          console.log(`✗ Không tìm thấy file tại: ${path}`);
          continue;
        }
      }
      
      if (!response || !response.ok) {
        console.log("Không tìm thấy file apiphongthu.txt, chỉ sử dụng API chính");
        return false;
      }
      
      const text = await response.text();
      console.log("Nội dung file (truncated):", text.substring(0, 200) + "...");
      
      const lines = text.trim().split('\n').filter(line => line.trim() !== '');
      console.log(`Số dòng trong file: ${lines.length}`);
      
      let index = this.allApis.length;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        if (line.includes('AIza')) {
          const reversedKey = line;
          const model = (i + 1 < lines.length) ? lines[i + 1].trim() : this.primaryModel;
          
          const normalKey = this.reverseApiKey(reversedKey);
          const isValidKey = normalKey.includes("AIza");
          const apiKey = isValidKey ? normalKey : reversedKey;
          
          this.allApis.push({
            reversedKey: reversedKey,
            apiKey: apiKey,
            model: model,
            isPrimary: false,
            index: index,
            source: "backup-file"
          });
          
          console.log(`[API #${index}] Đã thêm API dự phòng`);
          index++;
          i++;
        } else {
          const normalKey = this.reverseApiKey(line);
          if (normalKey.includes("AIza")) {
            const model = (i + 1 < lines.length) ? lines[i + 1].trim() : this.primaryModel;
            
            this.allApis.push({
              reversedKey: line,
              apiKey: normalKey,
              model: model,
              isPrimary: false,
              index: index,
              source: "backup-file"
            });
            
            console.log(`[API #${index}] Phát hiện key đảo ngược`);
            index++;
            i++;
          }
        }
      }
      
      console.log(`Đã tải ${this.allApis.length - 2} API dự phòng từ file`);
      return true;
    } catch (error) {
      console.error('Lỗi khi tải API dự phòng:', error);
      return false;
    }
  }

  async testApiConnection(apiInfo) {
    try {
      console.log(`[TEST API #${apiInfo.index}] Kiểm tra...`);
      
      if (!apiInfo.apiKey || apiInfo.apiKey.length < 20) {
        console.log(`[API #${apiInfo.index}] ✗ KEY KHÔNG HỢP LỆ`);
        return null;
      }
      
      if (!apiInfo.apiKey.includes("AIza")) {
        console.log(`[API #${apiInfo.index}] ✗ KEY KHÔNG HỢP LỆ (thiếu 'AIza')`);
        return null;
      }
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${apiInfo.model}:generateContent?key=${apiInfo.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: "Test" }] }]
          }),
          signal: controller.signal
        }
      );
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        console.log(`[API #${apiInfo.index}] ✓ HOẠT ĐỘNG TỐT`);
        return {
          ...apiInfo,
          status: 'working'
        };
      } else {
        console.log(`[API #${apiInfo.index}] ✗ LỖI HTTP: ${response.status}`);
        return null;
      }
    } catch (error) {
      console.log(`[API #${apiInfo.index}] ✗ LỖI: ${error.message}`);
      return null;
    }
  }

  async testAllApisSequentially() {
    this.workingApis = [];
    
    console.log(`\n=== BẮT ĐẦU KIỂM TRA ${this.allApis.length} API (TUẦN TỰ) ===`);
    
    for (let i = 0; i < this.allApis.length; i++) {
      const apiInfo = this.allApis[i];
      const result = await this.testApiConnection(apiInfo);
      
      if (result) {
        this.workingApis.push(result);
      }
    }
    
    console.log(`\n=== KẾT QUẢ KIỂM TRA ===`);
    console.log(`✓ API hoạt động: ${this.workingApis.length}/${this.allApis.length}`);
    
    console.log("\n=== CHI TIẾT TỪNG API ===");
    this.allApis.forEach(api => {
      const isWorking = this.workingApis.some(w => w.index === api.index);
      const status = isWorking ? '✓' : '✗';
      console.log(`[${api.index}] ${status} ${api.isPrimary ? 'PRIMARY' : 'BACKUP'} - ${api.model} (${api.source})`);
    });
  }

  getCurrentApi() {
    if (this.workingApis.length === 0) return null;
    return this.workingApis[this.currentApiIndex];
  }

  async switchToNextApi() {
    if (this.workingApis.length <= 1) {
      console.log("Không còn API dự phòng nào!");
      return false;
    }
    
    const nextIndex = (this.currentApiIndex + 1) % this.workingApis.length;
    this.currentApiIndex = nextIndex;
    
    console.log(`Đã chuyển sang API #${this.workingApis[nextIndex].index}`);
    return this.workingApis[nextIndex];
  }

  async getApiKeyForGemini() {
    if (this.workingApis.length === 0) {
      console.error("Không có API nào hoạt động");
      return null;
    }
    
    return this.workingApis[this.currentApiIndex].apiKey;
  }

  async tryAllApisForResponse(prompt, modelOverride = null) {
    console.log("\n=== THỬ TẤT CẢ API ĐỂ TRẢ LỜI ===");
    
    if (this.workingApis.length === 0) {
      console.log("Không có API nào hoạt động!");
      return {
        success: false,
        error: "Không có API nào hoạt động"
      };
    }
    
    for (let i = 0; i < this.workingApis.length; i++) {
      const apiIndex = (this.currentApiIndex + i) % this.workingApis.length;
      const apiInfo = this.workingApis[apiIndex];
      
      console.log(`Thử API #${apiInfo.index}...`);
      
      try {
        const modelToUse = modelOverride || apiInfo.model;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelToUse}:generateContent?key=${apiInfo.apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }]
            }),
            signal: controller.signal
          }
        );
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        const text = data.candidates[0].content.parts[0].text.trim();
        
        this.currentApiIndex = apiIndex;
        console.log(`✓ Thành công với API #${apiInfo.index}`);
        
        return {
          success: true,
          response: text,
          apiInfo: apiInfo
        };
      } catch (error) {
        console.log(`✗ API #${apiInfo.index} lỗi: ${error.message}`);
        
        this.workingApis = this.workingApis.filter(api => api.index !== apiInfo.index);
        console.log(`Đã loại bỏ API #${apiInfo.index} khỏi danh sách hoạt động`);
        
        continue;
      }
    }
    
    console.log("✗ Tất cả API đều lỗi!");
    return {
      success: false,
      error: "Tất cả API đều không hoạt động"
    };
  }
}

// Khởi tạo hệ thống API phòng thủ DUY NHẤT
const apiDefenseSystem = new APIDefenseSystem();

// Hàm fetchGemini mới với cơ chế phòng thủ
async function fetchGemini(prompt, model = null) {
  try {
    // Đảm bảo hệ thống đã được khởi tạo
    if (!apiDefenseSystem.isInitialized) {
      console.log("Đang khởi tạo hệ thống API phòng thủ...");
      showApiLoadingAnimation();
      await apiDefenseSystem.initialize();
      hideApiLoadingAnimation();
    }
    
    // Sử dụng cơ chế phòng thủ
    const result = await apiDefenseSystem.tryAllApisForResponse(prompt, model);
    
    if (result.success) {
      // Cập nhật model từ API đang dùng
      window.GEMINI_CONFIG = {
        ...window.GEMINI_CONFIG,
        models: {
          'flash-lite': result.apiInfo.model,
          'flash': result.apiInfo.model,
          'pro': result.apiInfo.model
        }
      };
      
      return result.response;
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Lỗi khi gọi API Gemini với cơ chế phòng thủ:', error);
    throw error;
  }
}

// Hàm hiển thị animation đang kiểm tra API
function showApiLoadingAnimation() {
  const loadingDiv = document.createElement('div');
  loadingDiv.id = 'apiLoadingAnimation';
  loadingDiv.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: grid;
    place-items: center;
    z-index: 9999;
    background-color: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(5px);
  `;
  
  loadingDiv.innerHTML = `
    <div style="text-align: center;">
      <svg viewBox="0 0 200 200" style="width: 150px; height: 150px;">
        <defs>
          <filter id="goo">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0
                        0 1 0 0 0
                        0 0 1 0 0
                        0 0 0 20 -10" result="goo" />
            <feBlend in="SourceGraphic" in2="goo" />
          </filter>
        </defs>
        <g id="gooey" filter="url(#goo)">
          <circle class="dot" cx="100" cy="100" r="6" fill="#ff8441" />
        </g>
      </svg>
      <div style="color: #ff6600; font-weight: 600; margin-top: 20px; font-size: 1.1rem;">
        Đang kiểm tra API...
      </div>
      <div style="color: #666; margin-top: 10px; max-width: 300px;">
        Hệ thống đang kiểm tra từng API để tìm kết nối hoạt động
      </div>
    </div>
  `;
  
  document.body.appendChild(loadingDiv);
  animateApiLoading();
}

function hideApiLoadingAnimation() {
  const loadingDiv = document.getElementById('apiLoadingAnimation');
  if (loadingDiv) {
    loadingDiv.style.opacity = '0';
    loadingDiv.style.transition = 'opacity 0.5s ease';
    setTimeout(() => {
      if (loadingDiv.parentNode) {
        loadingDiv.parentNode.removeChild(loadingDiv);
      }
    }, 500);
  }
}

function animateApiLoading() {
  const svgGroup = document.querySelector("#apiLoadingAnimation #gooey");
  if (!svgGroup) return;
  
  let centerDot = svgGroup.querySelector(".dot");
  const spacing = 25;

  function createDot(cx, cy, r) {
    const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    dot.setAttribute("cx", cx);
    dot.setAttribute("cy", cy);
    dot.setAttribute("r", 1);
    dot.setAttribute("fill", "#ff8441");
    dot.classList.add("dot");
    svgGroup.appendChild(dot);
    return dot;
  }

  svgGroup.querySelectorAll(".dot").forEach((dot) => dot.remove());
  centerDot = createDot(100, 100, 6);

  const first4 = [
    { cx: 100, cy: 100 - spacing },
    { cx: 100, cy: 100 + spacing },
    { cx: 100 - spacing, cy: 100 },
    { cx: 100 + spacing, cy: 100 }
  ];

  const allDots = [];

  first4.forEach((pos) => {
    const dot = createDot(100, 100, 6);
    allDots.push(dot);
    const midX = (100 + pos.cx) / 2;
    const midY = (100 + pos.cy) / 2;
    setTimeout(() => {
      dot.setAttribute("r", 8);
      dot.setAttribute("cx", midX);
      dot.setAttribute("cy", midY);
    }, 50);
    setTimeout(() => {
      dot.setAttribute("r", 6);
      dot.setAttribute("cx", pos.cx);
      dot.setAttribute("cy", pos.cy);
    }, 500);
  });

  setTimeout(() => {
    const diagSpacing = spacing / Math.sqrt(2);
    const diagonal = [
      { cx: 100 - diagSpacing, cy: 100 - diagSpacing },
      { cx: 100 + diagSpacing, cy: 100 - diagSpacing },
      { cx: 100 - diagSpacing, cy: 100 + diagSpacing },
      { cx: 100 + diagSpacing, cy: 100 + diagSpacing }
    ];
    diagonal.forEach((pos) => {
      const dot = createDot(100, 100, 6);
      allDots.push(dot);
      const midX = (100 + pos.cx) / 2;
      const midY = (100 + pos.cy) / 2;
      setTimeout(() => {
        dot.setAttribute("r", 8);
        dot.setAttribute("cx", midX);
        dot.setAttribute("cy", midY);
      }, 50);
      setTimeout(() => {
        dot.setAttribute("r", 6);
        dot.setAttribute("cx", pos.cx);
        dot.setAttribute("cy", pos.cy);
      }, 500);
    });
  }, 1000);

  setTimeout(() => {
    svgGroup.style.transform = "rotate(360deg)";
  }, 2500);

  setTimeout(() => {
    svgGroup.style.transition = "transform 0.5s linear";
    svgGroup.style.transform = "rotate(0deg)";
    allDots.forEach((dot) => {
      dot.setAttribute("cx", 100);
      dot.setAttribute("cy", 100);
      dot.setAttribute("r", 6);
    });
  }, 3000);

  // Lặp lại animation mỗi 4 giây
  setTimeout(() => {
    const loadingDiv = document.getElementById('apiLoadingAnimation');
    if (loadingDiv && loadingDiv.parentNode) {
      animateApiLoading();
    }
  }, 4000);
}

// Hàm helper cho chatbot
async function callGeminiWithDefense(prompt) {
  return await fetchGemini(prompt);
}

// Hàm helper cho map popup
async function getApiKeyForGemini() {
  if (!apiDefenseSystem.isInitialized) {
    showApiLoadingAnimation();
    await apiDefenseSystem.initialize();
    hideApiLoadingAnimation();
  }
  
  return await apiDefenseSystem.getApiKeyForGemini();
}

// ============================
// PHẦN CÒN LẠI CỦA CODE 1
// ============================

function createTextHash(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

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

function showSelfCheckNotice() {
  const notice = document.getElementById('selfCheckNotice');
  const analysisCard = document.getElementById('mainAnalysisCard');
  
  notice.style.display = 'flex';
  analysisCard.classList.add('self-check-active');
}

function hideSelfCheckNotice() {
  const notice = document.getElementById('selfCheckNotice');
  const analysisCard = document.getElementById('mainAnalysisCard');
  
  notice.style.display = 'none';
  analysisCard.classList.remove('self-check-active');
}

function displayCachedAnalysis(cachedData, fromCache = false) {
  const resultDiv = document.getElementById('result');
  resultDiv.innerHTML = '';
  
  if (cachedData.analysis) {
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
    
    if (cachedData.analysis.technicalAnalysis) {
      resultDiv.innerHTML += cachedData.analysis.technicalAnalysis;
    }
    
    if (cachedData.analysis.contentAnalysis) {
      resultDiv.innerHTML += `
        <div class="analysis-section">
          <h3><i class="fas fa-scroll"></i> Phân tích nội dung</h3>
          <div class="analysis-content">
            ${parseMarkdown(cachedData.analysis.contentAnalysis)}
          </div>
        </div>`;
    }
    
    if (cachedData.analysis.artisticAnalysis) {
      resultDiv.innerHTML += `
        <div class="analysis-section">
          <h3><i class="fas fa-paint-brush"></i> Phân tích nghệ thuật</h3>
          <div class="analysis-content">
            ${parseMarkdown(cachedData.analysis.artisticAnalysis)}
          </div>
        </div>`;
    }
    
    if (cachedData.analysis.comparisonAnalysis) {
      resultDiv.innerHTML += `
        <div class="analysis-section">
          <h3><i class="fas fa-balance-scale"></i> So sánh với tác phẩm khác</h3>
          <div class="analysis-content">
            ${parseMarkdown(cachedData.analysis.comparisonAnalysis)}
          </div>
        </div>`;
    }
    
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
    
    setTimeout(addTextSelectionFeature, 100);
  }
}

const sidebarPopup = document.getElementById('sidebarPopup');
const popupTitle = document.getElementById('popupTitle');
const popupContent = document.getElementById('popupContent');
const closePopup = document.getElementById('closePopup');

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

let currentActiveMenu = null;

function openPopup(menuId) {
    const menuItem = menuItems[menuId];
    popupTitle.textContent = menuItem.title;
    popupContent.innerHTML = menuItem.content;
    
    sidebarPopup.classList.add('active');
    currentActiveMenu = menuId;
    
    setActiveMenu(menuId);
    
    setTimeout(() => {
        if (menuId === 'mapMenu') {
            console.log('Map menu opened');
        } else if (menuId === 'chatbotMenu') {
            console.log('Chatbot menu opened');
        }
    }, 100);
}

function closePopupFunc() {
    sidebarPopup.classList.remove('active');
    currentActiveMenu = null;
    
    removeActiveMenu();
}

function setActiveMenu(menuId) {
    document.querySelectorAll('.nav-btn').forEach(item => {
        item.classList.remove('active');
    });
    
    const navBtn = document.getElementById(menuId);
    if (navBtn) navBtn.classList.add('active');
}

function removeActiveMenu() {
    document.querySelectorAll('.nav-btn').forEach(item => {
        item.classList.remove('active');
    });
}

Object.keys(menuItems).forEach(menuId => {
    document.getElementById(menuId).addEventListener('click', function(e) {
        e.preventDefault();
        
        if (sidebarPopup.classList.contains('active') && currentActiveMenu === menuId) {
            closePopupFunc();
        } else {
            if (sidebarPopup.classList.contains('active')) {
                closePopupFunc();
                setTimeout(() => openPopup(menuId), 300);
            } else {
                openPopup(menuId);
            }
        }
    });
});

closePopup.addEventListener('click', function() {
    closePopupFunc();
});

// Cấu hình Gemini ban đầu (sẽ được cập nhật bởi hệ thống phòng thủ)
const REVERSED_API_KEY = "ADHvlJk9rfZ40q7ju_r-yVQl1ZqW4Z-MDySzAI";
const GEMINI_API_KEY = REVERSED_API_KEY.split('').reverse().join('');

const GEMINI_CONFIG = {
    models: {
        'flash-lite': 'gemini-2.5-flash-lite',
        'flash': 'gemini-2.5-flash-lite',
        'pro': 'gemini-2.5-flash-lite'
    }
};

window.GEMINI_CONFIG = GEMINI_CONFIG;

let analysisProgress = {
    total: 0,
    completed: 0,
    items: []
};

function updateProgress() {
    const progressFill = document.getElementById('progressFill');
    const progressStatus = document.getElementById('progressStatus');
    const progressItems = document.getElementById('progressItems');
    
    const percent = analysisProgress.total > 0 ? 
        Math.round((analysisProgress.completed / analysisProgress.total) * 100) : 0;
    
    progressFill.style.width = `${percent}%`;
    
    if (percent === 100) {
        progressStatus.textContent = 'Hoàn thành!';
    } else {
        progressStatus.textContent = `Đang xử lý... ${percent}%`;
    }
    
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

function addProgressItem(name) {
    analysisProgress.items.push({
        name: name,
        status: 'pending'
    });
    analysisProgress.total++;
    updateProgress();
}

function completeProgressItem(index) {
    analysisProgress.items[index].status = 'completed';
    analysisProgress.completed++;
    updateProgress();
}

function errorProgressItem(index) {
    analysisProgress.items[index].status = 'error';
    analysisProgress.completed++;
    updateProgress();
}

function countWords(text) {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

function parseMarkdown(text) {
    if (!text) return '';
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br>');
}

function xacDinhNhanVatTruTinh(baiTho) {
    let tuTrongBaiTho = baiTho.split(/\s+/);
    
    if (tuTrongBaiTho.includes("tôi") || tuTrongBaiTho.includes("Tôi")) {
        return "Nhân vật trữ tình là : Tôi";
    }
    if (tuTrongBaiTho.includes("cha")) {
        return "Nhân vật trữ tình là : Cha";
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
    
    return "Nhân vật trữ tình là : " + nhanVatTruTinh;
}

function removeVietnameseAccents(str) {
    const accentMap = {
        'á': 'a', 'à': 'a', 'ả': 'a', 'ã': 'a', 'ạ': 'a',
        'â': 'a', 'ầ': 'a', 'ấ': 'a', 'ẫ': 'a', 'ậ': 'a',
        'ă': 'a', 'ằ': 'a', 'ắ': 'a', 'ẵ': 'a', 'ặ': 'a',
        'é': 'e', 'è': 'e', 'ẻ': 'e', 'ẽ': 'e', 'ẹ': 'e',
        'ê': 'e', 'ề': 'e', 'ế': 'e', 'ễ': 'e', 'ệ': 'e',
        'í': 'i', 'ì': 'i', 'ỉ': 'i', 'ĩ': 'i', 'ị': 'i',
        'ó': 'o', 'ò': 'o', 'ỏ': 'o', 'õ': 'o', 'ọ': 'o',
        'ô': 'o', 'ồ': 'o', 'ố': 'o', 'ỗ': 'o', 'ộ': 'o',
        'ơ': 'o', 'ờ': 'o', 'ớ': 'o', 'ỡ': 'o', 'ợ': 'o',
        'ú': 'u', 'ù': 'u', 'ủ': 'u', 'ũ': 'u', 'ụ': 'u',
        'ư': 'u', 'ừ': 'u', 'ứ': 'u', 'ữ': 'u', 'ự': 'u',
        'ý': 'y', 'ỳ': 'y', 'ỷ': 'y', 'ỹ': 'y', 'ỵ': 'y',
    };
    return str.split('').map(c => accentMap[c] || c).join('');
}

function removePunctuation(str) {
    return str.replace(/[.,'!?)(}{|:;><~`@#$%^&*-_+=]/g, '');
}

const rhymePatterns = [
    "iêu", "an", "ang", "o", "a", "on", "ôn", "ôi", "oa", "ao", "i", "u", "e", "ê", "uê", "y", "un",
    "oc", "ot", "iêu", "on", "ie", "ư", "ưn", "uy", "am", "ap", "em", "ep", "im", "ip", "um", "up",
    "ic", "oc", "it", "ot", "ut", "inh", "ang", "ong", "ing", "ong", "oi", "em", "ep", "im", "ip",
    "um", "up", "it", "ut", "ic", "oc", "ông", "ung", "ing", "eu", "au", "uy", "uan", "ơp", "op",
    "ân", "ă", "ê", "ơ", "ai", "iê", "ia", "ua", "ay", "ơi", "ua", "ie", "iu", "ơm", "au", "â", "ô",
    "ư", "i", "y", "ai", "eo", "êu", "ui", "ung", "inh", "ieu", "oay", "at", "ac", "enh", "en", "uoc"
];

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

function analyzeRhymeAndTone(poem) {
    const lines = poem.split(/\n+/).filter(line => line.trim() !== '');
    let resultHtml = '';
    
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
    
    let toneResult = [];
    let bangCount = 0;
    let tracCount = 0;

    lines.forEach((line, index) => {
        let words = line.trim().split(/\s+/);
        let lineResult = words.map(word => {
            let mainVowels = word.split('').filter(char => 'áàảãạâầấẫậăằắẵặéèẻẽẹêềếễệíìỉĩịóòỏõọôồốỗộơờớỡợúùủũụưừứữựýỳỷỹỵ'.includes(char));
           
            let tone = mainVowels.some(vowel => 'áảãạâấẫậăắẵặéẻẽẹêếễệíỉĩịóỏõọôốỗộơớỡợúủũụưứữựýỷỹỵ'.includes(vowel)) ? "T" : "B";
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

    let toneAnalysisHtml = '';
    if (bangCount > 0 && tracCount > 0) {
        if (bangCount > tracCount) {
            let ratio = bangCount / tracCount;
            if (ratio >= 1.5) {
                toneAnalysisHtml = `<p class="text-gray-600 font-bold mt-2">Bài thơ có âm điệu nhẹ nhàng, du dương.</p>`;
            } else {
                toneAnalysisHtml = `<p class="text-gray-600 font-bold mt-2">Bài thơ có âm điệu hài hòa, trầm bổng.</p>`;
            }
        } else {
            let ratio = tracCount / bangCount;
            if (ratio >= 1.5) {
                toneAnalysisHtml = `<p class="text-gray-600 font-bold mt-2">Bài thơ có âm điệu mạnh mẽ, hùng hồn.</p>`;
            } else {
                toneAnalysisHtml = `<p class="text-gray-600 font-bold mt-2">Bài thơ có âm điệu hài hòa, trầm bổng.</p>`;
            }
        }
    } else {
        toneAnalysisHtml = `<p class="text-gray-600 font-bold mt-2">Bài thơ có âm điệu hài hòa, trầm bổng.</p>`;
    }
    toneResultHtml += toneAnalysisHtml;
    toneResultHtml += '</div>';
    
    const nhanVatTruTinh = xacDinhNhanVatTruTinh(poem);
    let characterHtml = `<div class="analysis-section"><h3 class="text-lg font-semibold text-gray-800 mb-2 flex items-center"><i class="fas fa-user mr-2"></i> Nhân vật trữ tình</h3>`;
    characterHtml += `<p class="text-gray-600">${nhanVatTruTinh}</p></div>`;
    
    let lawResult = checkDuongLuat(lines);
    let lawHtml = '';
    if (lawResult) {
        lawHtml = `<div class="analysis-section"><h3 class="text-lg font-semibold text-gray-800 mb-2 flex items-center"><i class="fas fa-gavel mr-2"></i> Kiểm tra luật thơ Đường</h3>`;
        lawHtml += `<p class="law-result">${lawResult}</p></div>`;
    }
    
    resultHtml += characterHtml + rhymeResultHtml + toneResultHtml + lawHtml;
    return resultHtml;
}

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
                    'áảãạâấẫậăắẵặéẻẽẹêếễệíỉĩịóỏõọôốỗộơớỡợúủũụưứữự'.includes(char)
                );
   
                let tone = mainVowels.some(vowel => 'áảãạâấẫậăắẵặéẻẽẹêếễệíỉĩịóỏõọôốỗộơớỡợúủũụưứữự'.includes(vowel)) ? "T" : "B";
                return tone === ruleBy[index][i];
            });
            
            let lineCheckTrac = positionsToCheck.every((pos, i) => {
                if (pos >= words.length) return false;
   
                let word = words[pos];
                let mainVowels = word.split('').filter(char =>
                    'áảãạâấẫậăắẵặéẻẽẹêếễệíỉĩịóỏõọôốỗộơớỡợúủũụưứữự'.includes(char)
                );
   
                let tone = mainVowels.some(vowel => 'áảãạâấẫậăắẵặéẻẽẹêếễệíỉĩịóỏõọôốỗộơớỡợúủũụưứữự'.includes(vowel)) ? "T" : "B";
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
                    'áảãạâấẫậăắẵặéẻẽẹêếễệíỉĩịóỏõọôốỗộơớỡợúủũụưứữự'.includes(char)
                );
   
                let tone = mainVowels.some(vowel => 'áảãạâấẫậăắẵặéẻẽẹêếễệíỉĩịóỏõọôốỗộơớỡợúủũụưứữự'.includes(vowel)) ? "T" : "B";
                return tone === ruleBy[index][i];
            });
            
            let lineCheckTrac = positionsToCheck.every((pos, i) => {
                if (pos >= words.length) return false;
   
                let word = words[pos];
                let mainVowels = word.split('').filter(char =>
                    'áảãạâấẫậăắẵặéẻẽẹêếễệíỉĩịóỏõọôốỗộơớỡợúủũụưứữự'.includes(char)
                );
   
                let tone = mainVowels.some(vowel => 'áảãạâấẫậăắẵặéẻẽẹêếễệíỉĩịóỏõọôốỗộơớỡợúủũụưứữự'.includes(vowel)) ? "T" : "B";
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
                    'áảãạâấẫậăắẵặéẻẽẹêếễệíỉĩịóỏõọôốỗộơớỡợúủũụưứữự'.includes(char)
                );
   
                let tone = mainVowels.some(vowel => 'áảãạâấẫậăắẵặéẻẽẹêếễệíỉĩịóỏõọôốỗộơớỡợúủũụưứữự'.includes(vowel)) ? "T" : "B";
                return tone === ruleBy[index][i];
            });
            
            let lineCheckTrac = positionsToCheck.every((pos, i) => {
                if (pos >= words.length) return false;
   
                let word = words[pos];
                let mainVowels = word.split('').filter(char =>
                    'áảãạâấẫậăắẵặéẻẽẹêếễệíỉĩịóỏõọôốỗộơớỡợúủũụưứữự'.includes(char)
                );
   
                let tone = mainVowels.some(vowel => 'áảãạâấẫậăắẵặéẻẽẹêếễệíỉĩịóỏõọôốỗộơớỡợúủũụưứữự'.includes(vowel)) ? "T" : "B";
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
                    'áảãạâấẫậăắẵặéẻẽẹêếễệíỉĩịóỏõọôốỗộơớỡợúủũụưứữự'.includes(char)
                );
   
                let tone = mainVowels.some(vowel => 'áảãạâấẫậăắẵặéẻẽẹêếễệíỉĩịóỏõọôốỗộơớỡợúủũụưứữự'.includes(vowel)) ? "T" : "B";
                return tone === ruleBy[index][i];
            });
            
            let lineCheckTrac = positionsToCheck.every((pos, i) => {
                if (pos >= words.length) return false;
   
                let word = words[pos];
                let mainVowels = word.split('').filter(char =>
                    'áảãạâấẫậăắẵặéẻẽẹêếễệíỉĩịóỏõọôốỗộơớỡợúủũụưứữự'.includes(char)
                );
   
                let tone = mainVowels.some(vowel => 'áảãạâấẫậăắẵặéẻẽẹêếễệíỉĩịóỏõọôốỗộơớỡợúủũụưứữự'.includes(vowel)) ? "T" : "B";
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

async function analyzeText() {
    const inputText = document.getElementById('inputText').value.trim();
    const resultDiv = document.getElementById('result');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const progressContainer = document.getElementById('progressContainer');

    if (!inputText) {
        resultDiv.innerHTML = '<div class="analysis-section"><p class="text-red-500">Vui lòng nhập nội dung!</p></div>';
        return;
    }

    const wordCount = countWords(inputText);
    if (wordCount < 4) {
        resultDiv.innerHTML = '<div class="analysis-section"><p class="text-red-500">Bạn phải nhập ít nhất 4 chữ trở lên!</p></div>';
        return;
    }

    analyzeBtn.disabled = true;
    analyzeBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Đang phân tích...';
    
    showSelfCheckNotice();
    const cachedData = await checkTextInDatabase(inputText);
    
    if (cachedData) {
        console.log("Đang tải phân tích từ cache...");
        displayCachedAnalysis(cachedData, true);
        
        setTimeout(() => {
            hideSelfCheckNotice();
            
            analyzeBtn.disabled = false;
            analyzeBtn.innerHTML = '<i class="fas fa-search mr-2"></i> Bắt đầu phân tích';
        }, 5000);
        
        return;
    }
    
    progressContainer.style.display = 'block';
    
    analysisProgress = {
        total: 0,
        completed: 0,
        items: []
    };
    
    resultDiv.innerHTML = '';

    try {
        const useAIFull = document.getElementById('aiFullToggle').checked;
        const analysisMode = document.getElementById('analysisMode').value;
        const usePhonetic = document.getElementById('phoneticToggle').checked;
        const useComparison = document.getElementById('comparisonToggle').checked;
        
        const model = GEMINI_CONFIG.models[analysisMode];
        
        addProgressItem('Xác định loại văn bản');
        const typeResponse = await fetchGemini(
            `Xác định nội dung sau thuộc loại: thơ, ca dao, tục ngữ, văn xuôi, hay không phải văn học. Chỉ trả lời một trong năm lựa chọn. Nội dung: "${inputText}"`
        );
        let textType = typeResponse.trim().toLowerCase();
        completeProgressItem(0);

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

        addProgressItem('Xác định tác giả');
        const authorResponse = await fetchGemini(
            `Xác định tác giả của văn bản sau. Nếu không thể xác định được tác giả, hãy trả lời "Không rõ". Chỉ trả về tên tác giả hoặc "Không rõ". Nội dung: "${inputText}"`
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

        if (textType === 'thơ') {
            await analyzePoem(inputText, useAIFull, usePhonetic, useComparison, analysisData);
        } else if (textType === 'ca dao' || textType === 'tục ngữ') {
            await analyzeFolkLiterature(inputText, textType, useComparison, analysisData);
        } else if (textType === 'văn xuôi') {
            await analyzeProse(inputText, useComparison, analysisData);
        } else {
            resultDiv.innerHTML += `<div class="analysis-section"><p>Không có phân tích chi tiết vì nội dung không phải thơ, ca dao, tục ngữ, hay văn xuôi.</p></div>`;
        }
        
        await saveAnalysisToDatabase(inputText, analysisData);
        
    } catch (error) {
        resultDiv.innerHTML += `<div class="analysis-section"><p class="text-red-500">Đã xảy ra lỗi: ${error.message}</p></div>`;
    } finally {
        hideSelfCheckNotice();
        
        analyzeBtn.disabled = false;
        analyzeBtn.innerHTML = '<i class="fas fa-search mr-2"></i> Bắt đầu phân tích';
        progressContainer.style.display = 'none';
        
        setTimeout(addTextSelectionFeature, 100);
    }
}

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
        document.querySelectorAll('.ask-ai-btn').forEach(btn => btn.remove());
        
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
        
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        askAiBtn.style.top = `${rect.bottom + window.scrollY + 5}px`;
        askAiBtn.style.left = `${rect.left + window.scrollX}px`;
        
        askAiBtn.addEventListener('click', () => {
            openPopup('chatbotMenu');
            
            setTimeout(() => {
                const messageInput = document.getElementById('message-input');
                if (messageInput) {
                    messageInput.value = `"${selectedText}" là gì?`;
                    messageInput.focus();
                    
                    messageInput.style.height = 'auto';
                    const newHeight = Math.min(messageInput.scrollHeight, 120);
                    messageInput.style.height = `${newHeight}px`;
                }
            }, 300);
        });
        
        document.body.appendChild(askAiBtn);
        
        document.addEventListener('click', function removeBtn(e) {
            if (!askAiBtn.contains(e.target) && !selection.containsNode(e.target, true)) {
                askAiBtn.remove();
                document.removeEventListener('click', removeBtn);
            }
        });
    }
}

async function analyzePoem(inputText, useAIFull, usePhonetic, useComparison, analysisData) {
    const resultDiv = document.getElementById('result');
    const lines = inputText.split(/\n+/).filter(line => line.trim() !== '');
    
    addProgressItem('Xác định tên tác phẩm');
    const titleResponse = await fetchGemini(
        `Xác định tên tác phẩm của bài thơ sau dựa trên nội dung hoặc đặc điểm văn học. Chỉ trả về tên tác phẩm hoặc "Không xác định được" nếu không nhận diện được. Nội dung: "${inputText}"`
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

    addProgressItem('Xác định thể thơ');
    let poemTypeInfo;
    if (useAIFull) {
        const typeResponse = await fetchGemini(
            `Xác định thể thơ của bài thơ sau và giải thích ngắn gọn. Nội dung: "${inputText}"`
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

    if (usePhonetic && !useAIFull) {
        addProgressItem('Phân tích kỹ thuật');
        const technicalAnalysis = analyzeRhymeAndTone(inputText);
        analysisData.technicalAnalysis = technicalAnalysis;
        resultDiv.innerHTML += technicalAnalysis;
        completeProgressItem(analysisProgress.items.length - 1);
    } else if (useAIFull) {
        addProgressItem('Phân tích kỹ thuật');
        const technicalResponse = await fetchGemini(
            `Phân tích kỹ thuật của bài thơ sau với các đầu mục: **Vần điệu**, **Nhịp điệu**, **Thanh điệu**, **Nhân vật trữ tình**. Trả lời ngắn gọn, súc tích. Nội dung: "${inputText}"`
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

    if (useComparison) {
        analyses.push({
            prompt: `So sánh bài thơ này với các tác phẩm cùng thể loại hoặc cùng tác giả (nếu có thể xác định). Nêu điểm tương đồng và khác biệt.`,
            title: 'So sánh với tác phẩm khác',
            icon: 'fas fa-balance-scale',
            key: 'comparisonAnalysis'
        });
    }

    for (let i = 0; i < analyses.length; i++) {
        addProgressItem(analyses[i].title);
    }

    const analysisPromises = analyses.map((analysis, index) => 
        fetchGemini(
            `${analysis.prompt} Trả lời ngắn gọn, súc tích, mỗi ý xuống dòng. Chỉ sử dụng ** để in đậm các đầu mục (ví dụ: **Ý nghĩa**, **Cảm xúc**), không in đậm hoặc in nghiêng nội dung chi tiết trừ khi cần nhấn mạnh ý nghĩa cụ thể. Nội dung: "${inputText}"`
        )
        .then(result => {
            const itemIndex = analysisProgress.items.findIndex(item => item.name === analysis.title);
            if (itemIndex !== -1) {
                completeProgressItem(itemIndex);
            }
            
            analysisData[analysis.key] = result;
            
            return {
                title: analysis.title,
                content: result,
                icon: analysis.icon
            };
        })
        .catch(error => {
            const itemIndex = analysisProgress.items.findIndex(item => item.name === analysis.title);
            if (itemIndex !== -1) {
                errorProgressItem(itemIndex);
            }
            
            analysisData[analysis.key] = `Lỗi khi phân tích: ${error.message}`;
            
            return {
                title: analysis.title,
                content: `Lỗi khi phân tích: ${error.message}`,
                icon: 'fas fa-exclamation-triangle'
            };
        })
    );

    const results = await Promise.all(analysisPromises);
    
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

async function analyzeFolkLiterature(inputText, textType, useComparison, analysisData) {
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

    if (useComparison) {
        analyses.push({
            prompt: `So sánh ${textType} này với các ${textType} khác cùng chủ đề. Nêu điểm tương đồng và khác biệt.`,
            title: 'So sánh với tác phẩm khác',
            icon: 'fas fa-balance-scale',
            key: 'comparisonAnalysis'
        });
    }

    for (let i = 0; i < analyses.length; i++) {
        addProgressItem(analyses[i].title);
    }

    const analysisPromises = analyses.map((analysis, index) => 
        fetchGemini(
            `${analysis.prompt} Trả lời ngắn gọn, súc tích, mỗi ý xuống dòng. Chỉ sử dụng ** để in đậm các đầu mục (ví dụ: **Ý nghĩa**, **Cảm xúc**), không in đậm hoặc in nghiêng nội dung chi tiết trừ khi cần nhấn mạnh ý nghĩa cụ thể. Nội dung: "${inputText}"`
        )
        .then(result => {
            completeProgressItem(index + 1);
            
            analysisData[analysis.key] = result;
            
            return {
                title: analysis.title,
                content: result,
                icon: analysis.icon
            };
        })
        .catch(error => {
            errorProgressItem(index + 1);
            
            analysisData[analysis.key] = `Lỗi khi phân tích: ${error.message}`;
            
            return {
                title: analysis.title,
                content: `Lỗi khi phân tích: ${error.message}`,
                icon: 'fas fa-exclamation-triangle'
            };
        })
    );

    const results = await Promise.all(analysisPromises);
    
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

async function analyzeProse(inputText, useComparison, analysisData) {
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

    if (useComparison) {
        analyses.push({
            prompt: 'So sánh văn bản này với các tác phẩm cùng thể loại hoặc cùng tác giả (nếu có thể xác định). Nêu điểm tương đồng và khác biệt.',
            title: 'So sánh với tác phẩm khác',
            icon: 'fas fa-balance-scale',
            key: 'comparisonAnalysis'
        });
    }

    for (let i = 0; i < analyses.length; i++) {
        addProgressItem(analyses[i].title);
    }

    const analysisPromises = analyses.map((analysis, index) => 
        fetchGemini(
            `${analysis.prompt} Trả lời ngắn gọn, súc tích, mỗi ý xuống dòng. Chỉ sử dụng ** để in đậm các đầu mục (ví dụ: **Ý nghĩa**, **Cảm xúc**), không in đậm hoặc in nghiêng nội dung chi tiết trừ khi cần nhấn mạnh ý nghĩa cụ thể. Nội dung: "${inputText}"`
        )
        .then(result => {
            completeProgressItem(index + 1);
            
            analysisData[analysis.key] = result;
            
            return {
                title: analysis.title,
                content: result,
                icon: analysis.icon
            };
        })
        .catch(error => {
            errorProgressItem(index + 1);
            
            analysisData[analysis.key] = `Lỗi khi phân tích: ${error.message}`;
            
            return {
                title: analysis.title,
                content: `Lỗi khi phân tích: ${error.message}`,
                icon: 'fas fa-exclamation-triangle'
            };
        })
    );

    const results = await Promise.all(analysisPromises);
    
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

document.getElementById('analyzeBtn').addEventListener('click', analyzeText);

document.getElementById('inputText').addEventListener('keypress', function(e) {
    if (e.key === 'Enter' && e.ctrlKey) {
        analyzeText();
    }
});

document.getElementById('settingsBtn').addEventListener('click', function() {
    document.getElementById('settingsPanel').classList.toggle('active');
});

window.openPopup = openPopup;
window.closePopupFunc = closePopupFunc;
window.firestoreDb = firestoreDb;
window.firebaseApp = firebaseApp;

// Export các hàm API phòng thủ cho các file khác sử dụng
window.apiDefenseSystem = apiDefenseSystem;
window.fetchGemini = fetchGemini;
window.callGeminiWithDefense = callGeminiWithDefense;
window.getApiKeyForGemini = getApiKeyForGemini;

// Khởi tạo hệ thống API phòng thủ khi trang tải xong
document.addEventListener('DOMContentLoaded', function() {
    console.log('VANW Text Analysis Tool đã sẵn sàng!');
    console.log('API Phòng Thủ đang được khởi tạo...');
    
    // Khởi tạo hệ thống API phòng thủ (chạy ngầm)
    apiDefenseSystem.initialize().then(apiInfo => {
        console.log(`=== HỆ THỐNG API PHÒNG THỦ ĐÃ SẴN SÀNG ===`);
        console.log(`API đang dùng: #${apiInfo.index} (${apiInfo.model})`);
        console.log(`Tổng API hoạt động: ${apiDefenseSystem.workingApis.length}/${apiDefenseSystem.allApis.length}`);
        console.log(`Nguồn: ${apiInfo.source}`);
    }).catch(error => {
        console.error('Lỗi khởi tạo hệ thống API phòng thủ:', error);
    });
    
    const originalOpenPopup = openPopup;
    window.openPopup = function(menuId) {
        originalOpenPopup(menuId);
        
        setTimeout(() => {
            if (menuId === 'mapMenu' && window.initMapPopup) {
                initMapPopup();
            } else if (menuId === 'chatbotMenu' && window.initChatbot) {
                initChatbot();
            }
        }, 100);
    };
});
