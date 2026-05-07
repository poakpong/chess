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

            // Try multiple PeerJS servers
            const servers = [
                { host: '0.peerjs.com', port: 443, path: '/' },
                { host: 'peerjs.mirotalk.org', port: 443, path: '/' },
                { host: 'peerjs-server.herokuapp.com', port: 443, path: '/' }
            ];
            
            const tryServer = (index) => {
                if (index >= servers.length) {
                    reject(new Error('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้'));
                    return;
                }
                
                const server = servers[index];
                console.log('Trying server:', server.host);
                
                const peerConfig = {
                    host: server.host,
                    secure: true,
                    port: server.port,
                    path: server.path,
                    debug: 2,
                    config: {
                        iceServers: [
                            { urls: 'stun:stun.l.google.com:19302' },
                            { urls: 'stun:stun1.l.google.com:19302' },
                            { urls: 'stun:stun2.l.google.com:19302' }
                        ]
                    }
                };
                
                this.peer = new Peer(this.roomId, peerConfig);

                this.peer.on('open', (id) => {
                    console.log('Room created:', id);
                    resolve(id);
                });
                
                // Timeout if connection takes too long
                setTimeout(() => {
                    if (!this.peer || this.peer.disconnected) {
                        console.log('Connection timeout, trying next server...');
                        this.peer.destroy();
                        tryServer(index + 1);
                    }
                }, 5000);

                this.peer.on('connection', (conn) => {
                    if (this.conn) {
                        conn.send({ type: 'error', message: 'Room is full' });
                        conn.close();
                        return;
                    }

                    this.conn = conn;
                    this.setupConnection();
                    
                    // Wait for connection to open before sending
                    conn.on('open', () => {
                        console.log('Host: Connection opened, sending init');
                        conn.send({
                            type: 'init',
                            color: 'black',
                            boardState: this.game.getBoardState()
                        });

                        if (this.onConnectCallback) {
                            this.onConnectCallback('black');
                        }
                    });
                });

                this.peer.on('error', (err) => {
                    console.error('Peer error:', err);
                    this.peer.destroy();
                    tryServer(index + 1);
                });
            };
            
            tryServer(0);
        });
    }

    joinRoom(roomId) {
        return new Promise((resolve, reject) => {
            this.roomId = roomId;
            this.isHost = false;

            const servers = [
                { host: '0.peerjs.com', port: 443, path: '/' },
                { host: 'peerjs.mirotalk.org', port: 443, path: '/' },
                { host: 'peerjs-server.herokuapp.com', port: 443, path: '/' }
            ];
            
            const tryServer = (index) => {
                if (index >= servers.length) {
                    reject(new Error('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้'));
                    return;
                }
                
                const server = servers[index];
                console.log('Trying server:', server.host);
                
                const peerConfig = {
                    host: server.host,
                    secure: true,
                    port: server.port,
                    path: server.path,
                    debug: 2,
                    config: {
                        iceServers: [
                            { urls: 'stun:stun.l.google.com:19302' },
                            { urls: 'stun:stun1.l.google.com:19302' },
                            { urls: 'stun:stun2.l.google.com:19302' }
                        ]
                    }
                };
                
                this.peer = new Peer(peerConfig);

                this.peer.on('open', () => {
                    console.log('Joiner: Peer opened, connecting to room:', roomId);
                    this.conn = this.peer.connect(roomId, {
                        reliable: true,
                        serialization: 'json'
                    });

                    this.conn.on('open', () => {
                        console.log('Joiner: Connection opened to room:', roomId);
                        resolve();
                    });

                    this.conn.on('data', (data) => {
                        console.log('Joiner received data:', data);
                        this.handleData(data);
                    });

                    this.conn.on('error', (err) => {
                        console.error('Joiner connection error:', err);
                        if (this.onErrorCallback) this.onErrorCallback(err);
                        reject(err);
                    });

                    this.conn.on('close', () => {
                        console.log('Joiner connection closed');
                        if (this.onDisconnectCallback) this.onDisconnectCallback();
                    });
                });

                this.peer.on('error', (err) => {
                    console.error('Peer error:', err);
                    this.peer.destroy();
                    tryServer(index + 1);
                });
            };
            
            tryServer(0);
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

    getPlayerColor() {
        return this.playerColor;
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

            case 'promotion':
                // Apply promotion on opponent's board
                this.game.promotePawn(data.row, data.col, data.pieceType);
                // Note: promotePawn already switches player in chess.js
                if (this.onMoveCallback) {
                    this.onMoveCallback({ type: 'promotion', row: data.row, col: data.col, pieceType: data.pieceType });
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

    sendPromotion(row, col, pieceType) {
        if (!this.conn) return;
        this.conn.send({
            type: 'promotion',
            row: row,
            col: col,
            pieceType: pieceType
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
