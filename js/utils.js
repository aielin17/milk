        function safeGetItem(key) {
            try { return localStorage.getItem(key); }
            catch (e) { console.error('Error getting item:', e); return null; }
        }

        function safeSetItem(key, value) {
            try {
                if (typeof value === 'object') value = JSON.stringify(value);
                localStorage.setItem(key, value);
            } catch (e) { console.error('Error setting item:', e); }
        }

        function safeRemoveItem(key) {
            try { localStorage.removeItem(key); }
            catch (e) { console.error('Error removing item:', e); }
        }

function getRandomItem(arr) {
    if (!arr || arr.length === 0) return null;
    return arr[Math.floor(Math.random() * arr.length)];
}

function normalizeStringStrict(s) {
    if (typeof s !== 'string') return '';
    return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

function deduplicateContentArray(arr, baseSystemArray = []) {
    const seen = new Set(baseSystemArray.map(normalizeStringStrict));
    const result = [];
    let removedCount = 0;
    for (const item of arr) {
        const norm = normalizeStringStrict(item);
        if (norm !== '' && !seen.has(norm)) {
            seen.add(norm);
            result.push(item);
        } else {
            removedCount++;
        }
    }
    return { result, removedCount };
}

        function cropImageToSquare(file, maxSize = 640) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const img = new Image();
                    img.onload = () => {
                        const minSide = Math.min(img.width, img.height);
                        const sx = (img.width - minSide) / 2;
                        const sy = (img.height - minSide) / 2;
                        const canvas = document.createElement('canvas');
                        canvas.width = maxSize; canvas.height = maxSize;
                        const ctx = canvas.getContext('2d');
                        ctx.imageSmoothingEnabled = true;
                        ctx.imageSmoothingQuality = 'high';
                        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, maxSize, maxSize);
                        resolve(canvas.toDataURL('image/jpeg', 0.95));
                    };
                    img.onerror = reject;
                    img.src = e.target.result;
                };
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        }

        function exportDataToMobileOrPC(dataString, fileName) {
            if (navigator.share && navigator.canShare) {
                try {
                    const blob = new Blob([dataString], { type: 'application/json' });
                    const file = new File([blob], fileName, { type: 'application/json' });
                    if (navigator.canShare({ files: [file] })) {
                        navigator.share({ files: [file], title: '传讯数据备份', text: '请选择"保存到文件"' })
                            .catch(() => downloadFileFallback(blob, fileName));
                        return;
                    }
                } catch (e) {}
            }
            const blob = new Blob([dataString], { type: 'application/json' });
            downloadFileFallback(blob, fileName);
        }

        function downloadFileFallback(blob, fileName) {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url; link.download = fileName; link.style.display = 'none';
            document.body.appendChild(link); link.click(); document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(url), 2000);
        }

        if (typeof localforage !== 'undefined') {
            localforage.config({
                driver: [localforage.INDEXEDDB, localforage.WEBSQL, localforage.LOCALSTORAGE],
                name: 'ChatApp_V3', version: 1.0, storeName: 'chat_data',
                description: 'Storage for Chat App V3'
            });
        } else {
            console.warn('[storage] localforage 未加载，IndexedDB 能力不可用，将退回 localStorage/内存兜底');
        }

        function showNotification(message, type = 'info', duration = 3000) {
            const existing = document.querySelector('.notification');
            if (existing) existing.remove();
            const notification = document.createElement('div');
            notification.className = `notification ${type}`;
            const iconMap = { success:'fa-check-circle', error:'fa-exclamation-circle', info:'fa-info-circle', warning:'fa-exclamation-triangle' };
            notification.innerHTML = `<i class="fas ${iconMap[type] || 'fa-info-circle'}"></i><span>${message}</span>`;
            document.body.appendChild(notification);
            setTimeout(() => {
                notification.classList.add('hiding');
                notification.addEventListener('animationend', () => notification.remove());
            }, duration);
        }

        const playSound = (type) => {
            if (!settings.soundEnabled) return;
            try {
                // =============== 两方音效配置 ===============
                const category = (() => {
                    // 新类型（按两方区分）
                    if (type === 'my_send') return 'my_send';
                    if (type === 'partner_message') return 'partner_message';
                    if (type === 'my_poke') return 'my_poke';
                    if (type === 'partner_poke') return 'partner_poke';
                    // 兼容旧调用
                    if (type === 'send') return 'my_send';
                    if (type === 'message') return 'partner_message';
                    if (type === 'poke') return 'my_poke';
                    return null;
                })();

                const customUrlByCategory = (() => {
                    if (!category) return '';
                    if (category === 'my_send') return settings.mySendCustomSoundUrl || '';
                    if (category === 'partner_message') return settings.partnerMessageCustomSoundUrl || '';
                    if (category === 'my_poke') return settings.myPokeCustomSoundUrl || '';
                    if (category === 'partner_poke') return settings.partnerPokeCustomSoundUrl || '';
                    return '';
                })();

                const legacyCustomUrl = (settings.customSoundUrl || '').trim();
                const resolvedCustomUrlBase = (customUrlByCategory && customUrlByCategory.trim())
                    ? customUrlByCategory.trim()
                    : legacyCustomUrl;

                const KAKAO_TALK_URL = 'https://image.uglycat.cc/jl5xf9.mp3';

                // 预设音效（无音效 / kakaoTalk）需要优先级高于自定义 URL
                const presetId = (() => {
                    if (!category) return '';
                    if (category === 'my_send') return settings.mySendSoundPreset || 'tone_low';
                    if (category === 'partner_message') return settings.partnerMessageSoundPreset || 'tone_low';
                    if (category === 'my_poke') return settings.myPokeSoundPreset || 'tone_low';
                    if (category === 'partner_poke') return settings.partnerPokeSoundPreset || 'tone_low';
                    return 'tone_low';
                })();

                if (presetId === 'mute') return;

                // kakaoTalk 作为“固定预设”，选择它就播放对应音频
                let resolvedCustomUrl = (presetId === 'kakaotalk') ? KAKAO_TALK_URL : resolvedCustomUrlBase;

                // 自定义 URL：只要填了就直接播放（不区分内置/预设）
                if (resolvedCustomUrl) {
                    const audio = new Audio(resolvedCustomUrl);
                    audio.volume = Math.min(1, Math.max(0, settings.soundVolume || 0.15));
                    audio.play().catch(() => {});
                    return;
                }

                // =============== 内置合成音效（两方 + 预设） ===============
                const CATEGORY_BASE = {
                    my_send: { osc1Type: 'triangle', osc2Type: 'sine', freq: 520, dur: 0.18, up: 1.06, down: 0.72 },
                    partner_message: { osc1Type: 'triangle', osc2Type: 'sine', freq: 460, dur: 0.2, up: 1.04, down: 0.74 },
                    my_poke: { osc1Type: 'sawtooth', osc2Type: 'triangle', freq: 400, dur: 0.16, up: 1.08, down: 0.76 },
                    partner_poke: { osc1Type: 'sawtooth', osc2Type: 'triangle', freq: 380, dur: 0.16, up: 1.08, down: 0.76 }
                };

                const PRESET_EFFECTS = {
                    // 预设 effect：允许覆盖波形与倍率（不填则沿用基础音色）
                    tone_default: { osc1Type: 'triangle', osc2Type: 'sine', fMul: 0.92, durMul: 1.08, upMul: 1.0, downMul: 0.95 },
                    tone_soft: { osc1Type: 'sine', osc2Type: 'triangle', fMul: 0.88, durMul: 1.15, upMul: 0.98, downMul: 0.92 },
                    tone_low: { osc1Type: 'sawtooth', osc2Type: 'triangle', fMul: 0.78, durMul: 1.2, upMul: 0.96, downMul: 0.88 },
                    tone_warm: { osc1Type: 'triangle', osc2Type: 'triangle', fMul: 0.84, durMul: 1.1, upMul: 0.98, downMul: 0.9 },
                    tone_dark: { osc1Type: 'square', osc2Type: 'triangle', fMul: 0.72, durMul: 1.25, upMul: 0.95, downMul: 0.85 },
                    tone_haze: { osc1Type: 'sine', osc2Type: 'square', fMul: 0.8, durMul: 1.18, upMul: 0.97, downMul: 0.9 }
                };

                // presetId 已在上方计算

                const cfg = (() => {
                    if (category && CATEGORY_BASE[category]) {
                        const base = CATEGORY_BASE[category];
                        const fx = PRESET_EFFECTS[presetId] || PRESET_EFFECTS.tone_default;
                        const osc1Type = (typeof fx.osc1Type === 'string') ? fx.osc1Type : base.osc1Type;
                        const osc2Type = (typeof fx.osc2Type === 'string') ? fx.osc2Type : base.osc2Type;
                        const freq = base.freq * (fx.fMul || 1);
                        const dur = base.dur * (fx.durMul || 1);
                        const up = base.up * (fx.upMul || 1);
                        const down = base.down * (fx.downMul || 1);
                        return { osc1Type, osc2Type, freq, dur, up, down };
                    }

                    // 兼容其它旧声音类型（不走两方预设）
                    if (type === 'favorite') return { osc1Type: 'sine', osc2Type: 'sine', freq: 1200, dur: 0.18, up: 1.06, down: 0.70 };
                    if (type === 'anniversary') return { osc1Type: 'sawtooth', osc2Type: 'triangle', freq: 660, dur: 0.22, up: 1.10, down: 0.62 };
                    if (type === 'mood') return { osc1Type: 'sine', osc2Type: 'square', freq: 440, dur: 0.16, up: 1.12, down: 0.60 };
                    if (type === 'import') return { osc1Type: 'square', osc2Type: 'triangle', freq: 330, dur: 0.16, up: 1.25, down: 0.70 };
                    if (type === 'export') return { osc1Type: 'triangle', osc2Type: 'sine', freq: 520, dur: 0.16, up: 1.15, down: 0.66 };
                    if (type === 'error') return { osc1Type: 'sawtooth', osc2Type: 'square', freq: 180, dur: 0.14, up: 1.03, down: 0.42 };
                    return { osc1Type: 'sine', osc2Type: 'triangle', freq: 600, dur: 0.15, up: 1.05, down: 0.60 };
                })();

                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const gainNode = audioContext.createGain();
                const vol = Math.min(0.55, Math.max(0.01, settings.soundVolume || 0.1));

                // 叠加一层泛音让音色更“厚”
                const osc1 = audioContext.createOscillator();
                const osc2 = audioContext.createOscillator();

                osc1.connect(gainNode);
                osc2.connect(gainNode);
                gainNode.connect(audioContext.destination);

                const now = audioContext.currentTime;
                gainNode.gain.setValueAtTime(vol, now);

                const jitter = (Math.random() - 0.5) * 0.02; // 轻微随机
                const f1 = cfg.freq * (1 + jitter);
                const f2 = f1 * 2;

                osc1.type = cfg.osc1Type;
                osc2.type = cfg.osc2Type;

                osc1.frequency.setValueAtTime(f1, now);
                osc2.frequency.setValueAtTime(f2, now);

                // 频率滑动 + 音量包络
                osc1.frequency.exponentialRampToValueAtTime(f1 * cfg.up, now + 0.04);
                osc2.frequency.exponentialRampToValueAtTime(f2 * (cfg.up - 0.03), now + 0.04);

                osc1.frequency.exponentialRampToValueAtTime(f1 * cfg.down, now + cfg.dur);
                osc2.frequency.exponentialRampToValueAtTime(f2 * cfg.down, now + cfg.dur);

                const end = now + cfg.dur;
                osc1.start(now);
                osc2.start(now);

                gainNode.gain.exponentialRampToValueAtTime(0.0001, end);

                osc1.stop(end);
                osc2.stop(end);
            } catch (e) { console.warn("音频播放失败:", e); }
        };

        const throttledSaveData = () => {
            if (typeof saveTimeout !== 'undefined') clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => {
                try {
                    const maybePromise = saveData();
                    if (maybePromise && typeof maybePromise.catch === 'function') {
                        maybePromise.catch(e => console.error('[throttledSaveData] 保存失败:', e));
                    }
                } catch (e) {
                    console.error('[throttledSaveData] 保存失败:', e);
                }
            }, 500);
        };

async function applyCustomFont(url) {
    if (!url || !url.trim()) {
        document.documentElement.style.removeProperty('--font-family');
        document.documentElement.style.removeProperty('--message-font-family');
        return;
    }
    const fontName = 'UserCustomFont';
    try {
        const font = new FontFace(fontName, `url(${url})`);
        await font.load();
        document.fonts.add(font);
        const fontStack = `"${fontName}", 'Noto Serif SC', serif`;
        document.documentElement.style.setProperty('--font-family', fontStack);
        document.documentElement.style.setProperty('--message-font-family', fontStack);
        if (typeof settings !== 'undefined') settings.messageFontFamily = fontStack;
    } catch (e) {
        console.error('字体加载失败:', e);
        showNotification('字体加载失败，请检查链接是否有效', 'error');
    }
}

function applyCustomBubbleCss(cssCode) {
    const styleId = 'user-custom-bubble-style';
    let styleTag = document.getElementById(styleId);
    if (!cssCode || !cssCode.trim()) { if (styleTag) styleTag.remove(); return; }
    if (!styleTag) { styleTag = document.createElement('style'); styleTag.id = styleId; }
    document.head.appendChild(styleTag);

    function boostSpecificity(css) {
        return css.replace(/([^{}@][^{}]*)\{([^{}]*)\}/g, (match, rawSel, body) => {
            const selectors = rawSel.split(',').map(s => s.trim()).filter(Boolean);
            const boosted = selectors.map(sel => {
                if (sel.startsWith('html') || sel.startsWith('@') || sel.startsWith('from') || sel.startsWith('to') || /^\d/.test(sel)) return sel;
                return `html body ${sel}`;
            });
            return `${boosted.join(', ')} {${body}}`;
        });
    }

    const boostedCss = boostSpecificity(cssCode);

    styleTag.textContent = boostedCss + `
/* image bubble reset — must stay !important */
html[data-theme] .message.message-image-bubble-none,
html body .message.message-image-bubble-none {
    background: transparent !important; border: none !important;
    box-shadow: none !important; padding: 0 !important; border-radius: 0 !important;
}`;

    try {
        const alreadyCustomized = (typeof settings !== 'undefined' && settings.customThemeColors) ? settings.customThemeColors : {};
        const sentMatch  = cssCode.match(/\.message-sent\s*\{([^}]*)\}/);
        const recvMatch  = cssCode.match(/\.message-received\s*\{([^}]*)\}/);
        if (sentMatch && !alreadyCustomized['--message-sent-text']) {
            const colorLine = sentMatch[1].match(/\bcolor\s*:\s*([^;}\n]+)/);
            if (colorLine) {
                const v = colorLine[1].trim().replace(/!important/g,'').trim();
                if (v && !v.startsWith('var(')) {
                    document.documentElement.style.setProperty('--message-sent-text', v);
                }
            }
        }
        if (recvMatch && !alreadyCustomized['--message-received-text']) {
            const colorLine = recvMatch[1].match(/\bcolor\s*:\s*([^;}\n]+)/);
            if (colorLine) {
                const v = colorLine[1].trim().replace(/!important/g,'').trim();
                if (v && !v.startsWith('var(')) {
                    document.documentElement.style.setProperty('--message-received-text', v);
                }
            }
        }
    } catch(e) {}
}

function applyGlobalThemeCss(cssCode) {
    const styleId = 'user-custom-global-theme-style';
    let styleTag = document.getElementById(styleId);
    if (!cssCode || !cssCode.trim()) { if (styleTag) styleTag.remove(); return; }
    if (!styleTag) { styleTag = document.createElement('style'); styleTag.id = styleId; document.head.appendChild(styleTag); }
    styleTag.textContent = cssCode;
}

async function exportAllData() {
    try {
        if (typeof ChatBackup !== 'undefined' && ChatBackup.buildBackupPayload && ChatBackup.serializeBackupV4) {
            const payload = await ChatBackup.buildBackupPayload({
                inclMsgs: true,
                inclSet: true,
                inclCustom: true,
                inclAnn: true,
                inclThemes: true,
                inclDg: true,
                inclStickers: true
            });
            const jsonString = ChatBackup.serializeBackupV4(payload);
            const dateStr = new Date().toISOString().slice(0, 10);
            const fileName = `chatapp-backup-${dateStr}.json`;
            const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
            downloadFileFallback(blob, fileName);
            if (typeof showNotification === 'function') showNotification('已导出 JSON 备份', 'success');
        } else {
            showNotification('备份模块或函数未加载，请刷新页面', 'error');
        }
    } catch (e) {
        console.error('全量导出失败:', e);
        showNotification('全量导出失败，请重试', 'error');
    }
}

async function importAllData(file) {
    if (!file) return;
    if (file.size > 220 * 1024 * 1024) {
        showNotification('文件过大（>220MB），请确认是否为正确备份', 'error');
        return;
    }
    try {
        if (typeof ChatBackup === 'undefined' || !ChatBackup.loadBackupFromFile || !ChatBackup.applyBackupToStorage) {
            showNotification('备份模块未加载，请刷新页面重试', 'error');
            return;
        }
        const data = await ChatBackup.loadBackupFromFile(file);
        const fullLike = ChatBackup.isFullBackupShape
            ? ChatBackup.isFullBackupShape(data)
            : (
                data.type === 'full' ||
                (typeof data.type === 'string' && data.type.includes('full-backup')) ||
                !!data.indexedDB ||
                !!data.localforage
            );
        if (!fullLike) {
            if (typeof importChatHistory === 'function') importChatHistory(file);
            return;
        }
        if (!confirm('导入全量备份将按你的选择覆盖对应数据。\n\n头像/背景等如勾选导入会写入备份中的内容。\n\n确定继续吗？')) return;

        const categories = [
            {
                id: 'chat',
                label: '聊天记录 / 会话 / 红包',
                indexedDBNeedles: ['chatMessages', 'sessionList', 'chatSettings', 'showPartnerNameInChat', 'envelopeData', 'pending_envelope'],
                localStorageNeedles: ['groupChatSettings']
            },
            {
                id: 'replies',
                label: '回复 / 拍一拍 / 氛围',
                indexedDBNeedles: ['customReplies', 'customPokes', 'customStatuses', 'customMottos', 'customIntros', 'customEmojis', 'customReplyGroups'],
                localStorageNeedles: ['disabledReplyItems', 'pokeSym_my', 'pokeSym_partner', 'pokeSym_my_custom', 'pokeSym_partner_custom']
            },
            {
                id: 'stickers',
                label: '表情库（贴纸）',
                indexedDBNeedles: ['stickerLibrary', 'myStickerLibrary'],
                localStorageNeedles: ['disabledStickerItems']
            },
            {
                id: 'ann',
                label: '纪念日',
                indexedDBNeedles: ['anniversaries'],
                localStorageNeedles: []
            },
            {
                id: 'mood',
                label: '心晴手账',
                indexedDBNeedles: ['moodCalendar', 'customMoodOptions', 'moodTrash'],
                localStorageNeedles: []
            },
            {
                id: 'themes',
                label: '主题 / 外观 / 图库',
                indexedDBNeedles: ['customThemes', 'themeSchemes', 'backgroundGallery', 'chatBackground', 'partnerAvatar', 'myAvatar', 'partnerPersonas'],
                localStorageNeedles: []
            },
            {
                id: 'dg',
                label: '每日公告 / 运势 / 天气',
                indexedDBNeedles: ['dg_custom_data', 'dg_status_pool', 'weekly_fortune', 'daily_fortune'],
                localStorageNeedles: [],
                localStoragePrefixes: ['customWeather_']
            }
        ];

        const pickSelected = () => new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,0.6);
                backdrop-filter:blur(10px);display:flex;align-items:flex-end;justify-content:center;
            `;
            overlay.innerHTML = `
                <div style="
                    width:100%;max-width:560px;background:var(--secondary-bg);border-radius:24px 24px 0 0;
                    box-shadow:0 -10px 60px rgba(0,0,0,0.3);
                    padding:16px 18px env(safe-area-inset-bottom,0);
                ">
                    <div style="width:36px;height:4px;border-radius:2px;background:var(--border-color);margin:0 auto 14px;"></div>
                    <div style="font-size:16px;font-weight:800;color:var(--text-primary);margin-bottom:10px;">全量恢复：选择要导入的部分</div>
                    <div style="display:flex;flex-direction:column;gap:10px;max-height:60vh;overflow:auto;padding-right:6px;">
                        ${categories.map(c => {
                            return `
                                <label style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 12px;border:1.5px solid var(--border-color);border-radius:16px;background:var(--primary-bg);">
                                    <span style="font-size:13px;font-weight:700;color:var(--text-primary);">${c.label}</span>
                                    <input type="checkbox" data-cat="${c.id}" checked style="transform:scale(1.1);accent-color:var(--accent-color);">
                                </label>
                            `;
                        }).join('')}
                    </div>
                    <div style="display:flex;gap:10px;margin-top:14px;">
                        <button id="full-imp-cancel" class="modal-btn modal-btn-secondary" style="flex:1;padding:12px 0;">取消</button>
                        <button id="full-imp-confirm" class="modal-btn modal-btn-primary" style="flex:1;padding:12px 0;">确认恢复</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);
            
            overlay.addEventListener('click', (ev) => { if (ev.target === overlay) { overlay.remove(); resolve(null); } });
            const fullImpCancelBtn = document.getElementById('full-imp-cancel');
            const fullImpConfirmBtn = document.getElementById('full-imp-confirm');
            if (fullImpCancelBtn) fullImpCancelBtn.onclick = () => { overlay.remove(); resolve(null); };
            if (fullImpConfirmBtn) fullImpConfirmBtn.onclick = () => {
                const selected = Array.from(overlay.querySelectorAll('input[type=checkbox]:checked'))
                    .map(i => i.dataset.cat);
                overlay.remove();
                resolve(selected);
            };
        });

        const selectedCats = await pickSelected();
        if (!selectedCats || selectedCats.length === 0) return;

        showNotification('正在恢复数据…', 'info', 3000);
        await ChatBackup.applyBackupToStorage(data, {
            selective: true,
            selectedCategoryIds: selectedCats,
            categories
        });

        try {
            const importedJson = typeof data === 'string' ? data : JSON.stringify(data);
            setCloudSyncMeta({
                updated_at: new Date().toISOString(),
                size_bytes: new Blob([importedJson]).size,
                hash: await calcTextSha256(importedJson),
                source: 'import-json'
            });
        } catch (metaErr) {}
        showNotification('恢复完成，即将刷新页面…', 'success', 2000);
        setTimeout(() => location.reload(), 2200);
    } catch (err) {
        console.error('全量导入失败:', err);
        const msg = err && err.message ? err.message : '未知错误';
        showNotification('导入失败：' + msg, 'error', 5000);
    }
}

const CLOUD_SYNC_META_KEY = 'CHATAPP_CLOUD_SYNC_META_V1';
const CLOUD_SYNC_CONFIG_KEY = 'CHATAPP_SUPABASE_CONFIG_V1';
const CLOUD_SYNC_SINGLE_BACKUP_ID = 'SINGLE_USER_BACKUP';

let cloudAutoSyncTimer = null;
let cloudAutoSyncInFlight = false;
let cloudAutoSyncDirty = false;

function getNormalizedCloudAutoSyncSettings() {
    const enabled = !!(settings && settings.cloudAutoSyncEnabled);
    const rawInterval = Number(settings && settings.cloudAutoSyncInterval);
    const interval = Math.min(360, Math.max(1, Number.isFinite(rawInterval) ? rawInterval : 10));
    if (settings) {
        settings.cloudAutoSyncInterval = interval;
    }
    return {
        enabled,
        interval
    };
}

function getCloudAutoSyncStatusText() {
    const cfg = getNormalizedCloudAutoSyncSettings();
    if (!cfg.enabled) return '自动上传已关闭';
    if (cloudAutoSyncInFlight) return `自动上传进行中（每 ${cfg.interval} 分钟）`;
    if (cloudAutoSyncDirty) return `检测到本地变更，等待自动上传（每 ${cfg.interval} 分钟）`;
    return `自动上传已开启（每 ${cfg.interval} 分钟）`;
}

function manageCloudAutoSyncTimer() {
    if (cloudAutoSyncTimer) {
        clearInterval(cloudAutoSyncTimer);
        cloudAutoSyncTimer = null;
    }

    const cfg = getNormalizedCloudAutoSyncSettings();
    if (!cfg.enabled) return;

    const intervalMs = cfg.interval * 60 * 1000;
    cloudAutoSyncTimer = setInterval(function() {
        triggerCloudAutoSync('auto-timer').catch(function(err) {
            console.error('[triggerCloudAutoSync]', err);
        });
    }, intervalMs);
}

async function triggerCloudAutoSync(reason) {
    const cfg = getNormalizedCloudAutoSyncSettings();
    if (!cfg.enabled || !cloudAutoSyncDirty || cloudAutoSyncInFlight) return false;

    const cloudCfg = getCloudSyncConfig();
    if (!cloudCfg || !cloudCfg.url || !cloudCfg.anonKey) return false;

    if (!window.supabase || typeof window.supabase.createClient !== 'function') return false;

    cloudAutoSyncInFlight = true;
    updateCloudSyncStatusUI({
        statusText: getCloudAutoSyncStatusText()
    });

    try {
        await uploadLocalSnapshotToCloud(reason || 'cloud-auto-sync', { silent: true });
        cloudAutoSyncDirty = false;
        updateCloudSyncStatusUI({
            statusText: getCloudAutoSyncStatusText()
        });
        return true;
    } catch (e) {
        console.error('[cloudAutoSync]', e);
        updateCloudSyncStatusUI({
            statusText: '自动上传失败，请检查云端配置或网络'
        });
        return false;
    } finally {
        cloudAutoSyncInFlight = false;
        updateCloudSyncStatusUI({
            statusText: getCloudAutoSyncStatusText()
        });
    }
}

function getCloudSyncConfig() {
    try {
        const raw = localStorage.getItem(CLOUD_SYNC_CONFIG_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch (e) {
        return null;
    }
}

function setCloudSyncConfig(config) {
    try {
        localStorage.setItem(CLOUD_SYNC_CONFIG_KEY, JSON.stringify(config || {}));
    } catch (e) {}
}

function getCloudSyncMeta() {
    try {
        const raw = localStorage.getItem(CLOUD_SYNC_META_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch (e) {
        return null;
    }
}

function setCloudSyncMeta(meta) {
    try {
        localStorage.setItem(CLOUD_SYNC_META_KEY, JSON.stringify(meta || {}));
    } catch (e) {}
}

function formatCloudSyncTime(ts) {
    if (!ts) return '暂无';
    try {
        const d = new Date(ts);
        if (isNaN(d.getTime())) return '暂无';
        return d.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        return '暂无';
    }
}

async function buildFullBackupPayloadObject() {
    if (typeof ChatBackup !== 'undefined' && ChatBackup.buildBackupPayload) {
        return await ChatBackup.buildBackupPayload({
            inclMsgs: true, inclSet: true, inclCustom: true, inclAnn: true,
            inclThemes: true, inclDg: true, inclStickers: true
        });
    }
    const keys = await localforage.keys();
    const idbData = {};
    for (const k of keys) { try { idbData[k] = await localforage.getItem(k); } catch(e) {} }
    const lsData = {};
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k) lsData[k] = localStorage.getItem(k); }
    return {
        version: '3.1-full', appName: 'ChatApp', exportDate: new Date().toISOString(),
        type: 'full', indexedDB: idbData, localStorage: lsData
    };
}

async function buildFullBackupJsonString() {
    const payload = await buildFullBackupPayloadObject();
    const jsonString = JSON.stringify(payload);
    if (jsonString.charCodeAt(0) === 0xFEFF) {
        return jsonString.substring(1);
    }
    return jsonString;
}

async function calcTextSha256(text) {
    try {
        if (!window.crypto || !window.crypto.subtle) return '';
        const enc = new TextEncoder().encode(text);
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', enc);
        const arr = Array.from(new Uint8Array(hashBuffer));
        return arr.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
        return '';
    }
}

async function buildLocalSnapshotMeta(reason) {
    const json = await buildFullBackupJsonString();
    const hash = await calcTextSha256(json);
    const nowIso = new Date().toISOString();
    const meta = {
        updated_at: nowIso,
        size_bytes: new Blob([json]).size,
        hash: hash,
        source: reason || 'local-edit'
    };
    setCloudSyncMeta(meta);
    return { json: json, meta: meta };
}

function updateCloudSyncStatusUI(state) {
    const statusText = document.getElementById('dm-supabase-status-text');
    const localTime = document.getElementById('dm-local-backup-time');
    const cloudTime = document.getElementById('dm-cloud-backup-time');
    const checkBtn = document.getElementById('dm-supabase-check-btn');
    const syncBtn = document.getElementById('dm-supabase-sync-btn');

    const localMeta = (state && state.localMeta) || getCloudSyncMeta();
    const cloudMeta = state && state.cloudMeta;

    if (statusText) statusText.textContent = (state && state.statusText) || '还没有连接云端备份，点这里开始设置';
    if (localTime) localTime.textContent = localMeta ? formatCloudSyncTime(localMeta.updated_at) : '暂无';
    if (cloudTime) cloudTime.textContent = cloudMeta ? formatCloudSyncTime(cloudMeta.updated_at) : '暂无';

    if (checkBtn) checkBtn.innerHTML = '<i class="fas fa-rotate"></i><span style="margin-left:6px;">检查云端</span>';
    if (syncBtn) syncBtn.innerHTML = '<i class="fas fa-cloud-arrow-up"></i><span style="margin-left:6px;">同步数据</span>';
}

window.syncCloudAutoSyncSettingsUI = function() {
    const toggle = document.getElementById('dm-cloud-auto-sync-toggle');
    const intervalInput = document.getElementById('dm-cloud-auto-sync-interval');
    const desc = document.getElementById('dm-cloud-auto-sync-desc');
    const cfg = getNormalizedCloudAutoSyncSettings();

    if (toggle) toggle.checked = cfg.enabled;
    if (intervalInput) {
        intervalInput.value = String(cfg.interval);
        intervalInput.disabled = !cfg.enabled;
        intervalInput.style.opacity = cfg.enabled ? '1' : '0.6';
    }
    if (desc) {
        desc.textContent = cfg.enabled
            ? `已开启：本地数据变更后，每 ${cfg.interval} 分钟后台自动上传一次`
            : '关闭状态';
    }
};

window.applyCloudAutoSyncSettings = function(reason) {
    const cfg = getNormalizedCloudAutoSyncSettings();
    if (!cfg.enabled) {
        cloudAutoSyncDirty = false;
    }
    manageCloudAutoSyncTimer();
    if (typeof throttledSaveData === 'function') throttledSaveData();
    if (typeof window.syncCloudAutoSyncSettingsUI === 'function') {
        window.syncCloudAutoSyncSettingsUI();
    }
    updateCloudSyncStatusUI({
        statusText: getCloudAutoSyncStatusText()
    });
};

function askSupabaseConfigSimple() {
    return new Promise(resolve => {
        const modal = document.getElementById('supabase-config-modal');
        const urlInput = document.getElementById('supabase-url-input');
        const keyInput = document.getElementById('supabase-key-input');
        const saveBtn = document.getElementById('save-supabase-config');
        const cancelBtn = document.getElementById('cancel-supabase-config');

        if (!modal || !urlInput || !keyInput || !saveBtn || !cancelBtn) {
            return resolve(null);
        }

        const existing = getCloudSyncConfig() || {};
        urlInput.value = existing.url || '';
        keyInput.value = existing.anonKey || '';

        const closeAndResolve = (value) => {
            hideModal(modal);
            resolve(value);
        };

        saveBtn.onclick = () => {
            const clean = {
                url: (urlInput.value || '').trim().replace(/\/+$/, ''),
                anonKey: (keyInput.value || '').trim()
            };
            if (!clean.url || !clean.anonKey) {
                showNotification('Supabase 配置不能为空', 'error');
                return;
            }
            setCloudSyncConfig(clean);
            closeAndResolve(clean);
        };

        cancelBtn.onclick = () => closeAndResolve(null);
        
        showModal(modal);
    });
}

function getSupabaseClient() {
    const cfg = getCloudSyncConfig();
    if (!cfg || !cfg.url || !cfg.anonKey) return null;
    if (!window.supabase || typeof window.supabase.createClient !== 'function') return null;

    if (!window.__chatappSupabaseClient) {
        window.__chatappSupabaseClient = window.supabase.createClient(cfg.url, cfg.anonKey);
    }
    return window.__chatappSupabaseClient;
}

async function ensureSupabaseTableGuide() {
    return new Promise(resolve => {
        const modal = document.getElementById('supabase-guide-modal');
        const sqlDisplay = document.getElementById('supabase-sql-code-display');
        const closeBtn = document.getElementById('close-supabase-guide');

        if (!modal || !sqlDisplay || !closeBtn) return resolve();

        const sqlCode = `-- 1. 如果旧表存在，安全地删除它
DROP TABLE IF EXISTS public.chat_backups;

-- 2. 创建新的、字段类型完全正确的备份表
CREATE TABLE public.chat_backups (
  id TEXT PRIMARY KEY,
  backup_json JSONB, -- 使用 JSONB 类型来保证数据完整性
  updated_at TIMESTAMPTZ,
  size_bytes BIGINT,
  hash TEXT,
  source TEXT
);

-- 3. 关闭这张表的行级安全策略 (RLS)
ALTER TABLE public.chat_backups DISABLE ROW LEVEL SECURITY;`;
        
        sqlDisplay.value = sqlCode;

        closeBtn.onclick = () => {
            hideModal(modal);
            resolve();
        };

        showModal(modal);
    });
}

async function fetchCloudBackupMeta() {
    const client = getSupabaseClient();
    if (!client) return null;
    const ret = await client
        .from('chat_backups')
        .select('updated_at,size_bytes,hash,source,id')
        .eq('id', CLOUD_SYNC_SINGLE_BACKUP_ID)
        .single();
    if (ret.error && ret.error.code !== 'PGRST116') throw ret.error;
    return ret.data || null;
}

async function fetchCloudBackupRow() {
    const client = getSupabaseClient();
    if (!client) return null;
    const ret = await client
        .from('chat_backups')
        .select('id,backup_json,updated_at,size_bytes,hash,source')
        .eq('id', CLOUD_SYNC_SINGLE_BACKUP_ID)
        .single();
    if (ret.error && ret.error.code !== 'PGRST116') throw ret.error;
    return ret.data || null;
}

async function uploadLocalSnapshotToCloud(reason, options) {
    const client = getSupabaseClient();
    if (!client) throw new Error('尚未配置 Supabase');

    const opts = options || {};
    const payloadObject = await buildFullBackupPayloadObject();
    const jsonForMeta = JSON.stringify(payloadObject);

    const meta = {
        updated_at: new Date().toISOString(),
        size_bytes: new Blob([jsonForMeta]).size,
        hash: await calcTextSha256(jsonForMeta),
        source: reason || 'cloud-push'
    };

    const dbPayload = {
        id: CLOUD_SYNC_SINGLE_BACKUP_ID,
        backup_json: payloadObject,
        updated_at: meta.updated_at,
        size_bytes: meta.size_bytes,
        hash: meta.hash,
        source: meta.source
    };

    const ret = await client
        .from('chat_backups')
        .upsert(dbPayload)
        .select('updated_at,size_bytes,hash,source')
        .single();

    if (ret.error) throw ret.error;

    setCloudSyncMeta(meta);

    if (!opts.silent) {
        updateCloudSyncStatusUI({
            statusText: '云端已连接，最近一次已上传',
            localMeta: meta,
            cloudMeta: ret.data
        });
    }

    return ret.data;
}

async function applyCloudJsonToLocal(jsonData) {
    let data = jsonData;
    if (typeof data === 'string') {
        try {
            data = JSON.parse(data);
        } catch (e) {
            throw new Error('云端 JSON 已损坏');
        }
    }
    
    if (typeof ChatBackup === 'undefined' || !ChatBackup.applyBackupToStorage) {
        throw new Error('备份模块未加载');
    }
    await ChatBackup.applyBackupToStorage(data, { selective: false });

    const jsonTextForMeta = JSON.stringify(data);
    const meta = {
        updated_at: new Date().toISOString(),
        size_bytes: new Blob([jsonTextForMeta]).size,
        hash: await calcTextSha256(jsonTextForMeta),
        source: 'cloud-pull'
    };
    setCloudSyncMeta(meta);
    return meta;
}

function pickSyncDirectionManually(localMeta, cloudMeta) {
    return new Promise((resolve) => {
        const existingOverlay = document.getElementById('dm-sync-direction-overlay');
        if (existingOverlay) existingOverlay.remove();

        const overlay = document.createElement('div');
        overlay.id = 'dm-sync-direction-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,0.58);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;';
        
        const localTimeStr = formatCloudSyncTime(localMeta && localMeta.updated_at);
        const localSizeStr = localMeta && localMeta.size_bytes ? (localMeta.size_bytes / 1024).toFixed(1) + ' KB' : '未知';
        const cloudTimeStr = formatCloudSyncTime(cloudMeta && cloudMeta.updated_at);
        const cloudSizeStr = cloudMeta && cloudMeta.size_bytes ? (cloudMeta.size_bytes / 1024).toFixed(1) + ' KB' : '未知';

        overlay.innerHTML = `
            <div style="background:var(--secondary-bg);border-radius:22px;padding:22px;width:90%;max-width:380px;box-shadow:0 20px 60px rgba(0,0,0,0.28); animation: dmSheetIn 0.3s cubic-bezier(0.32,0.72,0,1) both;">
                <div style="font-size:16px;font-weight:800;color:var(--text-primary);margin-bottom:8px;">同步选择</div>
                <div style="font-size:12px;color:var(--text-secondary);line-height:1.7;margin-bottom:14px;">
                    检测到本地与云端数据不一致，请选择同步方向。
                </div>
                <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:14px;">
                    <div style="padding:12px 14px;border:1px solid var(--border-color);border-radius:14px;background:var(--primary-bg);">
                        <div style="font-size:12px;font-weight:700;color:var(--text-primary);margin-bottom:4px;">本地数据</div>
                        <div style="font-size:11px;color:var(--text-secondary);">更新于：${localTimeStr}</div>
                        <div style="font-size:11px;color:var(--text-secondary);">大小：${localSizeStr}</div>
                    </div>
                    <div style="padding:12px 14px;border:1px solid var(--border-color);border-radius:14px;background:var(--primary-bg);">
                        <div style="font-size:12px;font-weight:700;color:var(--text-primary);margin-bottom:4px;">云端备份</div>
                        <div style="font-size:11px;color:var(--text-secondary);">更新于：${cloudTimeStr}</div>
                        <div style="font-size:11px;color:var(--text-secondary);">大小：${cloudSizeStr}</div>
                    </div>
                </div>
                <div style="display:flex;flex-direction:column;gap:8px;">
                    <button id="cloud-sync-push-local" class="modal-btn modal-btn-primary" style="width:100%;">上传本地数据 (覆盖云端)</button>
                    <button id="cloud-sync-pull-cloud" class="modal-btn modal-btn-secondary" style="width:100%;">下载云端数据 (覆盖本地)</button>
                    <button id="cloud-sync-cancel" class="modal-btn modal-btn-secondary" style="width:100%;margin-top:4px;">取消</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);

        overlay.querySelector('#cloud-sync-push-local').addEventListener('click', () => {
            overlay.remove();
            resolve('push');
        });
        overlay.querySelector('#cloud-sync-pull-cloud').addEventListener('click', () => {
            overlay.remove();
            resolve('pull');
        });
        overlay.querySelector('#cloud-sync-cancel').addEventListener('click', () => {
            overlay.remove();
            resolve(null);
        });
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
                resolve(null);
            }
        });
    });
}

async function compareAndSyncCloudBackup() {
    let client = getSupabaseClient();
    if (!client) {
        await ensureSupabaseTableGuide();
        const cfg = await askSupabaseConfigSimple();
        if (!cfg) return;
        window.__chatappSupabaseClient = null;
        client = getSupabaseClient();
        if (!client) {
            showNotification('Supabase 客户端初始化失败', 'error');
            return;
        }
    }

    const localBuilt = await buildLocalSnapshotMeta('local-snapshot');
    let cloudRow = await fetchCloudBackupRow();

    if (!cloudRow) {
        if (confirm('云端还没有任何备份。是否要将当前的本地数据作为第一份备份上传？')) {
            await uploadLocalSnapshotToCloud('first-sync-push');
            showNotification('首次同步完成：本地数据已成功上传到云端。', 'success', 4000);
        } else {
            showNotification('已取消首次备份。', 'info');
        }
        return;
    }

    const cloudMeta = {
        updated_at: cloudRow.updated_at,
        size_bytes: cloudRow.size_bytes,
        hash: cloudRow.hash,
        source: cloudRow.source || 'cloud'
    };

    const localTime = new Date(localBuilt.meta.updated_at || 0).getTime();
    const cloudTime = new Date(cloudMeta.updated_at || 0).getTime();

    if (!localBuilt.meta.updated_at || !cloudMeta.updated_at) {
        const direction = await pickSyncDirectionManually(localBuilt.meta, cloudMeta);
        if (direction === 'push') {
            await uploadLocalSnapshotToCloud('manual-push');
            showNotification('已用本地覆盖云端', 'success');
        } else if (direction === 'pull') {
            const newLocalMeta = await applyCloudJsonToLocal(cloudRow.backup_json);
            updateCloudSyncStatusUI({
                statusText: '云端已连接，最近一次已下载',
                localMeta: newLocalMeta,
                cloudMeta: cloudMeta
            });
            showNotification('已用云端覆盖本地，正在刷新页面', 'success', 2500);
            setTimeout(() => location.reload(), 2200);
        }
        return;
    }

    if (localBuilt.meta.hash && cloudMeta.hash && localBuilt.meta.hash === cloudMeta.hash) {
        updateCloudSyncStatusUI({
            statusText: '本地与云端一致',
            localMeta: localBuilt.meta,
            cloudMeta: cloudMeta
        });
        showNotification('本地与云端数据一致', 'info');
        return;
    }

    let direction = null;
    if (cloudTime > localTime && cloudMeta.size_bytes >= localBuilt.meta.size_bytes) direction = 'pull';
    if (localTime > cloudTime && localBuilt.meta.size_bytes >= cloudMeta.size_bytes) direction = 'push';

    if (!direction) {
        direction = await pickSyncDirectionManually(localBuilt.meta, cloudMeta);
        if (!direction) {
            showNotification('已取消同步', 'info');
            return;
        }
    } else {
        const ask = confirm(
            direction === 'pull'
                ? '检测到云端看起来更新。\n\n点击“确定”用云端覆盖本地；点击“取消”改为手动选择方向。'
                : '检测到本地看起来更新。\n\n点击“确定”用本地覆盖云端；点击“取消”改为手动选择方向。'
        );
        if (!ask) direction = await pickSyncDirectionManually(localBuilt.meta, cloudMeta);
        if (!direction) return;
    }

    if (direction === 'push') {
        const cloudSaved = await uploadLocalSnapshotToCloud('manual-push');
        updateCloudSyncStatusUI({
            statusText: '云端已连接，最近一次已上传',
            localMeta: localBuilt.meta,
            cloudMeta: cloudSaved
        });
        showNotification('同步成功：本地已上传到云端', 'success');
        return;
    }

    if (direction === 'pull') {
        const newLocalMeta = await applyCloudJsonToLocal(cloudRow.backup_json);
        updateCloudSyncStatusUI({
            statusText: '云端已连接，最近一次已下载',
            localMeta: newLocalMeta,
            cloudMeta: cloudMeta
        });
        showNotification('同步成功：云端已覆盖本地，正在刷新页面', 'success', 2600);
        setTimeout(() => location.reload(), 2200);
    }
}

async function refreshCloudSyncInfo() {
    const cfg = getCloudSyncConfig();
    if (!cfg) {
        updateCloudSyncStatusUI({
            statusText: '还没有连接云端备份，点这里开始设置'
        });
        return;
    }
    try {
        const cloudMeta = await fetchCloudBackupMeta();
        const autoSyncStatus = getCloudAutoSyncStatusText();
        updateCloudSyncStatusUI({
            statusText: cloudMeta
                ? `已连接云端，可随时同步｜${autoSyncStatus}`
                : `已配置，但云端还没有备份｜${autoSyncStatus}`,
            cloudMeta: cloudMeta
        });
    } catch (e) {
        console.error('[refreshCloudSyncInfo]', e);
        updateCloudSyncStatusUI({
            statusText: '连接云端失败，请检查配置或网络'
        });
    }
}

window.openSupabaseGuide = async function(openWebsite) {
    if (openWebsite) {
        try {
            window.open('https://supabase.com/dashboard/projects', '_blank');
        } catch (e) {}
        await ensureSupabaseTableGuide();
    } else {
        const cfg = await askSupabaseConfigSimple();
        if (!cfg) {
            showNotification('你还没有保存云端配置', 'warning', 3500);
            return;
        }
        manageCloudAutoSyncTimer();
        await refreshCloudSyncInfo();
        showNotification('云端配置已保存成功', 'success', 2500);
    }
};

window.checkSupabaseCloud = async function() {
    await refreshCloudSyncInfo();
    showNotification('已检查云端状态', 'success');
};


window.syncSupabaseCloud = async function() {
    try {
        await compareAndSyncCloudBackup();
    } catch (e) {
        console.error('[syncSupabaseCloud]', e);
        showNotification('云同步失败：' + (e.message || e), 'error', 5000);
    }
};

window.markLocalBackupUpdated = async function(reason) {
    try {
        await buildLocalSnapshotMeta(reason || 'local-edit');
        cloudAutoSyncDirty = true;
        if (typeof window.syncCloudAutoSyncSettingsUI === 'function') {
            window.syncCloudAutoSyncSettingsUI();
        }
        updateCloudSyncStatusUI({ statusText: getCloudAutoSyncStatusText() });
    } catch (e) {}
};

document.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() {
        manageCloudAutoSyncTimer();
        if (typeof window.syncCloudAutoSyncSettingsUI === 'function') {
            window.syncCloudAutoSyncSettingsUI();
        }
        if (window.supabase) refreshCloudSyncInfo();
    }, 800);
});
