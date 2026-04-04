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

        localforage.config({
            driver: [localforage.INDEXEDDB, localforage.WEBSQL, localforage.LOCALSTORAGE],
            name: 'ChatApp_V3', version: 1.0, storeName: 'chat_data',
            description: 'Storage for Chat App V3'
        });

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
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(saveData, 500);
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

        showNotification('恢复完成，即将刷新页面…', 'success', 2000);
        setTimeout(() => location.reload(), 2200);
    } catch (err) {
        console.error('全量导入失败:', err);
        const msg = err && err.message ? err.message : '未知错误';
        showNotification('导入失败：' + msg, 'error', 5000);
    }
}
