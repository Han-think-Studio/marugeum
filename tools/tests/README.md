# 자동 테스트와 봇 시뮬레이션

개발 서버를 4174 포트로 띄운 뒤 돌린다. 스크립트의 첫 인자는 스크린샷과 결과를 둘 폴더다.

```powershell
npm.cmd install --no-save playwright
npx.cmd playwright install chromium
```

```powershell
Start-Process npx.cmd -ArgumentList "vite --port 4174 --strictPort"
```

```powershell
New-Item -ItemType Directory -Force out | Out-Null; node tools/tests/t34.cjs out
```

| 파일 | 하는 일 |
|---|---|
| t22 | 장비(지게·손전등·성냥·방독면·우비·칼·소모품·밧줄) 효과 |
| t23 | 거점 단계(텐트·바위굴·집), 저장고, 잠자리 |
| t24 | 설정 화면 |
| t26 | 자리 안정, 위험한 길 막기, 정찰 |
| t27 | 고정 지도, 자리 사건 잇기, 기억, 엔딩 회상 |
| t28 | 흔적 표시 |
| t29 | 지도 화면, 말풍선, 거리 |
| t34 | 장비 마모, 정비, 고비, 라디오, 건전지 |
| ev5 | 모든 사건의 모든 선택지 강제 통과 |
| stage | 흔적 봇 30판 (sim2 가 이 봇을 읽는다) |
| sim2 | 봇 세 종류 계측: `node tools/tests/sim2.cjs out trail 30` (trail·ridge·naive) |
| raddiag | 흔적 봇의 피폭이 어디서 쌓이는지 |

FAILS: 0 과 page errors: [] 가 나오면 통과. 사건 데이터는 `npm.cmd run check:events`.
