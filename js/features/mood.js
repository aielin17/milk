function toggleBatchFavoriteMode() {
            isBatchFavoriteMode = !isBatchFavoriteMode;
            selectedMessages = [];

            if (isBatchFavoriteMode) {
                document.body.classList.add('batch-favorite-mode');
                showBatchFavoriteActions();
                showNotification('批量收藏模式已开启，点击消息进行选择', 'info');
            } else {
                document.body.classList.remove('batch-favorite-mode');
                hideBatchFavoriteActions();
                showNotification('批量收藏模式已关闭', 'info');
            }

            renderMessages(true);
        }

        function hideBatchFavoriteActions() {
            const actions = document.querySelector('.batch-favorite-actions');
            if (actions) {

                actions.style.animation = 'floatUpAction 0.3s reverse forwards';
                setTimeout(() => {
                    actions.remove();
                }, 300);
            }
        }


        function showBatchFavoriteActions() {

            if (document.querySelector('.batch-favorite-actions')) return;

            const actions = document.createElement('div');
            actions.className = 'batch-favorite-actions';

            actions.innerHTML = `
        <button class="batch-action-btn-pill batch-btn-cancel" id="cancel-batch-favorite">
        <i class="fas fa-times"></i> 取消
        </button>
        <button class="batch-action-btn-pill batch-btn-confirm" id="confirm-batch-favorite">
        <i class="fas fa-check"></i> 确认收藏 (0)
        </button>
        `;
            document.body.appendChild(actions);

            document.getElementById('confirm-batch-favorite').addEventListener('click', confirmBatchFavorite);
            document.getElementById('cancel-batch-favorite').addEventListener('click', toggleBatchFavoriteMode);
        }


        function confirmBatchFavorite() {
            if (selectedMessages.length === 0) {
                showNotification('请先选择要收藏的消息', 'warning');
                return;
            }


            const count = selectedMessages.length;


            selectedMessages.forEach(msgId => {
                const message = messages.find(m => m.id === msgId);
                if (message) {
                    message.favorited = true;
                }
            });


            throttledSaveData();


            toggleBatchFavoriteMode();


            showNotification(`已成功收藏 ${count} 条消息`, 'success');
        }


        function renderAnniversaries() {
    const list = DOMElements.anniversaryModal.list;
    if (anniversaries.length === 0) {
        list.innerHTML = '<div class="no-favorites" style="padding:20px 0;"><i class="fas fa-heart" style="font-size:24px;margin-bottom:10px;"></i><p>还没有记录纪念日</p></div>';
        return;
    }

    list.innerHTML = anniversaries.map(anniversary => {
        const startDate = new Date(anniversary.date);
        const now = new Date();
        let diffDays;
        
        if (anniversary.type === 'countdown') {
            diffDays = Math.ceil((startDate - now) / (1000 * 60 * 60 * 24));
            if (diffDays < 0) diffDays = 0; 
        } else {
            diffDays = Math.floor((now - startDate) / (1000 * 60 * 60 * 24));
        }

        const typeClass = anniversary.type === 'countdown' ? 'type-future' : 'type-past';
        const tagText = anniversary.type === 'countdown' ? '倒数' : '纪念';

        return `
        <div class="anniversary-card ${typeClass}" data-id="${anniversary.id}">
            <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
                <div class="ann-info">
                    <div class="ann-name">
                        ${anniversary.name} 
                        <span class="ann-tag">${tagText}</span>
                    </div>
                    <div class="ann-date">${startDate.toLocaleDateString()}</div>
                </div>
                <div class="ann-days">
                    <span class="ann-number">${diffDays}</span>
                    <span class="ann-label">Days</span>
                </div>
            </div>
            <div class="ann-delete-btn" style="position:absolute; top:-8px; right:-8px; width:24px; height:24px; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer; opacity:0; transition:opacity 0.2s;" 
                 onclick="deleteAnniversary(${anniversary.id}, event)">
                <i class="fas fa-times" style="font-size:12px;"></i>
            </div>
        </div>
        `;
    }).join('');
}

        function addAnniversary() {
    const nameInput = document.getElementById('ann-input-name');
    const dateInput = document.getElementById('ann-input-date');
    
    const name = (nameInput ? nameInput.value : (DOMElements.anniversaryModal.nameInput ? DOMElements.anniversaryModal.nameInput.value : '')).trim();
    const date = dateInput ? dateInput.value : (DOMElements.anniversaryModal.dateInput ? DOMElements.anniversaryModal.dateInput.value : '');

    if (!name || !date) {
        showNotification('请填写名称和日期', 'error');
        return;
    }

    const type = (typeof currentAnnType !== 'undefined' ? currentAnnType : null) 
              || (typeof currentAnniversaryType !== 'undefined' ? currentAnniversaryType : 'anniversary');

    const newAnniversary = {
        id: Date.now(),
        name: name,
        date: date,
        type: type
    };

    anniversaries.push(newAnniversary);
    throttledSaveData();
    renderAnniversariesList();
    
    if (nameInput) nameInput.value = '';
    if (dateInput) dateInput.value = '';
    if (DOMElements.anniversaryModal.nameInput) DOMElements.anniversaryModal.nameInput.value = '';
    if (DOMElements.anniversaryModal.dateInput) DOMElements.anniversaryModal.dateInput.value = '';

    const annFormWrapper = document.getElementById('ann-form-wrapper');
    const annToggleBtn = document.getElementById('ann-toggle-btn');
    if (annFormWrapper) annFormWrapper.classList.remove('active');
    if (annToggleBtn) annToggleBtn.classList.remove('active');

    showNotification('纪念日已添加', 'success');
    if (typeof playSound === 'function') playSound('anniversary');
}

        function showAnniversaryAnimation(anniversary) {
            const startDate = new Date(anniversary.date);
            const now = new Date();
            let diffDays;
            let title, message;

            if (anniversary.type === 'countdown') {

                diffDays = Math.ceil((startDate - now) / (1000 * 60 * 60 * 24));
                title = "倒数日";
                message = `即将到来`;
            } else {

                diffDays = Math.floor((now - startDate) / (1000 * 60 * 60 * 24));
                title = "纪念日快乐！";
                message = `相伴至今`;
            }

            DOMElements.anniversaryAnimation.title.textContent = title;
            DOMElements.anniversaryAnimation.days.textContent = diffDays;
            DOMElements.anniversaryAnimation.message.textContent = message;

            DOMElements.anniversaryAnimation.modal.classList.add('active');
        }

        function updateAnniversaryDisplay(dateString) {
            if (!dateString) return;

            const start = new Date(dateString);
            const now = new Date();
            const diffTime = Math.abs(now - start);
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

            DOMElements.anniversaryModal.daysElement.textContent = diffDays;
            DOMElements.anniversaryModal.dateShowElement.textContent = `起始日：${start.toLocaleDateString()}`;
            DOMElements.anniversaryModal.displayArea.style.display = 'block';
        }



const MOOD_OPTIONS = [
    { key: 'happy', kaomoji: '😆', label: '开心', color: '#FFD93D' },
    { key: 'excited', kaomoji: '🥰', label: '兴奋', color: '#FF6B6B' },
    { key: 'peace', kaomoji: '☺️', label: '平淡', color: '#6BCB77' },
    { key: 'sad', kaomoji: '😕', label: '难过', color: '#4D96FF' },
    { key: 'tired', kaomoji: '😞', label: '疲惫', color: '#8D9EFF' },
    { key: 'angry', kaomoji: '😠', label: '生气', color: '#FF4757' },
    { key: 'love', kaomoji: '🥰', label: '想你', color: '#FF9A8B' },
    { key: 'busy', kaomoji: '😵‍💫', label: '忙碌', color: '#A8D8EA' },
    { key: 'sleepy', kaomoji: '😴', label: '困困', color: '#E0C3FC' },
{ key: 'lonely', kaomoji: '🥹', label: '孤单', color: '#B8A9C9' }, 
{ key: 'cool', kaomoji: '😎', label: '潇洒', color: '#2C3E50' },
    { key: 'cute', kaomoji: '🥺', label: '撒娇', color: '#FFB6C1' }
];

let moodData = {}; 
let moodTrash = [];
let currentCalendarDate = new Date();
window.selectedDateStr = null;
let selectedDateStr = null;
let currentMoodPage = 1; 
let currentMoodEditTarget = 'me'; 
let customMoodOptions = []; 
let customMoodSelectedColor = '#FFD93D';
const CUSTOM_MOOD_COLORS = ['#FFD93D','#FF6B6B','#6BCB77','#4D96FF','#8D9EFF','#FF9A8B','#A8D8EA','#E0C3FC','#B8A9C9','#2C3E50'];

async function initMoodData() {
    const savedMoods = await localforage.getItem(getStorageKey('moodCalendar'));
    if (savedMoods) { moodData = savedMoods; }
    const savedCustomMoods = await localforage.getItem(getStorageKey('customMoodOptions'));
    if (savedCustomMoods) { customMoodOptions = savedCustomMoods; }
    const savedTrash = await localforage.getItem(getStorageKey('moodTrash'));
    if (savedTrash && Array.isArray(savedTrash)) { moodTrash = savedTrash; }
    window.moodData = moodData;
    window.moodTrash = moodTrash;
    checkPartnerDailyMood();
}
function checkPartnerDailyMood() {
    const today = new Date();
    const dateStr = formatDateStr(today);
    
    if (!moodData[dateStr]) {
        moodData[dateStr] = {};
    }

    if (!moodData[dateStr].partner && moodData[dateStr].partnerChecked === undefined) {
        moodData[dateStr].partnerChecked = true;
        if (Math.random() < 0.20) {
            saveMoodData();
            return;
        }
        const randomMood = getAllMoodOptions()[Math.floor(Math.random() * getAllMoodOptions().length)];
        moodData[dateStr].partner = randomMood.key;
        try {
            const cReplies = (typeof customReplies !== 'undefined') ? customReplies : (window._customReplies || []);
            const sourcePool = [...cReplies];
            if (sourcePool.length > 0) {
                const count = Math.floor(Math.random() * 3) + 1;
                const chosen = [];
                const shuffled = [...sourcePool].sort(() => Math.random() - 0.5);
                for (let i = 0; i < Math.min(count, shuffled.length); i++) {
                    chosen.push(shuffled[i]);
                }
                moodData[dateStr].partnerNote = chosen.join('　');
            }
        } catch(e) {  }
        saveMoodData();
    }
}
function saveMoodData() {
    localforage.setItem(getStorageKey('moodCalendar'), moodData);
    window.moodData = moodData;
    var moodModal = document.getElementById('mood-modal');
    if (moodModal && !moodModal.classList.contains('hidden') && moodModal.style.display !== 'none') {
        renderMoodCalendar();
    }
}
function saveCustomMoodOptions() {
    localforage.setItem(getStorageKey('customMoodOptions'), customMoodOptions);
}

function saveMoodTrash() {
    localforage.setItem(getStorageKey('moodTrash'), moodTrash).catch(() => {});
    window.moodTrash = moodTrash;
}
function getAllMoodOptions() {
    return [...MOOD_OPTIONS, ...customMoodOptions];
}
function formatDateStr(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}


let currentMoodSelection = null; 
function renderMoodCalendar() {
    const grid = document.getElementById('calendar-grid');
    const monthLabel = document.getElementById('calendar-month-label');
    
    if (!grid || !monthLabel) return;

    grid.innerHTML = '';
    
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    
    monthLabel.textContent = `${year}年 ${month + 1}月`;

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay(); 

    let stats = {
        me: { total: 0, counts: {} },
        partner: { total: 0, counts: {} }
    };

    for (let i = 0; i < startDayOfWeek; i++) {
        const empty = document.createElement('div');
        empty.className = 'calendar-day empty';
        grid.appendChild(empty);
    }

    const todayStr = formatDateStr(new Date());

    for (let d = 1; d <= daysInMonth; d++) {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'calendar-day';
        
        const dateObj = new Date(year, month, d);
        const dateStr = formatDateStr(dateObj);
        
        if (dateStr === todayStr) {
            dayDiv.classList.add('today');
            dayDiv.style.borderColor = 'var(--accent-color)';
        }

        const numSpan = document.createElement('span');
        numSpan.textContent = d;
        dayDiv.appendChild(numSpan);

        const dotsContainer = document.createElement('div');
        dotsContainer.className = 'mood-dots-container';

        const dayData = moodData[dateStr];
        
        if (dayData) {
            if (dayData.user) {
                const moodObj = getAllMoodOptions().find(m => m.key === dayData.user);
                if (moodObj) {
                    stats.me.counts[moodObj.key] = (stats.me.counts[moodObj.key] || 0) + 1;
                    stats.me.total++;
                    const dot = createMoodDot(moodObj, dayData.note, false);
                    dotsContainer.appendChild(dot);
                }
            }
            if (dayData.partner) {
                const moodObj = getAllMoodOptions().find(m => m.key === dayData.partner);
                if (moodObj) {
                    stats.partner.counts[moodObj.key] = (stats.partner.counts[moodObj.key] || 0) + 1;
                    stats.partner.total++;
                    const dot = createMoodDot(moodObj, dayData.partnerNote, true); 
                    dotsContainer.appendChild(dot);
                }
            }
        }

        dayDiv.appendChild(dotsContainer);

        dayDiv.addEventListener('click', () => {
            const dayEntry = moodData[dateStr];
            if (dayEntry && (dayEntry.user || dayEntry.partner)) {
                showDayDetails(dateStr, dayEntry);
            } else {
                openMoodSelector(dateStr, 'me');
            }
        });

        grid.appendChild(dayDiv);
    }

    updateDualMoodStats(stats);
}

function createMoodDot(moodObj, note, isPartner) {
    const dot = document.createElement('div');
    dot.className = `mood-detail-dot ${isPartner ? 'partner-mood' : ''}`;
    dot.style.backgroundColor = moodObj.color;
    
    if (isPartner) {
        dot.innerHTML = `
            <span class="mood-kaomoji-span">${moodObj.kaomoji}</span>
            <span class="mood-text-span">Ta</span>
        `;
    } else {
        const displayText = (note && note.trim()) ? note : moodObj.label;
        dot.innerHTML = `
            <span class="mood-kaomoji-span">${moodObj.kaomoji}</span>
            <span class="mood-text-span" style="margin-left:2px;">${displayText}</span>
        `;
    }
    return dot;
}
function updateDualMoodStats(stats) {
    const container = document.getElementById('mood-stats-container');
    if (!container) return;

    const mName = (typeof settings !== 'undefined' && settings.myName) ? settings.myName : '我';
    const pName = (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '梦角';

    const myTotal = stats.me.total;
    const partnerTotal = stats.partner.total;
    
    const daysInMonth = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + 1, 0).getDate();
    const myPercent = daysInMonth > 0 ? (myTotal / daysInMonth) * 100 : 0;
    const partnerPercent = daysInMonth > 0 ? (partnerTotal / daysInMonth) * 100 : 0;

    let myDominant = { label: '无', kaomoji: '😶', color: '#ccc' };
    let myMaxCount = 0;
    Object.keys(stats.me.counts).forEach(key => {
        if (stats.me.counts[key] > myMaxCount) {
            myMaxCount = stats.me.counts[key];
            const m = getAllMoodOptions().find(o => o.key === key);
            if (m) myDominant = m;
        }
    });

    let partnerDominant = { label: '无', kaomoji: '😶', color: '#ccc' };
    let partnerMaxCount = 0;
    Object.keys(stats.partner.counts).forEach(key => {
        if (stats.partner.counts[key] > partnerMaxCount) {
            partnerMaxCount = stats.partner.counts[key];
            const m = getAllMoodOptions().find(o => o.key === key);
            if (m) partnerDominant = m;
        }
    });
    
    const createMoodBarHTML = (moodCounts, totalCount) => {
        if (totalCount <= 0) {
            return `<div class="mood-bar-container" style="justify-content: center; align-items: center; font-size: 10px; color: var(--text-secondary); background: var(--message-received-bg);">无数据</div>`;
        }

        const segments = Object.keys(moodCounts)
            .map(key => {
                const count = moodCounts[key];
                const moodObj = getAllMoodOptions().find(m => m.key === key);
                if (moodObj) {
                    const percentage = (count / totalCount) * 100;
                    return `<div class="mood-bar-segment" style="width: ${percentage}%; background-color: ${moodObj.color};" title="${moodObj.label}: ${count}天"></div>`;
                }
                return ''; 
            })
            .join(''); 
        return `<div class="mood-bar-container">${segments}</div>`;
    };

    const myBarHTML = createMoodBarHTML(stats.me.counts, myTotal);
    const partnerBarHTML = createMoodBarHTML(stats.partner.counts, partnerTotal);

    var todayStr = formatDateStr(new Date());
    var todayEntry = moodData[todayStr] || {};
    var myWeatherVal = todayEntry.myWeather || '';
    var partnerWeatherVal = todayEntry.partnerWeather || '';

    container.innerHTML = `
        <div class="mood-circles-wrapper" style="margin-bottom:20px;">
            <div class="mood-circle-item">
                <div class="mood-circle" style="--percent: ${myPercent}%">
                    <span class="mood-circle-text" style="color:var(--accent-color)">${myTotal}</span>
                </div>
                <div class="mood-circle-label">
                    <span class="mood-marker me" style="width:8px;height:8px;"></span> ${mName}
                </div>
                <div class="stats-weather-tag" onclick="editStatsWeather(this,'me')" title="点击编辑天气">
                    ${myWeatherVal ? `<span>${myWeatherVal}</span>` : `<span style="opacity:0.4;">+ 天气</span>`}
                </div>
            </div>
            <div class="mood-circle-item">
                <div class="mood-circle" style="--percent: ${partnerPercent}%; --accent-color: #ff6b6b;">
                    <span class="mood-circle-text" style="color:#ff6b6b">${partnerTotal}</span>
                </div>
                <div class="mood-circle-label">
                    <span class="mood-marker partner" style="width:8px;height:8px;"></span> ${pName}
                </div>
                <div class="stats-weather-tag" onclick="editStatsWeather(this,'partner')" title="点击编辑天气">
                    ${partnerWeatherVal ? `<span>${partnerWeatherVal}</span>` : `<span style="opacity:0.4;">+ 天气</span>`}
                </div>
            </div>
        </div>

        <div class="mood-stat-group">
            <div class="mood-stat-title">
                <span>我的心情</span>
                <div class="dominant-mood-tag">
                    <span style="color:${myDominant.color}; font-weight:bold;">${myDominant.kaomoji} ${myDominant.label}</span>
                </div>
            </div>
            <div style="font-size:11px; color:var(--text-secondary); display:flex; justify-content:space-between;">
                <span>记录天数: ${myTotal}</span>
            </div>
            ${myBarHTML}
        </div>

        <div class="mood-stat-group">
            <div class="mood-stat-title">
                <span>${pName}的心情</span>
                <div class="dominant-mood-tag">
                    <span style="color:${partnerDominant.color}; font-weight:bold;">${partnerDominant.kaomoji} ${partnerDominant.label}</span>
                </div>
            </div>
            <div style="font-size:11px; color:var(--text-secondary); display:flex; justify-content:space-between;">
                <span>记录天数: ${partnerTotal}</span>
            </div>
            ${partnerBarHTML}
        </div>
    `;
}

window.editStatsWeather = function(el, who) {
    if (el.querySelector('input')) return;
    var todayStr = formatDateStr(new Date());
    if (!moodData[todayStr]) moodData[todayStr] = {};
    var current = who === 'me' ? (moodData[todayStr].myWeather || '') : (moodData[todayStr].partnerWeather || '');
    var input = document.createElement('input');
    input.type = 'text';
    input.value = current;
    input.maxLength = 20;
    input.placeholder = '今日天气…';
    input.style.cssText = 'width:100%;padding:3px 7px;border:1px solid var(--accent-color);border-radius:8px;font-size:12px;background:var(--primary-bg);color:var(--text-primary);outline:none;text-align:center;';
    el.innerHTML = '';
    el.appendChild(input);
    input.focus(); input.select();
    function save() {
        var val = input.value.trim();
        if (who === 'me') moodData[todayStr].myWeather = val;
        else moodData[todayStr].partnerWeather = val;
        saveMoodData();
        el.innerHTML = val ? `<span>${val}</span>` : `<span style="opacity:0.4;">+ 天气</span>`;
    }
    input.addEventListener('blur', save);
    input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') { e.preventDefault(); save(); }
        if (e.key === 'Escape') { el.innerHTML = current ? `<span>${current}</span>` : `<span style="opacity:0.4;">+ 天气</span>`; }
    });
};

window.deleteDailyMood = function(dateStr, who) {
    if (!moodData[dateStr]) return;
    const src = moodData[dateStr];
    const trashItem = {
        id: Date.now() + Math.random(),
        dateStr,
        who,
        deletedAt: new Date().toISOString(),
        payload: {}
    };

    if (who === 'me') {
        trashItem.payload = {
            user: src.user || null,
            note: src.note || '',
            myWeather: src.myWeather || ''
        };
        delete moodData[dateStr].user;
        delete moodData[dateStr].note;
        delete moodData[dateStr].myWeather;
    } else {
        trashItem.payload = {
            partner: src.partner || null,
            partnerNote: src.partnerNote || '',
            partnerWeather: src.partnerWeather || ''
        };
        delete moodData[dateStr].partner;
        delete moodData[dateStr].partnerNote;
        delete moodData[dateStr].partnerWeather;
    }

    if (!moodData[dateStr].user && !moodData[dateStr].partner) delete moodData[dateStr];

    moodTrash.unshift(trashItem);
    saveMoodTrash();

    saveMoodData();
    renderMoodCalendar();
    showNotification('已移入回收站', 'success');
    if (typeof playSound === 'function') playSound('mood');
    renderMoodTrashList && renderMoodTrashList();
    closeMoodOverlay();
};

function _escapeHtml(s) {
    return String(s || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function renderMoodTrashList() {
    const list = document.getElementById('mood-trash-list');
    if (!list) return;
    if (!moodTrash || moodTrash.length === 0) {
        list.innerHTML = `
            <div style="padding:22px 0; text-align:center; color:var(--text-secondary);">
                <div style="font-size:26px; opacity:0.35; margin-bottom:6px;">🗑</div>
                <div style="font-weight:600; font-size:13px;">回收站空空如也</div>
            </div>
        `;
        return;
    }
    const mName = (typeof settings !== 'undefined' && settings.myName) ? settings.myName : '我';
    const pName = (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '梦角';
    const allMoods = getAllMoodOptions();

    list.innerHTML = moodTrash.map(item => {
        const whoLabel = item.who === 'me' ? mName : pName;
        const moodKey = item.who === 'me' ? item.payload.user : item.payload.partner;
        const moodObj = moodKey ? allMoods.find(o => o.key === moodKey) : null;
        const moodText = moodObj ? `${moodObj.kaomoji} ${moodObj.label}` : '（无心情）';

        return `
            <div style="
                display:flex; align-items:center; justify-content:space-between; gap:10px;
                border:1.5px solid var(--border-color); background:var(--primary-bg);
                border-radius:14px; padding:12px 12px; margin-bottom:10px;
            ">
                <div style="min-width:0;">
                    <div style="font-size:13px; font-weight:700; color:var(--text-primary);">
                        ${_escapeHtml(item.dateStr)} · ${_escapeHtml(whoLabel)}
                    </div>
                    <div style="font-size:12px; color:var(--text-secondary); margin-top:3px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                        ${_escapeHtml(moodText)}
                    </div>
                </div>
                <div style="display:flex; gap:8px; flex-shrink:0;">
                    <button class="modal-btn modal-btn-secondary" onclick="restoreMoodTrashItem('${item.id}')" style="padding:7px 10px; font-size:12px; flex-shrink:0;">
                        恢复
                    </button>
                    <button class="modal-btn modal-btn-secondary" onclick="deleteMoodTrashItem('${item.id}')" style="padding:7px 10px; font-size:12px; color:#ff6b6b; border-color:rgba(255,107,107,0.4); flex-shrink:0;">
                        彻底删除
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

window.restoreMoodTrashItem = function(trashId) {
    const idStr = String(trashId);
    const item = (moodTrash || []).find(t => String(t.id) === idStr);
    if (!item) return;

    if (!moodData[item.dateStr]) moodData[item.dateStr] = {};
    if (item.who === 'me') {
        moodData[item.dateStr].user = item.payload.user;
        moodData[item.dateStr].note = item.payload.note || '';
        moodData[item.dateStr].myWeather = item.payload.myWeather || '';
    } else {
        moodData[item.dateStr].partner = item.payload.partner;
        moodData[item.dateStr].partnerNote = item.payload.partnerNote || '';
        moodData[item.dateStr].partnerWeather = item.payload.partnerWeather || '';
    }

    moodTrash = moodTrash.filter(t => String(t.id) !== idStr);
    saveMoodTrash();
    saveMoodData();
    renderMoodCalendar();
    renderMoodTrashList();
    showNotification('已从回收站恢复', 'success');
    if (typeof playSound === 'function') playSound('mood');
};

window.deleteMoodTrashItem = function(trashId) {
    const idStr = String(trashId);
    const item = (moodTrash || []).find(t => String(t.id) === idStr);
    if (!item) return;
    if (!confirm('确定要彻底删除这一条回收站记录吗？')) return;
    moodTrash = moodTrash.filter(t => String(t.id) !== idStr);
    saveMoodTrash();
    renderMoodTrashList();
    showNotification('已彻底删除', 'success');
    if (typeof playSound === 'function') playSound('error');
};

function exportMoodBackup() {
    try {
        const payload = {
            type: 'mood-backup',
            exportDate: new Date().toISOString(),
            moodCalendar: moodData,
            customMoodOptions: customMoodOptions,
            moodTrash: moodTrash
        };
        const fileName = `mood-backup-${new Date().toISOString().slice(0, 10)}.json`;
        exportDataToMobileOrPC(JSON.stringify(payload, null, 2), fileName);
        showNotification('✓ 心晴手账已导出', 'success');
        if (typeof playSound === 'function') playSound('export');
    } catch (e) {
        console.error('心晴手账导出失败:', e);
        showNotification('心晴手账导出失败', 'error');
    }
}

async function importMoodBackupFile(file) {
    if (!file) return;
    const text = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsText(file);
    });

    let data = null;
    try {
        data = JSON.parse(text);
    } catch (e) {
        showNotification('导入文件格式不正确', 'error');
        return;
    }

    if (!data || typeof data !== 'object') {
        showNotification('导入文件无效', 'error');
        return;
    }

    _showMoodImportPicker(data);
}

function _showMoodImportPicker(data) {
    const hasCalendar = data.moodCalendar && typeof data.moodCalendar === 'object';
    const hasCustom = Array.isArray(data.customMoodOptions);
    const hasTrash = Array.isArray(data.moodTrash);

    if (!hasCalendar && !hasCustom && !hasTrash) {
        showNotification('文件不包含可导入的心晴手账数据', 'error');
        return;
    }

    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.6);
        backdrop-filter:blur(10px);display:flex;align-items:flex-end;justify-content:center;
    `;
    overlay.innerHTML = `
        <div style="
            width:100%;max-width:520px;background:var(--secondary-bg);border-radius:24px 24px 0 0;
            box-shadow:0 -10px 60px rgba(0,0,0,0.3);
            padding:16px 18px env(safe-area-inset-bottom,0);
        ">
            <div style="width:36px;height:4px;border-radius:2px;background:var(--border-color);margin:0 auto 14px;"></div>
            <div style="font-size:16px;font-weight:800;color:var(--text-primary);margin-bottom:10px;">选择导入内容</div>
            <label style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 12px;border:1.5px solid var(--border-color);border-radius:16px;background:var(--primary-bg);margin-bottom:10px;opacity:${hasCalendar ? 1 : 0.45};">
                <span style="font-size:13px;font-weight:700;color:var(--text-primary);">心情日历</span>
                <input type="checkbox" id="mood-imp-cal" ${hasCalendar ? 'checked' : ''} ${hasCalendar ? '' : 'disabled'} style="transform:scale(1.1); accent-color:var(--accent-color);">
            </label>
            <label style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 12px;border:1.5px solid var(--border-color);border-radius:16px;background:var(--primary-bg);margin-bottom:10px;opacity:${hasCustom ? 1 : 0.45};">
                <span style="font-size:13px;font-weight:700;color:var(--text-primary);">自定义心情</span>
                <input type="checkbox" id="mood-imp-custom" ${hasCustom ? 'checked' : ''} ${hasCustom ? '' : 'disabled'} style="transform:scale(1.1); accent-color:var(--accent-color);">
            </label>
            <label style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 12px;border:1.5px solid var(--border-color);border-radius:16px;background:var(--primary-bg);margin-bottom:10px;opacity:${hasTrash ? 1 : 0.45};">
                <span style="font-size:13px;font-weight:700;color:var(--text-primary);">回收站</span>
                <input type="checkbox" id="mood-imp-trash" ${hasTrash ? 'checked' : ''} ${hasTrash ? '' : 'disabled'} style="transform:scale(1.1); accent-color:var(--accent-color);">
            </label>
            <div style="display:flex;gap:10px;margin-top:14px;">
                <button id="mood-imp-cancel" class="modal-btn modal-btn-secondary" style="flex:1;padding:12px 0;">取消</button>
                <button id="mood-imp-confirm" class="modal-btn modal-btn-primary" style="flex:1;padding:12px 0;">确认导入</button>
            </div>
        </div>
    `;

    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    const moodImpCancelBtn = document.getElementById('mood-imp-cancel');
    const moodImpConfirmBtn = document.getElementById('mood-imp-confirm');
    if (moodImpCancelBtn) moodImpCancelBtn.onclick = () => overlay.remove();
    if (moodImpConfirmBtn) moodImpConfirmBtn.onclick = () => {
        const selCal = document.getElementById('mood-imp-cal').checked;
        const selCustom = document.getElementById('mood-imp-custom').checked;
        const selTrash = document.getElementById('mood-imp-trash').checked;

        if (!selCal && !selCustom && !selTrash) {
            showNotification('请至少选择一项', 'error');
            return;
        }

        try {
            if (selCal && hasCalendar) {
                Object.keys(data.moodCalendar).forEach(dateStr => {
                    if (!moodData[dateStr]) moodData[dateStr] = {};
                    if (data.moodCalendar[dateStr] && typeof data.moodCalendar[dateStr] === 'object') {
                        Object.assign(moodData[dateStr], data.moodCalendar[dateStr]);
                    }
                });
            }

            if (selCustom && hasCustom) {
                const map = new Map();
                (customMoodOptions || []).forEach(m => map.set(m.key, m));
                data.customMoodOptions.forEach(m => map.set(m.key, m));
                customMoodOptions = [...map.values()];
            }

            if (selTrash && hasTrash) {
                const map = new Map();
                (moodTrash || []).forEach(t => map.set(String(t.id), t));
                data.moodTrash.forEach(t => map.set(String(t.id), t));
                moodTrash = [...map.values()];
            }

            window.moodData = moodData;
            window.moodTrash = moodTrash;

            saveMoodData();
            saveCustomMoodOptions();
            saveMoodTrash();

            renderMoodCalendar();
            renderMoodTrashList();
            showNotification('✓ 导入成功', 'success');
            if (typeof playSound === 'function') playSound('import');
            overlay.remove();
        } catch (err) {
            console.error('心晴手账导入失败:', err);
            showNotification('导入失败', 'error');
        }
    };

    document.body.appendChild(overlay);
}

function renderMoodOptionsGrid(targetKey) {
    const allMoods = getAllMoodOptions();
    const optionsGrid = document.getElementById('mood-options-grid');
    optionsGrid.innerHTML = allMoods.map(mood => {
        const isSelected = targetKey === mood.key;
        const isCustom = mood.key.startsWith('custom_');
        return `
        <div class="mood-option-btn${isCustom ? ' mood-option-custom' : ''}" 
             style="${isSelected ? `background:${mood.color}; color:#fff; border-color:${mood.color}; transform:scale(1.05); box-shadow:0 4px 10px rgba(0,0,0,0.15);` : ''}"
             onclick="tempSelectMood('${mood.key}')">
            <div class="mood-kaomoji" style="${isSelected ? 'color:#fff' : `color:${mood.color}`}">${mood.kaomoji}</div>
            <div class="mood-label">${mood.label}</div>
            ${(isCustom && currentMoodEditTarget === 'me') ? `<div class="mood-custom-actions" onclick="event.stopPropagation()">
                <button class="mood-custom-action-btn" onclick="editCustomMood('${mood.key}')" title="编辑">✏️</button>
                <button class="mood-custom-action-btn" onclick="deleteCustomMood('${mood.key}')" title="删除">🗑</button>
            </div>` : ''}
        </div>
    `}).join('');
}

function switchMoodPage(dir) {
    currentMoodPage = Math.max(1, Math.min(2, currentMoodPage + dir));
    const page1 = document.getElementById('mood-page-1');
    const page2 = document.getElementById('mood-page-2');
    const indicator = document.getElementById('mood-page-indicator');
    const prevBtn = document.getElementById('mood-page-prev');
    const nextBtn = document.getElementById('mood-page-next');
    if (currentMoodPage === 1) {
        page1.style.display = 'block'; page2.style.display = 'none';
        indicator.textContent = '第 1 页 · 心情';
        prevBtn.disabled = true; nextBtn.disabled = false;
    } else {
        page1.style.display = 'none'; page2.style.display = 'block';
        const isPartner = currentMoodEditTarget === 'partner';
        indicator.textContent = '第 2 页 · 随记';
        document.getElementById('mood-note-label').textContent = isPartner ? '对方随记:' : '随记:';
        document.getElementById('mood-note-input').placeholder = isPartner ? '记录对方今天发生的事...' : '记录下今天发生的小事...';
        prevBtn.disabled = false; nextBtn.disabled = true;
    }
}
window.switchMoodPage = switchMoodPage;

function switchMoodEditTarget(target) {
    currentMoodEditTarget = target;
    document.getElementById('mood-tab-me').classList.toggle('active', target === 'me');
    document.getElementById('mood-tab-partner').classList.toggle('active', target === 'partner');
    const existing = moodData[selectedDateStr];
    let currentKey, noteVal;
    if (target === 'me') {
        currentKey = existing ? existing.user : null;
        noteVal = (existing && existing.note) ? existing.note : '';
    } else {
        currentKey = existing ? existing.partner : null;
        noteVal = (existing && existing.partnerNote) ? existing.partnerNote : '';
    }
    currentMoodSelection = currentKey;
    document.getElementById('mood-note-input').value = noteVal;
    renderMoodOptionsGrid(currentKey);
    switchMoodPage(0); 
}
window.switchMoodEditTarget = switchMoodEditTarget;

function openMoodSelector(dateStr, editTarget) {
    selectedDateStr = dateStr;
    window.selectedDateStr = dateStr;
    currentMoodEditTarget = editTarget || 'me';
    currentMoodPage = 1;
    currentMoodSelection = null;

    const overlay = document.getElementById('mood-selector-overlay');
    const editorView = document.getElementById('mood-editor-view');
    const detailView = document.getElementById('mood-detail-view');
    const dateTitle = document.getElementById('mood-selector-date');

    if (window._moodOverlayRafId) {
        cancelAnimationFrame(window._moodOverlayRafId);
        window._moodOverlayRafId = null;
    }

    overlay.classList.remove('active');
    
    editorView.style.display = 'block';
    if (detailView) detailView.style.display = 'none';

    const [y, m, d] = dateStr.split('-');
    dateTitle.textContent = `${m}月${d}日`;

    document.getElementById('mood-tab-me').classList.toggle('active', currentMoodEditTarget === 'me');
    document.getElementById('mood-tab-partner').classList.toggle('active', currentMoodEditTarget === 'partner');

    const existing = moodData[dateStr];
    let currentKey, noteVal, weatherVal;
    if (currentMoodEditTarget === 'me') {
        currentKey = existing ? existing.user : null;
        noteVal = (existing && existing.note) ? existing.note : '';
        weatherVal = (existing && existing.myWeather) ? existing.myWeather : '';
    } else {
        currentKey = existing ? existing.partner : null;
        noteVal = (existing && existing.partnerNote) ? existing.partnerNote : '';
        weatherVal = (existing && existing.partnerWeather) ? existing.partnerWeather : '';
    }
    currentMoodSelection = currentKey;
    document.getElementById('mood-note-input').value = noteVal;
    const weatherInput = document.getElementById('mood-weather-input');
    if (weatherInput) weatherInput.value = weatherVal;
    const weatherLabel = document.getElementById('mood-weather-label');
    if (weatherLabel) {
        var pNameW = (typeof settings !== 'undefined' && settings.partnerName) ? settings.partnerName : '梦角';
        var mNameW = (typeof settings !== 'undefined' && settings.myName) ? settings.myName : '我';
        if (weatherLabel.firstChild) weatherLabel.firstChild.textContent = currentMoodEditTarget === 'me' ? mNameW + '的天气\u00a0' : pNameW + '的天气\u00a0';
    }

    document.getElementById('mood-page-1').style.display = 'block';
    document.getElementById('mood-page-2').style.display = 'none';
    document.getElementById('mood-page-indicator').textContent = '第 1 页 · 心情';
    document.getElementById('mood-page-prev').disabled = true;
    document.getElementById('mood-page-next').disabled = false;

    renderMoodOptionsGrid(currentKey);
    window._moodOverlayRafId = requestAnimationFrame(() => {
        window._moodOverlayRafId = null;
        overlay.classList.add('active');
    });
}

window.editPartnerMoodRecord = function() {
    openMoodSelector(selectedDateStr, 'partner');
};

window.tempSelectMood = function(key) {
    currentMoodSelection = key;
    renderMoodOptionsGrid(key);
}

document.getElementById('confirm-mood-save').addEventListener('click', () => {
    if (!selectedDateStr) return;
    if (!currentMoodSelection && currentMoodPage === 1) {
        showNotification('请先选择一个心情图标', 'warning');
        return;
    }
    if (!moodData[selectedDateStr]) moodData[selectedDateStr] = {};
    const weatherVal = (document.getElementById('mood-weather-input') || {}).value || '';
    if (currentMoodEditTarget === 'me') {
        if (currentMoodSelection) moodData[selectedDateStr].user = currentMoodSelection;
        moodData[selectedDateStr].note = document.getElementById('mood-note-input').value.trim();
        moodData[selectedDateStr].myWeather = weatherVal.trim();
    } else {
        if (currentMoodSelection) moodData[selectedDateStr].partner = currentMoodSelection;
        moodData[selectedDateStr].partnerNote = document.getElementById('mood-note-input').value.trim();
        moodData[selectedDateStr].partnerWeather = weatherVal.trim();
    }
    
    saveMoodData();
    closeMoodOverlay();
    showNotification('记录已保存 ✦', 'success');
    if (typeof playSound === 'function') playSound('mood');
});

function showDayDetails(dateStr, data) {
    selectedDateStr = dateStr;
    window.selectedDateStr = dateStr;
    const overlay = document.getElementById('mood-selector-overlay');
    const editorView = document.getElementById('mood-editor-view');
    const detailView = document.getElementById('mood-detail-view');
    
    const allMoods = getAllMoodOptions();
    const moodObj = allMoods.find(m => m.key === data.user);

    const [y, m, d] = dateStr.split('-');
    document.getElementById('detail-date').textContent = `${m}月${d}日`;

    const mySection = document.getElementById('detail-my-section');
    if (moodObj) {
        mySection.style.display = 'block';
        document.getElementById('detail-kaomoji').textContent = moodObj.kaomoji;
        document.getElementById('detail-label').textContent = moodObj.label;
        document.getElementById('detail-label').style.color = moodObj.color;
        document.getElementById('detail-text').textContent = data.note || "（这天没有写下随记...）";
        detailView.style.borderLeftColor = moodObj.color;
        const myWeatherEl = document.getElementById('detail-my-weather');
        if (myWeatherEl) {
            if (data.myWeather) { myWeatherEl.style.display = 'block'; document.getElementById('detail-my-weather-val').textContent = data.myWeather; }
            else myWeatherEl.style.display = 'none';
        }
    } else {
        mySection.style.display = 'none';
    }

    const partnerSection = document.getElementById('detail-partner-section');
    const partnerNoRecord = document.getElementById('detail-partner-no-record');
    if (data.partner) {
        const partnerMoodObj = allMoods.find(mo => mo.key === data.partner);
        if (partnerMoodObj) {
            partnerSection.style.display = 'block';
            if (partnerNoRecord) partnerNoRecord.style.display = 'none';
            document.getElementById('detail-partner-kaomoji').textContent = partnerMoodObj.kaomoji;
            document.getElementById('detail-partner-label').textContent = partnerMoodObj.label;
            document.getElementById('detail-partner-label').style.color = partnerMoodObj.color;
            document.getElementById('detail-partner-text').textContent = data.partnerNote || "（Ta 这天没有写下任何随记）";
            const partnerWeatherEl = document.getElementById('detail-partner-weather');
            if (partnerWeatherEl) {
                if (data.partnerWeather) { partnerWeatherEl.style.display = 'block'; document.getElementById('detail-partner-weather-val').textContent = data.partnerWeather; }
                else partnerWeatherEl.style.display = 'none';
            }
        } else {
            partnerSection.style.display = 'none';
            if (partnerNoRecord) partnerNoRecord.style.display = 'none';
        }
    } else {
        partnerSection.style.display = 'none';
        if (partnerNoRecord) partnerNoRecord.style.display = 'block';
    }

    editorView.style.display = 'none';
    detailView.style.display = 'block';
    overlay.classList.add('active');
}

document.getElementById('edit-existing-mood').addEventListener('click', () => {
    const editorView = document.getElementById('mood-editor-view');
    const detailView = document.getElementById('mood-detail-view');
    openMoodSelector(selectedDateStr, 'me');
    editorView.style.display = 'block';
    detailView.style.display = 'none';
});

window.closeMoodOverlay = function() {
    if (window._moodOverlayRafId) {
        cancelAnimationFrame(window._moodOverlayRafId);
        window._moodOverlayRafId = null;
    }
    const overlay = document.getElementById('mood-selector-overlay');
    if(overlay) {
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 0.25s ease';
        setTimeout(() => {
            overlay.classList.remove('active');
            overlay.style.opacity = '';
            overlay.style.transition = '';
            const customDialog = document.getElementById('custom-mood-dialog');
            if(customDialog) customDialog.style.display = 'none';
        }, 250);
    }
};
window.viewMoodDetailFromEditor = function() {
    if (!selectedDateStr || !moodData[selectedDateStr]) return;
    showDayDetails(selectedDateStr, moodData[selectedDateStr]);
};
document.getElementById('cancel-mood-edit').addEventListener('click', closeMoodOverlay);

window.openCustomMoodDialog = function() {
    const dialog = document.getElementById('custom-mood-dialog');
    document.getElementById('custom-mood-emoji').value = '';
    document.getElementById('custom-mood-label').value = '';
    customMoodSelectedColor = CUSTOM_MOOD_COLORS[0];
    const colorsEl = document.getElementById('custom-mood-colors');
    colorsEl.innerHTML = CUSTOM_MOOD_COLORS.map((c,i) => 
        `<div class="custom-mood-color-dot ${i===0?'selected':''}" style="background:${c};" onclick="selectCustomColor('${c}',this)"></div>`
    ).join('');
    const saveBtn = dialog.querySelector('.modal-btn-primary');
    saveBtn.onclick = window.saveCustomMood;
    dialog.style.display = 'block';
};
window.selectCustomColor = function(color, el) {
    customMoodSelectedColor = color;
    document.querySelectorAll('.custom-mood-color-dot').forEach(d => d.classList.remove('selected'));
    el.classList.add('selected');
};
window.closeCustomMoodDialog = function() {
    document.getElementById('custom-mood-dialog').style.display = 'none';
};
window.saveCustomMood = function() {
    const emoji = document.getElementById('custom-mood-emoji').value.trim();
    const label = document.getElementById('custom-mood-label').value.trim();
    if (!emoji || !label) { showNotification('请填写表情和名称', 'warning'); return; }
    const key = 'custom_' + Date.now();
    customMoodOptions.push({ key, kaomoji: emoji, label, color: customMoodSelectedColor });
    saveCustomMoodOptions();
    closeCustomMoodDialog();
    renderMoodOptionsGrid(currentMoodSelection);
    showNotification('自定义心情已添加 ✦', 'success');
    if (typeof playSound === 'function') playSound('mood');
};

window.deleteCustomMood = function(key) {
    customMoodOptions = customMoodOptions.filter(m => m.key !== key);
    saveCustomMoodOptions();
    renderMoodOptionsGrid(currentMoodSelection);
    showNotification('已删除自定义心情', 'success');
    if (typeof playSound === 'function') playSound('mood');
};

window.editCustomMood = function(key) {
    const mood = customMoodOptions.find(m => m.key === key);
    if (!mood) return;
    const dialog = document.getElementById('custom-mood-dialog');
    document.getElementById('custom-mood-emoji').value = mood.kaomoji;
    document.getElementById('custom-mood-label').value = mood.label;
    customMoodSelectedColor = mood.color;
    const colorsEl = document.getElementById('custom-mood-colors');
    colorsEl.innerHTML = CUSTOM_MOOD_COLORS.map((c) => 
        `<div class="custom-mood-color-dot ${c===mood.color?'selected':''}" style="background:${c};" onclick="selectCustomColor('${c}',this)"></div>`
    ).join('');
    dialog.style.display = 'block';
    dialog._editingKey = key;
    const saveBtn = dialog.querySelector('.modal-btn-primary');
    saveBtn.onclick = function() {
        const emoji = document.getElementById('custom-mood-emoji').value.trim();
        const label = document.getElementById('custom-mood-label').value.trim();
        if (!emoji || !label) { showNotification('请填写表情和名称', 'warning'); return; }
        const idx = customMoodOptions.findIndex(m => m.key === key);
        if (idx !== -1) customMoodOptions[idx] = { key, kaomoji: emoji, label, color: customMoodSelectedColor };
        saveCustomMoodOptions();
        closeCustomMoodDialog();
        saveBtn.onclick = null;
        renderMoodOptionsGrid(currentMoodSelection);
        showNotification('自定义心情已更新 ✦', 'success');
        if (typeof playSound === 'function') playSound('mood');
    };
};

function initMoodListeners() {
    const btnCalendar = document.getElementById('btn-view-calendar');
    const btnStats = document.getElementById('btn-view-stats');
    const btnTrash = document.getElementById('btn-view-trash');
    const viewCalendar = document.getElementById('mood-calendar-view');
    const viewStats = document.getElementById('mood-stats-view');
    const viewTrash = document.getElementById('mood-trash-view');

    if (btnCalendar && !btnCalendar.dataset.initialized) {
        btnCalendar.dataset.initialized = 'true';
        btnCalendar.addEventListener('click', () => {
            btnCalendar.classList.add('active');
            btnStats.classList.remove('active');
            btnTrash && btnTrash.classList.remove('active');
            viewCalendar.classList.remove('hidden-view');
            viewStats.classList.add('hidden-view');
            viewTrash && viewTrash.classList.add('hidden-view');
        });
    }

    if (btnStats && !btnStats.dataset.initialized) {
        btnStats.dataset.initialized = 'true';
        btnStats.addEventListener('click', () => {
            btnStats.classList.add('active');
            btnCalendar.classList.remove('active');
            viewStats.classList.remove('hidden-view');
            viewCalendar.classList.add('hidden-view');
            btnTrash && btnTrash.classList.remove('active');
            viewTrash && viewTrash.classList.add('hidden-view');
            renderMoodCalendar(); 
        });
    }

    if (btnTrash && !btnTrash.dataset.initialized) {
        btnTrash.dataset.initialized = 'true';
        btnTrash.addEventListener('click', () => {
            btnTrash.classList.add('active');
            btnCalendar.classList.remove('active');
            btnStats.classList.remove('active');
            viewTrash && viewTrash.classList.remove('hidden-view');
            viewCalendar && viewCalendar.classList.add('hidden-view');
            viewStats && viewStats.classList.add('hidden-view');
            renderMoodTrashList();
        });
    }

    const entryBtn = document.getElementById('mood-function');
    const modal = document.getElementById('mood-modal');
    
    if (entryBtn && !entryBtn.dataset.initialized) {
        entryBtn.dataset.initialized = 'true';
        const newBtn = entryBtn.cloneNode(true);
        entryBtn.parentNode.replaceChild(newBtn, entryBtn);
        
        newBtn.addEventListener('click', () => {
            if (typeof window.updateDynamicNames === 'function') window.updateDynamicNames();
            const advModal = document.getElementById('advanced-modal');
            if (advModal) hideModal(advModal); 
            setTimeout(() => {
                renderMoodCalendar();
                showModal(modal);
            }, 150); 
        });
    }

    const closeMoodBtn = document.getElementById('close-mood');
    if (closeMoodBtn && !closeMoodBtn.dataset.initialized) {
        closeMoodBtn.dataset.initialized = 'true';
        closeMoodBtn.addEventListener('click', () => hideModal(modal));
    }

    const exportMoodBtn = document.getElementById('mood-export-btn');
    const importMoodBtn = document.getElementById('mood-import-btn');
    const importFileInput = document.getElementById('mood-import-file-input');

    if (exportMoodBtn && !exportMoodBtn.dataset.initialized) {
        exportMoodBtn.dataset.initialized = 'true';
        exportMoodBtn.addEventListener('click', () => {
            if (typeof exportMoodBackup === 'function') exportMoodBackup();
        });
    }

    if (importMoodBtn && !importMoodBtn.dataset.initialized) {
        importMoodBtn.dataset.initialized = 'true';
        importMoodBtn.addEventListener('click', () => {
            importFileInput?.click();
        });
    }

    if (importFileInput && !importFileInput.dataset.initialized) {
        importFileInput.dataset.initialized = 'true';
        importFileInput.addEventListener('change', async (e) => {
            const file = e.target.files && e.target.files[0];
            if (!file) return;
            try {
                await importMoodBackupFile(file);
            } finally {
                importFileInput.value = '';
            }
        });
    }
    
    const cancelMoodBtn = document.getElementById('cancel-mood-edit');
    if (cancelMoodBtn && !cancelMoodBtn.dataset.initialized) {
        cancelMoodBtn.dataset.initialized = 'true';
        cancelMoodBtn.addEventListener('click', closeMoodOverlay);
    }

    const overlay = document.getElementById('mood-selector-overlay');
    if (overlay && !overlay.dataset.initialized) {
        overlay.dataset.initialized = 'true';
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeMoodOverlay();
            }
        });
    }

    const prevMonthBtn = document.getElementById('prev-month');
    if (prevMonthBtn && !prevMonthBtn.dataset.initialized) {
        prevMonthBtn.dataset.initialized = 'true';
        prevMonthBtn.addEventListener('click', () => {
            const y = currentCalendarDate.getFullYear();
            const m = currentCalendarDate.getMonth();
            currentCalendarDate = new Date(y, m - 1, 1);
            renderMoodCalendar();
        });
    }
    
    const nextMonthBtn = document.getElementById('next-month');
    if (nextMonthBtn && !nextMonthBtn.dataset.initialized) {
        nextMonthBtn.dataset.initialized = 'true';
        nextMonthBtn.addEventListener('click', () => {
            const y = currentCalendarDate.getFullYear();
            const m = currentCalendarDate.getMonth();
            currentCalendarDate = new Date(y, m + 1, 1);
            renderMoodCalendar();
        });
    }
}
