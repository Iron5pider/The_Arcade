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
const GAME_W = SCREEN_W;
const GAME_H = SCREEN_H;

const PADDLE_W = 100;
const PADDLE_H = 14;
const BALL_SIZE = 18;
const PLAYER_AREA_Y = GAME_H - 100;
const OPPONENT_AREA_Y = 80;
const BALL_INITIAL_SPEED = 4;
const AI_SPEED = 4;

interface GameState {
  ballX: number;
  ballY: number;
  ballVX: number;
  ballVY: number;
  playerX: number;
  opponentX: number;
  playerScore: number;
  opponentScore: number;
  ballSpeed: number;
  playing: boolean;
  gameOver: boolean;
  winner: string;
}

export default function PingPongScreen() {
  const router = useRouter();
  const [, forceUpdate] = useState(0);
  const stateRef = useRef<GameState>(createInitialState());
  const rafRef = useRef<number>(0);
  const touchXRef = useRef<number>(GAME_W / 2);

  function createInitialState(): GameState {
    return {
      ballX: GAME_W / 2,
      ballY: GAME_H / 2,
      ballVX: (Math.random() > 0.5 ? 1 : -1) * 3,
      ballVY: BALL_INITIAL_SPEED,
      playerX: GAME_W / 2 - PADDLE_W / 2,
      opponentX: GAME_W / 2 - PADDLE_W / 2,
      playerScore: 0,
      opponentScore: 0,
      ballSpeed: BALL_INITIAL_SPEED,
      playing: false,
      gameOver: false,
      winner: '',
    };
  }

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const s = stateRef.current;
        if (!s.playing && !s.gameOver) {
          s.playing = true;
        }
        touchXRef.current = evt.nativeEvent.pageX;
      },
      onPanResponderMove: (evt) => {
        touchXRef.current = evt.nativeEvent.pageX;
      },
    })
  ).current;

  const gameLoop = useCallback(() => {
    const s = stateRef.current;
    if (!s.playing || s.gameOver) {
      rafRef.current = requestAnimationFrame(gameLoop);
      forceUpdate((n) => n + 1);
      return;
    }

    // Move player paddle toward touch
    const targetX = touchXRef.current - PADDLE_W / 2;
    s.playerX += (targetX - s.playerX) * 0.3;
    s.playerX = Math.max(0, Math.min(GAME_W - PADDLE_W, s.playerX));

    // AI opponent
    const opponentCenter = s.opponentX + PADDLE_W / 2;
    const diff = s.ballX - opponentCenter;
    if (Math.abs(diff) > 5) {
      s.opponentX += Math.sign(diff) * AI_SPEED;
    }
    s.opponentX = Math.max(0, Math.min(GAME_W - PADDLE_W, s.opponentX));

    // Move ball
    s.ballX += s.ballVX;
    s.ballY += s.ballVY;

    // Wall bounce (left/right)
    if (s.ballX <= 0 || s.ballX >= GAME_W - BALL_SIZE) {
      s.ballVX *= -1;
      s.ballX = Math.max(0, Math.min(GAME_W - BALL_SIZE, s.ballX));
    }

    // Player paddle collision (bottom)
    if (
      s.ballVY > 0 &&
      s.ballY + BALL_SIZE >= PLAYER_AREA_Y &&
      s.ballY + BALL_SIZE <= PLAYER_AREA_Y + PADDLE_H + 10 &&
      s.ballX + BALL_SIZE >= s.playerX &&
      s.ballX <= s.playerX + PADDLE_W
    ) {
      s.ballVY = -Math.abs(s.ballVY);
      // Add spin based on where ball hits paddle
      const hitPos = (s.ballX + BALL_SIZE / 2 - s.playerX) / PADDLE_W;
      s.ballVX = (hitPos - 0.5) * 8;
      s.playerScore++;
      s.ballSpeed += 0.05;
    }

    // Opponent paddle collision (top)
    if (
      s.ballVY < 0 &&
      s.ballY <= OPPONENT_AREA_Y + PADDLE_H &&
      s.ballY >= OPPONENT_AREA_Y - 10 &&
      s.ballX + BALL_SIZE >= s.opponentX &&
      s.ballX <= s.opponentX + PADDLE_W
    ) {
      s.ballVY = Math.abs(s.ballVY);
      const hitPos = (s.ballX + BALL_SIZE / 2 - s.opponentX) / PADDLE_W;
      s.ballVX = (hitPos - 0.5) * 8;
      s.opponentScore++;
      s.ballSpeed += 0.05;
    }

    // Normalize ball speed
    const currentSpeed = Math.sqrt(s.ballVX * s.ballVX + s.ballVY * s.ballVY);
    if (currentSpeed > 0) {
      s.ballVX = (s.ballVX / currentSpeed) * s.ballSpeed;
      s.ballVY = (s.ballVY / currentSpeed) * s.ballSpeed;
    }

    // Ball out of bounds
    if (s.ballY > GAME_H + 20) {
      s.gameOver = true;
      s.winner = 'OPPONENT';
      s.playing = false;
    }
    if (s.ballY < -20) {
      s.gameOver = true;
      s.winner = 'YOU';
      s.playing = false;
    }

    forceUpdate((n) => n + 1);
    rafRef.current = requestAnimationFrame(gameLoop);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [gameLoop]);

  const restart = () => {
    stateRef.current = createInitialState();
  };

  const s = stateRef.current;

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      {/* Back button */}
      <Pressable style={styles.backBtn} onPress={() => router.back()}>
        <Text style={styles.backText}>{'< BACK'}</Text>
      </Pressable>

      {/* Scores */}
      <Text style={[styles.score, { top: OPPONENT_AREA_Y + PADDLE_H + 20 }]}>
        {s.opponentScore}
      </Text>
      <Text style={[styles.score, { bottom: GAME_H - PLAYER_AREA_Y + 30 }]}>
        {s.playerScore}
      </Text>

      {/* Center line */}
      <View style={styles.centerLine} />

      {/* Opponent paddle */}
      <View
        style={[
          styles.paddle,
          {
            left: s.opponentX,
            top: OPPONENT_AREA_Y,
            backgroundColor: '#ff6b6b',
          },
        ]}
      />

      {/* Player paddle */}
      <View
        style={[
          styles.paddle,
          {
            left: s.playerX,
            top: PLAYER_AREA_Y,
            backgroundColor: '#4ecdc4',
          },
        ]}
      />

      {/* Ball */}
      <View
        style={[
          styles.ball,
          { left: s.ballX, top: s.ballY },
        ]}
      />

      {/* Start message */}
      {!s.playing && !s.gameOver && (
        <View style={styles.overlay}>
          <Text style={styles.overlayTitle}>PING PONG</Text>
          <Text style={styles.overlayText}>Tap to start{'\n'}Drag to move paddle</Text>
        </View>
      )}

      {/* Game over */}
      {s.gameOver && (
        <View style={styles.overlay}>
          <Text style={styles.overlayTitle}>{s.winner} WIN!</Text>
          <Text style={styles.finalScore}>
            {s.playerScore} - {s.opponentScore}
          </Text>
          <Pressable style={styles.retryBtn} onPress={restart}>
            <Text style={styles.retryText}>PLAY AGAIN</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f23',
  },
  backBtn: {
    position: 'absolute',
    top: 40,
    left: 16,
    zIndex: 100,
    padding: 8,
  },
  backText: {
    color: '#666',
    fontSize: 14,
    fontWeight: 'bold',
  },
  centerLine: {
    position: 'absolute',
    top: GAME_H / 2 - 1,
    left: 20,
    right: 20,
    height: 2,
    borderStyle: 'dashed',
    borderTopWidth: 2,
    borderColor: '#333',
  },
  paddle: {
    position: 'absolute',
    width: PADDLE_W,
    height: PADDLE_H,
    borderRadius: 7,
  },
  ball: {
    position: 'absolute',
    width: BALL_SIZE,
    height: BALL_SIZE,
    borderRadius: BALL_SIZE / 2,
    backgroundColor: '#fff',
  },
  score: {
    position: 'absolute',
    alignSelf: 'center',
    fontSize: 48,
    fontWeight: 'bold',
    color: '#222',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  overlayTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  overlayText: {
    fontSize: 16,
    color: '#aaa',
    textAlign: 'center',
  },
  finalScore: {
    fontSize: 28,
    color: '#4ecdc4',
    marginVertical: 16,
    fontWeight: 'bold',
  },
  retryBtn: {
    backgroundColor: '#4ecdc4',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  retryText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
});
