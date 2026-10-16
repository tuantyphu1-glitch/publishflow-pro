"""Tự tổng hợp âm thanh cho app (không dùng mẫu của bên thứ ba).
Chạy: python3 tools/make_sounds.py  -> sounds/correct.mp3, sounds/cheer.mp3 (cần numpy + ffmpeg)
Âm thanh sinh ra hoàn toàn từ công thức toán học nên thuộc về chủ sở hữu app."""
import numpy as np, subprocess, wave, os, sys
SR = 44100
rng = np.random.default_rng(7)
out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), '..', 'sounds')
os.makedirs(out, exist_ok=True)

def env(n, a=0.004, d=0.3):
    t = np.arange(n) / SR
    e = np.exp(-t / d)
    e[: int(a * SR)] *= np.linspace(0, 1, int(a * SR))
    return e

def bell(freq, dur, d=0.25, amp=1.0):
    """Âm chuông/marimba: các họa âm lệch nhẹ, tắt nhanh."""
    n = int(dur * SR); t = np.arange(n) / SR
    s = np.sin(2*np.pi*freq*t) + 0.35*np.sin(2*np.pi*freq*2.76*t)*np.exp(-t/(d*0.4)) + 0.2*np.sin(2*np.pi*freq*5.4*t)*np.exp(-t/(d*0.2)) + 0.12*np.sin(2*np.pi*freq*4*t)*np.exp(-t/(d*0.3))
    return amp * s * env(n, 0.003, d)

def horn(freq, dur, amp=1.0):
    """Âm kèn nhẹ: cộng họa âm 1..6, rung nhẹ, vào/ra mềm."""
    n = int(dur * SR); t = np.arange(n) / SR
    vib = 1 + 0.004*np.sin(2*np.pi*5.5*t)
    s = sum(np.sin(2*np.pi*freq*k*vib*t) / k for k in range(1, 7))
    e = np.minimum(1, t/0.03) * np.minimum(1, (dur - t)/0.25)
    return amp * s * e

def place(buf, sig, start):
    i = int(start * SR); j = min(len(buf), i + len(sig))
    if i < len(buf): buf[i:j] += sig[: j - i]

def clap(buf, at, amp):
    n = int(rng.uniform(0.006, 0.02) * SR)
    x = rng.standard_normal(n); x = np.diff(x, prepend=0)  # nghiêng về cao tần
    place(buf, amp * x * np.exp(-np.arange(n)/(n*0.3)), at)

def finish(buf, name, peak=0.85):
    buf = buf / (np.max(np.abs(buf)) + 1e-9) * peak
    fade = int(0.08 * SR); buf[-fade:] *= np.linspace(1, 0, fade)
    pcm = (buf * 32767).astype(np.int16)
    wav = os.path.join(out, name + '.wav')
    with wave.open(wav, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-codec:a', 'libmp3lame', '-b:a', '80k', os.path.join(out, name + '.mp3')], check=True)
    os.remove(wav)

# --- Đáp án đúng: arpeggio chuông C6-E6-G6-C7, lấp lánh (~1.1s) ---
b = np.zeros(int(1.2 * SR))
for i, f in enumerate([1046.5, 1318.5, 1568.0, 2093.0]):
    place(b, bell(f, 0.9, 0.22, 1.0 - i*0.08), i * 0.075)
place(b, bell(523.25, 1.0, 0.4, 0.5), 0.0)  # nền trầm ấm
finish(b, 'correct')

# --- Hoàn thành: kèn fanfare + lấp lánh + vỗ tay (~2.4s) ---
b = np.zeros(int(2.5 * SR))
for i, f in enumerate([523.25, 659.25, 783.99]):          # C5 E5 G5 nối nhau
    place(b, horn(f, 0.22, 0.5), i * 0.14)
for f in [523.25, 659.25, 783.99, 1046.5]:                # hợp âm C trưởng giữ
    place(b, horn(f, 1.3, 0.45), 0.45)
for k in range(14):                                       # lấp lánh ngẫu nhiên (âm giai ngũ cung)
    f = rng.choice([1568, 1760, 2093, 2349, 2637, 3136])
    place(b, bell(f, 0.5, 0.12, 0.25), 0.5 + k*0.11 + rng.uniform(0, 0.05))
for k in range(110):                                      # vỗ tay: dày dần rồi thưa
    at = 0.7 + rng.beta(2.2, 2.2) * 1.5
    clap(b, at, rng.uniform(0.04, 0.12))
finish(b, 'cheer')
print('done ->', out)
