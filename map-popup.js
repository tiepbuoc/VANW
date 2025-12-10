// JavaScript cho popup bản đồ văn học - ĐÃ SỬA LỖI HOÀN CHỈNH VỚI AI TÌM VỊ TRÍ
document.addEventListener('DOMContentLoaded', function() {
    // Cấu hình Firebase
    const firebaseConfig = {
        apiKey: "AIzaSyBHnbro8qUvRyos-BRNdtTRtF0gftKeBEw",
        authDomain: "bando-239fb.firebaseapp.com",
        projectId: "bando-239fb",
        storageBucket: "bando-239fb.firebasestorage.app",
        messagingSenderId: "969907441998",
        appId: "1:969907441998:web:79756035e54aaee2260e1f",
        measurementId: "G-R7KXTV4G4K"
    };

    // Khởi tạo Firebase
    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();

    // Biến toàn cục
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
    let userLocationMarker = null;
    let watchId = null;
    let suggestions = null;
    let isGeocodingInProgress = false;
    let geocodedAuthors = new Set();

    // API Key cho bản đồ và AI
    const MAP_REVERSED_API_KEY = "YMZZKI_mV0OHMDxiWE65_LsII1E242PuDySazIA";
    const MAP_API_KEY = MAP_REVERSED_API_KEY.split('').reverse().join('');

    // Hàm khởi tạo bản đồ trong popup
    function initMapPopup() {
        const popupContent = document.getElementById('popupContent');
        const popupTitle = document.getElementById('popupTitle');
        
        // KIỂM TRA KỸ: Chỉ chạy nếu đúng là popup bản đồ
        if (!popupContent || !popupTitle) {
            console.error('Không tìm thấy popupContent hoặc popupTitle');
            return;
        }
        
        if (popupTitle.textContent === 'Bản đồ văn học') {
            console.log('Khởi tạo bản đồ văn học...');
            
            // Tạo nội dung cho popup bản đồ với sidebar bên trái
            popupContent.innerHTML = `
                <div class="map-popup">
                    <!-- Sidebar Toggle Button - BÊN TRÁI -->
                    <button class="sidebar-toggle-btn" id="mapSidebarToggleBtn">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                    
                    <div class="map-layout">
                        <div class="map-sidebar" id="mapSidebar">
                            <div class="map-sidebar-content">
                                <div class="map-controls-container">
                                    <!-- Phần điều khiển cố định trên cùng -->
                                    <div class="map-fixed-controls">
                                        <div class="ai-progress" id="aiGeocodingProgress">
                                            <div class="progress-text">
                                                <i class="fas fa-robot"></i>
                                                <span id="aiProgressText">AI đang tìm vị trí các tác giả...</span>
                                            </div>
                                            <div class="progress-bar">
                                                <div class="progress-fill" id="aiProgressFill"></div>
                                            </div>
                                        </div>
                                        
                                        <div class="search-container">
                                            <input type="text" id="mapSearchInput" class="search-input" placeholder="Tìm kiếm nhà văn...">
                                            <button class="advanced-search-btn" id="advancedSearchBtn">
                                                <i class="fas fa-sliders-h"></i>
                                            </button>
                                            <div class="suggestions" id="mapSuggestions"></div>
                                        </div>
                                        
                                        <!-- Panel tìm kiếm nâng cao - CHỨA CÁC TÙY CHỌN MỞ RỘNG -->
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
                                                <div class="advanced-field">
                                                    <label for="searchCentury">Thế kỷ:</label>
                                                    <select id="searchCentury">
                                                        <option value="">Tất cả thế kỷ</option>
                                                        <option value="16">Thế kỷ 16</option>
                                                        <option value="17">Thế kỷ 17</option>
                                                        <option value="18">Thế kỷ 18</option>
                                                        <option value="19">Thế kỷ 19</option>
                                                        <option value="20">Thế kỷ 20</option>
                                                        <option value="21">Thế kỷ 21</option>
                                                    </select>
                                                </div>
                                                <div class="advanced-field">
                                                    <label for="searchGenre">Thể loại:</label>
                                                    <input type="text" id="searchGenre" placeholder="Ví dụ: thơ, tiểu thuyết...">
                                                </div>
                                                
                                                <!-- THANH TRƯỢT LỌC THẾ KỶ -->
                                                <div class="advanced-field">
                                                    <label for="centurySlider" class="info-label">
                                                        <i class="fas fa-history"></i> Lọc theo thế kỷ:
                                                        <span id="centuryValue" class="info-value" style="font-weight: normal;">Tất cả thế kỷ</span>
                                                    </label>
                                                    <input type="range" id="centurySlider" class="slider" min="0" max="5" value="5">
                                                </div>
                                                
                                                <!-- CHẾ ĐỘ TÌM LIÊN HỆ -->
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
                                                
                                                <!-- Panel chế độ liên hệ (hiển thị khi bật) -->
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
                                                
                                                <!-- NÚT VỊ TRÍ VÀ TÌM KIẾM GẦN -->
                                                <div class="location-controls">
                                                    <button id="toggleLocationBtn" class="control-btn secondary">
                                                        <i class="fas fa-location-crosshairs"></i> Vị trí của tôi
                                                    </button>
                                                    <button id="findNearbyBtn" class="control-btn secondary">
                                                        <i class="fas fa-search-location"></i> Tìm gần tôi (100km)
                                                    </button>
                                                    <button id="refreshLocationsBtn" class="control-btn secondary">
                                                        <i class="fas fa-sync-alt"></i> AI tìm vị trí
                                                    </button>
                                                </div>
                                            </div>
                                            <div class="advanced-search-actions">
                                                <button id="applyAdvancedSearch" class="control-btn secondary" style="flex: 2;">
                                                    <i class="fas fa-search"></i> Áp dụng
                                                </button>
                                                <button id="clearAdvancedSearch" class="control-btn" style="flex: 1;">
                                                    <i class="fas fa-times"></i> Xóa
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <!-- Phần nội dung cuộn được -->
                                    <div class="map-scrollable-content">
                                        <div id="countryInfoContent" class="author-info-content">
                                            <div class="firebase-loading">
                                                <span class="loading-spinner"></span>
                                                <p>Đang khởi tạo bản đồ văn học...</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="map-main">
                            <div class="map-container">
                                <div id="map"></div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Khởi tạo bản đồ Leaflet và tải dữ liệu
            setTimeout(() => {
                try {
                    initLeafletMap();
                    setupMapEventListeners();
                    loadData();
                    loadCountryGeoData();
                    console.log('Bản đồ đã được khởi tạo thành công');
                    console.log('API Key đã được cấu hình:', MAP_API_KEY ? 'Có' : 'Không');
                } catch (error) {
                    console.error('Lỗi khi khởi tạo bản đồ:', error);
                }
            }, 200);
        }
    }

    // Hàm khởi tạo bản đồ Leaflet
    function initLeafletMap() {
        console.log('Đang khởi tạo bản đồ Leaflet...');
        
        const mapElement = document.getElementById('map');
        if (!mapElement) {
            console.error('Không tìm thấy element #map');
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
        
        console.log('Bản đồ Leaflet đã được khởi tạo');
    }

    // Hàm tải dữ liệu địa lý quốc gia
    function loadCountryGeoData() {
        console.log('Đang tải dữ liệu địa lý quốc gia...');
        
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
                
                console.log('Dữ liệu địa lý quốc gia đã được tải:', Object.keys(countryLayers).length, 'quốc gia');
            })
            .catch(error => {
                console.error('Lỗi tải dữ liệu địa lý quốc gia:', error);
                showError('Không thể tải dữ liệu địa lý quốc gia. Vui lòng kiểm tra kết nối internet.');
            });
    }

    // Hàm khởi tạo bản đồ với Hoàng Sa và Trường Sa
    function initializeMapWithTerritories() {
        console.log('Đang thêm Hoàng Sa và Trường Sa...');
        
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
        
        console.log('Hoàng Sa và Trường Sa đã được thêm vào bản đồ');
    }

    // Hàm highlight quốc gia
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

    // Hàm hiển thị thông tin quốc gia
    async function showCountryInfo(countryName) {
        const countryInfoContent = document.getElementById('countryInfoContent');
        
        if (!countryInfoContent) {
            console.error('Không tìm thấy countryInfoContent');
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
            console.error('Lỗi khi hiển thị thông tin quốc gia:', error);
            countryInfoContent.innerHTML = `
                <div class="info-section">
                    <h3 style="color: #ef4444;">Lỗi</h3>
                    <p>Không thể tải thông tin quốc gia. Vui lòng thử lại sau.</p>
                </div>
            `;
        }
    }

    // Hàm dịch tên quốc gia sang tiếng Việt
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

    // Hàm hiển thị lỗi
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

    // Hàm hiển thị thành công
    function showSuccess(message) {
        const countryInfoContent = document.getElementById('countryInfoContent');
        if (countryInfoContent) {
            countryInfoContent.innerHTML = `
                <div class="info-section">
                    <h3 style="color: #28a745;">Thành công!</h3>
                    <p>${message}</p>
                </div>
            `;
        }
    }

    // Icon cho bản đồ
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

    // Hàm tải dữ liệu từ Firestore - SỬA: Thêm AI tìm kiếm vị trí
    async function loadData() {
        try {
            const countryInfoContent = document.getElementById('countryInfoContent');
            
            console.log('Đang tải dữ liệu từ Firestore...');
            
            countryInfoContent.innerHTML = `
                <div class="firebase-loading">
                    <span class="loading-spinner"></span>
                    <p>Đang tải dữ liệu tác giả từ cơ sở dữ liệu...</p>
                </div>
            `;
            
            const authorsSnapshot = await db.collection('authors').get();
            authors = [];
            authorsSnapshot.forEach(doc => {
                authors.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            const historySnapshot = await db.collection('history').get();
            historyData = {};
            historySnapshot.forEach(doc => {
                historyData[doc.id] = doc.data();
            });
            
            console.log('Dữ liệu đã tải:', authors.length, 'tác giả');
            
            // Kiểm tra xem có tác giả nào có tọa độ không
            const authorsWithCoordinates = authors.filter(author => 
                author.birthPlace && author.birthPlace.lat && author.birthPlace.lng
            );
            
            if (authorsWithCoordinates.length === 0) {
                // Không có tọa độ, sử dụng AI để tìm
                showAIGeocodingProgress();
                await findAuthorsLocationsWithAI();
            } else {
                // Đã có tọa độ, hiển thị ngay
                countryInfoContent.innerHTML = `
                    <div class="info-section">
                        <h3 style="margin: 0 0 15px 0; color: var(--primary-color);">
                            <i class="fas fa-globe-asia"></i> Bản đồ Văn học
                        </h3>
                        <p style="color: var(--text-secondary);">
                            Đã tải ${authors.length} tác giả. Nhấp vào một quốc gia trên bản đồ để xem thông tin văn học và các tác giả nổi bật.
                        </p>
                        <div style="margin-top: 20px; padding: 15px; background-color: rgba(40, 167, 69, 0.1); border-radius: 8px;">
                            <p style="margin: 0; color: #28a745;">
                                <i class="fas fa-check-circle"></i> <strong>Thành công:</strong> Đã tìm thấy ${authorsWithCoordinates.length} tác giả có vị trí trên bản đồ.
                            </p>
                        </div>
                        <div style="margin-top: 15px; padding: 15px; background-color: rgba(227, 124, 45, 0.1); border-radius: 8px;">
                            <p style="margin: 0; color: var(--text-primary);">
                                <i class="fas fa-lightbulb"></i> <strong>Mẹo:</strong> Bạn có thể dùng nút "AI tìm vị trí" để cải thiện độ chính xác vị trí.
                            </p>
                        </div>
                    </div>
                `;
                
                displayAuthors();
            }
            
        } catch (error) {
            console.error('Lỗi tải dữ liệu:', error);
            showError('Không thể kết nối với cơ sở dữ liệu. Vui lòng kiểm tra kết nối internet.');
        }
    }

    // Hàm hiển thị tiến trình AI tìm vị trí
    function showAIGeocodingProgress() {
        const aiProgress = document.getElementById('aiGeocodingProgress');
        const aiProgressText = document.getElementById('aiProgressText');
        const aiProgressFill = document.getElementById('aiProgressFill');
        
        if (aiProgress && aiProgressText && aiProgressFill) {
            aiProgress.classList.add('active');
            aiProgressText.textContent = 'AI đang phân tích và tìm vị trí các tác giả...';
            aiProgressFill.style.width = '10%';
        }
    }

    // Hàm cập nhật tiến trình AI
    function updateAIGeocodingProgress(progress, text) {
        const aiProgress = document.getElementById('aiGeocodingProgress');
        const aiProgressText = document.getElementById('aiProgressText');
        const aiProgressFill = document.getElementById('aiProgressFill');
        
        if (aiProgress && aiProgressText && aiProgressFill) {
            aiProgressText.textContent = text;
            aiProgressFill.style.width = `${progress}%`;
        }
    }

    // Hàm ẩn tiến trình AI
    function hideAIGeocodingProgress() {
        const aiProgress = document.getElementById('aiGeocodingProgress');
        if (aiProgress) {
            setTimeout(() => {
                aiProgress.classList.remove('active');
            }, 1000);
        }
    }

    // Hàm tìm vị trí tác giả bằng AI - TỰ ĐỘNG PHÂN TÍCH
    async function findAuthorsLocationsWithAI() {
        if (isGeocodingInProgress) {
            alert('AI đang tìm kiếm vị trí, vui lòng đợi...');
            return;
        }
        
        isGeocodingInProgress = true;
        geocodedAuthors.clear();
        
        const authorsWithoutLocation = authors.filter(author => 
            !author.birthPlace || !author.birthPlace.lat || !author.birthPlace.lng
        );
        
        const authorsWithLocation = authors.filter(author => 
            author.birthPlace && author.birthPlace.lat && author.birthPlace.lng
        );
        
        console.log(`Tìm vị trí cho ${authorsWithoutLocation.length} tác giả không có tọa độ`);
        console.log(`Đã có ${authorsWithLocation.length} tác giả có tọa độ`);
        
        if (authorsWithoutLocation.length === 0) {
            updateAIGeocodingProgress(100, 'Tất cả tác giả đã có vị trí!');
            setTimeout(() => {
                hideAIGeocodingProgress();
                showSuccess('Tất cả tác giả đã có vị trí trên bản đồ!');
                displayAuthors();
            }, 1500);
            isGeocodingInProgress = false;
            return;
        }
        
        updateAIGeocodingProgress(20, 'Đang phân tích thông tin tác giả...');
        
        // Tạo danh sách tác giả Việt Nam ở Huế và miền Trung
        const vietnameseAuthors = authorsWithoutLocation.filter(author => 
            author.country && author.country.toLowerCase().includes('vietnam')
        );
        
        const otherAuthors = authorsWithoutLocation.filter(author => 
            !author.country || !author.country.toLowerCase().includes('vietnam')
        );
        
        console.log(`Có ${vietnameseAuthors.length} tác giả Việt Nam cần tìm vị trí`);
        
        // Ưu tiên tìm vị trí cho tác giả Việt Nam trước
        let processedCount = 0;
        const totalToProcess = Math.min(vietnameseAuthors.length + otherAuthors.length, 20); // Giới hạn để tránh quá tải
        
        // Xử lý tác giả Việt Nam (ưu tiên Huế và miền Trung)
        for (let i = 0; i < Math.min(vietnameseAuthors.length, 10); i++) {
            const author = vietnameseAuthors[i];
            processedCount++;
            
            const progress = Math.floor((processedCount / totalToProcess) * 100);
            updateAIGeocodingProgress(20 + progress * 0.6, `Đang tìm vị trí cho "${author.name}"...`);
            
            try {
                await findAuthorLocationWithAI(author);
                geocodedAuthors.add(author.id);
                
                // Cập nhật lên Firebase
                await updateAuthorLocationInFirebase(author.id, author.birthPlace);
                
                // Hiển thị ngay lên bản đồ
                addAuthorMarker(author);
                
                await delay(500); // Chờ 0.5 giây giữa các request
            } catch (error) {
                console.error(`Lỗi khi tìm vị trí cho ${author.name}:`, error);
            }
        }
        
        // Xử lý tác giả nước ngoài
        for (let i = 0; i < Math.min(otherAuthors.length, 10); i++) {
            const author = otherAuthors[i];
            processedCount++;
            
            const progress = Math.floor((processedCount / totalToProcess) * 100);
            updateAIGeocodingProgress(20 + progress * 0.6, `Đang tìm vị trí cho "${author.name}"...`);
            
            try {
                await findAuthorLocationWithAI(author);
                geocodedAuthors.add(author.id);
                
                // Cập nhật lên Firebase
                await updateAuthorLocationInFirebase(author.id, author.birthPlace);
                
                // Hiển thị ngay lên bản đồ
                addAuthorMarker(author);
                
                await delay(500); // Chờ 0.5 giây giữa các request
            } catch (error) {
                console.error(`Lỗi khi tìm vị trí cho ${author.name}:`, error);
            }
        }
        
        updateAIGeocodingProgress(100, 'Hoàn thành! Đang cập nhật bản đồ...');
        
        setTimeout(() => {
            hideAIGeocodingProgress();
            
            const newlyGeocoded = geocodedAuthors.size;
            const totalWithLocation = authors.filter(a => 
                a.birthPlace && a.birthPlace.lat && a.birthPlace.lng
            ).length;
            
            showSuccess(`AI đã tìm thấy vị trí cho ${newlyGeocoded} tác giả mới! Tổng cộng có ${totalWithLocation} tác giả hiển thị trên bản đồ.`);
            
            // Hiển thị tất cả các tác giả có vị trí
            displayAuthors();
            
            isGeocodingInProgress = false;
        }, 2000);
    }
    
    // Hàm trễ
    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Hàm tìm vị trí của một tác giả cụ thể bằng AI
    async function findAuthorLocationWithAI(author) {
        console.log(`Đang tìm vị trí cho tác giả: ${author.name}`);
        
        // Tạo prompt cho AI
        const prompt = `Tôi cần tìm tọa độ địa lý (vĩ độ, kinh độ) cho nhà văn/nhà thơ "${author.name}". 
        
        Thông tin về tác giả:
        - Tên: ${author.name}
        - Quốc gia: ${author.country || 'Chưa rõ'}
        - Thế kỷ: ${author.century || 'Chưa rõ'}
        - Tác phẩm: ${author.works ? author.works.slice(0, 3).join(', ') : 'Không có thông tin'}
        - Tiểu sử: ${author.bio ? author.bio.substring(0, 200) + '...' : 'Không có thông tin'}
        
        Hãy phân tích và cung cấp tọa độ địa lý (vĩ độ, kinh độ) phù hợp nhất cho nơi sinh hoặc nơi sống chính của tác giả này.
        
        QUAN TRỌNG: Trả lời CHỈ với tọa độ dạng số, ví dụ: "16.4637, 107.5909" (cho Huế, Việt Nam) hoặc "21.0285, 105.8542" (cho Hà Nội, Việt Nam).
        Nếu không thể xác định, hãy trả lời "Không xác định".
        
        Phân tích ngắn gọn:`;
        
        try {
            const apiKey = MAP_API_KEY;
            if (!apiKey) {
                throw new Error('Không tìm thấy API key');
            }
            
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }]
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.candidates && data.candidates[0].content.parts[0].text) {
                const aiResponse = data.candidates[0].content.parts[0].text.trim();
                console.log(`AI response for ${author.name}:`, aiResponse);
                
                // Phân tích phản hồi từ AI
                if (aiResponse.toLowerCase().includes('không xác định') || 
                    aiResponse.toLowerCase().includes('không tìm thấy') ||
                    aiResponse.toLowerCase().includes('unknown')) {
                    
                    // Nếu không xác định được, sử dụng vị trí mặc định dựa trên quốc gia
                    assignDefaultLocation(author);
                } else {
                    // Cố gắng trích xuất tọa độ từ phản hồi
                    const coordinates = extractCoordinatesFromText(aiResponse);
                    
                    if (coordinates) {
                        author.birthPlace = {
                            lat: coordinates.lat,
                            lng: coordinates.lng
                        };
                        console.log(`Đã tìm thấy tọa độ cho ${author.name}: ${coordinates.lat}, ${coordinates.lng}`);
                    } else {
                        // Nếu không trích xuất được, sử dụng vị trí mặc định
                        assignDefaultLocation(author);
                    }
                }
            } else {
                assignDefaultLocation(author);
            }
        } catch (error) {
            console.error(`Lỗi khi gọi AI cho ${author.name}:`, error);
            assignDefaultLocation(author);
        }
    }
    
    // Hàm trích xuất tọa độ từ văn bản
    function extractCoordinatesFromText(text) {
        // Tìm các mẫu tọa độ phổ biến
        const patterns = [
            /(-?\d+\.\d+)[,\s]+(-?\d+\.\d+)/, // 16.4637, 107.5909
            /lat[:\s]*(-?\d+\.\d+)[,\s]*lng[:\s]*(-?\d+\.\d+)/i, // lat: 16.4637, lng: 107.5909
            /latitude[:\s]*(-?\d+\.\d+)[,\s]*longitude[:\s]*(-?\d+\.\d+)/i // latitude: 16.4637, longitude: 107.5909
        ];
        
        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                const lat = parseFloat(match[1]);
                const lng = parseFloat(match[2]);
                
                // Kiểm tra tính hợp lệ của tọa độ
                if (!isNaN(lat) && !isNaN(lng) && 
                    lat >= -90 && lat <= 90 && 
                    lng >= -180 && lng <= 180) {
                    return { lat, lng };
                }
            }
        }
        
        return null;
    }
    
    // Hàm gán vị trí mặc định dựa trên quốc gia
    function assignDefaultLocation(author) {
        console.log(`Gán vị trí mặc định cho ${author.name}`);
        
        const country = author.country ? author.country.toLowerCase() : '';
        
        // Tọa độ mặc định cho các quốc gia phổ biến
        const defaultLocations = {
            'vietnam': { lat: 16.4637, lng: 107.5909 }, // Huế
            'việt nam': { lat: 16.4637, lng: 107.5909 }, // Huế
            'mỹ': { lat: 38.9072, lng: -77.0369 }, // Washington DC
            'united states': { lat: 38.9072, lng: -77.0369 }, // Washington DC
            'anh': { lat: 51.5074, lng: -0.1278 }, // London
            'united kingdom': { lat: 51.5074, lng: -0.1278 }, // London
            'pháp': { lat: 48.8566, lng: 2.3522 }, // Paris
            'france': { lat: 48.8566, lng: 2.3522 }, // Paris
            'đức': { lat: 52.5200, lng: 13.4050 }, // Berlin
            'germany': { lat: 52.5200, lng: 13.4050 }, // Berlin
            'nga': { lat: 55.7558, lng: 37.6173 }, // Moscow
            'russia': { lat: 55.7558, lng: 37.6173 }, // Moscow
            'trung quốc': { lat: 39.9042, lng: 116.4074 }, // Beijing
            'china': { lat: 39.9042, lng: 116.4074 }, // Beijing
            'nhật bản': { lat: 35.6762, lng: 139.6503 }, // Tokyo
            'japan': { lat: 35.6762, lng: 139.6503 } // Tokyo
        };
        
        // Tìm vị trí mặc định phù hợp
        for (const [key, location] of Object.entries(defaultLocations)) {
            if (country.includes(key)) {
                author.birthPlace = { lat: location.lat, lng: location.lng };
                console.log(`Gán vị trí mặc định ${key} cho ${author.name}`);
                return;
            }
        }
        
        // Nếu không tìm thấy, sử dụng vị trí trung tâm Việt Nam
        author.birthPlace = { lat: 16.4637, lng: 107.5909 }; // Huế
        console.log(`Gán vị trí Huế mặc định cho ${author.name}`);
    }
    
    // Hàm cập nhật vị trí tác giả lên Firebase
    async function updateAuthorLocationInFirebase(authorId, birthPlace) {
        try {
            await db.collection('authors').doc(authorId).update({
                birthPlace: birthPlace
            });
            console.log(`Đã cập nhật vị trí cho tác giả ${authorId} lên Firebase`);
        } catch (error) {
            console.error(`Lỗi khi cập nhật Firebase cho ${authorId}:`, error);
        }
    }

    // Hàm hiển thị tác giả trên bản đồ
    function displayAuthors() {
        markers.forEach(marker => {
            if (map && map.hasLayer(marker)) {
                map.removeLayer(marker);
            }
        });
        markers = [];
        
        const authorsWithLocation = authors.filter(author => 
            author.birthPlace && author.birthPlace.lat && author.birthPlace.lng
        );
        
        console.log(`Hiển thị ${authorsWithLocation.length} tác giả có vị trí trên bản đồ`);
        
        authorsWithLocation.forEach(author => {
            const marker = L.marker(author.birthPlace, { 
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
        });
        
        // Cập nhật thông tin sidebar
        const countryInfoContent = document.getElementById('countryInfoContent');
        if (countryInfoContent) {
            const authorsWithoutLocation = authors.filter(author => 
                !author.birthPlace || !author.birthPlace.lat || !author.birthPlace.lng
            ).length;
            
            countryInfoContent.innerHTML = `
                <div class="info-section">
                    <h3 style="margin: 0 0 15px 0; color: var(--primary-color);">
                        <i class="fas fa-globe-asia"></i> Bản đồ Văn học
                    </h3>
                    <p style="color: var(--text-secondary);">
                        Đã hiển thị ${authorsWithLocation.length} tác giả trên bản đồ.
                    </p>
                    
                    ${authorsWithoutLocation > 0 ? `
                        <div style="margin-top: 15px; padding: 15px; background-color: rgba(255, 193, 7, 0.1); border-radius: 8px;">
                            <p style="margin: 0; color: #856404;">
                                <i class="fas fa-exclamation-triangle"></i> 
                                <strong>Có ${authorsWithoutLocation} tác giả chưa có vị trí.</strong> 
                                Nhấn nút "AI tìm vị trí" để cải thiện.
                            </p>
                        </div>
                    ` : `
                        <div style="margin-top: 15px; padding: 15px; background-color: rgba(40, 167, 69, 0.1); border-radius: 8px;">
                            <p style="margin: 0; color: #28a745;">
                                <i class="fas fa-check-circle"></i> 
                                <strong>Hoàn thành!</strong> Tất cả tác giả đã có vị trí trên bản đồ.
                            </p>
                        </div>
                    `}
                    
                    <div style="margin-top: 15px; padding: 15px; background-color: rgba(227, 124, 45, 0.1); border-radius: 8px;">
                        <p style="margin: 0; color: var(--text-primary);">
                            <i class="fas fa-lightbulb"></i> <strong>Mẹo:</strong> 
                            Nhấp vào marker trên bản đồ để xem thông tin chi tiết về tác giả.
                        </p>
                    </div>
                </div>
            `;
        }
    }

    // Hàm thêm marker cho tác giả mới
    function addAuthorMarker(author) {
        if (author.birthPlace && author.birthPlace.lat && author.birthPlace.lng) {
            const marker = L.marker(author.birthPlace, { 
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
        return null;
    }

    // Hàm tạo popup content
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

    // Hàm hiển thị thông tin tác giả trong sidebar
    function showAuthorInfo(author) {
        const countryInfoContent = document.getElementById('countryInfoContent');
        
        if (!countryInfoContent) {
            console.error('Không tìm thấy countryInfoContent');
            return;
        }
        
        const locationSource = geocodedAuthors.has(author.id) ? 
            '<span style="color: #28a745; font-size: 0.8rem;"><i class="fas fa-robot"></i> Vị trí được xác định bởi AI</span>' :
            '<span style="color: #6c757d; font-size: 0.8rem;"><i class="fas fa-database"></i> Vị trí từ cơ sở dữ liệu</span>';
        
        countryInfoContent.innerHTML = `
            <div class="info-section">
                <h3 style="margin: 0 0 15px 0; color: var(--primary-color); display: flex; align-items: center; gap: 10px;">
                    <i class="fas fa-user-circle"></i> ${author.name}
                </h3>
                
                ${locationSource}
                
                ${author.image ? `
                    <img src="${author.image}" alt="${author.name}" 
                         style="width: 100%; max-height: 200px; object-fit: cover; border-radius: 8px; margin-bottom: 15px;">
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
                    <div style="margin-top: 15px; padding: 10px; background-color: rgba(66, 133, 244, 0.1); border-radius: 8px;">
                        <p style="margin: 0 0 5px 0; color: #4285F4; font-weight: 600;">
                            <i class="fas fa-map-marker-alt"></i> Vị trí trên bản đồ
                        </p>
                        <p style="margin: 0; font-size: 0.9rem; color: var(--text-secondary);">
                            Vĩ độ: ${author.birthPlace.lat.toFixed(4)}<br>
                            Kinh độ: ${author.birthPlace.lng.toFixed(4)}
                        </p>
                    </div>
                    
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

    // Hàm zoom đến vị trí tác giả
    function zoomToAuthorLocation(lat, lng) {
        if (map) {
            map.flyTo([lat, lng], 10, {
                duration: 1,
                easeLinearity: 0.25
            });
        }
    }

    // Hàm highlight marker
    function highlightMarker(marker) {
        markers.forEach(m => m.setIcon(defaultIcon));
        marker.setIcon(highlightIcon);
        currentAuthorMarker = marker;
        marker.openPopup();
    }

    // Hàm tìm kiếm tác giả
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
                    <button onclick="findAuthorsLocationsWithAI()" class="control-btn" style="margin-top: 10px;">
                        <i class="fas fa-robot"></i> Dùng AI tìm tác giả mới
                    </button>
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
                            ${author.birthPlace && author.birthPlace.lat ? 
                                '<span style="font-size: 0.8rem; color: #28a745;"><i class="fas fa-map-marker-alt"></i></span>' : 
                                '<span style="font-size: 0.8rem; color: #dc3545;"><i class="fas fa-map-marker-alt"></i> Chưa có vị trí</span>'}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    // Hàm toggle chế độ kết nối
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

    // Hàm chọn tác giả cho kết nối
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

    // Hàm highlight marker cho chế độ kết nối
    function highlightMarkerForConnection(author, color) {
        const marker = markers.find(m => {
            const latLng = m.getLatLng();
            return latLng.lat === author.birthPlace.lat && latLng.lng === author.birthPlace.lng;
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

    // Hàm vẽ đường kết nối
    function drawConnectionLine(author1, author2) {
        if (connectionLine && map.hasLayer(connectionLine)) {
            map.removeLayer(connectionLine);
        }
        
        const latLngs = [
            [author1.birthPlace.lat, author1.birthPlace.lng],
            [author2.birthPlace.lat, author2.birthPlace.lng]
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

    // Hàm reset selection kết nối
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

    // Hàm kiểm tra kết nối giữa 2 tác giả
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
            const apiKey = MAP_API_KEY;
            if (!apiKey) {
                throw new Error('Không tìm thấy API key');
            }
            
            const prompt = `Phân tích mối liên hệ giữa hai nhà văn ${selectedAuthor1.name} và ${selectedAuthor2.name}. 
            Hãy so sánh về: thời đại sống, phong cách sáng tác, chủ đề chính trong tác phẩm, và ảnh hưởng của họ đến văn học. 
            Trả lời bằng tiếng Việt, khoảng 150-200 từ.`;
            
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }]
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.candidates && data.candidates[0].content.parts[0].text) {
                const connectionText = data.candidates[0].content.parts[0].text;
                connectionResult.innerHTML = `
                    <h4 style="margin: 0 0 10px 0; color: var(--primary-color);">
                        <i class="fas fa-link"></i> Mối liên hệ giữa ${selectedAuthor1.name} và ${selectedAuthor2.name}
                    </h4>
                    <div style="line-height: 1.6; font-size: 0.95rem;">
                        ${connectionText}
                    </div>
                `;
            } else {
                connectionResult.innerHTML = `
                    <p style="color: var(--text-secondary); text-align: center;">
                        Không tìm thấy thông tin liên hệ trực tiếp giữa hai tác giả này.
                    </p>
                `;
            }
        } catch (error) {
            console.error('Lỗi khi kiểm tra kết nối:', error);
            connectionResult.innerHTML = `
                <p style="color: #ef4444; text-align: center;">
                    Đã xảy ra lỗi khi phân tích. Vui lòng thử lại sau.
                </p>
            `;
        }
    }

    // Hàm lọc theo thế kỷ
    function filterByCentury(selectedValue) {
        let centuryText = "Tất cả thế kỷ";
        
        if (selectedValue === 0) {
            centuryText = "Trước thế kỷ 17";
        } else if (selectedValue >= 1 && selectedValue <= 4) {
            const targetCentury = selectedValue + 16;
            centuryText = `Thế kỷ ${targetCentury}`;
        }
        
        const centuryValueElement = document.getElementById('centuryValue');
        if (centuryValueElement) {
            centuryValueElement.textContent = centuryText;
        }
        
        markers.forEach(marker => {
            const author = authors.find(a => {
                const latLng = marker.getLatLng();
                return a.birthPlace && a.birthPlace.lat === latLng.lat && a.birthPlace.lng === latLng.lng;
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
                    marker.removeFrom(map);
                }
            }
        });
    }

    // Hàm thiết lập event listeners
    function setupMapEventListeners() {
        console.log('Đang thiết lập event listeners...');
        
        const sidebarToggleBtn = document.getElementById('mapSidebarToggleBtn');
        const mapSidebar = document.getElementById('mapSidebar');
        
        if (!sidebarToggleBtn || !mapSidebar) {
            console.error('Không tìm thấy các element sidebar');
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
            if (isSidebarVisible) {
                sidebarToggleBtn.style.left = '350px';
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

        const applyAdvancedSearch = document.getElementById('applyAdvancedSearch');
        const clearAdvancedSearch = document.getElementById('clearAdvancedSearch');
        
        if (applyAdvancedSearch) {
            applyAdvancedSearch.addEventListener('click', applyAdvancedSearchFilter);
        }
        
        if (clearAdvancedSearch) {
            clearAdvancedSearch.addEventListener('click', clearAdvancedSearchFilter);
        }

        const toggleConnectionBtn = document.getElementById('toggleConnectionModeBtn');
        const checkConnectionBtn = document.getElementById('checkConnectionBtn');
        
        if (toggleConnectionBtn) {
            toggleConnectionBtn.addEventListener('click', toggleConnectionMode);
        }
        
        if (checkConnectionBtn) {
            checkConnectionBtn.addEventListener('click', checkConnection);
        }

        const centurySlider = document.getElementById('centurySlider');
        if (centurySlider) {
            centurySlider.addEventListener('input', (e) => {
                filterByCentury(parseInt(e.target.value));
            });
        }

        const toggleLocationBtn = document.getElementById('toggleLocationBtn');
        const findNearbyBtn = document.getElementById('findNearbyBtn');
        const refreshLocationsBtn = document.getElementById('refreshLocationsBtn');
        
        if (toggleLocationBtn) {
            toggleLocationBtn.addEventListener('click', toggleUserLocation);
        }
        
        if (findNearbyBtn) {
            findNearbyBtn.addEventListener('click', findAndShowNearbyAuthors);
        }
        
        if (refreshLocationsBtn) {
            refreshLocationsBtn.addEventListener('click', findAuthorsLocationsWithAI);
        }
        
        console.log('Event listeners đã được thiết lập');
    }

    // Hàm xử lý tìm kiếm với suggestions
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
            await searchAuthorFromWikipedia(searchTerm);
        });
        suggestions.appendChild(wikiDiv);
        
        suggestions.style.display = 'block';
    }

    // Hàm tìm kiếm tác giả từ Wikipedia
    async function searchAuthorFromWikipedia(authorName) {
        const countryInfoContent = document.getElementById('countryInfoContent');
        
        if (!countryInfoContent) return;
        
        countryInfoContent.innerHTML = `
            <div class="firebase-loading">
                <span class="loading-spinner"></span>
                <p>Đang tìm kiếm thông tin trên Wikipedia...</p>
            </div>
        `;
        
        try {
            const searchUrl = `https://vi.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(authorName)}&format=json&origin=*`;
            const searchResponse = await fetch(searchUrl);
            const searchData = await searchResponse.json();
            
            if (searchData.query.search.length === 0) {
                throw new Error('Không tìm thấy thông tin trên Wikipedia');
            }
            
            const pageTitle = searchData.query.search[0].title;
            
            const newAuthor = {
                id: 'wiki_' + Date.now(),
                name: pageTitle,
                bio: `Thông tin từ Wikipedia về ${pageTitle}. Đang cập nhật đầy đủ...`,
                works: [],
                country: "Vietnam",
                century: 20,
                image: null,
                connections: []
            };
            
            // Thêm vào danh sách và tìm vị trí bằng AI
            authors.push(newAuthor);
            
            // Hiển thị thông tin và bắt đầu tìm vị trí
            showAuthorInfo(newAuthor);
            
            // Tìm vị trí bằng AI
            await findAuthorLocationWithAI(newAuthor);
            
            // Hiển thị marker nếu có vị trí
            if (newAuthor.birthPlace && newAuthor.birthPlace.lat && newAuthor.birthPlace.lng) {
                addAuthorMarker(newAuthor);
                geocodedAuthors.add(newAuthor.id);
            }
            
        } catch (error) {
            console.error('Lỗi khi tìm kiếm Wikipedia:', error);
            countryInfoContent.innerHTML = `
                <div class="info-section">
                    <h3 style="color: #ef4444;">Lỗi tìm kiếm</h3>
                    <p>Không thể tìm thấy thông tin cho "${authorName}" trên Wikipedia.</p>
                    <p>Vui lòng thử lại với tên khác hoặc kiểm tra kết nối internet.</p>
                </div>
            `;
        }
    }

    // Hàm áp dụng tìm kiếm nâng cao
    function applyAdvancedSearchFilter() {
        const country = document.getElementById('searchCountry').value;
        const century = document.getElementById('searchCentury').value;
        const genre = document.getElementById('searchGenre').value.toLowerCase();
        
        const filteredAuthors = authors.filter(author => {
            let match = true;
            
            if (country && author.country !== country) {
                match = false;
            }
            
            if (century && author.century !== parseInt(century)) {
                match = false;
            }
            
            if (genre && author.works) {
                const hasGenre = author.works.some(work => 
                    work.toLowerCase().includes(genre)
                );
                if (!hasGenre) {
                    match = false;
                }
            }
            
            return match;
        });
        
        displaySearchResults(filteredAuthors);
    }

    // Hàm xóa tìm kiếm nâng cao
    function clearAdvancedSearchFilter() {
        document.getElementById('searchCountry').value = '';
        document.getElementById('searchCentury').value = '';
        document.getElementById('searchGenre').value = '';
        
        const advancedSearchPanel = document.getElementById('advancedSearchPanel');
        const advancedSearchBtn = document.getElementById('advancedSearchBtn');
        if (advancedSearchPanel && advancedSearchBtn) {
            advancedSearchPanel.classList.remove('active');
            advancedSearchBtn.innerHTML = '<i class="fas fa-sliders-h"></i>';
        }
        
        const countryInfoContent = document.getElementById('countryInfoContent');
        if (countryInfoContent) {
            countryInfoContent.innerHTML = `
                <div class="info-section">
                    <h3 style="margin: 0 0 15px 0; color: var(--primary-color);">
                        <i class="fas fa-globe-asia"></i> Bản đồ Văn học
                    </h3>
                    <p style="color: var(--text-secondary);">
                        Nhấp vào một quốc gia trên bản đồ để xem thông tin văn học và các tác giả nổi bật.
                    </p>
                </div>
            `;
        }
        
        markers.forEach(marker => {
            if (!map.hasLayer(marker)) {
                marker.addTo(map);
            }
        });
        
        const centurySlider = document.getElementById('centurySlider');
        const centuryValue = document.getElementById('centuryValue');
        if (centurySlider && centuryValue) {
            centurySlider.value = 5;
            centuryValue.textContent = "Tất cả thế kỷ";
        }
        
        const toggleConnectionBtn = document.getElementById('toggleConnectionModeBtn');
        const connectionModePanel = document.getElementById('connectionModePanel');
        if (toggleConnectionBtn && connectionModePanel) {
            toggleConnectionBtn.classList.remove('active');
            connectionModePanel.style.display = 'none';
            isConnectionMode = false;
            resetConnectionSelection();
        }
    }

    // Hàm hiển thị kết quả tìm kiếm
    function displaySearchResults(filteredAuthors) {
        const countryInfoContent = document.getElementById('countryInfoContent');
        
        if (!countryInfoContent) return;
        
        if (filteredAuthors.length === 0) {
            countryInfoContent.innerHTML = `
                <div class="info-section">
                    <h3 style="color: var(--text-secondary);">Không tìm thấy tác giả</h3>
                    <p>Không tìm thấy tác giả nào phù hợp với tiêu chí tìm kiếm.</p>
                    <button onclick="findAuthorsLocationsWithAI()" class="control-btn" style="margin-top: 10px;">
                        <i class="fas fa-robot"></i> Dùng AI tìm tác giả mới
                    </button>
                </div>
            `;
            
            markers.forEach(marker => {
                if (map.hasLayer(marker)) {
                    marker.removeFrom(map);
                }
            });
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
                                <small style="color: var(--text-secondary);">${author.country} • Thế kỷ ${author.century}</small>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        markers.forEach(marker => {
            if (map.hasLayer(marker)) {
                marker.removeFrom(map);
            }
        });
        
        filteredAuthors.forEach(author => {
            const marker = markers.find(m => {
                const latLng = m.getLatLng();
                return author.birthPlace && 
                       author.birthPlace.lat === latLng.lat && 
                       author.birthPlace.lng === latLng.lng;
            });
            
            if (marker) {
                marker.addTo(map);
            }
        });
    }

    // Hàm tính khoảng cách - SỬA: hàm Haversine chính xác
    function calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Bán kính Trái đất tính bằng km
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }
    
    function toRad(degrees) {
        return degrees * (Math.PI / 180);
    }

    // Hàm tìm tác giả trong bán kính 100km - SỬA: xử lý tọa độ đúng cách
    function findAuthorsNearby(userLat, userLng) {
        const nearbyAuthors = [];
        
        authors.forEach(author => {
            if (author.birthPlace && author.birthPlace.lat && author.birthPlace.lng) {
                const distance = calculateDistance(
                    userLat, userLng, 
                    author.birthPlace.lat, author.birthPlace.lng
                );
                
                console.log(`Khoảng cách từ bạn đến ${author.name}: ${distance.toFixed(1)}km`);
                
                if (distance <= 100) {
                    nearbyAuthors.push({
                        author: author,
                        distance: distance.toFixed(1)
                    });
                }
            }
        });
        
        nearbyAuthors.sort((a, b) => a.distance - b.distance);
        
        return nearbyAuthors;
    }

    // Icon cho vị trí người dùng
    const userLocationIcon = L.divIcon({
        className: 'user-location-marker',
        html: `
            <div style="position: relative;">
                <svg width="24" height="24" viewBox="0 0 24 24" style="position: absolute; top: -12px; left: -12px;">
                    <circle cx="12" cy="12" r="10" fill="#4285F4" opacity="0.2"/>
                    <circle cx="12" cy="12" r="6" fill="#4285F4"/>
                    <circle cx="12" cy="12" r="2" fill="#FFFFFF"/>
                </svg>
                <div style="width: 16px; height: 16px; border-radius: 50%; background-color: #4285F4; border: 2px solid white; box-shadow: 0 0 0 3px rgba(66, 133, 244, 0.3);"></div>
            </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });

    // Hàm hiển thị vị trí người dùng - SỬA: thêm xử lý lỗi
    function showUserLocation() {
        if (navigator.geolocation) {
            console.log('Đang lấy vị trí người dùng...');
            navigator.geolocation.getCurrentPosition(
                function(position) {
                    const userLatLng = [position.coords.latitude, position.coords.longitude];
                    console.log('Vị trí người dùng:', userLatLng);
                    
                    if (userLocationMarker) {
                        map.removeLayer(userLocationMarker);
                    }
                    
                    userLocationMarker = L.marker(userLatLng, {
                        icon: userLocationIcon,
                        zIndexOffset: 1000
                    }).addTo(map);
                    
                    const accuracy = position.coords.accuracy;
                    userLocationMarker.bindPopup(`
                        <div style="text-align: center; min-width: 200px;">
                            <h3 style="margin: 5px 0; color: #4285F4;">Vị trí của bạn</h3>
                            <p style="margin: 5px 0;"><strong>Vĩ độ:</strong> ${userLatLng[0].toFixed(6)}</p>
                            <p style="margin: 5px 0;"><strong>Kinh độ:</strong> ${userLatLng[1].toFixed(6)}</p>
                            <p style="margin: 5px 0;"><strong>Độ chính xác:</strong> ~${Math.round(accuracy)} mét</p>
                            <small style="color: #666;">Cập nhật: ${new Date().toLocaleTimeString()}</small>
                        </div>
                    `).openPopup();
                    
                    const zoomLevel = accuracy < 100 ? 16 : accuracy < 500 ? 14 : 12;
                    map.flyTo(userLatLng, zoomLevel);
                    
                    const toggleLocationBtn = document.getElementById('toggleLocationBtn');
                    if (toggleLocationBtn) {
                        toggleLocationBtn.classList.add('active');
                        toggleLocationBtn.innerHTML = '<i class="fas fa-location-crosshairs"></i> Ẩn vị trí';
                    }
                    
                    setTimeout(() => {
                        if (userLocationMarker) {
                            userLocationMarker.closePopup();
                        }
                    }, 5000);
                    
                    startTracking();
                },
                function(error) {
                    let errorMessage = "Không thể lấy vị trí của bạn";
                    switch(error.code) {
                        case error.PERMISSION_DENIED:
                            errorMessage = "Bạn đã từ chối yêu cầu định vị. Vui lòng cấp quyền truy cập vị trí.";
                            break;
                        case error.POSITION_UNAVAILABLE:
                            errorMessage = "Thông tin vị trí không khả dụng";
                            break;
                        case error.TIMEOUT:
                            errorMessage = "Yêu cầu định vị đã hết thời gian";
                            break;
                    }
                    
                    // Hiển thị thông báo lỗi chi tiết
                    const countryInfoContent = document.getElementById('countryInfoContent');
                    if (countryInfoContent) {
                        countryInfoContent.innerHTML = `
                            <div class="info-section">
                                <h3 style="color: #ef4444;">Lỗi định vị</h3>
                                <p>${errorMessage}</p>
                                <p>Vui lòng kiểm tra:</p>
                                <ul>
                                    <li>Trình duyệt có quyền truy cập vị trí</li>
                                    <li>GPS/định vị đã được bật</li>
                                    <li>Kết nối internet ổn định</li>
                                </ul>
                            </div>
                        `;
                    }
                },
                {
                    enableHighAccuracy: true,
                    timeout: 15000, // Tăng thời gian timeout
                    maximumAge: 0
                }
            );
        } else {
            alert("Trình duyệt của bạn không hỗ trợ định vị GPS");
        }
    }

    // Hàm ẩn vị trí người dùng
    function hideUserLocation() {
        if (userLocationMarker) {
            map.removeLayer(userLocationMarker);
            userLocationMarker = null;
        }
        const toggleLocationBtn = document.getElementById('toggleLocationBtn');
        if (toggleLocationBtn) {
            toggleLocationBtn.classList.remove('active');
            toggleLocationBtn.innerHTML = '<i class="fas fa-location-crosshairs"></i> Vị trí của tôi';
        }
        stopTracking();
    }

    // Hàm toggle vị trí người dùng
    function toggleUserLocation() {
        if (userLocationMarker) {
            hideUserLocation();
        } else {
            showUserLocation();
        }
    }

    // Bắt đầu theo dõi vị trí
    function startTracking() {
        if (navigator.geolocation) {
            watchId = navigator.geolocation.watchPosition(
                function(position) {
                    const userLatLng = [position.coords.latitude, position.coords.longitude];
                    if (userLocationMarker) {
                        userLocationMarker.setLatLng(userLatLng);
                        userLocationMarker.getPopup().setContent(`
                            <div style="text-align: center; min-width: 200px;">
                                <h3 style="margin: 5px 0; color: #4285F4;">Vị trí của bạn</h3>
                                <p style="margin: 5px 0;"><strong>Vĩ độ:</strong> ${userLatLng[0].toFixed(6)}</p>
                                <p style="margin: 5px 0;"><strong>Kinh độ:</strong> ${userLatLng[1].toFixed(6)}</p>
                                <p style="margin: 5px 0;"><strong>Độ chính xác:</strong> ~${Math.round(position.coords.accuracy)} mét</p>
                                <small style="color: #666;">Cập nhật: ${new Date().toLocaleTimeString()}</small>
                            </div>
                        `);
                    }
                },
                function(error) {
                    console.error("Lỗi theo dõi vị trí:", error);
                },
                {
                    enableHighAccuracy: true,
                    maximumAge: 30000
                }
            );
        }
    }

    // Dừng theo dõi vị trí
    function stopTracking() {
        if (watchId) {
            navigator.geolocation.clearWatch(watchId);
            watchId = null;
        }
    }

    // Hàm tìm và hiển thị tác giả gần - SỬA: xử lý đầy đủ
    function findAndShowNearbyAuthors() {
        if (!userLocationMarker) {
            const notification = document.createElement('div');
            notification.innerHTML = `
                <div style="padding: 10px; background-color: #fff3cd; border-left: 4px solid #ffc107; margin-bottom: 15px; border-radius: 6px;">
                    <p style="margin: 0; color: #856404;">
                        <i class="fas fa-exclamation-triangle"></i> Vui lòng bật "Vị trí của tôi" trước khi tìm kiếm tác giả gần bạn!
                    </p>
                </div>
            `;
            
            const countryInfoContent = document.getElementById('countryInfoContent');
            if (countryInfoContent) {
                countryInfoContent.insertBefore(notification, countryInfoContent.firstChild);
                
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.remove();
                    }
                }, 3000);
            }
            
            // Tự động bật vị trí
            setTimeout(() => {
                showUserLocation();
            }, 1000);
            return;
        }
        
        const userLatLng = userLocationMarker.getLatLng();
        console.log('Tìm tác giả gần vị trí:', userLatLng);
        
        const nearbyAuthors = findAuthorsNearby(userLatLng.lat, userLatLng.lng);
        console.log('Tìm thấy', nearbyAuthors.length, 'tác giả gần đó');
        
        showNearbyAuthors(nearbyAuthors);
        
        // Zoom đến khu vực xung quanh
        map.flyTo(userLatLng, 10);
    }

    // Hàm hiển thị tác giả gần - SỬA: cải thiện giao diện
    function showNearbyAuthors(nearbyAuthors) {
        const countryInfoContent = document.getElementById('countryInfoContent');
        
        if (!countryInfoContent) return;
        
        let nearbyHTML = '';
        
        if (nearbyAuthors.length > 0) {
            nearbyHTML = `
                <div class="info-section">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                        <h3 style="margin: 0; color: var(--primary-color);">
                            <i class="fas fa-search-location"></i> Tác giả gần bạn (${nearbyAuthors.length})
                        </h3>
                        <span class="close-nearby" onclick="closeNearbyAuthors()">×</span>
                    </div>
                    <p style="color: var(--text-secondary); margin-bottom: 15px; font-size: 0.9rem;">
                        <i class="fas fa-info-circle"></i> Tìm thấy ${nearbyAuthors.length} tác giả trong bán kính 100km
                    </p>
                    <div style="max-height: 400px; overflow-y: auto;">
                        ${nearbyAuthors.map(item => `
                            <div class="nearby-author" onclick="window.mapPopupShowAuthorInfo('${item.author.id}')">
                                <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                                    <div>
                                        <strong>${item.author.name}</strong>
                                        ${item.author.country ? `<div style="font-size: 0.8rem; color: var(--text-secondary);">${item.author.country}</div>` : ''}
                                    </div>
                                    <span class="distance-badge">${item.distance} km</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    <div style="margin-top: 15px; padding: 10px; background-color: rgba(40, 167, 69, 0.1); border-radius: 6px;">
                        <p style="margin: 0; font-size: 0.9rem; color: #28a745;">
                            <i class="fas fa-robot"></i> <strong>Mẹo:</strong> Nếu không thấy tác giả bạn tìm, hãy dùng nút "AI tìm vị trí" để cải thiện độ chính xác.
                        </p>
                    </div>
                </div>
            `;
        } else {
            nearbyHTML = `
                <div class="info-section">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                        <h3 style="margin: 0; color: var(--primary-color);">
                            <i class="fas fa-search-location"></i> Tác giả gần bạn
                        </h3>
                        <span class="close-nearby" onclick="closeNearbyAuthors()">×</span>
                    </div>
                    <div style="text-align: center; padding: 40px 20px;">
                        <i class="fas fa-map-marker-alt" style="font-size: 3rem; color: #ccc; margin-bottom: 15px;"></i>
                        <p style="color: var(--text-secondary); margin-bottom: 10px;">
                            Không tìm thấy tác giả nào trong bán kính 100km.
                        </p>
                        <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 20px;">
                            Có thể các tác giả chưa có vị trí chính xác. Hãy thử:
                        </p>
                        <div style="display: flex; flex-direction: column; gap: 10px;">
                            <button onclick="findAuthorsLocationsWithAI()" class="control-btn">
                                <i class="fas fa-robot"></i> Dùng AI tìm vị trí tác giả
                            </button>
                            <button onclick="findAndShowNearbyAuthors()" class="control-btn secondary">
                                <i class="fas fa-redo"></i> Thử lại tìm kiếm
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }
        
        countryInfoContent.innerHTML = nearbyHTML;
    }

    // Hàm đóng danh sách tác giả gần
    window.closeNearbyAuthors = function() {
        const countryInfoContent = document.getElementById('countryInfoContent');
        if (countryInfoContent) {
            const authorsWithLocation = authors.filter(author => 
                author.birthPlace && author.birthPlace.lat && author.birthPlace.lng
            ).length;
            
            const authorsWithoutLocation = authors.filter(author => 
                !author.birthPlace || !author.birthPlace.lat || !author.birthPlace.lng
            ).length;
            
            countryInfoContent.innerHTML = `
                <div class="info-section">
                    <h3 style="margin: 0 0 15px 0; color: var(--primary-color);">
                        <i class="fas fa-globe-asia"></i> Bản đồ Văn học
                    </h3>
                    <p style="color: var(--text-secondary);">
                        Đã hiển thị ${authorsWithLocation} tác giả trên bản đồ.
                    </p>
                    
                    ${authorsWithoutLocation > 0 ? `
                        <div style="margin-top: 15px; padding: 15px; background-color: rgba(255, 193, 7, 0.1); border-radius: 8px;">
                            <p style="margin: 0; color: #856404;">
                                <i class="fas fa-exclamation-triangle"></i> 
                                <strong>Có ${authorsWithoutLocation} tác giả chưa có vị trí.</strong> 
                                Nhấn nút "AI tìm vị trí" để cải thiện.
                            </p>
                        </div>
                    ` : `
                        <div style="margin-top: 15px; padding: 15px; background-color: rgba(40, 167, 69, 0.1); border-radius: 8px;">
                            <p style="margin: 0; color: #28a745;">
                                <i class="fas fa-check-circle"></i> 
                                <strong>Hoàn thành!</strong> Tất cả tác giả đã có vị trí trên bản đồ.
                            </p>
                        </div>
                    `}
                    
                    <div style="margin-top: 15px; padding: 15px; background-color: rgba(227, 124, 45, 0.1); border-radius: 8px;">
                        <p style="margin: 0; color: var(--text-primary);">
                            <i class="fas fa-lightbulb"></i> <strong>Mẹo:</strong> 
                            Nhấp vào marker trên bản đồ để xem thông tin chi tiết về tác giả.
                        </p>
                    </div>
                </div>
            `;
        }
    };

    // Hàm lấy API key Gemini
    function getGeminiApiKey() {
        try {
            return MAP_API_KEY;
        } catch (error) {
            console.error('Lỗi khi lấy API key:', error);
            return null;
        }
    }

    // Xuất hàm ra global scope để gọi từ popup
    window.mapPopupShowAuthorInfo = function(authorId) {
        const author = authors.find(a => a.id === authorId);
        if (author) {
            showAuthorInfo(author);
            
            if (author.birthPlace && author.birthPlace.lat && author.birthPlace.lng) {
                zoomToAuthorLocation(author.birthPlace.lat, author.birthPlace.lng);
                
                const marker = markers.find(m => {
                    const latLng = m.getLatLng();
                    return latLng.lat === author.birthPlace.lat && latLng.lng === author.birthPlace.lng;
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

    window.zoomToAuthorLocation = zoomToAuthorLocation;

    // Khởi tạo popup bản đồ khi mở
    const originalOpenPopup = window.openPopup;
    if (originalOpenPopup) {
        window.openPopup = function(menuId) {
            originalOpenPopup(menuId);
            if (menuId === 'mapMenu') {
                setTimeout(initMapPopup, 300);
            }
        };
    }

    // Khởi tạo ngay nếu popup đã mở
    if (document.getElementById('popupTitle') && document.getElementById('popupTitle').textContent === 'Bản đồ văn học') {
        console.log('Popup bản đồ đã mở, đang khởi tạo...');
        setTimeout(initMapPopup, 500);
    }

    // Xuất hàm initMapPopup để gọi từ script.js
    window.initMapPopup = initMapPopup;
    
    console.log('Map popup script đã được tải và sẵn sàng với AI tìm vị trí');
});
