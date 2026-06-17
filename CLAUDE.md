# DevLog 작성 규칙

## DevLog.md 형식

- 줄바꿈은 **리터럴 `\r\n` 텍스트** (실제 CRLF 바이트가 아님)
- 날짜 헤더: `## 2026-06-17` (뒤에 추가 텍스트 금지 — `~ 06-18` 등 붙이면 파싱 안 됨)
- DevLog.md는 **커밋 안 함** (.gitignore 등록됨)

## index.html 임베딩 방법

1. DevLog.md 읽기
2. 리터럴 `\r\n` → 실제 LF(0x0A)로 변환
3. char-by-char JS 이스케이프:
   - `\` → `\\`
   - `"` → `\"`
   - LF → `\n`
   - TAB → `\t`
4. index.html에서 `const DEVLOG_MD = "` 와 `";` 사이를 **string IndexOf/Substring으로 교체** (Regex.Replace 사용 금지 — backslash 이중 이스케이프 발생)
5. node로 검증: `dates.length`가 기존과 같거나 +1인지 확인

## 커밋 대상

- index.html ✅
- images/*.png ✅
- DevLog.md ❌ (gitignore)

## 주의사항

- `\\\\r\\\\n` (4 backslash) 포맷은 **작동 안 함** — `\\r\\n` (2 backslash)이어야 `split('\n')` 파싱 가능
- 기존 날짜와 중복 삽입 주의 — append 전 기존 날짜 확인
- 이미지는 `images/` 폴더에 저장, `<img src="images/파일명.png">` 형식으로 참조
