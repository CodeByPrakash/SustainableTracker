import { uuid } from '../utils/uuid';
import type { SQLiteDatabase } from 'expo-sqlite';
import { applyCalibrationFor55Kg } from './queries/workoutQueries';

// ─── Helpers & Interfaces ───────────────────────────────────────────
interface ScheduleBlockSeed {
  title: string;
  startTime: string;
  endTime: string | null;
  category: string;
  sortOrder: number;
}

interface ExerciseSeed {
  name: string;
  category: string;
  sets: number;
  reps: number;
  weightKg: number;
}

interface WorkoutPlanSeed {
  dayOfWeek: number;
  name: string;
  focus: string;
  exercises: ExerciseSeed[];
}

interface HabitSeed {
  name: string;
  groupName: string;
  frequency: string;
}

interface SkillSeed {
  name: string;
  category: string;
  targetHoursPerWeek: number;
}

// ─── Section 3: Default Weekday Schedule (Mon–Fri, 1–5) ──────────────
const WEEKDAY_SCHEDULE_BLOCKS: ScheduleBlockSeed[] = [
  { title: 'Wake up and freshen up', startTime: '05:45', endTime: '06:00', category: 'Personal', sortOrder: 0 },
  { title: 'Gym workout', startTime: '06:00', endTime: '07:00', category: 'Gym', sortOrder: 1 },
  { title: 'Cool down and shower', startTime: '07:00', endTime: '07:15', category: 'Personal', sortOrder: 2 },
  { title: 'Morning skincare', startTime: '07:15', endTime: '07:30', category: 'Habits', sortOrder: 3 },
  { title: 'Breakfast', startTime: '07:30', endTime: '08:00', category: 'Meal', sortOrder: 4 },
  { title: 'Academic revision', startTime: '08:00', endTime: '08:45', category: 'Academics', sortOrder: 5 },
  { title: 'Get ready and commute', startTime: '08:45', endTime: '09:25', category: 'Personal', sortOrder: 6 },
  { title: 'College classes and practicals', startTime: '09:35', endTime: '17:10', category: 'College', sortOrder: 7 },
  { title: 'Outing, walk and refresh', startTime: '17:10', endTime: '18:00', category: 'Personal', sortOrder: 8 },
  { title: 'Evening snack and personal time', startTime: '18:00', endTime: '18:30', category: 'Meal', sortOrder: 9 },
  { title: 'Academic study', startTime: '18:30', endTime: '19:45', category: 'Academics', sortOrder: 10 },
  { title: 'Dinner', startTime: '19:45', endTime: '20:15', category: 'Meal', sortOrder: 11 },
  { title: 'Technical skill development', startTime: '20:15', endTime: '21:15', category: 'Skills', sortOrder: 12 },
  { title: 'Night skincare', startTime: '21:15', endTime: '21:35', category: 'Habits', sortOrder: 13 },
  { title: 'Prepare for tomorrow', startTime: '21:35', endTime: '22:00', category: 'Personal', sortOrder: 14 },
  { title: 'Wind down', startTime: '22:00', endTime: '22:30', category: 'Recovery', sortOrder: 15 },
  { title: 'Sleep', startTime: '22:30', endTime: '05:45', category: 'Sleep', sortOrder: 16 },
];

// ─── Section 3.1: Saturday Special Build & Sprint Schedule (Sat, 6) ──
const SATURDAY_SCHEDULE_BLOCKS: ScheduleBlockSeed[] = [
  { title: 'Wake up & hydrate (500ml)', startTime: '05:45', endTime: '06:00', category: 'Personal', sortOrder: 0 },
  { title: 'Gym: Legs + Biceps + Abs', startTime: '06:00', endTime: '07:15', category: 'Gym', sortOrder: 1 },
  { title: 'Cool down, shower & skincare', startTime: '07:15', endTime: '07:45', category: 'Habits', sortOrder: 2 },
  { title: 'Saturday breakfast & tea', startTime: '07:45', endTime: '08:30', category: 'Meal', sortOrder: 3 },
  { title: 'Lab assignments & academic backlog', startTime: '08:30', endTime: '10:00', category: 'Academics', sortOrder: 4 },
  { title: 'Saturday Project Sprint (Deep Work)', startTime: '10:00', endTime: '13:30', category: 'Skills', sortOrder: 5 },
  { title: 'Lunch & recharge', startTime: '13:30', endTime: '14:30', category: 'Meal', sortOrder: 6 },
  { title: 'DSA practice & competitive coding', startTime: '14:30', endTime: '17:00', category: 'Skills', sortOrder: 7 },
  { title: 'Weekend outing & social walk', startTime: '17:00', endTime: '19:30', category: 'Personal', sortOrder: 8 },
  { title: 'Dinner & personal time', startTime: '19:30', endTime: '20:15', category: 'Meal', sortOrder: 9 },
  { title: 'Tech exploration & architecture', startTime: '20:15', endTime: '21:15', category: 'Skills', sortOrder: 10 },
  { title: 'Night skincare protocol', startTime: '21:15', endTime: '21:45', category: 'Habits', sortOrder: 11 },
  { title: 'Wind down & screen-off reading', startTime: '21:45', endTime: '22:30', category: 'Recovery', sortOrder: 12 },
  { title: 'Restorative sleep', startTime: '22:30', endTime: '06:30', category: 'Sleep', sortOrder: 13 },
];

// ─── Section 4: Sunday Recovery & Weekly-Reset Schedule (Sun, 7) ─────
const SUNDAY_SCHEDULE_BLOCKS: ScheduleBlockSeed[] = [
  { title: 'Wake up & warm lemon water', startTime: '06:30', endTime: '07:00', category: 'Personal', sortOrder: 0 },
  { title: 'Active recovery walk & mobility stretching', startTime: '07:00', endTime: '07:45', category: 'Recovery', sortOrder: 1 },
  { title: 'Shower & Sunday skincare', startTime: '07:45', endTime: '08:15', category: 'Habits', sortOrder: 2 },
  { title: 'Leisurely breakfast & personal time', startTime: '08:15', endTime: '09:15', category: 'Meal', sortOrder: 3 },
  { title: 'Weekly academic synthesis & revision', startTime: '09:15', endTime: '11:30', category: 'Academics', sortOrder: 4 },
  { title: 'Personal engineering project & refactoring', startTime: '11:30', endTime: '13:30', category: 'Skills', sortOrder: 5 },
  { title: 'Sunday family lunch', startTime: '13:30', endTime: '14:30', category: 'Meal', sortOrder: 6 },
  { title: 'Rest, afternoon nap & reading', startTime: '14:30', endTime: '16:30', category: 'Recovery', sortOrder: 7 },
  { title: 'Tech podcast & industry review', startTime: '16:30', endTime: '17:30', category: 'Skills', sortOrder: 8 },
  { title: 'Evening walk, coffee & relaxation', startTime: '17:30', endTime: '19:30', category: 'Personal', sortOrder: 9 },
  { title: 'Dinner & relaxing time', startTime: '19:30', endTime: '20:30', category: 'Meal', sortOrder: 10 },
  { title: 'Weekly Blueprint & Monday prep', startTime: '20:30', endTime: '21:30', category: 'Personal', sortOrder: 11 },
  { title: 'Night skincare protocol', startTime: '21:30', endTime: '22:00', category: 'Habits', sortOrder: 12 },
  { title: 'Wind down & mind relaxation', startTime: '22:00', endTime: '22:30', category: 'Recovery', sortOrder: 13 },
  { title: 'Deep sleep before Monday morning', startTime: '22:30', endTime: '05:45', category: 'Sleep', sortOrder: 14 },
];

// ─── Section 5: Weekly Gym Split Calibrated for 55 kg Body Weight ────
const WORKOUT_PLANS: WorkoutPlanSeed[] = [
  {
    dayOfWeek: 1, name: 'Chest + Triceps', focus: 'chest,triceps',
    exercises: [
      { name: 'Bench Press', category: 'chest', sets: 4, reps: 10, weightKg: 30 },
      { name: 'Incline Dumbbell Press', category: 'chest', sets: 3, reps: 12, weightKg: 10 },
      { name: 'Cable Fly', category: 'chest', sets: 3, reps: 15, weightKg: 15 },
      { name: 'Tricep Pushdown', category: 'triceps', sets: 3, reps: 12, weightKg: 15 },
      { name: 'Overhead Extension', category: 'triceps', sets: 3, reps: 10, weightKg: 10 },
    ],
  },
  {
    dayOfWeek: 2, name: 'Back + Biceps', focus: 'back,biceps',
    exercises: [
      { name: 'Deadlift', category: 'back', sets: 4, reps: 8, weightKg: 50 },
      { name: 'Barbell Row', category: 'back', sets: 3, reps: 10, weightKg: 30 },
      { name: 'Lat Pulldown', category: 'back', sets: 3, reps: 12, weightKg: 30 },
      { name: 'Barbell Curl', category: 'biceps', sets: 3, reps: 12, weightKg: 15 },
      { name: 'Hammer Curl', category: 'biceps', sets: 3, reps: 10, weightKg: 7.5 },
    ],
  },
  {
    dayOfWeek: 3, name: 'Legs + Abs', focus: 'legs,abs',
    exercises: [
      { name: 'Barbell Squat', category: 'legs', sets: 4, reps: 10, weightKg: 40 },
      { name: 'Leg Press', category: 'legs', sets: 3, reps: 12, weightKg: 60 },
      { name: 'Romanian Deadlift', category: 'legs', sets: 3, reps: 10, weightKg: 35 },
      { name: 'Leg Curl', category: 'legs', sets: 3, reps: 12, weightKg: 25 },
      { name: 'Hanging Leg Raise', category: 'abs', sets: 3, reps: 15, weightKg: 55 },
    ],
  },
  {
    dayOfWeek: 4, name: 'Shoulders + Triceps', focus: 'shoulders,triceps',
    exercises: [
      { name: 'Overhead Press', category: 'shoulders', sets: 4, reps: 10, weightKg: 20 },
      { name: 'Dumbbell Lateral Raise', category: 'shoulders', sets: 3, reps: 15, weightKg: 5 },
      { name: 'Face Pull', category: 'shoulders', sets: 3, reps: 15, weightKg: 15 },
      { name: 'Close-Grip Bench Press', category: 'triceps', sets: 3, reps: 10, weightKg: 25 },
      { name: 'Tricep Dip', category: 'triceps', sets: 3, reps: 12, weightKg: 55 },
    ],
  },
  {
    dayOfWeek: 5, name: 'Chest + Back', focus: 'chest,back',
    exercises: [
      { name: 'Incline Bench Press', category: 'chest', sets: 4, reps: 10, weightKg: 25 },
      { name: 'Dumbbell Fly', category: 'chest', sets: 3, reps: 12, weightKg: 7.5 },
      { name: 'Pull-Up', category: 'back', sets: 3, reps: 8, weightKg: 55 },
      { name: 'Seated Cable Row', category: 'back', sets: 3, reps: 12, weightKg: 30 },
      { name: 'Chest Dip', category: 'chest', sets: 3, reps: 10, weightKg: 55 },
    ],
  },
  {
    dayOfWeek: 6, name: 'Legs + Biceps + Abs', focus: 'legs,biceps,abs',
    exercises: [
      { name: 'Front Squat', category: 'legs', sets: 4, reps: 10, weightKg: 30 },
      { name: 'Walking Lunge', category: 'legs', sets: 3, reps: 12, weightKg: 7.5 },
      { name: 'Standing Calf Raise', category: 'legs', sets: 3, reps: 15, weightKg: 35 },
      { name: 'Incline Dumbbell Curl', category: 'biceps', sets: 3, reps: 12, weightKg: 7.5 },
      { name: 'Cable Crunch', category: 'abs', sets: 3, reps: 15, weightKg: 25 },
    ],
  },
  {
    dayOfWeek: 7, name: 'Rest / Recovery', focus: 'rest',
    exercises: [],
  },
];

// ─── Section 7: Starter Habit Definitions ───────────────────────────
const HABITS: HabitSeed[] = [
  { name: 'Wake up on time (5:45 AM)', groupName: 'morning', frequency: 'Mon–Sat' },
  { name: 'Gym or recovery', groupName: 'morning', frequency: 'Mon–Sat' },
  { name: 'Morning skincare', groupName: 'morning', frequency: 'daily' },
  { name: 'Apply sunscreen (SPF 50)', groupName: 'morning', frequency: 'daily' },
  { name: 'Eat nutritious breakfast', groupName: 'morning', frequency: 'daily' },
  { name: 'Attend college lectures', groupName: 'college', frequency: 'Mon–Sat' },
  { name: 'Drink water (3L Target)', groupName: 'college', frequency: 'daily' },
  { name: 'Review lecture concepts', groupName: 'college', frequency: 'Mon–Sat' },
  { name: 'Academic study (75 min)', groupName: 'evening', frequency: 'daily' },
  { name: 'Technical skill (60 min)', groupName: 'evening', frequency: 'Mon–Sat' },
  { name: 'Night skincare protocol', groupName: 'night', frequency: 'daily' },
  { name: 'Prepare priorities for tmrw', groupName: 'night', frequency: 'daily' },
  { name: 'Sleep by target (10:30 PM)', groupName: 'night', frequency: 'daily' },
];

// ─── Section 6: Starter Skills Tracks ───────────────────────────────
const SKILLS: SkillSeed[] = [
  { name: 'Data Structures & Algorithms', category: 'technical', targetHoursPerWeek: 7 },
  { name: 'Full-Stack Development', category: 'technical', targetHoursPerWeek: 5 },
  { name: 'Python & AI/ML', category: 'technical', targetHoursPerWeek: 3 },
  { name: 'Backend & Databases', category: 'technical', targetHoursPerWeek: 3 },
];

// ─── Section 2, Page 4: Suggested Semester Subjects & Topics ────────
const SUBJECTS_DATA = [
  {
    name: 'Theory of Computation',
    code: 'CS301',
    color: '#2F855A',
    hours: 7,
    topics: [
      { name: 'DFA, NFA & Regular Expressions', unit: 'Unit 1', status: 'not_started' },
      { name: 'CFG, CFL & Pushdown Automata', unit: 'Unit 2', status: 'not_started' },
      { name: 'Turing Machines & Decidability', unit: 'Unit 3', status: 'not_started' },
      { name: 'Pumping Lemma & Recursive Lang', unit: 'Unit 4', status: 'not_started' },
    ],
  },
  {
    name: 'AI & Machine Learning',
    code: 'CS302',
    color: '#17633D',
    hours: 6,
    topics: [
      { name: 'Search Methods & Heuristics', unit: 'Unit 1', status: 'not_started' },
      { name: 'Knowledge Representation', unit: 'Unit 2', status: 'not_started' },
      { name: 'Supervised & Unsupervised Learning', unit: 'Unit 3', status: 'not_started' },
      { name: 'Model Evaluation & Loss Metrics', unit: 'Unit 4', status: 'not_started' },
    ],
  },
  {
    name: 'Operating Systems',
    code: 'CS202',
    color: '#276749',
    hours: 6,
    topics: [
      { name: 'Processes, Threads & Concurrency', unit: 'Unit 1', status: 'not_started' },
      { name: 'CPU Scheduling Algorithms', unit: 'Unit 2', status: 'not_started' },
      { name: 'Process Synchronization & Deadlock', unit: 'Unit 3', status: 'not_started' },
      { name: 'Memory Management & Paging', unit: 'Unit 4', status: 'not_started' },
    ],
  },
  {
    name: 'Environmental Engineering',
    code: 'CE101',
    color: '#38A169',
    hours: 4,
    topics: [
      { name: 'Air Pollution & Emissions Control', unit: 'Unit 1', status: 'not_started' },
      { name: 'Noise Pollution Management', unit: 'Unit 2', status: 'not_started' },
      { name: 'Solid Waste Management', unit: 'Unit 3', status: 'not_started' },
      { name: 'Industrial Pollution Prevention', unit: 'Unit 4', status: 'not_started' },
    ],
  },
];

// ─── Section 7: Skincare Routine Starter Products ───────────────────
const SKINCARE_PRODUCTS_DATA = [
  // Morning
  { routine: 'morning', step: 1, name: 'Mamaearth Rice Face Wash', notes: 'Gentle morning cleanse with lukewarm water' },
  { routine: 'morning', step: 2, name: 'Pilgrim Niacinamide 10% Serum', notes: 'Barrier strengthening and sebum control (if tolerated)' },
  { routine: 'morning', step: 3, name: 'Vaseline Deep Moisture Moisturizer', notes: 'Hydrates without heavy clogging' },
  { routine: 'morning', step: 4, name: 'Vaseline Gluta-Hya SPF 50 Sunscreen', notes: 'Broad spectrum UV defense before college' },
  // Night
  { routine: 'night', step: 1, name: 'Mamaearth Rice Face Wash', notes: 'Removes college dust, grime, and sunscreen' },
  { routine: 'night', step: 2, name: 'Pilgrim Niacinamide 10% Serum', notes: 'Soothes inflammation & refines skin texture' },
  { routine: 'night', step: 3, name: 'Vaseline Deep Moisture Moisturizer', notes: 'Cellular recovery & overnight repair' },
];

// ─── Seed Execution ─────────────────────────────────────────────────
export async function seedDatabase(db: SQLiteDatabase): Promise<void> {
  const existing = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM schedule_blocks'
  );
  if (existing && existing.count > 0) {
    // Ensure existing exercises and body measurements are calibrated for 55 kg
    await applyCalibrationFor55Kg(db);
    // Remove any legacy demo topic completion so only real user activity counts
    const cleanedSetting = await db.getFirstAsync<{ value: string }>(
      "SELECT value FROM settings WHERE key = 'topics_cleaned_demo_data'"
    );
    if (!cleanedSetting) {
      await db.runAsync("UPDATE topics SET status = 'not_started'");
      await db.runAsync("INSERT OR REPLACE INTO settings (key, value) VALUES ('topics_cleaned_demo_data', 'true')");
    }
    return;
  }

  // 1. Mon–Fri College Schedule Blocks (day_of_week 1–5)
  for (let dow = 1; dow <= 5; dow++) {
    for (const block of WEEKDAY_SCHEDULE_BLOCKS) {
      await db.runAsync(
        `INSERT INTO schedule_blocks (id, title, start_time, end_time, category, day_of_week, is_recurring, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
        [uuid(), block.title, block.startTime, block.endTime, block.category, dow, block.sortOrder]
      );
    }
  }

  // 2. Saturday Special Sprint & Build Agenda (day_of_week 6)
  for (const block of SATURDAY_SCHEDULE_BLOCKS) {
    await db.runAsync(
      `INSERT INTO schedule_blocks (id, title, start_time, end_time, category, day_of_week, is_recurring, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
      [uuid(), block.title, block.startTime, block.endTime, block.category, 6, block.sortOrder]
    );
  }

  // 3. Sunday Recovery & Weekly-Reset Schedule (day_of_week 7)
  for (const block of SUNDAY_SCHEDULE_BLOCKS) {
    await db.runAsync(
      `INSERT INTO schedule_blocks (id, title, start_time, end_time, category, day_of_week, is_recurring, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
      [uuid(), block.title, block.startTime, block.endTime, block.category, 7, block.sortOrder]
    );
  }

  // 3. Workout Plans + Exercises (Calibrated for 55 kg body weight)
  for (const plan of WORKOUT_PLANS) {
    const planId = uuid();
    await db.runAsync(
      `INSERT INTO workout_plans (id, day_of_week, name, focus, sort_order)
       VALUES (?, ?, ?, ?, ?)`,
      [planId, plan.dayOfWeek, plan.name, plan.focus, plan.dayOfWeek]
    );

    for (let i = 0; i < plan.exercises.length; i++) {
      const ex = plan.exercises[i];
      await db.runAsync(
        `INSERT INTO exercises (id, plan_id, name, category, default_sets, default_reps, default_weight_kg, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [uuid(), planId, ex.name, ex.category, ex.sets, ex.reps, ex.weightKg, i]
      );
    }
  }

  // 4. Habits
  for (let i = 0; i < HABITS.length; i++) {
    const habit = HABITS[i];
    await db.runAsync(
      `INSERT INTO habits (id, name, group_name, frequency, sort_order)
       VALUES (?, ?, ?, ?, ?)`,
      [uuid(), habit.name, habit.groupName, habit.frequency, i]
    );
  }

  // 5. Skills
  for (const skill of SKILLS) {
    await db.runAsync(
      `INSERT INTO skills (id, name, category, target_hours_per_week)
       VALUES (?, ?, ?, ?)`,
      [uuid(), skill.name, skill.category, skill.targetHoursPerWeek]
    );
  }

  // 6. Academic Subjects & Topics
  for (const subj of SUBJECTS_DATA) {
    const subjId = uuid();
    await db.runAsync(
      `INSERT INTO subjects (id, name, code, color, target_hours_per_week)
       VALUES (?, ?, ?, ?, ?)`,
      [subjId, subj.name, subj.code, subj.color, subj.hours]
    );

    for (let i = 0; i < subj.topics.length; i++) {
      const top = subj.topics[i];
      await db.runAsync(
        `INSERT INTO topics (id, subject_id, name, unit, status, sort_order)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [uuid(), subjId, top.name, top.unit, top.status, i]
      );
    }
  }

  // 7. Skincare Products
  for (const p of SKINCARE_PRODUCTS_DATA) {
    await db.runAsync(
      `INSERT INTO skincare_products (id, routine_type, step_number, name, notes, is_active)
       VALUES (?, ?, ?, ?, ?, 1)`,
      [uuid(), p.routine, p.step, p.name, p.notes]
    );
  }

  // 8. Default Starter Targets in Settings
  const TARGETS = [
    { key: 'target_wake_time', value: '05:45' },
    { key: 'target_sleep_time', value: '22:30' },
    { key: 'target_water_ml', value: '3000' },
    { key: 'target_study_minutes_weekday', value: '75' },
    { key: 'target_skill_minutes_weekday', value: '60' },
    { key: 'target_gym_minutes', value: '60' },
    { key: 'user_body_weight_kg', value: '55.0' },
  ];
  for (const t of TARGETS) {
    await db.runAsync(
      `INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`,
      [t.key, t.value]
    );
  }

  // 9. Baseline Body Weight (55 kg)
  await db.runAsync(
    `INSERT INTO body_measurements (id, date, weight_kg, unit, notes)
     VALUES (?, date('now'), 55.0, 'kg', 'Baseline body weight')`,
    [uuid()]
  );

  // 10. Sample Assignments & Exams
  await db.runAsync(
    `INSERT INTO assignments (id, title, due_date, priority, status)
     VALUES (?, ?, ?, ?, ?)`,
    [uuid(), 'TOC Pushdown Automata Lab Assignment', '2026-11-20', 'high', 'pending']
  );
  await db.runAsync(
    `INSERT INTO assignments (id, title, due_date, priority, status)
     VALUES (?, ?, ?, ?, ?)`,
    [uuid(), 'OS CPU Scheduling Simulation Analysis', '2026-11-25', 'medium', 'pending']
  );

  await db.runAsync(
    `INSERT INTO exams (id, title, exam_date, target_score)
     VALUES (?, ?, ?, ?)`,
    [uuid(), 'Midterm: Theory of Computation', '2026-12-05', 95]
  );
  await db.runAsync(
    `INSERT INTO exams (id, title, exam_date, target_score)
     VALUES (?, ?, ?, ?)`,
    [uuid(), 'AI & Machine Learning Practical Exam', '2026-11-28', 90]
  );
}
