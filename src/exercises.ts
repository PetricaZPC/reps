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

export interface ExerciseConfig {
  name: string;
  landmarks: (keyof typeof landmarkIndexMap)[];
  minAngle: number;
  maxAngle: number;
  side: 'left' | 'right' | 'both';
  countOn: 'up' | 'down';
  type: 'reps' | 'timed'; // reps = numara repetitii, timed = numara secunde
  description: string;
  cameraPosition: string; // instructiune pentru user
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
  },
};

export const calculateAngle = (p1: Point, p2: Point, p3: Point): number => {
  const radians = Math.atan2(p3.y - p2.y, p3.x - p2.x) -
    Math.atan2(p1.y - p2.y, p1.x - p2.x);
  let angle = Math.abs(radians * 180 / Math.PI);
  if (angle > 180) angle = 360 - angle;
  return angle;
};