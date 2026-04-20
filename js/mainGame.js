const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const worlds = [
    {
        id: 1,
        name: 'Outer Rim',
        subtitle: 'Where it all begins',
        icon: '🌌',
        accent: '#00ff88',
        levels: [
            { word: 'FAILED', speed: 2,   spawnRate: 1500, duration: 60 },
            { word: 'DANGER', speed: 2.5, spawnRate: 1300, duration: 60 },
            { word: 'DOOMED', speed: 3,   spawnRate: 1100, duration: 60 }
        ]
    },
    {
        id: 2,
        name: 'Asteroid Belt',
        subtitle: 'Dodge, shoot, survive',
        icon: '☄️',
        accent: '#ff8844',
        levels: [
            { word: 'ERASED', speed: 3.5, spawnRate: 1000, duration: 60 },
            { word: 'BROKEN', speed: 4,   spawnRate: 900,  duration: 60 }
        ]
    },
    {
        id: 3,
        name: 'Nebula Core',
        subtitle: 'The final descent',
        icon: '🌀',
        accent: '#cc44ff',
        levels: [
            { word: 'FROZEN',  speed: 4.5, spawnRate: 800, duration: 60 },
            { word: 'BURNED',  speed: 5,   spawnRate: 700, duration: 65 },
            { word: 'CRUSHED', speed: 5.5, spawnRate: 650, duration: 70 }
        ]
    }
];

let gameState = {
    running: false,
    paused: false,
    worldIdx: 0,
    levelIdx: 0,
    player: { x: 275, y: 410, width: 50, height: 40, speed: 6 },
    bullets: [],
    letters: [],
    particles: [],
    popups: [],
    stars: [],
    shake: { intensity: 0, frames: 0 },
    keys: {},
    score: 0,
    timeLeft: 60,
    failedLetters: [],
    targetWord: 'FAILED',
    lastSpawn: 0,
    timer: null,
    highestUnlockedLevel: parseInt(localStorage.getItem('highestUnlockedLevel')) || 1
};

/* ============ Progression helpers ============ */

function getGlobalLevelNum(worldIdx, levelIdx) {
    let count = 0;
    for (let i = 0; i < worldIdx; i++) count += worlds[i].levels.length;
    return count + levelIdx + 1;
}

function totalLevelCount() {
    return worlds.reduce((sum, w) => sum + w.levels.length, 0);
}

function isLevelUnlocked(worldIdx, levelIdx) {
    return getGlobalLevelNum(worldIdx, levelIdx) <= gameState.highestUnlockedLevel;
}

function isLevelCompleted(worldIdx, levelIdx) {
    return getGlobalLevelNum(worldIdx, levelIdx) < gameState.highestUnlockedLevel;
}

function isWorldUnlocked(worldIdx) {
    return isLevelUnlocked(worldIdx, 0);
}

function getWorldProgress(worldIdx) {
    const world = worlds[worldIdx];
    let completed = 0;
    for (let i = 0; i < world.levels.length; i++) {
        if (isLevelCompleted(worldIdx, i)) completed++;
    }
    return { completed, total: world.levels.length };
}

/* ============ Navigation ============ */

function hideAllScreens() {
    ['titleScreen', 'worldSelectScreen', 'levelSelectScreen', 'gameScreen', 'gameOverScreen']
        .forEach(id => document.getElementById(id).style.display = 'none');
    document.getElementById('pauseOverlay').classList.remove('active');
}

function showTitleScreen() {
    if (gameState.timer) clearInterval(gameState.timer);
    gameState.running = false;
    gameState.paused = false;
    hideAllScreens();
    document.getElementById('titleScreen').style.display = 'flex';
}

function showWorldSelect() {
    renderWorldGrid();
    hideAllScreens();
    document.getElementById('worldSelectScreen').style.display = 'flex';
}

function showLevelSelect(worldIdx) {
    renderLevelGrid(worldIdx);
    hideAllScreens();
    document.getElementById('levelSelectScreen').style.display = 'flex';
}

function backToLevelSelect() {
    showLevelSelect(gameState.worldIdx);
}

function quitToMenu() {
    showTitleScreen();
}

/* ============ Renderers ============ */

function renderWorldGrid() {
    const grid = document.getElementById('worldGrid');
    grid.innerHTML = '';
    worlds.forEach((world, i) => {
        const unlocked = isWorldUnlocked(i);
        const progress = getWorldProgress(i);
        const allDone = progress.completed === progress.total && unlocked;

        const card = document.createElement('button');
        card.className = 'world-card';
        if (!unlocked) card.classList.add('locked');
        if (allDone) card.classList.add('completed');
        card.disabled = !unlocked;
        card.style.setProperty('--accent', world.accent);

        const icon = document.createElement('div');
        icon.className = 'world-icon';
        icon.textContent = unlocked ? world.icon : '🔒';
        card.appendChild(icon);

        const name = document.createElement('div');
        name.className = 'world-name';
        name.textContent = unlocked ? world.name : '?????';
        card.appendChild(name);

        const subtitle = document.createElement('div');
        subtitle.className = 'world-subtitle';
        subtitle.textContent = unlocked ? world.subtitle : '';
        card.appendChild(subtitle);

        const prog = document.createElement('div');
        prog.className = 'world-progress';
        prog.textContent = unlocked ? `${progress.completed} / ${progress.total}` : 'LOCKED';
        card.appendChild(prog);

        if (unlocked) card.onclick = () => showLevelSelect(i);
        grid.appendChild(card);
    });
}

function renderLevelGrid(worldIdx) {
    const world = worlds[worldIdx];
    document.getElementById('levelSelectTitle').textContent = world.name.toUpperCase();
    document.getElementById('levelSelectSubtitle').textContent = world.subtitle;

    const grid = document.getElementById('levelGrid');
    grid.innerHTML = '';
    world.levels.forEach((level, i) => {
        const unlocked = isLevelUnlocked(worldIdx, i);
        const completed = isLevelCompleted(worldIdx, i);
        const current = unlocked && !completed;

        const btn = document.createElement('button');
        btn.className = 'level-btn';
        if (completed) btn.classList.add('completed');
        else if (current) btn.classList.add('current');
        else btn.classList.add('locked');
        btn.disabled = !unlocked;

        const icon = document.createElement('div');
        icon.className = 'level-icon';
        icon.textContent = completed ? '★' : unlocked ? String(i + 1) : '🔒';
        btn.appendChild(icon);

        const word = document.createElement('div');
        word.className = 'level-word';
        word.textContent = unlocked ? level.word : '?????';
        btn.appendChild(word);

        btn.title = unlocked ? level.word : 'Locked';
        if (unlocked) btn.onclick = () => startGame(worldIdx, i);
        grid.appendChild(btn);
    });
}

/* ============ Game flow ============ */

function startGame(worldIdx, levelIdx) {
    const world = worlds[worldIdx];
    const level = world.levels[levelIdx];
    gameState.worldIdx = worldIdx;
    gameState.levelIdx = levelIdx;
    gameState.targetWord = level.word;
    gameState.running = true;
    gameState.paused = false;
    document.getElementById('pauseOverlay').classList.remove('active');
    document.getElementById('pauseBtn').textContent = '⏸';
    gameState.player.x = 275;
    gameState.bullets = [];
    gameState.letters = [];
    gameState.particles = [];
    gameState.popups = [];
    gameState.shake = { intensity: 0, frames: 0 };
    gameState.score = 0;
    gameState.timeLeft = level.duration;
    gameState.failedLetters = [];
    gameState.lastSpawn = 0;
    initStars();

    document.getElementById('currentLevel').textContent = `${world.name} · ${levelIdx + 1}`;
    hideAllScreens();
    document.getElementById('gameScreen').style.display = 'flex';

    updateHUD();
    startTimer();
    gameLoop();
}

function restartGame() {
    startGame(gameState.worldIdx, gameState.levelIdx);
}

function nextLevel() {
    const world = worlds[gameState.worldIdx];
    if (gameState.levelIdx + 1 < world.levels.length) {
        startGame(gameState.worldIdx, gameState.levelIdx + 1);
    } else if (gameState.worldIdx + 1 < worlds.length) {
        startGame(gameState.worldIdx + 1, 0);
    } else {
        showTitleScreen();
    }
}

function togglePause() {
    if (!gameState.running) return;
    gameState.paused = !gameState.paused;
    const overlay = document.getElementById('pauseOverlay');
    overlay.classList.toggle('active', gameState.paused);
    document.getElementById('pauseBtn').textContent = gameState.paused ? '▶' : '⏸';
}

function restartFromPause() {
    document.getElementById('pauseOverlay').classList.remove('active');
    restartGame();
}

function startTimer() {
    if (gameState.timer) clearInterval(gameState.timer);
    gameState.timer = setInterval(() => {
        if (gameState.paused) return;
        gameState.timeLeft--;
        updateHUD();
        if (gameState.timeLeft <= 0) endGame(true);
    }, 1000);
}

function updateHUD() {
    document.getElementById('timer').textContent = gameState.timeLeft;
    document.getElementById('score').textContent = gameState.score;
    renderWordTiles();
}

function renderWordTiles() {
    const container = document.getElementById('wordDisplay');
    const word = gameState.targetWord;

    if (container.children.length !== word.length) {
        container.innerHTML = '';
        for (let i = 0; i < word.length; i++) {
            const tile = document.createElement('div');
            tile.className = 'letter-tile';
            container.appendChild(tile);
        }
    }

    for (let i = 0; i < word.length; i++) {
        const tile = container.children[i];
        const defeated = gameState.failedLetters[i];
        if (defeated) {
            if (!tile.classList.contains('defeated')) {
                tile.textContent = word[i];
                tile.classList.add('defeated');
            }
        } else {
            tile.textContent = '';
            tile.classList.remove('defeated');
        }
    }
}

/* ============ Simulation ============ */

function spawnLetter(timestamp) {
    const level = worlds[gameState.worldIdx].levels[gameState.levelIdx];
    if (timestamp - gameState.lastSpawn > level.spawnRate) {
        const letterIndex = Math.floor(Math.random() * gameState.targetWord.length);
        const letter = gameState.targetWord[letterIndex];

        gameState.letters.push({
            char: letter,
            index: letterIndex,
            x: Math.random() * (canvas.width - 40) + 20,
            y: -30,
            speed: level.speed
        });

        gameState.lastSpawn = timestamp;
    }
}

function updatePlayer() {
    if (gameState.keys['ArrowLeft'] && gameState.player.x > 0) {
        gameState.player.x -= gameState.player.speed;
    }
    if (gameState.keys['ArrowRight'] && gameState.player.x < canvas.width - gameState.player.width) {
        gameState.player.x += gameState.player.speed;
    }
}

function updateBullets() {
    for (let i = gameState.bullets.length - 1; i >= 0; i--) {
        gameState.bullets[i].y -= 10;
        if (gameState.bullets[i].y < 0) gameState.bullets.splice(i, 1);
    }
}

function updateLetters() {
    for (let i = gameState.letters.length - 1; i >= 0; i--) {
        gameState.letters[i].y += gameState.letters[i].speed;

        if (gameState.letters[i].y > canvas.height) {
            const letter = gameState.letters[i];
            if (!gameState.failedLetters[letter.index]) {
                gameState.failedLetters[letter.index] = letter.char;
                triggerShake(6, 14);
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
                bullet.y > letter.y - 20 && bullet.y < letter.y + 20) {
                spawnHitParticles(letter.x, letter.y);
                spawnScorePopup(letter.x, letter.y, '+10');
                gameState.bullets.splice(i, 1);
                gameState.letters.splice(j, 1);
                gameState.score += 10;
                updateHUD();
                break;
            }
        }
    }
}

function initStars() {
    gameState.stars = [];
    for (let i = 0; i < 70; i++) {
        gameState.stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 1.5 + 0.4,
            speed: Math.random() * 0.6 + 0.1,
            brightness: Math.random() * 0.6 + 0.3
        });
    }
}

function updateStars() {
    for (const s of gameState.stars) {
        s.y += s.speed;
        if (s.y > canvas.height) {
            s.y = 0;
            s.x = Math.random() * canvas.width;
        }
    }
}

function spawnHitParticles(x, y) {
    for (let i = 0; i < 14; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.5 + Math.random() * 3.5;
        gameState.particles.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 28,
            maxLife: 28,
            color: Math.random() < 0.5 ? '#ffff44' : '#ff8844',
            size: 1.5 + Math.random() * 2.5
        });
    }
}

function updateParticles() {
    for (let i = gameState.particles.length - 1; i >= 0; i--) {
        const p = gameState.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.12;
        p.vx *= 0.97;
        p.life--;
        if (p.life <= 0) gameState.particles.splice(i, 1);
    }
}

function spawnScorePopup(x, y, text) {
    gameState.popups.push({ x, y, text, life: 40, maxLife: 40 });
}

function updatePopups() {
    for (let i = gameState.popups.length - 1; i >= 0; i--) {
        const p = gameState.popups[i];
        p.y -= 1.5;
        p.life--;
        if (p.life <= 0) gameState.popups.splice(i, 1);
    }
}

function triggerShake(intensity, frames) {
    if (frames > gameState.shake.frames) {
        gameState.shake.intensity = intensity;
        gameState.shake.frames = frames;
    }
}

function tickShake() {
    if (gameState.shake.frames > 0) gameState.shake.frames--;
}

/* ============ Draw ============ */

function draw() {
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    if (gameState.shake.frames > 0) {
        const s = gameState.shake.intensity;
        ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
    }

    // Starfield
    for (const star of gameState.stars) {
        ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness})`;
        ctx.fillRect(star.x, star.y, star.size, star.size);
    }

    // Bullet trails
    gameState.bullets.forEach(bullet => {
        const grad = ctx.createLinearGradient(bullet.x, bullet.y, bullet.x, bullet.y + 22);
        grad.addColorStop(0, 'rgba(255, 255, 80, 0.75)');
        grad.addColorStop(1, 'rgba(255, 255, 80, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(bullet.x - 2.5, bullet.y, 5, 22);
    });

    // Bullet heads
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#ffff00';
    ctx.fillStyle = '#ffffaa';
    gameState.bullets.forEach(bullet => {
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, 4, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.shadowBlur = 0;

    // Player thruster
    const flameH = 8 + Math.random() * 10;
    const thrusterX = gameState.player.x + 25;
    const thrusterY = gameState.player.y + 40;
    const flameGrad = ctx.createLinearGradient(thrusterX, thrusterY, thrusterX, thrusterY + flameH);
    flameGrad.addColorStop(0, '#ffdd66');
    flameGrad.addColorStop(0.5, '#ff8822');
    flameGrad.addColorStop(1, 'rgba(255, 120, 0, 0)');
    ctx.fillStyle = flameGrad;
    ctx.beginPath();
    ctx.moveTo(thrusterX - 9, thrusterY);
    ctx.lineTo(thrusterX, thrusterY + flameH);
    ctx.lineTo(thrusterX + 9, thrusterY);
    ctx.closePath();
    ctx.fill();

    // Player ship
    const px = gameState.player.x;
    const py = gameState.player.y;
    const cx = px + 25;

    // Wings
    ctx.fillStyle = '#006644';
    ctx.beginPath();
    ctx.moveTo(px + 8, py + 28);
    ctx.lineTo(px - 4, py + 42);
    ctx.lineTo(px + 14, py + 40);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(px + 42, py + 28);
    ctx.lineTo(px + 54, py + 42);
    ctx.lineTo(px + 36, py + 40);
    ctx.closePath();
    ctx.fill();

    // Hull
    const hullGrad = ctx.createLinearGradient(px + 10, py, px + 40, py + 40);
    hullGrad.addColorStop(0, '#009966');
    hullGrad.addColorStop(0.5, '#00ffaa');
    hullGrad.addColorStop(1, '#009966');
    ctx.fillStyle = hullGrad;
    ctx.beginPath();
    ctx.moveTo(cx, py);
    ctx.lineTo(px + 10, py + 40);
    ctx.lineTo(px + 40, py + 40);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#aaffdd';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Cockpit
    ctx.fillStyle = 'rgba(120, 220, 255, 0.9)';
    ctx.beginPath();
    ctx.arc(cx, py + 20, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1a3344';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.beginPath();
    ctx.arc(cx - 1.5, py + 18, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Nose highlight
    ctx.fillStyle = '#ffffcc';
    ctx.beginPath();
    ctx.arc(cx, py + 3, 2, 0, Math.PI * 2);
    ctx.fill();

    // Gun barrel
    const barrelGrad = ctx.createLinearGradient(cx - 5, py - 10, cx + 5, py - 10);
    barrelGrad.addColorStop(0, '#005544');
    barrelGrad.addColorStop(0.5, '#00ffcc');
    barrelGrad.addColorStop(1, '#005544');
    ctx.fillStyle = barrelGrad;
    ctx.fillRect(cx - 5, py - 10, 10, 15);

    // Falling letters
    ctx.font = 'bold 30px Courier New';
    ctx.textAlign = 'center';
    gameState.letters.forEach(letter => {
        ctx.fillStyle = '#ff4444';
        ctx.fillText(letter.char, letter.x, letter.y);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeText(letter.char, letter.x, letter.y);
    });

    // Hit particles
    gameState.particles.forEach(p => {
        const alpha = p.life / p.maxLife;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0.1, p.size * alpha), 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1;

    // Score popups
    ctx.font = 'bold 20px Courier New';
    ctx.textAlign = 'center';
    gameState.popups.forEach(p => {
        const alpha = p.life / p.maxLife;
        ctx.globalAlpha = alpha;
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#000';
        ctx.strokeText(p.text, p.x, p.y);
        ctx.fillStyle = '#ffff88';
        ctx.fillText(p.text, p.x, p.y);
    });
    ctx.globalAlpha = 1;

    ctx.restore();
}

function gameLoop(timestamp = 0) {
    if (!gameState.running) return;

    if (gameState.paused) {
        gameState.lastSpawn = timestamp;
        draw();
        requestAnimationFrame(gameLoop);
        return;
    }

    updatePlayer();
    updateBullets();
    updateLetters();
    checkCollisions();
    updateStars();
    updateParticles();
    updatePopups();
    tickShake();
    spawnLetter(timestamp);
    draw();

    requestAnimationFrame(gameLoop);
}

function endGame(won) {
    gameState.running = false;
    clearInterval(gameState.timer);

    document.getElementById('gameScreen').style.display = 'none';
    document.getElementById('gameOverScreen').style.display = 'block';

    const world = worlds[gameState.worldIdx];
    const level = world.levels[gameState.levelIdx];
    const resultTitle = document.getElementById('resultTitle');
    const finalStats = document.getElementById('finalStats');
    const unlockMsg = document.getElementById('unlockMessage');
    const nextBtn = document.getElementById('nextLevelBtn');

    const globalNum = getGlobalLevelNum(gameState.worldIdx, gameState.levelIdx);
    const total = totalLevelCount();

    if (won) {
        resultTitle.textContent = 'VICTORY!';
        resultTitle.style.color = '#00ff88';
        finalStats.innerHTML = `
            ${world.name} · Level ${gameState.levelIdx + 1} — ${level.word}<br>
            Final Score: ${gameState.score}<br>
            Letters Missed: ${gameState.failedLetters.filter(l => l).length}/${gameState.targetWord.length}
        `;

        const nextGlobal = globalNum + 1;
        const hasNext = nextGlobal <= total;
        if (nextGlobal > gameState.highestUnlockedLevel) {
            gameState.highestUnlockedLevel = nextGlobal;
            localStorage.setItem('highestUnlockedLevel', String(nextGlobal));
            unlockMsg.textContent = hasNext ? '🎉 NEXT LEVEL UNLOCKED! 🎉' : '🏆 ALL LEVELS COMPLETE 🏆';
        } else {
            unlockMsg.textContent = '';
        }
        nextBtn.style.display = hasNext ? 'inline-block' : 'none';
    } else {
        resultTitle.textContent = 'GAME OVER';
        resultTitle.style.color = '#ff4444';
        finalStats.innerHTML = `
            You spelled: ${gameState.targetWord}<br>
            Time Survived: ${level.duration - gameState.timeLeft}s<br>
            Final Score: ${gameState.score}
        `;
        unlockMsg.textContent = '';
        nextBtn.style.display = 'none';
    }
}

/* ============ Input ============ */

function shoot() {
    gameState.bullets.push({
        x: gameState.player.x + 25,
        y: gameState.player.y - 10
    });
}

document.addEventListener('keydown', (e) => {
    gameState.keys[e.key] = true;

    if (e.key === 'Escape' && gameState.running) {
        e.preventDefault();
        togglePause();
        return;
    }

    if (e.key === ' ' && gameState.running && !gameState.paused) {
        e.preventDefault();
        shoot();
    }
});

document.addEventListener('keyup', (e) => {
    gameState.keys[e.key] = false;
});

canvas.addEventListener('mousemove', (e) => {
    if (!gameState.running || gameState.paused) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const targetX = mouseX - gameState.player.width / 2;
    gameState.player.x = Math.max(0, Math.min(canvas.width - gameState.player.width, targetX));
});

canvas.addEventListener('mousedown', (e) => {
    if (!gameState.running || gameState.paused) return;
    e.preventDefault();
    shoot();
});
