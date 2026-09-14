// ============================================================
// 自定义 simulateReply – 随机组合 2~100 条字卡（不修改 core.js）
// 用法：在 core.js 之后加载此文件即可
// ============================================================

(function() {
    // 重新定义 simulateReply
    window.simulateReply = function() {
        // ---- 以下代码几乎完全复制自 core.js 的 simulateReply，仅修改了“选取回复文本”部分 ----
        // 注意：所有依赖的全局变量（settings, messages, customReplies, etc.）都直接可用

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
                msg.status = 'read';
                changed = true;
            }
        });
        if (changed) {
            _updateReadReceiptsDOM();
            throttledSaveData();
        }

        if (partnerPersonas && partnerPersonas.length > 0 && Math.random() < 0.3) {
            const currentPool = [...partnerPersonas];
            if (currentPool.length > 0) {
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
            if (typeof window._triggerPartnerPoke === 'function') window._triggerPartnerPoke();
            return;
        }

        const replyCount = Math.random() < 0.75 ? 1 : (Math.random() < 0.95 ? 2 : 3);
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

                    // ================ 修改点开始 ================
                    // 原逻辑：只取一条字卡
                    // 新逻辑：随机组合 2~100 条字卡（取决于池子大小）
                    const comboCount = Math.min(replyPool.length, 2 + Math.floor(Math.random() * 99)); // 2~100
                    if (comboCount === 0) {
                        // 没有可用字卡，隐藏打字指示器并退出
                        (function(){
                            try { if (window._typingIndicatorAutoHideTimer) clearTimeout(window._typingIndicatorAutoHideTimer); } catch(e) {}
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
                        return;
                    }
                    // 洗牌取前 comboCount 个
                    const shuffled = [...replyPool];
                    for (let idx = shuffled.length - 1; idx > 0; idx--) {
                        const j = Math.floor(Math.random() * (idx + 1));
                        [shuffled[idx], shuffled[j]] = [shuffled[j], shuffled[idx]];
                    }
                    const selectedCards = shuffled.slice(0, comboCount);
                    // 随机选择分隔符
                    const separators = [' ', '，', '、', '~', '…', ' '];
                    const sep = separators[Math.floor(Math.random() * separators.length)];
                    let replyText = selectedCards.join(sep).trim();
                    if (!replyText) {
                        replyText = replyPool[Math.floor(Math.random() * replyPool.length)] || '';
                    }
                    // ================ 修改点结束 ================

                    // 以下内容与原代码完全一致
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
                    try {
                        (function(){
                            try { if (window._typingIndicatorAutoHideTimer) clearTimeout(window._typingIndicatorAutoHideTimer); } catch(e2) {}
                            var _tiW2 = document.getElementById('typing-indicator-wrapper');
                            if (_tiW2) _tiW2.style.display = 'none';
                        })();
                    } catch (e2) {}
                }
            }, delay);
        }
    };
})();
