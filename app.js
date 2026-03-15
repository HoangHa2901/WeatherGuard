const WINDY_API_KEY = "uRiiQg116y4rTLG8ojJjh737LE6Dkj7p";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCoX8NMuB07AJzbTlXs0LckaNW-m4VGSCM",
  authDomain: "weatherguard-app.firebaseapp.com",
  databaseURL: "https://weatherguard-app-default-rtdb.firebaseio.com",
  projectId: "weatherguard-app",
  storageBucket: "weatherguard-app.firebasestorage.app",
  messagingSenderId: "265208282331",
  appId: "1:265208282331:web:0879e46f0158240ff7a0fe",
  measurementId: "G-93C86FNBCP"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const analytics = firebase.analytics();

const defaultCoords = {
  lat: 21.0278,
  lon: 105.8342
};

let currentLat = null;
let currentLon = null;
let isShowingCurrentWeather = true;
let isSharingLocation = false;
let locationShareInterval = null;
let familyMembers = [];
let currentRiskScore = 0;

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOMContentLoaded fired");
  
  try {
    initSOS();
    console.log("initSOS hoàn tất");
  } catch (err) {
    console.error("Lỗi initSOS:", err);
  }
  
  try {
    initRiskInfo();
    console.log("initRiskInfo hoàn tất");
  } catch (err) {
    console.error("Lỗi initRiskInfo:", err);
  }
  
  try {
    initApp();
    console.log("initApp hoàn tất");
  } catch (err) {
    console.error("Lỗi initApp:", err);
  }

  try {
    initFamilyLocation();
    console.log("initFamilyLocation hoàn tất");
  } catch (err) {
    console.error("Lỗi initFamilyLocation:", err);
  }

  try {
    initTestSliders();
    console.log("initTestSliders hoàn tất");
  } catch (err) {
    console.error("Lỗi initTestSliders:", err);
  }
});

// Family Location Sharing Functions
function initFamilyLocation() {
  console.log("initFamilyLocation() được gọi");
  
  // Load danh sách người thân từ localStorage
  loadFamilyMembers();
  
  // Hiển thị user ID của bản thân
  displayCurrentUserId();
  
  // Khởi tạo các event listeners
  const shareToggle = document.getElementById("share-location-toggle");
  const addFamilyBtn = document.getElementById("add-family-btn");
  const addFamilyModal = document.getElementById("add-family-modal");
  const cancelAddFamily = document.getElementById("cancel-add-family");
  const addFamilyForm = document.getElementById("add-family-form");
  const copyUserIdBtn = document.getElementById("copy-user-id");
  
  if (shareToggle) {
    shareToggle.addEventListener("change", toggleLocationSharing);
  }
  
  if (addFamilyBtn) {
    addFamilyBtn.addEventListener("click", () => {
      addFamilyModal.classList.remove("hidden");
    });
  }
  
  if (cancelAddFamily) {
    cancelAddFamily.addEventListener("click", () => {
      addFamilyModal.classList.add("hidden");
      addFamilyForm.reset();
    });
  }
  
  if (addFamilyForm) {
    addFamilyForm.addEventListener("submit", handleAddFamilyMember);
  }
  
  if (copyUserIdBtn) {
    copyUserIdBtn.addEventListener("click", copyUserId);
  }
  
  // Đóng modal khi click ra ngoài
  if (addFamilyModal) {
    addFamilyModal.addEventListener("click", (e) => {
      if (e.target === addFamilyModal) {
        addFamilyModal.classList.add("hidden");
        addFamilyForm.reset();
      }
    });
  }
  
  renderFamilyList();
}

function displayCurrentUserId() {
  const userIdElement = document.getElementById("current-user-id");
  if (userIdElement) {
    const userId = getCurrentUserId();
    userIdElement.textContent = userId;
  }
}

function copyUserId() {
  const userId = getCurrentUserId();
  navigator.clipboard.writeText(userId)
    .then(() => {
      // Hiển thị thông báo thành công
      const copyBtn = document.getElementById("copy-user-id");
      const originalText = copyBtn.textContent;
      copyBtn.textContent = "✅ Đã copy!";
      copyBtn.style.background = "#10b981";
      
      setTimeout(() => {
        copyBtn.textContent = originalText;
        copyBtn.style.background = "#3b82f6";
      }, 2000);
    })
    .catch(err => {
      console.error("Lỗi copy user ID:", err);
      alert("Không thể copy User ID. Vui lòng copy thủ công.");
    });
}

function toggleLocationSharing() {
  const toggle = document.getElementById("share-location-toggle");
  isSharingLocation = toggle.checked;
  
  if (isSharingLocation) {
    startLocationSharing();
  } else {
    stopLocationSharing();
  }
}

function startLocationSharing() {
  console.log("Bắt đầu chia sẻ vị trí");
  
  if (!currentLat || !currentLon) {
    alert("Vui lòng lấy vị trí của bạn trước khi chia sẻ");
    document.getElementById("share-location-toggle").checked = false;
    isSharingLocation = false;
    return;
  }
  
  // Cập nhật vị trí ngay lập tức
  updateSharedLocation();
  
  // Cập nhật vị trí mỗi 30 giây
  locationShareInterval = setInterval(updateSharedLocation, 30000);
}

function stopLocationSharing() {
  console.log("Dừng chia sẻ vị trí");
  
  if (locationShareInterval) {
    clearInterval(locationShareInterval);
    locationShareInterval = null;
  }
}

function updateSharedLocation() {
  if (!currentLat || !currentLon) return;
  
  const userId = getCurrentUserId();
  const locationData = {
    lat: currentLat,
    lon: currentLon,
    timestamp: Date.now(),
    accuracy: 10, // meters
    batteryLevel: navigator.battery ? navigator.battery.level * 100 : null
  };
  
  // Lưu vị trí lên Firebase Realtime Database
  database.ref(`users/${userId}/location`).set(locationData)
    .then(() => {
      console.log("✅ Đã cập nhật vị trí lên Firebase:", locationData);
    })
    .catch((error) => {
      console.error("❌ Lỗi cập nhật vị trí:", error);
      // Fallback: lưu vào localStorage
      localStorage.setItem('sharedLocation', JSON.stringify(locationData));
    });
  
  // Cập nhật thời gian online
  database.ref(`users/${userId}/lastSeen`).set(Date.now());
}

function getFamilyMemberLocation(memberId) {
  return database.ref(`users/${memberId}/location`).once('value')
    .then((snapshot) => {
      const location = snapshot.val();
      if (location && (Date.now() - location.timestamp) < 5 * 60 * 1000) { // 5 phút
        return { ...location, isOnline: true };
      }
      return { isOnline: false, lastSeen: location ? location.timestamp : null };
    })
    .catch((error) => {
      console.error("❌ Lỗi lấy vị trí người thân:", error);
      return { isOnline: false, error: true };
    });
}

function listenToFamilyLocations() {
  familyMembers.forEach(member => {
    if (!member.id) return;
    
    // Lắng nghe thay đổi vị trí real-time
    database.ref(`users/${member.id}/location`).on('value', (snapshot) => {
      const location = snapshot.val();
      if (location) {
        updateMemberStatus(member.id, location);
      }
    });
    
    // Lắng nghe trạng thái online/offline
    database.ref(`users/${member.id}/lastSeen`).on('value', (snapshot) => {
      const lastSeen = snapshot.val();
      const isOnline = (Date.now() - lastSeen) < 5 * 60 * 1000; // 5 phút
      updateMemberOnlineStatus(member.id, isOnline);
    });
  });
}

function updateMemberStatus(memberId, location) {
  const memberIndex = familyMembers.findIndex(m => m.id === memberId);
  if (memberIndex !== -1) {
    familyMembers[memberIndex].currentLocation = location;
    familyMembers[memberIndex].lastSeen = location.timestamp;
    renderFamilyList();
  }
}

function updateMemberOnlineStatus(memberId, isOnline) {
  const memberIndex = familyMembers.findIndex(m => m.id === memberId);
  if (memberIndex !== -1) {
    familyMembers[memberIndex].isOnline = isOnline;
    renderFamilyList();
  }
}

function loadFamilyMembers() {
  const stored = localStorage.getItem('familyMembers');
  if (stored) {
    familyMembers = JSON.parse(stored);
  }
  
  // Lấy danh sách người thân từ Firebase
  const myUserId = getCurrentUserId();
  database.ref(`users/${myUserId}/familyMembers`).on('value', (snapshot) => {
    const firebaseMembers = snapshot.val() || {};
    const firebaseMemberList = Object.keys(firebaseMembers).map(id => ({
      id: id,
      name: firebaseMembers[id].displayName || id,
      displayName: firebaseMembers[id].displayName || '',
      addedAt: firebaseMembers[id].addedAt || Date.now(),
      isOnline: false,
      lastSeen: null,
      currentLocation: null
    }));
    
    // Gộp danh sách từ localStorage và Firebase
    const mergedMembers = [...familyMembers];
    
    // Thêm các thành viên từ Firebase chưa có trong localStorage
    firebaseMemberList.forEach(firebaseMember => {
      if (!mergedMembers.find(m => m.id === firebaseMember.id)) {
        mergedMembers.push(firebaseMember);
      }
    });
    
    // Cập nhật danh sách
    familyMembers = mergedMembers;
    saveFamilyMembers();
    renderFamilyList();
    
    // Lắng nghe vị trí của tất cả người thân
    listenToFamilyLocations();
  });
}

function saveFamilyMembers() {
  localStorage.setItem('familyMembers', JSON.stringify(familyMembers));
}

function getCurrentUserId() {
  let userId = localStorage.getItem('userId');
  if (!userId) {
    userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('userId', userId);
  }
  return userId;
}

function handleAddFamilyMember(e) {
  e.preventDefault();
  
  const familyUserId = document.getElementById("family-user-id").value.trim();
  const displayName = document.getElementById("family-name").value.trim();
  
  if (!familyUserId) {
    alert("Vui lòng nhập User ID của người thân");
    return;
  }
  
  // Kiểm tra xem user ID đã tồn tại chưa
  const existingMember = familyMembers.find(m => m.id === familyUserId);
  if (existingMember) {
    alert("Người thân này đã có trong danh sách!");
    return;
  }
  
  const newMember = {
    id: familyUserId,
    name: displayName || familyUserId, // Dùng user ID làm tên nếu không nhập display name
    displayName: displayName,
    addedAt: Date.now(),
    isOnline: false,
    lastSeen: null,
    currentLocation: null
  };
  
  familyMembers.push(newMember);
  saveFamilyMembers();
  
  // Lưu thông tin người thân lên Firebase
  database.ref(`users/${newMember.id}/profile`).set({
    displayName: displayName,
    addedBy: getCurrentUserId(),
    addedAt: newMember.addedAt
  }).then(() => {
    console.log("✅ Đã lưu thông tin người thân lên Firebase");
    
    // Tự động thêm mình vào danh sách người thân của người kia
    const myUserId = getCurrentUserId();
    const myProfile = {
      displayName: "Bạn", // Mặc định là "Bạn"
      addedBy: myUserId,
      addedAt: Date.now()
    };
    
    // Lấy thông tin profile của mình để gửi cho người kia
    database.ref(`users/${myUserId}/profile`).once('value')
      .then((snapshot) => {
        const myData = snapshot.val();
        if (myData && myData.displayName) {
          myProfile.displayName = myData.displayName;
        }
        
        // Thêm mình vào danh sách người thân của người kia
        return database.ref(`users/${familyUserId}/familyMembers/${myUserId}`).set(myProfile);
      })
      .then(() => {
        console.log("✅ Đã tự động thêm bạn vào danh sách người thân của người kia");
      })
      .catch((error) => {
        console.error("❌ Lỗi tự động thêm bạn vào danh sách người thân:", error);
      });
      
  }).catch((error) => {
    console.error("❌ Lỗi lưu thông tin người thân:", error);
  });
  
  // Bắt đầu lắng nghe vị trí của người thân mới
  listenToSingleFamilyMember(familyUserId);
  
  renderFamilyList();
  
  // Đóng modal và reset form
  document.getElementById("add-family-modal").classList.add("hidden");
  document.getElementById("add-family-form").reset();
  
  alert(`Đã thêm người thân với User ID: ${familyUserId}\n\nBạn cũng đã được tự động thêm vào danh sách người thân của họ!`);
}

function listenToFamilyLocations() {
  familyMembers.forEach(member => {
    listenToSingleFamilyMember(member.id);
  });
}

function listenToSingleFamilyMember(memberId) {
  // Lắng nghe thay đổi vị trí real-time
  database.ref(`users/${memberId}/location`).on('value', (snapshot) => {
    const location = snapshot.val();
    if (location) {
      updateMemberStatus(memberId, location);
    }
  });
  
  // Lắng nghe trạng thái online/offline
  database.ref(`users/${memberId}/lastSeen`).on('value', (snapshot) => {
    const lastSeen = snapshot.val();
    const isOnline = (Date.now() - lastSeen) < 5 * 60 * 1000; // 5 phút
    updateMemberOnlineStatus(memberId, isOnline);
  });
}

function renderFamilyList() {
  const familyList = document.getElementById("family-list");
  if (!familyList) return;
  
  if (familyMembers.length === 0) {
    familyList.innerHTML = `
      <h3>Danh sách người thân</h3>
      <div class="family-item" id="no-family-message">
        <p>Chưa có người thân nào được thêm</p>
      </div>
    `;
    return;
  }
  
  let html = '<h3>Danh sách người thân</h3>';
  
  familyMembers.forEach(member => {
    const displayName = member.displayName || member.name;
    const statusClass = member.isOnline ? '' : 'offline';
    const statusText = member.isOnline ? 'Online' : 'Offline';
    const lastSeenText = member.lastSeen ? 
      new Date(member.lastSeen).toLocaleString('vi-VN') : 'Chưa từng online';
    
    html += `
      <div class="family-item" data-member-id="${member.id}" data-display-name="${displayName}">
        <div class="family-item-info">
          <div class="family-item-name">${displayName}</div>
          <div class="family-item-details">ID: ${member.id}</div>
          <div class="family-item-lastseen">Lần cuối: ${lastSeenText}</div>
        </div>
        <div class="family-item-actions">
          <div class="family-item-status">
            <div class="status-indicator ${statusClass}"></div>
            <span class="status-text">${statusText}</span>
          </div>
          <button class="delete-family-btn" onclick="deleteFamilyMember('${member.id}', '${displayName}')" style="background: none; border: none; color: #ef4444; cursor: pointer; padding: 4px; border-radius: 4px; font-size: 16px; transition: all 0.2s ease; margin-left: 8px;">🗑️</button>
        </div>
      </div>
    `;
  });
  
  familyList.innerHTML = html;
  
  // Thêm event listener cho context menu
  const familyItems = familyList.querySelectorAll('.family-item');
  familyItems.forEach(item => {
    item.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      const memberId = item.dataset.memberId;
      const displayName = item.dataset.displayName;
      showFamilyContextMenu(event, memberId, displayName);
    });
  });
}

function showFamilyContextMenu(event, memberId, displayName) {
  console.log("showFamilyContextMenu được gọi:", { memberId, displayName });
  
  // Ngăn context menu mặc định
  event.preventDefault();
  event.stopPropagation();
  
  // Xóa context menu cũ nếu có
  const existingMenu = document.getElementById('family-context-menu');
  if (existingMenu) {
    existingMenu.remove();
  }
  
  // Tạo context menu
  const menu = document.createElement('div');
  menu.id = 'family-context-menu';
  menu.className = 'context-menu';
  menu.style.cssText = `
    position: fixed;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 1000;
    min-width: 150px;
    padding: 4px 0;
  `;
  
  menu.innerHTML = `
    <div class="context-menu-item" style="padding: 8px 16px; cursor: pointer; color: #374151; font-size: 14px;" onmouseover="this.style.background='#f3f4f6'; this.style.color='#dc2626';" onmouseout="this.style.background='white'; this.style.color='#374151';" onclick="deleteFamilyMember('${memberId}', '${displayName}')">
      🗑️ Xóa người thân
    </div>
  `;
  
  // Thêm vào body
  document.body.appendChild(menu);
  console.log("Context menu đã được thêm vào DOM");
  
  // Vị trí menu
  const x = event.pageX || event.clientX + window.scrollX;
  const y = event.pageY || event.clientY + window.scrollY;
  menu.style.left = x + 'px';
  menu.style.top = y + 'px';
  console.log("Vị trí menu:", { x, y });
  
  // Đóng menu khi click ra ngoài
  setTimeout(() => {
    document.addEventListener('click', hideFamilyContextMenu);
  }, 100);
}

// Đưa hàm vào global scope
window.showFamilyContextMenu = showFamilyContextMenu;
window.deleteFamilyMember = deleteFamilyMember;
window.hideFamilyContextMenu = hideFamilyContextMenu;

// Test function
window.testContextMenu = function() {
  console.log("Test context menu");
  const event = {
    preventDefault: () => {},
    stopPropagation: () => {},
    pageX: 100,
    pageY: 100
  };
  showFamilyContextMenu(event, 'test123', 'Test User');
};

console.log("Context menu functions loaded:", {
  showFamilyContextMenu: !!window.showFamilyContextMenu,
  deleteFamilyMember: !!window.deleteFamilyMember,
  hideFamilyContextMenu: !!window.hideFamilyContextMenu
});

function hideFamilyContextMenu() {
  const menu = document.getElementById('family-context-menu');
  if (menu) {
    menu.remove();
  }
  document.removeEventListener('click', hideFamilyContextMenu);
}

function deleteFamilyMember(memberId, displayName) {
  // Đóng context menu
  hideFamilyContextMenu();
  
  // Xác nhận xóa
  const confirmed = confirm(`Bạn có chắc chắn muốn xóa "${displayName}" khỏi danh sách người thân?`);
  
  if (!confirmed) return;
  
  // Xóa khỏi danh sách local
  familyMembers = familyMembers.filter(m => m.id !== memberId);
  saveFamilyMembers();
  
  // Xóa khỏi Firebase
  const myUserId = getCurrentUserId();
  database.ref(`users/${myUserId}/familyMembers/${memberId}`).remove()
    .then(() => {
      console.log("✅ Đã xóa người thân khỏi Firebase");
      
      // Xóa mình khỏi danh sách của người đó (tùy chọn)
      database.ref(`users/${memberId}/familyMembers/${myUserId}`).remove()
        .then(() => {
          console.log("✅ Đã xóa mình khỏi danh sách của người thân");
        })
        .catch((error) => {
          console.error("❌ Lỗi xóa mình khỏi danh sách của người thân:", error);
        });
    })
    .catch((error) => {
      console.error("❌ Lỗi xóa người thân khỏi Firebase:", error);
    });
  
  // Render lại danh sách
  renderFamilyList();
  
  // Dừng lắng nghe vị trí của người đã xóa
  database.ref(`users/${memberId}/location`).off();
  database.ref(`users/${memberId}/lastSeen`).off();
  
  alert(`Đã xóa "${displayName}" khỏi danh sách người thân`);
}
  function getRelationText(relation) {
  const relations = {
    parent: 'Bố/Mẹ',
    child: 'Con cái',
    sibling: 'Anh/Chị/Em',
    spouse: 'Vợ/Chồng',
    friend: 'Bạn bè',
    other: 'Khác'
  };
  return relations[relation] || 'Khác';
}

function initApp() {
  console.log("initApp() được gọi");
  
  // Khi chưa có vị trí người dùng: hiển thị bản đồ Windy toàn thế giới, không marker
  initWindyMap(0, 0, 2, false);
  initWeatherToggle();

  const getLocationBtn = document.getElementById("get-location-btn");
  const expandMapBtn = document.getElementById("expand-map-btn");
  const mapCard = document.querySelector(".map-card");
  const mapOverlay = document.getElementById("map-overlay");

  console.log("Debug map elements:", {
    getLocationBtn: !!getLocationBtn,
    expandMapBtn: !!expandMapBtn,
    mapCard: !!mapCard,
    mapOverlay: !!mapOverlay,
    expandMapBtnText: expandMapBtn ? expandMapBtn.textContent : 'not found'
  });

  // Thêm event listener cho nút phóng to bản đồ ngay lập tức
  if (expandMapBtn && mapOverlay) {
    console.log("Thêm event listener cho nút phóng to bản đồ");
    expandMapBtn.addEventListener("click", (e) => {
      e.preventDefault();
      console.log("Nút phóng to bản đồ được click!");
      
      // Di chuyển bản đồ hiện tại vào overlay
      const originalMap = document.getElementById("windy-map");
      const expandedMapContainer = document.getElementById("expanded-map");
      
      if (originalMap && expandedMapContainer) {
        console.log("Di chuyển bản đồ vào overlay");
        // Di chuyển element bản đồ vào overlay
        expandedMapContainer.appendChild(originalMap);
        
        // Hiển thị overlay
        mapOverlay.classList.remove("hidden");
        mapOverlay.classList.add("active");
        document.body.style.overflow = "hidden";
        
        // Cập nhật kích thước bản đồ
        originalMap.style.width = '100%';
        originalMap.style.height = '100%';
        
        // Kích hoạt lại bản đồ nếu cần
        if (window.W && window.W.map) {
          setTimeout(() => {
            window.W.map.invalidateSize();
          }, 100);
        }
      }
    });
  } else {
    console.error("Không tìm thấy expandMapBtn hoặc mapOverlay");
  }

  if (mapOverlay) {
    mapOverlay.addEventListener("click", (e) => {
      if (e.target === mapOverlay) {
        mapOverlay.classList.add("hidden");
        mapOverlay.classList.remove("active");
        document.body.style.overflow = "auto";
        
        // Trả bản đồ về vị trí cũ
        const expandedMapContainer = document.getElementById("expanded-map");
        const mapCard = document.querySelector(".map-card");
        const originalMap = expandedMapContainer.querySelector("#windy-map");
        
        if (originalMap && mapCard) {
          // Trả bản đồ về vị trí cũ
          mapCard.appendChild(originalMap);
          // Reset kích thước
          originalMap.style.width = '';
          originalMap.style.height = '';
          
          // Kích hoạt lại bản đồ
          if (window.W && window.W.map) {
            setTimeout(() => {
              window.W.map.invalidateSize();
            }, 100);
          }
        }
      }
    });
  }

  if (!getLocationBtn) {
    console.error("Không tìm thấy nút get-location-btn");
    return;
  }

  console.log("Nút lấy vị trí đã tìm thấy, thêm event listener");

  if (!("geolocation" in navigator)) {
    console.warn("Trình duyệt không hỗ trợ geolocation");
    getLocationBtn.disabled = true;
    getLocationBtn.textContent = "Trình duyệt không hỗ trợ định vị";
    return;
  }

  getLocationBtn.addEventListener("click", () => {
    console.log("Nút lấy vị trí được click");
    getLocationBtn.disabled = true;
    getLocationBtn.textContent = "Đang lấy vị trí...";

    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log("Lấy vị trí thành công:", position);
        const { latitude: lat, longitude: lon } = position.coords;
        currentLat = lat;
        currentLon = lon;

        console.log("Bắt đầu cập nhật UI...");
        try {
          updateLocationText(lat, lon);
          console.log("Đã gọi updateLocationText");
        } catch (err) {
          console.error("Lỗi updateLocationText:", err);
        }
        
        try {
          reverseGeocodeAndSetPlace(lat, lon);
          console.log("Đã gọi reverseGeocodeAndSetPlace");
        } catch (err) {
          console.error("Lỗi reverseGeocodeAndSetPlace:", err);
        }
        
        try {
          fetchWindyForecast(lat, lon);
          console.log("Đã gọi fetchWindyForecast");
        } catch (err) {
          console.error("Lỗi fetchWindyForecast:", err);
        }
        
        try {
          fetch7DayForecast(lat, lon);
          console.log("Đã gọi fetch7DayForecast");
        } catch (err) {
          console.error("Lỗi fetch7DayForecast:", err);
        }

        try {
          fetchCurrentWeather(lat, lon);
          console.log("Đã gọi fetchCurrentWeather");
        } catch (err) {
          console.error("Lỗi fetchCurrentWeather:", err);
        }

        try {
          fetchDailyWeather(lat, lon);
          console.log("Đã gọi fetchDailyWeather");
        } catch (err) {
          console.error("Lỗi fetchDailyWeather:", err);
        }

        try {
          computeAndShowRisk(lat, lon);
          console.log("Đã gọi computeAndShowRisk");
        } catch (err) {
          console.error("Lỗi computeAndShowRisk:", err);
        }

        try {
          initWindyMap(lat, lon, 10, true);
          console.log("Đã gọi initWindyMap");
        } catch (err) {
          console.error("Lỗi initWindyMap:", err);
        }

        getLocationBtn.disabled = false;
        getLocationBtn.textContent = "Lấy vị trí của tôi";
      },
      (error) => {
        console.error("Lỗi lấy vị trí:", error);
        let message = "Không thể lấy vị trí";
        if (error.code === 1) message = "Bạn đã từ chối truy cập vị trí";
        else if (error.code === 2) message = "Không thể xác định vị trí";
        else if (error.code === 3) message = "Hết thời gian chờ vị trí";

        getLocationBtn.disabled = false;
        getLocationBtn.textContent = "Lấy vị trí của tôi";
        alert(message);
      }
    );
  });
}

function initWeatherToggle() {
  const toggleBtn = document.getElementById("toggle-daily-weather");
  if (!toggleBtn) return;

  toggleBtn.addEventListener("click", () => {
    isShowingCurrentWeather = !isShowingCurrentWeather;
    
    const hourlyContainer = document.getElementById("hourly-forecast-container");
    const weatherGrid = document.querySelector(".current-weather-grid");
    
    if (isShowingCurrentWeather) {
      // Thời tiết hiện tại
      toggleBtn.textContent = "Xem thời tiết trong ngày";
      document.querySelector(".weather-header h2").textContent = "Thời tiết hiện tại";
      
      if (hourlyContainer) hourlyContainer.style.display = "none";
      if (weatherGrid) weatherGrid.style.display = "grid";
      
      if (currentLat && currentLon) {
        fetchCurrentWeather(currentLat, currentLon);
      }
      
    } else {
      // Thời tiết trong ngày
      toggleBtn.textContent = "Xem thời tiết hiện tại";
      document.querySelector(".weather-header h2").textContent = "Thời tiết trong ngày";
      
      if (hourlyContainer) hourlyContainer.style.display = "block";
      if (weatherGrid) weatherGrid.style.display = "none";
      
      if (currentLat && currentLon) {
        fetchDailyWeather(currentLat, currentLon);
      }
    }
  });
}

async function fetchCurrentWeather(lat, lon) {
  try {
    // Gọi API thời tiết hiện tại
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=relativehumidity_2m,precipitation&timezone=auto`;
    
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error("Không lấy được dữ liệu thời tiết");
    }
    
    const data = await res.json();
    updateWeatherFromOpenMeteo(data, lat, lon);
    
  } catch (err) {
    console.error("Lỗi fetchCurrentWeather:", err);
    
    const summaryEl = document.getElementById("summary-value");
    if (summaryEl) {
      summaryEl.textContent = "Lỗi khi lấy dữ liệu thời tiết";
    }
  }
}

async function fetchDailyWeather(lat, lon) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,relativehumidity_2m,precipitation,windspeed_10m&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Không lấy được dữ liệu thời tiết trong ngày");
    
    const data = await res.json();
    updateHourlyWeatherDisplay(data, lat, lon);
  } catch (err) {
    console.error("Error fetching daily weather:", err);
    document.getElementById("summary-value").textContent = "Lỗi khi lấy dữ liệu thời tiết";
  }
}

function updateHourlyWeatherDisplay(data, lat, lon) {
  if (!data.hourly) return;
  
  // Lấy dữ liệu 24 giờ tới (từ 0h đến 23h hôm nay)
  const hourly = data.hourly;
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Đặt về 0h để so sánh
  
  // Tạo container cho hourly forecast bên trong card thời tiết
  const weatherCard = document.getElementById("current-weather-card");
  let hourlyContainer = document.getElementById("hourly-forecast-container");
  
  if (!hourlyContainer) {
    hourlyContainer = document.createElement("div");
    hourlyContainer.id = "hourly-forecast-container";
    hourlyContainer.className = "hourly-forecast-container";
    hourlyContainer.innerHTML = `
      <div class="hourly-nav">
        <input type="range" class="hourly-slider" id="hourly-slider" min="0" max="17" value="0" step="1">
        <div class="hourly-forecast-scroll" id="hourly-forecast-scroll"></div>
      </div>
    `;
    weatherCard.appendChild(hourlyContainer);
  }
  
  const scrollContainer = document.getElementById("hourly-forecast-scroll");
  scrollContainer.innerHTML = "";
  
  // Lọc và tạo các item theo giờ - đảm bảo có đủ 24 giờ (0h-24h)
  const hourlyData = [];
  for (let i = 0; i < 25 && i < hourly.time.length; i++) { // Lấy 25 items cho 0h-24h
    const hourTime = new Date(hourly.time[i]);
    
    // Chỉ lấy giờ của hôm nay và ngày mai nếu cần
    if (hourTime.toDateString() !== today.toDateString() && hourlyData.length >= 24) break;
    
    hourlyData.push({
      hour: hourTime.getHours(),
      temp: hourly.temperature_2m[i],
      humidity: hourly.relativehumidity_2m[i],
      precip: hourly.precipitation[i],
      wind: hourly.windspeed_10m[i]
    });
  }
  
  // Đảm bảo có đủ 25 giờ (0h-24h) - nếu thiếu thì dùng dữ liệu của ngày hôm sau
  if (hourlyData.length < 25) {
    console.log(`Chỉ có ${hourlyData.length} giờ, sẽ lấy thêm giờ của ngày mai để đủ 0h-24h`);
    for (let i = hourlyData.length; i < 25 && hourly.time.length > i; i++) {
      const hourTime = new Date(hourly.time[i]);
      
      hourlyData.push({
        hour: hourTime.getHours(),
        temp: hourly.temperature_2m[i],
        humidity: hourly.relativehumidity_2m[i],
        precip: hourly.precipitation[i],
        wind: hourly.windspeed_10m[i]
      });
    }
  }
  
  // Tạo các item theo giờ
  hourlyData.forEach((data, index) => {
    const item = document.createElement("div");
    item.className = "hourly-forecast-item";
    item.dataset.hourIndex = index;
    
    // Xử lý hiển thị giờ: 24h thay vì 0h cho item cuối cùng
    let displayHour = data.hour;
    if (index === hourlyData.length - 1 && data.hour === 0) {
      displayHour = 24; // Item cuối cùng có hour 0 sẽ hiển thị là 24h
    }
    
    let weatherIcon = "🌤️";
    if (data.precip > 0.5) weatherIcon = "🌧️";
    else if (data.wind > 10) weatherIcon = "💨";
    else if (data.temp > 25) weatherIcon = "☀️";
    else if (data.temp < 15) weatherIcon = "❄️";
    
    item.innerHTML = `
      <div class="hourly-hour">${displayHour}h</div>
      <div class="hourly-icon">${weatherIcon}</div>
      <div class="hourly-temp">${Math.round(data.temp)}°</div>
      <div class="hourly-humidity">💧 ${data.humidity}%</div>
      <div class="hourly-wind">💨 ${Math.round(data.wind)}m/s</div>
      ${data.precip > 0 ? `<div class="hourly-rain">🌧️ ${data.precip}mm</div>` : ''}
    `;
    
    scrollContainer.appendChild(item);
  });
  
  console.log(`Tạo ${hourlyData.length} items cho hourly forecast (0h-24h)`);
  
  // Thêm sự kiện cho thanh trượt
  initHourlyNavigation();
  
  // Cập nhật thông tin tổng quan
  updateDailySummary(data, lat, lon);
}

function initHourlyNavigation() {
  const slider = document.getElementById("hourly-slider");
  const scrollContainer = document.getElementById("hourly-forecast-scroll");
  
  if (!slider || !scrollContainer) return;
  
  const items = scrollContainer.querySelectorAll('.hourly-forecast-item');
  const maxIndex = Math.max(0, items.length - 9);
  
  // Cập nhật max value cho slider
  slider.max = maxIndex;
  
  // Đảm bảo container đủ rộng cho tất cả items
  const totalWidth = items.length * 78; // 70px + 8px gap
  scrollContainer.style.width = `${totalWidth}px`;
  
  function updateDisplay() {
    const currentIndex = parseInt(slider.value);
    const itemWidth = 78; // 70px + 8px gap
    
    // Slide container để lộ các item
    scrollContainer.style.transform = `translateX(-${currentIndex * itemWidth}px)`;
    
    // Debug để kiểm tra
    console.log(`Slider value: ${currentIndex}, Transform: -${currentIndex * itemWidth}px, Total items: ${items.length}, Container width: ${totalWidth}px, Max index: ${maxIndex}`);
  }
  
  // Sự kiện khi kéo slider với debounce để mượt hơn
  let timeout;
  slider.addEventListener('input', () => {
    clearTimeout(timeout);
    timeout = setTimeout(updateDisplay, 50);
  });
  
  // Hiển thị mặc định 9 giờ đầu tiên
  updateDisplay();
  
  // Kiểm tra cuối ngày để đảm bảo có đủ 25 items (0h-24h)
  if (items.length < 25) {
    console.warn(`Chỉ có ${items.length} items, mong muốn 25 items (0h-24h)`);
  } else {
    console.log(`Đã có đủ ${items.length} items cho 0h-24h`);
  }
}

function updateDailySummary(data, lat, lon) {
  if (!data.hourly) return;
  
  // Tính trung bình của ngày hôm nay
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const todayHourly = data.hourly.filter((item, index) => {
    const itemTime = new Date(item.time);
    return itemTime.toDateString() === today.toDateString() && index < 24;
  });
  
  if (todayHourly.length === 0) return;
  
  const avgTemp = todayHourly.reduce((sum, item) => sum + item.temperature_2m, 0) / todayHourly.length;
  const avgHumidity = todayHourly.reduce((sum, item) => sum + item.relativehumidity_2m, 0) / todayHourly.length;
  const maxWind = Math.max(...todayHourly.map(item => item.windspeed_10m));
  const totalPrecip = todayHourly.reduce((sum, item) => sum + item.precipitation, 0);
  
  // Cập nhật giao diện
  const tempMin = Math.min(...todayHourly.map(item => item.temperature_2m));
  const tempMax = Math.max(...todayHourly.map(item => item.temperature_2m));
  
  document.getElementById("temp-value").textContent = `${Math.round(tempMin)}° - ${Math.round(tempMax)}°`;
  document.getElementById("humidity-value").textContent = `${Math.round(avgHumidity)}%`;
  document.getElementById("wind-value").textContent = `${Math.round(maxWind)} m/s`;
  
  // Tạo mô tả
  let summary = [];
  if (avgTemp >= 30) summary.push("Nắng nóng");
  else if (avgTemp <= 15) summary.push("Lạnh");
  else summary.push("Mát mẻ");
  
  if (maxWind >= 15) summary.push("Gió mạnh");
  else if (maxWind >= 8) summary.push("Gió nhẹ");
  
  if (totalPrecip > 5) summary.push("Mưa nhiều");
  else if (totalPrecip > 0) summary.push("Có mưa");
  
  document.getElementById("summary-value").textContent = summary.length > 0 ? summary.join(", ") : "Thời tiết ổn định";
  
  // Tính rủi ro
  const risk = computeRiskScore({
    tempC: avgTemp,
    rh: avgHumidity,
    windSpeed: maxWind,
    precip: totalPrecip
  });
  updateRiskUI(risk);
}

function updateLocationText(lat, lon) {
  const locationText = document.getElementById("location-text");
  if (!locationText) return;

  if (lat && lon) {
    locationText.textContent = `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
  } else {
    locationText.textContent = "Chưa lấy vị trí";
  }
}

async function reverseGeocodeAndSetPlace(lat, lon) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&accept-language=vi`
    );
    if (!res.ok) throw new Error("Không lấy được địa chỉ");

    const data = await res.json();
    const placeEl = document.getElementById("location-place");
    if (placeEl && data.display_name) {
      placeEl.textContent = data.display_name;
    }
  } catch (err) {
    console.error("Lỗi reverse geocoding:", err);
    document.getElementById("location-place").textContent = "--";
  }
}

function fetchWindyForecast(lat, lon) {
  // Cập nhật bản đồ Windy với tọa độ mới
  initWindyMap(lat, lon, 10, true);
  
  // Lấy dữ liệu thời tiết từ Open-Meteo
  fetchCurrentWeather(lat, lon);
}

function initWindyMap(lat, lon, zoom, showMarker) {
  const container = document.getElementById("windy-map");
  if (!container) return;

  container.innerHTML = "";

  const iframe = document.createElement("iframe");
  const markerParam = showMarker ? `&marker=${lat},${lon}` : "&marker=";
  iframe.src = `https://embed.windy.com/embed2.html?lat=${lat}&lon=${lon}&detailLat=${lat}&detailLon=${lon}&zoom=${zoom}&level=surface&overlay=wind&menu=&message=${markerParam}&calendar=&pressure=&type=map&location=coordinates&detail=&metricWind=default&metricTemp=default&radarRange=-1`;
  iframe.width = "100%";
  iframe.height = "100%";
  iframe.frameBorder = "0";
  iframe.style.border = "none";

  container.appendChild(iframe);
}

function updateWeatherFromOpenMeteo(data, lat, lon) {
  console.log("updateWeatherFromOpenMeteo được gọi với:", { lat, lon, data });
  
  // Lưu tọa độ hiện tại để dùng cho toggle
  currentLat = lat;
  currentLon = lon;
  
  const current = data.current_weather;
  if (!current) {
    console.log("Không có dữ liệu current_weather");
    return;
  }

  const tempC = typeof current.temperature === "number" ? current.temperature : null;
  const windSpeedMs =
    typeof current.windspeed === "number" ? current.windspeed / 3.6 : null; // km/h -> m/s

  let rh = null;
  let precip = 0;

  // Lấy độ ẩm và lượng mưa từ dữ liệu hourly gần nhất
  if (data.hourly && data.hourly.time && data.hourly.time.length > 0) {
    const now = new Date();
    const currentHour = now.getHours();

    // Tìm hourly data gần nhất với thời gian hiện tại
    let closestIndex = -1;
    let minDiff = Infinity;
    
    for (let i = 0; i < data.hourly.time.length; i++) {
      const hourTime = new Date(data.hourly.time[i]);
      const hourDiff = Math.abs(hourTime.getHours() - currentHour);
      if (hourDiff < minDiff) {
        minDiff = hourDiff;
        closestIndex = i;
      }
    }

    if (closestIndex !== -1) {
      rh = data.hourly.relativehumidity_2m[closestIndex];
      precip = data.hourly.precipitation[closestIndex] || 0;
    }
  }

  console.log("Dữ liệu thời tiết:", { tempC, rh, windSpeedMs, precip });

  // Cập nhật giao diện
  if (tempC != null) {
    const tempEl = document.getElementById("temp-value");
    if (tempEl) {
      tempEl.textContent = `${Math.round(tempC)}°`;
      console.log("Đã cập nhật temp-value:", tempEl.textContent);
    } else {
      console.error("Không tìm thấy element #temp-value");
    }
  } else {
    console.warn("tempC là null, không cập nhật nhiệt độ");
  }
  
  if (rh != null) {
    const humidityEl = document.getElementById("humidity-value");
    if (humidityEl) {
      humidityEl.textContent = `${rh}%`;
      console.log("Đã cập nhật humidity-value:", humidityEl.textContent);
    } else {
      console.error("Không tìm thấy element #humidity-value");
    }
  } else {
    console.warn("Độ ẩm (rh) là null, không cập nhật độ ẩm");
  }
  
  if (windSpeedMs != null) {
    const windEl = document.getElementById("wind-value");
    if (windEl) {
      windEl.textContent = `${Math.round(windSpeedMs)} m/s`;
      console.log("Đã cập nhật wind-value:", windEl.textContent);
    } else {
      console.error("Không tìm thấy element #wind-value");
    }
  } else {
    console.warn("Tốc độ gió (windSpeedMs) là null, không cập nhật gió");
  }

  const summaryText = buildSummaryText(tempC, rh, windSpeedMs, precip);
  const summaryEl = document.getElementById("summary-value");
  if (summaryEl) {
    summaryEl.textContent = summaryText;
    console.log("Đã cập nhật summary-value:", summaryEl.textContent);
  } else {
    console.error("Không tìm thấy element #summary-value");
  }

  const risk = computeRiskScore({
    tempC,
    rh,
    windSpeed: windSpeedMs || 0,
    precip,
  });
  currentRiskScore = risk; // Lưu risk score hiện tại
  updateRiskUI(risk, tempC, rh, windSpeedMs, precip);

  // Lấy dự báo 7 ngày
  fetch7DayForecast(lat, lon);
}

function buildSummaryText(tempC, rh, windSpeedMs, precip) {
  if (!tempC && !rh && !windSpeedMs) return "Không có dữ liệu";

  let summary = [];

  // Nhiệt độ
  if (tempC >= 35) summary.push("nắng nóng gay gắt");
  else if (tempC >= 30) summary.push("nắng nóng");
  else if (tempC >= 25) summary.push("khá ấm");
  else if (tempC >= 20) summary.push("ấm áp");
  else if (tempC >= 15) summary.push("mát mẻ");
  else if (tempC >= 10) summary.push("lạnh");
  else summary.push("rét");

  // Độ ẩm
  if (rh >= 80) summary.push("rất ẩm");
  else if (rh >= 70) summary.push("ẩm");
  else if (rh >= 60) summary.push("khô ráo");
  else summary.push("khô");

  // Gió
  if (windSpeedMs >= 15) summary.push("gió rất mạnh");
  else if (windSpeedMs >= 10) summary.push("gió mạnh");
  else if (windSpeedMs >= 5) summary.push("gió nhẹ");
  else summary.push("yên tĩnh");

  // Mưa
  if (precip > 10) summary.push("mưa rất lớn");
  else if (precip > 5) summary.push("mưa lớn");
  else if (precip > 2) summary.push("mưa vừa");
  else if (precip > 0.5) summary.push("mưa nhỏ");
  else if (precip > 0) summary.push("mưa phùn");
  else summary.push("không mưa");

  return summary.join(", ");
}

function computeRiskScore({ tempC, rh, windSpeedMs, precip }) {
  let score = 0;

  // Đảm bảo các giá trị là số, nếu không thì gán 0
  tempC = typeof tempC === "number" ? tempC : 0;
  rh = typeof rh === "number" ? rh : 0;
  windSpeedMs = typeof windSpeedMs === "number" ? windSpeedMs : 0;
  precip = typeof precip === "number" ? precip : 0;

  console.log("computeRiskScore input:", { tempC, rh, windSpeedMs, precip });

  // Nhiệt độ cực đoan
  if (tempC >= 40) score += 30;
  else if (tempC >= 35) score += 20;
  else if (tempC >= 30) score += 10;
  else if (tempC <= 0) score += 15;
  else if (tempC <= -5) score += 25;

  // Gió mạnh
  if (windSpeedMs >= 20) score += 20;
  else if (windSpeedMs >= 15) score += 15;
  else if (windSpeedMs >= 10) score += 10;

  // Mưa lớn
  if (precip >= 20) score += 25;
  else if (precip >= 10) score += 15;
  else if (precip >= 5) score += 10;

  // Độ ẩm cao
  if (rh >= 90) score += 10;
  else if (rh >= 80) score += 5;

  console.log("computeRiskScore result:", score);
  return score;
}

function updateRiskUI(risk, tempC, rh, windSpeedMs, precip) {
  console.log("updateRiskUI được gọi với risk:", risk, "và thông số:", { tempC, rh, windSpeedMs, precip });
  
  const riskLevelEl = document.getElementById("risk-level");
  const riskDesc = document.getElementById("risk-desc");

  if (!riskLevelEl || !riskDesc) {
    console.error("Không tìm thấy elements cho risk UI");
    return;
  }

  // Xác định mức độ và khoảng điểm
  let levelClass = "safe";
  let levelName = "An toàn";
  let scoreRange = "0-19";
  let desc = tempC || risk > 0 ? "Thời tiết ổn định, không có rủi ro đáng lo ngại." : "";

  if (risk >= 60) {
    levelClass = "danger";
    levelName = "Nguy hiểm";
    scoreRange = "60+";
    desc = "Thời tiết nguy hiểm, cần hạn chế ra ngoài và có biện pháp bảo vệ.";
  } else if (risk >= 40) {
    levelClass = "warning";
    levelName = "Cảnh báo";
    scoreRange = "40-59";
    desc = "Thời tiết xấu, cần cẩn trọng khi hoạt động ngoài trời.";
  } else if (risk >= 20) {
    levelClass = "caution";
    levelName = "Chú ý";
    scoreRange = "20-39";
    desc = "Thời tiết không thuận lợi, cần theo dõi tình hình.";
  }

  // Thêm lời khuyên chi tiết
  const advice = buildRiskAdvice(tempC, rh, windSpeedMs, precip);
  if (advice) {
    desc += " " + advice;
  }

  console.log("Cập nhật risk UI:", { levelClass, levelName, scoreRange, risk });

  // Cập nhật risk-level-box với class màu
  const scoreDisplay = tempC || risk > 0 ? risk : "--";
  const labelDisplay = tempC || risk > 0 ? levelName.toLowerCase() : (risk === 0 ? "an toàn" : "");
  
  riskLevelEl.className = `risk-level-box ${tempC || risk > 0 ? levelClass : (risk === 0 ? "safe" : "")}`;
  riskLevelEl.innerHTML = `
    <span class="risk-box-score">${scoreDisplay}</span>
    <span class="risk-box-label">${labelDisplay}</span>
  `;
  
  riskDesc.textContent = desc;
  
  console.log("Đã cập nhật risk UI hoàn tất");
}

// Thêm lời khuyên chi tiết dựa trên các yếu tố
function buildRiskAdvice(tempC, rh, windSpeedMs, precip) {
  if (!tempC && !rh && !windSpeedMs && !precip) return "";

  let advice = [];

  // Lời khuyên về nhiệt độ
  if (tempC >= 40) {
    advice.push("Nhiệt độ cực kỳ cao - Tránh ra ngoài vào giữa trưa, uống nhiều nước, mặc quần áo thoáng mát.");
  } else if (tempC >= 35) {
    advice.push("Nhiệt độ cao - Hạn chế vận động ngoài trời, bổ sung nước điện giải, đội mũ che nắng.");
  } else if (tempC >= 30) {
    advice.push("Trời nóng - Uống đủ nước, tránh hoạt động nặng vào buổi trưa.");
  } else if (tempC <= -5) {
    advice.push("Rét đậm - Mặc ấm đầy đủ, đặc biệt bảo vệ đầu, cổ, tay chân.");
  } else if (tempC <= 0) {
    advice.push("Trời lạnh - Mặc nhiều lớp áo, giữ ấm cơ thể.");
  }

  // Lời khuyên về độ ẩm
  if (rh >= 90) {
    advice.push("Độ ẩm rất cao - Cảnh giác sương mù, đường trơn trượt, dễ đổ mồ hôi.");
  } else if (rh >= 80) {
    advice.push("Độ ẩm cao - Cảm giác oi bức, cần không gian thoáng mát.");
  }

  // Lời khuyên về gió
  if (windSpeedMs >= 20) {
    advice.push("Gió rất mạnh - Nguy hiểm cho các hoạt động ngoài trời, cẩn thận vật dụng bay.");
  } else if (windSpeedMs >= 15) {
    advice.push("Gió mạnh - Khó khăn cho việc di chuyển, cẩn thận khi lái xe.");
  } else if (windSpeedMs >= 10) {
    advice.push("Gió khá mạnh - Che chắn kỹ khi ra ngoài.");
  }

  // Lời khuyên về mưa
  if (precip >= 20) {
    advice.push("Mưa rất to - Hạn chế ra đường, cảnh giác ngập úng, sạt lở.");
  } else if (precip >= 10) {
    advice.push("Mưa lớn - Mang theo ô/áo mưa, lái xe chậm và cẩn thận.");
  } else if (precip >= 5) {
    advice.push("Mưa vừa - Đường trơn, quan sát kỹ khi tham gia giao thông.");
  }

  return advice.join(" ");
}

async function fetch7DayForecast(lat, lon) {
  console.log(`fetch7DayForecast được gọi với lat=${lat}, lon=${lon}`);
  
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max&timezone=auto`;
    console.log("URL API:", url);
    
    const res = await fetch(url);
    console.log("Response status:", res.status);
    
    if (!res.ok) throw new Error("Không lấy được dữ liệu dự báo 7 ngày");
    
    const data = await res.json();
    console.log("API response data:", data);
    
    render7DayForecast(data);
  } catch (err) {
    console.error("Error fetching 7 day forecast:", err);
    const forecastGrid = document.getElementById("forecast-grid");
    if (forecastGrid) {
      forecastGrid.innerHTML = "<div>Lỗi khi tải dự báo 7 ngày</div>";
    }
  }
}

function render7DayForecast(data) {
  console.log("render7DayForecast được gọi với data:", data);
  
  const forecastGrid = document.getElementById("forecast-grid");
  if (!forecastGrid) {
    console.error("Không tìm thấy element #forecast-grid");
    return;
  }

  if (!data.daily) {
    console.error("Không có dữ liệu daily trong API response");
    return;
  }

  const daily = data.daily;
  const today = new Date();
  
  const daysCount = daily.time ? daily.time.length : 0;
  console.log(`Có ${daysCount} ngày dữ liệu`);

  forecastGrid.innerHTML = "";

  // Hiển thị 7 ngày tới
  for (let i = 0; i < 7 && daily.time && i < daily.time.length; i++) {
    console.log(`Đang render ngày ${i + 1}`);
    
    const date = new Date(daily.time[i]);
    const dayName = date.toLocaleDateString("vi-VN", { weekday: "short" });
    const dateStr = date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });

    const tempMax = daily.temperature_2m_max[i];
    const tempMin = daily.temperature_2m_min[i];
    const precip = daily.precipitation_sum[i];
    const windMax = daily.windspeed_10m_max[i];

    const item = document.createElement("div");
    item.className = "forecast-item";

    let weatherIcon = "🌤️";
    if (precip > 5) weatherIcon = "🌧️";
    else if (windMax > 15) weatherIcon = "💨";
    else if (tempMax > 25) weatherIcon = "☀️";
    else if (tempMin < 10) weatherIcon = "❄️";

    item.innerHTML = `
      <div class="forecast-date">${dayName} ${dateStr}</div>
      <div class="forecast-icon">${weatherIcon}</div>
      <div class="forecast-temp">${Math.round(tempMin)}° - ${Math.round(tempMax)}°</div>
      <div class="forecast-rain">🌧️ ${precip || 0}mm</div>
      <div class="forecast-wind">💨 ${Math.round(windMax)}m/s</div>
    `;

    forecastGrid.appendChild(item);
    console.log(`Đã append ngày ${i + 1} vào forecast-grid`);
  }
  
  console.log(`Đã render tổng cộng ${Math.min(7, daily.length)} ngày`);
}

function initSOS() {
  const btn = document.getElementById("sos-button");
  const modal = document.getElementById("sos-modal");
  const confirmModal = document.getElementById("sos-confirm-modal");
  const closeBtn = document.getElementById("close-modal");
  const cancelSOSBtn = document.getElementById("cancel-sos");
  const confirmSOSBtn = document.getElementById("confirm-sos");
  const statusEl = document.getElementById("sos-status");
  const riskLevelText = document.getElementById("risk-level-text");

  btn.addEventListener("click", () => {
    // Xác định mức độ rủi ro
    let riskLevel = "an toàn";
    let riskClass = "risk-level-safe";
    if (currentRiskScore >= 60) {
      riskLevel = "nguy hiểm";
      riskClass = "risk-level-danger";
    } else if (currentRiskScore >= 40) {
      riskLevel = "cảnh báo";
      riskClass = "risk-level-warning";
    } else if (currentRiskScore >= 20) {
      riskLevel = "chú ý";
      riskClass = "risk-level-caution";
    }
    
    // Hiển thị mức độ rủi ro trong modal
    if (riskLevelText) {
      riskLevelText.textContent = riskLevel;
      riskLevelText.className = riskClass;
    }
    
    // Hiển thị modal xác nhận
    confirmModal.classList.remove("hidden");
  });

  // Xử lý nút xác nhận
  confirmSOSBtn.addEventListener("click", () => {
    confirmModal.classList.add("hidden");
    statusEl.textContent =
      "ĐÃ GỬI TÍN HIỆU SOS TRÊN HỆ THỐNG (mô phỏng trên giao diện).";
    modal.classList.remove("hidden");
  });

  // Xử lý nút hủy
  cancelSOSBtn.addEventListener("click", () => {
    confirmModal.classList.add("hidden");
  });

  closeBtn.addEventListener("click", () => {
    modal.classList.add("hidden");
  });

  // Đóng modal khi click ra ngoài
  confirmModal.addEventListener("click", (e) => {
    if (e.target === confirmModal) {
      confirmModal.classList.add("hidden");
    }
  });
}

function initRiskInfo() {
  const btn = document.getElementById("risk-info-btn");
  const modal = document.getElementById("risk-modal");
  const closeBtn = document.getElementById("close-risk-modal");

  if (!btn || !modal || !closeBtn) {
    console.error("Không tìm thấy elements cho risk info modal");
    return;
  }

  btn.addEventListener("click", () => {
    modal.classList.remove("hidden");
  });

  closeBtn.addEventListener("click", () => {
    modal.classList.add("hidden");
  });

  // Đóng modal khi click ra ngoài
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.classList.add("hidden");
    }
  });
}

// Xử lý sliders test
function initTestSliders() {
  const tempSlider = document.getElementById("test-temp");
  const rhSlider = document.getElementById("test-rh");
  const windSlider = document.getElementById("test-wind");
  const precipSlider = document.getElementById("test-precip");

  const tempVal = document.getElementById("test-temp-val");
  const rhVal = document.getElementById("test-rh-val");
  const windVal = document.getElementById("test-wind-val");
  const precipVal = document.getElementById("test-precip-val");

  if (!tempSlider || !rhSlider || !windSlider || !precipSlider) {
    console.log("Không tìm thấy sliders test");
    return;
  }

  function updateTestRisk() {
    const temp = parseInt(tempSlider.value);
    const rh = parseInt(rhSlider.value);
    const wind = parseInt(windSlider.value);
    const precip = parseInt(precipSlider.value);

    tempVal.textContent = temp;
    rhVal.textContent = rh;
    windVal.textContent = wind;
    precipVal.textContent = precip;

    const risk = computeRiskScore({
      tempC: temp,
      rh: rh,
      windSpeedMs: wind,
      precip: precip
    });

    updateRiskUI(risk, temp, rh, wind, precip);
    console.log("Test risk updated:", { temp, rh, wind, precip, risk });
  }

  tempSlider.addEventListener("input", updateTestRisk);
  rhSlider.addEventListener("input", updateTestRisk);
  windSlider.addEventListener("input", updateTestRisk);
  precipSlider.addEventListener("input", updateTestRisk);

  // Không tính risk ban đầu, để giữ giá trị --
  console.log("Test sliders đã khởi tạo, chờ người dùng điều chỉnh");
}
