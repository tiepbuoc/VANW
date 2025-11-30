// JavaScript cho popup bản đồ văn học
document.addEventListener('DOMContentLoaded', function() {
    // Dữ liệu mẫu cho bản đồ văn học
    const literaryData = {
        periods: [
            {
                id: 1,
                name: "Văn học dân gian",
                years: "Trước thế kỷ X",
                authors: "Truyền khẩu",
                color: "#f28b3d",
                description: "Các tác phẩm văn học được lưu truyền bằng miệng qua nhiều thế hệ"
            },
            {
                id: 2,
                name: "Văn học trung đại",
                years: "Thế kỷ X - XIX",
                authors: "Nguyễn Trãi, Nguyễn Du, Hồ Xuân Hương...",
                color: "#f5a742",
                description: "Văn học chữ Hán và chữ Nôm, chịu ảnh hưởng của văn học Trung Quốc"
            },
            {
                id: 3,
                name: "Văn học cận đại",
                years: "Đầu thế kỷ XX - 1945",
                authors: "Tản Đà, Phan Bội Châu, Nguyễn Ái Quốc...",
                color: "#f8c34d",
                description: "Giai đoạn chuyển giao giữa văn học trung đại và hiện đại"
            },
            {
                id: 4,
                name: "Văn học hiện đại",
                years: "1945 - nay",
                authors: "Tô Hoài, Nguyễn Minh Châu, Nguyễn Nhật Ánh...",
                color: "#fad859",
                description: "Văn học chữ Quốc ngữ với nhiều thể loại và phong cách đa dạng"
            }
        ],
        regions: [
            {
                name: "Miền Bắc",
                works: 45,
                authors: 28,
                color: "#0077ff"
            },
            {
                name: "Miền Trung",
                works: 32,
                authors: 19,
                color: "#00aaff"
            },
            {
                name: "Miền Nam",
                works: 38,
                authors: 22,
                color: "#00ddff"
            }
        ]
    };

    // Hàm khởi tạo bản đồ
    function initMapPopup() {
        const popupContent = document.getElementById('popupContent');
        
        if (popupContent && document.getElementById('popupTitle').textContent === 'Bản đồ văn học') {
            // Tạo nội dung cho popup bản đồ
            popupContent.innerHTML = `
                <div class="map-popup">
                    <div class="search-box">
                        <input type="text" class="search-input" placeholder="Tìm kiếm tác giả, tác phẩm...">
                    </div>
                    
                    <div class="map-container">
                        <p>Bản đồ văn học Việt Nam</p>
                        <!-- Ở đây có thể tích hợp bản đồ thực tế với các thư viện như Leaflet, Google Maps, v.v. -->
                    </div>
                    
                    <div class="map-legend">
                        ${literaryData.regions.map(region => `
                            <div class="legend-item">
                                <div class="legend-color" style="background-color: ${region.color};"></div>
                                <div class="legend-text">
                                    <strong>${region.name}</strong><br>
                                    ${region.works} tác phẩm, ${region.authors} tác giả
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    
                    <h3 style="color: var(--primary-color); margin-bottom: 15px;">Các giai đoạn văn học</h3>
                    <div class="period-list">
                        ${literaryData.periods.map(period => `
                            <div class="period-card">
                                <div class="period-title">${period.name}</div>
                                <div class="period-years">${period.years}</div>
                                <div class="period-authors">
                                    <strong>Tác giả tiêu biểu:</strong> ${period.authors}
                                </div>
                                <p style="margin-top: 8px; font-size: 0.85rem; color: var(--text-secondary);">
                                    ${period.description}
                                </p>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;

            // Thêm sự kiện tìm kiếm
            const searchInput = popupContent.querySelector('.search-input');
            searchInput.addEventListener('input', function(e) {
                const searchTerm = e.target.value.toLowerCase();
                filterLiteraryData(searchTerm);
            });
        }
    }

    // Hàm lọc dữ liệu văn học
    function filterLiteraryData(searchTerm) {
        const periodCards = document.querySelectorAll('.period-card');
        
        periodCards.forEach(card => {
            const cardText = card.textContent.toLowerCase();
            if (cardText.includes(searchTerm)) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    }

    // Khởi tạo popup bản đồ khi mở
    const originalOpenPopup = window.openPopup;
    window.openPopup = function(menuId) {
        originalOpenPopup(menuId);
        setTimeout(initMapPopup, 100);
    };

    // Khởi tạo ngay nếu popup đã mở
    if (document.getElementById('popupTitle').textContent === 'Bản đồ văn học') {
        initMapPopup();
    }
});