$files = Get-ChildItem -Path "src/components/*.tsx","src/components/**/*.tsx" -Recurse
foreach ($f in $files) {
  $c = Get-Content $f.FullName -Raw -Encoding UTF8
  $orig = $c
  # reduce page titles from text-2xl to text-xl
  $c = $c -replace 'font-display text-2xl', 'font-display text-xl'
  # reduce metric values from text-2xl to text-lg where they are tnum
  $c = $c -replace 'text-2xl font-bold tnum', 'text-lg font-bold tnum'
  $c = $c -replace 'text-2xl font-bold leading-tight tnum', 'text-lg font-bold leading-tight tnum'
  if ($c -ne $orig) {
    [IO.File]::WriteAllText($f.FullName, $c, [System.Text.Encoding]::UTF8)
    Write-Host "fixed $($f.Name)"
  }
}