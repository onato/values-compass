#!/usr/bin/env python3
"""Narrate methodology.html into audio/methodology.mp3 plus a timing sidecar.

Adapted from ../happy-news/scripts/digest.py, which does the same job for a
daily news digest. What is reused: the Piper helper (ONNX, no API key, runs on
the CI runner), the 16-bit PCM pipeline, and the even-byte silence trick. What
is different, and why:

* **Offsets are recorded, not detected.** happy-news gets one opaque blob back
  from Gemini and has to find chapter boundaries by locating the longest
  silences in it. Here every sentence is synthesised as its own call, so the
  exact start time of each is known while the audio is being assembled. No
  detection, no drift, and it stays exact however the prose is punctuated.

* **The unit is a sentence,** so the page can highlight along with the voice.
  Sentence spans are also written into methodology.html itself, as
  <span data-s="N"> wrappers, so the mapping from timing entry to DOM node
  is by index and cannot drift from the audio.

Stdlib only, matching the rest of this repo. External tools: ffmpeg, and piper
for the default engine.

Usage:
    python3 scripts/narrate.py --dry-run     # print the script, no synthesis
    python3 scripts/narrate.py               # write audio/ + wrap the source
"""

from __future__ import annotations

import argparse
import html
import json
import re
import subprocess
import sys
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "methodology.html"
OUT_DIR = ROOT / "audio"
MP3 = OUT_DIR / "methodology.mp3"
TIMING = OUT_DIR / "methodology.json"

SAMPLE_RATE = 24000
BYTES_PER_SAMPLE = 2
MP3_BITRATE = "64k"

# A beat after a heading and between paragraphs; sentences inside a paragraph
# run on with only the voice's own phrase-final pause.
HEADING_PAUSE = 0.9
PARAGRAPH_PAUSE = 0.6
SENTENCE_PAUSE = 0.15

PIPER_VOICE = "en_GB-alba-medium"

# Everything after this heading is reference material — the twelve dimension
# definitions and all sixty statements — which is generated into the page by
# JavaScript and reads as a recited list. The narration stops here.
STOP_AT = "All statements"

# Read as prose, not as markup. Anything not listed is skipped entirely.
SPEAK_TAGS = {"h2", "h3", "p", "li"}
SKIP_TAGS = {"script", "style"}


def silence(seconds: float, rate: int = SAMPLE_RATE) -> bytes:
    """`seconds` of silent 16-bit PCM, always a whole number of samples.

    Whole SAMPLES, not bytes: an odd byte count shifts every following sample
    by one byte and turns the rest of the audio into static.
    """
    return b"\x00" * (int(rate * seconds) * BYTES_PER_SAMPLE)


class Blocks(HTMLParser):
    """Collect the speakable blocks, each with the character span it occupies.

    Offsets are into the original file so the sentence wrappers can be spliced
    back in without re-serialising the document — a round trip through this
    parser would drop attributes and normalise entities, and the file is
    hand-maintained prose.
    """

    def __init__(self) -> None:
        super().__init__(convert_charrefs=False)
        self.blocks: list[dict] = []
        self.stack: list[str] = []
        self.skip = 0
        self.open_tag: str | None = None
        self.start = 0
        self.text: list[str] = []

    def handle_starttag(self, tag, attrs):
        if tag in SKIP_TAGS:
            self.skip += 1
            return
        if self.skip:
            return
        if tag in SPEAK_TAGS and self.open_tag is None:
            self.open_tag = tag
            # Character offset just past this start tag.
            self.start = self.rawdata.index(">", self.getpos_offset()) + 1
            self.text = []

    def handle_endtag(self, tag):
        if tag in SKIP_TAGS:
            self.skip = max(0, self.skip - 1)
            return
        if self.skip:
            return
        if tag == self.open_tag:
            end = self.getpos_offset()
            body = "".join(self.text)
            if body.strip():
                self.blocks.append({
                    "tag": tag,
                    "text": re.sub(r"\s+", " ", html.unescape(body)).strip(),
                    "start": self.start,
                    "end": end,
                })
            self.open_tag = None

    def handle_data(self, data):
        if self.open_tag and not self.skip:
            self.text.append(data)

    def handle_entityref(self, name):
        if self.open_tag and not self.skip:
            self.text.append(f"&{name};")

    def handle_charref(self, name):
        if self.open_tag and not self.skip:
            self.text.append(f"&#{name};")

    # HTMLParser reports line/column; convert to an absolute character offset.
    def getpos_offset(self) -> int:
        line, col = self.getpos()
        lines = self.rawdata.split("\n")
        return sum(len(x) + 1 for x in lines[: line - 1]) + col


# Abbreviations that end in a period but do not end a sentence.
ABBREV = r"(?<!\be\.g)(?<!\bi\.e)(?<!\bcf)(?<!\bvs)(?<!\bNo)(?<!\bDr)(?<!\bMr)(?<!\bMrs)(?<!\bSt)"
SENTENCE_END = re.compile(ABBREV + r"(?<=[.!?])[\"')\]]*\s+")


def split_sentences(text: str) -> list[str]:
    """Split a block into sentences, keeping their terminal punctuation."""
    parts = [p.strip() for p in SENTENCE_END.split(text) if p.strip()]
    return parts or ([text.strip()] if text.strip() else [])


# Read aloud cleanly. Kept deliberately short — over-normalising mangles meaning.
SPOKEN = [
    (re.compile(r"\bGAL-TAN\b"), "gal-tan"),
    (re.compile(r"\bTOP\b"), "T-O-P"),
    (re.compile(r"\bRMA\b"), "R-M-A"),
    (re.compile(r"\bNCEA\b"), "N-C-E-A"),
    (re.compile(r"\bJSON\b"), "Jason"),
    (re.compile(r"\bAI\b"), "A-I"),
    (re.compile(r"\bSD\b"), "standard deviation"),
    (re.compile(r"\bv(\d)"), r"version \1"),
    (re.compile(r"(\d)\s*[-–]\s*(\d)"), r"\1 to \2"),
    (re.compile("\u2212"), "minus "),
    (re.compile("[\u201c\u201d]"), '"'),
    (re.compile("[\u2018\u2019]"), "'"),
    (re.compile("\u2014"), ", "),
]


def speakable(text: str) -> str:
    for pattern, repl in SPOKEN:
        text = pattern.sub(repl, text)
    return re.sub(r"\s+", " ", text).strip()


def synthesize_piper(sentences: list[str]) -> tuple[list[bytes], int]:
    """One PCM buffer per sentence, plus the rate Piper produced them at.

    Synthesising per sentence rather than per paragraph is what makes exact
    per-sentence offsets possible; Piper exposes no timestamps of its own.
    """
    helper = r'''
import io, json, sys, wave
from piper import PiperVoice

voice = PiperVoice.load(sys.argv[1] + ".onnx")
sentences = json.loads(sys.stdin.read())
out, rate = [], None
for text in sentences:
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as handle:
        voice.synthesize_wav(text, handle)
    buffer.seek(0)
    with wave.open(buffer, "rb") as handle:
        rate = handle.getframerate()
        out.append(handle.readframes(handle.getnframes()))
# Length-prefixed frames, so the parent can split them apart again.
sys.stderr.write("\nPIPER_RATE=%d\n" % rate)
w = sys.stdout.buffer
for pcm in out:
    w.write(len(pcm).to_bytes(8, "big"))
    w.write(pcm)
'''
    result = subprocess.run(
        [sys.executable, "-c", helper, PIPER_VOICE],
        input=json.dumps(sentences).encode(), capture_output=True,
    )
    if result.returncode != 0 or not result.stdout:
        raise SystemExit(
            "piper failed: " + result.stderr[-800:].decode("utf-8", "replace"))
    match = re.search(r"PIPER_RATE=(\d+)", result.stderr.decode("utf-8", "replace"))
    if not match:
        raise SystemExit("piper did not report its sample rate")

    blob, chunks, i = result.stdout, [], 0
    while i < len(blob):
        n = int.from_bytes(blob[i:i + 8], "big")
        i += 8
        chunks.append(blob[i:i + n])
        i += n
    return chunks, int(match.group(1))


def resample(pcm: bytes, rate: int) -> bytes:
    if rate == SAMPLE_RATE:
        return pcm
    return subprocess.run(
        ["ffmpeg", "-v", "error", "-f", "s16le", "-ar", str(rate), "-ac", "1",
         "-i", "pipe:0", "-f", "s16le", "-ar", str(SAMPLE_RATE), "-ac", "1", "pipe:1"],
        input=pcm, capture_output=True, check=True,
    ).stdout


def encode(pcm: bytes, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
         "-f", "s16le", "-ar", str(SAMPLE_RATE), "-ac", "1", "-i", "pipe:0",
         "-c:a", "libmp3lame", "-b:a", MP3_BITRATE,
         "-id3v2_version", "3",
         "-metadata", "title=Values Compass — Methodology",
         "-metadata", "artist=Values Compass",
         "-metadata", "genre=Speech",
         str(path)],
        input=pcm, check=True, capture_output=True,
    )


def check_tools(engine_needed: bool) -> None:
    tools = ["ffmpeg"] if engine_needed else []
    for tool in tools:
        try:
            subprocess.run([tool, "-version"], capture_output=True, check=True)
        except (OSError, subprocess.CalledProcessError):
            raise SystemExit(f"{tool} is required but not available")


def wrap_source(source: str, blocks: list[dict], sentences: list[dict]) -> str:
    """Splice <span data-s="N"> around every sentence in the source file.

    Done by character offset, back to front, so earlier offsets stay valid.
    The page highlights by index, so these wrappers and the timing file are
    written from the same pass and cannot disagree.
    """
    by_block: dict[int, list[dict]] = {}
    for s in sentences:
        by_block.setdefault(s["block"], []).append(s)

    for bi in sorted(by_block, reverse=True):
        block = blocks[bi]
        inner = source[block["start"]:block["end"]]
        # Re-find each sentence in the raw inner HTML. Matching on the first few
        # words keeps inline markup (<em>, <a>) inside the span intact.
        pieces, cursor = [], 0
        for s in by_block[bi]:
            probe = re.escape(s["text"][:24]).replace(r"\ ", r"(?:\s|<[^>]+>)+")
            m = re.compile(probe).search(inner, cursor)
            if m is None:
                continue
            pieces.append((m.start(), s["index"]))
            cursor = m.start() + 1
        if not pieces:
            continue
        bounds = [p[0] for p in pieces] + [len(inner)]
        rebuilt = inner[:bounds[0]]
        for k, (pos, index) in enumerate(pieces):
            rebuilt += f'<span data-s="{index}">{inner[bounds[k]:bounds[k + 1]].rstrip()}</span>'
            if bounds[k + 1] < len(inner):
                rebuilt += " "
        source = source[:block["start"]] + rebuilt + source[block["end"]:]
    return source


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true",
                    help="print what would be spoken, make no audio")
    args = ap.parse_args()

    source = SOURCE.read_text(encoding="utf-8")
    # Re-running must not nest wrappers inside wrappers.
    source = re.sub(r'<span data-s="\d+">(.*?)</span>', r"\1", source, flags=re.S)

    parser = Blocks()
    parser.feed(source)

    blocks = []
    for b in parser.blocks:
        if b["tag"] in ("h2", "h3") and b["text"].strip() == STOP_AT:
            break
        blocks.append(b)

    sentences: list[dict] = []
    for bi, block in enumerate(blocks):
        for text in split_sentences(block["text"]):
            sentences.append({
                "index": len(sentences), "block": bi,
                "tag": block["tag"], "text": text, "spoken": speakable(text),
            })

    if args.dry_run:
        for s in sentences:
            print(f'{s["index"]:>4}  {s["tag"]:<3}  {s["spoken"]}')
        chars = sum(len(s["spoken"]) for s in sentences)
        print(f"\n{len(sentences)} sentences in {len(blocks)} blocks, "
              f"{chars} chars, about {chars / 950:.1f} min")
        return 0

    check_tools(True)
    chunks, rate = synthesize_piper([s["spoken"] for s in sentences])
    if len(chunks) != len(sentences):
        raise SystemExit(f"piper returned {len(chunks)} chunks for {len(sentences)} sentences")

    # Assemble, recording each sentence's exact start as it goes in.
    pcm, timing = bytearray(), []
    previous_block = None
    for s, chunk in zip(sentences, chunks):
        if previous_block is not None and s["block"] != previous_block:
            gap = HEADING_PAUSE if sentences[s["index"] - 1]["tag"] in ("h2", "h3") else PARAGRAPH_PAUSE
            pcm += silence(gap, rate)
        elif previous_block is not None:
            pcm += silence(SENTENCE_PAUSE, rate)
        timing.append({
            "i": s["index"],
            "t": round(len(pcm) / (rate * BYTES_PER_SAMPLE), 3),
            "tag": s["tag"],
        })
        pcm += chunk
        previous_block = s["block"]

    audio = resample(bytes(pcm), rate)
    encode(audio, MP3)

    duration = round(len(audio) / (SAMPLE_RATE * BYTES_PER_SAMPLE), 3)
    for entry in timing:
        entry["t"] = round(entry["t"] * rate / rate, 3)
    TIMING.write_text(json.dumps({
        "duration": duration,
        "voice": PIPER_VOICE,
        "sentences": timing,
    }, indent=1) + "\n", encoding="utf-8")

    SOURCE.write_text(wrap_source(source, blocks, sentences), encoding="utf-8")

    size = MP3.stat().st_size
    print(f"{MP3.relative_to(ROOT)}  {size / 1e6:.1f} MB  {duration / 60:.1f} min")
    print(f"{TIMING.relative_to(ROOT)}  {len(timing)} sentences")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
