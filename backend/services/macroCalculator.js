/**
 * Core Nutrition & Body Tracking Service
 * Calculates BMR (Mifflin-St Jeor), TDEE, Safety-Clamped Daily Deficits,
 * Personalized Macros (Protein, Carbs, Fats, Fiber), and Goal Timeline Projections.
 */

function calculateUserMacros(user) {
  const {
    weight = 75, // current weight in kg
    target_weight = 70, // goal weight in kg
    height = 175, // in cm
    age = 25,
    gender = 'male', // male or female
    activity_level = 'moderate', // sedentary, light, moderate, active, very_active
    goal_type = 'fat_loss', // fat_loss, maintain, muscle_gain
    fat_loss_rate = 0.5 // kg per week (0.25, 0.5, 0.75, 1.0)
  } = user;

  // 1. Calculate Basal Metabolic Rate (BMR) using Mifflin-St Jeor equation:
  // Men:   BMR = 10 * weight(kg) + 6.25 * height(cm) - 5 * age + 5
  // Women: BMR = 10 * weight(kg) + 6.25 * height(cm) - 5 * age - 161
  const genderOffset = (gender === 'female' || gender === 'f') ? -161 : 5;
  const bmr = Math.round((10 * weight) + (6.25 * height) - (5 * age) + genderOffset);

  // 2. Total Daily Energy Expenditure (TDEE) = BMR * activity multiplier
  const activityMultipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9
  };

  const multiplier = activityMultipliers[activity_level] || 1.55;
  const tdee = Math.round(bmr * multiplier);

  // 3. Daily Deficit / Surplus Calculation
  // 1 kg of body fat ≈ 7,700 kcal -> daily deficit = (selected_kg_per_week * 7700) / 7
  const dailyDeficit = Math.round((fat_loss_rate * 7700) / 7);
  let uncappedTargetCalories = tdee;

  if (goal_type === 'fat_loss') {
    uncappedTargetCalories = tdee - dailyDeficit;
  } else if (goal_type === 'muscle_gain') {
    uncappedTargetCalories = tdee + Math.round(dailyDeficit * 0.5); // modest surplus
  }

  // 4. Safe Minimum Floor Clamping (1200 kcal women / 1500 kcal men)
  const minFloor = (gender === 'female' || gender === 'f') ? 1200 : 1500;
  let targetCalories = uncappedTargetCalories;
  let isClamped = false;
  let safetyWarning = null;
  let effectiveLossRate = fat_loss_rate;

  if (targetCalories < minFloor && goal_type === 'fat_loss') {
    targetCalories = minFloor;
    isClamped = true;
    const maxSafeDeficit = Math.max(0, tdee - minFloor);
    effectiveLossRate = Math.max(0.1, Math.round(((maxSafeDeficit * 7) / 7700) * 100) / 100);
    safetyWarning = `Daily intake clamped to minimum ${minFloor} kcal floor. Safe pace is ${effectiveLossRate} kg/week.`;
  }

  // 5. Macro Distribution Allocation
  // Protein: 2.0g per kg of body weight (within 1.6-2.2 g/kg range)
  const targetProteinGrams = Math.round(weight * 2.0);
  const proteinCalories = targetProteinGrams * 4;

  // Fat: ~25% of total calories (0.8-1g/kg equivalent)
  const fatCalories = targetCalories * 0.25;
  const targetFatGrams = Math.round(fatCalories / 9);

  // Fiber: ~14g per 1000 kcal consumed
  const targetFiberGrams = Math.round((targetCalories / 1000) * 14);

  // Carbs: Remaining calories allocated to carbohydrates
  const remainingCalories = targetCalories - proteinCalories - (targetFatGrams * 9);
  const targetCarbsGrams = Math.max(40, Math.round(remainingCalories / 4));

  // 6. Estimated Target Weight Timeline & Trend Line Projection
  const weightDifference = Math.abs(weight - target_weight);
  const rateToUse = goal_type === 'fat_loss' ? effectiveLossRate : (fat_loss_rate || 0.5);
  
  const weeksToTarget = rateToUse > 0 ? Math.round((weightDifference / rateToUse) * 10) / 10 : 0;
  const daysToTarget = Math.ceil(weeksToTarget * 7);

  function getLocalDateStr(d = new Date()) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const estimatedTargetDateObj = new Date();
  estimatedTargetDateObj.setDate(estimatedTargetDateObj.getDate() + daysToTarget);
  const estimatedTargetDate = getLocalDateStr(estimatedTargetDateObj);

  // Generate weekly projected trend data points for chart overlay
  const projectedTrend = [];
  const todayDate = new Date();
  const numSteps = Math.min(12, Math.max(2, Math.ceil(weeksToTarget)));

  for (let i = 0; i <= numSteps; i++) {
    const progressRatio = i / numSteps;
    const pointDate = new Date(todayDate);
    pointDate.setDate(todayDate.getDate() + Math.round(progressRatio * daysToTarget));
    
    let projWeight = weight;
    if (goal_type === 'fat_loss') {
      projWeight = Math.max(target_weight, weight - (progressRatio * weightDifference));
    } else if (goal_type === 'muscle_gain') {
      projWeight = weight + (progressRatio * weightDifference);
    }
    
    projectedTrend.push({
      date: getLocalDateStr(pointDate),
      weight: Math.round(projWeight * 10) / 10
    });
  }


  return {
    bmr,
    tdee,
    daily_deficit: dailyDeficit,
    target_calories: targetCalories,
    target_protein: targetProteinGrams,
    target_carbs: targetCarbsGrams,
    target_fat: targetFatGrams,
    target_fiber: targetFiberGrams,
    safety: {
      is_clamped: isClamped,
      min_floor: minFloor,
      warning: safetyWarning,
      effective_loss_rate: effectiveLossRate
    },
    timeline: {
      current_weight: weight,
      target_weight: target_weight,
      weight_difference: Math.round(weightDifference * 10) / 10,
      weeks_to_target: weeksToTarget,
      days_to_target: daysToTarget,
      estimated_target_date: estimatedTargetDate,
      projected_trend: projectedTrend
    }
  };
}

function getRateOptionsPreview(userStats) {
  const rates = [0.25, 0.5, 0.75, 1.0];
  return rates.map((rate) => {
    const calc = calculateUserMacros({ ...userStats, fat_loss_rate: rate });
    const isAggressive = rate >= 0.75 || calc.safety.is_clamped;
    let badge = 'Standard';
    if (rate === 0.25) badge = 'Gradual & Sustainable';
    if (rate === 0.5) badge = 'Balanced & Recommended';
    if (rate === 0.75) badge = 'Faster Fat Loss';
    if (rate === 1.0) badge = 'Maximum Aggressive Deficit';

    return {
      rate,
      badge,
      target_calories: calc.target_calories,
      weeks_to_target: calc.timeline.weeks_to_target,
      estimated_date: calc.timeline.estimated_target_date,
      is_clamped: calc.safety.is_clamped,
      is_aggressive: isAggressive,
      warning: calc.safety.warning || (isAggressive ? 'Aggressive pace — monitor energy levels.' : null),
      macros: {
        protein: calc.target_protein,
        carbs: calc.target_carbs,
        fat: calc.target_fat,
        fiber: calc.target_fiber
      }
    };
  });
}

module.exports = {
  calculateUserMacros,
  getRateOptionsPreview
};
