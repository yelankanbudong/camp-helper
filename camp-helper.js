       * ══════════════════════════════════════ */
          function renderEditMemoryModal() {
            const ov = el("div", { className: `ch-modal-overlay ${state.editMemoryModalOpen ? "open" : ""}` })
            const md = el("div", { className: "ch-modal" })
            md.appendChild(el("div", { className: "ch-modal-header" }, "编辑记忆"))
            const bd = el("div", { className: "ch-modal-body" })
            const ta = el("textarea", { className: "ch-edit-textarea", placeholder: "记忆内容…", rows: "5" })
            ta.value = state.memoryEditText || ""
            ta.addEventListener("input", function () { state.memoryEditText = this.value })
            bd.appendChild(ta)
            md.appendChild(bd)
            const ft = el("div", { className: "ch-modal-footer" })
            ft.appendChild(el("button", { className: "ch-btn ch-btn-secondary", onClick() { state.editMemoryModalOpen = false; state.memoryEditId = null; state.memoryEditText = ""; render() } }, "取消"))
            ft.appendChild(el("button", {
              className: "ch-btn ch-btn-primary",
              async onClick() {
                const id = state.memoryEditId
                const newText = state.memoryEditText.trim()
                if (!id) { roche.ui.toast("无法编辑：缺少记忆 ID"); return }
                if (!newText) { roche.ui.toast("内容不能为空"); return }
                try {
                  await roche.memory.update(id, { summaryText: newText })
                  // 同步更新本地列表
                  const found = state.memoryList.find(x => x.id === id)
                  if (found) { found.summaryText = newText; found.action = newText; found.text = newText }
                  state.editMemoryModalOpen = false; state.memoryEditId = null; state.memoryEditText = ""
                  roche.ui.toast("记忆已更新")
                  render()
                } catch (e) { roche.ui.toast("更新失败：" + (e.message || e)) }
              }
            }, "保存"))
            md.appendChild(ft); ov.appendChild(md)
            ov.addEventListener("click", (e) => { if (e.target === ov) { state.editMemoryModalOpen = false; state.memoryEditId = null; state.memoryEditText = ""; render() } })
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
                  const hwb = normalizeHeroesWithBadge(cs)
                  if (hwb.length > 0) {
                    const heroBadgeStr = hwb.map(h => h.name + "(" + h.badge + ")").join("、")
                    parts.push("英雄战力: " + heroBadgeStr)
                  }
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

