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
    landmarks: ["leftShoulder", "leftElbow", "leftWrist"],
    minAngle: 100,  // Foarte relaxat (înainte era 85). O mică îndoire a cotului declanșează coborârea.
    maxAngle: 140,  // Nu e nevoie să întinzi brațul complet (înainte era 145)
    side: "both",
    countOn: "up",
    type: "reps",
    description: "Keep body straight, lower chest to ground then push up",
    cameraPosition: "Place phone on the side at shoulder height",
    muscleGroup: "chest",
    formRules: [
      {
        landmarks: ["leftShoulder", "leftHip", "leftKnee"],
        minAngle: 100, 
        maxAngle: 180,
        message: "Atenție la bazin, încearcă să stai drept!",
        affectedLandmarks: ["leftHip"],
      },
    ],
  },

  squats: {
    name: "Squats",
    landmarks: ["leftHip", "leftKnee", "leftAnkle"],
    minAngle: 115,  // Permite o half-squat (jumătate de genuflexiune)
    maxAngle: 145,  // Nu trebuie să stai perfect drept la ridicare
    side: "both",
    countOn: "up",
    type: "reps",
    description: "Feet shoulder-width apart, lower until thighs are parallel",
    cameraPosition: "Place phone on the side at hip height",
    muscleGroup: "legs",
    formRules: [
      {
        landmarks: ["leftShoulder", "leftHip", "leftKnee"],
        minAngle: 30, 
        maxAngle: 180,
        message: "Ține pieptul sus!",
        affectedLandmarks: ["leftShoulder", "leftHip"],
      },
    ],
  },

  situps: {
    name: "Sit-ups",
    landmarks: ["leftShoulder", "leftHip", "leftKnee"],
    minAngle: 95,   // Nu mai trebuie să te ridici cu pieptul lipit de genunchi
    maxAngle: 130,  // Nu mai trebuie să te întinzi complet pe podea la revenire
    side: "both",
    countOn: "down",
    type: "reps",
    description: "Lie on back, raise torso toward knees, lower back down",
    cameraPosition: "Place phone on the side at ground level",
    muscleGroup: "core",
    formRules: [
      {
        landmarks: ["leftHip", "leftKnee", "leftAnkle"],
        minAngle: 30,
        maxAngle: 150, 
        message: "Ține genunchii îndoiți!",
        affectedLandmarks: ["leftKnee"],
      }
    ],
  },

  lunges: {
    name: "Lunges",
    landmarks: ["leftHip", "leftKnee", "leftAnkle"],
    minAngle: 105,  // O fandare mult mai scurtă va fi înregistrată
    maxAngle: 145,
    side: "left",
    countOn: "up",
    type: "reps",
    description: "Step forward, lower back knee toward ground, return to standing",
    cameraPosition: "Place phone on the side at hip height",
    muscleGroup: "legs",
    formRules: [
      {
        landmarks: ["leftShoulder", "leftHip", "leftKnee"],
        minAngle: 100, 
        maxAngle: 180,
        message: "Menține trunchiul mai drept!",
        affectedLandmarks: ["leftShoulder", "leftHip"],
      },
    ],
  },

  calfRaises: {
    name: "Calf Raises",
    landmarks: ["leftKnee", "leftAnkle", "leftFootIndex"],
    minAngle: 95,
    maxAngle: 115,  // O ridicare mică pe vârfuri e suficientă
    side: "both",
    countOn: "up",
    type: "reps",
    description: "Stand straight, raise heels as high as possible, lower slowly",
    cameraPosition: "Place phone on the side at ankle height",
    muscleGroup: "legs",
    formRules: [
      {
        landmarks: ["leftHip", "leftKnee", "leftAnkle"],
        minAngle: 130, 
        maxAngle: 180,
        message: "Încearcă să nu îndoi prea mult genunchii.",
        affectedLandmarks: ["leftKnee"],
      },
    ],
  },

  pullups: {
    name: "Pull-ups",
    landmarks: ["leftShoulder", "leftElbow", "leftWrist"],
    minAngle: 90,   // Bărbia nu mai trebuie să treacă de bară, o tragere la jumătate e ok
    maxAngle: 140,  // Nu te mai lăsa cu brațele perfect întinse
    side: "both",
    countOn: "down",
    type: "reps",
    description: "Hang from bar, pull body up until chin clears bar, lower slowly",
    cameraPosition: "⚠️ Place phone BEHIND you at shoulder height",
    muscleGroup: "back",
    formRules: [
      {
        landmarks: ["leftShoulder", "leftHip", "leftKnee"],
        minAngle: 120, 
        maxAngle: 180,
        message: "Evită balansul prea mare!",
        affectedLandmarks: ["leftHip", "leftKnee"],
      },
    ],
  },

  plank: {
    name: "Plank",
    landmarks: ["leftShoulder", "leftElbow", "leftWrist"],
    minAngle: 100,  // Foarte relaxat pentru coate/umeri
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
        minAngle: 110, 
        maxAngle: 180,
        message: "Atenție la bazin, menține spatele drept!",
        affectedLandmarks: ["leftHip"],
      },
    ],
  },

  gluteBridge: {
    name: "Glute Bridge",
    landmarks: ["leftShoulder", "leftHip", "leftKnee"],
    minAngle: 125,  // Jos nu mai trebuie să atingi cu fundul podeaua pentru a reseta repetarea
    maxAngle: 145,  // Sus nu mai trebuie să formezi o linie perfect dreaptă
    side: "both",
    countOn: "up",
    type: "reps",
    description: "Lie on back, knees bent, lift hips to form straight line",
    cameraPosition: "Place phone on the side at hip height",
    muscleGroup: "legs",
    formRules: [
      {
        landmarks: ["leftShoulder", "leftHip", "leftKnee"],
        minAngle: 70,
        maxAngle: 180, 
        message: "Împinge bazinul mai sus!",
        affectedLandmarks: ["leftHip"],
      },
    ],
  },

  mountainClimbers: {
    name: "Mountain Climbers",
    landmarks: ["leftShoulder", "leftHip", "leftKnee"],
    minAngle: 100,  // Genunchiul tras mult mai puțin spre piept
    maxAngle: 140,  // Piciorul întins mult mai lejer în spate
    side: "both",
    countOn: "up",
    type: "reps",
    description: "Start in plank, drive knees toward chest alternately",
    cameraPosition: "Place phone on the side at hip height",
    muscleGroup: "core",
    formRules: [
      {
        landmarks: ["leftShoulder", "leftHip", "leftKnee"],
        minAngle: 100, 
        maxAngle: 180,
        message: "Menține bazinul la același nivel!",
        affectedLandmarks: ["leftHip"],
      },
    ],
  },

  jumpingJacks: {
    name: "Jumping Jacks",
    landmarks: ["leftHip", "leftShoulder", "leftWrist"],
    minAngle: 45,   // Brațele nu mai trebuie să lovească coapsele
    maxAngle: 120,  // Brațele nu mai trebuie să se ridice perfect deasupra capului
    side: "both",
    countOn: "up",
    type: "reps",
    description: "Jump feet apart while raising arms overhead, jump back",
    cameraPosition: "Place phone in front at shoulder height",
    muscleGroup: "cardio",
    formRules: [
      {
        landmarks: ["nose", "leftShoulder", "leftHip"],
        minAngle: 120,
        maxAngle: 180,
        message: "Ține spatele drept!",
        affectedLandmarks: ["leftShoulder"],
      }
    ],
  },

  highKnees: {
    name: "High Knees",
    landmarks: ["leftShoulder", "leftHip", "leftKnee"],
    minAngle: 105,  // Genunchii nu trebuie aduși atât de sus
    maxAngle: 140,
    side: "both",
    countOn: "up",
    type: "reps",
    description: "Run in place, bring knees up to hip height",
    cameraPosition: "Place phone on the side at hip height",
    muscleGroup: "cardio",
    formRules: [
      {
        landmarks: ["leftShoulder", "leftHip", "leftAnkle"],
        minAngle: 110, 
        maxAngle: 180,
        message: "Nu te apleca prea mult spre genunchi.",
        affectedLandmarks: ["leftHip"],
      }
    ],
  },

  wallSit: {
    name: "Wall Sit",
    landmarks: ["leftHip", "leftKnee", "leftAnkle"],
    minAngle: 60,   // Permite mai multă lejeritate în poziția unghiului
    maxAngle: 130,
    side: "both",
    countOn: "up",
    type: "timed",
    description: "Back against wall, slide down until thighs parallel to ground",
    cameraPosition: "Place phone on the side at hip height",
    muscleGroup: "legs",
    formRules: [
      {
        landmarks: ["leftShoulder", "leftHip", "leftKnee"],
        minAngle: 45,
        maxAngle: 140, 
        message: "Ține spatele lipit de perete!",
        affectedLandmarks: ["leftShoulder", "leftHip"],
      },
    ],
  },

  diamondPushups: {
    name: "Diamond Push-ups",
    landmarks: ["leftShoulder", "leftElbow", "leftWrist"],
    minAngle: 95,
    maxAngle: 140,
    side: "both",
    countOn: "up",
    type: "reps",
    description: "Hands close under chest, elbows narrow, press up.",
    cameraPosition: "Place phone on the side at shoulder height",
    muscleGroup: "chest",
    formRules: [
      {
        landmarks: ["leftShoulder", "leftHip", "leftKnee"],
        minAngle: 100,
        maxAngle: 180,
        message: "Încearcă să menții corpul drept!",
        affectedLandmarks: ["leftHip"],
      },
    ],
  },

  widePushups: {
    name: "Wide Push-ups",
    landmarks: ["leftShoulder", "leftElbow", "leftWrist"],
    minAngle: 95,
    maxAngle: 140,
    side: "both",
    countOn: "up",
    type: "reps",
    description: "Hands wider than shoulders, lower chest and push up.",
    cameraPosition: "Place phone on the side at shoulder height",
    muscleGroup: "chest",
    formRules: [
      {
        landmarks: ["leftShoulder", "leftHip", "leftKnee"],
        minAngle: 100,
        maxAngle: 180,
        message: "Încearcă să menții corpul drept!",
        affectedLandmarks: ["leftHip"],
      },
    ],
  },

  pikePushups: {
    name: "Pike Push-ups",
    landmarks: ["leftShoulder", "leftElbow", "leftWrist"],
    minAngle: 90,
    maxAngle: 135,
    side: "both",
    countOn: "up",
    type: "reps",
    description: "Hips high in pike, bend elbows to bring head down then press.",
    cameraPosition: "Phone on the side at head height",
    muscleGroup: "shoulders",
    formRules: [
      {
        landmarks: ["leftShoulder", "leftHip", "leftKnee"],
        minAngle: 40,
        maxAngle: 140, 
        message: "Ridică bazinul mai mult!",
        affectedLandmarks: ["leftHip"],
      }
    ],
  },

  dips: {
    name: "Dips (Chair)",
    landmarks: ["leftShoulder", "leftElbow", "leftWrist"],
    minAngle: 100,  // Coborâre scurtă
    maxAngle: 140,  // Întindere relaxată
    side: "both",
    countOn: "up",
    type: "reps",
    description: "Hands on chair/bench behind you, lower elbows to ~90°, push up.",
    cameraPosition: "Phone on the side at shoulder height",
    muscleGroup: "arms",
    formRules: [
      {
        landmarks: ["leftShoulder", "leftHip", "leftKnee"],
        minAngle: 100, 
        maxAngle: 180,
        message: "Păstrează corpul aproape de scaun!",
        affectedLandmarks: ["leftShoulder"],
      },
    ],
  },

  stepUps: {
    name: "Step-ups",
    landmarks: ["leftHip", "leftKnee", "leftAnkle"],
    minAngle: 100,
    maxAngle: 145,
    side: "left",
    countOn: "up",
    type: "reps",
    description: "Step onto a box with one leg, drive through heel to stand tall.",
    cameraPosition: "Phone on the side at knee height",
    muscleGroup: "legs",
    formRules: [
      {
        landmarks: ["leftShoulder", "leftHip", "leftKnee"],
        minAngle: 110,
        maxAngle: 180,
        message: "Trunchiul mai drept la ridicare!",
        affectedLandmarks: ["leftHip"],
      }
    ],
  },

  deadBug: {
    name: "Dead Bug",
    landmarks: ["leftShoulder", "leftHip", "leftKnee"],
    minAngle: 90,
    maxAngle: 140,
    side: "both",
    countOn: "down",
    type: "reps",
    description: "On back, alternate extending opposite arm/leg while keeping core tight.",
    cameraPosition: "Phone above at hip height angled down",
    muscleGroup: "core",
    formRules: [
      {
        landmarks: ["leftShoulder", "leftHip", "leftKnee"],
        minAngle: 110, 
        maxAngle: 180,
        message: "Lipește zona lombară de podea!",
        affectedLandmarks: ["leftHip"],
      },
    ],
  },

  legRaises: {
    name: "Leg Raises",
    landmarks: ["leftHip", "leftKnee", "leftAnkle"],
    minAngle: 90,   // Picioarele nu mai trebuie aduse perfect verticale (sus)
    maxAngle: 135,  // Picioarele nu mai trebuie lăsate până aproape de podea (jos)
    side: "both",
    countOn: "down",
    type: "reps",
    description: "Lie on back, raise legs to 90°, lower with control.",
    cameraPosition: "Phone on the side at hip height",
    muscleGroup: "core",
    formRules: [
      {
        landmarks: ["leftHip", "leftKnee", "leftAnkle"],
        minAngle: 130, 
        maxAngle: 180,
        message: "Încearcă să ții picioarele mai drepte!",
        affectedLandmarks: ["leftKnee"],
      },
    ],
  },

  sidePlank: {
    name: "Side Plank",
    landmarks: ["leftShoulder", "leftHip", "leftAnkle"],
    minAngle: 110,
    maxAngle: 180,
    side: "left",
    countOn: "up",
    type: "timed",
    description: "Support on one forearm, body in straight line, hold.",
    cameraPosition: "Phone on the side at shoulder height",
    muscleGroup: "core",
    formRules: [
      {
        landmarks: ["leftShoulder", "leftHip", "leftAnkle"],
        minAngle: 110, 
        maxAngle: 180,
        message: "Nu lăsa bazinul să cadă!",
        affectedLandmarks: ["leftHip"],
      },
    ],
  },

  wallPushup: {
    name: "Wall Push-up",
    landmarks: ["leftShoulder", "leftElbow", "leftWrist"],
    minAngle: 100,
    maxAngle: 145,
    side: "both",
    countOn: "up",
    type: "reps",
    description: "Hands on wall, lean forward, bend elbows, push back.",
    cameraPosition: "Phone on the side at shoulder height",
    muscleGroup: "chest",
    formRules: [
      {
        landmarks: ["leftShoulder", "leftHip", "leftKnee"],
        minAngle: 110,
        maxAngle: 180,
        message: "Menține corpul drept!",
        affectedLandmarks: ["leftHip"],
      }
    ],
  },

  burpees: {
    name: "Burpees",
    landmarks: ["leftShoulder", "leftHip", "leftKnee"],
    minAngle: 95,   // Jos (în squat) e super relaxat
    maxAngle: 145,  // Săritura la final nu trebuie să fie prea înaltă
    side: "both",
    countOn: "up",
    type: "reps",
    description: "Squat down, kick back to plank, return and jump.",
    cameraPosition: "Phone in front at waist height",
    muscleGroup: "fullbody",
    formRules: [
      {
        landmarks: ["leftShoulder", "leftHip", "leftKnee"],
        minAngle: 110,
        maxAngle: 180,
        message: "Sari mai sus!",
        affectedLandmarks: ["leftHip"]
      }
    ],
  },
};

export const calculateAngle = (p1: Point, p2: Point, p3: Point): number => {
  const radians =
    Math.atan2(p3.y - p2.y, p3.x - p2.x) -
    Math.atan2(p1.y - p2.y, p1.x - p2.x);
  
  let angle = Math.abs((radians * 180) / Math.PI);
  
  if (angle > 180) angle = 360 - angle;
  
  return angle;
};