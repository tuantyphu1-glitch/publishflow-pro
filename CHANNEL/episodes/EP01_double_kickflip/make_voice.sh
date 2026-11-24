#!/bin/bash
# Giọng đọc EP01: macOS say, giọng nam Nathan Enhanced (en_US), offline. Chạy trong thư mục này.
set -e
cd "$(dirname "$0")"; mkdir -p voice
VOICE="Nathan (Enhanced)"; RATE=185; DUR=8
T=("0.5|Easy now. Here we go." "2.3|Pop it! Double kickflip!" "5.2|Caught it. Smooth landing!")
INPUTS=(); FILTER=""; i=0
for e in "${T[@]}"; do
  t=${e%%|*}; txt=${e#*|}; i=$((i+1)); n=$(printf %02d $i)
  say -v "$VOICE" -r $RATE -o voice/line_$n.aiff "$txt"
  ffmpeg -y -loglevel error -i voice/line_$n.aiff -ar 48000 -ac 1 voice/line_$n.wav
  ms=$(python3 -c "print(int($t*1000))")
  INPUTS+=(-i voice/line_$n.wav)
  FILTER+="[$((i-1))]adelay=${ms}|${ms}[a$i];"
  MIX+="[a$i]"
done
ffmpeg -y -loglevel error "${INPUTS[@]}" -filter_complex "${FILTER}${MIX}amix=inputs=$i:normalize=0,apad=whole_dur=$DUR,loudnorm=I=-16:TP=-1.5:LRA=11,atrim=0:$DUR" -ar 48000 -ac 1 voice/voiceover.wav
