// 8-Bit 類瑪利歐遊戲核心 logic (9 關卡經典 Goomba 版本)

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// UI Elements
const scoreVal = document.getElementById("hud-score");
const coinsVal = document.getElementById("hud-coins");
const timeVal = document.getElementById("hud-time");
const worldVal = document.querySelector(".hud-val");
const overlayScreen = document.getElementById("overlay-screen");
const overlayTitle = document.getElementById("overlay-title");

// 遊戲物理與遊戲引擎常數
const GRAVITY = 0.28;
const FRICTION = 0.85;
const ACCEL = 0.12;
const MAX_SPEED = 1.8;
const STAR_MAX_SPEED = 2.6;
const JUMP_FORCE = -5.8;
const SUPER_JUMP_FORCE = -6.2;
const TILE_SIZE = 16;

// 鍵盤輸入狀態
const keys = {
    Left: false,
    Right: false,
    Jump: false,
    Attack: false,
    Restart: false
};

window.addEventListener("keydown", (e) => {
    if (e.key === "a" || e.key === "ArrowLeft") keys.Left = true;
    if (e.key === "d" || e.key === "ArrowRight") keys.Right = true;
    if (e.key === "w" || e.key === "ArrowUp" || e.key === " ") keys.Jump = true;
    if (e.key === "j" || e.key === "J" || e.key === "Shift") keys.Attack = true;
    if (e.key === "r" || e.key === "R") keys.Restart = true;
});

window.addEventListener("keyup", (e) => {
    if (e.key === "a" || e.key === "ArrowLeft") keys.Left = false;
    if (e.key === "d" || e.key === "ArrowRight") keys.Right = false;
    if (e.key === "w" || e.key === "ArrowUp" || e.key === " ") keys.Jump = false;
    if (e.key === "j" || e.key === "J" || e.key === "Shift") keys.Attack = false;
    if (e.key === "r" || e.key === "R") keys.Restart = false;
});

// 粒子系統
class Particle {
    constructor(x, y, vx, vy, color, size, gravity = 0.2, life = 30) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.color = color;
        this.size = size;
        this.gravity = gravity;
        this.life = life;
        this.maxLife = life;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += this.gravity;
        this.life--;
    }

    draw(ctx, cameraX) {
        ctx.fillStyle = this.color;
        ctx.fillRect(Math.floor(this.x - cameraX), Math.floor(this.y), this.size, this.size);
    }
}

// 漂浮文字粒子
class FloatingText {
    constructor(x, y, text, color = "#ffffff") {
        this.x = x;
        this.y = y;
        this.text = text;
        this.color = color;
        this.vy = -0.8;
        this.life = 40;
    }

    update() {
        this.y += this.vy;
        this.life--;
    }

    draw(ctx, cameraX) {
        ctx.fillStyle = this.color;
        ctx.font = "6px 'Press Start 2P'";
        ctx.fillText(this.text, Math.floor(this.x - cameraX), Math.floor(this.y));
    }
}

// 炸彈實體
class Bomb {
    constructor(x, y, vx, vy) {
        this.x = x;
        this.y = y;
        this.width = 10;
        this.height = 10;
        this.vx = vx;
        this.vy = vy;
        this.fuse = 90;
        this.isExploded = false;
        this.explodeRadius = 28;
    }

    update(blocks, enemies) {
        this.fuse--;
        this.vy += GRAVITY;
        this.x += this.vx;
        this.resolveBlockCollisions(blocks, "horizontal");
        this.y += this.vy;
        this.resolveBlockCollisions(blocks, "vertical");

        for (let e of enemies) {
            if (!e.isDead && 
                this.x < e.x + e.width &&
                this.x + this.width > e.x &&
                this.y < e.y + e.height &&
                this.y + this.height > e.y) {
                this.explode(enemies);
                return;
            }
        }

        if (this.fuse <= 0) {
            this.explode(enemies);
        }
    }

    resolveBlockCollisions(blocks, direction) {
        for (let b of blocks) {
            if (b.type === "empty") continue;
            if (this.x < b.x + b.width &&
                this.x + this.width > b.x &&
                this.y < b.y + b.height &&
                this.y + this.height > b.y) {
                
                if (direction === "horizontal") {
                    this.vx *= -0.7;
                    if (this.vx > 0) this.x = b.x + b.width;
                    else this.x = b.x - this.width;
                } else if (direction === "vertical") {
                    if (this.vy > 0) {
                        this.y = b.y - this.height;
                        this.vy = -this.vy * 0.5;
                        if (Math.abs(this.vy) < 0.5) this.vy = 0;
                        this.vx *= 0.8;
                    } else if (this.vy < 0) {
                        this.y = b.y + b.height;
                        this.vy = 0;
                    }
                }
            }
        }
    }

    explode(enemies) {
        this.isExploded = true;
        for (let i = 0; i < 15; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.5 + Math.random() * 2.5;
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed - 1;
            const color = Math.random() > 0.5 ? "#ff5500" : "#ffcc00";
            gameInstance.particles.push(new Particle(this.x + 5, this.y + 5, vx, vy, color, 4 + Math.random()*4, 0.15, 25));
        }

        for (let e of enemies) {
            if (e.isDead) continue;
            const dx = (this.x + 5) - (e.x + e.width / 2);
            const dy = (this.y + 5) - (e.y + e.height / 2);
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            if (dist <= this.explodeRadius) {
                e.isDead = true;
                e.vx = dx > 0 ? -1.5 : 1.5;
                e.vy = -3.5;
                gameInstance.score += 200;
                gameInstance.floatingTexts.push(new FloatingText(e.x, e.y, "200", "#ffaa00"));
            }
        }
    }

    draw(ctx, cameraX) {
        const drawX = Math.floor(this.x - cameraX);
        const drawY = Math.floor(this.y);

        ctx.fillStyle = "#2d2d2d";
        ctx.beginPath();
        ctx.arc(drawX + 5, drawY + 5, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(drawX + 5, drawY);
        ctx.quadraticCurveTo(drawX + 8, drawY - 2, drawX + 7, drawY - 4);
        ctx.stroke();

        if (Math.floor(this.fuse / 4) % 2 === 0) {
            ctx.fillStyle = "#ffaa00";
            ctx.fillRect(drawX + 6, drawY - 6, 2, 2);
        }
    }
}

// 道具類別
class Powerup {
    constructor(x, y, type = "mushroom") {
        this.x = x;
        this.y = y;
        this.width = 14;
        this.height = 14;
        this.type = type;
        this.vx = 0.9;
        this.vy = 0;
        this.active = false;
        this.spawnProgress = 0;
    }

    update(blocks) {
        if (!this.active) {
            if (this.spawnProgress < 16) {
                this.spawnProgress += 0.5;
                this.y -= 0.5;
            } else {
                this.active = true;
            }
            return;
        }

        this.vy += GRAVITY;
        this.x += this.vx;
        this.resolveBlockCollisions(blocks, "horizontal");
        this.y += this.vy;
        this.resolveBlockCollisions(blocks, "vertical");
    }

    resolveBlockCollisions(blocks, direction) {
        for (let b of blocks) {
            if (b.type === "empty") continue;
            if (this.x < b.x + b.width &&
                this.x + this.width > b.x &&
                this.y < b.y + b.height &&
                this.y + this.height > b.y) {
                
                if (direction === "horizontal") {
                    this.vx *= -1;
                    if (this.vx > 0) this.x = b.x + b.width;
                    else this.x = b.x - this.width;
                } else if (direction === "vertical") {
                    if (this.vy > 0) {
                        this.y = b.y - this.height;
                        if (this.type === "star") {
                            this.vy = -4.0;
                        } else {
                            this.vy = 0;
                        }
                    } else if (this.vy < 0) {
                        this.y = b.y + b.height;
                        this.vy = 0;
                    }
                }
            }
        }
    }

    draw(ctx, cameraX) {
        const drawX = Math.floor(this.x - cameraX);
        const drawY = Math.floor(this.y);

        if (this.type === "mushroom") {
            ctx.fillStyle = "#e60012";
            ctx.fillRect(drawX + 2, drawY, 10, 4);
            ctx.fillRect(drawX, drawY + 4, 14, 4);
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(drawX + 3, drawY + 1, 2, 2);
            ctx.fillRect(drawX + 9, drawY + 2, 2, 2);
            ctx.fillRect(drawX + 6, drawY + 4, 2, 3);
            ctx.fillStyle = "#ffdbb5";
            ctx.fillRect(drawX + 4, drawY + 8, 6, 6);
            ctx.fillStyle = "#000";
            ctx.fillRect(drawX + 5, drawY + 9, 1, 2);
            ctx.fillRect(drawX + 8, drawY + 9, 1, 2);
        } else if (this.type === "star") {
            ctx.fillStyle = "#fcc01e";
            ctx.fillRect(drawX + 6, drawY, 2, 2);
            ctx.fillRect(drawX + 5, drawY + 2, 4, 2);
            ctx.fillRect(drawX + 2, drawY + 4, 10, 2);
            ctx.fillRect(drawX, drawY + 6, 14, 2);
            ctx.fillRect(drawX + 2, drawY + 8, 10, 2);
            ctx.fillRect(drawX + 4, drawY + 10, 6, 2);
            ctx.fillRect(drawX + 2, drawY + 12, 3, 2);
            ctx.fillRect(drawX + 9, drawY + 12, 3, 2);

            ctx.fillStyle = "#000000";
            ctx.fillRect(drawX + 5, drawY + 6, 1, 3);
            ctx.fillRect(drawX + 8, drawY + 6, 1, 3);
        }
    }
}

// 敵人 (經典 Goomba)
class Enemy {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 16;
        this.height = 16;
        this.vx = -0.5;
        this.vy = 0;
        this.isDead = false;
        this.deadTimer = 0;
        this.walkFrame = 0;
    }

    update(blocks) {
        if (this.isDead) {
            this.deadTimer++;
            if (this.vy !== 0 || this.vx !== 0) {
                this.vy += GRAVITY;
                this.x += this.vx;
                this.y += this.vy;
            }
            return;
        }

        this.walkFrame = (this.walkFrame + 0.1) % 2;

        this.vy += GRAVITY;
        this.x += this.vx;
        this.resolveBlockCollisions(blocks, "horizontal");
        this.y += this.vy;
        this.resolveBlockCollisions(blocks, "vertical");
    }

    resolveBlockCollisions(blocks, direction) {
        for (let b of blocks) {
            if (b.type === "empty") continue;
            if (this.x < b.x + b.width &&
                this.x + this.width > b.x &&
                this.y < b.y + b.height &&
                this.y + this.height > b.y) {
                
                if (direction === "horizontal") {
                    this.vx *= -1;
                    if (this.vx > 0) this.x = b.x + b.width;
                    else this.x = b.x - this.width;
                } else if (direction === "vertical") {
                    if (this.vy > 0) {
                        this.y = b.y - this.height;
                        this.vy = 0;
                    } else if (this.vy < 0) {
                        this.y = b.y + b.height;
                        this.vy = 0;
                    }
                }
            }
        }
    }

    draw(ctx, cameraX, theme) {
        const drawX = Math.floor(this.x - cameraX);
        const drawY = Math.floor(this.y);

        if (this.isDead) {
            if (this.vy !== 0) {
                ctx.save();
                ctx.translate(drawX + this.width/2, drawY + this.height/2);
                ctx.scale(1, -1);
                ctx.translate(-(drawX + this.width/2), -(drawY + this.height/2));
                this.drawEntity(ctx, drawX, drawY, theme);
                ctx.restore();
            } else {
                ctx.fillStyle = theme === "underground" ? "#0088fc" : "#c84c0c";
                ctx.fillRect(drawX, drawY + 10, 16, 6);
                ctx.fillStyle = "#fcbcb0";
                ctx.fillRect(drawX + 2, drawY + 8, 12, 2);
            }
            return;
        }

        this.drawEntity(ctx, drawX, drawY, theme);
    }

    drawEntity(ctx, drawX, drawY, theme) {
        const walkOffset = Math.floor(this.walkFrame) === 0 ? 0 : 1;
        const mainColor = theme === "underground" ? "#0088fc" : "#c84c0c";

        ctx.fillStyle = mainColor;
        ctx.fillRect(drawX + 2, drawY, 12, 4);
        ctx.fillRect(drawX, drawY + 4, 16, 4);
        ctx.fillStyle = "#fcbcb0";
        ctx.fillRect(drawX + 3, drawY + 8, 10, 5);
        ctx.fillStyle = "#000";
        ctx.fillRect(drawX + 5, drawY + 8, 1, 2);
        ctx.fillRect(drawX + 10, drawY + 8, 1, 2);
        ctx.fillStyle = theme === "underground" ? "#002fa7" : "#6b5c00";
        if (walkOffset === 0) {
            ctx.fillRect(drawX + 1, drawY + 13, 4, 3);
            ctx.fillRect(drawX + 11, drawY + 13, 4, 3);
        } else {
            ctx.fillRect(drawX + 2, drawY + 13, 4, 3);
            ctx.fillRect(drawX + 10, drawY + 13, 4, 3);
        }
    }
}

// 玩家類別
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 12;
        this.height = 16;
        this.vx = 0;
        this.vy = 0;
        
        this.isSuper = false;
        this.isDead = false;
        this.invincibleFrames = 0;
        this.starFrames = 0;
        
        this.onGround = false;
        this.facingRight = true;
        this.walkFrame = 0;
        this.jumpTimer = 0;
        this.bombCooldown = 0;
    }

    update(blocks, mapWidth, triggerGameOver) {
        if (this.isDead) {
            this.vy += 0.22;
            this.y += this.vy;
            if (this.y > 240) {
                triggerGameOver();
            }
            return;
        }

        if (this.invincibleFrames > 0) this.invincibleFrames--;
        if (this.starFrames > 0) this.starFrames--;
        if (this.bombCooldown > 0) this.bombCooldown--;

        const currentMaxSpeed = this.starFrames > 0 ? STAR_MAX_SPEED : MAX_SPEED;

        if (keys.Left) {
            this.vx -= ACCEL;
            if (this.vx < -currentMaxSpeed) this.vx = -currentMaxSpeed;
            this.facingRight = false;
        } else if (keys.Right) {
            this.vx += ACCEL;
            if (this.vx > currentMaxSpeed) this.vx = currentMaxSpeed;
            this.facingRight = true;
        } else {
            this.vx *= FRICTION;
            if (Math.abs(this.vx) < 0.05) this.vx = 0;
        }

        if (keys.Jump) {
            if (this.onGround) {
                this.vy = this.isSuper ? SUPER_JUMP_FORCE : JUMP_FORCE;
                this.onGround = false;
                this.jumpTimer = 8;
            } else if (this.jumpTimer > 0) {
                this.vy -= 0.15;
                this.jumpTimer--;
            }
        } else {
            this.jumpTimer = 0;
        }

        if (keys.Attack && this.bombCooldown === 0 && (this.isSuper || this.starFrames > 0)) {
            this.bombCooldown = 25;
            const bombVx = this.facingRight ? 3.0 : -3.0;
            const bombVy = -2.5;
            const bombX = this.facingRight ? this.x + this.width : this.x - 10;
            const bombY = this.y + (this.isSuper ? 10 : 2);
            gameInstance.bombs.push(new Bomb(bombX, bombY, bombVx, bombVy));
        }

        this.vy += GRAVITY;

        this.x += this.vx;
        if (this.x < 0) {
            this.x = 0;
            this.vx = 0;
        }
        if (this.x > mapWidth - this.width) {
            this.x = mapWidth - this.width;
            this.vx = 0;
        }
        this.resolveBlockCollisions(blocks, "horizontal");

        this.y += this.vy;
        this.onGround = false;
        this.resolveBlockCollisions(blocks, "vertical");

        if (this.y > 224) {
            this.die();
        }

        if (this.onGround && Math.abs(this.vx) > 0.1) {
            this.walkFrame = (this.walkFrame + 0.15) % 3;
        } else {
            this.walkFrame = 0;
        }
    }

    resolveBlockCollisions(blocks, direction) {
        for (let b of blocks) {
            if (b.type === "empty") continue;
            if (this.x < b.x + b.width &&
                this.x + this.width > b.x &&
                this.y < b.y + b.height &&
                this.y + this.height > b.y) {

                if (direction === "horizontal") {
                    if (this.vx > 0) {
                        this.x = b.x - this.width;
                        this.vx = 0;
                    } else if (this.vx < 0) {
                        this.x = b.x + b.width;
                        this.vx = 0;
                    }
                } else if (direction === "vertical") {
                    if (this.vy > 0) {
                        this.y = b.y - this.height;
                        this.vy = 0;
                        this.onGround = true;
                    } else if (this.vy < 0) {
                        this.y = b.y + b.height;
                        this.vy = 0;
                        b.hit(this);
                    }
                }
            }
        }
    }

    grow() {
        if (!this.isSuper) {
            this.isSuper = true;
            this.y -= 16;
            this.height = 30;
        }
    }

    hurt() {
        if (this.invincibleFrames > 0 || this.starFrames > 0) return;
        if (this.isSuper) {
            this.isSuper = false;
            this.height = 16;
            this.invincibleFrames = 120;
        } else {
            this.die();
        }
    }

    die() {
        if (this.isDead) return;
        this.isDead = true;
        this.vy = -5.0;
    }

    draw(ctx, cameraX) {
        if (this.invincibleFrames > 0 && Math.floor(this.invincibleFrames / 4) % 2 === 0) {
            return;
        }

        const drawX = Math.floor(this.x - cameraX);
        const drawY = Math.floor(this.y);

        ctx.save();
        if (!this.facingRight) {
            ctx.translate(drawX + this.width / 2, drawY + this.height / 2);
            ctx.scale(-1, 1);
            ctx.translate(-(drawX + this.width / 2), -(drawY + this.height / 2));
        }

        let clothingColor = "#e60012";
        let pantsColor = "#002fa7";

        if (this.starFrames > 0) {
            const hue = (Date.now() / 4) % 360;
            clothingColor = `hsl(${hue}, 100%, 55%)`;
            pantsColor = `hsl(${(hue + 120) % 360}, 100%, 45%)`;
        }

        if (!this.isSuper) {
            ctx.fillStyle = clothingColor;
            ctx.fillRect(drawX + 2, drawY, 8, 3);
            ctx.fillRect(drawX + 3, drawY + 3, 5, 2);
            ctx.fillRect(drawX + 1, drawY + 8, 10, 4);

            ctx.fillStyle = "#ffdbb5";
            ctx.fillRect(drawX + 3, drawY + 4, 7, 4);
            ctx.fillStyle = "#000";
            ctx.fillRect(drawX + 7, drawY + 4, 1, 2);

            ctx.fillStyle = pantsColor;
            ctx.fillRect(drawX + 3, drawY + 12, 6, 4);
            ctx.fillStyle = "#7b4f00";
            ctx.fillRect(drawX + 2, drawY + 15, 8, 1);
        } else {
            ctx.fillStyle = clothingColor;
            ctx.fillRect(drawX + 1, drawY, 10, 4);
            ctx.fillRect(drawX + 3, drawY + 4, 7, 2);

            ctx.fillStyle = "#ffdbb5";
            ctx.fillRect(drawX + 3, drawY + 6, 7, 6);
            ctx.fillStyle = "#000";
            ctx.fillRect(drawX + 7, drawY + 6, 1, 2);

            ctx.fillStyle = clothingColor;
            ctx.fillRect(drawX, drawY + 12, 12, 8);

            ctx.fillStyle = pantsColor;
            ctx.fillRect(drawX + 2, drawY + 18, 8, 10);
            
            ctx.fillStyle = "#7b4f00";
            ctx.fillRect(drawX + 1, drawY + 28, 10, 2);
        }

        ctx.restore();
    }
}

// 地圖方塊
class Block {
    constructor(x, y, type, itemType = null) {
        this.x = x;
        this.y = y;
        this.width = TILE_SIZE;
        this.height = TILE_SIZE;
        this.type = type;
        this.itemType = itemType;
        this.bounceY = 0;
        this.bounceTimer = 0;
    }

    update() {
        if (this.bounceTimer > 0) {
            this.bounceTimer--;
            this.bounceY = Math.sin((this.bounceTimer / 10) * Math.PI) * -3;
        } else {
            this.bounceY = 0;
        }
    }

    hit(player) {
        if (this.type === "question") {
            this.bounceTimer = 10;
            this.type = "solid_empty";

            if (this.itemType === "coin") {
                gameInstance.coins++;
                gameInstance.score += 200;
                gameInstance.particles.push(new Particle(this.x + 4, this.y - 12, 0, -4, "#fcc01e", 6, 0.25, 20));
                gameInstance.floatingTexts.push(new FloatingText(this.x, this.y - 8, "200"));
            } else if (this.itemType === "mushroom") {
                const mushroom = new Powerup(this.x, this.y, "mushroom");
                gameInstance.powerups.push(mushroom);
            } else if (this.itemType === "star") {
                const star = new Powerup(this.x, this.y, "star");
                gameInstance.powerups.push(star);
            }
        } else if (this.type === "brick") {
            if (player.isSuper) {
                gameInstance.particles.push(new Particle(this.x, this.y, -1.5, -3, gameInstance.getBrickColor(), 4));
                gameInstance.particles.push(new Particle(this.x + 8, this.y, 1.5, -3, gameInstance.getBrickColor(), 4));
                gameInstance.particles.push(new Particle(this.x, this.y + 8, -1, -1.5, gameInstance.getBrickColor(), 4));
                gameInstance.particles.push(new Particle(this.x + 8, this.y + 8, 1, -1.5, gameInstance.getBrickColor(), 4));
                
                this.type = "empty";
                gameInstance.score += 50;
            } else {
                this.bounceTimer = 10;
            }
        }
    }

    draw(ctx, cameraX, theme) {
        if (this.type === "empty") return;

        const drawX = Math.floor(this.x - cameraX);
        const drawY = Math.floor(this.y + this.bounceY);

        let groundColor = "#c84c0c";
        let brickColor = "#c84c0c";
        let strokeColor = "#000";
        let lightColor = "#fcbcb0";

        if (theme === "underground") {
            groundColor = "#005cba";
            brickColor = "#0088fc";
            strokeColor = "#000";
            lightColor = "#00e8ff";
        } else if (theme === "castle") {
            groundColor = "#5c5c5c";
            brickColor = "#9c9c9c";
            strokeColor = "#000";
            lightColor = "#ff5500";
        }

        switch (this.type) {
            case "ground":
                ctx.fillStyle = groundColor;
                ctx.fillRect(drawX, drawY, 16, 16);
                ctx.strokeStyle = strokeColor;
                ctx.strokeRect(drawX, drawY, 16, 16);
                ctx.fillStyle = lightColor;
                ctx.fillRect(drawX + 1, drawY + 1, 14, 1);
                ctx.fillRect(drawX + 1, drawY + 2, 1, 13);
                break;

            case "brick":
                ctx.fillStyle = brickColor;
                ctx.fillRect(drawX, drawY, 16, 16);
                ctx.fillStyle = strokeColor;
                ctx.fillRect(drawX, drawY + 7, 16, 1);
                ctx.fillRect(drawX, drawY + 15, 16, 1);
                ctx.fillRect(drawX + 8, drawY, 1, 8);
                ctx.fillRect(drawX + 4, drawY + 8, 1, 8);
                ctx.fillRect(drawX + 12, drawY + 8, 1, 8);
                break;

            case "question":
                ctx.fillStyle = lightColor;
                ctx.fillRect(drawX, drawY, 16, 16);
                ctx.strokeStyle = brickColor;
                ctx.strokeRect(drawX, drawY, 16, 16);
                
                ctx.fillStyle = theme === "underground" ? "#005cba" : "#6b5c00";
                ctx.font = "8px 'Press Start 2P'";
                ctx.fillText("?", drawX + 5, drawY + 11);
                break;

            case "solid_empty":
                ctx.fillStyle = "#6b5c00";
                ctx.fillRect(drawX, drawY, 16, 16);
                ctx.strokeStyle = "#000";
                ctx.strokeRect(drawX, drawY, 16, 16);
                ctx.fillStyle = "#9c9c9c";
                ctx.fillRect(drawX + 2, drawY + 2, 2, 2);
                ctx.fillRect(drawX + 12, drawY + 2, 2, 2);
                ctx.fillRect(drawX + 2, drawY + 12, 2, 2);
                ctx.fillRect(drawX + 12, drawY + 12, 2, 2);
                break;

            case "pipe_tl":
                ctx.fillStyle = "#00a800";
                ctx.fillRect(drawX, drawY, 16, 16);
                ctx.fillStyle = "#fff";
                ctx.fillRect(drawX + 2, drawY, 2, 16);
                ctx.strokeStyle = "#000";
                ctx.strokeRect(drawX, drawY, 16, 16);
                break;

            case "pipe_tr":
                ctx.fillStyle = "#00a800";
                ctx.fillRect(drawX, drawY, 16, 16);
                ctx.fillStyle = "#005c00";
                ctx.fillRect(drawX + 10, drawY, 6, 16);
                ctx.strokeStyle = "#000";
                ctx.strokeRect(drawX, drawY, 16, 16);
                break;

            case "pipe_l":
                ctx.fillStyle = "#00a800";
                ctx.fillRect(drawX + 2, drawY, 14, 16);
                ctx.fillStyle = "#fff";
                ctx.fillRect(drawX + 4, drawY, 2, 16);
                ctx.strokeStyle = "#000";
                ctx.strokeRect(drawX + 2, drawY, 14, 16);
                break;

            case "pipe_r":
                ctx.fillStyle = "#00a800";
                ctx.fillRect(drawX, drawY, 14, 16);
                ctx.fillStyle = "#005c00";
                ctx.fillRect(drawX + 8, drawY, 6, 16);
                ctx.strokeStyle = "#000";
                ctx.strokeRect(drawX, drawY, 14, 16);
                break;
        }
    }
}

// 關卡庫數據 (一共 9 關，回歸經典 Goomba 關卡)
const STAGES = [
    // 關卡 1-1: 經典新手教學
    {
        name: "1-1",
        theme: "overworld",
        map: [
            "                                                                                                                                ",
            "                                                                                                                                ",
            "                                                                                                                                ",
            "                                                                                                                                ",
            "                                                                                                                                ",
            "                                                                                                                                ",
            "                                                                                                                                ",
            "                                                                                                                                ",
            "                                                                                                                                ",
            "                                                                                                                                ",
            "                    2  5  2  4  2                             2  3  5  3  2                                                     ",
            "                                                                                                                                ",
            "                                             67          67                                                                     ",
            "                                             89          89                     11111                                           ",
            " 111111111111111111111111111111111111111111111111   111111111111111111111111111111111111111111111111111111111111111111111111111 ",
            " 111111111111111111111111111111111111111111111111   111111111111111111111111111111111111111111111111111111111111111111111111111 "
        ],
        enemies: [
            { x: 220, y: 150, type: "goomba" },
            { x: 380, y: 150, type: "goomba" },
            { x: 540, y: 150, type: "goomba" },
            { x: 700, y: 150, type: "goomba" }
        ]
    },
    // 關卡 1-2: 經典平台
    {
        name: "1-2",
        theme: "overworld",
        map: [
            "                                                                                                                                ",
            "                                                                                                                                ",
            "                                                                                                                                ",
            "                                                                                                                                ",
            "                                                                                                                                ",
            "                                                                                                                                ",
            "                                                                                                                                ",
            "                                                                                                                                ",
            "                                                                                                                                ",
            "                                                                                                                                ",
            "         2  4  2                     2  3  2                     2  5  2                                                        ",
            "                                                                                                                                ",
            "                     67                      67                      67                                                         ",
            "                     89                      89                      89                                                         ",
            " 11111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111 ",
            " 11111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111 "
        ],
        enemies: [
            { x: 280, y: 150, type: "goomba" },
            { x: 480, y: 150, type: "goomba" },
            { x: 680, y: 150, type: "goomba" }
        ]
    },
    // 關卡 1-3: 地下世界
    {
        name: "1-3",
        theme: "underground",
        map: [
            "                                                                                                                                ",
            "                                                                                                                                ",
            "                                                                                                                                ",
            "                                                                                                                                ",
            "                                                                                                                                ",
            "                                                                                                                                ",
            "                                                                                                                                ",
            "                                                                                                                                ",
            "                                                                                                                                ",
            "                                                                                                                                ",
            "                  2  3  5  3  2                               2  4  2                                                           ",
            "                                                                                                                                ",
            "                                     67                                                                                         ",
            "                                     89                                                                                         ",
            " 1111111111111111111111111111111111111111111111111      11111111111111111111111111111111111111111111111111111111111111111111111 ",
            " 1111111111111111111111111111111111111111111111111      11111111111111111111111111111111111111111111111111111111111111111111111 "
        ],
        enemies: [
            { x: 260, y: 150, type: "goomba" },
            { x: 500, y: 150, type: "goomba" },
            { x: 740, y: 150, type: "goomba" }
        ]
    },
    // 關卡 1-4: 懸崖裂谷
    {
        name: "1-4",
        theme: "underground",
        map: [
            "                                                                                                                                ",
            "                                                                                                                                ",
            "                                                                                                                                ",
            "                                                                                                                                ",
            "                                                                                                                                ",
            "                                                                                                                                ",
            "                                                                                                                                ",
            "                                                                                                                                ",
            "                                                                                                                                ",
            "                                                                                                                                ",
            "                 2  4  2                2  3  2                2  5  2                                                          ",
            "                                                                                                                                ",
            "                                                                                                                                ",
            "                                                                                                                                ",
            " 1111111111111111111    111111111111111    111111111111111    11111111111111111111111111111111111111111111111111111111111111111 ",
            " 1111111111111111111    111111111111111    111111111111111    11111111111111111111111111111111111111111111111111111111111111111 "
        ],
        enemies: [
            { x: 300, y: 150, type: "goomba" },
            { x: 550, y: 150, type: "goomba" }
        ]
    },
    // 關卡 1-5: 磚牆通道
    {
        name: "1-5",
        theme: "overworld",
        map: [
            "                                                                                                                                ",
            "                                                                                                                                ",
            "                                                                                                                                ",
            "                                                                                                                                ",
            "                                                                                                                                ",
            "                                                                                                                                ",
            "                                                                                                                                ",
            "                                                                                                                                ",
            "                                                                                                                                ",
            "                                                                                                                                ",
            "               2  4  2                                      2  5  2                                                             ",
            "                                                                                                                                ",
            "                         2222222                  2222222                                                                       ",
            "                         2222222                  2222222                                                                       ",
            " 11111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111 ",
            " 11111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111 "
        ],
        enemies: [
            { x: 180, y: 150, type: "goomba" },
            { x: 300, y: 100, type: "goomba" },
            { x: 500, y: 100, type: "goomba" },
            { x: 600, y: 100, type: "goomba" }
        ]
    },
    // 關卡 1-6: 水管夾縫
    {
        name: "1-6",
        theme: "overworld",
        map: [
            "                                                                                                                                ",
            "                                                                                                                                ",
            "                                                                                                                                ",
            "                                                                                                                                ",
            "                                                                                                                                ",
            "                                                                                                                                ",
            "                                                                                                                                ",
            "                                                                                                                                ",
            "                                                                                                                                ",
            "                                                                                                                                ",
            "           2  4  2                     2  5  2                                                                                  ",
            "                                                                                                                                ",
            "                       67                      67                      67                                                       ",
            "                       89                      89                      89                                                       ",
            " 11111111111111111111118911111111111111111111118911111111111111111111118911111111111111111111111111111111111111111111111111111 ",
            " 11111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111 "
        ],
        enemies: [
            { x: 150, y: 150, type: "goomba" },
            { x: 350, y: 150, type: "goomba" },
            { x: 550, y: 150, type: "goomba" }
        ]
    },
    // 關卡 1-7: 地底寶藏
    {
        name: "1-7",
        theme: "underground",
        map: [
            "                                                                                                                                ",
            "                                                                                                                                ",
            "                                                                                                                                ",
            "                                                                                                                                ",
            "                                                                                                                                ",
            "                                                                                                                                ",
            "                                                                                                                                ",
            "                                                                                                                                ",
            "                                                                                                                                ",
            "                                                                                                                                ",
            "                 2  5  2                2  5  2                2  5  2                                                          ",
            "                                                                                                                                ",
            "                                                                                                                                ",
            "                                                                                                                                ",
            " 111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111 ",
            " 111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111 "
        ],
        enemies: [
            { x: 220, y: 150, type: "goomba" },
            { x: 420, y: 150, type: "goomba" },
            { x: 620, y: 150, type: "goomba" }
        ]
    },
    // 關卡 1-8: 浮動小島
    {
        name: "1-8",
        theme: "overworld",
        map: [
            "                                                                                                                                ",
            "                                                                                                                                ",
            "                                                                                                                                ",
            "                                                                                                                                ",
            "                                                                                                                                ",
            "                                                                                                                                ",
            "                                                                                                                                ",
            "                                                                                                                                ",
            "                                                                                                                                ",
            "                                                                                                                                ",
            "             2  4  2                     2  5  2                                                                                ",
            "                                                                                                                                ",
            "                                                                                                                                ",
            "                                                                                                                                ",
            " 111111111       111111111       111111111       111111111       11111111111111111111111111111111111111111111111111111111111111 ",
            " 111111111       111111111       111111111       111111111       11111111111111111111111111111111111111111111111111111111111111 "
        ],
        enemies: [
            { x: 200, y: 150, type: "goomba" },
            { x: 500, y: 150, type: "goomba" },
            { x: 800, y: 150, type: "goomba" }
        ]
    },
    // 關卡 1-9: 庫巴大城堡
    {
        name: "1-9",
        theme: "castle",
        map: [
            "                                                                                                                                ",
            "                                                                                                                                ",
            "                                                                                                                                ",
            "                                                                                                                                ",
            "                                                                                                                                ",
            "                                                                                                                                ",
            "                                                                                                                                ",
            "                                                                                                                                ",
            "                                                                                                                                ",
            "                                                                                                                                ",
            "                 2  4  2                2  5  2                2  3  2                                                          ",
            "                                                                                                                                ",
            "                                                                                                                                ",
            "                                                                                                                                ",
            " 11111111111111111     11111111111111     11111111111111     111111111111111111111111111111111111111111111111111111111111111111 ",
            " 11111111111111111     11111111111111     11111111111111     111111111111111111111111111111111111111111111111111111111111111111 "
        ],
        enemies: [
            { x: 220, y: 150, type: "goomba" },
            { x: 420, y: 150, type: "goomba" },
            { x: 620, y: 150, type: "goomba" },
            { x: 800, y: 150, type: "goomba" }
        ]
    }
];

// 遊戲總管理器
class Game {
    constructor() {
        this.score = 0;
        this.coins = 0;
        this.timeLeft = 400;
        this.gameTimer = 0;
        this.cameraX = 0;
        this.mapWidth = 0;
        
        this.currentStageIndex = 0; // 當前關卡索引 (0-8)
        this.isCleared = false; // 整體遊戲破關
        this.isGameOver = false;

        this.player = null;
        this.blocks = [];
        this.enemies = [];
        this.powerups = [];
        this.bombs = [];
        this.particles = [];
        this.floatingTexts = [];
        
        this.flagX = 0;
        
        this.init();
    }

    init() {
        this.timeLeft = 400;
        this.cameraX = 0;
        this.isGameOver = false;

        this.blocks = [];
        this.enemies = [];
        this.powerups = [];
        this.bombs = [];
        this.particles = [];
        this.floatingTexts = [];

        const currentStage = STAGES[this.currentStageIndex];
        const levelData = currentStage.map;
        this.mapWidth = levelData[0].length * TILE_SIZE;

        for (let row = 0; row < levelData.length; row++) {
            for (let col = 0; col < levelData[row].length; col++) {
                const char = levelData[row][col];
                const x = col * TILE_SIZE;
                const y = row * TILE_SIZE;

                if (char === "1") {
                    this.blocks.push(new Block(x, y, "ground"));
                } else if (char === "2") {
                    this.blocks.push(new Block(x, y, "brick"));
                } else if (char === "3") {
                    this.blocks.push(new Block(x, y, "question", "coin"));
                } else if (char === "4") {
                    this.blocks.push(new Block(x, y, "question", "mushroom"));
                } else if (char === "5") {
                    this.blocks.push(new Block(x, y, "question", "star"));
                } else if (char === "6") {
                    this.blocks.push(new Block(x, y, "pipe_tl"));
                } else if (char === "7") {
                    this.blocks.push(new Block(x, y, "pipe_tr"));
                } else if (char === "8") {
                    this.blocks.push(new Block(x, y, "pipe_l"));
                } else if (char === "9") {
                    this.blocks.push(new Block(x, y, "pipe_r"));
                }
            }
        }

        const prevSuper = this.player ? this.player.isSuper : false;
        this.player = new Player(30, 100);
        if (prevSuper) this.player.grow();

        for (let eData of currentStage.enemies) {
            this.enemies.push(new Enemy(eData.x, eData.y));
        }

        this.flagX = (levelData[0].length - 8) * TILE_SIZE;

        worldVal.textContent = currentStage.name;
        overlayScreen.classList.add("hidden");
    }

    getBrickColor() {
        const theme = STAGES[this.currentStageIndex].theme;
        if (theme === "underground") return "#0088fc";
        if (theme === "castle") return "#9c9c9c";
        return "#c84c0c";
    }

    update() {
        if (this.isCleared) {
            if (keys.Restart) {
                this.currentStageIndex = 0;
                this.isCleared = false;
                this.score = 0;
                this.coins = 0;
                this.init();
            }
            return;
        }

        if (this.isGameOver) {
            if (keys.Restart) {
                this.score = 0;
                this.coins = 0;
                this.init();
            }
            return;
        }

        this.gameTimer++;
        if (this.gameTimer >= 60) {
            this.gameTimer = 0;
            this.timeLeft--;
            if (this.timeLeft <= 0) {
                this.player.die();
            }
        }

        for (let b of this.blocks) {
            b.update();
        }

        this.player.update(this.blocks, this.mapWidth, () => this.triggerGameOver());

        for (let bm of this.bombs) {
            bm.update(this.blocks, this.enemies);
        }
        this.bombs = this.bombs.filter(bm => !bm.isExploded);

        for (let p of this.powerups) {
            p.update(this.blocks);

            if (!this.player.isDead &&
                this.player.x < p.x + p.width &&
                this.player.x + this.player.width > p.x &&
                this.player.y < p.y + p.height &&
                this.player.y + this.player.height > p.y) {
                
                if (p.type === "mushroom") {
                    this.player.grow();
                    this.score += 1000;
                    this.floatingTexts.push(new FloatingText(p.x, p.y, "1000", "#00ffff"));
                } else if (p.type === "star") {
                    this.player.starFrames = 600;
                    this.score += 1000;
                    this.floatingTexts.push(new FloatingText(p.x, p.y, "STAR POWER!", "#ff00ff"));
                }
                this.powerups = this.powerups.filter(x => x !== p);
            }
        }

        const theme = STAGES[this.currentStageIndex].theme;
        for (let e of this.enemies) {
            e.update(this.blocks);

            if (!this.player.isDead && !e.isDead &&
                this.player.x < e.x + e.width &&
                this.player.x + this.player.width > e.x &&
                this.player.y < e.y + e.height &&
                this.player.y + this.player.height > e.y) {

                if (this.player.starFrames > 0) {
                    e.isDead = true;
                    e.vx = this.player.vx > 0 ? 1.5 : -1.5;
                    e.vy = -3.5;
                    this.score += 200;
                    this.floatingTexts.push(new FloatingText(e.x, e.y, "200", "#ff00ff"));
                } else if (this.player.vy > 0 && this.player.y + this.player.height - this.player.vy <= e.y + 6) {
                    e.isDead = true;
                    this.player.vy = -3.5;
                    this.score += 100;
                    this.floatingTexts.push(new FloatingText(e.x, e.y, "100"));
                    this.particles.push(new Particle(e.x + 8, e.y + 8, 0, -1, "#fcbcb0", 4, 0.1, 15));
                } else {
                    this.player.hurt();
                }
            }
        }

        this.enemies = this.enemies.filter(e => !e.isDead || e.deadTimer < 30);

        for (let pt of this.particles) {
            pt.update();
        }
        this.particles = this.particles.filter(pt => pt.life > 0);

        for (let ft of this.floatingTexts) {
            ft.update();
        }
        this.floatingTexts = this.floatingTexts.filter(ft => ft.life > 0);

        if (!this.player.isDead && this.player.x >= this.flagX) {
            this.handleStageClear();
        }

        const targetCamX = this.player.x - 100;
        if (targetCamX > this.cameraX) {
            this.cameraX = targetCamX;
        }
        if (this.cameraX > this.mapWidth - 256) {
            this.cameraX = this.mapWidth - 256;
        }
        
        scoreVal.textContent = String(this.score).padStart(6, "0");
        coinsVal.textContent = "x" + String(this.coins).padStart(2, "0");
        timeVal.textContent = String(Math.max(0, this.timeLeft)).padStart(3, "0");
    }

    handleStageClear() {
        this.score += this.timeLeft * 10;
        
        if (this.currentStageIndex < STAGES.length - 1) {
            this.currentStageIndex++;
            this.init();
            this.floatingTexts.push(new FloatingText(this.player.x, this.player.y - 20, "STAGE CLEAR!", "#00ffff"));
        } else {
            this.isCleared = true;
            overlayTitle.textContent = "ALL STAGES CLEAR!";
            overlayTitle.style.color = "#ffe000";
            overlayScreen.classList.remove("hidden");
        }
    }

    draw() {
        const currentStage = STAGES[this.currentStageIndex];
        if (currentStage.theme === "underground") {
            ctx.fillStyle = "#0c0818";
        } else if (currentStage.theme === "castle") {
            ctx.fillStyle = "#200408";
        } else {
            ctx.fillStyle = "#5c94fc";
        }
        ctx.fillRect(0, 0, 256, 224);

        this.drawBackgroundDecorations(currentStage.theme);
        this.drawFlagpole(currentStage.theme);

        for (let b of this.blocks) {
            if (b.x + 16 >= this.cameraX && b.x <= this.cameraX + 256) {
                b.draw(ctx, this.cameraX, currentStage.theme);
            }
        }

        for (let p of this.powerups) {
            p.draw(ctx, this.cameraX);
        }

        for (let bm of this.bombs) {
            bm.draw(ctx, this.cameraX);
        }

        for (let e of this.enemies) {
            if (e.x + 16 >= this.cameraX && e.x <= this.cameraX + 256) {
                e.draw(ctx, this.cameraX, currentStage.theme);
            }
        }

        this.player.draw(ctx, this.cameraX);

        for (let pt of this.particles) {
            pt.draw(ctx, this.cameraX);
        }
        for (let ft of this.floatingTexts) {
            ft.draw(ctx, this.cameraX);
        }
    }

    drawBackgroundDecorations(theme) {
        if (theme === "overworld") {
            ctx.fillStyle = "#fff";
            const clouds = [
                { x: 100, y: 30, w: 24 },
                { x: 300, y: 20, w: 32 },
                { x: 550, y: 40, w: 24 },
                { x: 750, y: 30, w: 32 },
                { x: 1000, y: 25, w: 40 }
            ];
            for (let c of clouds) {
                let cx = c.x - this.cameraX * 0.5;
                ctx.fillRect(cx, c.y, c.w, 8);
                ctx.fillRect(cx + 4, c.y - 4, c.w - 8, 4);
                ctx.fillRect(cx + 8, c.y + 8, c.w - 16, 4);
            }

            ctx.fillStyle = "#00a800";
            const hills = [
                { x: 50, w: 40, h: 20 },
                { x: 400, w: 60, h: 30 },
                { x: 700, w: 50, h: 25 },
                { x: 1200, w: 80, h: 35 }
            ];
            for (let h of hills) {
                let hx = h.x - this.cameraX * 0.7;
                ctx.beginPath();
                ctx.moveTo(hx, 224 - 32);
                ctx.lineTo(hx + h.w / 2, 224 - 32 - h.h);
                ctx.lineTo(hx + h.w, 224 - 32);
                ctx.fill();
            }
        } else if (theme === "underground") {
            ctx.fillStyle = "#2c1e4c";
            for (let i = 0; i < 5; i++) {
                let rx = (i * 200) - this.cameraX * 0.3;
                ctx.fillRect(rx, 40, 24, 24);
                ctx.fillRect(rx + 80, 80, 16, 32);
                ctx.fillRect(rx + 140, 50, 32, 16);
            }
        } else if (theme === "castle") {
            ctx.fillStyle = "#3a060e";
            for (let i = 0; i < 6; i++) {
                let cx = (i * 180) - this.cameraX * 0.4;
                ctx.fillRect(cx, 30, 20, 100);
                ctx.fillRect(cx + 80, 50, 20, 80);
            }

            ctx.fillStyle = "#ff2200";
            if (Math.floor(Date.now() / 150) % 2 === 0) {
                ctx.fillStyle = "#ff5500";
            }
            for (let b of this.blocks) {
                if (b.type === "empty") continue;
            }
        }
    }

    drawFlagpole(theme) {
        const flagDrawX = Math.floor(this.flagX - this.cameraX);
        
        ctx.fillStyle = theme === "castle" ? "#a81000" : "#9c9c9c";
        ctx.fillRect(flagDrawX + 7, 32, 2, 160);
        ctx.fillStyle = theme === "underground" ? "#0088fc" : "#00a800";
        ctx.fillRect(flagDrawX + 5, 24, 6, 8);

        const castleX = flagDrawX + 40;
        ctx.fillStyle = theme === "underground" ? "#005cba" : "#c84c0c";
        ctx.fillRect(castleX, 224 - 80, 48, 48);
        ctx.fillStyle = "#000";
        ctx.fillRect(castleX + 16, 224 - 56, 16, 24);
        
        ctx.fillStyle = theme === "castle" ? "#ff5500" : "#6b5c00";
        ctx.fillRect(castleX + 4, 224 - 84, 8, 4);
        ctx.fillRect(castleX + 20, 224 - 84, 8, 4);
        ctx.fillRect(castleX + 36, 224 - 84, 8, 4);

        ctx.fillStyle = "#e60012";
        ctx.fillRect(flagDrawX - 12, 40, 19, 12);
        ctx.fillStyle = "#fff";
        ctx.font = "6px 'Press Start 2P'";
        ctx.fillText("M", flagDrawX - 6, 49);
    }

    triggerGameOver() {
        this.isGameOver = true;
        overlayTitle.textContent = "GAME OVER";
        overlayTitle.style.color = "#ff0055";
        overlayScreen.classList.remove("hidden");
    }
}

// 實例化遊戲並運行 Loop
const gameInstance = new Game();

function gameLoop() {
    gameInstance.update();
    gameInstance.draw();
    requestAnimationFrame(gameLoop);
}

gameLoop();
