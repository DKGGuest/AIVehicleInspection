import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { Pressable, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import React from 'react';

export function HapticTab(props: BottomTabBarButtonProps) {
  const { children, style, onPress, onPressIn, ...rest } = props;
  
  return (
    <Pressable
      style={style as any}
      onPress={onPress}
      onPressIn={(ev) => {
        if (Platform.OS === 'ios') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onPressIn?.(ev as any);
      }}
      {...rest}
    >
      {children}
    </Pressable>
  );
}
