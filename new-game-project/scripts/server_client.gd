extends Node

const BASE_URL = "http://localhost:3001"

var auth_token: String = ""
var player_id: String = ""
var player_name: String = ""
var current_hero_id: String = ""
var current_hero: Dictionary = {}

var _client: HTTPClient = null

func _ready() -> void:
	_client = HTTPClient.new()

func _method(m: String) -> int:
	match m.to_upper():
		"GET": return HTTPClient.METHOD_GET
		"POST": return HTTPClient.METHOD_POST
		"PUT": return HTTPClient.METHOD_PUT
		"DELETE": return HTTPClient.METHOD_DELETE
	return HTTPClient.METHOD_GET

func _request(method: String, path: String, body: Dictionary = {}) -> Dictionary:
	_client.close()
	var err = _client.connect_to_host("localhost", 3001)
	if err != OK:
		return {"error": "connect failed: " + str(err)}
	
	# Wait for connection
	var status = _client.get_status()
	while status == HTTPClient.STATUS_RESOLVING or status == HTTPClient.STATUS_CONNECTING:
		_client.poll()
		await get_tree().process_frame
		status = _client.get_status()

	if status != HTTPClient.STATUS_CONNECTED:
		return {"error": "connection failed, status: " + str(status)}

	# Build request
	var headers = ["Content-Type: application/json"]
	if auth_token:
		headers.append("Authorization: Bearer " + auth_token)

	var body_str = ""
	if not body.is_empty():
		body_str = JSON.stringify(body)

	# Send request (with body if present)
	if body_str.length() > 0:
		err = _client.request_raw(_method(method), path, headers, body_str.to_utf8_buffer())
	else:
		err = _client.request(_method(method), path, headers)
	if err != OK:
		return {"error": "request failed: " + str(err)}

	# Wait for response headers
	while _client.get_status() == HTTPClient.STATUS_REQUESTING:
		_client.poll()
		await get_tree().process_frame

	# Read response
	var response_code = _client.get_response_code()
	var response_body = PackedByteArray()
	
	var body_status = _client.get_status()
	while body_status == HTTPClient.STATUS_BODY or (body_status == HTTPClient.STATUS_CONNECTED and response_body.size() == 0):
		_client.poll()
		var chunk = _client.read_response_body_chunk()
		if chunk.size() > 0:
			response_body.append_array(chunk)
		await get_tree().process_frame
		body_status = _client.get_status()

	_client.close()

	return _parse(response_code, response_body)

func _parse(code: int, body: PackedByteArray) -> Dictionary:
	var raw = body.get_string_from_utf8()
	var data = {}
	if not raw.is_empty():
		data = JSON.parse_string(raw)
		if data == null:
			data = {"raw": raw}
	data["_code"] = code
	data["_ok"] = code >= 200 and code < 300
	if not data.get("_ok", false) and data.get("error") == null:
		data["error"] = "HTTP " + str(code)
	return data

# ─── Auth ─────────────────────────────────────────────────

func guest_login() -> Dictionary:
	var result = await _request("POST", "/api/auth/guest")
	if result.get("token"):
		auth_token = result.token; player_id = result.player.id; player_name = result.player.username
	return result

func register(username: String, password: String) -> Dictionary:
	var result = await _request("POST", "/api/auth/register", {"username": username, "password": password})
	if result.get("token"):
		auth_token = result.token; player_id = result.player.id; player_name = result.player.username
	return result

func login(username: String, password: String) -> Dictionary:
	var result = await _request("POST", "/api/auth/login", {"username": username, "password": password})
	if result.get("token"):
		auth_token = result.token; player_id = result.player.id; player_name = result.player.username
	return result

# ─── Heroes ───────────────────────────────────────────────

func get_heroes() -> Dictionary:
	return await _request("GET", "/api/heroes")

func create_hero(name: String) -> Dictionary:
	return await _request("POST", "/api/heroes", {"name": name})

func get_hero(hero_id: String) -> Dictionary:
	return await _request("GET", "/api/heroes/" + hero_id)

func equip_item(hero_id: String, equipment_id: String, slot: String) -> Dictionary:
	return await _request("POST", "/api/heroes/" + hero_id + "/equip", {"equipmentId": equipment_id, "slot": slot})

func unequip_item(hero_id: String, slot: String) -> Dictionary:
	return await _request("POST", "/api/heroes/" + hero_id + "/unequip", {"slot": slot})

# ─── Party ────────────────────────────────────────────────

func create_party(name: String) -> Dictionary:
	return await _request("POST", "/api/party/create", {"name": name})

func get_party() -> Dictionary:
	return await _request("GET", "/api/party")

func invite_player(username: String) -> Dictionary:
	return await _request("POST", "/api/party/invite", {"username": username})

func join_party(party_id: String) -> Dictionary:
	return await _request("POST", "/api/party/join", {"partyId": party_id})

func leave_party() -> Dictionary:
	return await _request("POST", "/api/party/leave")

func add_bot(role: String) -> Dictionary:
	return await _request("POST", "/api/party/bot", {"role": role})

func remove_bot(bot_id: String) -> Dictionary:
	return await _request("DELETE", "/api/party/bot/" + bot_id)

func set_role(role: String) -> Dictionary:
	return await _request("PUT", "/api/party/role", {"role": role})

func get_invites() -> Dictionary:
	return await _request("GET", "/api/party/invites")

# ─── Dungeon ──────────────────────────────────────────────

func get_dungeon(hero_id: String) -> Dictionary:
	return await _request("GET", "/api/heroes/" + hero_id + "/dungeon")

func start_combat(hero_id: String, floor: int = -1) -> Dictionary:
	var body = {}
	if floor > 0: body["floor"] = floor
	return await _request("POST", "/api/heroes/" + hero_id + "/combat/start", body)

func get_combat_status(hero_id: String) -> Dictionary:
	return await _request("GET", "/api/heroes/" + hero_id + "/combat/status")
