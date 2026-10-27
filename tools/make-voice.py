"""Generates the coach's voice clips in audio/ with the Kokoro-82M voice model.

Kokoro-82M (https://huggingface.co/hexgrad/Kokoro-82M) and its voices are
Apache-2.0 licensed. Setup, once:

    python3 -m venv .tts && .tts/bin/pip install kokoro-onnx soundfile
    # download kokoro-v1.0.onnx and voices-v1.0.bin from
    # https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0

Then, from the repository root (needs node and ffmpeg):

    .tts/bin/python tools/make-voice.py --models <folder with the two files>

The lines come from js/coach.js, so a changed line or a new exercise only
needs a rerun.
"""

import argparse
import json
import pathlib
import subprocess
import tempfile

import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

VOICE = "af_heart"
SPEED = 1.05

# Speech this loud on average (dBFS), and peaks no louder than -1 dBFS.
TARGET_RMS = -16
PEAK = 0.89


def coach_lines():
    script = "import { LINES } from './js/coach.js'; console.log(JSON.stringify(LINES));"
    return json.loads(subprocess.check_output(["node", "--input-type=module", "-e", script], text=True))


def trim(samples, sample_rate, threshold=0.01, pad=0.04):
    loud = np.flatnonzero(np.abs(samples) > threshold)
    if not len(loud):
        return samples
    margin = int(pad * sample_rate)
    return samples[max(0, loud[0] - margin) : loud[-1] + margin]


def level(samples):
    rms = np.sqrt(np.mean(samples**2))
    gain = min(10 ** (TARGET_RMS / 20) / rms, PEAK / np.max(np.abs(samples)))
    return samples * gain


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--models", required=True, help="folder with kokoro-v1.0.onnx and voices-v1.0.bin")
    parser.add_argument("--out", default="audio")
    args = parser.parse_args()

    models = pathlib.Path(args.models)
    kokoro = Kokoro(str(models / "kokoro-v1.0.onnx"), str(models / "voices-v1.0.bin"))
    out = pathlib.Path(args.out)
    out.mkdir(exist_ok=True)

    lines = coach_lines()
    with tempfile.TemporaryDirectory() as tmp:
        for clip_id, text in lines.items():
            samples, sample_rate = kokoro.create(text, voice=VOICE, speed=SPEED, lang="en-us")
            wav = pathlib.Path(tmp) / f"{clip_id}.wav"
            sf.write(wav, level(trim(samples, sample_rate)), sample_rate)
            subprocess.run(
                ["ffmpeg", "-y", "-loglevel", "error", "-i", str(wav), "-ac", "1", "-b:a", "48k", str(out / f"{clip_id}.mp3")],
                check=True,
            )
            print(f"{clip_id}: {text}")

    (out / "clips.json").write_text(json.dumps(sorted(lines)) + "\n")


if __name__ == "__main__":
    main()
