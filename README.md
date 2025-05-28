
# Security Guardian

Security Guardian is a React Native mobile application with a FastAPI backend, designed to enhance user safety through audio emotion analysis and SMS phishing detection. Built with Expo SDK 53, it supports Android and iOS, leveraging audio processing, machine learning, and external APIs for real-time threat detection. The project includes a Streamlit app for training and managing audio emotion detection models. The Security Guardian includes a built-in secure browser with real-time URL analysis and phishing protection.

## Features

### Audio Emotion Analysis:
- Record audio clips or upload files (.m4a, .mp3, .wav) using the mobile app
- Analyze voice patterns for emotions (Happy, Sad, Angry, Neutral, Surprised, Fear, Disgust) via a FastAPI backend using our own made and trained RandomForestClassifier (laphingV4.pkl)
- Display results in a FlatList with emotion, confidence, duration, and date

### SMS Phishing Detection:
- Monitor incoming SMS messages for phishing or malicious content (Android only)
- Manually scan pasted messages using rule-based checks, Gemini API, and Google Safe Browsing API for URL safety
- Flag malicious messages in the UI with details (e.g., "Phishing, Suspicious URL")

### Built-in Browser Security Features
#### URL Security Analysis
- Real-time scanning of URLs using:
  - Google Safe Browsing API
  - Rule-based pattern matching
  - Domain whitelist verification
- Threat classification:
  - Safe (green indicator)
  - Suspicious (yellow indicator)
  - Dangerous (red indicator)
  - Unknown (gray indicator)

#### Navigation Protection
- Blocks known malicious sites automatically
- Warns about suspicious sites before loading
- Whitelist for trusted domains (e.g., google.com, amazon.com)

#### Security Details Panel
- Detailed threat analysis reports
- Confidence scores for detections
- Specific threat types identified
- Explanation of security findings

### Model Training (Streamlit):
- Train custom audio emotion detection models using the Streamlit app (ai/1.py)
- Upload audio files, label emotions, and train a RandomForestClassifier
- Save and load models as .pkl files (e.g., laphingV4.pkl) for use in the FastAPI backend

### User Interface:
- Keyboard-aware inputs for manual message scanning
- Permission management for microphone, storage, and SMS access
- Visualizations for emotion probabilities and audio features in the Streamlit app

## Repository Structure

```
security-guardian/
├── ai/                      # Backend and model training
│   ├── 1.py                 # Streamlit app for model training
│   ├── api.py               # FastAPI backend for audio analysis
│   ├── laphingV4.pkl        # Pre-trained emotion detection model
├── app/                     # React Native mobile app
│   ├── assets/              # Images and icons
│   ├── src/
|   |   ├── (tabs)           # Tabs (pages) for each functionality 
│   │   ├── components/      # Reusable UI components (AudioRecordItem, EmotionResultModal, MessageItem)
│   │   ├── hooks/           # Custom hooks (usePermissions, useSMSMonitor, etc.)
│   │   ├── utils/           # API functions (api.ts)
│   ├── app.json             # Expo configuration
│   ├── package.json         # Dependencies and scripts
├── .env                     # Environment variables (create manually)
├── .gitignore               # Git ignore rules
└── README.md                # Project documentation
```

## Prerequisites

- Node.js: v18 or higher
- Python: 3.8 or higher
- Expo CLI: `npm install -g expo-cli`
- Android Studio or Xcode: For emulators or physical device testing
- API Keys:
  - Google Gemini API (`EXPO_PUBLIC_GEMINI_API_KEY`)
  - Google Safe Browsing API (`EXPO_PUBLIC_SAFE_BROWSING_API_KEY`)

## Installation

### Mobile App

1. Clone the Repository:
```bash
git clone https://github.com/sudhirKsah/security-guardian.git
cd security-guardian/app
```

2. Install Dependencies:
```bash
npm install
```

Key dependencies (from package.json):
```json
{
  "dependencies": {
    "expo": "~53.0.0",
    "expo-audio": "~0.4.5",
    "expo-document-picker": "~13.0.4",
    "expo-file-system": "~18.1.10",
    "expo-permissions": "~15.0.4",
    "react": "18.3.1",
    "react-native": "0.79.2",
    "lucide-react-native": "^0.446.0",
    "@expo/vector-icons": "^14.0.6",
    "expo-router": "^3.0.0",
    "expo-font": "^12.0.0"
  }
}
```

3. Configure Environment Variables:
Create a `.env` file in the `app/` directory:
```
EXPO_PUBLIC_API_URL=http://192.168.12.92:8000
EXPO_PUBLIC_GEMINI_API_KEY=your_gemini_api_key
EXPO_PUBLIC_SAFE_BROWSING_API_KEY=your_safe_browsing_api_key
```
Replace `your_gemini_api_key` and `your_safe_browsing_api_key` with your actual API keys.

4. Apply Expo Configuration:
Ensure `app.json` includes permissions and plugins:
```bash
npx expo prebuild --clean
```

5. Start the Development Server:
```bash
npx expo start
```
- Scan the QR code with the Expo Go app (iOS/Android)
- Run on an emulator:
  ```bash
  npx expo run:android
  # or
  npx expo run:ios
  ```

### FastAPI Backend

1. Navigate to Backend Directory:
```bash
cd security-guardian/ai
```

2. Create a Virtual Environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install Dependencies:
```bash
pip install fastapi uvicorn librosa numpy scikit-learn pydub pickle5
```
Note: `pickle5` is required for compatibility with `laphingV4.pkl`.

4. Verify Model File:
Ensure `laphingV4.pkl` is in the `ai/` directory. This file contains the pre-trained RandomForestClassifier and scaler.

5. Run the Backend:
```bash
uvicorn api:app --host 0.0.0.0 --port 8000
```
- The API will be available at `http://192.168.12.92:8000` (update IP if different)
- Test the endpoint:
  ```bash
  curl -X POST -F "audio=@/path/to/recording.wav" http://192.168.12.92:8000/analyze/audio
  ```

### Streamlit Model Training

1. Navigate to Backend Directory:
```bash
cd security-guardian/ai
```

2. Ensure Virtual Environment is Active:
```bash
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install Additional Dependencies:
```bash
pip install streamlit pandas matplotlib seaborn plotly sklearn librosa
```

4. Run the Streamlit App:
```bash
streamlit run 1.py
```
Access the app at `http://localhost:8501`.

## Usage

### Mobile App

#### Audio Emotion Analysis:
- **Record Audio**:
  1. Go to the "Voice Analysis" screen
  2. Grant microphone permission
  3. Tap the red circle to record, then the orange square to stop
  4. The .m4a file is sent to `http://192.168.12.92:8000/analyze/audio` for analysis
  5. Results (e.g., "Happy, 00:05, 2025-05-24") appear in the FlatList

- **Upload Audio**:
  1. Tap "Upload Audio" and grant storage permission (Android)
  2. Select a .m4a, .mp3, or .wav file (max 10MB)
  3. Results appear in the FlatList

#### SMS Phishing Detection:
- **Automatic Monitoring (Android)**:
  1. Grant READ_SMS and RECEIVE_SMS permissions
  2. Incoming SMS messages are scanned using rule-based checks, Gemini API, and Safe Browsing API
  3. Malicious messages appear in the FlatList (e.g., "Phishing, Suspicious URL")

- **Manual Scanning**:
  1. Enter sender and message content in the "Message Scanner" screen
  2. Tap "Scan Message" to analyze. Results appear in the FlatList

#### Secure Browsing:
- **Automatic Detection of Malicious URLs**:
  1. Enter any URL in the browser address bar (e.g., `example.com`)
  2. The app automatically checks for:
     - Phishing attempts
     - Malware distribution sites
     - Social engineering scams
     - Suspicious URL patterns
  3. Dangerous sites are blocked with a warning alert
  4. Suspicious sites show an orange warning with details

- **Safe Search Navigation**:
  1. Visit a search engine like `google.com`
  2. Enter any search query in the Google search bar
  3. Click on any search result link
  4. Each clicked URL is intercepted and analyzed before loading
  5. Malicious results are blocked with protection details

- **Real-time Protection Features**:
  - All page navigations are scanned
  - Embedded links are checked before loading
  - Redirect chains are fully analyzed
  - Whitelisted domains (like google.com) bypass deep scanning for performance

- **Security Details**:
  - Tap the security indicator to view:
    - Threat type classification
    - Detection confidence level
    - Specific malicious patterns found
    - Protection recommendations

### Streamlit App

#### Train a Model:
1. Navigate to "Train Model" in the Streamlit app (`http://localhost:8501`)
2. Upload audio files (.wav, .mp3, .m4a, .flac) and label emotions
3. Use single-file or batch upload modes
4. Click "Start Training" (requires at least 2 samples)
5. Save the trained model as a .pkl file in the "Model Manager" section

#### Predict Emotions:
1. Go to "Predict Emotion"
2. Upload an audio file and click "Predict Emotion"
3. View the predicted emotion, confidence, and probability distribution

#### Manage Models:
1. In "Model Manager", upload a .pkl file (e.g., laphingV4.pkl) or save the current model
2. Clear or reset models as needed

#### View Analytics:
1. Check "Analytics" for model accuracy, training data distribution, and feature importance

## Troubleshooting

**File Upload Fails (Document picker result: {"canceled": true})**:
- Ensure storage permissions (READ_EXTERNAL_STORAGE, READ_MEDIA_AUDIO) are granted in Android settings
- Use audio/* MIME type in DocumentPicker
- Test with files in internal storage (e.g., Downloads)
- Check logs for File info and retry logic errors

**Audio Recording Fails**:
- Verify expo-audio is installed (~0.4.5)
- Ensure microphone permission is granted
- Check logs for `Recording completed: <uri>` and backend response

**Backend Request Fails**:
- Ensure the device is on the same network as `http://192.168.12.92:8000`
- Test with:
  ```bash
  curl -X POST -F "audio=@/path/to/recording.m4a" http://192.168.12.92:8000/analyze/audio
  ```
- Check FastAPI logs for `Error processing audio` or `Error during prediction`

**Streamlit App Fails**:
- Ensure all dependencies are installed (streamlit, librosa, sklearn, etc.)
- Check for `Error processing audio file` in the Streamlit UI
- Verify audio files are valid and not corrupted

**Keyboard Covers Input**:
- Ensure KeyboardAvoidingView is configured in messages.tsx with behavior="height" (Android) or padding (iOS)
- Adjust keyboardVerticalOffset if needed (e.g., 40 for Android)

**SMS Monitoring Not Working**:
- Verify READ_SMS and RECEIVE_SMS permissions in Android settings
- Test with a sample SMS and check lastDetection logs

## Contributing

1. Fork the repository: https://github.com/sudhirKsah/security-guardian
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit changes: `git commit -m 'Add your feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request


## Acknowledgments

- Expo for the React Native framework
- FastAPI for the backend API
- Streamlit for the model training interface
- Google Gemini API for text analysis
- Google Safe Browsing API for URL safety checks
- Librosa for audio feature extraction
- Scikit-learn for machine learning
- Lucide Icons for UI icons