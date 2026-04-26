import { AUDIO_MIME_TYPES, LIMITS } from "./config"

export function getSupportedMimeType(): string {
  for (const type of AUDIO_MIME_TYPES) {
    if (MediaRecorder.isTypeSupported(type)) return type
  }
  return ""
}

export function createMediaRecorder(
  stream: MediaStream,
  onDataAvailable: (blob: Blob) => void
): MediaRecorder {
  const mimeType = getSupportedMimeType()
  const options: MediaRecorderOptions = {}
  if (mimeType) options.mimeType = mimeType

  const recorder = new MediaRecorder(stream, options)

  recorder.ondataavailable = (e) => {
    if (e.data.size > LIMITS.minBlobSize) {
      onDataAvailable(e.data)
    }
  }

  return recorder
}
