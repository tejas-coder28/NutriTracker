import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, Circle, Line, Text as SvgText, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';
import GlassCard from './primitives/GlassCard';

const screenWidth = Math.min(480, Dimensions.get('window').width - 32);

export default function WeightChart({ logs = [], targetWeight = null, projectedTrend = [], height = 220 }) {
  const { tokens, isDark } = useTheme();

  if (!logs || logs.length === 0) {
    return (
      <GlassCard subtle style={[styles.emptyContainer, { height }]}>
        <Text
          allowFontScaling={true}
          maxFontSizeMultiplier={1.3}
          style={[styles.emptyText, { color: tokens.text.primary }]}
        >
          No weight logs recorded yet.
        </Text>
        <Text
          allowFontScaling={true}
          maxFontSizeMultiplier={1.3}
          style={[styles.emptySubtext, { color: tokens.text.secondary }]}
        >
          Tap "+ Log Weight" to start tracking your weight trajectory.
        </Text>
      </GlassCard>
    );
  }

  const paddingLeft = 48;
  const paddingRight = 20;
  const paddingTop = 25;
  const paddingBottom = 38;

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
  let areaD = '';
  logs.forEach((log, index) => {
    const x = getX(index);
    const y = getY(log.weight);
    if (index === 0) {
      pathD += `M ${x} ${y}`;
      areaD += `M ${x} ${paddingTop + chartHeight} L ${x} ${y}`;
    } else {
      pathD += ` L ${x} ${y}`;
      areaD += ` L ${x} ${y}`;
    }
    if (index === logs.length - 1) {
      areaD += ` L ${x} ${paddingTop + chartHeight} Z`;
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
  const actualLineColor = tokens.primary;
  const projectedLineColor = tokens.macros.carbs;
  const targetLineColor = tokens.macros.protein;

  return (
    <View style={styles.container}>
      <Svg width={screenWidth} height={height}>
        <Defs>
          {/* Area gradient under actual weight curve */}
          <LinearGradient id="weightAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={actualLineColor} stopOpacity={isDark ? "0.35" : "0.22"} />
            <Stop offset="100%" stopColor={actualLineColor} stopOpacity="0.0" />
          </LinearGradient>
        </Defs>

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
                stroke={tokens.neumorphic.border}
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <SvgText
                x={paddingLeft - 8}
                y={yPos + 4}
                fill={tokens.text.secondary}
                fontSize="12"
                fontFamily="SpaceGrotesk_600SemiBold"
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
              stroke={targetLineColor}
              strokeWidth="1.5"
              strokeDasharray="6 3"
            />
            <SvgText
              x={screenWidth - paddingRight}
              y={targetY - 6}
              fill={targetLineColor}
              fontSize="12"
              fontWeight="bold"
              fontFamily="PlusJakartaSans_700Bold"
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
            stroke={projectedLineColor}
            strokeWidth="2"
            strokeDasharray="4 4"
            strokeLinecap="round"
          />
        )}

        {/* Area fill under actual weight */}
        {areaD !== '' && (
          <Path
            d={areaD}
            fill="url(#weightAreaGrad)"
          />
        )}

        {/* Connecting Actual Weight line */}
        {logs.length > 1 && (
          <Path
            d={pathD}
            fill="none"
            stroke={actualLineColor}
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
                fill={actualLineColor}
                stroke={tokens.bg}
                strokeWidth="2"
              />
              {(logs.length <= 7 || index % Math.ceil(logs.length / 5) === 0 || index === logs.length - 1) && (
                <SvgText
                  x={x}
                  y={height - 8}
                  fill={tokens.text.secondary}
                  fontSize="12"
                  fontFamily="SpaceGrotesk_500Medium"
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
          <View style={[styles.legendDot, { backgroundColor: actualLineColor }]} />
          <Text allowFontScaling={true} maxFontSizeMultiplier={1.3} style={[styles.legendText, { color: tokens.text.secondary }]}>Actual</Text>
        </View>
        {projPathD !== '' && (
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: projectedLineColor }]} />
            <Text allowFontScaling={true} maxFontSizeMultiplier={1.3} style={[styles.legendText, { color: tokens.text.secondary }]}>Projected</Text>
          </View>
        )}
        {targetWeight && (
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: targetLineColor }]} />
            <Text allowFontScaling={true} maxFontSizeMultiplier={1.3} style={[styles.legendText, { color: tokens.text.secondary }]}>Target</Text>
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    width: '100%',
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  emptySubtext: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_500Medium',
    marginTop: 4,
    textAlign: 'center',
  },
  legendRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 10,
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
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
});
