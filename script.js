const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const highScoreEl = document.getElementById("highScore");
const finalScoreEl = document.getElementById("finalScore");
const startScreen = document.getElementById("startScreen");
const gameOverScreen = document.getElementById("gameOverScreen");
const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");

let score = 0;
let highScore = localStorage.getItem("cyberHighScore") || 0;
highScoreEl.innerText = highScore;

let gameActive = false;
let shakeDuration = 0;
let autoFireTimer = 0;
let nextBossScore = 150;
let nextTierScore = 100;
let currentTier = 1;
let warningTimer = 0;
let tierBannerTimer = 0;
let tierBannerText = "";

// ==========================================
// 1. WEB AUDIO API SOUND ENGINE
// ==========================================
let audioCtx = null;

function initAudio() {
    if (!audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AudioContext();
    }
    if (audioCtx.state === "suspended") {
        audioCtx.resume();
    }
}

function playLaserSound() {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(820, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(160, audioCtx.currentTime + 0.09);

    gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.09);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.09);
}

function playTierUpSound() {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(360, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(760, audioCtx.currentTime + 0.28);

    gain.gain.setValueAtTime(0.11, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.28);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.28);
}

function playBossWarningSound() {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(180, audioCtx.currentTime);
    osc.frequency.linearRampToValueAtTime(300, audioCtx.currentTime + 0.25);
    osc.frequency.linearRampToValueAtTime(180, audioCtx.currentTime + 0.5);

    gain.gain.setValueAtTime(0.11, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.5);
}

function playPowerupSound() {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(440, audioCtx.currentTime);
    osc.frequency.setValueAtTime(660, audioCtx.currentTime + 0.08);
    osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.16);

    gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.25);
}

function playShieldHitSound() {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = "square";
    osc.frequency.setValueAtTime(520, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(180, audioCtx.currentTime + 0.2);

    gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.2);
}

function playExplosionSound(isBig = false) {
    if (!audioCtx) return;
    const duration = isBig ? 0.5 : 0.22;
    const bufferSize = audioCtx.sampleRate * duration;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 1.4);
    }

    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;

    const filter = audioCtx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(isBig ? 550 : 800, audioCtx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(60, audioCtx.currentTime + duration);

    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(isBig ? 0.25 : 0.16, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);

    noise.start();
}

function playGameOverSound() {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(300, audioCtx.currentTime);
    osc.frequency.linearRampToValueAtTime(65, audioCtx.currentTime + 0.55);

    gain.gain.setValueAtTime(0.16, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.001, audioCtx.currentTime + 0.55);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.55);
}

// ==========================================
// 2. GAME ENTITIES & STATE
// ==========================================
const player = {
    x: canvas.width / 2,
    targetX: canvas.width / 2,
    y: canvas.height - 70,
    width: 40,
    height: 45,
    hasShield: false,
    tripleShotTimer: 0
};

let bullets = [];
let enemyBullets = [];
let enemies = [];
let particles = [];
let powerups = [];
let floatingTexts = [];
let stars = [];
let boss = null;

for (let i = 0; i < 65; i++) {
    stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 1.8 + 0.5,
        baseSpeed: Math.random() * 1.8 + 0.7
    });
}

// Mouse & Touch Controls Only
function updateTargetFromPointer(clientX) {
    if (!gameActive) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const pointerX = (clientX - rect.left) * scaleX;
    player.targetX = Math.max(25, Math.min(canvas.width - 25, pointerX));
}

canvas.addEventListener("mousemove", (e) => updateTargetFromPointer(e.clientX));
canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    if (e.touches.length > 0) updateTargetFromPointer(e.touches[0].clientX);
}, { passive: false });
canvas.addEventListener("touchmove", (e) => {
    e.preventDefault();
    if (e.touches.length > 0) updateTargetFromPointer(e.touches[0].clientX);
}, { passive: false });

function addFloatingText(x, y, text, color = "#d8e2dc") {
    floatingTexts.push({
        x: x,
        y: y,
        text: text,
        color: color,
        alpha: 0.9,
        vy: -1.2
    });
}

function checkScoreMilestones() {
    if (score >= nextTierScore) {
        currentTier++;
        nextTierScore += 100;
        tierBannerTimer = 75;
        tierBannerText = `TIER ${currentTier}`;
        shakeDuration = 5;
        playTierUpSound();
    }
}

function shootBullet() {
    if (player.tripleShotTimer > 0) {
        bullets.push({ x: player.x, y: player.y - 22, vx: 0, vy: -10, width: 4, height: 18, color: "#ffd000" });
        bullets.push({ x: player.x - 12, y: player.y - 15, vx: -1.8, vy: -10, width: 4, height: 16, color: "#ffd000" });
        bullets.push({ x: player.x + 12, y: player.y - 15, vx: 1.8, vy: -10, width: 4, height: 16, color: "#ffd000" });
    } else {
        bullets.push({ x: player.x, y: player.y - 20, vx: 0, vy: -10, width: 4, height: 18, color: "#00f3ff" });
    }
    playLaserSound();
}

function spawnEnemy() {
    const size = Math.random() * 15 + 20;
    const speedBoost = Math.min(4.2, score * 0.015);
    const neonPalette = ["#ff007f", "#bf00ff", "#ff3b00"];
    enemies.push({
        x: Math.random() * (canvas.width - size * 2) + size,
        y: -size,
        size: size,
        speed: Math.random() * 2 + 2 + speedBoost,
        angle: 0,
        spin: (Math.random() - 0.5) * 0.1,
        color: neonPalette[Math.floor(Math.random() * neonPalette.length)]
    });
}

function spawnBoss() {
    const level = Math.floor(score / 150);
    const maxHp = 25 + level * 15;
    warningTimer = 90;
    playBossWarningSound();

    boss = {
        x: canvas.width / 2,
        y: -80,
        targetY: 110,
        width: 120,
        height: 60,
        hp: maxHp,
        maxHp: maxHp,
        vx: 2.5 + level * 0.4,
        shootTimer: 0,
        hitFlash: 0
    };
}

function maybeSpawnPowerup(x, y, force = false) {
    if (force || Math.random() < 0.22) {
        const type = Math.random() > 0.5 ? "TRIPLE" : "SHIELD";
        powerups.push({
            x: x,
            y: y,
            radius: 15,
            speed: 2.5,
            type: type,
            color: type === "TRIPLE" ? "#ffd000" : "#00ff88",
            label: type === "TRIPLE" ? "T" : "S"
        });
    }
}

function createExplosion(x, y, color, count = 16, isBig = false) {
    shakeDuration = isBig ? 12 : 5;
    playExplosionSound(isBig);
    for (let i = 0; i < count; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * (isBig ? 10 : 7),
            vy: (Math.random() - 0.5) * (isBig ? 10 : 7),
            size: Math.random() * (isBig ? 5 : 3.5) + 2,
            color: color,
            alpha: 0.9
        });
    }
}

// NEON SPACESHIP
function drawPlayer() {
    const shipNeon = player.tripleShotTimer > 0 ? "#ffd000" : "#00f3ff";

    ctx.save();
    ctx.translate(player.x, player.y);

    if (player.hasShield) {
        ctx.beginPath();
        ctx.arc(0, 0, 36, 0, Math.PI * 2);
        ctx.strokeStyle = "#00ff88";
        ctx.lineWidth = 2.5;
        ctx.shadowBlur = 14;
        ctx.shadowColor = "#00ff88";
        ctx.stroke();

        ctx.fillStyle = "rgba(0, 255, 136, 0.08)";
        ctx.fill();
    }

    // Neon Thruster Flame
    const flameBoost = Math.min(12, score * 0.015);
    ctx.beginPath();
    ctx.moveTo(-8, 20);
    ctx.lineTo(0, 29 + flameBoost + Math.random() * 6);
    ctx.lineTo(8, 20);
    ctx.fillStyle = "#ff7b00";
    ctx.shadowBlur = 12;
    ctx.shadowColor = "#ff7b00";
    ctx.fill();

    // Neon Ship Outer Hull & Core
    ctx.beginPath();
    ctx.moveTo(0, -25);
    ctx.lineTo(22, 20);
    ctx.lineTo(0, 12);
    ctx.lineTo(-22, 20);
    ctx.closePath();

    ctx.fillStyle = "rgba(0, 243, 255, 0.14)";
    ctx.strokeStyle = shipNeon;
    ctx.lineWidth = 2.5;
    ctx.shadowBlur = 16;
    ctx.shadowColor = shipNeon;
    ctx.fill();
    ctx.stroke();

    // Glowing Cockpit Accent
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(6, 6);
    ctx.lineTo(0, 2);
    ctx.lineTo(-6, 6);
    ctx.closePath();
    ctx.fillStyle = shipNeon;
    ctx.fill();

    ctx.restore();
}

// NEON BOSS SHIP
function drawBoss() {
    if (!boss) return;

    const bossNeon = "#ff0055";

    ctx.save();
    ctx.translate(boss.x, boss.y);

    ctx.beginPath();
    ctx.moveTo(0, 35);
    ctx.lineTo(60, 10);
    ctx.lineTo(48, -28);
    ctx.lineTo(-48, -28);
    ctx.lineTo(-60, 10);
    ctx.closePath();

    ctx.fillStyle = boss.hitFlash > 0 ? "rgba(255, 255, 255, 0.55)" : "rgba(255, 0, 85, 0.14)";
    ctx.strokeStyle = bossNeon;
    ctx.lineWidth = 3;
    ctx.shadowBlur = 18;
    ctx.shadowColor = bossNeon;
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 2, 13, 0, Math.PI * 2);
    ctx.fillStyle = bossNeon;
    ctx.shadowBlur = 16;
    ctx.shadowColor = bossNeon;
    ctx.fill();

    ctx.fillStyle = "#ff7b00";
    ctx.shadowBlur = 10;
    ctx.shadowColor = "#ff7b00";
    ctx.fillRect(-45, 12, 8, 16);
    ctx.fillRect(37, 12, 8, 16);

    ctx.restore();

    const barWidth = 220;
    const barHeight = 9;
    const barX = canvas.width / 2 - barWidth / 2;
    const barY = 52;
    const hpRatio = Math.max(0, boss.hp / boss.maxHp);

    ctx.save();
    ctx.fillStyle = "rgba(255, 0, 85, 0.16)";
    ctx.fillRect(barX, barY, barWidth, barHeight);

    ctx.fillStyle = bossNeon;
    ctx.shadowBlur = 10;
    ctx.shadowColor = bossNeon;
    ctx.fillRect(barX, barY, barWidth * hpRatio, barHeight);

    ctx.strokeStyle = "rgba(235, 235, 245, 0.7)";
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barWidth, barHeight);

    ctx.fillStyle = "rgba(235, 235, 245, 0.9)";
    ctx.font = "bold 10px Orbitron, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("OVERLORD BOSS", canvas.width / 2, barY - 4);
    ctx.restore();
}

let enemySpawnTimer = 0;

function update() {
    if (!gameActive) return;

    if (warningTimer > 0) warningTimer--;
    if (tierBannerTimer > 0) tierBannerTimer--;

    if (!boss && score >= nextBossScore) {
        spawnBoss();
    }

    const fireInterval = score >= 300 ? 9 : score >= 150 ? 10 : 12;
    autoFireTimer++;
    if (autoFireTimer >= fireInterval) {
        shootBullet();
        autoFireTimer = 0;
    }

    if (player.tripleShotTimer > 0) player.tripleShotTimer--;

    const warpFactor = 1 + Math.min(3.0, score / 160);
    stars.forEach((star) => {
        star.y += star.baseSpeed * warpFactor;
        if (star.y > canvas.height) {
            star.y = 0;
            star.x = Math.random() * canvas.width;
        }
    });

    player.x += (player.targetX - player.x) * 0.22;

    for (let i = bullets.length - 1; i >= 0; i--) {
        bullets[i].x += bullets[i].vx;
        bullets[i].y += bullets[i].vy;
        if (bullets[i].y < 0 || bullets[i].x < 0 || bullets[i].x > canvas.width) {
            bullets.splice(i, 1);
        }
    }

    if (boss) {
        if (boss.hitFlash > 0) boss.hitFlash--;

        if (boss.y < boss.targetY) {
            boss.y += 2;
        } else {
            boss.x += boss.vx;
            if (boss.x - boss.width / 2 < 20 || boss.x + boss.width / 2 > canvas.width - 20) {
                boss.vx *= -1;
            }

            boss.shootTimer++;
            if (boss.shootTimer >= 65) {
                enemyBullets.push({ x: boss.x - 41, y: boss.y + 25, vx: 0, vy: 5.5, radius: 6 });
                enemyBullets.push({ x: boss.x + 41, y: boss.y + 25, vx: 0, vy: 5.5, radius: 6 });
                boss.shootTimer = 0;
            }
        }

        for (let j = bullets.length - 1; j >= 0; j--) {
            let b = bullets[j];
            if (
                b.x > boss.x - boss.width / 2 &&
                b.x < boss.x + boss.width / 2 &&
                b.y > boss.y - boss.height / 2 &&
                b.y < boss.y + boss.height / 2
            ) {
                boss.hp--;
                boss.hitFlash = 2;
                bullets.splice(j, 1);

                particles.push({
                    x: b.x,
                    y: b.y,
                    vx: (Math.random() - 0.5) * 4,
                    vy: Math.random() * 3,
                    size: 2.5,
                    color: "#ffd000",
                    alpha: 0.85
                });

                if (boss.hp <= 0) {
                    const bx = boss.x;
                    const by = boss.y;
                    createExplosion(bx, by, "#ff0055", 36, true);
                    score += 100;
                    scoreEl.innerText = score;
                    checkScoreMilestones();
                    addFloatingText(bx, by, "+100 BOSS!", "#ffd000");
                    maybeSpawnPowerup(bx, by, true);
                    boss = null;
                    nextBossScore = score + 200;
                    break;
                }
            }
        }
    }

    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        let eb = enemyBullets[i];
        eb.x += eb.vx;
        eb.y += eb.vy;

        let dist = Math.hypot(eb.x - player.x, eb.y - player.y);
        if (dist < eb.radius + 16) {
            enemyBullets.splice(i, 1);
            if (player.hasShield) {
                player.hasShield = false;
                shakeDuration = 7;
                playShieldHitSound();
                addFloatingText(player.x, player.y - 25, "SHIELD BLOCK!", "#00ff88");
            } else {
                createExplosion(player.x, player.y, "#00f3ff");
                endGame();
                return;
            }
            continue;
        }

        if (eb.y > canvas.height + 20) enemyBullets.splice(i, 1);
    }

    for (let i = powerups.length - 1; i >= 0; i--) {
        let p = powerups[i];
        p.y += p.speed;

        let dist = Math.hypot(p.x - player.x, p.y - player.y);
        if (dist < p.radius + 22) {
            playPowerupSound();
            if (p.type === "TRIPLE") {
                player.tripleShotTimer = 480;
                addFloatingText(p.x, p.y, "TRIPLE LASER!", "#ffd000");
            } else if (p.type === "SHIELD") {
                player.hasShield = true;
                addFloatingText(p.x, p.y, "SHIELD ON!", "#00ff88");
            }
            powerups.splice(i, 1);
            continue;
        }

        if (p.y > canvas.height + 30) powerups.splice(i, 1);
    }

    enemySpawnTimer++;
    const spawnRate = boss ? 95 : Math.max(18, 52 - Math.floor(score / 8));
    if (enemySpawnTimer > spawnRate) {
        spawnEnemy();
        enemySpawnTimer = 0;
    }

    for (let i = enemies.length - 1; i >= 0; i--) {
        let e = enemies[i];
        e.y += e.speed;
        e.angle += e.spin;

        for (let j = bullets.length - 1; j >= 0; j--) {
            let b = bullets[j];
            let dist = Math.hypot(e.x - b.x, e.y - b.y);
            if (dist < e.size) {
                createExplosion(e.x, e.y, e.color);
                maybeSpawnPowerup(e.x, e.y);
                score += 10;
                scoreEl.innerText = score;
                checkScoreMilestones();
                addFloatingText(e.x, e.y, "+10", "#00f3ff");
                enemies.splice(i, 1);
                bullets.splice(j, 1);
                break;
            }
        }

        if (!enemies[i]) continue;

        let playerDist = Math.hypot(e.x - player.x, e.y - player.y);
        if (playerDist < e.size + 15) {
            if (player.hasShield) {
                player.hasShield = false;
                shakeDuration = 8;
                playShieldHitSound();
                createExplosion(e.x, e.y, "#00ff88");
                addFloatingText(player.x, player.y - 25, "SHIELD BLOCK!", "#00ff88");
                enemies.splice(i, 1);
                continue;
            } else {
                createExplosion(player.x, player.y, "#00f3ff");
                endGame();
                break;
            }
        }

        if (e.y > canvas.height + 50) enemies.splice(i, 1);
    }

    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.032;
        if (p.alpha <= 0) particles.splice(i, 1);
    }

    for (let i = floatingTexts.length - 1; i >= 0; i--) {
        let ft = floatingTexts[i];
        ft.y += ft.vy;
        ft.alpha -= 0.025;
        if (ft.alpha <= 0) floatingTexts.splice(i, 1);
    }
}

function draw() {
    ctx.save();

    if (shakeDuration > 0) {
        let dx = (Math.random() - 0.5) * 6;
        let dy = (Math.random() - 0.5) * 6;
        ctx.translate(dx, dy);
        shakeDuration--;
    }

    // Soft, eye-friendly dark background
    ctx.fillStyle = "#08090e";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Muted background stars
    const streakLength = Math.min(9, 1.5 + score / 70);
    stars.forEach((star) => {
        ctx.save();
        ctx.globalAlpha = 0.35;
        ctx.strokeStyle = "#b8c0d4";
        ctx.lineWidth = star.size;
        ctx.beginPath();
        ctx.moveTo(star.x, star.y);
        ctx.lineTo(star.x, star.y - streakLength);
        ctx.stroke();
        ctx.restore();
    });

    powerups.forEach((p) => {
        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(12, 14, 22, 0.85)";
        ctx.fill();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = p.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.color;
        ctx.stroke();

        ctx.fillStyle = p.color;
        ctx.font = "bold 14px Orbitron, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(p.label, p.x, p.y + 1);
        ctx.restore();
    });

    // Neon Player Lasers
    bullets.forEach((b) => {
        ctx.save();
        ctx.fillStyle = b.color;
        ctx.shadowBlur = 12;
        ctx.shadowColor = b.color;
        ctx.fillRect(b.x - b.width / 2, b.y, b.width, b.height);
        ctx.restore();
    });

    // Neon Boss Plasma Shots
    enemyBullets.forEach((eb) => {
        ctx.save();
        ctx.beginPath();
        ctx.arc(eb.x, eb.y, eb.radius, 0, Math.PI * 2);
        ctx.fillStyle = "#ff0055";
        ctx.shadowBlur = 12;
        ctx.shadowColor = "#ff0055";
        ctx.fill();
        ctx.restore();
    });

    // NEON ENEMIES
    enemies.forEach((e) => {
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.rotate(e.angle);
        ctx.fillStyle = "rgba(255, 0, 127, 0.06)";
        ctx.strokeStyle = e.color;
        ctx.lineWidth = 2.5;
        ctx.shadowBlur = 15;
        ctx.shadowColor = e.color;
        ctx.fillRect(-e.size / 2, -e.size / 2, e.size, e.size);
        ctx.strokeRect(-e.size / 2, -e.size / 2, e.size, e.size);
        ctx.restore();
    });

    drawBoss();

    particles.forEach((p) => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });

    floatingTexts.forEach((ft) => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, ft.alpha);
        ctx.fillStyle = ft.color;
        ctx.font = "bold 13px Orbitron, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
    });

    if (tierBannerTimer > 0) {
        ctx.save();
        ctx.globalAlpha = Math.min(0.85, tierBannerTimer / 30);
        ctx.fillStyle = "#8ecae6";
        ctx.font = "bold 12px Orbitron, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(tierBannerText, 20, 56);
        ctx.restore();
    }

    if (warningTimer > 0 && Math.floor(warningTimer / 14) % 2 === 0) {
        ctx.save();
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = "#ff0055";
        ctx.font = "bold 16px Orbitron, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("BOSS APPROACHING", canvas.width / 2, 180);
        ctx.restore();
    }

    if (gameActive) {
        drawPlayer();

        if (player.tripleShotTimer > 0) {
            const barWidth = (player.tripleShotTimer / 480) * 140;
            ctx.fillStyle = "rgba(255, 208, 0, 0.2)";
            ctx.fillRect(canvas.width / 2 - 70, canvas.height - 18, 140, 5);
            ctx.fillStyle = "#ffd000";
            ctx.fillRect(canvas.width / 2 - 70, canvas.height - 18, barWidth, 5);
        }
    }

    ctx.restore();
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

function startGame() {
    initAudio();
    score = 0;
    scoreEl.innerText = score;
    nextBossScore = 150;
    nextTierScore = 100;
    currentTier = 1;
    warningTimer = 0;
    tierBannerTimer = 0;
    boss = null;
    enemies = [];
    bullets = [];
    enemyBullets = [];
    particles = [];
    powerups = [];
    floatingTexts = [];
    autoFireTimer = 0;
    player.x = canvas.width / 2;
    player.targetX = canvas.width / 2;
    player.hasShield = false;
    player.tripleShotTimer = 0;
    gameActive = true;
    startScreen.classList.add("hidden");
    gameOverScreen.classList.add("hidden");
}

function endGame() {
    gameActive = false;
    playGameOverSound();
    if (score > highScore) {
        highScore = score;
        localStorage.setItem("cyberHighScore", highScore);
        highScoreEl.innerText = highScore;
    }
    finalScoreEl.innerText = score;
    setTimeout(() => {
        gameOverScreen.classList.remove("hidden");
    }, 500);
}

startBtn.addEventListener("click", startGame);
restartBtn.addEventListener("click", startGame);

loop();
