import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { getFoodLogsForDate, deleteFoodLog } from '../services/database';
import { getLocalDateStr, addDaysToDateStr, isFutureDate } from '../utils/dateUtils';
import FoodLogItem from '../components/FoodLogItem';
import AddFoodModal from '../components/AddFoodModal';
import EditFoodModal from '../components/EditFoodModal';
import PopUpModal from '../components/PopUpModal';
import AmbientBackground from '../components/AmbientBackground';
import GlassCard from '../components/primitives/GlassCard';
import LiquidButton from '../components/primitives/LiquidButton';
import LiquidPill from '../components/primitives/LiquidPill';
import NeuInset from '../components/primitives/NeuInset';
import Icon from '../components/ui/Icon';
import { useTheme } from '../context/ThemeContext';

export default function FoodLogScreen() {
  const { tokens, isDark } = useTheme();
  const todayStr = getLocalDateStr();
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [logsData, setLogsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);

  // Edit modal state
  const [editingItem, setEditingItem] = useState(null);
  const [editModalVisible, setEditModalVisible] = useState(false);

  // PopUp Modal state
  const [popUpConfig, setPopUpConfig] = useState({ visible: false, title: '', message: '', icon: 'checkmark-circle', type: 'success' });

  useEffect(() => { fetchLogs(selectedDate); }, [selectedDate]);

  const fetchLogs = async (dateStr) => {
    try {
      setLoading(true);
      const data = await getFoodLogsForDate(dateStr);
      setLogsData(data);
    } catch (err) { console.error('Fetch food logs error:', err); }
    finally { setLoading(false); }
  };

  const changeDateByDays = (days) => {
    const target = addDaysToDateStr(selectedDate, days);
    if (days > 0 && isFutureDate(target)) {
      return; // Block future date navigation
    }
    try { Haptics.selectionAsync(); } catch (_) {}
    setSelectedDate(target);
  };

  const handleEditFood = (item) => {
    setEditingItem(item);
    setEditModalVisible(true);
  };

  const handleFoodUpdated = (updatedEntry) => {
    fetchLogs(selectedDate);
    setPopUpConfig({
      visible: true,
      title: 'Meal Updated!',
      message: `Done! ${updatedEntry?.name || 'Meal'} (${Math.round(updatedEntry?.calories || 0)} kcal) updated.`,
      icon: 'pencil-outline',
      type: 'success'
    });
  };

  const handleDeleteFood = async (id) => {
    try {
      await deleteFoodLog(id);
      fetchLogs(selectedDate);
      setPopUpConfig({
        visible: true,
        title: 'Meal Entry Deleted',
        message: 'Done! The food entry has been deleted from your log.',
        icon: 'trash-outline',
        type: 'warning'
      });
    } catch (err) {
      setPopUpConfig({
        visible: true,
        title: 'Error',
        message: err.message || 'Failed to delete entry.',
        icon: 'alert-circle',
        type: 'danger'
      });
    }
  };

  const handleFoodAdded = (logEntry) => {
    if (logEntry.logged_at === selectedDate) {
      setLogsData(prev => {
        const existingLogs = prev?.logs || [];
        if (existingLogs.some(l => l.id === logEntry.id)) return prev;

        const updatedLogs = [logEntry, ...existingLogs];
        const prevTotals = prev?.totals || { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
        const updatedTotals = {
          calories: Math.round(prevTotals.calories + (Number(logEntry.calories) || 0)),
          protein: Math.round(prevTotals.protein + (Number(logEntry.protein) || 0)),
          carbs: Math.round(prevTotals.carbs + (Number(logEntry.carbs) || 0)),
          fat: Math.round(prevTotals.fat + (Number(logEntry.fat) || 0)),
          fiber: Math.round(prevTotals.fiber + (Number(logEntry.fiber) || 0)),
        };

        return {
          date: selectedDate,
          logs: updatedLogs,
          totals: updatedTotals,
        };
      });
    }

    setPopUpConfig({
      visible: true,
      title: 'Meal Logged!',
      message: `Done! ${logEntry?.name || 'Food item'} (${Math.round(logEntry?.calories || 0)} kcal) added to ${logEntry?.logged_at || selectedDate}.`,
      icon: 'sparkles',
      type: 'success'
    });
  };

  const handleFoodSavedSuccess = (tempId, savedEntry) => {
    setLogsData(prev => {
      if (!prev) return prev;
      const updatedLogs = (prev.logs || []).map(l => (l.id === tempId ? savedEntry : l));
      return { ...prev, logs: updatedLogs };
    });
  };

  const handleFoodSaveError = (tempId, err) => {
    setLogsData(prev => {
      if (!prev) return prev;
      const failedEntry = (prev.logs || []).find(l => l.id === tempId);
      const updatedLogs = (prev.logs || []).filter(l => l.id !== tempId);
      const prevTotals = prev.totals || { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
      const updatedTotals = failedEntry ? {
        calories: Math.max(0, Math.round(prevTotals.calories - (Number(failedEntry.calories) || 0))),
        protein: Math.max(0, Math.round(prevTotals.protein - (Number(failedEntry.protein) || 0))),
        carbs: Math.max(0, Math.round(prevTotals.carbs - (Number(failedEntry.carbs) || 0))),
        fat: Math.max(0, Math.round(prevTotals.fat - (Number(failedEntry.fat) || 0))),
        fiber: Math.max(0, Math.round(prevTotals.fiber - (Number(failedEntry.fiber) || 0))),
      } : prevTotals;

      return { ...prev, logs: updatedLogs, totals: updatedTotals };
    });

    setPopUpConfig({
      visible: true,
      title: 'Save Failed',
      message: err?.message || 'Could not save meal log. Entry removed.',
      icon: 'alert-circle',
      type: 'danger'
    });
  };

  const totals = logsData?.totals || { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
  const logs = logsData?.logs || [];

  // Generate 7-day strip (from 6 days ago up to today)
  const weekDays = [-6, -5, -4, -3, -2, -1, 0].map(offset => {
    const dStr = addDaysToDateStr(todayStr, offset);
    const dateObj = new Date(dStr);
    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
    const dayNum = dStr.split('-')[2];
    return { dateStr: dStr, dayName, dayNum };
  });

  return (
    <AmbientBackground style={styles.container}>
      <PopUpModal
        visible={popUpConfig.visible}
        title={popUpConfig.title}
        message={popUpConfig.message}
        icon={popUpConfig.icon}
        type={popUpConfig.type}
        onClose={() => setPopUpConfig({ ...popUpConfig, visible: false })}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.contentWrap}>
          {/* Liquid Date Header Pill with Arrows */}
          <View style={styles.dateHeaderRow}>
            <TouchableOpacity
              style={[
                styles.navArrow,
                {
                  backgroundColor: tokens.liquidGlass.fill,
                  borderColor: tokens.liquidGlass.rim,
                },
              ]}
              onPress={() => changeDateByDays(-1)}
            >
              <Icon name="chevron-back" size={18} color={tokens.text.primary} />
            </TouchableOpacity>

            <View
              style={[
                styles.datePill,
                {
                  backgroundColor: tokens.liquidGlass.fill,
                  borderColor: tokens.liquidGlass.rim,
                  ...(Platform.OS === 'web' ? {
                    backdropFilter: `blur(${tokens.liquidGlass.blur}px)`,
                    WebkitBackdropFilter: `blur(${tokens.liquidGlass.blur}px)`,
                    boxShadow: isDark
                      ? '0 4px 16px rgba(0, 0, 0, 0.4)'
                      : '0 4px 14px rgba(15, 23, 42, 0.08)',
                  } : {}),
                },
              ]}
            >
              <Icon name="calendar-outline" size={15} color={tokens.primary} />
              <Text
                allowFontScaling={true}
                maxFontSizeMultiplier={1.3}
                style={[styles.dateLabelText, { color: tokens.text.primary }]}
              >
                {selectedDate === todayStr ? `Today • ${selectedDate}` : selectedDate}
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.navArrow,
                {
                  backgroundColor: tokens.liquidGlass.fill,
                  borderColor: tokens.liquidGlass.rim,
                  opacity: selectedDate >= todayStr ? 0.3 : 1,
                },
              ]}
              disabled={selectedDate >= todayStr}
              onPress={() => changeDateByDays(1)}
            >
              <Icon
                name="chevron-forward"
                size={18}
                color={selectedDate >= todayStr ? tokens.text.muted : tokens.text.primary}
              />
            </TouchableOpacity>
          </View>

          {/* Swipeable Week Date Chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.weekStrip}
          >
            {weekDays.map(item => {
              const isSelected = item.dateStr === selectedDate;
              return (
                <TouchableOpacity
                  key={item.dateStr}
                  activeOpacity={0.8}
                  onPress={() => {
                    try { Haptics.selectionAsync(); } catch (_) {}
                    setSelectedDate(item.dateStr);
                  }}
                  style={[
                    styles.dayChip,
                    {
                      backgroundColor: isSelected
                        ? (isDark ? 'rgba(16, 232, 160, 0.20)' : 'rgba(0, 179, 119, 0.15)')
                        : tokens.neumorphic.inset,
                      borderColor: isSelected
                        ? tokens.primary
                        : tokens.neumorphic.border,
                    },
                  ]}
                >
                  <Text
                    allowFontScaling={true}
                    maxFontSizeMultiplier={1.3}
                    style={[
                      styles.dayChipName,
                      { color: isSelected ? tokens.primary : tokens.text.secondary },
                    ]}
                  >
                    {item.dayName}
                  </Text>
                  <Text
                    allowFontScaling={true}
                    maxFontSizeMultiplier={1.3}
                    style={[
                      styles.dayChipNum,
                      { color: isSelected ? tokens.primary : tokens.text.primary },
                    ]}
                  >
                    {item.dayNum}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Day Macro Summary Card */}
          <GlassCard style={styles.summaryCard}>
            <Text
              allowFontScaling={true}
              maxFontSizeMultiplier={1.3}
              style={[styles.summaryTitle, { color: tokens.text.secondary }]}
            >
              Day Macro Summary
            </Text>
            <View style={styles.totalsRow}>
              <View style={styles.totalStat}>
                <Text allowFontScaling={true} maxFontSizeMultiplier={1.3} style={[styles.totalVal, { color: tokens.text.primary }]}>
                  {Math.round(totals.calories)}
                </Text>
                <Text allowFontScaling={true} maxFontSizeMultiplier={1.3} style={[styles.totalSub, { color: tokens.text.secondary }]}>kcal</Text>
              </View>

              <View style={[styles.divider, { backgroundColor: tokens.neumorphic.border }]} />

              <View style={styles.totalStat}>
                <Text allowFontScaling={true} maxFontSizeMultiplier={1.3} style={[styles.totalVal, { color: tokens.macros.protein }]}>
                  {Math.round(totals.protein)}g
                </Text>
                <Text allowFontScaling={true} maxFontSizeMultiplier={1.3} style={[styles.totalSub, { color: tokens.text.secondary }]}>Protein</Text>
              </View>

              <View style={[styles.divider, { backgroundColor: tokens.neumorphic.border }]} />

              <View style={styles.totalStat}>
                <Text allowFontScaling={true} maxFontSizeMultiplier={1.3} style={[styles.totalVal, { color: tokens.macros.carbs }]}>
                  {Math.round(totals.carbs)}g
                </Text>
                <Text allowFontScaling={true} maxFontSizeMultiplier={1.3} style={[styles.totalSub, { color: tokens.text.secondary }]}>Carbs</Text>
              </View>

              <View style={[styles.divider, { backgroundColor: tokens.neumorphic.border }]} />

              <View style={styles.totalStat}>
                <Text allowFontScaling={true} maxFontSizeMultiplier={1.3} style={[styles.totalVal, { color: tokens.macros.fat }]}>
                  {Math.round(totals.fat)}g
                </Text>
                <Text allowFontScaling={true} maxFontSizeMultiplier={1.3} style={[styles.totalSub, { color: tokens.text.secondary }]}>Fat</Text>
              </View>
            </View>
          </GlassCard>

          {/* Meals List Header with Liquid-Glass Log Button */}
          <View style={styles.listHeader}>
            <Text allowFontScaling={true} maxFontSizeMultiplier={1.3} style={[styles.listHeaderTitle, { color: tokens.text.primary }]}>
              Meal Records
            </Text>
            <LiquidButton
              size="sm"
              onPress={() => setModalVisible(true)}
              icon="add"
            >
              Log Meal
            </LiquidButton>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color={tokens.primary} style={{ marginTop: 40 }} />
          ) : logs.length > 0 ? (
            logs.map(item => (
              <FoodLogItem
                key={item.id}
                item={item}
                onDelete={handleDeleteFood}
                onEdit={handleEditFood}
              />
            ))
          ) : (
            <GlassCard subtle style={styles.emptyContainer}>
              <Icon name="journal-outline" size={40} color={tokens.text.muted} />
              <Text
                allowFontScaling={true}
                maxFontSizeMultiplier={1.3}
                style={[styles.emptyTitle, { color: tokens.text.primary }]}
              >
                No meals logged for this date
              </Text>
              <Text
                allowFontScaling={true}
                maxFontSizeMultiplier={1.3}
                style={[styles.emptySub, { color: tokens.text.secondary }]}
              >
                Tap "Log Meal" to add entries using text or photo AI.
              </Text>
            </GlassCard>
          )}
        </View>
      </ScrollView>

      {/* Modals */}
      <AddFoodModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onFoodAdded={handleFoodAdded}
        onFoodSavedSuccess={handleFoodSavedSuccess}
        onFoodSaveError={handleFoodSaveError}
      />
      <EditFoodModal
        visible={editModalVisible}
        item={editingItem}
        onClose={() => setEditModalVisible(false)}
        onSaved={handleFoodUpdated}
      />
    </AmbientBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    padding: 16,
    paddingBottom: 110,
    alignItems: 'center',
  },
  contentWrap: {
    width: '100%',
    maxWidth: 520,
  },
  dateHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 8,
  },
  navArrow: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  datePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    gap: 8,
  },
  dateLabelText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans_700Bold',
    letterSpacing: 0,
  },
  weekStrip: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 14,
  },
  dayChip: {
    width: 56,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    gap: 2,
  },
  dayChipName: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  dayChipNum: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'SpaceGrotesk_700Bold',
    fontVariant: ['tabular-nums'],
  },
  summaryCard: {
    padding: 18,
    marginBottom: 18,
  },
  summaryTitle: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 12,
  },
  totalsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  totalStat: { alignItems: 'center' },
  totalVal: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'SpaceGrotesk_700Bold',
    fontVariant: ['tabular-nums'],
  },
  totalSub: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'PlusJakartaSans_600SemiBold',
    marginTop: 2,
  },
  divider: { width: 1, height: 28 },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  listHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans_700Bold',
    letterSpacing: -0.15,
  },
  emptyContainer: {
    padding: 30,
    alignItems: 'center',
    marginTop: 10,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans_700Bold',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_500Medium',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 19,
  },
});
