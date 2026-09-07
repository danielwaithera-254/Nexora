$content = Get-Content 'C:\Users\HP 840\Nexora\src\App.tsx' -Raw -Encoding UTF8
$content = $content -replace '\x00', ''
$content = $content -replace 'export default App;// trigger rebuild', ''
$content = $content -replace 'export default App;\s*$', 'export default App;'
[IO.File]::WriteAllText('C:\Users\HP 840\Nexora\src\App.tsx', $content, [System.Text.Encoding]::UTF8)