// JavaScript cho popup bản đồ văn học - TOÀN BỘ CODE ĐẦY ĐỦ KHÔNG RÚT GỌN
document.addEventListener('DOMContentLoaded', function() {
    console.log('=== MAP POPUP SCRIPT BẮT ĐẦU - TOÀN BỘ CODE ===');
    
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
    console.log('Đang khởi tạo Firebase...');
    let db;
    try {
        if (typeof firebase === 'undefined') {
            console.error('Firebase không được tải!');
            showError('Firebase không được tải. Vui lòng tải lại trang.');
            return;
        }
        
        let app;
        try {
            app = firebase.app();
            console.log('Firebase đã được khởi tạo trước đó');
        } catch (e) {
            console.log('Khởi tạo Firebase mới...');
            app = firebase.initializeApp(firebaseConfig);
        }
        
        db = firebase.firestore();
        console.log('Firebase Firestore đã sẵn sàng');
    } catch (error) {
        console.error('Lỗi khởi tạo Firebase:', error);
        showError('Không thể kết nối với cơ sở dữ liệu. Lỗi: ' + error.message);
        return;
    }

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
    let userLocation = null;

    // API Key cho bản đồ
    const MAP_REVERSED_API_KEY = "cbRSGo7aT22YUIRKGY4db94W_uD1rUmkDySazIA";
    const MAP_API_KEY = MAP_REVERSED_API_KEY.split('').reverse().join('');

    // Hàm tính khoảng cách giữa 2 điểm (Haversine formula)
    function calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Bán kính Trái đất tính bằng km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c; // Khoảng cách tính bằng km
    }

    // Hàm tìm các tác giả trong bán kính 50km
    function findAuthorsNearby(userLat, userLng) {
        const nearbyAuthors = [];
        
        console.log('Tìm tác giả gần vị trí:', userLat, userLng);
        console.log('Tổng số tác giả:', authors.length);
        
        authors.forEach(author => {
            if (author.birthPlace && author.birthPlace.lat && author.birthPlace.lng) {
                const authorLat = parseFloat(author.birthPlace.lat);
                const authorLng = parseFloat(author.birthPlace.lng);
                
                // Kiểm tra tọa độ hợp lệ
                if (!isNaN(authorLat) && !isNaN(authorLng)) {
                    const distance = calculateDistance(userLat, userLng, authorLat, authorLng);
                    
                    console.log(`Khoảng cách đến ${author.name}: ${distance.toFixed(2)}km`);
                    
                    if (distance <= 50) { // Bán kính 50km
                        nearbyAuthors.push({
                            author: author,
                            distance: distance.toFixed(1)
                        });
                    }
                }
            }
        });
        
        // Sắp xếp theo khoảng cách gần nhất
        nearbyAuthors.sort((a, b) => a.distance - b.distance);
        
        console.log(`Tìm thấy ${nearbyAuthors.length} tác giả gần đó`);
        
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

    // Hàm hiển thị vị trí người dùng
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
                    
                    // Xóa marker cũ nếu có
                    if (userLocationMarker) {
                        map.removeLayer(userLocationMarker);
                    }
                    
                    // Tạo marker mới với icon
                    userLocationMarker = L.marker([userLocation.lat, userLocation.lng], {
                        icon: userLocationIcon,
                        zIndexOffset: 1000
                    }).addTo(map);
                    
                    // Thêm popup chi tiết
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
                    
                    // Zoom đến vị trí người dùng với mức zoom phù hợp
                    const zoomLevel = accuracy < 100 ? 16 : accuracy < 500 ? 14 : 12;
                    map.flyTo([userLocation.lat, userLocation.lng], zoomLevel);
                    
                    // Cập nhật trạng thái nút
                    const toggleLocationBtn = document.getElementById('toggleLocationBtn');
                    if (toggleLocationBtn) {
                        toggleLocationBtn.classList.add('active');
                        toggleLocationBtn.innerHTML = '<i class="fas fa-location-crosshairs"></i> Ẩn vị trí của tôi';
                    }
                    
                    // Cập nhật thông tin vị trí hiển thị
                    updateLocationInfo(userLocation);
                    
                    // Tự động đóng popup sau 5 giây
                    setTimeout(() => {
                        if (userLocationMarker) {
                            userLocationMarker.closePopup();
                        }
                    }, 5000);
                    
                    // Tự động tìm tác giả gần đó
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

    // Hàm ẩn vị trí người dùng
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

    // Hàm toggle vị trí người dùng
    function toggleUserLocation() {
        if (userLocationMarker) {
            hideUserLocation();
        } else {
            showUserLocation();
        }
    }

    // Hàm tìm và hiển thị tác giả gần
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
        
        // Tìm tác giả gần - DÙNG BÁN KÍNH 50KM
        setTimeout(() => {
            const nearbyAuthors = findAuthorsNearby(userLocation.lat, userLocation.lng);
            showNearbyAuthors(nearbyAuthors);
            
            // Zoom đến khu vực xung quanh
            map.flyTo([userLocation.lat, userLocation.lng], 10);
        }, 500);
    }

    // Hàm hiển thị tác giả gần
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
                            <div class="nearby-author" onclick="window.mapPopupShowAuthorInfo('${item.author.id}')">
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

    // Hàm đóng danh sách tác giả gần
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

    // Bắt đầu theo dõi vị trí
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

    // Dừng theo dõi vị trí
    function stopTracking() {
        if (watchId) {
            navigator.geolocation.clearWatch(watchId);
            watchId = null;
        }
    }

    // Hàm cập nhật thông tin vị trí
    function updateLocationInfo(location) {
        const locationInfo = document.getElementById('currentLocationInfo');
        const locationCoords = document.getElementById('locationCoords');
        const locationAccuracy = document.getElementById('locationAccuracy');
        const locationAddress = document.getElementById('locationAddress');
        
        if (locationInfo && locationCoords && locationAccuracy) {
            locationInfo.style.display = 'block';
            locationCoords.textContent = `Lat: ${location.lat.toFixed(6)}, Lng: ${location.lng.toFixed(6)}`;
            locationAccuracy.textContent = `Độ chính xác: ~${Math.round(location.accuracy)}m`;
            
            // Thử lấy địa chỉ từ OpenStreetMap Nominatim
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

    // Hàm lấy địa chỉ từ tọa độ
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

    // Hàm khởi tạo bản đồ trong popup
    function initMapPopup() {
        console.log('=== HÀM INITMAPPOPUP ĐƯỢC GỌI ===');
        
        const popupContent = document.getElementById('popupContent');
        const popupTitle = document.getElementById('popupTitle');
        
        if (!popupContent || !popupTitle) {
            console.error('Không tìm thấy popupContent hoặc popupTitle');
            return;
        }
        
        if (popupTitle.textContent === 'Bản đồ văn học') {
            console.log('Khởi tạo bản đồ văn học...');
            
            // Tạo nội dung cho popup bản đồ với sidebar bên trái
            popupContent.innerHTML = `
                <div class="map-popup" style="height: 100%; width: 100%; position: absolute; top: 0; left: 0; right: 0; bottom: 0; overflow: hidden;">
                    <!-- Sidebar Toggle Button - BÊN TRÁI -->
                    <button class="sidebar-toggle-btn" id="mapSidebarToggleBtn">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                    
                    <div class="map-layout" style="height: 100%; width: 100%; position: relative; display: flex;">
                        <div class="map-sidebar" id="mapSidebar" style="height: 100%; width: 350px; position: absolute; left: 0; top: 0; bottom: 0; z-index: 1000; transition: transform 0.3s ease; box-shadow: 2px 0 15px rgba(0, 0, 0, 0.15); overflow: hidden; background-color: #ffffff; border-right: 2px solid #c0c0c0;">
                            <div class="map-sidebar-content" style="height: 100%; display: flex; flex-direction: column;">
                                <div class="map-controls-container" style="height: 100%; display: flex; flex-direction: column;">
                                    <!-- Phần điều khiển cố định trên cùng -->
                                    <div class="map-fixed-controls" style="padding: 15px; background-color: #ffffff; border-bottom: 2px solid #c0c0c0; flex-shrink: 0; overflow: hidden;">
                                        <div class="search-container" style="margin-bottom: 15px; position: relative;">
                                            <input type="text" id="mapSearchInput" class="search-input" placeholder="Tìm kiếm nhà văn..." style="width: 100%; padding: 12px 15px; border-radius: 8px; border: 2px solid #b0b0b0; background-color: #ffffff; color: #000000; font-size: 1rem; transition: all 0.3s ease;">
                                            <button class="advanced-search-btn" id="advancedSearchBtn" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; color: #e37c2d; cursor: pointer; font-size: 1.1rem; padding: 5px;">
                                                <i class="fas fa-sliders-h"></i>
                                            </button>
                                            <div class="suggestions" id="mapSuggestions" style="position: absolute; top: 100%; left: 0; right: 0; background-color: #ffffff; border: 2px solid #c0c0c0; border-radius: 8px; box-shadow: 0 5px 15px rgba(0,0,0,0.15); z-index: 1001; display: none; max-height: 250px; overflow-y: auto;"></div>
                                        </div>
                                        
                                        <!-- Panel tìm kiếm nâng cao -->
                                        <div class="advanced-search-panel" id="advancedSearchPanel" style="display: none; max-height: 500px; overflow-y: auto; padding: 15px; margin-top: 10px; background-color: rgba(227, 124, 45, 0.1); border-radius: 8px; border: 2px solid #e37c2d;">
                                            <div class="advanced-search-fields" style="display: flex; flex-direction: column; gap: 15px; margin-top: 10px;">
                                                <div class="advanced-field" style="display: flex; flex-direction: column; width: 100%;">
                                                    <label for="searchCountry" style="font-weight: 600; color: #e37c2d; margin-bottom: 8px; font-size: 0.9rem; display: flex; align-items: center; justify-content: space-between;">Quốc gia:</label>
                                                    <select id="searchCountry" style="padding: 10px 12px; border-radius: 6px; border: 2px solid #b0b0b0; background-color: #ffffff; color: #000000; font-size: 0.9rem; width: 100%; box-sizing: border-box;">
                                                        <option value="">Tất cả quốc gia</option>
                                                        <option value="Vietnam">Việt Nam</option>
                                                        <option value="United States">Mỹ</option>
                                                        <option value="United Kingdom">Anh</option>
                                                        <option value="France">Pháp</option>
                                                        <option value="Germany">Đức</option>
                                                        <option value="Russia">Nga</option>
                                                        <option value="China">Trung Quốc</option>
                                                        <option value="Japan">Nhật Bản</option>
                                                        <option value="Korea">Hàn Quốc</option>
                                                        <option value="India">Ấn Độ</option>
                                                        <option value="Italy">Ý</option>
                                                        <option value="Spain">Tây Ban Nha</option>
                                                        <option value="Portugal">Bồ Đào Nha</option>
                                                        <option value="Netherlands">Hà Lan</option>
                                                        <option value="Belgium">Bỉ</option>
                                                        <option value="Switzerland">Thụy Sĩ</option>
                                                        <option value="Sweden">Thụy Điển</option>
                                                        <option value="Norway">Na Uy</option>
                                                        <option value="Denmark">Đan Mạch</option>
                                                        <option value="Finland">Phần Lan</option>
                                                        <option value="Poland">Ba Lan</option>
                                                        <option value="Czech Republic">Cộng hòa Séc</option>
                                                        <option value="Austria">Áo</option>
                                                        <option value="Hungary">Hungary</option>
                                                        <option value="Romania">Romania</option>
                                                        <option value="Bulgaria">Bulgaria</option>
                                                        <option value="Greece">Hy Lạp</option>
                                                        <option value="Turkey">Thổ Nhĩ Kỳ</option>
                                                        <option value="Egypt">Ai Cập</option>
                                                        <option value="South Africa">Nam Phi</option>
                                                        <option value="Australia">Úc</option>
                                                        <option value="New Zealand">New Zealand</option>
                                                        <option value="Canada">Canada</option>
                                                        <option value="Mexico">Mexico</option>
                                                        <option value="Brazil">Brazil</option>
                                                        <option value="Argentina">Argentina</option>
                                                        <option value="Chile">Chile</option>
                                                        <option value="Peru">Peru</option>
                                                        <option value="Colombia">Colombia</option>
                                                        <option value="Venezuela">Venezuela</option>
                                                        <option value="Thailand">Thái Lan</option>
                                                        <option value="Malaysia">Malaysia</option>
                                                        <option value="Singapore">Singapore</option>
                                                        <option value="Indonesia">Indonesia</option>
                                                        <option value="Philippines">Philippines</option>
                                                        <option value="Cambodia">Campuchia</option>
                                                        <option value="Laos">Lào</option>
                                                        <option value="Myanmar">Myanmar</option>
                                                    </select>
                                                </div>
                                                <div class="advanced-field" style="display: flex; flex-direction: column; width: 100%;">
                                                    <label for="searchCentury" style="font-weight: 600; color: #e37c2d; margin-bottom: 8px; font-size: 0.9rem; display: flex; align-items: center; justify-content: space-between;">Thế kỷ:</label>
                                                    <select id="searchCentury" style="padding: 10px 12px; border-radius: 6px; border: 2px solid #b0b0b0; background-color: #ffffff; color: #000000; font-size: 0.9rem; width: 100%; box-sizing: border-box;">
                                                        <option value="">Tất cả thế kỷ</option>
                                                        <option value="16">Thế kỷ 16</option>
                                                        <option value="17">Thế kỷ 17</option>
                                                        <option value="18">Thế kỷ 18</option>
                                                        <option value="19">Thế kỷ 19</option>
                                                        <option value="20">Thế kỷ 20</option>
                                                        <option value="21">Thế kỷ 21</option>
                                                    </select>
                                                </div>
                                                <div class="advanced-field" style="display: flex; flex-direction: column; width: 100%;">
                                                    <label for="searchGenre" style="font-weight: 600; color: #e37c2d; margin-bottom: 8px; font-size: 0.9rem; display: flex; align-items: center; justify-content: space-between;">Thể loại:</label>
                                                    <input type="text" id="searchGenre" placeholder="Ví dụ: thơ, tiểu thuyết..." style="padding: 10px 12px; border-radius: 6px; border: 2px solid #b0b0b0; background-color: #ffffff; color: #000000; font-size: 0.9rem; width: 100%; box-sizing: border-box;">
                                                </div>
                                                
                                                <!-- THANH TRƯỢT LỌC THẾ KỶ -->
                                                <div class="advanced-field" style="display: flex; flex-direction: column; width: 100%;">
                                                    <label for="centurySlider" class="info-label" style="font-weight: 600; color: #e37c2d; display: block; margin-bottom: 8px; font-size: 1.1rem;">
                                                        <i class="fas fa-history"></i> Lọc theo thế kỷ:
                                                        <span id="centuryValue" class="info-value" style="font-weight: normal; color: #000000;">Tất cả thế kỷ</span>
                                                    </label>
                                                    <input type="range" id="centurySlider" class="slider" min="0" max="5" value="5" style="width: 100%; margin: 10px 0; -webkit-appearance: none; height: 8px; border-radius: 4px; background: #b0b0b0; outline: none;">
                                                </div>
                                                
                                                <!-- CHẾ ĐỘ TÌM LIÊN HỆ -->
                                                <div class="advanced-field" style="display: flex; flex-direction: column; width: 100%;">
                                                    <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 10px;">
                                                        <label style="font-weight: 600; color: #e37c2d; display: flex; align-items: center; gap: 5px;">
                                                            <i class="fas fa-link"></i> Chế độ tìm liên hệ
                                                        </label>
                                                        <button id="toggleConnectionModeBtn" class="toggle-btn" style="position: relative; display: inline-block; width: 50px; height: 24px; background: none; border: none; cursor: pointer; padding: 0;">
                                                            <span class="toggle-slider" style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: .4s; border-radius: 24px; border: 2px solid #aaa;"></span>
                                                        </button>
                                                    </div>
                                                </div>
                                                
                                                <!-- Panel chế độ liên hệ -->
                                                <div id="connectionModePanel" class="connection-mode" style="display: none; padding: 15px; background-color: rgba(227, 124, 45, 0.1); border-radius: 8px; margin-bottom: 15px; border: 2px solid #e37c2d;">
                                                    <div class="selected-author" id="author1Selection" style="padding: 10px; background-color: rgba(227, 124, 45, 0.15); border-radius: 6px; margin-bottom: 10px; font-weight: 600; color: #e37c2d; border: 1px solid rgba(227, 124, 45, 0.3);">
                                                        <i class="fas fa-user" style="color: #28a745;"></i> Tác giả 1: Chưa chọn
                                                    </div>
                                                    <div class="selected-author" id="author2Selection" style="padding: 10px; background-color: rgba(227, 124, 45, 0.15); border-radius: 6px; margin-bottom: 10px; font-weight: 600; color: #e37c2d; border: 1px solid rgba(227, 124, 45, 0.3);">
                                                        <i class="fas fa-user" style="color: #dc3545;"></i> Tác giả 2: Chưa chọn
                                                    </div>
                                                    <button id="checkConnectionBtn" class="control-btn" disabled style="display: flex; align-items: center; gap: 8px; width: 100%; padding: 12px; margin-bottom: 10px; background-color: #e37c2d; color: white; border: none; border-radius: 8px; font-size: 0.9rem; cursor: pointer; transition: all 0.3s ease; text-align: left;">
                                                        <i class="fas fa-search"></i> Kiểm tra liên hệ
                                                    </button>
                                                    <div id="connectionResult" style="display: none; margin-top: 15px; padding: 15px; background-color: rgba(0,0,0,0.05); border-radius: 8px;"></div>
                                                </div>
                                                
                                                <!-- NÚT VỊ TRÍ VÀ TÌM KIẾM GẦN -->
                                                <div class="location-controls" style="display: flex; gap: 10px; margin-top: 15px; flex-wrap: wrap;">
                                                    <button id="toggleLocationBtn" class="control-btn secondary" style="flex: 1; min-width: 120px; margin-bottom: 0; display: flex; align-items: center; gap: 8px; width: 100%; padding: 12px; margin-bottom: 10px; background-color: #b0b0b0; color: #000000; border: none; border-radius: 8px; font-size: 0.9rem; cursor: pointer; transition: all 0.3s ease; text-align: left;">
                                                        <i class="fas fa-location-crosshairs"></i> Vị trí của tôi
                                                    </button>
                                                    <button id="findNearbyBtn" class="control-btn secondary" style="flex: 1; min-width: 120px; margin-bottom: 0; display: flex; align-items: center; gap: 8px; width: 100%; padding: 12px; margin-bottom: 10px; background-color: #b0b0b0; color: #000000; border: none; border-radius: 8px; font-size: 0.9rem; cursor: pointer; transition: all 0.3s ease; text-align: left;">
                                                        <i class="fas fa-search-location"></i> Tìm tác giả gần tôi (50km)
                                                    </button>
                                                    <button id="refreshDataBtn" class="control-btn secondary" style="flex: 1; min-width: 120px; margin-bottom: 0; display: flex; align-items: center; gap: 8px; width: 100%; padding: 12px; margin-bottom: 10px; background-color: #b0b0b0; color: #000000; border: none; border-radius: 8px; font-size: 0.9rem; cursor: pointer; transition: all 0.3s ease; text-align: left;">
                                                        <i class="fas fa-sync-alt"></i> Tải lại dữ liệu
                                                    </button>
                                                </div>
                                                
                                                <!-- THÊM MỤC HIỂN THỊ THÔNG TIN VỊ TRÍ HIỆN TẠI -->
                                                <div id="currentLocationInfo" style="display: none; margin-top: 15px; padding: 10px; background-color: rgba(66, 133, 244, 0.1); border-radius: 6px; border: 1px solid rgba(66, 133, 244, 0.3);">
                                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                                                        <strong style="color: #4285F4;"><i class="fas fa-map-marker-alt"></i> Vị trí hiện tại:</strong>
                                                        <span id="locationAccuracy" style="font-size: 0.8rem; color: #666;"></span>
                                                    </div>
                                                    <div id="locationCoords" style="font-size: 0.9rem; color: #333;"></div>
                                                    <div id="locationAddress" style="font-size: 0.8rem; color: #666; margin-top: 5px;"></div>
                                                </div>
                                            </div>
                                            <div class="advanced-search-actions" style="display: flex; gap: 10px; margin-top: 15px;">
                                                <button id="applyAdvancedSearch" class="control-btn secondary" style="flex: 2; display: flex; align-items: center; gap: 8px; width: 100%; padding: 12px; margin-bottom: 10px; background-color: #b0b0b0; color: #000000; border: none; border-radius: 8px; font-size: 0.9rem; cursor: pointer; transition: all 0.3s ease; text-align: left;">
                                                    <i class="fas fa-search"></i> Áp dụng
                                                </button>
                                                <button id="clearAdvancedSearch" class="control-btn" style="flex: 1; display: flex; align-items: center; gap: 8px; width: 100%; padding: 12px; margin-bottom: 10px; background-color: #e37c2d; color: white; border: none; border-radius: 8px; font-size: 0.9rem; cursor: pointer; transition: all 0.3s ease; text-align: left;">
                                                    <i class="fas fa-times"></i> Xóa
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <!-- Phần nội dung cuộn được -->
                                    <div class="map-scrollable-content" style="flex: 1; min-height: 0; overflow-y: auto; padding-right: 5px;">
                                        <div id="countryInfoContent" class="author-info-content" style="flex: 1; overflow-y: auto; padding: 15px; background-color: #ffffff; min-height: 200px;">
                                            <div class="firebase-loading" style="text-align: center; padding: 40px 20px; color: #666666; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%;">
                                                <span class="loading-spinner" style="display: inline-block; width: 20px; height: 20px; border: 3px solid rgba(227, 124, 45, 0.3); border-radius: 50%; border-top-color: #e37c2d; animation: spin 1s ease-in-out infinite; margin-right: 10px;"></span>
                                                <p>Đang kết nối với cơ sở dữ liệu văn học...</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Phần bản đồ chính - CHIẾM TOÀN BỘ KHÔNG GIAN -->
                        <div class="map-main" style="flex: 1; min-width: 0; height: 100%; width: 100%;">
                            <div class="map-container" style="height: 100%; width: 100%; position: relative;">
                                <div id="map" style="height: 100%; width: 100%; position: absolute; top: 0; left: 0; right: 0; bottom: 0;"></div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // KHỞI TẠO BẢN ĐỒ NGAY SAU KHI TẠO HTML
            setTimeout(() => {
                console.log('Bắt đầu khởi tạo bản đồ...');
                try {
                    // Kiểm tra xem Leaflet đã được tải chưa
                    if (typeof L === 'undefined') {
                        console.error('Thư viện Leaflet chưa được tải!');
                        const countryInfoContent = document.getElementById('countryInfoContent');
                        if (countryInfoContent) {
                            countryInfoContent.innerHTML = `
                                <div class="info-section" style="margin-bottom: 20px; padding: 15px; background-color: rgba(0, 0, 0, 0.05); border-radius: 8px; border-left: 4px solid #e37c2d;">
                                    <h3 style="color: #ef4444; margin: 0 0 10px 0;">Lỗi tải thư viện</h3>
                                    <p style="color: #000000; line-height: 1.6;">Thư viện bản đồ chưa được tải. Vui lòng tải lại trang.</p>
                                    <button onclick="location.reload()" 
                                            style="margin-top: 15px; padding: 10px 20px; background-color: #e37c2d; color: white; border: none; border-radius: 6px; cursor: pointer;">
                                        <i class="fas fa-redo"></i> Tải lại trang
                                    </button>
                                </div>
                            `;
                        }
                        return;
                    }
                    
                    initLeafletMap();
                    setupMapEventListeners();
                    loadData();
                    console.log('Bản đồ đã được khởi tạo thành công');
                } catch (error) {
                    console.error('Lỗi khi khởi tạo bản đồ:', error);
                    const countryInfoContent = document.getElementById('countryInfoContent');
                    if (countryInfoContent) {
                        countryInfoContent.innerHTML = `
                            <div class="info-section" style="margin-bottom: 20px; padding: 15px; background-color: rgba(0, 0, 0, 0.05); border-radius: 8px; border-left: 4px solid #e37c2d;">
                                <h3 style="color: #ef4444; margin: 0 0 10px 0;">Lỗi khởi tạo bản đồ</h3>
                                <p style="color: #000000; line-height: 1.6;">Không thể khởi tạo bản đồ. Lỗi: ${error.message}</p>
                                <button onclick="initMapPopup()" 
                                        style="margin-top: 15px; padding: 10px 20px; background-color: #e37c2d; color: white; border: none; border-radius: 6px; cursor: pointer;">
                                    <i class="fas fa-redo"></i> Thử lại
                                </button>
                            </div>
                        `;
                    }
                }
            }, 100);
        }
    }

    // Hàm khởi tạo bản đồ Leaflet
    function initLeafletMap() {
        console.log('Đang khởi tạo bản đồ Leaflet...');
        
        const mapElement = document.getElementById('map');
        if (!mapElement) {
            console.error('Không tìm thấy element #map');
            showError('Không tìm thấy container bản đồ');
            return;
        }
        
        try {
            // Đảm bảo container có kích thước đầy đủ
            mapElement.style.height = '100%';
            mapElement.style.width = '100%';
            mapElement.style.position = 'absolute';
            mapElement.style.top = '0';
            mapElement.style.left = '0';
            mapElement.style.right = '0';
            mapElement.style.bottom = '0';
            
            // Xóa bản đồ cũ nếu tồn tại
            if (map) {
                map.remove();
                map = null;
            }
            
            // Tạo bản đồ mới
            map = L.map('map', {
                zoomControl: true,
                attributionControl: true,
                preferCanvas: true,
                center: [16, 106.2],
                zoom: 6,
                minZoom: 3,
                maxZoom: 18,
                fadeAnimation: true,
                zoomAnimation: true
            });
            
            console.log('Bản đồ Leaflet đã được tạo');
            
            // Thêm tile layer với error handling
            const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                maxZoom: 18,
                minZoom: 3
            }).addTo(map);
            
            // Thêm layer backup trong trường hợp OSM không tải được
            osmLayer.on('tileerror', function(error) {
                console.warn('Lỗi tải tile OSM:', error);
            });
            
            // Thêm Hoàng Sa và Trường Sa
            initializeMapWithTerritories();
            
            // Tải dữ liệu địa lý quốc gia
            loadCountryGeoData();
            
            // Fit bounds cho Việt Nam
            const vietnamBounds = L.latLngBounds(
                [8.0, 102.0],
                [23.0, 115.0]
            );
            map.fitBounds(vietnamBounds);
            
            // Force map resize để chiếm toàn bộ không gian
            setTimeout(() => {
                if (map) {
                    map.invalidateSize();
                    map._onResize();
                }
            }, 300);
            
            // Thêm event listener để resize khi window thay đổi kích thước
            window.addEventListener('resize', function() {
                if (map) {
                    setTimeout(() => {
                        map.invalidateSize();
                    }, 100);
                }
            });
            
            console.log('Bản đồ Leaflet đã được khởi tạo hoàn tất');
            
        } catch (error) {
            console.error('Lỗi khi tạo bản đồ Leaflet:', error);
            throw error;
        }
    }

    // Hàm tải dữ liệu địa lý quốc gia
    function loadCountryGeoData() {
        console.log('Đang tải dữ liệu địa lý quốc gia...');
        
        const geoJsonUrl = 'https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json';
        
        const countryInfoContent = document.getElementById('countryInfoContent');
        if (countryInfoContent) {
            countryInfoContent.innerHTML = `
                <div class="firebase-loading" style="text-align: center; padding: 40px 20px; color: #666666; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%;">
                    <span class="loading-spinner" style="display: inline-block; width: 20px; height: 20px; border: 3px solid rgba(227, 124, 45, 0.3); border-radius: 50%; border-top-color: #e37c2d; animation: spin 1s ease-in-out infinite; margin-right: 10px;"></span>
                    <p>Đang tải dữ liệu địa lý quốc gia...</p>
                </div>
            `;
        }
        
        fetch(geoJsonUrl)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Không thể tải dữ liệu địa lý: ' + response.status);
                }
                return response.json();
            })
            .then(data => {
                console.log('Dữ liệu địa lý đã tải thành công');
                
                // Tạo GeoJSON layer
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
                        
                        // LIÊN KẾT QUAN TRỌNG: Click vào quốc gia sẽ hiển thị thông tin quốc gia và tác giả
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
                
                if (countryInfoContent) {
                    countryInfoContent.innerHTML = `
                        <div class="info-section" style="margin-bottom: 20px; padding: 15px; background-color: rgba(0, 0, 0, 0.05); border-radius: 8px; border-left: 4px solid #e37c2d;">
                            <h3 style="margin: 0 0 15px 0; color: #e37c2d; display: flex; align-items: center; gap: 10px;">
                                <i class="fas fa-globe-asia"></i> Bản đồ Văn học
                            </h3>
                            <p style="color: #666666; line-height: 1.6;">
                                Đã tải ${Object.keys(countryLayers).length} quốc gia. Nhấp vào một quốc gia trên bản đồ để xem thông tin văn học và các tác giả nổi bật.
                            </p>
                        </div>
                    `;
                }
                
            })
            .catch(error => {
                console.error('Lỗi tải dữ liệu địa lý quốc gia:', error);
                if (countryInfoContent) {
                    countryInfoContent.innerHTML = `
                        <div class="info-section" style="margin-bottom: 20px; padding: 15px; background-color: rgba(0, 0, 0, 0.05); border-radius: 8px; border-left: 4px solid #e37c2d;">
                            <h3 style="margin: 0 0 15px 0; color: #e37c2d; display: flex; align-items: center; gap: 10px;">
                                <i class="fas fa-globe-asia"></i> Bản đồ Văn học
                            </h3>
                            <p style="color: #666666; line-height: 1.6;">
                                Bản đồ đã sẵn sàng. Bạn có thể tìm kiếm tác giả hoặc sử dụng các tính năng khác.
                            </p>
                        </div>
                    `;
                }
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

    // Hàm hiển thị thông tin quốc gia và LIÊN KẾT VỚI TÁC GIẢ
    async function showCountryInfo(countryName) {
        const countryInfoContent = document.getElementById('countryInfoContent');
        
        if (!countryInfoContent) {
            console.error('Không tìm thấy countryInfoContent');
            return;
        }
        
        try {
            // LIÊN KẾT QUAN TRỌNG: Lọc tác giả theo quốc gia
            const countryAuthors = authors.filter(author => {
                if (!author.country) return false;
                
                // Chuyển đổi tên quốc gia cho phù hợp
                const authorCountry = author.country.trim();
                const searchCountry = countryName.trim();
                
                // Kiểm tra khớp chính xác
                if (authorCountry.toLowerCase() === searchCountry.toLowerCase()) {
                    return true;
                }
                
                // Kiểm tra với bản đồ chuyển đổi
                const vietnameseName = translateToVietnamese(searchCountry);
                if (authorCountry.toLowerCase() === vietnameseName.toLowerCase()) {
                    return true;
                }
                
                // Kiểm tra nếu có chứa
                if (authorCountry.toLowerCase().includes(searchCountry.toLowerCase()) || 
                    searchCountry.toLowerCase().includes(authorCountry.toLowerCase())) {
                    return true;
                }
                
                // Kiểm tra tên tiếng Anh
                const englishName = translateToEnglish(countryName);
                if (authorCountry.toLowerCase() === englishName.toLowerCase()) {
                    return true;
                }
                
                return false;
            });
            
            console.log(`Tìm thấy ${countryAuthors.length} tác giả cho quốc gia: ${countryName}`);
            
            const historyInfo = historyData[countryName] || 
                               historyData[translateToVietnamese(countryName)] || 
                               { history: "Chưa có thông tin lịch sử văn học cho quốc gia này." };
            
            let countryInfoHTML = `
                <div class="info-section" style="margin-bottom: 20px; padding: 15px; background-color: rgba(0, 0, 0, 0.05); border-radius: 8px; border-left: 4px solid #e37c2d;">
                    <h3 style="margin: 0 0 15px 0; color: #e37c2d; display: flex; align-items: center; gap: 10px;">
                        <i class="fas fa-flag"></i> ${countryName}
                    </h3>
                    
                    <div class="info-section" style="margin-bottom: 20px; padding: 15px; background-color: rgba(0, 0, 0, 0.05); border-radius: 8px; border-left: 4px solid #e37c2d;">
                        <span class="info-label" style="font-weight: 600; color: #e37c2d; display: block; margin-bottom: 8px; font-size: 1.1rem;"><i class="fas fa-book"></i> Lịch sử văn học:</span>
                        <div class="short-bio" style="max-height: 200px; overflow-y: auto; padding: 12px; background-color: rgba(0, 0, 0, 0.03); border-radius: 6px; margin: 10px 0; line-height: 1.6; font-size: 0.95rem; border: 1px solid #b0b0b0;">
                            <p>${historyInfo.history || historyInfo || "Chưa có thông tin lịch sử văn học."}</p>
                        </div>
                    </div>
                    
                    <div class="info-section" style="margin-bottom: 20px; padding: 15px; background-color: rgba(0, 0, 0, 0.05); border-radius: 8px; border-left: 4px solid #e37c2d;">
                        <span class="info-label" style="font-weight: 600; color: #e37c2d; display: block; margin-bottom: 8px; font-size: 1.1rem;"><i class="fas fa-users"></i> Tác giả nổi bật (${countryAuthors.length}):</span>
                        <div style="margin-top: 10px;">
            `;
            
            if (countryAuthors.length > 0) {
                countryInfoHTML += `
                    <div style="max-height: 300px; overflow-y: auto;">
                        ${countryAuthors.slice(0, 10).map(author => `
                            <div class="nearby-author" onclick="window.mapPopupShowAuthorInfo('${author.id}')" style="padding: 10px 12px; margin: 8px 0; background-color: rgba(227, 124, 45, 0.1); border-radius: 6px; cursor: pointer; transition: all 0.3s ease; border: 1px solid rgba(227, 124, 45, 0.2); display: flex; justify-content: space-between; align-items: center;">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <span style="font-weight: 600;">${author.name}</span>
                                    <small style="color: #666666; margin-left: 10px;">${author.century ? 'Thế kỷ ' + author.century : ''}</small>
                                </div>
                            </div>
                        `).join('')}
                        ${countryAuthors.length > 10 ? 
                            `<div style="text-align: center; padding: 10px; color: #666666; font-size: 0.9rem;">
                                ...và ${countryAuthors.length - 10} tác giả khác
                            </div>` : ''}
                    </div>
                `;
            } else {
                countryInfoHTML += `
                    <p style="color: #666666; text-align: center; padding: 20px;">
                        Chưa có thông tin tác giả cho quốc gia "${countryName}".
                        Có thể tên quốc gia không khớp với dữ liệu. Thử tìm kiếm tác giả theo quốc gia khác.
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
                <div class="info-section" style="margin-bottom: 20px; padding: 15px; background-color: rgba(0, 0, 0, 0.05); border-radius: 8px; border-left: 4px solid #e37c2d;">
                    <h3 style="color: #ef4444; margin: 0 0 10px 0;">Lỗi</h3>
                    <p style="color: #000000; line-height: 1.6;">Không thể tải thông tin quốc gia. Vui lòng thử lại sau.</p>
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

    // Hàm dịch tên quốc gia sang tiếng Anh
    function translateToEnglish(countryName) {
        const countryMap = {
            'Việt Nam': 'Vietnam',
            'Mỹ': 'United States',
            'Anh': 'United Kingdom',
            'Pháp': 'France',
            'Đức': 'Germany',
            'Nga': 'Russia',
            'Trung Quốc': 'China',
            'Nhật Bản': 'Japan',
            'Hàn Quốc': 'South Korea',
            'Ấn Độ': 'India',
            'Ý': 'Italy',
            'Tây Ban Nha': 'Spain',
            'Bồ Đào Nha': 'Portugal',
            'Hà Lan': 'Netherlands',
            'Bỉ': 'Belgium',
            'Thụy Sĩ': 'Switzerland',
            'Thụy Điển': 'Sweden',
            'Na Uy': 'Norway',
            'Đan Mạch': 'Denmark',
            'Phần Lan': 'Finland',
            'Ba Lan': 'Poland',
            'Cộng hòa Séc': 'Czech Republic',
            'Áo': 'Austria',
            'Hungary': 'Hungary',
            'Romania': 'Romania',
            'Bulgaria': 'Bulgaria',
            'Hy Lạp': 'Greece',
            'Thổ Nhĩ Kỳ': 'Turkey',
            'Ai Cập': 'Egypt',
            'Nam Phi': 'South Africa',
            'Úc': 'Australia',
            'New Zealand': 'New Zealand',
            'Canada': 'Canada',
            'Mexico': 'Mexico',
            'Brazil': 'Brazil',
            'Argentina': 'Argentina',
            'Chile': 'Chile',
            'Peru': 'Peru',
            'Colombia': 'Colombia',
            'Venezuela': 'Venezuela',
            'Thái Lan': 'Thailand',
            'Malaysia': 'Malaysia',
            'Singapore': 'Singapore',
            'Indonesia': 'Indonesia',
            'Philippines': 'Philippines',
            'Campuchia': 'Cambodia',
            'Lào': 'Laos',
            'Myanmar': 'Myanmar'
        };
        
        return countryMap[countryName] || countryName;
    }

    // Hàm hiển thị lỗi
    function showError(message) {
        const countryInfoContent = document.getElementById('countryInfoContent');
        if (countryInfoContent) {
            countryInfoContent.innerHTML = `
                <div class="info-section" style="margin-bottom: 20px; padding: 15px; background-color: rgba(0, 0, 0, 0.05); border-radius: 8px; border-left: 4px solid #e37c2d;">
                    <h3 style="color: #ef4444; margin: 0 0 10px 0;">Lỗi</h3>
                    <p style="color: #000000; line-height: 1.6;">${message}</p>
                    <button onclick="loadData()" 
                            style="margin-top: 15px; padding: 10px 20px; background-color: #e37c2d; color: white; border: none; border-radius: 6px; cursor: pointer;">
                        <i class="fas fa-redo"></i> Thử lại
                    </button>
                </div>
            `;
        }
    }

    // Hàm tải dữ liệu từ Firestore với LIÊN KẾT TÁC GIẢ - QUỐC GIA
    async function loadData() {
        try {
            const countryInfoContent = document.getElementById('countryInfoContent');
            
            console.log('Đang tải dữ liệu từ Firestore...');
            
            if (countryInfoContent) {
                countryInfoContent.innerHTML = `
                    <div class="firebase-loading" style="text-align: center; padding: 40px 20px; color: #666666; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%;">
                        <span class="loading-spinner" style="display: inline-block; width: 20px; height: 20px; border: 3px solid rgba(227, 124, 45, 0.3); border-radius: 50%; border-top-color: #e37c2d; animation: spin 1s ease-in-out infinite; margin-right: 10px;"></span>
                        <p>Đang kết nối với cơ sở dữ liệu văn học...</p>
                    </div>
                `;
            }
            
            if (!db) {
                console.error('Firebase chưa được khởi tạo');
                throw new Error('Firebase chưa được khởi tạo');
            }
            
            // Load authors với country field - LIÊN KẾT CHÍNH
            const authorsSnapshot = await db.collection('authors').get();
            authors = [];
            authorsSnapshot.forEach(doc => {
                const data = doc.data();
                
                // Đảm bảo country field tồn tại
                if (!data.country) {
                    console.warn(`Tác giả ${data.name} không có trường country`);
                    data.country = 'Không xác định';
                }
                
                // Xử lý birthPlace
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
                
                console.log(`Tác giả: ${data.name}, Quốc gia: ${data.country}, Vị trí:`, data.birthPlace);
            });
            
            console.log(`Tổng số tác giả: ${authors.length}`);
            console.log(`Số tác giả có country: ${authors.filter(a => a.country && a.country !== 'Không xác định').length}`);
            console.log(`Số tác giả có vị trí: ${authors.filter(a => a.birthPlace && a.birthPlace.lat && a.birthPlace.lng).length}`);
            
            // Load history data
            const historySnapshot = await db.collection('history').get();
            historyData = {};
            historySnapshot.forEach(doc => {
                historyData[doc.id] = doc.data();
            });
            
            console.log('Dữ liệu đã tải:', authors.length, 'tác giả');
            
            if (countryInfoContent) {
                countryInfoContent.innerHTML = `
                    <div class="info-section" style="margin-bottom: 20px; padding: 15px; background-color: rgba(0, 0, 0, 0.05); border-radius: 8px; border-left: 4px solid #e37c2d;">
                        <h3 style="margin: 0 0 15px 0; color: #e37c2d; display: flex; align-items: center; gap: 10px;">
                            <i class="fas fa-globe-asia"></i> Bản đồ Văn học
                        </h3>
                        <p style="color: #666666; line-height: 1.6;">
                            Nhấp vào một quốc gia trên bản đồ để xem thông tin văn học và các tác giả nổi bật.
                        </p>
                        <div style="margin-top: 20px; padding: 15px; background-color: rgba(227, 124, 45, 0.1); border-radius: 8px;">
                            <p style="margin: 0; color: #000000; line-height: 1.6;">
                                <i class="fas fa-lightbulb"></i> <strong>Mẹo:</strong> Bạn cũng có thể tìm kiếm tác giả bằng ô tìm kiếm phía trên.
                            </p>
                        </div>
                        <div style="margin-top: 10px; padding: 10px; background-color: rgba(66, 133, 244, 0.1); border-radius: 6px;">
                            <p style="margin: 0; color: #4285F4; font-size: 0.9rem; line-height: 1.6;">
                                <i class="fas fa-info-circle"></i> Đã tải ${authors.length} tác giả, 
                                ${authors.filter(a => a.country && a.country !== 'Không xác định').length} tác giả có quốc gia, 
                                ${authors.filter(a => a.birthPlace && a.birthPlace.lat && a.birthPlace.lng).length} tác giả có vị trí trên bản đồ.
                            </p>
                        </div>
                    </div>
                `;
            }
            
            // Load dữ liệu địa lý quốc gia sau khi có authors
            setTimeout(() => {
                loadCountryGeoData();
            }, 500);
            
            displayAuthors();
            
        } catch (error) {
            console.error('Lỗi tải dữ liệu:', error);
            showError('Không thể kết nối với cơ sở dữ liệu. Vui lòng kiểm tra kết nối internet. Lỗi: ' + error.message);
        }
    }

    // Hàm hiển thị tác giả trên bản đồ
    function displayAuthors() {
        // Xóa markers cũ
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
                
                // Kiểm tra tọa độ hợp lệ
                if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
                    const marker = L.marker([lat, lng], { 
                        icon: defaultIcon,
                        title: author.name
                    }).addTo(map);
                    
                    // Popup hiển thị quốc gia của tác giả
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

    // Hàm thêm marker cho tác giả mới
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

    // Hàm tạo popup content với thông tin quốc gia
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

    // Hàm hiển thị thông tin tác giả trong sidebar với LIÊN KẾT QUỐC GIA
    function showAuthorInfo(author) {
        const countryInfoContent = document.getElementById('countryInfoContent');
        
        if (!countryInfoContent) {
            console.error('Không tìm thấy countryInfoContent');
            return;
        }
        
        countryInfoContent.innerHTML = `
            <div class="info-section" style="margin-bottom: 20px; padding: 15px; background-color: rgba(0, 0, 0, 0.05); border-radius: 8px; border-left: 4px solid #e37c2d;">
                <h3 style="margin: 0 0 15px 0; color: #e37c2d; display: flex; align-items: center; gap: 10px;">
                    <i class="fas fa-user-circle"></i> ${author.name}
                </h3>
                
                ${author.image ? `
                    <img src="${author.image}" alt="${author.name}" 
                         style="width: 100%; max-height: 200px; object-fit: cover; border-radius: 8px; margin-bottom: 15px;">
                ` : ''}
                
                <div class="short-bio" style="max-height: 200px; overflow-y: auto; padding: 12px; background-color: rgba(0, 0, 0, 0.03); border-radius: 6px; margin: 10px 0; line-height: 1.6; font-size: 0.95rem; border: 1px solid #b0b0b0;">
                    <p>${author.bio || 'Chưa có thông tin tiểu sử.'}</p>
                </div>
                
                ${author.works && author.works.length > 0 ? `
                    <div class="info-section" style="margin-top: 15px; margin-bottom: 20px; padding: 15px; background-color: rgba(0, 0, 0, 0.05); border-radius: 8px; border-left: 4px solid #e37c2d;">
                        <h4 style="margin: 0 0 10px 0; color: #e37c2d;">
                            <i class="fas fa-book"></i> Tác phẩm tiêu biểu
                        </h4>
                        <ul class="works-list" style="padding-left: 20px; margin: 10px 0;">
                            ${author.works.map(work => `<li style="margin-bottom: 5px; padding: 3px 0; color: #000000;">${work}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 15px;">
                    ${author.country ? `
                        <div style="background-color: rgba(227, 124, 45, 0.1); padding: 10px; border-radius: 6px; text-align: center;">
                            <div style="font-weight: 600; color: #e37c2d; font-size: 0.9rem;">Quốc gia</div>
                            <div style="font-size: 1.1rem; font-weight: 600;">${author.country}</div>
                        </div>
                    ` : ''}
                    
                    ${author.century ? `
                        <div style="background-color: rgba(227, 124, 45, 0.1); padding: 10px; border-radius: 6px; text-align: center;">
                            <div style="font-weight: 600; color: #e37c2d; font-size: 0.9rem;">Thế kỷ</div>
                            <div style="font-size: 1.1rem; font-weight: 600;">${author.century}</div>
                        </div>
                    ` : ''}
                </div>
                
                ${author.birthPlace && author.birthPlace.lat && author.birthPlace.lng ? `
                    <button onclick="window.mapPopupShowAuthorInfoAndZoom('${author.id}')"
                            style="margin-top: 15px; width: 100%; padding: 10px; background-color: #e37c2d; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 1rem;">
                        <i class="fas fa-map-marker-alt"></i> Xem trên bản đồ
                    </button>
                ` : ''}
                
                ${author.country && author.country !== 'Không xác định' ? `
                    <button onclick="highlightCountry('${author.country}'); showCountryInfo('${author.country}');"
                            style="margin-top: 10px; width: 100%; padding: 10px; background-color: #4285F4; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 1rem;">
                        <i class="fas fa-flag"></i> Xem các tác giả cùng quốc gia
                    </button>
                ` : ''}
            </div>
        `;
        
        countryInfoContent.scrollTop = 0;
        
        // Tự động highlight quốc gia của tác giả
        if (author.country && author.country !== 'Không xác định') {
            setTimeout(() => {
                highlightCountry(author.country);
            }, 300);
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
            author.name.toLowerCase().includes(lowerSearchTerm) ||
            (author.country && author.country.toLowerCase().includes(lowerSearchTerm)) ||
            (author.works && author.works.some(work => work.toLowerCase().includes(lowerSearchTerm)))
        );
        
        const countryInfoContent = document.getElementById('countryInfoContent');
        
        if (!countryInfoContent) return;
        
        if (filteredAuthors.length === 0) {
            countryInfoContent.innerHTML = `
                <div class="info-section" style="margin-bottom: 20px; padding: 15px; background-color: rgba(0, 0, 0, 0.05); border-radius: 8px; border-left: 4px solid #e37c2d;">
                    <h3 style="color: #666666; margin: 0 0 10px 0;">Không tìm thấy tác giả</h3>
                    <p style="color: #000000; line-height: 1.6;">Không tìm thấy tác giả nào với từ khóa "${searchTerm}"</p>
                </div>
            `;
            return;
        }
        
        countryInfoContent.innerHTML = `
            <div class="info-section" style="margin-bottom: 20px; padding: 15px; background-color: rgba(0, 0, 0, 0.05); border-radius: 8px; border-left: 4px solid #e37c2d;">
                <h3 style="margin-bottom: 15px; color: #e37c2d;">
                    <i class="fas fa-search"></i> Kết quả tìm kiếm: "${searchTerm}" (${filteredAuthors.length} kết quả)
                </h3>
                <div style="display: flex; flex-direction: column; gap: 10px;">
                    ${filteredAuthors.map(author => `
                        <div class="nearby-author" onclick="window.mapPopupShowAuthorInfo('${author.id}')" style="padding: 10px 12px; margin: 8px 0; background-color: rgba(227, 124, 45, 0.1); border-radius: 6px; cursor: pointer; transition: all 0.3s ease; border: 1px solid rgba(227, 124, 45, 0.2); display: flex; justify-content: space-between; align-items: center;">
                            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                                <div>
                                    <strong>${author.name}</strong>
                                    ${author.country ? `<div style="font-size: 0.8rem; color: #666666;">${author.country}</div>` : ''}
                                </div>
                                <small style="color: #666666;">${author.century ? 'Thế kỷ ' + author.century : ''}</small>
                            </div>
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

    // Hàm vẽ đường kết nối
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
                <div class="loading-spinner" style="display: inline-block; width: 20px; height: 20px; border: 3px solid rgba(227, 124, 45, 0.3); border-radius: 50%; border-top-color: #e37c2d; animation: spin 1s ease-in-out infinite; margin-right: 10px;"></div>
                <p style="margin-top: 10px; color: #666666;">Đang phân tích mối liên hệ...</p>
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
                    <h4 style="margin: 0 0 10px 0; color: #e37c2d;">
                        <i class="fas fa-link"></i> Mối liên hệ giữa ${selectedAuthor1.name} và ${selectedAuthor2.name}
                    </h4>
                    <div style="line-height: 1.6; font-size: 0.95rem; color: #000000;">
                        ${connectionText}
                    </div>
                `;
            } else {
                connectionResult.innerHTML = `
                    <p style="color: #666666; text-align: center;">
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
        const refreshDataBtn = document.getElementById('refreshDataBtn');
        
        if (toggleLocationBtn) {
            toggleLocationBtn.addEventListener('click', toggleUserLocation);
        }
        
        if (findNearbyBtn) {
            findNearbyBtn.addEventListener('click', findAndShowNearbyAuthors);
        }
        
        if (refreshDataBtn) {
            refreshDataBtn.addEventListener('click', () => {
                loadData();
                showNotification('Đang tải lại dữ liệu...', 'info');
            });
        }
        
        console.log('Event listeners đã được thiết lập');
    }

    // Hàm hiển thị thông báo
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
                div.style.cssText = 'padding: 10px 15px; cursor: pointer; border-bottom: 1px solid #c0c0c0; transition: background-color 0.3s ease;';
                div.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="width: 8px; height: 8px; border-radius: 50%; background-color: #e37c2d;"></div>
                        <span>${author.name}</span>
                        <small style="margin-left: auto; color: #666666;">${author.country}</small>
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
        wikiDiv.style.cssText = 'padding: 10px 15px; cursor: pointer; border-bottom: 1px solid #c0c0c0; transition: background-color 0.3s ease; background-color: rgba(227, 124, 45, 0.1); color: #e37c2d; font-weight: bold; border-top: 2px solid #e37c2d;';
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
            <div class="firebase-loading" style="text-align: center; padding: 40px 20px; color: #666666; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%;">
                <span class="loading-spinner" style="display: inline-block; width: 20px; height: 20px; border: 3px solid rgba(227, 124, 45, 0.3); border-radius: 50%; border-top-color: #e37c2d; animation: spin 1s ease-in-out infinite; margin-right: 10px;"></span>
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
                id: authors.length + 1,
                name: pageTitle,
                bio: `Thông tin từ Wikipedia về ${pageTitle}. Đang cập nhật đầy đủ...`,
                works: [],
                birthPlace: { lat: 16, lng: 106.2 },
                country: "Vietnam",
                century: 20,
                image: null,
                connections: []
            };
            
            authors.push(newAuthor);
            addAuthorMarker(newAuthor);
            showAuthorInfo(newAuthor);
            
        } catch (error) {
            console.error('Lỗi khi tìm kiếm Wikipedia:', error);
            countryInfoContent.innerHTML = `
                <div class="info-section" style="margin-bottom: 20px; padding: 15px; background-color: rgba(0, 0, 0, 0.05); border-radius: 8px; border-left: 4px solid #e37c2d;">
                    <h3 style="color: #ef4444; margin: 0 0 10px 0;">Lỗi tìm kiếm</h3>
                    <p style="color: #000000; line-height: 1.6;">Không thể tìm thấy thông tin cho "${authorName}" trên Wikipedia.</p>
                    <p style="color: #000000; line-height: 1.6;">Vui lòng thử lại với tên khác hoặc kiểm tra kết nối internet.</p>
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
                <div class="info-section" style="margin-bottom: 20px; padding: 15px; background-color: rgba(0, 0, 0, 0.05); border-radius: 8px; border-left: 4px solid #e37c2d;">
                    <h3 style="margin: 0 0 15px 0; color: #e37c2d; display: flex; align-items: center; gap: 10px;">
                        <i class="fas fa-globe-asia"></i> Bản đồ Văn học
                    </h3>
                    <p style="color: #666666; line-height: 1.6;">
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
                <div class="info-section" style="margin-bottom: 20px; padding: 15px; background-color: rgba(0, 0, 0, 0.05); border-radius: 8px; border-left: 4px solid #e37c2d;">
                    <h3 style="color: #666666; margin: 0 0 10px 0;">Không tìm thấy tác giả</h3>
                    <p style="color: #000000; line-height: 1.6;">Không tìm thấy tác giả nào phù hợp với tiêu chí tìm kiếm.</p>
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
            <div class="info-section" style="margin-bottom: 20px; padding: 15px; background-color: rgba(0, 0, 0, 0.05); border-radius: 8px; border-left: 4px solid #e37c2d;">
                <h3 style="margin-bottom: 15px; color: #e37c2d;">
                    <i class="fas fa-search"></i> Kết quả tìm kiếm (${filteredAuthors.length} tác giả)
                </h3>
                <div style="display: flex; flex-direction: column; gap: 10px; max-height: 400px; overflow-y: auto;">
                    ${filteredAuthors.map(author => `
                        <div class="nearby-author" onclick="window.mapPopupShowAuthorInfo('${author.id}')" style="padding: 10px 12px; margin: 8px 0; background-color: rgba(227, 124, 45, 0.1); border-radius: 6px; cursor: pointer; transition: all 0.3s ease; border: 1px solid rgba(227, 124, 45, 0.2); display: flex; justify-content: space-between; align-items: center;">
                            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                                <span style="font-weight: 600;">${author.name}</span>
                                <small style="color: #666666;">${author.country} • Thế kỷ ${author.century}</small>
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

    // Xuất hàm ra global scope để gọi từ popup
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

    window.zoomToAuthorLocation = zoomToAuthorLocation;

    // Khởi tạo popup bản đồ khi mở
    const originalOpenPopup = window.openPopup;
    if (originalOpenPopup) {
        window.openPopup = function(menuId) {
            originalOpenPopup(menuId);
            if (menuId === 'mapMenu') {
                console.log('Mở popup bản đồ, sẽ khởi tạo sau 300ms...');
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
    
    console.log('=== MAP POPUP SCRIPT ĐÃ TẢI XONG VÀ SẴN SÀNG - TOÀN BỘ CODE ĐẦY ĐỦ ===');
});
