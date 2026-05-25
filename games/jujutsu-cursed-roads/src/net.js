// ═══════════════════════════════════════════════════════════════
//  NET — PeerJS WebRTC multiplayer for Jujutsu — Cursed Roads
//  MVP scope: room create/join + position/yaw sync + action replay
//  (M1 hits + ability casts). Curses, HP, quests stay LOCAL.
// ═══════════════════════════════════════════════════════════════

export const NET = {
    peer: null,
    connections: [],     // host: one per joined peer; client: [hostConn]
    isHost: false,
    isOnline: false,
    roomCode: '',
    playerIndex: 0,      // host=0, joined peers get 1..maxPlayers-1
    maxPlayers: 6,
    lobbyPlayers: [],    // [{ id, name, ready }]
    // remotePlayers[idx] = { x, z, y, yaw, name, lastPos, pendingActions[] }
    remotePlayers: {},
    // ── World-sync hooks (wired up by main.js at game start) ──
    onCurseSpawn: null,        // CLIENT: (data) => void — apply a remote spawn
    onCurseState: null,        // CLIENT: (list)  => void — apply state tick
    onCurseDeath: null,        // CLIENT: (id, killerIdx) => void — death event
    onCurseSnapshotApply: null,// CLIENT: (list)  => void — apply join snapshot
    onCurseSnapshotBuild: null,// HOST:   () => list — build snapshot for new joiner
    onCurseDmg: null,          // HOST:   (id, amount, fromIdx) => void — apply client dmg
    onAdminCmd: null,          // ANY:    (kind, payload, fromIdx) => void — admin power was used on me
    // Stats (visible via getNetStats() for debug overlay)
    _rxPos: 0, _txPos: 0, _rxAct: 0, _txAct: 0,
    _lastRxPos: 0, _lastTxPos: 0,
};

export function getNetStats() {
    const remote = {};
    for (const k of Object.keys(NET.remotePlayers)) {
        const r = NET.remotePlayers[k];
        remote[k] = {
            name: r.name,
            x: Math.round(r.x * 10) / 10,
            z: Math.round(r.z * 10) / 10,
            sinceMs: r.lastSeen ? Math.round(performance.now() - r.lastSeen) : -1,
        };
    }
    return {
        role: NET.isHost ? 'host' : (NET.isOnline ? 'client' : 'offline'),
        code: NET.roomCode,
        myIdx: NET.playerIndex,
        conns: NET.connections.length,
        openConns: NET.connections.filter(c => c.open).length,
        remote,
        rxPos: NET._rxPos, txPos: NET._txPos,
        rxAct: NET._rxAct, txAct: NET._txAct,
        msSinceLastTx: NET._lastTxPos ? Math.round(performance.now() - NET._lastTxPos) : -1,
        msSinceLastRx: NET._lastRxPos ? Math.round(performance.now() - NET._lastRxPos) : -1,
    };
}

const iceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
];

function rand4() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let s = '';
    for (let i = 0; i < 4; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
}

function peerIdFor(code) { return 'jcr-' + code.toLowerCase(); }

// ─── HOST ───────────────────────────────────────────────────
export function createRoom(myName, onStatus, onLobby) {
    NET.isHost = true;
    NET.isOnline = true;
    NET.roomCode = rand4();
    NET.playerIndex = 0;
    NET.lobbyPlayers = [{ id: 'host', name: myName, ready: true }];
    NET.connections = [];
    NET.remotePlayers = {};

    console.log('[net/host] createRoom code=' + NET.roomCode);
    onStatus('Setting up room...');

    NET.peer = new Peer(peerIdFor(NET.roomCode), { debug: 0, config: { iceServers } });

    NET.peer.on('open', (id) => {
        console.log('[net/host] peer open id=' + id);
        onStatus('Room ready — share the code.');
        onLobby(NET.lobbyPlayers);
    });

    NET.peer.on('connection', (conn) => {
        console.log('[net/host] incoming ' + conn.peer);
        if (NET.lobbyPlayers.length >= NET.maxPlayers) {
            conn.on('open', () => { conn.send({ type: 'full' }); conn.close(); });
            return;
        }
        const pIdx = NET.lobbyPlayers.length;
        conn._playerIndex = pIdx;
        NET.connections.push(conn);

        conn.on('open', () => {
            console.log('[net/host] channel open with P' + (pIdx + 1));
            conn.send({ type: 'welcome', playerIndex: pIdx, roomCode: NET.roomCode, hostName: myName });
            // Don't add to lobby until we learn their name
        });

        conn.on('data', (data) => {
            if (data.type === 'hello') {
                NET.lobbyPlayers.push({ id: conn.peer, name: data.name || 'Sorcerer', ready: false });
                NET.remotePlayers[pIdx] = { name: data.name || 'Sorcerer', x: 0, z: 0, y: 0, yaw: 0, pendingActions: [], lastSeen: performance.now() };
                broadcastLobby();
                onLobby(NET.lobbyPlayers);
                // Send the joiner a snapshot of every live curse so they
                // see the world in progress instead of an empty city.
                if (NET.onCurseSnapshotBuild) {
                    const list = NET.onCurseSnapshotBuild();
                    if (list && conn.open) conn.send({ type: 'curseSnapshot', list });
                }
            }
            if (data.type === 'pos') {
                const rp = NET.remotePlayers[pIdx];
                if (!rp) {
                    NET.remotePlayers[pIdx] = { name: 'Sorcerer', x: data.x, z: data.z, y: data.y, yaw: data.yaw, scale: data.scale || 1, fly: !!data.fly, pendingActions: [], lastSeen: performance.now() };
                } else {
                    rp.x = data.x; rp.z = data.z; rp.y = data.y; rp.yaw = data.yaw;
                    if (data.scale != null) rp.scale = data.scale;
                    if (data.fly   != null) rp.fly   = !!data.fly;
                    rp.lastSeen = performance.now();
                }
                NET._rxPos++; NET._lastRxPos = performance.now();
                relayFrom(conn, { type: 'pos', from: pIdx, x: data.x, z: data.z, y: data.y, yaw: data.yaw, scale: data.scale, fly: data.fly });
            }
            if (data.type === 'action') {
                const rp = NET.remotePlayers[pIdx];
                if (rp) rp.pendingActions.push(data);
                NET._rxAct++;
                relayFrom(conn, { type: 'action', from: pIdx, kind: data.kind, slot: data.slot });
            }
            if (data.type === 'curseDmg') {
                if (NET.onCurseDmg) NET.onCurseDmg(data.id, data.amount, pIdx);
            }
            if (data.type === 'adminCmd') {
                // The admin (this client) is firing a power on `targetIdx`.
                // If the target is the host, apply locally. Otherwise relay
                // to the target's connection.
                const tgt = data.targetIdx | 0;
                if (tgt === 0) {
                    if (NET.onAdminCmd) NET.onAdminCmd(data.kind, data.payload, pIdx);
                } else {
                    const tConn = NET.connections.find(c => c._playerIndex === tgt);
                    if (tConn && tConn.open) tConn.send({ type: 'adminCmd', kind: data.kind, payload: data.payload, fromIdx: pIdx });
                }
            }
        });

        conn.on('close', () => {
            console.log('[net/host] closed ' + conn.peer);
            NET.connections = NET.connections.filter(c => c !== conn);
            NET.lobbyPlayers = NET.lobbyPlayers.filter(lp => lp.id !== conn.peer);
            delete NET.remotePlayers[pIdx];
            broadcastLobby();
            onLobby(NET.lobbyPlayers);
        });
    });

    NET.peer.on('error', (err) => {
        const t = err.type || '';
        console.warn('[net/host] peer error', t);
        if (t === 'unavailable-id') onStatus('Code taken — close and try again.');
        else onStatus('Error: ' + (t || 'unknown'));
    });

    return NET.roomCode;
}

function broadcastLobby() {
    const msg = { type: 'lobby', players: NET.lobbyPlayers };
    for (const c of NET.connections) if (c.open) c.send(msg);
}

function relayFrom(srcConn, msg) {
    for (const c of NET.connections) {
        if (c === srcConn) continue;
        if (c.open) c.send(msg);
    }
}

// Host broadcasts its OWN position to everyone (playerIndex 0).
export function hostBroadcastPos(x, z, y, yaw, scale, fly) {
    if (!NET.isHost) return;
    const msg = { type: 'pos', from: 0, x, z, y, yaw, scale, fly };
    for (const c of NET.connections) if (c.open) c.send(msg);
    NET._txPos++; NET._lastTxPos = performance.now();
}
export function hostBroadcastAction(kind, slot) {
    if (!NET.isHost) return;
    const msg = { type: 'action', from: 0, kind, slot };
    for (const c of NET.connections) if (c.open) c.send(msg);
    NET._txAct++;
}
export function hostBroadcastCurseSpawn(data) {
    if (!NET.isHost) return;
    const msg = { type: 'curseSpawn', ...data };
    for (const c of NET.connections) if (c.open) c.send(msg);
}
export function hostBroadcastCurseState(list) {
    if (!NET.isHost) return;
    const msg = { type: 'curseState', list };
    for (const c of NET.connections) if (c.open) c.send(msg);
}
export function hostBroadcastCurseDeath(id, killerIdx) {
    if (!NET.isHost) return;
    const msg = { type: 'curseDeath', id, killerIdx };
    for (const c of NET.connections) if (c.open) c.send(msg);
}

// ─── CLIENT ─────────────────────────────────────────────────
export function joinRoom(code, myName, onStatus, onLobby) {
    NET.isHost = false;
    NET.isOnline = true;
    NET.roomCode = code.toUpperCase();
    NET._myName = myName;

    console.log('[net/client] joinRoom code=' + NET.roomCode);
    onStatus('Connecting to network...');
    NET.peer = new Peer(undefined, { debug: 0, config: { iceServers } });

    let attempt = 0, connected = false;
    const MAX = 5;

    function tryConnect() {
        if (connected) return;
        attempt++;
        const pid = peerIdFor(NET.roomCode);
        console.log('[net/client] connect ' + pid + ' (try ' + attempt + ')');
        onStatus(attempt === 1 ? 'Looking for room...' : `Retrying (${attempt}/${MAX})...`);

        const conn = NET.peer.connect(pid, { reliable: true });
        NET.connections = [conn];

        const timer = setTimeout(() => {
            if (connected || conn.open) return;
            try { conn.close(); } catch (e) {}
            if (attempt < MAX) setTimeout(tryConnect, 1500);
            else onStatus('Connection timed out.');
        }, 8000);

        conn.on('open', () => {
            connected = true;
            clearTimeout(timer);
            console.log('[net/client] channel open');
            conn.send({ type: 'hello', name: myName });
            onStatus('Connected — waiting for host.');
        });

        conn.on('data', (data) => {
            if (data.type === 'welcome') {
                NET.playerIndex = data.playerIndex;
                console.log('[net/client] welcome — playerIndex=' + data.playerIndex);
                // Pre-create remote slot for the host (idx 0)
                NET.remotePlayers[0] = { name: data.hostName || 'Host', x: 0, z: 0, y: 0, yaw: 0, pendingActions: [], lastSeen: performance.now() };
                onStatus(`Connected as P${data.playerIndex + 1}`);
            }
            if (data.type === 'full') onStatus('Room is full.');
            if (data.type === 'lobby') {
                NET.lobbyPlayers = data.players;
                // Ensure remote slots exist for every other player in the lobby
                for (let i = 0; i < data.players.length; i++) {
                    if (i === NET.playerIndex) continue;
                    if (!NET.remotePlayers[i]) {
                        NET.remotePlayers[i] = { name: data.players[i].name || 'Sorcerer', x: 0, z: 0, y: 0, yaw: 0, pendingActions: [], lastSeen: performance.now() };
                    } else {
                        NET.remotePlayers[i].name = data.players[i].name || NET.remotePlayers[i].name;
                    }
                }
                onLobby(data.players);
            }
            if (data.type === 'pos') {
                let rp = NET.remotePlayers[data.from];
                if (!rp) {
                    rp = NET.remotePlayers[data.from] = { name: 'Sorcerer', x: data.x, z: data.z, y: data.y, yaw: data.yaw, scale: data.scale || 1, fly: !!data.fly, pendingActions: [], lastSeen: performance.now() };
                } else {
                    rp.x = data.x; rp.z = data.z; rp.y = data.y; rp.yaw = data.yaw;
                    if (data.scale != null) rp.scale = data.scale;
                    if (data.fly   != null) rp.fly   = !!data.fly;
                    rp.lastSeen = performance.now();
                }
                NET._rxPos++; NET._lastRxPos = performance.now();
            }
            if (data.type === 'action') {
                const rp = NET.remotePlayers[data.from];
                if (rp) rp.pendingActions.push(data);
                NET._rxAct++;
            }
            if (data.type === 'curseSpawn')    { if (NET.onCurseSpawn)    NET.onCurseSpawn(data); }
            if (data.type === 'curseState')    { if (NET.onCurseState)    NET.onCurseState(data.list); }
            if (data.type === 'curseDeath')    { if (NET.onCurseDeath)    NET.onCurseDeath(data.id, data.killerIdx); }
            if (data.type === 'curseSnapshot') { if (NET.onCurseSnapshotApply) NET.onCurseSnapshotApply(data.list); }
            if (data.type === 'adminCmd')      { if (NET.onAdminCmd) NET.onAdminCmd(data.kind, data.payload, data.fromIdx); }
        });

        conn.on('close', () => {
            console.warn('[net/client] host closed');
            onStatus('Disconnected from host.');
            NET.isOnline = false;
        });
    }

    NET.peer.on('open', tryConnect);
    NET.peer.on('error', (err) => {
        const t = err.type || '';
        console.warn('[net/client] peer error', t);
        if (connected) return;
        if (t === 'peer-unavailable') {
            if (attempt < MAX) { onStatus(`Host not found — retrying (${attempt}/${MAX})...`); setTimeout(tryConnect, 2000); }
            else onStatus("Couldn't find that room. Check the code.");
        } else onStatus('Connection error: ' + (t || 'unknown'));
    });
}

// Client: broadcast my own position/action UP to the host (who relays).
export function clientSendPos(x, z, y, yaw, scale, fly) {
    if (NET.isHost || !NET.isOnline || !NET.connections[0]) return;
    if (NET.connections[0].open) {
        NET.connections[0].send({ type: 'pos', x, z, y, yaw, scale, fly });
        NET._txPos++; NET._lastTxPos = performance.now();
    }
}
export function clientSendAction(kind, slot) {
    if (NET.isHost || !NET.isOnline || !NET.connections[0]) return;
    if (NET.connections[0].open) {
        NET.connections[0].send({ type: 'action', kind, slot });
        NET._txAct++;
    }
}
export function clientSendCurseDmg(id, amount) {
    if (NET.isHost || !NET.isOnline || !NET.connections[0]) return;
    if (NET.connections[0].open) NET.connections[0].send({ type: 'curseDmg', id, amount });
}

// Fire an admin power at a specific player.
// - target = self  → caller applies locally (no network round-trip)
// - host firing on a remote → direct send to that connection
// - client firing on anyone → send to host with targetIdx; host relays
export function sendAdminCmd(targetIdx, kind, payload) {
    const myIdx = NET.playerIndex;
    if (targetIdx === myIdx) {
        if (NET.onAdminCmd) NET.onAdminCmd(kind, payload, myIdx);
        return;
    }
    if (NET.isHost) {
        const tConn = NET.connections.find(c => c._playerIndex === targetIdx);
        if (tConn && tConn.open) tConn.send({ type: 'adminCmd', kind, payload, fromIdx: myIdx });
    } else if (NET.connections[0] && NET.connections[0].open) {
        NET.connections[0].send({ type: 'adminCmd', kind, payload, targetIdx });
    }
}

// Convenience: send my position regardless of role.
export function sendMyPos(x, z, y, yaw, scale, fly) {
    if (NET.isHost) hostBroadcastPos(x, z, y, yaw, scale, fly);
    else clientSendPos(x, z, y, yaw, scale, fly);
}
export function sendMyAction(kind, slot) {
    if (NET.isHost) hostBroadcastAction(kind, slot);
    else clientSendAction(kind, slot);
}

export function cleanupNet() {
    if (NET.peer) { try { NET.peer.destroy(); } catch (e) {} NET.peer = null; }
    NET.connections = [];
    NET.isOnline = false;
    NET.isHost = false;
    NET.lobbyPlayers = [];
    NET.remotePlayers = {};
    NET.roomCode = '';
    NET.playerIndex = 0;
}
