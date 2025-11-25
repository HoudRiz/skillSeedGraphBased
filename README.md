# SkillSeed Graph (React Native)

This project visualizes learning paths as a radial skill graph, now built with React Native and Expo so it can be viewed directly in Expo Go.

## Prerequisites
- Node.js 18+
- Yarn 4 (included via the repo)
- Expo Go on your device or an emulator/simulator

## Getting started
1. Install dependencies with Yarn:
   ```sh
   yarn install
   ```
2. Start the Expo development server:
   ```sh
   yarn start
   ```
3. Open the QR code in Expo Go (or press the onscreen shortcuts for Android/iOS/web) to launch the app.

## Features
- Radial SVG graph that groups skills by tag and difficulty.
- Persistent storage via AsyncStorage so your nodes and tags survive restarts.
- Modal editor to add or update skills, with difficulty selection and comma-delimited tags.
- Tag legend with quick filtering and reset controls.
