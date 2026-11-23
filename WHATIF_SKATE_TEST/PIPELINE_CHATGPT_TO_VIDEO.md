# Quy trình sản xuất video kênh: ChatGPT (ảnh) → Claude Code trên Mac (Blender 3D) → MP4

Mục tiêu: mỗi tập video dùng **cùng một nhân vật 3D** (đầu cầu trắng, hoodie xanh), chuyển động
chính xác, render trên Mac mini M4, **có giọng đọc tiếng Anh giọng NAM** (voice-over) và phụ đề tiếng Anh. ChatGPT tạo **ảnh tham chiếu**; Claude dựng **mô hình và chuyển động 3D thật**
trong Blender. Ảnh ChatGPT không bao giờ được đưa thẳng vào video như nhân vật.

Phân vai:
| Ai | Làm gì |
|---|---|
| Người dùng | Viết ý tưởng tập, tạo ảnh bằng ChatGPT, đặt file đúng thư mục, duyệt preview |
| ChatGPT | Ảnh thiết kế nhân vật (một lần), storyboard, bối cảnh, thumbnail, **lời thoại tiếng Anh** (mỗi tập) |
| Claude Code (Mac) | Dựng/cập nhật nhân vật 3D, bối cảnh, animation, camera, **giọng đọc nam tiếng Anh + phụ đề**, kiểm tra tự động, render, báo cáo |

---

## A. Cấu trúc thư mục (trong repo `publishflow-pro`)

```
CHANNEL/
  reference/character/          <- ảnh nhân vật từ ChatGPT (làm MỘT lần)
    01_turnaround.png
    02_proportions.png
    03_expressions.png
    04_details.png
    05_colors.txt               <- mã màu HEX ChatGPT trả về
    design_sheet_original.png   <- bảng thiết kế gốc (ảnh 3852.png)
  character/                    <- Claude tạo: mô hình + rig chuẩn của kênh
    character_v3.blend
    build_character.py
  library/                      <- Claude tạo dần: động tác dùng lại (đi, chạy, nhảy, trick...)
  episodes/
    EP01_double_kickflip/
      brief.md                  <- người dùng viết (mẫu ở mục D)
      storyboard.png            <- ChatGPT (mục C.6)
      location.png              <- ChatGPT (mục C.7), tuỳ chọn
      location_top.png          <- ChatGPT, tuỳ chọn
      thumbnail.png             <- ChatGPT (mục C.8), dùng trực tiếp cho YouTube/Facebook
      narration.md              <- ChatGPT (mục C.9): lời thoại tiếng Anh theo mốc thời gian
      --- Claude tạo ---
      EP01.blend
      build_EP01.py
      check_EP01.py
      voice/                    <- file giọng đọc từng câu (wav) + voiceover.wav đã ghép
      EP01.srt                  <- phụ đề tiếng Anh
      EP01_preview.mp4          <- 854x480 CÓ giọng đọc, để duyệt
      EP01_final.mp4            <- 1920x1080 + giọng đọc (AAC) sau khi duyệt
      report.txt
```
`render_*/` (thư mục PNG từng frame) **không commit**, thêm vào `.gitignore`.

---

## B. Quy tắc khi tạo ảnh bằng ChatGPT

1. **Luôn đính kèm** `design_sheet_original.png` (và sau khi có, `01_turnaround.png`) vào mỗi yêu cầu.
2. Ảnh để dựng 3D (C.1–C.4): nền trơn xám nhạt, ánh sáng đều, **góc thẳng (orthographic)**, không hiệu ứng, không chữ.
3. Mỗi ảnh một việc. Nếu ChatGPT vẽ lệch thiết kế (màu giày, độ dài chân, logo), tạo lại, **đừng** dùng ảnh lệch.
4. Lưu ảnh đúng tên ở mục A. Ảnh tỷ lệ 16:9 cho storyboard/bối cảnh/thumbnail.

## C. Câu lệnh mẫu cho ChatGPT (dán nguyên văn, sửa phần trong [ ])

### Làm MỘT lần: nhân vật chuẩn của kênh

**C.1 Turnaround → `01_turnaround.png`**
```
Using the attached character sheet, create an orthographic character turnaround of the SAME character:
front view, right side view, back view, left side view, and 3/4 front view, side by side,
all at exactly the same scale and height, aligned on one ground line.
Neutral A-pose: arms 30 degrees away from the body, legs straight, feet shoulder-width apart.
No backpack. Plain light grey background, flat even studio lighting, no shadows on the background,
no perspective distortion, no text. Keep head, eyes, hoodie, logo, legs and shoes identical to the sheet.
```

**C.2 Tỷ lệ → `02_proportions.png`**
```
Same character, front view A-pose, orthographic, on a plain white background with thin horizontal
guide lines marking: top of head, chin, shoulders, bottom of hoodie, knees, ankles, floor.
Character height = 8 equal units, show the unit grid on the left side. No other text.
```

**C.3 Biểu cảm → `03_expressions.png`**
```
Same character head only, straight front view, orthographic, plain light grey background, flat lighting.
A 3x3 grid of facial expressions, identical head size and position in every cell:
neutral, happy smile, big laugh (mouth open), surprised, sad, angry, wink, focused/determined, scared.
Only the eyes, eyebrows and mouth change. Same eye shape and size as the attached sheet.
```

**C.4 Chi tiết → `04_details.png`**
```
Same character, close-up detail sheet on plain grey background, flat lighting:
(1) hoodie front with drawstrings, pocket and H logo, (2) hoodie back with hood,
(3) sneaker side view, (4) sneaker top view, (5) sneaker sole, (6) round hand: open and fist.
Orthographic, no perspective, no text.
```

**C.5 Màu → `05_colors.txt`**
```
List the exact HEX colour codes used for this character: hoodie blue, hoodie dark blue (ribs/shadow),
skin white, eyes, mouth, shoe white, shoe blue accents, drawstrings, logo. Answer as a plain list.
```

### Làm MỖI tập

**C.6 Storyboard → `storyboard.png`**
```
Create a 6-panel storyboard (16:9 panels, numbered 1-6) for this episode: [dán phần "Câu chuyện" của brief].
Same character as the attached sheet in every panel. Each panel: show the camera angle clearly
(wide / medium / close-up, low angle / eye level), the main pose, and a short caption with
the action and the time range in seconds (e.g. "0-3s: rides forward").
Soft 3D cartoon style, consistent lighting and location across panels.
```

**C.7 Bối cảnh → `location.png` (+ `location_top.png`)**
```
Concept art of the location for this episode: [mô tả bối cảnh]. No characters.
Wide 16:9 view at eye level, simple clean shapes suitable for 3D modelling,
[thời điểm trong ngày] lighting, colour palette: purple, blue, warm gold.
```
```
Same location, top-down plan view, simple and clear, no characters.
```

**C.8 Thumbnail → `thumbnail.png`**
```
YouTube thumbnail 1280x720 of the same character doing [hành động chính], exaggerated happy expression,
dynamic angle, bright high-contrast colours, large empty area on the right for title text.
```

**C.9 Lời thoại tiếng Anh → `narration.md`**
```
Write a short English voice-over for a [8]-second 3D cartoon clip: [dán phần "Câu chuyện" + "Chuyển động theo frame" của brief].
Narrator: friendly, energetic young MALE voice, simple English for a general audience.
Hard limit: about 2.3 words per second of video (max [18] words in total), leave the first 0.5 s silent.
Split it into 2-4 lines, each with a start time in seconds matching the action, in this exact format:
[00.5] line one
[03.0] line two
No emojis, no sound-effect words, no stage directions.
```

---

## D. Mẫu `brief.md` cho mỗi tập (người dùng điền)

```markdown
# EP02 – [Tên tập]

Thời lượng: [8] giây · 30 FPS · [240] frame · 1920x1080 · MP4 H.264
Bối cảnh: [skatepark hiện có / bối cảnh mới theo location.png]
Thời điểm: [chiều hoàng hôn tím-vàng]
Biểu cảm chính: [vui / tập trung / ngạc nhiên ...]

## Câu chuyện (1–3 câu)
[Nhân vật ... ]

## Chuyển động theo frame
Frame 1–60: ...
Frame 61–90: ...
Frame 91–150: ...
Frame 151–180: ...
Frame 181–240: ...

## Camera
[Mở đầu góc ... / theo nhân vật / kết thúc góc rộng ...]

## Giọng đọc (tiếng Anh, giọng NAM)
Nguồn lời thoại: narration.md (ChatGPT, mục C.9), hoặc viết trực tiếp ở đây:
[00.5] ...
[03.0] ...
Phong cách: [vui, năng động / bình tĩnh / hài hước]  ·  Âm nhạc nền: [không / có, nhỏ]

## Điều kiện bắt buộc (sẽ được kiểm tra tự động)
- [Ví dụ: ván xoay đúng 720°, cơ thể không xoay theo ván]
- [Ví dụ: cả 4 bánh chạm đất khi tiếp đất]
- Không xuyên vật thể, chân không trượt, camera không cắt đầu/chân/ván
- Giọng đọc nam tiếng Anh, không câu nào vượt quá thời lượng video

## Ghi chú thêm
[Nhạc, chữ, độ dài khác...]
```

---

## E. Quy trình Claude Code trên Mac (làm theo đúng thứ tự)

**Bước 0: Chuẩn bị**
- `git fetch origin ccr-5638e48c-c993tw && git checkout ccr-5638e48c-c993tw && git pull`
- Blender: `BL=/Applications/Blender.app/Contents/MacOS/Blender` (Blender 5.3). ffmpeg: `brew install ffmpeg`.
- Đọc `WHATIF_SKATE_TEST/HANDOFF_MAC.md` (dự án gốc, rig, script có sẵn).

**Bước 1: Nhân vật chuẩn (chỉ một lần, khi có ảnh C.1–C.5)**
1. Xem kỹ các ảnh trong `CHANNEL/reference/character/`; đo tỷ lệ từ `02_proportions.png`.
2. Sao lưu, rồi dựng **nhân vật v3** trong `CHANNEL/character/build_character.py`, xuất phát từ
   `WHATIF_SKATE_TEST/build_scene.py` (phần 3–4). **Giữ nguyên tên và cấu trúc xương**
   (`root, hips, spine, chest, neck, head, upper_arm/forearm/hand.L/R, thigh/shin.L/R, foot_IK.L/R, knee_pole.L/R`)
   để animation cũ dùng lại được. Màu lấy từ `05_colors.txt`.
3. Tạo shape key cho từng biểu cảm trong `03_expressions.png`.
4. Render 3 góc look-dev (chính diện, 45°, toàn thân), so sánh cạnh ảnh turnaround, **chờ người dùng duyệt**.
5. Ghi rõ giới hạn nếu không đạt độ giống (ví dụ cần sculpt thủ công).

**Bước 2: Mỗi tập** (đầu vào: `CHANNEL/episodes/EPxx_*/brief.md` + ảnh)
1. Đọc `brief.md`, xem `storyboard.png` và `location.png`. Lập bảng shot: frame, tư thế, camera, biểu cảm.
   Nếu brief và storyboard mâu thuẫn, **theo brief** và ghi lại trong báo cáo.
2. Viết `build_EPxx.py`: nạp nhân vật chuẩn (`character_v3.blend` qua `bpy.data.libraries.load` hoặc dựng lại
   từ `build_character.py`), dựng/dùng lại bối cảnh, keyframe Bezier có ease-in/ease-out,
   camera theo dõi, cài render 1920x1080 / 30 fps / Eevee / motion blur nhẹ.
3. Viết `check_EPxx.py`: tự động kiểm tra **mọi điều kiện trong brief** + mặc định:
   không xuyên sàn/vật thể, chân không trượt khi chạm, camera luôn thấy toàn bộ nhân vật (lề > 0).
   Mẫu tham khảo: `WHATIF_SKATE_TEST/check_kickflip.py`. Có lỗi thì sửa rồi kiểm tra lại.
4. Render **preview 854x480** (`render_frames.py`, ~4 samples, không motion blur), ghép `EPxx_preview.mp4`.
5. Báo người dùng: đường dẫn file, bảng kết quả kiểm tra, thời gian render. **Dừng, chờ duyệt.**
6. Sau khi duyệt: render 1920x1080 (`$BL -b EPxx.blend -o //render_final/frame_#### -F PNG -a`),
   ghép `EPxx_final.mp4` (`ffmpeg -framerate 30 -i ... -c:v libx264 -pix_fmt yuv420p -crf 17`),
   xem lại vài frame quan trọng, viết `report.txt`.
7. Commit (không commit thư mục PNG) và push lên nhánh `ccr-5638e48c-c993tw`.

**Bước 2b: Giọng đọc tiếng Anh giọng NAM (làm cùng bước 2.4, trước khi gửi preview)**
1. Lấy lời thoại từ `narration.md` (hoặc mục "Giọng đọc" trong brief). Chỉ dùng tiếng Anh.
2. Tạo giọng bằng một trong hai cách, ưu tiên cách (a):
   a. **macOS offline (miễn phí):** liệt kê giọng: `say -v '?' | grep -E 'en_(US|GB|AU)'`.
      Chọn giọng NAM chất lượng cao nhất đang có, thứ tự ưu tiên: bản *Premium/Enhanced* (vd. Evan, Nathan, Tom, Aaron)
      → Alex / Daniel → Reed / Rocko / Eddy. Nếu chưa có bản Enhanced, nhắc người dùng tải trong
      *System Settings → Accessibility → Spoken Content → System Voice → Manage Voices*.
      Mỗi câu: `say -v "<Voice>" -r 175 -o voice/line_01.aiff "<text>"` rồi
      `ffmpeg -i voice/line_01.aiff -ar 48000 -ac 1 voice/line_01.wav`.
   b. **API TTS chất lượng cao** (chỉ khi người dùng cung cấp key qua biến môi trường, KHÔNG ghi key vào repo):
      ví dụ OpenAI TTS (giọng nam "onyx"/"echo") hoặc ElevenLabs (chọn giọng nam). Ghi rõ dịch vụ đã dùng trong report.
3. Đặt từng câu đúng mốc thời gian (`ffmpeg ... -af adelay=<ms>` rồi `amix`) thành `voice/voiceover.wav`
   dài đúng bằng video; chuẩn hoá âm lượng `loudnorm=I=-16:TP=-1.5`.
4. Kiểm tra tự động: mỗi câu kết thúc trước câu sau và trước khi hết video (đo bằng `ffprobe`);
   nếu dài quá, tăng `-r` (tối đa ~200) hoặc rút gọn câu và ghi lại.
5. Tạo phụ đề `EPxx.srt` từ cùng mốc thời gian.
6. Ghép vào video: `ffmpeg -i video.mp4 -i voice/voiceover.wav -c:v copy -c:a aac -b:a 192k -shortest EPxx_preview.mp4`
   (bản final làm tương tự). Tuỳ chọn: thêm phụ đề mềm `-i EPxx.srt -c:s mov_text`.
7. Ghi trong report: tên giọng, nguồn TTS, tốc độ đọc, thời lượng từng câu.

**Bước 3: Thư viện động tác**
- Sau mỗi tập, lưu các tư thế/động tác dùng lại được (dạng hàm Python trả về keyframe) vào `CHANNEL/library/`
  để các tập sau dựng nhanh hơn.

**Quy tắc chung**
- Không tạo lại từ đầu những gì đã có; luôn sao lưu `.blend` trước khi sửa.
- Không dùng ảnh phẳng làm nhân vật. Ảnh ChatGPT chỉ là tham chiếu (và thumbnail).
- Không render Full HD trước khi preview được duyệt.
- Báo cáo trung thực: lỗi, giới hạn, thời gian render thực tế, cấu hình máy.
- **Giọng đọc luôn là tiếng Anh, giọng NAM.** Không dùng giọng nữ, không dùng tiếng Việt trong video.

---

## F. Câu lệnh mẫu dán vào Claude Code trên Mac

**Lần đầu (dựng nhân vật chuẩn):**
```
Đọc WHATIF_SKATE_TEST/PIPELINE_CHATGPT_TO_VIDEO.md và HANDOFF_MAC.md (nhánh ccr-5638e48c-c993tw).
Tôi đã đặt ảnh ChatGPT vào CHANNEL/reference/character/. Hãy làm Bước 1 (nhân vật chuẩn v3),
render 3 góc look-dev và chờ tôi duyệt.
```

**Mỗi tập:**
```
Đọc WHATIF_SKATE_TEST/PIPELINE_CHATGPT_TO_VIDEO.md. Làm Bước 2 cho tập CHANNEL/episodes/EP02_[tên]/
(brief.md + storyboard.png + location.png + narration.md). Video có giọng đọc tiếng Anh giọng NAM và phụ đề.
Dừng sau preview 480p (có giọng đọc) và báo kết quả kiểm tra cho tôi duyệt.
```

**Sau khi duyệt preview:**
```
Tôi duyệt preview EP02. Render Full HD, ghép EP02_final.mp4, viết report.txt, commit và push.
```
