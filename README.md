# REPS - AI-Powered Fitness & Nutrition Tracker 🏋️‍♂️🥗

![React Native](https://img.shields.io/badge/react_native-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![Firebase](https://img.shields.io/badge/firebase-%23039BE5.svg?style=for-the-badge&logo=firebase)
![Gemini](https://img.shields.io/badge/Google%20Gemini-8E75B2?style=for-the-badge&logo=google%20gemini&logoColor=white)
![MediaPipe](https://img.shields.io/badge/MediaPipe-00A98F?style=for-the-badge&logo=google&logoColor=white)

> **Winner / Participant at ITFest 2026 (Sport Tech and Nutrition Track)** 🏆

## 📖 About The Project
**REPS** solves the problem of fragmented health tracking. Instead of using one app for calorie counting and another for workouts, REPS unifies them using Artificial Intelligence. It features an AI-powered motion tracker to validate workout forms and an intelligent AI Assistant that logs food, calculates macros, and generates personalized recipes based on user goals, age, and medical conditions.

## ✨ Key Features
* **🤖 AI Motion Tracking:** Uses device camera to track body joints in real-time. It automatically counts reps and provides instant feedback on posture (e.g., warning the user to keep their back straight during planks).
* **🍏 Smart Nutrition Assistant (Powered by Gemini):** Log your meals using natural language (e.g., "I ate 200g of chicken and 120g of rice"). The AI automatically extracts calories, proteins, carbs, and fats, adding them to your daily target.
* **👨‍🍳 Personalized Recipe Generator:** Ask the AI for a meal plan to fill your remaining daily macros, taking into account specific medical conditions (e.g., hypertension).
* **📊 Analytics Dashboard:** Track your daily streaks, weight evolution (with graphs), BMI, and macro targets.
* **🔐 User Authentication:** Secure login and user data storage.

## 📱 Screenshots & Demo

| Dashboard & Tracking | AI Nutritionist | Form Validation (Squats) | Form Correction (Planks) |
|:---:|:---:|:---:|:---:|
| <img src="./screenshots/dashboard.jpg" width="200"> | <img src="./screenshots/chat.jpg" width="200"> | <img src="./screenshots/squats.jpg" width="200"> | <img src="./screenshots/plank.jpg" width="200"> |

## 🛠️ Tech Stack
* **Frontend:** React Native
* **Motion Tracking / Computer Vision:** MediaPipe Pose
* **AI & NLP:** Google Gemini API
* **Backend & Database:** Firebase (Authentication, Firestore)

## 🚀 How to Run Locally

To get a local copy up and running, follow these simple steps:

### Prerequisites
* **Node.js** installed on your machine.
* **Android Studio & Android SDK** configured on your machine.
* A physical Android device or an Android Emulator. 
*(Note: The standard Expo Go app is not supported due to the use of custom native libraries).*

### Installation

1. **Clone the repository:**
   `git clone https://github.com/PetricaZPC/reps.git`

2. **Navigate to the project directory:**
   `cd reps`

3. **Install dependencies:**
   `npm install`

4. **Set up Environment Variables:**
   Create a `.env` file in the root directory of the project and add your API keys:
   ```env```
   # Gemini API Key
EXPO_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here

# Firebase Configuration
EXPO_PUBLIC_API_KEY=your_firebase_api_key
EXPO_PUBLIC_AUTH_DOMAIN=your_firebase_auth_domain
EXPO_PUBLIC_PROJECT_ID=your_firebase_project_id
EXPO_PUBLIC_STORAGE_BUCKET=your_firebase_storage_bucket
EXPO_PUBLIC_MESSAGING_SENDER_ID=your_messaging_sender_id
EXPO_PUBLIC_APP_ID=your_firebase_app_id
EXPO_PUBLIC_MEASUREMENT_ID=your_measurement_id

5. **Start the Expo server:**
`npx expo start`

6. **Run the application:**
Because this app uses native modules (such as MediaPipe for AI motion tracking) that are not supported by Expo Go, it must be compiled as a development build. Additionally, this project is currently configured for Android only.

Open a new terminal window in the project folder and run:
`npx expo run:android`

