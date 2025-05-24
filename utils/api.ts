// const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

// interface EmotionAnalysisResult {
//   emotion: string;
//   confidence: number;
//   details?: string;
// }

// interface PhishingAnalysisResult {
//   isMalicious: boolean;
//   confidence: number;
//   type?: string;
//   details?: string;
// }

// export async function analyzeAudio(audioUri: string): Promise<EmotionAnalysisResult> {
//   try {
//     const formData = new FormData();
//     formData.append('audio', {
//       uri: audioUri,
//       type: 'audio/m4a',
//       name: 'recording.m4a',
//     });

//     const response = await fetch(`${API_BASE_URL}/analyze/audio`, {
//       method: 'POST',
//       body: formData,
//       headers: {
//         'Accept': 'application/json',
//       },
//     });

//     if (!response.ok) {
//       throw new Error('Failed to analyze audio');
//     }

//     return await response.json();
//   } catch (error) {
//     console.error('Error analyzing audio:', error);
//     throw error;
//   }
// }

// export async function analyzeSMS(message: string): Promise<PhishingAnalysisResult> {
//   try {
//     const response = await fetch(`${API_BASE_URL}/analyze/sms`, {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//       },
//       body: JSON.stringify({ message }),
//     });

//     if (!response.ok) {
//       throw new Error('Failed to analyze SMS');
//     }

//     return await response.json();
//   } catch (error) {
//     console.error('Error analyzing SMS:', error);
//     throw error;
//   }
// }

// export async function analyzeURL(url: string): Promise<PhishingAnalysisResult> {
//   try {
//     const response = await fetch(`${API_BASE_URL}/analyze/url`, {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//       },
//       body: JSON.stringify({ url }),
//     });

//     if (!response.ok) {
//       throw new Error('Failed to analyze URL');
//     }

//     return await response.json();
//   } catch (error) {
//     console.error('Error analyzing URL:', error);
//     throw error;
//   }
// }






import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.12.92:8000';
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
const SAFE_BROWSING_API_KEY = process.env.EXPO_PUBLIC_SAFE_BROWSING_API_KEY;
const SAFE_BROWSING_API_URL = 'https://safebrowsing.googleapis.com/v4/threatMatches:find';

interface EmotionAnalysisResult {
    emotion: string;
    confidence: number;
    details?: string;
}

interface PhishingAnalysisResult {
    isMalicious: boolean;
    confidence: number;
    type?: string;
    details?: string;
}

// Whitelist of known safe domains
const SAFE_DOMAINS = [
    'google.com',
    'youtube.com',
    'facebook.com',
    'amazon.com',
    'wikipedia.org',
    'twitter.com',
    'linkedin.com',
    'microsoft.com',
    'apple.com',
];

// Validate URL format
const isValidURL = (url: string): boolean => {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
};

// Extract domain from URL
const getDomainFromURL = (url: string): string | null => {
    try {
        const urlObject = new URL(url);
        return urlObject.hostname.toLowerCase();
    } catch {
        return null;
    }
};

// Rule-based URL checking for common phishing patterns
const checkURLForPhishingPatterns = (url: string): PhishingAnalysisResult => {
    const suspiciousPatterns = [
        /login|signin|verify|account|secure|update|password/i,
        /[^\w\s-]\.[^\w\s-]/, // Suspicious characters in domain
        /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/, // IP address instead of domain
        /http:\/\/[^https]/, // Non-HTTPS URLs
    ];

    const suspiciousTLDs = ['.xyz', '.top', '.club', '.online', '.site'];

    let isMalicious = false;
    let type = '';
    let details = '';
    let confidence = 0;

    suspiciousPatterns.forEach((pattern, index) => {
        if (pattern.test(url)) {
            isMalicious = true;
            type = 'phishing';
            details += `Suspicious pattern detected: ${pattern.toString()}. `;
            confidence += 0.2;
        }
    });

    suspiciousTLDs.forEach((tld) => {
        if (url.toLowerCase().includes(tld)) {
            isMalicious = true;
            type = 'phishing';
            details += `Suspicious TLD detected: ${tld}. `;
            confidence += 0.15;
        }
    });

    if (url.length > 100) {
        isMalicious = true;
        type = 'phishing';
        details += 'URL is unusually long. ';
        confidence += 0.1;
    }

    return {
        isMalicious,
        confidence: Math.min(confidence, 0.95),
        type: isMalicious ? type : undefined,
        details: isMalicious ? details : undefined,
    };
};

// Rule-based text checking for SMS/Clipboard content
const checkTextForPhishingPatterns = (text: string): PhishingAnalysisResult => {
    const suspiciousPhrases = [
        /urgent|immediate|action required|verify now|login now|update your/i,
        /win|prize|lottery|free|gift card|reward/i,
        /your account has been|your payment|invoice|billing/i,
        /click here|follow this link|open this/i,
    ];

    let isMalicious = false;
    let type = '';
    let details = '';
    let confidence = 0;

    suspiciousPhrases.forEach((phrase) => {
        if (phrase.test(text)) {
            isMalicious = true;
            type = 'phishing';
            details += `Suspicious phrase detected: ${phrase.toString()}. `;
            confidence += 0.25;
        }
    });

    const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|([a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)/g;
    const urls = text.match(urlRegex) || [];
    urls.forEach((url) => {
        const urlAnalysis = checkURLForPhishingPatterns(url);
        if (urlAnalysis.isMalicious) {
            isMalicious = true;
            type = urlAnalysis.type || 'phishing';
            details += `Malicious URL detected: ${url}. `;
            confidence += 0.3;
        }
    });

    return {
        isMalicious,
        confidence: Math.min(confidence, 0.95),
        type: isMalicious ? type : undefined,
        details: isMalicious ? details : undefined,
    };
};

// Gemini API analysis for text (SMS/Clipboard)
const analyzeTextWithGemini = async (text: string): Promise<PhishingAnalysisResult> => {
    try {
        const prompt = `
      Analyze the following text for potential phishing, scam, or malicious intent. Look for suspicious phrases, urgency, or links that might trick users into revealing personal information or clicking malicious URLs. Provide a detailed analysis.

      Text: "${text}"

      Respond in JSON format with the following structure:
      {
        "isMalicious": boolean,
        "confidence": number (0 to 1),
        "type": string (optional, e.g., "phishing", "scam"),
        "details": string (optional, explanation of findings)
      }

      Return only raw JSON. Do not include any markdown formatting like triple backticks.
    `;

        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
            }),
        });

        if (!response.ok) {
            throw new Error('Failed to analyze text with Gemini API');
        }

        const data = await response.json();
        const generatedText = data.candidates[0].content.parts[0].text;
        console.log('Generated Text:', generatedText);

        let cleanedText = generatedText.trim();

        if (cleanedText.startsWith('```json')) {
            const match = cleanedText.match(/```json\s*([\s\S]*?)\s*```/);
            if (!match) throw new Error('Failed to extract JSON block');
            cleanedText = match[1].trim();
        }

        const result = JSON.parse(cleanedText);

        return {
            isMalicious: result.isMalicious || false,
            confidence: result.confidence || 0,
            type: result.type,
            details: result.details,
        };
    } catch (error) {
        console.error('Error analyzing text with Gemini API:', error);
        return {
            isMalicious: false,
            confidence: 0,
            details: 'Failed to analyze with Gemini API',
        };
    }
};

// Google Safe Browsing API analysis for URL
const analyzeURLWithSafeBrowsing = async (url: string): Promise<PhishingAnalysisResult> => {
    try {
        if (!SAFE_BROWSING_API_KEY) {
            throw new Error('Safe Browsing API key is not configured');
        }

        const response = await fetch(`${SAFE_BROWSING_API_URL}?key=${SAFE_BROWSING_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                client: {
                    clientId: 'security-guardian-app',
                    clientVersion: '1.0.0',
                },
                threatInfo: {
                    threatTypes: ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE'],
                    platformTypes: ['ANY_PLATFORM'],
                    threatEntryTypes: ['URL'],
                    threatEntries: [{ url }],
                },
            }),
        });

        if (!response.ok) {
            throw new Error(`Safe Browsing API request failed: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.matches && data.matches.length > 0) {
            const match = data.matches[0];
            let threatType = match.threatType.toLowerCase();
            let confidence = 0.95; // High confidence for Safe Browsing matches
            let details = `URL flagged as ${threatType} by Google Safe Browsing.`;

            if (threatType === 'social_engineering') {
                threatType = 'phishing';
                details += ' This site may attempt to trick users into revealing personal or financial information.';
            } else if (threatType === 'malware') {
                details += ' This site may host malicious code that could harm your device.';
            } else if (threatType === 'unwanted_software') {
                details += ' This site may distribute software that alters your device without consent.';
            }

            return {
                isMalicious: true,
                confidence,
                type: threatType,
                details,
            };
        }

        return {
            isMalicious: false,
            confidence: 0.95,
            details: 'No threats detected by Google Safe Browsing.',
        };
    } catch (error) {
        console.error('Error analyzing URL with Safe Browsing API:', error);
        return {
            isMalicious: false,
            confidence: 0,
            details: 'Failed to analyze with Safe Browsing API',
        };
    }
};

// Combined analysis for SMS/Clipboard content (rules + Gemini)
export async function analyzeSMS(message: string): Promise<PhishingAnalysisResult> {
    try {
        const ruleBasedResult = checkTextForPhishingPatterns(message);
        const geminiResult = await analyzeTextWithGemini(message);

        // Combine results: take the more severe outcome
        const isMalicious = ruleBasedResult.isMalicious || geminiResult.isMalicious;
        const confidence = Math.max(ruleBasedResult.confidence, geminiResult.confidence);
        const type = geminiResult.type || ruleBasedResult.type;
        const details = `${ruleBasedResult.details || ''}${geminiResult.details || ''}`;

        return {
            isMalicious,
            confidence,
            type: isMalicious ? type : undefined,
            details: isMalicious ? details : undefined,
        };
    } catch (error) {
        console.error('Error analyzing SMS:', error);
        throw error;
    }
}

export async function analyzeURL(url: string): Promise<PhishingAnalysisResult> {
    try {
        // Validate URL
        if (!isValidURL(url)) {
            return {
                isMalicious: false,
                confidence: 0,
                details: 'Invalid URL format',
            };
        }

        // Check if domain is in whitelist
        const domain = getDomainFromURL(url);
        if (domain && SAFE_DOMAINS.some(safeDomain => domain === safeDomain || domain.endsWith(`.${safeDomain}`))) {
            return {
                isMalicious: false,
                confidence: 0.95,
                details: 'Domain is on the safe list',
            };
        }

        // Perform Safe Browsing API analysis
        const safeBrowsingResult = await analyzeURLWithSafeBrowsing(url);

        // Perform rule-based analysis as fallback
        const ruleBasedResult = checkURLForPhishingPatterns(url);

        // Combine results: prioritize Safe Browsing, use rule-based as fallback
        if (safeBrowsingResult.isMalicious) {
            return safeBrowsingResult;
        }

        return {
            isMalicious: ruleBasedResult.isMalicious,
            confidence: Math.max(safeBrowsingResult.confidence, ruleBasedResult.confidence),
            type: ruleBasedResult.type || safeBrowsingResult.type,
            details: safeBrowsingResult.details + (ruleBasedResult.details ? ` Rule-based: ${ruleBasedResult.details}` : ''),
        };
    } catch (error) {
        console.error('Error analyzing URL:', error);
        return {
            isMalicious: false,
            confidence: 0,
            details: 'Failed to analyze URL',
        };
    }
}

// export async function analyzeAudio(audioUri: string): Promise<EmotionAnalysisResult> {
//     let tempWavUri: string | null = null;
    
//     try {
//         // Validate input URI
//         const fileInfo = await FileSystem.getInfoAsync(audioUri);
//         if (!fileInfo.exists) {
//             throw new Error(`Audio file does not exist: ${audioUri}`);
//         }

//         console.log('Input file info:', fileInfo);

//         // Check if the file is already WAV
//         const isWav = audioUri.toLowerCase().endsWith('.wav');
//         let wavUri = audioUri;

//         if (!isWav) {
//             console.log('Converting audio to WAV:', audioUri);
//             wavUri = await convertToWav(audioUri);
//             tempWavUri = wavUri;
//         }

//         console.log('Using audio file:', wavUri);

//         // Create FormData for upload - React Native way
//         const formData = new FormData();
        
//         // Determine file extension and MIME type
//         let mimeType = 'audio/wav';
//         let filename = 'recording.wav';
        
//         if (!isWav) {
//             if (audioUri.toLowerCase().endsWith('.m4a')) {
//                 mimeType = 'audio/m4a';
//                 filename = 'recording.m4a';
//             } else if (audioUri.toLowerCase().endsWith('.mp3')) {
//                 mimeType = 'audio/mpeg';
//                 filename = 'recording.mp3';
//             }
//         }

//         // For React Native, we can append the file URI directly
//         formData.append('audio', {
//             uri: wavUri,
//             type: mimeType,
//             name: filename,
//         } as any);

//         console.log('Sending audio file to backend:', `${API_BASE_URL}/analyze/audio`);
        
//         const apiResponse = await fetch(`http://${API_BASE_URL}/analyze/audio`, {
//             method: 'POST',
//             body: formData,
//             headers: {
//                 'Accept': 'application/json',
//                 'Content-Type': 'multipart/form-data',
//             },
//         });

//         if (!apiResponse.ok) {
//             const errorText = await apiResponse.text();
//             console.error('API Response Error:', errorText);
//             throw new Error(`Failed to analyze audio: ${apiResponse.statusText} - ${errorText}`);
//         }

//         const result = await apiResponse.json();
//         console.log('Analysis result:', result);
//         return result;
        
//     } catch (error) {
//         console.error('Error analyzing audio:', error);
//         throw error;
//     } finally {
//         // Clean up temporary WAV file if it was created
//         if (tempWavUri) {
//             try {
//                 await FileSystem.deleteAsync(tempWavUri, { idempotent: true });
//                 console.log('Cleaned up temporary file');
//             } catch (err) {
//                 console.warn('Failed to delete temporary file:', err);
//             }
//         }
//     }
// }

export async function analyzeAudio(audioUri: string): Promise<EmotionAnalysisResult> {
    try {
        // Validate input URI
        const fileInfo = await FileSystem.getInfoAsync(audioUri);
        if (!fileInfo.exists) {
            throw new Error(`Audio file does not exist: ${audioUri}`);
        }

        console.log('Input file info:', fileInfo);

        // Determine MIME type and filename based on extension
        let mimeType = 'audio/mpeg'; // Default for unknown formats
        let filename = 'recording.mp3';
        
        if (audioUri.toLowerCase().endsWith('.m4a')) {
            mimeType = 'audio/mp4';
            filename = 'recording.m4a';
        } else if (audioUri.toLowerCase().endsWith('.wav')) {
            mimeType = 'audio/wav';
            filename = 'recording.wav';
        } else if (audioUri.toLowerCase().endsWith('.mp3')) {
            mimeType = 'audio/mpeg';
            filename = 'recording.mp3';
        }

        // Create FormData for upload
        const formData = new FormData();
        formData.append('audio', {
            uri: audioUri,
            type: mimeType,
            name: filename,
        } as any);

        console.log('Sending audio file to backend:', `${API_BASE_URL}/analyze/audio`, 'MIME type:', mimeType);
        const response = await fetch(`${API_BASE_URL}/analyze/audio`, {
            method: 'POST',
            body: formData,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'multipart/form-data',
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Response Error:', errorText);
            throw new Error(`Failed to analyze audio: ${response.statusText} - ${errorText}`);
        }

        const result = await response.json();
        console.log('Analysis result:', result);
        return result;
    } catch (error) {
        console.error('Error analyzing audio:', error);
        throw error;
    }
}

async function convertToWav(audioUri: string): Promise<string> {
    // Try simple copy first for common formats (backend might handle conversion)
    const tempUri = `${FileSystem.cacheDirectory}temp_${Date.now()}.wav`;
    
    try {
        console.log('Attempting simple copy conversion');
        await FileSystem.copyAsync({
            from: audioUri,
            to: tempUri
        });
        
        const tempInfo = await FileSystem.getInfoAsync(tempUri);
        if (tempInfo.exists && tempInfo.size > 0) {
            console.log('Simple copy successful:', tempUri, 'size:', tempInfo.size);
            return tempUri;
        } else {
            throw new Error('Copy resulted in empty file');
        }
    } catch (copyError) {
        console.log('Simple copy failed, trying recording method:', copyError.message);
        
        // Fallback to recording method
        return await convertViaRecording(audioUri);
    }
}

async function convertViaRecording(audioUri: string): Promise<string> {
    // Load the audio file
    const sound = new Audio.Sound();
    let recording: Audio.Recording | null = null;
    
    try {
        await sound.loadAsync({ uri: audioUri });
        console.log('Audio loaded successfully');
    } catch (error) {
        throw new Error(`Failed to load audio: ${error.message}`);
    }

    try {
        // Get playback duration
        const status = await sound.getStatusAsync();
        let durationMillis = 5000; // Default fallback
        if ('isLoaded' in status && status.isLoaded && status.durationMillis) {
            durationMillis = status.durationMillis;
            console.log('Audio duration:', durationMillis, 'ms');
        } else {
            console.warn('Could not get audio duration, using default 5000ms');
        }

        // Create a unique file path for WAV output
        const wavFilePath = `${FileSystem.cacheDirectory}recording_${Date.now()}.wav`;
        console.log('Preparing WAV recording at:', wavFilePath);

        // Create a new recording to export as WAV
        recording = new Audio.Recording();
        try {
            await recording.prepareToRecordAsync({
                android: {
                    extension: '.wav',
                    outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_WAV,
                    sampleRate: 16000,
                    numberOfChannels: 1,
                    bitRate: 64000,
                    audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_DEFAULT
                },
                ios: {
                    extension: '.wav',
                    outputFormat: Audio.RECORDING_OPTION_IOS_OUTPUT_FORMAT_LINEARPCM,
                    audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_MEDIUM,
                    sampleRate: 16000,
                    numberOfChannels: 1,
                    bitRate: 64000,
                    linearPCMBitDepth: 16,
                    linearPCMIsBigEndian: false,
                    linearPCMIsFloat: false,
                },
                web: {
                    mimeType: 'audio/wav',
                    bitsPerSecond: 64000
                },
                keepAudioOn: true
            });
            console.log('Recording prepared successfully');
        } catch (error) {
            throw new Error(`Failed to prepare WAV recording: ${error.message}`);
        }

        // Play the original audio and record it as WAV simultaneously
        console.log('Starting playback and recording');
        await Promise.all([
            sound.playAsync(),
            recording.startAsync()
        ]);
        
        console.log(`Recording started for ${durationMillis}ms`);

        // Wait for playback to complete
        await new Promise(resolve => setTimeout(resolve, durationMillis + 500));

        // Stop both playback and recording
        console.log('Stopping playback and recording');
        await Promise.all([
            sound.stopAsync().catch(console.warn),
            recording.stopAndUnloadAsync()
        ]);

        // Get the WAV file URI
        const recordingStatus = await recording.getStatusAsync();
        console.log('Recording status:', recordingStatus);
        
        let finalWavUri: string;
        if ('isDoneRecording' in recordingStatus && recordingStatus.isDoneRecording) {
            if (recordingStatus.uri) {
                finalWavUri = recordingStatus.uri;
                console.log('Using URI from recording status:', finalWavUri);
            } else {
                finalWavUri = wavFilePath;
                console.log('Using fallback temp URI:', finalWavUri);
            }
        } else {
            throw new Error(`Recording not completed. Status: ${JSON.stringify(recordingStatus)}`);
        }

        // Wait a moment for file system to sync
        await new Promise(resolve => setTimeout(resolve, 200));

        // Verify WAV file exists with retries
        let wavInfo;
        let retries = 5;
        while (retries > 0) {
            wavInfo = await FileSystem.getInfoAsync(finalWavUri);
            if (wavInfo.exists && wavInfo.size > 0) {
                console.log('WAV file confirmed at:', finalWavUri, 'Size:', wavInfo.size);
                return finalWavUri;
            }
            
            console.log(`WAV file not found or empty at ${finalWavUri}, retrying... (${retries} attempts left)`);
            await new Promise(resolve => setTimeout(resolve, 300));
            retries--;
        }
        
        throw new Error(`WAV file not found or empty at: ${finalWavUri}. Recording may have failed.`);
        
    } finally {
        // Cleanup
        if (sound) {
            await sound.unloadAsync().catch(console.warn);
        }
        if (recording) {
            try {
                await recording.stopAndUnloadAsync();
            } catch (e) {
                console.warn('Error cleaning up recording:', e);
            }
        }
    }
}