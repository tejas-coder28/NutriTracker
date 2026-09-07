import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Rect, Line, Text as SvgText } from 'react-native-svg';
import { getLocalDateStr, addDaysToDateStr } from '../utils/dateUtils';
import { useTheme } from '../context/ThemeContext';

const screenWidth = Dimensions.get('window').width - 40;

export default function WorkoutChart({ weeklyLogs = [], metric = 'calories', height = 200 }) {
  const { isDark, themeColors } = useTheme();

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

  const paddingLeft = 35;
  const paddingRight = 15;
  const paddingTop = 20;
  const paddingBottom = 30;

  const chartWidth = screenWidth - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const barWidth = Math.floor((chartWidth / 7) * 0.55);
  const stepX = chartWidth / 7;

  return (
    <View style={s.container}>
      <Svg width={screenWidth} height={height}>
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
                stroke={isDark ? "#27272A" : "#E4E4E7"}
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <SvgText
                x={paddingLeft - 6}
                y={yPos + 4}
                fill={themeColors.textSecondary}
                fontSize="9"
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
                rx={4}
                fill={val > 0 ? (isToday ? '#10B981' : '#3B82F6') : (isDark ? '#27272A' : '#E4E4E7')}
              />
              <SvgText
                x={x + barWidth / 2}
                y={height - 10}
                fill={isToday ? '#10B981' : themeColors.textSecondary}
                fontSize="10"
                fontWeight={isToday ? 'bold' : 'normal'}
                textAnchor="middle"
              >
                {day.dayLabel}
              </SvgText>
              {val > 0 && (
                <SvgText
                  x={x + barWidth / 2}
                  y={y - 5}
                  fill={isToday ? (isDark ? '#34D399' : '#059669') : themeColors.textPrimary}
                  fontSize="9"
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

const s = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 6,
  },
});
