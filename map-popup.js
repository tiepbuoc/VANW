// JavaScript cho popup bản đồ văn học - ĐÃ SỬA LỖI TÌM TÁC GIẢ GẦN VÀ THÊM CHỨC NĂNG BÁN KÍNH
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
    
    // THÊM: Biến lưu bán kính tìm kiếm (mặc định 100km)
    let searchRadius = 100; // km
    
    // API Key cho bản đồ
    const MAP_REVERSED_API_KEY = "YMZZKI_mV0OHMDxiWE65_LsII1E242PuDySazIA";
    const MAP_API_KEY = MAP_REVERSED_API_KEY.split('').reverse().join('');

    // Hàm khởi tạo bản đồ trong popup
    function initMapPopup() {
        const popupContent = document.getElementById('popupContent');
        const popupTitle = document.getElementById('popupTitle');
        
        if (!popupContent || !popupTitle) {
            console.error('Không tìm thấy popupContent hoặc popupTitle');
            return;
        }
        
        if (popupTitle.textContent === 'Bản đồ văn học') {
            console.log('Khởi tạo bản đồ văn học...');
            
            // Tạo nội dung cho popup với phần bán kính tìm kiếm mới
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
                                        
                                        <!-- THÊM: Phần bán kính tìm kiếm -->
                                        <div class="radius-container" id="radiusContainer">
                                            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                                                <h4 style="margin: 0; color: var(--primary-color);">
                                                    <i class="fas fa-ruler-combined"></i> Bán kính tìm kiếm
                                                </h4>
                                                <span id="currentRadiusValue" style="font-weight: 600; color: var(--accent-color);">100 km</span>
                                            </div>
                                            
                                            <div class="radius-control">
                                                <span class="radius-value" id="minRadius">10 km</span>
                                                <input type="range" id="radiusSlider" class="radius-slider" min="10" max="1000" value="100" step="10">
                                                <span class="radius-value" id="maxRadius">1000 km</span>
                                            </div>
                                            
                                            <div class="radius-input-container">
                                                <input type="number" id="radiusInput" class="radius-input" 
                                                       placeholder="Nhập số km" min="10" max="1000" value="100">
                                                <button id="applyRadiusBtn" class="apply-radius-btn">
                                                    <i class="fas fa-check"></i> Áp dụng
                                                </button>
                                            </div>
                                            
                                            <div style="margin-top: 10px; font-size: 0.8rem; color: var(--text-secondary);">
                                                <i class="fas fa-info-circle"></i> Nhập số km (10-1000km) để tìm tác giả trong bán kính
                                            </div>
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
                                                
                                                <div class="advanced-field">
                                                    <label for="centurySlider" class="info-label">
                                                        <i class="fas fa-history"></i> Lọc theo thế kỷ:
                                                        <span id="centuryValue" class="info-value" style="font-weight: normal;">Tất cả thế kỷ</span>
                                                    </label>
                                                    <input type="range" id="centurySlider" class="slider" min="0" max="5" value="5">
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
                                                
                                                <!-- CẬP NHẬT: Nút tìm kiếm hiển thị bán kính hiện tại -->
                                                <div class="location-controls">
                                                    <button id="toggleLocationBtn" class="control-btn secondary">
                                                        <i class="fas fa-location-crosshairs"></i> Vị trí của tôi
                                                    </button>
                                                    <button id="findNearbyBtn" class="control-btn" style="background-color: #4CAF50;">
                                                        <i class="fas fa-search-location"></i> Tìm gần tôi (<span id="radiusDisplay">100</span>km)
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
                                <div id="map"></div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            setTimeout(() => {
                try {
                    initLeafletMap();
                    setupMapEventListeners();
                    loadData();
                    loadCountryGeoData();
                    console.log('Bản đồ đã được khởi tạo thành công');
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

    // Hàm tải dữ liệu từ Firestore - SỬA: Kiểm tra tọa độ Huế
    async function loadData() {
        try {
            const countryInfoContent = document.getElementById('countryInfoContent');
            
            console.log('Đang tải dữ liệu từ Firestore...');
            
            const authorsSnapshot = await db.collection('authors').get();
            authors = [];
            authorsSnapshot.forEach(doc => {
                const authorData = doc.data();
                authors.push({
                    id: doc.id,
                    ...authorData
                });
            });
            
            console.log('Tổng số tác giả:', authors.length);
            
            // Kiểm tra các tác giả ở Huế
            const hueAuthors = authors.filter(author => {
                if (!author.birthPlace || !author.birthPlace.lat || !author.birthPlace.lng) {
                    return false;
                }
                // Huế có tọa độ khoảng: 16.4637° N, 107.5909° E
                const distance = calculateDistance(16.4637, 107.5909, author.birthPlace.lat, author.birthPlace.lng);
                console.log(`${author.name}: ${distance.toFixed(1)}km từ Huế`);
                return distance < 50; // Trong vòng 50km từ Huế
            });
            
            console.log('Tác giả gần Huế:', hueAuthors.length);
            if (hueAuthors.length > 0) {
                console.log('Danh sách tác giả gần Huế:');
                hueAuthors.forEach(author => {
                    console.log(`- ${author.name}: ${author.birthPlace.lat}, ${author.birthPlace.lng}`);
                });
            }
            
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
                                <i class="fas fa-lightbulb"></i> <strong>Mẹo:</strong> Bạn có thể thay đổi bán kính tìm kiếm (10-1000km) để tìm tác giả gần vị trí của bạn.
                            </p>
                        </div>
                    </div>
                `;
            }
            
            displayAuthors();
            
        } catch (error) {
            console.error('Lỗi tải dữ liệu:', error);
            showError('Không thể kết nối với cơ sở dữ liệu. Vui lòng kiểm tra kết nối internet.');
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
        
        authors.forEach(author => {
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
            }
        });
        
        console.log('Đã hiển thị', markers.length, 'marker trên bản đồ');
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
        
        countryInfoContent.innerHTML = `
            <div class="info-section">
                <h3 style="margin: 0 0 15px 0; color: var(--primary-color); display: flex; align-items: center; gap: 10px;">
                    <i class="fas fa-user-circle"></i> ${author.name}
                </h3>
                
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

    // Hàm tính khoảng cách Haversine - CHÍNH XÁC
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

    // THÊM: Hàm tìm tác giả trong bán kính tùy chỉnh
    function findAuthorsInRadius(userLat, userLng, radius = searchRadius) {
        const nearbyAuthors = [];
        
        console.log(`Tìm tác giả trong bán kính ${radius}km từ vị trí: ${userLat}, ${userLng}`);
        
        authors.forEach(author => {
            if (author.birthPlace && author.birthPlace.lat && author.birthPlace.lng) {
                const distance = calculateDistance(
                    userLat, userLng, 
                    author.birthPlace.lat, author.birthPlace.lng
                );
                
                if (distance <= radius) {
                    nearbyAuthors.push({
                        author: author,
                        distance: distance.toFixed(1)
                    });
                }
            }
        });
        
        nearbyAuthors.sort((a, b) => a.distance - b.distance);
        
        console.log(`Tìm thấy ${nearbyAuthors.length} tác giả trong bán kính ${radius}km`);
        
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

    // THÊM: Hàm vẽ vòng tròn bán kính tìm kiếm
    let radiusCircle = null;
    function drawSearchRadiusCircle(lat, lng, radius) {
        if (radiusCircle && map.hasLayer(radiusCircle)) {
            map.removeLayer(radiusCircle);
        }
        
        radiusCircle = L.circle([lat, lng], {
            color: '#4CAF50',
            fillColor: '#4CAF50',
            fillOpacity: 0.1,
            radius: radius * 1000 // Chuyển km sang mét
        }).addTo(map);
        
        radiusCircle.bindPopup(`Bán kính tìm kiếm: ${radius}km`);
    }

    // Hàm hiển thị vị trí người dùng
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
                    
                    // Vẽ vòng tròn bán kính tìm kiếm
                    drawSearchRadiusCircle(userLatLng[0], userLatLng[1], searchRadius);
                    
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
                    
                    const countryInfoContent = document.getElementById('countryInfoContent');
                    if (countryInfoContent) {
                        countryInfoContent.innerHTML = `
                            <div class="info-section">
                                <h3 style="color: #ef4444;">Lỗi định vị</h3>
                                <p>${errorMessage}</p>
                            </div>
                        `;
                    }
                },
                {
                    enableHighAccuracy: true,
                    timeout: 15000,
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
        
        if (radiusCircle) {
            map.removeLayer(radiusCircle);
            radiusCircle = null;
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
                        
                        // Cập nhật vòng tròn bán kính
                        if (radiusCircle) {
                            radiusCircle.setLatLng(userLatLng);
                        }
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

    // THÊM: Hàm cập nhật hiển thị bán kính
    function updateRadiusDisplay() {
        const radiusDisplay = document.getElementById('radiusDisplay');
        const currentRadiusValue = document.getElementById('currentRadiusValue');
        const radiusSlider = document.getElementById('radiusSlider');
        const radiusInput = document.getElementById('radiusInput');
        
        if (radiusDisplay) radiusDisplay.textContent = searchRadius;
        if (currentRadiusValue) currentRadiusValue.textContent = `${searchRadius} km`;
        if (radiusSlider) radiusSlider.value = searchRadius;
        if (radiusInput) radiusInput.value = searchRadius;
        
        // Cập nhật nút tìm kiếm
        const findNearbyBtn = document.getElementById('findNearbyBtn');
        if (findNearbyBtn) {
            findNearbyBtn.innerHTML = `<i class="fas fa-search-location"></i> Tìm gần tôi (${searchRadius}km)`;
        }
        
        // Cập nhật vòng tròn nếu đang hiển thị
        if (userLocationMarker && radiusCircle) {
            const userLatLng = userLocationMarker.getLatLng();
            drawSearchRadiusCircle(userLatLng.lat, userLatLng.lng, searchRadius);
        }
    }

    // THÊM: Hàm xử lý thay đổi bán kính từ slider
    function handleRadiusSliderChange() {
        const radiusSlider = document.getElementById('radiusSlider');
        if (!radiusSlider) return;
        
        searchRadius = parseInt(radiusSlider.value);
        updateRadiusDisplay();
    }

    // THÊM: Hàm xử lý thay đổi bán kính từ input
    function handleRadiusInputChange() {
        const radiusInput = document.getElementById('radiusInput');
        if (!radiusInput) return;
        
        let value = parseInt(radiusInput.value);
        
        // Giới hạn giá trị
        if (isNaN(value)) {
            value = 100;
        } else if (value < 10) {
            value = 10;
        } else if (value > 1000) {
            value = 1000;
        }
        
        searchRadius = value;
        updateRadiusDisplay();
    }

    // Hàm tìm và hiển thị tác giả gần với bán kính tùy chỉnh
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
            
            setTimeout(() => {
                showUserLocation();
            }, 1000);
            return;
        }
        
        const userLatLng = userLocationMarker.getLatLng();
        console.log(`Tìm tác giả trong bán kính ${searchRadius}km từ vị trí:`, userLatLng);
        
        const nearbyAuthors = findAuthorsInRadius(userLatLng.lat, userLatLng.lng, searchRadius);
        showNearbyAuthors(nearbyAuthors);
        
        // Zoom đến khu vực xung quanh
        map.flyTo(userLatLng, Math.max(8, 12 - Math.log(searchRadius/50)));
    }

    // Hàm hiển thị tác giả gần
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
                        <i class="fas fa-info-circle"></i> Tìm thấy ${nearbyAuthors.length} tác giả trong bán kính ${searchRadius}km
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
                    <div style="margin-top: 15px; padding: 10px; background-color: rgba(76, 175, 80, 0.1); border-radius: 6px;">
                        <p style="margin: 0; font-size: 0.9rem; color: #2e7d32;">
                            <i class="fas fa-lightbulb"></i> <strong>Gợi ý:</strong> Bạn có thể điều chỉnh bán kính tìm kiếm ở trên để tìm thêm tác giả.
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
                            Không tìm thấy tác giả nào trong bán kính ${searchRadius}km.
                        </p>
                        <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 20px;">
                            Thử tăng bán kính tìm kiếm hoặc di chuyển đến khu vực khác.
                        </p>
                        <button onclick="increaseSearchRadius()" style="padding: 10px 20px; background-color: var(--primary-color); color: white; border: none; border-radius: 6px; cursor: pointer;">
                            <i class="fas fa-expand-alt"></i> Tăng bán kính tìm kiếm
                        </button>
                    </div>
                </div>
            `;
        }
        
        countryInfoContent.innerHTML = nearbyHTML;
    }

    // THÊM: Hàm tăng bán kính tìm kiếm
    window.increaseSearchRadius = function() {
        let newRadius = searchRadius + 100;
        if (newRadius > 1000) newRadius = 1000;
        
        searchRadius = newRadius;
        updateRadiusDisplay();
        
        // Tìm lại với bán kính mới
        if (userLocationMarker) {
            const userLatLng = userLocationMarker.getLatLng();
            const nearbyAuthors = findAuthorsInRadius(userLatLng.lat, userLatLng.lng, searchRadius);
            showNearbyAuthors(nearbyAuthors);
        }
    };

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

        // THÊM: Event listeners cho bán kính tìm kiếm
        const radiusSlider = document.getElementById('radiusSlider');
        const radiusInput = document.getElementById('radiusInput');
        const applyRadiusBtn = document.getElementById('applyRadiusBtn');
        
        if (radiusSlider) {
            radiusSlider.addEventListener('input', handleRadiusSliderChange);
        }
        
        if (radiusInput) {
            radiusInput.addEventListener('input', handleRadiusInputChange);
            radiusInput.addEventListener('change', handleRadiusInputChange);
        }
        
        if (applyRadiusBtn) {
            applyRadiusBtn.addEventListener('click', () => {
                handleRadiusInputChange();
                showNotification(`Đã đặt bán kính tìm kiếm: ${searchRadius}km`, 'success');
            });
        }

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

        const toggleLocationBtn = document.getElementById('toggleLocationBtn');
        const findNearbyBtn = document.getElementById('findNearbyBtn');
        
        if (toggleLocationBtn) {
            toggleLocationBtn.addEventListener('click', toggleUserLocation);
        }
        
        if (findNearbyBtn) {
            findNearbyBtn.addEventListener('click', findAndShowNearbyAuthors);
        }
        
        // Cập nhật hiển thị bán kính ban đầu
        setTimeout(() => {
            updateRadiusDisplay();
        }, 100);
    }

    // THÊM: Hàm hiển thị thông báo
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background-color: ${type === 'success' ? '#4CAF50' : '#2196F3'};
            color: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 2000;
            font-weight: 600;
            animation: slideIn 0.3s ease;
        `;
        
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-info-circle'}"></i>
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
        
        // Thêm CSS cho animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            @keyframes slideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }

    // Xuất hàm ra global scope
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

    window.closeNearbyAuthors = function() {
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
    };

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

    if (document.getElementById('popupTitle') && document.getElementById('popupTitle').textContent === 'Bản đồ văn học') {
        console.log('Popup bản đồ đã mở, đang khởi tạo...');
        setTimeout(initMapPopup, 500);
    }

    window.initMapPopup = initMapPopup;
    
    console.log('Map popup script đã được tải và sẵn sàng với chức năng bán kính tùy chỉnh');
});
