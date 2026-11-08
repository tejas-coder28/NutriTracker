import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Rect, Line, Text as SvgText, Defs, LinearGradient, Stop } from 'react-native-svg';
import { getLocalDateStr, addDaysToDateStr } from '../utils/dateUtils';
import { useTheme } from '../context/ThemeContext';
import GlassCard from './primitives/GlassCard';

const screenWidth = Math.min(480, Dimensions.get('window').width - 32);

export default function WorkoutChart({ weeklyLogs = [], metric = 'calories', height = 200 }) {
  const { tokens, isDark } = useTheme();

  // Build 7 days array ending today
  const days = [];
  const todayStr = getLocalDateStr();
  for (let i = 6; i >= 0; i--) {
    const dateStr = addDaysToDateStr(todayStr, -i);
    const parts = dateStr.split('-');
    const dateObj = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    const dayLabel = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
    days.push({ dateStr, dayLabel, calories: 0, minutes: 0 });
  }

  // Aggregate logs into days
  (weeklyLogs || []).forEach(log => {
    const found = days.find(d => d.dateStr === log.logged_at);
    if (found) {
      found.calories += Number(log.calories_burned) || 0;
      found.minutes += Number(log.duration_min) || 0;
    }
  });

  const values = days.map(d => metric === 'minutes' ? d.minutes : d.calories);
  const maxVal = Math.max(100, Math.ceil(Math.max(...values, 10) / 50) * 50);

  const paddingLeft = 40;
  const paddingRight = 15;
  const paddingTop = 22;
  const paddingBottom = 34;

  const chartWidth = screenWidth - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const barWidth = Math.floor((chartWidth / 7) * 0.55);
  const stepX = chartWidth / 7;

  return (
    <View style={styles.container}>
      <Svg width={screenWidth} height={height}>
        <Defs>
          {/* Today gradient */}
          <LinearGradient id="todayBarGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={tokens.primaryLight} />
            <Stop offset="100%" stopColor={tokens.primary} />
          </LinearGradient>
          {/* Normal bar gradient */}
          <LinearGradient id="normalBarGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={tokens.macros.protein} />
            <Stop offset="100%" stopColor={tokens.macros.water} />
          </LinearGradient>
        </Defs>

        {/* Horizontal grid lines */}
        {[0, 0.5, 1].map((ratio, i) => {
          const val = Math.round(ratio * maxVal);
          const yPos = paddingTop + chartHeight - ratio * chartHeight;
          return (
            <React.Fragment key={i}>
              <Line
                x1={paddingLeft}
                y1={yPos}
                x2={screenWidth - paddingRight}
                y2={yPos}
                stroke={tokens.neumorphic.border}
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <SvgText
                x={paddingLeft - 6}
                y={yPos + 4}
                fill={tokens.text.secondary}
                fontSize="12"
                fontFamily="SpaceGrotesk_600SemiBold"
                textAnchor="end"
              >
                {val}{metric === 'minutes' ? 'm' : ''}
              </SvgText>
            </React.Fragment>
          );
        })}

        {/* Bars */}
        {days.map((day, idx) => {
          const val = metric === 'minutes' ? day.minutes : day.calories;
          const barH = (val / maxVal) * chartHeight;
          const x = paddingLeft + idx * stepX + (stepX - barWidth) / 2;
          const y = paddingTop + chartHeight - barH;
          const isToday = idx === 6;

          return (
            <React.Fragment key={day.dateStr}>
              <Rect
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(barH, 3)}
                rx={5}
                fill={
                  val > 0
                    ? (isToday ? 'url(#todayBarGrad)' : 'url(#normalBarGrad)')
                    : tokens.neumorphic.inset
                }
              />
              <SvgText
                x={x + barWidth / 2}
                y={height - 8}
                fill={isToday ? tokens.primary : tokens.text.secondary}
                fontSize="12"
                fontFamily="PlusJakartaSans_600SemiBold"
                fontWeight={isToday ? 'bold' : 'normal'}
                textAnchor="middle"
              >
                {day.dayLabel}
              </SvgText>
              {val > 0 && (
                <SvgText
                  x={x + barWidth / 2}
                  y={y - 5}
                  fill={isToday ? tokens.primary : tokens.text.primary}
                  fontSize="12"
                  fontFamily="SpaceGrotesk_700Bold"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {Math.round(val)}
                </SvgText>
              )}
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 6,
  },
});
