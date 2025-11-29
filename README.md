# SkillSeed Mobile

A beautiful, interactive skill-tracking mobile application that visualizes your learning journey as a dynamic network graph. Built with React Native and Expo, SkillSeed helps you organize, track, and visualize your skills and learning goals in an engaging and intuitive way.

## 📱 Project Description

SkillSeed Mobile is a graph-based skill management system that allows users to create, organize, and track skills across multiple knowledge domains. Each skill is represented as a node in an interactive force-directed graph, with connections showing relationships between related skills. The app features a modern dark-themed UI with smooth animations, tag-based organization, and multi-vault support for separating different areas of learning.

## 🚀 Installation & Run Instructions

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Expo CLI (will be installed automatically)
- iOS Simulator (for Mac) or Android Emulator, or Expo Go app on your physical device

### Installation Steps

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd skillSeedGraphBased/SkillSeedMobile
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm start
   ```

4. **Run on your preferred platform**
   - **iOS**: Press `i` in the terminal or run `npm run ios`
   - **Android**: Press `a` in the terminal or run `npm run android`
   - **Web**: Press `w` in the terminal or run `npm run web`
   - **Physical Device**: Scan the QR code with Expo Go app

## ✨ Features

### Core Features

- **Interactive Graph Visualization**: Skills are displayed as an animated force-directed graph with smooth physics-based interactions
- **Multi-Vault System**: Organize skills into separate vaults (e.g., "Programming", "Languages", "Hobbies")
- **Tag-Based Organization**: Categorize skills with custom tags and color-coded visual grouping
- **Difficulty Levels**: Assign difficulty ratings (Beginner, Intermediate, Advanced, Expert, Master) with XP values
- **Skill Linking**: Create relationships between skills using wiki-style `[[links]]` in descriptions
- **Rich Markdown Support**: Write detailed skill descriptions with full markdown formatting
- **Visual Filtering**: Toggle visibility of tag groups and unassigned skills via an interactive legend
- **Zoom & Focus**: Click on tags to zoom into specific skill categories

### Data Management

- **Persistent Storage**: All data is saved locally using AsyncStorage
- **Import/Export**: Export vaults as JSON files and import them on other devices
- **Vault Management**: Create, rename, delete, and switch between multiple vaults
- **Tag Editor**: Create and manage tags with custom colors
- **Bulk Operations**: Reset entire vaults or delete specific tags with confirmation dialogs

### User Experience

- **Animated Sidebar**: Smooth slide-in/slide-out animations for the navigation menu
- **Node Modal**: Full-featured editing interface with difficulty dropdown and tag management
- **Touch Interactions**: Drag nodes, pan the graph, and tap to interact
- **Responsive Design**: Adapts to different screen sizes and orientations
- **Dark Theme**: Modern, eye-friendly dark color scheme with vibrant accents

## 📸 Screenshots

### Home Screen
![Home Screen](D:\repos\skillSeedGraphBased\SkillSeedMobile\Screenshots\HomePage.png)

### Graph Navigation
![Graph Navigation](D:\repos\skillSeedGraphBased\SkillSeedMobile\Screenshots\graphNavigationOne.jpg)
![Graph Navigation](D:\repos\skillSeedGraphBased\SkillSeedMobile\Screenshots\graphNavigationTwo.jpg)      

### Node Detail View
![node detail view](D:\repos\skillSeedGraphBased\SkillSeedMobile\Screenshots\nodeDetailView.jpg)   

### Sidebar & Settings
![Sidebar](D:\repos\skillSeedGraphBased\SkillSeedMobile\Screenshots\sideBar.jpg)      
![settings](D:\repos\skillSeedGraphBased\SkillSeedMobile\Screenshots\settings.jpg)      

### Tag Management
![tag managment](D:\repos\skillSeedGraphBased\SkillSeedMobile\Screenshots\tagManagment.jpg)    

### Vault Switcher
![vault switcher](SkillSeedMobile/Screenshots/vaultManagement.jpg)      

## 🛠️ Technologies Used

### Core Framework
- **React Native** (0.81.5) - Cross-platform mobile development
- **React** (19.1.0) - UI component library
- **Expo** (~54.0.25) - Development platform and tooling
- **TypeScript** (~5.9.2) - Type-safe JavaScript

### Visualization & Graphics
- **D3.js** (^7.9.0) - Force-directed graph simulation and calculations
- **react-native-svg** (^15.15.0) - SVG rendering for graph visualization

### UI & Styling
- **twrnc** (^4.11.1) - Tailwind CSS for React Native
- **react-native-markdown-display** (^7.0.2) - Markdown rendering in skill descriptions

### Storage & File Management
- **@react-native-async-storage/async-storage** (^2.2.0) - Local data persistence
- **expo-file-system** (~19.0.19) - File operations for import/export
- **expo-document-picker** (~14.0.7) - File selection for imports
- **expo-sharing** (~14.0.7) - Share exported vault files

### Development Tools
- **@types/d3** (^7.4.3) - TypeScript definitions for D3
- **@types/react** (~19.1.0) - TypeScript definitions for React

## 🐛 Known Issues

- **Graph Performance**: With 100+ nodes, the force simulation may slow down on older devices

## 🔮 Future Improvements

- **Search Functionality**: Global search across all skills and descriptions
- **Progress Tracking**: Mark skills as "In Progress", "Completed", or "Mastered"
- **Statistics Dashboard**: Visualize learning progress with charts and metrics
- **Custom Themes**: Light mode and customizable color schemes
- **Cloud Sync**: Optional cloud backup and multi-device synchronization
- **Skill Templates**: Pre-built skill trees for common learning paths (e.g., "Web Development")
- **Graph Layouts**: Alternative visualization modes (hierarchical, radial, timeline)

## 📄 License

This project is private and not currently licensed for public use.

## 🤝 Contributing

This is a personal project. Contributions are not currently being accepted.

---

**Built with ❤️ using React Native and Expo**
