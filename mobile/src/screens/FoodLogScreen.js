import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getFoodLogsForDate, deleteFoodLog } from '../services/database';
import { getLocalDateStr, addDaysToDateStr, isFutureDate } from '../utils/dateUtils';
import FoodLogItem from '../components/FoodLogItem';
import AddFoodModal from '../components/AddFoodModal';
import EditFoodModal from '../components/EditFoodModal';
import PopUpModal from '../components/PopUpModal';
import AmbientBackground from '../components/AmbientBackground';
import { useTheme } from '../context/ThemeContext';

export default function FoodLogScreen() {
  const { isDark, themeColors, glassStyles } = useTheme();
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

  return (
    <AmbientBackground style={styles.container}>
      {/* Universal PopUp Modal */}
      <PopUpModal
        visible={popUpConfig.visible}
        title={popUpConfig.title}
        message={popUpConfig.message}
        icon={popUpConfig.icon}
        type={popUpConfig.type}
        onClose={() => setPopUpConfig({ ...popUpConfig, visible: false })}
      />

      <View style={[styles.dateStrip, { backgroundColor: isDark ? 'rgba(24, 25, 32, 0.75)' : 'rgba(255, 255, 255, 0.75)', borderBottomColor: themeColors.cardBorderSubtle }]}>
        <TouchableOpacity style={styles.navArrow} onPress={() => changeDateByDays(-1)}>
          <Ionicons name="chevron-back" size={20} color={themeColors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.dateLabelContainer}>
          <Ionicons name="calendar-outline" size={16} color={themeColors.primary} />
          <Text style={[styles.dateLabelText, { color: themeColors.textPrimary }]}>{selectedDate === todayStr ? `Today (${selectedDate})` : selectedDate}</Text>
        </View>
        <TouchableOpacity
          style={[styles.navArrow, selectedDate >= todayStr && { opacity: 0.25 }]}
          disabled={selectedDate >= todayStr}
          onPress={() => changeDateByDays(1)}
        >
          <Ionicons name="chevron-forward" size={20} color={selectedDate >= todayStr ? themeColors.textMuted : themeColors.textPrimary} />
        </TouchableOpacity>
      </View>


      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[glassStyles.card, styles.summaryCard]}>
          <Text style={[styles.summaryTitle, { color: themeColors.textSecondary }]}>Day Macro Summary</Text>
          <View style={styles.totalsRow}>
            <View style={styles.totalStat}><Text style={[styles.totalVal, { color: themeColors.textPrimary }]}>{totals.calories}</Text><Text style={[styles.totalSub, { color: themeColors.textSecondary }]}>kcal</Text></View>
            <View style={[styles.divider, { backgroundColor: themeColors.cardBorderSubtle }]} />
            <View style={styles.totalStat}><Text style={[styles.totalVal,{color: themeColors.protein}]}>{totals.protein}g</Text><Text style={[styles.totalSub, { color: themeColors.textSecondary }]}>Protein</Text></View>
            <View style={[styles.divider, { backgroundColor: themeColors.cardBorderSubtle }]} />
            <View style={styles.totalStat}><Text style={[styles.totalVal,{color: themeColors.carbs}]}>{totals.carbs}g</Text><Text style={[styles.totalSub, { color: themeColors.textSecondary }]}>Carbs</Text></View>
            <View style={[styles.divider, { backgroundColor: themeColors.cardBorderSubtle }]} />
            <View style={styles.totalStat}><Text style={[styles.totalVal,{color: themeColors.fat}]}>{totals.fat}g</Text><Text style={[styles.totalSub, { color: themeColors.textSecondary }]}>Fat</Text></View>
          </View>
        </View>

        <View style={styles.listHeader}>
          <Text style={[styles.listHeaderTitle, { color: themeColors.textPrimary }]}>Meal Records</Text>
          <TouchableOpacity style={styles.addInlineBtn} onPress={() => setModalVisible(true)}>
            <Ionicons name="add-circle" size={18} color={themeColors.primary} />
            <Text style={[styles.addInlineText, { color: themeColors.primary }]}>Log Meal</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#10B981" style={{ marginTop: 40 }} />
        ) : logs.length > 0 ? (
          logs.map(item => <FoodLogItem key={item.id} item={item} onDelete={handleDeleteFood} onEdit={handleEditFood} />)
        ) : (
          <View style={[glassStyles.cardSubtle, styles.emptyContainer]}>
            <Ionicons name="journal-outline" size={40} color={themeColors.textMuted} />
            <Text style={[styles.emptyTitle, { color: themeColors.textPrimary }]}>No meals logged for this date</Text>
            <Text style={[styles.emptySub, { color: themeColors.textSecondary }]}>Tap "Log Meal" to add entries using text or photo AI.</Text>
          </View>
        )}
      </ScrollView>

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
  container: { flex:1 },
  dateStrip: {
    flexDirection:'row',
    alignItems:'center',
    justifyContent:'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    ...(Platform.OS === 'web' ? {
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
    } : {}),
  },
  navArrow: { padding: 6 },
  dateLabelContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateLabelText: { fontSize: 16, fontWeight: '700' },
  scrollContent: { padding: 20, paddingBottom: 100 },
  summaryCard: {
    borderRadius: 22,
    padding: 18,
    marginBottom: 20,
  },
  summaryTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  totalsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  totalStat: { alignItems: 'center' },
  totalVal: { fontSize: 18, fontWeight: '800' },
  totalSub: { fontSize: 11, marginTop: 2 },
  divider: { width: 1, height: 28 },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  listHeaderTitle: { fontSize: 17, fontWeight: '700' },
  addInlineBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addInlineText: { fontWeight: '700', fontSize: 14 },
  emptyContainer: {
    borderRadius: 18,
    padding: 30,
    alignItems: 'center',
    marginTop: 10,
  },
  emptyTitle: { fontSize: 15, fontWeight: '600', marginTop: 12 },
  emptySub: { fontSize: 12, textAlign: 'center', marginTop: 4 },
});
