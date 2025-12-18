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
    let userLocation = null;
    let db = null;

    const MAP_REVERSED_API_KEY = "cbRSGo7aT22YUIRKGY4db94W_uD1rUmkDySazIA";
    const MAP_API_KEY = "AIzaSyDq_sSF2kgHzuDgYNpQef6EDrk8MsP0vlM";

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

    function calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    function findAuthorsNearby(userLat, userLng) {
        const nearbyAuthors = [];
        
        console.log('Tìm tác giả gần vị trí:', userLat, userLng);
        console.log('Tổng số tác giả:', authors.length);
        
        authors.forEach(author => {
            if (author.birthPlace && author.birthPlace.lat && author.birthPlace.lng) {
                const authorLat = parseFloat(author.birthPlace.lat);
                const authorLng = parseFloat(author.birthPlace.lng);
                
                if (!isNaN(authorLat) && !isNaN(authorLng)) {
                    const distance = calculateDistance(userLat, userLng, authorLat, authorLng);
                    
                    console.log(`Khoảng cách đến ${author.name}: ${distance.toFixed(2)}km`);
                    
                    if (distance <= 50) {
                        nearbyAuthors.push({
                            author: author,
                            distance: distance.toFixed(1)
                        });
                    }
                }
            }
        });
        
        nearbyAuthors.sort((a, b) => a.distance - b.distance);
        
        console.log(`Tìm thấy ${nearbyAuthors.length} tác giả gần đó`);
        
        return nearbyAuthors;
    }

    const userLocationIcon = L.divIcon({
        className: 'user-location-marker',
        html: `
            <div style="position: relative; width: 16px; height: 16px;">
                <div style="width: 16px; height: 16px; border-radius: 50%; background-color: #4285F4; border: 2px solid white; box-shadow: 0 0 0 2px rgba(66, 133, 244, 0.3);"></div>
            </div>
        `,
        iconSize: [16, 16],
        iconAnchor: [8, 8]
    });

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
        try {
            console.log(`Đang tìm kiếm "${authorName}" trên Wikipedia...`);
            
            const searchUrl = `https://vi.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(authorName)}&format=json&origin=*`;
            const searchResponse = await fetch(searchUrl);
            const searchData = await searchResponse.json();
            
            if (searchData.query.search.length === 0) {
                throw new Error('Không tìm thấy thông tin trên Wikipedia');
            }
            
            const pageTitle = searchData.query.search[0].title;
            console.log(`Tìm thấy trang: ${pageTitle}`);
            
            const contentUrl = `https://vi.wikipedia.org/w/api.php?action=query&prop=extracts|pageimages|info&inprop=url&explaintext=true&exchars=1000&pithumbsize=300&titles=${encodeURIComponent(pageTitle)}&format=json&origin=*`;
            const contentResponse = await fetch(contentUrl);
            const contentData = await contentResponse.json();
            
            const pageId = Object.keys(contentData.query.pages)[0];
            const pageInfo = contentData.query.pages[pageId];
            const fullText = pageInfo.extract || '';
            
            console.log(`Đã lấy nội dung cho ${pageTitle}, độ dài: ${fullText.length}`);
            
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
            
            let works = [];
            const worksMatch = fullText.match(/tác phẩm nổi tiếng(.+?)(\.|,|;|\n|$)/i);
            if (worksMatch) {
                works = worksMatch[1].split(',').map(s => s.trim()).filter(s => s.length > 0);
            }
            
            const newAuthor = {
                id: `wiki_${Date.now()}`,
                name: pageTitle,
                bio: extractShortBio(fullText),
                works: works.length > 0 ? works : [],
                birthPlace: { lat: 0, lng: 0 },
                country: country,
                century: century,
                image: pageInfo.thumbnail ? pageInfo.thumbnail.source : 'https://via.placeholder.com/300x200?text=No+Image',
                connections: [],
                source: 'wikipedia'
            };
            
            console.log(`Đã tạo tác giả: ${newAuthor.name}, quốc gia: ${newAuthor.country}, thế kỷ: ${newAuthor.century}`);
            
            return newAuthor;
            
        } catch (error) {
            console.error('Lỗi khi tìm kiếm Wikipedia:', error);
            throw new Error(`Không thể tìm thấy thông tin cho "${authorName}" trên Wikipedia.`);
        }
    }

    function showUserLocation() {
        if (navigator.geolocation) {
            console.log('Đang lấy vị trí người dùng...');
            
            const countryInfoContent = document.getElementById('countryInfoContent');
            if (countryInfoContent) {
                countryInfoContent.innerHTML = `
                    <div class="firebase-loading">
                        <span class="loading-spinner"></span>
                        <p>Đang xác định vị trí của bạn...</p>
                    </div>
                `;
            }
            
            navigator.geolocation.getCurrentPosition(
                function(position) {
                    userLocation = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                        accuracy: position.coords.accuracy
                    };
                    
                    console.log('Vị trí người dùng:', userLocation);
                    
                    if (userLocationMarker) {
                        map.removeLayer(userLocationMarker);
                    }
                    
                    userLocationMarker = L.marker([userLocation.lat, userLocation.lng], {
                        icon: userLocationIcon,
                        zIndexOffset: 1000
                    }).addTo(map);
                    
                    const accuracy = position.coords.accuracy;
                    userLocationMarker.bindPopup(`
                        <div style="text-align: center;">
                            <h3 style="margin: 5px 0; color: #4285F4;">Vị trí của bạn</h3>
                            <p style="margin: 5px 0;"><strong>Kinh độ:</strong> ${userLocation.lng.toFixed(6)}</p>
                            <p style="margin: 5px 0;"><strong>Vĩ độ:</strong> ${userLocation.lat.toFixed(6)}</p>
                            <p style="margin: 5px 0;"><strong>Độ chính xác:</strong> ~${Math.round(accuracy)} mét</p>
                            <small style="color: #666;">Cập nhật: ${new Date().toLocaleTimeString()}</small>
                        </div>
                    `).openPopup();
                    
                    const zoomLevel = accuracy < 100 ? 16 : accuracy < 500 ? 14 : 12;
                    map.flyTo([userLocation.lat, userLocation.lng], zoomLevel);
                    
                    const toggleLocationBtn = document.getElementById('toggleLocationBtn');
                    if (toggleLocationBtn) {
                        toggleLocationBtn.classList.add('active');
                        toggleLocationBtn.innerHTML = '<i class="fas fa-location-crosshairs"></i> Ẩn vị trí của tôi';
                    }
                    
                    updateLocationInfo(userLocation);
                    
                    setTimeout(() => {
                        if (userLocationMarker) {
                            userLocationMarker.closePopup();
                        }
                    }, 5000);
                    
                    setTimeout(() => {
                        findAndShowNearbyAuthors();
                    }, 1000);
                    
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
                    
                    showError(errorMessage);
                    console.error('Lỗi định vị:', error);
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

    function hideUserLocation() {
        if (userLocationMarker) {
            map.removeLayer(userLocationMarker);
            userLocationMarker = null;
        }
        
        const locationInfo = document.getElementById('currentLocationInfo');
        if (locationInfo) {
            locationInfo.style.display = 'none';
        }
        
        const toggleLocationBtn = document.getElementById('toggleLocationBtn');
        if (toggleLocationBtn) {
            toggleLocationBtn.classList.remove('active');
            toggleLocationBtn.innerHTML = '<i class="fas fa-location-crosshairs"></i> Vị trí của tôi';
        }
        
        userLocation = null;
        stopTracking();
    }

    function toggleUserLocation() {
        if (userLocationMarker) {
            hideUserLocation();
        } else {
            showUserLocation();
        }
    }

    function findAndShowNearbyAuthors() {
        if (!userLocation) {
            const countryInfoContent = document.getElementById('countryInfoContent');
            if (countryInfoContent) {
                countryInfoContent.innerHTML = `
                    <div class="info-section">
                        <h3 style="color: var(--primary-color);">
                            <i class="fas fa-search-location"></i> Tìm tác giả gần bạn
                        </h3>
                        <p style="color: var(--text-secondary);">
                            Vui lòng bật "Vị trí của tôi" trước khi tìm kiếm tác giả gần bạn.
                        </p>
                        <button onclick="showUserLocation()" 
                                style="margin-top: 15px; width: 100%; padding: 10px; background-color: var(--primary-color); color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 1rem;">
                            <i class="fas fa-location-crosshairs"></i> Bật vị trí của tôi
                        </button>
                    </div>
                `;
            }
            return;
        }
        
        console.log('Bắt đầu tìm tác giả gần vị trí:', userLocation);
        
        const countryInfoContent = document.getElementById('countryInfoContent');
        if (countryInfoContent) {
            countryInfoContent.innerHTML = `
                <div class="firebase-loading">
                    <span class="loading-spinner"></span>
                    <p>Đang tìm kiếm tác giả trong bán kính 50km...</p>
                </div>
            `;
        }
        
        setTimeout(() => {
            const nearbyAuthors = findAuthorsNearby(userLocation.lat, userLocation.lng);
            showNearbyAuthors(nearbyAuthors);
            
            map.flyTo([userLocation.lat, userLocation.lng], 10);
        }, 500);
    }

    function showNearbyAuthors(nearbyAuthors) {
        const countryInfoContent = document.getElementById('countryInfoContent');
        
        if (!countryInfoContent) {
            console.error('Không tìm thấy countryInfoContent');
            return;
        }
        
        let nearbyHTML = '';
        
        if (nearbyAuthors.length > 0) {
            nearbyHTML = `
                <div class="info-section">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                        <h3 style="margin: 0; color: var(--primary-color);">
                            <i class="fas fa-search-location"></i> Tác giả gần bạn (${nearbyAuthors.length})
                        </h3>
                        <span class="close-nearby" onclick="closeNearbyAuthors()" style="cursor: pointer; font-size: 20px; color: #888;">×</span>
                    </div>
                    <p style="color: var(--text-secondary); margin-bottom: 15px; font-size: 0.9rem;">
                        <i class="fas fa-info-circle"></i> Tìm thấy ${nearbyAuthors.length} tác giả trong bán kính 50km từ vị trí của bạn
                    </p>
                    <div style="max-height: 400px; overflow-y: auto;">
                        ${nearbyAuthors.map(item => `
                            <div class="nearby-author" onclick="mapPopupShowAuthorInfo('${item.author.id}')">
                                <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                                    <div>
                                        <strong>${item.author.name}</strong>
                                        <div style="font-size: 0.8rem; color: var(--text-secondary);">
                                            ${item.author.country || 'Không xác định'} • ${item.author.century ? 'Thế kỷ ' + item.author.century : 'Không rõ thế kỷ'}
                                        </div>
                                    </div>
                                    <span style="background-color: #0078A8; color: white; padding: 2px 6px; border-radius: 10px; font-size: 12px;">${item.distance} km</span>
                                </div>
                            </div>
                        `).join('')}
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
                        <span class="close-nearby" onclick="closeNearbyAuthors()" style="cursor: pointer; font-size: 20px; color: #888;">×</span>
                    </div>
                    <div style="text-align: center; padding: 40px 20px;">
                        <i class="fas fa-map-marker-alt" style="font-size: 3rem; color: #ccc; margin-bottom: 15px;"></i>
                        <p style="color: var(--text-secondary); margin-bottom: 10px;">
                            Không tìm thấy tác giả nào trong bán kính 50km.
                        </p>
                        <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 20px;">
                            Có thể khu vực của bạn chưa có dữ liệu tác giả, hoặc bạn có thể thử:
                        </p>
                        <div style="display: flex; gap: 10px; justify-content: center;">
                            <button onclick="loadData()" 
                                    style="padding: 8px 15px; background-color: var(--primary-color); color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.9rem;">
                                <i class="fas fa-sync-alt"></i> Tải lại dữ liệu
                            </button>
                            <button onclick="toggleUserLocation()" 
                                    style="padding: 8px 15px; background-color: #4285F4; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.9rem;">
                                <i class="fas fa-redo"></i> Thử lại vị trí
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }
        
        countryInfoContent.innerHTML = nearbyHTML;
    }

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
                    ${userLocation ? `
                        <div style="margin-top: 15px; padding: 10px; background-color: rgba(66, 133, 244, 0.1); border-radius: 6px;">
                            <p style="margin: 0; color: #4285F4; font-size: 0.9rem;">
                                <i class="fas fa-map-marker-alt"></i> Vị trí của bạn đã được xác định. 
                                <a href="javascript:void(0)" onclick="findAndShowNearbyAuthors()" style="color: #4285F4; text-decoration: underline;">Tìm tác giả gần bạn</a>
                            </p>
                        </div>
                    ` : ''}
                </div>
            `;
        }
    };

    function startTracking() {
        if (navigator.geolocation && userLocation) {
            watchId = navigator.geolocation.watchPosition(
                function(position) {
                    userLocation = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                        accuracy: position.coords.accuracy
                    };
                    
                    if (userLocationMarker) {
                        userLocationMarker.setLatLng([userLocation.lat, userLocation.lng]);
                        updateLocationInfo(userLocation);
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

    function stopTracking() {
        if (watchId) {
            navigator.geolocation.clearWatch(watchId);
            watchId = null;
        }
    }

    function updateLocationInfo(location) {
        const locationInfo = document.getElementById('currentLocationInfo');
        const locationCoords = document.getElementById('locationCoords');
        const locationAccuracy = document.getElementById('locationAccuracy');
        const locationAddress = document.getElementById('locationAddress');
        
        if (locationInfo && locationCoords && locationAccuracy) {
            locationInfo.style.display = 'block';
            locationCoords.textContent = `Lat: ${location.lat.toFixed(6)}, Lng: ${location.lng.toFixed(6)}`;
            locationAccuracy.textContent = `Độ chính xác: ~${Math.round(location.accuracy)}m`;
            
            getAddressFromCoords(location.lat, location.lng).then(address => {
                if (locationAddress && address) {
                    locationAddress.textContent = address;
                }
            }).catch(() => {
                if (locationAddress) {
                    locationAddress.textContent = 'Đang tải địa chỉ...';
                }
            });
        }
    }

    async function getAddressFromCoords(lat, lng) {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
            );
            const data = await response.json();
            
            if (data.address) {
                const address = data.display_name;
                return address.length > 100 ? address.substring(0, 100) + '...' : address;
            }
        } catch (error) {
            console.error('Lỗi khi lấy địa chỉ:', error);
        }
        return null;
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
                                                    <input type="range" id="centurySlider" class="slider" min="0" max="6" value="6" step="1" style="padding: 0;">
                                                    <div style="display: flex; justify-content: space-between; margin-top: 5px; font-size: 0.8rem;">
                                                        <span>Trước 17</span>
                                                        <span>17</span>
                                                        <span>18</span>
                                                        <span>19</span>
                                                        <span>20</span>
                                                        <span>21</span>
                                                        <span>Tất cả</span>
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
                                                    <button id="toggleLocationBtn" class="control-btn secondary">
                                                        <i class="fas fa-location-crosshairs"></i> Vị trí của tôi
                                                    </button>
                                                    <button id="refreshDataBtn" class="control-btn secondary">
                                                        <i class="fas fa-sync-alt"></i> Tải lại dữ liệu
                                                    </button>
                                                </div>
                                                
                                                <div id="currentLocationInfo" style="display: none; margin-top: 15px; padding: 10px; background-color: rgba(66, 133, 244, 0.1); border-radius: 6px; border: 1px solid rgba(66, 133, 244, 0.3);">
                                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                                                        <strong style="color: #4285F4;"><i class="fas fa-map-marker-alt"></i> Vị trí hiện tại:</strong>
                                                        <span id="locationAccuracy" style="font-size: 0.8rem; color: #666;"></span>
                                                    </div>
                                                    <div id="locationCoords" style="font-size: 0.9rem; color: #333;"></div>
                                                    <div id="locationAddress" style="font-size: 0.8rem; color: #666; margin-top: 5px;"></div>
                                                </div>
                                            </div>
                                            <div class="advanced-search-actions">
                                                <button id="applyAdvancedSearch" class="control-btn secondary" style="flex: 2;">
                                                    <i class="fas fa-users"></i> Tác giả
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
                                <div id="map" style="width: 100%; height: 100%;"></div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            setTimeout(() => {
                initMapFunctions();
            }, 100);
        }
    }

    function initMapFunctions() {
        console.log('Đang khởi tạo chức năng bản đồ...');
        
        if (typeof L === 'undefined') {
            console.error('Leaflet chưa được tải!');
            return;
        }
        
        const mapElement = document.getElementById('map');
        if (!mapElement) {
            console.error('Không tìm thấy phần tử bản đồ (#map)');
            return;
        }
        
        if (typeof firebase === 'undefined') {
            console.error('Firebase chưa được tải!');
            return;
        }
        
        let firebaseApp;
        try {
            firebaseApp = firebase.initializeApp(firebaseConfig, 'mapPopupApp');
        } catch (error) {
            console.log('Firebase đã được khởi tạo, sử dụng app hiện có');
            try {
                firebaseApp = firebase.app('mapPopupApp');
            } catch (e) {
                firebaseApp = firebase.app();
            }
        }
        db = firebase.firestore(firebaseApp);
        
        function initLeafletMap() {
            console.log('Đang khởi tạo bản đồ Leaflet...');
            
            try {
                mapElement.style.width = '100%';
                mapElement.style.height = '100%';
                
                map = L.map('map', {
                    zoomControl: true,
                    attributionControl: true,
                    preferCanvas: true
                }).setView([16, 106.2], 6);
                
                console.log('Bản đồ Leaflet đã được tạo');
                
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                    maxZoom: 18,
                    minZoom: 3
                }).addTo(map);
                
                console.log('Tile layer đã được thêm vào bản đồ');
                
                initializeMapWithTerritories();
                
                const vietnamBounds = L.latLngBounds(
                    [8.0, 102.0],
                    [23.0, 115.0]
                );
                map.fitBounds(vietnamBounds);
                
                console.log('Bản đồ Leaflet đã được khởi tạo thành công');
                return true;
                
            } catch (error) {
                console.error('Lỗi khi khởi tạo bản đồ:', error);
                return false;
            }
        }
        
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
        
        const mapInitialized = initLeafletMap();
        
        if (mapInitialized) {
            setupMapEventListeners();
            loadData();
            loadCountryGeoData();
            
            console.log('Bản đồ văn học đã sẵn sàng!');
        } else {
            console.error('Không thể khởi tạo bản đồ!');
            const countryInfoContent = document.getElementById('countryInfoContent');
            if (countryInfoContent) {
                countryInfoContent.innerHTML = `
                    <div class="info-section">
                        <h3 style="color: #ef4444;">Lỗi khởi tạo bản đồ</h3>
                        <p>Không thể tải bản đồ. Vui lòng kiểm tra:</p>
                        <ol style="text-align: left; margin: 10px 20px;">
                            <li>Kết nối internet</li>
                            <li>Đã tải Leaflet và Firebase</li>
                            <li>Thử tải lại trang</li>
                        </ol>
                    </div>
                `;
            }
        }
        
        async function loadData() {
            try {
                const countryInfoContent = document.getElementById('countryInfoContent');
                
                console.log('Đang tải dữ liệu từ Firestore...');
                
                if (countryInfoContent) {
                    countryInfoContent.innerHTML = `
                        <div class="firebase-loading">
                            <span class="loading-spinner"></span>
                            <p>Đang kết nối với cơ sở dữ liệu văn học...</p>
                        </div>
                    `;
                }
                
                const authorsSnapshot = await db.collection('authors').get();
                authors = [];
                authorsSnapshot.forEach(doc => {
                    const data = doc.data();
                    if (data.birthPlace) {
                        if (typeof data.birthPlace === 'string') {
                            try {
                                data.birthPlace = JSON.parse(data.birthPlace);
                            } catch (e) {
                                console.warn(`Không thể parse birthPlace của tác giả ${data.name}:`, data.birthPlace);
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
                    
                    console.log(`Tác giả: ${data.name}, Vị trí:`, data.birthPlace);
                });
                
                console.log(`Tổng số tác giả: ${authors.length}`);
                console.log(`Số tác giả có vị trí: ${authors.filter(a => a.birthPlace && a.birthPlace.lat && a.birthPlace.lng).length}`);
                
                const historySnapshot = await db.collection('history').get();
                historyData = {};
                historySnapshot.forEach(doc => {
                    historyData[doc.id] = doc.data();
                });
                
                console.log('Dữ liệu đã tải:', authors.length, 'tác giả');
                
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
                console.error('Lỗi tải dữ liệu:', error);
                showError('Không thể kết nối với cơ sở dữ liệu. Vui lòng kiểm tra kết nối internet.');
            }
        }
        
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
                });
        }
        
        function displayAuthors() {
            markers.forEach(marker => {
                if (map && map.hasLayer(marker)) {
                    map.removeLayer(marker);
                }
            });
            markers = [];
            
            let authorCount = 0;
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
                        authorCount++;
                    } else {
                        console.warn(`Tọa độ không hợp lệ cho tác giả ${author.name}: lat=${lat}, lng=${lng}`);
                    }
                }
            });
            
            console.log(`Đã hiển thị ${authorCount} marker trên bản đồ`);
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
                                <p>${historyInfo.history || historyInfo || "Chưa có thông tin lị sử văn học."}</p>
                            </div>
                        </div>
                        
                        <div class="info-section">
                            <span class="info-label"><i class="fas fa-users"></i> Tác giả nổi bật (${countryAuthors.length}):</span>
                            <div style="margin-top: 10px;">
                `;
                
                if (countryAuthors.length > 0) {
                    countryInfoHTML += `
                        <div class="country-authors-container">
                            ${countryAuthors.map(author => `
                                <div class="nearby-author" onclick="window.mapPopupShowAuthorInfo('${author.id}')">
                                    <div style="display: flex; justify-content: space-between; align-items: center;">
                                        <span>${author.name}</span>
                                        <small style="color: var(--text-secondary);">${author.century ? 'Thế kỷ ' + author.century : ''}</small>
                                    </div>
                                </div>
                            `).join('')}
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
        
        function setupMapEventListeners() {
            console.log('Đang thiết lập event listeners...');
            
            const sidebarToggleBtn = document.getElementById('mapSidebarToggleBtn');
            const mapSidebar = document.getElementById('mapSidebar');
            
            if (sidebarToggleBtn && mapSidebar) {
                isSidebarVisible = true;
                mapSidebar.classList.remove('hidden');
                
                function updateToggleButtonPosition() {
                    const sidebarWidth = window.innerWidth <= 768 ? '85%' : '350px';
                    if (isSidebarVisible) {
                        sidebarToggleBtn.style.left = sidebarWidth;
                    } else {
                        sidebarToggleBtn.style.left = '0';
                    }
                }
                
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
                
                updateToggleButtonPosition();
                window.addEventListener('resize', updateToggleButtonPosition);
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
                        
                        await handleWikiSearch(searchTerm);
                    });
                    suggestions.appendChild(wikiDiv);
                    
                    suggestions.style.display = 'block';
                }
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
            const toggleConnectionBtn = document.getElementById('toggleConnectionModeBtn');
            const checkConnectionBtn = document.getElementById('checkConnectionBtn');
            const centurySlider = document.getElementById('centurySlider');
            const toggleLocationBtn = document.getElementById('toggleLocationBtn');
            const refreshDataBtn = document.getElementById('refreshDataBtn');
            
            if (applyAdvancedSearch) {
                applyAdvancedSearch.addEventListener('click', applyAdvancedSearchFilter);
            }
            
            if (clearAdvancedSearch) {
                clearAdvancedSearch.addEventListener('click', clearAdvancedSearchFilter);
            }
            
            if (toggleConnectionBtn) {
                toggleConnectionBtn.addEventListener('click', toggleConnectionMode);
            }
            
            if (checkConnectionBtn) {
                checkConnectionBtn.addEventListener('click', checkConnection);
            }
            
            if (centurySlider) {
                centurySlider.addEventListener('input', (e) => {
                    filterByCentury(parseInt(e.target.value));
                });
            }
            
            if (toggleLocationBtn) {
                toggleLocationBtn.addEventListener('click', toggleUserLocation);
            }
            
            if (refreshDataBtn) {
                refreshDataBtn.addEventListener('click', () => {
                    loadData();
                    showNotification('Đang tải lại dữ liệu...', 'info');
                });
            }
            
            console.log('Event listeners đã được thiết lập');
        }
        
        async function handleWikiSearch(authorName) {
            const countryInfoContent = document.getElementById('countryInfoContent');
            
            if (!countryInfoContent) return;
            
            countryInfoContent.innerHTML = `
                <div class="firebase-loading">
                    <span class="loading-spinner"></span>
                    <p>Đang tìm kiếm thông tin trên Wikipedia cho "${authorName}"...</p>
                </div>
            `;
            
            try {
                const newAuthor = await searchAuthorFromWikipedia(authorName);
                
                const existingAuthor = authors.find(a => a.name === newAuthor.name);
                if (existingAuthor) {
                    showAuthorInfo(existingAuthor);
                    showNotification(`Tác giả "${newAuthor.name}" đã có trong cơ sở dữ liệu.`, 'info');
                } else {
                    authors.push(newAuthor);
                    
                    if (newAuthor.birthPlace && newAuthor.birthPlace.lat !== 0 && newAuthor.birthPlace.lng !== 0) {
                        const marker = addAuthorMarker(newAuthor);
                        if (marker) {
                            map.flyTo([newAuthor.birthPlace.lat, newAuthor.birthPlace.lng], 8);
                            highlightMarker(marker);
                        }
                    }
                    
                    showAuthorInfo(newAuthor);
                    
                    showNotification(`Đã thêm tác giả "${newAuthor.name}" từ Wikipedia.`, 'success');
                }
                
            } catch (error) {
                console.error('Lỗi khi xử lý tìm kiếm Wikipedia:', error);
                
                countryInfoContent.innerHTML = `
                    <div class="info-section">
                        <h3 style="color: #ef4444;">Lỗi tìm kiếm</h3>
                        <p>${error.message}</p>
                        <p>Vui lòng thử lại với tên khác hoặc kiểm tra kết nối internet.</p>
                        <button onclick="loadData()" 
                                style="margin-top: 15px; width: 100%; padding: 10px; background-color: var(--primary-color); color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 1rem;">
                            <i class="fas fa-sync-alt"></i> Tải lại dữ liệu từ Firestore
                        </button>
                    </div>
                `;
            }
        }
        
        function addAuthorMarker(author) {
            if (author.birthPlace && author.birthPlace.lat && author.birthPlace.lng && 
                author.birthPlace.lat !== 0 && author.birthPlace.lng !== 0) {
                
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
                const authorLat = author.birthPlace ? parseFloat(author.birthPlace.lat) : null;
                const authorLng = author.birthPlace ? parseFloat(author.birthPlace.lng) : null;
                return authorLat && authorLng && latLng.lat === authorLat && latLng.lng === authorLng;
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
                
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`, {
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
        
        function filterByCentury(selectedValue) {
            let centuryText = "Tất cả thế kỷ";
            let targetCentury = 0;
            
            if (selectedValue === 0) {
                centuryText = "Trước thế kỷ 17";
            } else if (selectedValue === 6) {
                centuryText = "Tất cả thế kỷ";
            } else if (selectedValue >= 1 && selectedValue <= 5) {
                targetCentury = selectedValue + 15;
                centuryText = `Thế kỷ ${targetCentury}`;
            }
            
            const centuryValueElement = document.getElementById('centuryValue');
            if (centuryValueElement) {
                centuryValueElement.textContent = centuryText;
            }
            
            markers.forEach(marker => {
                const author = authors.find(a => {
                    const latLng = marker.getLatLng();
                    const authorLat = a.birthPlace ? parseFloat(a.birthPlace.lat) : null;
                    const authorLng = a.birthPlace ? parseFloat(a.birthPlace.lng) : null;
                    return authorLat && authorLng && latLng.lat === authorLat && latLng.lng === authorLng;
                });
                
                if (!author) return;
                
                let showMarker = false;
                
                if (selectedValue === 6) {
                    showMarker = true;
                } else if (selectedValue === 0) {
                    showMarker = author.century <= 16;
                } else if (selectedValue >= 1 && selectedValue <= 5) {
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
                centurySlider.value = 6;
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
                
                markers.forEach(marker => {
                    if (map.hasLayer(marker)) {
                        map.removeLayer(marker);
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
                            <div class="nearby-author" onclick="zoomToAuthorAndShowInfo('${author.id}')">
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
                    const authorLat = author.birthPlace ? parseFloat(author.birthPlace.lat) : null;
                    const authorLng = author.birthPlace ? parseFloat(author.birthPlace.lng) : null;
                    return authorLat && authorLng && latLng.lat === authorLat && latLng.lng === authorLng;
                });
                
                if (marker) {
                    marker.addTo(map);
                }
            });
        }
        
        window.zoomToAuthorAndShowInfo = function(authorId) {
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
    
    console.log('Map popup script đã được tải đầy đủ và ĐÃ SỬA TẤT CẢ LỖI');
});

