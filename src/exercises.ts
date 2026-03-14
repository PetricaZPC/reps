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
  side: 'left' | 'right' | 'both';
  countOn: 'up' | 'down';
  type: 'reps' | 'timed';
  description: string;
  cameraPosition: string;
  muscleGroup: MuscleGroup;
  formRules: FormRule[];
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
    formRules: [
      {
        // Corpul trebuie sa fie drept - umar, sold, glezna aliniate
        landmarks: ['leftShoulder', 'leftHip', 'leftAnkle'],
        minAngle: 160,
        message: 'Keep your body straight! Hips too high or too low.',
        affectedLandmarks: ['leftHip'],
      },
      {
        // Capul nu trebuie sa fie prea jos - nas, umar, sold
        landmarks: ['nose', 'leftShoulder', 'leftHip'],
        minAngle: 150,
        message: 'Keep your head neutral, don\'t drop it!',
        affectedLandmarks: ['nose'],
      },
    ],
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
    formRules: [
      {
        // Spatele drept - umar, sold, genunchi
        landmarks: ['leftShoulder', 'leftHip', 'leftKnee'],
        minAngle: 150,
        message: 'Keep your back straight! Don\'t lean forward too much.',
        affectedLandmarks: ['leftShoulder', 'leftHip'],
      },
      {
        // Genunchiul nu trece de varf - genunchi, glezna, foot index
        landmarks: ['leftKnee', 'leftAnkle', 'leftFootIndex'],
        minAngle: 70,
        message: 'Don\'t let your knees go past your toes!',
        affectedLandmarks: ['leftKnee'],
      },
    ],
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
    formRules: [
      {
        // Nu trage de gat - nas, umar, sold
        landmarks: ['nose', 'leftShoulder', 'leftHip'],
        maxAngle: 60,
        message: 'Don\'t pull your neck! Keep chin tucked.',
        affectedLandmarks: ['nose', 'leftShoulder'],
      },
      {
        // Genunchii trebuie sa fie indoiti la ~90 grade
        landmarks: ['leftHip', 'leftKnee', 'leftAnkle'],
        minAngle: 70,
        maxAngle: 110,
        message: 'Keep knees bent at 90 degrees!',
        affectedLandmarks: ['leftKnee'],
      },
    ],
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
    formRules: [
      {
        // Trunchi drept - umar, sold, genunchi
        landmarks: ['leftShoulder', 'leftHip', 'leftKnee'],
        minAngle: 160,
        message: 'Keep your torso upright! Don\'t lean forward.',
        affectedLandmarks: ['leftShoulder', 'leftHip'],
      },
      {
        // Genunchiul din fata nu trece de varf
        landmarks: ['leftKnee', 'leftAnkle', 'leftFootIndex'],
        minAngle: 70,
        message: 'Front knee should not go past your toes!',
        affectedLandmarks: ['leftKnee'],
      },
    ],
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
    formRules: [
      {
        // Picioarele trebuie sa fie drepte - sold, genunchi, glezna
        landmarks: ['leftHip', 'leftKnee', 'leftAnkle'],
        minAngle: 170,
        message: 'Keep your legs straight! Don\'t bend your knees.',
        affectedLandmarks: ['leftKnee'],
      },
    ],
  },

  pullups: {
    name: 'Pull-ups',
    landmarks: ['leftShoulder', 'leftElbow', 'leftWrist'],
    minAngle: 50,
    maxAngle: 160,
    side: 'both',
    countOn: 'down',
    type: 'reps',
    description: 'Hang from bar, pull body up until chin clears bar, lower slowly',
    cameraPosition: '⚠️ Place phone BEHIND you at shoulder height',
    muscleGroup: 'back',
    formRules: [
      {
        // Corpul drept - umar, sold, genunchi - nu te legana
        landmarks: ['leftShoulder', 'leftHip', 'leftKnee'],
        minAngle: 160,
        message: 'Stop swinging! Keep your body straight.',
        affectedLandmarks: ['leftHip'],
      },
      {
        // Coatele nu trebuie sa fie prea departe de corp
        landmarks: ['leftShoulder', 'leftElbow', 'leftWrist'],
        maxAngle: 90,
        message: 'Pull your elbows down and back, not outward!',
        affectedLandmarks: ['leftElbow'],
      },
    ],
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
    formRules: [
      {
        // Forma de V inversat - umar, sold, genunchi
        // Soldul trebuie sa fie sus, unghi mic la sold
        landmarks: ['leftShoulder', 'leftHip', 'leftKnee'],
        maxAngle: 110,
        message: 'Keep your hips high! Form a proper inverted V.',
        affectedLandmarks: ['leftHip'],
      },
      {
        // Capul in jos, umar, cot, incheietura
        landmarks: ['leftShoulder', 'leftElbow', 'leftWrist'],
        minAngle: 80,
        message: 'Lower your head toward the ground between your hands!',
        affectedLandmarks: ['leftElbow'],
      },
    ],
  },

  dips: {
    name: 'Dips',
    landmarks: ['leftShoulder', 'leftElbow', 'leftWrist'],
    minAngle: 80,
    maxAngle: 160,
    side: 'both',
    countOn: 'up',
    type: 'reps',
    description: 'Lower body by bending elbows to 90 degrees, push back up',
    cameraPosition: '⚠️ Place phone on the SIDE at shoulder height',
    muscleGroup: 'arms',
    formRules: [
      {
        // Trunchi usor inclinat inainte - umar, sold, genunchi
        landmarks: ['leftShoulder', 'leftHip', 'leftKnee'],
        minAngle: 140,
        maxAngle: 175,
        message: 'Keep torso slightly forward, don\'t go too vertical!',
        affectedLandmarks: ['leftShoulder', 'leftHip'],
      },
      {
        // Coatele paralele, nu prea departe
        landmarks: ['leftShoulder', 'leftElbow', 'leftWrist'],
        minAngle: 80,
        message: 'Don\'t go too low! Stop at 90 degrees elbow bend.',
        affectedLandmarks: ['leftElbow'],
      },
    ],
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
    formRules: [
      {
        // Picioarele drepte - sold, genunchi, glezna
        landmarks: ['leftHip', 'leftKnee', 'leftAnkle'],
        minAngle: 160,
        message: 'Keep your legs straight! Don\'t bend your knees.',
        affectedLandmarks: ['leftKnee'],
      },
      {
        // Spatele lipit de sol - umar, sold, genunchi
        landmarks: ['leftShoulder', 'leftHip', 'leftKnee'],
        minAngle: 170,
        message: 'Keep your lower back flat on the ground!',
        affectedLandmarks: ['leftHip'],
      },
    ],
  },

  plank: {
    name: 'Plank',
    landmarks: ['leftShoulder', 'leftHip', 'leftKnee'],
    minAngle: 150,
    maxAngle: 180,
    side: 'both',
    countOn: 'up',
    type: 'timed',
    description: 'Hold body in straight line, core tight, breathe steadily',
    cameraPosition: 'Place phone on the side at hip height',
    muscleGroup: 'core',
    formRules: [
      {
        // Soldurile nu trebuie sa fie prea sus
        landmarks: ['leftShoulder', 'leftHip', 'leftAnkle'],
        minAngle: 160,
        maxAngle: 185,
        message: 'Lower your hips! They\'re too high.',
        affectedLandmarks: ['leftHip'],
      },
      {
        // Soldurile nu trebuie sa cada jos
        landmarks: ['leftShoulder', 'leftHip', 'leftKnee'],
        minAngle: 155,
        message: 'Raise your hips! Don\'t let them sag.',
        affectedLandmarks: ['leftHip'],
      },
      {
        // Capul neutru - nas, umar, sold
        landmarks: ['nose', 'leftShoulder', 'leftHip'],
        minAngle: 160,
        message: 'Keep your head neutral! Don\'t drop or raise it.',
        affectedLandmarks: ['nose'],
      },
    ],
  },

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
    formRules: [
      {
        landmarks: ['leftShoulder', 'leftHip', 'leftAnkle'],
        minAngle: 160,
        message: 'Keep your body straight!',
        affectedLandmarks: ['leftHip'],
      },
      {
        landmarks: ['nose', 'leftShoulder', 'leftHip'],
        minAngle: 150,
        message: 'Keep your head neutral!',
        affectedLandmarks: ['nose'],
      },
    ],
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
    formRules: [
      {
        landmarks: ['leftShoulder', 'leftHip', 'leftAnkle'],
        minAngle: 160,
        message: 'Keep your body straight!',
        affectedLandmarks: ['leftHip'],
      },
      {
        landmarks: ['nose', 'leftShoulder', 'leftHip'],
        minAngle: 150,
        message: 'Keep your head neutral!',
        affectedLandmarks: ['nose'],
      },
    ],
  },

  wallSit: {
    name: 'Wall Sit',
    landmarks: ['leftHip', 'leftKnee', 'leftAnkle'],
    minAngle: 70,
    maxAngle: 100,
    side: 'both',
    countOn: 'up',
    type: 'timed',
    description: 'Back against wall, slide down until thighs parallel to ground',
    cameraPosition: 'Place phone on the side at hip height',
    muscleGroup: 'legs',
    formRules: [
      {
        // Genunchii la 90 grade
        landmarks: ['leftHip', 'leftKnee', 'leftAnkle'],
        minAngle: 80,
        maxAngle: 100,
        message: 'Get lower! Thighs should be parallel to ground.',
        affectedLandmarks: ['leftKnee'],
      },
      {
        // Spatele drept de perete - umar, sold, genunchi
        landmarks: ['leftShoulder', 'leftHip', 'leftKnee'],
        minAngle: 85,
        maxAngle: 95,
        message: 'Keep your back flat against the wall!',
        affectedLandmarks: ['leftShoulder', 'leftHip'],
      },
    ],
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
    formRules: [
      {
        // Trunchi drept
        landmarks: ['leftShoulder', 'leftHip', 'leftKnee'],
        minAngle: 160,
        message: 'Keep your torso upright!',
        affectedLandmarks: ['leftShoulder', 'leftHip'],
      },
    ],
  },

  gluteBridge: {
    name: 'Glute Bridge',
    landmarks: ['leftShoulder', 'leftHip', 'leftKnee'],
    minAngle: 60,
    maxAngle: 160,
    side: 'both',
    countOn: 'up',
    type: 'reps',
    description: 'Lie on back, knees bent, lift hips to form straight line',
    cameraPosition: 'Place phone on the side at hip height',
    muscleGroup: 'legs',
    formRules: [
      {
        // Genunchii la 90 grade
        landmarks: ['leftHip', 'leftKnee', 'leftAnkle'],
        minAngle: 80,
        maxAngle: 100,
        message: 'Keep knees bent at 90 degrees!',
        affectedLandmarks: ['leftKnee'],
      },
      {
        // Sus: umar, sold, genunchi drepte
        landmarks: ['leftShoulder', 'leftHip', 'leftKnee'],
        minAngle: 160,
        message: 'Lift your hips higher! Form a straight line.',
        affectedLandmarks: ['leftHip'],
      },
    ],
  },

  mountainClimbers: {
    name: 'Mountain Climbers',
    landmarks: ['leftShoulder', 'leftHip', 'leftKnee'],
    minAngle: 120,
    maxAngle: 170,
    side: 'both',
    countOn: 'up',
    type: 'reps',
    description: 'Start in plank, drive knees toward chest alternately',
    cameraPosition: 'Place phone on the side at hip height',
    muscleGroup: 'core',
    formRules: [
      {
        // Soldurile nu trebuie sa fie prea sus
        landmarks: ['leftShoulder', 'leftHip', 'leftAnkle'],
        minAngle: 155,
        message: 'Keep hips level! Don\'t raise them too high.',
        affectedLandmarks: ['leftHip'],
      },
      {
        // Bratele drepte
        landmarks: ['leftShoulder', 'leftElbow', 'leftWrist'],
        minAngle: 160,
        message: 'Keep your arms straight!',
        affectedLandmarks: ['leftElbow'],
      },
    ],
  },

  sidePlank: {
    name: 'Side Plank',
    landmarks: ['leftShoulder', 'leftHip', 'leftKnee'],
    minAngle: 150,
    maxAngle: 180,
    side: 'both',
    countOn: 'up',
    type: 'timed',
    description: 'Lie on side, prop on elbow, lift hips to form straight line',
    cameraPosition: 'Place phone on the side at hip height',
    muscleGroup: 'core',
    formRules: [
      {
        // Corpul drept lateral
        landmarks: ['leftShoulder', 'leftHip', 'leftAnkle'],
        minAngle: 160,
        message: 'Keep your body in a straight line!',
        affectedLandmarks: ['leftHip'],
      },
      {
        // Soldurile nu cad jos
        landmarks: ['leftShoulder', 'leftHip', 'leftKnee'],
        minAngle: 155,
        message: 'Lift your hips! Don\'t let them sag.',
        affectedLandmarks: ['leftHip'],
      },
    ],
  },

  deadBug: {
    name: 'Dead Bug',
    landmarks: ['leftShoulder', 'leftHip', 'leftKnee'],
    minAngle: 70,
    maxAngle: 110,
    side: 'both',
    countOn: 'down',
    type: 'reps',
    description: 'Lie on back, arms up, knees at 90 degrees, lower opposite limbs',
    cameraPosition: 'Place phone on the side at hip height',
    muscleGroup: 'core',
    formRules: [
      {
        // Spatele lipit de sol
        landmarks: ['leftShoulder', 'leftHip', 'leftKnee'],
        minAngle: 170,
        message: 'Press your lower back into the floor!',
        affectedLandmarks: ['leftHip'],
      },
    ],
  },

  burpees: {
    name: 'Burpees',
    landmarks: ['leftShoulder', 'leftHip', 'leftKnee'],
    minAngle: 60,
    maxAngle: 180,
    side: 'both',
    countOn: 'up',
    type: 'reps',
    description: 'Squat down, jump to plank, push-up, jump back, jump up',
    cameraPosition: 'Place phone on the side at hip height',
    muscleGroup: 'fullbody',
    formRules: [
      {
        // In pozitia de plank corpul drept
        landmarks: ['leftShoulder', 'leftHip', 'leftAnkle'],
        minAngle: 160,
        message: 'Keep body straight in plank position!',
        affectedLandmarks: ['leftHip'],
      },
    ],
  },

  jumpingJacks: {
    name: 'Jumping Jacks',
    landmarks: ['leftShoulder', 'leftElbow', 'leftWrist'],
    minAngle: 30,
    maxAngle: 170,
    side: 'both',
    countOn: 'up',
    type: 'reps',
    description: 'Jump feet apart while raising arms overhead, jump back',
    cameraPosition: 'Place phone in front at shoulder height',
    muscleGroup: 'cardio',
    formRules: [
      {
        // Bratele complet sus
        landmarks: ['leftShoulder', 'leftElbow', 'leftWrist'],
        minAngle: 160,
        message: 'Raise your arms fully overhead!',
        affectedLandmarks: ['leftElbow', 'leftWrist'],
      },
    ],
  },

  highKnees: {
    name: 'High Knees',
    landmarks: ['leftHip', 'leftKnee', 'leftAnkle'],
    minAngle: 40,
    maxAngle: 120,
    side: 'both',
    countOn: 'up',
    type: 'reps',
    description: 'Run in place, bring knees up to hip height',
    cameraPosition: 'Place phone on the side at hip height',
    muscleGroup: 'cardio',
    formRules: [
      {
        // Trunchi drept
        landmarks: ['leftShoulder', 'leftHip', 'leftKnee'],
        minAngle: 160,
        message: 'Keep your torso upright! Don\'t lean back.',
        affectedLandmarks: ['leftShoulder', 'leftHip'],
      },
    ],
  },

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
    formRules: [
      {
        // Corpul drept
        landmarks: ['leftShoulder', 'leftHip', 'leftAnkle'],
        minAngle: 160,
        message: 'Keep your body straight!',
        affectedLandmarks: ['leftHip'],
      },
    ],
  },

  calfStretch: {
    name: 'Calf Stretch',
    landmarks: ['leftKnee', 'leftAnkle', 'leftFootIndex'],
    minAngle: 100,
    maxAngle: 170,
    side: 'left',
    countOn: 'up',
    type: 'timed',
    description: 'Step one foot back, keep heel on ground, lean forward',
    cameraPosition: 'Place phone on the side at ankle height',
    muscleGroup: 'stretch',
    formRules: [
      {
        // Piciorul din spate drept
        landmarks: ['leftHip', 'leftKnee', 'leftAnkle'],
        minAngle: 170,
        message: 'Keep your back leg straight!',
        affectedLandmarks: ['leftKnee'],
      },
    ],
  },
};

export const calculateAngle = (p1: Point, p2: Point, p3: Point): number => {
  const radians = Math.atan2(p3.y - p2.y, p3.x - p2.x) -
    Math.atan2(p1.y - p2.y, p1.x - p2.x);
  let angle = Math.abs(radians * 180 / Math.PI);
  if (angle > 180) angle = 360 - angle;
  return angle;
};