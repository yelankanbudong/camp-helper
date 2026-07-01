/**
 * 王者营地 - Roche Plugin
 * camp-helper v1.1.0
 * author: yelankanbudong
 *
 * 个人战绩与好友战绩看板，支持手动编辑和 AI 虚构对局。
 * v1.1.0: 对局持久化、Char独立AI战绩、英雄分配优化、顶栏合并、心声口语化
 */
;(function () {
  "use strict"

  /* ==============================
   * 1. 样式定义
   * ============================== */

  const PLUGIN_CSS = `
/* ── 根容器 ── */
.roche-plugin-camp-helper {
  position: relative;
  width: 100%;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  background: #0B0E14;
  color: #E8E6E3;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  box-sizing: border-box;
}
.roche-plugin-camp-helper *, .roche-plugin-camp-helper *::before, .roche-plugin-camp-helper *::after {
  box-sizing: border-box;
}

/* ── 滚动条 ── */
.roche-plugin-camp-helper::-webkit-scrollbar { width: 4px; }
.roche-plugin-camp-helper::-webkit-scrollbar-track { background: transparent; }
.roche-plugin-camp-helper::-webkit-scrollbar-thumb { background: rgba(212,168,75,0.3); border-radius: 2px; }

/* ── 顶栏 ── */
.ch-topbar {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: rgba(11,14,20,0.92);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(212,168,75,0.6);
}
.ch-topbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
}
.ch-topbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}
.ch-back-btn, .ch-settings-btn, .ch-friends-btn {
  background: none;
  border: none;
  color: #D4A84B;
  cursor: pointer;
  font-size: 14px;
  padding: 6px 10px;
  border-radius: 8px;
  transition: background 0.2s;
  display: flex;
  align-items: center;
  gap: 4px;
}
.ch-back-btn:hover, .ch-settings-btn:hover, .ch-friends-btn:hover {
  background: rgba(212,168,75,0.12);
}
.ch-topbar-title {
  font-size: 16px;
  font-weight: 700;
  color: #D4A84B;
}

/* ── 面具切换栏 ── */
.ch-persona-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  overflow-x: auto;
  border-bottom: 1px solid rgba(212,168,75,0.15);
}
.ch-persona-bar::-webkit-scrollbar { height: 0; }
.ch-persona-item {
  flex-shrink: 0;
  cursor: pointer;
  text-align: center;
  transition: transform 0.2s, opacity 0.2s;
  opacity: 0.55;
}
.ch-persona-item.active {
  opacity: 1;
  transform: scale(1.1);
}
.ch-persona-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid transparent;
  transition: border-color 0.2s;
}
.ch-persona-item.active .ch-persona-avatar {
  border-color: #D4A84B;
  box-shadow: 0 0 8px rgba(212,168,75,0.5);
}
.ch-persona-item-name {
  font-size: 11px;
  margin-top: 4px;
  color: #aaa;
  max-width: 52px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ch-persona-item.active .ch-persona-item-name {
  color: #D4A84B;
}

/* ── 主内容区 ── */
.ch-main {
  padding: 16px;
  animation: chFadeIn 0.3s ease;
}
@keyframes chFadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ── 资料卡 ── */
.ch-profile-card {
  background: rgba(255,255,255,0.04);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 20px;
  border: 1px solid rgba(212,168,75,0.18);
  padding: 24px;
  position: relative;
  transition: box-shadow 0.3s;
}
.ch-profile-card:hover {
  box-shadow: 0 4px 24px rgba(212,168,75,0.12);
}
.ch-profile-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}
.ch-profile-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #D4A84B;
  box-shadow: 0 0 12px rgba(212,168,75,0.3);
}
.ch-profile-info { flex: 1; }
.ch-profile-name {
  font-size: 20px;
  font-weight: 700;
  color: #fff;
}
.ch-profile-bio {
  font-size: 12px;
  color: #888;
  margin-top: 4px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.ch-edit-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  background: rgba(212,168,75,0.12);
  border: 1px solid rgba(212,168,75,0.3);
  color: #D4A84B;
  cursor: pointer;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  transition: background 0.2s, transform 0.2s;
}
.ch-edit-btn:hover {
  background: rgba(212,168,75,0.25);
  transform: scale(1.08);
}

/* ── 战绩网格 ── */
.ch-stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}
.ch-stat-item {
  background: rgba(255,255,255,0.03);
  border-radius: 12px;
  padding: 14px;
  border: 1px solid rgba(255,255,255,0.06);
}
.ch-stat-label {
  font-size: 12px;
  color: #888;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.ch-stat-label::before {
  content: "•";
  color: #D4A84B;
  font-size: 16px;
}
.ch-stat-value {
  font-size: 22px;
  font-weight: 700;
  color: #fff;
}
.ch-stat-value.gold { color: #D4A84B; }

/* ── 常用英雄 ── */
.ch-heroes-section {
  margin-bottom: 16px;
}
.ch-section-title {
  font-size: 14px;
  font-weight: 600;
  color: #D4A84B;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.ch-section-title::before {
  content: "•";
  font-size: 16px;
}
.ch-hero-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.ch-hero-tag {
  background: rgba(212,168,75,0.1);
  border: 1px solid rgba(212,168,75,0.25);
  border-radius: 20px;
  padding: 4px 14px;
  font-size: 13px;
  color: #D4A84B;
}

/* ── 编辑模式 ── */
.ch-edit-field {
  width: 100%;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(212,168,75,0.3);
  border-radius: 8px;
  color: #fff;
  padding: 8px 12px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}
.ch-edit-field:focus {
  border-color: #D4A84B;
}
.ch-edit-field::placeholder { color: #555; }
.ch-edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
}
.ch-btn {
  border: none;
  border-radius: 10px;
  padding: 8px 20px;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.2s, transform 0.15s;
}
.ch-btn:active { transform: scale(0.97); }
.ch-btn-primary {
  background: #D4A84B;
  color: #0B0E14;
  font-weight: 600;
}
.ch-btn-primary:hover { background: #e0b85e; }
.ch-btn-secondary {
  background: rgba(255,255,255,0.08);
  color: #ccc;
}
.ch-btn-secondary:hover { background: rgba(255,255,255,0.14); }
.ch-btn-danger {
  background: rgba(220,53,69,0.15);
  color: #ff6b6b;
  border: 1px solid rgba(220,53,69,0.3);
}
.ch-btn-danger:hover { background: rgba(220,53,69,0.25); }

/* ── 对局战绩 ── */
.ch-match-section {
  margin-top: 4px;
}
.ch-match-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(212,168,75,0.15);
  border-radius: 14px;
  cursor: pointer;
  transition: background 0.2s;
  margin-bottom: 8px;
}
.ch-match-toggle:hover {
  background: rgba(255,255,255,0.06);
}
.ch-match-toggle-title {
  font-size: 14px;
  font-weight: 600;
  color: #D4A84B;
  display: flex;
  align-items: center;
  gap: 6px;
}
.ch-match-toggle-arrow {
  color: #D4A84B;
  font-size: 12px;
  transition: transform 0.3s;
}
.ch-match-toggle-arrow.expanded {
  transform: rotate(180deg);
}
.ch-match-list {
  overflow: hidden;
  max-height: 0;
  opacity: 0;
  transition: max-height 0.4s ease, opacity 0.3s ease;
}
.ch-match-list.expanded {
  max-height: 3000px;
  opacity: 1;
}
.ch-match-item {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 14px;
  padding: 14px 16px;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 14px;
  animation: chFadeIn 0.3s ease;
}
.ch-match-result {
  font-size: 13px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 6px;
  min-width: 36px;
  text-align: center;
}
.ch-match-result.win {
  background: rgba(40,167,69,0.15);
  color: #51cf66;
  border: 1px solid rgba(40,167,69,0.3);
}
.ch-match-result.lose {
  background: rgba(220,53,69,0.15);
  color: #ff6b6b;
  border: 1px solid rgba(220,53,69,0.3);
}
.ch-match-info { flex: 1; }
.ch-match-hero {
  font-size: 15px;
  font-weight: 600;
  color: #fff;
}
.ch-match-kda {
  font-size: 13px;
  color: #aaa;
  margin-top: 2px;
}
.ch-match-meta {
  text-align: right;
}
.ch-match-time {
  font-size: 11px;
  color: #666;
}
.ch-match-voice {
  font-size: 12px;
  color: #888;
  margin-top: 4px;
  font-style: italic;
}
.ch-match-loading {
  text-align: center;
  padding: 24px;
  color: #888;
}
.ch-match-loading-spinner {
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 2px solid rgba(212,168,75,0.3);
  border-top-color: #D4A84B;
  border-radius: 50%;
  animation: chSpin 0.8s linear infinite;
}
@keyframes chSpin {
  to { transform: rotate(360deg); }
}

/* ── 好友侧边栏 ── */
.ch-sidebar-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.55);
  z-index: 200;
  opacity: 0;
  transition: opacity 0.3s;
  pointer-events: none;
}
.ch-sidebar-overlay.open {
  opacity: 1;
  pointer-events: auto;
}
.ch-sidebar {
  position: fixed;
  top: 0;
  right: 0;
  width: min(340px, 85%);
  height: 100%;
  background: rgba(15,18,26,0.96);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border-left: 1px solid rgba(212,168,75,0.2);
  z-index: 201;
  transform: translateX(100%);
  transition: transform 0.3s ease;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.ch-sidebar.open {
  transform: translateX(0);
}
.ch-sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid rgba(212,168,75,0.15);
}
.ch-sidebar-title {
  font-size: 16px;
  font-weight: 700;
  color: #D4A84B;
}
.ch-sidebar-close {
  background: none;
  border: none;
  color: #888;
  cursor: pointer;
  font-size: 18px;
  padding: 4px 8px;
  border-radius: 6px;
}
.ch-sidebar-close:hover { color: #fff; }
.ch-sidebar-body {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}
.ch-sidebar-body::-webkit-scrollbar { width: 3px; }
.ch-sidebar-body::-webkit-scrollbar-thumb { background: rgba(212,168,75,0.2); border-radius: 2px; }
.ch-sidebar-footer {
  padding: 12px 16px;
  border-top: 1px solid rgba(255,255,255,0.06);
}
.ch-friend-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 12px;
  cursor: pointer;
  transition: background 0.2s;
  margin-bottom: 4px;
}
.ch-friend-item:hover {
  background: rgba(212,168,75,0.08);
}
.ch-friend-item.active {
  background: rgba(212,168,75,0.12);
  border-left: 3px solid #D4A84B;
}
.ch-friend-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid rgba(255,255,255,0.1);
}
.ch-friend-name {
  font-size: 14px;
  color: #ddd;
  flex: 1;
}
.ch-friend-remove {
  background: none;
  border: none;
  color: #666;
  cursor: pointer;
  font-size: 14px;
  padding: 4px;
  border-radius: 4px;
  opacity: 0;
  transition: opacity 0.2s, color 0.2s;
}
.ch-friend-item:hover .ch-friend-remove { opacity: 1; }
.ch-friend-remove:hover { color: #ff6b6b; }

/* ── 模态框 ── */
.ch-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.6);
  z-index: 300;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.25s;
  pointer-events: none;
}
.ch-modal-overlay.open {
  opacity: 1;
  pointer-events: auto;
}
.ch-modal {
  background: rgba(20,24,34,0.98);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(212,168,75,0.2);
  border-radius: 20px;
  width: min(420px, 90%);
  max-height: 75vh;
  display: flex;
  flex-direction: column;
  transform: scale(0.95);
  transition: transform 0.25s;
}
.ch-modal-overlay.open .ch-modal {
  transform: scale(1);
}
.ch-modal-header {
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  font-size: 16px;
  font-weight: 700;
  color: #D4A84B;
}
.ch-modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 12px 20px;
}
.ch-modal-body::-webkit-scrollbar { width: 3px; }
.ch-modal-body::-webkit-scrollbar-thumb { background: rgba(212,168,75,0.2); border-radius: 2px; }
.ch-modal-footer {
  padding: 12px 20px;
  border-top: 1px solid rgba(255,255,255,0.06);
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
.ch-char-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 8px;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.2s;
}
.ch-char-item:hover { background: rgba(255,255,255,0.04); }
.ch-char-checkbox {
  accent-color: #D4A84B;
  width: 16px;
  height: 16px;
  cursor: pointer;
}
.ch-char-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid rgba(255,255,255,0.1);
}
.ch-char-name {
  font-size: 14px;
  color: #ddd;
}

/* ── 设置页 ── */
.ch-settings {
  animation: chFadeIn 0.3s ease;
}
.ch-settings-section {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 14px;
  padding: 16px;
  margin-bottom: 12px;
}
.ch-settings-section-title {
  font-size: 14px;
  font-weight: 600;
  color: #D4A84B;
  margin-bottom: 12px;
}
.ch-settings-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
}
.ch-settings-label {
  font-size: 13px;
  color: #bbb;
}
.ch-settings-hint {
  font-size: 11px;
  color: #666;
  margin-top: 4px;
}
.ch-toggle {
  position: relative;
  width: 44px;
  height: 24px;
  cursor: pointer;
}
.ch-toggle input {
  opacity: 0;
  width: 0;
  height: 0;
  position: absolute;
}
.ch-toggle-slider {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(255,255,255,0.12);
  border-radius: 12px;
  transition: background 0.3s;
}
.ch-toggle-slider::before {
  content: "";
  position: absolute;
  width: 18px;
  height: 18px;
  left: 3px;
  bottom: 3px;
  background: #aaa;
  border-radius: 50%;
  transition: transform 0.3s, background 0.3s;
}
.ch-toggle input:checked + .ch-toggle-slider {
  background: rgba(212,168,75,0.35);
}
.ch-toggle input:checked + .ch-toggle-slider::before {
  transform: translateX(20px);
  background: #D4A84B;
}
.ch-select {
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 8px;
  color: #ddd;
  padding: 6px 10px;
  font-size: 13px;
  outline: none;
  cursor: pointer;
}
.ch-select option { background: #1a1e2a; }

/* ── 好友详情页 ── */
.ch-friend-detail {
  animation: chFadeIn 0.3s ease;
}
.ch-persona-bind-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  padding: 10px 14px;
  background: rgba(255,255,255,0.03);
  border-radius: 10px;
}
.ch-persona-bind-label {
  font-size: 12px;
  color: #888;
  flex-shrink: 0;
}
.ch-empty-hint {
  text-align: center;
  padding: 32px 16px;
  color: #555;
  font-size: 13px;
  white-space: pre-line;
}

/* ── 默认头像 ── */
.ch-default-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(212,168,75,0.15);
  color: #D4A84B;
  font-weight: 700;
  font-size: 18px;
  border-radius: 50%;
  flex-shrink: 0;
}
.ch-default-avatar.small { width: 36px; height: 36px; font-size: 14px; }
.ch-default-avatar.medium { width: 40px; height: 40px; font-size: 16px; }
.ch-default-avatar.large { width: 44px; height: 44px; font-size: 18px; }
.ch-default-avatar.xlarge { width: 64px; height: 64px; font-size: 24px; }

/* ── Char 战绩生成中 ── */
.ch-char-stats-loading {
  text-align: center;
  padding: 20px;
  color: #888;
  font-size: 13px;
}
.ch-char-stats-refresh {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
  margin-bottom: 4px;
}
`

  /* ==============================
   * 2. 辅助函数
   * ============================== */

  function el(tag, attrs, children) {
    const node = document.createElement(tag)
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (k === "className") node.className = v
        else if (k === "innerHTML") node.innerHTML = v
        else if (k.startsWith("on") && k.length > 2 && typeof v === "function") {
          node.addEventListener(k[2].toLowerCase() + k.slice(3), v)
        }
        else if (v !== undefined && v !== null) node.setAttribute(k, v)
      }
    }
    if (children) {
      if (typeof children === "string") node.textContent = children
      else if (Array.isArray(children)) children.forEach(c => { if (c) node.appendChild(c) })
      else if (children.nodeType) node.appendChild(children)
    }
    return node
  }

  function avatarEl(src, name, sizeClass) {
    if (src) {
      const classMap = { xlarge: "ch-profile-avatar", large: "ch-persona-avatar", medium: "ch-friend-avatar", small: "ch-char-avatar" }
      const img = el("img", { className: classMap[sizeClass] || "ch-friend-avatar" })
      img.src = src
      img.alt = name || ""
      img.onerror = function () { this.replaceWith(makeDefaultAvatar(name, sizeClass)) }
      return img
    }
    return makeDefaultAvatar(name, sizeClass)
  }

  function makeDefaultAvatar(name, sizeClass) {
    const letter = (name || "?").charAt(0).toUpperCase()
    return el("span", { className: `ch-default-avatar ${sizeClass || "medium"}` }, letter)
  }

  /* ==============================
   * 3. 插件注册
   * ============================== */

  window.RochePlugin.register({
    id: "camp-helper",
    name: "王者营地",
    version: "1.1.0",
    apps: [
      {
        id: "camp-helper-home",
        name: "王者营地",
        icon: "emoji_events",
        iconImage: "",

        _state: null,
        _cleanups: [],

        async mount(container, roche) {
          const app = this
          app._cleanups = []

          /* ── 注入样式 ── */
          const styleTag = document.createElement("style")
          styleTag.textContent = PLUGIN_CSS
          styleTag.setAttribute("data-camp-helper", "1")
          document.head.appendChild(styleTag)
          app._cleanups.push(() => styleTag.remove())

          /* ── 初始化状态 ── */
          const state = {
            personas: [],
            activePersonaId: null,
            characters: [],
            friends: [],
            view: "home",
            friendDetailCharId: null,
            sidebarOpen: false,
            addFriendModalOpen: false,
            editing: false,
            matchExpanded: false,
            matchLoading: false,
            friendMatchExpanded: false,
            friendMatchLoading: false,
            writeToMainMemory: false,
            shortTermLimit: 30,
            // user 侧手动编辑战绩: { [personaId]: { rank, winRate, peakScore, heroPower, heroes } }
            statsMap: {},
            // user 侧对局缓存: { [personaId]: [ matchItem, ... ] }
            userMatchCache: {},
            // char 侧 AI 战绩: { [charId]: { rank, winRate, peakScore, heroPower, heroes } }
            charStatsMap: {},
            // char 侧对局缓存: { [charId]: [ matchItem, ... ] }
            charMatchCache: {},
            // char 战绩生成中标记
            charStatsLoading: false,
            // 好友面具绑定: { [charId]: personaId }
            friendPersonaBindings: {},
          }
          app._state = state

          /* ── 加载已保存数据 ── */
          const savedFriends = await roche.storage.get("friends")
          if (Array.isArray(savedFriends)) state.friends = savedFriends

          const savedStats = await roche.storage.get("statsMap")
          if (savedStats && typeof savedStats === "object") state.statsMap = savedStats

          const savedUserMatchCache = await roche.storage.get("userMatchCache")
          if (savedUserMatchCache && typeof savedUserMatchCache === "object") state.userMatchCache = savedUserMatchCache

          const savedCharStatsMap = await roche.storage.get("charStatsMap")
          if (savedCharStatsMap && typeof savedCharStatsMap === "object") state.charStatsMap = savedCharStatsMap

          const savedCharMatchCache = await roche.storage.get("charMatchCache")
          if (savedCharMatchCache && typeof savedCharMatchCache === "object") state.charMatchCache = savedCharMatchCache

          const savedSettings = await roche.storage.get("settings")
          if (savedSettings) {
            state.writeToMainMemory = !!savedSettings.writeToMainMemory
            state.shortTermLimit = savedSettings.shortTermLimit || 30
          }

          const savedBindings = await roche.storage.get("friendPersonaBindings")
          if (savedBindings && typeof savedBindings === "object") state.friendPersonaBindings = savedBindings

          /* ── 加载面具和角色 ── */
          try { state.personas = (await roche.persona.getUserPersonas()) || [] } catch (e) { state.personas = [] }

          try {
            const activePer = await roche.persona.getActiveUserPersona()
            state.activePersonaId = activePer?.id || (state.personas[0]?.id ?? null)
          } catch (e) {
            state.activePersonaId = state.personas[0]?.id ?? null
          }

          try { state.characters = (await roche.character.list()) || [] } catch (e) { state.characters = [] }

          /* ── 根容器 ── */
          const root = el("div", { className: "roche-plugin-camp-helper" })
          container.appendChild(root)

          /* ════════════════════════════════
           * 渲染函数
           * ════════════════════════════════ */

          function render() {
            root.innerHTML = ""
            root.appendChild(renderTopbar())
            if (state.view === "home" || state.view === "settings") {
              root.appendChild(renderPersonaBar())
            }
            if (state.view === "home") root.appendChild(renderHome())
            else if (state.view === "settings") root.appendChild(renderSettings())
            else if (state.view === "friendDetail") root.appendChild(renderFriendDetail())
            root.appendChild(renderSidebar())
            root.appendChild(renderAddFriendModal())
          }

          /* ── 顶栏（修改点4：合并返回键） ── */
          function renderTopbar() {
            const bar = el("div", { className: "ch-topbar" })
            const left = el("div", { className: "ch-topbar-left" })

            // 根据当前视图决定左侧返回按钮行为
            if (state.view === "friendDetail") {
              // Char 详情页：返回主页
              left.appendChild(el("button", {
                className: "ch-back-btn",
                innerHTML: "← 返回主页",
                onClick() {
                  state.view = "home"
                  state.friendDetailCharId = null
                  state.friendMatchExpanded = false
                  state.charStatsLoading = false
                  render()
                }
              }))
            } else {
              // 主页/设置页：关闭 App
              left.appendChild(el("button", {
                className: "ch-back-btn",
                innerHTML: "← 返回",
                onClick() { roche.ui.closeApp() }
              }))
            }

            const title = el("span", { className: "ch-topbar-title" })
            if (state.view === "settings") title.textContent = "设置"
            else if (state.view === "friendDetail") {
              const c = state.characters.find(c => c.id === state.friendDetailCharId)
              title.textContent = c ? (c.handle || c.name) + " 的战绩" : "好友战绩"
            } else {
              title.textContent = "王者营地"
            }
            left.appendChild(title)
            bar.appendChild(left)

            const right = el("div", { className: "ch-topbar-right" })

            // 设置按钮（不在 friendDetail 右侧放多余按钮了）
            if (state.view !== "settings") {
              right.appendChild(el("button", {
                className: "ch-settings-btn",
                innerHTML: "⚙",
                onClick() { state.view = "settings"; render() }
              }))
            } else {
              right.appendChild(el("button", {
                className: "ch-settings-btn",
                innerHTML: "✕",
                onClick() { state.view = "home"; render() }
              }))
            }

            right.appendChild(el("button", {
              className: "ch-friends-btn",
              innerHTML: "👥 好友",
              onClick() { state.sidebarOpen = true; render() }
            }))

            bar.appendChild(right)
            return bar
          }

          /* ── 面具切换栏 ── */
          function renderPersonaBar() {
            const bar = el("div", { className: "ch-persona-bar" })
            if (state.personas.length === 0) {
              bar.appendChild(el("span", { className: "ch-empty-hint" }, "暂无面具数据"))
              return bar
            }
            for (const p of state.personas) {
              const active = p.id === state.activePersonaId
              const item = el("div", {
                className: `ch-persona-item ${active ? "active" : ""}`,
                onClick() {
                  state.activePersonaId = p.id
                  state.editing = false
                  state.matchExpanded = false
                  render()
                }
              })
              const av = avatarEl(p.avatar, p.handle || p.name, "large")
              if (!av.classList.contains("ch-persona-avatar")) av.classList.add("ch-persona-avatar")
              item.appendChild(av)
              item.appendChild(el("div", { className: "ch-persona-item-name" }, p.handle || p.name || "未命名"))
              bar.appendChild(item)
            }
            return bar
          }

          function getCurrentStats() {
            const pid = state.activePersonaId
            if (!pid) return { rank: "", winRate: "", peakScore: "", heroPower: "", heroes: "" }
            return state.statsMap[pid] || { rank: "", winRate: "", peakScore: "", heroPower: "", heroes: "" }
          }

          /* ── 首页 ── */
          function renderHome() {
            const main = el("div", { className: "ch-main" })
            const persona = state.personas.find(p => p.id === state.activePersonaId)
            if (!persona) {
              main.appendChild(el("div", { className: "ch-empty-hint" }, "请先在 Roche 中创建用户面具"))
              return main
            }

            const stats = getCurrentStats()
            const card = el("div", { className: "ch-profile-card" })

            const header = el("div", { className: "ch-profile-header" })
            const av = avatarEl(persona.avatar, persona.handle || persona.name, "xlarge")
            if (!av.classList.contains("ch-profile-avatar")) av.classList.add("ch-profile-avatar")
            header.appendChild(av)

            const info = el("div", { className: "ch-profile-info" })
            info.appendChild(el("div", { className: "ch-profile-name" }, persona.handle || persona.name || "未命名"))
            if (persona.bio) info.appendChild(el("div", { className: "ch-profile-bio" }, persona.bio))
            header.appendChild(info)
            card.appendChild(header)

            if (!state.editing) {
              card.appendChild(el("button", {
                className: "ch-edit-btn",
                innerHTML: "✏️",
                title: "编辑战绩",
                onClick() { state.editing = true; render() }
              }))
            }

            if (state.editing) {
              card.appendChild(renderEditForm(stats))
            } else {
              card.appendChild(renderStatsDisplay(stats))
            }

            main.appendChild(card)

            // 对局战绩 - user 侧（持久化）
            main.appendChild(renderMatchSection(false))

            return main
          }

          /* ── 战绩展示 ── */
          function renderStatsDisplay(stats) {
            const wrap = el("div")
            const grid = el("div", { className: "ch-stats-grid" })
            const items = [
              { label: "段位", value: stats.rank || "未设定", gold: true },
              { label: "胜率", value: stats.winRate ? stats.winRate + "%" : "—" },
              { label: "巅峰赛分数", value: stats.peakScore || "—", gold: true },
              { label: "英雄战力标", value: stats.heroPower || "—" }
            ]
            for (const it of items) {
              const si = el("div", { className: "ch-stat-item" })
              si.appendChild(el("div", { className: "ch-stat-label" }, it.label))
              si.appendChild(el("div", { className: `ch-stat-value ${it.gold ? "gold" : ""}` }, it.value))
              grid.appendChild(si)
            }
            wrap.appendChild(grid)

            const sec = el("div", { className: "ch-heroes-section" })
            sec.appendChild(el("div", { className: "ch-section-title" }, "常用英雄"))
            const tags = el("div", { className: "ch-hero-tags" })
            const heroList = stats.heroes ? stats.heroes.split(/[,，\s]+/).filter(Boolean) : []
            if (heroList.length === 0) {
              tags.appendChild(el("span", { className: "ch-hero-tag" }, "暂未设定"))
            } else {
              for (const h of heroList) tags.appendChild(el("span", { className: "ch-hero-tag" }, h))
            }
            sec.appendChild(tags)
            wrap.appendChild(sec)
            return wrap
          }

          /* ── 编辑表单 ── */
          function renderEditForm(stats) {
            const form = el("div")
            const fields = [
              { key: "rank", label: "段位", placeholder: "例如：王者 50 星" },
              { key: "winRate", label: "胜率（%）", placeholder: "例如：56.3" },
              { key: "peakScore", label: "巅峰赛分数", placeholder: "例如：1800" },
              { key: "heroPower", label: "英雄战力标", placeholder: "例如：市标 / 省标 / 国标" },
              { key: "heroes", label: "常用英雄（逗号或空格分隔）", placeholder: "例如：韩信, 李白, 露娜" }
            ]
            const inputs = {}

            for (const f of fields) {
              const row = el("div", { style: "margin-bottom: 12px;" })
              row.appendChild(el("div", { className: "ch-stat-label", style: "margin-bottom: 6px;" }, f.label))
              const inp = el("input", { className: "ch-edit-field", placeholder: f.placeholder })
              inp.value = stats[f.key] || ""
              inputs[f.key] = inp
              row.appendChild(inp)
              form.appendChild(row)
            }

            const actions = el("div", { className: "ch-edit-actions" })
            actions.appendChild(el("button", {
              className: "ch-btn ch-btn-secondary",
              onClick() { state.editing = false; render() }
            }, "取消"))
            actions.appendChild(el("button", {
              className: "ch-btn ch-btn-primary",
              async onClick() {
                const pid = state.activePersonaId
                if (!pid) return
                const newStats = {}
                for (const f of fields) newStats[f.key] = inputs[f.key].value.trim()
                state.statsMap[pid] = newStats
                await roche.storage.set("statsMap", state.statsMap)
                state.editing = false
                roche.ui.toast("战绩已保存")

                if (state.writeToMainMemory) {
                  const persona = state.personas.find(p => p.id === pid)
                  const pname = persona ? (persona.name || persona.handle || "用户") : "用户"
                  const ok = await roche.ui.confirm({
                    title: "写入主记忆",
                    message: `是否将 ${pname} 的战绩写入 Roche 主记忆？\n段位：${newStats.rank || "—"}\n胜率：${newStats.winRate || "—"}%\n巅峰分：${newStats.peakScore || "—"}\n\n注意：主记忆不会随插件卸载删除。`
                  })
                  if (ok) {
                    try {
                      const conversations = await roche.conversation.list()
                      const conv = conversations.find(c => c.myActivePersonaId === pid) || conversations[0]
                      if (conv) {
                        const parts = []
                        if (newStats.rank) parts.push("段位: " + newStats.rank)
                        if (newStats.winRate) parts.push("胜率: " + newStats.winRate + "%")
                        if (newStats.peakScore) parts.push("巅峰赛分数: " + newStats.peakScore)
                        if (newStats.heroPower) parts.push("英雄战力标: " + newStats.heroPower)
                        if (newStats.heroes) parts.push("常用英雄: " + newStats.heroes)
                        await roche.memory.write({
                          conversationId: conv.conversationId || conv.id,
                          summaryText: pname + " 的王者荣耀战绩：" + parts.join("；"),
                          who: [pname],
                          action: "更新了王者荣耀战绩数据",
                          when: new Date().toLocaleDateString("zh-CN"),
                          where: "王者营地插件",
                          source: "plugin"
                        })
                        roche.ui.toast("已写入主记忆")
                      }
                    } catch (e) {
                      roche.ui.toast("写入失败：" + (e.message || e))
                    }
                  }
                }
                render()
              }
            }, "保存"))
            form.appendChild(actions)
            return form
          }

          /* ══════════════════════════════════════
           * 对局战绩区域（修改点1：持久化 + 刷新）
           * ══════════════════════════════════════ */
          function renderMatchSection(isFriend) {
            const section = el("div", { className: "ch-match-section" })
            const expanded = isFriend ? state.friendMatchExpanded : state.matchExpanded
            const loading = isFriend ? state.friendMatchLoading : state.matchLoading

            // 读取缓存
            let cachedData = null
            if (isFriend) {
              cachedData = state.charMatchCache[state.friendDetailCharId] || null
            } else {
              cachedData = state.userMatchCache[state.activePersonaId] || null
            }

            section.appendChild(el("div", {
              className: "ch-match-toggle",
              async onClick() {
                if (isFriend) {
                  state.friendMatchExpanded = !state.friendMatchExpanded
                  // 首次展开且无缓存才自动生成
                  if (state.friendMatchExpanded && !state.charMatchCache[state.friendDetailCharId]) {
                    await generateAndCacheMatches(true)
                  }
                } else {
                  state.matchExpanded = !state.matchExpanded
                  if (state.matchExpanded && !state.userMatchCache[state.activePersonaId]) {
                    await generateAndCacheMatches(false)
                  }
                }
                render()
              }
            }, [
              el("span", { className: "ch-match-toggle-title", innerHTML: "🎮 对局战绩" }),
              el("span", { className: `ch-match-toggle-arrow ${expanded ? "expanded" : ""}` }, "▼")
            ]))

            const list = el("div", { className: `ch-match-list ${expanded ? "expanded" : ""}` })

            if (loading) {
              const ld = el("div", { className: "ch-match-loading" })
              ld.innerHTML = '<div class="ch-match-loading-spinner"></div><div style="margin-top:8px;">正在让 AI 生成对局记录…</div>'
              list.appendChild(ld)
            } else if (cachedData && cachedData.length > 0) {
              for (const m of cachedData) {
                const item = el("div", { className: "ch-match-item" })
                item.appendChild(el("div", {
                  className: `ch-match-result ${m.result === "win" ? "win" : "lose"}`
                }, m.result === "win" ? "胜" : "负"))

                const info = el("div", { className: "ch-match-info" })
                info.appendChild(el("div", { className: "ch-match-hero" }, m.hero || "未知英雄"))
                info.appendChild(el("div", { className: "ch-match-kda" }, m.kda || "0/0/0"))
                item.appendChild(info)

                const meta = el("div", { className: "ch-match-meta" })
                meta.appendChild(el("div", { className: "ch-match-time" }, m.time || ""))
                if (m.innerVoice) meta.appendChild(el("div", { className: "ch-match-voice" }, '"' + m.innerVoice + '"'))
                item.appendChild(meta)
                list.appendChild(item)
              }

              // 刷新按钮
              const refreshRow = el("div", { style: "text-align:center;padding:8px 0 4px;" })
              refreshRow.appendChild(el("button", {
                className: "ch-btn ch-btn-secondary",
                style: "font-size:12px;padding:6px 14px;",
                async onClick() {
                  await generateAndCacheMatches(isFriend)
                  render()
                }
              }, "🔄 刷新对局"))
              list.appendChild(refreshRow)
            } else if (expanded && !loading) {
              list.appendChild(el("div", { className: "ch-empty-hint" }, "暂无对局数据，展开后自动生成"))
            }

            section.appendChild(list)
            return section
          }

          /* ══════════════════════════════════════════
           * AI 生成 + 持久化缓存（统一函数）
           * ══════════════════════════════════════════ */
          async function generateAndCacheMatches(isFriend) {
            if (isFriend) state.friendMatchLoading = true
            else state.matchLoading = true
            render()

            try {
              let targetName = ""
              let personaText = ""
              let heroesStr = ""
              let contextParts = []

              if (isFriend) {
                const char = state.characters.find(c => c.id === state.friendDetailCharId)
                if (!char) throw new Error("角色不存在")
                targetName = char.handle || char.name || "角色"
                personaText = char.persona || char.bio || ""

                // char 侧战绩（AI生成的）
                const charStats = state.charStatsMap[char.id]
                if (charStats) {
                  heroesStr = charStats.heroes || ""
                  contextParts.push(`该角色战绩：段位 ${charStats.rank || "未知"}，胜率 ${charStats.winRate || "未知"}%，常用英雄 ${charStats.heroes || "未知"}`)
                }

                // 绑定面具辅助参考
                const boundPid = state.friendPersonaBindings[char.id]
                if (boundPid) {
                  const bp = state.personas.find(p => p.id === boundPid)
                  const bs = state.statsMap[boundPid]
                  if (bp && bs) {
                    contextParts.push(`（参考）绑定面具（${bp.handle || bp.name}）战绩：段位 ${bs.rank || "未知"}，胜率 ${bs.winRate || "未知"}%`)
                  }
                }

                // 角色记忆
                const convId = char.conversationId
                if (convId) {
                  try {
                    const st = await roche.memory.getShortTerm({ conversationId: convId, limit: state.shortTermLimit })
                    if (st && st.length > 0) {
                      contextParts.push("近期聊天：\n" + st.slice(-state.shortTermLimit).map(m => `${m.senderHandle || m.senderName || "?"}: ${m.text || ""}`).join("\n"))
                    }
                  } catch (e) {}
                  try {
                    const lt = await roche.memory.getLongTerm({ conversationId: convId, limit: 100 })
                    if (lt) {
                      if (lt.core?.summary) contextParts.push("核心记忆：" + lt.core.summary)
                      if (lt.facts?.length) {
                        const ft = lt.facts.map(f => f.summaryText || f.action || "").filter(Boolean).join("；")
                        if (ft) contextParts.push("事实记忆：" + ft)
                      }
                    }
                  } catch (e) {}
                }
              } else {
                const persona = state.personas.find(p => p.id === state.activePersonaId)
                if (!persona) throw new Error("面具不存在")
                targetName = persona.handle || persona.name || "用户"
                personaText = persona.persona || persona.bio || ""

                const stats = getCurrentStats()
                heroesStr = stats.heroes || ""
                if (stats.rank || stats.heroes) {
                  contextParts.push(`当前战绩：段位 ${stats.rank || "未知"}，胜率 ${stats.winRate || "未知"}%，巅峰分 ${stats.peakScore || "未知"}，常用英雄 ${stats.heroes || "未知"}`)
                }

                try {
                  const conversations = await roche.conversation.list()
                  const conv = conversations.find(c => c.myActivePersonaId === state.activePersonaId)
                  if (conv) {
                    const cid = conv.conversationId || conv.id
                    try {
                      const st = await roche.memory.getShortTerm({ conversationId: cid, limit: state.shortTermLimit })
                      if (st && st.length > 0) {
                        contextParts.push("近期聊天：\n" + st.slice(-state.shortTermLimit).map(m => `${m.senderHandle || m.senderName || "?"}: ${m.text || ""}`).join("\n"))
                      }
                    } catch (e) {}
                    try {
                      const lt = await roche.memory.getLongTerm({ conversationId: cid, limit: 100 })
                      if (lt) {
                        if (lt.core?.summary) contextParts.push("核心记忆：" + lt.core.summary)
                        if (lt.facts?.length) {
                          const ft = lt.facts.map(f => f.summaryText || f.action || "").filter(Boolean).join("；")
                          if (ft) contextParts.push("事实记忆：" + ft)
                        }
                      }
                    } catch (e) {}
                  }
                } catch (e) {}
              }

              // 修改点3：英雄分配 prompt
              const heroList = heroesStr ? heroesStr.split(/[,，\s]+/).filter(Boolean) : []
              let heroInstruction = ""
              if (heroList.length > 0) {
                heroInstruction = `
英雄分配规则：
- 该角色的常用英雄为：${heroList.join("、")}
- 5 场对局中，约 2-3 场必须使用上述常用英雄中的某一个
- 剩余 2-3 场从王者荣耀全英雄池中随机选取其他英雄（不要重复常用英雄）
- 每场使用不同英雄，不要重复`
              } else {
                heroInstruction = `
英雄分配规则：
- 该角色没有设定常用英雄
- 5 场对局全部从王者荣耀全英雄池中随机选取不同英雄
- 每场使用不同英雄，不要重复`
              }

              // 修改点5：心声口语化 prompt
              const systemPrompt = `你是一位王者荣耀战报生成器。请根据以下角色的人设和记忆内容，生成 5 场最近的对局记录。

角色名：${targetName}
${personaText ? "角色人设：" + personaText : ""}
${contextParts.length > 0 ? "\n背景信息：\n" + contextParts.join("\n\n") : ""}
${heroInstruction}

要求：
1. 以纯 JSON 数组格式输出，不要有任何其他文字或 markdown 标记
2. 每场对局包含字段：time (字符串，如"今天 14:30"或"昨天 21:15"), hero (英雄名), kda (格式如"5/2/8"), result ("win"或"lose"), innerVoice (角色内心独白)
3. innerVoice 要求：生活化口语化，像真实玩家游戏时的即时心理活动。不要书面语或文艺台词，可以用语气词、网络用语。示例："完了这波我裂开了"、"嘿嘿这波秀不秀"、"对面打野是不是住上路了"、"队友你认真的吗"、"稳了稳了这把mvp是我的"
4. innerVoice 要结合角色性格，让独白符合这个角色的说话风格
5. 时间分布在最近 1-3 天内
6. 胜负大约各半，略偏向胜利

只输出 JSON 数组，不要输出任何解释。`

              const result = await roche.ai.chat({
                messages: [
                  { role: "system", content: systemPrompt },
                  { role: "user", content: "请为 " + targetName + " 生成 5 场王者荣耀对局记录。" }
                ],
                temperature: 0.85
              })

              let matches = []
              try {
                const text = result.text || ""
                const jsonMatch = text.match(/\[[\s\S]*\]/)
                if (jsonMatch) matches = JSON.parse(jsonMatch[0])
              } catch (e) {
                matches = [{ time: "刚刚", hero: "妲己", kda: "3/2/5", result: "win", innerVoice: "AI返回格式有点问题啊…先凑合看吧" }]
              }

              // 持久化缓存
              if (isFriend) {
                state.charMatchCache[state.friendDetailCharId] = matches
                state.friendMatchLoading = false
                await roche.storage.set("charMatchCache", state.charMatchCache)
              } else {
                state.userMatchCache[state.activePersonaId] = matches
                state.matchLoading = false
                await roche.storage.set("userMatchCache", state.userMatchCache)
              }
            } catch (e) {
              const errItem = [{ time: "—", hero: "—", kda: "—", result: "lose", innerVoice: "加载失败：" + (e.message || e) }]
              if (isFriend) {
                state.charMatchCache[state.friendDetailCharId] = errItem
                state.friendMatchLoading = false
                await roche.storage.set("charMatchCache", state.charMatchCache)
              } else {
                state.userMatchCache[state.activePersonaId] = errItem
                state.matchLoading = false
                await roche.storage.set("userMatchCache", state.userMatchCache)
              }
            }
          }

          /* ══════════════════════════════════════════════
           * AI 生成 Char 战绩数据（修改点2）
           * ══════════════════════════════════════════════ */
          async function generateCharStats(charId) {
            const char = state.characters.find(c => c.id === charId)
            if (!char) return

            state.charStatsLoading = true
            render()

            try {
              const targetName = char.handle || char.name || "角色"
              const personaText = char.persona || char.bio || ""
              let contextParts = []

              const convId = char.conversationId
              if (convId) {
                try {
                  const lt = await roche.memory.getLongTerm({ conversationId: convId, limit: 100 })
                  if (lt) {
                    if (lt.core?.summary) contextParts.push("核心记忆：" + lt.core.summary)
                    if (lt.facts?.length) {
                      const ft = lt.facts.map(f => f.summaryText || f.action || "").filter(Boolean).join("；")
                      if (ft) contextParts.push("事实记忆：" + ft)
                    }
                  }
                } catch (e) {}
                try {
                  const st = await roche.memory.getShortTerm({ conversationId: convId, limit: state.shortTermLimit })
                  if (st && st.length > 0) {
                    contextParts.push("近期聊天：\n" + st.slice(-15).map(m => `${m.senderHandle || m.senderName || "?"}: ${m.text || ""}`).join("\n"))
                  }
                } catch (e) {}
              }

              const prompt = `你是一位王者荣耀玩家资料生成器。请根据以下角色的人设和记忆，为这个角色虚构一份王者荣耀战绩资料。

角色名：${targetName}
${personaText ? "角色人设：" + personaText : ""}
${contextParts.length > 0 ? "\n背景信息：\n" + contextParts.join("\n\n") : ""}

请以纯 JSON 对象格式输出，不要有任何其他文字或 markdown 标记。字段如下：
- rank: 段位（如"星耀III"、"王者28星"、"钻石I"等，要符合角色性格）
- winRate: 胜率数字（如"52.1"，不带%）
- peakScore: 巅峰赛分数（如"1650"，如果段位不够高可以留空字符串）
- heroPower: 英雄战力标（如"市标"、"省标"、"无"等）
- heroes: 常用英雄（3-5个英雄名，逗号分隔，要符合角色性格）

只输出 JSON 对象。`

              const result = await roche.ai.chat({
                messages: [
                  { role: "system", content: prompt },
                  { role: "user", content: "请为 " + targetName + " 生成王者荣耀战绩资料。" }
                ],
                temperature: 0.8
              })

              let charStats = { rank: "", winRate: "", peakScore: "", heroPower: "", heroes: "" }
              try {
                const text = result.text || ""
                const jsonMatch = text.match(/\{[\s\S]*\}/)
                if (jsonMatch) {
                  const parsed = JSON.parse(jsonMatch[0])
                  charStats.rank = String(parsed.rank || "")
                  charStats.winRate = String(parsed.winRate || "")
                  charStats.peakScore = String(parsed.peakScore || "")
                  charStats.heroPower = String(parsed.heroPower || "")
                  charStats.heroes = String(parsed.heroes || "")
                }
              } catch (e) {
                charStats = { rank: "黄金I", winRate: "48.5", peakScore: "", heroPower: "无", heroes: "妲己, 安琪拉, 亚瑟" }
              }

              state.charStatsMap[charId] = charStats
              state.charStatsLoading = false
              await roche.storage.set("charStatsMap", state.charStatsMap)
            } catch (e) {
              state.charStatsMap[charId] = { rank: "未知", winRate: "—", peakScore: "", heroPower: "", heroes: "" }
              state.charStatsLoading = false
              await roche.storage.set("charStatsMap", state.charStatsMap)
            }
          }

          /* ── 设置页 ── */
          function renderSettings() {
            const wrap = el("div", { className: "ch-main ch-settings" })

            const memSec = el("div", { className: "ch-settings-section" })
            memSec.appendChild(el("div", { className: "ch-settings-section-title" }, "记忆设置"))

            const writeRow = el("div", { className: "ch-settings-row" })
            const writeInfo = el("div")
            writeInfo.appendChild(el("div", { className: "ch-settings-label" }, "允许写入 Roche 主记忆"))
            writeInfo.appendChild(el("div", { className: "ch-settings-hint" }, "开启后保存战绩时弹窗询问是否写入。主记忆不随插件卸载删除。"))
            writeRow.appendChild(writeInfo)

            const toggleWrap = el("label", { className: "ch-toggle" })
            const toggleInput = el("input", {
              type: "checkbox",
              async onChange() {
                state.writeToMainMemory = this.checked
                await roche.storage.set("settings", { writeToMainMemory: state.writeToMainMemory, shortTermLimit: state.shortTermLimit })
                roche.ui.toast(state.writeToMainMemory ? "已开启写入主记忆" : "已关闭写入主记忆")
              }
            })
            if (state.writeToMainMemory) toggleInput.checked = true
            toggleWrap.appendChild(toggleInput)
            toggleWrap.appendChild(el("span", { className: "ch-toggle-slider" }))
            writeRow.appendChild(toggleWrap)
            memSec.appendChild(writeRow)

            const limitRow = el("div", { className: "ch-settings-row" })
            const limitInfo = el("div")
            limitInfo.appendChild(el("div", { className: "ch-settings-label" }, "AI 读取近期消息条数"))
            limitInfo.appendChild(el("div", { className: "ch-settings-hint" }, "生成对局时读取的聊天消息数量"))
            limitRow.appendChild(limitInfo)

            const limitSelect = el("select", {
              className: "ch-select",
              async onChange() {
                state.shortTermLimit = parseInt(this.value)
                await roche.storage.set("settings", { writeToMainMemory: state.writeToMainMemory, shortTermLimit: state.shortTermLimit })
              }
            })
            for (const v of [10, 30, 50]) {
              const opt = el("option", { value: String(v) }, v + " 条")
              if (state.shortTermLimit === v) opt.selected = true
              limitSelect.appendChild(opt)
            }
            limitRow.appendChild(limitSelect)
            memSec.appendChild(limitRow)
            wrap.appendChild(memSec)

            const dataSec = el("div", { className: "ch-settings-section" })
            dataSec.appendChild(el("div", { className: "ch-settings-section-title" }, "数据管理"))

            const clearRow = el("div", { className: "ch-settings-row" })
            clearRow.appendChild(el("div", { className: "ch-settings-label" }, "清空所有战绩数据"))
            clearRow.appendChild(el("button", {
              className: "ch-btn ch-btn-danger",
              async onClick() {
                const ok = await roche.ui.confirm({
                  title: "确认清空",
                  message: "确定要清空所有战绩数据吗？\n包括手动编辑的战绩、AI生成的角色战绩、所有对局缓存、好友列表。\n此操作不可撤销。\n\n已写入 Roche 主记忆的数据不会被删除。"
                })
                if (ok) {
                  state.statsMap = {}
                  state.userMatchCache = {}
                  state.charStatsMap = {}
                  state.charMatchCache = {}
                  state.friends = []
                  state.friendPersonaBindings = {}
                  await roche.storage.set("statsMap", {})
                  await roche.storage.set("userMatchCache", {})
                  await roche.storage.set("charStatsMap", {})
                  await roche.storage.set("charMatchCache", {})
                  await roche.storage.set("friends", [])
                  await roche.storage.set("friendPersonaBindings", {})
                  roche.ui.toast("已清空所有数据")
                  render()
                }
              }
            }, "恢复默认 / 清空所有"))
            dataSec.appendChild(clearRow)
            wrap.appendChild(dataSec)

            return wrap
          }

          /* ── 好友侧边栏 ── */
          function renderSidebar() {
            const frag = document.createDocumentFragment()

            frag.appendChild(el("div", {
              className: `ch-sidebar-overlay ${state.sidebarOpen ? "open" : ""}`,
              onClick() { state.sidebarOpen = false; render() }
            }))

            const sidebar = el("div", { className: `ch-sidebar ${state.sidebarOpen ? "open" : ""}` })

            const header = el("div", { className: "ch-sidebar-header" })
            header.appendChild(el("span", { className: "ch-sidebar-title" }, "好友战绩"))
            header.appendChild(el("button", {
              className: "ch-sidebar-close",
              onClick() { state.sidebarOpen = false; render() }
            }, "✕"))
            sidebar.appendChild(header)

            const body = el("div", { className: "ch-sidebar-body" })
            if (state.friends.length === 0) {
              body.appendChild(el("div", { className: "ch-empty-hint" }, "还没有添加好友\n点击下方按钮添加"))
            } else {
              for (const fid of state.friends) {
                const char = state.characters.find(c => c.id === fid)
                if (!char) continue

                const item = el("div", { className: "ch-friend-item" })
                const av = avatarEl(char.avatar, char.handle || char.name, "medium")
                if (!av.classList.contains("ch-friend-avatar")) av.classList.add("ch-friend-avatar")
                av.style.cursor = "pointer"
                av.onclick = () => {
                  state.view = "friendDetail"
                  state.friendDetailCharId = fid
                  state.sidebarOpen = false
                  state.friendMatchExpanded = false
                  state.charStatsLoading = false
                  render()
                  // 首次进入若无战绩则自动生成
                  if (!state.charStatsMap[fid]) {
                    generateCharStats(fid).then(() => render())
                  }
                }
                item.appendChild(av)

                item.appendChild(el("span", {
                  className: "ch-friend-name",
                  style: "cursor:pointer;",
                  onClick() {
                    state.view = "friendDetail"
                    state.friendDetailCharId = fid
                    state.sidebarOpen = false
                    state.friendMatchExpanded = false
                    state.charStatsLoading = false
                    render()
                    if (!state.charStatsMap[fid]) {
                      generateCharStats(fid).then(() => render())
                    }
                  }
                }, char.handle || char.name || "未命名"))

                item.appendChild(el("button", {
                  className: "ch-friend-remove",
                  async onClick(e) {
                    e.stopPropagation()
                    state.friends = state.friends.filter(id => id !== fid)
                    delete state.friendPersonaBindings[fid]
                    delete state.charStatsMap[fid]
                    delete state.charMatchCache[fid]
                    await roche.storage.set("friends", state.friends)
                    await roche.storage.set("friendPersonaBindings", state.friendPersonaBindings)
                    await roche.storage.set("charStatsMap", state.charStatsMap)
                    await roche.storage.set("charMatchCache", state.charMatchCache)
                    render()
                  }
                }, "✕"))

                body.appendChild(item)
              }
            }
            sidebar.appendChild(body)

            const footer = el("div", { className: "ch-sidebar-footer" })
            footer.appendChild(el("button", {
              className: "ch-btn ch-btn-primary",
              style: "width:100%;",
              onClick() { state.addFriendModalOpen = true; render() }
            }, "+ 添加好友"))
            sidebar.appendChild(footer)

            frag.appendChild(sidebar)
            return frag
          }

          /* ── 添加好友模态框 ── */
          function renderAddFriendModal() {
            const overlay = el("div", { className: `ch-modal-overlay ${state.addFriendModalOpen ? "open" : ""}` })
            const modal = el("div", { className: "ch-modal" })
            modal.appendChild(el("div", { className: "ch-modal-header" }, "选择要添加的好友"))

            const body = el("div", { className: "ch-modal-body" })
            const available = state.characters.filter(c => !state.friends.includes(c.id))
            const selectedIds = new Set()

            if (available.length === 0) {
              body.appendChild(el("div", { className: "ch-empty-hint" }, "没有可添加的角色\n或所有角色已添加"))
            } else {
              for (const char of available) {
                const item = el("div", { className: "ch-char-item" })
                item.appendChild(el("input", {
                  type: "checkbox",
                  className: "ch-char-checkbox",
                  onChange() {
                    if (this.checked) selectedIds.add(char.id)
                    else selectedIds.delete(char.id)
                  }
                }))
                const av = avatarEl(char.avatar, char.handle || char.name, "small")
                if (!av.classList.contains("ch-char-avatar")) av.classList.add("ch-char-avatar")
                item.appendChild(av)
                item.appendChild(el("span", { className: "ch-char-name" }, char.handle || char.name || "未命名"))
                body.appendChild(item)
              }
            }
            modal.appendChild(body)

            const footer = el("div", { className: "ch-modal-footer" })
            footer.appendChild(el("button", {
              className: "ch-btn ch-btn-secondary",
              onClick() { state.addFriendModalOpen = false; render() }
            }, "取消"))
            footer.appendChild(el("button", {
              className: "ch-btn ch-btn-primary",
              async onClick() {
                for (const id of selectedIds) {
                  if (!state.friends.includes(id)) state.friends.push(id)
                }
                await roche.storage.set("friends", state.friends)
                state.addFriendModalOpen = false
                roche.ui.toast("已添加 " + selectedIds.size + " 位好友")
                render()
              }
            }, "确认添加"))
            modal.appendChild(footer)
            overlay.appendChild(modal)

            overlay.addEventListener("click", (e) => {
              if (e.target === overlay) { state.addFriendModalOpen = false; render() }
            })
            return overlay
          }

          /* ══════════════════════════════════════════════
           * 好友详情页（修改点2：独立 AI 战绩，无编辑按钮）
           * ══════════════════════════════════════════════ */
          function renderFriendDetail() {
            const wrap = el("div", { className: "ch-main ch-friend-detail" })
            const charId = state.friendDetailCharId
            const char = state.characters.find(c => c.id === charId)
            if (!char) {
              wrap.appendChild(el("div", { className: "ch-empty-hint" }, "角色不存在"))
              return wrap
            }

            const card = el("div", { className: "ch-profile-card" })

            const header = el("div", { className: "ch-profile-header" })
            const av = avatarEl(char.avatar, char.handle || char.name, "xlarge")
            if (!av.classList.contains("ch-profile-avatar")) av.classList.add("ch-profile-avatar")
            header.appendChild(av)

            const info = el("div", { className: "ch-profile-info" })
            info.appendChild(el("div", { className: "ch-profile-name" }, char.handle || char.name || "未命名"))
            if (char.bio) info.appendChild(el("div", { className: "ch-profile-bio" }, char.bio))
            header.appendChild(info)
            card.appendChild(header)

            // Char 战绩展示（AI 生成，无编辑按钮）
            const charStats = state.charStatsMap[charId]

            if (state.charStatsLoading) {
              const loadingDiv = el("div", { className: "ch-char-stats-loading" })
              loadingDiv.innerHTML = '<div class="ch-match-loading-spinner"></div><div style="margin-top:8px;">正在为角色生成战绩资料…</div>'
              card.appendChild(loadingDiv)
            } else if (charStats) {
              // 展示战绩
              card.appendChild(renderStatsDisplay(charStats))

              // 刷新战绩按钮
              const refreshRow = el("div", { className: "ch-char-stats-refresh" })
              refreshRow.appendChild(el("button", {
                className: "ch-btn ch-btn-secondary",
                style: "font-size:12px;padding:5px 12px;",
                async onClick() {
                  await generateCharStats(charId)
                  render()
                }
              }, "🔄 刷新战绩"))
              card.appendChild(refreshRow)
            } else {
              card.appendChild(el("div", { className: "ch-char-stats-loading" }, "战绩数据为空，正在生成…"))
              // 自动触发生成
              generateCharStats(charId).then(() => render())
            }

            // 绑定面具辅助参考
            const boundPid = state.friendPersonaBindings[charId]
            if (boundPid) {
              const bs = state.statsMap[boundPid]
              const bp = state.personas.find(p => p.id === boundPid)
              if (bs && bp && (bs.rank || bs.winRate)) {
                const refSection = el("div", { style: "margin-top:8px;padding:8px 12px;background:rgba(255,255,255,0.02);border-radius:8px;border:1px solid rgba(255,255,255,0.04);" })
                refSection.appendChild(el("div", { style: "font-size:11px;color:#666;margin-bottom:4px;" }, `📎 绑定面具参考（${bp.handle || bp.name}）：段位 ${bs.rank || "—"}，胜率 ${bs.winRate || "—"}%`))
                card.appendChild(refSection)
              }
            }

            // 绑定面具下拉
            const bindRow = el("div", { className: "ch-persona-bind-row" })
            bindRow.appendChild(el("span", { className: "ch-persona-bind-label" }, "绑定面具："))
            const bindSelect = el("select", {
              className: "ch-select",
              style: "flex:1;",
              async onChange() {
                if (this.value) state.friendPersonaBindings[charId] = this.value
                else delete state.friendPersonaBindings[charId]
                await roche.storage.set("friendPersonaBindings", state.friendPersonaBindings)
                roche.ui.toast("面具绑定已更新")
                render()
              }
            })
            const noneOpt = el("option", { value: "" }, "— 不绑定 —")
            if (!boundPid) noneOpt.selected = true
            bindSelect.appendChild(noneOpt)
            for (const p of state.personas) {
              const opt = el("option", { value: p.id }, p.handle || p.name || "未命名")
              if (p.id === boundPid) opt.selected = true
              bindSelect.appendChild(opt)
            }
            bindRow.appendChild(bindSelect)
            card.appendChild(bindRow)

            wrap.appendChild(card)

            // Char 对局战绩（持久化）
            wrap.appendChild(renderMatchSection(true))

            return wrap
          }

          /* ── 首次渲染 ── */
          render()
        },

        async unmount(container, roche) {
          const app = this
          if (app._cleanups) {
            for (const fn of app._cleanups) { try { fn() } catch (e) {} }
            app._cleanups = []
          }
          app._state = null
          container.replaceChildren()
        }
      }
    ]
  })
})()
