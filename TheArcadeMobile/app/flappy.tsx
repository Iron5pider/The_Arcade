import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Pressable,
  Image,
  ImageBackground,
} from 'react-native';
import { useRouter } from 'expo-router';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// Game constants (from original flappy.py)
const GRAVITY = 0.35;
const FLAP_FORCE = -8;
const PIPE_SPEED = 3;
const PIPE_GAP = 180;
const PIPE_WIDTH = 60;
const BIRD_SIZE = 40;
const BIRD_X = SCREEN_W * 0.25;
const GROUND_H = 80;
const GAME_FLOOR = SCREEN_H - GROUND_H;
const SPAWN_INTERVAL = 1800; // ms

interface Pipe {
  x: number;
  topHeight: number;
  scored: boolean;
}

interface GameState {
  birdY: number;
  birdVelocity: number;
  pipes: Pipe[];
  score: number;
  highScore: number;
  gameState: 'waiting' | 'playing' | 'dead';
  lastSpawn: number;
  groundOffset: number;
}

export default function FlappyScreen() {
  const router = useRouter();
  const [, forceUpdate] = useState(0);
  const stateRef = useRef<GameState>(createInitialState());
  const rafRef = useRef<number>(0);
  const timeRef = useRef<number>(0);

  function createInitialState(): GameState {
    return {
      birdY: SCREEN_H / 2.5,
      birdVelocity: 0,
      pipes: [],
      score: 0,
      highScore: stateRef.current?.highScore ?? 0,
      gameState: 'waiting',
      lastSpawn: 0,
      groundOffset: 0,
    };
  }

  function spawnPipe(now: number): Pipe {
    const minTop = 80;
    const maxTop = GAME_FLOOR - PIPE_GAP - 80;
    const topHeight = minTop + Math.random() * (maxTop - minTop);
    return { x: SCREEN_W + 20, topHeight, scored: false };
  }

  const handleTap = () => {
    const s = stateRef.current;
    if (s.gameState === 'waiting') {
      s.gameState = 'playing';
      s.birdVelocity = FLAP_FORCE;
      s.lastSpawn = Date.now();
    } else if (s.gameState === 'playing') {
      s.birdVelocity = FLAP_FORCE;
    } else if (s.gameState === 'dead') {
      stateRef.current = createInitialState();
      stateRef.current.gameState = 'waiting';
    }
  };

  const gameLoop = useCallback(() => {
    const s = stateRef.current;
    const now = Date.now();

    if (s.gameState === 'playing') {
      // Gravity
      s.birdVelocity += GRAVITY;
      s.birdY += s.birdVelocity;

      // Ground scroll
      s.groundOffset = (s.groundOffset + PIPE_SPEED) % 24;

      // Spawn pipes
      if (now - s.lastSpawn > SPAWN_INTERVAL) {
        s.pipes.push(spawnPipe(now));
        s.lastSpawn = now;
      }

      // Move pipes
      for (const pipe of s.pipes) {
        pipe.x -= PIPE_SPEED;

        // Score
        if (!pipe.scored && pipe.x + PIPE_WIDTH < BIRD_X) {
          pipe.scored = true;
          s.score++;
        }
      }

      // Remove off-screen pipes
      s.pipes = s.pipes.filter((p) => p.x > -PIPE_WIDTH - 10);

      // Collision detection
      const birdTop = s.birdY;
      const birdBottom = s.birdY + BIRD_SIZE;
      const birdLeft = BIRD_X;
      const birdRight = BIRD_X + BIRD_SIZE;

      // Floor/ceiling
      if (birdBottom >= GAME_FLOOR || birdTop <= 0) {
        s.gameState = 'dead';
        s.highScore = Math.max(s.highScore, s.score);
      }

      // Pipe collision
      for (const pipe of s.pipes) {
        const pipeLeft = pipe.x;
        const pipeRight = pipe.x + PIPE_WIDTH;

        if (birdRight > pipeLeft && birdLeft < pipeRight) {
          // Top pipe
          if (birdTop < pipe.topHeight) {
            s.gameState = 'dead';
            s.highScore = Math.max(s.highScore, s.score);
          }
          // Bottom pipe
          if (birdBottom > pipe.topHeight + PIPE_GAP) {
            s.gameState = 'dead';
            s.highScore = Math.max(s.highScore, s.score);
          }
        }
      }
    } else if (s.gameState === 'waiting') {
      // Bob the bird
      s.birdY = SCREEN_H / 2.5 + Math.sin(now / 300) * 12;
      s.groundOffset = (s.groundOffset + 1) % 24;
    }

    forceUpdate((n) => n + 1);
    rafRef.current = requestAnimationFrame(gameLoop);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [gameLoop]);

  const s = stateRef.current;
  const birdRotation = Math.min(Math.max(s.birdVelocity * 3, -30), 90);

  return (
    <Pressable style={styles.container} onPress={handleTap}>
      {/* Sky background */}
      <View style={styles.sky} />

      {/* Pipes */}
      {s.pipes.map((pipe, i) => (
        <React.Fragment key={i}>
          {/* Top pipe */}
          <View
            style={[
              styles.pipe,
              {
                left: pipe.x,
                top: 0,
                height: pipe.topHeight,
              },
            ]}
          >
            <View style={styles.pipeCapBottom} />
          </View>
          {/* Bottom pipe */}
          <View
            style={[
              styles.pipe,
              {
                left: pipe.x,
                top: pipe.topHeight + PIPE_GAP,
                height: GAME_FLOOR - (pipe.topHeight + PIPE_GAP),
              },
            ]}
          >
            <View style={styles.pipeCapTop} />
          </View>
        </React.Fragment>
      ))}

      {/* Ground */}
      <View style={styles.ground}>
        {Array.from({ length: Math.ceil(SCREEN_W / 24) + 2 }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.groundStripe,
              { left: i * 24 - s.groundOffset },
            ]}
          />
        ))}
      </View>

      {/* Bird */}
      <View
        style={[
          styles.bird,
          {
            left: BIRD_X,
            top: s.birdY,
            transform: [{ rotate: `${birdRotation}deg` }],
          },
        ]}
      >
        <Text style={styles.birdEmoji}>🐧</Text>
      </View>

      {/* Score */}
      {s.gameState === 'playing' && (
        <Text style={styles.score}>{s.score}</Text>
      )}

      {/* Back button */}
      <Pressable
        style={styles.backBtn}
        onPress={(e) => {
          e.stopPropagation();
          router.back();
        }}
      >
        <Text style={styles.backText}>{'< BACK'}</Text>
      </Pressable>

      {/* Start screen */}
      {s.gameState === 'waiting' && (
        <View style={styles.overlay}>
          <Text style={styles.overlayTitle}>FLAPPY PENGUIN</Text>
          <Text style={styles.overlayText}>Tap to flap!</Text>
          {s.highScore > 0 && (
            <Text style={styles.highScore}>Best: {s.highScore}</Text>
          )}
        </View>
      )}

      {/* Game over */}
      {s.gameState === 'dead' && (
        <View style={styles.overlay}>
          <Text style={styles.overlayTitle}>GAME OVER</Text>
          <Text style={styles.finalScore}>Score: {s.score}</Text>
          <Text style={styles.highScore}>Best: {s.highScore}</Text>
          <Text style={styles.overlayText}>Tap to retry</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  sky: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#70c5ce',
  },
  backBtn: {
    position: 'absolute',
    top: 40,
    left: 16,
    zIndex: 100,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 8,
  },
  backText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  pipe: {
    position: 'absolute',
    width: PIPE_WIDTH,
    backgroundColor: '#73bf2e',
    borderWidth: 2,
    borderColor: '#5a9e1e',
  },
  pipeCapBottom: {
    position: 'absolute',
    bottom: -2,
    left: -4,
    right: -4,
    height: 26,
    backgroundColor: '#73bf2e',
    borderWidth: 2,
    borderColor: '#5a9e1e',
    borderRadius: 3,
  },
  pipeCapTop: {
    position: 'absolute',
    top: -2,
    left: -4,
    right: -4,
    height: 26,
    backgroundColor: '#73bf2e',
    borderWidth: 2,
    borderColor: '#5a9e1e',
    borderRadius: 3,
  },
  ground: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: GROUND_H,
    backgroundColor: '#ded895',
    flexDirection: 'row',
    overflow: 'hidden',
  },
  groundStripe: {
    position: 'absolute',
    top: 0,
    width: 12,
    height: 10,
    backgroundColor: '#c9b458',
  },
  bird: {
    position: 'absolute',
    width: BIRD_SIZE,
    height: BIRD_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  birdEmoji: {
    fontSize: 32,
  },
  score: {
    position: 'absolute',
    top: 80,
    alignSelf: 'center',
    fontSize: 56,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: '#000',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  overlayTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: '#000',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 6,
    marginBottom: 12,
  },
  overlayText: {
    fontSize: 18,
    color: '#ddd',
    marginTop: 8,
  },
  finalScore: {
    fontSize: 28,
    color: '#ffd93d',
    fontWeight: 'bold',
  },
  highScore: {
    fontSize: 18,
    color: '#4ecdc4',
    marginTop: 4,
  },
});
