const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');
        
        let gameState = {
            running: false,
            difficulty: 'easy',
            player: { x: 275, y: 410, width: 50, height: 40, speed: 12 },
            bullets: [],
            letters: [],
            keys: {},
            mouseX: 275,
            score: 0,
            timeLeft: 60,
            failedLetters: [],
            targetWord: 'FAILED',
            lastSpawn: 0,
            timer: null,
            impossibleUnlocked: localStorage.getItem('impossibleUnlocked') === 'true'
        };
        
        const difficulties = {
            easy: { speed: 2, spawnRate: 1500 },
            medium: { speed: 3.5, spawnRate: 1000 },
            hard: { speed: 5, spawnRate: 700 },
            impossible: { speed: 7, spawnRate: 500 }
        };
        
        if (gameState.impossibleUnlocked) {
            document.getElementById('impossibleBtn').disabled = false;
        }
        
        function startGame(difficulty) {
            // Initialize audio on first user interaction
            audioManager.init();
            audioManager.startBackgroundMusic();
            
            gameState.difficulty = difficulty;
            gameState.running = true;
            gameState.player.x = 275;
            gameState.bullets = [];
            gameState.letters = [];
            gameState.score = 0;
            gameState.timeLeft = 60;
            gameState.failedLetters = [];
            gameState.lastSpawn = 0;
            
            document.getElementById('menuScreen').style.display = 'none';
            document.getElementById('gameScreen').style.display = 'block';
            document.getElementById('gameOverScreen').style.display = 'none';
            
            updateHUD();
            startTimer();
            gameLoop();
        }
        
        function restartGame() {
            startGame(gameState.difficulty);
        }
        
        function showMenu() {
            document.getElementById('menuScreen').style.display = 'block';
            document.getElementById('gameScreen').style.display = 'none';
            document.getElementById('gameOverScreen').style.display = 'none';
        }
        
        function startTimer() {
            if (gameState.timer) clearInterval(gameState.timer);
            gameState.timer = setInterval(() => {
                gameState.timeLeft--;
                updateHUD();
                if (gameState.timeLeft <= 0) {
                    endGame(true);
                }
            }, 1000);
        }
        
        function updateHUD() {
            document.getElementById('timer').textContent = gameState.timeLeft;
            document.getElementById('score').textContent = gameState.score;
            
            let wordDisplay = '';
            for (let i = 0; i < gameState.targetWord.length; i++) {
                wordDisplay += gameState.failedLetters[i] || '_';
            }
            document.getElementById('failedWord').textContent = wordDisplay;
        }
        
        function spawnLetter(timestamp) {
            const config = difficulties[gameState.difficulty];
            if (timestamp - gameState.lastSpawn > config.spawnRate) {
                const letterIndex = Math.floor(Math.random() * gameState.targetWord.length);
                const letter = gameState.targetWord[letterIndex];
                
                gameState.letters.push({
                    char: letter,
                    index: letterIndex,
                    x: Math.random() * (canvas.width - 40) + 20,
                    y: -30,
                    speed: config.speed
                });
                
                gameState.lastSpawn = timestamp;
            }
        }
        
        function updatePlayer() {
            // Smoothly move player to mouse position
            const targetX = Math.max(0, Math.min(gameState.mouseX - gameState.player.width / 2, canvas.width - gameState.player.width));
            const dx = targetX - gameState.player.x;
            
            // Move towards target with speed limit
            if (Math.abs(dx) > 1) {
                gameState.player.x += Math.sign(dx) * Math.min(Math.abs(dx), gameState.player.speed);
            }
        }
        
        function updateBullets() {
            for (let i = gameState.bullets.length - 1; i >= 0; i--) {
                gameState.bullets[i].y -= 10;
                if (gameState.bullets[i].y < 0) {
                    gameState.bullets.splice(i, 1);
                }
            }
        }
        
        function updateLetters() {
            for (let i = gameState.letters.length - 1; i >= 0; i--) {
                gameState.letters[i].y += gameState.letters[i].speed;
                
                if (gameState.letters[i].y > canvas.height) {
                    const letter = gameState.letters[i];
                    if (!gameState.failedLetters[letter.index]) {
                        gameState.failedLetters[letter.index] = letter.char;
                        audioManager.playMiss(); // Play miss sound
                        updateHUD();
                        if (gameState.failedLetters.filter(l => l).length === gameState.targetWord.length) {
                            endGame(false);
                        }
                    }
                    gameState.letters.splice(i, 1);
                }
            }
        }
        
        function checkCollisions() {
            for (let i = gameState.bullets.length - 1; i >= 0; i--) {
                for (let j = gameState.letters.length - 1; j >= 0; j--) {
                    const bullet = gameState.bullets[i];
                    const letter = gameState.letters[j];
                    
                    if (bullet.x > letter.x - 20 && bullet.x < letter.x + 20 &&
                        bullet.y > letter.y - 20 && letter.y < letter.y + 20) {
                        gameState.bullets.splice(i, 1);
                        gameState.letters.splice(j, 1);
                        gameState.score += 10;
                        audioManager.playHit(); // Play hit sound
                        updateHUD();
                        break;
                    }
                }
            }
        }
        
        function draw() {
            ctx.fillStyle = '#0a0a1a';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Draw player (spaceship gun)
            ctx.fillStyle = '#00ff88';
            ctx.beginPath();
            ctx.moveTo(gameState.player.x + 25, gameState.player.y);
            ctx.lineTo(gameState.player.x + 10, gameState.player.y + 40);
            ctx.lineTo(gameState.player.x + 40, gameState.player.y + 40);
            ctx.closePath();
            ctx.fill();
            
            // Gun barrel
            ctx.fillStyle = '#00ffcc';
            ctx.fillRect(gameState.player.x + 20, gameState.player.y - 10, 10, 15);
            
            // Draw bullets
            ctx.fillStyle = '#ffff00';
            gameState.bullets.forEach(bullet => {
                ctx.beginPath();
                ctx.arc(bullet.x, bullet.y, 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 10;
                ctx.shadowColor = '#ffff00';
                ctx.fill();
                ctx.shadowBlur = 0;
            });
            
            // Draw letters
            ctx.font = 'bold 30px Courier New';
            ctx.textAlign = 'center';
            gameState.letters.forEach(letter => {
                ctx.fillStyle = '#ff4444';
                ctx.fillText(letter.char, letter.x, letter.y);
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.strokeText(letter.char, letter.x, letter.y);
            });
        }
        
        function gameLoop(timestamp = 0) {
            if (!gameState.running) return;
            
            updatePlayer();
            updateBullets();
            updateLetters();
            checkCollisions();
            spawnLetter(timestamp);
            draw();
            
            requestAnimationFrame(gameLoop);
        }
        
        function endGame(won) {
            gameState.running = false;
            clearInterval(gameState.timer);
            audioManager.stopBackgroundMusic();
            
            // Play victory or game over sound
            if (won) {
                audioManager.playVictory();
            } else {
                audioManager.playGameOver();
            }
            
            document.getElementById('gameScreen').style.display = 'none';
            document.getElementById('gameOverScreen').style.display = 'block';
            
            const resultTitle = document.getElementById('resultTitle');
            const finalStats = document.getElementById('finalStats');
            const unlockMsg = document.getElementById('unlockMessage');
            
            if (won) {
                resultTitle.textContent = 'VICTORY!';
                resultTitle.style.color = '#00ff88';
                finalStats.innerHTML = `
                    Difficulty: ${gameState.difficulty.toUpperCase()}<br>
                    Final Score: ${gameState.score}<br>
                    Letters Missed: ${gameState.failedLetters.filter(l => l).length}/${gameState.targetWord.length}
                `;
                
                if (gameState.difficulty === 'hard' && !gameState.impossibleUnlocked) {
                    gameState.impossibleUnlocked = true;
                    localStorage.setItem('impossibleUnlocked', 'true');
                    document.getElementById('impossibleBtn').disabled = false;
                    unlockMsg.textContent = '🎉 IMPOSSIBLE MODE UNLOCKED! 🎉';
                } else {
                    unlockMsg.textContent = '';
                }
            } else {
                resultTitle.textContent = 'GAME OVER';
                resultTitle.style.color = '#ff4444';
                finalStats.innerHTML = `
                    You spelled: ${gameState.targetWord}<br>
                    Time Survived: ${60 - gameState.timeLeft}s<br>
                    Final Score: ${gameState.score}
                `;
                unlockMsg.textContent = '';
            }
        }
        
        // Track mouse movement on canvas
        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            gameState.mouseX = e.clientX - rect.left;
        });
        
        // Track touch movement on canvas (mobile support)
        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const rect = canvas.getBoundingClientRect();
            const touch = e.touches[0];
            gameState.mouseX = touch.clientX - rect.left;
        });
        
        // Shoot on mouse click
        canvas.addEventListener('click', (e) => {
            if (gameState.running) {
                audioManager.playShoot();
                gameState.bullets.push({
                    x: gameState.player.x + 25,
                    y: gameState.player.y - 10
                });
            }
        });
        
        // Shoot on touch tap (mobile support)
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (gameState.running) {
                const rect = canvas.getBoundingClientRect();
                const touch = e.touches[0];
                gameState.mouseX = touch.clientX - rect.left;
                audioManager.playShoot();
                gameState.bullets.push({
                    x: gameState.player.x + 25,
                    y: gameState.player.y - 10
                });
            }
        });
        
        // Keep spacebar as alternative shooting option
        document.addEventListener('keydown', (e) => {
            if (e.key === ' ' && gameState.running) {
                e.preventDefault();
                audioManager.playShoot();
                gameState.bullets.push({
                    x: gameState.player.x + 25,
                    y: gameState.player.y - 10
                });
            }
        });