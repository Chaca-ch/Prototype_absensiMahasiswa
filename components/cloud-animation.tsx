import React, { useEffect } from 'react';
import { Animated, Dimensions, Image, StyleSheet } from 'react-native';

const { width, height } = Dimensions.get('window');

const CloudAnimation = () => {
  // Array of clouds with different positions and speeds
  const clouds = [
    { top: 40, size: 120, duration: 12000, opacity: 0.7 },
    { top: 100, size: 90, duration: 9000, opacity: 0.6 },
    { top: 180, size: 140, duration: 15000, opacity: 0.8 },
    { top: 220, size: 70, duration: 7000, opacity: 0.5 },
    { top: 300, size: 110, duration: 11000, opacity: 0.65 },
    // Tambahan awan di bawah
    { top: 380, size: 130, duration: 13000, opacity: 0.7 },
    { top: 440, size: 100, duration: 10000, opacity: 0.6 },
    { top: 500, size: 120, duration: 14000, opacity: 0.8 },
    { top: 560, size: 80, duration: 8000, opacity: 0.5 },
    { top: 620, size: 110, duration: 12000, opacity: 0.65 },
  ];

  // Create animated values for each cloud once
  const cloudAnimations = React.useRef(clouds.map(() => new Animated.Value(-150))).current;

  useEffect(() => {
    cloudAnimations.forEach((anim, idx) => {
      Animated.loop(
        Animated.timing(anim, {
          toValue: width,
          duration: clouds[idx].duration,
          useNativeDriver: true,
        })
      ).start();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      {clouds.map((cloud, idx) => (
        <Animated.View
          key={idx}
          style={[styles.cloud, {
            top: cloud.top,
            transform: [{ translateX: cloudAnimations[idx] }],
          }]}
        >
          <Image
            source={require('../assets/images/react-logo.png')} // Ganti dengan gambar awan jika ada
            style={{ width: cloud.size, height: cloud.size * 0.5, opacity: cloud.opacity }}
            resizeMode="contain"
          />
        </Animated.View>
      ))}
    </>
  );
};

const styles = StyleSheet.create({
  cloud: {
    position: 'absolute',
    left: 0,
    zIndex: 0,
  },
});

export default CloudAnimation;
