// Main Application Controller
class ChessApp {
    constructor() {
        this.game = new ChessGame();
        this.network = new ChessNetwork(this.game);
        this.canvas = document.getElementById('chess-board');
        this.ctx = this.canvas.getContext('2d');
        this.cellSize = 60;
        this.selectedPiece = null;
        this.validMoves = [];
        this.flipped = false;
        
        // Timer
        this.timers = {
            white: 600, // 10 minutes in seconds
            black: 600
        };
        this.timerInterval = null;
        this.timerRunning = false;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupNetworkHandlers();
        this.checkUrlHash();
        this.drawBoard();
    }

    setupEventListeners() {
        // Home screen
        document.getElementById('btn-create-room').addEventListener('click', () => this.createRoom());
        document.getElementById('btn-join-room').addEventListener('click', () => this.joinRoom());
        document.getElementById('room-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.joinRoom();
        });

        // Waiting screen
        document.getElementById('btn-copy-link').addEventListener('click', () => this.copyRoomLink());

        // Game screen - mouse and touch
        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            
            const mouseEvent = {
                clientX: touch.clientX,
                clientY: touch.clientY
            };
            this.handleCanvasClick(mouseEvent);
        }, { passive: false });
        document.getElementById('btn-resign').addEventListener('click', () => this.resign());
        document.getElementById('btn-draw').addEventListener('click', () => this.offerDraw());
        document.getElementById('btn-new-game').addEventListener('click', () => this.newGame());

        // Window resize
        window.addEventListener('resize', () => this.handleResize());
    }

    setupNetworkHandlers() {
        this.network.onConnect((color) => {
            console.log('Connected as', color);
            // Both players see board from their perspective (bottom to top)
            // White always sees white at bottom, black sees black at bottom
            this.flipped = color === 'black';
            this.showScreen('game-screen');
            this.startTimer();
            this.drawBoard();
            this.updateUI();
        });

        this.network.onMove((move) => {
            if (move.type === 'resign') {
                this.showGameOver(this.game.winner === 'draw' ? 'เสมอ!' : 
                    (this.game.winner === 'white' ? '⚪ ขาวชนะ!' : '⚫ ดำชนะ!'));
            } else if (move.type === 'draw') {
                if (move.accepted) {
                    this.showGameOver('🤝 เสมอ!');
                }
            } else {
                this.drawBoard();
                this.updateUI();
                this.updateMoveHistory();
                this.updateCapturedPieces();
                this.switchTimer();
                
                if (this.game.gameOver) {
                    const message = this.game.winner === 'draw' ? 'เสมอ!' :
                        (this.game.winner === 'white' ? '⚪ ขาวชนะ!' : '⚫ ดำชนะ!');
                    this.showGameOver(message);
                }
            }
        });

        this.network.onDisconnect(() => {
            this.showMessage('❌ ต่อสายหลุด ผู้เล่นออกจากห้อง');
            this.stopTimer();
        });

        this.network.onError((err) => {
            this.showMessage('❌ เกิดข้อผิดพลาด: ' + err.message);
        });
    }

    checkUrlHash() {
        const hash = window.location.hash.slice(1);
        if (hash) {
            document.getElementById('room-input').value = hash;
        }
    }

    async createRoom() {
        const btn = document.getElementById('btn-create-room');
        btn.textContent = '⏳ กำลังสร้าง...';
        btn.disabled = true;
        
        try {
            console.log('Creating room...');
            const roomId = await this.network.createRoom();
            console.log('Room created:', roomId);
            this.showScreen('waiting-screen');
            document.getElementById('room-id-display').textContent = roomId;
            document.getElementById('room-link').value = this.network.getRoomLink();
            window.location.hash = roomId;
        } catch (err) {
            console.error('Create room error:', err);
            this.showMessage('❌ สร้างห้องไม่สำเร็จ: ' + err.message);
            btn.textContent = '🎮 สร้างห้องใหม่';
            btn.disabled = false;
        }
    }

    async joinRoom() {
        const roomId = document.getElementById('room-input').value.trim().toUpperCase();
        if (!roomId) {
            this.showMessage('⚠️ กรุณาใส่รหัสห้อง');
            return;
        }

        const btn = document.getElementById('btn-join-room');
        btn.textContent = '⏳ กำลังเข้า...';
        btn.disabled = true;

        try {
            console.log('Joining room:', roomId);
            await this.network.joinRoom(roomId);
            console.log('Joined room successfully');
            window.location.hash = roomId;
        } catch (err) {
            console.error('Join room error:', err);
            this.showMessage('❌ เข้าห้องไม่สำเร็จ: ' + err.message);
            btn.textContent = '🔗 เข้าร่วมห้อง';
            btn.disabled = false;
        }
    }

    copyRoomLink() {
        const linkInput = document.getElementById('room-link');
        linkInput.select();
        document.execCommand('copy');
        
        const btn = document.getElementById('btn-copy-link');
        const originalText = btn.textContent;
        btn.textContent = '✅ คัดลอกแล้ว!';
        setTimeout(() => {
            btn.textContent = originalText;
        }, 2000);
    }

    handleCanvasClick(e) {
        if (this.game.gameOver) return;
        if (this.network.playerColor && this.game.currentPlayer !== this.network.playerColor) return;

        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;
        
        const col = Math.floor(x / this.cellSize);
        const row = Math.floor(y / this.cellSize);

        // Flip board for black player (both play from bottom)
        const actualRow = this.flipped ? 7 - row : row;
        const actualCol = this.flipped ? 7 - col : col;

        if (!this.game.isValidPosition(actualRow, actualCol)) return;

        const piece = this.game.board[actualRow][actualCol];

        // If no piece selected, try to select
        if (!this.selectedPiece) {
            if (piece && piece.color === this.game.currentPlayer) {
                this.selectedPiece = { row: actualRow, col: actualCol };
                this.validMoves = this.game.getValidMoves(actualRow, actualCol);
                this.drawBoard();
                this.highlightCell(row, col, '#FFD700'); // Gold highlight
                this.highlightValidMoves();
            }
        } else {
            // Try to move
            const move = this.validMoves.find(m => m.row === actualRow && m.col === actualCol);
            if (move) {
                this.makeMove(this.selectedPiece.row, this.selectedPiece.col, actualRow, actualCol);
            } else if (piece && piece.color === this.game.currentPlayer) {
                // Select different piece
                this.selectedPiece = { row: actualRow, col: actualCol };
                this.validMoves = this.game.getValidMoves(actualRow, actualCol);
                this.drawBoard();
                this.highlightCell(row, col, '#FFD700');
                this.highlightValidMoves();
            } else {
                // Deselect
                this.selectedPiece = null;
                this.validMoves = [];
                this.drawBoard();
            }
        }
    }

    makeMove(fromRow, fromCol, toRow, toCol) {
        const success = this.game.makeMove(fromRow, fromCol, toRow, toCol);
        if (success) {
            // Send move to opponent
            if (this.network.conn) {
                this.network.sendMove(fromRow, fromCol, toRow, toCol);
            }

            this.selectedPiece = null;
            this.validMoves = [];
            this.drawBoard();
            this.updateUI();
            this.updateMoveHistory();
            this.updateCapturedPieces();
            this.switchTimer();

            if (this.game.gameOver) {
                const message = this.game.winner === 'draw' ? 'เสมอ!' :
                    (this.game.winner === 'white' ? '⚪ ขาวชนะ!' : '⚫ ดำชนะ!');
                this.showGameOver(message);
            }
        }
    }

    drawBoard() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw squares
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const displayRow = this.flipped ? 7 - row : row;
                const displayCol = this.flipped ? 7 - col : col;
                
                const isLight = (row + col) % 2 === 0;
                this.ctx.fillStyle = isLight ? '#F0D9B5' : '#B58863';
                this.ctx.fillRect(col * this.cellSize, row * this.cellSize, this.cellSize, this.cellSize);

                // Draw coordinates
                if (col === 0) {
                    this.ctx.fillStyle = isLight ? '#B58863' : '#F0D9B5';
                    this.ctx.font = '12px Arial';
                    this.ctx.fillText(String(8 - displayRow), 2, row * this.cellSize + 14);
                }
                if (row === 7) {
                    this.ctx.fillStyle = isLight ? '#B58863' : '#F0D9B5';
                    this.ctx.font = '12px Arial';
                    this.ctx.fillText(String.fromCharCode(97 + displayCol), col * this.cellSize + this.cellSize - 12, this.canvas.height - 2);
                }
            }
        }

        // Draw pieces
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const displayRow = this.flipped ? 7 - row : row;
                const displayCol = this.flipped ? 7 - col : col;
                const piece = this.game.board[displayRow][displayCol];
                if (piece) {
                    this.drawPiece(piece, col * this.cellSize, row * this.cellSize);
                }
            }
        }

        // Highlight king in check
        if (this.game.isInCheck(this.game.currentPlayer)) {
            const kingPos = this.game.kingPositions[this.game.currentPlayer];
            const displayRow = this.flipped ? 7 - kingPos.row : kingPos.row;
            const displayCol = this.flipped ? 7 - kingPos.col : kingPos.col;
            this.highlightCell(displayRow, displayCol, '#FF0000', 0.5);
        }
    }

    drawPiece(piece, x, y) {
        const symbol = this.game.getPieceSymbol(piece);
        const centerX = x + this.cellSize / 2;
        const centerY = y + this.cellSize / 2 + 2;
        
        this.ctx.font = '48px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        if (piece.color === 'white') {
            // White piece: solid white fill only (no outline)
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.fillText(symbol, centerX, centerY);
        } else {
            // Black piece: solid black with slight white glow for visibility
            this.ctx.shadowColor = 'rgba(255, 255, 255, 0.3)';
            this.ctx.shadowBlur = 2;
            this.ctx.fillStyle = '#000000';
            this.ctx.fillText(symbol, centerX, centerY);
            this.ctx.shadowBlur = 0;
        }
    }

    highlightCell(row, col, color, alpha = 0.5) {
        this.ctx.fillStyle = color;
        this.ctx.globalAlpha = alpha;
        this.ctx.fillRect(col * this.cellSize, row * this.cellSize, this.cellSize, this.cellSize);
        this.ctx.globalAlpha = 1;
    }

    highlightValidMoves() {
        for (const move of this.validMoves) {
            const displayRow = this.flipped ? 7 - move.row : move.row;
            const displayCol = this.flipped ? 7 - move.col : move.col;
            
            const piece = this.game.board[move.row][move.col];
            if (piece) {
                // Capture move - red circle
                this.ctx.strokeStyle = '#FF0000';
                this.ctx.lineWidth = 3;
                this.ctx.beginPath();
                this.ctx.arc(
                    displayCol * this.cellSize + this.cellSize / 2,
                    displayRow * this.cellSize + this.cellSize / 2,
                    this.cellSize / 2 - 5,
                    0,
                    Math.PI * 2
                );
                this.ctx.stroke();
            } else {
                // Normal move - green dot
                this.ctx.fillStyle = '#00AA00';
                this.ctx.globalAlpha = 0.5;
                this.ctx.beginPath();
                this.ctx.arc(
                    displayCol * this.cellSize + this.cellSize / 2,
                    displayRow * this.cellSize + this.cellSize / 2,
                    8,
                    0,
                    Math.PI * 2
                );
                this.ctx.fill();
                this.ctx.globalAlpha = 1;
            }
        }
    }

    updateUI() {
        const turnIndicator = document.getElementById('turn-indicator');
        const myColor = this.network.playerColor || 'white';
        
        if (this.game.gameOver) {
            turnIndicator.textContent = this.game.winner === 'draw' ? '🤝 เสมอ!' :
                (this.game.winner === 'white' ? '⚪ ขาวชนะ!' : '⚫ ดำชนะ!');
        } else {
            const isMyTurn = this.game.currentPlayer === myColor;
            const playerLabel = isMyTurn ? '(คุณ)' : '(คู่แข่ง)';
            turnIndicator.textContent = this.game.currentPlayer === 'white' 
                ? `⚪ ตาของขาว ${playerLabel}` 
                : `⚫ ตาของดำ ${playerLabel}`;
        }

        // Update player names based on perspective
        const whiteNameEl = document.getElementById('player-white').querySelector('.name');
        const blackNameEl = document.getElementById('player-black').querySelector('.name');
        
        if (myColor === 'white') {
            whiteNameEl.textContent = 'คุณ (ขาว)';
            blackNameEl.textContent = 'คู่แข่ง (ดำ)';
        } else {
            whiteNameEl.textContent = 'คู่แข่ง (ขาว)';
            blackNameEl.textContent = 'คุณ (ดำ)';
        }
    }

    updateMoveHistory() {
        const moveList = document.getElementById('move-list');
        moveList.innerHTML = '';
        
        for (let i = 0; i < this.game.moveHistory.length; i += 2) {
            const moveNumber = document.createElement('div');
            moveNumber.className = 'move-number';
            moveNumber.textContent = Math.floor(i / 2) + 1;
            moveList.appendChild(moveNumber);

            const whiteMove = document.createElement('div');
            whiteMove.className = 'move-white';
            whiteMove.textContent = this.game.moveHistory[i]?.notation || '';
            moveList.appendChild(whiteMove);

            const blackMove = document.createElement('div');
            blackMove.className = 'move-black';
            blackMove.textContent = this.game.moveHistory[i + 1]?.notation || '';
            moveList.appendChild(blackMove);
        }

        // Scroll to bottom
        moveList.scrollTop = moveList.scrollHeight;
    }

    updateCapturedPieces() {
        const blackCaptured = document.getElementById('captured-black');
        const whiteCaptured = document.getElementById('captured-white');
        
        blackCaptured.innerHTML = this.game.capturedPieces.black
            .map(p => `<div class="captured-piece">${this.game.getPieceSymbol(p)}</div>`)
            .join('');
        
        whiteCaptured.innerHTML = this.game.capturedPieces.white
            .map(p => `<div class="captured-piece">${this.game.getPieceSymbol(p)}</div>`)
            .join('');
    }

    startTimer() {
        this.timers = { white: 600, black: 600 };
        this.timerRunning = true;
        this.updateTimerDisplay();
        
        this.timerInterval = setInterval(() => {
            if (!this.timerRunning || this.game.gameOver) return;
            
            this.timers[this.game.currentPlayer]--;
            this.updateTimerDisplay();
            
            if (this.timers[this.game.currentPlayer] <= 0) {
                this.game.gameOver = true;
                this.game.winner = this.game.currentPlayer === 'white' ? 'black' : 'white';
                this.showGameOver('⏰ หมดเวลา! ' + (this.game.winner === 'white' ? '⚪ ขาวชนะ!' : '⚫ ดำชนะ!'));
                this.stopTimer();
            }
        }, 1000);
    }

    stopTimer() {
        this.timerRunning = false;
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    switchTimer() {
        this.updateTimerDisplay();
    }

    updateTimerDisplay() {
        const formatTime = (seconds) => {
            const mins = Math.floor(seconds / 60);
            const secs = seconds % 60;
            return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        };

        const whiteTimer = document.getElementById('timer-white');
        const blackTimer = document.getElementById('timer-black');
        
        whiteTimer.textContent = formatTime(this.timers.white);
        blackTimer.textContent = formatTime(this.timers.black);

        // Add warning colors
        [whiteTimer, blackTimer].forEach((timer, index) => {
            const color = index === 0 ? 'white' : 'black';
            const remaining = this.timers[color];
            
            timer.classList.remove('warning', 'danger');
            if (remaining <= 60) {
                timer.classList.add('danger');
            } else if (remaining <= 180) {
                timer.classList.add('warning');
            }
        });
    }

    resign() {
        if (this.game.gameOver) return;
        if (!confirm('คุณแน่ใจหรือไม่ที่จะยอมแพ้?')) return;
        
        const myColor = this.network.playerColor || 'white';
        this.game.resign(myColor);
        
        if (this.network.conn) {
            this.network.sendResign(myColor);
        }
        
        this.showGameOver(myColor === 'white' ? '⚫ ดำชนะ! (ยอมแพ้)' : '⚪ ขาวชนะ! (ยอมแพ้)');
    }

    offerDraw() {
        if (this.game.gameOver) return;
        
        if (!this.network.conn) {
            this.showMessage('⚠️ ไม่มีคู่ต่อสู้');
            return;
        }

        if (confirm('เสนอเสมอ?')) {
            this.network.sendDrawOffer();
            this.showMessage('📨 ส่งข้อเสนอเสมอไปแล้ว');
        }
    }

    showGameOver(message) {
        this.stopTimer();
        document.getElementById('game-message').textContent = message;
        document.getElementById('turn-indicator').textContent = '🏁 จบเกม';
        document.getElementById('btn-resign').style.display = 'none';
        document.getElementById('btn-draw').style.display = 'none';
        document.getElementById('btn-new-game').style.display = 'inline-block';
        
        // Show result animation
        setTimeout(() => {
            alert(message);
        }, 100);
    }

    newGame() {
        // Reset game
        this.game = new ChessGame();
        this.network.game = this.game;
        this.selectedPiece = null;
        this.validMoves = [];
        this.timers = { white: 600, black: 600 };
        
        // Reset UI
        document.getElementById('game-message').textContent = '';
        document.getElementById('btn-resign').style.display = 'inline-block';
        document.getElementById('btn-draw').style.display = 'inline-block';
        document.getElementById('btn-new-game').style.display = 'none';
        document.getElementById('move-list').innerHTML = '';
        document.getElementById('captured-black').innerHTML = '';
        document.getElementById('captured-white').innerHTML = '';
        
        this.startTimer();
        this.drawBoard();
        this.updateUI();
    }

    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(screenId).classList.add('active');
    }

    showMessage(message) {
        const msgEl = document.getElementById('game-message');
        if (msgEl) {
            msgEl.textContent = message;
            setTimeout(() => {
                if (msgEl.textContent === message) {
                    msgEl.textContent = '';
                }
            }, 5000);
        } else {
            alert(message);
        }
    }

    handleResize() {
        // Responsive canvas sizing
        const container = this.canvas.parentElement;
        const maxSize = Math.min(container.clientWidth - 100, 480);
        const scale = maxSize / 480;
        
        this.canvas.style.width = `${maxSize}px`;
        this.canvas.style.height = `${maxSize}px`;
        this.cellSize = 60 * scale;
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.chessApp = new ChessApp();
});
