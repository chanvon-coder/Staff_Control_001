# Staff System Control - Local Server Launcher (PowerShell)
$port = 8080
$folder = $PSScriptRoot

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " 🏛️ STAFF SYSTEM CONTROL - LOCAL HTTP SERVER" -ForegroundColor Green
Write-Host " Master Data: 22 Book1 Header Fields | Bilingual Khmer/EN" -ForegroundColor Yellow
Write-Host " Server URL: http://localhost:$port" -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Cyan

# Open default browser
Start-Process "http://localhost:$port"

# Start lightweight HTTP listener
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()

Write-Host "Server running at http://localhost:$port/ (Press Ctrl+C to stop)..." -ForegroundColor Green

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $localPath = $request.Url.LocalPath
        if ($localPath -eq "/" -or $localPath -eq "") {
            $localPath = "/index.html"
        }

        $filePath = Join-Path $folder $localPath.TrimStart('/')

        if (Test-Path $filePath -PathType Leaf) {
            $content = [System.IO.File]::ReadAllBytes($filePath)
            
            # Content Types
            if ($filePath.EndsWith(".html")) { $response.ContentType = "text/html; charset=utf-8" }
            elseif ($filePath.EndsWith(".css")) { $response.ContentType = "text/css; charset=utf-8" }
            elseif ($filePath.EndsWith(".js")) { $response.ContentType = "application/javascript; charset=utf-8" }
            elseif ($filePath.EndsWith(".json")) { $response.ContentType = "application/json; charset=utf-8" }
            elseif ($filePath.EndsWith(".png")) { $response.ContentType = "image/png" }
            elseif ($filePath.EndsWith(".jpg")) { $response.ContentType = "image/jpeg" }
            else { $response.ContentType = "application/octet-stream" }

            $response.ContentLength64 = $content.Length
            $response.OutputStream.Write($content, 0, $content.Length)
        } else {
            $response.StatusCode = 404
            $errBytes = [System.Text.Encoding]::UTF8.GetBytes("404 - File Not Found")
            $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
        }
        $response.Close()
    }
} finally {
    $listener.Stop()
}
