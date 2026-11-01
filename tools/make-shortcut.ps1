# 바탕화면에 바로가기 두 개를 만든다. "마루금 (브라우저)" 는 play.cmd 를, "마루금" 은 빌드된 실행 파일을 연다
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$desktop = [Environment]::GetFolderPath("Desktop")
$shell = New-Object -ComObject WScript.Shell

$lnk = $shell.CreateShortcut((Join-Path $desktop "마루금 (브라우저).lnk"))
$lnk.TargetPath = Join-Path $root "play.cmd"
$lnk.WorkingDirectory = $root
$lnk.IconLocation = Join-Path $root "src-tauri\icons\icon.ico"
$lnk.Save()
"만들었다: 마루금 (브라우저).lnk  → play.cmd (받기 · 빌드 · 브라우저 열기)"

$exe = Join-Path $root "src-tauri\target\release\Marugeum.exe"
if (Test-Path $exe) {
  $lnk2 = $shell.CreateShortcut((Join-Path $desktop "마루금.lnk"))
  $lnk2.TargetPath = $exe
  $lnk2.WorkingDirectory = Split-Path $exe
  $lnk2.Save()
  "만들었다: 마루금.lnk  → Marugeum.exe (설치 없이 바로 실행)"
} else {
  "실행 파일이 아직 없다. npm.cmd run desktop:build 를 한 번 돌리면 src-tauri\target\release\Marugeum.exe 가 생긴다. 그 뒤 이 스크립트를 다시 돌리면 바로가기가 추가된다"
}
