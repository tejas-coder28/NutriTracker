import { getLocalDateStr } from '../utils/dateUtils';

export function calculateUserMacros(user) {
  const {
    weight = 75,
    target_weight = 70,
    height = 175,
    age = 25,
    gender = 'male',
    activity_level = 'moderate',
    fat_loss_rate = 0.5
  } = user || {};

  const numWeight = Number(weight) || 75;
  const numTargetWeight = Number(target_weight) || 70;
  const weightDiff = numTargetWeight - numWeight;

  // Auto-detect goal_type based on Target Weight vs Weight
  let goal_type = user?.goal_type;
  if (weightDiff > 0.5) {
    goal_type = 'muscle_gain';
  } else if (weightDiff < -0.5) {
    goal_type = 'fat_loss';
  } else {
    goal_type = 'maintenance';
  }

  // Mifflin-St Jeor BMR
  const genderOffset = gender === 'female' ? -161 : 5;
  const bmr = Math.round(10 * numWeight + 6.25 * height - 5 * age + genderOffset);

  const multipliers = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 };
  const tdee = Math.round(bmr * (multipliers[activity_level] || 1.55));

  const dailyAdjustment = Math.round((fat_loss_rate * 7700) / 7);

  let targetCalories = tdee;
  let isClamped = false;
  let safetyWarning = null;
  let effectiveLossRate = fat_loss_rate;

  if (goal_type === 'fat_loss') {
    const uncapped = tdee - dailyAdjustment;
    const minFloor = gender === 'female' ? 1200 : 1500;
    targetCalories = uncapped;
    if (targetCalories < minFloor) {
      targetCalories = minFloor;
      isClamped = true;
      const maxSafeDeficit = Math.max(0, tdee - minFloor);
      effectiveLossRate = Math.max(0.1, Math.round(((maxSafeDeficit * 7) / 7700) * 100) / 100);
      safetyWarning = `Intake clamped to ${minFloor} kcal floor. Safe pace: ${effectiveLossRate} kg/week.`;
    }
  } else if (goal_type === 'muscle_gain') {
    targetCalories = tdee + dailyAdjustment;
    if (fat_loss_rate >= 0.75) {
      safetyWarning = `Fast bulking may increase fat gain — consider a slower pace (0.25–0.5 kg/week) for lean gains.`;
    }
  } else {
    // maintenance
    targetCalories = tdee;
  }

  // Protein: 2.0g per kg bodyweight
  const targetProteinGrams = Math.round(numWeight * 2.0);
  // Fat: ~25% of target calories
  const targetFatGrams = Math.round((targetCalories * 0.25) / 9);
  // Fiber: ~14g per 1000 calories
  const targetFiberGrams = Math.round((targetCalories / 1000) * 14);
  // Carbs: absorbs remaining calories
  const remainingCals = targetCalories - targetProteinGrams * 4 - targetFatGrams * 9;
  const targetCarbsGrams = Math.max(40, Math.round(remainingCals / 4));

  // Timeline
  const absWeightDiff = Math.abs(weightDiff);
  const rateToUse = goal_type === 'maintenance' ? 0 : (goal_type === 'fat_loss' ? effectiveLossRate : fat_loss_rate);
  const weeksToTarget = rateToUse > 0 ? Math.round((absWeightDiff / rateToUse) * 10) / 10 : 0;
  const daysToTarget = Math.ceil(weeksToTarget * 7);

  const targetDateObj = new Date();
  targetDateObj.setDate(targetDateObj.getDate() + daysToTarget);
  const estimatedTargetDate = getLocalDateStr(targetDateObj);

  const projectedTrend = [];
  const numSteps = Math.min(12, Math.max(2, Math.ceil(weeksToTarget || 1)));
  for (let i = 0; i <= numSteps; i++) {
    const ratio = i / numSteps;
    const pointDate = new Date();
    pointDate.setDate(pointDate.getDate() + Math.round(ratio * daysToTarget));
    let projWeight = numWeight;
    if (goal_type === 'fat_loss') projWeight = Math.max(numTargetWeight, numWeight - ratio * absWeightDiff);
    else if (goal_type === 'muscle_gain') projWeight = Math.min(numTargetWeight, numWeight + ratio * absWeightDiff);
    projectedTrend.push({ date: getLocalDateStr(pointDate), weight: Math.round(projWeight * 10) / 10 });
  }

  return {
    bmr,
    tdee,
    goal_type,
    daily_deficit: goal_type === 'fat_loss' ? dailyAdjustment : 0,
    daily_surplus: goal_type === 'muscle_gain' ? dailyAdjustment : 0,
    target_calories: targetCalories,
    target_protein: targetProteinGrams,
    target_carbs: targetCarbsGrams,
    target_fat: targetFatGrams,
    target_fiber: targetFiberGrams,
    safety: {
      is_clamped: isClamped,
      min_floor: gender === 'female' ? 1200 : 1500,
      warning: safetyWarning,
      effective_loss_rate: effectiveLossRate
    },
    timeline: {
      current_weight: numWeight,
      target_weight: numTargetWeight,
      weight_difference: Math.round(absWeightDiff * 10) / 10,
      weeks_to_target: weeksToTarget,
      days_to_target: daysToTarget,
      estimated_target_date: estimatedTargetDate,
      projected_trend: projectedTrend
    }
  };
}

export function getRateOptionsPreview(userStats) {
  const w = parseFloat(userStats.weight) || 75;
  const tw = parseFloat(userStats.target_weight) || 70;
  const diff = tw - w;
  const goalType = diff > 0.5 ? 'muscle_gain' : diff < -0.5 ? 'fat_loss' : 'maintenance';

  const rates = goalType === 'maintenance' ? [0.25] : [0.25, 0.5, 0.75, 1.0];

  const fatLossBadges = {
    0.25: 'Gradual & Sustainable',
    0.5: 'Balanced & Recommended',
    0.75: 'Faster Fat Loss',
    1.0: 'Maximum Deficit'
  };

  const muscleGainBadges = {
    0.25: 'Lean & Slow',
    0.5: 'Balanced Bulk',
    0.75: 'Faster Gain',
    1.0: 'Aggressive Bulk'
  };

  const maintenanceBadges = {
    0.25: 'Maintain Current Weight'
  };

  return rates.map((rate) => {
    const calc = calculateUserMacros({ ...userStats, fat_loss_rate: rate, goal_type: goalType });
    const isAggressive = rate >= 0.75 || calc.safety.is_clamped;
    const badge =
      goalType === 'muscle_gain'
        ? muscleGainBadges[rate]
        : goalType === 'maintenance'
        ? maintenanceBadges[rate]
        : fatLossBadges[rate];

    let warning = calc.safety.warning;
    if (!warning && isAggressive) {
      if (goalType === 'fat_loss') {
        warning = 'Aggressive pace — monitor energy levels.';
      } else if (goalType === 'muscle_gain') {
        warning = 'Fast bulking may increase fat gain — consider a slower pace for lean gains.';
      }
    }

    return {
      rate,
      badge,
      goal_type: goalType,
      target_calories: calc.target_calories,
      weeks_to_target: calc.timeline.weeks_to_target,
      estimated_date: calc.timeline.estimated_target_date,
      is_clamped: calc.safety.is_clamped,
      is_aggressive: isAggressive,
      warning,
      macros: {
        protein: calc.target_protein,
        carbs: calc.target_carbs,
        fat: calc.target_fat,
        fiber: calc.target_fiber
      }
    };
  });
}
