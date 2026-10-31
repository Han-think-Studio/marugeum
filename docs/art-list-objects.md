# 마루금 사물·장비·보급품 아이콘 프롬프트

이미지 생성 도구에 그대로 붙여 넣는다. 파일은 `public/art/` 에 정해진 이름으로 넣는다 (webp 또는 png).
아이콘은 장면 그림 위 동그란 표식 안, 거점 화면의 장비 목록, 저장고 표에 쓰인다. 고장 상태는 코드가 띠를 얹으니 따로 뽑지 않는다.

## 공통 스타일 (모든 아이콘 프롬프트 끝에 붙인다)

```
Single object icon, centered, filling most of the frame, monochrome linocut woodblock print style, bold black ink on warm aged paper, high contrast, simplified shapes, one muted gold accent used sparingly, plain uniform aged paper background with no scenery, no text, no letters, no border, square
```

- 크기 512×512, 정사각형. 배경은 다른 그림과 같은 누런 종이여야 표식 안에서 어울린다
- 한 장을 먼저 뽑아 참고 이미지로 걸고 나머지를 뽑으면 톤이 맞는다
- 사람은 얼굴 없이 실루엣으로

## 1. 사물 아이콘 (18장) — `obj-<종류>.png`

| 파일 | 사물 | 프롬프트 |
|---|---|---|
| obj-body.png | 쓰러진 사람 | A person lying on the ground covered by a jacket, seen from a distance, only the shape, respectful, no face |
| obj-pack.png | 배낭 | An abandoned hiking backpack with an open zipper, leaning on a rock |
| obj-crate.png | 상자 | A nailed wooden crate with rope handles |
| obj-car.png | 멈춘 차 | A small abandoned passenger car with its door open, seen from the side |
| obj-truck.png | 군용 트럭 | A military truck under camouflage netting, seen from the side |
| obj-well.png | 우물 | A round stone well with a wooden lid half open and a rope bucket |
| obj-woodpile.png | 장작더미 | A stacked pile of split firewood |
| obj-cave.png | 바위굴 | A dark gap between two large boulders, a crawl space, faint ash marks at the entrance |
| obj-note.png | 쪽지 | A folded paper note wrapped in plastic, pressed under a small stone |
| obj-photo.png | 사진 | A family photo frame with cracked glass, lying face up |
| obj-clothesline.png | 빨랫줄 | A clothesline with a thick blanket and a few clothes hanging |
| obj-radio.png | 라디오 | An old portable battery radio with a dial and antenna |
| obj-closet.png | 벽장 | A Korean wooden wall closet with sliding doors slightly open |
| obj-fishing.png | 물가 | A calm pool in a mountain stream with the shadow of a fish |
| obj-herbs.png | 풀밭 | A patch of wild greens and berries with a few mushrooms among rocks |
| obj-garden.png | 텃밭 | A small vegetable patch with napa cabbages and radishes still in the ground |
| obj-shrine.png | 서낭당 | A pile of stacked stones with faded cloth strips tied to a branch |
| obj-grave.png | 무덤 | A fresh earth grave mound with a wooden marker, no letters |

## 2. 장비 아이콘 (11장) — `equip-<종류>.png`

| 파일 | 장비 | 프롬프트 |
|---|---|---|
| equip-generator.png | 휘발유 발전기 | A small portable gasoline generator with a pull cord and a fuel cap |
| equip-dieselGenerator.png | 경유 발전기 | A rugged military diesel generator with a steel frame |
| equip-fridge.png | 캠핑 냉장고 | A boxy camping cooler fridge with a lid and a power cord |
| equip-lamp.png | 전등 | A camping LED lantern with a handle |
| equip-radio.png | 라디오 | An old portable battery radio with a dial and antenna |
| equip-heater.png | 경유 난로 | A cylindrical kerosene style heater with a grille |
| equip-tools.png | 공구 | An open canvas tool roll with a wrench, pliers and a screwdriver |
| equip-geiger.png | 가이거 계수기 | A handheld radiation counter with a needle dial and a wand |
| equip-blanket.png | 담요 | A thick folded wool blanket |
| equip-bigPack.png | 큰 배낭 | A large expedition backpack with straps and a rolled mat |
| equip-tent.png | 텐트 | A small pitched dome tent |

## 2-2. 장비 아이콘 추가 (18단계, 10장) — `equip-<종류>.png`

| 파일 | 장비 | 프롬프트 |
|---|---|---|
| equip-carrier.png | 지게 | A traditional Korean wooden A-frame carrier (jige) with a rope harness, standing upright, empty |
| equip-rope.png | 밧줄 | A coil of thick climbing rope with a carabiner |
| equip-flashlight.png | 손전등 | A rugged hand flashlight, switched on, with a short cone of light |
| equip-mask.png | 방독면 | A military gas mask with round eyepieces and a filter canister |
| equip-raincoat.png | 우비 | A hooded rain poncho hanging on a nail, dripping |
| equip-knife.png | 칼 | A fixed blade field knife in a worn sheath, blade partly drawn |
| equip-iodine.png | 요오드 | A small brown medicine bottle with a few white tablets beside it |
| equip-medkit.png | 구급낭 | A canvas first aid pouch with a cross symbol, open, bandages inside |
| equip-purifier.png | 정수 알약 | A blister strip of water purification tablets next to a canteen cup |
| equip-matches.png | 방수 성냥 | A small sealed tin of waterproof matches, one match struck |

## 1-2. 사물 아이콘 추가 (18단계, 1장) — `obj-<종류>.png`

| 파일 | 사물 | 프롬프트 |
|---|---|---|
| obj-toolshed.png | 농기구 창고 | A small rural tool shed with a half open corrugated door, a hoe and a wooden carrier visible inside |

## 3. 보급품 아이콘 (8장) — `supply-<종류>.png`

| 파일 | 보급품 | 프롬프트 |
|---|---|---|
| supply-water.png | 물 | A clear plastic water bottle, full, with a gold cap accent |
| supply-dirty.png | 오염수 | A water bottle with murky water and sediment |
| supply-food.png | 보존식 | A stack of canned food and an instant noodle packet |
| supply-fresh.png | 신선식 | A fresh fish and a bundle of wild greens |
| supply-wood.png | 땔감 | A small bundle of dry sticks tied with twine |
| supply-gasoline.png | 휘발유 | A red style jerrycan rendered in ink with a gold accent band |
| supply-diesel.png | 경유 | A square military fuel can with a handle |
| supply-parts.png | 부품 | A small box of bolts, wire and a spare part |

## 4. 안식처와 거점 보강 (15단계용, 5장) — `upgrade-<이름>.png`

거점 화면의 보강 카드에 쓰인다. 크기 768×512 (3:2).

| 파일 | 보강 | 프롬프트 |
|---|---|---|
| upgrade-window.png | 창 막기 | A hut window boarded up with planks and nails from the inside, wide 3:2 composition |
| upgrade-earth.png | 흙 덮기 | Sandbags and heaped earth piled against the wall of a small hut, wide 3:2 composition |
| upgrade-roof.png | 지붕 수리 | A patched hut roof with a tarp tied down over the hole, wide 3:2 composition |
| upgrade-hearth.png | 화덕 | A stone hearth built inside a hut with a pipe to the roof and a small fire, wide 3:2 composition |
| upgrade-windbreak.png | 바람막이 | A low wall of stacked stones and branches sheltering a sleeping spot on a ridge, wide 3:2 composition |

## 4-2. 거점 단계 (19단계, 3장) — `camp-<단계>.png`

장면 왼쪽 위 '지은 것' 칸의 첫 자리에 거점 단계 그림이 들어간다. 크기 768×512 (3:2), 보강 카드와 같은 톤.

| 파일 | 거점 | 프롬프트 |
|---|---|---|
| camp-tent.png | 텐트 거점 | A small dome tent pitched on a rocky ridge, corners weighed down with stones, a plastic sheet tucked between boulders beside it, wide 3:2 composition |
| camp-cave.png | 바위굴 거점 | The mouth of a shallow rock cave with a bed of dry branches inside, a few supplies stacked in a hollow by the entrance, faint firelight, wide 3:2 composition |
| camp-house.png | 집 거점 | The inside of an abandoned mountain hut turned into a shelter, boarded window, sleeping mat, a lantern and stacked cans on a shelf, wide 3:2 composition |

## 5. 이야기 그림 (16단계용, 나중에) — 지금은 뽑지 않아도 된다

| 파일 | 장면 | 프롬프트 |
|---|---|---|
| photo-family.png | 주인공의 가족사진 | A small worn photograph of a family of three at a mountain campsite, a child in the middle, seen from behind or faces turned away, square |
| ending-reunion.png | 엔딩: 재회 | A figure with a backpack running toward two small figures at the gate of a tent camp on a mountain top, lights, wide 16:9 |
| ending-quarantine.png | 엔딩: 격리동 | A figure behind a glass window of a field hospital tent looking out at a child, wide 16:9 |
| ending-names.png | 엔딩: 이름 | A figure writing on a long paper list pinned to a tent wall, dozens of names, wide 16:9 |
| ending-stay.png | 엔딩: 남기 | A mine entrance in a hillside at dusk with lamplight inside and a figure walking in, wide 16:9 |

## 넣는 법

```powershell
Set-Location "E:\Game_project\marugeum"; git add public/art; git commit -m "아이콘 추가"; git push
```
