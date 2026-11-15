# AI Design System Creator - Zero-Dependency Native Windows Bridge Server
# Uses .NET TcpListener to serve both the Web App and the Figma Bridge on port 9250

param(
    [int]$Port = 9250
)

$scriptDir = $PSScriptRoot
if ([string]::IsNullOrEmpty($scriptDir)) {
    if ($MyInvocation.MyCommand.Definition) {
        $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
    } else {
        $scriptDir = (Get-Location).Path
    }
}
$publicDir = Join-Path $scriptDir "public"
$dataFile = Join-Path $scriptDir "data\components.json"

$pendingFigmaPayload = $null
$lastSyncTimestamp = $null
$lastPushedComponent = $null

$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".svg"  = "image/svg+xml"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".ico"  = "image/x-icon"
}

$activePort = $Port
$maxAttempts = 15
$attempt = 0
$listener = $null

while ($attempt -lt $maxAttempts) {
    try {
        $listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, $activePort)
        $listener.Start()
        break
    } catch {
        Write-Warning "Port $activePort is unavailable. Trying $($activePort + 1)..."
        $activePort++
        $attempt++
        Start-Sleep -Milliseconds 100
    }
}

if ($null -eq $listener) {
    Write-Error "Failed to bind to an available port after $maxAttempts attempts."
    exit 1
}

$Port = $activePort

# Save active port for plugin and tools
try {
    $portObj = @{ port = $Port; url = "http://localhost:$Port" }
    $portJson = ConvertTo-Json $portObj
    Set-Content -Path (Join-Path $scriptDir "active-port.json") -Value $portJson -Encoding UTF8
} catch {}

# Open default browser once listening
try {
    Start-Process "http://localhost:$Port"
} catch {}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  AI Design System Creator & Figma Desktop Bridge Server" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  >> Web Application:  http://localhost:$Port" -ForegroundColor White
Write-Host "  >> Figma Bridge API: http://localhost:$Port/api/figma/push" -ForegroundColor White
Write-Host "  >> Status Check:     http://localhost:$Port/api/status" -ForegroundColor White
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Press Ctrl+C to stop the server." -ForegroundColor Yellow
Write-Host ""

try {
    while ($true) {
        $client = $listener.AcceptTcpClient()
        $stream = $client.GetStream()
        
        # Read HTTP Request
        $buffer = New-Object byte[] 65536
        $bytesRead = $stream.Read($buffer, 0, $buffer.Length)
        if ($bytesRead -le 0) {
            $client.Close()
            continue
        }
        
        $requestText = [System.Text.Encoding]::UTF8.GetString($buffer, 0, $bytesRead)
        $lines = $requestText -split "`r?`n"
        $firstLine = $lines[0]
        $tokens = $firstLine -split " "
        $method = $tokens[0]
        $path = $tokens[1]
        
        # Strip query string
        $cleanPath = $path
        if ($cleanPath -match "^([^?]+)") {
            $cleanPath = $matches[1]
        }

        # Extract request body for POST
        $body = ""
        $doubleNewlineIdx = $requestText.IndexOf("`r`n`r`n")
        if ($doubleNewlineIdx -ge 0) {
            $body = $requestText.Substring($doubleNewlineIdx + 4)
        }

        $corsHeaders = "Access-Control-Allow-Origin: *`r`nAccess-Control-Allow-Methods: GET, POST, OPTIONS`r`nAccess-Control-Allow-Headers: Content-Type`r`n"

        # Handle OPTIONS preflight
        if ($method -eq "OPTIONS") {
            $res = "HTTP/1.1 204 No Content`r`n$corsHeaders`r`n"
            $resBytes = [System.Text.Encoding]::UTF8.GetBytes($res)
            $stream.Write($resBytes, 0, $resBytes.Length)
            $stream.Flush()
            $client.Close()
            continue
        }

        # Route 1: Status
        if ($cleanPath -eq "/api/status") {
            $statusJson = @{
                status = "ok"
                port = $Port
                bridge = "active"
                pendingCount = $(if ($pendingFigmaPayload) { 1 } else { 0 })
                lastSync = $lastSyncTimestamp
                lastPushedComponent = $lastPushedComponent
                figmaClientsCount = 1
            } | ConvertTo-Json
            
            $resBytes = [System.Text.Encoding]::UTF8.GetBytes($statusJson)
            $header = "HTTP/1.1 200 OK`r`nContent-Type: application/json`r`n$corsHeaders" + "Content-Length: $($resBytes.Length)`r`n`r`n"
            $hBytes = [System.Text.Encoding]::UTF8.GetBytes($header)
            $stream.Write($hBytes, 0, $hBytes.Length)
            $stream.Write($resBytes, 0, $resBytes.Length)
            $stream.Flush()
            $client.Close()
            continue
        }

        # Route 2: Get Components
        if ($cleanPath -eq "/api/components" -and $method -eq "GET") {
            $content = "[]"
            if (Test-Path $dataFile) {
                $content = [System.IO.File]::ReadAllText($dataFile)
            }
            $resBytes = [System.Text.Encoding]::UTF8.GetBytes($content)
            $header = "HTTP/1.1 200 OK`r`nContent-Type: application/json`r`n$corsHeaders" + "Content-Length: $($resBytes.Length)`r`n`r`n"
            $hBytes = [System.Text.Encoding]::UTF8.GetBytes($header)
            $stream.Write($hBytes, 0, $hBytes.Length)
            $stream.Write($resBytes, 0, $resBytes.Length)
            $stream.Flush()
            $client.Close()
            continue
        }

        # Route 3: Push to Figma
        if ($cleanPath -eq "/api/figma/push" -and $method -eq "POST") {
            $script:pendingFigmaPayload = $body
            try {
                $parsed = $body | ConvertFrom-Json
                $script:lastPushedComponent = $parsed.component.name
            } catch {
                $script:lastPushedComponent = "Component"
            }
            Write-Host "[Bridge] Received Push to Figma: $($script:lastPushedComponent)" -ForegroundColor Magenta
            
            $ack = @{
                success = $true
                message = "Component queued for Figma companion plugin"
                componentName = $script:lastPushedComponent
            } | ConvertTo-Json

            $resBytes = [System.Text.Encoding]::UTF8.GetBytes($ack)
            $header = "HTTP/1.1 200 OK`r`nContent-Type: application/json`r`n$corsHeaders" + "Content-Length: $($resBytes.Length)`r`n`r`n"
            $hBytes = [System.Text.Encoding]::UTF8.GetBytes($header)
            $stream.Write($hBytes, 0, $hBytes.Length)
            $stream.Write($resBytes, 0, $resBytes.Length)
            $stream.Flush()
            $client.Close()
            continue
        }

        # Route 4: Figma Pending Poll
        if ($cleanPath -eq "/api/figma/pending" -and $method -eq "GET") {
            $hasP = $null -ne $script:pendingFigmaPayload
            $retPayload = $null
            if ($hasP) {
                try {
                    $retPayload = $script:pendingFigmaPayload | ConvertFrom-Json
                } catch {
                    $retPayload = $script:pendingFigmaPayload
                }
                $script:pendingFigmaPayload = $null # Clear after polling
            }

            $resObj = @{
                hasPending = $hasP
                payload = $retPayload
            } | ConvertTo-Json -Depth 10

            $resBytes = [System.Text.Encoding]::UTF8.GetBytes($resObj)
            $header = "HTTP/1.1 200 OK`r`nContent-Type: application/json`r`n$corsHeaders" + "Content-Length: $($resBytes.Length)`r`n`r`n"
            $hBytes = [System.Text.Encoding]::UTF8.GetBytes($header)
            $stream.Write($hBytes, 0, $hBytes.Length)
            $stream.Write($resBytes, 0, $resBytes.Length)
            $stream.Flush()
            $client.Close()
            continue
        }

        # Route 5: Figma ACK
        if ($cleanPath -eq "/api/figma/ack" -and $method -eq "POST") {
            $script:lastSyncTimestamp = (Get-Date).ToString("T")
            Write-Host "[Bridge] [OK] Figma Canvas confirmed sync!" -ForegroundColor Green
            $resBytes = [System.Text.Encoding]::UTF8.GetBytes('{"success":true}')
            $header = "HTTP/1.1 200 OK`r`nContent-Type: application/json`r`n$corsHeaders" + "Content-Length: $($resBytes.Length)`r`n`r`n"
            $hBytes = [System.Text.Encoding]::UTF8.GetBytes($header)
            $stream.Write($hBytes, 0, $hBytes.Length)
            $stream.Write($resBytes, 0, $resBytes.Length)
            $stream.Flush()
            $client.Close()
            continue
        }

        # Route 6: Static File Serving from public/
        $relPath = $cleanPath.TrimStart('/')
        if ([string]::IsNullOrEmpty($relPath)) {
            $relPath = "index.html"
        }
        $targetFile = Join-Path $publicDir ($relPath -replace '/', '\')

        if (!(Test-Path $targetFile -PathType Leaf)) {
            # Fallback to index.html for SPA
            $targetFile = Join-Path $publicDir "index.html"
        }

        if (Test-Path $targetFile -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($targetFile).ToLower()
            $cType = $mimeTypes[$ext]
            if ([string]::IsNullOrEmpty($cType)) { $cType = "application/octet-stream" }
            
            $fileBytes = [System.IO.File]::ReadAllBytes($targetFile)
            $header = "HTTP/1.1 200 OK`r`nContent-Type: $cType`r`n$corsHeaders" + "Content-Length: $($fileBytes.Length)`r`n`r`n"
            $hBytes = [System.Text.Encoding]::UTF8.GetBytes($header)
            $stream.Write($hBytes, 0, $hBytes.Length)
            $stream.Write($fileBytes, 0, $fileBytes.Length)
            $stream.Flush()
        } else {
            $notFound = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
            $header = "HTTP/1.1 404 Not Found`r`nContent-Length: $($notFound.Length)`r`n`r`n"
            $hBytes = [System.Text.Encoding]::UTF8.GetBytes($header)
            $stream.Write($hBytes, 0, $hBytes.Length)
            $stream.Write($notFound, 0, $notFound.Length)
            $stream.Flush()
        }

        $client.Close()
    }
} finally {
    $listener.Stop()
}
