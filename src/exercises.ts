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

export const landmarkIndexMap = {
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
  landmarks: (keyof Landmarks)[];
  minAngle: number;
  maxAngle: number;
  side: 'left' | 'right' | 'both';
}

export const EXERCISES: Record<string, ExerciseConfig> = {
  pushups: {
    name: 'Pushups',
    landmarks: ['leftShoulder', 'leftElbow', 'leftWrist'],
    minAngle: 30,
    maxAngle: 160,
    side: 'both',
  },
  squat: {
    name: 'Squat',
    landmarks: ['leftHip', 'leftKnee', 'leftAnkle'],
    minAngle: 70,
    maxAngle: 170,
    side: 'both',
  },
};

// Worklet pentru calculul unghiului între 3 puncte
export const calculateAngle = (p1: Point, p2: Point, p3: Point): number => {
  'worklet';
  
  const radians = Math.atan2(p3.y - p2.y, p3.x - p2.x) - 
                  Math.atan2(p1.y - p2.y, p1.x - p2.x);
  let angle = Math.abs(radians * 180 / Math.PI);
  
  if (angle > 180) {
    angle = 360 - angle;
  }
  
  return angle;
};
