# 마루금 (Marugeum)

백두대간 생존 로그라이크. 바다는 죽었고 낮은 땅은 비에 젖으면 위험하다. 지리산에서 향로봉까지, 능선을 따라 북쪽으로.

## 브라우저에서 실행

```powershell
npm install
npm run dev
```

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

- 장면에서 사물 표식 클릭. V 장면/지도 전환. 지도에서 노드 클릭 또는 숫자 1~6으로 이동
- F 둘러보기 · O 사진 보기 · R 쉬기 · S 자기 · W 마시기 · Q 물 담기 · E 먹기
- N 땔감 모으기 · H 불 피우기 · P 물 끓이기 · K 바람막이 · B 거점 세우기 · C 거점 화면/짐 정리 · G 맡기기 · T 챙기기
- 이벤트와 대치: 숫자 1~4, Enter 계속
- L 전체 기록 · J 기록 수첩 · Esc 메뉴 · M 소리 · F11 전체화면

## 검사

```powershell
npm run check:events
```

이벤트 데이터의 막다른 선택지, 중복 id, 단계 범위, 엔딩 조건 빈틈을 잡는다.

## 이야기 추가

`src/data/events.ts`, `src/data/events-more.ts` 에 이벤트를, `src/data/objects.ts` 에 사물 상호작용을 데이터로 적는다. 조건, 본문, 선택지, 확률 결과, 효과. 가족의 흔적처럼 놓치면 안 되는 것은 `priority: true`.

## 음원 교체

`public/audio/` 에 파일을 넣고 `src/audio/files.ts` 에 채널 이름과 경로를 적는다. 채널: theme, wind, rain, fire, birds, crickets.
