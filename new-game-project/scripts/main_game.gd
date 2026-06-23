extends Control

var current_tab = "dungeon"
var selected_floor = 1
var in_combat = false
var current_hero: Dictionary = {}
var polling = false

var hero_stats_label: RichTextLabel
var floor_selector: OptionButton
var monster_preview: VBoxContainer
var dungeon_panel: Control
var equip_panel: Control
var tab_content: Control
var combat_ui: Control
var combat_text: RichTextLabel
var round_counter: RichTextLabel
var party_panel: Control

const BG_DARK = Color("#0f0f1a")
const BG_PANEL = Color("#1a1a2e")
const BG_CARD = Color("#222240")
const ACCENT = Color("#f59e0b")
const TEXT_GOLD = Color("#fbbf24")
const TEXT_DIM = Color("#8888aa")
const HP_GREEN = Color("#22c55e")
const BOSS_RED = Color("#dc2626")
const DMG_ORANGE = Color("#f97316")
const HEAL_GREEN = Color("#22c55e")

var ws: WebSocketPeer = null
var ws_timer: Timer = null

func _ready() -> void:
	_show_login()

func _show_login() -> void:
	for c in get_children(): c.queue_free()
	_setup_bg()
	var vbox = VBoxContainer.new()
	vbox.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	vbox.offset_left = 300; vbox.offset_right = -300; vbox.offset_top = 100
	vbox.add_theme_constant_override("separation", 12)
	add_child(vbox)
	_make_label(vbox, "[center][color=#fbbf24]⚔ Jake Idler[/color][/center]", 32, true)

	var uname = LineEdit.new()
	uname.placeholder_text = "Username"; uname.custom_minimum_size.y = 36
	vbox.add_child(uname)
	var passw = LineEdit.new()
	passw.placeholder_text = "Password"; passw.secret = true; passw.custom_minimum_size.y = 36
	vbox.add_child(passw)
	var err = Label.new()
	err.add_theme_color_override("font_color", BOSS_RED)
	vbox.add_child(err)

	vbox.add_child(_make_btn("Login", func(): _login(uname.text, passw.text, err)))
	vbox.add_child(_make_btn("Guest", func(): _guest(err)))
	vbox.add_child(_make_btn("Register", func(): _register(uname.text, passw.text, err)))

func _login(u, p, e):
	if u.length() < 1 or p.length() < 1: e.text = "Fill both fields"; return
	var r = await ServerClient.login(u, p)
	if r.get("_ok", false): _connect_ws(); _fetch_heroes()
	else: e.text = r.get("error", "Failed")

func _guest(e):
	var r = await ServerClient.guest_login()
	if r.get("_ok", false): _connect_ws(); _fetch_heroes()
	else: e.text = r.get("error", "Failed")

func _register(u, p, e):
	if u.length() < 3 or p.length() < 6: e.text = "User 3+, pass 6+"; return
	var r = await ServerClient.register(u, p)
	if r.get("_ok", false): _connect_ws(); _fetch_heroes()
	else: e.text = r.get("error", "Failed")

func _connect_ws():
	if ws: return
	ws = WebSocketPeer.new()
	var url = "ws://localhost:3001/godot?token=" + ServerClient.auth_token
	if ws.connect_to_url(url) != OK: push_error("WS failed"); return
	ws_timer = Timer.new()
	add_child(ws_timer); ws_timer.timeout.connect(_poll_ws); ws_timer.start(0.5)

func _poll_ws():
	if not ws or ws.get_ready_state() != WebSocketPeer.STATE_OPEN: return
	ws.poll()
	while ws.get_available_packet_count() > 0:
		var pkt = ws.get_packet().get_string_from_utf8()
		var msg = JSON.parse_string(pkt)
		if msg: print("[WS] ", JSON.stringify(msg))

func _fetch_heroes():
	for c in get_children(): c.queue_free()
	_setup_bg()
	var vbox = VBoxContainer.new()
	vbox.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	vbox.offset_left = 300; vbox.offset_right = -300; vbox.offset_top = 50
	vbox.add_theme_constant_override("separation", 8)
	add_child(vbox)
	_make_label(vbox, "[center][color=#fbbf24]Select Hero[/color][/center]", 26, true)

	var r = await ServerClient.get_heroes()
	if r.get("_ok", false) and r.heroes:
		for h in r.heroes:
			vbox.add_child(_make_btn(h.name + "  Lv." + str(h.level), func(): _select_hero(h)))

	var inp = LineEdit.new(); inp.placeholder_text = "New hero name"
	vbox.add_child(inp)
	vbox.add_child(_make_btn("Create", func(): 
		if inp.text.length() >= 2: var rr = await ServerClient.create_hero(inp.text); if rr.get("_ok", false) and rr.hero: _select_hero(rr.hero)
	))

func _select_hero(h):
	current_hero = h; ServerClient.current_hero_id = h.id; _build_main_ui()

func _build_main_ui():
	for c in get_children(): c.queue_free(); _setup_bg()
	var main = VBoxContainer.new()
	main.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	main.offset_left = 192; main.offset_right = -192; main.offset_top = 20; main.offset_bottom = -20
	main.add_theme_constant_override("separation", 10)
	add_child(main)

	var t = _make_label(main, "[color=#fbbf24]" + current_hero.name + "  Lv." + str(current_hero.level) + "[/color]", 26, true)
	t.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	hero_stats_label = _make_label(main, "[center]Loading...[/center]", 14, true)

	var tabs = HBoxContainer.new(); tabs.alignment = BoxContainer.ALIGNMENT_CENTER; tabs.add_theme_constant_override("separation", 8)
	main.add_child(tabs)
	var db = _make_tab(tabs, "⚔ Dungeon", "dungeon"); var eb = _make_tab(tabs, "🛡 Equipment", "equipment"); var pb = _make_tab(tabs, "👥 Party", "party")
	db.button_pressed = true
	db.toggled.connect(func(t): if t: _switch_tab("dungeon"))
	eb.toggled.connect(func(t): if t: _switch_tab("equipment"))
	pb.toggled.connect(func(t): if t: _switch_tab("party"))

	tab_content = VBoxContainer.new(); tab_content.size_flags_vertical = SIZE_EXPAND_FILL; main.add_child(tab_content)
	_refresh_stats()
	_build_dungeon_tab(); _build_equip_tab(); _build_party_tab()

	combat_ui = VBoxContainer.new(); combat_ui.name = "combat_ui"; combat_ui.hide()
	combat_ui.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	combat_ui.offset_left = 192; combat_ui.offset_right = -192; combat_ui.offset_top = 20; combat_ui.offset_bottom = -20
	add_child(combat_ui)

func _refresh_stats():
	var s = current_hero.get("stats", {})
	if hero_stats_label:
		hero_stats_label.text = "[center]ATK [color=#f97316]" + str(s.get("atk", 0)) + "[/color]  ·  DEF [color=#38bdf8]" + str(s.get("def", 0)) + "[/color]  ·  HP [color=#22c55e]" + str(s.get("hp", 0)) + "[/color]  ·  💰 [color=#fbbf24]" + str(current_hero.get("gold", 0)) + "[/color][/center]"

func _switch_tab(tab):
	if dungeon_panel: dungeon_panel.visible = tab == "dungeon"
	if equip_panel: equip_panel.visible = tab == "equipment"
	if party_panel: party_panel.visible = tab == "party"

func _build_dungeon_tab():
	dungeon_panel = VBoxContainer.new(); dungeon_panel.add_theme_constant_override("separation", 8)
	tab_content.add_child(dungeon_panel)
	var row = HBoxContainer.new(); dungeon_panel.add_child(row)
	floor_selector = OptionButton.new()
	var f = current_hero.get("current_floor", 1)
	for i in range(1, f + 1): floor_selector.add_item("Floor " + str(i), i)
	floor_selector.select(0); floor_selector.item_selected.connect(_on_floor_selected)
	row.add_child(floor_selector)
	row.add_child(_make_btn("⚔ Enter Dungeon", _start_combat))
	monster_preview = VBoxContainer.new(); dungeon_panel.add_child(monster_preview)
	_refresh_monster_preview()

func _refresh_monster_preview():
	for c in monster_preview.get_children(): c.queue_free()
	_make_label(monster_preview, "[color=#8888aa]Loading monsters...[/color]", 12, true)
	var r = await ServerClient.get_dungeon(current_hero.id)
	for c in monster_preview.get_children(): c.queue_free()
	if r.get("_ok", false) and r.floor:
		_make_label(monster_preview, "[color=#8888aa]Monsters:[/color]", 12, true)
		for m in r.floor.monsters:
			var c2 = "#ef4444" if m.is_boss else "#f0f0f0"
			_make_label(monster_preview, "[color=" + c2 + "]  " + ("👹 " if m.is_boss else "👾 ") + m.name + "  HP:" + str(m.stats.hp) + "  ATK:" + str(m.stats.atk) + "  DEF:" + str(m.stats.def) + "[/color]", 12, true)

func _on_floor_selected(idx):
	selected_floor = floor_selector.get_item_id(idx)

func _build_equip_tab():
	equip_panel = VBoxContainer.new(); equip_panel.hide()
	equip_panel.size_flags_vertical = SIZE_EXPAND_FILL; equip_panel.size_flags_horizontal = SIZE_EXPAND_FILL
	tab_content.add_child(equip_panel)
	
	var equip = load("res://scenes/equipment_tab.tscn").instantiate()
	equip.name = "equip_dnd"
	equip.size_flags_horizontal = SIZE_EXPAND_FILL; equip.size_flags_vertical = SIZE_EXPAND_FILL
	equip_panel.add_child(equip)
	equip.refresh_requested.connect(_build_main_ui)

func _card(txt, color = BG_CARD):
	var l = RichTextLabel.new(); l.bbcode_enabled = true; l.text = txt; l.fit_content = true; l.add_theme_font_size_override("normal_font_size", 11)
	var p = PanelContainer.new(); p.add_theme_stylebox_override("panel", _make_style(color, Color("#333355"))); p.add_child(l); return p

func _build_party_tab():
	party_panel = VBoxContainer.new(); party_panel.hide()
	party_panel.size_flags_vertical = SIZE_EXPAND_FILL; party_panel.size_flags_horizontal = SIZE_EXPAND_FILL
	tab_content.add_child(party_panel)
	
	var party = load("res://scenes/party_tab.tscn").instantiate()
	party.name = "party_system"
	party.size_flags_horizontal = SIZE_EXPAND_FILL; party.size_flags_vertical = SIZE_EXPAND_FILL
	party_panel.add_child(party)
	party.refresh_requested.connect(_build_main_ui)

func _start_combat():
	if in_combat: return; in_combat = true
	var r = await ServerClient.start_combat(current_hero.id, selected_floor)
	if not r.get("_ok", false): in_combat = false; return
	combat_ui.show(); combat_ui.modulate.a = 0.0
	create_tween().tween_property(combat_ui, "modulate:a", 1.0, 0.3)
	for c in combat_ui.get_children(): c.queue_free()
	combat_ui.add_child(VBoxContainer.new()); combat_ui.get_child(0).name = "monsters"	
	_make_label(combat_ui, "[center][color=#fbbf24]⚔  VS  ⚔[/color][/center]", 26, true)
	combat_ui.add_child(VBoxContainer.new()); combat_ui.get_child(2).name = "party"
	round_counter = _make_label(combat_ui, "[center][color=#f59e0b]Round 0[/color][/center]", 18, true)
	combat_text = RichTextLabel.new(); combat_text.bbcode_enabled = true; combat_text.size_flags_vertical = SIZE_EXPAND_FILL
	combat_ui.add_child(combat_text)
	polling = true; _poll_loop()

func _poll_loop():
	while polling:
		var r = await ServerClient.get_combat_status(current_hero.id)
		if r.get("finished", false): polling = false; _on_combat_finished(r); return
		if r.get("round"): _update_round(r.round)
		await get_tree().create_timer(1.5).timeout

func _update_round(mon):
	var ma = combat_ui.get_node("monsters"); var pa = combat_ui.get_node("party")
	if not ma or not pa: return
	for c in ma.get_children(): c.queue_free()
	var is_boss = mon.get("current_monster_is_boss", false)
	_make_label(ma, "[color=#ef4444]" + ("👹 " if is_boss else "👾 ") + mon.get("current_monster_name", "?") + "[/color]", 18, true)
	ma.add_child(_hp_bar(mon.monster_max_hp, mon.monster_hp, 500))
	if mon.monster_just_killed: _make_label(ma, "[color=#ef4444]💀 DEFEATED![/color]", 16, true)
	for c in pa.get_children(): c.queue_free()
	for h in mon.get("party_heroes", []):
		var row = HBoxContainer.new(); row.add_theme_constant_override("separation", 8)
		var ic = {"tank":"🛡️","dps":"⚔️","healer":"💚"}.get(h.role,"❓")
		_make_label(row, "[color=#f0f0f0]" + ic + " " + str(h.hero_id).substr(0, 8) + "  [/color]", 11, true)
		row.add_child(_hp_bar(h.max_hp, h.hp, 200))
		_make_label(row, "[color=#8888aa]" + str(h.hp) + "/" + str(h.max_hp) + "[/color]", 10, true)
		if h.damage_taken > 0: _make_label(row, "[color=#ef4444]-" + str(h.damage_taken) + "[/color]", 11, true)
		if h.healing_done > 0: _make_label(row, "[color=#22c55e]+" + str(h.healing_done) + "[/color]", 11, true)
		if not h.alive: _make_label(row, "[color=#ef4444]💀[/color]", 12, true)
		pa.add_child(row)
	if round_counter: round_counter.text = "[center][color=#f59e0b]Round " + str(mon.round) + "[/color][/center]"

func _on_combat_finished(r):
	in_combat = false; combat_ui.hide()
	var d = AcceptDialog.new(); d.title = "Result"
	if r.floor_completed:
		d.dialog_text = "[center][color=#fbbf24]Victory![/color][/center]\nFloor cleared!"
		_refresh_stats()
	else:
		d.dialog_text = "[center][color=#ef4444]Wipe![/color][/center]\nDefeated."
	add_child(d); d.popup_centered()
	d.confirmed.connect(_build_main_ui)

func _setup_bg():
	var bg = ColorRect.new(); bg.color = BG_DARK; bg.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(bg); move_child(bg, 0)

func _make_style(bg, border = Color.TRANSPARENT):
	var s = StyleBoxFlat.new(); s.bg_color = bg; s.border_color = border
	s.set_border_width_all(2); s.set_corner_radius_all(4)
	s.content_margin_left = 10; s.content_margin_right = 10; s.content_margin_top = 6; s.content_margin_bottom = 6; return s

func _make_label(par, txt, size = 14, rich = false):
	if rich:
		var l = RichTextLabel.new(); l.bbcode_enabled = true; l.text = txt; l.fit_content = true
		l.add_theme_font_size_override("normal_font_size", size); par.add_child(l); return l
	else:
		var l = Label.new(); l.text = txt; l.add_theme_font_size_override("font_size", size); par.add_child(l); return l

func _make_btn(txt, cb):
	var b = Button.new(); b.text = txt; b.pressed.connect(cb)
	b.custom_minimum_size.y = 34
	b.add_theme_stylebox_override("normal", _make_style(BG_CARD, Color("#3a3a5a")))
	b.add_theme_stylebox_override("hover", _make_style(Color("#333366"), ACCENT))
	b.add_theme_stylebox_override("pressed", _make_style(BG_DARK, ACCENT))
	b.add_theme_color_override("font_color", Color("#f0f0f0")); b.add_theme_color_override("font_hover_color", Color("#fbbf24"))
	return b

func _make_tab(par, txt, tab):
	var b = _make_btn(txt, func(): pass); b.toggle_mode = true
	b.toggled.connect(func(t): if t: _switch_tab(tab)); b.custom_minimum_size.x = 130; par.add_child(b); return b

func _hp_bar(maxv, curv, w = 300):
	var bar = ProgressBar.new(); bar.max_value = maxv; bar.value = curv; bar.custom_minimum_size = Vector2(w, 20)
	bar.show_percentage = false
	bar.add_theme_stylebox_override("background", _make_style(Color("#111122"), Color("#222244")))
	var f = StyleBoxFlat.new(); f.bg_color = HP_GREEN; bar.add_theme_stylebox_override("fill", f); return bar
