/**
 * 王者营地 - Roche Plugin
 * camp-helper v1.4.0
 * author: yelankanbudong
 *
 * v1.4.0: 战力标卡片重构(heroesWithBadge)、记忆管理、兼容旧格式
 */
;(function () {
  "use strict"

  /* ==============================
   * 0. 常量
   * ============================== */

  const POWER_ICON_MAP = [
    { keywords: ["大国标", "国服最强前10"], url: "https://i.postimg.cc/5NLp1pcm/retouch-2026070200125627.png" },
    { keywords: ["小国标", "国服最强前百"], url: "https://i.postimg.cc/CMZmrScd/retouch-2026070200130763.png" },
    { keywords: ["省标"], url: "https://i.postimg.cc/J4ZKmKwq/retouch-2026070200131903.png" },
    { keywords: ["市标"], url: "https://i.postimg.cc/bNkL8LX9/retouch-2026070200133083.png" },
    { keywords: ["区标"], url: "https://i.postimg.cc/G3ZzZVff/retouch-2026070200134276.png" }
  ]

  /** 荣誉等级排序（高→低） */
  const HONOR_RANKS = ["大国标", "小国标", "省标", "市标", "区标"]

  function getPowerIconUrl(text) {
    if (!text) return null
    const t = text.trim()
    for (const entry of POWER_ICON_MAP) {
      for (const kw of entry.keywords) {
        if (t.includes(kw)) return entry.url
      }
    }
    return null
  }

  /** 从 heroesWithBadge 数组中提取最高荣誉，兜底用 highestHonor 或 heroPower */
  function resolveHighestHonor(stats) {
    if (stats.highestHonor && HONOR_RANKS.includes(stats.highestHonor)) return stats.highestHonor
    if (Array.isArray(stats.heroesWithBadge) && stats.heroesWithBadge.length > 0) {
      let best = null
      for (const h of stats.heroesWithBadge) {
        const idx = HONOR_RANKS.indexOf(h.badge)
        if (idx >= 0 && (best === null || idx < best)) best = idx
      }
      if (best !== null) return HONOR_RANKS[best]
    }
    if (stats.heroPower) {
      for (const r of HONOR_RANKS) { if (stats.heroPower.includes(r)) return r }
    }
    return ""
  }

  /** 从新旧格式中提取英雄列表（含badge） */
  function resolveHeroesWithBadge(stats) {
    if (Array.isArray(stats.heroesWithBadge) && stats.heroesWithBadge.length > 0) return stats.heroesWithBadge
    const heroStr = stats.heroes || ""
    const heroList = heroStr.split(/[,，\s]+/).filter(Boolean)
    if (heroList.length === 0) return []
    const badge = stats.heroPower || ""
    return heroList.map(name => ({ name, badge }))
  }

  /** 从新旧格式中提取英雄名字列表 */
  function resolveHeroNames(stats) {
    return resolveHeroesWithBadge(stats).map(h => h.name)
  }

  const LABEL_COLOR_MAP = {
    "MVP": "#D4A84B",
    "带飞局": "#ff6b6b",
    "暴走局": "#ff6b6b",
    "实力局": "#4dabf7",
    "尽力局": "#ffa94d",
    "躺赢局": "#51cf66"
  }

  /* ==============================
   * 1. 样式
   * ============================== */

  const PLUGIN_CSS = `
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
.roche-plugin-camp-helper::-webkit-scrollbar { width: 4px; }
.roche-plugin-camp-helper::-webkit-scrollbar-track { background: transparent; }
.roche-plugin-camp-helper::-webkit-scrollbar-thumb { background: rgba(212,168,75,0.3); border-radius: 2px; }

.ch-topbar {
  position: sticky; top: 0; z-index: 100;
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px;
  background: rgba(11,14,20,0.92);
  backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(212,168,75,0.6);
}
.ch-topbar-left { display: flex; align-items: center; gap: 8px; }
.ch-topbar-right { display: flex; align-items: center; gap: 8px; }
.ch-back-btn, .ch-settings-btn, .ch-friends-btn {
  background: none; border: none; color: #D4A84B; cursor: pointer;
  font-size: 14px; padding: 6px 10px; border-radius: 8px;
  transition: background 0.2s; display: flex; align-items: center; gap: 4px;
}
.ch-back-btn:hover, .ch-settings-btn:hover, .ch-friends-btn:hover { background: rgba(212,168,75,0.12); }
.ch-topbar-title { font-size: 16px; font-weight: 700; color: #D4A84B; }

.ch-persona-bar {
  display: flex; align-items: center; gap: 10px; padding: 12px 16px;
  overflow-x: auto; border-bottom: 1px solid rgba(212,168,75,0.15);
}
.ch-persona-bar::-webkit-scrollbar { height: 0; }
.ch-persona-item {
  flex-shrink: 0; cursor: pointer; text-align: center;
  transition: transform 0.2s, opacity 0.2s; opacity: 0.55;
}
.ch-persona-item.active { opacity: 1; transform: scale(1.1); }
.ch-persona-avatar {
  width: 44px; height: 44px; border-radius: 50%; object-fit: cover;
  border: 2px solid transparent; transition: border-color 0.2s;
}
.ch-persona-item.active .ch-persona-avatar {
  border-color: #D4A84B; box-shadow: 0 0 8px rgba(212,168,75,0.5);
}
.ch-persona-item-name {
  font-size: 11px; margin-top: 4px; color: #aaa;
  max-width: 52px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.ch-persona-item.active .ch-persona-item-name { color: #D4A84B; }

.ch-main { padding: 16px; animation: chFadeIn 0.3s ease; }
@keyframes chFadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.ch-profile-card {
  background: rgba(255,255,255,0.04);
  backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
  border-radius: 20px; border: 1px solid rgba(212,168,75,0.18);
  padding: 24px; position: relative; transition: box-shadow 0.3s;
}
.ch-profile-card:hover { box-shadow: 0 4px 24px rgba(212,168,75,0.12); }
.ch-profile-header { display: flex; align-items: center; gap: 16px; margin-bottom: 20px; }
.ch-profile-avatar {
  width: 64px; height: 64px; border-radius: 50%; object-fit: cover;
  border: 2px solid #D4A84B; box-shadow: 0 0 12px rgba(212,168,75,0.3);
}
.ch-profile-info { flex: 1; }
.ch-profile-name { font-size: 20px; font-weight: 700; color: #fff; }
.ch-profile-bio {
  font-size: 12px; color: #888; margin-top: 4px;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.ch-edit-btn {
  position: absolute; top: 16px; right: 16px;
  background: rgba(212,168,75,0.12); border: 1px solid rgba(212,168,75,0.3);
  color: #D4A84B; cursor: pointer; width: 36px; height: 36px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center; font-size: 16px;
  transition: background 0.2s, transform 0.2s;
}
.ch-edit-btn:hover { background: rgba(212,168,75,0.25); transform: scale(1.08); }

.ch-stats-grid {
  display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 16px;
}
.ch-stat-item {
  background: rgba(255,255,255,0.03); border-radius: 12px; padding: 14px;
  border: 1px solid rgba(255,255,255,0.06);
}
.ch-stat-item.clickable { cursor: pointer; transition: background 0.2s, border-color 0.2s; }
.ch-stat-item.clickable:hover { background: rgba(255,255,255,0.06); border-color: rgba(212,168,75,0.25); }
.ch-stat-item.clickable.expanded { border-color: rgba(212,168,75,0.35); background: rgba(212,168,75,0.05); }
.ch-stat-label {
  font-size: 12px; color: #888; margin-bottom: 4px;
  display: flex; align-items: center; gap: 6px;
}
.ch-stat-label::before { content: "•"; color: #D4A84B; font-size: 16px; }
.ch-stat-value {
  font-size: 22px; font-weight: 700; color: #fff;
  display: flex; align-items: center; gap: 8px;
}
.ch-stat-value.gold { color: #D4A84B; }
.ch-power-icon { width: 20px; height: 20px; object-fit: contain; flex-shrink: 0; }
.ch-power-expand-hint { font-size: 10px; color: #666; margin-top: 4px; }
.ch-power-hero-list {
  margin-top: 8px; padding-top: 8px;
  border-top: 1px solid rgba(255,255,255,0.06); animation: chFadeIn 0.2s ease;
}
.ch-power-hero-item {
  display: flex; align-items: center; gap: 8px; padding: 4px 0; font-size: 13px; color: #ccc;
}
.ch-power-hero-item .ch-power-hero-badge {
  font-size: 11px; color: #999; flex-shrink: 0;
}

.ch-heroes-section { margin-bottom: 16px; }
.ch-section-title {
  font-size: 14px; font-weight: 600; color: #D4A84B; margin-bottom: 10px;
  display: flex; align-items: center; gap: 6px;
}
.ch-section-title::before { content: "•"; font-size: 16px; }
.ch-hero-tags { display: flex; flex-wrap: wrap; gap: 8px; }
.ch-hero-tag {
  background: rgba(212,168,75,0.1); border: 1px solid rgba(212,168,75,0.25);
  border-radius: 20px; padding: 4px 14px; font-size: 13px; color: #D4A84B;
}

.ch-edit-field {
  width: 100%; background: rgba(255,255,255,0.06);
  border: 1px solid rgba(212,168,75,0.3); border-radius: 8px;
  color: #fff; padding: 8px 12px; font-size: 14px; outline: none; transition: border-color 0.2s;
}
.ch-edit-field:focus { border-color: #D4A84B; }
.ch-edit-field::placeholder { color: #555; }
.ch-edit-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
.ch-btn {
  border: none; border-radius: 10px; padding: 8px 20px; font-size: 13px;
  cursor: pointer; transition: background 0.2s, transform 0.15s;
}
.ch-btn:active { transform: scale(0.97); }
.ch-btn-primary { background: #D4A84B; color: #0B0E14; font-weight: 600; }
.ch-btn-primary:hover { background: #e0b85e; }
.ch-btn-secondary { background: rgba(255,255,255,0.08); color: #ccc; }
.ch-btn-secondary:hover { background: rgba(255,255,255,0.14); }
.ch-btn-danger { background: rgba(220,53,69,0.15); color: #ff6b6b; border: 1px solid rgba(220,53,69,0.3); }
.ch-btn-danger:hover { background: rgba(220,53,69,0.25); }

.ch-match-section { margin-top: 4px; }
.ch-match-toggle {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 16px; background: rgba(255,255,255,0.03);
  border: 1px solid rgba(212,168,75,0.15); border-radius: 14px;
  cursor: pointer; transition: background 0.2s; margin-bottom: 8px;
}
.ch-match-toggle:hover { background: rgba(255,255,255,0.06); }
.ch-match-toggle-title {
  font-size: 14px; font-weight: 600; color: #D4A84B;
  display: flex; align-items: center; gap: 6px;
}
.ch-match-toggle-arrow {
  color: #D4A84B; font-size: 12px; transition: transform 0.3s;
}
.ch-match-toggle-arrow.expanded { transform: rotate(180deg); }
.ch-match-list {
  overflow: hidden; max-height: 0; opacity: 0;
  transition: max-height 0.4s ease, opacity 0.3s ease;
}
.ch-match-list.expanded { max-height: 5000px; opacity: 1; }
.ch-match-item {
  background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);
  border-radius: 14px; padding: 14px 16px; margin-bottom: 8px;
  display: flex; align-items: center; gap: 14px; animation: chFadeIn 0.3s ease;
  position: relative;
}
.ch-match-result {
  font-size: 13px; font-weight: 700; padding: 4px 10px;
  border-radius: 6px; min-width: 36px; text-align: center;
}
.ch-match-result.win { background: rgba(40,167,69,0.15); color: #51cf66; border: 1px solid rgba(40,167,69,0.3); }
.ch-match-result.lose { background: rgba(220,53,69,0.15); color: #ff6b6b; border: 1px solid rgba(220,53,69,0.3); }
.ch-match-info { flex: 1; }
.ch-match-hero { font-size: 15px; font-weight: 600; color: #fff; }
.ch-match-label {
  display: inline-block; font-size: 11px; font-weight: 600;
  padding: 1px 8px; border-radius: 4px; margin: 4px 0 2px 0; line-height: 1.6;
}
.ch-match-kda { font-size: 13px; color: #aaa; margin-top: 2px; }
.ch-match-meta { text-align: right; flex-shrink: 0; }
.ch-match-time { font-size: 11px; color: #666; }
.ch-match-voice { font-size: 12px; color: #888; margin-top: 4px; font-style: italic; max-width: 140px; }

/* 单条对局保存按钮 */
.ch-match-save-btn {
  background: none; border: none; cursor: pointer;
  font-size: 14px; padding: 4px 6px; border-radius: 6px;
  opacity: 0.25; transition: opacity 0.2s, transform 0.15s;
  position: absolute; top: 8px; right: 10px;
  color: #D4A84B;
}
.ch-match-item:hover .ch-match-save-btn { opacity: 0.7; }
.ch-match-save-btn:hover { opacity: 1 !important; transform: scale(1.15); }
.ch-match-save-btn.saved {
  opacity: 0.5 !important; cursor: default; color: #51cf66;
}
.ch-match-save-btn.saved:hover { transform: none; }

.ch-match-loading { text-align: center; padding: 24px; color: #888; }
.ch-match-loading-spinner {
  display: inline-block; width: 20px; height: 20px;
  border: 2px solid rgba(212,168,75,0.3); border-top-color: #D4A84B;
  border-radius: 50%; animation: chSpin 0.8s linear infinite;
}
@keyframes chSpin { to { transform: rotate(360deg); } }

.ch-sidebar-overlay {
  position: fixed; top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(0,0,0,0.55); z-index: 200;
  opacity: 0; transition: opacity 0.3s; pointer-events: none;
}
.ch-sidebar-overlay.open { opacity: 1; pointer-events: auto; }
.ch-sidebar {
  position: fixed; top: 0; right: 0; width: min(340px, 85%); height: 100%;
  background: rgba(15,18,26,0.96);
  backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
  border-left: 1px solid rgba(212,168,75,0.2); z-index: 201;
  transform: translateX(100%); transition: transform 0.3s ease;
  display: flex; flex-direction: column; overflow: hidden;
}
.ch-sidebar.open { transform: translateX(0); }
.ch-sidebar-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px; border-bottom: 1px solid rgba(212,168,75,0.15);
}
.ch-sidebar-title { font-size: 16px; font-weight: 700; color: #D4A84B; }
.ch-sidebar-close {
  background: none; border: none; color: #888; cursor: pointer;
  font-size: 18px; padding: 4px 8px; border-radius: 6px;
}
.ch-sidebar-close:hover { color: #fff; }
.ch-sidebar-body { flex: 1; overflow-y: auto; padding: 12px; }
.ch-sidebar-body::-webkit-scrollbar { width: 3px; }
.ch-sidebar-body::-webkit-scrollbar-thumb { background: rgba(212,168,75,0.2); border-radius: 2px; }
.ch-sidebar-footer { padding: 12px 16px; border-top: 1px solid rgba(255,255,255,0.06); }
.ch-friend-item {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 12px; border-radius: 12px;
  cursor: pointer; transition: background 0.2s; margin-bottom: 4px;
}
.ch-friend-item:hover { background: rgba(212,168,75,0.08); }
.ch-friend-avatar {
  width: 40px; height: 40px; border-radius: 50%;
  object-fit: cover; border: 1px solid rgba(255,255,255,0.1);
}
.ch-friend-name { font-size: 14px; color: #ddd; flex: 1; }
.ch-friend-remove {
  background: none; border: none; color: #666; cursor: pointer;
  font-size: 14px; padding: 4px; border-radius: 4px;
  opacity: 0; transition: opacity 0.2s, color 0.2s;
}
.ch-friend-item:hover .ch-friend-remove { opacity: 1; }
.ch-friend-remove:hover { color: #ff6b6b; }

.ch-modal-overlay {
  position: fixed; top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(0,0,0,0.6); z-index: 300;
  display: flex; align-items: center; justify-content: center;
  opacity: 0; transition: opacity 0.25s; pointer-events: none;
}
.ch-modal-overlay.open { opacity: 1; pointer-events: auto; }
.ch-modal {
  background: rgba(20,24,34,0.98);
  backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(212,168,75,0.2); border-radius: 20px;
  width: min(420px, 90%); max-height: 75vh;
  display: flex; flex-direction: column;
  transform: scale(0.95); transition: transform 0.25s;
}
.ch-modal-overlay.open .ch-modal { transform: scale(1); }
.ch-modal-header {
  padding: 16px 20px; border-bottom: 1px solid rgba(255,255,255,0.06);
  font-size: 16px; font-weight: 700; color: #D4A84B;
}
.ch-modal-body { flex: 1; overflow-y: auto; padding: 12px 20px; }
.ch-modal-body::-webkit-scrollbar { width: 3px; }
.ch-modal-body::-webkit-scrollbar-thumb { background: rgba(212,168,75,0.2); border-radius: 2px; }
.ch-modal-footer {
  padding: 12px 20px; border-top: 1px solid rgba(255,255,255,0.06);
  display: flex; justify-content: flex-end; gap: 8px;
}
.ch-char-item {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 8px; border-radius: 10px; cursor: pointer; transition: background 0.2s;
}
.ch-char-item:hover { background: rgba(255,255,255,0.04); }
.ch-char-checkbox { accent-color: #D4A84B; width: 16px; height: 16px; cursor: pointer; }
.ch-char-avatar {
  width: 36px; height: 36px; border-radius: 50%;
  object-fit: cover; border: 1px solid rgba(255,255,255,0.1);
}
.ch-char-name { font-size: 14px; color: #ddd; }

.ch-settings { animation: chFadeIn 0.3s ease; }
.ch-settings-section {
  background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);
  border-radius: 14px; padding: 16px; margin-bottom: 12px;
}
.ch-settings-section-title { font-size: 14px; font-weight: 600; color: #D4A84B; margin-bottom: 12px; }
.ch-settings-row { display: flex; align-items: center; justify-content: space-between; padding: 8px 0; }
.ch-settings-label { font-size: 13px; color: #bbb; }
.ch-settings-hint { font-size: 11px; color: #666; margin-top: 4px; }
.ch-toggle { position: relative; width: 44px; height: 24px; cursor: pointer; }
.ch-toggle input { opacity: 0; width: 0; height: 0; position: absolute; }
.ch-toggle-slider {
  position: absolute; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(255,255,255,0.12); border-radius: 12px; transition: background 0.3s;
}
.ch-toggle-slider::before {
  content: ""; position: absolute; width: 18px; height: 18px;
  left: 3px; bottom: 3px; background: #aaa; border-radius: 50%;
  transition: transform 0.3s, background 0.3s;
}
.ch-toggle input:checked + .ch-toggle-slider { background: rgba(212,168,75,0.35); }
.ch-toggle input:checked + .ch-toggle-slider::before { transform: translateX(20px); background: #D4A84B; }
.ch-select {
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12);
  border-radius: 8px; color: #ddd; padding: 6px 10px; font-size: 13px; outline: none; cursor: pointer;
}
.ch-select option { background: #1a1e2a; }

.ch-friend-detail { animation: chFadeIn 0.3s ease; }
.ch-persona-bind-row {
  display: flex; align-items: center; gap: 8px; margin-top: 12px;
  padding: 10px 14px; background: rgba(255,255,255,0.03); border-radius: 10px;
}
.ch-persona-bind-label { font-size: 12px; color: #888; flex-shrink: 0; }
.ch-empty-hint { text-align: center; padding: 32px 16px; color: #555; font-size: 13px; white-space: pre-line; }
.ch-default-avatar {
  display: inline-flex; align-items: center; justify-content: center;
  background: rgba(212,168,75,0.15); color: #D4A84B;
  font-weight: 700; font-size: 18px; border-radius: 50%; flex-shrink: 0;
}
.ch-default-avatar.small { width: 36px; height: 36px; font-size: 14px; }
.ch-default-avatar.medium { width: 40px; height: 40px; font-size: 16px; }
.ch-default-avatar.large { width: 44px; height: 44px; font-size: 18px; }
.ch-default-avatar.xlarge { width: 64px; height: 64px; font-size: 24px; }
.ch-char-stats-loading { text-align: center; padding: 20px; color: #888; font-size: 13px; }
.ch-char-stats-refresh { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; margin-bottom: 4px; flex-wrap: wrap; }

/* 记忆管理 */
.ch-memory-item {
  background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);
  border-radius: 10px; padding: 10px 14px; margin-bottom: 8px;
  animation: chFadeIn 0.2s ease;
}
.ch-memory-text {
  font-size: 13px; color: #ccc; line-height: 1.5;
  word-break: break-word; margin-bottom: 6px;
}
.ch-memory-meta { font-size: 11px; color: #555; margin-bottom: 6px; }
.ch-memory-actions { display: flex; gap: 8px; }
.ch-memory-actions button {
  background: none; border: 1px solid rgba(255,255,255,0.08);
  color: #999; cursor: pointer; font-size: 12px; padding: 3px 10px;
  border-radius: 6px; transition: color 0.2s, border-color 0.2s;
}
.ch-memory-actions button:hover { color: #fff; border-color: rgba(255,255,255,0.2); }
.ch-memory-actions button.danger:hover { color: #ff6b6b; border-color: rgba(220,53,69,0.4); }
.ch-memory-loading { text-align: center; padding: 16px; color: #888; font-size: 13px; }

/* 编辑记忆弹窗 textarea */
.ch-edit-memory-textarea {
  width: 100%; min-height: 100px; background: rgba(255,255,255,0.06);
  border: 1px solid rgba(212,168,75,0.3); border-radius: 8px;
  color: #fff; padding: 10px 12px; font-size: 13px; line-height: 1.5;
  outline: none; resize: vertical; font-family: inherit;
}
.ch-edit-memory-textarea:focus { border-color: #D4A84B; }
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
        else if (k.startsWith("on") && k.length > 2 && typeof v === "function")
          node.addEventListener(k[2].toLowerCase() + k.slice(3), v)
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
      img.src = src; img.alt = name || ""
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
   * 3. 注册
   * ============================== */

  window.RochePlugin.register({
    id: "camp-helper",
    name: "王者营地",
    version: "1.4.0",
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

          const styleTag = document.createElement("style")
          styleTag.textContent = PLUGIN_CSS
          styleTag.setAttribute("data-camp-helper", "1")
          document.head.appendChild(styleTag)
          app._cleanups.push(() => styleTag.remove())

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
            statsMap: {},
            userMatchCache: {},
            charStatsMap: {},
            charMatchCache: {},
            charStatsLoading: false,
            friendPersonaBindings: {},
            powerExpanded: {},
            savedMatchKeys: {},
            // 记忆管理
            memoryList: [],
            memoryLoading: false,
            editMemoryModalOpen: false,
            editMemoryId: null,
            editMemoryText: "",
          }
          app._state = state

          /* ── 加载存储 ── */
          const load = async (k) => { try { return await roche.storage.get(k) } catch (e) { return null } }
          const sf = await load("friends"); if (Array.isArray(sf)) state.friends = sf
          const ss = await load("statsMap"); if (ss && typeof ss === "object") state.statsMap = ss
          const su = await load("userMatchCache"); if (su && typeof su === "object") state.userMatchCache = su
          const sc = await load("charStatsMap"); if (sc && typeof sc === "object") state.charStatsMap = sc
          const scm = await load("charMatchCache"); if (scm && typeof scm === "object") state.charMatchCache = scm
          const sse = await load("settings"); if (sse) { state.writeToMainMemory = !!sse.writeToMainMemory; state.shortTermLimit = sse.shortTermLimit || 30 }
          const sb = await load("friendPersonaBindings"); if (sb && typeof sb === "object") state.friendPersonaBindings = sb
          const sp = await load("powerExpanded"); if (sp && typeof sp === "object") state.powerExpanded = sp
          const smk = await load("savedMatchKeys"); if (smk && typeof smk === "object") state.savedMatchKeys = smk

          try { state.personas = (await roche.persona.getUserPersonas()) || [] } catch (e) { state.personas = [] }
          try { const ap = await roche.persona.getActiveUserPersona(); state.activePersonaId = ap?.id || (state.personas[0]?.id ?? null) } catch (e) { state.activePersonaId = state.personas[0]?.id ?? null }
          try { state.characters = (await roche.character.list()) || [] } catch (e) { state.characters = [] }

          const root = el("div", { className: "roche-plugin-camp-helper" })
          container.appendChild(root)

          /* ═══════ 辅助：获取 conversationId ═══════ */
          async function getConvIdForChar(charId) {
            const char = state.characters.find(c => c.id === charId)
            if (char && char.conversationId) return char.conversationId
            try {
              const convs = await roche.conversation.list()
              const found = convs.find(c => c.contactId === charId)
              if (found) return found.conversationId || found.id
            } catch (e) {}
            return null
          }

          async function getConvIdForPersona(personaId) {
            try {
              const convs = await roche.conversation.list()
              const found = convs.find(c => c.myActivePersonaId === personaId)
              if (found) return found.conversationId || found.id
              if (convs.length > 0) return convs[0].conversationId || convs[0].id
            } catch (e) {}
            return null
          }

          /* ═══════ 渲染 ═══════ */

          function render() {
            root.innerHTML = ""
            root.appendChild(renderTopbar())
            if (state.view === "home" || state.view === "settings") root.appendChild(renderPersonaBar())
            if (state.view === "home") root.appendChild(renderHome())
            else if (state.view === "settings") root.appendChild(renderSettings())
            else if (state.view === "friendDetail") root.appendChild(renderFriendDetail())
            root.appendChild(renderSidebar())
            root.appendChild(renderAddFriendModal())
            root.appendChild(renderEditMemoryModal())
          }

          function renderTopbar() {
            const bar = el("div", { className: "ch-topbar" })
            const left = el("div", { className: "ch-topbar-left" })
            if (state.view === "friendDetail") {
              left.appendChild(el("button", { className: "ch-back-btn", innerHTML: "← 返回主页", onClick() { state.view = "home"; state.friendDetailCharId = null; state.friendMatchExpanded = false; state.charStatsLoading = false; render() } }))
            } else {
              left.appendChild(el("button", { className: "ch-back-btn", innerHTML: "← 返回", onClick() { roche.ui.closeApp() } }))
            }
            const title = el("span", { className: "ch-topbar-title" })
            if (state.view === "settings") title.textContent = "设置"
            else if (state.view === "friendDetail") { const c = state.characters.find(c => c.id === state.friendDetailCharId); title.textContent = c ? (c.handle || c.name) + " 的战绩" : "好友战绩" }
            else title.textContent = "王者营地"
            left.appendChild(title); bar.appendChild(left)
            const right = el("div", { className: "ch-topbar-right" })
            if (state.view !== "settings") right.appendChild(el("button", { className: "ch-settings-btn", innerHTML: "⚙", onClick() { state.view = "settings"; render() } }))
            else right.appendChild(el("button", { className: "ch-settings-btn", innerHTML: "✕", onClick() { state.view = "home"; render() } }))
            right.appendChild(el("button", { className: "ch-friends-btn", innerHTML: "👥 好友", onClick() { state.sidebarOpen = true; render() } }))
            bar.appendChild(right); return bar
          }

          function renderPersonaBar() {
            const bar = el("div", { className: "ch-persona-bar" })
            if (state.personas.length === 0) { bar.appendChild(el("span", { className: "ch-empty-hint" }, "暂无面具数据")); return bar }
            for (const p of state.personas) {
              const active = p.id === state.activePersonaId
              const item = el("div", { className: `ch-persona-item ${active ? "active" : ""}`, onClick() { state.activePersonaId = p.id; state.editing = false; state.matchExpanded = false; render() } })
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

          function renderHome() {
            const main = el("div", { className: "ch-main" })
            const persona = state.personas.find(p => p.id === state.activePersonaId)
            if (!persona) { main.appendChild(el("div", { className: "ch-empty-hint" }, "请先在 Roche 中创建用户面具")); return main }
            const stats = getCurrentStats()
            const card = el("div", { className: "ch-profile-card" })
            const header = el("div", { className: "ch-profile-header" })
            const av = avatarEl(persona.avatar, persona.handle || persona.name, "xlarge")
            if (!av.classList.contains("ch-profile-avatar")) av.classList.add("ch-profile-avatar")
            header.appendChild(av)
            const info = el("div", { className: "ch-profile-info" })
            info.appendChild(el("div", { className: "ch-profile-name" }, persona.handle || persona.name || "未命名"))
            if (persona.bio) info.appendChild(el("div", { className: "ch-profile-bio" }, persona.bio))
            header.appendChild(info); card.appendChild(header)
            if (!state.editing) card.appendChild(el("button", { className: "ch-edit-btn", innerHTML: "✏️", title: "编辑战绩", onClick() { state.editing = true; render() } }))
            if (state.editing) card.appendChild(renderEditForm(stats))
            else card.appendChild(renderStatsDisplay(stats, state.activePersonaId))
            main.appendChild(card)
            main.appendChild(renderMatchSection(false))
            return main
          }

          /* ── 战绩展示（兼容新旧格式） ── */
          function renderStatsDisplay(stats, entityId) {
            const wrap = el("div")
            const grid = el("div", { className: "ch-stats-grid" })

            // 解析最高荣誉和英雄列表
            const highestHonor = resolveHighestHonor(stats)
            const heroesWithBadge = resolveHeroesWithBadge(stats)
            const heroNames = heroesWithBadge.map(h => h.name)

            // 最高荣誉展示文本
            const honorDisplay = highestHonor || "未设定"
            const honorIconUrl = getPowerIconUrl(highestHonor)

            const isExpanded = !!state.powerExpanded[entityId]

            const items = [
              { label: "段位", value: stats.rank || "未设定", gold: true },
              { label: "胜率", value: stats.winRate ? stats.winRate + "%" : "—" },
              { label: "巅峰赛分数", value: stats.peakScore || "—", gold: true },
              { label: "英雄战力标", value: honorDisplay, isPower: true }
            ]
            for (const it of items) {
              const isPower = !!it.isPower
              const si = el("div", { className: `ch-stat-item${isPower ? " clickable" + (isExpanded ? " expanded" : "") : ""}` })
              if (isPower) si.addEventListener("click", async () => { state.powerExpanded[entityId] = !state.powerExpanded[entityId]; await roche.storage.set("powerExpanded", state.powerExpanded); render() })
              si.appendChild(el("div", { className: "ch-stat-label" }, it.label))
              const valueDiv = el("div", { className: `ch-stat-value ${it.gold ? "gold" : ""}` })
              if (isPower && honorIconUrl) {
                const ic = el("img", { className: "ch-power-icon" }); ic.src = honorIconUrl; ic.alt = ""; ic.onerror = function () { this.style.display = "none" }; valueDiv.appendChild(ic)
              }
              valueDiv.appendChild(document.createTextNode(it.value)); si.appendChild(valueDiv)
              if (isPower) {
                si.appendChild(el("div", { className: "ch-power-expand-hint" }, isExpanded ? "▲ 收起英雄列表" : "▼ 点击查看英雄列表"))
                if (isExpanded) {
                  const hld = el("div", { className: "ch-power-hero-list" })
                  if (heroesWithBadge.length === 0) {
                    hld.appendChild(el("div", { className: "ch-power-hero-item", style: "color:#666;" }, "暂未绑定英雄"))
                  } else {
                    for (const h of heroesWithBadge) {
                      const hi = el("div", { className: "ch-power-hero-item" })
                      const badgeIconUrl = getPowerIconUrl(h.badge)
                      if (badgeIconUrl) {
                        const mi = el("img", { className: "ch-power-icon", style: "width:14px;height:14px;" }); mi.src = badgeIconUrl; mi.alt = ""; mi.onerror = function () { this.style.display = "none" }; hi.appendChild(mi)
                      }
                      const badgeLabel = h.badge || ""
                      if (badgeLabel) {
                        hi.appendChild(el("span", { className: "ch-power-hero-badge" }, badgeLabel))
                      }
                      hi.appendChild(document.createTextNode(" " + h.name))
                      hld.appendChild(hi)
                    }
                  }
                  si.appendChild(hld)
                }
              }
              grid.appendChild(si)
            }
            wrap.appendChild(grid)

            const sec = el("div", { className: "ch-heroes-section" })
            sec.appendChild(el("div", { className: "ch-section-title" }, "常用英雄"))
            const tags = el("div", { className: "ch-hero-tags" })
            if (heroNames.length === 0) tags.appendChild(el("span", { className: "ch-hero-tag" }, "暂未设定"))
            else for (const h of heroNames) tags.appendChild(el("span", { className: "ch-hero-tag" }, h))
            sec.appendChild(tags); wrap.appendChild(sec)
            return wrap
          }

          /* ── 编辑表单（User侧手动编辑，支持新格式） ── */
          function renderEditForm(stats) {
            const form = el("div")

            // 基础字段
            const basicFields = [
              { key: "rank", label: "段位", placeholder: "例如：王者 50 星" },
              { key: "winRate", label: "胜率（%）", placeholder: "例如：56.3" },
              { key: "peakScore", label: "巅峰赛分数", placeholder: "例如：1800" },
            ]
            const inputs = {}
            for (const f of basicFields) {
              const row = el("div", { style: "margin-bottom: 12px;" })
              row.appendChild(el("div", { className: "ch-stat-label", style: "margin-bottom: 6px;" }, f.label))
              const inp = el("input", { className: "ch-edit-field", placeholder: f.placeholder }); inp.value = stats[f.key] || ""
              inputs[f.key] = inp; row.appendChild(inp); form.appendChild(row)
            }

            // 英雄+战力标编辑区
            // 从现有数据解析出 heroesWithBadge
            const existingHWB = resolveHeroesWithBadge(stats)

            const hwbHeader = el("div", { style: "margin-bottom: 12px;" })
            hwbHeader.appendChild(el("div", { className: "ch-stat-label", style: "margin-bottom: 6px;" }, "英雄与战力标"))
            hwbHeader.appendChild(el("div", { className: "ch-settings-hint", style: "margin-bottom: 8px;" }, "每行一个英雄，选择对应战力标。最高标将自动作为卡片展示。"))
            form.appendChild(hwbHeader)

            const hwbContainer = el("div", { style: "display:flex;flex-direction:column;gap:6px;" })
            const hwbRows = []

            function addHWBRow(name, badge) {
              const row = el("div", { style: "display:flex;align-items:center;gap:8px;" })
              const nameInp = el("input", { className: "ch-edit-field", placeholder: "英雄名", style: "flex:1;" })
              nameInp.value = name || ""
              const badgeSel = el("select", { className: "ch-select", style: "width:100px;" })
              const badgeOptions = ["无", "区标", "市标", "省标", "小国标", "大国标"]
              for (const b of badgeOptions) {
                const o = el("option", { value: b === "无" ? "" : b }, b)
                if ((b === "无" && !badge) || b === badge) o.selected = true
                badgeSel.appendChild(o)
              }
              const removeBtn = el("button", { className: "ch-btn ch-btn-secondary", style: "padding:6px 10px;font-size:12px;flex-shrink:0;", onClick() {
                const idx = hwbRows.indexOf(rowData)
                if (idx >= 0) { hwbRows.splice(idx, 1); row.remove() }
              } }, "✕")
              row.appendChild(nameInp); row.appendChild(badgeSel); row.appendChild(removeBtn)
              hwbContainer.appendChild(row)
              const rowData = { nameInp, badgeSel }
              hwbRows.push(rowData)
            }

            // 初始化已有英雄
            if (existingHWB.length > 0) {
              for (const h of existingHWB) addHWBRow(h.name, h.badge)
            } else {
              addHWBRow("", "")
            }

            form.appendChild(hwbContainer)

            // 添加英雄按钮
            const addRow = el("div", { style: "margin-top: 6px; margin-bottom: 16px;" })
            addRow.appendChild(el("button", { className: "ch-btn ch-btn-secondary", style: "font-size:12px;padding:5px 14px;", onClick() { addHWBRow("", "") } }, "+ 添加英雄"))
            form.appendChild(addRow)

            const actions = el("div", { className: "ch-edit-actions" })
            actions.appendChild(el("button", { className: "ch-btn ch-btn-secondary", onClick() { state.editing = false; render() } }, "取消"))
            actions.appendChild(el("button", {
              className: "ch-btn ch-btn-primary",
              async onClick() {
                const pid = state.activePersonaId; if (!pid) return

                // 收集新格式数据
                const heroesWithBadge = []
                for (const r of hwbRows) {
                  const n = r.nameInp.value.trim()
                  if (!n) continue
                  heroesWithBadge.push({ name: n, badge: r.badgeSel.value })
                }

                // 计算最高荣誉
                let highestHonor = ""
                for (const h of heroesWithBadge) {
                  const idx = HONOR_RANKS.indexOf(h.badge)
                  if (idx >= 0) {
                    const curIdx = HONOR_RANKS.indexOf(highestHonor)
                    if (curIdx < 0 || idx < curIdx) highestHonor = h.badge
                  }
                }

                // 兼容旧字段
                const heroNames = heroesWithBadge.map(h => h.name).join(", ")

                const ns = {
                  rank: inputs.rank.value.trim(),
                  winRate: inputs.winRate.value.trim(),
                  peakScore: inputs.peakScore.value.trim(),
                  heroPower: highestHonor,
                  heroes: heroNames,
                  highestHonor: highestHonor,
                  heroesWithBadge: heroesWithBadge,
                }

                state.statsMap[pid] = ns; await roche.storage.set("statsMap", state.statsMap)
                state.editing = false; roche.ui.toast("战绩已保存")
                if (state.writeToMainMemory) {
                  const persona = state.personas.find(p => p.id === pid)
                  const pname = persona ? (persona.name || persona.handle || "用户") : "用户"
                  const ok = await roche.ui.confirm({ title: "写入主记忆", message: `是否将 ${pname} 的战绩写入 Roche 主记忆？\n段位：${ns.rank || "—"}\n胜率：${ns.winRate || "—"}%\n巅峰分：${ns.peakScore || "—"}\n\n注意：主记忆不会随插件卸载删除。` })
                  if (ok) {
                    try {
                      const convId = await getConvIdForPersona(pid)
                      if (!convId) { roche.ui.toast("无可用会话，无法写入"); render(); return }
                      const parts = []
                      if (ns.rank) parts.push("段位: " + ns.rank); if (ns.winRate) parts.push("胜率: " + ns.winRate + "%")
                      if (ns.peakScore) parts.push("巅峰赛分数: " + ns.peakScore); if (ns.highestHonor) parts.push("最高战力标: " + ns.highestHonor)
                      if (heroesWithBadge.length > 0) parts.push("英雄战力: " + heroesWithBadge.map(h => h.name + (h.badge ? "(" + h.badge + ")" : "")).join("、"))
                      await roche.memory.write({ conversationId: convId, summaryText: pname + " 的王者荣耀战绩：" + parts.join("；"), who: [pname], action: "更新了王者荣耀战绩", when: new Date().toLocaleDateString("zh-CN"), where: "王者营地插件", source: "plugin" })
                      roche.ui.toast("已写入主记忆")
                    } catch (e) { roche.ui.toast("写入失败：" + (e.message || e)) }
                  }
                }
                render()
              }
            }, "保存"))
            form.appendChild(actions); return form
          }

          /* ══════════════════════════════
           * 对局战绩（含单条保存按钮）
           * ══════════════════════════════ */
          function renderMatchSection(isFriend) {
            const section = el("div", { className: "ch-match-section" })
            const expanded = isFriend ? state.friendMatchExpanded : state.matchExpanded
            const loading = isFriend ? state.friendMatchLoading : state.matchLoading
            const entityId = isFriend ? state.friendDetailCharId : state.activePersonaId
            let cachedData = isFriend ? (state.charMatchCache[entityId] || null) : (state.userMatchCache[entityId] || null)

            section.appendChild(el("div", {
              className: "ch-match-toggle",
              async onClick() {
                if (isFriend) { state.friendMatchExpanded = !state.friendMatchExpanded; if (state.friendMatchExpanded && !state.charMatchCache[entityId]) await generateAndCacheMatches(true) }
                else { state.matchExpanded = !state.matchExpanded; if (state.matchExpanded && !state.userMatchCache[entityId]) await generateAndCacheMatches(false) }
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
              cachedData.forEach((m, idx) => {
                const item = el("div", { className: "ch-match-item" })
                item.appendChild(el("div", { className: `ch-match-result ${m.result === "win" ? "win" : "lose"}` }, m.result === "win" ? "胜" : "负"))

                const info = el("div", { className: "ch-match-info" })
                info.appendChild(el("div", { className: "ch-match-hero" }, m.hero || "未知英雄"))
                if (m.label) {
                  const lc = LABEL_COLOR_MAP[m.label] || "#888"
                  info.appendChild(el("span", { className: "ch-match-label", style: `color:${lc};background:${lc}18;border:1px solid ${lc}40;` }, m.label))
                }
                info.appendChild(el("div", { className: "ch-match-kda" }, m.kda || "0/0/0"))
                item.appendChild(info)

                const meta = el("div", { className: "ch-match-meta" })
                meta.appendChild(el("div", { className: "ch-match-time" }, m.time || ""))
                if (m.innerVoice) meta.appendChild(el("div", { className: "ch-match-voice" }, '"' + m.innerVoice + '"'))
                item.appendChild(meta)

                // 单条保存按钮
                const saveKey = entityId + ":" + idx
                const alreadySaved = !!state.savedMatchKeys[saveKey]
                const saveBtn = el("button", {
                  className: `ch-match-save-btn ${alreadySaved ? "saved" : ""}`,
                  title: alreadySaved ? "已保存到记忆" : "保存这条对局到记忆",
                  async onClick(e) {
                    e.stopPropagation()
                    if (alreadySaved) return
                    if (!state.writeToMainMemory) { roche.ui.toast("请先在设置中开启「允许写入主记忆」"); return }
                    const convId = isFriend ? await getConvIdForChar(entityId) : await getConvIdForPersona(entityId)
                    if (!convId) { roche.ui.toast("无可用会话，无法写入记忆"); return }

                    let who = "用户"
                    if (isFriend) {
                      const char = state.characters.find(c => c.id === entityId)
                      who = char ? (char.name || char.handle || "角色") : "角色"
                    } else {
                      const persona = state.personas.find(p => p.id === entityId)
                      who = persona ? (persona.name || persona.handle || "用户") : "用户"
                    }

                    const resultText = m.result === "win" ? "胜利" : "失败"
                    const summaryText = `${who} 在 ${m.time || "近期"} 使用 ${m.hero || "未知英雄"}，战绩 ${m.kda || "0/0/0"}，${resultText}。${m.label ? "标签：" + m.label + "。" : ""}心声："${m.innerVoice || ""}"`

                    const ok = await roche.ui.confirm({ title: "保存对局到记忆", message: `将以下内容写入 Roche 主记忆：\n\n${summaryText}\n\n注意：主记忆不会随插件卸载删除。` })
                    if (!ok) return

                    try {
                      await roche.memory.write({ conversationId: convId, summaryText, who: [who], action: "记录了一场对局", when: new Date().toLocaleDateString("zh-CN"), where: "王者营地插件", source: "plugin" })
                      state.savedMatchKeys[saveKey] = true
                      await roche.storage.set("savedMatchKeys", state.savedMatchKeys)
                      roche.ui.toast("已保存到记忆")
                      render()
                    } catch (e) { roche.ui.toast("写入失败：" + (e.message || e)) }
                  }
                })
                saveBtn.textContent = alreadySaved ? "✅" : "💾"
                item.appendChild(saveBtn)

                list.appendChild(item)
              })

              const refreshRow = el("div", { style: "text-align:center;padding:8px 0 4px;" })
              refreshRow.appendChild(el("button", {
                className: "ch-btn ch-btn-secondary", style: "font-size:12px;padding:6px 14px;",
                async onClick() { await generateAndCacheMatches(isFriend); render() }
              }, "🔄 刷新对局"))
              list.appendChild(refreshRow)
            } else if (expanded && !loading) {
              list.appendChild(el("div", { className: "ch-empty-hint" }, "暂无对局数据，展开后自动生成"))
            }

            section.appendChild(list)
            return section
          }

          /* ── AI 生成对局 ── */
          async function generateAndCacheMatches(isFriend) {
            if (isFriend) state.friendMatchLoading = true; else state.matchLoading = true
            render()

            try {
              let targetName = "", personaText = "", heroesStr = "", contextParts = []
              const entityId = isFriend ? state.friendDetailCharId : state.activePersonaId

              if (isFriend) {
                const char = state.characters.find(c => c.id === entityId); if (!char) throw new Error("角色不存在")
                targetName = char.handle || char.name || "角色"; personaText = char.persona || char.bio || ""
                const cs = state.charStatsMap[char.id]
                if (cs) {
                  const hn = resolveHeroNames(cs).join("、") || "未知"
                  contextParts.push(`该角色战绩：段位 ${cs.rank || "未知"}，胜率 ${cs.winRate || "未知"}%，常用英雄 ${hn}`)
                }
                const bp = state.friendPersonaBindings[char.id]
                if (bp) { const bpe = state.personas.find(p => p.id === bp), bst = state.statsMap[bp]; if (bpe && bst) contextParts.push(`（参考）绑定面具（${bpe.handle || bpe.name}）：段位 ${bst.rank || "未知"}，胜率 ${bst.winRate || "未知"}%`) }
                const convId = char.conversationId
                if (convId) {
                  try { const st = await roche.memory.getShortTerm({ conversationId: convId, limit: state.shortTermLimit }); if (st && st.length > 0) contextParts.push("近期聊天：\n" + st.slice(-state.shortTermLimit).map(m => `${m.senderHandle || m.senderName || "?"}: ${m.text || ""}`).join("\n")) } catch (e) {}
                  try { const lt = await roche.memory.getLongTerm({ conversationId: convId, limit: 100 }); if (lt) { if (lt.core?.summary) contextParts.push("核心记忆：" + lt.core.summary); if (lt.facts?.length) { const ft = lt.facts.map(f => f.summaryText || f.action || "").filter(Boolean).join("；"); if (ft) contextParts.push("事实记忆：" + ft) } } } catch (e) {}
                }
              } else {
                const persona = state.personas.find(p => p.id === entityId); if (!persona) throw new Error("面具不存在")
                targetName = persona.handle || persona.name || "用户"; personaText = persona.persona || persona.bio || ""
                const stats = getCurrentStats()
                const hn = resolveHeroNames(stats).join("、") || "未知"
                if (stats.rank || hn !== "未知") contextParts.push(`当前战绩：段位 ${stats.rank || "未知"}，胜率 ${stats.winRate || "未知"}%，巅峰分 ${stats.peakScore || "未知"}，常用英雄 ${hn}`)
                try {
                  const convs = await roche.conversation.list(); const conv = convs.find(c => c.myActivePersonaId === entityId)
                  if (conv) {
                    const cid = conv.conversationId || conv.id
                    try { const st = await roche.memory.getShortTerm({ conversationId: cid, limit: state.shortTermLimit }); if (st && st.length > 0) contextParts.push("近期聊天：\n" + st.slice(-state.shortTermLimit).map(m => `${m.senderHandle || m.senderName || "?"}: ${m.text || ""}`).join("\n")) } catch (e) {}
                    try { const lt = await roche.memory.getLongTerm({ conversationId: cid, limit: 100 }); if (lt) { if (lt.core?.summary) contextParts.push("核心记忆：" + lt.core.summary); if (lt.facts?.length) { const ft = lt.facts.map(f => f.summaryText || f.action || "").filter(Boolean).join("；"); if (ft) contextParts.push("事实记忆：" + ft) } } } catch (e) {}
                  }
                } catch (e) {}
              }

              const hl = isFriend ? resolveHeroNames(state.charStatsMap[entityId] || {}) : resolveHeroNames(getCurrentStats())
              let heroInst = hl.length > 0 ? `\n英雄分配规则：\n- 常用英雄：${hl.join("、")}\n- 5场中约2-3场使用常用英雄，剩余2-3场从王者荣耀全英雄池随机选取\n- 每场不同英雄` : `\n英雄分配规则：\n- 无常用英雄设定，5场全部从王者荣耀全英雄池随机选取不同英雄`

              const sysPrompt = `你是一位王者荣耀战报生成器。请根据以下角色的人设和记忆内容，生成 5 场最近的对局记录。

角色名：${targetName}
${personaText ? "角色人设：" + personaText : ""}
${contextParts.length > 0 ? "\n背景信息：\n" + contextParts.join("\n\n") : ""}
${heroInst}

要求：
1. 以纯 JSON 数组格式输出，不要有任何其他文字或 markdown 标记
2. 每场对局包含字段：
   - time: 字符串，如"今天 14:30"或"昨天 21:15"
   - hero: 英雄名
   - kda: 格式如"5/2/8"
   - result: "win"或"lose"
   - label: 从 [MVP, 尽力局, 带飞局, 暴走局, 实力局, 躺赢局] 中选一个，根据KDA和胜负合理分配
   - innerVoice: 角色内心独白，生活化口语化，像真实玩家即时心理活动，不要书面语。示例："完了这波我裂开了"、"嘿嘿这波秀不秀"、"对面打野是不是住上路了"
3. innerVoice 结合角色性格
4. 时间分布在最近 1-3 天
5. 胜负各半略偏胜
6. MVP 最多1个，label 尽量多样

只输出 JSON 数组。`

              const result = await roche.ai.chat({ messages: [{ role: "system", content: sysPrompt }, { role: "user", content: "请为 " + targetName + " 生成 5 场王者荣耀对局记录。" }], temperature: 0.85 })
              let matches = []
              try { const t = result.text || ""; const jm = t.match(/$$[\s\S]*$$/); if (jm) matches = JSON.parse(jm[0]) } catch (e) { matches = [{ time: "刚刚", hero: "妲己", kda: "3/2/5", result: "win", label: "实力局", innerVoice: "AI返回格式有点问题…先凑合看" }] }

              // 刷新对局时清除该实体旧的 saved 标记
              const prefix = entityId + ":"
              for (const k of Object.keys(state.savedMatchKeys)) { if (k.startsWith(prefix)) delete state.savedMatchKeys[k] }
              await roche.storage.set("savedMatchKeys", state.savedMatchKeys)

              if (isFriend) { state.charMatchCache[entityId] = matches; state.friendMatchLoading = false; await roche.storage.set("charMatchCache", state.charMatchCache) }
              else { state.userMatchCache[entityId] = matches; state.matchLoading = false; await roche.storage.set("userMatchCache", state.userMatchCache) }
            } catch (e) {
              const err = [{ time: "—", hero: "—", kda: "—", result: "lose", label: "尽力局", innerVoice: "加载失败：" + (e.message || e) }]
              if (isFriend) { state.charMatchCache[state.friendDetailCharId] = err; state.friendMatchLoading = false; await roche.storage.set("charMatchCache", state.charMatchCache) }
              else { state.userMatchCache[state.activePersonaId] = err; state.matchLoading = false; await roche.storage.set("userMatchCache", state.userMatchCache) }
            }
          }

          /* ── Char AI 战绩（新格式 heroesWithBadge） ── */
          async function generateCharStats(charId) {
            const char = state.characters.find(c => c.id === charId); if (!char) return
            state.charStatsLoading = true; render()
            try {
              const tn = char.handle || char.name || "角色"; const pt = char.persona || char.bio || ""
              let cp = []; const cv = char.conversationId
              if (cv) {
                try { const lt = await roche.memory.getLongTerm({ conversationId: cv, limit: 100 }); if (lt) { if (lt.core?.summary) cp.push("核心记忆：" + lt.core.summary); if (lt.facts?.length) { const ft = lt.facts.map(f => f.summaryText || f.action || "").filter(Boolean).join("；"); if (ft) cp.push("事实记忆：" + ft) } } } catch (e) {}
                try { const st = await roche.memory.getShortTerm({ conversationId: cv, limit: state.shortTermLimit }); if (st && st.length > 0) cp.push("近期聊天：\n" + st.slice(-15).map(m => `${m.senderHandle || m.senderName || "?"}: ${m.text || ""}`).join("\n")) } catch (e) {}
              }
              const prompt = `你是一位王者荣耀玩家资料生成器。请根据以下角色的人设和记忆，为这个角色虚构一份王者荣耀战绩资料。

角色名：${tn}
${pt ? "角色人设：" + pt : ""}
${cp.length > 0 ? "\n背景信息：\n" + cp.join("\n\n") : ""}

以纯 JSON 对象格式输出：
- rank: 段位（如"星耀III"、"王者28星"）
- winRate: 胜率数字（如"52.1"，不带%）
- peakScore: 巅峰赛分数（如"1650"，段位不高可留空）
- highestHonor: 该角色的最高荣誉标识，从"大国标"、"小国标"、"省标"、"市标"、"区标"、""中选一个
- heroesWithBadge: 数组，4-6个英雄，约80%来自角色可能常用的英雄，20%随机补充。每个元素格式 { "name": "英雄名", "badge": "标级别" }，badge从"大国标"、"小国标"、"省标"、"市标"、"区标"、""中选，每个英雄独立随机分配，可混合等级，highestHonor应等于数组中最高的badge

只输出 JSON 对象。`
              const r = await roche.ai.chat({ messages: [{ role: "system", content: prompt }, { role: "user", content: "请为 " + tn + " 生成战绩资料。" }], temperature: 0.8 })
              let cs = { rank: "", winRate: "", peakScore: "", heroPower: "", heroes: "", highestHonor: "", heroesWithBadge: [] }
              try {
                const t = r.text || ""; const jm = t.match(/\{[\s\S]*\}/)
                if (jm) {
                  const p = JSON.parse(jm[0])
                  cs.rank = String(p.rank || "")
                  cs.winRate = String(p.winRate || "")
                  cs.peakScore = String(p.peakScore || "")
                  // 新格式
                  if (Array.isArray(p.heroesWithBadge) && p.heroesWithBadge.length > 0) {
                    cs.heroesWithBadge = p.heroesWithBadge.map(h => ({
                      name: String(h.name || ""),
                      badge: String(h.badge || "")
                    })).filter(h => h.name)
                    cs.highestHonor = String(p.highestHonor || "")
                    // 兼容旧字段
                    cs.heroes = cs.heroesWithBadge.map(h => h.name).join(", ")
                    cs.heroPower = cs.highestHonor || ""
                  } else {
                    // AI 返回旧格式兜底
                    cs.heroPower = String(p.heroPower || p.highestHonor || "")
                    cs.heroes = String(p.heroes || "")
                    cs.highestHonor = cs.heroPower
                  }
                }
              } catch (e) {
                cs = { rank: "黄金I", winRate: "48.5", peakScore: "", heroPower: "无", heroes: "妲己, 安琪拉, 亚瑟", highestHonor: "", heroesWithBadge: [{ name: "妲己", badge: "" }, { name: "安琪拉", badge: "" }, { name: "亚瑟", badge: "" }] }
              }
              state.charStatsMap[charId] = cs; state.charStatsLoading = false; await roche.storage.set("charStatsMap", state.charStatsMap)
            } catch (e) { state.charStatsMap[charId] = { rank: "未知", winRate: "—", peakScore: "", heroPower: "", heroes: "", highestHonor: "", heroesWithBadge: [] }; state.charStatsLoading = false; await roche.storage.set("charStatsMap", state.charStatsMap) }
          }

           /* ══════════════════════════════════════
           * 设置页（含记忆管理）
           * ══════════════════════════════════════ */
          function renderSettings() {
            const wrap = el("div", { className: "ch-main ch-settings" })

            // ── 记忆设置 ──
            const memSec = el("div", { className: "ch-settings-section" })
            memSec.appendChild(el("div", { className: "ch-settings-section-title" }, "记忆设置"))
            const wr = el("div", { className: "ch-settings-row" })
            const wi = el("div"); wi.appendChild(el("div", { className: "ch-settings-label" }, "允许写入 Roche 主记忆")); wi.appendChild(el("div", { className: "ch-settings-hint" }, "开启后可将战绩和对局保存到 Roche 主记忆。主记忆不随插件卸载删除。"))
            wr.appendChild(wi)
            const tw = el("label", { className: "ch-toggle" })
            const ti = el("input", { type: "checkbox", async onChange() { state.writeToMainMemory = this.checked; await roche.storage.set("settings", { writeToMainMemory: state.writeToMainMemory, shortTermLimit: state.shortTermLimit }); roche.ui.toast(state.writeToMainMemory ? "已开启写入主记忆" : "已关闭写入主记忆") } })
            if (state.writeToMainMemory) ti.checked = true
            tw.appendChild(ti); tw.appendChild(el("span", { className: "ch-toggle-slider" })); wr.appendChild(tw); memSec.appendChild(wr)

            const lr = el("div", { className: "ch-settings-row" })
            const li = el("div"); li.appendChild(el("div", { className: "ch-settings-label" }, "AI 读取近期消息条数")); li.appendChild(el("div", { className: "ch-settings-hint" }, "生成对局时读取的聊天消息数量"))
            lr.appendChild(li)
            const ls = el("select", { className: "ch-select", async onChange() { state.shortTermLimit = parseInt(this.value); await roche.storage.set("settings", { writeToMainMemory: state.writeToMainMemory, shortTermLimit: state.shortTermLimit }) } })
            for (const v of [10, 30, 50]) { const o = el("option", { value: String(v) }, v + " 条"); if (state.shortTermLimit === v) o.selected = true; ls.appendChild(o) }
            lr.appendChild(ls); memSec.appendChild(lr); wrap.appendChild(memSec)

            // ── 记忆管理 ──
            const mmSec = el("div", { className: "ch-settings-section" })
            mmSec.appendChild(el("div", { className: "ch-settings-section-title" }, "记忆管理"))
            mmSec.appendChild(el("div", { className: "ch-settings-hint", style: "margin-bottom:12px;" }, "查看、编辑或删除本插件写入 Roche 主记忆的内容。"))

            // 加载/刷新按钮
            const mmActions = el("div", { style: "display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;" })
            mmActions.appendChild(el("button", {
              className: "ch-btn ch-btn-secondary", style: "font-size:12px;padding:5px 14px;",
              async onClick() {
                state.memoryLoading = true; render()
                try {
                  const allResults = []
                  const convs = await roche.conversation.list().catch(() => [])
                  if (convs && convs.length > 0) {
                    for (const conv of convs) {
                      const cid = conv.conversationId || conv.id
                      try {
                        const results = await roche.memory.search({ conversationId: cid, query: "王者营地", limit: 80 })
                        if (results && results.length > 0) {
                          for (const r of results) {
                            const item = r.item || r
                            const text = item.summaryText || item.action || item.text || ""
                            if (text && (text.includes("王者营地") || text.includes("王者荣耀战绩") || text.includes("记录了一场对局"))) {
                              allResults.push({ id: item.id, summaryText: text, who: item.who, when: item.when, conversationId: cid })
                            }
                          }
                        }
                      } catch (e) {}
                    }
                  }
                  // 去重
                  const seen = new Set()
                  state.memoryList = allResults.filter(m => { if (!m.id || seen.has(m.id)) return false; seen.add(m.id); return true })
                } catch (e) { state.memoryList = []; roche.ui.toast("加载记忆失败：" + (e.message || e)) }
                state.memoryLoading = false; render()
              }
            }, "🔍 加载插件记忆"))

            // 一键清空
            mmActions.appendChild(el("button", {
              className: "ch-btn ch-btn-danger", style: "font-size:12px;padding:5px 14px;",
              async onClick() {
                if (state.memoryList.length === 0) { roche.ui.toast("请先点击「加载插件记忆」"); return }
                const ok1 = await roche.ui.confirm({ title: "一键清空插件记忆", message: `即将删除 ${state.memoryList.length} 条本插件写入的主记忆。\n\n此操作不可撤销！` })
                if (!ok1) return
                const ok2 = await roche.ui.confirm({ title: "再次确认", message: `真的要删除全部 ${state.memoryList.length} 条记忆吗？\n删除后无法恢复。` })
                if (!ok2) return
                let deleted = 0
                for (const m of state.memoryList) {
                  try { await roche.memory.delete(m.id); deleted++ } catch (e) {}
                }
                state.memoryList = []
                roche.ui.toast(`已删除 ${deleted} 条记忆`)
                render()
              }
            }, "🗑️ 一键清空全部"))
            mmSec.appendChild(mmActions)

            // 记忆列表
            if (state.memoryLoading) {
              const ld = el("div", { className: "ch-memory-loading" })
              ld.innerHTML = '<div class="ch-match-loading-spinner"></div><div style="margin-top:8px;">正在搜索插件记忆…</div>'
              mmSec.appendChild(ld)
            } else if (state.memoryList.length > 0) {
              for (const m of state.memoryList) {
                const mItem = el("div", { className: "ch-memory-item" })
                mItem.appendChild(el("div", { className: "ch-memory-text" }, m.summaryText || ""))
                const metaParts = []
                if (m.who && m.who.length > 0) metaParts.push("关联：" + m.who.join("、"))
                if (m.when) metaParts.push("时间：" + m.when)
                if (metaParts.length > 0) mItem.appendChild(el("div", { className: "ch-memory-meta" }, metaParts.join("  |  ")))

                const acts = el("div", { className: "ch-memory-actions" })
                // 编辑按钮
                acts.appendChild(el("button", {
                  onClick() {
                    state.editMemoryId = m.id
                    state.editMemoryText = m.summaryText || ""
                    state.editMemoryModalOpen = true
                    render()
                  }
                }, "✏️ 编辑"))
                // 删除按钮
                acts.appendChild(el("button", {
                  className: "danger",
                  async onClick() {
                    const ok = await roche.ui.confirm({ title: "删除记忆", message: `确定要删除这条记忆吗？\n\n"${(m.summaryText || "").slice(0, 80)}…"\n\n此操作不可撤销。` })
                    if (!ok) return
                    try {
                      await roche.memory.delete(m.id)
                      state.memoryList = state.memoryList.filter(x => x.id !== m.id)
                      roche.ui.toast("已删除")
                      render()
                    } catch (e) { roche.ui.toast("删除失败：" + (e.message || e)) }
                  }
                }, "🗑️ 删除"))
                mItem.appendChild(acts)
                mmSec.appendChild(mItem)
              }
            } else if (!state.memoryLoading) {
              mmSec.appendChild(el("div", { className: "ch-empty-hint", style: "padding:16px;" }, "暂无插件写入的记忆\n点击上方按钮加载"))
            }
            wrap.appendChild(mmSec)

            // ── 数据管理 ──
            const ds = el("div", { className: "ch-settings-section" }); ds.appendChild(el("div", { className: "ch-settings-section-title" }, "数据管理"))
            const cr = el("div", { className: "ch-settings-row" }); cr.appendChild(el("div", { className: "ch-settings-label" }, "清空所有战绩数据"))
            cr.appendChild(el("button", { className: "ch-btn ch-btn-danger", async onClick() {
              const ok = await roche.ui.confirm({ title: "确认清空", message: "确定要清空所有战绩数据吗？\n包括手动编辑的战绩、AI生成的角色战绩、所有对局缓存、好友列表、保存记录。\n此操作不可撤销。\n\n已写入 Roche 主记忆的数据不会被删除。" })
              if (ok) {
                state.statsMap = {}; state.userMatchCache = {}; state.charStatsMap = {}; state.charMatchCache = {}
                state.friends = []; state.friendPersonaBindings = {}; state.powerExpanded = {}; state.savedMatchKeys = {}
                for (const k of ["statsMap","userMatchCache","charStatsMap","charMatchCache","friends","friendPersonaBindings","powerExpanded","savedMatchKeys"]) await roche.storage.set(k, k === "friends" ? [] : {})
                roche.ui.toast("已清空所有数据"); render()
              }
            } }, "恢复默认 / 清空所有"))
            ds.appendChild(cr); wrap.appendChild(ds); return wrap
          }

          /* ── 编辑记忆弹窗 ── */
          function renderEditMemoryModal() {
            const ov = el("div", { className: `ch-modal-overlay ${state.editMemoryModalOpen ? "open" : ""}` })
            const md = el("div", { className: "ch-modal" })
            md.appendChild(el("div", { className: "ch-modal-header" }, "编辑记忆"))
            const bd = el("div", { className: "ch-modal-body" })
            const ta = el("textarea", { className: "ch-edit-memory-textarea", placeholder: "记忆内容…" })
            ta.value = state.editMemoryText || ""
            ta.addEventListener("input", function () { state.editMemoryText = this.value })
            bd.appendChild(ta)
            md.appendChild(bd)
            const ft = el("div", { className: "ch-modal-footer" })
            ft.appendChild(el("button", { className: "ch-btn ch-btn-secondary", onClick() { state.editMemoryModalOpen = false; state.editMemoryId = null; state.editMemoryText = ""; render() } }, "取消"))
            ft.appendChild(el("button", {
              className: "ch-btn ch-btn-primary",
              async onClick() {
                const newText = state.editMemoryText.trim()
                if (!newText) { roche.ui.toast("内容不能为空"); return }
                if (!state.editMemoryId) { roche.ui.toast("记忆 ID 无效"); return }
                try {
                  await roche.memory.update(state.editMemoryId, { summaryText: newText })
                  // 更新本地列表
                  const found = state.memoryList.find(m => m.id === state.editMemoryId)
                  if (found) found.summaryText = newText
                  state.editMemoryModalOpen = false; state.editMemoryId = null; state.editMemoryText = ""
                  roche.ui.toast("记忆已更新")
                  render()
                } catch (e) { roche.ui.toast("更新失败：" + (e.message || e)) }
              }
            }, "保存"))
            md.appendChild(ft); ov.appendChild(md)
            ov.addEventListener("click", (e) => { if (e.target === ov) { state.editMemoryModalOpen = false; state.editMemoryId = null; state.editMemoryText = ""; render() } })
            return ov
          }

          /* ── 侧边栏 ── */
          function renderSidebar() {
            const frag = document.createDocumentFragment()
            frag.appendChild(el("div", { className: `ch-sidebar-overlay ${state.sidebarOpen ? "open" : ""}`, onClick() { state.sidebarOpen = false; render() } }))
            const sb = el("div", { className: `ch-sidebar ${state.sidebarOpen ? "open" : ""}` })
            const hd = el("div", { className: "ch-sidebar-header" })
            hd.appendChild(el("span", { className: "ch-sidebar-title" }, "好友战绩"))
            hd.appendChild(el("button", { className: "ch-sidebar-close", onClick() { state.sidebarOpen = false; render() } }, "✕"))
            sb.appendChild(hd)
            const bd = el("div", { className: "ch-sidebar-body" })
            if (state.friends.length === 0) bd.appendChild(el("div", { className: "ch-empty-hint" }, "还没有添加好友\n点击下方按钮添加"))
            else {
              for (const fid of state.friends) {
                const char = state.characters.find(c => c.id === fid); if (!char) continue
                const it = el("div", { className: "ch-friend-item" })
                const av = avatarEl(char.avatar, char.handle || char.name, "medium")
                if (!av.classList.contains("ch-friend-avatar")) av.classList.add("ch-friend-avatar")
                av.style.cursor = "pointer"
                const goD = () => { state.view = "friendDetail"; state.friendDetailCharId = fid; state.sidebarOpen = false; state.friendMatchExpanded = false; state.charStatsLoading = false; render(); if (!state.charStatsMap[fid]) generateCharStats(fid).then(() => render()) }
                av.onclick = goD; it.appendChild(av)
                it.appendChild(el("span", { className: "ch-friend-name", style: "cursor:pointer;", onClick: goD }, char.handle || char.name || "未命名"))
                it.appendChild(el("button", { className: "ch-friend-remove", async onClick(e) { e.stopPropagation(); state.friends = state.friends.filter(id => id !== fid); delete state.friendPersonaBindings[fid]; delete state.charStatsMap[fid]; delete state.charMatchCache[fid]; delete state.powerExpanded[fid]; const pf = fid + ":"; for (const k of Object.keys(state.savedMatchKeys)) { if (k.startsWith(pf)) delete state.savedMatchKeys[k] }; await roche.storage.set("friends", state.friends); await roche.storage.set("friendPersonaBindings", state.friendPersonaBindings); await roche.storage.set("charStatsMap", state.charStatsMap); await roche.storage.set("charMatchCache", state.charMatchCache); await roche.storage.set("powerExpanded", state.powerExpanded); await roche.storage.set("savedMatchKeys", state.savedMatchKeys); render() } }, "✕"))
                bd.appendChild(it)
              }
            }
            sb.appendChild(bd)
            const ft = el("div", { className: "ch-sidebar-footer" })
            ft.appendChild(el("button", { className: "ch-btn ch-btn-primary", style: "width:100%;", onClick() { state.addFriendModalOpen = true; render() } }, "+ 添加好友"))
            sb.appendChild(ft); frag.appendChild(sb); return frag
          }

          /* ── 添加好友模态 ── */
          function renderAddFriendModal() {
            const ov = el("div", { className: `ch-modal-overlay ${state.addFriendModalOpen ? "open" : ""}` })
            const md = el("div", { className: "ch-modal" })
            md.appendChild(el("div", { className: "ch-modal-header" }, "选择要添加的好友"))
            const bd = el("div", { className: "ch-modal-body" })
            const avail = state.characters.filter(c => !state.friends.includes(c.id))
            const sel = new Set()
            if (avail.length === 0) bd.appendChild(el("div", { className: "ch-empty-hint" }, "没有可添加的角色\n或所有角色已添加"))
            else { for (const ch of avail) { const it = el("div", { className: "ch-char-item" }); it.appendChild(el("input", { type: "checkbox", className: "ch-char-checkbox", onChange() { if (this.checked) sel.add(ch.id); else sel.delete(ch.id) } })); const av = avatarEl(ch.avatar, ch.handle || ch.name, "small"); if (!av.classList.contains("ch-char-avatar")) av.classList.add("ch-char-avatar"); it.appendChild(av); it.appendChild(el("span", { className: "ch-char-name" }, ch.handle || ch.name || "未命名")); bd.appendChild(it) } }
            md.appendChild(bd)
            const ft = el("div", { className: "ch-modal-footer" })
            ft.appendChild(el("button", { className: "ch-btn ch-btn-secondary", onClick() { state.addFriendModalOpen = false; render() } }, "取消"))
            ft.appendChild(el("button", { className: "ch-btn ch-btn-primary", async onClick() { for (const id of sel) { if (!state.friends.includes(id)) state.friends.push(id) }; await roche.storage.set("friends", state.friends); state.addFriendModalOpen = false; roche.ui.toast("已添加 " + sel.size + " 位好友"); render() } }, "确认添加"))
            md.appendChild(ft); ov.appendChild(md)
            ov.addEventListener("click", (e) => { if (e.target === ov) { state.addFriendModalOpen = false; render() } })
            return ov
          }

          /* ══════════════════════════════════════
           * 好友详情页（含保存战绩到记忆按钮）
           * ══════════════════════════════════════ */
          function renderFriendDetail() {
            const wrap = el("div", { className: "ch-main ch-friend-detail" })
            const charId = state.friendDetailCharId
            const char = state.characters.find(c => c.id === charId)
            if (!char) { wrap.appendChild(el("div", { className: "ch-empty-hint" }, "角色不存在")); return wrap }

            const card = el("div", { className: "ch-profile-card" })
            const hd = el("div", { className: "ch-profile-header" })
            const av = avatarEl(char.avatar, char.handle || char.name, "xlarge")
            if (!av.classList.contains("ch-profile-avatar")) av.classList.add("ch-profile-avatar")
            hd.appendChild(av)
            const inf = el("div", { className: "ch-profile-info" })
            inf.appendChild(el("div", { className: "ch-profile-name" }, char.handle || char.name || "未命名"))
            if (char.bio) inf.appendChild(el("div", { className: "ch-profile-bio" }, char.bio))
            hd.appendChild(inf); card.appendChild(hd)

            const charStats = state.charStatsMap[charId]

            if (state.charStatsLoading) {
              const ld = el("div", { className: "ch-char-stats-loading" })
              ld.innerHTML = '<div class="ch-match-loading-spinner"></div><div style="margin-top:8px;">正在为角色生成战绩资料…</div>'
              card.appendChild(ld)
            } else if (charStats) {
              card.appendChild(renderStatsDisplay(charStats, charId))

              // 按钮行：刷新 + 保存到记忆
              const actRow = el("div", { className: "ch-char-stats-refresh" })
              actRow.appendChild(el("button", {
                className: "ch-btn ch-btn-secondary", style: "font-size:12px;padding:5px 12px;",
                async onClick() { await generateCharStats(charId); render() }
              }, "🔄 刷新战绩"))

              // 保存战绩到记忆按钮
              actRow.appendChild(el("button", {
                className: "ch-btn ch-btn-secondary", style: "font-size:12px;padding:5px 12px;",
                async onClick() {
                  if (!state.writeToMainMemory) { roche.ui.toast("请先在设置中开启「允许写入主记忆」"); return }
                  const convId = await getConvIdForChar(charId)
                  if (!convId) { roche.ui.toast("该角色无可用会话，无法写入记忆"); return }

                  const who = char.name || char.handle || "角色"
                  const cs = state.charStatsMap[charId]
                  const parts = []
                  if (cs.rank) parts.push("段位: " + cs.rank)
                  if (cs.winRate) parts.push("胜率: " + cs.winRate + "%")
                  if (cs.peakScore) parts.push("巅峰赛分数: " + cs.peakScore)
                  const hh = resolveHighestHonor(cs)
                  if (hh) parts.push("最高战力标: " + hh)
                  const hwb = resolveHeroesWithBadge(cs)
                  if (hwb.length > 0) parts.push("英雄战力: " + hwb.map(h => h.name + (h.badge ? "(" + h.badge + ")" : "")).join("、"))
                  const summaryText = who + " 的王者荣耀战绩：" + parts.join("；")

                  const ok = await roche.ui.confirm({ title: "保存战绩到记忆", message: `将以下内容写入 Roche 主记忆：\n\n${summaryText}\n\n注意：主记忆不会随插件卸载删除。` })
                  if (!ok) return

                  try {
                    await roche.memory.write({ conversationId: convId, summaryText, who: [who], action: "更新了王者荣耀战绩", when: new Date().toLocaleDateString("zh-CN"), where: "王者营地插件", source: "plugin" })
                    roche.ui.toast("已保存到记忆")
                  } catch (e) { roche.ui.toast("写入失败：" + (e.message || e)) }
                }
              }, "💾 保存战绩到记忆"))

              card.appendChild(actRow)
            } else {
              card.appendChild(el("div", { className: "ch-char-stats-loading" }, "战绩数据为空，正在生成…"))
              generateCharStats(charId).then(() => render())
            }

            // 绑定面具参考
            const boundPid = state.friendPersonaBindings[charId]
            if (boundPid) {
              const bs = state.statsMap[boundPid], bp = state.personas.find(p => p.id === boundPid)
              if (bs && bp && (bs.rank || bs.winRate)) {
                const rs = el("div", { style: "margin-top:8px;padding:8px 12px;background:rgba(255,255,255,0.02);border-radius:8px;border:1px solid rgba(255,255,255,0.04);" })
                rs.appendChild(el("div", { style: "font-size:11px;color:#666;" }, `📎 绑定面具参考（${bp.handle || bp.name}）：段位 ${bs.rank || "—"}，胜率 ${bs.winRate || "—"}%`))
                card.appendChild(rs)
              }
            }

            // 绑定面具下拉
            const br = el("div", { className: "ch-persona-bind-row" })
            br.appendChild(el("span", { className: "ch-persona-bind-label" }, "绑定面具："))
            const bsel = el("select", { className: "ch-select", style: "flex:1;", async onChange() { if (this.value) state.friendPersonaBindings[charId] = this.value; else delete state.friendPersonaBindings[charId]; await roche.storage.set("friendPersonaBindings", state.friendPersonaBindings); roche.ui.toast("面具绑定已更新"); render() } })
            const no = el("option", { value: "" }, "— 不绑定 —"); if (!boundPid) no.selected = true; bsel.appendChild(no)
            for (const p of state.personas) { const o = el("option", { value: p.id }, p.handle || p.name || "未命名"); if (p.id === boundPid) o.selected = true; bsel.appendChild(o) }
            br.appendChild(bsel); card.appendChild(br)

            wrap.appendChild(card)
            wrap.appendChild(renderMatchSection(true))
            return wrap
          }

          render()
        },

        async unmount(container, roche) {
          const app = this
          if (app._cleanups) { for (const fn of app._cleanups) { try { fn() } catch (e) {} } app._cleanups = [] }
          app._state = null; container.replaceChildren()
        }
      }
    ]
  })
})()

