BỐI CẢNH
Tôi đang làm kênh video hoạt hình 3D ngắn với một nhân vật cố định: đầu cầu trắng, mắt đen bầu dục, hoodie xanh có chữ H, tay chân trắng thon dài, giày trắng phối xanh. Dự án được dựng bằng Blender + Python (bpy) trong một phiên Claude Code trên cloud, và bây giờ chuyển sang máy Mac mini M4 này để làm tiếp và render bằng GPU.

Repo: https://github.com/tuantyphu1-glitch/publishflow-pro
Nhánh làm việc: ccr-5638e48c-c993tw (chỉ commit/push lên nhánh này)

BƯỚC 0 – CHUẨN BỊ (làm trước tiên)
1. Vào thư mục repo publishflow-pro trên máy (nếu chưa có thì git clone vào ~/Documents). Chạy:
   git fetch origin ccr-5638e48c-c993tw
   git checkout ccr-5638e48c-c993tw   (nếu nhánh chưa có ở local: git checkout -b ccr-5638e48c-c993tw origin/ccr-5638e48c-c993tw)
   git pull origin ccr-5638e48c-c993tw
2. Đọc KỸ và làm theo 2 file:
   - WHATIF_SKATE_TEST/HANDOFF_MAC.md (trạng thái dự án, danh sách file, lệnh render)
   - WHATIF_SKATE_TEST/PIPELINE_CHATGPT_TO_VIDEO.md (quy trình ChatGPT → Blender → MP4, kể cả giọng đọc)
3. Kiểm tra công cụ: Blender 5.3 tại /Applications/Blender.app/Contents/MacOS/Blender (đặt BL=đường dẫn đó), ffmpeg (brew install ffmpeg nếu thiếu). Báo cho tôi nếu thiếu thứ gì.
4. Liệt kê giọng tiếng Anh có sẵn: say -v '?' | grep -E 'en_(US|GB|AU)'. Cho tôi biết giọng NAM tốt nhất đang có; nếu chưa có giọng Enhanced/Premium (Evan, Nathan, Tom, Aaron...) thì hướng dẫn tôi tải trong System Settings → Accessibility → Spoken Content → System Voice → Manage Voices.

VIỆC 1 – HOÀN TẤT TẬP EP01: DOUBLE KICKFLIP 720°
- Dự án: WHATIF_SKATE_TEST/Double_Kickflip_720.blend (đã đạt kiểm tra tự động 6/6, preview đã được tôi duyệt).
- Nếu chưa có WHATIF_SKATE_TEST/Double_Kickflip_720_final.mp4 (1920x1080, 240 frame, 30 fps, H.264) thì render và ghép theo HANDOFF_MAC.md mục 4. Nếu đã có thì kiểm tra lại bằng ffprobe (độ phân giải, số frame, thời lượng 8 s).
- Xem lại các frame 90, 121, 160, 189 của bản final để chắc chắn không lỗi hình.
- Làm Bước 2b (giọng đọc) trong PIPELINE_CHATGPT_TO_VIDEO.md với lời thoại trong CHANNEL/episodes/EP01_double_kickflip/brief.md:
  giọng đọc TIẾNG ANH, GIỌNG NAM, đúng mốc thời gian, không câu nào bị cắt, chuẩn hoá âm lượng,
  tạo phụ đề EP01.srt, ghép thành CHANNEL/episodes/EP01_double_kickflip/EP01_final_voice.mp4 (AAC 192k).
- Cập nhật WHATIF_SKATE_TEST/animation_report.txt: thời gian render thực tế trên Mac mini M4, cấu hình máy, phiên bản Blender, tên giọng đọc và nguồn TTS, các lỗi gặp phải.
- Commit + push (KHÔNG commit thư mục PNG render_*/). Báo tôi đường dẫn chính xác các file.

VIỆC 2 – NHÂN VẬT CHUẨN v3 (chỉ làm khi tôi đã đặt ảnh ChatGPT vào CHANNEL/reference/character/)
- Ảnh cần có: 01_turnaround.png, 02_proportions.png, 03_expressions.png, 04_details.png, 05_colors.txt (+ design_sheet_original.png đã có sẵn).
- Làm Bước 1 trong PIPELINE_CHATGPT_TO_VIDEO.md: dựng nhân vật v3 giống bảng thiết kế gốc (chân dài ~½ chiều cao, không quần short riêng, mắt và lông mày nhỏ/mảnh, bộ biểu cảm bằng shape key), GIỮ NGUYÊN tên và cấu trúc xương để animation cũ dùng lại được.
- Render 3 góc look-dev (chính diện, 45°, toàn thân) đặt cạnh ảnh turnaround để so sánh. DỪNG, chờ tôi duyệt.
- Nếu dựng tự động bằng code không đạt độ giống mong muốn, nói rõ giới hạn và đề xuất phương án (sculpt thủ công, image-to-3D...).

VIỆC 3 – CÁC TẬP TIẾP THEO (mỗi khi tôi tạo thư mục CHANNEL/episodes/EPxx_<tên>/ có brief.md + storyboard.png + location.png + narration.md)
- Làm Bước 2 và 2b trong PIPELINE_CHATGPT_TO_VIDEO.md.
- Tự viết script dựng cảnh và script kiểm tra tự động cho MỌI điều kiện trong brief; có lỗi thì sửa trước khi render.
- Render preview 854x480 CÓ giọng đọc → báo kết quả kiểm tra + đường dẫn file → DỪNG chờ tôi duyệt.
- Sau khi tôi duyệt: render 1920x1080, ghép giọng đọc + phụ đề, viết report.txt, commit + push.
- Lưu động tác dùng lại được vào CHANNEL/library/.

QUY TẮC BẮT BUỘC
1. Không tạo lại dự án từ đầu; giữ nguyên nhân vật, khuôn mặt, màu, trang phục, ván, bối cảnh trừ khi tôi yêu cầu sửa.
2. Luôn sao lưu file .blend (thư mục backup/) trước khi chỉnh sửa.
3. Không dùng ảnh phẳng thay cho mô hình 3D; ảnh ChatGPT chỉ là tham chiếu (và thumbnail).
4. Luôn render preview 480p trước; KHÔNG render Full HD khi tôi chưa duyệt preview.
5. Tự động hoá bằng Python trong Blender (blender -b -P script.py -- tham_số); chạy kiểm tra tự động trước khi render cuối.
6. Giọng đọc trong video luôn là TIẾNG ANH, GIỌNG NAM. Không dùng giọng nữ, không dùng tiếng Việt trong video.
7. Không ghi API key hay mật khẩu vào repo; nếu cần dịch vụ TTS trả phí thì hỏi tôi trước.
8. Không báo "hoàn thành" khi chưa có file thật; báo cáo trung thực lỗi, giới hạn, thời gian render thực tế.
9. Trả lời tôi bằng tiếng Việt, ngắn gọn: việc đã làm, đường dẫn file, kết quả kiểm tra, việc cần tôi quyết định.

BẮT ĐẦU NGAY: làm Bước 0, rồi Việc 1. Việc 2 và Việc 3 chỉ làm khi tôi đã đặt đủ ảnh/brief.
