export function getSupportedMimeType(): string {
  const types = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ]
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) return type
  }
  return ""
}

const MIN_BLOB_SIZE = 1024

export function createMediaRecorder(
  stream: MediaStream,
  onDataAvailable: (blob: Blob) => void
): MediaRecorder {
  const mimeType = getSupportedMimeType()
  const options: MediaRecorderOptions = {}
  if (mimeType) options.mimeType = mimeType

  const recorder = new MediaRecorder(stream, options)

  recorder.ondataavailable = (e) => {
    if (e.data.size > MIN_BLOB_SIZE) {
      onDataAvailable(e.data)
    }
  }

  return recorder
}
