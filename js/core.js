/*核心应用逻辑：数据加载保存、消息渲染、会话管理等*/

        function clearAllAppData() {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.6);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;animation:fadeIn 0.2s ease;';
    overlay.innerHTML = `
        <div style="background:var(--secondary-bg);border-radius:20px;padding:24px;width:88%;max-width:340px;box-shadow:0 20px 60px rgba(0,0,0,0.4);animation:modalContentSlideIn 0.3s ease forwards;">
            <div style="text-align:center;margin-bottom:20px;">
                <div style="width:52px;height:52px;border-radius:50%;background:rgba(255,80,80,0.12);display:flex;align-items:center;justify-content:center;margin:0 auto 12px;">
                    <i class="fas fa-trash-alt" style="color:#ff5050;font-size:20px;"></i>
                </div>
                <div style="font-size:16px;font-weight:700;color:var(--text-primary);margin-bottom:6px;">重置数据</div>
                <div style="font-size:12px;color:var(--text-secondary);">请选择要重置的范围</div>
            </div>
            <div style="display:flex;flex-direction:column;gap:10px;">
                <button id="_reset_current" style="width:100%;padding:12px 16px;border:1px solid var(--border-color);border-radius:12px;background:var(--primary-bg);color:var(--text-primary);font-size:13px;font-weight:600;cursor:pointer;text-align:left;display:flex;align-items:center;gap:10px;transition:all 0.2s;">
                    <i class="fas fa-comment-slash" style="color:var(--accent-color);font-size:15px;width:18px;text-align:center;"></i>
                    <span>仅清除当前会话消息</span>
                </button>
                <button id="_reset_all" style="width:100%;padding:12px 16px;border:1px solid rgba(255,80,80,0.3);border-radius:12px;background:rgba(255,80,80,0.06);color:#ff5050;font-size:13px;font-weight:600;cursor:pointer;text-align:left;display:flex;align-items:center;gap:10px;transition:all 0.2s;">
                    <i class="fas fa-bomb" style="font-size:15px;width:18px;text-align:center;"></i>
                    <span>重置所有数据（完全清空）</span>
                </button>
                <button id="_reset_cancel" style="width:100%;padding:10px 16px;border:none;border-radius:12px;background:none;color:var(--text-secondary);font-size:13px;cursor:pointer;transition:all 0.2s;">取消</button>
            </div>
        </div>`;
    document.body.appendChild(overlay);

    function closeDialog() { overlay.remove(); }
    overlay.addEventListener('click', e => { if (e.target === overlay) closeDialog(); });
    const _resetCancelBtn = document.getElementById('_reset_cancel');
    const _resetCurrentBtn = document.getElementById('_reset_current');
    const _resetAllBtn = document.getElementById('_reset_all');

    if (_resetCancelBtn) _resetCancelBtn.onclick = closeDialog;

    if (_resetCurrentBtn) _resetCurrentBtn.onclick = () => {
        closeDialog();
        if (confirm('确定要清除当前会话的所有消息吗？此操作无法恢复！')) {
            messages = [];
            window.messages = messages; // 双保险：同步 window 属性
            displayedMessageCount = HISTORY_BATCH_SIZE;

            // 立即清除 localStorage 备份，防止 _tryRecoverFromBackup 在 IndexedDB 写入前恢复旧消息
            try { localStorage.removeItem('BACKUP_V1_critical'); } catch(e) {}
            try { localStorage.removeItem('BACKUP_V1_timestamp'); } catch(e) {}

            // 直接写入 IndexedDB（跳过 500ms 防抖），确保刷新后不恢复
            localforage.setItem(getStorageKey('chatMessages'), []).catch(() => {});

            renderMessages();
            showNotification('当前会话消息已清除', 'success');
        }
    };

    if (_resetAllBtn) _resetAllBtn.onclick = () => {
        closeDialog();
        if (confirm('【高危操作】确定要重置所有数据吗？此操作将清除所有本地数据且无法恢复！')) {
            window._skipBackup = true;
            messages = [];
            settings = {};
            localforage.clear().then(() => {
                localStorage.clear();
                showNotification('所有数据已重置，页面即将刷新', 'info', 2000);
                setTimeout(() => { window.location.href = window.location.pathname + '?reset=' + Date.now(); }, 2000);
            }).catch(e => {
                window._skipBackup = false;
                showNotification('清除数据时发生错误', 'error');
                console.error("清除 localforage 失败:", e);
            });
        }
    };
}

function loadMoreHistory() {
    const historyLoader = document.getElementById('history-loader');
    const container = DOMElements && DOMElements.chatContainer;
    const currentOldestMsgIndex = messages.length - displayedMessageCount;

    if (!container) return;
    if (isLoadingHistory) return;

    if (currentOldestMsgIndex <= 0) {
        if (historyLoader) historyLoader.style.display = 'none';
        return;
    }

    isLoadingHistory = true;
    if (historyLoader) historyLoader.style.display = 'flex';

    const visibleWrappers = Array.from(container.querySelectorAll('.message-wrapper'));
    const firstVisible = visibleWrappers.find(function(el) {
        return el.offsetTop + el.offsetHeight >= container.scrollTop;
    }) || visibleWrappers[0] || null;

    const anchorId = firstVisible ? firstVisible.dataset.msgId : null;
    const anchorTop = firstVisible ? firstVisible.getBoundingClientRect().top : 0;

    const prevVisibility = container.style.visibility;
    const prevOverflow = container.style.overflow;
    const prevScrollBehavior = container.style.scrollBehavior;
    const prevOpacity = container.style.opacity;

    container.style.opacity = '0.015';
    container.style.visibility = 'hidden';
    container.style.overflow = 'hidden';
    container.style.scrollBehavior = 'auto';

    setTimeout(() => {
        displayedMessageCount = Math.min(messages.length, displayedMessageCount + HISTORY_BATCH_SIZE);
        renderMessages(true);

        requestAnimationFrame(() => {
            if (anchorId) {
                const newAnchor = container.querySelector('[data-msg-id="' + anchorId + '"]');
                if (newAnchor) {
                    const newTop = newAnchor.getBoundingClientRect().top;
                    container.scrollTop += (newTop - anchorTop);
                }
            }

            requestAnimationFrame(() => {
                container.style.opacity = prevOpacity || '';
                container.style.visibility = prevVisibility || '';
                container.style.overflow = prevOverflow || '';
                container.style.scrollBehavior = prevScrollBehavior || '';

                if (historyLoader) {
                    historyLoader.style.display = (messages.length > displayedMessageCount) ? 'flex' : 'none';
                }
                isLoadingHistory = false;
            });
        });
    }, 120);
}


        function getDefaultSettings() {
            return {
                partnerName: "梦角",
                myName: "我",
                myStatus: "在线",
                partnerStatus: "在线",
                isDarkMode: false,
                colorTheme: "gold",
                soundEnabled: true,
                typingIndicatorEnabled: true,
                readReceiptsEnabled: true,
                replyEnabled: true,
                lastStatusChange: Date.now(),
                nextStatusChange: 1 + Math.random() * 7,
                fontSize: 16,
                bubbleStyle: 'standard',
                messageFontFamily: "'Noto Serif SC', serif",
                messageFontWeight: 400,
                messageLineHeight: 1.5,
                musicPlayerEnabled: false,
                replyDelayMin: 3000,
                replyDelayMax: 7000,
                inChatAvatarEnabled: true,
                inChatAvatarSize: 36,
                inChatAvatarPosition: 'center',
                alwaysShowAvatar: false,
                showPartnerNameInChat: false,
                customFontUrl: "", 
        customBubbleCss: "",
        customGlobalCss: "",
                myAvatarFrame: null, 
                partnerAvatarFrame: null,
                myAvatarShape: 'circle',
                partnerAvatarShape: 'circle',
autoSendEnabled: false,
autoSendInterval: 5,
        allowReadNoReply: false, 
        readNoReplyChance: 0.2,
        timeFormat: 'HH:mm',
        customSoundUrl: '',
        // 音效：两方分别可选（若对应 URL 为空则使用内置预设）
        mySendSoundPreset: 'tone_low',
        mySendCustomSoundUrl: '',
        partnerMessageSoundPreset: 'tone_low',
        partnerMessageCustomSoundUrl: '',
        myPokeSoundPreset: 'tone_low',
        myPokeCustomSoundUrl: '',
        partnerPokeSoundPreset: 'tone_low',
        partnerPokeCustomSoundUrl: '',
        soundVolume: 0.15,
        bottomCollapseMode: false,
        emojiMixEnabled: true,
        cloudAutoSyncEnabled: false,
        cloudAutoSyncInterval: 10
            };
        }


        function renderBackgroundGallery() {
            const list = document.getElementById('background-gallery-list');
            if (!list) return;

            list.innerHTML = '';

            
            const addBtn = document.createElement('div');
            addBtn.className = 'bg-item bg-add-btn';
            
            addBtn.innerHTML = '<i class="fas fa-plus"></i><span></span>';
            addBtn.onclick = () => document.getElementById('bg-gallery-input').click();
            list.appendChild(addBtn);

            const currentBg = safeGetItem(getStorageKey('chatBackground'));

            savedBackgrounds.forEach((bg, index) => {
                const item = document.createElement('div');
                let isActive = false;

                if (currentBg && currentBg === bg.value) isActive = true;

                item.className = `bg-item ${isActive ? 'active': ''}`;

                if (bg.type === 'image') {
                    item.innerHTML = `<img src="${bg.value}" loading="lazy" alt="bg">`;
                } else {
                    item.innerHTML = `<div class="bg-color-block" style="background: ${bg.value}"></div>`;
                }

                item.onclick = (e) => {
                    if (e.target.closest('.bg-delete-btn')) return;
                    applyBackground(bg.value);
                    safeSetItem(getStorageKey('chatBackground'), bg.value);
                    localforage.setItem(getStorageKey('chatBackground'), bg.value);
                    renderBackgroundGallery();
                    showNotification('背景已切换', 'success');
                };

                if (bg.id.startsWith('user-')) {
                    const delBtn = document.createElement('div');
                    delBtn.className = 'bg-delete-btn';
                    delBtn.innerHTML = '<i class="fas fa-trash"></i>';
                    delBtn.title = "删除此背景";
                    delBtn.onclick = (e) => {
                        e.stopPropagation();
                        if (confirm('确定删除这张背景图吗？')) {
                            savedBackgrounds.splice(index, 1);
                            saveBackgroundGallery();

                            if (isActive) {
                                removeBackground(); 
                                renderBackgroundGallery();
                            } else {
                                renderBackgroundGallery();
                            }
                        }
                    };
                    item.appendChild(delBtn);
                }

                list.appendChild(item);
            });
        }



        function saveBackgroundGallery() {
    localforage.setItem(getStorageKey('backgroundGallery'), savedBackgrounds);
}


        const applyBackground = (value) => {
            if (!value || typeof value !== 'string') return;
            try {
                if (value.startsWith('linear-gradient') || value.startsWith('#') || value.startsWith('rgb')) {
                    document.documentElement.style.setProperty('--chat-bg-image', value);
                } else {
                    const cssValue = value.startsWith('url(') ? value : `url(${value})`;
                    document.documentElement.style.setProperty('--chat-bg-image', cssValue);
                }
                document.body.classList.add('with-background');
            } catch (e) {
                if (typeof removeBackground === 'function') removeBackground();
            }
        };


const loadData = async () => {
    try {
        settings = getDefaultSettings();

        
        const results = await Promise.allSettled([
            localforage.getItem(getStorageKey('chatSettings')),
            localforage.getItem(getStorageKey('chatMessages')),
            localforage.getItem(getStorageKey('backgroundGallery')),
            localforage.getItem(getStorageKey('customReplies')),
            localforage.getItem(getStorageKey('customPokes')),
            localforage.getItem(getStorageKey('customStatuses')),
            localforage.getItem(getStorageKey('customMottos')),
            localforage.getItem(getStorageKey('customIntros')),
            localforage.getItem(getStorageKey('anniversaries')),
            localforage.getItem(getStorageKey('stickerLibrary')),
            localforage.getItem(`${APP_PREFIX}customThemes`),
            localforage.getItem(getStorageKey('chatBackground')),
            localforage.getItem(getStorageKey('partnerAvatar')),
            localforage.getItem(getStorageKey('myAvatar')),
            localforage.getItem(getStorageKey('partnerPersonas')), 
            localforage.getItem(getStorageKey('showPartnerNameInChat')),
            localforage.getItem(`${APP_PREFIX}themeSchemes`),
            localforage.getItem(getStorageKey('myStickerLibrary')),
            localforage.getItem(getStorageKey('customReplyGroups'))
        ]);
        const getVal = (index) => results[index].status === 'fulfilled' ? results[index].value : null;

        const savedSettings = getVal(0);
        const savedMessages = getVal(1);
        const savedBgGallery = getVal(2);
        const savedCustomReplies = getVal(3);
        const savedPokes = getVal(4);
        const savedStatuses = getVal(5);
        const savedMottos = getVal(6);
        const savedIntros = getVal(7);
        const savedAnniversaries = getVal(8);
        const savedStickers = getVal(9);
        const savedCustomThemes = getVal(10);
        const savedChatBg = getVal(11);
        const partnerAvatarSrc = getVal(12);
        const myAvatarSrc = getVal(13);
        const savedPartnerPersonas = getVal(14);
        const savedShowNameConfig = getVal(15);
        const savedThemeSchemes = getVal(16);
        const savedMyStickers = getVal(17);
        const savedReplyGroups = getVal(18);

        if (savedPartnerPersonas) partnerPersonas = savedPartnerPersonas;

        if (savedSettings) Object.assign(settings, savedSettings);

        if (settings.showPartnerNameInChat !== undefined) {
            showPartnerNameInChat = settings.showPartnerNameInChat;
        } else if (savedShowNameConfig !== null) {
            showPartnerNameInChat = savedShowNameConfig;
        }
        document.body.classList.toggle('show-partner-name', showPartnerNameInChat);
        try {
            if (settings.customFontUrl) applyCustomFont(settings.customFontUrl);
            if (settings.customBubbleCss) applyCustomBubbleCss(settings.customBubbleCss);
            if (settings.customGlobalCss) applyGlobalThemeCss(settings.customGlobalCss);
        } catch(e) { console.warn("样式应用失败", e); }
        
        if (savedPokes) customPokes = savedPokes;
        else customPokes = [...CONSTANTS.POKE_ACTIONS];

        if (savedStatuses) customStatuses = savedStatuses;
        else customStatuses = [...CONSTANTS.PARTNER_STATUSES];

        if (savedMottos) customMottos = savedMottos;
        else customMottos = [...CONSTANTS.HEADER_MOTTOS];
        
        if (savedIntros) customIntros = savedIntros;
        else customIntros = CONSTANTS.WELCOME_ANIMATIONS.map(a => `${a.line1}|${a.line2}`);

        if (savedMessages && Array.isArray(savedMessages)) {
            messages = savedMessages.map(m => ({
                ...m, timestamp: new Date(m.timestamp)
            }));
        } else {
            const backup = _tryRecoverFromBackup();
            if (backup && Array.isArray(backup.messages) && backup.messages.length > 0) {
                const timeSince = Math.round((Date.now() - backup.ts) / 60000);
                console.warn(`[loadData] 主存储无消息，正在从备份恢复（备份时间：${timeSince} 分钟前）`);
                messages = backup.messages.map(m => ({
                    ...m, timestamp: new Date(m.timestamp)
                }));
                if (backup.settings) Object.assign(settings, backup.settings);
                if (backup.anniversaries && Array.isArray(backup.anniversaries)) {
                    anniversaries = backup.anniversaries;
                }
                setTimeout(() => saveData(), 1000);
                showNotification(
                    `已从备份恢复 ${messages.length} 条消息${backup._truncated ? '（备份为最近200条）' : ''}`,
                    'warning', 6000
                );
            } else {
                messages = [];
            }
        }

        if (savedBgGallery) {
            savedBackgrounds = savedBgGallery;
        } else {
            savedBackgrounds = [{ id: 'preset-1', type: 'color', value: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' }];
        }

        if (savedCustomReplies) customReplies = savedCustomReplies;
        if (savedReplyGroups) window.customReplyGroups = savedReplyGroups;
        if (savedAnniversaries) anniversaries = savedAnniversaries;
        if (savedStickers) stickerLibrary = savedStickers;
        if (savedMyStickers) myStickerLibrary = savedMyStickers;
        if (savedCustomThemes) customThemes = savedCustomThemes;
        if (savedThemeSchemes) themeSchemes = savedThemeSchemes;
        try { const ce = await localforage.getItem(getStorageKey('customEmojis')); if (ce && Array.isArray(ce)) customEmojis = ce; } catch(e) {}
        window._customReplies = customReplies;
        window._CONSTANTS = CONSTANTS;

        if (DOMElements && DOMElements.partner && DOMElements.me) {
            updateAvatar(DOMElements.partner.avatar, partnerAvatarSrc);
            updateAvatar(DOMElements.me.avatar, myAvatarSrc);
        }

        if (savedChatBg) {
            applyBackground(savedChatBg);
        } else {
            const lsBg = safeGetItem(getStorageKey('chatBackground'));
            if (lsBg) {
                applyBackground(lsBg);
                localforage.setItem(getStorageKey('chatBackground'), lsBg);
            }
        }

        try { await initMoodData(); } catch(e) { console.warn("心情数据加载失败", e); }
        try { await loadEnvelopeData(); } catch(e) { console.warn("信封数据加载失败", e); }
        
        displayedMessageCount = HISTORY_BATCH_SIZE;
        
        setTimeout(() => {
            applyAllAvatarFrames();
            manageAutoSendTimer(); 
            checkEnvelopeStatus(); 
            updateUI();
            if (settings.customBubbleCss) {
                try { applyCustomBubbleCss(settings.customBubbleCss); } catch(e) {}
            }
        }, 100);

    } catch (e) {
        console.error("LoadData 内部致命错误:", e);
        settings = getDefaultSettings();
        messages = [];
        updateUI();
    }
};

const LIBRARY_CONFIG = {
    reply: {
        title: "回复库管理",
        tabs: [
            { id: 'custom', name: '主字卡', mode: 'list' },
            { id: 'emojis', name: 'Emoji', mode: 'grid' },
            { id: 'stickers', name: '表情库', mode: 'grid' }
        ]
    },
    atmosphere: {
        title: "氛围感配置",
        tabs: [
            { id: 'pokes', name: '拍一拍', mode: 'list' },
            { id: 'statuses', name: '对方状态', mode: 'list' },
            { id: 'mottos', name: '顶部格言', mode: 'list' },
            { id: 'intros', name: '开场动画', mode: 'list' }
        ]
    }
};
let currentAnnType = 'anniversary'; 

window.openMyStickerSettings = function() {
    const picker = document.getElementById('user-sticker-picker');
    if (picker) picker.classList.remove('active');
    if (typeof currentMajorTab !== 'undefined') {
        currentMajorTab = 'reply';
        currentSubTab = 'stickers';
    }
    var sidebarBtns = document.querySelectorAll('.sidebar-btn');
    sidebarBtns.forEach(function(b) { b.classList.toggle('active', b.dataset.major === 'reply'); });
    if (typeof renderReplyLibrary === 'function') renderReplyLibrary();
    var modal = document.getElementById('custom-replies-modal');
    if (modal && typeof showModal === 'function') showModal(modal);
};

window.switchAnnType = function(type) {
    currentAnnType = type;
    currentAnniversaryType = type; 
    document.querySelectorAll('.ann-type-btn').forEach(btn => {
        if (btn.dataset.type === type) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    const desc = document.getElementById('ann-type-desc');
    if(desc) {
        desc.textContent = type === 'anniversary' 
            ? '计算从过去某一天到现在已经过了多少天 (例如: 相识、恋爱)' 
            : '计算从现在到未来某一天还剩下多少天 (例如: 生日、跨年)';
    }
};

window.deleteAnniversaryItem = function(id) {
    if(confirm("确定要删除这条记录吗？")) {
        anniversaries = anniversaries.filter(a => a.id !== id);
        throttledSaveData(); 
        renderAnniversariesList();
        showNotification('已删除', 'success');
        if (typeof playSound === 'function') playSound('anniversary');
    }
};

const _BACKUP_PREFIX = 'BACKUP_V1_';
function _backupCriticalData() {
    if (window._skipBackup) return;
    try {
        const backupPayload = {
            ts: Date.now(),
            messages: messages,
            settings: settings,
            sessionId: SESSION_ID,
            anniversaries: anniversaries
        };

        let payloadToStore = backupPayload;
        const msgSizeEstimate = messages.length * 500; 
        if (msgSizeEstimate > 3 * 1024 * 1024) {
            payloadToStore = {
                ...backupPayload,
                messages: messages.slice(-200),
                _truncated: true
            };
        }

        const json = JSON.stringify(payloadToStore);

        if (json.length > 4.5 * 1024 * 1024) {
            const smallerPayload = {
                ...payloadToStore,
                messages: messages.slice(-50),
                _truncated: true
            };
            const smallerJson = JSON.stringify(smallerPayload);
            localStorage.setItem(_BACKUP_PREFIX + 'critical', smallerJson);
        } else {
            localStorage.setItem(_BACKUP_PREFIX + 'critical', json);
        }
        localStorage.setItem(_BACKUP_PREFIX + 'timestamp', String(Date.now()));
    } catch (e) {
        console.warn('localStorage 备份写入失败（可能存储已满）:', e);
    }
}

function _tryRecoverFromBackup() {
    try {
        const raw = localStorage.getItem(_BACKUP_PREFIX + 'critical');
        if (!raw) return null;
        return JSON.parse(raw);
    } catch (e) {
        return null;
    }
}

const saveData = async () => {
    if (!SESSION_ID) {
        console.warn('[saveData] SESSION_ID 尚未初始化，跳过保存以防数据写入临时 key');
        return;
    }

    const promises = [
        { key: 'chatSettings',           val: () => localforage.setItem(getStorageKey('chatSettings'), settings) },
        { key: 'customReplies',          val: () => localforage.setItem(getStorageKey('customReplies'), customReplies) },
        { key: 'customReplyGroups',      val: () => localforage.setItem(getStorageKey('customReplyGroups'), window.customReplyGroups || []) },
        { key: 'customEmojis',           val: () => localforage.setItem(getStorageKey('customEmojis'), customEmojis) },
        { key: 'anniversaries',          val: () => localforage.setItem(getStorageKey('anniversaries'), anniversaries) },
        { key: 'customPokes',            val: () => localforage.setItem(getStorageKey('customPokes'), customPokes) },
        { key: 'customStatuses',         val: () => localforage.setItem(getStorageKey('customStatuses'), customStatuses) },
        { key: 'customMottos',           val: () => localforage.setItem(getStorageKey('customMottos'), customMottos) },
        { key: 'customIntros',           val: () => localforage.setItem(getStorageKey('customIntros'), customIntros) },
        { key: 'stickerLibrary',         val: () => localforage.setItem(getStorageKey('stickerLibrary'), stickerLibrary) },
        { key: 'myStickerLibrary',       val: () => localforage.setItem(getStorageKey('myStickerLibrary'), myStickerLibrary) },
        { key: 'customThemes',           val: () => localforage.setItem(`${APP_PREFIX}customThemes`, customThemes) },
        { key: 'themeSchemes',           val: () => localforage.setItem(`${APP_PREFIX}themeSchemes`, themeSchemes) },
        { key: 'chatMessages',           val: () => localforage.setItem(getStorageKey('chatMessages'), messages) },
    ];

    const partnerAvatarSrc = (() => {
        try {
            const img = DOMElements.partner.avatar.querySelector('img');
            return img ? img.src : null;
        } catch(e) { return null; }
    })();
    const myAvatarSrc = (() => {
        try {
            const img = DOMElements.me.avatar.querySelector('img');
            return img ? img.src : null;
        } catch(e) { return null; }
    })();

    if (partnerAvatarSrc) {
        promises.push({ key: 'partnerAvatar', val: () => localforage.setItem(getStorageKey('partnerAvatar'), partnerAvatarSrc) });
    } else {
        promises.push({ key: 'partnerAvatar', val: () => localforage.removeItem(getStorageKey('partnerAvatar')) });
    }

    if (myAvatarSrc) {
        promises.push({ key: 'myAvatar', val: () => localforage.setItem(getStorageKey('myAvatar'), myAvatarSrc) });
    } else {
        promises.push({ key: 'myAvatar', val: () => localforage.removeItem(getStorageKey('myAvatar')) });
    }

    const results = await Promise.allSettled(promises.map(p => {
        try { return p.val(); }
        catch(e) { return Promise.reject(e); }
    }));

    const failed = [];
    results.forEach((r, i) => {
        if (r.status === 'rejected') {
            failed.push(promises[i].key);
            console.error(`[saveData] 保存失败: ${promises[i].key}`, r.reason);
        }
    });

    if (failed.length > 0) {
        console.warn(`[saveData] ${failed.length} 项写入失败，已触发 localStorage 降级备份`, failed);
    }

    _backupCriticalData();
    if (typeof window.markLocalBackupUpdated === 'function') {
        window.markLocalBackupUpdated('local-save');
    }
};

        function initializeRandomUI() {


            document.querySelector('.header-motto').textContent = getRandomItem(CONSTANTS.HEADER_MOTTOS);
if (customMottos && customMottos.length > 0) {
    document.querySelector('.header-motto').textContent = getRandomItem(customMottos);
} else {
    document.querySelector('.header-motto').textContent = '';
}
            const placeholder = "";
            DOMElements.messageInput.placeholder = placeholder.length > 20 ? placeholder.substring(0, 20) + "...": placeholder;


            const starsContainer = document.getElementById('stars-container');
            starsContainer.innerHTML = '';
            const starCount = 80;
            for (let i = 0; i < starCount; i++) {
                const star = document.createElement('div');
                star.className = 'star';
                const x = Math.random() * 100;
                const y = Math.random() * 100;
                const size = Math.random() * 2.5 + 0.5;
                const duration = Math.random() * 4 + 2;
                const delay = Math.random() * 6;
                star.style.left = `${x}%`;
                star.style.top = `${y}%`;
                star.style.width = `${size}px`;
                star.style.height = `${size}px`;
                star.style.setProperty('--duration', `${duration}s`);
                star.style.animationDelay = `${delay}s`;
                starsContainer.appendChild(star);
            }
            const particlesContainer = document.getElementById('welcome-particles');
            if (particlesContainer) {
                particlesContainer.innerHTML = '';
                const types = ['petal', 'petal', 'petal', 'sparkle', 'sparkle'];
                for (let i = 0; i < 22; i++) {
                    const p = document.createElement('div');
                    const type = types[i % types.length];
                    p.className = `wp ${type}`;
                    const sz = type === 'petal' ? (Math.random() * 6 + 5) : (Math.random() * 4 + 2);
                    p.style.setProperty('--pSz', sz + 'px');
                    p.style.left = (Math.random() * 100) + '%';
                    p.style.setProperty('--pDur', (Math.random() * 10 + 9) + 's');
                    p.style.setProperty('--pDel', (Math.random() * 8) + 's');
                    p.style.setProperty('--pX1', (Math.random() * 50 - 25) + 'px');
                    p.style.setProperty('--pX2', (Math.random() * 80 - 40) + 'px');
                    p.style.setProperty('--pX3', (Math.random() * 50 - 25) + 'px');
                    particlesContainer.appendChild(p);
                }
            }

            const meteorsContainer = document.getElementById('welcome-meteors');
            if (meteorsContainer) {
                meteorsContainer.innerHTML = '';
                let meteorCount = 0;
                const MAX_METEORS = 12;
                const createMeteor = () => {
                    if (meteorCount >= MAX_METEORS) return;
                    meteorCount++;
                    const m = document.createElement('div');
                    m.className = 'meteor';
                    m.style.left = (Math.random() * 100) + '%';
                    m.style.top = (Math.random() * 35) + '%';
                    const dur = (Math.random() * 0.8 + 0.7);
                    m.style.setProperty('--mDur', dur + 's');
                    m.style.setProperty('--mDel', '0s');
                    m.style.setProperty('--mRot', (25 + Math.random() * 20) + 'deg');
                    meteorsContainer.appendChild(m);
                    setTimeout(() => { m.remove(); meteorCount = Math.max(0, meteorCount - 1); }, (dur + 0.1) * 1000);
                };
                for (let i = 0; i < 8; i++) setTimeout(createMeteor, i * 350);
                const meteorTimer = setInterval(createMeteor, 600);
                setTimeout(() => clearInterval(meteorTimer), 5000);
            }

            const loaderBarEl = document.getElementById('loader-tech-bar');
            if (loaderBarEl) {
                setTimeout(() => loaderBarEl.classList.add('pulsing'), 300);
            }


            const welcomeIcon = getRandomItem(CONSTANTS.WELCOME_ICONS);
document.querySelector('.logo-icon-main').innerHTML = `<i class="${welcomeIcon}"></i>`;

if (customIntros && customIntros.length > 0) {
    const rawIntro = getRandomItem(customIntros);
    const parts = rawIntro.split('|');
    const line1 = parts[0];
    const line2 = parts[1] || ""; 

    const titleEl = document.getElementById('welcome-title-glitch');
    const subEl = document.getElementById('welcome-subtitle-scramble');

    titleEl.classList.remove('playing');
    titleEl.textContent = line1;
    void titleEl.offsetWidth;
    titleEl.classList.add('playing');

    const scrambleText = (element, finalText, duration = 1500) => {
                const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()';
                const length = finalText.length;
                let start = Date.now();

                const interval = setInterval(() => {
                    const now = Date.now();
                    const progress = (now - start) / duration;

                    if (progress >= 1) {
                        element.textContent = finalText;
                        clearInterval(interval);
                        return;
                    }

                    let result = '';

                    const revealIndex = Math.floor(progress * length);

                    for (let i = 0; i < length; i++) {
                        if (i <= revealIndex) {
                            result += finalText[i];
                        } else {

                            result += chars[Math.floor(Math.random() * chars.length)];
                        }
                    }
                    element.textContent = result;
                },
                    40);
            };


          setTimeout(() => {
        scrambleText(subEl, line2, 2000);
    }, 600);
} else {
    document.getElementById('welcome-title-glitch').textContent = "传讯";
    document.getElementById('welcome-subtitle-scramble').textContent = "请在设置中添加开场动画";
}


            const loaderBar = document.getElementById('loader-tech-bar');
            const statusText = document.getElementById('loader-status-text');
            loaderBar.style.width = '0%';
            const loadingPhases = [
                { width: '15%', text: 'INITIALIZING · 初始化中' },
                { width: '40%', text: 'LOADING MEMORIES · 读取记忆' },
                { width: '70%', text: 'BUILDING WORLD · 构建世界' },
                { width: '90%', text: 'ALMOST THERE · 即将完成' },
                { width: '100%', text: 'CONNECTED · 连接成功' }
            ];
            const delays = [100, 700, 1600, 2400, 2900];
            delays.forEach((delay, i) => {
                setTimeout(() => {
                    loaderBar.style.width = loadingPhases[i].width;
                    if (statusText) statusText.textContent = loadingPhases[i].text;
                }, delay);
            });
        }

function manageAutoSendTimer() {
    if (autoSendTimer) {
        clearInterval(autoSendTimer);
        autoSendTimer = null;
    }
    if (settings.autoSendEnabled) {
        const intervalMs = settings.autoSendInterval * 60 * 1000;
        
        autoSendTimer = setInterval(() => {
            if (!document.body.classList.contains('batch-favorite-mode')) {
                simulateReply(); 
            }
        }, intervalMs);
    }
}

        const updateUI = () => {
            const isCustomTheme = settings.colorTheme.startsWith('custom-');
            if (isCustomTheme) {
                const themeId = settings.colorTheme;
                const theme = customThemes.find(t => t.id === themeId);
                if (theme) {
                    applyTheme(theme.colors);
                } else {
                    DOMElements.html.setAttribute('data-color-theme', 'gold');
                }
            } else {
                DOMElements.html.setAttribute('data-color-theme', settings.colorTheme);
                applyTheme(null, true);
            }
            
            if (settings.customThemeColors && Object.keys(settings.customThemeColors).length > 0) {
                for (const [variable, value] of Object.entries(settings.customThemeColors)) {
                    document.documentElement.style.setProperty(variable, value);
                }
            }

            DOMElements.html.setAttribute('data-theme', settings.isDarkMode ? 'dark': 'light');
            DOMElements.themeToggle.innerHTML = settings.isDarkMode ? '<i class="fas fa-sun"></i>': '<i class="fas fa-moon"></i>';
            DOMElements.partner.name.textContent = settings.partnerName;
            DOMElements.me.name.textContent = settings.myName;
            DOMElements.partner.status.textContent = settings.partnerStatus || '在线';
            DOMElements.me.statusText.textContent = settings.myStatus;
            if (typeof window.updateDynamicNames === 'function') window.updateDynamicNames();
            document.documentElement.style.setProperty('--font-size', `${settings.fontSize}px`);
            
            const fontToUse = settings.messageFontFamily || "'Noto Serif SC', serif";
            
            document.documentElement.style.setProperty('--message-font-family', fontToUse);
            document.documentElement.style.setProperty('--font-family', fontToUse);
            document.documentElement.style.setProperty('--message-font-weight', settings.messageFontWeight);
            document.documentElement.style.setProperty('--message-line-height', settings.messageLineHeight);

            document.documentElement.style.setProperty('--in-chat-avatar-size', `${settings.inChatAvatarSize}px`);
            const _alignMap = { 'top': 'flex-start', 'center': 'center', 'bottom': 'flex-end', 'custom': 'flex-start' };
            document.documentElement.style.setProperty('--avatar-align', _alignMap[settings.inChatAvatarPosition || 'center'] || 'center');
            if (settings.inChatAvatarPosition === 'custom' && settings.inChatAvatarCustomOffset !== undefined) {
                document.documentElement.style.setProperty('--avatar-custom-offset', settings.inChatAvatarCustomOffset + 'px');
            }
            document.body.classList.toggle('always-show-avatar', !!settings.alwaysShowAvatar);
            if (typeof _applyCollapseState === 'function') _applyCollapseState(!!settings.bottomCollapseMode);
            document.body.classList.toggle('show-partner-name', !!(settings.showPartnerNameInChat || showPartnerNameInChat));

            document.querySelectorAll('.theme-color-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.theme === settings.colorTheme);
            });


            document.querySelectorAll('[data-bubble-style]').forEach(item => {
                item.classList.toggle('active', item.dataset.bubbleStyle === settings.bubbleStyle);
            });

            const _pillSyncMap = {
                '#reply-toggle': 'replyEnabled',
                '#sound-toggle': 'soundEnabled',
                '#read-receipts-toggle': 'readReceiptsEnabled',
                '#typing-indicator-toggle': 'typingIndicatorEnabled',
                '#read-no-reply-toggle': 'allowReadNoReply',
                '#emoji-mix-toggle': 'emojiMixEnabled',
                '#auto-send-toggle': 'autoSendEnabled'
            };
            for (const [sel, prop] of Object.entries(_pillSyncMap)) {
                const el = document.querySelector(sel);
                if (el) {
                    const val = prop === 'emojiMixEnabled' ? (settings[prop] !== false) : !!settings[prop];
                    el.classList.toggle('active', val);
                }
            }
            const _immToggle = document.getElementById('immersive-toggle');
            if (_immToggle) _immToggle.classList.toggle('active', document.body.classList.contains('immersive-mode'));

            renderMessages();
        };

        const updateAvatar = (element, src) => {
            if (src) element.innerHTML = `<img src="${src}" alt="avatar">`; else element.innerHTML = `<i class="fas fa-user"></i>`;
        };

        const removeBackground = () => {
            document.documentElement.style.removeProperty('--chat-bg-image');
            document.body.classList.remove('with-background');
            localforage.removeItem(getStorageKey('chatBackground'));
            safeRemoveItem(getStorageKey('chatBackground'));
            showNotification('背景图片已移除', 'success');
        };

        window.scrollToQuotedMessage = function(el) {
            const id = el.getAttribute('data-reply-id');
            if (!id) return;
            const tryScroll = () => {
                const target = document.querySelector(`[data-msg-id="${id}"]`);
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    target.classList.add('msg-highlight');
                    setTimeout(() => target.classList.remove('msg-highlight'), 1500);
                    return true;
                }
                return false;
            };
            if (!tryScroll()) {
                const msgIndex = messages.findIndex(m => String(m.id) === String(id));
                if (msgIndex === -1) {
                    if (typeof showNotification === 'function') showNotification('消息可能已被删除', 'info');
                    return;
                }
                const needed = messages.length - msgIndex;
                if (needed > displayedMessageCount) {
                    displayedMessageCount = needed;
                    renderMessages(false);
                    setTimeout(tryScroll, 150);
                } else {
                    if (typeof showNotification === 'function') showNotification('消息可能已被删除', 'info');
                }
            }
        };

function createMessageFragment(msg, prevMsg, nextMsg, lastSenderRef) {
    const fragment = new DocumentFragment();
    const messageDate = new Date(msg.timestamp).toDateString();
    const prevDate = prevMsg ? new Date(prevMsg.timestamp).toDateString() : null;

    if (messageDate !== prevDate) {
        const dateDivider = document.createElement('div');
        dateDivider.className = 'date-divider';
        const today = new Date().toDateString();
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        const displayDate = (messageDate === today) ? '今天' : (messageDate === yesterday) ? '昨天' : new Date(msg.timestamp).toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        dateDivider.innerHTML = `<span>${displayDate}</span>`;
        fragment.appendChild(dateDivider);
        lastSenderRef.current = null;
    }

    if (msg.type === 'system') {
        const systemMsgDiv = document.createElement('div');
        systemMsgDiv.className = 'system-message';
        systemMsgDiv.innerHTML = msg.text;
        fragment.appendChild(systemMsgDiv);
        lastSenderRef.current = 'system';
        return fragment;
    }

    if (msg.type === 'call-event') {
        const callEvDiv = document.createElement('div');
        callEvDiv.className = 'call-event-message';
        callEvDiv.dataset.id = msg.id;
        const icon = msg.callIcon || 'fa-video';
        const isRejected = icon === 'fa-phone-slash';
        const colorClass = isRejected ? 'call-event-pill--rejected' : 'call-event-pill--ended';
        const detail = msg.callDetail ? `<span class="call-event-detail">${msg.callDetail}</span>` : '';
        callEvDiv.innerHTML = `<div class="call-event-pill ${colorClass}"><i class="fas ${icon} call-event-icon"></i><span class="call-event-label">${msg.text.replace(/ · .*/, '')}</span>${detail}<button class="call-event-delete" title="删除" onclick="(function(btn){const id=btn.closest('[data-id]').dataset.id;const idx=messages.findIndex(m=>String(m.id)===String(id));if(idx>-1){messages.splice(idx,1);renderMessages();throttledSaveData();}})(this)"><i class="fas fa-times"></i></button></div>`;
        fragment.appendChild(callEvDiv);
        lastSenderRef.current = 'system';
        return fragment;
    }

    let showTimestamp = true;
    if (settings.timeFormat === 'off') {
        showTimestamp = false;
    } else if (nextMsg) {
        const currentTs = new Date(msg.timestamp).getTime();
        const nextTs = new Date(nextMsg.timestamp).getTime();
        if (nextMsg.sender === msg.sender && nextMsg.type !== 'system' && (nextTs - currentTs < 60000)) {
            showTimestamp = false;
        }
    }

    let isLastInSenderGroup = true;
    if (nextMsg) {
        const currentTs = new Date(msg.timestamp).getTime();
        const nextTs = new Date(nextMsg.timestamp).getTime();
        if (nextMsg.sender === msg.sender && nextMsg.type !== 'system' && (nextTs - currentTs < 60000)) {
            isLastInSenderGroup = false;
        }
    }

    const wrapper = document.createElement('div');
    wrapper.className = `message-wrapper ${msg.sender === 'user' ? 'sent' : 'received'}`;
    wrapper.dataset.id = msg.id;
    wrapper.dataset.msgId = msg.id;

    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'message-avatar';
    if (settings.inChatAvatarPosition === 'custom' && settings.inChatAvatarCustomOffset !== undefined) {
        avatarDiv.style.marginTop = settings.inChatAvatarCustomOffset + 'px';
    }

    const groupMember = (msg.sender !== 'user' && typeof getGroupMemberForMessage === 'function') ? getGroupMemberForMessage(msg.id) : null;

    if (settings.inChatAvatarEnabled) {
        const isSameSenderGroup = groupMember && lastSenderRef.current === 'group_' + (groupMember ? groupMember.name : '');
        const isSameSenderNormal = !groupMember && msg.sender === lastSenderRef.current;
        const shouldHide = !settings.alwaysShowAvatar && (isSameSenderGroup || isSameSenderNormal);
        if (shouldHide) {
            avatarDiv.classList.add('hidden');
        } else if (groupMember) {
            const groupAvatarShape = settings.partnerAvatarShape || 'circle';
            ['circle', 'square', 'pentagon', 'heart'].forEach(s => avatarDiv.classList.remove('shape-' + s));
            if (groupAvatarShape !== 'none') avatarDiv.classList.add('shape-' + groupAvatarShape);
            if (groupMember.avatar) {
                avatarDiv.innerHTML = `<img src="${groupMember.avatar}" style="width:100%;height:100%;object-fit:cover;">`;
            } else {
                const initials = (groupMember.name || '?').charAt(0).toUpperCase();
                avatarDiv.innerHTML = `<div style="width:100%;height:100%;background:var(--accent-color);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:#fff;">${initials}</div>`;
            }
        } else {
            const isUser = msg.sender === 'user';
            const avatarElement = isUser ? DOMElements.me.avatar : DOMElements.partner.avatar;
            const frameSettings = isUser ? settings.myAvatarFrame : settings.partnerAvatarFrame;
            const avatarShape = isUser ? (settings.myAvatarShape || 'circle') : (settings.partnerAvatarShape || 'circle');
            avatarDiv.innerHTML = avatarElement.innerHTML;
            applyAvatarFrame(avatarDiv, frameSettings);
            ['circle', 'square', 'pentagon', 'heart'].forEach(s => avatarDiv.classList.remove('shape-' + s));
            if (avatarShape !== 'none') avatarDiv.classList.add('shape-' + avatarShape);
        }
    } else {
        avatarDiv.style.display = 'none';
    }
    wrapper.appendChild(avatarDiv);

    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'message-content-wrapper';

    if (groupMember && groupChatSettings.showName) {
        const nameLabel = document.createElement('div');
        nameLabel.className = 'group-sender-name';
        nameLabel.textContent = groupMember.name;
        const isSameSenderGroupForName = lastSenderRef.current === 'group_' + groupMember.name;
        if (!isSameSenderGroupForName) contentWrapper.appendChild(nameLabel);
    } else if (!groupMember && msg.sender !== 'user' && msg.sender !== null && (settings.showPartnerNameInChat || showPartnerNameInChat)) {
        const isSameSenderForName = lastSenderRef.current === msg.sender;
        if (!isSameSenderForName) {
            const nameLabel = document.createElement('div');
            nameLabel.className = 'group-sender-name';
            nameLabel.textContent = settings.partnerName || msg.sender || '对方';
            contentWrapper.appendChild(nameLabel);
        }
    }

    let messageHTML = '';
    if (msg.replyTo) {
        const repliedText = msg.replyTo.text || (msg.replyTo.image ? '🖼 图片' : '[消息]');
        const repliedSender = msg.replyTo.sender === 'user' ? (settings.myName || '我') : (settings.partnerName || '对方');
        messageHTML += `<div class="reply-indicator" data-reply-id="${msg.replyTo.id || ''}" style="cursor:pointer;" onclick="scrollToQuotedMessage(this)"><span class="reply-indicator-sender">${repliedSender}</span><span class="reply-indicator-text">${repliedText}</span></div>`;
    }

    const isImageOnly = !msg.text && !!msg.image;
    let content = msg.text ? `<div>${msg.text.replace(/\n/g, '<br>')}</div>` : '';
    if (msg.image) content += `<img src="${msg.image}" class="message-image${isImageOnly ? ' message-image-only' : ''}" alt="图片" style="max-width:${isImageOnly ? '100px' : '100px'}; border-radius: 12px;${!isImageOnly ? ' margin-top: 6px;' : ''} cursor: pointer;" onclick="viewImage('${msg.image}')">`;
    messageHTML += content;

    const messageDiv = document.createElement('div');
    if (isImageOnly) {
        messageDiv.className = `message message-${msg.sender === 'user' ? 'sent' : 'received'} message-image-bubble-none`;
    } else {
        messageDiv.className = `message message-${msg.sender === 'user' ? 'sent' : 'received'} ${settings.bubbleStyle}`;
    }
    messageDiv.innerHTML = messageHTML;

    let actionsHTML = '';
    if (settings.replyEnabled) actionsHTML += `<button class="meta-action-btn reply-btn" title="回复"><i class="fas fa-reply"></i></button>`;
    const starIcon = msg.favorited ? 'fas fa-star' : 'far fa-star';
    actionsHTML += `<button class="meta-action-btn favorite-action-btn ${msg.favorited ? 'favorited' : ''}" title="${msg.favorited ? '取消收藏' : '收藏'}"><i class="${starIcon}"></i></button>`;
    actionsHTML += `<button class="meta-action-btn delete-btn" title="删除"><i class="fas fa-trash-alt"></i></button>`;
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'message-meta-actions';
    actionsDiv.innerHTML = actionsHTML;

    let metaHTML = '';
    if (showTimestamp) {
        const ts = new Date(msg.timestamp);
        let timeStr;
        const fmt = settings.timeFormat || 'HH:mm';
        if (fmt === 'HH:mm:ss') {
            timeStr = ts.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
        } else if (fmt === 'h:mm AM/PM') {
            timeStr = ts.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        } else if (fmt === 'h:mm:ss AM/PM') {
            timeStr = ts.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
        } else {
            timeStr = ts.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
        }
        metaHTML += `<div class="timestamp">${timeStr}</div>`;
    }

    if (msg.sender === 'user' && settings.readReceiptsEnabled && isLastInSenderGroup) {
        const rrStyle = settings.readReceiptStyle || 'icon';
        if (rrStyle === 'text') {
            if (msg.status === 'read') {
                metaHTML += `<div class="read-receipt read" style="font-size:9px;letter-spacing:0.3px;font-weight:500;">已读</div>`;
            } else {
                metaHTML += `<div class="read-receipt" style="font-size:9px;letter-spacing:0.3px;opacity:0.5;">未读</div>`;
            }
        } else {
            const statusIcon = msg.status === 'read' ? 'fa-check-double' : 'fa-check';
            metaHTML += `<div class="read-receipt ${msg.status === 'read' ? 'read' : ''}"><i class="fas ${statusIcon}"></i></div>`;
        }
    }

    if (metaHTML !== '') {
        const metaDiv = document.createElement('div');
        metaDiv.className = 'message-meta';
        if (!showTimestamp && !metaHTML.includes('timestamp')) {
            metaDiv.style.height = 'auto';
            metaDiv.style.marginTop = '2px';
            if (settings.inChatAvatarPosition !== 'top') {
                avatarDiv.style.marginBottom = '18px';
            }
        } else {
            if (settings.inChatAvatarPosition !== 'top') {
                avatarDiv.style.marginBottom = '26px';
            }
        }
        metaDiv.innerHTML = metaHTML;
        contentWrapper.append(actionsDiv, messageDiv, metaDiv);
    } else {
        contentWrapper.append(actionsDiv, messageDiv);
    }
    wrapper.appendChild(contentWrapper);
    fragment.appendChild(wrapper);

    lastSenderRef.current = groupMember ? ('group_' + groupMember.name) : msg.sender;
    return fragment;
}

function renderMessages(preserveScroll = false) {
    const container = DOMElements.chatContainer;
    const totalMessages = messages.length;
    const startIndex = Math.max(0, totalMessages - displayedMessageCount);
    const msgsToRender = messages.slice(startIndex);

    const historyLoader = document.getElementById('history-loader');
    if (historyLoader) {
        historyLoader.style.display = startIndex > 0 ? 'flex' : 'none';
    }

    DOMElements.emptyState.style.display = totalMessages === 0 ? 'flex' : 'none';

    const oldScrollHeight = container.scrollHeight;
    const oldScrollTop = container.scrollTop;
    
    container.innerHTML = '';

    const fragment = new DocumentFragment();
    
    const spacer = document.createElement('div');
    spacer.style.flex = '1';
    fragment.appendChild(spacer);

    let lastSenderRef = { current: null };
    msgsToRender.forEach((msg, i) => {
        const prevMsg = i > 0 ? msgsToRender[i - 1] : (startIndex > 0 ? messages[startIndex - 1] : null);
        const nextMsg = i < msgsToRender.length - 1 ? msgsToRender[i + 1] : null;
        const msgFragment = createMessageFragment(msg, prevMsg, nextMsg, lastSenderRef);
        fragment.appendChild(msgFragment);
    });

    container.appendChild(fragment);

    if (preserveScroll) {
        const newScrollHeight = container.scrollHeight;
        container.scrollTop = oldScrollTop + (newScrollHeight - oldScrollHeight);
    } else {
        requestAnimationFrame(() => {
            container.scrollTop = container.scrollHeight;
        });
    }
}

const addMessage = (message) => {
    if (!(message.timestamp instanceof Date)) message.timestamp = new Date(message.timestamp);
    
    const container = DOMElements.chatContainer;
    const wasEmpty = messages.length === 0;

    const prevMsg = messages.length > 0 ? messages[messages.length - 1] : null;
    messages.push(message);
    
    if (wasEmpty) {
        DOMElements.emptyState.style.display = 'none';
    }

    // --- Update previous message if needed ---
    const existingWrappers = container.querySelectorAll('.message-wrapper');
    const lastWrapper = existingWrappers.length > 0 ? existingWrappers[existingWrappers.length - 1] : null;
    if (lastWrapper && prevMsg) {
        const currentTs = new Date(message.timestamp).getTime();
        const prevTs = new Date(prevMsg.timestamp).getTime();

        if (message.sender === prevMsg.sender && message.type === 'normal' && prevMsg.type === 'normal' && (currentTs - prevTs < 60000)) {
            const timestampEl = lastWrapper.querySelector('.timestamp');
            if (timestampEl) timestampEl.style.display = 'none';
            if (prevMsg.sender === 'user') {
                const receiptEl = lastWrapper.querySelector('.read-receipt');
                if (receiptEl) receiptEl.style.display = 'none';
            }
        }
    }
    
    // --- Append new message ---
    let lastSenderRef = { current: null };
    if (prevMsg) {
        const prevGroupMember = (prevMsg.sender !== 'user' && typeof getGroupMemberForMessage === 'function') ? getGroupMemberForMessage(prevMsg.id) : null;
        lastSenderRef.current = prevGroupMember ? ('group_' + prevGroupMember.name) : prevMsg.sender;
    }
    
    const newMsgFragment = createMessageFragment(message, prevMsg, null, lastSenderRef);
    
    const spacer = container.querySelector('div[style*="flex: 1"]');
    if (spacer && spacer === container.lastElementChild) {
        spacer.before(newMsgFragment);
    } else {
        container.appendChild(newMsgFragment);
    }

    requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight;
    });

    throttledSaveData();
};

        window._addCallEvent = (icon, label, detail) => {
            addMessage({
                id: Date.now() + Math.random(),
                sender: 'system',
                text: label + (detail ? ' · ' + detail : ''),
                timestamp: new Date(),
                status: 'received',
                type: 'call-event',
                callIcon: icon || 'fa-video',
                callDetail: detail || null,
                favorited: false,
                note: null,
            });
        };

        function optimizeImage(file, maxWidth = 800, quality = 0.7) {
            return new Promise((resolve, reject) => {
                if (file.size < 300 * 1024) {
                    const reader = new FileReader();
                    reader.onload = e => resolve(e.target.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                    return;
                }
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    let {
                        width,
                        height
                    } = img;
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                    canvas.width = width;
                    canvas.height = height;
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', quality));
                    URL.revokeObjectURL(img.src);
                };
                img.onerror = () => {
                    const reader = new FileReader();
                    reader.onload = e => resolve(e.target.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                    URL.revokeObjectURL(img.src);
                };
                img.src = URL.createObjectURL(file);
            });
        }

        window.updateReplyPreview = function() {
            const container = DOMElements.replyPreviewContainer;
            if (!container) return;
            if (!currentReplyTo) {
                container.innerHTML = '';
                container.style.display = 'none';
                return;
            }
            const senderName = currentReplyTo.sender === 'user' ? (settings.myName || '我') : (settings.partnerName || '对方');
            const previewText = currentReplyTo.text ? currentReplyTo.text.slice(0, 40) : '🖼 图片';
            container.style.display = 'flex';
            container.innerHTML = `
                <div style="display:flex;align-items:center;gap:8px;padding:6px 10px;background:rgba(var(--accent-color-rgb),0.07);border-left:3px solid var(--accent-color);border-radius:0 8px 8px 0;width:100%;">
                    <div style="flex:1;min-width:0;">
                        <span style="font-size:11px;color:var(--accent-color);font-weight:600;">回复 ${senderName}</span>
                        <div style="font-size:12px;color:var(--text-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${previewText}</div>
                    </div>
                    <button onclick="currentReplyTo=null;window.updateReplyPreview();" style="background:none;border:none;cursor:pointer;color:var(--text-secondary);padding:2px 4px;font-size:14px;">✕</button>
                </div>`;
        };
        function updateReplyPreview() { window.updateReplyPreview(); }

        function sendMessage(textOverride = null, type = 'normal') {
            const text = textOverride || DOMElements.messageInput.value.trim();
            const imageFile = DOMElements.imageInput.files[0];
            if (!text && !imageFile && type === 'normal') return;

            DOMElements.messageInput.value = '';
            DOMElements.messageInput.style.height = '46px';
            if (imageFile && imageFile.size > MAX_IMAGE_SIZE) {
                showNotification('图片大小不能超过5MB', 'error'); DOMElements.imageInput.value = ''; return;
            }

            const createMessage = (imgSrc = null) => {
                const messageData = {
                    id: Date.now(),
                    sender: 'user',
                    text: text || '',
                    timestamp: new Date(),
                    image: imgSrc,
                    status: 'sent',
                    favorited: false,
                    note: null,
                    replyTo: currentReplyTo,
                    type: type
                };
                if (type === 'system') messageData.sender = null;

                addMessage(messageData);
                if (type !== 'system') playSound('send');
                currentReplyTo = null;
                updateReplyPreview();

if (!isBatchMode && type === 'normal') {
    const delayRange = settings.replyDelayMax - settings.replyDelayMin;
    const randomDelay = settings.replyDelayMin + Math.random() * delayRange;

    const chance = Math.max(0, Math.min(1, Number(settings.readNoReplyChance) || 0));
    const shouldIgnore = settings.allowReadNoReply && (Math.random() < chance);

    const readDelay = 1500 + Math.random() * 2500;
                setTimeout(() => {
        let changed = false;
        messages.forEach(msg => {
            if (msg.sender === 'user' && msg.status !== 'read') {
                msg.status = 'read';
                changed = true;
            }
        });
        if (changed) { renderMessages(false); throttledSaveData(); }
    }, readDelay);

    if (window._pendingReplyTimer) clearTimeout(window._pendingReplyTimer);
    window._pendingReplyTimer = null;

            if (!shouldIgnore) {
        if (settings.typingIndicatorEnabled) {
            const tiWrapper = document.getElementById('typing-indicator-wrapper');
            const tiLabel = document.getElementById('typing-indicator-label');
            const tiAvatar = document.getElementById('typing-indicator-avatar');
            if (tiLabel) tiLabel.textContent = (settings.partnerName || '对方') + ' 正在输入';
            if (tiWrapper) { 
                positionTypingIndicator(); 
                tiWrapper.style.display = 'block'; 
            }
            if (tiAvatar) {
                const partnerImg = DOMElements.partner.avatar.querySelector('img');
                tiAvatar.innerHTML = partnerImg ? `<img src="${partnerImg.src}">` : '<i class="fas fa-user"></i>';
            }
            if (DOMElements.chatContainer) DOMElements.chatContainer.scrollTop = DOMElements.chatContainer.scrollHeight;
        }
        window._pendingReplyTimer = setTimeout(() => {
            window._pendingReplyTimer = null;
            simulateReply();
        }, randomDelay);
    }
}
};

            if (imageFile) {
                showNotification('正在优化图片...', 'info', 1500);
                optimizeImage(imageFile).then(createMessage).catch(() => showNotification('图片处理失败', 'error'));
            } else {
                createMessage();
            }
            DOMElements.imageInput.value = '';
        }

        function toggleBatchMode() {
            isBatchMode = !isBatchMode;
            DOMElements.batchBtn.classList.toggle('active', isBatchMode);
            DOMElements.batchBtn.title = isBatchMode ? "退出批量模式": "批量发送模式";
            DOMElements.batchPreview.style.display = isBatchMode ? 'flex': 'none';
            const placeholder = "";
            DOMElements.messageInput.placeholder = isBatchMode ? "此刻，想说的有很多很多...": (placeholder.length > 20 ? placeholder.substring(0, 20) + "...": placeholder);
            if (isBatchMode) {
                batchMessages = []; updateBatchPreview();
            }
        }

        function addToBatch(imageOverride = null) {
            const text = DOMElements.messageInput.value.trim();
            if (!text && !imageOverride) return;
            batchMessages.push({
                id: Date.now() + batchMessages.length, text: text || '', image: imageOverride || null
            });
            DOMElements.messageInput.value = ''; DOMElements.messageInput.style.height = '46px';
            updateBatchPreview();
        }

        function updateBatchPreview() {
            const previewContainer = DOMElements.batchPreview;
            let listHTML = '';
            if (batchMessages.length > 0) {
                listHTML = batchMessages.map((msg, index) => {
                    const preview = msg.image
                        ? `<img src="${msg.image}" style="height:36px;width:36px;object-fit:cover;border-radius:6px;vertical-align:middle;margin-right:6px;">`
                        : '';
                    const label = msg.text
                        ? `<span class="batch-preview-text">${msg.text}</span>`
                        : `<span class="batch-preview-text" style="color:var(--text-secondary);font-style:italic;">图片</span>`;
                    return `<div class="batch-preview-item" data-index="${index}">${preview}${label}<button class="batch-preview-edit" title="编辑"><i class="fas fa-pencil-alt"></i></button><button class="batch-preview-remove"><i class="fas fa-times"></i></button></div>`;
                }).join('');
            } else {
                listHTML = '<div style="text-align: center; color: var(--text-secondary); font-size: 14px; padding: 10px;">つ♡⊂</div>';
            }

            previewContainer.innerHTML = `
        <div class="batch-preview-title">我有很多的话想说…！</div>
        <div class="batch-actions-top" style="display:flex;gap:6px;padding:4px 10px 0;"><label style="flex:1;display:flex;align-items:center;justify-content:center;gap:5px;padding:5px 8px;background:var(--secondary-bg);border:1px solid var(--border-color);border-radius:8px;cursor:pointer;font-size:12px;color:var(--text-secondary);"><i class="fas fa-image"></i>添加图片<input type="file" accept="image/*" style="display:none;" id="batch-image-input"></label></div>
        <div class="batch-preview-list">${listHTML}</div>
        <div class="batch-actions">
        <button class="batch-action-btn batch-cancel-btn">取消</button>
        <button class="batch-action-btn batch-send-btn" ${batchMessages.length === 0 ? 'disabled': ''}>发送全部 (${batchMessages.length})</button>
        </div>`;

            const batchImgInput = document.getElementById('batch-image-input');
            if (batchImgInput) {
                batchImgInput.addEventListener('change', async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    if (file.size > MAX_IMAGE_SIZE) { showNotification('图片超过5MB限制', 'warning'); return; }
                    try {
                        const base64 = await optimizeImage(file, 600, 0.8);
                        addToBatch(base64);
                    } catch(err) { showNotification('图片处理失败', 'error'); }
                    e.target.value = '';
                });
            }
        }

        function sendBatchMessages() {
            if (batchMessages.length === 0) return;
            showNotification(`正在发送 ${batchMessages.length} 条消息...`, 'info', 2000);
            batchMessages.forEach((msg, index) => {
                setTimeout(() => {
                    addMessage({
                        id: Date.now() + index, sender: 'user', text: msg.text || '', image: msg.image || null, timestamp: new Date(), status: 'sent', favorited: false, type: 'normal'
                    });
                    playSound('send');
                }, index * 300);
            });
            const delayRange = settings.replyDelayMax - settings.replyDelayMin;
            const randomDelay = settings.replyDelayMin + Math.random() * delayRange;
            setTimeout(simulateReply, batchMessages.length * 300 + randomDelay);
            isBatchMode = false; batchMessages = [];
            DOMElements.batchBtn.classList.remove('active'); DOMElements.batchPreview.style.display = 'none';
            const placeholder = "";
            DOMElements.messageInput.placeholder = placeholder.length > 20 ? placeholder.substring(0, 20) + "...": placeholder;
        }

        function positionTypingIndicator() {
            var tiW = document.getElementById('typing-indicator-wrapper');
            var inputArea = document.querySelector('.input-area-wrapper');
            if (!tiW || !inputArea) return;
            var h = inputArea.offsetHeight;
            tiW.style.bottom = h + 'px';
        }
        (function() {
            var inputArea = document.querySelector('.input-area-wrapper');
            if (!inputArea) return;
            if (typeof ResizeObserver === 'undefined') {
                window.addEventListener('resize', function() {
                    var tiW = document.getElementById('typing-indicator-wrapper');
                    if (tiW && tiW.style.display !== 'none') positionTypingIndicator();
                });
                return;
            }
            var ro = new ResizeObserver(function() {
                var tiW = document.getElementById('typing-indicator-wrapper');
                if (tiW && tiW.style.display !== 'none') positionTypingIndicator();
            });
            ro.observe(inputArea);
        })();

        window.simulateReply = function() {
            function showTypingIndicator() {
                if (!settings.typingIndicatorEnabled) return;
                const tiWrapper = document.getElementById('typing-indicator-wrapper');
                const tiLabel = document.getElementById('typing-indicator-label');
                const tiAvatar = document.getElementById('typing-indicator-avatar');
                if (tiLabel) tiLabel.textContent = (settings.partnerName || '对方') + ' 正在输入';
                if (tiWrapper) { 
                    positionTypingIndicator(); 
                    tiWrapper.style.display = 'block'; 
                }
                if (tiAvatar) {
                    const partnerImg = DOMElements.partner.avatar.querySelector('img');
                    tiAvatar.innerHTML = partnerImg ? `<img src="${partnerImg.src}">` : '<i class="fas fa-user"></i>';
                }
                DOMElements.chatContainer.scrollTop = DOMElements.chatContainer.scrollHeight;
            }

            let changed = false;
            messages.forEach(msg => {
                if (msg.sender === 'user' && msg.status !== 'read') {
                    msg.status = 'read'; changed = true;
                }
            });
            if (changed) {
                renderMessages(false); throttledSaveData();
            }

if (partnerPersonas && partnerPersonas.length > 0 && Math.random() < 0.3) {
                const currentPool = [
                    ...partnerPersonas
                ];
                if(currentPool.length > 0) {
                     const nextPersona = currentPool[Math.floor(Math.random() * currentPool.length)];
                     
                     settings.partnerName = nextPersona.name;
                     DOMElements.partner.name.textContent = nextPersona.name;
                     
                     if (nextPersona.avatar) {
                         updateAvatar(DOMElements.partner.avatar, nextPersona.avatar);
                         localforage.setItem(getStorageKey('partnerAvatar'), nextPersona.avatar);
                     }
                     throttledSaveData();
                }
            }
            if (Math.random() < 0.03) {
                // 对方的“拍一拍”只使用内置动作，不读取我方自定义拍一拍库
                if (CONSTANTS.POKE_ACTIONS && CONSTANTS.POKE_ACTIONS.length > 0) {
                    let randomAction = getRandomItem(CONSTANTS.POKE_ACTIONS);
                    if (typeof window._sanitizePokeTextForDisplay === 'function') {
                        randomAction = window._sanitizePokeTextForDisplay(randomAction);
                    }
                    const pokeText = (typeof window._formatPartnerPokeText === 'function')
                        ? window._formatPartnerPokeText(`${settings.partnerName} ${randomAction}`)
                        : `${settings.partnerName} ${randomAction}`;

                    addMessage({
                        id: Date.now(),
                        text: pokeText,
                        timestamp: new Date(),
                        type: 'system'
                    });
                    if (typeof playSound === 'function') playSound('partner_poke');
                (function(){try{if(window._typingIndicatorAutoHideTimer){clearTimeout(window._typingIndicatorAutoHideTimer);window._typingIndicatorAutoHideTimer=null;}}catch(e){}var _tiW=document.getElementById('typing-indicator-wrapper');if(_tiW){var _tiInner=_tiW.querySelector('.typing-indicator');if(_tiInner){_tiInner.classList.add('hiding');setTimeout(function(){_tiW.style.display='none';if(_tiInner)_tiInner.classList.remove('hiding');},240);}else{_tiW.style.display='none';}}})();
        return;
    }
}

            const replyCount = Math.random() < 0.75 ? 1: (Math.random() < 0.95 ? 2: 3);
            if (!customReplies || customReplies.length === 0) {
                showNotification('回复库为空，请先到「自定义回复」中添加内容', 'info', 3500);
                return;
            }
            const disabledItemsOnce = (() => {
                try {
                    const raw = localStorage.getItem('disabledReplyItems');
                    return raw ? new Set(JSON.parse(raw)) : new Set();
                } catch (e) { return new Set(); }
            })();
            const disabledGroupItemsOnce = new Set();
            (window.customReplyGroups || []).forEach(g => {
                if (g.disabled && Array.isArray(g.items)) g.items.forEach(item => disabledGroupItemsOnce.add(item));
            });
            const replyPoolOnce = customReplies
                .filter(r => !disabledItemsOnce.has(r) && !disabledGroupItemsOnce.has(r))
                .map(r => String(r || '').trim())
                .filter(Boolean);
            if (!replyPoolOnce.length) {
                showNotification('回复库可用内容为空（可能被分组禁用或屏蔽），请到「自定义回复」中调整', 'info', 4000);
                return;
            }

            // 确认有可用回复后再展示“正在输入中”，避免空转
            showTypingIndicator();
            let delay = 0;
            const recentUserMsgs = settings.replyEnabled
                ? messages.filter(m => m.sender === 'user' && m.text).slice(-10)
                : [];
            for (let i = 0; i < replyCount; i++) {
                const delayRange = settings.replyDelayMax - settings.replyDelayMin;
                delay += settings.replyDelayMin + Math.random() * delayRange;
                setTimeout(() => {
                    try {
                    const replyPool = replyPoolOnce;
                    // 被屏蔽或无效项直接换下一个，尽量保证每次都产出可用回复
                    let replyText = '';
                    for (let t = 0; t < 6; t++) {
                        const picked = replyPool[Math.floor(Math.random() * replyPool.length)];
                        if (picked && String(picked).trim()) {
                            replyText = String(picked).trim();
                            break;
                        }
                    }
                    if (!replyText && i === replyCount - 1) {
                        (function(){try{if(window._typingIndicatorAutoHideTimer){clearTimeout(window._typingIndicatorAutoHideTimer);window._typingIndicatorAutoHideTimer=null;}}catch(e){}var _tiW=document.getElementById('typing-indicator-wrapper');if(_tiW){var _tiInner=_tiW.querySelector('.typing-indicator');if(_tiInner){_tiInner.classList.add('hiding');setTimeout(function(){_tiW.style.display='none';if(_tiInner)_tiInner.classList.remove('hiding');},240);}else{_tiW.style.display='none';}}})();
                        return;
                    }

                    let disabledStickerItems = new Set();
                    try {
                        const raw = localStorage.getItem('disabledStickerItems');
                        if (raw) disabledStickerItems = new Set(JSON.parse(raw));
                    } catch (e) {}
                    const enabledStickerPool = (stickerLibrary || []).filter(s => !disabledStickerItems.has(s));
                    const shouldSendSticker = enabledStickerPool.length > 0 && Math.random() < 0.2;

                    let finalText = replyText;
                    let separateEmoji = null;
                    if (customEmojis && customEmojis.length > 0 && Math.random() < 0.2) {
                        const emoji = customEmojis[Math.floor(Math.random() * customEmojis.length)];
                        if (settings.emojiMixEnabled !== false) {
                            finalText = Math.random() < 0.5
                                ? emoji + ' ' + replyText
                                : replyText + ' ' + emoji;
                        } else {
                            separateEmoji = emoji;
                        }
                    }

                    addMessage({
                        id: Date.now() + i,
                        sender: settings.partnerName || '对方',
                        text: finalText,
                        timestamp: new Date(),
                        status: 'received',
                        favorited: false,
                        note: null,
                        replyTo: (i === 0 && recentUserMsgs.length > 0 && Math.random() < 0.3)
                            ? (function(){ const m = recentUserMsgs[Math.floor(Math.random() * recentUserMsgs.length)]; return { id: m.id, text: m.text, sender: m.sender }; })()
                            : null,
                        type: 'normal'
                    });
                    if (typeof window._sendPartnerNotification === 'function') {
                        window._sendPartnerNotification(settings.partnerName || '对方', finalText);
                    }
                    playSound('message');

                    if (shouldSendSticker) {
                        const randomSticker = enabledStickerPool[Math.floor(Math.random() * enabledStickerPool.length)];
                        setTimeout(() => {
                            addMessage({
                                id: Date.now() + i + 2000,
                                sender: settings.partnerName || '对方',
                                text: '',
                                timestamp: new Date(),
                                image: randomSticker,
                                status: 'received',
                                favorited: false,
                                note: null,
                                type: 'normal'
                            });
                            playSound('message');
                            if (typeof window._sendPartnerNotification === 'function') {
                                window._sendPartnerNotification(settings.partnerName || '对方', '[表情]');
                            }
                        }, 400 + Math.random() * 600);
                    }

                    if (separateEmoji) {
                        setTimeout(() => {
                            addMessage({
                                id: Date.now() + i + 1000,
                                sender: settings.partnerName || '对方',
                                text: separateEmoji,
                                timestamp: new Date(),
                                status: 'received',
                                favorited: false,
                                note: null,
                                type: 'normal'
                            });
                            playSound('message');
                        }, 300 + Math.random() * 400);
                    }

                    if (i === replyCount - 1) {
                        (function() {
                            try {
                                if (window._typingIndicatorAutoHideTimer) {
                                    clearTimeout(window._typingIndicatorAutoHideTimer);
                                    window._typingIndicatorAutoHideTimer = null;
                                }
                            } catch (e) {}
                            var _tiW = document.getElementById('typing-indicator-wrapper');
                            if (_tiW) {
                                var _tiInner = _tiW.querySelector('.typing-indicator');
                                if (_tiInner) {
                                    _tiInner.classList.add('hiding');
                                    setTimeout(function() {
                                        _tiW.style.display = 'none';
                                        if (_tiInner) _tiInner.classList.remove('hiding');
                                    }, 240);
                                } else {
                                    _tiW.style.display = 'none';
                                }
                            }
                        })();
                    }
                    } catch (e) {
                        console.error('[simulateReply] 渲染/回填出错:', e);
                        // 机制性兜底：出错时至少让“正在输入中”消失，避免假死
                        try {
                            (function(){
                                try { if (window._typingIndicatorAutoHideTimer) { clearTimeout(window._typingIndicatorAutoHideTimer); window._typingIndicatorAutoHideTimer = null; } } catch (e2) {}
                                var _tiW2 = document.getElementById('typing-indicator-wrapper');
                                if (_tiW2) _tiW2.style.display = 'none';
                            })();
                        } catch (e2) {}
                    }
                }, delay);
            }
        }

function showModal(modalElement, focusElement = null) {
            if (modalElement._hideTimeout) {
                clearTimeout(modalElement._hideTimeout);
                modalElement._hideTimeout = null;
            }
            modalElement.style.display = 'flex';
            requestAnimationFrame(() => {
                const content = modalElement.querySelector('.modal-content');
                if (content) {
                    content.style.opacity = '1';
                    content.style.transform = 'translateY(0) scale(1)';
                }
                if (focusElement) {
                    setTimeout(() => focusElement.focus(), 100);
                }
            });
        }

        function hideModal(modalElement) {
            const content = modalElement.querySelector('.modal-content');
            if (content) {
                content.style.opacity = '0';
                content.style.transform = 'translateY(20px) scale(0.95)';
            }
            if (modalElement._hideTimeout) clearTimeout(modalElement._hideTimeout);
            modalElement._hideTimeout = setTimeout(() => {
                modalElement.style.display = 'none';
            }, 300);
        }

        function viewImage(src) {
            const modal = document.createElement('div');
            modal.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.92);display:flex;align-items:center;justify-content:center;animation:fadeIn 0.2s ease;touch-action:pinch-zoom;';
            modal.innerHTML = `
                <div style="position:relative;max-width:95vw;max-height:92vh;display:flex;align-items:center;justify-content:center;">
                    <img src="${src}" style="max-width:95vw;max-height:88vh;object-fit:contain;display:block;border-radius:8px;box-shadow:0 8px 40px rgba(0,0,0,0.6);" draggable="false">
                    <button onclick="this.closest('[style*=fixed]').remove()" style="position:fixed;top:16px;right:16px;width:38px;height:38px;border-radius:50%;background:rgba(255,255,255,0.15);border:1.5px solid rgba(255,255,255,0.3);color:#fff;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px);z-index:10;line-height:1;">×</button>
                    <a href="${src}" download style="position:fixed;bottom:24px;left:50%;transform:translateX(-50%);padding:10px 24px;background:rgba(255,255,255,0.15);border:1.5px solid rgba(255,255,255,0.3);border-radius:20px;color:#fff;font-size:13px;text-decoration:none;backdrop-filter:blur(8px);display:flex;align-items:center;gap:6px;"><i class="fas fa-download"></i> 保存图片</a>
                </div>`;
            modal.addEventListener('click', (e) => {
                if (e.target === modal || e.target.tagName === 'IMG') modal.remove();
            });
            document.body.appendChild(modal);
        }

        function exportChatHistory() {
            const overlay = document.createElement('div');
            overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.55);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;animation:fadeIn 0.2s ease;';
            overlay.innerHTML = `
                <div style="background:var(--secondary-bg);border-radius:20px;padding:24px;width:88%;max-width:360px;box-shadow:0 20px 60px rgba(0,0,0,0.4);animation:modalContentSlideIn 0.3s ease forwards;">
                    <div style="font-size:15px;font-weight:700;color:var(--text-primary);margin-bottom:6px;display:flex;align-items:center;gap:8px;">
                        <i class="fas fa-file-export" style="color:var(--accent-color);font-size:14px;"></i>选择导出内容
                    </div>
                    <div style="font-size:12px;color:var(--text-secondary);margin-bottom:16px;">勾选需要导出的数据模块</div>
                    <div style="display:flex;flex-direction:column;gap:9px;margin-bottom:20px;">
                        <label style="display:flex;align-items:center;gap:10px;cursor:pointer;padding:10px 12px;border:1px solid var(--border-color);border-radius:12px;background:var(--primary-bg);font-size:13px;color:var(--text-primary);transition:border-color 0.2s;">
                            <input type="checkbox" id="_exp_msgs" checked style="accent-color:var(--accent-color);width:15px;height:15px;">
                            <i class="fas fa-comments" style="color:var(--accent-color);width:16px;text-align:center;"></i>
                            <span>聊天记录 <span style="font-size:11px;color:var(--text-secondary);">(${messages.length} 条)</span></span>
                        </label>
                        <label style="display:flex;align-items:center;gap:10px;cursor:pointer;padding:10px 12px;border:1px solid var(--border-color);border-radius:12px;background:var(--primary-bg);font-size:13px;color:var(--text-primary);transition:border-color 0.2s;">
                            <input type="checkbox" id="_exp_settings" checked style="accent-color:var(--accent-color);width:15px;height:15px;">
                            <i class="fas fa-sliders-h" style="color:var(--accent-color);width:16px;text-align:center;"></i>
                            <span>外观与聊天设置</span>
                        </label>
                        <label style="display:flex;align-items:center;gap:10px;cursor:pointer;padding:10px 12px;border:1px solid var(--border-color);border-radius:12px;background:var(--primary-bg);font-size:13px;color:var(--text-primary);transition:border-color 0.2s;">
                            <input type="checkbox" id="_exp_replies" style="accent-color:var(--accent-color);width:15px;height:15px;">
                            <i class="fas fa-reply" style="color:var(--accent-color);width:16px;text-align:center;"></i>
                            <span>字卡回复库</span>
                        </label>
                        <label style="display:flex;align-items:center;gap:10px;cursor:pointer;padding:10px 12px;border:1px solid var(--border-color);border-radius:12px;background:var(--primary-bg);font-size:13px;color:var(--text-primary);transition:border-color 0.2s;">
                            <input type="checkbox" id="_exp_ann" style="accent-color:var(--accent-color);width:15px;height:15px;">
                            <i class="fas fa-calendar-heart" style="color:var(--accent-color);width:16px;text-align:center;"></i>
                            <span>纪念日 / 倒计时</span>
                        </label>
                        <label style="display:flex;align-items:center;gap:10px;cursor:pointer;padding:10px 12px;border:1px solid var(--border-color);border-radius:12px;background:var(--primary-bg);font-size:13px;color:var(--text-primary);transition:border-color 0.2s;">
                            <input type="checkbox" id="_exp_themes" style="accent-color:var(--accent-color);width:15px;height:15px;">
                            <i class="fas fa-palette" style="color:var(--accent-color);width:16px;text-align:center;"></i>
                            <span>自定义主题配色</span>
                        </label>
                    </div>
                    <div style="display:flex;gap:10px;">
                        <button id="_exp_cancel" style="flex:1;padding:11px;border:1px solid var(--border-color);border-radius:12px;background:none;color:var(--text-secondary);font-size:13px;cursor:pointer;font-family:var(--font-family);">取消</button>
                        <button id="_exp_confirm" style="flex:2;padding:11px;border:none;border-radius:12px;background:var(--accent-color);color:#fff;font-size:13px;font-weight:600;cursor:pointer;font-family:var(--font-family);display:flex;align-items:center;justify-content:center;gap:7px;">
                            <i class="fas fa-download"></i>确认导出
                        </button>
                    </div>
                </div>`;
            document.body.appendChild(overlay);

            function closeDialog() { overlay.remove(); }
            overlay.addEventListener('click', e => { if (e.target === overlay) closeDialog(); });
            const _expCancelBtn = document.getElementById('_exp_cancel');
            const _expConfirmBtn = document.getElementById('_exp_confirm');
            if (_expCancelBtn) _expCancelBtn.onclick = closeDialog;

            if (_expConfirmBtn) _expConfirmBtn.onclick = function() {
                const inclMsgs     = !!document.getElementById('_exp_msgs')?.checked;
                const inclSettings = !!document.getElementById('_exp_settings')?.checked;
                const inclReplies  = !!document.getElementById('_exp_replies')?.checked;
                const inclAnn      = !!document.getElementById('_exp_ann')?.checked;
                const inclThemes   = !!document.getElementById('_exp_themes')?.checked;

                if (!inclMsgs && !inclSettings && !inclReplies && !inclAnn && !inclThemes) {
                    showNotification('请至少选择一项导出内容', 'error');
                    return;
                }
                closeDialog();

                try {
                    let dgCustomData = null, dgStatusPool = null, customWeatherMap = {};
                    if (inclSettings) {
                        try { dgCustomData = JSON.parse(localStorage.getItem('dg_custom_data') || 'null'); } catch(e2) {}
                        try { dgStatusPool = JSON.parse(localStorage.getItem('dg_status_pool') || 'null'); } catch(e2) {}
                        try {
                            Object.keys(localStorage).forEach(kk => {
                                if (kk && kk.startsWith('customWeather_')) {
                                    customWeatherMap[kk] = localStorage.getItem(kk);
                                }
                            });
                        } catch(e2) {}
                    }

                    const exportObj = {
                        version: '3.1',
                        appName: 'ChatApp',
                        exportDate: new Date().toISOString(),
                        exportModules: []
                    };
                    if (inclMsgs)     {
                        // 永远省略图片字段，只导出文字等基础信息，减小体积
                        exportObj.messages = messages.map(m => {
                            const { image, ...rest } = m;
                            return rest;
                        });
                        exportObj.exportModules.push('messages');
                    }
                    if (inclSettings) {
                        exportObj.settings = settings;
                        exportObj.exportModules.push('settings');
                        exportObj.dgCustomData = dgCustomData;
                        exportObj.dgStatusPool = dgStatusPool;
                        exportObj.customWeatherMap = customWeatherMap;
                    }
                    if (inclReplies)  {
                        exportObj.customReplies = customReplies;
                        if (customEmojis && customEmojis.length > 0) exportObj.customEmojis = customEmojis;
                        exportObj.exportModules.push('customReplies');
                    }
                    if (inclAnn)      { exportObj.anniversaries = anniversaries; exportObj.exportModules.push('anniversaries'); }
                    if (inclThemes)   {
                        exportObj.customThemes = customThemes;
                        // stickerLibrary 体积较大，这里不再随聊天备份导出
                        exportObj.exportModules.push('themes');
                    }

                    const dataStr = JSON.stringify(exportObj, null, 2);
                    const parts = exportObj.exportModules.join('+');
                    const fileName = `chat-export-${parts}-${new Date().toISOString().slice(0,10)}.json`;

                    if (navigator.share && /Mobile|Android|iPhone|iPad/.test(navigator.userAgent)) {
                        const blob = new Blob([dataStr], { type: 'application/json;charset=utf-8' });
                        const file = new File([blob], fileName, { type: 'application/json' });
                        if (navigator.canShare && navigator.canShare({ files: [file] })) {
                            navigator.share({ files: [file], title: '传讯数据导出', text: `导出日期：${new Date().toLocaleDateString()}` })
                                .catch(() => fallbackExport(dataStr, fileName));
                            return;
                        }
                    }
                    fallbackExport(dataStr, fileName);
                } catch (error) {
                    console.error('导出失败:', error);
                    showNotification('导出失败，请重试', 'error');
                }
            };
        }

        function fallbackExport(dataStr, fileName) {
            fileName = fileName || `chat-backup-${SESSION_ID}-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
            const dataBlob = new Blob([dataStr], { type: 'application/json;charset=utf-8' });
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(url), 2000);
            showNotification('导出成功', 'success');
        }

        function importChatHistory(file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    let rawText = e.target.result;
                    if (rawText.charCodeAt(0) === 0xFEFF) rawText = rawText.slice(1);
                    let importedData = JSON.parse(rawText);

                    // 兼容全量备份格式（type:'full' 或含 indexedDB/localforage 字段）
                    // 将其转换为 importChatHistory 能识别的标准字段
                    if (importedData && typeof importedData === 'object' &&
                        (importedData.type === 'full' || importedData.indexedDB || importedData.localforage) &&
                        !importedData.messages && !importedData.settings) {

                        const idb = importedData.indexedDB || importedData.localforage || {};
                        const ls  = importedData.localStorage || {};
                        const allKv = Object.assign({}, idb, ls);

                        // 找到 sessionId（取第一个带 _chatMessages 的键前缀）
                        let detectedSid = null;
                        const appPfx = importedData.appPrefix || 'CHAT_APP_V3_';
                        for (const k of Object.keys(allKv)) {
                            if (k.indexOf('_chatMessages') !== -1 && k.startsWith(appPfx)) {
                                const after = k.slice(appPfx.length);
                                const u = after.indexOf('_');
                                if (u > 0) { detectedSid = after.slice(0, u); break; }
                            }
                        }

                        const pfxSid = detectedSid ? (appPfx + detectedSid + '_') : null;
                        const getVal = (suffix) => {
                            if (pfxSid) {
                                const v = allKv[pfxSid + suffix];
                                if (v !== undefined && v !== null) return v;
                            }
                            // 无前缀回退
                            return allKv[suffix] !== undefined ? allKv[suffix] : null;
                        };
                        const parseVal = (v) => {
                            if (v === null || v === undefined) return null;
                            if (typeof v !== 'string') return v;
                            try { return JSON.parse(v); } catch(e2) { return v; }
                        };

                        const converted = {
                            version: importedData.version || '3.1',
                            appName:  importedData.appName || 'ChatApp',
                            exportDate: importedData.exportDate || importedData.timestamp || new Date().toISOString(),
                            exportModules: []
                        };

                        const msgs = parseVal(getVal('chatMessages'));
                        if (Array.isArray(msgs)) { converted.messages = msgs; converted.exportModules.push('messages'); }

                        const chatSettings = parseVal(getVal('chatSettings'));
                        if (chatSettings && typeof chatSettings === 'object') {
                            converted.settings = chatSettings;
                            converted.exportModules.push('settings');
                        }
                        // 额外的 localStorage 设置字段
                        const dgCustomData = parseVal(ls['dg_custom_data'] !== undefined ? ls['dg_custom_data'] : null);
                        if (dgCustomData) converted.dgCustomData = dgCustomData;
                        const dgStatusPool = parseVal(ls['dg_status_pool'] !== undefined ? ls['dg_status_pool'] : null);
                        if (dgStatusPool) converted.dgStatusPool = dgStatusPool;
                        const customWeatherMap = {};
                        for (const wk of Object.keys(ls)) {
                            if (wk && wk.startsWith('customWeather_')) customWeatherMap[wk] = ls[wk];
                        }
                        if (Object.keys(customWeatherMap).length) converted.customWeatherMap = customWeatherMap;

                        const replies = parseVal(getVal('customReplies'));
                        if (Array.isArray(replies)) { converted.customReplies = replies; converted.exportModules.push('customReplies'); }

                        const emojis = parseVal(getVal('customEmojis'));
                        if (Array.isArray(emojis)) converted.customEmojis = emojis;

                        const ann = parseVal(getVal('anniversaries'));
                        if (Array.isArray(ann)) { converted.anniversaries = ann; converted.exportModules.push('anniversaries'); }

                        const themes = parseVal(allKv[appPfx + 'customThemes'] !== undefined ? allKv[appPfx + 'customThemes'] : (ls[appPfx + 'customThemes'] || null));
                        if (themes) { converted.customThemes = themes; converted.exportModules.push('themes'); }

                        importedData = converted;
                    }

                    const hasMessages  = importedData.messages && Array.isArray(importedData.messages);
                    const hasSettings  = !!importedData.settings;
                    const hasReplies   = importedData.customReplies && Array.isArray(importedData.customReplies);
                    const hasAnn       = importedData.anniversaries && Array.isArray(importedData.anniversaries);
                    const hasThemes    = !!importedData.customThemes || !!importedData.stickerLibrary;

                    if (!hasMessages && !hasSettings && !hasReplies && !hasAnn && !hasThemes) {
                        throw new Error('无效的聊天记录文件（未检测到可识别的数据模块）');
                    }

                    const overlay = document.createElement('div');
                    overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.55);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;animation:fadeIn 0.2s ease;';

                    const makeRow = (id, icon, label, sublabel, available, checked) => {
                        if (!available) return '';
                        return `<label style="display:flex;align-items:center;gap:10px;cursor:pointer;padding:10px 12px;border:1px solid var(--border-color);border-radius:12px;background:var(--primary-bg);font-size:13px;color:var(--text-primary);">
                            <input type="checkbox" id="${id}" ${checked ? 'checked' : ''} style="accent-color:var(--accent-color);width:15px;height:15px;">
                            <i class="${icon}" style="color:var(--accent-color);width:16px;text-align:center;"></i>
                            <span>${label}${sublabel ? `<span style="font-size:11px;color:var(--text-secondary);margin-left:4px;">${sublabel}</span>` : ''}</span>
                        </label>`;
                    };

                    overlay.innerHTML = `
                        <div style="background:var(--secondary-bg);border-radius:20px;padding:24px;width:88%;max-width:360px;box-shadow:0 20px 60px rgba(0,0,0,0.4);animation:modalContentSlideIn 0.3s ease forwards;">
                            <div style="font-size:15px;font-weight:700;color:var(--text-primary);margin-bottom:6px;display:flex;align-items:center;gap:8px;">
                                <i class="fas fa-file-import" style="color:var(--accent-color);font-size:14px;"></i>选择导入内容
                            </div>
                            <div style="font-size:12px;color:var(--text-secondary);margin-bottom:16px;">文件中检测到以下数据，选择要导入的模块</div>
                            <div style="display:flex;flex-direction:column;gap:9px;margin-bottom:20px;">
                                ${makeRow('_imp_msgs', 'fas fa-comments', '聊天记录', hasMessages ? `(${importedData.messages.length} 条)` : '', hasMessages, true)}
                                ${makeRow('_imp_settings', 'fas fa-sliders-h', '外观与聊天设置', '', hasSettings, true)}
                                ${makeRow('_imp_replies', 'fas fa-reply', '字卡回复库', '', hasReplies, false)}
                                ${makeRow('_imp_ann', 'fas fa-calendar-heart', '纪念日 / 倒计时', '', hasAnn, false)}
                                ${makeRow('_imp_themes', 'fas fa-palette', '自定义主题配色', '', hasThemes, false)}
                            </div>
                            <div style="display:flex;gap:10px;">
                                <button id="_imp_cancel" style="flex:1;padding:11px;border:1px solid var(--border-color);border-radius:12px;background:none;color:var(--text-secondary);font-size:13px;cursor:pointer;font-family:var(--font-family);">取消</button>
                                <button id="_imp_confirm" style="flex:2;padding:11px;border:none;border-radius:12px;background:var(--accent-color);color:#fff;font-size:13px;font-weight:600;cursor:pointer;font-family:var(--font-family);display:flex;align-items:center;justify-content:center;gap:7px;">
                                    <i class="fas fa-upload"></i>确认导入
                                </button>
                            </div>
                        </div>`;
                    document.body.appendChild(overlay);

                    function closeDialog() { overlay.remove(); }
                    overlay.addEventListener('click', ev => { if (ev.target === overlay) closeDialog(); });
                    const _impCancelBtn = document.getElementById('_imp_cancel');
                    const _impConfirmBtn = document.getElementById('_imp_confirm');
                    if (_impCancelBtn) _impCancelBtn.onclick = closeDialog;

                    if (_impConfirmBtn) _impConfirmBtn.onclick = function() {
                        const doMsgs     = hasMessages  && !!document.getElementById('_imp_msgs')?.checked;
                        const doSettings = hasSettings  && !!document.getElementById('_imp_settings')?.checked;
                        const doReplies  = hasReplies   && !!document.getElementById('_imp_replies')?.checked;
                        const doAnn      = hasAnn       && !!document.getElementById('_imp_ann')?.checked;
                        const doThemes   = hasThemes    && !!document.getElementById('_imp_themes')?.checked;

                        if (!doMsgs && !doSettings && !doReplies && !doAnn && !doThemes) {
                            showNotification('请至少选择一项导入内容', 'error');
                            return;
                        }

                        if (doMsgs && messages.length > 0 && !confirm('导入将覆盖当前会话的聊天记录，确定继续吗？')) return;
                        closeDialog();

                        if (doMsgs) {
                            messages = importedData.messages.map(m => ({ ...m, timestamp: new Date(m.timestamp) }));
                        }
                        if (doSettings) {
                            if (importedData.settings) {
                                Object.assign(settings, importedData.settings);
                                try {
                                    if (settings.customFontUrl) applyCustomFont(settings.customFontUrl);
                                    if (settings.customBubbleCss) applyCustomBubbleCss(settings.customBubbleCss);
                                    if (settings.customGlobalCss) applyGlobalThemeCss(settings.customGlobalCss);
                                } catch(e2) { console.warn('导入后样式应用失败', e2); }
                            }
                            if (importedData.dgCustomData) { try { localStorage.setItem('dg_custom_data', JSON.stringify(importedData.dgCustomData)); } catch(e2) {} }
                            if (importedData.dgStatusPool) { try { localStorage.setItem('dg_status_pool', JSON.stringify(importedData.dgStatusPool)); } catch(e2) {} }
                            if (importedData.customWeatherMap) { try { Object.keys(importedData.customWeatherMap).forEach(wk => localStorage.setItem(wk, importedData.customWeatherMap[wk])); } catch(e2) {} }
                        }
                        if (doReplies  && importedData.customReplies)  customReplies  = importedData.customReplies;
                        if (doReplies  && importedData.customEmojis && Array.isArray(importedData.customEmojis)) customEmojis = importedData.customEmojis;
                        if (doAnn      && importedData.anniversaries)   anniversaries  = importedData.anniversaries;
                        if (doThemes   && importedData.customThemes)    customThemes   = importedData.customThemes;
                        if (doThemes   && importedData.stickerLibrary)  stickerLibrary = importedData.stickerLibrary;

                        saveData();
                        if (doMsgs && typeof renderMessages === 'function') renderMessages();
                        if (typeof applySettings === 'function') applySettings();
                        updateUI();
                        const count = doMsgs ? `${messages.length} 条消息` : '所选数据';
                        showNotification(`成功导入${count}`, 'success');
                    };
                } catch (error) {
                    console.error('导入失败:', error);
                    showNotification('文件格式错误或已损坏', 'error');
                }
            };
            reader.onerror = () => showNotification('文件读取失败', 'error');
            reader.readAsText(file);
        }

        const checkStatusChange = () => {
            if ((Date.now() - settings.lastStatusChange) / 36e5 >= settings.nextStatusChange) {
if (customStatuses && customStatuses.length > 0) {
    settings.partnerStatus = getRandomItem(customStatuses);
}
                settings.lastStatusChange = Date.now();
                settings.nextStatusChange = 1 + Math.random() * 7;
                DOMElements.partner.status.textContent = settings.partnerStatus;
                throttledSaveData();
            }
        };



        function getStorageKey(baseKey) {
            if (!SESSION_ID) {
                console.error('[getStorageKey] SESSION_ID 尚未初始化，拒绝生成存储键:', baseKey);
                throw new Error('SESSION_ID 未初始化，存储操作已中止');
            }
            return `${APP_PREFIX}${SESSION_ID}_${baseKey}`;
        }

        async function migrateData() {
            const isMigrated = await localforage.getItem(APP_PREFIX + 'MIGRATION_V2_DONE');
            if (isMigrated) return;

            try {
                const keys = Object.keys(localStorage);
                for (const key of keys) {
                    if (key.startsWith(APP_PREFIX)) {
                        try {
                            const val = localStorage.getItem(key);
                            if (val) {
                                let dataToStore = val;
                                try {
                                    if (val.startsWith('{') || val.startsWith('[')) {
                                        dataToStore = JSON.parse(val);
                                    }
                                } catch (e) {
                                    console.warn(`迁移期间解析数据失败: ${key}，将作为原始字符串存储。`, e);
                                }
                                await localforage.setItem(key, dataToStore);
                            }
                        } catch (e) {
                            console.error(`迁移键值 ${key} 时发生错误，已跳过。`, e);
                        }
                    }
                }
                
                await localforage.setItem(APP_PREFIX + 'MIGRATION_V2_DONE', 'true');
            } catch (e) {
                console.error("数据迁移过程中发生严重错误:", e);
                showNotification('数据迁移失败，部分旧数据可能丢失', 'error');
            }
        }

window.initializeSession = async function() {
    await migrateData();

    const sessionsData = await localforage.getItem(`${APP_PREFIX}sessionList`);
    sessionList = sessionsData || [];

    const hash = window.location.hash.substring(1);
    if (hash && sessionList.some(s => s.id === hash)) {
        SESSION_ID = hash;
    } else if (sessionList.length > 0) {
        const lastId = await localforage.getItem(`${APP_PREFIX}lastSessionId`);
        SESSION_ID = lastId && sessionList.some(s => s.id === lastId) ? lastId : sessionList[0].id;
    } else {
        SESSION_ID = await createNewSession(false);
    }

    await localforage.setItem(`${APP_PREFIX}lastSessionId`, SESSION_ID);
}

document.addEventListener('DOMContentLoaded', function() {
    const chatArea = document.querySelector('.main-chat-area');
    const historyLoader = document.getElementById('history-loader');
    
    if (chatArea && historyLoader && typeof IntersectionObserver !== 'undefined') {
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && messages.length > displayedMessageCount) {
                loadMoreHistory();
            }
        }, {
            root: chatArea,
            rootMargin: '200px 0px 0px 0px',
            threshold: 0.01
        });
        observer.observe(historyLoader);
    }
});



