import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ImageBackground,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';

const { width, height } = Dimensions.get('window');

const GAMES = [
  { title: 'Flappy Penguin', route: '/flappy' as const, color: '#4ecdc4', emoji: '🐧' },
  { title: 'Space Invader', route: '/space-invader' as const, color: '#ff6b6b', emoji: '🚀' },
  { title: 'Ping Pong', route: '/ping-pong' as const, color: '#ffd93d', emoji: '🏓' },
  { title: 'Juke Box', route: '/jukebox' as const, color: '#c084fc', emoji: '🎵' },
];

export default function HomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.titleContainer}>
        <Text style={styles.title}>THE ARCADE</Text>
        <Text style={styles.subtitle}>Play games, listen to music and just have fun!!</Text>
        <Text style={styles.credit}>By Armaan & Girik</Text>
      </View>

      <View style={styles.buttonsContainer}>
        {GAMES.map((game) => (
          <Pressable
            key={game.route}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: game.color, opacity: pressed ? 0.7 : 1 },
            ]}
            onPress={() => router.push(game.route)}
          >
            <Text style={styles.buttonEmoji}>{game.emoji}</Text>
            <Text style={styles.buttonText}>{game.title}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.footer}>Mobile Edition</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#e94560',
    letterSpacing: 6,
    textShadowColor: '#ff6b6b',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  subtitle: {
    fontSize: 14,
    color: '#aaa',
    marginTop: 8,
  },
  credit: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  buttonsContainer: {
    width: '100%',
    maxWidth: 320,
    gap: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  buttonEmoji: {
    fontSize: 28,
    marginRight: 16,
  },
  buttonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    color: '#444',
    fontSize: 12,
  },
});
