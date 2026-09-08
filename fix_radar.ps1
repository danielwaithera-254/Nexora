$content = Get-Content 'C:\Users\HP 840\Nexora\src\components\charts\RadarCard.tsx' -Raw -Encoding UTF8
$content = $content -replace 'export default function RadarCard', 'export default function RadarCard'
[IO.File]::WriteAllText('C:\Users\HP 840\Nexora\src\components\charts\RadarCard.tsx', $content, [System.Text.Encoding]::UTF8)