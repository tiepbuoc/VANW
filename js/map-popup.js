document.addEventListener('DOMContentLoaded', function() {
    console.log('Map popup script đang khởi tạo...');
    
    const firebaseConfig = {
        apiKey: "AIzaSyBHnbro8qUvRyos-BRNdtTRtF0gftKeBEw",
        authDomain: "bando-239fb.firebaseapp.com",
        projectId: "bando-239fb",
        storageBucket: "bando-239fb.firebasestorage.app",
        messagingSenderId: "969907441998",
        appId: "1:969907441998:web:79756035e54aaee2260e1f",
        measurementId: "G-R7KXTV4G4K"
    };

    // KHÔNG còn tạo APIDefenseSystem riêng nữa
    // Sẽ sử dụng hệ thống API phòng thủ chung từ script.js
    
    let authors = [];
    let historyData = {};
    let markers = [];
    let map = null;
    let selectedAuthor1 = null;
    let selectedAuthor2 = null;
    let isConnectionMode = false;
    let connectionLine = null;
    let currentAuthorMarker = null;
    let countryLayers = {};
    let selectedCountryLayer = null;
    let hoangSaLayer = null;
    let truongSaLayer = null;
    let hoangSaText = null;
    let truongSaText = null;
    let isSidebarVisible = true;
    let suggestions = null;
    
    // Thêm biến cho API Defense (sẽ sử dụng chung)
    let currentApiKey = null;

    // Khởi tạo API Defense System (sử dụng chung từ script.js)
    async function initializeApiDefense() {
        console.log("🔧 Đang sử dụng hệ thống API Phòng Thủ chung...");
        
        // Kiểm tra xem hệ thống API phòng thủ chung đã có chưa
        if (!window.apiDefenseSystem) {
            console.log("⏳ Hệ thống API Phòng Thủ chung chưa sẵn sàng, đang chờ...");
            // Chờ một chút để hệ thống chính khởi tạo
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        if (window.apiDefenseSystem && window.apiDefenseSystem.isInitialized) {
            console.log(`✅ Đang sử dụng hệ thống API Phòng Thủ chung`);
            console.log(`   API hoạt động: ${window.apiDefenseSystem.workingApis.length}/${window.apiDefenseSystem.allApis.length}`);
            return true;
        } else {
            console.warn("⚠️ Hệ thống API Phòng Thủ chung chưa sẵn sàng");
            return false;
        }
    }

    // Hàm lấy API key từ hệ thống phòng thủ chung
    async function getApiKeyForGemini() {
        if (!window.apiDefenseSystem || !window.apiDefenseSystem.isInitialized) {
            const initialized = await initializeApiDefense();
            if (!initialized) {
                return null;
            }
        }
        
        if (window.getApiKeyForGemini && typeof window.getApiKeyForGemini === 'function') {
            currentApiKey = await window.getApiKeyForGemini();
        } else if (window.apiDefenseSystem) {
            currentApiKey = await window.apiDefenseSystem.getApiKeyForGemini();
        }
        
        return currentApiKey;
    }

    // Hàm gọi Gemini với cơ chế phòng thủ chung
    async function callGeminiWithDefense(prompt) {
        try {
            console.log("🔄 Đang sử dụng hệ thống API Phòng Thủ chung để gọi Gemini...");
            
            // Sử dụng hàm callGeminiWithDefense chung nếu có
            if (window.callGeminiWithDefense && typeof window.callGeminiWithDefense === 'function') {
                const response = await window.callGeminiWithDefense(prompt);
                console.log("✅ Gemini đã trả lời thành công qua hệ thống API chung");
                return response;
            }
            
            // Fallback: sử dụng fetchGemini chung
            if (window.fetchGemini && typeof window.fetchGemini === 'function') {
                const response = await window.fetchGemini(prompt);
                console.log("✅ Gemini đã trả lời thành công qua fetchGemini chung");
                return response;
            }
            
            // Fallback cuối cùng: sử dụng API defense system trực tiếp
            if (window.apiDefenseSystem && window.apiDefenseSystem.isInitialized) {
                const result = await window.apiDefenseSystem.tryAllApisForResponse(prompt);
                
                if (result.success) {
                    console.log(`✅ Gemini đã trả lời thành công qua API #${result.apiInfo.index}`);
                    return result.response;
                } else {
                    console.error("❌ Tất cả API đều thất bại khi gọi Gemini");
                    return null;
                }
            } else {
                console.error("Không có hệ thống API nào hoạt động để gọi Gemini");
                return null;
            }
        } catch (error) {
            console.error("Lỗi khi gọi Gemini với cơ chế phòng thủ chung:", error);
            return null;
        }
    }

    const countryNameMap = {
        "Nguyễn Khuyến": "Vietnam",
        "Việt Nam": "Vietnam",
        "Anh": "United Kingdom",
        "Mỹ": "United States",
        "Hoa Kỳ": "United States",
        "Pháp": "France",
        "Đức": "Germany",
        "Nga": "Russia",
        "Nhật Bản": "Japan",
        "Trung Quốc": "China",
        "Trung Hoa": "China",
        "Hàn Quốc": "South Korea",
        "Ấn Độ": "India",
        "Brazil": "Brazil",
        "Canada": "Canada",
        "Ý": "Italy",
        "Tây Ban Nha": "Spain",
        "Bồ Đào Nha": "Portugal",
        "Thụy Điển": "Sweden",
        "Na Uy": "Norway",
        "Phần Lan": "Finland",
        "Đan Mạch": "Denmark",
        "Hà Lan": "Netherlands",
        "Bỉ": "Belgium",
        "Thụy Sĩ": "Switzerland",
        "Áo": "Austria",
        "Ba Lan": "Poland",
        "Hy Lạp": "Greece",
        "Thổ Nhĩ Kỳ": "Turkey",
        "Ai Cập": "Egypt",
        "Nam Phi": "South Africa",
        "Mexico": "Mexico",
        "Argentina": "Argentina",
        "Úc": "Australia",
        "New Zealand": "New Zealand"
    };

    function translateCountryName(countryName) {
        if (countryNameMap[countryName]) {
            return countryNameMap[countryName];
        }
        
        const lowerCountryName = countryName.toLowerCase();
        for (const [viName, enName] of Object.entries(countryNameMap)) {
            if (viName.toLowerCase() === lowerCountryName) {
                return enName;
            }
        }
        
        return countryName;
    }

    function extractShortBio(text) {
        const firstParagraph = text.split('\n\n')[0] || text;
        const words = firstParagraph.split(' ');
        const shortBio = words.slice(0, 300).join(' ');
        return words.length > 250 ? shortBio + '...' : shortBio;
    }

    async function searchAuthorFromWikipedia(authorName) {
        const countryInfoContent = document.getElementById('countryInfoContent');
        
        if (!countryInfoContent) return null;
        
        try {
            const searchUrl = `https://vi.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(authorName)}&format=json&origin=*`;
            const searchResponse = await fetch(searchUrl);
            const searchData = await searchResponse.json();
            
            if (searchData.query.search.length === 0) {
                throw new Error('Không tìm thấy thông tin trên Wikipedia');
            }
            
            const pageTitle = searchData.query.search[0].title;
            
            const contentUrl = `https://vi.wikipedia.org/w/api.php?action=query&prop=extracts|pageimages|info&inprop=url&explaintext=true&exchars=1000&pithumbsize=300&titles=${encodeURIComponent(pageTitle)}&format=json&origin=*`;
            const contentResponse = await fetch(contentUrl);
            const contentData = await contentResponse.json();
            
            const pageId = Object.keys(contentData.query.pages)[0];
            const pageInfo = contentData.query.pages[pageId];
            const fullText = pageInfo.extract || '';
            
            let country = "Vietnam";
            const allCountries = [...Object.keys(countryNameMap), ...Object.values(countryNameMap)];
            
            for (const countryName of allCountries) {
                if (fullText.includes(countryName)) {
                    country = countryName;
                    break;
                }
            }
            
            country = translateCountryName(country);
            
            let century = 20;
            const yearMatch = fullText.match(/(\d{4})/);
            if (yearMatch) {
                const year = parseInt(yearMatch[1]);
                century = Math.ceil(year / 100);
            }
            
            let birthPlace = { lat: 0, lng: 0 };
            
            if (fullText.includes("vĩ độ") || fullText.includes("kinh độ")) {
                const latMatch = fullText.match(/vĩ độ.*?(\d+\.?\d*)/i);
                const lngMatch = fullText.match(/kinh độ.*?(\d+\.?\d*)/i);
                
                if (latMatch && lngMatch) {
                    birthPlace.lat = parseFloat(latMatch[1]);
                    birthPlace.lng = parseFloat(lngMatch[1]);
                }
            }
            
            if (birthPlace.lat === 0 && birthPlace.lng === 0) {
                const defaultCoords = {
                    "Vietnam": { lat: 16, lng: 106.2 },
                    "United States": { lat: 37.0902, lng: -95.7129 },
                    "United Kingdom": { lat: 55.3781, lng: -3.4360 },
                    "France": { lat: 46.6035, lng: 1.8883 },
                    "Germany": { lat: 51.1657, lng: 10.4515 },
                    "Russia": { lat: 61.5240, lng: 105.3188 },
                    "China": { lat: 35.8617, lng: 104.1954 },
                    "Japan": { lat: 36.2048, lng: 138.2529 }
                };
                
                birthPlace = defaultCoords[country] || { lat: 0, lng: 0 };
            }
            
            let works = [];
            const worksMatch = fullText.match(/tác phẩm nổi tiếng (.+?)(\.|,|;|\n|$)/i);
            if (worksMatch) {
                works = worksMatch[1].split(',').map(s => s.trim()).filter(s => s);
            }
            
            return {
                id: "wiki_" + Date.now(),
                name: pageTitle,
                bio: extractShortBio(fullText),
                works: works,
                birthPlace: birthPlace,
                country: country,
                century: century,
                image: pageInfo.thumbnail ? pageInfo.thumbnail.source : null,
                connections: [],
                source: "wikipedia"
            };
        } catch (error) {
            console.error('Lỗi khi tìm kiếm Wikipedia:', error);
            return null;
        }
    }

    const defaultIcon = L.divIcon({
        className: 'author-default-marker',
        html: '<div style="background-color: #e37c2d; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></div>',
        iconSize: [16, 16],
        iconAnchor: [8, 8]
    });

    const highlightIcon = L.divIcon({
        className: 'author-highlight-marker',
        html: '<div style="background-color: #fad859; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px #fad859;"></div>',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
    });

    function initLeafletMap() {
        const mapElement = document.getElementById('map');
        if (!mapElement) {
            return;
        }
        
        map = L.map('map', {
            zoomControl: true,
            attributionControl: true,
            preferCanvas: true
        }).setView([16, 106.2], 6);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 18,
            minZoom: 3
        }).addTo(map);

        initializeMapWithTerritories();
        
        const vietnamBounds = L.latLngBounds(
            [8.0, 102.0],
            [23.0, 115.0]
        );
        map.fitBounds(vietnamBounds);
    }

    function initializeMapWithTerritories() {
        const hoangSaBounds = L.latLngBounds([[15.5, 111.0], [17.0, 112.5]]);
        const truongSaBounds = L.latLngBounds([[7.5, 111.0], [9.0, 112.5]]);

        hoangSaLayer = L.rectangle(hoangSaBounds, { 
            color: '#aad3df',
            fillOpacity: 0.7,
            weight: 0,
            fillColor: '#aad3df',
            interactive: false
        }).addTo(map);

        truongSaLayer = L.rectangle(truongSaBounds, { 
            color: '#aad3df',
            fillOpacity: 0.7,
            weight: 0,
            fillColor: '#aad3df',
            interactive: false
        }).addTo(map);

        hoangSaText = L.tooltip({
            permanent: true,
            direction: 'center',
            className: 'leaflet-tooltip',
            opacity: 0.8
        }).setContent("Quần đảo Hoàng Sa")
          .setLatLng([16.25, 111.75]);

        truongSaText = L.tooltip({
            permanent: true,
            direction: 'center',
            className: 'leaflet-tooltip',
            opacity: 0.8
        }).setContent("Quần đảo Trường Sa")
          .setLatLng([8.25, 111.75]);

        hoangSaText.addTo(map);
        truongSaText.addTo(map);

        function adjustTerritoryLayers() {
            if (!map) return;
            
            const zoom = map.getZoom();
            
            if (zoom < 5) {
                hoangSaText.setOpacity(0);
                truongSaText.setOpacity(0);
                hoangSaLayer.setStyle({ opacity: 0 });
                truongSaLayer.setStyle({ opacity: 0 });
            } else if (zoom < 7) {
                hoangSaText.setOpacity(0.5);
                truongSaText.setOpacity(0.5);
                hoangSaLayer.setStyle({ opacity: 0.5 });
                truongSaLayer.setStyle({ opacity: 0.5 });
            } else {
                hoangSaText.setOpacity(0.9);
                truongSaText.setOpacity(0.9);
                hoangSaLayer.setStyle({ opacity: 0.7 });
                truongSaLayer.setStyle({ opacity: 0.7 });
                
                const fontSize = Math.min(14, 10 + zoom * 0.5);
                hoangSaText.getElement().style.fontSize = fontSize + 'px';
                truongSaText.getElement().style.fontSize = fontSize + 'px';
            }
        }

        adjustTerritoryLayers();

        map.on('zoomend', adjustTerritoryLayers);
        map.on('moveend', adjustTerritoryLayers);
    }

    function loadCountryGeoData() {
        fetch('https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Không thể tải dữ liệu địa lý');
                }
                return response.json();
            })
            .then(data => {
                const countriesLayer = L.geoJSON(data, {
                    style: {
                        fillColor: 'transparent',
                        fillOpacity: 0,
                        color: 'transparent',
                        weight: 0
                    },
                    onEachFeature: (feature, layer) => {
                        const countryName = feature.properties.name;
                        countryLayers[countryName] = layer;
                        
                        layer.on('click', (e) => {
                            highlightCountry(countryName);
                            showCountryInfo(countryName);
                        });
                        
                        layer.on('mouseover', function() {
                            if (this !== selectedCountryLayer) {
                                this.setStyle({
                                    color: '#e37c2d',
                                    weight: 2,
                                    opacity: 0.5,
                                    fillOpacity: 0.1,
                                    fillColor: '#e37c2d'
                                });
                            }
                        });
                        
                        layer.on('mouseout', function() {
                            if (this !== selectedCountryLayer) {
                                this.setStyle({
                                    color: 'transparent',
                                    weight: 0,
                                    fillOpacity: 0
                                });
                            }
                        });
                    }
                }).addTo(map);
            })
            .catch(error => {
                showError('Không thể tải dữ liệu địa lý quốc gia. Vui lòng kiểm tra kết nối internet.');
            });
    }

    function highlightCountry(countryName) {
        if (selectedCountryLayer) {
            selectedCountryLayer.setStyle({ 
                color: 'transparent',
                fillOpacity: 0,
                weight: 0
            });
            if (selectedCountryLayer.getElement()) {
                selectedCountryLayer.getElement().classList.remove('country-highlight');
            }
        }
        
        const countryLayer = countryLayers[countryName];
        if (countryLayer) {
            selectedCountryLayer = countryLayer;
            
            countryLayer.setStyle({
                color: '#e37c2d',
                weight: 3,
                opacity: 0.8,
                fillOpacity: 0.2,
                fillColor: '#e37c2d'
            });
            
            if (countryLayer.getElement()) {
                countryLayer.getElement().classList.add('country-highlight');
            }
            
            const bounds = countryLayer.getBounds();
            map.flyToBounds(bounds, { 
                padding: [50, 50],
                duration: 1
            });
        }
    }

    async function showCountryInfo(countryName) {
        const countryInfoContent = document.getElementById('countryInfoContent');
        
        if (!countryInfoContent) {
            return;
        }
        
        try {
            const countryAuthors = authors.filter(author => 
                author.country && author.country.toLowerCase().includes(countryName.toLowerCase())
            );
            
            const historyInfo = historyData[countryName] || 
                               historyData[translateToVietnamese(countryName)] || 
                               { history: "Chưa có thông tin lịch sử văn học cho quốc gia này." };
            
            let countryInfoHTML = `
                <div class="info-section">
                    <h3 style="margin: 0 0 15px 0; color: var(--primary-color); display: flex; align-items: center; gap: 10px;">
                        <i class="fas fa-flag"></i> ${countryName}
                    </h3>
                    
                    <div class="info-section">
                        <span class="info-label"><i class="fas fa-book"></i> Lịch sử văn học:</span>
                        <div class="short-bio">
                            <p>${historyInfo.history || historyInfo || "Chưa có thông tin lịch sử văn học."}</p>
                        </div>
                    </div>
                    
                    <div class="info-section">
                        <span class="info-label"><i class="fas fa-users"></i> Tác giả nổi bật (${countryAuthors.length}):</span>
                        <div style="margin-top: 10px;">
            `;
            
            if (countryAuthors.length > 0) {
                countryInfoHTML += `
                    <div style="max-height: 300px; overflow-y: auto;">
                        ${countryAuthors.slice(0, 10).map(author => `
                            <div class="nearby-author" onclick="window.mapPopupShowAuthorInfo('${author.id}')">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <span>${author.name}</span>
                                    <small style="color: var(--text-secondary);">${author.century ? 'Thế kỷ ' + author.century : ''}</small>
                                </div>
                            </div>
                        `).join('')}
                        ${countryAuthors.length > 10 ? 
                            `<div style="text-align: center; padding: 10px; color: var(--text-secondary); font-size: 0.9rem;">
                                ...và ${countryAuthors.length - 10} tác giả khác
                            </div>` : ''}
                    </div>
                `;
            } else {
                countryInfoHTML += `
                    <p style="color: var(--text-secondary); text-align: center; padding: 20px;">
                        Chưa có thông tin tác giả cho quốc gia này.
                    </p>
                `;
            }
            
            countryInfoHTML += `
                        </div>
                    </div>
                </div>
            `;
            
            countryInfoContent.innerHTML = countryInfoHTML;
            countryInfoContent.scrollTop = 0;
            
        } catch (error) {
            countryInfoContent.innerHTML = `
                <div class="info-section">
                    <h3 style="color: #ef4444;">Lỗi</h3>
                    <p>Không thể tải thông tin quốc gia. Vui lòng thử lại sau.</p>
                </div>
            `;
        }
    }

    function translateToVietnamese(countryName) {
        const countryMap = {
            'Vietnam': 'Việt Nam',
            'United States': 'Mỹ',
            'United States of America': 'Mỹ',
            'United Kingdom': 'Anh',
            'France': 'Pháp',
            'Germany': 'Đức',
            'Russia': 'Nga',
            'China': 'Trung Quốc',
            'Japan': 'Nhật Bản',
            'Korea': 'Hàn Quốc',
            'South Korea': 'Hàn Quốc',
            'India': 'Ấn Độ',
            'Italy': 'Ý',
            'Spain': 'Tây Ban Nha',
            'Portugal': 'Bồ Đào Nha',
            'Netherlands': 'Hà Lan',
            'Belgium': 'Bỉ',
            'Switzerland': 'Thụy Sĩ',
            'Sweden': 'Thụy Điển',
            'Norway': 'Na Uy',
            'Denmark': 'Đan Mạch',
            'Finland': 'Phần Lan',
            'Poland': 'Ba Lan',
            'Czech Republic': 'Cộng hòa Séc',
            'Austria': 'Áo',
            'Hungary': 'Hungary',
            'Romania': 'Romania',
            'Bulgaria': 'Bulgaria',
            'Greece': 'Hy Lạp',
            'Turkey': 'Thổ Nhĩ Kỳ',
            'Egypt': 'Ai Cập',
            'South Africa': 'Nam Phi',
            'Australia': 'Úc',
            'New Zealand': 'New Zealand',
            'Canada': 'Canada',
            'Mexico': 'Mexico',
            'Brazil': 'Brazil',
            'Argentina': 'Argentina',
            'Chile': 'Chile',
            'Peru': 'Peru',
            'Colombia': 'Colombia',
            'Venezuela': 'Venezuela',
            'Thailand': 'Thái Lan',
            'Malaysia': 'Malaysia',
            'Singapore': 'Singapore',
            'Indonesia': 'Indonesia',
            'Philippines': 'Philippines',
            'Cambodia': 'Campuchia',
            'Laos': 'Lào',
            'Myanmar': 'Myanmar'
        };
        
        return countryMap[countryName] || countryName;
    }

    function showError(message) {
        const countryInfoContent = document.getElementById('countryInfoContent');
        if (countryInfoContent) {
            countryInfoContent.innerHTML = `
                <div class="info-section">
                    <h3 style="color: #ef4444;">Lỗi</h3>
                    <p>${message}</p>
                </div>
            `;
        }
    }

    async function loadData() {
        try {
            const countryInfoContent = document.getElementById('countryInfoContent');
            
            let firebaseApp;
            try {
                firebaseApp = firebase.initializeApp(firebaseConfig, 'mapPopupApp');
            } catch (error) {
                try {
                    firebaseApp = firebase.app('mapPopupApp');
                } catch (e) {
                    firebaseApp = firebase.app();
                }
            }
            const db = firebase.firestore(firebaseApp);
            
            const authorsSnapshot = await db.collection('authors').get();
            authors = [];
            authorsSnapshot.forEach(doc => {
                const data = doc.data();
                if (data.birthPlace) {
                    if (typeof data.birthPlace === 'string') {
                        try {
                            data.birthPlace = JSON.parse(data.birthPlace);
                        } catch (e) {
                            data.birthPlace = null;
                        }
                    }
                    else if (data.birthPlace && typeof data.birthPlace === 'object' && 
                            (!data.birthPlace.lat || !data.birthPlace.lng)) {
                        if (data.latitude && data.longitude) {
                            data.birthPlace = {
                                lat: parseFloat(data.latitude),
                                lng: parseFloat(data.longitude)
                            };
                        }
                    }
                }
                
                authors.push({
                    id: doc.id,
                    ...data
                });
            });
            
            const historySnapshot = await db.collection('history').get();
            historyData = {};
            historySnapshot.forEach(doc => {
                historyData[doc.id] = doc.data();
            });
            
            if (countryInfoContent) {
                countryInfoContent.innerHTML = `
                    <div class="info-section">
                        <h3 style="margin: 0 0 15px 0; color: var(--primary-color);">
                            <i class="fas fa-globe-asia"></i> Bản đồ Văn học
                        </h3>
                        <p style="color: var(--text-secondary);">
                            Nhấp vào một quốc gia trên bản đồ để xem thông tin văn học và các tác giả nổi bật.
                        </p>
                        <div style="margin-top: 20px; padding: 15px; background-color: rgba(227, 124, 45, 0.1); border-radius: 8px;">
                            <p style="margin: 0; color: var(--text-primary);">
                                <i class="fas fa-lightbulb"></i> <strong>Mẹo:</strong> Bạn cũng có thể tìm kiếm tác giả bằng ô tìm kiếm phía trên.
                            </p>
                        </div>
                        <div style="margin-top: 10px; padding: 10px; background-color: rgba(66, 133, 244, 0.1); border-radius: 6px;">
                            <p style="margin: 0; color: #4285F4; font-size: 0.9rem;">
                                <i class="fas fa-info-circle"></i> Đã tải ${authors.length} tác giả, trong đó ${authors.filter(a => a.birthPlace && a.birthPlace.lat && a.birthPlace.lng).length} tác giả có vị trí trên bản đồ.
                            </p>
                        </div>
                    </div>
                `;
            }
            
            displayAuthors();
            
        } catch (error) {
            showError('Không thể kết nối với cơ sở dữ liệu. Vui lòng kiểm tra kết nối internet.');
        }
    }

    function displayAuthors() {
        markers.forEach(marker => {
            if (map && map.hasLayer(marker)) {
                map.removeLayer(marker);
            }
        });
        markers = [];
        
        authors.forEach(author => {
            if (author.birthPlace && author.birthPlace.lat && author.birthPlace.lng) {
                const lat = parseFloat(author.birthPlace.lat);
                const lng = parseFloat(author.birthPlace.lng);
                
                if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
                    const marker = L.marker([lat, lng], { 
                        icon: defaultIcon,
                        title: author.name
                    }).addTo(map);
                    
                    marker.bindPopup(createPopupContent(author));
                    marker.on('click', (e) => {
                        if (isConnectionMode) {
                            selectAuthorForConnection(author);
                        } else {
                            showAuthorInfo(author);
                            highlightMarker(marker);
                        }
                    });
                    markers.push(marker);
                }
            }
        });
    }

    function addAuthorMarker(author) {
        if (author.birthPlace && author.birthPlace.lat && author.birthPlace.lng) {
            const lat = parseFloat(author.birthPlace.lat);
            const lng = parseFloat(author.birthPlace.lng);
            
            if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
                const marker = L.marker([lat, lng], { 
                    icon: defaultIcon,
                    title: author.name
                }).addTo(map);
                
                marker.bindPopup(createPopupContent(author));
                marker.on('click', (e) => {
                    if (isConnectionMode) {
                        selectAuthorForConnection(author);
                    } else {
                        showAuthorInfo(author);
                        highlightMarker(marker);
                    }
                });
                markers.push(marker);
                return marker;
            }
        }
        return null;
    }

    function createPopupContent(author) {
        return `
            <div style="padding: 10px; max-width: 250px;">
                <h3 style="margin: 0 0 10px 0; color: #e37c2d; font-size: 1.1rem;">${author.name}</h3>
                ${author.country ? `<p style="margin: 5px 0;"><strong>Quốc gia:</strong> ${author.country}</p>` : ''}
                ${author.century ? `<p style="margin: 5px 0;"><strong>Thế kỷ:</strong> ${author.century}</p>` : ''}
                ${author.works && author.works.length > 0 ? 
                    `<p style="margin: 5px 0;"><strong>Tác phẩm:</strong> ${author.works.slice(0, 2).join(', ')}${author.works.length > 2 ? '...' : ''}</p>` : 
                    ''}
                <button onclick="window.mapPopupShowAuthorInfo('${author.id}')" 
                        style="margin-top: 10px; padding: 6px 12px; background-color: #e37c2d; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9rem;">
                    Xem chi tiết
                </button>
            </div>
        `;
    }

    function showAuthorInfo(author) {
        const countryInfoContent = document.getElementById('countryInfoContent');
        
        if (!countryInfoContent) {
            return;
        }
        
        countryInfoContent.innerHTML = `
            <div class="info-section">
                <h3 style="margin: 0 0 15px 0; color: var(--primary-color); display: flex; align-items: center; gap: 10px;">
                    <i class="fas fa-user-circle"></i> ${author.name}
                </h3>
                
                ${author.image ? `
                    <img src="${author.image}" alt="${author.name}" 
                         style="width: 100%; max-height: 500px; object-fit: cover; border-radius: 8px; margin-bottom: 15px;">
                ` : ''}
                
                <div class="short-bio">
                    <p>${author.bio || 'Chưa có thông tin tiểu sử.'}</p>
                </div>
                
                ${author.works && author.works.length > 0 ? `
                    <div class="info-section" style="margin-top: 15px;">
                        <h4 style="margin: 0 0 10px 0; color: var(--primary-color);">
                            <i class="fas fa-book"></i> Tác phẩm tiêu biểu
                        </h4>
                        <ul class="works-list">
                            ${author.works.map(work => `<li>${work}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 15px;">
                    ${author.country ? `
                        <div style="background-color: rgba(227, 124, 45, 0.1); padding: 10px; border-radius: 6px; text-align: center;">
                            <div style="font-weight: 600; color: var(--primary-color); font-size: 0.9rem;">Quốc gia</div>
                            <div style="font-size: 1.1rem; font-weight: 600;">${author.country}</div>
                        </div>
                    ` : ''}
                    
                    ${author.century ? `
                        <div style="background-color: rgba(227, 124, 45, 0.1); padding: 10px; border-radius: 6px; text-align: center;">
                            <div style="font-weight: 600; color: var(--primary-color); font-size: 0.9rem;">Thế kỷ</div>
                            <div style="font-size: 1.1rem; font-weight: 600;">${author.century}</div>
                        </div>
                    ` : ''}
                </div>
                
                ${author.birthPlace && author.birthPlace.lat && author.birthPlace.lng ? `
                    <button onclick="window.mapPopupShowAuthorInfoAndZoom('${author.id}')"
                            style="margin-top: 15px; width: 100%; padding: 10px; background-color: var(--primary-color); color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 1rem;">
                        <i class="fas fa-map-marker-alt"></i> Xem trên bản đồ
                    </button>
                ` : ''}
            </div>
        `;
        
        countryInfoContent.scrollTop = 0;
        
        if (author.country) {
            highlightCountry(author.country);
        }
    }

    function zoomToAuthorLocation(lat, lng) {
        if (map) {
            map.flyTo([lat, lng], 10, {
                duration: 1,
                easeLinearity: 0.25
            });
        }
    }

    function highlightMarker(marker) {
        markers.forEach(m => m.setIcon(defaultIcon));
        marker.setIcon(highlightIcon);
        currentAuthorMarker = marker;
        marker.openPopup();
    }

    function searchAuthors(searchTerm) {
        const lowerSearchTerm = searchTerm.toLowerCase();
        const filteredAuthors = authors.filter(author => 
            author.name.toLowerCase().includes(lowerSearchTerm)
        );
        
        const countryInfoContent = document.getElementById('countryInfoContent');
        
        if (!countryInfoContent) return;
        
        if (filteredAuthors.length === 0) {
            countryInfoContent.innerHTML = `
                <div class="info-section">
                    <h3 style="color: var(--text-secondary);">Không tìm thấy tác giả</h3>
                    <p>Không tìm thấy tác giả nào với từ khóa "${searchTerm}"</p>
                </div>
            `;
            return;
        }
        
        countryInfoContent.innerHTML = `
            <div class="info-section">
                <h3 style="margin-bottom: 15px; color: var(--primary-color);">
                    <i class="fas fa-search"></i> Kết quả tìm kiếm: "${searchTerm}"
                </h3>
                <div style="display: flex; flex-direction: column; gap: 10px;">
                    ${filteredAuthors.map(author => `
                        <div class="nearby-author" onclick="window.mapPopupShowAuthorInfo('${author.id}')">
                            ${author.name}
                            ${author.country ? `<span style="font-size: 0.8rem; color: var(--text-secondary);">(${author.country})</span>` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    function toggleConnectionMode() {
        const toggleConnectionBtn = document.getElementById('toggleConnectionModeBtn');
        
        if (!toggleConnectionBtn) return;
        
        isConnectionMode = !isConnectionMode;
        const connectionModePanel = document.getElementById('connectionModePanel');
        
        if (!connectionModePanel) return;
        
        if (isConnectionMode) {
            toggleConnectionBtn.classList.add('active');
            connectionModePanel.style.display = 'block';
            resetConnectionSelection();
        } else {
            toggleConnectionBtn.classList.remove('active');
            connectionModePanel.style.display = 'none';
            resetConnectionSelection();
        }
    }

    function selectAuthorForConnection(author) {
        if (!selectedAuthor1) {
            selectedAuthor1 = author;
            const author1Element = document.getElementById('author1Selection');
            if (author1Element) {
                author1Element.innerHTML = 
                    `<i class="fas fa-user" style="color: #28a745;"></i> Tác giả 1: ${author.name}`;
            }
            
            highlightMarkerForConnection(author, '#28a745');
        } else if (!selectedAuthor2 && selectedAuthor1.id !== author.id) {
            selectedAuthor2 = author;
            const author2Element = document.getElementById('author2Selection');
            if (author2Element) {
                author2Element.innerHTML = 
                    `<i class="fas fa-user" style="color: #dc3545;"></i> Tác giả 2: ${author.name}`;
            }
            
            const checkBtn = document.getElementById('checkConnectionBtn');
            if (checkBtn) {
                checkBtn.disabled = false;
            }
            
            highlightMarkerForConnection(author, '#dc3545');
            drawConnectionLine(selectedAuthor1, selectedAuthor2);
        }
    }

    function highlightMarkerForConnection(author, color) {
        const marker = markers.find(m => {
            const latLng = m.getLatLng();
            const authorLat = parseFloat(author.birthPlace.lat);
            const authorLng = parseFloat(author.birthPlace.lng);
            return latLng.lat === authorLat && latLng.lng === authorLng;
        });
        
        if (marker) {
            const icon = L.divIcon({
                className: 'author-connection-marker',
                html: `<div style="background-color: ${color}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px ${color};"></div>`,
                iconSize: [24, 24],
                iconAnchor: [12, 12]
            });
            marker.setIcon(icon);
        }
    }

    function drawConnectionLine(author1, author2) {
        if (connectionLine && map.hasLayer(connectionLine)) {
            map.removeLayer(connectionLine);
        }
        
        const latLngs = [
            [parseFloat(author1.birthPlace.lat), parseFloat(author1.birthPlace.lng)],
            [parseFloat(author2.birthPlace.lat), parseFloat(author2.birthPlace.lng)]
        ];
        
        connectionLine = L.polyline(latLngs, {
            color: '#e37c2d',
            weight: 3,
            dashArray: '10, 5',
            opacity: 0.7
        }).addTo(map);
        
        const bounds = L.latLngBounds(latLngs);
        map.fitBounds(bounds, { padding: [50, 50] });
    }

    function resetConnectionSelection() {
        selectedAuthor1 = null;
        selectedAuthor2 = null;
        
        const author1Element = document.getElementById('author1Selection');
        const author2Element = document.getElementById('author2Selection');
        const checkBtn = document.getElementById('checkConnectionBtn');
        const connectionResult = document.getElementById('connectionResult');
        
        if (author1Element) {
            author1Element.innerHTML = 
                '<i class="fas fa-user" style="color: #28a745;"></i> Tác giả 1: Chưa chọn';
        }
        
        if (author2Element) {
            author2Element.innerHTML = 
                '<i class="fas fa-user" style="color: #dc3545;"></i> Tác giả 2: Chưa chọn';
        }
        
        if (checkBtn) {
            checkBtn.disabled = true;
        }
        
        if (connectionResult) {
            connectionResult.style.display = 'none';
        }
        
        if (connectionLine && map.hasLayer(connectionLine)) {
            map.removeLayer(connectionLine);
            connectionLine = null;
        }
        
        markers.forEach(marker => marker.setIcon(defaultIcon));
    }

    function formatGeminiResponse(text) {
        let formattedText = text;
        formattedText = formattedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        formattedText = formattedText.replace(/\*(.*?)\*/g, '<em>$1</em>');
        formattedText = formattedText.replace(/_{2,3}(.*?)_{2,3}/g, '<u>$1</u>');
        
        const words = formattedText.split(' ');
        if (words.length > 60) {
            formattedText = words.slice(0, 60).join(' ') + '...';
        }
        
        return formattedText;
    }

    async function checkConnection() {
        if (!selectedAuthor1 || !selectedAuthor2) return;
        
        const connectionResult = document.getElementById('connectionResult');
        if (!connectionResult) return;
        
        connectionResult.innerHTML = `
            <div style="text-align: center; padding: 20px;">
                <div class="loading-spinner"></div>
                <p style="margin-top: 10px; color: var(--text-secondary);">Đang phân tích mối liên hệ...</p>
            </div>
        `;
        connectionResult.style.display = 'block';
        
        try {
            const prompt = `Phân tích mối liên hệ giữa hai nhà văn ${selectedAuthor1.name} và ${selectedAuthor2.name}. 
            Hãy so sánh về: thời đại sống, phong cách sáng tác, chủ đề chính trong tác phẩm, và ảnh hưởng của họ đến văn học. 
            Trả lời bằng tiếng Việt, không quá 60 từ.`;
            
            // Sử dụng cơ chế API phòng thủ chung để gọi Gemini
            console.log("🔄 Đang sử dụng hệ thống API Phòng Thủ chung để phân tích liên hệ...");
            const connectionText = await callGeminiWithDefense(prompt);
            
            if (connectionText) {
                const formattedText = formatGeminiResponse(connectionText);
                
                connectionResult.innerHTML = `
                    <h4 style="margin: 0 0 10px 0; color: var(--primary-color);">
                        <i class="fas fa-link"></i> Mối liên hệ giữa ${selectedAuthor1.name} và ${selectedAuthor2.name}
                    </h4>
                    <div class="gemini-response">
                        ${formattedText}
                    </div>
                `;
            } else {
                connectionResult.innerHTML = `
                    <p style="color: var(--text-secondary); text-align: center;">
                        Không thể phân tích mối liên hệ do lỗi API. Vui lòng thử lại sau.
                    </p>
                `;
            }
        } catch (error) {
            connectionResult.innerHTML = `
                <p style="color: #ef4444; text-align: center;">
                    Đã xảy ra lỗi khi phân tích: ${error.message}
                </p>
            `;
        }
    }

    function updateCenturyFilterUI(selectedValue) {
        const centuryValueDisplay = document.getElementById('centuryValueDisplay');
        const labels = ['label-pre17', 'label-17', 'label-18', 'label-19', 'label-20', 'label-all'];
        
        labels.forEach(labelId => {
            const label = document.getElementById(labelId);
            if (label) {
                label.classList.remove('active');
            }
        });
        
        let displayText = "Tất cả";
        if (selectedValue === 0) {
            displayText = "Trước 17";
            document.getElementById('label-pre17')?.classList.add('active');
        } else if (selectedValue === 1) {
            displayText = "Thế kỷ 17";
            document.getElementById('label-17')?.classList.add('active');
        } else if (selectedValue === 2) {
            displayText = "Thế kỷ 18";
            document.getElementById('label-18')?.classList.add('active');
        } else if (selectedValue === 3) {
            displayText = "Thế kỷ 19";
            document.getElementById('label-19')?.classList.add('active');
        } else if (selectedValue === 4) {
            displayText = "Thế kỷ 20";
            document.getElementById('label-20')?.classList.add('active');
        } else if (selectedValue === 5) {
            displayText = "Tất cả";
            document.getElementById('label-all')?.classList.add('active');
        }
        
        if (centuryValueDisplay) {
            centuryValueDisplay.textContent = displayText;
        }
        
        applyCenturyFilter(selectedValue);
    }

    function applyCenturyFilter(selectedValue) {
        markers.forEach(marker => {
            const author = authors.find(a => {
                const latLng = marker.getLatLng();
                const authorLat = a.birthPlace ? parseFloat(a.birthPlace.lat) : null;
                const authorLng = a.birthPlace ? parseFloat(a.birthPlace.lng) : null;
                return authorLat && authorLng && latLng.lat === authorLat && latLng.lng === authorLng;
            });
            
            if (!author) return;
            
            let showMarker = false;
            
            if (selectedValue === 5) {
                showMarker = true;
            } else if (selectedValue === 0) {
                showMarker = author.century <= 16;
            } else {
                const targetCentury = selectedValue + 16;
                showMarker = author.century === targetCentury;
            }
            
            if (showMarker) {
                if (!map.hasLayer(marker)) {
                    marker.addTo(map);
                }
            } else {
                if (map.hasLayer(marker)) {
                    map.removeLayer(marker);
                }
            }
        });
    }

    function applyAdvancedFilter() {
        const country = document.getElementById('searchCountry').value;
        
        const filteredAuthors = authors.filter(author => {
            let match = true;
            
            if (country && author.country !== country) {
                match = false;
            }
            
            return match;
        });
        
        const centurySlider = document.getElementById('centurySlider');
        if (centurySlider) {
            const centuryValue = parseInt(centurySlider.value);
            applyCenturyFilter(centuryValue);
        }
        
        displaySearchResults(filteredAuthors);
    }

    function displaySearchResults(filteredAuthors) {
        const countryInfoContent = document.getElementById('countryInfoContent');
        
        if (!countryInfoContent) return;
        
        if (filteredAuthors.length === 0) {
            countryInfoContent.innerHTML = `
                <div class="info-section">
                    <h3 style="color: var(--text-secondary);">Không tìm thấy tác giả</h3>
                    <p>Không tìm thấy tác giả nào phù hợp với tiêu chí tìm kiếm.</p>
                </div>
            `;
            return;
        }
        
        countryInfoContent.innerHTML = `
            <div class="info-section">
                <h3 style="margin-bottom: 15px; color: var(--primary-color);">
                    <i class="fas fa-search"></i> Kết quả tìm kiếm (${filteredAuthors.length} tác giả)
                </h3>
                <div style="display: flex; flex-direction: column; gap: 10px; max-height: 400px; overflow-y: auto;">
                    ${filteredAuthors.map(author => `
                        <div class="nearby-author" onclick="window.mapPopupShowAuthorInfo('${author.id}')">
                            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                                <span>${author.name}</span>
                                <small style="color: var(--text-secondary);">${author.country} • ${author.century ? 'Thế kỷ ' + author.century : ''}</small>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background-color: ${type === 'info' ? '#4285F4' : type === 'success' ? '#34A853' : '#EA4335'};
            color: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 9999;
            animation: slideIn 0.3s ease;
        `;
        
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <i class="fas fa-${type === 'info' ? 'info-circle' : type === 'success' ? 'check-circle' : 'exclamation-triangle'}"></i>
                <span>${message}</span>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }, 3000);
    }

    function handleSearchInput(e) {
        const searchTerm = e.target.value.trim();
        if (!suggestions) return;
        
        suggestions.innerHTML = '';
        
        if (searchTerm.length < 1) {
            suggestions.style.display = 'none';
            return;
        }
        
        const lowerSearchTerm = searchTerm.toLowerCase();
        
        const filteredAuthors = authors.filter(author => 
            author.name.toLowerCase().includes(lowerSearchTerm)
        );
        
        if (filteredAuthors.length > 0) {
            filteredAuthors.forEach(author => {
                const div = document.createElement('div');
                div.className = 'suggestion-item';
                div.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="width: 8px; height: 8px; border-radius: 50%; background-color: #e37c2d;"></div>
                        <span>${author.name}</span>
                        <small style="margin-left: auto; color: var(--text-secondary);">${author.country}</small>
                    </div>
                `;
                div.addEventListener('click', () => {
                    showAuthorInfo(author);
                    const searchInput = document.getElementById('mapSearchInput');
                    if (searchInput) searchInput.value = author.name;
                    suggestions.style.display = 'none';
                });
                suggestions.appendChild(div);
            });
        }
        
        const wikiDiv = document.createElement('div');
        wikiDiv.className = 'suggestion-item wiki-search-option';
        wikiDiv.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <i class="fas fa-external-link-alt"></i>
                <span>Tìm kiếm "${searchTerm}" trên Wikipedia</span>
            </div>
        `;
        wikiDiv.addEventListener('click', async () => {
            const searchInput = document.getElementById('mapSearchInput');
            if (searchInput) searchInput.value = searchTerm;
            suggestions.style.display = 'none';
            
            const countryInfoContent = document.getElementById('countryInfoContent');
            if (countryInfoContent) {
                countryInfoContent.innerHTML = `
                    <div class="firebase-loading">
                        <span class="loading-spinner"></span>
                        <p>Đang tìm kiếm thông tin trên Wikipedia...</p>
                    </div>
                `;
            }
            
            const authorInfo = await searchAuthorFromWikipedia(searchTerm);
            if (authorInfo) {
                const existingAuthorIndex = authors.findIndex(a => a.name === authorInfo.name);
                if (existingAuthorIndex === -1) {
                    authors.push(authorInfo);
                    
                    if (authorInfo.birthPlace && authorInfo.birthPlace.lat !== 0 && authorInfo.birthPlace.lng !== 0) {
                        addAuthorMarker(authorInfo);
                    }
                    
                    showAuthorInfo(authorInfo);
                    
                    showNotification(`Đã thêm tác giả "${authorInfo.name}" từ Wikipedia`, 'success');
                } else {
                    showAuthorInfo(authors[existingAuthorIndex]);
                    showNotification(`Tác giả "${authorInfo.name}" đã có trong cơ sở dữ liệu`, 'info');
                }
            } else {
                showError('Không thể tìm thấy thông tin cho "' + searchTerm + '" trên Wikipedia. Vui lòng thử lại với tên khác hoặc kiểm tra kết nối internet.');
            }
        });
        suggestions.appendChild(wikiDiv);
        
        suggestions.style.display = 'block';
    }

    function initMapPopup() {
        console.log('Đang khởi tạo popup bản đồ...');
        
        const popupContent = document.getElementById('popupContent');
        const popupTitle = document.getElementById('popupTitle');
        
        if (!popupContent || !popupTitle) {
            console.error('Không tìm thấy popupContent hoặc popupTitle');
            return;
        }
        
        if (popupTitle.textContent === 'Bản đồ văn học') {
            console.log('Khởi tạo bản đồ văn học trong popup...');
            
            popupContent.innerHTML = `
                <div class="map-popup">
                    <button class="sidebar-toggle-btn" id="mapSidebarToggleBtn">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                    
                    <div class="map-layout">
                        <div class="map-sidebar" id="mapSidebar">
                            <div class="map-sidebar-content">
                                <div class="map-controls-container">
                                    <div class="map-fixed-controls">
                                        <div class="search-container">
                                            <input type="text" id="mapSearchInput" class="search-input" placeholder="Tìm kiếm nhà văn...">
                                            <button class="advanced-search-btn" id="advancedSearchBtn">
                                                <i class="fas fa-sliders-h"></i>
                                            </button>
                                            <div class="suggestions" id="mapSuggestions"></div>
                                        </div>
                                        
                                        <div class="advanced-search-panel" id="advancedSearchPanel">
                                            <div class="advanced-search-fields">
                                                <div class="advanced-field">
                                                    <label for="searchCountry">Quốc gia:</label>
                                                    <select id="searchCountry">
                                                        <option value="">Tất cả quốc gia</option>
                                                        <option value="Vietnam">Việt Nam</option>
                                                        <option value="United States">Mỹ</option>
                                                        <option value="United Kingdom">Anh</option>
                                                        <option value="France">Pháp</option>
                                                        <option value="Germany">Đức</option>
                                                        <option value="Russia">Nga</option>
                                                        <option value="China">Trung Quốc</option>
                                                        <option value="Japan">Nhật Bản</option>
                                                    </select>
                                                </div>
                                                
                                                <!-- Bộ lọc thế kỷ đơn giản -->
                                                <div class="century-filter-container">
                                                    <div class="century-filter-header">
                                                        <div class="century-filter-title">
                                                            <i class="fas fa-filter"></i> Lọc theo thế kỷ
                                                        </div>
                                                        <div class="century-value-display" id="centuryValueDisplay">Tất cả</div>
                                                    </div>
                                                    <input type="range" id="centurySlider" class="simple-slider" min="0" max="5" value="5">
                                                    <div class="century-labels">
                                                        <div class="century-label" id="label-pre17">17-</div>
                                                        <div class="century-label" id="label-17">17</div>
                                                        <div class="century-label" id="label-18">18</div>
                                                        <div class="century-label" id="label-19">19</div>
                                                        <div class="century-label" id="label-20">20</div>
                                                        <div class="century-label" id="label-all">Tất cả</div>
                                                    </div>
                                                </div>
                                                
                                                <div class="advanced-field">
                                                    <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 10px;">
                                                        <label style="font-weight: 600; color: var(--primary-color); display: flex; align-items: center; gap: 5px;">
                                                            <i class="fas fa-link"></i> Chế độ tìm liên hệ
                                                        </label>
                                                        <button id="toggleConnectionModeBtn" class="toggle-btn">
                                                            <span class="toggle-slider"></span>
                                                        </button>
                                                    </div>
                                                </div>
                                                
                                                <div id="connectionModePanel" class="connection-mode">
                                                    <div class="selected-author" id="author1Selection">
                                                        <i class="fas fa-user" style="color: #28a745;"></i> Tác giả 1: Chưa chọn
                                                    </div>
                                                    <div class="selected-author" id="author2Selection">
                                                        <i class="fas fa-user" style="color: #dc3545;"></i> Tác giả 2: Chưa chọn
                                                    </div>
                                                    <button id="checkConnectionBtn" class="control-btn" disabled>
                                                        <i class="fas fa-search"></i> Kiểm tra liên hệ
                                                    </button>
                                                    <div id="connectionResult" style="display: none; margin-top: 15px; padding: 15px; background-color: rgba(0,0,0,0.05); border-radius: 8px;"></div>
                                                </div>
                                                
                                                <div class="location-controls">
                                                    <button id="refreshDataBtn" class="control-btn secondary">
                                                        <i class="fas fa-sync-alt"></i> Tải lại dữ liệu
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="map-scrollable-content">
                                        <div id="countryInfoContent" class="author-info-content">
                                            <div class="firebase-loading">
                                                <span class="loading-spinner"></span>
                                                <p>Đang kết nối với cơ sở dữ liệu văn học...</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="map-main">
                            <div class="map-container">
                                <div id="map" style="width: 100%; height: 100%;"></div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            setTimeout(async () => {
                try {
                    // Sử dụng hệ thống API phòng thủ chung
                    console.log("🚀 Bắt đầu khởi tạo hệ thống Bản đồ Văn học...");
                    await initializeApiDefense();
                    
                    initLeafletMap();
                    setupMapEventListeners();
                    loadData();
                    loadCountryGeoData();
                    
                    console.log("✅ Hệ thống Bản đồ Văn học đã sẵn sàng!");
                    console.log("📡 Đang sử dụng hệ thống API Phòng Thủ chung");
                } catch (error) {
                    console.error("❌ Lỗi khởi tạo hệ thống:", error);
                }
            }, 200);
        }
    }

    function setupMapEventListeners() {
        const sidebarToggleBtn = document.getElementById('mapSidebarToggleBtn');
        const mapSidebar = document.getElementById('mapSidebar');
        
        if (!sidebarToggleBtn || !mapSidebar) {
            return;
        }
        
        isSidebarVisible = true;
        mapSidebar.classList.remove('hidden');
        
        updateToggleButtonPosition();

        sidebarToggleBtn.addEventListener('click', () => {
            isSidebarVisible = !isSidebarVisible;
            if (isSidebarVisible) {
                mapSidebar.classList.remove('hidden');
                sidebarToggleBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
            } else {
                mapSidebar.classList.add('hidden');
                sidebarToggleBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
            }
            updateToggleButtonPosition();
        });

        function updateToggleButtonPosition() {
            const sidebarWidth = window.innerWidth <= 768 ? '300px' : '350px';
            if (isSidebarVisible) {
                sidebarToggleBtn.style.left = sidebarWidth;
            } else {
                sidebarToggleBtn.style.left = '0';
            }
        }

        window.addEventListener('resize', updateToggleButtonPosition);

        const searchInput = document.getElementById('mapSearchInput');
        suggestions = document.getElementById('mapSuggestions');
        
        if (searchInput && suggestions) {
            searchInput.addEventListener('input', handleSearchInput);
            searchInput.addEventListener('focus', handleSearchInput);
            
            document.addEventListener('click', (e) => {
                if (suggestions && !searchInput.contains(e.target) && !suggestions.contains(e.target)) {
                    suggestions.style.display = 'none';
                }
            });
        }

        const advancedSearchBtn = document.getElementById('advancedSearchBtn');
        const advancedSearchPanel = document.getElementById('advancedSearchPanel');
        
        if (advancedSearchBtn && advancedSearchPanel) {
            advancedSearchBtn.addEventListener('click', () => {
                advancedSearchPanel.classList.toggle('active');
                
                if (advancedSearchPanel.classList.contains('active')) {
                    advancedSearchBtn.innerHTML = '<i class="fas fa-times"></i>';
                } else {
                    advancedSearchBtn.innerHTML = '<i class="fas fa-sliders-h"></i>';
                }
            });
        }

        const searchCountry = document.getElementById('searchCountry');
        if (searchCountry) {
            searchCountry.addEventListener('change', applyAdvancedFilter);
        }

        const centurySlider = document.getElementById('centurySlider');
        if (centurySlider) {
            centurySlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                updateCenturyFilterUI(value);
            });
            
            updateCenturyFilterUI(parseInt(centurySlider.value));
        }

        const toggleConnectionBtn = document.getElementById('toggleConnectionModeBtn');
        const checkConnectionBtn = document.getElementById('checkConnectionBtn');
        
        if (toggleConnectionBtn) {
            toggleConnectionBtn.addEventListener('click', toggleConnectionMode);
        }
        
        if (checkConnectionBtn) {
            checkConnectionBtn.addEventListener('click', checkConnection);
        }

        const refreshDataBtn = document.getElementById('refreshDataBtn');
        
        if (refreshDataBtn) {
            refreshDataBtn.addEventListener('click', () => {
                loadData();
                showNotification('Đang tải lại dữ liệu...', 'info');
            });
        }
    }

    window.mapPopupShowAuthorInfo = function(authorId) {
        const author = authors.find(a => a.id === authorId);
        if (author) {
            showAuthorInfo(author);
            
            if (author.birthPlace && author.birthPlace.lat && author.birthPlace.lng) {
                const lat = parseFloat(author.birthPlace.lat);
                const lng = parseFloat(author.birthPlace.lng);
                zoomToAuthorLocation(lat, lng);
                
                const marker = markers.find(m => {
                    const latLng = m.getLatLng();
                    return latLng.lat === lat && latLng.lng === lng;
                });
                
                if (marker) {
                    highlightMarker(marker);
                }
            }
        }
    };

    window.mapPopupShowAuthorInfoAndZoom = function(authorId) {
        window.mapPopupShowAuthorInfo(authorId);
    };

    window.zoomToAuthorLocation = function(lat, lng) {
        if (map) {
            map.flyTo([lat, lng], 10, {
                duration: 1,
                easeLinearity: 0.25
            });
        }
    };

    const originalOpenPopup = window.openPopup;
    if (typeof originalOpenPopup === 'function') {
        window.openPopup = function(menuId) {
            originalOpenPopup(menuId);
            if (menuId === 'mapMenu') {
                console.log('Mở popup bản đồ, đang khởi tạo...');
                setTimeout(initMapPopup, 300);
            }
        };
    } else {
        console.log('Không tìm thấy hàm openPopup gốc, tạo hàm mới');
        window.openPopup = function(menuId) {
            if (menuId === 'mapMenu') {
                console.log('Mở popup bản đồ trực tiếp...');
                initMapPopup();
            }
        };
    }

    const popupTitle = document.getElementById('popupTitle');
    if (popupTitle && popupTitle.textContent === 'Bản đồ văn học') {
        console.log('Popup bản đồ đã mở, đang khởi tạo...');
        setTimeout(initMapPopup, 500);
    }
    
    console.log('Map popup script đã được tải đầy đủ và ĐÃ SỬA ĐỂ SỬ DỤNG HỆ THỐNG API PHÒNG THỦ CHUNG');
});
