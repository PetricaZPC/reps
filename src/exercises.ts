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

export type MuscleGroup = 'chest' | 'back' | 'shoulders' | 'arms' | 'core' | 'legs' | 'fullbody' | 'cardio' | 'stretch';

export interface ExerciseConfig {
  name: string;
  landmarks: (keyof typeof landmarkIndexMap)[];
  minAngle: number;
  maxAngle: number;
  side: 'left' | 'right' | 'both';
  countOn: 'up' | 'down';
  type: 'reps' | 'timed';
  description: string;
  cameraPosition: string;
  muscleGroup: MuscleGroup;
}

export const EXERCISES: Record<string, ExerciseConfig> = {
  pushups: {
    name: 'Push-ups',
    landmarks: ['leftShoulder', 'leftElbow', 'leftWrist'],
    minAngle: 100,
    maxAngle: 170,
    side: 'both',
    countOn: 'up',
    type: 'reps',
    description: 'Keep body straight, lower chest to ground then push up',
    cameraPosition: 'Place phone on the side at shoulder height',
    muscleGroup: 'chest',
  },

  squats: {
    name: 'Squats',
    landmarks: ['leftHip', 'leftKnee', 'leftAnkle'],
    minAngle: 80,
    maxAngle: 165,
    side: 'both',
    countOn: 'up',
    type: 'reps',
    description: 'Feet shoulder-width apart, lower until thighs are parallel',
    cameraPosition: 'Place phone on the side at hip height',
    muscleGroup: 'legs',
  },

  situps: {
    name: 'Sit-ups',
    landmarks: ['leftShoulder', 'leftHip', 'leftKnee'],
    minAngle: 60,
    maxAngle: 150,
    side: 'both',
    countOn: 'down',
    type: 'reps',
    description: 'Lie on back, raise torso toward knees, lower back down',
    cameraPosition: 'Place phone on the side at ground level',
    muscleGroup: 'core',
  },

  lunges: {
    name: 'Lunges',
    landmarks: ['leftHip', 'leftKnee', 'leftAnkle'],
    minAngle: 80,
    maxAngle: 165,
    side: 'left',
    countOn: 'up',
    type: 'reps',
    description: 'Step forward, lower back knee toward ground, return to standing',
    cameraPosition: 'Place phone on the side at hip height',
    muscleGroup: 'legs',
  },

  calfRaises: {
    name: 'Calf Raises',
    landmarks: ['leftKnee', 'leftAnkle', 'leftFootIndex'],
    minAngle: 60,
    maxAngle: 110,
    side: 'both',
    countOn: 'down',
    type: 'reps',
    description: 'Stand straight, raise heels as high as possible, lower slowly',
    cameraPosition: 'Place phone on the side at ankle height',
    muscleGroup: 'legs',
  },

  pullups: {
    name: 'Pull-ups',
    // Camera in spate: umar -> cot -> incheietura
    // agatat (brate drepte) = unghi mare, tras sus (coate indoite) = unghi mic
    landmarks: ['leftShoulder', 'leftElbow', 'leftWrist'],
    minAngle: 50,
    maxAngle: 160,
    side: 'both',
    countOn: 'down',
    type: 'reps',
    description: 'Hang from bar, pull body up until chin clears bar, lower slowly',
    cameraPosition: '⚠️ Place phone BEHIND you at shoulder height',
    muscleGroup: 'back',
  },

  pikePushups: {
    name: 'Pike Push-ups',
    landmarks: ['leftShoulder', 'leftElbow', 'leftWrist'],
    minAngle: 80,
    maxAngle: 160,
    side: 'both',
    countOn: 'up',
    type: 'reps',
    description: 'Form an inverted V, bend elbows to lower head toward ground',
    cameraPosition: 'Place phone on the side at shoulder height',
    muscleGroup: 'shoulders',
  },

  dips: {
    name: 'Dips',
    // Camera lateral: umar -> cot -> incheietura
    // sus (brate drepte) = unghi mare, jos (coate indoite) = unghi mic
    landmarks: ['leftShoulder', 'leftElbow', 'leftWrist'],
    minAngle: 80,
    maxAngle: 160,
    side: 'both',
    countOn: 'up',
    type: 'reps',
    description: 'Lower body by bending elbows to 90 degrees, push back up',
    cameraPosition: '⚠️ Place phone on the SIDE at shoulder height',
    muscleGroup: 'arms',
  },

  legRaises: {
    name: 'Leg Raises',
    landmarks: ['leftHip', 'leftKnee', 'leftAnkle'],
    minAngle: 70,
    maxAngle: 165,
    side: 'both',
    countOn: 'down',
    type: 'reps',
    description: 'Lie flat, keep legs straight and raise to 90 degrees, lower slowly',
    cameraPosition: 'Place phone on the side at hip height',
    muscleGroup: 'core',
  },

  plank: {
    name: 'Plank',
    // Umar -> sold -> genunchi: corpul drept = unghi aproape de 180
    // daca unghiul scade sub 150 = forma proasta
    landmarks: ['leftShoulder', 'leftHip', 'leftKnee'],
    minAngle: 150,
    maxAngle: 180,
    side: 'both',
    countOn: 'up',
    type: 'timed', // TIMED - numara secunde nu reps
    description: 'Hold body in straight line, core tight, breathe steadily',
    cameraPosition: 'Place phone on the side at hip height',
    muscleGroup: 'core',
  },

  // === UPPER BODY ===
  diamondPushups: {
    name: 'Diamond Push-ups',
    landmarks: ['leftShoulder', 'leftElbow', 'leftWrist'],
    minAngle: 100,
    maxAngle: 170,
    side: 'both',
    countOn: 'up',
    type: 'reps',
    description: 'Hands form diamond shape, lower chest to hands, push up',
    cameraPosition: 'Place phone on the side at shoulder height',
    muscleGroup: 'chest',
  },

  widePushups: {
    name: 'Wide Push-ups',
    landmarks: ['leftShoulder', 'leftElbow', 'leftWrist'],
    minAngle: 100,
    maxAngle: 170,
    side: 'both',
    countOn: 'up',
    type: 'reps',
    description: 'Hands wider than shoulders, lower chest to ground, push up',
    cameraPosition: 'Place phone on the side at shoulder height',
    muscleGroup: 'chest',
  },

  // === LOWER BODY ===
  wallSit: {
    name: 'Wall Sit',
    // Sold -> genunchi -> glezna: la 90 grade = unghi ~90
    landmarks: ['leftHip', 'leftKnee', 'leftAnkle'],
    minAngle: 70,
    maxAngle: 100,
    side: 'both',
    countOn: 'up',
    type: 'timed',
    description: 'Back against wall, slide down until thighs parallel to ground',
    cameraPosition: 'Place phone on the side at hip height',
    muscleGroup: 'legs',
  },

  stepUps: {
    name: 'Step-ups',
    landmarks: ['leftHip', 'leftKnee', 'leftAnkle'],
    minAngle: 140,
    maxAngle: 175,
    side: 'left',
    countOn: 'up',
    type: 'reps',
    description: 'Step up onto elevated surface, fully extend leg, step down',
    cameraPosition: 'Place phone on the side at hip height',
    muscleGroup: 'legs',
  },

  gluteBridge: {
    name: 'Glute Bridge',
    // Sold -> genunchi -> glezna: soldurile se ridica = unghi la genunchi se schimba
    landmarks: ['leftShoulder', 'leftHip', 'leftKnee'],
    minAngle: 60,
    maxAngle: 160,
    side: 'both',
    countOn: 'up',
    type: 'reps',
    description: 'Lie on back, knees bent, lift hips to form straight line',
    cameraPosition: 'Place phone on the side at hip height',
    muscleGroup: 'legs',
  },

  // === CORE ===
  mountainClimbers: {
    name: 'Mountain Climbers',
    // In pozitia de plank: soldurile se misca sus-jos
    // Umar -> sold -> genunchi
    landmarks: ['leftShoulder', 'leftHip', 'leftKnee'],
    minAngle: 120,
    maxAngle: 170,
    side: 'both',
    countOn: 'up',
    type: 'reps',
    description: 'Start in plank, drive knees toward chest alternately',
    cameraPosition: 'Place phone on the side at hip height',
    muscleGroup: 'core',
  },

  sidePlank: {
    name: 'Side Plank',
    // Umar -> sold -> genunchi: corpul lateral drept
    landmarks: ['leftShoulder', 'leftHip', 'leftKnee'],
    minAngle: 150,
    maxAngle: 180,
    side: 'both',
    countOn: 'up',
    type: 'timed',
    description: 'Lie on side, prop on elbow, lift hips to form straight line',
    cameraPosition: 'Place phone on the side at hip height',
    muscleGroup: 'core',
  },

  deadBug: {
    name: 'Dead Bug',
    // Umar -> sold -> genunchi: brate sus, genunchi la 90
    landmarks: ['leftShoulder', 'leftHip', 'leftKnee'],
    minAngle: 70,
    maxAngle: 110,
    side: 'both',
    countOn: 'down',
    type: 'reps',
    description: 'Lie on back, arms up, knees at 90 degrees, lower opposite limbs',
    cameraPosition: 'Place phone on the side at hip height',
    muscleGroup: 'core',
  },

  // === FULL BODY ===
  burpees: {
    name: 'Burpees',
    // From standing to plank: detect using shoulder position changes
    landmarks: ['leftShoulder', 'leftHip', 'leftKnee'],
    minAngle: 60,
    maxAngle: 180,
    side: 'both',
    countOn: 'up',
    type: 'reps',
    description: 'Squat down, jump to plank, push-up, jump back, jump up',
    cameraPosition: 'Place phone on the side at hip height',
    muscleGroup: 'fullbody',
  },

  jumpingJacks: {
    name: 'Jumping Jacks',
    // Arms: shoulder-elbow-wrist spread, legs: hip-knee-ankle
    // Track arm angle - wide = 170, hands together = ~30
    landmarks: ['leftShoulder', 'leftElbow', 'leftWrist'],
    minAngle: 30,
    maxAngle: 170,
    side: 'both',
    countOn: 'up',
    type: 'reps',
    description: 'Jump feet apart while raising arms overhead, jump back',
    cameraPosition: 'Place phone in front at shoulder height',
    muscleGroup: 'cardio',
  },

  highKnees: {
    name: 'High Knees',
    // Run in place, bring knees up high
    landmarks: ['leftHip', 'leftKnee', 'leftAnkle'],
    minAngle: 40,
    maxAngle: 120,
    side: 'both',
    countOn: 'up',
    type: 'reps',
    description: 'Run in place, bring knees up to hip height',
    cameraPosition: 'Place phone on the side at hip height',
    muscleGroup: 'cardio',
  },

  // === STRETCHING / TIMED ===
  wallPushup: {
    name: 'Wall Push-ups',
    landmarks: ['leftShoulder', 'leftElbow', 'leftWrist'],
    minAngle: 90,
    maxAngle: 170,
    side: 'both',
    countOn: 'up',
    type: 'reps',
    description: 'Push hands against wall, lean in and push back',
    cameraPosition: 'Place phone on the side at shoulder height',
    muscleGroup: 'chest',
  },

  calfStretch: {
    name: 'Calf Stretch',
    // Genunchi -> glezna -> deget:PICIOR DREPT in fata
    landmarks: ['leftKnee', 'leftAnkle', 'leftFootIndex'],
    minAngle: 100,
    maxAngle: 170,
    side: 'left',
    countOn: 'up',
    type: 'timed',
    description: 'Step one foot back, keep heel on ground, lean forward',
    cameraPosition: 'Place phone on the side at ankle height',
    muscleGroup: 'stretch',
  },
};

export const calculateAngle = (p1: Point, p2: Point, p3: Point): number => {
  const radians = Math.atan2(p3.y - p2.y, p3.x - p2.x) -
    Math.atan2(p1.y - p2.y, p1.x - p2.x);
  let angle = Math.abs(radians * 180 / Math.PI);
  if (angle > 180) angle = 360 - angle;
  return angle;
};