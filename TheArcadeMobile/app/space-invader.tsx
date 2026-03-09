import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  PanResponder,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const PLAYER_SIZE = 40;
const ENEMY_SIZE = 36;
const LASER_W = 4;
const LASER_H = 16;
const PLAYER_SPEED = 5;
const PLAYER_LASER_SPEED = 8;
const ENEMY_LASER_SPEED = 4;
const ENEMY_BASE_VEL = 0.5;
const PLAYER_Y = SCREEN_H - 120;
const FIRE_COOLDOWN = 15; // frames
const ENEMY_FIRE_CHANCE = 0.003;

const ENEMY_COLORS = ['#ff6b6b', '#4ecdc4', '#c084fc', '#ffd93d'];

interface Laser {
  x: number;
  y: number;
  vy: number;
  color: string;
}

interface Enemy {
  x: number;
  y: number;
  color: string;
  alive: boolean;
}

interface GameState {
  playerX: number;
  playerHealth: number;
  playerLasers: Laser[];
  enemies: Enemy[];
  enemyLasers: Laser[];
  level: number;
  lives: number;
  score: number;
  fireCooldown: number;
  gameState: 'menu' | 'playing' | 'lost';
  lostTimer: number;
}

function spawnWave(level: number): Enemy[] {
  const count = 4 + level * 3;
  const cols = Math.min(count, 8);
  const rows = Math.ceil(count / cols);
  const enemies: Enemy[] = [];
  const spacingX = SCREEN_W / (cols + 1);
  const spacingY = 50;

  for (let r = 0; r < rows; r++) {
    const rowCount = r < rows - 1 ? cols : count - cols * (rows - 1);
    const rowSpacingX = SCREEN_W / (rowCount + 1);
    for (let c = 0; c < rowCount; c++) {
      enemies.push({
        x: rowSpacingX * (c + 1) - ENEMY_SIZE / 2,
        y: -60 - r * spacingY,
        color: ENEMY_COLORS[(r + c) % ENEMY_COLORS.length],
        alive: true,
      });
    }
  }
  return enemies;
}

export default function SpaceInvaderScreen() {
  const router = useRouter();
  const [, forceUpdate] = useState(0);
  const stateRef = useRef<GameState>(createInitialState());
  const rafRef = useRef<number>(0);
  const joystickRef = useRef({ active: false, dx: 0 });

  function createInitialState(): GameState {
    return {
      playerX: SCREEN_W / 2 - PLAYER_SIZE / 2,
      playerHealth: 100,
      playerLasers: [],
      enemies: spawnWave(1),
      enemyLasers: [],
      level: 1,
      lives: 3,
      score: 0,
      fireCooldown: 0,
      gameState: 'menu',
      lostTimer: 0,
    };
  }

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        joystickRef.current.active = true;
      },
      onPanResponderMove: (_, gesture) => {
        joystickRef.current.dx = gesture.dx;
      },
      onPanResponderRelease: () => {
        joystickRef.current.active = false;
        joystickRef.current.dx = 0;
      },
    })
  ).current;

  function rectCollide(
    ax: number, ay: number, aw: number, ah: number,
    bx: number, by: number, bw: number, bh: number
  ): boolean {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  const gameLoop = useCallback(() => {
    const s = stateRef.current;

    if (s.gameState === 'lost') {
      s.lostTimer++;
      if (s.lostTimer > 120) {
        // Auto-return to menu state
      }
      forceUpdate((n) => n + 1);
      rafRef.current = requestAnimationFrame(gameLoop);
      return;
    }

    if (s.gameState !== 'playing') {
      forceUpdate((n) => n + 1);
      rafRef.current = requestAnimationFrame(gameLoop);
      return;
    }

    // Player movement from joystick
    if (joystickRef.current.active) {
      const move = Math.sign(joystickRef.current.dx) * PLAYER_SPEED;
      s.playerX = Math.max(0, Math.min(SCREEN_W - PLAYER_SIZE, s.playerX + move));
    }

    // Auto-fire
    if (s.fireCooldown > 0) {
      s.fireCooldown--;
    } else {
      s.playerLasers.push({
        x: s.playerX + PLAYER_SIZE / 2 - LASER_W / 2,
        y: PLAYER_Y - LASER_H,
        vy: -PLAYER_LASER_SPEED,
        color: '#00bfff',
      });
      s.fireCooldown = FIRE_COOLDOWN;
    }

    // Move player lasers
    for (const laser of s.playerLasers) {
      laser.y += laser.vy;
    }
    s.playerLasers = s.playerLasers.filter((l) => l.y > -20);

    // Move enemies
    const enemyVel = ENEMY_BASE_VEL + s.level * 0.15;
    for (const enemy of s.enemies) {
      if (enemy.alive) {
        enemy.y += enemyVel;

        // Enemy fire
        if (Math.random() < ENEMY_FIRE_CHANCE) {
          s.enemyLasers.push({
            x: enemy.x + ENEMY_SIZE / 2 - LASER_W / 2,
            y: enemy.y + ENEMY_SIZE,
            vy: ENEMY_LASER_SPEED,
            color: enemy.color,
          });
        }

        // Enemy passed bottom
        if (enemy.y > SCREEN_H) {
          enemy.alive = false;
          s.lives--;
        }
      }
    }

    // Move enemy lasers
    for (const laser of s.enemyLasers) {
      laser.y += laser.vy;
    }
    s.enemyLasers = s.enemyLasers.filter((l) => l.y < SCREEN_H + 20);

    // Player laser vs enemy collision
    for (const laser of s.playerLasers) {
      for (const enemy of s.enemies) {
        if (
          enemy.alive &&
          rectCollide(laser.x, laser.y, LASER_W, LASER_H, enemy.x, enemy.y, ENEMY_SIZE, ENEMY_SIZE)
        ) {
          enemy.alive = false;
          laser.y = -100; // mark for removal
          s.score += 10;
        }
      }
    }
    s.playerLasers = s.playerLasers.filter((l) => l.y > -20);

    // Enemy laser vs player collision
    for (const laser of s.enemyLasers) {
      if (
        rectCollide(laser.x, laser.y, LASER_W, LASER_H, s.playerX, PLAYER_Y, PLAYER_SIZE, PLAYER_SIZE)
      ) {
        s.playerHealth -= 15;
        laser.y = SCREEN_H + 100; // mark for removal
      }
    }
    s.enemyLasers = s.enemyLasers.filter((l) => l.y < SCREEN_H + 20);

    // Remove dead enemies
    s.enemies = s.enemies.filter((e) => e.alive);

    // Next wave
    if (s.enemies.length === 0) {
      s.level++;
      s.enemies = spawnWave(s.level);
    }

    // Check game over
    if (s.lives <= 0 || s.playerHealth <= 0) {
      s.gameState = 'lost';
      s.lostTimer = 0;
    }

    forceUpdate((n) => n + 1);
    rafRef.current = requestAnimationFrame(gameLoop);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [gameLoop]);

  const startGame = () => {
    stateRef.current = createInitialState();
    stateRef.current.gameState = 'playing';
  };

  const s = stateRef.current;
  const healthPercent = Math.max(0, s.playerHealth) / 100;

  return (
    <View style={styles.container}>
      {/* Game area with pan responder */}
      <View style={styles.gameArea} {...panResponder.panHandlers}>
        {/* Stars background */}
        {Array.from({ length: 30 }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.star,
              {
                left: (i * 137) % SCREEN_W,
                top: (i * 97 + 30) % SCREEN_H,
                width: i % 3 === 0 ? 2 : 1,
                height: i % 3 === 0 ? 2 : 1,
              },
            ]}
          />
        ))}

        {/* HUD */}
        <View style={styles.hud}>
          <Text style={styles.hudText}>LVL {s.level}</Text>
          <Text style={styles.hudText}>SCORE {s.score}</Text>
          <Text style={styles.hudText}>{'<3'} {s.lives}</Text>
        </View>

        {/* Health bar */}
        <View style={styles.healthBarBg}>
          <View
            style={[
              styles.healthBarFg,
              {
                width: `${healthPercent * 100}%`,
                backgroundColor: healthPercent > 0.5 ? '#4ecdc4' : healthPercent > 0.25 ? '#ffd93d' : '#ff6b6b',
              },
            ]}
          />
        </View>

        {/* Enemies */}
        {s.enemies.map((enemy, i) =>
          enemy.alive ? (
            <View
              key={`e${i}`}
              style={[
                styles.enemy,
                { left: enemy.x, top: enemy.y, backgroundColor: enemy.color },
              ]}
            >
              <Text style={styles.enemyFace}>{'><'}</Text>
            </View>
          ) : null
        )}

        {/* Enemy lasers */}
        {s.enemyLasers.map((laser, i) => (
          <View
            key={`el${i}`}
            style={[
              styles.laser,
              { left: laser.x, top: laser.y, backgroundColor: laser.color },
            ]}
          />
        ))}

        {/* Player lasers */}
        {s.playerLasers.map((laser, i) => (
          <View
            key={`pl${i}`}
            style={[
              styles.laser,
              { left: laser.x, top: laser.y, backgroundColor: '#00bfff' },
            ]}
          />
        ))}

        {/* Player ship */}
        {s.gameState === 'playing' && (
          <View style={[styles.player, { left: s.playerX, top: PLAYER_Y }]}>
            <View style={styles.playerBody} />
            <View style={styles.playerNose} />
          </View>
        )}

        {/* Drag hint */}
        {s.gameState === 'playing' && (
          <Text style={styles.dragHint}>{'<< DRAG LEFT / RIGHT >>'}</Text>
        )}
      </View>

      {/* Back button */}
      <Pressable style={styles.backBtn} onPress={() => router.back()}>
        <Text style={styles.backText}>{'< BACK'}</Text>
      </Pressable>

      {/* Menu overlay */}
      {s.gameState === 'menu' && (
        <View style={styles.overlay}>
          <Text style={styles.overlayTitle}>SPACE INVADER</Text>
          <Text style={styles.overlaySubtext}>Defend Earth from alien invaders!</Text>
          <Pressable style={styles.playBtn} onPress={startGame}>
            <Text style={styles.playBtnText}>START GAME</Text>
          </Pressable>
        </View>
      )}

      {/* Game over */}
      {s.gameState === 'lost' && (
        <View style={styles.overlay}>
          <Text style={styles.overlayTitle}>GAME OVER</Text>
          <Text style={styles.finalScore}>Score: {s.score}</Text>
          <Text style={styles.finalLevel}>Reached Level {s.level}</Text>
          <Pressable style={styles.playBtn} onPress={startGame}>
            <Text style={styles.playBtnText}>TRY AGAIN</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a1a',
  },
  gameArea: {
    flex: 1,
  },
  star: {
    position: 'absolute',
    backgroundColor: '#ffffff44',
    borderRadius: 1,
  },
  backBtn: {
    position: 'absolute',
    top: 40,
    left: 16,
    zIndex: 100,
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
  },
  backText: {
    color: '#888',
    fontSize: 14,
    fontWeight: 'bold',
  },
  hud: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 60,
  },
  hudText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  healthBarBg: {
    position: 'absolute',
    top: 75,
    left: 60,
    right: 60,
    height: 8,
    backgroundColor: '#333',
    borderRadius: 4,
  },
  healthBarFg: {
    height: '100%',
    borderRadius: 4,
  },
  enemy: {
    position: 'absolute',
    width: ENEMY_SIZE,
    height: ENEMY_SIZE,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  enemyFace: {
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold',
  },
  laser: {
    position: 'absolute',
    width: LASER_W,
    height: LASER_H,
    borderRadius: 2,
  },
  player: {
    position: 'absolute',
    width: PLAYER_SIZE,
    height: PLAYER_SIZE,
    alignItems: 'center',
  },
  playerBody: {
    width: PLAYER_SIZE,
    height: PLAYER_SIZE * 0.7,
    backgroundColor: '#00bfff',
    borderRadius: 6,
    position: 'absolute',
    bottom: 0,
  },
  playerNose: {
    width: 0,
    height: 0,
    borderLeftWidth: PLAYER_SIZE / 4,
    borderRightWidth: PLAYER_SIZE / 4,
    borderBottomWidth: PLAYER_SIZE * 0.5,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#00bfff',
    position: 'absolute',
    top: 0,
  },
  dragHint: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    color: '#333',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  overlayTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#ff6b6b',
    letterSpacing: 4,
    marginBottom: 12,
  },
  overlaySubtext: {
    fontSize: 14,
    color: '#888',
    marginBottom: 30,
  },
  finalScore: {
    fontSize: 28,
    color: '#ffd93d',
    fontWeight: 'bold',
    marginTop: 12,
  },
  finalLevel: {
    fontSize: 16,
    color: '#888',
    marginTop: 4,
    marginBottom: 24,
  },
  playBtn: {
    backgroundColor: '#ff6b6b',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 12,
  },
  playBtnText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
});
