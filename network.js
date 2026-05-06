// Network handling with PeerJS (WebRTC)
class ChessNetwork {
    constructor(game) {
        this.game = game;
        this.peer = null;
        this.conn = null;
        this.roomId = null;
        this.isHost = false;
        this.playerColor = null;
        this.onConnectCallback = null;
        this.onMoveCallback = null;
        this.onDisconnectCallback = null;
        this.onErrorCallback = null;
    }

    generateRoomId() {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    createRoom() {
        return new Promise((resolve, reject) => {
            this.roomId = this.generateRoomId();
            this.isHost = true;
            this.playerColor = 'white';

            // Use multiple PeerJS servers for redundancy
            const peerConfig = {
                host: '0.peerjs.com',
                secure: true,
                port: 443,
                path: '/',
                debug: 1,
                config: {
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:stun1.l.google.com:19302' }
                    ]
                }
            };
            
            this.peer = new Peer(this.roomId, peerConfig);

            this.peer.on('open', (id) => {
                console.log('Room created:', id);
                resolve(id);
            });

            this.peer.on('connection', (conn) => {
                if (this.conn) {
                    // Already have a connection, reject new one
                    conn.send({ type: 'error', message: 'Room is full' });
                    conn.close();
                    return;
                }

                this.conn = conn;
                this.setupConnection();
                
                // Send initial game state
                conn.send({
                    type: 'init',
                    color: 'black',
                    boardState: this.game.getBoardState()
                });

                if (this.onConnectCallback) {
                    this.onConnectCallback('black');
                }
            });

            this.peer.on('error', (err) => {
                console.error('Peer error:', err);
                if (this.onErrorCallback) this.onErrorCallback(err);
                reject(err);
            });
        });
    }

    joinRoom(roomId) {
        return new Promise((resolve, reject) => {
            this.roomId = roomId;
            this.isHost = false;

            const peerConfig = {
                host: '0.peerjs.com',
                secure: true,
                port: 443,
                path: '/',
                debug: 1,
                config: {
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:stun1.l.google.com:19302' }
                    ]
                }
            };
            
            this.peer = new Peer(peerConfig);

            this.peer.on('open', () => {
                this.conn = this.peer.connect(roomId, {
                    reliable: true,
                    serialization: 'json'
                });

                this.conn.on('open', () => {
                    console.log('Connected to room:', roomId);
                });

                this.conn.on('data', (data) => {
                    this.handleData(data);
                });

                this.conn.on('error', (err) => {
                    console.error('Connection error:', err);
                    if (this.onErrorCallback) this.onErrorCallback(err);
                    reject(err);
                });

                this.conn.on('close', () => {
                    console.log('Connection closed');
                    if (this.onDisconnectCallback) this.onDisconnectCallback();
                });
            });

            this.peer.on('error', (err) => {
                console.error('Peer error:', err);
                if (this.onErrorCallback) this.onErrorCallback(err);
                reject(err);
            });
        });
    }

    setupConnection() {
        if (!this.conn) return;

        this.conn.on('data', (data) => {
            this.handleData(data);
        });

        this.conn.on('close', () => {
            console.log('Connection closed');
            if (this.onDisconnectCallback) this.onDisconnectCallback();
        });

        this.conn.on('error', (err) => {
            console.error('Connection error:', err);
            if (this.onErrorCallback) this.onErrorCallback(err);
        });
    }

    handleData(data) {
        console.log('Received:', data);

        switch (data.type) {
            case 'init':
                this.playerColor = data.color;
                if (data.boardState) {
                    this.game.loadBoardState(data.boardState);
                }
                if (this.onConnectCallback) {
                    this.onConnectCallback(data.color);
                }
                break;

            case 'move':
                // Apply opponent's move
                const { fromRow, fromCol, toRow, toCol } = data.move;
                this.game.makeMove(fromRow, fromCol, toRow, toCol);
                if (this.onMoveCallback) {
                    this.onMoveCallback(data.move);
                }
                break;

            case 'resign':
                this.game.resign(data.color);
                if (this.onMoveCallback) {
                    this.onMoveCallback({ type: 'resign', color: data.color });
                }
                break;

            case 'draw':
                if (data.accepted) {
                    this.game.gameOver = true;
                    this.game.winner = 'draw';
                }
                if (this.onMoveCallback) {
                    this.onMoveCallback({ type: 'draw', accepted: data.accepted });
                }
                break;

            case 'error':
                if (this.onErrorCallback) {
                    this.onErrorCallback(new Error(data.message));
                }
                break;
        }
    }

    sendMove(fromRow, fromCol, toRow, toCol) {
        if (!this.conn) return;
        this.conn.send({
            type: 'move',
            move: { fromRow, fromCol, toRow, toCol }
        });
    }

    sendResign(color) {
        if (!this.conn) return;
        this.conn.send({
            type: 'resign',
            color: color
        });
    }

    sendDrawOffer() {
        if (!this.conn) return;
        this.conn.send({
            type: 'draw',
            accepted: false
        });
    }

    sendDrawAccept() {
        if (!this.conn) return;
        this.conn.send({
            type: 'draw',
            accepted: true
        });
    }

    onConnect(callback) {
        this.onConnectCallback = callback;
    }

    onMove(callback) {
        this.onMoveCallback = callback;
    }

    onDisconnect(callback) {
        this.onDisconnectCallback = callback;
    }

    onError(callback) {
        this.onErrorCallback = callback;
    }

    disconnect() {
        if (this.conn) {
            this.conn.close();
            this.conn = null;
        }
        if (this.peer) {
            this.peer.destroy();
            this.peer = null;
        }
    }

    getRoomLink() {
        if (!this.roomId) return null;
        return `${window.location.origin}${window.location.pathname}#${this.roomId}`;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChessNetwork;
}
