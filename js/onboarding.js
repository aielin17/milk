(function() {
    var TI_AVATAR_KEY = 'tiSettings_showAvatar';
    var TI_TEXT_KEY = 'tiSettings_customText';
    var tiShowAvatar = localStorage.getItem(TI_AVATAR_KEY) !== 'false';
    var tiCustomText = localStorage.getItem(TI_TEXT_KEY) || '';

    function applyTiAvatarVisibility() {
        var avatarEl = document.getElementById('typing-indicator-avatar');
        if (!avatarEl) return;
        avatarEl.style.display = tiShowAvatar ? '' : 'none';
    }

    function getTiLabel() {
        if (tiCustomText) return tiCustomText;
        var name = (window.settings && settings.partnerName) ? settings.partnerName : '对方';
        return name + ' 正在输入';
    }

    function updatePreview() {
        var previewText = document.getElementById('ti-preview-text');
        var previewAvatar = document.getElementById('ti-preview-avatar');
        if (previewText) previewText.textContent = getTiLabel();
        if (previewAvatar) previewAvatar.style.display = tiShowAvatar ? '' : 'none';
        var label = document.getElementById('typing-indicator-label');
        if (label && label.textContent) label.textContent = getTiLabel();
        var actualAvatar = document.getElementById('typing-indicator-avatar');
        if (actualAvatar) actualAvatar.style.display = tiShowAvatar ? '' : 'none';
    }

    function syncPillUI() {
        var row = document.getElementById('ti-avatar-toggle');
        if (!row) return;
        if (tiShowAvatar) {
            row.classList.add('active');
        } else {
            row.classList.remove('active');
        }
    }

    document.addEventListener('DOMContentLoaded', function() {
        applyTiAvatarVisibility();
    });

    var _origSetLabel = null;
    function patchTypingLabel() {
        var label = document.getElementById('typing-indicator-label');
        if (label && tiCustomText) {
            label.textContent = tiCustomText;
        }
    }
    var labelEl = null;
    function initLabelObserver() {
        labelEl = document.getElementById('typing-indicator-label');
        if (!labelEl || labelEl._tiObserved) return;
        labelEl._tiObserved = true;
        var obs = new MutationObserver(function() {
            if (tiCustomText && labelEl.textContent !== tiCustomText) {
                labelEl.textContent = tiCustomText;
            }
        });
        obs.observe(labelEl, { childList: true, characterData: true, subtree: true });
    }
    setTimeout(initLabelObserver, 1000);

    document.addEventListener('click', function(e) {
        var ti = e.target.closest('.typing-indicator');
        if (!ti) return;
        e.stopPropagation();
        initLabelObserver();
        var modal = document.getElementById('ti-settings-modal');
        if (!modal) return;
        var input = document.getElementById('ti-text-input');
        if (input) input.value = tiCustomText;
        syncPillUI();
        updatePreview();
        var partnerImg = document.querySelector('#partner-info .message-avatar img') ||
                         document.querySelector('.partner-avatar img') ||
                         document.querySelector('[id*="partner"] img');
        var previewAvatar = document.getElementById('ti-preview-avatar');
        if (previewAvatar && partnerImg) {
            previewAvatar.innerHTML = '<img src="' + partnerImg.src + '" style="width:100%;height:100%;object-fit:cover;">';
        }
        modal.classList.add('open');
    });

    document.addEventListener('click', function(e) {
        var modal = document.getElementById('ti-settings-modal');
        if (!modal || !modal.classList.contains('open')) return;
        if (e.target === modal) modal.classList.remove('open');
    });
    document.addEventListener('click', function(e) {
        if (e.target.id === 'ti-settings-close-btn') {
            var modal = document.getElementById('ti-settings-modal');
            if (modal) modal.classList.remove('open');
        }
    });

    document.addEventListener('click', function(e) {
        var row = e.target.closest('#ti-avatar-toggle');
        if (!row) return;
        tiShowAvatar = !tiShowAvatar;
        localStorage.setItem(TI_AVATAR_KEY, tiShowAvatar);
        syncPillUI();
        updatePreview();
        applyTiAvatarVisibility();
    });

    document.addEventListener('click', function(e) {
        if (e.target.id !== 'ti-text-save-btn') return;
        var input = document.getElementById('ti-text-input');
        if (!input) return;
        tiCustomText = input.value.trim();
        localStorage.setItem(TI_TEXT_KEY, tiCustomText);
        updatePreview();
        e.target.textContent = '已保存 ✓';
        setTimeout(function() { e.target.textContent = '保存'; }, 1200);
    });

    document.addEventListener('click', function(e) {
        if (e.target.id !== 'ti-text-reset-btn') return;
        tiCustomText = '';
        localStorage.removeItem(TI_TEXT_KEY);
        var input = document.getElementById('ti-text-input');
        if (input) input.value = '';
        updatePreview();
    });

    document.addEventListener('DOMContentLoaded', function() { syncPillUI(); });
    setTimeout(syncPillUI, 800);
})();


(function() {
    var PLEDGE_KEY = 'splashPledgeSigned_v3';
    var TOTAL = 6;
    var PLEDGE_TEXT = '我绝不盈利、造谣、污蔑或嘲讽，并对自己的使用行为负完全责任';
    var cur = 0;

    function initSplash() {
        var splash = document.getElementById('splash-declaration');
        if (!splash) return;

        localStorage.removeItem('splashPledgeSigned_v2');
        localStorage.removeItem('splashPledgeSigned_v1');
        localStorage.removeItem('splashPledgeSigned');

        if (localStorage.getItem(PLEDGE_KEY) === 'true') {
            splash.style.display = 'none';
            return;
        }

        var starsEl = document.getElementById('splash-stars');
        if (starsEl) {
            var html = '';
            for (var i = 0; i < 70; i++) {
                var x = (Math.random() * 100).toFixed(1);
                var y = (Math.random() * 100).toFixed(1);
                var sz = Math.random() > 0.75 ? '3px' : '2px';
                var del = (Math.random() * 4).toFixed(2);
                var dur = (2 + Math.random() * 3).toFixed(1);
                html += '<span style="left:'+x+'%;top:'+y+'%;width:'+sz+';height:'+sz+';animation-delay:'+del+'s;animation-duration:'+dur+'s;"></span>';
            }
            starsEl.innerHTML = html;
        }

        var dotsEl = document.getElementById('splash-dots');
        if (dotsEl) {
            var dhtml = '';
            for (var d = 0; d < TOTAL; d++) {
                dhtml += '<div class="splash-dot'+(d===0?' active done':'')+'" data-dot="'+d+'"></div>';
            }
            dotsEl.innerHTML = dhtml;
        }

        var prevBtn   = document.getElementById('splash-prev-btn');
        var nextBtn   = document.getElementById('splash-next-btn');
        var enterBtn  = document.getElementById('splash-enter-btn');
        var pledgeInp = document.getElementById('splash-pledge-input');

        if (prevBtn) {
            prevBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                if (cur > 0) goTo(cur - 1);
            });
        }
        if (nextBtn) {
            nextBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                if (cur < TOTAL - 1) goTo(cur + 1);
            });
        }
        if (enterBtn) {
            enterBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                if (enterBtn.classList.contains('ready')) enterSite();
            });
        }
        if (pledgeInp) {
            pledgeInp.addEventListener('input', function() {
                var val = pledgeInp.value;
                var hint = document.getElementById('splash-pledge-hint');
                if (val === PLEDGE_TEXT) {
                    pledgeInp.classList.add('correct');
                    if (hint) { hint.textContent = '✓ 承诺已确认，可以进入了'; hint.className = 'splash-pledge-hint ok'; }
                    if (enterBtn) enterBtn.classList.add('ready');
                } else {
                    pledgeInp.classList.remove('correct');
                    if (hint) { hint.textContent = '请完整输入上方承诺后方可进入'; hint.className = 'splash-pledge-hint'; }
                    if (enterBtn) enterBtn.classList.remove('ready');
                }
            });
            pledgeInp.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' && enterBtn && enterBtn.classList.contains('ready')) {
                    enterSite();
                }
            });
        }

        if (dotsEl) {
            dotsEl.addEventListener('click', function(e) {
                var dot = e.target.closest('.splash-dot');
                if (dot) goTo(parseInt(dot.getAttribute('data-dot')));
            });
        }

        updateUI();
    }

    function goTo(idx) {
        var slides = document.querySelectorAll('.splash-slide');
        var dots   = document.querySelectorAll('.splash-dot');
        var prevIdx = cur;

        if (slides[prevIdx]) {
            slides[prevIdx].classList.remove('active');
            slides[prevIdx].classList.add('exit-left');
            var exitEl = slides[prevIdx];
            setTimeout(function() { exitEl.classList.remove('exit-left'); }, 420);
        }

        cur = idx;

        if (slides[cur]) {
            slides[cur].classList.add('active');
        }

        dots.forEach(function(dot, i) {
            dot.classList.toggle('active', i === cur);
            dot.classList.toggle('done', i < cur);
        });

        updateUI();

        if (cur === TOTAL - 1) {
            setTimeout(function() {
                var inp = document.getElementById('splash-pledge-input');
                if (inp) inp.focus();
            }, 450);
        }
    }

    function updateUI() {
        var prevBtn  = document.getElementById('splash-prev-btn');
        var nextBtn  = document.getElementById('splash-next-btn');
        var enterBtn = document.getElementById('splash-enter-btn');
        var pageNum  = document.getElementById('splash-page-num');

        if (pageNum) pageNum.textContent = (cur + 1) + ' / ' + TOTAL;
        if (prevBtn) { prevBtn.disabled = (cur === 0); }
        if (cur === TOTAL - 1) {
            if (nextBtn)  nextBtn.style.display  = 'none';
            if (enterBtn) enterBtn.style.display = '';
        } else {
            if (nextBtn)  nextBtn.style.display  = '';
            if (enterBtn) enterBtn.style.display = 'none';
        }
    }

    function enterSite() {
        localStorage.setItem(PLEDGE_KEY, 'true');
        var splash = document.getElementById('splash-declaration');
        if (splash) {
            splash.classList.add('splash-fade-out');
            setTimeout(function() { splash.style.display = 'none'; }, 950);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSplash);
    } else {
        initSplash();
    }
})();

const tourOverlay = document.getElementById('tour-overlay');
const tourPopover = document.getElementById('tour-popover');
const tourHighlightBox = document.getElementById('tour-highlight-box');
const tourTitle = document.getElementById('tour-title');
const tourContent = document.getElementById('tour-content');
const tourStepCounter = document.getElementById('tour-step-counter');
const tourNextBtn = document.getElementById('tour-next-btn');
const tourPrevBtn = document.getElementById('tour-prev-btn');
const tourSkipBtn = document.getElementById('tour-skip-btn');


let currentTourStep = 0;
let isTourActive = false;

const tourSteps = [
    {
        title: "✨ 欢迎来到「传讯」",
        content: "这里是你们专属的私密空间。<br><br>这个教程共 <b>20 步</b>，带你从头到尾认识每一个功能，建议完整看完哦🥺<br><br>点击「下一步」开始吧！",
        position: 'center'
    },
    {
        element: '#my-avatar',
        title: "📷 你的头像",
        content: "这是<b>你的头像</b>。<br><br>点击它可以上传图片作为你的头像。",
        position: 'bottom'
    },
    {
        element: '#my-name',
        title: "✏️ 你的昵称",
        content: "这里显示的是<b>你的名字</b>。<br><br>点击名字可以直接修改。",
        position: 'bottom'
    },
    {
        element: '#my-status-container',
        title: "💬 你的状态签名",
        content: "这里是你的<b>状态签名</b>。<br><br>点击可以编辑，一般而言对方是能看见的哦～",
        position: 'bottom'
    },
    {
        element: '#partner-avatar',
        title: "Ta 的头像",
        content: "这里是<b>梦角的头像</b>，同样点击可以上传更换。",
        position: 'bottom'
    },
    {
        element: '#partner-name',
        title: "Ta 的昵称",
        content: "这是<b>梦角的昵称</b>，同样点击可以修改。",
        position: 'bottom'
    },
    {
        element: '.header-motto',
        title: "🌸 顶部格言",
        content: "这里显示着格言～自定义回复里可修改。",
        position: 'bottom'
    },
    {
        element: '#message-input',
        title: "⌨️ 消息输入框",
        content: "在这里<b>输入你想说的话</b>，按回车键或点击右边的发送按钮就能发出去。",
        position: 'top'
    },
    {
        element: '#send-btn',
        title: "🚀 发送消息",
        content: "点击这个<b>纸飞机按钮</b>就能发送消息。<br><br>发送后对方会在几秒内给你回复，你可以在「聊天设置」里调整回复的速度快慢哦。",
        position: 'top'
    },
    {
        element: '#attachment-btn',
        title: "🖼️ 发送图片 / 表情包",
        content: "点击这里可以<b>发送图片</b>，支持相册图片和表情包。<br><br>你还可以在「高级功能 → 回复库」中上传自定义的表情，到时候对方也会发给你！",
        position: 'top'
    },
    {
        element: '#poke-btn',
        title: "👋 拍一拍互动",
        content: "这是「<b>拍一拍</b>」功能，发出后会显示一条互动消息，比如「轻拍了你一下」。<br><br>可以在「高级功能 → 自定义拍一拍」里添加更多的动作！",
        position: 'top'
    },
    {
        element: '#continue-btn',
        title: "让 Ta 继续说",
        content: "不知道说什么了？或者想让 Ta 多说几句？<br><br>点击这个按钮，<b>梦角会主动找你说话。",
        position: 'top'
    },
    {
        element: '#batch-btn',
        title: "📦 批量发送模式",
        content: "开启<b>批量模式</b>后，你可以先写好多条消息，再一次性全部发出去<br><br>点击按钮开启，编辑完成后再次点击「发送全部」即可。",
        position: 'top'
    },
    {
        element: '#settings-btn',
        title: "⚙️ 设置中心",
        content: "所有个性化配置都在这个<b>设置按钮</b>里，我们点进去看一下！<br>",
        position: 'bottom',
        onBefore: () => { if (isTourActive) document.querySelectorAll('.modal').forEach(m => hideModal(m)); }
    },
    {
        element: '#appearance-settings',
        title: "🎨 外观设置",
        content: "<b>外观设置</b>里可以：<br>• 切换 10 款主题配色（金/蓝/粉…）<br>• 调整字体大小<br>• 更换聊天背景图<br>• 自定义气泡样式 CSS<br>",
        position: 'bottom',
        onBefore: () => { if (isTourActive) showModal(DOMElements.settingsModal.modal); }
    },
    {
        element: '#chat-settings',
        title: "💬 聊天设置",
        content: "<b>聊天设置</b>里可以调整：<br>• 消息音效开关<br>• 已读回执显示<br>• 对方回复速度（快/慢）<br>• 消息气泡样式（圆角/方形）",
        position: 'bottom'
    },
    {
        element: '#advanced-settings',
        title: "🚀 高级功能 — 必看！",
        content: "<b>高级功能</b>是整个应用最强大的板块，里面有：<br>• <b>心晴手账</b>：记录每天的心情<br>• <b>信封投递</b>：给梦角写一封信<br>• <b>纪念日</b>：倒计时 / 纪念天数<br>• <b>运势占卜</b>：每日运势<br>• <b>自定义回复</b>：让梦角说你想听的话<br>• <b>音乐播放器</b>：背景音乐",
        position: 'bottom'
    },
    {
        element: '#data-settings',
        title: "💾 数据管理",
        content: "<b>数据管理</b>里可以：<br>• 导出聊天记录（备份到本地）<br>• 导入之前备份的记录<br>• 查看存储空间占用<br>• 开启后台消息通知推送<br>• 重置所有数据<br>• 重放本教程",
        position: 'top'
    },
    {
        element: '#theme-toggle',
        title: "🌙 日 / 夜模式切换",
        content: "这个按钮可以快速<b>切换白天 / 夜晚</b>模式。<br><br>夜晚模式下整体变成深色背景，对眼睛更友好，睡前聊天必备！✨",
        position: 'bottom',
        onBefore: () => { if (isTourActive) hideModal(DOMElements.settingsModal.modal); }
    },
    {
        element: '#favorites-btn',
        title: "⭐ 收藏夹",
        content: "长按或点击一条消息，会弹出操作菜单，可以把消息<b>收藏</b>起来。<br><br>所有收藏的消息都会保存在这个收藏夹里，随时可以翻阅回味～",
        position: 'bottom'
    },
    {
        element: '#session-manager-btn',
        title: "📂 会话管理",
        content: "你可以创建<b>多个独立的聊天会话</b>，每个会话都有独立的聊天记录。<br>",
        position: 'bottom'
    },
    {
        title: "✋ 消息操作提示",
        content: "点击任意一条消息，会出现操作菜单：<br>• ⭐ <b>收藏</b>：保存到收藏夹<br>• ↩️ <b>回复</b>：引用这条消息回复<br>• 📝 <b>注释</b>：给消息添加备注<br>• 🗑️ <b>删除</b>：删除这条消息",
        position: 'center'
    },
    {
        title: "🎉 你已掌握所有功能！",
        content: "恭喜你完成了新手引导！现在你已经了解了「传讯」的全部功能。<br><br>希望你们在这里收获满满的爱与幸福 🥺💕",
        position: 'center'
    }
];

function startTour() {
    isTourActive = true;
    tourOverlay.style.display = 'block';
    setTimeout(() => tourOverlay.classList.add('active'), 10);
    currentTourStep = 0;
    showTourStep(currentTourStep);
}

function endTour() {
    isTourActive = false;
    tourOverlay.classList.remove('active');
    tourPopover.classList.remove('visible');
    setTimeout(() => {
        tourOverlay.style.display = 'none';
        tourHighlightBox.style.width = '0px';
        tourHighlightBox.style.height = '0px';
        tourHighlightBox.style.opacity = '0';
    }, 300);
    localforage.setItem(APP_PREFIX + 'tour_seen', 'true');
    document.querySelectorAll('.modal').forEach(m => hideModal(m));
    setTimeout(function() {
        if (typeof window.tryShowDailyGreeting === 'function') {
            window.tryShowDailyGreeting();
        }
    }, 900);
}

function showTourStep(index) {
    if (index < 0 || index >= tourSteps.length) {
        endTour();
        return;
    }
    const step = tourSteps[index];
    if (step.onBefore) {
        step.onBefore();
    }
    setTimeout(() => {
        tourTitle.textContent = step.title;
        tourContent.innerHTML = step.content;
        tourStepCounter.textContent = `${index + 1} / ${tourSteps.length}`;
        tourPopover.classList.remove('visible');
        tourPrevBtn.style.visibility = (index === 0) ? 'hidden' : 'visible';
        if (index === tourSteps.length - 1) {
            tourNextBtn.innerHTML = '完成 <i class="fas fa-check"></i>';
        } else {
            tourNextBtn.innerHTML = '下一步 <i class="fas fa-arrow-right"></i>';
        }
        const targetElement = step.element ? document.querySelector(step.element) : null;
        if (targetElement) {
            const rect = targetElement.getBoundingClientRect();
            tourHighlightBox.style.width = `${rect.width + 10}px`;
            tourHighlightBox.style.height = `${rect.height + 10}px`;
            tourHighlightBox.style.top = `${rect.top - 5}px`;
            tourHighlightBox.style.left = `${rect.left - 5}px`;
            tourHighlightBox.style.opacity = '1';
            positionPopover(rect, step.position);
        } else {
            tourHighlightBox.style.opacity = '0';
            tourHighlightBox.style.width = '0px';
            tourHighlightBox.style.height = '0px';
            tourPopover.style.top = '50%';
            tourPopover.style.left = '50%';
            tourPopover.style.transform = 'translate(-50%, -50%)';
        }
        setTimeout(() => tourPopover.classList.add('visible'), 50);
    }, (step.onBefore ? 400 : 0));
}

function positionPopover(rect, position) {
    const popoverRect = tourPopover.getBoundingClientRect();
    const spacing = 15;
    let top, left;
    switch (position) {
        case 'top':
            top = rect.top - popoverRect.height - spacing;
            left = rect.left + (rect.width / 2) - (popoverRect.width / 2);
            break;
        case 'bottom':
            top = rect.bottom + spacing;
            left = rect.left + (rect.width / 2) - (popoverRect.width / 2);
            break;
        case 'left':
            top = rect.top + (rect.height / 2) - (popoverRect.height / 2);
            left = rect.left - popoverRect.width - spacing;
            break;
        case 'right':
            top = rect.top + (rect.height / 2) - (popoverRect.height / 2);
            left = rect.right + spacing;
            break;
        default:
            top = '50%';
            left = '50%';
            tourPopover.style.transform = 'translate(-50%, -50%)';
            tourPopover.style.top = top;
            tourPopover.style.left = left;
            return;
    }
    if (top < 10) top = 10;
    if (left < 10) left = 10;
    if (left + popoverRect.width > window.innerWidth - 10) {
        left = window.innerWidth - popoverRect.width - 10;
    }
    if (top + popoverRect.height > window.innerHeight - 10) {
        top = window.innerHeight - popoverRect.height - 10;
    }
    tourPopover.style.top = `${top}px`;
    tourPopover.style.left = `${left}px`;
    tourPopover.style.transform = 'none';
}

function nextTourStep() {
    currentTourStep++;
    showTourStep(currentTourStep);
}

async function createNewSession(switchToIt = true) {
    const newId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    const newSession = {
        id: newId,
        name: `会话 ${new Date().toLocaleDateString()}`,
        createdAt: Date.now()
    };

    sessionList.push(newSession);
    await localforage.setItem(`${APP_PREFIX}sessionList`, sessionList);

    if (switchToIt) {
        window.location.hash = newId;
        window.location.reload();
    }
    
    return newId;
}

window.selectAnnType = function(type) {
    currentAnniversaryType = type;
    currentAnnType = type; 
    document.querySelectorAll('.anniversary-type-btn').forEach(btn => {
        if(btn.dataset.type === type) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    const hint = document.getElementById('ann-type-desc');
    if(hint) {
        hint.textContent = type === 'anniversary' 
            ? '计算从过去某一天到现在已经过了多少天 (例如: 恋爱纪念日)' 
            : '计算从现在到未来某一天还剩下多少天 (例如: 对方生日)';
    }
};

window.deleteAnniversary = function(id, event) {
    if(event) event.stopPropagation();
    
    if(confirm('确定要删除这个纪念日吗？')) {
        anniversaries = anniversaries.filter(a => a.id !== id);
        throttledSaveData();
        renderAnniversariesList();
        showNotification('纪念日已删除', 'success');
    }
};

let activeAnnId = null;

async function fillAnnHeaderCard(ann) {
    const headerCard = document.getElementById('ann-header-card');
    const toolbar = document.getElementById('ann-card-toolbar');
    if (!ann || !headerCard) return;

    activeAnnId = ann.id;
    headerCard.style.display = 'block';
    if (toolbar) toolbar.style.display = 'flex';

    const now = new Date();
    const isCountdown = ann.type === 'countdown';
    const targetDate = new Date(ann.date);
    let diffDays;
    if (isCountdown) {
        diffDays = Math.ceil((targetDate - now) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) diffDays = 0;
    } else {
        diffDays = Math.floor((now - targetDate) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) diffDays = 0;
    }

    const iconEl = document.getElementById('ann-header-icon');
    const labelEl = document.getElementById('ann-header-label');
    if (iconEl) iconEl.textContent = isCountdown ? '♡' : '♥';
    if (labelEl) labelEl.textContent = isCountdown ? 'COUNTDOWN' : 'ANNIVERSARY';
    document.getElementById('ann-header-title').textContent = ann.name;
    document.getElementById('ann-header-date').textContent = ann.date;
    const daysEl = document.getElementById('ann-header-days');
    daysEl.innerHTML = `${diffDays.toLocaleString('zh-CN')}<span class="ann-header-days-unit">${isCountdown ? '天后' : '天'}</span>`;

    const milestonesEl = document.getElementById('ann-header-milestones');
    if (milestonesEl) {
        milestonesEl.innerHTML = '';
        milestonesEl.style.display = 'none';
    }

    const titleEl = document.getElementById('ann-header-title');
    if (titleEl) titleEl.style.display = 'none';
    const labelEl2 = document.getElementById('ann-header-label');
    if (labelEl2) labelEl2.style.display = 'none';
    const dateEl = document.getElementById('ann-header-date');
    if (dateEl) dateEl.style.display = 'none';

    const dataMilestonesEl = document.getElementById('ann-data-milestones');
    if (dataMilestonesEl) {
        const chips = [];
        const pushChip = (t) => chips.push(`<span class="ann-milestone-chip">${t}</span>`);

        if (!isCountdown) {
            if (diffDays > 0 && diffDays < 100) {
                pushChip(`💫 距 100 天还有 ${100 - diffDays} 天`);
            }
            const centPassed = Math.floor(diffDays / 100) * 100;
            if (centPassed > 0) pushChip(`🎉 已到第 ${centPassed} 天`);

            const yearsPassed = Math.floor(diffDays / 365);
            if (yearsPassed > 0) pushChip(`🎊 已过 ${yearsPassed} 周年`);

            if (diffDays >= 100 && diffDays < 365) {
                const nextCent = 100 * (Math.floor(diffDays / 100) + 1);
                pushChip(`⏳ 距下一段百天还有 ${nextCent - diffDays} 天`);
            }
        } else {
            const daysLeft = diffDays;
            if (daysLeft > 0 && daysLeft < 100) {
                pushChip(`⏳ 距 100 天还有 ${100 - daysLeft} 天`);
            }
            if (daysLeft >= 100) {
                const nextCent = 100 * Math.ceil(daysLeft / 100);
                pushChip(`🎉 达到第 ${nextCent} 天段`);
            }
            const yearsLeft = Math.floor(daysLeft / 365);
            if (yearsLeft > 0) pushChip(`🎊 距 ${yearsLeft} 年段还有…`);
        }

        dataMilestonesEl.innerHTML = chips.join('') || `<span style="font-size:12px;opacity:0.65;color:var(--text-secondary);">—</span>`;
    }

    const bgEl = document.getElementById('ann-header-card-bg');
    if (bgEl) {
        const savedBg = await localforage.getItem(getStorageKey(`annHeaderBg_${ann.id}`));
        bgEl.style.backgroundImage = savedBg ? `url(${savedBg})` : '';
    }

    document.querySelectorAll('.ann-item-card').forEach(el => el.classList.remove('ann-item-active'));
    const activeEl = document.querySelector(`.ann-item-card[data-ann-id="${ann.id}"]`);
    if (activeEl) activeEl.classList.add('ann-item-active');
}

function renderAnniversariesList() {
    const listContainer = document.getElementById('ann-list-container');
    const headerCard = document.getElementById('ann-header-card');
    const toolbar = document.getElementById('ann-card-toolbar');
    
    if (!listContainer) return;
    listContainer.innerHTML = '';

    anniversaries.sort((a, b) => new Date(a.date) - new Date(b.date));

    if (anniversaries.length === 0) {
        if (headerCard) headerCard.style.display = 'none';
        if (toolbar) toolbar.style.display = 'none';
        const dataTabs = document.getElementById('ann-data-tabs');
        const dataPanel = document.getElementById('ann-data-panel');
        if (dataTabs) dataTabs.style.display = 'none';
        if (dataPanel) dataPanel.style.display = 'none';
        listContainer.innerHTML = `
            <div class="ann-empty">
                <div class="ann-empty-icon">💝</div>
                <p>还没有纪念日<br>去添加一个属于你们的日子吧~</p>
            </div>`;
        return;
    }

    const now = new Date();
    const defaultAnn = anniversaries.find(a => a.type === 'anniversary') || anniversaries[0];
    fillAnnHeaderCard(defaultAnn);
    const dataTabs = document.getElementById('ann-data-tabs');
    const dataPanel = document.getElementById('ann-data-panel');
    if (dataTabs) dataTabs.style.display = 'flex';
    if (dataPanel) dataPanel.style.display = 'none';

    anniversaries.forEach(ann => {
        const targetDate = new Date(ann.date);
        let diffDays = 0;
        let typeClass = '';
        let typeLabel = '';
        let dayLabel = '';

        if (ann.type === 'countdown') {
            typeClass = 'type-future';
            typeLabel = '倒数';
            dayLabel = '天后';
            diffDays = Math.ceil((targetDate - now) / (1000 * 60 * 60 * 24));
            if(diffDays < 0) diffDays = 0;
        } else {
            typeClass = 'type-past';
            typeLabel = '已过';
            dayLabel = '天';
            diffDays = Math.floor((now - targetDate) / (1000 * 60 * 60 * 24));
        }

        const formattedDays = diffDays.toLocaleString('zh-CN');

        const html = `
            <div class="ann-item-card ${typeClass}" data-ann-id="${ann.id}" onclick="selectAnnCard(${ann.id})" style="cursor:pointer;" title="起始日：${ann.date}">
                <div class="ann-item-left">
                    <div class="ann-item-name">
                        ${ann.name}
                        <span class="ann-tag">${typeLabel}</span>
                    </div>
                </div>
                <div style="display:flex; align-items:center;">
                    <div class="ann-item-right">
                        <div class="ann-item-days">${formattedDays}</div>
                        <div class="ann-item-days-unit">${dayLabel}</div>
                    </div>
                    <div class="ann-delete-btn" onclick="event.stopPropagation(); deleteAnniversaryItem(${ann.id})">
                        <i class="fas fa-times"></i>
                    </div>
                </div>
            </div>
        `;
        listContainer.insertAdjacentHTML('beforeend', html);
    });
}

window.selectAnnCard = function(id) {
    const ann = anniversaries.find(a => a.id === id);
    if (ann) fillAnnHeaderCard(ann);
};

window.clearAnnCardBg = async function() {
    if (!activeAnnId) return;
    await localforage.removeItem(getStorageKey(`annHeaderBg_${activeAnnId}`));
    const bgEl = document.getElementById('ann-header-card-bg');
    if (bgEl) bgEl.style.backgroundImage = '';
    showNotification('封面图已清除', 'success');
};

window.switchAnnDataTab = function(tab) {
    const panel = document.getElementById('ann-data-panel');
    const cardBtn = document.getElementById('ann-tab-card');
    const dataBtn = document.getElementById('ann-tab-data');
    if (!panel || !cardBtn || !dataBtn) return;
    const showData = tab === 'data';
    panel.style.display = showData ? 'block' : 'none';
    // 保持按钮配色不变，用透明度表达当前页
    cardBtn.style.opacity = showData ? '0.75' : '1';
    dataBtn.style.opacity = showData ? '1' : '0.75';
};


function initAnniversaryModule() {
    const entryBtn = document.getElementById('anniversary-function');
    
    if (entryBtn) {
        const newBtn = entryBtn.cloneNode(true);
        entryBtn.parentNode.replaceChild(newBtn, entryBtn);
        
        newBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('重要日按钮被点击');
            
            const advancedModal = document.getElementById('advanced-modal');
            const annModal = document.getElementById('anniversary-modal');
            
            if (advancedModal) hideModal(advancedModal);
            renderAnniversariesList();
                if (typeof window.switchAnnDataTab === 'function') window.switchAnnDataTab('card');
            if (annModal) showModal(annModal);
        });
    }

    const closeBtn = document.getElementById('close-anniversary-modal');
    if (closeBtn) {
        const newClose = closeBtn.cloneNode(true);
        closeBtn.parentNode.replaceChild(newClose, closeBtn);
        newClose.addEventListener('click', () => hideModal(document.getElementById('anniversary-modal')));
    }

    const openAddBtn = document.getElementById('open-ann-add-btn');
    const editorSlide = document.getElementById('ann-editor-slide');
    if (openAddBtn) {
        openAddBtn.onclick = () => {
            document.getElementById('ann-input-name').value = '';
            document.getElementById('ann-input-date').value = '';
            window.selectAnnType('anniversary');
            if (editorSlide) editorSlide.classList.add('active');
        };
    }

    const closeEditorBtn = document.getElementById('close-ann-editor');
    if (closeEditorBtn) {
        closeEditorBtn.onclick = () => {
            if (editorSlide) editorSlide.classList.remove('active');
        };
    }

    const saveBtn = document.getElementById('save-ann-btn');
    if (saveBtn) {
        const newSave = saveBtn.cloneNode(true);
        saveBtn.parentNode.replaceChild(newSave, saveBtn);
        
        newSave.addEventListener('click', () => {
            addAnniversary(); 
            if (editorSlide) editorSlide.classList.remove('active');
        });
    }

    const annBgInput = document.getElementById('ann-header-bg-input');
    if (annBgInput) {
        annBgInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            if (!activeAnnId) { showNotification('请先选择一个纪念日', 'warning'); return; }
            const reader = new FileReader();
            reader.onload = async (ev) => {
                const dataUrl = ev.target.result;
                const bgEl = document.getElementById('ann-header-card-bg');
                if (bgEl) bgEl.style.backgroundImage = `url(${dataUrl})`;
                await localforage.setItem(getStorageKey(`annHeaderBg_${activeAnnId}`), dataUrl);
                showNotification('封面图已更新 ', 'success');
            };
            reader.readAsDataURL(file);
            e.target.value = '';
        });
    }
}
function prevTourStep() {
    currentTourStep--;
    showTourStep(currentTourStep);
}

function setupTutorialListeners() {
    tourNextBtn.addEventListener('click', nextTourStep);
    tourPrevBtn.addEventListener('click', prevTourStep);
    tourSkipBtn.addEventListener('click', endTour);

    const replayBtn = document.getElementById('replay-tutorial-btn');
    if(replayBtn) {
        replayBtn.addEventListener('click', () => {
            hideModal(DOMElements.dataModal.modal);
            setTimeout(() => {
                if (confirm('确定要重新开始新手引导教程吗？')) {
                    startTour();
                }
            }, 300);
        });
    }
}


