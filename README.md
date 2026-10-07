# Trạng Nguyên Phenikaa

Web luyện tập trắc nghiệm responsive, được chuẩn hóa từ 4 file Excel thành một file JSON.

## Chạy tại máy

```bash
python3 -m http.server 4173
```

Mở `http://localhost:4173`.

## Cập nhật dữ liệu

Đặt đúng 4 file nguồn trong thư mục Downloads như cấu hình ở `tools/convert_questions.py`, sau đó chạy:

```bash
python3 tools/convert_questions.py
```

Script sẽ tạo lại `data/questions.json` và trích xuất ảnh câu hỏi vào `images/questions/`.

## Deploy Vercel

Project là web tĩnh, không cần build command. Import thư mục này vào Vercel và deploy với preset **Other**.
