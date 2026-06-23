extends Node

# ─── Hero Stats ───────────────────────────────────────────────
var hero_name: String = ""
var hero_level: int = 0
var hero_gold: int = 0
var hero_current_floor: int = 1
var hero_photo_path: String = ""

# Equipment: slot → { id, slot, type, level, rarity, stats: {atk, def, hp} }
var equipped: Dictionary = {}
var inventory: Array = []

# Party roles: player + bots
var party_members: Array = []  # [{ hero_id, name, role, position, level, equipped }]

# Shards
var shards: Dictionary = {
	"common": 0, "uncommon": 0, "rare": 0, "epic": 0, "legendary": 0
}

# ─── Constants ────────────────────────────────────────────────
enum Rarity { COMMON, UNCOMMON, RARE, EPIC, LEGENDARY }
enum Role { DPS, TANK, HEALER }
enum Position { FRONT, MIDDLE, REAR }

const RARITY_FLAT: Dictionary = {
	Rarity.COMMON: 0,
	Rarity.UNCOMMON: 10,
	Rarity.RARE: 20,
	Rarity.EPIC: 30,
	Rarity.LEGENDARY: 40,
}

const SLOT_MULTIPLIER: Dictionary = {
	"rightHandWeapon": 5,
	"leftHand": 5,
	"helmet": 2,
	"body": 2,
	"legs": 2,
	"boots": 2,
	"gloves": 2,
	"necklace": 2,
	"leftRing": 2,
	"rightRing": 2,
	"leftEarring": 2,
	"rightearring": 2,
}

const SLOT_CATEGORY: Dictionary = {
	"rightHandWeapon": "weapon",
	"leftHand": "weapon",
	"helmet": "armor",
	"body": "armor",
	"legs": "armor",
	"boots": "armor",
	"gloves": "armor",
	"necklace": "accessory",
	"leftRing": "accessory",
	"rightRing": "accessory",
	"leftEarring": "accessory",
	"rightearring": "accessory",
}

const ALL_SLOTS: Array = [
	"rightHandWeapon", "leftHand",
	"helmet", "body", "legs", "boots", "gloves",
	"necklace", "leftRing", "rightRing", "leftEarring", "rightearring",
]

# ─── Stat Computation ─────────────────────────────────────────

func compute_item_stats(slot: String, level: int, rarity: int) -> Dictionary:
	var mult = SLOT_MULTIPLIER.get(slot, 1)
	var flat = RARITY_FLAT.get(rarity, 0)
	var cat = SLOT_CATEGORY.get(slot, "accessory")
	var atk = 0; var def = 0; var hp = 0
	if cat == "weapon":
		atk = level * mult + flat
	elif cat == "armor":
		def = level * mult + flat
	else:
		hp = level * mult + flat
	return { "atk": atk, "def": def, "hp": hp }

func compute_hero_stats() -> Dictionary:
	var atk = 0; var def = 0; var hp = 0
	for slot in ALL_SLOTS:
		var item = equipped.get(slot)
		if item:
			atk += item.stats.atk
			def += item.stats.def
			hp += item.stats.hp
	# Level bonus
	var bonus = hero_level * 5
	return { "atk": atk + bonus, "def": def + bonus, "hp": hp + bonus }

# ─── Starter Gear ─────────────────────────────────────────────

func create_starter_equipment() -> void:
	equipped.clear()
	inventory.clear()
	hero_gold = 0
	shards = { "common": 0, "uncommon": 0, "rare": 0, "epic": 0, "legendary": 0 }
	hero_level = 0
	hero_current_floor = 1

	var weapon_types = ["melee", "range", "mage"]
	for t in weapon_types:
		var slot = "rightHandWeapon"
		var item = _make_item(slot, t, 10, Rarity.COMMON)
		if t == "melee": equipped[slot] = item
		else: inventory.append(item)

	for t in weapon_types:
		var slot = "leftHand"
		var item = _make_item(slot, t, 10, Rarity.COMMON)
		if t == "melee": equipped[slot] = item
		else: inventory.append(item)

	for slot in ["helmet", "body", "legs", "boots", "gloves"]:
		equipped[slot] = _make_item(slot, "universal", 10, Rarity.COMMON)
	for slot in ["necklace", "leftRing", "rightRing", "leftEarring", "rightearring"]:
		equipped[slot] = _make_item(slot, "universal", 10, Rarity.COMMON)

func _make_item(slot: String, type: String, level: int, rarity: int) -> Dictionary:
	return {
		"id": str(randi()),
		"slot": slot,
		"type": type,
		"level": level,
		"rarity": rarity,
		"stats": compute_item_stats(slot, level, rarity)
	}

# ─── Save / Load ──────────────────────────────────────────────

func save_game() -> void:
	var data = {
		"hero_name": hero_name,
		"hero_level": hero_level,
		"hero_gold": hero_gold,
		"hero_current_floor": hero_current_floor,
		"hero_photo_path": hero_photo_path,
		"equipped": equipped,
		"inventory": inventory,
		"shards": shards,
	}
	var file = FileAccess.open("user://save.json", FileAccess.WRITE)
	if file:
		file.store_string(JSON.stringify(data))
		file.close()

func load_game() -> bool:
	var file = FileAccess.open("user://save.json", FileAccess.READ)
	if not file:
		return false
	var text = file.get_as_text()
	file.close()
	var json = JSON.parse_string(text)
	if typeof(json) != TYPE_DICTIONARY:
		return false
	hero_name = json.get("hero_name", "")
	hero_level = json.get("hero_level", 0)
	hero_gold = json.get("hero_gold", 0)
	hero_current_floor = json.get("hero_current_floor", 1)
	hero_photo_path = json.get("hero_photo_path", "")
	equipped = json.get("equipped", {})
	inventory = json.get("inventory", [])
	shards = json.get("shards", { "common": 0, "uncommon": 0, "rare": 0, "epic": 0, "legendary": 0 })
	return true
