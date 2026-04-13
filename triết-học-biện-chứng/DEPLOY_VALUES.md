# Giá trị cần điền để deploy

Tạo file `.env.local` hoặc `.env` từ `.env.example`, rồi điền các biến sau:

## 1) Gemini
- `GEMINI_API_KEY`: API key dùng cho chatbot và sinh ảnh.

## 2) Firebase Web App
Lấy trong **Firebase Console > Project settings > General > Your apps > Web app config**.
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID` (có thể để trống nếu không dùng Analytics)

## 3) Firestore database ID
- `VITE_FIREBASE_FIRESTORE_DATABASE_ID`
- Nếu dùng Firestore mặc định thì có thể bỏ trống.
- Nếu dự án đang dùng database riêng như AI Studio tạo sẵn, điền đúng database id ở **Firestore Database**.

## 4) Cloudinary (tùy chọn)
Chỉ cần nếu muốn upload ảnh đại diện từ máy lên.
- `VITE_CLOUDINARY_CLOUD_NAME`
- `VITE_CLOUDINARY_UPLOAD_PRESET`

## 5) Firebase Console cần bật
- Authentication > Sign-in method > bật **Google** và **Email/Password**
- Firestore Database
- Storage (nếu dùng ảnh)

## 6) Domain cần thêm để chạy auth
Trong **Authentication > Settings > Authorized domains**, thêm domain deploy của bạn.
Ví dụ:
- `localhost`
- domain Vercel / Netlify / Firebase Hosting

## 7) Rule cần lưu ý
- Nếu dùng Google và Email/Password song song, nên bật cơ chế **One account per email address** trong Firebase Auth để tránh trùng tài khoản.
