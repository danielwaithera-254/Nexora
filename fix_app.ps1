$lines = Get-Content 'C:\Users\HP 840\Nexora\src\App.tsx' -Encoding UTF8
$newLines = $lines[0..($lines.Count - 3)]
$newLines + 'export default App;' | Set-Content 'C:\Users\HP 840\Nexora\src\App.tsx' -Encoding UTF8