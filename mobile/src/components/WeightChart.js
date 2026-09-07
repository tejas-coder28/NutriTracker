import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, Circle, Line, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';

const screenWidth = Dimensions.get('window').width - 40;

export default function WeightChart({ logs = [], targetWeight = null, projectedTrend = [], height = 220 }) {
  const { isDark, themeColors, glassStyles } = useTheme();

  if (!logs || logs.length === 0) {
    return (
      <View style={[glassStyles.cardSubtle, styles.emptyContainer, { height }]}>
        <Text style={[styles.emptyText, { color: themeColors.textPrimary }]}>No weight logs recorded yet.</Text>
        <Text style={[styles.emptySubtext, { color: themeColors.textSecondary }]}>Tap "+ Log Weight" to start tracking your weight trajectory.</Text>
      </View>
    );
  }

  const paddingLeft = 40;
  const paddingRight = 20;
  const paddingTop = 25;
  const paddingBottom = 35;

  const chartWidth = screenWidth - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const weights = logs.map(l => l.weight);
  if (targetWeight) weights.push(targetWeight);
  if (projectedTrend && projectedTrend.length > 0) {
    projectedTrend.forEach(pt => weights.push(pt.weight));
  }

  const minWeight = Math.floor(Math.min(...weights) - 1);
  const maxWeight = Math.ceil(Math.max(...weights) + 1);
  const range = Math.max(1, maxWeight - minWeight);

  const getX = (index) => {
    if (logs.length === 1) return paddingLeft + chartWidth / 2;
    return paddingLeft + (index / (logs.length - 1)) * chartWidth;
  };

  const getY = (val) => {
    return paddingTop + chartHeight - ((val - minWeight) / range) * chartHeight;
  };

  // Build SVG path string for actual weight data points
  let pathD = '';
  logs.forEach((log, index) => {
    const x = getX(index);
    const y = getY(log.weight);
    if (index === 0) {
      pathD += `M ${x} ${y}`;
    } else {
      pathD += ` L ${x} ${y}`;
    }
  });

  // Build SVG path string for projected trend overlay
  let projPathD = '';
  if (projectedTrend && projectedTrend.length > 0) {
    projectedTrend.forEach((pt, index) => {
      const x = paddingLeft + (index / (projectedTrend.length - 1)) * chartWidth;
      const y = getY(pt.weight);
      if (index === 0) {
        projPathD += `M ${x} ${y}`;
      } else {
        projPathD += ` L ${x} ${y}`;
      }
    });
  }

  const targetY = targetWeight ? getY(targetWeight) : null;

  return (
    <View style={styles.container}>
      <Svg width={screenWidth} height={height}>
        {/* Horizontal grid lines */}
        {[0, 0.5, 1].map((ratio, i) => {
          const yVal = minWeight + ratio * range;
          const yPos = getY(yVal);
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
                x={paddingLeft - 8}
                y={yPos + 4}
                fill={themeColors.textSecondary}
                fontSize="10"
                textAnchor="end"
              >
                {Math.round(yVal * 10) / 10}kg
              </SvgText>
            </React.Fragment>
          );
        })}

        {/* Target Weight horizontal line */}
        {targetY !== null && (
          <>
            <Line
              x1={paddingLeft}
              y1={targetY}
              x2={screenWidth - paddingRight}
              y2={targetY}
              stroke="#10B981"
              strokeWidth="1.5"
              strokeDasharray="6 3"
            />
            <SvgText
              x={screenWidth - paddingRight}
              y={targetY - 6}
              fill="#10B981"
              fontSize="10"
              fontWeight="bold"
              textAnchor="end"
            >
              Target: {targetWeight}kg
            </SvgText>
          </>
        )}

        {/* Projected Goal Trend Line Overlay */}
        {projPathD !== '' && (
          <Path
            d={projPathD}
            fill="none"
            stroke="#F59E0B"
            strokeWidth="2"
            strokeDasharray="4 4"
            strokeLinecap="round"
          />
        )}

        {/* Connecting Actual Weight line */}
        {logs.length > 1 && (
          <Path
            d={pathD}
            fill="none"
            stroke="#6366F1"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Actual Data points */}
        {logs.map((log, index) => {
          const x = getX(index);
          const y = getY(log.weight);
          const dateStr = log.logged_at ? log.logged_at.slice(5) : '';
          return (
            <React.Fragment key={log.id || index}>
              <Circle
                cx={x}
                cy={y}
                r="5"
                fill="#6366F1"
                stroke={isDark ? "#18181B" : "#FFFFFF"}
                strokeWidth="2"
              />
              {(logs.length <= 7 || index % Math.ceil(logs.length / 5) === 0 || index === logs.length - 1) && (
                <SvgText
                  x={x}
                  y={height - 10}
                  fill={themeColors.textSecondary}
                  fontSize="9"
                  textAnchor="middle"
                >
                  {dateStr}
                </SvgText>
              )}
            </React.Fragment>
          );
        })}
      </Svg>

      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#6366F1' }]} />
          <Text style={[styles.legendText, { color: themeColors.textSecondary }]}>Actual Weight</Text>
        </View>
        {projPathD !== '' && (
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
            <Text style={[styles.legendText, { color: themeColors.textSecondary }]}>Projected Trend</Text>
          </View>
        )}
        {targetWeight && (
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
            <Text style={[styles.legendText, { color: themeColors.textSecondary }]}>Target Goal</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 10,
  },
  emptyContainer: {
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  legendRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
  },
});
