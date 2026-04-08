function setupEventListeners() {
    try {
        initCoreListeners();
        initModalListeners();
        initChatActionListeners();
        initHeaderAndSettingsListeners();
        initDataManagementListeners();
        initNewFeatureListeners();
        setupTutorialListeners();
        initMoodListeners();
        initDecisionModule(); 
        initAnniversaryModule(); 
        initThemeEditor(); 
        initThemeSchemes();
        
        initComboMenu(); 
        
    } catch (e) {
        console.error("事件绑定过程中发生错误:", e);
    }
}

function initChatActionListeners() {
            DOMElements.chatContainer.addEventListener('click', (e) => {

                if (isBatchFavoriteMode) {
                    const wrapper = e.target.closest('.message-wrapper');
                    if (wrapper && !e.target.closest('.message-meta-actions')) {
                        const messageId = Number(wrapper.dataset.id);
                        const index = selectedMessages.indexOf(messageId);

                        if (index > -1) {
                            selectedMessages.splice(index, 1);
                            wrapper.classList.remove('selected');
                        } else {
                            selectedMessages.push(messageId);
                            wrapper.classList.add('selected');
                        }

                        const confirmBtn = document.getElementById('confirm-batch-favorite');
                        if (confirmBtn) {
                            confirmBtn.textContent = `确认收藏 (${selectedMessages.length})`;
                        }
                        return;
                    }
                }

                const favoriteBtn = e.target.closest('.favorite-action-btn'); 
                if (favoriteBtn) {
                    const wrapper = e.target.closest('.message-wrapper');
                    const messageId = Number(wrapper.dataset.id);
                    const message = messages.find(m => m.id === messageId);
                    
                    if (message) {
                        message.favorited = !message.favorited;
                        
                        showNotification(message.favorited ? '已收藏': '已取消收藏', 'success', 1500);
                        playSound('favorite');
                        
                        throttledSaveData();
                        
                        renderMessages(true);
                    }
                    return;
                }

                const target = e.target.closest('.meta-action-btn');
                if (!target) return;
                
                const wrapper = e.target.closest('.message-wrapper');
                if (!wrapper) return; 
                
                const messageId = Number(wrapper.dataset.id);
                const message = messages.find(m => m.id === messageId);
                if (!message) return;

if (target.classList.contains('delete-btn')) {
    if (confirm('确定要删除这条消息吗？')) {
        const index = messages.findIndex(m => m.id === messageId);
        if (index > -1) {
            const savedScrollTop = DOMElements.chatContainer.scrollTop;
            messages.splice(index, 1); 
            throttledSaveData(); 
            renderMessages(true);
            requestAnimationFrame(() => {
                DOMElements.chatContainer.scrollTop = savedScrollTop;
            });
            showNotification('消息已删除', 'success');
        }
    }
    return;
}
                if (target.classList.contains('reply-btn')) {
                    currentReplyTo = {
                        id: message.id,
                        sender: message.sender,
                        text: message.text
                    };
                    updateReplyPreview();
                    DOMElements.messageInput.focus();
                    const targetMessageElement = DOMElements.chatContainer.querySelector(`[data-id="${message.id}"]`);
                    if (targetMessageElement) targetMessageElement.scrollIntoView({
                        behavior: 'smooth', block: 'center'
                    });
                    return;
                } 
                throttledSaveData();
            });

            DOMElements.batchPreview.addEventListener('click', (e) => {
                const removeBtn = e.target.closest('.batch-preview-remove');
                if (removeBtn) {
                    const index = removeBtn.closest('.batch-preview-item').dataset.index;
                    batchMessages.splice(index, 1); updateBatchPreview();
                    return;
                }
                const editBtn = e.target.closest('.batch-preview-edit');
                if (editBtn) {
                    const item = editBtn.closest('.batch-preview-item');
                    const index = parseInt(item.dataset.index);
                    const msg = batchMessages[index];
                    if (!msg || msg.image) return;
                    const newText = prompt('编辑内容：', msg.text);
                    if (newText !== null) {
                        batchMessages[index].text = newText.trim();
                        updateBatchPreview();
                    }
                    return;
                }
                const sendBtn = e.target.closest('.batch-send-btn');
                if (sendBtn && !sendBtn.disabled) sendBatchMessages();
                if (e.target.matches('.batch-cancel-btn')) {
                    isBatchMode = false; DOMElements.batchBtn.classList.remove('active');
                    DOMElements.batchPreview.style.display = 'none';
                    const placeholder = "";
                    DOMElements.messageInput.placeholder = placeholder.length > 20 ? placeholder.substring(0, 20) + "...": placeholder;
                    batchMessages = [];
                }
            });
        }

        function initModalListeners() {
            const modals = document.querySelectorAll('.modal');
            modals.forEach(modal => {
                const cancelBtns = modal.querySelectorAll('.modal-buttons .modal-btn-secondary');
                cancelBtns.forEach(cancelBtn => {
                    if (!cancelBtn.getAttribute('onclick') && !cancelBtn.dataset.noAutoClose) {
                        cancelBtn.addEventListener('click', () => hideModal(modal));
                    }
                });
            });

            const closeChatBtn = document.getElementById('close-chat');
            if (closeChatBtn) {
                closeChatBtn.addEventListener('click', () => {
                    hideModal(DOMElements.chatModal.modal);
                });
            }

            const closeDataBtn = document.getElementById('close-data');
            if (closeDataBtn) {
                closeDataBtn.addEventListener('click', () => {
                    hideModal(DOMElements.dataModal.modal);
                });
            }

            DOMElements.editModal.input.addEventListener('input', () => {
                DOMElements.editModal.save.disabled = !DOMElements.editModal.input.value.trim();
            });
            DOMElements.pokeModal.save.addEventListener('click', () => {
                let pokeText = DOMElements.pokeModal.input.value.trim() || `${settings.myName} 拍了拍 ${settings.partnerName}`;
                if (typeof window._sanitizePokeTextForDisplay === 'function') {
                    pokeText = window._sanitizePokeTextForDisplay(pokeText);
                }
                const pokeSaveChecked = document.getElementById('poke-save-to-library');
                const shouldSaveToLibrary = pokeSaveChecked ? !!pokeSaveChecked.checked : false;
                addMessage({
                    id: Date.now(), text: _formatPokeText(pokeText), timestamp: new Date(), type: 'system'
                });
                if (typeof playSound === 'function') playSound('poke');

                if (shouldSaveToLibrary) {
                    try {
                        if (!Array.isArray(customPokes)) customPokes = [];
                        const exists = customPokes.some(r => String(r) === String(pokeText));
                        if (!exists) {
                            customPokes.unshift(pokeText);
                            if (typeof throttledSaveData === 'function') throttledSaveData();
                            if (typeof renderReplyLibrary === 'function') renderReplyLibrary();
                        }
                    } catch (e) {
                        console.warn('拍一拍保存到库失败:', e);
                    }
                }
                hideModal(DOMElements.pokeModal.modal);
                DOMElements.pokeModal.input.value = '';
                const delayRange = settings.replyDelayMax - settings.replyDelayMin;
                const randomDelay = settings.replyDelayMin + Math.random() * delayRange;
                setTimeout(simulateReply, randomDelay);
            });


            DOMElements.cancelCoinResult.addEventListener('click', () => {
                DOMElements.coinTossOverlay.classList.remove('visible', 'finished');
                lastCoinResult = null;
            });


            DOMElements.sendCoinResult.addEventListener('click', () => {
                if (lastCoinResult) {
                    sendMessage(`🎲 抛硬币结果：${lastCoinResult}`, 'normal');
                    DOMElements.coinTossOverlay.classList.remove('visible', 'finished');
                    lastCoinResult = null;
                }
            });


            const retryBtn = document.getElementById('retry-coin-toss');

            if (retryBtn) {
                retryBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    e.preventDefault();

                    startCoinFlipAnimation();
                });
            }
        }


        function initHeaderAndSettingsListeners() {

            const openNameModal = (isPartner) => {
                const modal = DOMElements.editModal;
                showModal(modal.modal, modal.input);
                modal.title.textContent = `修改${isPartner ? (settings.partnerName || '对方'): '我'}的昵称`;
                modal.input.value = isPartner ? settings.partnerName: settings.myName;
                modal.save.disabled = !modal.input.value.trim();
                modal.save.onclick = () => {
                    const newName = modal.input.value.trim();
                    if (newName) {
                        isPartner ? settings.partnerName = newName: settings.myName = newName;
                        throttledSaveData();
                        updateUI();
                        showNotification('昵称已更新', 'success');
                    }
                    hideModal(modal.modal);
                };
            };

            const openAvatarModal = (isPartner) => {
                const modal = DOMElements.avatarModal;

                modal.modal.querySelector('.modal-content').innerHTML = `
            <div class="modal-title"><i class="fas fa-portrait"></i><span>上传${isPartner ? '对方': '我'}的头像</span></div>
            <div style="margin-bottom: 16px;">
            <div style="display: flex; gap: 10px; margin-bottom: 10px;">
            <button class="modal-btn modal-btn-secondary" id="upload-file-btn" style="flex: 1;">选择文件</button>
            <button class="modal-btn modal-btn-secondary" id="paste-url-btn" style="flex: 1;">粘贴URL</button>
            </div>
            <input type="file" class="modal-input" id="avatar-file-input" accept="image/*" style="display: none;">
            <input type="text" class="modal-input" id="avatar-url-input" placeholder="输入图片URL地址" style="display: none;">
            <div id="avatar-preview" style="text-align: center; margin-top: 10px; display: none;">
            <img id="preview-image" style="max-width: 100px; max-height: 100px; border-radius: 50%; border: 2px solid var(--border-color);">
            </div>
            </div>
            <div class="modal-buttons">
            <button class="modal-btn modal-btn-secondary" id="cancel-avatar">取消</button>
            <button class="modal-btn modal-btn-primary" id="save-avatar" disabled>保存</button>
            </div>
            `;

                showModal(modal.modal);

                const fileInput = document.getElementById('avatar-file-input');
                const urlInput = document.getElementById('avatar-url-input');
                const uploadBtn = document.getElementById('upload-file-btn');
                const pasteUrlBtn = document.getElementById('paste-url-btn');
                const previewDiv = document.getElementById('avatar-preview');
                const previewImg = document.getElementById('preview-image');
                const saveBtn = document.getElementById('save-avatar');
                const cancelBtn = document.getElementById('cancel-avatar');

                let currentAvatarData = null;


                uploadBtn.addEventListener('click', () => {
                    fileInput.click();
                    urlInput.style.display = 'none';
                    uploadBtn.classList.add('active');
                    pasteUrlBtn.classList.remove('active');
                });


                pasteUrlBtn.addEventListener('click', () => {
                    urlInput.style.display = 'block';
                    fileInput.style.display = 'none';
                    pasteUrlBtn.classList.add('active');
                    uploadBtn.classList.remove('active');
                    urlInput.focus();
                });


fileInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        if (file.size > MAX_AVATAR_SIZE) {
            showNotification('头像图片不能超过2MB', 'error');
            return;
        }

        showNotification('正在裁剪处理...', 'info', 1000);
        
        cropImageToSquare(file, 300).then(base64Data => {
            currentAvatarData = base64Data;
            previewImg.src = currentAvatarData;
            previewDiv.style.display = 'block';
            saveBtn.disabled = false;
        }).catch(err => {
            console.error(err);
            showNotification('图片处理失败', 'error');
        });
    }
});


                urlInput.addEventListener('input',
                    function() {
                        const url = urlInput.value.trim();
                        if (url) {

                            if (/^(https?:\/\/.*\.(?:png|jpg|jpeg|gif|webp))$/i.test(url)) {
                                previewImg.src = url;
                                previewDiv.style.display = 'block';
                                currentAvatarData = url;
                                saveBtn.disabled = false;


                                const img = new Image();
                                img.onload = function() {

                                    previewImg.src = url;
                                };
                                img.onerror = function() {
                                    showNotification('图片URL无效或无法访问', 'error');
                                    saveBtn.disabled = true;
                                };
                                img.src = url;
                            } else {
                                saveBtn.disabled = true;
                            }
                        } else {
                            saveBtn.disabled = true;
                            previewDiv.style.display = 'none';
                        }
                    });


                saveBtn.addEventListener('click',
                    () => {
                        if (currentAvatarData) {
                            updateAvatar(isPartner ? DOMElements.partner.avatar: DOMElements.me.avatar, currentAvatarData);
                            throttledSaveData();
                            showNotification('头像已更新', 'success');
                            hideModal(modal.modal);
                        }
                    });


                cancelBtn.addEventListener('click',
                    () => {
                        hideModal(modal.modal);
                    });
            };

            DOMElements.partner.name.addEventListener('click', () => openNameModal(true));
            DOMElements.me.name.addEventListener('click', () => openNameModal(false));
            DOMElements.partner.avatar.addEventListener('click', () => openAvatarModal(true));
            DOMElements.me.avatar.addEventListener('click', () => openAvatarModal(false));

            DOMElements.me.statusContainer.addEventListener('click', () => {
                const statusTextElement = DOMElements.me.statusText; const statusContainer = DOMElements.me.statusContainer;
                if (statusContainer.querySelector('input')) return;
                const input = document.createElement('input'); input.type = 'text'; input.id = 'my-status-input'; input.value = statusTextElement.textContent;
                const saveStatus = () => {
                    const newStatus = input.value.trim();
                    if (newStatus) {
                        settings.myStatus = newStatus; showNotification('状态已更新', 'success');
                    } else {
                        settings.myStatus = "在线";
                    }
                    statusTextElement.textContent = settings.myStatus;
                    statusContainer.innerHTML = '';
                    statusContainer.appendChild(statusTextElement);
                    throttledSaveData();
                };
                input.addEventListener('blur', saveStatus);
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') input.blur();
                });
                statusContainer.innerHTML = ''; statusContainer.appendChild(input); input.focus();
            });

            DOMElements.themeToggle.addEventListener('click', () => {
                settings.isDarkMode = !settings.isDarkMode; throttledSaveData(); updateUI(); showNotification(`已切换到${settings.isDarkMode ? '夜': '昼'}模式`,
                    'success');
            });
            DOMElements.settingsModal.settingsBtn.addEventListener('click', () => {
                showModal(DOMElements.settingsModal.modal);
            });
            DOMElements.favoritesModal.favoritesBtn.addEventListener('click', () => {
                showModal(document.getElementById('group-chat-modal'));
            });


window.setReadReceiptStyle = function(style) {
    settings.readReceiptStyle = style;
    throttledSaveData();
    const iconBtn = document.getElementById('rr-style-icon');
    const textBtn = document.getElementById('rr-style-text');
    if (iconBtn) { iconBtn.className = style === 'icon' ? 'modal-btn modal-btn-primary' : 'modal-btn modal-btn-secondary'; iconBtn.style.cssText = 'padding:5px 12px;font-size:12px;'; }
    if (textBtn) { textBtn.className = style === 'text' ? 'modal-btn modal-btn-primary' : 'modal-btn modal-btn-secondary'; textBtn.style.cssText = 'padding:5px 12px;font-size:12px;'; }
    renderMessages();
    showNotification('已读回执样式已更新', 'success');
};

const _chatSettingsEl = document.getElementById('chat-settings');
if (_chatSettingsEl) _chatSettingsEl.addEventListener('click', () => {
    hideModal(DOMElements.settingsModal.modal);
    
    const toggleSyncMap = {
        '#reply-toggle': { prop: 'replyEnabled', name: '引用回复' },
        '#sound-toggle': { prop: 'soundEnabled', name: '音效' },
        '#read-receipts-toggle': { prop: 'readReceiptsEnabled', name: '已读回执' },
        '#typing-indicator-toggle': { prop: 'typingIndicatorEnabled', name: '正在输入' },
        '#read-no-reply-toggle': { prop: 'allowReadNoReply', name: '已读不回' },
        '#emoji-mix-toggle': { prop: 'emojiMixEnabled', name: '表情消息' }
    };
    for (const [selector, { prop }] of Object.entries(toggleSyncMap)) {
        const el = document.querySelector(selector);
        const val = prop === 'emojiMixEnabled' ? (settings[prop] !== false) : !!settings[prop];
        if (el) el.classList.toggle('active', val);
    }
    const svSlider = document.getElementById('sound-volume-slider');
    const svVal = document.getElementById('sound-volume-value');
    if (svSlider) { svSlider.value = Math.round((settings.soundVolume || 0.15) * 100); if (svVal) svVal.textContent = svSlider.value + '%'; }
    const legacyCustom = (settings.customSoundUrl || '').trim();

    const setSelect = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val || 'tone_low';
    };
    const setInput = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val || '';
    };

    setSelect('sound-my-send-preset', settings.mySendSoundPreset || 'tone_low');
    setInput('sound-my-send-custom-url', (settings.mySendCustomSoundUrl || '').trim() || legacyCustom);

    setSelect('sound-partner-message-preset', settings.partnerMessageSoundPreset || 'tone_low');
    setInput('sound-partner-message-custom-url', (settings.partnerMessageCustomSoundUrl || '').trim() || legacyCustom);

    setSelect('sound-my-poke-preset', settings.myPokeSoundPreset || 'tone_low');
    setInput('sound-my-poke-custom-url', (settings.myPokeCustomSoundUrl || '').trim() || legacyCustom);

    setSelect('sound-partner-poke-preset', settings.partnerPokeSoundPreset || 'tone_low');
    setInput('sound-partner-poke-custom-url', (settings.partnerPokeCustomSoundUrl || '').trim() || legacyCustom);
    document.querySelectorAll('.time-fmt-opt').forEach(opt => {
        opt.classList.toggle('active', opt.dataset.fmt === (settings.timeFormat || 'HH:mm'));
    });
    const autoToggle = document.getElementById('auto-send-toggle');
    if (autoToggle) autoToggle.classList.toggle('active', !!settings.autoSendEnabled);
    updateAutoSendUI();
    updateDelayUI();
    const immToggle = document.getElementById('immersive-toggle');
    if (immToggle) immToggle.classList.toggle('active', document.body.classList.contains('immersive-mode'));
    const rrStyle = settings.readReceiptStyle || 'icon';
    const rrIconBtn = document.getElementById('rr-style-icon');
    const rrTextBtn = document.getElementById('rr-style-text');
    if (rrIconBtn) { rrIconBtn.className = rrStyle === 'icon' ? 'modal-btn modal-btn-primary' : 'modal-btn modal-btn-secondary'; rrIconBtn.style.cssText = 'padding:5px 12px;font-size:12px;'; }
    if (rrTextBtn) { rrTextBtn.className = rrStyle === 'text' ? 'modal-btn modal-btn-primary' : 'modal-btn modal-btn-secondary'; rrTextBtn.style.cssText = 'padding:5px 12px;font-size:12px;'; }
    
    showModal(DOMElements.chatModal.modal);
    setupAvatarFrameSettings();
});
            const _advancedEl = document.getElementById('advanced-settings');
            if (_advancedEl) _advancedEl.addEventListener('click', () => {
                hideModal(DOMElements.settingsModal.modal);
                showModal(DOMElements.advancedModal.modal);
            });

            const _dataSettingsEl = document.getElementById('data-settings');
            if (_dataSettingsEl) _dataSettingsEl.addEventListener('click', () => {
                hideModal(DOMElements.settingsModal.modal);
                showModal(DOMElements.dataModal.modal);
                (async function calcDmStorage() {
                    try {
                        let total = 0, msgsSize = 0, settingsSize = 0, mediaSize = 0;
                        const keys = await localforage.keys();
                        for (const k of keys) {
                            const raw = await localforage.getItem(k);
                            const str = typeof raw === 'string' ? raw : JSON.stringify(raw);
                            const bytes = new Blob([str]).size;
                            total += bytes;
                            if (/messages|msgs/i.test(k)) msgsSize += bytes;
                            else if (/avatar|image|photo|bg|background|wallpaper/i.test(k)) mediaSize += bytes;
                            else settingsSize += bytes;
                        }
                        const fmt = b => b > 1048576 ? (b/1048576).toFixed(1)+'MB' : b > 1024 ? (b/1024).toFixed(0)+'KB' : b+'B';
                        const MAX = 5 * 1024 * 1024;
                        const pct = Math.min(100, Math.round(total / MAX * 100));
                        const barEl = document.getElementById('dm-storage-bar');
                        const totalEl = document.getElementById('dm-storage-total');
                        if (barEl) barEl.style.width = pct + '%';
                        if (totalEl) totalEl.textContent = fmt(total);
                        const msgsEl = document.getElementById('dm-stat-msgs');
                        const setEl = document.getElementById('dm-stat-settings');
                        const medEl = document.getElementById('dm-stat-media');
                        if (msgsEl) msgsEl.textContent = fmt(msgsSize);
                        if (setEl) setEl.textContent = fmt(settingsSize);
                        if (medEl) medEl.textContent = fmt(mediaSize);
                    } catch(e) {
                        const totalEl = document.getElementById('dm-storage-total');
                        if (totalEl) totalEl.textContent = '无法读取';
                    }
                })();
            });
            const exportChatBtnDm = document.getElementById('export-chat-btn');
            const importChatBtnDm = document.getElementById('import-chat-btn');
            if (exportChatBtnDm) {
                exportChatBtnDm.addEventListener('click', () => {
                    if (typeof exportChatHistory === 'function') exportChatHistory();
                    else showNotification('功能暂不可用', 'error');
                });
            }
            if (importChatBtnDm) {
                importChatBtnDm.addEventListener('click', () => {
                    const inp = document.createElement('input');
                    inp.type = 'file'; inp.accept = '.json';
                    inp.onchange = e => { if (e.target.files[0] && typeof importChatHistory === 'function') importChatHistory(e.target.files[0]); };
                    inp.click();
                });
            }


            document.querySelectorAll('.theme-color-btn').forEach(btn => {
                btn.addEventListener('click',
                    () => {
                        settings.colorTheme = btn.dataset.theme;
                        throttledSaveData();
                        updateUI();
                        showNotification(`主题颜色已切换`, 'success');
                    });
            });


            document.querySelectorAll('[data-bubble-style]').forEach(item => {
                item.addEventListener('click',
                    () => {
                        settings.bubbleStyle = item.dataset.bubbleStyle;
                        throttledSaveData();
                        updateUI();
                        showNotification(`气泡样式已切换为${getBubbleStyleName(settings.bubbleStyle)}`, 'success');
                    });
            });

            const fontUrlInput = document.getElementById('custom-font-url');
            const applyFontBtn = document.getElementById('apply-font-btn');
            
            if (fontUrlInput) fontUrlInput.value = settings.customFontUrl || "";

            if (applyFontBtn) {
                applyFontBtn.addEventListener('click', () => {
                    const url = fontUrlInput.value.trim();
                    settings.customFontUrl = url;
                    
                    showNotification('正在尝试加载字体...', 'info', 1000);
                    applyCustomFont(url).then(() => {
                        throttledSaveData();
                        if(url) showNotification('字体已应用', 'success');
                        else showNotification('已恢复默认字体', 'success');
                    });
                });
            }

            
            const followSystemBtn = document.getElementById('follow-system-font-btn');
            if (followSystemBtn) {
                followSystemBtn.addEventListener('click', () => {
                    
                    const systemFontStack = 'system-ui, -apple-system, sans-serif';
                    
                    
                    if (fontUrlInput) fontUrlInput.value = "";
                    
                    
                    settings.customFontUrl = "";
                    
                    
                    settings.messageFontFamily = systemFontStack;
                    
                    
                    document.documentElement.style.setProperty('--font-family', systemFontStack);
                    document.documentElement.style.setProperty('--message-font-family', systemFontStack);
                    
                    
                    throttledSaveData();
                    
                    
                    renderMessages(true);
                    
                    showNotification('已应用跟随系统字体', 'success');
                });
            }
            
            const cssTextarea = document.getElementById('custom-bubble-css');
            const applyCssBtn = document.getElementById('apply-css-btn');
            const resetCssBtn = document.getElementById('reset-css-btn');

            if (cssTextarea) cssTextarea.value = settings.customBubbleCss || "";

            function updateCssLivePreview() {
                const previewStyle = document.getElementById('css-live-preview-style');
                if (!previewStyle) return;
                const raw = (cssTextarea ? cssTextarea.value : '') || '';
                const scoped = raw.replace(/([^{}]+)\{/g, (match, selector) => {
                    const parts = selector.split(',').map(s => `#css-live-preview ${s.trim()}`);
                    return parts.join(', ') + ' {';
                });
                previewStyle.textContent = scoped;
            }

            if (cssTextarea) {
                cssTextarea.addEventListener('input', updateCssLivePreview);
                updateCssLivePreview();
            }

            if (applyCssBtn) {
                applyCssBtn.addEventListener('click', () => {
                    const css = cssTextarea.value;
                    settings.customBubbleCss = css;
                    applyCustomBubbleCss(css);
                    throttledSaveData();
                    showNotification('自定义样式已应用', 'success');
                });
            }

            if (resetCssBtn) {
                resetCssBtn.addEventListener('click', () => {
                    cssTextarea.value = "";
                    settings.customBubbleCss = "";
                    applyCustomBubbleCss("");
                    if (document.getElementById('css-live-preview-style')) document.getElementById('css-live-preview-style').textContent = '';
                    throttledSaveData();
                    showNotification('自定义样式已清除', 'success');
                });
            }

            const globalCssTextarea = document.getElementById('custom-global-css');
            const applyGlobalCssBtn = document.getElementById('apply-global-css-btn');
            const resetGlobalCssBtn = document.getElementById('reset-global-css-btn');
            const globalCssLiveToggle = document.getElementById('global-css-live-toggle');
            const globalCssStatus = document.getElementById('global-css-status');

            if (globalCssTextarea) {
                globalCssTextarea.value = settings.customGlobalCss || '';

                globalCssTextarea.addEventListener('input', () => {
                    if (globalCssLiveToggle && globalCssLiveToggle.checked) {
                        applyGlobalThemeCss(globalCssTextarea.value);
                        if (globalCssStatus) {
                            globalCssStatus.style.display = 'block';
                            globalCssStatus.textContent = '● 实时应用中';
                            globalCssStatus.style.color = 'var(--accent-color)';
                        }
                    }
                });
            }

            if (applyGlobalCssBtn) {
                applyGlobalCssBtn.addEventListener('click', () => {
                    const css = globalCssTextarea ? globalCssTextarea.value : '';
                    settings.customGlobalCss = css;
                    applyGlobalThemeCss(css);
                    throttledSaveData();
                    showNotification('全局主题 CSS 已应用', 'success');
                    if (globalCssStatus) {
                        globalCssStatus.style.display = 'block';
                        globalCssStatus.textContent = '✓ 已应用到全局';
                        globalCssStatus.style.color = '#51cf66';
                        setTimeout(() => { if (globalCssStatus) globalCssStatus.style.display = 'none'; }, 2000);
                    }
                });
            }

            if (resetGlobalCssBtn) {
                resetGlobalCssBtn.addEventListener('click', () => {
                    if (globalCssTextarea) globalCssTextarea.value = '';
                    settings.customGlobalCss = '';
                    applyGlobalThemeCss('');
                    throttledSaveData();
                    showNotification('全局主题 CSS 已清除', 'success');
                    if (globalCssStatus) globalCssStatus.style.display = 'none';
                });
            }

            const fontSizeSlider = document.getElementById('font-size-slider');
            const fontSizeValue = document.getElementById('font-size-value');

            fontSizeSlider.value = settings.fontSize;
            fontSizeValue.textContent = `${settings.fontSize}px`;

            fontSizeSlider.addEventListener('input', (e) => {
                settings.fontSize = parseInt(e.target.value);
                document.documentElement.style.setProperty('--font-size',
                    `${settings.fontSize}px`);
                fontSizeValue.textContent = `${settings.fontSize}px`;
            });

            fontSizeSlider.addEventListener('change', throttledSaveData);

            const avatarToggle = document.getElementById('in-chat-avatar-toggle-2');
            const avatarSizeControl = document.getElementById('in-chat-avatar-size-control-2');
            const avatarPositionControl = document.getElementById('in-chat-avatar-position-control-2');
            const avatarPreview = document.getElementById('avatar-bubble-preview');
            const avatarSizeSlider = document.getElementById('in-chat-avatar-size-slider-2');
            const avatarSizeValue = document.getElementById('in-chat-avatar-size-value-2');

            if (!settings.inChatAvatarPosition) settings.inChatAvatarPosition = 'center';


            function updateBubblePreview() {
                const receivedBubble = document.getElementById('preview-bubble-received');
                const sentBubble = document.getElementById('preview-bubble-sent');
                if (!receivedBubble || !sentBubble) return;
                const style = settings.bubbleStyle || 'standard';
                const accentRgb = getComputedStyle(document.documentElement).getPropertyValue('--accent-color-rgb').trim() || '100,150,255';
                const styleMap = {
                    'standard':      { recv: '16px 16px 16px 4px',  sent: '16px 16px 4px 16px',  recvShadow: '0 2px 10px rgba(0,0,0,0.08)', sentShadow: `0 3px 12px rgba(${accentRgb},0.22)` },
                    'rounded':       { recv: '18px 18px 18px 6px',  sent: '18px 18px 6px 18px',  recvShadow: '0 2px 10px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)', sentShadow: `0 3px 12px rgba(${accentRgb},0.25), 0 1px 3px rgba(${accentRgb},0.1)` },
                    'rounded-large': { recv: '24px 24px 24px 4px',  sent: '24px 24px 4px 24px',  recvShadow: '0 4px 16px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.05)', sentShadow: `0 4px 16px rgba(${accentRgb},0.28), 0 2px 4px rgba(${accentRgb},0.12)` },
                    'square':        { recv: '4px 4px 4px 0',       sent: '4px 4px 0 4px',       recvShadow: '0 3px 10px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04)', sentShadow: `0 3px 10px rgba(${accentRgb},0.2), 0 1px 2px rgba(${accentRgb},0.08)` }
                };
                const radii = styleMap[style] || styleMap['standard'];
                receivedBubble.style.borderRadius = radii.recv;
                receivedBubble.style.boxShadow = radii.recvShadow;
                sentBubble.style.borderRadius = radii.sent;
                sentBubble.style.boxShadow = radii.sentShadow;
                const recvBg = getComputedStyle(document.documentElement).getPropertyValue('--message-received-bg').trim();
                const recvText = getComputedStyle(document.documentElement).getPropertyValue('--message-received-text').trim();
                const sentBg = getComputedStyle(document.documentElement).getPropertyValue('--message-sent-bg').trim();
                const sentText = getComputedStyle(document.documentElement).getPropertyValue('--message-sent-text').trim();
                if (recvBg) receivedBubble.style.background = recvBg;
                if (recvText) receivedBubble.style.color = recvText;
                if (sentBg) sentBubble.style.background = sentBg;
                if (sentText) sentBubble.style.color = sentText;
                receivedBubble.style.fontFamily = settings.messageFontFamily || '';
                sentBubble.style.fontFamily = settings.messageFontFamily || '';
                receivedBubble.style.fontSize = (settings.fontSize || 16) + 'px';
                sentBubble.style.fontSize = (settings.fontSize || 16) + 'px';
                const customCss = (document.getElementById('custom-bubble-css') || {}).value || '';
                let previewStyle = document.getElementById('bubble-preview-custom-style');
                if (!previewStyle) {
                    previewStyle = document.createElement('style');
                    previewStyle.id = 'bubble-preview-custom-style';
                    document.head.appendChild(previewStyle);
                }
                previewStyle.textContent = customCss;
            }

            function updateAvatarSettingsUI() {
                const enabled = settings.inChatAvatarEnabled;
                const pill = document.getElementById('avatar-toggle-pill-2');
                const knob = document.getElementById('avatar-toggle-knob-2');
                const statusText = document.getElementById('avatar-toggle-status-2');
                if (pill) pill.style.background = enabled ? 'var(--accent-color)' : 'var(--border-color)';
                if (knob) knob.style.right = enabled ? '3px' : '23px';
                if (statusText) statusText.textContent = enabled ? '已开启 — 消息旁显示头像' : '已关闭';

                if (avatarSizeControl) avatarSizeControl.style.display = enabled ? 'flex' : 'none';
                if (avatarPositionControl) avatarPositionControl.style.display = enabled ? 'block' : 'none';
                if (avatarPreview) avatarPreview.style.display = enabled ? 'block' : 'none';

                if (avatarSizeSlider) avatarSizeSlider.value = settings.inChatAvatarSize;
                if (avatarSizeValue) avatarSizeValue.textContent = `${settings.inChatAvatarSize}px`;
                document.documentElement.style.setProperty('--in-chat-avatar-size', `${settings.inChatAvatarSize}px`);

                const pos = settings.inChatAvatarPosition || 'center';
                const alignMap = { 'top': 'flex-start', 'center': 'center', 'bottom': 'flex-end', 'custom': 'flex-start' };
                document.documentElement.style.setProperty('--avatar-align', alignMap[pos] || 'center');
                document.body.dataset.avatarPos = pos;
                document.querySelectorAll('.preview-msg-row').forEach(row => {
                    row.style.alignItems = alignMap[pos] || 'flex-start';
                });
                const topBtn = document.getElementById('avatar-pos-top-2');
                const centerBtn = document.getElementById('avatar-pos-center-2');
                const bottomBtn = document.getElementById('avatar-pos-bottom-2');
                const customBtn = document.getElementById('avatar-pos-custom-2');
                [topBtn, centerBtn, bottomBtn, customBtn].forEach(btn => {
                    if (!btn) return;
                    btn.className = btn.dataset.pos === pos ? 'modal-btn modal-btn-primary' : 'modal-btn modal-btn-secondary';
                    btn.style.flex = '1'; btn.style.fontSize = '12px'; btn.style.padding = '7px 0';
                });

                const customOffsetCtrl = document.getElementById('avatar-custom-offset-control');
                if (customOffsetCtrl) customOffsetCtrl.style.display = pos === 'custom' ? 'block' : 'none';
                if (pos === 'custom') {
                    const offset = settings.inChatAvatarCustomOffset || 0;
                    document.documentElement.style.setProperty('--avatar-custom-offset', offset + 'px');
                    const sl = document.getElementById('avatar-custom-offset-slider');
                    const vl = document.getElementById('avatar-custom-offset-value');
                    if (sl) sl.value = offset;
                    if (vl) vl.textContent = offset + 'px';
                    const previewPartner = document.getElementById('preview-partner-avatar');
                    if (previewPartner) previewPartner.style.marginTop = offset + 'px';
                    const previewMy = document.getElementById('preview-my-avatar');
                    if (previewMy) previewMy.style.marginTop = offset + 'px';
                } else {
                    document.documentElement.style.removeProperty('--avatar-custom-offset');
                    const previewPartner = document.getElementById('preview-partner-avatar');
                    if (previewPartner) previewPartner.style.marginTop = '';
                    const previewMy = document.getElementById('preview-my-avatar');
                    if (previewMy) previewMy.style.marginTop = '';
                }

                const alwaysPill = document.getElementById('always-avatar-pill');
                const alwaysKnob = document.getElementById('always-avatar-knob');
                const alwaysStatus = document.getElementById('always-avatar-status');
                const alwaysOn = !!settings.alwaysShowAvatar;
                if (alwaysPill) alwaysPill.style.background = alwaysOn ? 'var(--accent-color)' : 'var(--border-color)';
                if (alwaysKnob) alwaysKnob.style.right = alwaysOn ? '3px' : '23px';
                if (alwaysStatus) alwaysStatus.textContent = alwaysOn ? '已开启 — 每条消息都显示头像' : '已关闭 — 仅首条消息显示';
                document.body.classList.toggle('always-show-avatar', alwaysOn);

                const namePill = document.getElementById('partner-name-chat-pill');
                const nameKnob = document.getElementById('partner-name-chat-knob');
                const nameStatus = document.getElementById('partner-name-chat-status');
                const nameOn = !!settings.showPartnerNameInChat;
                if (namePill) namePill.style.background = nameOn ? 'var(--accent-color)' : 'var(--border-color)';
                if (nameKnob) nameKnob.style.right = nameOn ? '3px' : '23px';
                if (nameStatus) nameStatus.textContent = nameOn ? '已开启 — 消息旁显示对方名字' : '已关闭';
                showPartnerNameInChat = nameOn;
                document.body.classList.toggle('show-partner-name', nameOn);

                updateAvatarPreview();
            }
            updateAvatarSettingsUI();

            if (avatarToggle) {
                avatarToggle.addEventListener('click', () => {
                    settings.inChatAvatarEnabled = !settings.inChatAvatarEnabled;
                    updateAvatarSettingsUI();
                    renderMessages(true);
                    throttledSaveData();
                });
            }

            if (avatarSizeSlider) {
                avatarSizeSlider.addEventListener('input', (e) => {
                    settings.inChatAvatarSize = parseInt(e.target.value, 10);
                    updateAvatarSettingsUI();
                    renderMessages(true); 
                });
                avatarSizeSlider.addEventListener('change', throttledSaveData);
            }

            ['avatar-pos-top-2','avatar-pos-center-2','avatar-pos-bottom-2','avatar-pos-custom-2'].forEach(btnId => {
                const btn = document.getElementById(btnId);
                if (btn) {
                    btn.addEventListener('click', () => {
                        settings.inChatAvatarPosition = btn.dataset.pos;
                        updateAvatarSettingsUI();
                        renderMessages(true);
                        throttledSaveData();
                    });
                }
            });

            const customOffsetSlider = document.getElementById('avatar-custom-offset-slider');
            const customOffsetValue = document.getElementById('avatar-custom-offset-value');
            if (customOffsetSlider) {
                customOffsetSlider.value = settings.inChatAvatarCustomOffset || 0;
                if (customOffsetValue) customOffsetValue.textContent = (settings.inChatAvatarCustomOffset || 0) + 'px';
                customOffsetSlider.addEventListener('input', () => {
                    const val = parseInt(customOffsetSlider.value, 10);
                    settings.inChatAvatarCustomOffset = val;
                    if (customOffsetValue) customOffsetValue.textContent = val + 'px';
                    document.documentElement.style.setProperty('--avatar-custom-offset', val + 'px');
                    document.querySelectorAll('.preview-msg-row').forEach(row => {
                        row.style.alignItems = 'flex-start';
                    });
                    const previewPartner = document.getElementById('preview-partner-avatar');
                    if (previewPartner) previewPartner.style.marginTop = val + 'px';
                    const previewMy = document.getElementById('preview-my-avatar');
                    if (previewMy) previewMy.style.marginTop = val + 'px';
                    renderMessages(true);
                });
                customOffsetSlider.addEventListener('change', throttledSaveData);
            }

            const alwaysAvatarToggle = document.getElementById('always-avatar-toggle');
            if (alwaysAvatarToggle) {
                alwaysAvatarToggle.addEventListener('click', () => {
                    settings.alwaysShowAvatar = !settings.alwaysShowAvatar;
                    updateAvatarSettingsUI();
                    renderMessages(true);
                    throttledSaveData();
                });
            }

            const partnerNameChatToggle = document.getElementById('partner-name-chat-toggle');
            if (partnerNameChatToggle) {
                partnerNameChatToggle.addEventListener('click', () => {
                    settings.showPartnerNameInChat = !settings.showPartnerNameInChat;
                    updateAvatarSettingsUI();
                    throttledSaveData();
                });
            }

            function updateAvatarPreview(shape, cornerRadius) {
                const previewPartner = document.getElementById('preview-partner-avatar');
                const previewMy = document.getElementById('preview-my-avatar');
                if (!previewPartner || !previewMy) return;
                const sz = `${settings.inChatAvatarSize || 36}px`;
                previewPartner.style.width = sz;
                previewPartner.style.height = sz;
                previewMy.style.width = sz;
                previewMy.style.height = sz;
                const partnerImg = DOMElements.partner && DOMElements.partner.avatar ? DOMElements.partner.avatar.querySelector('img') : null;
                const myImg = DOMElements.me && DOMElements.me.avatar ? DOMElements.me.avatar.querySelector('img') : null;
                const currentShape = shape || settings.myAvatarShape || 'circle';
                
                function applyToPreviewEl(el, img, shp, cr) {
                    if (img && img.src) {
                        el.innerHTML = `<img src="${img.src}" style="width:100%;height:100%;object-fit:cover;">`;
                    }
                    if (shp === 'circle') {
                        el.style.borderRadius = '50%';
                    } else if (shp === 'square') {
                        el.style.borderRadius = (cr || 8) + 'px';
                    }
                }
                const cr = cornerRadius !== undefined ? cornerRadius : parseInt(getComputedStyle(document.documentElement).getPropertyValue('--avatar-corner-radius') || '8') || 8;
                applyToPreviewEl(previewPartner, partnerImg, currentShape, cr);
                applyToPreviewEl(previewMy, myImg, currentShape, cr);
                if (typeof updateBubblePreview === 'function') updateBubblePreview();
            }

            function updateAvatarShapeBtns() {
                const shape = settings.myAvatarShape || 'circle';
                document.querySelectorAll('.avatar-shape-btn-2').forEach(b => {
                    b.classList.toggle('modal-btn-primary', b.dataset.shape === shape);
                    b.classList.toggle('modal-btn-secondary', b.dataset.shape !== shape);
                });
                const radiusCtrl = document.getElementById('avatar-corner-radius-control-2');
                if (radiusCtrl) radiusCtrl.style.display = shape === 'square' ? '' : 'none';
                updateAvatarPreview(shape);
            }
            document.querySelectorAll('.avatar-shape-btn-2').forEach(btn => {
                btn.addEventListener('click', () => {
                    const shape = btn.dataset.shape;
                    settings.myAvatarShape = shape;
                    settings.partnerAvatarShape = shape;
                    applyAvatarShapeToDOM && applyAvatarShapeToDOM('my', shape);
                    applyAvatarShapeToDOM && applyAvatarShapeToDOM('partner', shape);
                    updateAvatarShapeBtns();
                    updateAvatarPreview(shape);
                    renderMessages(true);
                    throttledSaveData();
                });
            });
            const cornerSlider = document.getElementById('avatar-corner-radius-slider-2');
            const cornerVal = document.getElementById('avatar-corner-radius-value-2');
            if (cornerSlider) {
                cornerSlider.value = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--avatar-corner-radius') || '8') || 8;
                if (cornerVal) cornerVal.textContent = cornerSlider.value + 'px';
                cornerSlider.addEventListener('input', () => {
                    const r = cornerSlider.value;
                    if (cornerVal) cornerVal.textContent = r + 'px';
                    document.documentElement.style.setProperty('--avatar-corner-radius', r + 'px');
                    updateAvatarPreview(settings.myAvatarShape || 'circle', parseInt(r));
                    renderMessages(true);
                });
                cornerSlider.addEventListener('change', () => {
                    settings.avatarCornerRadius = cornerSlider.value;
                    throttledSaveData();
                });
            }
            updateAvatarShapeBtns();

            document.querySelectorAll('[data-bubble-style]').forEach(item => {
                item.addEventListener('click', () => {
                    setTimeout(updateBubblePreview, 100);
                });
            });
            
            const minDelaySlider = document.getElementById('reply-delay-min-slider');
            const minDelayValue = document.getElementById('reply-delay-min-value');
            const maxDelaySlider = document.getElementById('reply-delay-max-slider');
            const maxDelayValue = document.getElementById('reply-delay-max-value');

            window.switchCsTab = function switchCsTab(btn) {
                document.querySelectorAll('.cs-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.cs-panel').forEach(p => p.classList.remove('active'));
                btn.classList.add('active');
                const panel = document.getElementById(btn.dataset.panel);
                if (panel) panel.classList.add('active');
            };

            function updateDelayUI() {
                minDelaySlider.value = settings.replyDelayMin;
                const minSec = settings.replyDelayMin / 1000;
                minDelayValue.textContent = minSec >= 60 ? `${(minSec/60).toFixed(1)}分钟` : `${minSec.toFixed(0)}s`;
                maxDelaySlider.value = settings.replyDelayMax;
                const maxSec = settings.replyDelayMax / 1000;
                maxDelayValue.textContent = maxSec >= 60 ? `${(maxSec/60).toFixed(1)}分钟` : `${maxSec.toFixed(0)}s`;
                maxDelaySlider.min = settings.replyDelayMin; 
            }
            updateDelayUI();

            minDelaySlider.addEventListener('input', (e) => {
                settings.replyDelayMin = parseInt(e.target.value, 10);
                if (settings.replyDelayMin > settings.replyDelayMax) {
                    settings.replyDelayMax = settings.replyDelayMin;
                }
                updateDelayUI();
            });
            minDelaySlider.addEventListener('change', throttledSaveData);

            maxDelaySlider.addEventListener('input', (e) => {
                settings.replyDelayMax = parseInt(e.target.value, 10);
                 if (settings.replyDelayMax < settings.replyDelayMin) {
                    settings.replyDelayMin = settings.replyDelayMax;
                }
                updateDelayUI();
            });
            maxDelaySlider.addEventListener('change', throttledSaveData);

            const settingToggles = {
                '#reply-toggle': {
                    prop: 'replyEnabled', name: '引用回复'
                },
                '#sound-toggle': {
                    prop: 'soundEnabled', name: '音效'
                },
                '#read-receipts-toggle': {
                    prop: 'readReceiptsEnabled', name: '已读回执'
                },
                '#typing-indicator-toggle': {
                    prop: 'typingIndicatorEnabled', name: '正在输入'},
                    '#read-no-reply-toggle': { prop: 'allowReadNoReply', name: '已读不回' },
                    '#emoji-mix-toggle': { prop: 'emojiMixEnabled', name: '表情混入消息' }
};

            for (const [selector, {
                prop, name
            }] of Object.entries(settingToggles)) {
                const element = document.querySelector(selector);
                if (!element) continue;

                const _initVal = prop === 'emojiMixEnabled' ? (settings[prop] !== false) : !!settings[prop];
                element.classList.toggle('active', _initVal);

                element.addEventListener('click', () => {
                    if (prop === 'emojiMixEnabled' && settings[prop] === undefined) settings[prop] = true;
                    settings[prop] = !settings[prop];
                    throttledSaveData();
                    updateUI();
                    element.classList.toggle('active', !!settings[prop]);
                    if (prop !== 'soundEnabled') renderMessages(true);
                    showNotification(`${name}已${settings[prop] ? '开启': '关闭'}`, 'success');
                });
            }

            const soundVolSlider = document.getElementById('sound-volume-slider');
            const soundVolVal = document.getElementById('sound-volume-value');
            if (soundVolSlider) {
                soundVolSlider.value = Math.round((settings.soundVolume || 0.15) * 100);
                if (soundVolVal) soundVolVal.textContent = soundVolSlider.value + '%';
                soundVolSlider.addEventListener('input', (e) => {
                    settings.soundVolume = parseInt(e.target.value) / 100;
                    if (soundVolVal) soundVolVal.textContent = e.target.value + '%';
                });
                soundVolSlider.addEventListener('change', throttledSaveData);
            }

            const bindPresetSelect = (selectId, settingsKey) => {
                const el = document.getElementById(selectId);
                if (!el) return;
                el.value = settings[settingsKey] || 'tone_default';
                el.addEventListener('change', () => {
                    settings[settingsKey] = el.value || 'tone_default';
                    throttledSaveData();
                });
            };

            bindPresetSelect('sound-my-send-preset', 'mySendSoundPreset');
            bindPresetSelect('sound-partner-message-preset', 'partnerMessageSoundPreset');
            bindPresetSelect('sound-my-poke-preset', 'myPokeSoundPreset');
            bindPresetSelect('sound-partner-poke-preset', 'partnerPokeSoundPreset');

            const bindCustomUrlInput = (inputId, settingsKey) => {
                const el = document.getElementById(inputId);
                if (!el) return;
                el.addEventListener('change', () => {
                    settings[settingsKey] = el.value.trim();
                    throttledSaveData();
                });
            };

            bindCustomUrlInput('sound-my-send-custom-url', 'mySendCustomSoundUrl');
            bindCustomUrlInput('sound-partner-message-custom-url', 'partnerMessageCustomSoundUrl');
            bindCustomUrlInput('sound-my-poke-custom-url', 'myPokeCustomSoundUrl');
            bindCustomUrlInput('sound-partner-poke-custom-url', 'partnerPokeCustomSoundUrl');

            const btnMySend = document.getElementById('test-sound-my-send-btn');
            if (btnMySend) btnMySend.addEventListener('click', () => playSound('my_send'));

            const btnPartnerMsg = document.getElementById('test-sound-partner-message-btn');
            if (btnPartnerMsg) btnPartnerMsg.addEventListener('click', () => playSound('partner_message'));

            const btnMyPoke = document.getElementById('test-sound-my-poke-btn');
            if (btnMyPoke) btnMyPoke.addEventListener('click', () => playSound('my_poke'));

            const btnPartnerPoke = document.getElementById('test-sound-partner-poke-btn');
            if (btnPartnerPoke) btnPartnerPoke.addEventListener('click', () => playSound('partner_poke'));

            document.querySelectorAll('.time-fmt-opt').forEach(opt => {
                opt.classList.toggle('active', opt.dataset.fmt === (settings.timeFormat || 'HH:mm'));
                opt.addEventListener('click', () => {
                    document.querySelectorAll('.time-fmt-opt').forEach(o => o.classList.remove('active'));
                    opt.classList.add('active');
                    settings.timeFormat = opt.dataset.fmt;
                    throttledSaveData();
                    renderMessages(true);
                    showNotification('时间格式已更新', 'success');
                });
            });


            const _appearanceEl = document.getElementById('appearance-settings');
            if (_appearanceEl) _appearanceEl.addEventListener('click', () => {
                hideModal(DOMElements.settingsModal.modal);
                window.hideAppearancePanel && window.hideAppearancePanel();
                renderBackgroundGallery();
                renderThemeSchemesList();
                
                const fontSizeSliderEl = document.getElementById('font-size-slider');
                const fontSizeValueEl = document.getElementById('font-size-value');
                if (fontSizeSliderEl) {
                    fontSizeSliderEl.value = settings.fontSize;
                    if (fontSizeValueEl) fontSizeValueEl.textContent = `${settings.fontSize}px`;
                }
                const fontUrlInputEl = document.getElementById('custom-font-url');
                if (fontUrlInputEl) fontUrlInputEl.value = settings.customFontUrl || '';
                const cssTextareaEl = document.getElementById('custom-bubble-css');
                if (cssTextareaEl) cssTextareaEl.value = settings.customBubbleCss || '';
                const globalCssTextareaEl = document.getElementById('custom-global-css');
                if (globalCssTextareaEl) globalCssTextareaEl.value = settings.customGlobalCss || '';
                
                document.querySelectorAll('[data-bubble-style]').forEach(item => {
                    item.classList.toggle('active', item.dataset.bubbleStyle === settings.bubbleStyle);
                });
                
                document.querySelectorAll('.theme-color-btn').forEach(btn => {
                    btn.classList.toggle('active', btn.dataset.theme === settings.colorTheme);
                });
                
                showModal(DOMElements.appearanceModal.modal);
                setTimeout(() => { 
                    updateAvatarSettingsUI && updateAvatarSettingsUI(); 
                    setupAppearancePanelFrameSettings && setupAppearancePanelFrameSettings();
                }, 100);
            });
            DOMElements.appearanceModal.closeBtn.addEventListener('click', () => {
                    hideModal(DOMElements.appearanceModal.modal);
                });

            const bgInput = document.getElementById('bg-gallery-input');
            if (bgInput) {
                bgInput.addEventListener('change', (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    if (file.size > 10 * 1024 * 1024) {
                        showNotification('背景图片不能超过10MB', 'error');
                        return;
                    }
                    if (file.size > 5 * 1024 * 1024) {
                        showNotification('文件较大，正在处理中...', 'info', 2000);
                    }
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        const base64 = event.target.result;
                        savedBackgrounds.push({
                            id: `user-${Date.now()}`,
                            type: file.type === 'image/gif' ? 'gif' : 'image',
                            value: base64
                        });
                        saveBackgroundGallery();
                        renderBackgroundGallery();
                        applyBackground(base64);
                        localforage.setItem(getStorageKey('chatBackground'), base64);
                        showNotification('新背景已添加并应用', 'success');
                    };
                    reader.readAsDataURL(file);
                    e.target.value = '';
                });
            }

const autoSendToggle = document.getElementById('auto-send-toggle');
const autoSendControl = document.getElementById('auto-send-control');
const autoSendSlider = document.getElementById('auto-send-slider');
const autoSendValue = document.getElementById('auto-send-value');

const updateAutoSendUI = () => {
    autoSendToggle.classList.toggle('active', !!settings.autoSendEnabled);
    autoSendControl.style.display = settings.autoSendEnabled ? "flex" : "none";
    const currentVal = settings.autoSendInterval || 5;
    autoSendSlider.value = currentVal;
    autoSendValue.textContent = `${currentVal}分钟`;
};

updateAutoSendUI();

autoSendToggle.addEventListener('click', () => {
    settings.autoSendEnabled = !settings.autoSendEnabled;
    updateAutoSendUI();
    manageAutoSendTimer(); 
    throttledSaveData();
    showNotification(`主动发送已${settings.autoSendEnabled ? '开启' : '关闭'}`, 'success');
});

autoSendSlider.value = settings.autoSendInterval || 5;
autoSendValue.textContent = `${settings.autoSendInterval || 5}分钟`;

autoSendSlider.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    settings.autoSendInterval = val;
    autoSendValue.textContent = `${val}分钟`;
});

autoSendSlider.addEventListener('change', () => {
    manageAutoSendTimer(); 
    throttledSaveData();
});

            const resetBgBtn = document.getElementById('reset-default-bg');
            if (resetBgBtn) {
                resetBgBtn.addEventListener('click', () => {
                    removeBackground();
                    renderBackgroundGallery();
                    showNotification('已移除背景图', 'success');
                });
            }
        }



        function initNewFeatureListeners() {
            const flEntry = document.getElementById('fortune-lenormand-function');
            if (flEntry) {
                flEntry.addEventListener('click', () => {
                    hideModal(DOMElements.advancedModal.modal);
                    generateFortune();
                    switchFLTab('fortune');
                    showModal(document.getElementById('fortune-lenormand-modal'));
                });
            }

            const _closeLenormandEl = document.getElementById('close-lenormand');
            if (_closeLenormandEl) _closeLenormandEl.addEventListener('click', () => {
                hideModal(document.getElementById('fortune-lenormand-modal'));
            });
    const envelopeEntryBtn = document.getElementById('envelope-function');
    if (envelopeEntryBtn) {
        envelopeEntryBtn.addEventListener('click', async () => {
            hideModal(DOMElements.advancedModal.modal);
            await loadEnvelopeData();
            await checkEnvelopeStatus();
            currentEnvTab = 'outbox';
            document.getElementById('env-tab-outbox').classList.add('active');
            document.getElementById('env-tab-inbox').classList.remove('active');
            document.getElementById('env-outbox-section').style.display = 'block';
            document.getElementById('env-inbox-section').style.display = 'none';
            document.getElementById('env-compose-form').style.display = 'none';
            document.getElementById('env-main-close-btn').style.display = 'flex';
            renderEnvelopeLists();
            showModal(document.getElementById('envelope-modal'));
        });
    }
    const galleryBanner = document.getElementById('gallery-banner-entry');
    if (galleryBanner) {
        galleryBanner.addEventListener('click', () => {
            window.open('https://aielin17.github.io/-/', '_blank');
        });
        galleryBanner.addEventListener('mousedown', () => { galleryBanner.style.transform = 'scale(0.97)'; });
        galleryBanner.addEventListener('mouseup', () => { galleryBanner.style.transform = 'scale(1)'; });
        galleryBanner.addEventListener('mouseleave', () => { galleryBanner.style.transform = 'scale(1)'; });
    }
const _sendEnvEl = document.getElementById('send-envelope');
if (_sendEnvEl) _sendEnvEl.addEventListener('click', handleSendEnvelope);

const _cancelEnvEl = document.getElementById('cancel-envelope');
if (_cancelEnvEl) _cancelEnvEl.addEventListener('click', () => {
    hideModal(document.getElementById('envelope-modal'));
});
            const closeFortune = document.getElementById('close-fortune');
            if (closeFortune) {
                closeFortune.addEventListener('click', () => {
                    hideModal(document.getElementById('fortune-lenormand-modal'));
                });
            }


            const _batchFavEl = document.getElementById('batch-favorite-function');
            if (_batchFavEl) _batchFavEl.addEventListener('click', () => {
                hideModal(DOMElements.favoritesModal.modal);
                toggleBatchFavoriteMode();
            });

            initReplyLibraryListeners();


            
            DOMElements.anniversaryAnimation.closeBtn.addEventListener('click', () => {
                DOMElements.anniversaryAnimation.modal.classList.remove('active');
            });


            const _statsFuncEl = document.getElementById('stats-function');
            if (_statsFuncEl) _statsFuncEl.addEventListener('click', () => {
                hideModal(DOMElements.advancedModal.modal);
                renderStatsContent();
                showModal(DOMElements.statsModal.modal);
            });

            const coinFunctionBtn = document.getElementById('coin-function');
            if (coinFunctionBtn) {
                coinFunctionBtn.addEventListener('click', () => {
                    hideModal(DOMElements.advancedModal.modal);
                    handleCoinToss();
                });
            }
            const musicToggle = document.getElementById('music-player-toggle');
            musicToggle.addEventListener('click', () => {
                settings.musicPlayerEnabled = !settings.musicPlayerEnabled;
                throttledSaveData();

                const player = document.getElementById('player');
                if (settings.musicPlayerEnabled) {
                    player.classList.add('visible');
                    showNotification('音乐播放器已开启', 'success');
                } else {
                    player.classList.remove('visible');
                    document.getElementById('playlist').classList.remove('active');
                    const audio = document.getElementById('audio');
                    if (audio) audio.pause();
                    showNotification('音乐播放器已关闭', 'info');
                }
                hideModal(DOMElements.advancedModal.modal);
            });
        }
    const annToggleBtn = document.getElementById('ann-toggle-btn');
    const annFormWrapper = document.getElementById('ann-form-wrapper');

    if (annToggleBtn && annFormWrapper) {
        annToggleBtn.addEventListener('click', () => {
            const isActive = annFormWrapper.classList.contains('active');
            
            if (isActive) {
                annFormWrapper.classList.remove('active');
                annToggleBtn.classList.remove('active');
            } else {
                annFormWrapper.classList.add('active');
                annToggleBtn.classList.add('active');
                
                setTimeout(() => {
                    annFormWrapper.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }, 300);
            }
        });
    }

        function getBubbleStyleName(style) {
            const names = {
                'standard': '标准',
                'rounded': '圆角',
                'rounded-large': '大圆角',
                'square': '方形'
            };
            return names[style] || '标准';
        }


        function initDataManagementListeners() {

            const _clearStorageEl = document.getElementById('clear-storage');
            if (_clearStorageEl) _clearStorageEl.addEventListener('click', clearAllAppData);
            const creditsBtn = document.getElementById('open-credits-btn');
            if (creditsBtn) {
                creditsBtn.addEventListener('click', () => {

                    hideModal(DOMElements.dataModal.modal);


                    const disclaimerModal = document.getElementById('disclaimer-modal');


                    if (disclaimerModal) {
                        showModal(disclaimerModal);
                    }
                });
            }

        }



        DOMElements.sessionModal.managerBtn.addEventListener('click', () => {
            renderSessionList(); showModal(DOMElements.sessionModal.modal);
        });
        DOMElements.sessionModal.createBtn.addEventListener('click', async () => {
            await createNewSession(false);
            renderSessionList();
            showNotification('新会话已创建', 'success');
        });

        DOMElements.sessionModal.list.addEventListener('click', (e) => {
            const item = e.target.closest('.session-item');
            if (!item) return;
            const sessionId = item.dataset.id;

            if (e.target.closest('.rename')) {
                const session = sessionList.find(s => s.id === sessionId);
                const newName = prompt('输入新的会话名称:', session.name);
                if (newName && newName.trim()) {
                    session.name = newName.trim();
                    localforage.setItem(`${APP_PREFIX}sessionList`, sessionList); 
                    renderSessionList();
                    showNotification('会话已重命名', 'success');
                }
            } else if (e.target.closest('.delete')) {
                if (sessionList.length <= 1) {
                    showNotification('无法删除最后一个会话', 'warning');
                    return;
                }
                if (confirm('确定要删除此会话及其所有聊天记录吗？此操作不可恢复')) {

                    const currentSessionId = SESSION_ID;

                    sessionList = sessionList.filter(s => s.id !== sessionId);
localforage.setItem(`${APP_PREFIX}sessionList`, sessionList);

// 同时清除 localStorage 和 localforage 中该会话的所有键
Object.keys(localStorage).forEach(key => {
    if (key.startsWith(`${APP_PREFIX}${sessionId}_`)) safeRemoveItem(key);
});
localforage.keys().then(keys => {
    keys.forEach(key => {
        if (key.startsWith(`${APP_PREFIX}${sessionId}_`)) {
            localforage.removeItem(key).catch(() => {});
        }
    });
}).catch(() => {});

if (sessionId === currentSessionId) {
    const newCurrentId = sessionList[0].id;
    localforage.setItem(`${APP_PREFIX}customThemes`, customThemes);
    window.location.hash = newCurrentId;
    window.location.reload();
} else {
    renderSessionList();
    showNotification('会话已删除', 'success');
}
                }
            } else {

                if (sessionId !== SESSION_ID) {
                    if (confirm('切换会话将刷新页面，确定要继续吗？')) {
                        window.location.hash = sessionId;
                        window.location.reload();
                    }
                }
            }
        });

        const initMusicPlayer = async () => {
    const latestSystemSongs = [{
                title: "虚拟", sub: "你是我朝夕相伴触手可及的虚拟", url: "https://files.catbox.moe/6s65mp.mp3"
            },
                {
                    title: "多远都要在一起", sub: "爱能克服远距离", url: "https://files.catbox.moe/06k9ra.mp3"
                },
                {
                    title: "永不失联的爱", sub: "这一辈子都不想失联的爱", url: "https://files.catbox.moe/uvucav.mp3"
                },
                {
                    title: "稳稳的幸福", sub: "这是我想要的幸福", url: "https://files.catbox.moe/inb22a.mp3"
                },
                {
                    title: "有我呢", sub: "我会让你习惯 多一个人陪伴", url: "https://files.catbox.moe/hrazjt"
                },
                {
                    title: "一千零一夜", sub: "梦里能到达的地方啊 有一天脚步也能到达", url: "https://files.catbox.moe/syfuon.mp3"
                },
                {
                    title: "月亮与六便士", sub: "我的世界由你建立 因你崩塌", url: "https://files.catbox.moe/98quqc.mp3"
                },
                {
                    title: "次元恋人", sub: "约好了隔着次元也吻住泪眼", url: "https://files.catbox.moe/5u5dy0.mp3"
                },
                {
                    title: "阳光下的星星", sub: "如果爱上你只是一个梦境", url: "https://files.catbox.moe/dxgqsk.mp3"
                },
                {
                    title: "周边", sub: "灵魂里空缺的那段", url: "https://files.catbox.moe/a7k5wd.mp3"
                },
                {
                    title: "恋爱ing", sub: "让我重新认识L O V E", url: "https://files.catbox.moe/94slcd.mp3"
                },
                {
                    title: "一点一滴", sub: "你让爱一点一滴汇成河", url: "https://files.catbox.moe/958qzg.mp3"
                },
                {
                    title: "关键词", sub: "让我见识爱情可以慷慨又自私", url: "https://files.catbox.moe/9yl5ic.mp3"
                },
                {
                    title: "想见你想见你想见你", sub: "穿越了千个万个时间线里人海里相依", url: "https://files.catbox.moe/co58d7.mp3"
                },
                {
                    title: "star crossing night", sub: "这里没有你", url: "https://files.catbox.moe/i3f86b.mp3"
                },
                {
                    title: "sea temple", sub: "If we have each other", url: "https://files.catbox.moe/c57gxs.mp3"
                },
                {
                    title: "我想要占据你", sub: "占据你的⼀切且无可厚非", url: "https://files.catbox.moe/1fp6eg.mp3"
                },
                {
                    title: "特别的人", sub: "我们是对方特别的人", url: "https://files.catbox.moe/a0n0l7.mp3"
                },
                {
                    title: "麦恩莉", sub: "在广阔寂寞漩涡解脱", url: "https://files.catbox.moe/2inae2.mp3"
                },
                {
                    title: "会呼吸的痛", sub: "想念是会呼吸的痛", url: "https://files.catbox.moe/0uhmxr.mp3"
                },
                {
                    title: "一生的爱", sub: "我只想要给你我一生的爱", url: "https://files.catbox.moe/f0e93c.mp3"
                },
                {
                    title: "身骑白马", sub: "追赶要我爱的不保留", url: "https://files.catbox.moe/iywfe2.mp3"
                },
                {
                    title: "爱情讯息", sub: "想念变成空气在叹息", url: "https://files.catbox.moe/4dl0t2.mp3"
                },
                {
                    title: "你在 不在", sub: "你在我心里面 陪我失眠", url: "https://files.catbox.moe/povyqa.mp3"
                },
                {
                    title: "你是我的风景", sub: "爱让悬崖变平地", url: "https://files.catbox.moe/fnwtf8.mp3"
                },
                {
                    title: "life with u", sub: "Now I know that you're the one", url: "https://files.catbox.moe/zqfxvd.mp3"
                },
                {
                    title: "勾指起誓", sub: "你是理所当然的奇迹", url: "https://files.catbox.moe/4spgo5.mp3"
                },
                {
                    title: "牵一半", sub: "你的存在是我唯一依赖", url: "https://files.catbox.moe/bk21gu.mp3"
                },
                {
                    title: "rove", sub: "Oh we are in the War of Love on Rove", url: "https://files.catbox.moe/sfwsuk.mp3"
                },
                {
                    title: "唯一", sub: "我真的爱你 句句不轻易", url: "https://files.catbox.moe/69g4fe.mp3"
                },
            { title: "致爱 Your Song", sub: "我只想每个落日 身边都有你", url: "https://files.catbox.moe/01bmnf.mp3" },
            { title: "一首想不通的古风", sub: "画地为牢 画命为符 铸成下一世坚守", url: "https://files.catbox.moe/9b4lh7.mp3" },
            { title: "茉莉雨", sub: "琴声里愁几许关于你", url: "https://files.catbox.moe/7ml83u.mp3" },
            { title: "怎么唱情歌", sub: "海 变的苦涩 灼伤一片温柔", url: "https://files.catbox.moe/isqax9.mp3" },
            { title: "岸边客", sub: "你回来我心未改 你不在我还等待", url: "https://files.catbox.moe/9oud6s.mp3" },
            { title: "江南雪", sub: "相思再无药解 从此万般风月都是我心结", url: "https://files.catbox.moe/hhjwek.mp3" },
            { title: "不死之身", sub: "我仍爱你爱得不知天高地厚", url: "https://files.catbox.moe/g960ev.mp3" },
            { title: "我们的明天", sub: "爱从不曾保留 才勇敢了我", url: "https://files.catbox.moe/a3yjvv.mp3" },
            { title: "难解", sub: "点炷高香敬予神明 被人嘲笑矢志不渝", url: "https://files.catbox.moe/1u8m3r.mp3" },
            { title: "最好的我 & 50 Feet", sub: "试着伸手 却连你的影子我都无法靠近", url: "https://files.catbox.moe/clsiyi.mp3" },
            { title: "同手同脚", sub: "也是存在在这个世界 唯一的唯一", url: "https://files.catbox.moe/b8hss3.mp3" },
            { title: "同花顺", sub: "只要肯爱得深 是不是就有这可能", url: "https://files.catbox.moe/28mw5d.mp3" },
            { title: "轻舞", sub: "轻舞吧 过往如裙纱", url: "https://files.catbox.moe/8n9lhi.mp3" },
            { title: "绝对占有 相对自由", sub: "赞美你包容你都是我的使命", url: "https://files.catbox.moe/zi4gxo.mp3" },
            { title: "千万次想象", sub: "我千万次想象 千万次模仿 思念的形状", url: "https://files.catbox.moe/4jtex8.mp3" },
            { title: "辞家千里", sub: "穿过无人问津去见山海万顷", url: "https://files.catbox.moe/2quy44.mp3" },
            { title: "Ryukyuvania", sub: "----", url: "https://files.catbox.moe/utmbqp.mp3" },
            { title: "沦陷", sub: "圈它在黑暗中逃不出的梦魇", url: "https://files.catbox.moe/0bhl3i.mp3" },
            { title: "晚枫歌", sub: "你又怎知我从未放手", url: "https://files.catbox.moe/xhwrwy.mp3" },
            { title: "I Need U", sub: "I need you girl", url: "https://files.catbox.moe/v1k4h8.mp3" },
            { title: "若梦", sub: "日升月落 此生依旧难舍", url: "https://files.catbox.moe/6uysqy.mp3" },
            { title: "爱人", sub: "可是恨的人没死成 爱的人没可能", url: "https://files.catbox.moe/wtbdxe.mp3" },
            { title: "星河叹", sub: "我盼孤身纵马 笛声漫天 四海任我游", url: "https://files.catbox.moe/de7g2m.mp3" },
            { title: "爱殇", sub: "假欢畅 又何妨 无人共享", url: "https://files.catbox.moe/or2hm7.mp3" },
            { title: "Una mattina", sub: "----", url: "https://files.catbox.moe/nf8o90.mp3" },
            { title: "顺其自然", sub: "You light up my heart", url: "https://files.catbox.moe/na01cn.mp3" },
            { title: "初见", sub: "若如初见 为谁而归", url: "https://files.catbox.moe/bumolx.mp3" },
            { title: "我好像在哪见过你", sub: "人们把难言的爱都埋入土壤里", url: "https://files.catbox.moe/vcidpc.mp3" },
            { title: "别回头", sub: "爱是年少时不堪其重 渗透灵魂的一阵剧痛", url: "https://files.catbox.moe/h1hwo5.mp3" },
            { title: "大鱼", sub: "怕你飞远去 怕你离我而去", url: "https://files.catbox.moe/jlcvkg.mp3" },
            { title: "人鱼的眼泪", sub: "Baby Don't cry", url: "https://files.catbox.moe/40fm4j.mp3" },
            { title: "九张机", sub: "我愿化作望断天涯那一方青石", url: "https://files.catbox.moe/hql6w5.mp3" },
            { title: "梦幻诛仙", sub: "来世若再会还与你双双对对", url: "https://files.catbox.moe/r6btwp.mp3" },
            { title: "寻常歌", sub: "所幸不过是 寻常人间事", url: "https://files.catbox.moe/ntcqvr.mp3" },
{ title: "公示情书", sub: "有种微妙确定的幸福 叫对方正在输入", url: "https://files.catbox.moe/rptwer.mp3" },
{ title: "现在那边是几点", sub: "请问你现在那边是几点 会不会还放有我的照片", url: "https://files.catbox.moe/icv2aa.mp3" },
{ title: "情人", sub: "气氛开始升温 危险又迷人", url: "https://files.catbox.moe/iqairg.mp3" },
{ title: "怜悯", sub: "我要带着爱意着恨你", url: "https://files.catbox.moe/242a1h.mp3" },
{ title: "疑心病", sub: "你终于说出口你对我感情也很重", url: "https://files.catbox.moe/jc1umm.mp3" },
{ title: "诀爱", sub: "若灵魂相结在天地之间", url: "https://files.catbox.moe/quqaws.mp3" },
{ title: "彼岸", sub: "她捧起镜花水月 一刹那湮灭", url: "https://files.catbox.moe/zxepep.mp3" },
{ title: "问情", sub: "当爱恨如潮生多残忍", url: "https://files.catbox.moe/erds0n.mp3" },
{ title: "同进退", sub: "我会牵着你手同进退 佛前立誓不后悔", url: "https://files.catbox.moe/vb6chf.mp3" },
{ title: "招摇", sub: "一句此生不换", url: "https://files.catbox.moe/oc86ih.mp3" },
{ title: "你要的全拿走", sub: "好聚好散听着也楚楚可怜", url: "https://files.catbox.moe/ok2e3s.mp3" },
{ title: "云裳羽衣曲", sub: "故事鲜艳而缘分却太浅", url: "https://files.catbox.moe/njnbhv.mp3" },
{ title: "大梦归离", sub: "终于听风儿说 知道你在哪里", url: "https://files.catbox.moe/5z67vs.mp3" },
{ title: "偏向", sub: "为何会两败俱伤", url: "https://files.catbox.moe/i37f39.mp3" },
{ title: "Love me like you do", sub: "You're the only thing I wanna touch", url: "https://files.catbox.moe/arym0i.mp3" },
{ title: "Not snow,but U", sub: "我期待的不是雪而是有你的冬天", url: "https://files.catbox.moe/6rk4gw.mp3" },
{ title: "The Evergreen", sub: "我恍然明了我所需的一切已尽数摆在眼前", url: "https://files.catbox.moe/ca3rim.mp3" },
{ title: "冥河螺旋", sub: "我如此希望 我伴你左右", url: "https://files.catbox.moe/xtj8db.mp3" },
{ title: "熄灭", sub: "你总问我在一起会不会感到厌倦", url: "https://files.catbox.moe/wnzxou.mp3" },
{ title: "爱人错过", sub: "我肯定在几百年前就说过爱你", url: "https://files.catbox.moe/q2nx16.mp3" },
{ title: "我想念", sub: "我想念你说过的那种永远", url: "https://files.catbox.moe/3qxads.mp3" },
{ title: "此生不换", sub: "再有一万年深情也不变", url: "https://files.catbox.moe/72ik88.mp3" },
{ title: "鳥の詩", sub: "----", url: "https://files.catbox.moe/966u00.mp3" }

    ];

    const uploadCoverBtn = document.getElementById('upload-cover-btn');
    const coverInput = document.getElementById('cover-input');
    const vinylRecord = document.getElementById('vinyl-record-visual');

    const applyPlayerCover = (base64Data) => {
        if (base64Data) {
            vinylRecord.style.backgroundImage = `url(${base64Data})`;
            vinylRecord.style.backgroundSize = 'cover';
            vinylRecord.style.backgroundPosition = 'center';
            vinylRecord.style.backgroundColor = 'transparent';
            vinylRecord.classList.add('has-cover');
            vinylRecord.style.borderWidth = '1px';
        } else {
            vinylRecord.style.backgroundImage = '';
            vinylRecord.style.backgroundColor = '';
            vinylRecord.classList.remove('has-cover');
            vinylRecord.style.borderWidth = '2px';
        }
    };

const savedCover = safeGetItem(APP_PREFIX + 'playerCover');

    localforage.getItem(APP_PREFIX + 'playerCover').then(cover => { if(cover) applyPlayerCover(cover); });
    if (savedCover) applyPlayerCover(savedCover);

    uploadCoverBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (vinylRecord.classList.contains('has-cover')) {
            if (confirm('想要重置回默认的【主题色黑胶】样式吗？\n\n• 点击【确定】恢复默认\n• 点击【取消】选择新图片')) {
                localforage.removeItem(APP_PREFIX + 'playerCover');
                applyPlayerCover(null);
                showNotification('已恢复默认黑胶样式', 'success');
                return;
            }
        }
        coverInput.click();
    });

    coverInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
            showNotification('图片太大了，请上传 2MB 以内的图片', 'error');
            return;
        }
        cropImageToSquare(file, 200).then(base64Data => {
            try {
                localforage.setItem(APP_PREFIX + 'playerCover', base64Data);
                applyPlayerCover(base64Data);
                showNotification('专辑封面设置成功！', 'success');
            } catch (err) {
                console.error(err);
                showNotification('图片存储失败（可能超出了浏览器限制）', 'error');
            }
        }).catch(() => {
            showNotification('图片处理失败，请重试', 'error');
        });
        e.target.value = '';
    });

    let songs = [];
    try {
        const savedSongs = await localforage.getItem(APP_PREFIX + 'customSongs');
        if (savedSongs && Array.isArray(savedSongs) && savedSongs.length > 0) {
            songs = savedSongs;
        } else if (savedSongs && typeof savedSongs === 'string') {
            songs = JSON.parse(savedSongs);
            await localforage.setItem(APP_PREFIX + 'customSongs', songs);
        } else {
            const legacyStr = safeGetItem(APP_PREFIX + 'customSongs');
            if (legacyStr) {
                try {
                    songs = JSON.parse(legacyStr);
                    await localforage.setItem(APP_PREFIX + 'customSongs', songs);
                    safeRemoveItem(APP_PREFIX + 'customSongs');
                } catch(e) {
                    songs = [...latestSystemSongs];
                }
            } else {
                songs = [...latestSystemSongs];
            }
        }
    } catch(e) {
        console.error('加载歌单失败，使用默认歌单', e);
        songs = [...latestSystemSongs];
    }

    const player = document.getElementById('player');
    const miniView = document.getElementById('mini-view');
    const playlist = document.getElementById('playlist');
    const audio = document.getElementById('audio');
    const playBtn = document.getElementById('play-btn');
    const progressArea = document.getElementById('progress-area');

    const addSongModal = document.getElementById('add-song-modal');
    const newSongTitle = document.getElementById('new-song-title');
    const newSongSub = document.getElementById('new-song-sub');
    const newSongUrl = document.getElementById('new-song-url');
    const confirmAddSongBtn = document.getElementById('confirm-add-song');
    const cancelAddSongBtn = document.getElementById('cancel-add-song');
    const modalTitleElem = addSongModal.querySelector('.modal-title span');

    let currentIndex = 0;
    let isPlaying = false;
    let playMode = 'sequence';
    let editModeIndex = -1;
    let searchTerm = '';
    let isSearchVisible = false;

    function loadSong(index) {
        if (songs.length === 0) return;
        if (index >= songs.length) index = 0;
        if (index < 0) index = songs.length - 1;

        const song = songs[index];
        document.getElementById('music-title').innerText = song.title;
        document.getElementById('music-subtitle').innerText = song.sub;
        
        if (song.url) audio.src = song.url;
        updatePlaylistHighlight();
    }

    function togglePlay() {
        if (songs.length === 0) {
            showNotification('播放列表为空', 'warning');
            return;
        }
        if (isPlaying) {
            audio.pause();
            isPlaying = false;
            document.getElementById('icon-play').style.display = 'block';
            document.getElementById('icon-pause').style.display = 'none';
            player.classList.remove('playing');
        } else {
            const playPromise = audio.play();
            if (playPromise !== undefined) {
                playPromise.then(_ => {
                    isPlaying = true;
                    document.getElementById('icon-play').style.display = 'none';
                    document.getElementById('icon-pause').style.display = 'block';
                    player.classList.add('playing');
                }).catch(error => {
                    console.error(error);
                    showNotification('播放失败，请检查网络或链接是否有效', 'error');
                });
            }
        }
    }

    function nextSong() {
        if (songs.length === 0) return;
        if (playMode === 'single') { loadSong(currentIndex); }
        else if (playMode === 'shuffle') currentIndex = Math.floor(Math.random() * songs.length);
        else currentIndex = (currentIndex + 1) % songs.length;
        if (playMode !== 'single') loadSong(currentIndex);
        if (isPlaying) audio.play();
    }

    function prevSong() {
        if (songs.length === 0) return;
        currentIndex = (currentIndex - 1 + songs.length) % songs.length;
        loadSong(currentIndex);
        if (isPlaying) audio.play();
    }

    function savePlaylist() {
        localforage.setItem(APP_PREFIX + 'customSongs', songs).catch(e => {
            console.error('歌单保存失败', e);
            showNotification('歌单保存失败，存储空间可能已满', 'error');
        });
        renderPlaylist();
    }

    function openEditModal(index) {
        const song = songs[index];
        if (!song) return;
        editModeIndex = index;
        newSongTitle.value = song.title;
        newSongSub.value = song.sub;
        newSongUrl.value = song.url;
        modalTitleElem.innerText = "编辑歌曲信息";
        confirmAddSongBtn.innerText = "保存修改";
        showModal(addSongModal);
    }

    function openAddModal() {
        editModeIndex = -1;
        newSongTitle.value = '';
        newSongSub.value = '';
        newSongUrl.value = '';
        modalTitleElem.innerText = "添加自定义歌曲";
        confirmAddSongBtn.innerText = "添加播放";
        showModal(addSongModal);
    }

    function renderPlaylist() {
        playlist.innerHTML = '';

        const header = document.createElement('div');
        header.className = 'playlist-header';
        header.innerHTML = `
    <div class="pl-header-title">˙°ʚᕱ⑅ᕱɞ°˙</div>
    <div class="pl-header-actions">
        <button class="pl-icon-btn" id="pl-manage-btn" title="歌单管理"><i class="fas fa-folder-open"></i></button>
        <button class="pl-icon-btn ${isSearchVisible ? 'active' : ''}" id="pl-search-toggle" title="搜索"><i class="fas fa-search"></i></button>
        <button class="pl-icon-btn" id="pl-add-btn" title="添加歌曲"><i class="fas fa-plus"></i></button>
    </div>
    <input type="file" id="pl-import-input" accept=".json" style="display:none">
`;
        playlist.appendChild(header);

        const searchWrapper = document.createElement('div');
        searchWrapper.className = `playlist-search-wrapper ${isSearchVisible ? 'active' : ''}`;
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.className = 'playlist-search-input';
        searchInput.placeholder = '';
        searchInput.value = searchTerm;
        
        searchInput.addEventListener('input', (e) => {
            searchTerm = e.target.value.toLowerCase();
            renderListContent(contentDiv);
        });
        
        searchWrapper.appendChild(searchInput);
        playlist.appendChild(searchWrapper);

        const contentDiv = document.createElement('div');
        contentDiv.className = 'playlist-content';
        playlist.appendChild(contentDiv);

        renderListContent(contentDiv);

        header.querySelector('#pl-add-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            openAddModal();
            newSongTitle.focus();
        });
        header.querySelector('#pl-manage-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            
            const overlay = document.createElement('div');
            overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.5);backdrop-filter:blur(5px);display:flex;align-items:center;justify-content:center;animation:fadeIn 0.2s ease;';
            overlay.innerHTML = `
                <div style="background:var(--secondary-bg);border-radius:16px;padding:20px;width:280px;box-shadow:0 10px 40px rgba(0,0,0,0.3);border:1px solid var(--border-color);display:flex;flex-direction:column;gap:12px;">
                    <div style="text-align:center;font-weight:600;margin-bottom:5px;">歌单管理</div>
                    
                    <button id="_pl_opt_import" style="padding:12px;border-radius:10px;border:1px solid var(--border-color);background:var(--primary-bg);color:var(--text-primary);cursor:pointer;display:flex;align-items:center;gap:10px;font-size:14px;transition:0.2s;">
                        <div style="width:32px;height:32px;background:rgba(var(--accent-color-rgb),0.1);border-radius:8px;display:flex;align-items:center;justify-content:center;color:var(--accent-color);"><i class="fas fa-file-import"></i></div>
                        导入歌单文件
                    </button>
                    
                    <button id="_pl_opt_export" style="padding:12px;border-radius:10px;border:1px solid var(--border-color);background:var(--primary-bg);color:var(--text-primary);cursor:pointer;display:flex;align-items:center;gap:10px;font-size:14px;transition:0.2s;">
                        <div style="width:32px;height:32px;background:rgba(var(--accent-color-rgb),0.1);border-radius:8px;display:flex;align-items:center;justify-content:center;color:var(--accent-color);"><i class="fas fa-file-export"></i></div>
                        导出当前歌单
                    </button>
                    
                    <button id="_pl_opt_cancel" style="padding:10px;border:none;background:transparent;color:var(--text-secondary);cursor:pointer;font-size:13px;margin-top:5px;">取消</button>
                </div>
            `;
            document.body.appendChild(overlay);

            const closeOpt = () => overlay.remove();
            overlay.addEventListener('click', (ev) => { if(ev.target === overlay) closeOpt(); });
            const plOptCancelBtn = document.getElementById('_pl_opt_cancel');
            const plOptExportBtn = document.getElementById('_pl_opt_export');
            const plOptImportBtn = document.getElementById('_pl_opt_import');
            if (plOptCancelBtn) plOptCancelBtn.onclick = closeOpt;

            if (plOptExportBtn) plOptExportBtn.onclick = () => {
                closeOpt();
                if (songs.length === 0) {
                    showNotification('歌单为空，无法导出', 'warning');
                    return;
                }
                const dataStr = JSON.stringify(songs, null, 2);
                const blob = new Blob([dataStr], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `music-playlist-${new Date().toISOString().slice(0, 10)}.json`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                showNotification('歌单导出成功', 'success');
            };

            if (plOptImportBtn) plOptImportBtn.onclick = () => {
                closeOpt();
                const input = header.querySelector('#pl-import-input');
                if (input) input.click();
            };
        });
        header.querySelector('#pl-import-input').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const importedSongs = JSON.parse(ev.target.result);
                    if (!Array.isArray(importedSongs)) throw new Error('格式错误');
                    
                    if (confirm(`检测到 ${importedSongs.length} 首歌曲。\n点击【确定】覆盖当前歌单\n点击【取消】追加到当前歌单末尾`)) {
                        songs = importedSongs;
                        showNotification('歌单已覆盖', 'success');
                    } else {
                        songs = [...songs, ...importedSongs];
                        showNotification(`已追加 ${importedSongs.length} 首歌曲`, 'success');
                    }
                    
                    savePlaylist();
                    if (songs.length > 0 && currentIndex >= songs.length) {
                        currentIndex = 0;
                        loadSong(0);
                    }
                } catch (err) {
                    console.error(err);
                    showNotification('导入失败：文件格式不正确', 'error');
                }
            };
            reader.readAsText(file);
            e.target.value = ''; 
        });
        header.querySelector('#pl-search-toggle').addEventListener('click', (e) => {
            e.stopPropagation();
            isSearchVisible = !isSearchVisible;
            searchWrapper.classList.toggle('active', isSearchVisible);
            e.currentTarget.classList.toggle('active', isSearchVisible);
            if (isSearchVisible) {
                setTimeout(() => searchInput.focus(), 100);
            }
        });
    }

    function renderListContent(container) {
        container.innerHTML = '';
        
        const filteredSongs = songs.map((s, i) => ({...s, originalIndex: i}))
                                   .filter(s => s.title.toLowerCase().includes(searchTerm) || 
                                                s.sub.toLowerCase().includes(searchTerm));

        if (filteredSongs.length === 0) {
            container.innerHTML = `<div class="empty-search-result">未找到 "${searchTerm}" 相关歌曲</div>`;
            return;
        }

        filteredSongs.forEach((song) => {
            const realIndex = song.originalIndex;

            const div = document.createElement('div');
            div.className = 'playlist-item';
            if (realIndex === currentIndex) div.classList.add('playing');

            const highlightText = (text, term) => {
                if (!term) return text;
                const regex = new RegExp(`(${term})`, 'gi');
                return text.replace(regex, '<span class="highlight">$1</span>');
            };

            const displayTitle = highlightText(song.title, searchTerm);
            const displaySub = highlightText(song.sub, searchTerm);

            div.innerHTML = `
                <div class="song-info">
                    <div class="song-title-row">${displayTitle}</div>
                    <div class="song-sub-row">${displaySub}</div>
                </div>
                <div class="item-actions">
                    ${song.isCustom ? '<span class="custom-tag" title="自定义歌曲"></span>' : ''}
                    <span class="action-icon-btn delete" title="移除">&times;</span>
                </div>
            `;

            if (song.isCustom) {
                div.querySelector('.custom-tag').addEventListener('click', (e) => {
                    e.stopPropagation();
                    openEditModal(realIndex);
                });
            }

            div.querySelector('.delete').addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm(`确定移除《${song.title}》吗？`)) {
                    songs.splice(realIndex, 1);
                    savePlaylist();
                    
                    if (realIndex === currentIndex) {
                        if (songs.length > 0) {
                            currentIndex = realIndex % songs.length;
                            loadSong(currentIndex);
                            if (isPlaying) audio.play();
                        } else {
                            audio.pause();
                            isPlaying = false;
                            loadSong(0);
                        }
                    } else if (realIndex < currentIndex) {
                        currentIndex--;
                    }
                }
            });

            div.addEventListener('click', (e) => {
                e.stopPropagation();
                currentIndex = realIndex;
                loadSong(currentIndex);
                if (!isPlaying) togglePlay();
                else audio.play();
            });

            container.appendChild(div);
        });
    }

    function updatePlaylistHighlight() {
        const contentDiv = playlist.querySelector('.playlist-content');
        if (contentDiv) renderListContent(contentDiv);
    }

    confirmAddSongBtn.addEventListener('click', () => {
        const title = newSongTitle.value.trim();
        const sub = newSongSub.value.trim();
        const url = newSongUrl.value.trim();

        if (!title || !url) {
            showNotification('歌名和链接不能为空', 'error');
            return;
        }

        const songData = {
            title,
            sub: sub || '未知艺术家',
            url,
            isCustom: true
        };

        if (editModeIndex >= 0) {
            songs[editModeIndex] = songData;
            showNotification('歌曲信息已修改', 'success');
        } else {
            songs.unshift(songData);
            showNotification('歌曲已添加', 'success');
            if (songs.length === 1) loadSong(0);
        }

        searchTerm = '';
        savePlaylist();
        newSongTitle.value = '';
        newSongSub.value = '';
        newSongUrl.value = '';
        hideModal(addSongModal);
    });

    cancelAddSongBtn.addEventListener('click', () => {
        hideModal(addSongModal);
    });

    function setupDrag() {
        let isDragging = false, startX, startY, initialLeft, initialTop, hasMoved = false;
        const dragStart = (e) => {
            if (e.target.closest('.btn') || e.target.closest('.progress-wrapper') || e.target.closest('.playlist-popup')) return;
            const event = e.type === 'touchstart' ? e.touches[0] : e;
            isDragging = true; hasMoved = false;
            startX = event.clientX; startY = event.clientY;
            const rect = player.getBoundingClientRect();
            initialLeft = rect.left; initialTop = rect.top;
            player.style.transition = 'none';
            playlist.style.transition = 'none';
        };
        const dragMove = (e) => {
            if (!isDragging) return;
            if (e.cancelable) e.preventDefault();
            const event = e.type === 'touchmove' ? e.touches[0] : e;
            const dx = event.clientX - startX;
            const dy = event.clientY - startY;
            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) hasMoved = true;

            let newLeft = initialLeft + dx;
            let newTop = initialTop + dy;
            const maxLeft = window.innerWidth - player.offsetWidth;
            const maxTop = window.innerHeight - player.offsetHeight;
            player.style.left = Math.max(0, Math.min(newLeft, maxLeft)) + 'px';
            player.style.top = Math.max(0, Math.min(newTop, maxTop)) + 'px';
            const rect = player.getBoundingClientRect();
            playlist.style.left = rect.left + 'px';
playlist.style.top = (rect.top + (player.classList.contains('collapsed') ? 65 : 155)) + 'px';
};
        const dragEnd = () => {
            if (!isDragging) return;
            isDragging = false;
            player.style.transition = '';
            playlist.style.transition = '';
        };
        player.addEventListener('mousedown', dragStart);
        document.addEventListener('mousemove', dragMove);
        document.addEventListener('mouseup', dragEnd);
        player.addEventListener('touchstart', dragStart, { passive: false });
        document.addEventListener('touchmove', dragMove, { passive: false });
        document.addEventListener('touchend', dragEnd);

        miniView.addEventListener('click', () => {
            if (!hasMoved && player.classList.contains('collapsed')) {
                player.classList.remove('collapsed');
                setTimeout(() => {
                    const rect = player.getBoundingClientRect();
                    playlist.style.top = (rect.top + 150) + 'px';
                }, 300);
            }
        });
    }

    playBtn.addEventListener('click', togglePlay);
    const _next_btnEl = document.getElementById('next-btn');
    if (_next_btnEl) _next_btnEl.addEventListener('click', nextSong);
    const _prev_btnEl = document.getElementById('prev-btn');
    if (_prev_btnEl) _prev_btnEl.addEventListener('click', prevSong);
    const _minimize_btnEl = document.getElementById('minimize-btn');
    if (_minimize_btnEl) _minimize_btnEl.addEventListener('click', (e) => {
        e.stopPropagation();
        player.classList.add('collapsed');
        playlist.classList.remove('active');
    });

    progressArea.addEventListener('click', (e) => {
        const width = progressArea.clientWidth;
        const clickX = e.offsetX;
        const duration = audio.duration;
        if (duration) audio.currentTime = (clickX / width) * duration;
    });

    audio.addEventListener('timeupdate', (e) => {
        const { duration, currentTime } = e.target;
        if (duration) document.getElementById('progress-bar').style.width = `${(currentTime / duration) * 100}%`;
    });
    audio.addEventListener('ended', nextSong);

    const _mode_btnEl = document.getElementById('mode-btn');
    if (_mode_btnEl) _mode_btnEl.addEventListener('click', () => {
        if (playMode === 'sequence') { playMode = 'single'; }
        else if (playMode === 'single') { playMode = 'shuffle'; }
        else { playMode = 'sequence'; }
        document.getElementById('icon-loop').style.display   = playMode === 'sequence' ? 'block' : 'none';
        document.getElementById('icon-single').style.display = playMode === 'single'   ? 'block' : 'none';
        document.getElementById('icon-shuffle').style.display= playMode === 'shuffle'  ? 'block' : 'none';
        const labels = { sequence: '顺序播放', single: '单曲循环', shuffle: '随机播放' };
        showNotification(labels[playMode], 'info', 1000);
    });

    const listBtn = document.getElementById('list-btn');
    listBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const rect = player.getBoundingClientRect();
        playlist.style.left = rect.left + 'px';
        playlist.style.top = (rect.top + (player.classList.contains('collapsed') ? 62 : 150)) + 'px';
        playlist.classList.toggle('active');
    });

    document.addEventListener('click', (e) => {
        if (!playlist.contains(e.target) && !listBtn.contains(e.target) && !player.contains(e.target) && !e.target.closest('#add-song-modal')) {
            playlist.classList.remove('active');
        }
    });

    loadSong(0);
    renderPlaylist();
    setupDrag();

    if (settings.musicPlayerEnabled) {
        player.classList.add('visible');
    }
};

        function initCoreListeners() {

            DOMElements.chatContainer.addEventListener('scroll', () => {
                const container = DOMElements.chatContainer;
                if (!container) return;
                if (container.scrollTop < 50 && !isLoadingHistory && messages.length > displayedMessageCount) {
                    if (typeof loadMoreHistory === 'function') loadMoreHistory();
                }
            });

            DOMElements.sendBtn.addEventListener('click', () => isBatchMode ? addToBatch(): sendMessage());
            DOMElements.messageInput.addEventListener('keydown', e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault(); isBatchMode ? addToBatch(): sendMessage();
                }
            });
            DOMElements.messageInput.addEventListener('input', () => {
                DOMElements.messageInput.style.height = 'auto'; DOMElements.messageInput.style.height = `${Math.min(DOMElements.messageInput.scrollHeight, 120)}px`;
            });


            DOMElements.attachmentBtn.addEventListener('click', () => {

                const modal = document.createElement('div');
                modal.className = 'modal image-upload-modal';
                modal.style.cssText = `
            display: flex !important;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.7);
            z-index: 9999;
            align-items: center;
            justify-content: center;
            backdrop-filter: blur(8px);
            opacity: 0;
            transition: opacity 0.3s ease;
            `;

                modal.innerHTML = `
            <div class="modal-content" style="
            z-index: 10000;
            position: relative;
            background-color: var(--secondary-bg);
            border-radius: var(--radius);
            padding: 24px;
            width: 90%;
            max-width: 400px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
            transform: translateY(20px);
            opacity: 0;
            transition: all 0.3s ease;
            ">
            <div class="modal-title"><i class="fas fa-image"></i><span>发送图片</span></div>
            <div style="margin-bottom: 16px;">
            <div style="display: flex; gap: 10px; margin-bottom: 10px;">
            <button class="modal-btn modal-btn-secondary upload-mode-btn active" id="upload-image-file-btn" style="flex: 1;">选择文件</button>
            <button class="modal-btn modal-btn-secondary upload-mode-btn" id="paste-image-url-btn" style="flex: 1;">粘贴URL</button>
            </div>
            <input type="file" class="modal-input" id="image-file-input" accept="image/*">
            <input type="text" class="modal-input" id="image-url-input" placeholder="输入图片URL地址" style="display: none;">
            <div id="image-preview" style="text-align: center; margin-top: 10px; display: none;">
            <img id="preview-chat-image" style="max-width: 200px; max-height: 200px; border-radius: 8px; border: 2px solid var(--border-color);">
            </div>
            </div>
            <div class="modal-buttons">
            <button class="modal-btn modal-btn-secondary" id="cancel-image">取消</button>
            <button class="modal-btn modal-btn-primary" id="send-image" disabled>发送</button>
            </div>
            </div>
            `;

                document.body.appendChild(modal);


                setTimeout(() => {
                    modal.style.opacity = '1';
                    const content = modal.querySelector('.modal-content');
                    content.style.opacity = '1';
                    content.style.transform = 'translateY(0)';
                }, 10);

                const fileInput = document.getElementById('image-file-input');
                const urlInput = document.getElementById('image-url-input');
                const uploadBtn = document.getElementById('upload-image-file-btn');
                const pasteUrlBtn = document.getElementById('paste-image-url-btn');
                const previewDiv = document.getElementById('image-preview');
                const previewImg = document.getElementById('preview-chat-image');
                const sendBtn = document.getElementById('send-image');
                const cancelBtn = document.getElementById('cancel-image');
                const uploadModeBtns = document.querySelectorAll('.upload-mode-btn');

                let currentImageData = null;


                function switchUploadMode(isFileMode) {
                    uploadModeBtns.forEach(btn => btn.classList.remove('active'));
                    if (isFileMode) {
                        uploadBtn.classList.add('active');
                        fileInput.style.display = 'block';
                        urlInput.style.display = 'none';
                    } else {
                        pasteUrlBtn.classList.add('active');
                        fileInput.style.display = 'none';
                        urlInput.style.display = 'block';
                        urlInput.focus();
                    }

                    previewDiv.style.display = 'none';
                    sendBtn.disabled = true;
                    currentImageData = null;
                }


                uploadBtn.addEventListener('click', () => switchUploadMode(true));


                pasteUrlBtn.addEventListener('click', () => switchUploadMode(false));


                fileInput.addEventListener('change', function(e) {
                    const file = e.target.files[0];
                    if (file) {
                        if (file.size > MAX_IMAGE_SIZE) {
                            showNotification('图片大小不能超过5MB', 'error');
                            return;
                        }
                        showNotification('正在优化图片...', 'info', 1500);
                        optimizeImage(file).then(optimizedData => {
                            currentImageData = optimizedData;
                            previewImg.src = currentImageData;
                            previewDiv.style.display = 'block';
                            sendBtn.disabled = false;
                        }).catch(() => {
                            showNotification('图片处理失败', 'error');
                        });
                    }
                });


                urlInput.addEventListener('input',
                    function() {
                        const url = urlInput.value.trim();
                        if (url) {

                            if (/^(https?:\/\/.*\.(?:png|jpg|jpeg|gif|webp|bmp))$/i.test(url)) {
                                previewImg.src = url;
                                previewDiv.style.display = 'block';
                                currentImageData = url;
                                sendBtn.disabled = false;


                                const img = new Image();
                                img.onload = function() {

                                    previewImg.src = url;
                                    showNotification('图片URL有效', 'success', 1000);
                                };
                                img.onerror = function() {
                                    showNotification('图片URL无效或无法访问', 'error');
                                    sendBtn.disabled = true;
                                    previewDiv.style.display = 'none';
                                };
                                img.src = url;
                            } else {
                                sendBtn.disabled = true;
                                previewDiv.style.display = 'none';
                            }
                        } else {
                            sendBtn.disabled = true;
                            previewDiv.style.display = 'none';
                        }
                    });


                sendBtn.addEventListener('click',
                    () => {
                        if (currentImageData) {

                            addMessage({
                                id: Date.now(),
                                sender: 'user',
                                text: '',
                                timestamp: new Date(),
                                image: currentImageData,
                                status: 'sent',
                                favorited: false,
                                note: null,
                                replyTo: currentReplyTo,
                                type: 'normal'
                            });
                            playSound('send');
                            currentReplyTo = null;
                            updateReplyPreview();
                            const delayRange = settings.replyDelayMax - settings.replyDelayMin;
                            const randomDelay = settings.replyDelayMin + Math.random() * delayRange;
                            setTimeout(simulateReply, randomDelay);


                            closeModal();
                        }
                    });


                cancelBtn.addEventListener('click',
                    closeModal);


                function closeModal() {
                    modal.style.opacity = '0';
                    const content = modal.querySelector('.modal-content');
                    content.style.opacity = '0';
                    content.style.transform = 'translateY(20px)';
                    setTimeout(() => {
                        if (modal.parentNode) {
                            modal.parentNode.removeChild(modal);
                        }
                    },
                        300);
                }


                modal.addEventListener('click',
                    (e) => {
                        if (e.target === modal) {
                            closeModal();
                        }
                    });


                modal.querySelector('.modal-content').addEventListener('click',
                    (e) => {
                        e.stopPropagation();
                    });


                const handleEscKey = (e) => {
                    if (e.key === 'Escape') {
                        closeModal();
                        document.removeEventListener('keydown', handleEscKey);
                    }
                };
                document.addEventListener('keydown', handleEscKey);


                modal.addEventListener('close', () => {
                    document.removeEventListener('keydown', handleEscKey);
                });
            });


            DOMElements.imageInput.addEventListener('change', () => {
                if (DOMElements.imageInput.files[0]) {
                    if (isBatchMode) {
                        showNotification('批量模式不支持图片', 'warning');
                        DOMElements.imageInput.value = '';
                    } else {
                        sendMessage();
                    }
                }
            });

            DOMElements.continueBtn.addEventListener('click', simulateReply);
            DOMElements.batchBtn.addEventListener('click', toggleBatchMode);
        }



function _applyCollapseState(on) {
    document.body.classList.toggle('bottom-collapse-mode', on);
    const csToggle = document.getElementById('bottom-collapse-cs-toggle');
    if (csToggle) csToggle.classList.toggle('active', on);
    if (!on) {
        const panel = document.getElementById('collapsed-extras-panel');
        if (panel) panel.style.display = 'none';
        const expandBtn = document.getElementById('collapse-expand-btn');
        if (expandBtn) expandBtn.classList.remove('open');
    }
}

window._toggleBottomCollapse = function() {
    const isOn = !document.body.classList.contains('bottom-collapse-mode');
    if (typeof settings !== 'undefined') settings.bottomCollapseMode = isOn;
    _applyCollapseState(isOn);
    if (typeof throttledSaveData === 'function') throttledSaveData();
    if (typeof showNotification === 'function')
        showNotification(isOn ? '底部栏已收纳 — 点击 ⌃ 展开更多' : '已退出收纳模式', 'success', 2000);
};

window.toggleCollapsedExtras = function() {
    const panel = document.getElementById('collapsed-extras-panel');
    const btn = document.getElementById('collapse-expand-btn');
    if (!panel) return;
    const willOpen = panel.style.display === 'none' || panel.style.display === '';
    panel.style.display = willOpen ? 'block' : 'none';
    if (btn) btn.classList.toggle('open', willOpen);

    function wireExtra(extraId, primaryId) {
        const extra = document.getElementById(extraId);
        const primary = document.getElementById(primaryId);
        if (extra && primary && !extra._linked) {
            extra._linked = true;
            extra.addEventListener('click', (e) => { e.stopPropagation(); primary.click(); });
        }
    }
    wireExtra('combo-btn-extra', 'combo-btn');
    wireExtra('batch-btn-extra', 'batch-btn');
};

window.exitCollapseMode = function() {
    if (typeof settings !== 'undefined') settings.bottomCollapseMode = false;
    _applyCollapseState(false);
    if (typeof throttledSaveData === 'function') throttledSaveData();
    if (typeof showNotification === 'function') showNotification('已退出收纳模式', 'success', 2000);
};

(function initCollapseMode() {
    function tryApply() {
        if (typeof settings !== 'undefined') {
            if (settings.bottomCollapseMode) _applyCollapseState(true);
        } else {
            setTimeout(tryApply, 300);
        }
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', tryApply);
    } else {
        setTimeout(tryApply, 400);
    }
})();
