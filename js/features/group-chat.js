window.switchStatsTab = function(tab) {
    var statsPanel = document.getElementById('stats-panel');
    var favoritesPanel = document.getElementById('favorites-panel');
    var searchPanel = document.getElementById('search-panel');
    var wordcloudPanel = document.getElementById('wordcloud-panel');
    var allBtns = document.querySelectorAll('.stats-nav-btn');
    allBtns.forEach(function(b) { b.classList.remove('active'); });
    var activeBtn = document.querySelector('.stats-nav-btn[data-tab="' + tab + '"]');
    if (activeBtn) activeBtn.classList.add('active');

    if (statsPanel) statsPanel.style.display = 'none';
    if (favoritesPanel) favoritesPanel.style.display = 'none';
    if (searchPanel) searchPanel.style.display = 'none';
    if (wordcloudPanel) wordcloudPanel.style.display = 'none';

    if (tab === 'stats') {
        if (statsPanel) statsPanel.style.display = 'block';
    } else if (tab === 'search') {
        if (searchPanel) searchPanel.style.display = 'block';
        setTimeout(function() {
            var inp = document.getElementById('msg-search-input');
            if (inp) inp.focus();
        }, 100);
    } else if (tab === 'wordcloud') {
        if (wordcloudPanel) wordcloudPanel.style.display = 'block';
        requestAnimationFrame(function() {
            if (typeof renderWordCloud === 'function') renderWordCloud();
        });
    } else {
        if (favoritesPanel) favoritesPanel.style.display = 'block';
        if (typeof renderFavorites === 'function') renderFavorites();
    }
};

var groupChatSettings = (function() {
    try {
        var saved = JSON.parse(localStorage.getItem('groupChatSettings') || 'null');
        if (!saved) return { enabled: false, showAvatar: true, showName: true, members: [] };
        if (!saved.members) saved.members = [];
        return saved;
    } catch(e) { return { enabled: false, showAvatar: true, showName: true, members: [] }; }
})();
(function loadGroupAvatars() {
    if (!window.localforage) return;
    var members = groupChatSettings.members || [];
    if (members.length === 0) return;
    var promises = members.map(function(m, i) {
        var ref = m.avatarRef || (m.id ? 'gca_' + m.id : 'gca_' + i);
        return localforage.getItem(ref).then(function(avatar) {
            m.avatar = avatar || null;
        }).catch(function() { m.avatar = null; });
    });
    Promise.all(promises).then(function() {
        if (typeof renderGroupMembersList === 'function') renderGroupMembersList();
    });
})();
var _groupMemberAvatarDataUrl = null;

function saveGroupChatSettings() {
    var members = groupChatSettings.members || [];
    var toSave = {
        enabled: groupChatSettings.enabled,
        showAvatar: groupChatSettings.showAvatar,
        showName: groupChatSettings.showName,
        members: members.map(function(m) {
            if (!m.id) m.id = 'gcm_' + Date.now() + '_' + Math.random().toString(36).slice(2,7);
            return { name: m.name, id: m.id, avatarRef: 'gca_' + m.id };
        })
    };
    try {
        localStorage.setItem('groupChatSettings', JSON.stringify(toSave));
    } catch(e) {
        console.warn('groupChatSettings localStorage保存失败:', e);
    }
    if (window.localforage) {
        members.forEach(function(m) {
            if (!m.id) m.id = 'gcm_' + Date.now() + '_' + Math.random().toString(36).slice(2,7);
            localforage.setItem('gca_' + m.id, m.avatar || null).catch(function(e) {
                console.warn('头像存储失败 id=' + m.id, e);
            });
        });
    }
}

function renderGroupMembersList() {
    var list = document.getElementById('group-members-list');
    if (!list) return;
    if (!groupChatSettings.members || groupChatSettings.members.length === 0) {
        list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-secondary);font-size:13px;">暂无成员，点击添加按钮添加</div>';
        return;
    }
    list.innerHTML = groupChatSettings.members.map(function(m, i) {
        var avatarHtml = m.avatar
            ? '<img src="' + m.avatar + '" style="width:36px;height:36px;border-radius:50%;object-fit:cover;">'
            : '<div style="width:36px;height:36px;border-radius:50%;background:rgba(var(--accent-color-rgb),0.15);display:flex;align-items:center;justify-content:center;"><i class="fas fa-user" style="font-size:14px;color:var(--accent-color);"></i></div>';
        return '<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--primary-bg);border:1px solid var(--border-color);border-radius:10px;">'
            + avatarHtml
            + '<span style="flex:1;font-size:13px;font-weight:500;">' + (m.name || '成员' + (i+1)) + '</span>'
            + '<button onclick="openEditGroupMember(' + i + ')" style="background:none;border:none;cursor:pointer;color:var(--accent-color);font-size:14px;padding:4px 8px;"><i class="fas fa-edit"></i></button>'
            + '<button onclick="deleteGroupMember(' + i + ')" style="background:none;border:none;cursor:pointer;color:#ff4757;font-size:14px;padding:4px 8px;"><i class="fas fa-trash-alt"></i></button>'
            + '</div>';
    }).join('');
}

function updateGroupModeUI() {
    var pill = document.getElementById('group-mode-pill');
    var knob = document.getElementById('group-mode-knob');
    var status = document.getElementById('group-mode-status');
    var displaySection = document.getElementById('group-display-section');
    var membersSection = document.getElementById('group-members-section');
    if (!pill) return;
    if (groupChatSettings.enabled) {
        pill.style.background = 'var(--accent-color)';
        knob.style.left = '22px';
        status.textContent = '已开启 — 收到的消息随机显示成员';
        displaySection.style.display = 'block';
        membersSection.style.display = 'block';
    } else {
        pill.style.background = 'var(--border-color)';
        knob.style.left = '3px';
        status.textContent = '已关闭 — 点击开启';
        displaySection.style.display = 'none';
        membersSection.style.display = 'none';
    }
    var avatarPill = document.getElementById('group-show-avatar-pill');
    var avatarKnob = document.getElementById('group-show-avatar-knob');
    if (avatarPill) {
        avatarPill.style.background = groupChatSettings.showAvatar ? 'var(--accent-color)' : 'var(--border-color)';
        avatarKnob.style.right = groupChatSettings.showAvatar ? '3px' : '19px';
    }
    var namePill = document.getElementById('group-show-name-pill');
    var nameKnob = document.getElementById('group-show-name-knob');
    if (namePill) {
        namePill.style.background = groupChatSettings.showName ? 'var(--accent-color)' : 'var(--border-color)';
        nameKnob.style.right = groupChatSettings.showName ? '3px' : '19px';
    }
    renderGroupMembersList();
}

document.addEventListener('DOMContentLoaded', function() {
    var groupModeToggle = document.getElementById('group-mode-toggle');
    if (groupModeToggle) {
        groupModeToggle.addEventListener('click', function() {
            groupChatSettings.enabled = !groupChatSettings.enabled;
            saveGroupChatSettings();
            updateGroupModeUI();
        });
    }
    var showAvatarToggle = document.getElementById('group-show-avatar-toggle');
    if (showAvatarToggle) {
        showAvatarToggle.addEventListener('click', function() {
            groupChatSettings.showAvatar = !groupChatSettings.showAvatar;
            saveGroupChatSettings();
            updateGroupModeUI();
        });
    }
    var showNameToggle = document.getElementById('group-show-name-toggle');
    if (showNameToggle) {
        showNameToggle.addEventListener('click', function() {
            groupChatSettings.showName = !groupChatSettings.showName;
            saveGroupChatSettings();
            updateGroupModeUI();
        });
    }
    var closeGroupChat = document.getElementById('close-group-chat');
    if (closeGroupChat) {
        closeGroupChat.addEventListener('click', function() {
            var m = document.getElementById('group-chat-modal');
            if (m && typeof hideModal === 'function') hideModal(m);
        });
    }
    setTimeout(updateGroupModeUI, 200);
});

window.openAddGroupMember = function() {
    _groupMemberAvatarDataUrl = null;
    document.getElementById('group-member-edit-title').textContent = '添加成员';
    document.getElementById('group-member-name-input').value = '';
    document.getElementById('group-member-edit-index').value = '';
    var preview = document.getElementById('group-member-avatar-preview');
    preview.innerHTML = '<i class="fas fa-camera" style="font-size:20px;color:var(--text-secondary);"></i>';
    var m = document.getElementById('group-member-edit-modal');
    if (m && typeof showModal === 'function') showModal(m);
};

window.openEditGroupMember = function(idx) {
    var member = groupChatSettings.members[idx];
    if (!member) return;
    _groupMemberAvatarDataUrl = member.avatar || null;
    document.getElementById('group-member-edit-title').textContent = '编辑成员';
    document.getElementById('group-member-name-input').value = member.name || '';
    document.getElementById('group-member-edit-index').value = idx;
    var preview = document.getElementById('group-member-avatar-preview');
    if (member.avatar) {
        preview.innerHTML = '<img src="' + member.avatar + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">';
    } else {
        preview.innerHTML = '<i class="fas fa-camera" style="font-size:20px;color:var(--text-secondary);"></i>';
    }
    var m = document.getElementById('group-member-edit-modal');
    if (m && typeof showModal === 'function') showModal(m);
};

window.closeGroupMemberEdit = function() {
    var m = document.getElementById('group-member-edit-modal');
    if (m && typeof hideModal === 'function') hideModal(m);
};

window.previewGroupMemberAvatar = function(input) {
    var file = input.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(e) {
        _groupMemberAvatarDataUrl = e.target.result;
        var preview = document.getElementById('group-member-avatar-preview');
        preview.innerHTML = '<img src="' + e.target.result + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">';
    };
    reader.readAsDataURL(file);
};

window.saveGroupMember = function() {
    var name = (document.getElementById('group-member-name-input').value || '').trim();
    if (!name) { alert('请输入成员名字'); return; }
    var idxVal = document.getElementById('group-member-edit-index').value;
    var member = { name: name, avatar: _groupMemberAvatarDataUrl };
    if (idxVal !== '') {
        groupChatSettings.members[parseInt(idxVal)] = member;
    } else {
        if (!groupChatSettings.members) groupChatSettings.members = [];
        groupChatSettings.members.push(member);
    }
    saveGroupChatSettings();
    renderGroupMembersList();
    window.closeGroupMemberEdit();
};

window.deleteGroupMember = function(idx) {
    if (!confirm('确定删除该成员吗？')) return;
    groupChatSettings.members.splice(idx, 1);
    saveGroupChatSettings();
    renderGroupMembersList();
};

window.getGroupMemberForMessage = function(msgId) {
    if (!groupChatSettings.enabled || !groupChatSettings.members || groupChatSettings.members.length === 0) return null;
    var seed = 0;
    var idStr = String(msgId);
    for (var i = 0; i < idStr.length; i++) seed += idStr.charCodeAt(i) * (i + 1);
    return groupChatSettings.members[seed % groupChatSettings.members.length];
};

document.addEventListener('DOMContentLoaded', function() {
    var exportAllBtn = document.getElementById('export-all-settings');
    var importAllBtn = document.getElementById('import-all-settings');
if (exportAllBtn) {
        exportAllBtn.addEventListener('click', async function() {
            const overlay = document.createElement('div');
            overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.55);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;animation:fadeIn 0.2s ease;';
            overlay.innerHTML = `
                <div style="background:var(--secondary-bg);border-radius:20px;padding:24px;width:88%;max-width:380px;box-shadow:0 20px 60px rgba(0,0,0,0.4);animation:modalContentSlideIn 0.3s ease forwards;">
                    <div style="font-size:15px;font-weight:700;color:var(--text-primary);margin-bottom:4px;display:flex;align-items:center;gap:8px;">
                        <i class="fas fa-archive" style="color:var(--accent-color);font-size:14px;"></i>全量备份导出
                    </div>
                    <div style="font-size:12px;color:var(--text-secondary);margin-bottom:16px;">默认导出为 <strong>ZIP</strong>：<code style="font-size:11px;">backup.json</code> 仅存结构与引用，大图在 <code style="font-size:11px;">media/</code>，避免单文件 JSON 过大导致无法解析。</div>
                    <div style="display:flex;flex-direction:column;gap:9px;margin-bottom:20px;">
                        <label style="display:flex;align-items:center;gap:10px;cursor:pointer;padding:10px 12px;border:1px solid var(--border-color);border-radius:12px;background:var(--primary-bg);font-size:13px;color:var(--text-primary);">
                            <input type="checkbox" id="_bk_msgs" checked style="accent-color:var(--accent-color);width:15px;height:15px;">
                            <i class="fas fa-comments" style="color:var(--accent-color);width:16px;text-align:center;"></i>
                            <span>聊天记录 <span style="font-size:11px;color:var(--text-secondary);">(${messages.length} 条)</span></span>
                        </label>
                        <label style="display:flex;align-items:center;gap:10px;cursor:pointer;padding:10px 12px;border:1px solid var(--border-color);border-radius:12px;background:var(--primary-bg);font-size:13px;color:var(--text-primary);">
                            <input type="checkbox" id="_bk_settings" checked style="accent-color:var(--accent-color);width:15px;height:15px;">
                            <i class="fas fa-sliders-h" style="color:var(--accent-color);width:16px;text-align:center;"></i>
                            <span>外观与聊天设置</span>
                        </label>
                        <label style="display:flex;align-items:center;gap:10px;cursor:pointer;padding:10px 12px;border:1px solid var(--border-color);border-radius:12px;background:var(--primary-bg);font-size:13px;color:var(--text-primary);">
                            <input type="checkbox" id="_bk_custom" checked style="accent-color:var(--accent-color);width:15px;height:15px;">
                            <i class="fas fa-reply" style="color:var(--accent-color);width:16px;text-align:center;"></i>
                            <span>字卡 / 拍一拍 / 状态 / 格言</span>
                        </label>
                        <label style="display:flex;align-items:center;gap:10px;cursor:pointer;padding:10px 12px;border:1px solid var(--border-color);border-radius:12px;background:var(--primary-bg);font-size:13px;color:var(--text-primary);">
                            <input type="checkbox" id="_bk_ann" checked style="accent-color:var(--accent-color);width:15px;height:15px;">
                            <i class="fas fa-calendar-heart" style="color:var(--accent-color);width:16px;text-align:center;"></i>
                            <span>纪念日 / 倒计时</span>
                        </label>
                        <label style="display:flex;align-items:center;gap:10px;cursor:pointer;padding:10px 12px;border:1px solid var(--border-color);border-radius:12px;background:var(--primary-bg);font-size:13px;color:var(--text-primary);">
                            <input type="checkbox" id="_bk_themes" checked style="accent-color:var(--accent-color);width:15px;height:15px;">
                            <i class="fas fa-palette" style="color:var(--accent-color);width:16px;text-align:center;"></i>
                            <span>自定义主题 / 方案</span>
                        </label>
                        <label style="display:flex;align-items:center;gap:10px;cursor:pointer;padding:10px 12px;border:1px solid var(--border-color);border-radius:12px;background:var(--primary-bg);font-size:13px;color:var(--text-primary);">
                            <input type="checkbox" id="_bk_dg" checked style="accent-color:var(--accent-color);width:15px;height:15px;">
                            <i class="fas fa-sun" style="color:var(--accent-color);width:16px;text-align:center;"></i>
                            <span>每日公告 / 心情数据</span>
                        </label>
                        <label style="display:flex;align-items:center;gap:10px;cursor:pointer;padding:10px 12px;border:1px solid var(--border-color);border-radius:12px;background:var(--primary-bg);font-size:13px;color:var(--text-primary);">
                            <input type="checkbox" id="_bk_stickers" style="accent-color:var(--accent-color);width:15px;height:15px;">
                            <i class="fas fa-sticky-note" style="color:var(--accent-color);width:16px;text-align:center;"></i>
                            <span>表情库 <span style="font-size:11px;color:var(--text-secondary);">(默认关，勾选后去重打包)</span></span>
                        </label>
                    </div>
                    <div style="display:flex;gap:10px;">
                        <button id="_bk_cancel" style="flex:1;padding:11px;border:1px solid var(--border-color);border-radius:12px;background:none;color:var(--text-secondary);font-size:13px;cursor:pointer;font-family:var(--font-family);">取消</button>
                        <button id="_bk_confirm" style="flex:2;padding:11px;border:none;border-radius:12px;background:var(--accent-color);color:#fff;font-size:13px;font-weight:600;cursor:pointer;font-family:var(--font-family);display:flex;align-items:center;justify-content:center;gap:7px;">
                            <i class="fas fa-download"></i>导出备份
                        </button>
                    </div>
                </div>`;
            document.body.appendChild(overlay);

            function closeBkDialog() { overlay.remove(); }
            overlay.addEventListener('click', ev => { if (ev.target === overlay) closeBkDialog(); });
            const bkCancelBtn = document.getElementById('_bk_cancel');
            const bkConfirmBtn = document.getElementById('_bk_confirm');
            if (bkCancelBtn) bkCancelBtn.onclick = closeBkDialog;

            if (bkConfirmBtn) bkConfirmBtn.onclick = async function() {
                const inclMsgs    = document.getElementById('_bk_msgs').checked;
                const inclSet     = document.getElementById('_bk_settings').checked;
                const inclCustom  = document.getElementById('_bk_custom').checked;
                const inclAnn     = document.getElementById('_bk_ann').checked;
                const inclThemes  = document.getElementById('_bk_themes').checked;
                const inclDg      = document.getElementById('_bk_dg').checked;
                const inclStickers = document.getElementById('_bk_stickers') && document.getElementById('_bk_stickers').checked;

                if (!inclMsgs && !inclSet && !inclCustom && !inclAnn && !inclThemes && !inclDg && !inclStickers) {
                    showNotification('请至少选择一项', 'error');
                    return;
                }
                closeBkDialog();

                try {
                    if (typeof ChatBackup !== 'undefined' && ChatBackup.buildBackupPayload && ChatBackup.serializeBackupV4) {
                        const payload = await ChatBackup.buildBackupPayload({
                            inclMsgs: inclMsgs,
                            inclSet: inclSet,
                            inclCustom: inclCustom,
                            inclAnn: inclAnn,
                            inclThemes: inclThemes,
                            inclDg: inclDg,
                            inclStickers: inclStickers
                        });
                        const jsonString = ChatBackup.serializeBackupV4(payload);
                        const dateStr = new Date().toISOString().slice(0, 10);
                        const fileName = `chatapp-backup-${dateStr}.json`;
                        const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
                        downloadFileFallback(blob, fileName);
                        if (typeof showNotification === 'function') showNotification('已导出 JSON 备份', 'success');
                    } else {
                        if (typeof showNotification === 'function') showNotification('备份模块或函数未加载，请刷新页面', 'error');
                    }
                } catch(e) {
                    console.error('全量备份导出失败:', e);
                    if (typeof showNotification === 'function') showNotification('导出失败，请重试', 'error');
                }
            };
        });
    }
if (importAllBtn) {
        importAllBtn.addEventListener('click', function() {
            var input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json,.zip,application/json,application/zip';
            input.onchange = async function(e) {
                var file = e.target.files[0];
                if (!file) return;

                if (file.size > 220 * 1024 * 1024) {
                    if (typeof showNotification === 'function') showNotification('文件过大，请检查是否是正确的备份文件', 'error');
                    return;
                }

                try {
                    if (typeof ChatBackup === 'undefined' || !ChatBackup.loadBackupFromFile || !ChatBackup.applyBackupToStorage) {
                        throw new Error('备份模块未加载，请刷新页面');
                    }
                    var backup = await ChatBackup.loadBackupFromFile(file);

                    var okShape = backup.type === 'chatapp-backup-v5' ||
                        backup.type === 'full' ||
                        (backup.type && backup.type.indexOf('backup') !== -1) ||
                        backup.formatVersion === 4 ||
                        backup.formatVersion === 5 ||
                        backup.localforage ||
                        backup.indexedDB;
                    if (!okShape) throw new Error('不是有效的传讯备份文件');

                    if (!confirm('导入全量备份将覆盖备份文件中包含的数据（按文件内容写入）。\n\nv5 ZIP：从 media/ 还原图片；v4 JSON：从 mediaStore 还原。\n\n确定继续吗？')) return;

                    await ChatBackup.applyBackupToStorage(backup, { selective: false });

                    if (typeof showNotification === 'function') showNotification('数据恢复成功，即将刷新页面应用更改', 'success', 2000);
                    setTimeout(function() { location.reload(); }, 2000);
                } catch (err) {
                    var msg = err && err.message ? err.message : '未知错误';
                    if (typeof showNotification === 'function') showNotification('导入失败：' + msg, 'error', 5000);
                    console.error('导入报错:', err);
                }
            };
            document.body.appendChild(input);
            input.click();
            document.body.removeChild(input);
        });
    }
});

window.startEditDgWeather = function(el) {
    var current = el.textContent.trim();
    var input = document.createElement('input');
    input.type = 'text';
    input.value = current;
    input.maxLength = 20;
    input.style.cssText = 'width:120px;padding:2px 6px;border:1px solid var(--accent-color);border-radius:6px;font-size:13px;background:var(--primary-bg);color:var(--text-primary);outline:none;';
    el.style.display = 'none';
    el.parentNode.insertBefore(input, el.nextSibling);
    input.focus();
    input.select();
    function saveWeather() {
        var val = input.value.trim() || current;
        el.textContent = val;
        el.style.display = '';
        input.remove();
        var now = new Date();
        var dateKey = 'customWeather_' + now.getFullYear() + '_' + (now.getMonth()+1) + '_' + now.getDate();
        localStorage.setItem(dateKey, val);
    }
    input.addEventListener('blur', saveWeather);
    input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') { e.preventDefault(); saveWeather(); }
        if (e.key === 'Escape') { el.style.display = ''; input.remove(); }
    });
};

    document.addEventListener('focusin', function(e) {
        if (e.target && (e.target.classList.contains('message-input') || e.target.tagName === 'TEXTAREA')) {
            setTimeout(function() {
                var chat = document.querySelector('.chat-container');
                if (chat) chat.scrollTop = chat.scrollHeight;
            }, 100);
        }
    });


window._runMsgSearch = function() {
    var input = document.getElementById('msg-search-input');
    var dateFrom = document.getElementById('msg-search-date-from');
    var dateTo = document.getElementById('msg-search-date-to');
    var resultsEl = document.getElementById('msg-search-results');
    if (!input || !resultsEl) return;

    var q = input.value.trim().toLowerCase();
    var from = dateFrom && dateFrom.value ? new Date(dateFrom.value) : null;
    var to = dateTo && dateTo.value ? new Date(dateTo.value + 'T23:59:59') : null;

    var allMessages = (typeof messages !== 'undefined' ? messages : [])
        .filter(function(m) { return m.type !== 'system'; });

    var filtered = allMessages.filter(function(m) {
        var matchText = !q || (m.text && m.text.toLowerCase().includes(q)) || (m.image && !q);
        if (q && m.image && !m.text) matchText = false;
        if (q) matchText = m.text && m.text.toLowerCase().includes(q);
        var ts = m.timestamp ? new Date(m.timestamp) : null;
        var matchFrom = !from || (ts && ts >= from);
        var matchTo = !to || (ts && ts <= to);
        return matchText && matchFrom && matchTo;
    });

    if (!q && !from && !to) {
        resultsEl.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text-secondary);font-size:13px;">输入关键词或选择日期开始搜索</div>';
        return;
    }

    if (filtered.length === 0) {
        resultsEl.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text-secondary);font-size:13px;">未找到相关消息</div>';
        return;
    }

    var myAvatarEl = document.querySelector('#my-avatar img');
    var partnerAvatarEl = document.querySelector('#partner-avatar img');
    var myAvatar = myAvatarEl ? myAvatarEl.src : '';
    var partnerAvatar = partnerAvatarEl ? partnerAvatarEl.src : '';
    var myName = (typeof settings !== 'undefined' && settings.myName) || '我';
    var partnerName = (typeof settings !== 'undefined' && settings.partnerName) || '对方';

    function highlight(text) {
        if (!q || !text) return (text || '').replace(/</g,'&lt;').replace(/>/g,'&gt;');
        var safe = text.replace(/</g,'&lt;').replace(/>/g,'&gt;');
        var safeQ = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return safe.replace(new RegExp('(' + safeQ + ')', 'gi'), '<mark style="background:rgba(var(--accent-color-rgb,180,140,100),0.3);border-radius:2px;padding:0 1px;">$1</mark>');
    }

    resultsEl.innerHTML = filtered.map(function(msg) {
        var isUser = msg.sender === 'user';
        var name = isUser ? myName : partnerName;
        var avatar = isUser ? myAvatar : partnerAvatar;

        if (!isUser && typeof groupChatSettings !== 'undefined' && groupChatSettings.enabled && groupChatSettings.members) {
            var member = groupChatSettings.members.find(function(m) { return m.name === msg.sender; });
            if (member) {
                name = member.name;
                avatar = member.avatar || '';
            }
        }

        var ts = msg.timestamp ? new Date(msg.timestamp).toLocaleString('zh-CN', {
            month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit'
        }) : '';

        var avatarHtml = avatar
            ? '<img src="' + avatar + '" style="width:34px;height:34px;border-radius:50%;object-fit:cover;flex-shrink:0;">'
            : '<div style="width:34px;height:34px;border-radius:50%;background:rgba(var(--accent-color-rgb,180,140,100),0.18);display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="fas fa-user" style="font-size:14px;color:var(--accent-color);"></i></div>';

        var contentHtml = '';
        if (msg.text) contentHtml += '<div style="font-size:13px;color:var(--text-primary);line-height:1.5;word-break:break-word;margin-top:3px;">' + highlight(msg.text) + '</div>';
        if (msg.image) contentHtml += '<img src="' + msg.image + '" style="max-width:120px;max-height:90px;border-radius:8px;display:block;margin-top:5px;cursor:pointer;" onclick="if(typeof viewImage===\'function\')viewImage(\'' + msg.image.replace(/'/g,"\\'") + '\')" loading="lazy">';

        return '<div style="display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border-radius:12px;background:var(--primary-bg);border:1px solid var(--border-color);margin-bottom:8px;cursor:pointer;" onclick="if(typeof scrollToMessage===\'function\')scrollToMessage(' + msg.id + ')">'
            + avatarHtml
            + '<div style="flex:1;min-width:0;">'
            + '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">'
            + '<span style="font-size:12px;font-weight:600;color:var(--accent-color);">' + name + '</span>'
            + '<span style="font-size:11px;color:var(--text-secondary);white-space:nowrap;">' + ts + '</span>'
            + '</div>'
            + contentHtml
            + '</div></div>';
    }).join('');

    resultsEl.insertAdjacentHTML('afterbegin',
        '<div style="font-size:12px;color:var(--text-secondary);margin-bottom:8px;padding:0 2px;">共找到 ' + filtered.length + ' 条结果</div>'
    );
};

window.scrollToMessage = function(msgId) {
    var el = document.querySelector('[data-id="' + msgId + '"]');
    if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.style.transition = 'background 0.3s';
        el.style.background = 'rgba(var(--accent-color-rgb,180,140,100),0.18)';
        setTimeout(function() { el.style.background = ''; }, 1500);
    }
};
