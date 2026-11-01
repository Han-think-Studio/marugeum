# 마루금 (Marugeum)

백두대간 생존 로그라이크. 바다는 죽었고 낮은 땅은 비에 젖으면 위험하다. 지리산에서 향로봉까지, 능선을 따라 북쪽으로.

## 실행하는 세 가지 길

| 길 | 명령 | 결과 |
|---|---|---|
| 한 번에 | `play.cmd` 더블클릭 | 받기 → 빌드 → 브라우저로 열림 (http://localhost:4173). 창을 닫으면 끝 |
| 개발 중 | `npm.cmd run dev` | 고치면 바로 반영되는 개발 서버 (http://localhost:5173) |
| 설치 없이 앱으로 | `npm.cmd run desktop:build` 뒤 `src-tauri\target\release\Marugeum.exe` | 서버 없이 창으로 뜬다. 더블클릭 |

바탕화면 바로가기는 `tools\make-shortcut.ps1` 을 한 번 돌리면 생긴다.

```powershell
Set-Location "E:\Game_project\marugeum"; powershell -ExecutionPolicy Bypass -File tools\make-shortcut.ps1
```

처음 한 번은 `npm install` 이 필요하다 (`play.cmd` 는 알아서 한다).

## 윈도우 실행 파일 만들기 (Tauri)

최초 1회, Rust 와 C++ 빌드 도구가 필요하다.

```powershell
winget install Rustlang.Rustup --accept-source-agreements --accept-package-agreements
winget install Microsoft.VisualStudio.2022.BuildTools --override "--add Microsoft.VisualStudio.Workload.VCTools --includeRecommended --passive --norestart" --accept-source-agreements --accept-package-agreements
```

설치 뒤 파워셸을 새로 열고:

```powershell
npm install
npm run desktop:build
```

결과물:

- 설치 파일: `src-tauri\target\release\bundle\nsis\Marugeum_0.1.0_x64-setup.exe`
- 단일 실행 파일: `src-tauri\target\release\Marugeum.exe`

개발 중 데스크톱 창으로 바로 보려면 `npm run desktop:dev`.

## 조작

- 장면에서 사물 표식 클릭. V 장면/지도 전환. 지도에서 노드 클릭 또는 숫자 1~6으로 이동. Shift+숫자는 정찰
- 위험 높음인 길은 자리를 안정시킨 뒤(둘러보기 · 불이나 지붕 · 하룻밤) 아침에만 떠날 수 있다
- F 둘러보기 · O 사진 보기 · R 쉬기 · S 자기 · W 마시기 · Q 물 담기 · E 먹기
- N 땔감 모으기 · H 불 피우기 · P 물 끓이기 · K 바람막이 · B 거점 세우기 · C 거점 화면/짐 정리 · G 맡기기 · T 챙기기
- I 요오드 · U 응급처치 · Y 정수 알약 (지니고 있을 때만 보인다)
- 이벤트와 대치: 숫자 1~4, Enter 계속
- L 전체 기록 · J 기록 수첩 · Esc 메뉴 · M 소리 · F11 전체화면
- 설정(제목 화면과 메뉴의 '설정'): 소리와 음량, 글자 크기, 처음 화면, 장면 움직임, 버튼 설명, 전체화면, 기록 지우기, 키 안내

## 검사

```powershell
npm run check:events
```

이벤트 데이터의 막다른 선택지, 중복 id, 단계 범위, 엔딩 조건 빈틈을 잡는다.

## 이야기 추가

`src/data/events.ts`, `src/data/events-more.ts` 에 이벤트를, `src/data/objects.ts` 에 사물 상호작용을 데이터로 적는다. 조건, 본문, 선택지, 확률 결과, 효과. 가족의 흔적처럼 놓치면 안 되는 것은 `priority: true`.

## 음원 교체

`public/audio/` 에 파일을 넣고 `src/audio/files.ts` 에 채널 이름과 경로를 적는다. 채널: theme, wind, rain, fire, birds, crickets.
