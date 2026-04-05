// ═══════════════════════════════════════════════════════════════
//  NETWORK — PeerJS WebRTC multiplayer
// ═══════════════════════════════════════════════════════════════

const NET = {
    peer: null,
    connections: [],   // host: array of client connections; client: [hostConnection]
    isHost: false,
    isOnline: false,
    roomCode: '',
    playerIndex: 0,    // first local player index
    localPlayerCount: 1, // how many players on THIS device (1 or 2)
    maxPlayers: 4,
    lobbyPlayers: [],  // { id, classId, ready, local }
    remoteInputs: {},  // playerIndex -> input state
    lastState: null,
    stateInterval: null,
};

function generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
}

function createRoom(localCount) {
    NET.isHost = true;
    NET.isOnline = true;
    NET.localPlayerCount = localCount || 1;
    NET.roomCode = generateRoomCode();
    NET.playerIndex = 0;
    NET.lobbyPlayers = [{ id: 'host-p1', classId: null, ready: false }];
    if (NET.localPlayerCount >= 2) {
        NET.lobbyPlayers.push({ id: 'host-p2', classId: null, ready: false });
    }
    NET.connections = [];

    document.getElementById('room-code-display').textContent = NET.roomCode;
    document.getElementById('lobby-status').textContent = 'Waiting for players...';
    showScreen('lobby-screen');
    updateLobbyUI();

    const peerId = 'dc-' + NET.roomCode.toLowerCase();
    const iceServers = [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' }
    ];
    NET.peer = new Peer(peerId, { debug: 0, config: { iceServers } });

    NET.peer.on('open', () => {
        document.getElementById('lobby-status').textContent = 'Room open! Share the code.';
    });

    NET.peer.on('connection', (conn) => {
        const totalPlayers = NET.lobbyPlayers.length;
        if (totalPlayers >= NET.maxPlayers) {
            conn.on('open', () => { conn.send({ type: 'full' }); conn.close(); });
            return;
        }
        // Assign player index based on current lobby size
        const pIdx = totalPlayers;
        conn._playerIndex = pIdx;
        conn._localCount = 1; // updated when client sends info
        NET.connections.push(conn);
        NET.lobbyPlayers.push({ id: conn.peer, classId: null, ready: false });

        conn.on('open', () => {
            conn.send({ type: 'welcome', playerIndex: pIdx, roomCode: NET.roomCode });
            broadcastLobby();
        });

        conn.on('data', (data) => handleHostReceive(data, conn));

        conn.on('close', () => {
            NET.connections = NET.connections.filter(c => c !== conn);
            NET.lobbyPlayers = NET.lobbyPlayers.filter(lp => lp.id !== conn.peer);
            broadcastLobby();
            updateLobbyUI();
        });

        updateLobbyUI();
    });

    NET.peer.on('error', (err) => {
        console.error('Peer error:', err);
        document.getElementById('lobby-status').textContent = 'Connection error: ' + err.type;
    });
}

function joinRoom(code, localCount) {
    NET.isHost = false;
    NET.isOnline = true;
    NET.localPlayerCount = localCount || 1;
    NET.roomCode = code.toUpperCase();
    NET._joinRetries = 0;
    NET._maxRetries = 3;

    document.getElementById('lobby-status').textContent = 'Connecting...';
    showScreen('lobby-screen');
    document.getElementById('room-code-display').textContent = NET.roomCode;

    attemptJoin();
}

function attemptJoin() {
    // Clean up previous peer if retrying
    if (NET.peer) { try { NET.peer.destroy(); } catch(e) {} }

    const iceServers = [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' }
    ];

    NET.peer = new Peer(undefined, { debug: 0, config: { iceServers } });

    NET.peer.on('open', () => {
        const peerId = 'dc-' + NET.roomCode.toLowerCase();
        const conn = NET.peer.connect(peerId, { reliable: true });
        NET.connections = [conn];

        // Timeout if connection doesn't open in 8 seconds
        const timeout = setTimeout(() => {
            if (!conn.open) {
                console.warn('Connection timed out, retrying...');
                conn.close();
                retryJoin();
            }
        }, 8000);

        conn.on('open', () => {
            clearTimeout(timeout);
            NET._joinRetries = 0;
            document.getElementById('lobby-status').textContent = 'Connected!';
            conn.send({ type: 'localCount', count: NET.localPlayerCount });
        });

        conn.on('data', (data) => handleClientReceive(data, conn));

        conn.on('close', () => {
            clearTimeout(timeout);
            document.getElementById('lobby-status').textContent = 'Disconnected from host.';
            NET.isOnline = false;
        });
    });

    NET.peer.on('error', (err) => {
        console.error('Peer error:', err);
        if (err.type === 'peer-unavailable' || err.type === 'network') {
            retryJoin();
        } else {
            document.getElementById('lobby-status').textContent = 'Failed to connect: ' + err.type;
        }
    });
}

function retryJoin() {
    NET._joinRetries++;
    if (NET._joinRetries <= NET._maxRetries) {
        document.getElementById('lobby-status').textContent = `Retrying... (${NET._joinRetries}/${NET._maxRetries})`;
        setTimeout(attemptJoin, 1500);
    } else {
        document.getElementById('lobby-status').textContent = 'Could not connect. Check the room code and try again.';
    }
}

// ─── HOST: receive from clients ──────────────────────────────
function handleHostReceive(data, conn) {
    switch (data.type) {
        case 'localCount':
            // Client has multiple local players — add extra lobby slots
            conn._localCount = data.count;
            if (data.count >= 2) {
                const extraId = conn.peer + '-p2';
                if (!NET.lobbyPlayers.find(p => p.id === extraId)) {
                    NET.lobbyPlayers.push({ id: extraId, classId: null, ready: false });
                    // Reassign player indices
                    NET.lobbyPlayers.forEach((lp, i) => lp._idx = i);
                    conn._playerIndex2 = NET.lobbyPlayers.length - 1;
                }
            }
            broadcastLobby();
            updateLobbyUI();
            break;
        case 'classSelect':
            const lp = NET.lobbyPlayers.find(p => p.id === conn.peer);
            if (lp) { lp.classId = data.classId; lp.ready = true; }
            broadcastLobby();
            updateLobbyUI();
            break;
        case 'classSelect2':
            // Second local player on client device
            const lp2 = NET.lobbyPlayers.find(p => p.id === conn.peer + '-p2');
            if (lp2) { lp2.classId = data.classId; lp2.ready = true; }
            broadcastLobby();
            updateLobbyUI();
            break;
        case 'input':
            NET.remoteInputs[conn._playerIndex] = data.input;
            break;
        case 'input2':
            // Second local player input from client
            if (conn._playerIndex2 !== undefined) {
                NET.remoteInputs[conn._playerIndex2] = data.input;
            }
            break;
    }
}

// ─── CLIENT: receive from host ──────────────────────────────
function handleClientReceive(data, conn) {
    switch (data.type) {
        case 'welcome':
            NET.playerIndex = data.playerIndex;
            document.getElementById('lobby-status').textContent = `Connected as Player ${data.playerIndex + 1}`;
            break;
        case 'full':
            document.getElementById('lobby-status').textContent = 'Room is full!';
            break;
        case 'lobby':
            NET.lobbyPlayers = data.players;
            updateLobbyUI();
            break;
        case 'startGame':
            // Host is starting the game with these classes and dungeon
            selectedClasses = data.classes;
            coopMode = true;
            NET.isOnline = true;
            // Use host's dungeon instead of generating a new one
            if (data.dungeon) {
                NET._hostDungeon = data.dungeon;
            }
            startGame();
            break;
        case 'gameState':
            applyRemoteGameState(data.state);
            break;
        case 'nextFloor':
            currentFloor = data.floor;
            dungeon = data.dungeon;
            dungeon.rooms[0].explored = true;
            projectiles = [];
            particles = [];
            summonedMinions = [];
            activeBeams = [];
            healingCircles = [];
            lightningNets = [];
            domainExpansion = null;
            enemies = [];
            lootDrops = [];
            break;
    }
}

// ─── LOBBY ──────────────────────────────────────────────────
function broadcastLobby() {
    const msg = { type: 'lobby', players: NET.lobbyPlayers };
    for (const conn of NET.connections) {
        if (conn.open) conn.send(msg);
    }
}

function updateLobbyUI() {
    const list = document.getElementById('lobby-players');
    list.innerHTML = '';
    NET.lobbyPlayers.forEach((lp, i) => {
        const div = document.createElement('div');
        div.className = 'lobby-player';
        const label = i === 0 ? 'Host' : `Player ${i + 1}`;
        const cls = lp.classId ? CLASSES[lp.classId]?.name || lp.classId : 'Choosing...';
        const ready = lp.ready ? ' ✓' : '';
        div.innerHTML = `<span>${label}</span><span>${cls}${ready}</span>`;
        list.appendChild(div);
    });

    // Show start button only for host when 2+ players
    const startBtn = document.getElementById('btn-start-online');
    if (startBtn) {
        startBtn.style.display = (NET.isHost && NET.lobbyPlayers.length >= 2) ? '' : 'none';
    }
}

function checkAllReady() {
    if (!NET.isHost) return;
    // Auto-check not needed — host clicks start
}

let lobbySelectingLocal2 = false; // toggled after P1 picks

function hostSelectClass(classId) {
    if (!lobbySelectingLocal2) {
        NET.lobbyPlayers[0].classId = classId;
        NET.lobbyPlayers[0].ready = true;
        if (NET.localPlayerCount >= 2) {
            lobbySelectingLocal2 = true;
            document.getElementById('lobby-status').textContent = 'Player 2 — choose your class';
        }
    } else {
        // Host's local P2
        const p2 = NET.lobbyPlayers[1]; // host-p2
        if (p2) { p2.classId = classId; p2.ready = true; }
        lobbySelectingLocal2 = false;
        document.getElementById('lobby-status').textContent = 'Ready! Waiting for others or start.';
    }
    broadcastLobby();
    updateLobbyUI();
}

function clientSelectClass(classId) {
    if (!lobbySelectingLocal2) {
        if (NET.connections[0] && NET.connections[0].open) {
            NET.connections[0].send({ type: 'classSelect', classId });
        }
        if (NET.localPlayerCount >= 2) {
            lobbySelectingLocal2 = true;
            document.getElementById('lobby-status').textContent = 'Player 2 — choose your class';
        }
    } else {
        // Client's local P2
        if (NET.connections[0] && NET.connections[0].open) {
            NET.connections[0].send({ type: 'classSelect2', classId });
        }
        lobbySelectingLocal2 = false;
        document.getElementById('lobby-status').textContent = 'Ready!';
    }
}

function hostStartGame() {
    if (!NET.isHost) return;
    // Collect all classes
    const classes = NET.lobbyPlayers.map(lp => lp.classId || 'angel');
    selectedClasses = classes;
    coopMode = true;

    // Generate dungeon on host first
    startGame();

    // Send dungeon data + classes to clients so they have the same map
    for (const conn of NET.connections) {
        if (conn.open) conn.send({ type: 'startGame', classes, dungeon: {
            map: dungeon.map,
            rooms: dungeon.rooms.map(r => ({ x: r.x, y: r.y, w: r.w, h: r.h, type: r.type, explored: r.explored, cx: r.cx, cy: r.cy, enemies: [] })),
            torches: dungeon.torches,
            floor: dungeon.floor
        }});
    }

    // Start broadcasting state
    if (NET.stateInterval) clearInterval(NET.stateInterval);
    NET.stateInterval = setInterval(broadcastGameState, 50); // 20 Hz
}

// ─── STATE SYNC ─────────────────────────────────────────────
function broadcastGameState() {
    if (!NET.isHost || gameState !== 'playing') return;

    const state = {
        players: players.map(p => ({
            x: p.x, y: p.y, hp: p.hp, maxHp: p.maxHp, alive: p.alive,
            facingAngle: p.facingAngle, attackAnim: p.attackAnim, classId: p.classId,
            level: p.level, xp: p.xp, xpToNext: p.xpToNext, dodging: p.dodging,
            invincible: p.invincible, inventoryOpen: p.inventoryOpen,
            damage: p.damage, defense: p.defense, speed: p.speed,
            activeEffects: p.activeEffects,
        })),
        enemies: enemies.filter(e => e.alive).map(e => ({
            x: e.x, y: e.y, hp: e.hp, maxHp: e.maxHp, color: e.color,
            radius: e.radius, enemyType: e.enemyType, type: e.type,
            isBoss: e.isBoss, name: e.name, attackAnim: e.attackAnim,
            stunned: e.stunned, frozen: e.frozen, phase: e.phase
        })),
        projectiles: projectiles.map(p => ({
            x: p.x, y: p.y, vx: p.vx, vy: p.vy, color: p.color,
            radius: p.radius, owner: p.owner, isHollowPurple: p.isHollowPurple
        })),
        currentFloor,
        runStats,
        gameTime,
        domainExpansion: domainExpansion ? {
            x: domainExpansion.x, y: domainExpansion.y,
            radius: domainExpansion.radius, phase: domainExpansion.phase
        } : null,
        summonedMinions: summonedMinions.map(m => ({ x: m.x, y: m.y, hp: m.hp, maxHp: m.maxHp, color: m.color, radius: m.radius })),
        healingCircles: healingCircles.map(h => ({ x: h.x, y: h.y, radius: h.radius, life: h.life, color: h.color })),
        lightningNets: lightningNets.map(l => ({ x: l.x, y: l.y, radius: l.radius, life: l.life, color: l.color })),
        exploredRooms: dungeon.rooms.map(r => r.explored),
    };

    const msg = { type: 'gameState', state };
    for (const conn of NET.connections) {
        if (conn.open) conn.send(msg);
    }
}

function applyRemoteGameState(state) {
    if (NET.isHost) return; // Only clients apply remote state

    gameTime = state.gameTime;
    currentFloor = state.currentFloor;
    runStats = state.runStats;

    // Update players
    state.players.forEach((rp, i) => {
        if (!players[i]) return;
        players[i].x = rp.x;
        players[i].y = rp.y;
        players[i].hp = rp.hp;
        players[i].maxHp = rp.maxHp;
        players[i].alive = rp.alive;
        players[i].facingAngle = rp.facingAngle;
        players[i].attackAnim = rp.attackAnim;
        players[i].level = rp.level;
        players[i].xp = rp.xp;
        players[i].xpToNext = rp.xpToNext;
        players[i].dodging = rp.dodging;
        players[i].invincible = rp.invincible;
        players[i].damage = rp.damage;
        players[i].defense = rp.defense;
        players[i].speed = rp.speed;
        players[i].activeEffects = rp.activeEffects;
    });

    // Update enemies (sync count and state)
    while (enemies.length > state.enemies.length) enemies.pop();
    state.enemies.forEach((re, i) => {
        if (!enemies[i]) {
            enemies.push({ ...re, alive: true, lastAttack: 0, target: null, specialTimer: 0 });
        } else {
            Object.assign(enemies[i], re);
            enemies[i].alive = true;
        }
    });

    // Update projectiles
    projectiles = state.projectiles.map(rp => ({ ...rp, traveled: 0, range: 999, bounces: 0 }));

    // Update effects
    if (state.domainExpansion) {
        domainExpansion = { ...state.domainExpansion, owner: players[0] };
    } else {
        domainExpansion = null;
    }

    summonedMinions = state.summonedMinions.map(m => ({ ...m, alive: true }));
    healingCircles = state.healingCircles;
    lightningNets = state.lightningNets;

    // Sync room explored status from host
    if (state.exploredRooms && dungeon && dungeon.rooms) {
        state.exploredRooms.forEach((explored, i) => {
            if (dungeon.rooms[i]) dungeon.rooms[i].explored = explored;
        });
    }

    gameState = 'playing';
}

// ─── CLIENT INPUT SEND ──────────────────────────────────────
function sendClientInput() {
    if (NET.isHost || !NET.isOnline || !NET.connections[0]) return;
    if (!NET.connections[0].open) return;

    const relevantKeys = ['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight',
        'KeyE','KeyR','KeyQ','KeyF','Space','Tab','Numpad0','Numpad1','Numpad2','Numpad3','Numpad4','Numpad5','Numpad6'];

    // Local player 1 input (WASD + mouse)
    const input = { keys: {}, mouseX: mouse.x, mouseY: mouse.y, mouseDown: mouse.down, clicked: mouse.clicked };
    for (const k of relevantKeys) { if (keys[k]) input.keys[k] = true; }
    NET.connections[0].send({ type: 'input', input });

    // Local player 2 input (Arrows + Numpad) — sent as separate message
    if (NET.localPlayerCount >= 2) {
        const input2 = { keys: {}, mouseX: 0, mouseY: 0, mouseDown: false, clicked: false };
        // Map arrow/numpad keys to WASD for the host to process uniformly
        if (keys['ArrowUp']) input2.keys['KeyW'] = true;
        if (keys['ArrowDown']) input2.keys['KeyS'] = true;
        if (keys['ArrowLeft']) input2.keys['KeyA'] = true;
        if (keys['ArrowRight']) input2.keys['KeyD'] = true;
        if (keys['Numpad1']) input2.keys['KeyE'] = true;
        if (keys['Numpad2']) input2.keys['Space'] = true;
        if (keys['Numpad0']) input2.keys['mouseDown'] = true;
        input2.mouseDown = !!keys['Numpad0'];
        NET.connections[0].send({ type: 'input2', input: input2 });
    }
}

// ─── HOST: apply remote inputs to players ───────────────────
function applyRemoteInputs() {
    if (!NET.isHost) return;
    for (let i = 1; i < players.length; i++) {
        const ri = NET.remoteInputs[i];
        if (!ri) continue;
        // Map remote input to the player's key bindings
        // Remote players always use WASD-style mapped to their index
        players[i]._remoteInput = ri;
    }
}

function getPlayerKey(p, keyCode) {
    if (!NET.isOnline || NET.isHost && p.playerIndex === 0) return keys[keyCode];
    if (NET.isHost && p._remoteInput) return p._remoteInput.keys[keyCode] || false;
    if (!NET.isHost && p.playerIndex === NET.playerIndex) return keys[keyCode];
    return false;
}

function getPlayerMouse(p) {
    if (!NET.isOnline || (NET.isHost && p.playerIndex === 0)) return mouse;
    if (NET.isHost && p._remoteInput) return { x: p._remoteInput.mouseX, y: p._remoteInput.mouseY, down: p._remoteInput.mouseDown, clicked: p._remoteInput.clicked };
    if (!NET.isHost && p.playerIndex === NET.playerIndex) return mouse;
    return { x: 0, y: 0, down: false, clicked: false };
}

function cleanupNetwork() {
    if (NET.stateInterval) { clearInterval(NET.stateInterval); NET.stateInterval = null; }
    if (NET.peer) { NET.peer.destroy(); NET.peer = null; }
    NET.connections = [];
    NET.isOnline = false;
    NET.isHost = false;
    NET.remoteInputs = {};
    NET.lobbyPlayers = [];
}

function rebuildDungeonRefs() {
    // After receiving dungeon data, rebuild any needed references
}
