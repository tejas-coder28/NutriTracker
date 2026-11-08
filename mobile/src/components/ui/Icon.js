import React from 'react';
import { Ionicons } from '@expo/vector-icons';

/**
 * Universal Icon lookup map.
 * Contains:
 *  - Every Ionicons name used in the codebase (filled & outline)
 *  - Lucide name aliases mapped to corresponding Ionicons
 */
export const ICON_MAP = {
  // Lucide aliases
  'sparkles': 'sparkles',
  'check': 'checkmark-circle',
  'check-circle': 'checkmark-circle',
  'checkmark': 'checkmark-circle',
  'x': 'close',
  'x-circle': 'close-circle',
  'trash-2': 'trash-outline',
  'dumbbell': 'barbell',
  'scale': 'scale-outline',
  'weight': 'scale-outline',
  'lock': 'lock-closed',
  'unlock': 'lock-open-outline',
  'eye': 'eye-outline',
  'eye-off': 'eye-off-outline',
  'chevron-left': 'chevron-back',
  'chevron-right': 'chevron-forward',
  'chevron-up': 'chevron-up',
  'chevron-down': 'chevron-down',
  'trophy': 'trophy',
  'utensils': 'restaurant',
  'fire': 'flame',
  'droplet': 'water',
  'droplets': 'water',
  'camera': 'camera',
  'camera-outline': 'camera-outline',
  'activity': 'fitness',
  'heart': 'heart',
  'heart-pulse': 'fitness',
  'plus': 'add',
  'plus-circle': 'add-circle-outline',
  'minus': 'remove',
  'minus-circle': 'remove-circle-outline',
  'alert-circle': 'alert-circle',
  'alert-triangle': 'warning-outline',
  'info': 'information-circle-outline',
  'sun': 'sunny',
  'moon': 'moon',
  'edit': 'create-outline',
  'edit-2': 'pencil',
  'edit-3': 'pencil-outline',
  'log-out': 'log-out-outline',
  'mail': 'mail-outline',
  'bell': 'notifications-outline',
  'apple': 'nutrition',
  'refresh-cw': 'sync-outline',
  'flag': 'flag-outline',
  'award': 'medal-outline',
  'medal': 'medal-outline',
  'ribbon': 'ribbon-outline',
  'shield': 'shield-checkmark-outline',
  'shield-check': 'shield-checkmark-outline',
  'star': 'star-outline',
  'zap': 'flash-outline',
  'bike': 'bicycle-outline',
  'footprints': 'walk-outline',
  'walk': 'walk-outline',
  'user': 'person-outline',
  'users': 'body-outline',
  'body': 'body-outline',
  'file-text': 'document-text-outline',
  'bookmark': 'bookmark',
  'more-horizontal': 'ellipsis-horizontal-circle-outline',
  'fast-food': 'fast-food-outline',
  'leaf': 'leaf',
  'search': 'search-outline',
  'settings': 'settings-outline',

  // Ionicons native names & variants used across the app
  'add': 'add',
  'add-circle': 'add-circle',
  'add-circle-outline': 'add-circle-outline',
  'add-outline': 'add-outline',
  'alert-circle': 'alert-circle',
  'alert-circle-outline': 'alert-circle-outline',
  'barbell': 'barbell',
  'barbell-outline': 'barbell-outline',
  'bicycle': 'bicycle',
  'bicycle-outline': 'bicycle-outline',
  'body-outline': 'body-outline',
  'calendar': 'calendar',
  'calendar-outline': 'calendar-outline',
  'checkmark-circle': 'checkmark-circle',
  'checkmark-circle-outline': 'checkmark-circle-outline',
  'checkmark-outline': 'checkmark-outline',
  'chevron-back': 'chevron-back',
  'chevron-back-outline': 'chevron-back-outline',
  'chevron-forward': 'chevron-forward',
  'chevron-forward-outline': 'chevron-forward-outline',
  'close': 'close',
  'close-circle': 'close-circle',
  'close-circle-outline': 'close-circle-outline',
  'close-outline': 'close-outline',
  'create': 'create',
  'create-outline': 'create-outline',
  'document-text': 'document-text',
  'document-text-outline': 'document-text-outline',
  'ellipsis-horizontal': 'ellipsis-horizontal',
  'ellipsis-horizontal-circle-outline': 'ellipsis-horizontal-circle-outline',
  'eye-off-outline': 'eye-off-outline',
  'eye-outline': 'eye-outline',
  'fast-food-outline': 'fast-food-outline',
  'fitness': 'fitness',
  'fitness-outline': 'fitness-outline',
  'flag-outline': 'flag-outline',
  'flame': 'flame',
  'flame-outline': 'flame-outline',
  'flash-outline': 'flash-outline',
  'football': 'football',
  'football-outline': 'football-outline',
  'home': 'home',
  'home-outline': 'home-outline',
  'image': 'image',
  'image-outline': 'image-outline',
  'images': 'images',
  'images-outline': 'images-outline',
  'information-circle': 'information-circle',
  'information-circle-outline': 'information-circle-outline',
  'journal': 'journal',
  'journal-outline': 'journal-outline',
  'lock-closed': 'lock-closed',
  'lock-closed-outline': 'lock-closed-outline',
  'lock-open-outline': 'lock-open-outline',
  'log-out-outline': 'log-out-outline',
  'mail-outline': 'mail-outline',
  'medal-outline': 'medal-outline',
  'moon': 'moon',
  'moon-outline': 'moon-outline',
  'notifications': 'notifications',
  'notifications-outline': 'notifications-outline',
  'nutrition': 'nutrition',
  'nutrition-outline': 'nutrition-outline',
  'pencil': 'pencil',
  'pencil-outline': 'pencil-outline',
  'person': 'person',
  'person-outline': 'person-outline',
  'radio-button-off': 'radio-button-off',
  'radio-button-on': 'radio-button-on',
  'remove': 'remove',
  'remove-circle': 'remove-circle',
  'remove-circle-outline': 'remove-circle-outline',
  'remove-outline': 'remove-outline',
  'restaurant': 'restaurant',
  'restaurant-outline': 'restaurant-outline',
  'ribbon-outline': 'ribbon-outline',
  'scale-outline': 'scale-outline',
  'shield-checkmark-outline': 'shield-checkmark-outline',
  'sparkles-outline': 'sparkles-outline',
  'star': 'star',
  'star-outline': 'star-outline',
  'sunny': 'sunny',
  'sunny-outline': 'sunny-outline',
  'sync': 'sync',
  'sync-outline': 'sync-outline',
  'text-outline': 'text-outline',
  'trash': 'trash',
  'trash-outline': 'trash-outline',
  'trending-down': 'trending-down',
  'trending-down-outline': 'trending-down-outline',
  'trending-up': 'trending-up',
  'trending-up-outline': 'trending-up-outline',
  'trophy-outline': 'trophy-outline',
  'walk-outline': 'walk-outline',
  'warning': 'warning',
  'warning-outline': 'warning-outline',
  'water': 'water',
  'water-outline': 'water-outline',
};

/**
 * Universal <Icon /> component
 * Props:
 *  - name: string (Ionicons / Lucide name) OR React component / element
 *  - size: number (default: 20)
 *  - color: string
 *  - strokeWidth: number (accepted for API compatibility)
 *  - style: StyleProp<ViewStyle | TextStyle>
 */
export default function Icon({ name, size = 20, color, strokeWidth, style, ...rest }) {
  if (!name) return null;

  // 1. If name is already a rendered React element
  if (React.isValidElement(name)) {
    return React.cloneElement(name, {
      size: name.props.size || size,
      color: name.props.color || color,
      style: [name.props.style, style],
      ...rest,
    });
  }

  // 2. If name is a React component function or class
  if (typeof name === 'function') {
    const Component = name;
    return <Component size={size} color={color} strokeWidth={strokeWidth} style={style} {...rest} />;
  }

  // 3. If name is an icon name string
  if (typeof name === 'string') {
    const key = name.trim().toLowerCase();
    const resolved = ICON_MAP[name] || ICON_MAP[key];

    if (resolved) {
      return (
        <Ionicons
          name={resolved}
          size={size}
          color={color}
          style={style}
          {...rest}
        />
      );
    }

    // If unmapped: warn in development, NEVER render string text
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.warn(`[Icon] Unmapped icon name: "${name}". Rendering nothing.`);
    }
    return null;
  }

  return null;
}

