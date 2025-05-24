from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
import librosa
import pickle
import io
import logging
from pydub import AudioSegment

app = FastAPI(title="Audio Emotion AI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
MODEL_PATH = "laphingV4.pkl"
EMOTIONS = ['Happy', 'Sad', 'Angry', 'Neutral', 'Surprised', 'Fear', 'Disgust']

try:
    with open(MODEL_PATH, 'rb') as f:
        model_data = pickle.load(f)
    model = model_data['model']
    scaler = model_data['scaler']
except Exception as e:
    logging.error(f"Error loading model: {str(e)}")
    model = None
    scaler = None

def extract_audio_features(audio_file: UploadFile):
    try:
        content = audio_file.file.read()
        input_format = audio_file.filename.split('.')[-1].lower() if audio_file.filename else 'raw'

        # Convert to WAV using pydub
        audio = AudioSegment.from_file(io.BytesIO(content), format=input_format)
        audio = audio.set_frame_rate(22050).set_channels(1)  # Standardize to 22050 Hz, mono

        # Export to WAV in memory
        wav_io = io.BytesIO()
        audio.export(wav_io, format="wav")
        wav_io.seek(0)

        # Load WAV data with librosa
        y, sr = librosa.load(wav_io, duration=30, sr=22050)

        # Extract features
        features = {}
        features['mfcc'] = np.mean(librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13), axis=1)
        features['spectral_centroid'] = np.mean(librosa.feature.spectral_centroid(y=y, sr=sr))
        features['spectral_rolloff'] = np.mean(librosa.feature.spectral_rolloff(y=y, sr=sr))
        features['zero_crossing_rate'] = np.mean(librosa.feature.zero_crossing_rate(y))
        features['chroma'] = np.mean(librosa.feature.chroma_stft(y=y, sr=sr), axis=1)
        tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
        features['tempo'] = tempo
        features['rms_energy'] = np.mean(librosa.feature.rms(y=y))
        
        # Create feature vector
        feature_vector = []
        for key, value in features.items():
            if isinstance(value, np.ndarray):
                feature_vector.extend(value.flatten())
            else:
                feature_vector.append(value)
        return np.array(feature_vector), features
    except Exception as e:
        logging.error(f"Error processing audio: {str(e)}")
        return None, None

@app.post("/analyze/audio")
async def analyze_audio(audio: UploadFile = File(...)):
    # Log received content type for debugging
    logging.info(f"Received content type: {audio.content_type}")
    
    # No MIME type restriction; attempt to process any file
    if model is None or scaler is None:
        raise HTTPException(status_code=503, detail="Model not loaded.")
    
    # Extract features from the converted WAV
    feature_vector, audio_features = extract_audio_features(audio)
    if feature_vector is None:
        raise HTTPException(status_code=500, detail="Failed to process file. Ensure it is a valid audio file.")
    
    try:
        # Scale features and predict
        scaled_features = scaler.transform(feature_vector.reshape(1, -1))
        probabilities = model.predict_proba(scaled_features)[0]
        predicted_emotion = EMOTIONS[np.argmax(probabilities)]
        confidence = float(np.max(probabilities))
        result = {
            "emotion": predicted_emotion,
            "confidence": confidence,
            "probabilities": {emotion: float(prob) for emotion, prob in zip(EMOTIONS, probabilities)},
            "features": {
                "spectral_centroid": float(audio_features['spectral_centroid']),
                "spectral_rolloff": float(audio_features['spectral_rolloff']),
                "zero_crossing_rate": float(audio_features['zero_crossing_rate']),
                "tempo": float(audio_features['tempo']),
                "rms_energy": float(audio_features['rms_energy'])
            }
        }
        return JSONResponse(content=result)
    except Exception as e:
        logging.error(f"Error during prediction: {str(e)}")
        raise HTTPException(status_code=500, detail="Error analyzing audio.")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
