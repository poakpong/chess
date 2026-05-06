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
                // Exclude castling for attack checks
                const moves = this.getKingMoves(row, col, piece.color);
                return moves.filter(m => !m.castling);
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
            // Auto-promote to queen for simplicity
            this.board[toRow][toCol] = { type: 'queen', color: piece.color };
        }

        // Switch player
        this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';

        // Check game end conditions
        this.checkGameEnd();

        return true;
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
