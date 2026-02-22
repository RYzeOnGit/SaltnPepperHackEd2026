// FaceMesh Web Worker
// This worker handles FaceMesh inference to avoid blocking the main thread

let faceLandmarker = null;
let isProcessing = false;

self.onmessage = async (event) => {
  const { type, data } = event.data;

  if (type === 'INIT') {
    try {
      // Load MediaPipe FaceMesh
      importScripts('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0');
      
      const { FaceLandmarker, FilesetResolver } = self;
      
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm'
      );
      
      faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
          delegate: 'GPU',
        },
        outputFaceBlendshapes: false,
        runningMode: 'VIDEO',
        numFaces: 1,
      });

      self.postMessage({ type: 'INIT_SUCCESS' });
    } catch (error) {
      self.postMessage({ type: 'INIT_ERROR', error: error.message });
    }
  } else if (type === 'PROCESS_FRAME' && faceLandmarker && !isProcessing) {
    isProcessing = true;
    try {
      const { imageData, timestamp } = data;
      const results = faceLandmarker.detectForVideo(imageData, timestamp);
      
      self.postMessage({
        type: 'FRAME_RESULT',
        data: {
          landmarks: results.faceLandmarks?.[0] || null,
          faceDetected: results.faceLandmarks && results.faceLandmarks.length > 0,
        },
      });
    } catch (error) {
      console.error('FaceMesh processing error:', error);
    } finally {
      isProcessing = false;
    }
  }
};
