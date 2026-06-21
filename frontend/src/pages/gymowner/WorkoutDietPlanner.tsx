import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import {
  ClipboardList,
  Search,
  Dumbbell,
  Apple,
  Save,
  Plus,
  Trash2,
  AlertCircle
} from 'lucide-react';

interface Member {
  _id: string;
  name: string;
  phone: string;
}

interface Exercise {
  name: string;
  sets: number;
  reps: number;
  dayOfWeek: string;
}

interface Meal {
  mealTime: string;
  items: string;
  calories: number;
}

export const WorkoutDietPlanner: React.FC = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [activeTab, setActiveTab] = useState<'workout' | 'diet'>('workout');

  // Workout state
  const [workoutInstructions, setWorkoutInstructions] = useState('');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [newExName, setNewExName] = useState('');
  const [newExSets, setNewExSets] = useState(3);
  const [newExReps, setNewExReps] = useState(12);
  const [newExDay, setNewExDay] = useState('Monday');

  // Diet state
  const [dietInstructions, setDietInstructions] = useState('');
  const [meals, setMeals] = useState<Meal[]>([]);
  const [newMealTime, setNewMealTime] = useState('Breakfast');
  const [newMealItems, setNewMealItems] = useState('');
  const [newMealCalories, setNewMealCalories] = useState(300);

  const [saving, setSaving] = useState(false);
  const { showToast } = useNotification();

  useEffect(() => {
    async function loadMembers() {
      try {
        const data = await api.get('/members');
        setMembers(data);
        if (data.length > 0) {
          setSelectedMemberId(data[0]._id);
        }
      } catch (err: any) {
        showToast('Error retrieving gym members.', 'error');
      } finally {
        setLoadingMembers(false);
      }
    }
    loadMembers();
  }, [showToast]);

  useEffect(() => {
    if (selectedMemberId) {
      loadPlansForMember(selectedMemberId);
    }
  }, [selectedMemberId]);

  const loadPlansForMember = async (memberId: string) => {
    try {
      const [workoutData, dietData] = await Promise.all([
        api.get(`/workouts/member/${memberId}`),
        api.get(`/diets/member/${memberId}`)
      ]);
      
      setWorkoutInstructions(workoutData.instructions || '');
      setExercises(workoutData.exercises || []);
      
      setDietInstructions(dietData.instructions || '');
      setMeals(dietData.meals || []);
    } catch (err: any) {
      showToast('Error loading fitness plans.', 'error');
    }
  };

  const handleAddExercise = () => {
    if (!newExName) {
      showToast('Exercise name is required.', 'info');
      return;
    }
    setExercises((prev) => [
      ...prev,
      { name: newExName, sets: newExSets, reps: newExReps, dayOfWeek: newExDay }
    ]);
    setNewExName('');
  };

  const handleRemoveExercise = (idx: number) => {
    setExercises((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleAddMeal = () => {
    if (!newMealItems) {
      showToast('Meal items details are required.', 'info');
      return;
    }
    setMeals((prev) => [
      ...prev,
      { mealTime: newMealTime, items: newMealItems, calories: newMealCalories }
    ]);
    setNewMealItems('');
  };

  const handleRemoveMeal = (idx: number) => {
    setMeals((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSaveWorkout = async () => {
    if (!selectedMemberId) return;
    setSaving(true);
    try {
      await api.post(`/workouts/member/${selectedMemberId}`, {
        instructions: workoutInstructions,
        exercises
      });
      showToast('Workout plan updated successfully.', 'success');
    } catch (err: any) {
      showToast('Failed to save workout schedule.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDiet = async () => {
    if (!selectedMemberId) return;
    setSaving(true);
    try {
      await api.post(`/diets/member/${selectedMemberId}`, {
        instructions: dietInstructions,
        meals
      });
      showToast('Diet prescription updated successfully.', 'success');
    } catch (err: any) {
      showToast('Failed to save nutrition chart.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Fitness Planners</h1>
        <p className="text-xs text-muted-foreground">Assign customized workouts and diet prescriptions for gym members.</p>
      </div>

      {/* Select Member Box */}
      <div className="p-4 rounded-xl bg-card border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-0.5">
          <span className="text-xs font-semibold text-muted-foreground uppercase">Configure Member:</span>
          {loadingMembers ? (
            <div className="w-5 h-5 rounded-full border border-primary/20 border-t-primary animate-spin" />
          ) : (
            <select
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              className="mt-1 px-3 py-2 rounded-xl border bg-background text-sm focus:outline-none w-full sm:w-64"
            >
              {members.map((m) => (
                <option key={m._id} value={m._id}>
                  {m.name} ({m.phone})
                </option>
              ))}
            </select>
          )}
        </div>
        
        {/* Toggle planner tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('workout')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase flex items-center gap-1.5 transition-all ${
              activeTab === 'workout'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-background hover:bg-muted text-foreground border'
            }`}
          >
            <Dumbbell className="w-4 h-4" /> Workout Planner
          </button>
          <button
            onClick={() => setActiveTab('diet')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase flex items-center gap-1.5 transition-all ${
              activeTab === 'diet'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-background hover:bg-muted text-foreground border'
            }`}
          >
            <Apple className="w-4 h-4" /> Nutrition Diet
          </button>
        </div>
      </div>

      {!selectedMemberId ? (
        <div className="p-12 text-center border rounded-2xl bg-card">
          <p className="text-sm text-muted-foreground">Register members in your gym to enable fitness planners.</p>
        </div>
      ) : (
        /* Planner Panels */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 p-6 rounded-2xl bg-card border shadow-sm space-y-6">
            {activeTab === 'workout' ? (
              <>
                <div className="flex items-center justify-between border-b pb-3">
                  <h2 className="font-extrabold text-base flex items-center gap-1.5">
                    <Dumbbell className="w-5 h-5 text-primary" /> Active Exercises schedule
                  </h2>
                  <button
                    onClick={handleSaveWorkout}
                    disabled={saving}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Save className="w-3.5 h-3.5" /> {saving ? 'Saving...' : 'Save Schedule'}
                  </button>
                </div>

                {/* Exercises log */}
                {exercises.length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted-foreground border border-dashed rounded-xl">
                    No exercises assigned. Use the side-form to build the workout plan.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {exercises.map((ex, idx) => (
                      <div key={idx} className="p-3 bg-background border rounded-xl flex items-center justify-between text-xs">
                        <div className="space-y-0.5">
                          <div className="font-bold text-foreground">{ex.name}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {ex.sets} Sets &times; {ex.reps} Reps | <span className="font-semibold text-primary">{ex.dayOfWeek}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveExercise(idx)}
                          className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                          title="Remove Exercise"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* General notes */}
                <div className="space-y-2 pt-4 border-t">
                  <label className="block text-xs font-semibold text-muted-foreground uppercase">General Roster Instructions</label>
                  <textarea
                    rows={4}
                    value={workoutInstructions}
                    onChange={(e) => setWorkoutInstructions(e.target.value)}
                    placeholder="Provide safety advice, stretching rules, or cardio protocols..."
                    className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between border-b pb-3">
                  <h2 className="font-extrabold text-base flex items-center gap-1.5">
                    <Apple className="w-5 h-5 text-emerald-400" /> Active Diet Chart
                  </h2>
                  <button
                    onClick={handleSaveDiet}
                    disabled={saving}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Save className="w-3.5 h-3.5" /> {saving ? 'Saving...' : 'Save Diet'}
                  </button>
                </div>

                {/* Meals list */}
                {meals.length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted-foreground border border-dashed rounded-xl">
                    No meals assigned yet. Use the side form to prescribe foods.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {meals.map((meal, idx) => (
                      <div key={idx} className="p-3 bg-background border rounded-xl flex items-center justify-between text-xs">
                        <div className="space-y-0.5">
                          <div className="font-bold text-foreground capitalize">{meal.mealTime}</div>
                          <div className="text-[10px] text-muted-foreground">{meal.items}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] bg-muted px-2 py-0.5 rounded font-bold">
                            {meal.calories} kcal
                          </span>
                          <button
                            onClick={() => handleRemoveMeal(idx)}
                            className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                            title="Remove Meal"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Diet instructions */}
                <div className="space-y-2 pt-4 border-t">
                  <label className="block text-xs font-semibold text-muted-foreground uppercase">Nutrition Guidelines</label>
                  <textarea
                    rows={4}
                    value={dietInstructions}
                    onChange={(e) => setDietInstructions(e.target.value)}
                    placeholder="Specify daily water intake guidelines, protein requirements, or supplements timings..."
                    className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                  />
                </div>
              </>
            )}
          </div>

          {/* Builder Tools Box */}
          <div className="p-6 rounded-2xl bg-card border shadow-sm space-y-4 h-fit">
            {activeTab === 'workout' ? (
              <>
                <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Add Exercise</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Exercise Name</label>
                    <input
                      type="text"
                      value={newExName}
                      onChange={(e) => setNewExName(e.target.value)}
                      placeholder="e.g. Bench Press"
                      className="w-full px-3 py-1.5 rounded-lg border bg-background text-xs focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Sets</label>
                      <input
                        type="number"
                        value={newExSets}
                        onChange={(e) => setNewExSets(Number(e.target.value))}
                        className="w-full px-3 py-1.5 rounded-lg border bg-background text-xs focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Reps</label>
                      <input
                        type="number"
                        value={newExReps}
                        onChange={(e) => setNewExReps(Number(e.target.value))}
                        className="w-full px-3 py-1.5 rounded-lg border bg-background text-xs focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Target Day</label>
                    <select
                      value={newExDay}
                      onChange={(e) => setNewExDay(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border bg-background text-xs focus:outline-none"
                    >
                      {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={handleAddExercise}
                    className="w-full py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold rounded-lg flex items-center justify-center gap-1 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" /> Append Exercise
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Add Meal Detail</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Meal Time Slot</label>
                    <select
                      value={newMealTime}
                      onChange={(e) => setNewMealTime(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border bg-background text-xs focus:outline-none"
                    >
                      <option value="Breakfast">Breakfast</option>
                      <option value="Lunch">Lunch</option>
                      <option value="Dinner">Dinner</option>
                      <option value="Pre-Workout">Pre-Workout</option>
                      <option value="Post-Workout">Post-Workout</option>
                      <option value="Snack">Midday Snack</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Food Items</label>
                    <input
                      type="text"
                      value={newMealItems}
                      onChange={(e) => setNewMealItems(e.target.value)}
                      placeholder="e.g. 3 egg whites + 1 brown bread slice"
                      className="w-full px-3 py-1.5 rounded-lg border bg-background text-xs focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Calories estimate (kcal)</label>
                    <input
                      type="number"
                      value={newMealCalories}
                      onChange={(e) => setNewMealCalories(Number(e.target.value))}
                      className="w-full px-3 py-1.5 rounded-lg border bg-background text-xs focus:outline-none"
                    />
                  </div>

                  <button
                    onClick={handleAddMeal}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" /> Prescribe Meal
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
