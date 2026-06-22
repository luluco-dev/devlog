# DevLog 작성 규칙

## DevLog.md 형식

- **실제 줄바꿈(LF)** 사용 (리터럴 `\r\n` 텍스트 아님)
- 날짜 헤더: `## 2026-06-17` (뒤에 추가 텍스트 금지 — `~ 06-18` 등 붙이면 파싱 안 됨)
- DevLog.md는 **커밋 안 함** (.gitignore 등록됨)
- 섹션 구분: 날짜 사이에 `---` 하나만. 이중 `---` 금지

## DevLog.md 레거시 변환

DevLog.md에 리터럴 `\r\n`, `\r\\\r\n`, `\n`, `\r` 텍스트가 남아있을 수 있다.
새 항목 추가 전에 **반드시** 아래 순서로 전체 정리:

```powershell
$content = [System.IO.File]::ReadAllText('C:/Git/devlog/DevLog.md')
$content = $content.Replace("\r\\\r\n", "`n")   # 8-char legacy
$content = $content.Replace("\r`n", "`n")        # actual CRLF
$content = $content.Replace("`r", "")            # stray CR
$content = $content.Replace('\r\n', "`n")        # 4-char literal
$content = $content.Replace('\r', "")            # 2-char literal
$content = $content.Replace('\n', "`n")          # 2-char literal
```

변환 후 `## 2026-` 헤더 개수를 확인하여 누락 없는지 검증할 것.

## devlog-content.js 생성 방법

```powershell
$md = [System.IO.File]::ReadAllText('C:/Git/devlog/DevLog.md')
$escaped = $md.Replace('\', '\\').Replace('`', '\`').Replace('${', '\${')
# `` 는 PowerShell에서 backtick 이스케이프용 placeholder
$jsContent = "const DEVLOG_MD = ``$escaped``;"
$jsContent = $jsContent.Replace('``', '`')
[System.IO.File]::WriteAllText('C:/Git/devlog/devlog-content.js', $jsContent, [System.Text.UTF8Encoding]::new($false))
```

생성 후 검증:
```powershell
$dates = ([regex]::Matches($jsContent, '## 2026-\d{2}-\d{2}')).Count
# 기존 날짜 수와 같거나 +N인지 확인
```

## 이미지 규칙

- `images/` 폴더에 저장
- HTML 태그 사용: `<img src="images/파일명.png" width="600">`
- 캡션: `<figcaption>설명</figcaption>` (마크다운 `*이탤릭*` 사용 금지)
- 마크다운 이미지 문법 `![alt](url)` 사용 금지 — 크기 제어 불가
- inline style (`style="width:100%;max-width:..."`) 사용 금지 — width 속성만 사용

## 커밋 대상

- index.html ✅ (테마/구조 변경 시에만)
- devlog-content.js ✅
- images/*.png ✅
- CLAUDE.md ✅
- DevLog.md ❌ (gitignore)
- theme-preview.html ❌ (임시 파일)

## 주의사항

- index.html에는 DEVLOG_MD를 임베딩하지 않음 — `<script src="devlog-content.js">` 로딩
- 기존 날짜와 중복 삽입 주의 — append 전 기존 날짜 확인
- 중복 날짜 발생 시: 파서가 마지막 것만 사용하므로 이전 내용이 사라짐. 반드시 중복 제거 후 저장
- `---` 구분선은 각 날짜 섹션 끝에 하나만. 이중 `---`는 빈 콘텐츠로 파싱됨
