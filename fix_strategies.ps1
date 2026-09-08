$content = Get-Content 'C:\Users\HP 840\Nexora\src\components\Strategies.tsx' -Raw -Encoding UTF8
$content = $content -replace 'mockStrategies.map\(\(s, i\) => \(', 'mockStrategies.map((s, i) => (<>'
$content = $content -replace '\)\}\)\)', ')</>)'
$content = $content -replace '\) : null\}\)\}\)', '): null}</>)'
[IO.File]::WriteAllText('C:\Users\HP 840\Nexora\src\components\Strategies.tsx', $content, [System.Text.Encoding]::UTF8)