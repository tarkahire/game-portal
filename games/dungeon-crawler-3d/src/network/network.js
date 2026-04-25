// ═══════════════════════════════════════════════════════════════
//  NETWORK — PeerJS WebRTC multiplayer for 3D dungeon crawler
// ═══════════════════════════════════════════════════════════════

export const NET = {
    peer: null,
    connections: [],
    isHost: false,
    isOnline: false,
    roomCode: '',
    playerIndex: 0,
    maxPlayers: 4,
    lobbyPlayers: [],
    remotePlayerData: {},
    stateInterval: null,
};

function generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
}

const iceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' }
];

export function createRoom(onStatusUpdate, onLobbyUpdate, onGameStart, onReady) {
    NET.isHost = true;
    NET.isOnline = true;
    NET.roomCode = generateRoomCode();
    NET.playerIndex = 0;
    NET.lobbyPlayers = [{ id: 'host', classId: null, ready: false }];
    NET.connections = [];

    onStatusUpdate('Setting up room...');

    const peerId = 'dc3d-' + NET.roomCode.toLowerCase();
    NET.peer = new Peer(peerId, { debug: 0, config: { iceServers } });

    NET.peer.on('open', () => {
        onStatusUpdate('Room ready! Share the code with your friends.');
        if (onReady) onReady(NET.roomCode);
        onLobbyUpdate(NET.lobbyPlayers);
    });

    NET.peer.on('connection', (conn) => {
        if (NET.lobbyPlayers.length >= NET.maxPlayers) {
            conn.on('open', () => { conn.send({ type: 'full' }); conn.close(); });
            return;
        }
        const pIdx = NET.lobbyPlayers.length;
        conn._playerIndex = pIdx;
        NET.connections.push(conn);
        NET.lobbyPlayers.push({ id: conn.peer, classId: null, ready: false });

        conn.on('open', () => {
            conn.send({ type: 'welcome', playerIndex: pIdx, roomCode: NET.roomCode });
            broadcastLobby();
            onLobbyUpdate(NET.lobbyPlayers);
        });

        conn.on('data', (data) => {
            if (data.type === 'classSelect') {
                const lp = NET.lobbyPlayers.find(p => p.id === conn.peer);
                if (lp) { lp.classId = data.classId; lp.ready = true; }
                broadcastLobby();
                onLobbyUpdate(NET.lobbyPlayers);
            }
            if (data.type === 'input') {
                NET.remotePlayerData[conn._playerIndex] = data;
            }
        });

        conn.on('close', () => {
            NET.connections = NET.connections.filter(c => c !== conn);
            NET.lobbyPlayers = NET.lobbyPlayers.filter(lp => lp.id !== conn.peer);
            broadcastLobby();
            onLobbyUpdate(NET.lobbyPlayers);
        });

        onLobbyUpdate(NET.lobbyPlayers);
    });

    NET.peer.on('error', (err) => {
        console.warn('Peer error:', err.type || err);
        const t = err.type || '';
        if (t === 'unavailable-id') {
            onStatusUpdate('Room code already in use — go back and try again.');
        } else {
            onStatusUpdate('Error: ' + (t || 'unknown'));
        }
    });

    return NET.roomCode;
}

export function joinRoom(code, onStatusUpdate, onLobbyUpdate, onGameStart) {
    NET.isHost = false;
    NET.isOnline = true;
    NET.roomCode = code.toUpperCase();
    NET._onGameStart = onGameStart;

    onStatusUpdate('Connecting to network...');
    NET.peer = new Peer(undefined, { debug: 0, config: { iceServers } });

    let attemptNum = 0;
    const MAX_ATTEMPTS = 5;
    let connected = false;

    function tryConnect() {
        if (connected) return;
        attemptNum++;
        const peerId = 'dc3d-' + NET.roomCode.toLowerCase();
        onStatusUpdate(attemptNum === 1
            ? 'Looking for room...'
            : `Looking again (${attemptNum}/${MAX_ATTEMPTS})...`);

        const conn = NET.peer.connect(peerId, { reliable: true });
        NET.connections = [conn];

        // Long-stop fallback — if neither open nor error fires, retry
        const timer = setTimeout(() => {
            if (connected || conn.open) return;
            try { conn.close(); } catch (e) {}
            if (attemptNum < MAX_ATTEMPTS) setTimeout(tryConnect, 1500);
            else onStatusUpdate('Connection timed out. Check the code or your network.');
        }, 8000);

        conn.on('open', () => {
            connected = true;
            clearTimeout(timer);
            onStatusUpdate('Connected! Waiting for host...');
        });

        conn.on('data', (data) => {
            if (data.type === 'welcome') {
                NET.playerIndex = data.playerIndex;
                onStatusUpdate(`Connected as Player ${data.playerIndex + 1}`);
            }
            if (data.type === 'full') {
                onStatusUpdate('Room is full!');
            }
            if (data.type === 'lobby') {
                NET.lobbyPlayers = data.players;
                onLobbyUpdate(data.players);
            }
            if (data.type === 'startGame') {
                if (NET._onGameStart) NET._onGameStart(data);
            }
            if (data.type === 'gameState') {
                NET._lastState = data.state;
            }
        });

        conn.on('close', () => {
            onStatusUpdate('Disconnected from host.');
            NET.isOnline = false;
        });
    }

    NET.peer.on('open', () => {
        tryConnect();
    });

    NET.peer.on('error', (err) => {
        const type = err.type || '';
        console.warn('Peer error:', type, err);
        if (connected) return;
        // Host not registered with broker yet (or wrong code) — retry a few times
        if (type === 'peer-unavailable') {
            if (attemptNum < MAX_ATTEMPTS) {
                onStatusUpdate(`Host not found yet — retrying (${attemptNum}/${MAX_ATTEMPTS})...`);
                setTimeout(tryConnect, 2000);
            } else {
                onStatusUpdate("Couldn't find that room. Make sure the host has created it and the code is correct.");
            }
        } else if (type === 'network' || type === 'server-error' || type === 'socket-error') {
            onStatusUpdate('Network problem — check your connection.');
        } else {
            onStatusUpdate('Connection error: ' + (type || 'unknown'));
        }
    });
}

function broadcastLobby() {
    const msg = { type: 'lobby', players: NET.lobbyPlayers };
    for (const conn of NET.connections) {
        if (conn.open) conn.send(msg);
    }
}

export function hostSelectClass(classId, onLobbyUpdate) {
    NET.lobbyPlayers[0].classId = classId;
    NET.lobbyPlayers[0].ready = true;
    broadcastLobby();
    onLobbyUpdate(NET.lobbyPlayers);
}

export function clientSelectClass(classId) {
    if (NET.connections[0] && NET.connections[0].open) {
        NET.connections[0].send({ type: 'classSelect', classId });
    }
}

export function hostStartGame(dungeonData, classes) {
    for (const conn of NET.connections) {
        if (conn.open) conn.send({ type: 'startGame', classes, dungeon: dungeonData });
    }
}

export function broadcastGameState(state) {
    if (!NET.isHost) return;
    const msg = { type: 'gameState', state };
    for (const conn of NET.connections) {
        if (conn.open) conn.send(msg);
    }
}

export function sendClientInput(input) {
    if (NET.isHost || !NET.isOnline || !NET.connections[0]) return;
    if (NET.connections[0].open) NET.connections[0].send({ type: 'input', ...input });
}

export function getLastState() {
    const s = NET._lastState;
    NET._lastState = null;
    return s;
}

export function cleanupNetwork() {
    if (NET.stateInterval) { clearInterval(NET.stateInterval); NET.stateInterval = null; }
    if (NET.peer) { NET.peer.destroy(); NET.peer = null; }
    NET.connections = [];
    NET.isOnline = false;
    NET.isHost = false;
    NET.lobbyPlayers = [];
}
