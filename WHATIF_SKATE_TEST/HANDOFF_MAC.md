# Bàn giao dự án WHATIF SKATE TEST → Mac mini M4

Tài liệu này để tiếp tục dự án trên Mac mini M4 (Claude Code / Remote Control).
Claude trên Mac: hãy đọc hết file này trước khi làm.

## 1. Lấy dự án về Mac

```bash
cd ~/Documents            # hoặc thư mục bất kỳ, KHÔNG nằm trong thư mục ẩn (~/.xxx) hay ~/Library
git clone https://github.com/tuantyphu1-glitch/publishflow-pro.git
cd publishflow-pro
git checkout ccr-5638e48c-c993tw
cd WHATIF_SKATE_TEST
```

Phần mềm cần có:
- **Blender 5.3** (blender.org). Các file .blend được lưu bằng Blender 5.3; bản cũ hơn có thể mở thiếu tính năng.
- **ffmpeg**: `brew install ffmpeg` (để ghép PNG thành MP4).

Đường dẫn Blender trên Mac:
```bash
BL=/Applications/Blender.app/Contents/MacOS/Blender
```

## 2. Trạng thái hiện tại

| Hạng mục | Trạng thái |
|---|---|
| Nhân vật v2 (đầu cầu trắng, hoodie xanh, giày trắng-xanh) | Xong, **chưa duyệt làm nhân vật chính thức** |
| Clip 360° 15 s (`skateboard_360.blend`) | Animation xong; mới có preview đoạn f151–390 |
| **Double Kickflip 720°** (`Double_Kickflip_720.blend`) | Animation xong, QA đạt 6/6, preview 480p xong, người dùng khen "clip rất tốt" |
| `Double_Kickflip_720_final.mp4` (1080p) | **CHƯA RENDER**: việc tiếp theo |

Kết quả QA Double Kickflip (`check_kickflip.py`):
chân +18,7 % · ván lật đúng 720,00° (f91–152) · thân xoay 0° · bắt ván f160, tiếp đất f181 ·
4 bánh chạm đất 0,000 m · lề camera tối thiểu 9,7 % · không xuyên ván/sàn · chân không trượt.

## 3. Danh sách file (thư mục `WHATIF_SKATE_TEST/`)

| File | Nội dung |
|---|---|
| `Double_Kickflip_720.blend` | Dự án kickflip: 240 frame, 30 fps, đã cài sẵn 1920×1080, Eevee 32 samples, motion blur 0.35 |
| `Double_Kickflip_720_preview.mp4` | Preview 854×480 |
| `animation_report.txt` | Báo cáo kickflip (QA, thời gian render) |
| `skateboard_360.blend` | Dự án clip 360° (giữ nguyên) |
| `backup/` | Bản sao lưu v2 trước khi kéo dài chân |
| `build_scene.py` | Dựng nhân vật + rig + ván + skatepark + animation 360° (tham số `LEG_SCALE`) |
| `build_kickflip.py` | Dựng Double Kickflip (dùng lại phần 1–6 của build_scene.py, `LEG_SCALE = 1.20`) |
| `check_kickflip.py`, `check_animation.py` | Kiểm tra tự động |
| `render_frames.py` | Render dãy frame ra PNG (bỏ qua frame đã có, nên chạy lại được sau lỗi) |
| `lookdev.py` | Ảnh look-dev 3 góc của nhân vật |
| `lookdev/`, `preview/` | Ảnh và video thử trước đó |

## 4. Việc tiếp theo: render bản Full HD

Không cần dựng lại; file .blend đã cài sẵn thông số cuối.

```bash
cd WHATIF_SKATE_TEST
mkdir -p render_final
# Render 240 frame PNG 1920x1080 (GPU Apple qua Metal)
$BL -b Double_Kickflip_720.blend -o //render_final/frame_#### -F PNG -s 1 -e 240 -a
# Ghép MP4 H.264
ffmpeg -y -framerate 30 -start_number 1 -i render_final/frame_%04d.png \
  -c:v libx264 -pix_fmt yuv420p -crf 17 -movflags +faststart Double_Kickflip_720_final.mp4
```
Nếu render bị dừng giữa chừng, chạy lại bằng `render_frames.py` (nó bỏ qua các frame đã có):
```bash
$BL -b -P render_frames.py -- Double_Kickflip_720.blend render_final 100 32 1 1-240
```

Kiểm tra lại trước khi render (không bắt buộc, đã đạt trên cloud):
```bash
$BL -b -P check_kickflip.py -- Double_Kickflip_720.blend backup/skateboard_360_v2_backup.blend qa.json
```
> Script kiểm tra cần `numpy` (Blender 5.x có sẵn).

Sau khi render: cập nhật `animation_report.txt` (thời gian render thực tế trên M4, cấu hình máy), commit và push.

## 5. Dựng lại từ script (khi cần sửa)

```bash
$BL -b -P build_kickflip.py -- .        # tạo lại Double_Kickflip_720.blend
$BL -b -P build_scene.py -- .           # tạo lại skateboard_360.blend
```
Lưu ý: dựng lại sẽ **ghi đè** file .blend: sao lưu trước.

## 6. Yêu cầu của người dùng cần giữ

- Không tạo lại dự án từ đầu; giữ nguyên nhân vật, khuôn mặt, màu, trang phục, ván, bối cảnh.
- Luôn sao lưu .blend trước khi sửa.
- Luôn render **preview 480p trước**, chỉ render Full HD khi người dùng duyệt (kickflip: đã được khen).
- Chạy kiểm tra tự động bằng Python trong Blender; sửa lỗi trước khi render.
- Báo cáo trung thực: đường dẫn file, thời gian render thực tế, cấu hình, lỗi gặp phải.

## 7. Ghi chú kỹ thuật

- Trục: tiến theo +X, Z hướng lên, nhân vật đứng ngang ván, mặt hướng −Y, camera luôn ở phía −Y.
- Phân cấp: `CTRL_Master` (di chuyển + độ cao bay, không bao giờ xoay) →
  `RIG_Character` (armature, chân IK `foot_IK.L/R`) và `BOARD_Ctrl` (trục lật ván, cao 0,065 m) → `BOARD_Root`.
- Rig dạng **rigid**: mỗi bộ phận gắn cứng vào một xương (chưa skin liền mạch).
- Thời gian bay dài (3,9 s) là do mốc thời gian yêu cầu, xem như "hang time" cách điệu.
- Trên cloud render bằng CPU (không GPU): ~5,4 s/frame ở 480p. M4 dùng GPU Metal nên nhanh hơn nhiều.

## 8. Khác biệt còn lại so với bảng thiết kế gốc (để làm nhân vật v3 sau này)

Bảng thiết kế gốc: chân còn dài hơn (~½ chiều cao), không có quần short riêng (chân trắng thò ra từ hoodie),
mắt và lông mày nhỏ/mảnh hơn, có bộ biểu cảm (bình thường, vui, ngạc nhiên, buồn, tức giận, nháy mắt).
Hướng đề xuất: dựng nhân vật v3 từ ảnh turnaround/biểu cảm (ChatGPT tạo), giữ nguyên tên và cấu trúc xương
để animation cũ dùng lại được.

## 9. Câu lệnh mẫu để dán vào Claude Code trên Mac

```
Đọc file WHATIF_SKATE_TEST/HANDOFF_MAC.md trong repo publishflow-pro (nhánh ccr-5638e48c-c993tw).
Tôi đã duyệt preview Double Kickflip 720°. Hãy render bản Full HD 1920x1080 bằng Blender trên máy này
(GPU Metal), ghép thành Double_Kickflip_720_final.mp4 (H.264), đo thời gian render thực tế,
cập nhật animation_report.txt, rồi báo đường dẫn file cho tôi.
```
