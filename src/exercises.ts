export interface Point {
  x: number;
  y: number;
  z?: number;
}

export interface Landmarks {
  nose?: Point;
  leftShoulder?: Point;
  rightShoulder?: Point;
  leftElbow?: Point;
  rightElbow?: Point;
  leftWrist?: Point;
  rightWrist?: Point;
  leftHip?: Point;
  rightHip?: Point;
  leftKnee?: Point;
  rightKnee?: Point;
  leftAnkle?: Point;
  rightAnkle?: Point;
}

export const landmarkIndexMap: Record<string, number> = {
  nose: 0,
  leftEyeInner: 1,
  leftEye: 2,
  leftEyeOuter: 3,
  rightEyeInner: 4,
  rightEye: 5,
  rightEyeOuter: 6,
  leftEar: 7,
  rightEar: 8,
  mouthLeft: 9,
  mouthRight: 10,
  leftShoulder: 11,
  rightShoulder: 12,
  leftElbow: 13,
  rightElbow: 14,
  leftWrist: 15,
  rightWrist: 16,
  leftPinky: 17,
  rightPinky: 18,
  leftIndex: 19,
  rightIndex: 20,
  leftThumb: 21,
  rightThumb: 22,
  leftHip: 23,
  rightHip: 24,
  leftKnee: 25,
  rightKnee: 26,
  leftAnkle: 27,
  rightAnkle: 28,
  leftHeel: 29,
  rightHeel: 30,
  leftFootIndex: 31,
  rightFootIndex: 32,
};

export type MuscleGroup =
  | "chest"
  | "back"
  | "shoulders"
  | "arms"
  | "core"
  | "legs"
  | "fullbody"
  | "cardio"
  | "stretch";

export interface FormRule {
  landmarks: (keyof typeof landmarkIndexMap)[];
  minAngle?: number;
  maxAngle?: number;
  message: string;
  affectedLandmarks: (keyof typeof landmarkIndexMap)[];
}

export interface ExerciseConfig {
  name: string;
  landmarks: (keyof typeof landmarkIndexMap)[];
  minAngle: number;
  maxAngle: number;
  side: "left" | "right" | "both";
  countOn: "up" | "down";
  type: "reps" | "timed";
  description: string;
  cameraPosition: string;
  muscleGroup: MuscleGroup;
  formRules: FormRule[];
}

export const EXERCISES: Record<string, ExerciseConfig> = {
  pushups: {
    name: "Push-ups",
    landmarks: ["leftShoulder", "leftElbow", "leftWrist"], // Flexia brațului
    minAngle: 70,
    maxAngle: 170,
    side: "both",
    countOn: "up",
    type: "reps",
    description: "Keep body straight, lower chest to ground then push up",
    cameraPosition: "Place phone on the side at shoulder height",
    muscleGroup: "chest",
    formRules: [
      {
        landmarks: ["leftShoulder", "leftHip", "leftKnee"],
        minAngle: 140, // Toleranță pentru corp drept (nu toți țin core-ul perfect la 180)
        message: "Keep your body straight! Hips too high or too low.",
        affectedLandmarks: ["leftHip"],
      },
    ],
  },

  squats: {
    name: "Squats",
    landmarks: ["leftHip", "leftKnee", "leftAnkle"],
    minAngle: 60,
    maxAngle: 175,
    side: "both",
    countOn: "up",
    type: "reps",
    description: "Feet shoulder-width apart, lower until thighs are parallel",
    cameraPosition: "Place phone on the side at hip height",
    muscleGroup: "legs",
    formRules: [],
  },

  situps: {
    name: "Sit-ups",
    landmarks: ["leftShoulder", "leftHip", "leftKnee"], // Flexia trunchiului pe picioare
    minAngle: 60, // Sus
    maxAngle: 150, // Jos, pe spate (am adăugat toleranță, unii au spatele ușor curbat la sol)
    side: "both",
    countOn: "down",
    type: "reps",
    description: "Lie on back, raise torso toward knees, lower back down",
    cameraPosition: "Place phone on the side at ground level",
    muscleGroup: "core",
    formRules: [],
  },

  lunges: {
    name: "Lunges",
    landmarks: ["leftHip", "leftKnee", "leftAnkle"],
    minAngle: 60,
    maxAngle: 170,
    side: "left",
    countOn: "up",
    type: "reps",
    description:
      "Step forward, lower back knee toward ground, return to standing",
    cameraPosition: "Place phone on the side at hip height",
    muscleGroup: "legs",
    formRules: [],
  },

  calfRaises: {
    name: "Calf Raises",
    landmarks: ["leftKnee", "leftAnkle", "leftFootIndex"],
    minAngle: 80,
    maxAngle: 135,
    side: "both",
    countOn: "up",
    type: "reps",
    description:
      "Stand straight, raise heels as high as possible, lower slowly",
    cameraPosition: "Place phone on the side at ankle height",
    muscleGroup: "legs",
    formRules: [
      {
        landmarks: ["leftHip", "leftKnee", "leftAnkle"],
        minAngle: 145,
        message: "Keep your legs straight! Don't bend your knees.",
        affectedLandmarks: ["leftKnee"],
      },
    ],
  },

  pullups: {
    name: "Pull-ups",
    landmarks: ["leftShoulder", "leftElbow", "leftWrist"],
    minAngle: 50, // Bărbia peste bară (unghi mic)
    maxAngle: 170,
    side: "both",
    countOn: "down",
    type: "reps",
    description:
      "Hang from bar, pull body up until chin clears bar, lower slowly",
    cameraPosition: "⚠️ Place phone BEHIND you at shoulder height",
    muscleGroup: "back",
    formRules: [],
  },

  plank: {
    name: "Plank",
    landmarks: ["leftShoulder", "leftElbow", "leftWrist"], // Plansa pe brațe întinse
    minAngle: 140,
    maxAngle: 180,
    side: "both",
    countOn: "up",
    type: "timed",
    description: "Hold body in straight line on straight arms, core tight",
    cameraPosition: "Place phone on the side at shoulder height",
    muscleGroup: "core",
    formRules: [
      {
        landmarks: ["leftShoulder", "leftHip", "leftKnee"],
        minAngle: 150, // Corp drept
        message: "Keep your body straight! Don't let hips sag.",
        affectedLandmarks: ["leftHip"],
      },
    ],
  },

  gluteBridge: {
    name: "Glute Bridge",
    landmarks: ["leftShoulder", "leftHip", "leftKnee"], // Extensia bazinului
    minAngle: 100,
    maxAngle: 170,
    side: "both",
    countOn: "up",
    type: "reps",
    description: "Lie on back, knees bent, lift hips to form straight line",
    cameraPosition: "Place phone on the side at hip height",
    muscleGroup: "legs",
    formRules: [],
  },

  mountainClimbers: {
    name: "Mountain Climbers",
    landmarks: ["leftShoulder", "leftHip", "leftKnee"], // Flexia șoldului
    minAngle: 80,
    maxAngle: 170,
    side: "both",
    countOn: "up",
    type: "reps",
    description: "Start in plank, drive knees toward chest alternately",
    cameraPosition: "Place phone on the side at hip height",
    muscleGroup: "core",
    formRules: [],
  },

  jumpingJacks: {
    name: "Jumping Jacks",
    landmarks: ["leftHip", "leftShoulder", "leftWrist"], // Mișcarea se urmărește mult mai bine din umăr-braț!
    minAngle: 10,
    maxAngle: 160,
    side: "both",
    countOn: "up",
    type: "reps",
    description: "Jump feet apart while raising arms overhead, jump back",
    cameraPosition: "Place phone in front at shoulder height",
    muscleGroup: "cardio",
    formRules: [],
  },

  highKnees: {
    name: "High Knees",
    landmarks: ["leftShoulder", "leftHip", "leftKnee"], // Flexia se face din șold, nu din genunchi!
    minAngle: 70,
    maxAngle: 170,
    side: "both",
    countOn: "up",
    type: "reps",
    description: "Run in place, bring knees up to hip height",
    cameraPosition: "Place phone on the side at hip height",
    muscleGroup: "cardio",
    formRules: [],
  },

  wallSit: {
    name: "Wall Sit",
    landmarks: ["leftHip", "leftKnee", "leftAnkle"],
    minAngle: 70,
    maxAngle: 115,
    side: "both",
    countOn: "up",
    type: "timed",
    description:
      "Back against wall, slide down until thighs parallel to ground",
    cameraPosition: "Place phone on the side at hip height",
    muscleGroup: "legs",
    formRules: [
      {
        landmarks: ["leftShoulder", "leftHip", "leftKnee"],
        minAngle: 75,
        maxAngle: 110,
        message: "Keep your back flat against the wall!",
        affectedLandmarks: ["leftShoulder", "leftHip"],
      },
    ],
  },
  // ── Added presets fallbacks ──
  diamondPushups: {
    name: "Diamond Push-ups",
    landmarks: ["leftShoulder", "leftElbow", "leftWrist"],
    minAngle: 70,
    maxAngle: 170,
    side: "both",
    countOn: "up",
    type: "reps",
    description: "Hands close under chest, elbows narrow, press up.",
    cameraPosition: "Place phone on the side at shoulder height",
    muscleGroup: "chest",
    formRules: [],
  },

  widePushups: {
    name: "Wide Push-ups",
    landmarks: ["leftShoulder", "leftElbow", "leftWrist"],
    minAngle: 70,
    maxAngle: 170,
    side: "both",
    countOn: "up",
    type: "reps",
    description: "Hands wider than shoulders, lower chest and push up.",
    cameraPosition: "Place phone on the side at shoulder height",
    muscleGroup: "chest",
    formRules: [],
  },

  pikePushups: {
    name: "Pike Push-ups",
    landmarks: ["leftShoulder", "leftElbow", "leftWrist"],
    minAngle: 60,
    maxAngle: 160,
    side: "both",
    countOn: "up",
    type: "reps",
    description:
      "Hips high in pike, bend elbows to bring head down then press.",
    cameraPosition: "Phone on the side at head height",
    muscleGroup: "shoulders",
    formRules: [],
  },

  dips: {
    name: "Dips (Chair)",
    landmarks: ["leftShoulder", "leftElbow", "leftWrist"],
    minAngle: 60,
    maxAngle: 160,
    side: "both",
    countOn: "up",
    type: "reps",
    description:
      "Hands on chair/bench behind you, lower elbows to ~90°, push up.",
    cameraPosition: "Phone on the side at shoulder height",
    muscleGroup: "arms",
    formRules: [],
  },

  stepUps: {
    name: "Step-ups",
    landmarks: ["leftHip", "leftKnee", "leftAnkle"],
    minAngle: 65,
    maxAngle: 170,
    side: "left",
    countOn: "up",
    type: "reps",
    description:
      "Step onto a box with one leg, drive through heel to stand tall.",
    cameraPosition: "Phone on the side at knee height",
    muscleGroup: "legs",
    formRules: [],
  },

  deadBug: {
    name: "Dead Bug",
    landmarks: ["leftShoulder", "leftHip", "leftKnee"],
    minAngle: 60,
    maxAngle: 170,
    side: "both",
    countOn: "down",
    type: "reps",
    description:
      "On back, alternate extending opposite arm/leg while keeping core tight.",
    cameraPosition: "Phone above at hip height angled down",
    muscleGroup: "core",
    formRules: [],
  },

  legRaises: {
    name: "Leg Raises",
    landmarks: ["leftHip", "leftKnee", "leftAnkle"],
    minAngle: 55,
    maxAngle: 160,
    side: "both",
    countOn: "down",
    type: "reps",
    description: "Lie on back, raise legs to 90°, lower with control.",
    cameraPosition: "Phone on the side at hip height",
    muscleGroup: "core",
    formRules: [],
  },

  sidePlank: {
    name: "Side Plank",
    landmarks: ["leftShoulder", "leftHip", "leftAnkle"],
    minAngle: 140,
    maxAngle: 180,
    side: "left",
    countOn: "up",
    type: "timed",
    description: "Support on one forearm, body in straight line, hold.",
    cameraPosition: "Phone on the side at shoulder height",
    muscleGroup: "core",
    formRules: [],
  },

  wallPushup: {
    name: "Wall Push-up",
    landmarks: ["leftShoulder", "leftElbow", "leftWrist"],
    minAngle: 70,
    maxAngle: 170,
    side: "both",
    countOn: "up",
    type: "reps",
    description: "Hands on wall, lean forward, bend elbows, push back.",
    cameraPosition: "Phone on the side at shoulder height",
    muscleGroup: "chest",
    formRules: [],
  },

  burpees: {
    name: "Burpees",
    landmarks: ["leftShoulder", "leftHip", "leftKnee"],
    minAngle: 55,
    maxAngle: 175,
    side: "both",
    countOn: "up",
    type: "reps",
    description: "Squat down, kick back to plank, return and jump.",
    cameraPosition: "Phone in front at waist height",
    muscleGroup: "fullbody",
    formRules: [],
  },
};

export const calculateAngle = (p1: Point, p2: Point, p3: Point): number => {
  const radians =
    Math.atan2(p3.y - p2.y, p3.x - p2.x) - Math.atan2(p1.y - p2.y, p1.x - p2.x);
  let angle = Math.abs((radians * 180) / Math.PI);
  if (angle > 180) angle = 360 - angle;
  return angle;
};
