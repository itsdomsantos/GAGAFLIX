"""
GAGAFLIX trailer score — original, generated in code (pure numpy), so YouTube never
claims it. Dark hybrid-trailer style in A minor: low string drone, clock ticks, taiko
"tam... tum... tum" hits on the title cards, a riser into silence, a BRAAM on the logo,
a driving ostinato under the features (a hit on every cut), a second riser, the final
BRAAM and a long minor-chord tail.

    python3 score.py out.wav '{"duration":60,"cards":[2.2,4.6,7.0],...}'

The timeline JSON comes from trailer.mjs so music and picture always line up.
"""
import json
import sys
import wave

import numpy as np

SR = 48000
OUT = sys.argv[1]
TL = json.loads(sys.argv[2])
DUR = float(TL["duration"])
N = int(SR * DUR)
rng = np.random.default_rng(1986)


def Z(n=N):
    return np.zeros(n)


def fft_filter(x, lo=None, hi=None, q=4):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    m = np.ones_like(f)
    if hi:
        m *= 1 / np.sqrt(1 + (f / hi) ** q)
    if lo:
        m *= 1 / np.sqrt(1 + (lo / np.maximum(f, 1e-6)) ** q)
    return np.fft.irfft(X * m, len(x))


def sweep_filter(x, cutoff, chunks=48):
    """Time-varying lowpass: cutoff(u in 0..1) -> Hz, overlap-add."""
    out = np.zeros_like(x)
    n = len(x)
    hop = max(1, n // chunks)
    for c in range(chunks + 1):
        a = max(0, c * hop - hop)
        b = min(n, c * hop + hop)
        if b - a < 8:
            continue
        out[a:b] += fft_filter(x[a:b] * np.hanning(b - a), hi=cutoff(c / chunks))
    return out


def place(buf, sig, at, gain=1.0):
    i = int(at * SR)
    if i >= len(buf) or i + len(sig) <= 0:
        return
    s = max(0, -i)
    i = max(0, i)
    j = min(len(buf), i + len(sig) - s)
    buf[i:j] += sig[s : s + (j - i)] * gain


def saw(f, n, det=0.0, ph=0.0):
    t = np.arange(n) / SR
    return 2 * ((t * f * (1 + det) + ph) % 1) - 1


def env(n, a, r):
    e = np.ones(n)
    an, rn = max(1, int(a * SR)), max(1, int(r * SR))
    e[:an] = np.linspace(0, 1, an)
    e[-rn:] *= np.linspace(1, 0, rn)
    return e


def norm(x, peak=1.0):
    m = np.max(np.abs(x))
    return x / m * peak if m > 0 else x


A1, E2, A2, C3, E3, A3, C4, E4 = 55.0, 82.41, 110.0, 130.81, 164.81, 220.0, 261.63, 329.63

# ---------------- one-shots ----------------


def taiko(length=2.6, pitch=52):
    """The 'TAM': a deep drum — pitch-dropping sine body, skin slap, sub tail."""
    n = int(length * SR)
    t = np.arange(n) / SR
    body = np.sin(2 * np.pi * np.cumsum(pitch * 0.72 + pitch * 0.9 * np.exp(-t * 18)) / SR) * np.exp(-t * 2.4)
    slap = fft_filter(rng.uniform(-1, 1, n), lo=120, hi=1800) * np.exp(-t * 32) * 0.55
    sub = np.sin(2 * np.pi * 36 * t) * np.exp(-t * 1.6) * 0.5
    return norm(body + slap + sub)


def small_drum(pitch=95):
    n = int(0.7 * SR)
    t = np.arange(n) / SR
    body = np.sin(2 * np.pi * np.cumsum(pitch + 70 * np.exp(-t * 30)) / SR) * np.exp(-t * 7)
    skin = fft_filter(rng.uniform(-1, 1, n), lo=300, hi=4000) * np.exp(-t * 40) * 0.4
    return norm(body + skin)


def tick(hi=True):
    n = int(0.05 * SR)
    t = np.arange(n) / SR
    f = 2600 if hi else 1900
    return (np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * f * 1.9 * t)) * np.exp(-t * 160)


def braam(length=4.5):
    """Brass-like wall: detuned saws in A, filter closing, plus a sub boom."""
    n = int(length * SR)
    t = np.arange(n) / SR
    s = np.zeros(n)
    for f, g in ((A1, 1.0), (A2, 0.75), (E2, 0.6), (C3, 0.35), (E3, 0.3)):
        for d in (-0.007, 0.0, 0.006):
            s += saw(f, n, d, rng.random()) * g
    s = sweep_filter(s, lambda u: 2400 * np.exp(-u * 3.6) + 160)
    s *= env(n, 0.03, length * 0.75) * np.exp(-t * 0.3)
    boom = np.sin(2 * np.pi * np.cumsum(34 + 40 * np.exp(-t * 9)) / SR) * np.exp(-t * 0.9) * 1.7
    return norm(s + boom)


def crash(length=3.5):
    n = int(length * SR)
    t = np.arange(n) / SR
    return fft_filter(rng.uniform(-1, 1, n), lo=4000) * np.exp(-t * 1.5)


def riser(length):
    """Noise sweep + gliding saw, building into the cut; ends abruptly."""
    n = int(length * SR)
    u = np.linspace(0, 1, n)
    noise = sweep_filter(rng.uniform(-1, 1, n), lambda x: 300 + 9000 * x**2.2, chunks=60)
    f = 110 * 2 ** (u * 2.5)
    glide = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.5 + (2 * ((np.cumsum(f * 1.003) / SR) % 1) - 1) * 0.25
    s = norm(noise) * 0.6 + glide * 0.5
    return s * u**1.8


def pluck(f, length=0.32):
    n = int(length * SR)
    t = np.arange(n) / SR
    s = saw(f, n, 0.0) + saw(f, n, 0.004) * 0.7
    s = fft_filter(s, hi=1800)
    return s * np.exp(-t * 11) * env(n, 0.003, 0.02)


# ---------------- reverb ----------------


def reverb(x, seconds=2.6, mix=0.32):
    n = int(seconds * SR)
    t = np.arange(n) / SR
    ir = rng.uniform(-1, 1, n) * np.exp(-t * (6.9 / seconds))
    ir = fft_filter(ir, hi=5500)
    ir[0] = 0
    ir /= np.sqrt(np.sum(ir**2))
    L = len(x) + n
    size = 1 << (L - 1).bit_length()
    wet = np.fft.irfft(np.fft.rfft(x, size) * np.fft.rfft(ir, size), size)[: len(x)]
    return x * (1 - mix) + norm(wet, np.max(np.abs(x)) or 1) * mix


# ---------------- the arrangement ----------------

drone, drums, hits, ost, fx, tail = Z(), Z(), Z(), Z(), Z(), Z()
drop = TL["drop"]
act2 = TL["act2"]          # [start, end] of the features
final = TL["final"]

# Drone: A1 + E2 low strings, swelling through act I, quieter under act II, back at the end.
t = np.arange(N) / SR
lfo = 0.5 + 0.5 * np.sin(2 * np.pi * 0.11 * t)
raw = sum(saw(f, N, d, rng.random()) for f in (A1, E2, A2) for d in (-0.004, 0.0, 0.005))
drone_sig = sweep_filter(raw, lambda u: 220 + 380 * u, chunks=80) * (0.6 + 0.4 * lfo)
shape = np.interp(t, [0, 1.5, drop - 0.6, drop - 0.5, drop, act2[0], act2[1], final, DUR],
                  [0, 0.55, 1.0, 0.0, 0.0, 0.35, 0.45, 0.8, 0.0])
drone += norm(drone_sig) * shape

# Act I: clock ticks until the riser, taiko hits on each title card.
tick_end = TL["riser1"][0]
k = 0
tt = 0.6
while tt < tick_end:
    place(fx, tick(k % 2 == 0), tt, 0.35)
    tt += 0.5
    k += 1
for c in TL["cards"]:
    place(hits, taiko(), c, 1.0)
    place(hits, crash(2.5), c, 0.18)

# Riser into silence, then the BRAAM on the logo.
r0, r1 = TL["riser1"]
place(fx, riser(r1 - r0), r0, 0.8)
place(hits, braam(), drop, 1.7)
place(hits, crash(), drop, 0.35)

# Act II: driving ostinato "TAM . tum tum TAM . tum ." + string 16ths, a hit on every cut.
bpm = TL.get("bpm", 96)
beat = 60 / bpm
pattern = [1.0, 0, 0.55, 0.55, 0.9, 0, 0.55, 0]  # eighth notes
notes = [A3, C4, E4, C4, A3, E3, A3, C4]
s0, s1 = act2[0], TL["riser2"][0]
i = 0
tt = s0
while tt < s1:
    g = pattern[i % 8]
    if g:
        place(drums, taiko(1.4, 60) if g > 0.8 else small_drum(), tt, g)
    place(ost, pluck(notes[i % 8] * (2 if (i // 16) % 2 else 1)), tt, 0.5)
    tt += beat / 2
    i += 1
for c in TL["cuts"]:
    place(hits, taiko(2.2, 48), c, 0.85)
    place(hits, crash(2.0), c, 0.12)

# Second riser, a breath of silence, final BRAAM + minor chord tail.
q0, q1 = TL["riser2"]
place(fx, riser(q1 - q0), q0, 0.85)
place(hits, braam(6.0), final, 1.8)
place(hits, crash(4.5), final, 0.4)
tn = int((DUR - final) * SR)
ttail = np.arange(tn) / SR
chord = sum(saw(f, tn, d, rng.random()) for f in (A2, C3, E3, A3) for d in (-0.003, 0.004))
chord = fft_filter(chord, hi=900) * env(tn, 1.2, 4.0) * np.exp(-ttail * 0.12)
place(tail, norm(chord), final, 0.45)

# Mix: everything through a hall, silence gaps kept clean.
mix = drone * 0.42 + drums * 0.55 + hits * 0.95 + ost * 0.22 + fx * 0.5 + tail
mix = reverb(mix, 2.8, 0.3)
for a, b in TL.get("silence", []):
    i0, i1 = int(a * SR), int(b * SR)
    fade = min(int(0.04 * SR), i1 - i0)
    mix[i0:i0 + fade] *= np.linspace(1, 0, fade)
    mix[i0 + fade:i1] = 0
mix[-int(1.5 * SR):] *= np.linspace(1, 0, int(1.5 * SR))
mix = np.tanh(mix * 1.6) / np.tanh(1.6)
mix = norm(mix, 0.89)

# Gentle stereo: a few ms of delay on one side for width.
d = int(0.011 * SR)
left = mix
right = np.concatenate([np.zeros(d), mix[:-d]]) * 0.92 + mix * 0.08
pcm = (np.stack([left, right], 1) * 32767).astype(np.int16)
with wave.open(OUT, "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print(f"score: {DUR:.1f}s → {OUT}")
