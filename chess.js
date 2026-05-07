// Chess Game Logic
class ChessGame {
    constructor() {
        this.board = this.createInitialBoard();
        this.currentPlayer = 'white';
        this.selectedPiece = null;
        this.validMoves = [];
        this.moveHistory = [];
        this.capturedPieces = { white: [], black: [] };
        this.gameOver = false;
        this.winner = null;
        this.kingPositions = { white: { row: 7, col: 4 }, black: { row: 0, col: 4 } };
        this.enPassantTarget = null;
        this.castlingRights = {
            white: { kingside: true, queenside: true },
            black: { kingside: true, queenside: true }
        };
    }

    createInitialBoard() {
        const board = [];
        // Black pieces (row 0-1)
        board.push([
            { type: 'rook', color: 'black' },
            { type: 'knight', color: 'black' },
            { type: 'bishop', color: 'black' },
            { type: 'queen', color: 'black' },
            { type: 'king', color: 'black' },
            { type: 'bishop', color: 'black' },
            { type: 'knight', color: 'black' },
            { type: 'rook', color: 'black' }
        ]);
        board.push(Array(8).fill(null).map(() => ({ type: 'pawn', color: 'black' })));
        
        // Empty rows (row 2-5)
        for (let i = 0; i < 4; i++) {
            board.push(Array(8).fill(null));
        }
        
        // White pieces (row 6-7)
        board.push(Array(8).fill(null).map(() => ({ type: 'pawn', color: 'white' })));
        board.push([
            { type: 'rook', color: 'white' },
            { type: 'knight', color: 'white' },
            { type: 'bishop', color: 'white' },
            { type: 'queen', color: 'white' },
            { type: 'king', color: 'white' },
            { type: 'bishop', color: 'white' },
            { type: 'knight', color: 'white' },
            { type: 'rook', color: 'white' }
        ]);
        
        return board;
    }

    getPieceSymbol(piece) {
        if (!piece) return '';
        const symbols = {
            white: { king: '♔', queen: '♕', rook: '♖', bishop: '♗', knight: '♘', pawn: '♙' },
            black: { king: '♚', queen: '♛', rook: '♜', bishop: '♝', knight: '♞', pawn: '♟' }
        };
        return symbols[piece.color][piece.type];
    }

    // SVG paths for chess pieces (filled, no outline)
    getPieceSVGPaths(type) {
        const paths = {
            king: 'M22,9 L26,9 L26,13 L22,13 Z M20,13 L28,13 L28,15 L20,15 Z M18,15 L30,15 L30,17 L18,17 Z M16,17 L32,17 L32,19 L16,19 Z M14,19 L34,19 L34,21 L14,21 Z M12,21 L36,21 L36,23 L12,23 Z M10,23 L38,23 L38,25 L10,25 Z M10,25 L38,25 L36,27 L12,27 Z M12,27 L36,27 L34,29 L14,29 Z M14,29 L34,29 L32,31 L16,31 Z M16,31 L32,31 L30,33 L18,33 Z M18,33 L30,33 L28,35 L20,35 Z M20,35 L28,35 L26,37 L22,37 Z M22,37 L26,37 L24,39 L22,39 Z M22,39 L26,39 L26,41 L22,41 Z',
            queen: 'M22,7 L26,7 L26,11 L22,11 Z M20,11 L28,11 L28,13 L20,13 Z M18,13 L30,13 L30,15 L18,15 Z M16,15 L32,15 L32,17 L16,17 Z M14,17 L34,17 L34,19 L14,19 Z M12,19 L36,19 L36,21 L12,21 Z M10,21 L38,21 L38,23 L10,23 Z M8,23 L40,23 L40,25 L8,25 Z M8,25 L40,25 L38,27 L10,27 Z M10,27 L38,27 L36,29 L12,29 Z M12,29 L36,29 L34,31 L14,31 Z M14,31 L34,31 L32,33 L16,33 Z M16,33 L32,33 L30,35 L18,35 Z M18,35 L30,35 L28,37 L20,37 Z M20,37 L28,37 L26,39 L22,39 Z M22,39 L26,39 L24,41 L22,41 Z',
            rook: 'M20,9 L28,9 L28,13 L20,13 Z M18,13 L30,13 L30,15 L18,15 Z M16,15 L32,15 L32,17 L16,17 Z M14,17 L34,17 L34,19 L14,19 Z M12,19 L36,19 L36,21 L12,21 Z M10,21 L38,21 L38,23 L10,23 Z M10,23 L38,23 L36,25 L12,25 Z M12,25 L36,25 L34,27 L14,27 Z M14,27 L34,27 L32,29 L16,29 Z M16,29 L32,29 L30,31 L18,31 Z M18,31 L30,31 L28,33 L20,33 Z M20,33 L28,33 L26,35 L22,35 Z M22,35 L26,35 L24,37 L22,37 Z M22,37 L26,37 L26,39 L22,39 Z',
            bishop: 'M22,9 L26,9 L26,13 L22,13 Z M20,13 L28,13 L28,15 L20,15 Z M18,15 L30,15 L30,17 L18,17 Z M16,17 L32,17 L32,19 L16,19 Z M14,19 L34,19 L34,21 L14,21 Z M12,21 L36,21 L36,23 L12,23 Z M10,23 L38,23 L38,25 L10,25 Z M10,25 L38,25 L36,27 L12,27 Z M12,27 L36,27 L34,29 L14,29 Z M14,29 L34,29 L32,31 L16,31 Z M16,31 L32,31 L30,33 L18,33 Z M18,33 L30,33 L28,35 L20,35 Z M20,35 L28,35 L26,37 L22,37 Z M22,37 L26,37 L24,39 L22,39 Z',
            knight: 'M18,9 L30,9 L30,13 L18,13 Z M16,13 L32,13 L32,15 L16,15 Z M14,15 L34,15 L34,17 L14,17 Z M12,17 L36,17 L36,19 L12,19 Z M10,19 L38,19 L38,21 L10,21 Z M10,21 L38,21 L36,23 L12,23 Z M12,23 L36,23 L34,25 L14,25 Z M14,25 L34,25 L32,27 L16,27 Z M16,27 L32,27 L30,29 L18,29 Z M18,29 L30,29 L28,31 L20,31 Z M20,31 L28,31 L26,33 L22,33 Z M22,33 L26,33 L24,35 L22,35 Z M22,35 L26,35 L26,37 L22,37 Z',
            pawn: 'M22,15 L26,15 L26,19 L22,19 Z M20,19 L28,19 L28,21 L20,21 Z M18,21 L30,21 L30,23 L18,23 Z M16,23 L32,23 L32,25 L16,25 Z M14,25 L34,25 L34,27 L14,27 Z M12,27 L36,27 L36,29 L12,29 Z M12,29 L36,29 L34,31 L14,31 Z M14,31 L34,31 L32,33 L16,33 Z M16,33 L32,33 L30,35 L18,35 Z M18,35 L30,35 L28,37 L20,37 Z M20,37 L28,37 L26,39 L22,39 Z M22,39 L26,39 L24,41 L22,41 Z'
        };
        return paths[type] || '';
    }

    isValidPosition(row, col) {
        return row >= 0 && row < 8 && col >= 0 && col < 8;
    }

    getValidMoves(row, col) {
        const piece = this.board[row][col];
        if (!piece) return [];

        let moves = [];
        switch (piece.type) {
            case 'pawn':
                moves = this.getPawnMoves(row, col, piece.color);
                break;
            case 'rook':
                moves = this.getRookMoves(row, col, piece.color);
                break;
            case 'knight':
                moves = this.getKnightMoves(row, col, piece.color);
                break;
            case 'bishop':
                moves = this.getBishopMoves(row, col, piece.color);
                break;
            case 'queen':
                moves = this.getQueenMoves(row, col, piece.color);
                break;
            case 'king':
                moves = this.getKingMoves(row, col, piece.color);
                break;
        }

        // Filter moves that would leave king in check
        return moves.filter(move => !this.wouldBeInCheck(row, col, move.row, move.col, piece.color));
    }

    getPawnMoves(row, col, color) {
        const moves = [];
        const direction = color === 'white' ? -1 : 1;
        const startRow = color === 'white' ? 6 : 1;

        // Move forward one square
        if (this.isValidPosition(row + direction, col) && !this.board[row + direction][col]) {
            moves.push({ row: row + direction, col });
            // Move forward two squares from starting position
            if (row === startRow && !this.board[row + 2 * direction][col]) {
                moves.push({ row: row + 2 * direction, col });
            }
        }

        // Capture diagonally
        for (const dc of [-1, 1]) {
            const newCol = col + dc;
            if (this.isValidPosition(row + direction, newCol)) {
                const target = this.board[row + direction][newCol];
                if (target && target.color !== color) {
                    moves.push({ row: row + direction, col: newCol });
                }
                // En passant
                if (this.enPassantTarget && 
                    this.enPassantTarget.row === row + direction && 
                    this.enPassantTarget.col === newCol) {
                    moves.push({ row: row + direction, col: newCol, enPassant: true });
                }
            }
        }

        return moves;
    }

    getRookMoves(row, col, color) {
        return this.getSlidingMoves(row, col, color, [[0, 1], [0, -1], [1, 0], [-1, 0]]);
    }

    getBishopMoves(row, col, color) {
        return this.getSlidingMoves(row, col, color, [[1, 1], [1, -1], [-1, 1], [-1, -1]]);
    }

    getQueenMoves(row, col, color) {
        return this.getSlidingMoves(row, col, color, [
            [0, 1], [0, -1], [1, 0], [-1, 0],
            [1, 1], [1, -1], [-1, 1], [-1, -1]
        ]);
    }

    getSlidingMoves(row, col, color, directions) {
        const moves = [];
        for (const [dr, dc] of directions) {
            let newRow = row + dr;
            let newCol = col + dc;
            while (this.isValidPosition(newRow, newCol)) {
                const target = this.board[newRow][newCol];
                if (!target) {
                    moves.push({ row: newRow, col: newCol });
                } else {
                    if (target.color !== color) {
                        moves.push({ row: newRow, col: newCol });
                    }
                    break;
                }
                newRow += dr;
                newCol += dc;
            }
        }
        return moves;
    }

    getKnightMoves(row, col, color) {
        const moves = [];
        const jumps = [
            [-2, -1], [-2, 1], [-1, -2], [-1, 2],
            [1, -2], [1, 2], [2, -1], [2, 1]
        ];
        for (const [dr, dc] of jumps) {
            const newRow = row + dr;
            const newCol = col + dc;
            if (this.isValidPosition(newRow, newCol)) {
                const target = this.board[newRow][newCol];
                if (!target || target.color !== color) {
                    moves.push({ row: newRow, col: newCol });
                }
            }
        }
        return moves;
    }

    getKingMoves(row, col, color) {
        const moves = [];
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const newRow = row + dr;
                const newCol = col + dc;
                if (this.isValidPosition(newRow, newCol)) {
                    const target = this.board[newRow][newCol];
                    if (!target || target.color !== color) {
                        moves.push({ row: newRow, col: newCol });
                    }
                }
            }
        }

        // Castling
        const rights = this.castlingRights[color];
        if (rights && rights.kingside && this.canCastle(color, 'kingside')) {
            moves.push({ row, col: col + 2, castling: 'kingside' });
        }
        if (rights && rights.queenside && this.canCastle(color, 'queenside')) {
            moves.push({ row, col: col - 2, castling: 'queenside' });
        }

        return moves;
    }

    canCastle(color, side) {
        const row = color === 'white' ? 7 : 0;
        const kingCol = 4;
        const rookCol = side === 'kingside' ? 7 : 0;
        const direction = side === 'kingside' ? 1 : -1;

        // Check if king is in check
        if (this.isInCheck(color)) return false;

        // Check if path is clear
        const start = Math.min(kingCol, rookCol) + 1;
        const end = Math.max(kingCol, rookCol);
        for (let col = start; col < end; col++) {
            if (this.board[row][col]) return false;
        }

        // Check if king passes through check
        for (let i = 1; i <= 2; i++) {
            const checkCol = kingCol + (direction * i);
            if (this.isSquareAttacked(row, checkCol, color)) return false;
        }

        return true;
    }

    isSquareAttacked(row, col, defendingColor) {
        const attackingColor = defendingColor === 'white' ? 'black' : 'white';
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = this.board[r][c];
                if (piece && piece.color === attackingColor) {
                    const moves = this.getRawMoves(r, c);
                    if (moves.some(m => m.row === row && m.col === col)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    getBasicKingMoves(row, col, color) {
        // Basic king moves without castling - used for attack checks
        const moves = [];
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const newRow = row + dr;
                const newCol = col + dc;
                if (this.isValidPosition(newRow, newCol)) {
                    const target = this.board[newRow][newCol];
                    if (!target || target.color !== color) {
                        moves.push({ row: newRow, col: newCol });
                    }
                }
            }
        }
        return moves;
    }

    getRawMoves(row, col) {
        const piece = this.board[row][col];
        if (!piece) return [];

        switch (piece.type) {
            case 'pawn':
                return this.getPawnMoves(row, col, piece.color);
            case 'rook':
                return this.getRookMoves(row, col, piece.color);
            case 'knight':
                return this.getKnightMoves(row, col, piece.color);
            case 'bishop':
                return this.getBishopMoves(row, col, piece.color);
            case 'queen':
                return this.getQueenMoves(row, col, piece.color);
            case 'king':
                // Use basic moves without castling to prevent infinite loop
                return this.getBasicKingMoves(row, col, piece.color);
        }
        return [];
    }

    isInCheck(color) {
        const kingPos = this.kingPositions[color];
        return this.isSquareAttacked(kingPos.row, kingPos.col, color);
    }

    wouldBeInCheck(fromRow, fromCol, toRow, toCol, color) {
        // Simulate move
        const originalPiece = this.board[toRow][toCol];
        const movingPiece = this.board[fromRow][fromCol];
        this.board[toRow][toCol] = movingPiece;
        this.board[fromRow][fromCol] = null;

        const originalKingPos = { ...this.kingPositions[color] };
        if (movingPiece.type === 'king') {
            this.kingPositions[color] = { row: toRow, col: toCol };
        }

        const inCheck = this.isInCheck(color);

        // Restore
        this.board[fromRow][fromCol] = movingPiece;
        this.board[toRow][toCol] = originalPiece;
        this.kingPositions[color] = originalKingPos;

        return inCheck;
    }

    makeMove(fromRow, fromCol, toRow, toCol) {
        const piece = this.board[fromRow][fromCol];
        if (!piece) return false;

        const validMoves = this.getValidMoves(fromRow, fromCol);
        const move = validMoves.find(m => m.row === toRow && m.col === toCol);
        if (!move) return false;

        // Execute move
        const capturedPiece = this.board[toRow][toCol];
        if (capturedPiece) {
            this.capturedPieces[piece.color].push(capturedPiece);
        }

        // Handle en passant capture
        if (move.enPassant) {
            const capturedRow = piece.color === 'white' ? toRow + 1 : toRow - 1;
            const capturedPawn = this.board[capturedRow][toCol];
            if (capturedPawn) {
                this.capturedPieces[piece.color].push(capturedPawn);
                this.board[capturedRow][toCol] = null;
            }
        }

        // Handle castling
        if (move.castling) {
            const row = fromRow;
            const rookFromCol = move.castling === 'kingside' ? 7 : 0;
            const rookToCol = move.castling === 'kingside' ? 5 : 3;
            this.board[row][rookToCol] = this.board[row][rookFromCol];
            this.board[row][rookFromCol] = null;
        }

        // Update board
        this.board[toRow][toCol] = piece;
        this.board[fromRow][fromCol] = null;

        // Update king position
        if (piece.type === 'king') {
            this.kingPositions[piece.color] = { row: toRow, col: toCol };
        }

        // Update castling rights
        if (piece.type === 'king') {
            this.castlingRights[piece.color] = { kingside: false, queenside: false };
        }
        if (piece.type === 'rook') {
            if (fromCol === 0) this.castlingRights[piece.color].queenside = false;
            if (fromCol === 7) this.castlingRights[piece.color].kingside = false;
        }

        // Set en passant target
        if (piece.type === 'pawn' && Math.abs(toRow - fromRow) === 2) {
            this.enPassantTarget = {
                row: (fromRow + toRow) / 2,
                col: fromCol
            };
        } else {
            this.enPassantTarget = null;
        }

        // Record move
        const moveNotation = this.getMoveNotation(fromRow, fromCol, toRow, toCol, piece, capturedPiece, move);
        this.moveHistory.push({
            piece: piece.type,
            color: piece.color,
            from: { row: fromRow, col: fromCol },
            to: { row: toRow, col: toCol },
            captured: capturedPiece,
            notation: moveNotation
        });

        // Check for pawn promotion
        if (piece.type === 'pawn' && (toRow === 0 || toRow === 7)) {
            // Return promotion info - will be handled by UI
            return { promotion: true, row: toRow, col: toCol, color: piece.color };
        }

        // Switch player
        this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';

        // Check game end conditions
        this.checkGameEnd();

        return true;
    }

    promotePawn(row, col, pieceType) {
        const color = this.board[row][col].color;
        this.board[row][col] = { type: pieceType, color: color };
        
        // Update move history notation
        const lastMove = this.moveHistory[this.moveHistory.length - 1];
        if (lastMove) {
            lastMove.notation += '=' + pieceType.charAt(0).toUpperCase();
            lastMove.promotion = pieceType;
        }
        
        // Switch player after promotion
        this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';
        
        // Check game end after promotion
        this.checkGameEnd();
    }

    getMoveNotation(fromRow, fromCol, toRow, toCol, piece, captured, special) {
        const files = 'abcdefgh';
        const ranks = '87654321';
        let notation = '';

        if (special && special.castling) {
            return special.castling === 'kingside' ? 'O-O' : 'O-O-O';
        }

        if (piece.type !== 'pawn') {
            notation += piece.type.charAt(0).toUpperCase();
        }

        if (captured) {
            if (piece.type === 'pawn') {
                notation += files[fromCol];
            }
            notation += 'x';
        }

        notation += files[toCol] + ranks[toRow];

        // Check/checkmate will be added later
        return notation;
    }

    checkGameEnd() {
        const color = this.currentPlayer;
        
        // Check if any valid moves exist
        let hasValidMoves = false;
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = this.board[r][c];
                if (piece && piece.color === color) {
                    if (this.getValidMoves(r, c).length > 0) {
                        hasValidMoves = true;
                        break;
                    }
                }
            }
            if (hasValidMoves) break;
        }

        if (!hasValidMoves) {
            this.gameOver = true;
            if (this.isInCheck(color)) {
                this.winner = color === 'white' ? 'black' : 'white';
            } else {
                this.winner = 'draw';
            }
        }
    }

    resign(color) {
        this.gameOver = true;
        this.winner = color === 'white' ? 'black' : 'white';
    }

    offerDraw() {
        // Simplified - in real implementation, would need opponent acceptance
        return false;
    }

    getBoardState() {
        return {
            board: this.board,
            currentPlayer: this.currentPlayer,
            moveHistory: this.moveHistory,
            capturedPieces: this.capturedPieces,
            gameOver: this.gameOver,
            winner: this.winner,
            kingPositions: this.kingPositions,
            castlingRights: this.castlingRights,
            enPassantTarget: this.enPassantTarget
        };
    }

    loadBoardState(state) {
        this.board = state.board;
        this.currentPlayer = state.currentPlayer;
        this.moveHistory = state.moveHistory;
        this.capturedPieces = state.capturedPieces;
        this.gameOver = state.gameOver;
        this.winner = state.winner;
        this.kingPositions = state.kingPositions;
        this.castlingRights = state.castlingRights;
        this.enPassantTarget = state.enPassantTarget;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChessGame;
}
