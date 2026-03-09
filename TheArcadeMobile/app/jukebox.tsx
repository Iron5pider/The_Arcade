import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  Dimensions,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Audio } from 'expo-av';
import Slider from '@react-native-community/slider';

const { width: SCREEN_W } = Dimensions.get('window');

// Demo tracks - we'll use the game music that's already bundled
const TRACKS = [
  { id: '1', title: 'Arcade Theme', artist: 'The Arcade', source: require('../assets/music/crazzy.mp3') },
  { id: '2', title: 'Space Battle', artist: 'Space Invader OST', source: require('../assets/sounds/space/space_music.mp3') },
];

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

export default function JukeboxScreen() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
    });
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  const playTrack = useCallback(async (index: number) => {
    try {
      // Unload previous
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }

      const track = TRACKS[index];
      if (!track) return;

      const { sound } = await Audio.Sound.createAsync(
        track.source,
        { shouldPlay: true, volume },
        (status) => {
          if (status.isLoaded) {
            setPosition(status.positionMillis);
            setDuration(status.durationMillis ?? 0);
            if (status.didJustFinish) {
              // Auto-next
              const nextIdx = (index + 1) % TRACKS.length;
              setCurrentIndex(nextIdx);
              playTrack(nextIdx);
            }
          }
        }
      );

      soundRef.current = sound;
      setCurrentIndex(index);
      setIsPlaying(true);
    } catch (e) {
      console.warn('Error playing track:', e);
    }
  }, [volume]);

  const togglePause = async () => {
    if (!soundRef.current) return;
    if (isPlaying) {
      await soundRef.current.pauseAsync();
      setIsPlaying(false);
    } else {
      await soundRef.current.playAsync();
      setIsPlaying(true);
    }
  };

  const stopPlayback = async () => {
    if (soundRef.current) {
      await soundRef.current.stopAsync();
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }
    setIsPlaying(false);
    setPosition(0);
    setDuration(0);
    setCurrentIndex(-1);
  };

  const playNext = () => {
    if (TRACKS.length === 0) return;
    const nextIdx = currentIndex < TRACKS.length - 1 ? currentIndex + 1 : 0;
    playTrack(nextIdx);
  };

  const playPrevious = () => {
    if (TRACKS.length === 0) return;
    const prevIdx = currentIndex > 0 ? currentIndex - 1 : TRACKS.length - 1;
    playTrack(prevIdx);
  };

  const changeVolume = async (val: number) => {
    setVolume(val);
    if (soundRef.current) {
      await soundRef.current.setVolumeAsync(val);
    }
  };

  const seekTo = async (val: number) => {
    if (soundRef.current && duration > 0) {
      await soundRef.current.setPositionAsync(val * duration);
    }
  };

  const renderTrack = ({ item, index }: { item: typeof TRACKS[0]; index: number }) => {
    const isActive = index === currentIndex;
    return (
      <Pressable
        style={[styles.track, isActive && styles.trackActive]}
        onPress={() => playTrack(index)}
      >
        <View style={styles.trackInfo}>
          <Text style={[styles.trackTitle, isActive && styles.trackTitleActive]}>
            {item.title}
          </Text>
          <Text style={styles.trackArtist}>{item.artist}</Text>
        </View>
        {isActive && isPlaying && (
          <View style={styles.playingIndicator}>
            <View style={[styles.bar, { height: 12 }]} />
            <View style={[styles.bar, { height: 18 }]} />
            <View style={[styles.bar, { height: 8 }]} />
            <View style={[styles.bar, { height: 14 }]} />
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backText}>{'< BACK'}</Text>
        </Pressable>
        <Text style={styles.headerTitle}>JUKE BOX</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Now Playing */}
      <View style={styles.nowPlaying}>
        <View style={styles.albumArt}>
          <Text style={styles.albumEmoji}>
            {currentIndex >= 0 ? '🎵' : '🎶'}
          </Text>
        </View>
        <Text style={styles.nowPlayingTitle}>
          {currentIndex >= 0 ? TRACKS[currentIndex].title : 'No Track Selected'}
        </Text>
        <Text style={styles.nowPlayingArtist}>
          {currentIndex >= 0 ? TRACKS[currentIndex].artist : 'Select a track below'}
        </Text>

        {/* Progress */}
        <View style={styles.progressContainer}>
          <Text style={styles.timeText}>{formatTime(position)}</Text>
          <Slider
            style={styles.progressSlider}
            minimumValue={0}
            maximumValue={1}
            value={duration > 0 ? position / duration : 0}
            onSlidingComplete={seekTo}
            minimumTrackTintColor="#c084fc"
            maximumTrackTintColor="#333"
            thumbTintColor="#c084fc"
          />
          <Text style={styles.timeText}>{formatTime(duration)}</Text>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <Pressable style={styles.controlBtn} onPress={playPrevious}>
            <Text style={styles.controlIcon}>{'|<<'}</Text>
          </Pressable>
          <Pressable style={styles.controlBtnLarge} onPress={togglePause}>
            <Text style={styles.controlIconLarge}>
              {isPlaying ? '||' : '|>'}
            </Text>
          </Pressable>
          <Pressable style={styles.controlBtn} onPress={stopPlayback}>
            <Text style={styles.controlIcon}>{'[]'}</Text>
          </Pressable>
          <Pressable style={styles.controlBtn} onPress={playNext}>
            <Text style={styles.controlIcon}>{'>>|'}</Text>
          </Pressable>
        </View>

        {/* Volume */}
        <View style={styles.volumeContainer}>
          <Text style={styles.volumeLabel}>VOL</Text>
          <Slider
            style={styles.volumeSlider}
            minimumValue={0}
            maximumValue={1}
            value={volume}
            onValueChange={changeVolume}
            minimumTrackTintColor="#c084fc"
            maximumTrackTintColor="#333"
            thumbTintColor="#c084fc"
          />
        </View>
      </View>

      {/* Track List */}
      <View style={styles.trackList}>
        <Text style={styles.trackListTitle}>LIBRARY</Text>
        <FlatList
          data={TRACKS}
          renderItem={renderTrack}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
        />
        <Text style={styles.hint}>
          Includes arcade background music.{'\n'}
          Add your own tracks to expand the library!
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backText: {
    color: '#888',
    fontSize: 14,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#c084fc',
    letterSpacing: 4,
  },
  nowPlaying: {
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  albumArt: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#2a2a4a',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  albumEmoji: {
    fontSize: 40,
  },
  nowPlayingTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  nowPlayingArtist: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 20,
    marginTop: 16,
  },
  progressSlider: {
    flex: 1,
    marginHorizontal: 8,
  },
  timeText: {
    color: '#666',
    fontSize: 12,
    fontFamily: 'monospace',
    width: 42,
    textAlign: 'center',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginTop: 16,
  },
  controlBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2a2a4a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlBtnLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#c084fc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlIcon: {
    color: '#aaa',
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  controlIconLarge: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  volumeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '60%',
    marginTop: 12,
  },
  volumeLabel: {
    color: '#666',
    fontSize: 12,
    fontWeight: 'bold',
    marginRight: 8,
  },
  volumeSlider: {
    flex: 1,
  },
  trackList: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  trackListTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    letterSpacing: 2,
    marginBottom: 12,
  },
  track: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: '#1e1e3a',
  },
  trackActive: {
    backgroundColor: '#2a2a5a',
    borderWidth: 1,
    borderColor: '#c084fc44',
  },
  trackInfo: {
    flex: 1,
  },
  trackTitle: {
    fontSize: 16,
    color: '#ddd',
    fontWeight: '600',
  },
  trackTitleActive: {
    color: '#c084fc',
  },
  trackArtist: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  playingIndicator: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    height: 20,
  },
  bar: {
    width: 3,
    backgroundColor: '#c084fc',
    borderRadius: 1,
  },
  hint: {
    color: '#444',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 20,
  },
});
