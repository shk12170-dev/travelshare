// 브라우저에서 영상을 720p·2.5Mbps WebM으로 다시 인코딩해 저장 공간과 전송량을 줄임.
// MediaRecorder를 지원하지 않는 브라우저에서는 원본을 그대로 반환한다.
const MAX_WIDTH = 1280;
const MAX_HEIGHT = 720;
const VIDEO_BITRATE = 2_500_000;

function recorderType() {
  if (typeof MediaRecorder === "undefined") return null;
  const types = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
  return types.find((type) => MediaRecorder.isTypeSupported(type)) ?? null;
}

export async function compressVideo(file) {
  if (!file?.type.startsWith("video/") || typeof document === "undefined") return file;
  const mimeType = recorderType();
  if (!mimeType || typeof HTMLVideoElement === "undefined") return file;

  const sourceUrl = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.src = sourceUrl;
  video.muted = true;
  video.playsInline = true;

  try {
    await new Promise((resolve, reject) => {
      video.onloadedmetadata = resolve;
      video.onerror = () => reject(new Error("video-load"));
      video.load();
    });
    const scale = Math.min(1, MAX_WIDTH / video.videoWidth, MAX_HEIGHT / video.videoHeight);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(2, Math.round(video.videoWidth * scale));
    canvas.height = Math.max(2, Math.round(video.videoHeight * scale));
    const context = canvas.getContext("2d");
    const sourceStream = video.captureStream?.();
    if (!sourceStream || !context) return file;

    const canvasStream = canvas.captureStream(30);
    const stream = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...sourceStream.getAudioTracks(),
    ]);
    const chunks = [];
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: VIDEO_BITRATE });
    const recorded = new Promise((resolve, reject) => {
      recorder.ondataavailable = (event) => event.data.size > 0 && chunks.push(event.data);
      recorder.onerror = () => reject(new Error("video-record"));
      recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
    });

    const draw = () => {
      if (video.ended || video.paused) return;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      requestAnimationFrame(draw);
    };
    await video.play();
    recorder.start(250);
    draw();
    await new Promise((resolve) => {
      video.onended = resolve;
    });
    if (recorder.state !== "inactive") recorder.stop();
    const blob = await recorded;
    if (blob.size >= file.size || blob.size === 0) return file;
    return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.webm`, { type: mimeType, lastModified: file.lastModified });
  } catch {
    return file;
  } finally {
    video.pause();
    video.src = "";
    URL.revokeObjectURL(sourceUrl);
  }
}
